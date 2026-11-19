import { useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n";

const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

// A steady, made-up waveform per file (the same file always gets the same shape).
function bars(seed, n = 52) {
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1664525 + 1013904223) >>> 0;
    const wave = 0.55 + 0.45 * Math.sin(i / 4.2);
    return Math.round(22 + 78 * wave * (0.45 + (h / 2 ** 32) * 0.55));
  });
}

/** A music player for posts: play button, a waveform that fills as it plays, and a seek bar under it. */
export default function AudioPlayer({ src, title = tr("קטע שמע"), subtitle }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const shape = useMemo(() => bars(src), [src]);
  const progress = duration ? time / duration : 0;

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      document.querySelectorAll("audio").forEach((a) => a !== el && a.pause()); // one track at a time
      el.play().catch(() => {});
    } else el.pause();
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ink p-3 pe-4 text-white">
      <button type="button" onClick={toggle} aria-label={playing ? tr("השהיה") : tr("ניגון")}
        className="tap flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink transition-transform duration-150 ease-out hover:scale-105 active:scale-95">
        {playing ? <Pause className="h-5 w-5 fill-current" aria-hidden /> : <Play className="h-5 w-5 translate-x-px fill-current" aria-hidden />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="truncate text-[13px] font-semibold">{title}{subtitle && <span className="font-normal text-white/60"> · {subtitle}</span>}</span>
          <span className="tabular shrink-0 text-white/60">{duration ? `${fmt(time)} / ${fmt(duration)}` : "–:––"}</span>
        </div>
        <div className="relative mt-1.5 h-8">
          <div className="absolute inset-0 flex items-center gap-[2px]" aria-hidden>
            {shape.map((h, i) => (
              <span key={i} style={{ height: `${h}%` }}
                className={cn("flex-1 rounded-full transition-colors duration-150", i / shape.length < progress ? "bg-riso-pink" : "bg-white/25")} />
            ))}
          </div>
          <input type="range" min={0} max={duration || 0} step={0.1} value={time} aria-label={tr("מיקום בקטע")}
            aria-valuetext={tr("{0} מתוך {1}", fmt(time), fmt(duration))}
            onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </div>
      </div>
      <audio ref={ref} src={src} preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0); }} />
    </div>
  );
}
