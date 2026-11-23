import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Delete, Eraser, Pause, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Field from "@/components/Field";
import ScoreView from "@/components/notation/ScoreView";
import {
  CLEFS, DURATIONS, KEYS, MAX_NOTATION, METERS, NOTE_NAMES_HE,
  appendBar, appendNote, buildAbc, isBlackKey, parseAbc, undoLast,
} from "@/lib/notation";
import { cn } from "@/lib/utils";
import { DIR, tr } from "@/lib/i18n";

// One shared audio context for the short sound each key makes.
let keyCtx = null;
function beep(midi) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    keyCtx = keyCtx || new Ctx();
    const t = keyCtx.currentTime;
    const osc = keyCtx.createOscillator();
    const gain = keyCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gain.gain.setTargetAtTime(0, t + 0.25, 0.08);
    osc.connect(gain).connect(keyCtx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  } catch { /* no sound is fine */ }
}

/** Two octaves of piano keys starting at C of `octave`; clicking a key writes that note. */
function Keyboard({ octave, onKey }) {
  const start = (octave + 1) * 12; // MIDI of C in that octave
  const keys = Array.from({ length: 25 }, (_, i) => start + i);
  const whites = keys.filter((m) => !isBlackKey(m));
  const letter = (m) => ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"][m % 12];
  return (
    <div dir="ltr" className="relative h-36 select-none overflow-x-auto rounded-xl bg-muted p-1.5" role="group" aria-label={tr("מקלדת לכתיבת תווים")}>
      <div className="relative flex h-full min-w-[520px]">
        {whites.map((m) => (
          <button key={m} type="button" onClick={() => onKey(m)}
            aria-label={`${NOTE_NAMES_HE[letter(m)]} ${Math.floor(m / 12) - 1}`}
            className="relative flex flex-1 items-end justify-center rounded-b-md border border-border bg-white pb-1.5 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-primary/10 active:bg-primary/20">
            {NOTE_NAMES_HE[letter(m)]}{m % 12 === 0 && <span className="ms-0.5 text-[9px] text-muted-foreground">{Math.floor(m / 12) - 1}</span>}
          </button>
        ))}
        {keys.filter(isBlackKey).map((m) => {
          const whiteIndex = whites.filter((w) => w < m).length; // black key sits on the line after this many white keys
          return (
            <button key={m} type="button" onClick={() => onKey(m)}
              aria-label={`${NOTE_NAMES_HE[letter(m)]} ${tr("דיאז")} / ${NOTE_NAMES_HE[letter(m + 1)]} ${tr("במול")}`}
              style={{ left: `calc(${(whiteIndex / whites.length) * 100}% - ${100 / whites.length / 3}%)`, width: `${(100 / whites.length) * 0.62}%` }}
              className="absolute top-0 z-10 h-[58%] rounded-b-md bg-neutral-900 shadow transition-colors hover:bg-primary active:bg-primary/80" />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Write sheet music by clicking: choose a length, then click piano keys.
 * onSave(abc, title) gets the finished ABC text.
 */
export default function ScoreEditor({ open, onOpenChange, initialAbc, onSave, saving = false, heading }) {
  const [score, setScore] = useState(() => parseAbc(initialAbc));
  const [length, setLength] = useState(4);
  const [dotted, setDotted] = useState(false);
  const [octave, setOctave] = useState(4);
  const [chord, setChord] = useState("");
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => { if (open) setScore(parseAbc(initialAbc)); }, [open, initialAbc]);

  const abc = useMemo(() => buildAbc(score), [score]);
  const tooLong = abc.length > MAX_NOTATION;
  const empty = !score.body.trim();
  const canDot = length !== 1 && length !== 16;
  const noteLength = dotted && canDot ? length * 1.5 : length;
  const set = (k) => (v) => setScore((s) => ({ ...s, [k]: v?.target ? v.target.value : v }));

  const add = (midi) => {
    if (midi != null) beep(midi);
    setScore((s) => appendNote(s, { midi, length: noteLength, chord }));
    setChord("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* minmax(0,1fr): the wide piano keyboard scrolls inside the dialog instead of stretching it past the screen. */}
      <DialogContent className="max-h-[94dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{heading || tr("כתיבת תווים")}</DialogTitle>
          <DialogDescription>{tr("בוחרים אורך תו ולוחצים על הקלידים. התווים מופיעים מיד, ואפשר לנגן אותם.")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="col-span-2">
            <Field id="score-title" label={tr("שם")}><Input id="score-title" value={score.title} onChange={set("title")} maxLength={100} placeholder={tr("למשל: מנגינה לשיעור 3")} /></Field>
          </div>
          <Field id="score-key" label={tr("סולם")}>
            <Select value={score.key} onValueChange={set("key")} dir={DIR}>
              <SelectTrigger id="score-key"><SelectValue /></SelectTrigger>
              <SelectContent>{KEYS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="score-meter" label={tr("משקל")}>
            <Select value={score.meter} onValueChange={set("meter")} dir={DIR}>
              <SelectTrigger id="score-meter"><SelectValue /></SelectTrigger>
              <SelectContent>{METERS.map((m) => <SelectItem key={m.value} value={m.value}><span dir="ltr">{m.value}</span></SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field id="score-tempo" label={tr("קצב (BPM)")}>
            <Input id="score-tempo" type="number" min={30} max={240} value={score.tempo} onChange={set("tempo")} />
          </Field>
        </div>

        <ScoreView abc={abc} />

        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr("אורך התו")}>
            {DURATIONS.map((d) => (
              <button key={d.value} type="button" aria-pressed={length === d.value} onClick={() => setLength(d.value)}
                className={cn("flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-medium transition-colors",
                  length === d.value ? "bg-primary text-white" : "bg-muted hover:bg-muted/70")}>
                {d.label}
              </button>
            ))}
            <button type="button" aria-pressed={dotted && canDot} disabled={!canDot} onClick={() => setDotted((v) => !v)}
              className={cn("min-h-9 rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-40",
                dotted && canDot ? "bg-primary text-white" : "bg-muted hover:bg-muted/70")}>
              {tr("עם נקודה")}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => add(null)}><Pause />{tr("הפסקה")}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setScore(appendBar)}><span aria-hidden className="font-bold">|</span>{tr("קו תיבה")}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setScore(undoLast)} disabled={empty}><Undo2 />{tr("ביטול אחרון")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setScore((s) => ({ ...s, body: "" }))} disabled={empty}><Eraser />{tr("ניקוי")}</Button>
            <div className="ms-auto flex items-center gap-2">
              <label htmlFor="score-chord" className="text-sm text-muted-foreground">{tr("אקורד לתו הבא")}</label>
              <Input id="score-chord" dir="ltr" value={chord} onChange={(e) => setChord(e.target.value)} maxLength={12} placeholder="Am7" className="h-9 w-24" />
            </div>
          </div>

          {/* Low notes on the left, like a real piano, also on a Hebrew page. */}
          <div dir="ltr" className="flex items-center gap-2">
            <Button type="button" size="icon" variant="ghost" onClick={() => setOctave((o) => Math.max(2, o - 1))} disabled={octave <= 2} aria-label={tr("אוקטבה נמוכה יותר")}><ChevronLeft /></Button>
            <div className="min-w-0 flex-1"><Keyboard octave={octave} onKey={add} /></div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setOctave((o) => Math.min(5, o + 1))} disabled={octave >= 5} aria-label={tr("אוקטבה גבוהה יותר")}><ChevronRight /></Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={score.clef} onValueChange={set("clef")} dir={DIR}>
              <SelectTrigger className="h-9 w-36" aria-label={tr("מפתח")}><SelectValue /></SelectTrigger>
              <SelectContent>{CLEFS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
            <button type="button" className="text-sm text-primary underline-offset-4 hover:underline" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
              {advanced ? tr("הסתרת עריכת טקסט") : tr("עריכת טקסט (ABC) למתקדמים")}
            </button>
          </div>
          {advanced && (
            <Field id="score-body" label={tr("שורת התווים בכתיב ABC")} hint={tr("כל שינוי כאן מופיע מיד בתווים למעלה.")}>
              <Textarea id="score-body" dir="ltr" rows={4} value={score.body} onChange={set("body")} className="font-mono text-sm" />
            </Field>
          )}
        </div>

        {tooLong && <p className="text-sm font-medium text-destructive" role="alert"><Delete className="me-1 inline h-4 w-4" aria-hidden />{tr("התווים ארוכים מדי לשמירה. קצרו אותם או פצלו לשני קטעים.")}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tr("ביטול")}</Button>
          <Button type="button" onClick={() => onSave(abc, score.title.trim())} disabled={empty || tooLong || saving}>{saving ? tr("שומרים…") : tr("שמירת התווים")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
