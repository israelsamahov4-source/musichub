import { tr } from "@/lib/i18n";

// Sheet music is stored as ABC notation text (https://abcnotation.com), drawn and played with abcjs.
// The editor keeps the header (title, key, meter, tempo, clef) as form fields and builds the note
// line ("body") one click at a time. Note lengths are counted in sixteenths (L:1/16), so a quarter
// note is "4", a half note "8" and so on.

export const MAX_NOTATION = 20000;

const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

// value = the ABC key; sharps > 0, flats < 0.
export const KEYS = [
  { value: "C", label: tr("דו מז'ור (C)"), sig: 0 },
  { value: "G", label: tr("סול מז'ור (G)"), sig: 1 },
  { value: "D", label: tr("רה מז'ור (D)"), sig: 2 },
  { value: "A", label: tr("לה מז'ור (A)"), sig: 3 },
  { value: "E", label: tr("מי מז'ור (E)"), sig: 4 },
  { value: "F", label: tr("פה מז'ור (F)"), sig: -1 },
  { value: "Bb", label: tr("סי במול מז'ור (B♭)"), sig: -2 },
  { value: "Eb", label: tr("מי במול מז'ור (E♭)"), sig: -3 },
  { value: "Ab", label: tr("לה במול מז'ור (A♭)"), sig: -4 },
  { value: "Am", label: tr("לה מינור (Am)"), sig: 0 },
  { value: "Em", label: tr("מי מינור (Em)"), sig: 1 },
  { value: "Bm", label: tr("סי מינור (Bm)"), sig: 2 },
  { value: "Dm", label: tr("רה מינור (Dm)"), sig: -1 },
  { value: "Gm", label: tr("סול מינור (Gm)"), sig: -2 },
  { value: "Cm", label: tr("דו מינור (Cm)"), sig: -3 },
];

// size = sixteenths in one bar; beat = sixteenths that are beamed together.
export const METERS = [
  { value: "4/4", size: 16, beat: 4 },
  { value: "3/4", size: 12, beat: 4 },
  { value: "2/4", size: 8, beat: 4 },
  { value: "6/8", size: 12, beat: 6 },
];

export const DURATIONS = [
  { value: 16, label: tr("שלם") },
  { value: 8, label: tr("חצי") },
  { value: 4, label: tr("רבע") },
  { value: 2, label: tr("שמינית") },
  { value: 1, label: tr("שש-עשרה") },
];

export const CLEFS = [
  { value: "treble", label: tr("מפתח סול") },
  { value: "bass", label: tr("מפתח פה") },
];

export const EMPTY_SCORE = { title: "", key: "C", meter: "4/4", tempo: 90, clef: "treble", body: "" };

const meterOf = (m) => METERS.find((x) => x.value === m) ?? METERS[0];
const keyOf = (k) => KEYS.find((x) => x.value === k) ?? KEYS[0];
const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();

/** Letter -> +1 / -1 for the letters the key signature changes. */
export function keyAccidentals(key) {
  const sig = keyOf(key).sig;
  const out = {};
  if (sig > 0) SHARP_ORDER.slice(0, sig).forEach((l) => { out[l] = 1; });
  if (sig < 0) FLAT_ORDER.slice(0, -sig).forEach((l) => { out[l] = -1; });
  return out;
}

/** The full ABC text saved in the database. */
export function buildAbc(s) {
  const tempo = Math.min(240, Math.max(30, Number(s.tempo) || 90));
  return [
    "X:1",
    `T:${oneLine(s.title)}`,
    `M:${meterOf(s.meter).value}`,
    "L:1/16",
    `Q:1/4=${tempo}`,
    `K:${keyOf(s.key).value} clef=${s.clef === "bass" ? "bass" : "treble"}`,
    String(s.body ?? "").trim(),
  ].join("\n");
}

