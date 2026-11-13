import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { he } from "date-fns/locale";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const timeAgo = (date) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: he });
export const formatDate = (date, pattern = "d בMMMM yyyy") => format(new Date(date), pattern, { locale: he });

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
  [/invalid login credentials/i, "האימייל או הסיסמה שגויים"],
  [/email not confirmed/i, "צריך לאשר את כתובת האימייל. בדקו את תיבת הדואר שלכם"],
  [/user already registered/i, "כבר קיים חשבון עם האימייל הזה"],
  [/password should be at least/i, "הסיסמה חייבת להכיל לפחות 8 תווים"],
  [/weak.?password|password is known to be weak/i, "הסיסמה חלשה מדי. נסו סיסמה ארוכה ומגוונת יותר"],
  [/rate limit|too many/i, "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות"],
  [/profiles_username_key|duplicate key.*username/i, "שם המשתמש כבר תפוס"],
  [/profiles_username_check/i, "שם משתמש: 3–30 תווים, אותיות באנגלית קטנות, ספרות וקו תחתון"],
  [/blocked/i, "לא ניתן לבצע את הפעולה מול המשתמש הזה"],
  [/row-level security|permission denied/i, "אין הרשאה לבצע את הפעולה"],
  [/slow down/i, "רגע, אתם מהירים מדי. נסו שוב בעוד דקה"],
  [/check constraint/i, "חלק מהנתונים אינם תקינים"],
  [/failed to fetch|network/i, "בעיית חיבור לאינטרנט. נסו שוב"],
  [/payload too large|exceeded the maximum allowed size/i, "הקובץ גדול מדי"],
  [/mime type/i, "סוג הקובץ אינו נתמך"],
];

export function errorMessage(err) {
  const msg = err?.message || String(err || "");
  for (const [re, text] of ERROR_MESSAGES) if (re.test(msg)) return text;
  return "משהו השתבש. נסו שוב";
}

export const initials = (name) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
