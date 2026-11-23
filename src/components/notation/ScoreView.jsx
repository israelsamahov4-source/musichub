import { useEffect, useRef, useState } from "react";
import abcjs from "abcjs";
import { Play, Printer, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseAbc, playTune } from "@/lib/notation";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n";

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Draws ABC sheet music, plays it, and prints it (or saves it as PDF from the print window). */
export default function ScoreView({ abc, className, actions = true }) {
  const paper = useRef(null);
  const tune = useRef(null);
  const stop = useRef(null);
  const lit = useRef([]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!paper.current) return undefined;
    stop.current?.();
    const [t] = abcjs.renderAbc(paper.current, abc || "", {
      responsive: "resize",
      add_classes: true,
      paddingtop: 4, paddingbottom: 4, paddingleft: 4, paddingright: 4,
    });
    tune.current = t;
    return () => stop.current?.();
  }, [abc]);

  const highlight = (ev) => {
    lit.current.forEach((el) => el.classList.remove("abcjs-playing"));
    lit.current = ev?.elements ? ev.elements.flat() : [];
    lit.current.forEach((el) => el.classList.add("abcjs-playing"));
  };

  const toggle = () => {
    if (playing) return stop.current?.();
    if (!tune.current) return undefined;
    try {
      stop.current = playTune(tune.current, {
        TimingCallbacks: abcjs.TimingCallbacks,
        onNote: highlight,
        onEnd: () => { stop.current = null; setPlaying(false); },
      });
      setPlaying(true);
    } catch {
      toast.error(tr("הדפדפן הזה לא מאפשר לנגן צלילים"));
    }
    return undefined;
  };

  const print = () => {
    const svg = paper.current?.querySelector("svg");
    if (!svg) return;
    const w = window.open("", "_blank");
    if (!w) return toast.error(tr("הדפדפן חסם את חלון ההדפסה. אפשרו חלונות קופצים ונסו שוב."));
    const title = parseAbc(abc).title || tr("תווים");
    w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>@page{margin:12mm}body{margin:0;font-family:system-ui,sans-serif}svg{width:100%;height:auto}.abcjs-playing{fill:#000}</style></head>
<body>${svg.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
    return undefined;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div dir="ltr" className="score-view overflow-x-auto rounded-xl bg-white p-2 text-black shadow-[inset_0_0_0_1px_hsl(var(--border))]">
        <div ref={paper} />
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={playing ? "secondary" : "default"} onClick={toggle} aria-pressed={playing}>
            {playing ? <Square /> : <Play />}{playing ? tr("עצירה") : tr("ניגון")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={print}><Printer />{tr("הדפסה / שמירה כ-PDF")}</Button>
        </div>
      )}
    </div>
  );
}
