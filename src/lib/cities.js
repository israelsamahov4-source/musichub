// Cities people pick from, so "ת"א", "תל אביב" and "tlv" all become one value and search finds them.
// Anything not on the list can still be typed as free text (e.g. a city abroad).

const REGIONS = [
  { name: "גוש דן", cities: [
    ["תל אביב-יפו", "תל אביב", "תא", "תלאביב", "tel aviv", "tlv", "יפו", "jaffa"],
    ["רמת גן", "ramat gan"], ["גבעתיים", "givatayim"], ["בני ברק", "bnei brak"], ["חולון", "holon"], ["בת ים", "bat yam"],
    ["אור יהודה"], ["קריית אונו", "קרית אונו"], ["יהוד-מונוסון", "יהוד"], ["פתח תקווה", "פתח תקוה", "פת", "petah tikva"],
    ["ראש העין"], ["גבעת שמואל"], ["אלעד"],
  ] },
  { name: "השרון", cities: [
    ["הרצליה", "herzliya"], ["רעננה", "raanana"], ["כפר סבא", "כס", "kfar saba"], ["הוד השרון"], ["רמת השרון"],
    ["נתניה", "netanya"], ["כפר יונה"], ["אבן יהודה"], ["קדימה-צורן", "קדימה"], ["טייבה"], ["טירה"], ["קלנסווה"],
  ] },
  { name: "השפלה", cities: [
    ["ראשון לציון", "ראשלצ", "ראשון", "rishon"], ["רחובות", "rehovot"], ["נס ציונה"], ["יבנה"], ["לוד"], ["רמלה"],
    ["מודיעין-מכבים-רעות", "מודיעין", "modiin"], ["גדרה"], ["באר יעקב"], ["שוהם"],
  ] },
  { name: "ירושלים והסביבה", cities: [
    ["ירושלים", "ים", "jerusalem"], ["בית שמש"], ["מבשרת ציון", "מבשרת"], ["מעלה אדומים"], ["אבו גוש"],
  ] },
  { name: "חיפה והכרמל", cities: [
    ["חיפה", "haifa"], ["קריית אתא", "קרית אתא"], ["קריית ביאליק", "קרית ביאליק"], ["קריית מוצקין", "קרית מוצקין"],
    ["קריית ים", "קרית ים"], ["נשר"], ["טירת כרמל"], ["עספיא"], ["דלית אל-כרמל"], ["זכרון יעקב", "זכרון"], ["בנימינה"],
    ["פרדס חנה-כרכור", "פרדס חנה", "כרכור"], ["חדרה", "hadera"], ["אום אל-פחם"], ["יקנעם"],
  ] },
  { name: "הצפון", cities: [
    ["נצרת", "nazareth"], ["נוף הגליל", "נצרת עילית"], ["עפולה"], ["טבריה", "tiberias"], ["צפת", "safed"], ["כרמיאל", "karmiel"],
    ["עכו", "acre"], ["נהריה", "nahariya"], ["מעלות-תרשיחא", "מעלות"], ["קריית שמונה", "קרית שמונה"], ["שפרעם"], ["סח'נין"],
    ["טמרה"], ["מגדל העמק"], ["בית שאן"], ["ראש פינה"], ["קצרין"],
  ] },
  { name: "הדרום", cities: [
    ["באר שבע", "בש", "beer sheva"], ["אשדוד", "ashdod"], ["אשקלון", "ashkelon"], ["קריית גת", "קרית גת"], ["קריית מלאכי", "קרית מלאכי"],
    ["שדרות"], ["נתיבות"], ["אופקים"], ["רהט"], ["דימונה"], ["ערד"], ["ירוחם"], ["מצפה רמון"], ["אילת", "eilat"],
  ] },
];

// Hebrew quote marks, hyphens and spaces are ignored, so ת"א = תא and פתח-תקווה = פתח תקווה.
export const normalizePlace = (s) => (s || "").toLowerCase().replace(/["'״׳`\-\s.]/g, "");

export const CITIES = REGIONS.flatMap((r) => r.cities.map(([name, ...aliases]) => ({
  name, region: r.name, keys: [name, ...aliases].map(normalizePlace),
})));
export const REGION_NAMES = REGIONS.map((r) => r.name);
export const citiesIn = (region) => CITIES.filter((c) => c.region === region).map((c) => c.name);

/** The listed city a text means ("תא" → "תל אביב-יפו"), or null. */
export function canonicalCity(text) {
  const k = normalizePlace(text);
  return (k && CITIES.find((c) => c.keys.includes(k))?.name) || null;
}

/** Up to `limit` suggestions: cities (and regions, if asked) that start with, then contain, the text. */
export function suggestPlaces(text, { regions = false, limit = 6 } = {}) {
  const k = normalizePlace(text);
  const places = [
    ...(regions ? REGION_NAMES.map((name) => ({ name, region: null, keys: [normalizePlace(name)] })) : []),
    ...CITIES,
  ];
  if (!k) return regions ? places.slice(0, REGION_NAMES.length) : [];
  const starts = places.filter((p) => p.keys.some((x) => x.startsWith(k)));
  const contains = places.filter((p) => !starts.includes(p) && p.keys.some((x) => x.includes(k)));
  return [...starts, ...contains].slice(0, limit);
}
