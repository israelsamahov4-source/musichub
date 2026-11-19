import { tr } from "@/lib/i18n";
// Product-wide settings and the option lists used across forms and filters.
// Change the brand name here and in index.html.
export const APP_NAME = "MusicHub";
export const APP_TAGLINE = tr("הרשת החברתית למוזיקאים");
export const SUPPORT_EMAIL = "support@example.com"; // TODO: replace with a real address before launch

// Business details shown in the legal pages. Fill these in once (with the lawyer's review) and every page updates.
export const LEGAL = {
  businessName: tr("[שם העסק]"),
  businessId: tr("[מספר עוסק / ח.פ]"),
  address: tr("[כתובת]"),
  courtCity: tr("[עיר]"),
  accessibilityCoordinator: tr("[שם רכז/ת הנגישות]"),
  phone: tr("[טלפון]"),
  updated: tr("[תאריך עדכון]"),
  accessibilityAuditDate: tr("נובמבר 2026"),
};

// Until a detail is filled in above, the pages leave it out instead of showing "[...]" or the example address.
export const isFilled = (v) => typeof v === "string" && v.trim() !== "" && !/^\[.*\]$/.test(v.trim()) && !/@example\.com$/i.test(v.trim());
export const filledList = (...values) => values.filter(isFilled).join(", ");

// Payments switch on automatically once the Paddle client token is configured in Vercel.
export const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "";
export const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV === "production" ? "production" : "sandbox";
export const PAYMENTS_ENABLED = Boolean(PADDLE_CLIENT_TOKEN);
export const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

const toMap = (list) => Object.fromEntries(list.map((o) => [o.value, o.label]));

export const INSTRUMENTS = [
  { value: "vocals", label: tr("שירה") },
  { value: "guitar", label: tr("גיטרה") },
  { value: "bass", label: tr("בס") },
  { value: "drums", label: tr("תופים") },
  { value: "piano", label: tr("פסנתר / קלידים") },
  { value: "violin", label: tr("כינור") },
  { value: "cello", label: tr("צ'לו") },
  { value: "saxophone", label: tr("סקסופון") },
  { value: "trumpet", label: tr("חצוצרה") },
  { value: "flute", label: tr("חליל") },
  { value: "oud", label: tr("עוד") },
  { value: "percussion", label: tr("כלי הקשה") },
  { value: "synth", label: tr("סינתיסייזר") },
  { value: "dj", label: "DJ" },
  { value: "other", label: tr("אחר") },
];

export const ROLES = [
  { value: "vocalist", label: tr("זמר/ת") },
  { value: "instrumentalist", label: tr("נגן/ית") },
  { value: "producer", label: tr("מפיק/ה") },
  { value: "composer", label: tr("מלחין/ה") },
  { value: "songwriter", label: tr("כותב/ת שירים") },
  { value: "arranger", label: tr("מעבד/ת") },
  { value: "sound_engineer", label: tr("סאונדמן/ית") },
  { value: "mixing_engineer", label: tr("מיקס ומאסטרינג") },
  { value: "teacher", label: tr("מורה למוזיקה") },
  { value: "dj", label: "DJ" },
];

export const LEVELS = [
  { value: "beginner", label: tr("מתחיל/ה") },
  { value: "intermediate", label: tr("בינוני") },
  { value: "advanced", label: tr("מתקדם/ת") },
  { value: "professional", label: tr("מקצוען/ית") },
];

export const GENRES = [
  { value: "pop", label: tr("פופ") },
  { value: "rock", label: tr("רוק") },
  { value: "hiphop", label: tr("היפ-הופ") },
  { value: "rnb", label: "R&B" },
  { value: "electronic", label: tr("אלקטרוני") },
  { value: "jazz", label: tr("ג'אז") },
  { value: "classical", label: tr("קלאסי") },
  { value: "mizrahi", label: tr("מזרחית") },
  { value: "israeli", label: tr("ישראלית") },
  { value: "metal", label: tr("מטאל") },
  { value: "folk", label: tr("פולק") },
  { value: "blues", label: tr("בלוז") },
  { value: "reggae", label: tr("רגאיי") },
  { value: "world", label: tr("מוזיקת עולם") },
  { value: "indie", label: tr("אינדי") },
  { value: "other", label: tr("אחר") },
];