/** Reads ABC written by this editor back into editor fields. Unknown text stays in the body. */
export function parseAbc(abc) {
  if (!abc) return { ...EMPTY_SCORE };
  const lines = String(abc).split(/\r?\n/);
  const s = { ...EMPTY_SCORE };
  const bodyLines = [];
  let inBody = false;
  for (const line of lines) {
    if (inBody) { bodyLines.push(line); continue; }
    const m = line.match(/^([A-Za-z]):\s*(.*)$/);
    if (!m) { bodyLines.push(line); inBody = true; continue; }
    const [, field, value] = m;
    if (field === "T") s.title = value;
    else if (field === "M" && METERS.some((x) => x.value === value.trim())) s.meter = value.trim();
    else if (field === "Q") { const q = value.match(/=\s*(\d+)/); if (q) s.tempo = Number(q[1]); }
    else if (field === "K") {
      const k = value.trim().split(/\s+/)[0];
      if (KEYS.some((x) => x.value === k)) s.key = k;
      s.clef = /clef=bass/.test(value) ? "bass" : "treble";
      inBody = true;
    }
  }
  s.body = bodyLines.join("\n").trim();
  return s;
}

export const isEmptyScore = (abc) => !abc || !parseAbc(abc).body.trim();

/** Length of an ABC length suffix in sixteenths ("" = 1, "4" = 4, "/2" = 0.5, "3/2" = 1.5). */
function lengthOf(suffix) {
  if (!suffix) return 1;
  const m = suffix.match(/^(\d*)(\/?)(\d*)$/);
  if (!m) return 1;
  const num = m[1] ? Number(m[1]) : 1;
  const den = m[2] ? (m[3] ? Number(m[3]) : 2) : 1;
  return num / den;
}

