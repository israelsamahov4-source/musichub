import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { enUS, he } from "date-fns/locale";
import { LANG, tr } from "@/lib/i18n";

const dateLocale = LANG === "en" ? enUS : he;

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const timeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: dateLocale });
export const formatDate = (date, pattern = tr("d בMMMM yyyy")) => format(new Date(date), pattern, { locale: dateLocale });

/** Only allow http(s) links in href/src (blocks javascript: and data: URLs). */
export function safeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Adds https:// when the user typed a bare domain. */
export function normalizeUrl(value) {
  const v = (value || "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/** Turns YouTube / Vimeo links into an embeddable player URL; null otherwise. */
export function videoEmbedUrl(url) {
  const safe = safeUrl(url);
  if (!safe) return null;
  const u = new URL(safe);
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") || u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
  }
  if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vid = u.pathname.match(/(\d{6,12})/)?.[1];
    if (vid) return `https://player.vimeo.com/video/${vid}`;
  }
  return null;
}

/** Strips characters that have meaning in PostgREST filter syntax. */
export function cleanSearch(q) {
  return (q || "").replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

const ERROR_MESSAGES = [
  [/invalid login credentials/i, tr("האימייל או הסיסמה שגויים")],
  [/email not confirmed/i, tr("צריך לאשר את כתובת האימייל. בדקו את תיבת הדואר שלכם")],
  [/user already registered/i, tr("כבר קיים חשבון עם האימייל הזה")],
  [/password should be at least/i, tr("הסיסמה חייבת להכיל לפחות 8 תווים")],
  [/weak.?password|password is known to be weak/i, tr("הסיסמה חלשה מדי. נסו סיסמה ארוכה ומגוונת יותר")],
  [/rate limit|too many/i, tr("יותר מדי ניסיונות. נסו שוב בעוד כמה דקות")],
  [/profiles_username_key|duplicate key.*username/i, tr("שם המשתמש כבר תפוס")],
  [/profiles_username_check/i, tr("שם משתמש: 3–30 תווים, אותיות באנגלית קטנות, ספרות וקו תחתון")],
  [/payments not configured/i, tr("התשלומים עוד לא פתוחים. נסו שוב בקרוב")],
  [/no billing account/i, tr("עוד אין לכם מנוי בתשלום")],
  [/billing cancel failed/i, tr("לא הצלחנו לבטל את המנוי ב-Paddle, ולכן החשבון לא נמחק. נסו שוב בעוד כמה דקות או כתבו לנו")],
  [/mfa required/i, tr("צריך להזין את הקוד מאפליקציית האימות. התחברו מחדש")],
  [/already subscribed/i, tr("כבר יש לכם מנוי פעיל. אפשר לשנות אותו בהגדרות")],
  [/account suspended/i, tr("החשבון מושעה ולא ניתן לפרסם")],
  [/blocked/i, tr("לא ניתן לבצע את הפעולה מול המשתמש הזה")],
  [/row-level security|permission denied/i, tr("אין הרשאה לבצע את הפעולה")],
  [/slow down/i, tr("רגע, אתם מהירים מדי. נסו שוב בעוד דקה")],
  [/check constraint/i, tr("חלק מהנתונים אינם תקינים")],
  [/failed to fetch payment form/i, tr("טופס התשלום לא נטען. אם יש חוסם פרסומות, כבו אותו לאתר הזה ונסו שוב")],
  [/failed to fetch|network/i, tr("בעיית חיבור לאינטרנט. נסו שוב")],
  [/payload too large|exceeded the maximum allowed size/i, tr("הקובץ גדול מדי")],
  [/mime type/i, tr("סוג הקובץ אינו נתמך")],
];

export function errorMessage(err) {
  const msg = err?.message || String(err || "");
  for (const [re, text] of ERROR_MESSAGES) if (re.test(msg)) return text;
  return tr("משהו השתבש. נסו שוב");
}

export const initials = (name) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/**
 * Text direction for user-written text: Hebrew/Arabic anywhere → right-to-left, otherwise
 * left-to-right when it has Latin letters. (dir="auto" would flip Hebrew text that starts with "DJ".)
 */
export function textDir(text) {
  const s = String(text ?? "");
  if (/[֐-׿؀-ۿ]/.test(s)) return "rtl";
  if (/[A-Za-z]/.test(s)) return "ltr";
  return undefined;
}