export const LOOKING_FOR = [
  { value: "collaboration", label: tr("שיתופי פעולה") },
  { value: "band_members", label: tr("חברים ללהקה") },
  { value: "jam_sessions", label: tr("ג'אמים") },
  { value: "gigs", label: tr("הופעות") },
  { value: "recording", label: tr("הקלטות") },
  { value: "teaching", label: tr("ללמד") },
  { value: "learning", label: tr("ללמוד") },
  { value: "networking", label: tr("נטוורקינג") },
  { value: "sessions", label: tr("הקלטות סשן") },
  { value: "paid_work", label: tr("עבודה בתשלום") },
];

export const PROJECT_TYPES = [
  { value: "single", label: tr("סינגל") },
  { value: "album", label: tr("אלבום / EP") },
  { value: "songwriting", label: tr("כתיבת שירים") },
  { value: "production", label: tr("הפקה") },
  { value: "remix", label: tr("רמיקס") },
  { value: "band", label: tr("הקמת להקה") },
  { value: "jam", label: tr("ג'אם") },
  { value: "other", label: tr("אחר") },
];

export const PROJECT_STATUS = [
  { value: "planning", label: tr("בתכנון") },
  { value: "in_progress", label: tr("בעבודה") },
  { value: "review", label: tr("בבדיקה") },
  { value: "completed", label: tr("הושלם") },
  { value: "on_hold", label: tr("מושהה") },
];

export const TASK_STATUS = [
  { value: "todo", label: tr("לביצוע") },
  { value: "in_progress", label: tr("בעבודה") },
  { value: "done", label: tr("בוצע") },
];

export const COURSE_CATEGORIES = [
  { value: "guitar", label: tr("גיטרה") },
  { value: "piano", label: tr("פסנתר") },
  { value: "vocals", label: tr("שירה") },
  { value: "drums", label: tr("תופים") },
  { value: "bass", label: tr("בס") },
  { value: "production", label: tr("הפקה") },
  { value: "theory", label: tr("תיאוריה") },
  { value: "mixing", label: tr("מיקס ומאסטרינג") },
  { value: "songwriting", label: tr("כתיבת שירים") },
  { value: "dj", label: "DJ" },
  { value: "other", label: tr("אחר") },
];

export const COURSE_LEVELS = [
  { value: "beginner", label: tr("מתחילים") },
  { value: "intermediate", label: tr("בינוני") },
  { value: "advanced", label: tr("מתקדמים") },
];

export const VISIBILITY = [
  { value: "public", label: tr("כולם"), text: tr("כל מי שנכנס לאתר, גם בלי חשבון") },
  { value: "members", label: tr("חברי הקהילה"), text: tr("רק משתמשים רשומים ומחוברים") },
  { value: "applications", label: tr("רק מי שאני פונה אליו"), text: tr("מנהלי פרויקטים שביקשתי להצטרף אליהם, שותפים לפרויקט ואנשים שאני מתכתב איתם") },
];

export const LABELS = {
  instruments: toMap(INSTRUMENTS),
  roles: toMap(ROLES),
  levels: toMap(LEVELS),
  genres: toMap(GENRES),
  lookingFor: toMap(LOOKING_FOR),
  projectTypes: toMap(PROJECT_TYPES),
  projectStatus: toMap(PROJECT_STATUS),
  courseCategories: toMap(COURSE_CATEGORIES),
  courseLevels: toMap(COURSE_LEVELS),
};

export const label = (group, value) => LABELS[group]?.[value] ?? value;

export const PLANS = [
  {
    tier: "free",
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    tagline: tr("כל מה שצריך כדי להתחבר ולהתחיל"),
    features: [tr("פרופיל מוזיקלי מקצועי"), tr("פיד, עוקבים והודעות"), tr("פרויקטים משותפים ללא הגבלה"), tr("גישה לכל הקורסים החינמיים")],
  },
  {
    tier: "pro",
    name: "Pro",
    price: { monthly: 29, yearly: 290 },
    tagline: tr("למוזיקאים שרוצים ללמוד ולהתקדם"),
    highlight: true,
    features: [tr("כל מה שב-Free"), tr("גישה לכל קורסי ה-Pro"), tr("תג Pro בפרופיל")],
  },
  {
    tier: "premium",
    name: "Premium",
    price: { monthly: 59, yearly: 590 },
    tagline: tr("למורים ויוצרים שרוצים ללמד"),
    features: [tr("כל מה שב-Pro"), tr("פתיחת קורסים ולימוד תלמידים"), tr("קורסי Pro בתשלום משלכם"), tr("תג Premium בפרופיל")],
  },
];