const NOTE_RE = /([\^_=]*)([A-Ga-gz])([,']*)(\d*\/?\d*)/g;

/** The bar being written: how full it is, and which accidentals already appeared in it. */
export function currentBar(body) {
  const last = String(body ?? "").split("|").pop().replace(/"[^"]*"/g, "");
  let fill = 0;
  let lastLen = null;
  const accidentals = {};
  for (const m of last.matchAll(NOTE_RE)) {
    const [, acc, letter, oct, len] = m;
    const l = lengthOf(len);
    fill += l;
    lastLen = l;
    // Keyed by the pitch as written ("c'", "F,"), so the same note in another octave is not affected.
    if (letter !== "z" && acc) accidentals[letter + oct] = acc.startsWith("^") ? 1 : acc.startsWith("_") ? -1 : 0;
  }
  return { fill, lastLen, accidentals };
}

// Pitch class -> [letter, alteration]; black keys are written as sharps in sharp keys and flats in flat keys.
const SHARP_NAMES = [["C", 0], ["C", 1], ["D", 0], ["D", 1], ["E", 0], ["F", 0], ["F", 1], ["G", 0], ["G", 1], ["A", 0], ["A", 1], ["B", 0]];
const FLAT_NAMES = [["C", 0], ["D", -1], ["D", 0], ["E", -1], ["E", 0], ["F", 0], ["G", -1], ["G", 0], ["A", -1], ["A", 0], ["B", -1], ["B", 0]];
export const isBlackKey = (midi) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
export const NOTE_NAMES_HE = { C: tr("דו"), D: tr("רה"), E: tr("מי"), F: tr("פה"), G: tr("סול"), A: tr("לה"), B: tr("סי") };

/** ABC letter with octave marks: middle C (MIDI 60) is "C", the octave above is "c". */
function abcPitch(letter, octave) {
  if (octave >= 5) return letter.toLowerCase() + "'".repeat(octave - 5);
  return letter + ",".repeat(Math.max(0, 4 - octave));
}

/**
 * Adds one note (MIDI number) or a rest (midi = null) to the body.
 * Writes an accidental only when needed, beams short notes inside a beat, and closes the bar when it is full.
 */
export function appendNote(score, { midi, length, chord }) {
  const meter = meterOf(score.meter);
  const body = String(score.body ?? "").replace(/\s+$/, "");
  const bar = currentBar(body);
  let token;
  if (midi == null) {
    token = "z";
  } else {
    const pc = ((midi % 12) + 12) % 12;
    const [letter, want] = (keyOf(score.key).sig < 0 ? FLAT_NAMES : SHARP_NAMES)[pc];
    const octave = Math.floor(midi / 12) - 1;
    const pitch = abcPitch(letter, octave);
    const already = bar.accidentals[pitch] ?? keyAccidentals(score.key)[letter] ?? 0;
    const mark = want === already ? "" : want === 1 ? "^" : want === -1 ? "_" : "=";
    token = mark + pitch;
  }
  token += length === 1 ? "" : String(length);
  const chordText = oneLine(chord).replace(/"/g, "");
  if (chordText) token = `"${chordText}"` + token;

  // Short notes in the same beat are joined (no space) so they are drawn with a beam.
  const beam = !chordText && bar.lastLen != null && bar.lastLen < 4 && length < 4 && bar.fill % meter.beat !== 0;
  let next = body + (body && !beam ? " " : "") + token;
  if (bar.fill + length >= meter.size) {
    const bars = (next.match(/\|/g) || []).length + 1;
    next += bars % 4 === 0 ? " |\n" : " |";
  }
  return { ...score, body: next };
}

/** Adds a bar line by hand (e.g. to end a bar early). */
export function appendBar(score) {
  const body = String(score.body ?? "").replace(/\s+$/, "");
  if (!body || body.endsWith("|")) return score;
  return { ...score, body: body + " |" };
}

const TOKEN_RE = /(?:"[^"]*")?[\^_=]*[A-Ga-gz][,']*\d*\/?\d*|\|\]|\|\||\||\S/g;

/** Removes the last note or rest (and the bar line right after it, if the bar was closed). */
export function undoLast(score) {
  const body = String(score.body ?? "").replace(/\s+$/, "");
  const all = [...body.matchAll(TOKEN_RE)];
  if (!all.length) return { ...score, body: "" };
  let cut = all.length - 1;
  if (all[cut][0].startsWith("|") && cut > 0) cut -= 1;
  return { ...score, body: body.slice(0, all[cut].index).replace(/\s+$/, "") };
}

/**
 * Plays a rendered tune with the browser's own sound (no sound files to download).
 * Returns a stop() function. onEnd runs when the music finishes or is stopped;
 * onNote gets each note as it sounds (needs abcjs's TimingCallbacks), and null at the end.
 */
export function playTune(visualObj, { onEnd, onNote, TimingCallbacks } = {}) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error("audio not supported");
  const ctx = new Ctx();
  const audio = visualObj.setUpAudio();
  const meter = visualObj.getMeterFraction();
  const secondsPerWhole = visualObj.millisecondsPerMeasure() / 1000 / (meter.num / meter.den);
  const t0 = ctx.currentTime + 0.12;
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  audio.tracks.forEach((track, trackIndex) => {
    for (const ev of track) {
      if (ev.cmd !== "note" || ev.pitch == null) continue;
      const start = t0 + ev.start * secondsPerWhole;
      const len = Math.max(0.05, ev.duration * secondsPerWhole);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = trackIndex === 0 ? "triangle" : "sine";
      osc.frequency.value = 440 * 2 ** ((ev.pitch - 69) / 12);
      const peak = (ev.volume ?? 90) / 127 * (trackIndex === 0 ? 1 : 0.45);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.015);
      gain.gain.setTargetAtTime(peak * 0.6, start + 0.03, 0.15);
      gain.gain.setTargetAtTime(0, start + len * 0.92, 0.03);
      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + len + 0.2);
    }
  });

  let timer = null;
  let done = false;
  const timing = onNote && TimingCallbacks ? new TimingCallbacks(visualObj, { eventCallback: (e) => onNote(e) }) : null;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    timing?.stop();
    onNote?.(null);
    ctx.close().catch(() => {});
    onEnd?.();
  };
  timing?.start();
  timer = setTimeout(finish, (audio.totalDuration * secondsPerWhole + 0.6) * 1000);
  return finish;
}
