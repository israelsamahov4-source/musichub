// Link previews for WhatsApp, Facebook, Telegram, X and other link crawlers.
// The site renders in the browser, so a crawler would see the same generic title for every page.
// For crawlers only, this returns a tiny page with the profile / project / course title and picture.
// Real visitors are never affected: for them this function returns nothing and the app loads as usual.

export const config = { matcher: ["/u/:path*", "/collabs/:path*", "/courses/:path*"] };

const BOTS = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|skypeuripreview|googlebot|bingbot|applebot|pinterest|redditbot|embedly|quora link preview|vkshare|w3c_validator/i;
const SITE = "MusicHub";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clip = (v, n) => { const t = String(v ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const httpUrl = (v) => (typeof v === "string" && /^https:\/\//.test(v) ? v : null);

async function row(table, filter, columns) {
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const res = await fetch(`${base}/rest/v1/${table}?select=${columns}&${filter}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

async function describe(pathname) {
  const [, kind, id] = pathname.split("/");
  const uuid = /^[0-9a-f-]{36}$/i;
  if (kind === "u" && /^[a-z0-9_]{3,30}$/.test(id ?? "")) {
    const p = await row("profiles", `username=eq.${id}`, "full_name,username,avatar_url,cover_url");
    if (!p) return null;
    return {
      title: `${p.full_name || p.username} · ${SITE}`,
      description: `הפרופיל המוזיקלי של ${p.full_name || p.username} ב-${SITE}: כלים, ניסיון ופרויקטים.`,
      image: httpUrl(p.cover_url) || httpUrl(p.avatar_url),
    };
  }
  if (kind === "collabs" && uuid.test(id ?? "")) {
    const p = await row("collab_projects", `id=eq.${id}`, "title,description,cover_url");
    if (!p) return null;
    return { title: `${p.title} · פרויקט ב-${SITE}`, description: clip(p.description, 180) || "פרויקט מוזיקלי שמחפש שותפים.", image: httpUrl(p.cover_url) };
  }
  if (kind === "courses" && uuid.test(id ?? "")) {
    const c = await row("courses", `id=eq.${id}`, "title,description,cover_url");
    if (!c) return null;
    return { title: `${c.title} · קורס ב-${SITE}`, description: clip(c.description, 180) || "קורס ממוזיקאים שעושים את זה כל יום.", image: httpUrl(c.cover_url) };
  }
  return null;
}

export default async function middleware(request) {
  if (!BOTS.test(request.headers.get("user-agent") || "")) return; // people: continue to the app
  try {
    const url = new URL(request.url);
    const info = await describe(url.pathname);
    if (!info) return;
    const image = info.image || `${url.origin}/og.png`;
    const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>${esc(info.title)}</title>
<meta name="description" content="${esc(info.description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${SITE}"><meta property="og:locale" content="he_IL">
<meta property="og:title" content="${esc(info.title)}"><meta property="og:description" content="${esc(info.description)}">
<meta property="og:url" content="${esc(url.origin + url.pathname)}"><meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${esc(url.origin + url.pathname)}">
</head><body><h1>${esc(info.title)}</h1><p>${esc(info.description)}</p><a href="${esc(url.pathname)}">${SITE}</a></body></html>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600" } });
  } catch {
    return; // on any problem fall back to the normal page
  }
}
