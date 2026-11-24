// Emails people about messages that waited unread for 10 minutes. A database timer calls it every 5 minutes.
// Who gets an email, and when, is decided in the database (claim_message_alerts), so calling this more often
// sends nothing extra. The email says who wrote, never what they wrote.
//
// Sends nothing until an email service is connected. Secrets (Edge Functions -> Secrets in Supabase):
//   RESEND_API_KEY  or  BREVO_API_KEY   the email service's key
//   ALERT_FROM_EMAIL                    the sender address, e.g. alerts@jamly.co.il
//   ALERT_FROM_NAME (optional)          the sender name, "Jamly" by default
// ---- kept in one file so it can be pasted into the Supabase dashboard ----
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SITE = (Deno.env.get("SITE_URL") ?? "https://musichub-wheat.vercel.app").split(",")[0].trim().replace(/\/$/, "");
const FROM_EMAIL = (Deno.env.get("ALERT_FROM_EMAIL") ?? "").trim();
const FROM_NAME = (Deno.env.get("ALERT_FROM_NAME") ?? "Jamly").trim();
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const BREVO_KEY = Deno.env.get("BREVO_API_KEY");

// Admin client: needed to call claim_message_alerts. Its key never leaves the server.
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Alert = {
  user_id: string; email: string; full_name: string; senders: string;
  message_count: number; conversation_ids: string[];
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
// Names are written by users: keep them short and without links, so an email can't carry someone's link.
const plain = (s: string | null, fallback: string) =>
  (s ?? "").replace(/https?:\/\/\S+|www\.\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, 60) || fallback;

function compose(a: Alert) {
  const who = plain(a.senders, "משתמש/ת ב-Jamly");
  const many = a.message_count > 1;
  const subject = many ? `יש לך ${a.message_count} הודעות חדשות ב-Jamly` : `${who} שלח/ה לך הודעה ב-Jamly`;
  const line = many ? `יש לך ${a.message_count} הודעות שעוד לא קראת, מ: ${who}.` : `${who} שלח/ה לך הודעה ב-Jamly.`;
  const link = a.conversation_ids.length === 1 ? `${SITE}/messages/${a.conversation_ids[0]}` : `${SITE}/messages`;
  const hello = `שלום ${plain(a.full_name, "")}`.trim();
  const settings = `${SITE}/settings`;
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;color:#14162b">
<div style="max-width:480px;margin:0 auto;padding:24px 16px" dir="rtl">
  <div style="background:#ffffff;border-radius:16px;padding:28px 24px;text-align:right">
    <p style="margin:0 0 4px;font-size:20px;font-weight:bold;color:#2d3bc4">Jamly</p>
    <p style="margin:16px 0 8px;font-size:16px">${escapeHtml(hello)},</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6">${escapeHtml(line)}</p>
    <a href="${link}" style="display:inline-block;background:#2d3bc4;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">לקריאה ולתשובה</a>
  </div>
  <p style="margin:16px 4px 0;font-size:12px;line-height:1.6;color:#6b6f85;text-align:right">
    קיבלת את המייל כי יש לך הודעה שלא נקראה ב-Jamly. אנחנו שולחים לכל היותר מייל אחד בשעה.
    לא רוצים מיילים כאלה? <a href="${settings}" style="color:#6b6f85">אפשר לכבות אותם בהגדרות</a>.
  </p>
</div></body></html>`;
  const text = `${hello},\n\n${line}\n\nלקריאה ולתשובה: ${link}\n\nלא רוצים מיילים כאלה? אפשר לכבות אותם בהגדרות: ${settings}`;
  return { subject, html, text };
}

async function send(to: string, subject: string, html: string, text: string) {
  const res = RESEND_KEY
    ? await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html, text,
          headers: { "List-Unsubscribe": `<${SITE}/settings>` },
        }),
      })
    : await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_KEY!, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL }, to: [{ email: to }], subject,
          htmlContent: html, textContent: text, headers: { "List-Unsubscribe": `<${SITE}/settings>` },
        }),
      });
  if (!res.ok) throw new Error(`email service answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  // Not connected yet: leave everything as is, so nothing is marked as sent.
  if ((!RESEND_KEY && !BREVO_KEY) || !FROM_EMAIL) return Response.json({ skipped: "no email service connected" });

  const { data, error } = await admin.rpc("claim_message_alerts");
  if (error) {
    console.error("claim failed:", error.message);
    return Response.json({ error: "claim failed" }, { status: 500 });
  }
  let sent = 0, failed = 0;
  for (const a of (data ?? []) as Alert[]) {
    try {
      const { subject, html, text } = compose(a);
      await send(a.email, subject, html, text);
      sent++;
    } catch (e) {
      failed++;
      // No address in the log. Un-mark, so the next run tries again.
      console.error("alert not sent:", (e as Error).message);
      await admin.from("message_email_state").delete().eq("user_id", a.user_id).in("conversation_id", a.conversation_ids);
    }
  }
  return Response.json({ sent, failed });
});
