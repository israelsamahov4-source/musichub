import EN from "./en";

// The chosen language lives in this browser. Switching reloads the page, so every text
// (including lists defined once when the app starts) is read again in the new language.
// A link with ?lang=en (or ?lang=he) picks the language and remembers it.
if (typeof window !== "undefined") {
  const fromLink = new URLSearchParams(window.location.search).get("lang");
  if (fromLink === "en" || fromLink === "he") localStorage.setItem("lang", fromLink);
}
const stored = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;
export const LANG = stored === "en" ? "en" : "he";
export const DIR = LANG === "en" ? "ltr" : "rtl";

/** The text in the current language. `{0}`, `{1}` are filled with the extra arguments. */
export function tr(text, ...args) {
  const s = LANG === "en" ? (EN[text] ?? text) : text;
  return args.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(args[i] ?? "")) : s;
}

export function setLang(lang) {
  localStorage.setItem("lang", lang === "en" ? "en" : "he");
  window.location.reload();
}

/** Run once at start-up: tells the browser the page language and reading direction. */
export function applyLangToDocument() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = DIR;
}
