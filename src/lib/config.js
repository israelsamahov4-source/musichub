// Product-wide settings and the option lists used across forms and filters.
// Change the brand name here and in index.html.
export const APP_NAME = "MusicHub";
export const APP_TAGLINE = "הרשת החברתית למוזיקאים";
export const SUPPORT_EMAIL = "support@example.com"; // TODO: replace with a real address before launch

export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === "true";
export const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

const toMap = (list) => Object.fromEntries(list.map((o) => [o.value, o.label]));

export const INSTRUMENTS = [
  { value: "vocals", label: "שירה" },
  { value: "guitar", label: "גיטרה" },
  { value: "bass", label: "בס" },
  { value: "drums", label: "תופים" },
  { value: "piano", label: "פסנתר / קלידים" },
  { value: "violin", label: "כינור" },
  { value: "cello", label: "צ'לו" },
  { value: "saxophone", label: "סקסופון" },
  { value: "trumpet", label: "חצוצרה" },
  { value: "flute", label: "חליל" },
  { value: "oud", label: "עוד" },
  { value: "percussion", label: "כלי הקשה" },
  { value: "synth", label: "סינתיסייזר" },
  { value: "dj", label: "DJ" },
  { value: "other", label: "אחר" },
];

export const ROLES = [
  { value: "vocalist", label: "זמר/ת" },
  { value: "instrumentalist", label: "נגן/ית" },
  { value: "producer", label: "מפיק/ה" },
  { value: "composer", label: "מלחין/ה" },
  { value: "songwriter", label: "כותב/ת שירים" },
  { value: "arranger", label: "מעבד/ת" },
  { value: "sound_engineer", label: "סאונדמן/ית" },
  { value: "mixing_engineer", label: "מיקס ומאסטרינג" },
  { value: "teacher", label: "מורה למוזיקה" },
  { value: "dj", label: "DJ" },
];

export const LEVELS = [
  { value: "beginner", label: "מתחיל/ה" },
  { value: "intermediate", label: "בינוני" },
  { value: "advanced", label: "מתקדם/ת" },
  { value: "professional", label: "מקצוען/ית" },
];

export const GENRES = [
  { value: "pop", label: "פופ" },
  { value: "rock", label: "רוק" },
  { value: "hiphop", label: "היפ-הופ" },
  { value: "rnb", label: "R&B" },
  { value: "electronic", label: "אלקטרוני" },
  { value: "jazz", label: "ג'אז" },
  { value: "classical", label: "קלאסי" },
  { value: "mizrahi", label: "מזרחית" },
  { value: "israeli", label: "ישראלית" },
  { value: "metal", label: "מטאל" },
  { value: "folk", label: "פולק" },
  { value: "blues", label: "בלוז" },
  { value: "reggae", label: "רגאיי" },
  { value: "world", label: "מוזיקת עולם" },
  { value: "indie", label: "אינדי" },
  { value: "other", label: "אחר" },
];

export const LOOKING_FOR = [
  { value: "collaboration", label: "שיתופי פעולה" },
  { value: "band_members", label: "חברים ללהקה" },
  { value: "jam_sessions", label: "ג'אמים" },
  { value: "gigs", label: "הופעות" },
  { value: "recording", label: "הקלטות" },
  { value: "teaching", label: "ללמד" },
  { value: "learning", label: "ללמוד" },
  { value: "networking", label: "נטוורקינג" },
];

export const PROJECT_TYPES = [
  { value: "single", label: "סינגל" },
  { value: "album", label: "אלבום / EP" },
  { value: "songwriting", label: "כתיבת שירים" },
  { value: "production", label: "הפקה" },
  { value: "remix", label: "רמיקס" },
  { value: "band", label: "הקמת להקה" },
  { value: "jam", label: "ג'אם" },
  { value: "other", label: "אחר" },
];

export const PROJECT_STATUS = [
  { value: "planning", label: "בתכנון" },
  { value: "in_progress", label: "בעבודה" },
  { value: "review", label: "בבדיקה" },
  { value: "completed", label: "הושלם" },
  { value: "on_hold", label: "מושהה" },
];

export const TASK_STATUS = [
  { value: "todo", label: "לביצוע" },
  { value: "in_progress", label: "בעבודה" },
  { value: "done", label: "בוצע" },
];

export const COURSE_CATEGORIES = [
  { value: "guitar", label: "גיטרה" },
  { value: "piano", label: "פסנתר" },
  { value: "vocals", label: "שירה" },
  { value: "drums", label: "תופים" },
  { value: "bass", label: "בס" },
  { value: "production", label: "הפקה" },
  { value: "theory", label: "תיאוריה" },
  { value: "mixing", label: "מיקס ומאסטרינג" },
  { value: "songwriting", label: "כתיבת שירים" },
  { value: "dj", label: "DJ" },
  { value: "other", label: "אחר" },
];

export const COURSE_LEVELS = [
  { value: "beginner", label: "מתחילים" },
  { value: "intermediate", label: "בינוני" },
  { value: "advanced", label: "מתקדמים" },
];

export const OPEN_TO = [
  { value: "projects", label: "פרויקטים משותפים" },
  { value: "band", label: "להצטרף ללהקה" },
  { value: "gigs", label: "הופעות" },
  { value: "sessions", label: "הקלטות סשן" },
  { value: "teaching", label: "ללמד" },
  { value: "paid_work", label: "עבודה בתשלום" },
];

export const VISIBILITY = [
  { value: "public", label: "כולם", text: "כל מי שנכנס לאתר, גם בלי חשבון" },
  { value: "members", label: "חברי הקהילה", text: "רק משתמשים רשומים ומחוברים" },
  { value: "applications", label: "רק מי שאני פונה אליו", text: "מנהלי פרויקטים שביקשתי להצטרף אליהם, שותפים לפרויקט ואנשים שאני מתכתב איתם" },
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
  openTo: toMap(OPEN_TO),
};

export const label = (group, value) => LABELS[group]?.[value] ?? value;

export const PLANS = [
  {
    tier: "free",
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    tagline: "כל מה שצריך כדי להתחבר ולהתחיל",
    features: ["פרופיל מוזיקלי מקצועי", "פיד, עוקבים והודעות", "פרויקטים משותפים ללא הגבלה", "גישה לכל הקורסים החינמיים"],
  },
  {
    tier: "pro",
    name: "Pro",
    price: { monthly: 29, yearly: 290 },
    tagline: "למוזיקאים שרוצים ללמוד ולהתקדם",
    highlight: true,
    features: ["כל מה שב-Free", "גישה לכל קורסי ה-Pro", "תג Pro בפרופיל"],
  },
  {
    tier: "premium",
    name: "Premium",
    price: { monthly: 59, yearly: 590 },
    tagline: "למורים ויוצרים שרוצים ללמד",
    features: ["כל מה שב-Pro", "פתיחת קורסים ולימוד תלמידים", "קורסי Pro בתשלום משלך", "תג Premium בפרופיל"],
  },
];
