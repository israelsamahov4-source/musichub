import { useState } from "react";
import { Download, ExternalLink, FileMusic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { safeUrl } from "@/lib/utils";
import { tr } from "@/lib/i18n";

const isPdf = (url, name) => /\.pdf$/i.test(name || "") || /\.pdf(\?|$)/i.test(url);

/** Supabase Storage sends the file as an attachment (a real download) when `?download=<name>` is added. */
function downloadUrl(url, name) {
  try {
    const u = new URL(url);
    u.searchParams.set("download", name || "");
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * The lesson's sheet music: a bar with "open" and "download".
 * "Open" shows the file right under the video, so you can read it while the video plays.
 */
export default function SheetMusic({ url, name }) {
  const [open, setOpen] = useState(false);
  const src = safeUrl(url);
  if (!src) return null;
  const label = name || tr("קובץ תווים");
  const pdf = isPdf(src, name);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <FileMusic className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{tr("תווים לשיעור")}</p>
          <p className="truncate text-xs text-muted-foreground" dir="auto">{label}</p>
        </div>
        <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <X /> : <FileMusic />}{open ? tr("סגירת התווים") : tr("פתיחת התווים")}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={downloadUrl(src, name)} rel="noopener noreferrer"><Download />{tr("הורדה")}</a>
        </Button>
      </div>
      {open && (
        <div className="border-t bg-muted/40">
          {pdf ? (
            <iframe src={src} title={label} className="h-[75dvh] w-full bg-white" />
          ) : (
            <img src={src} alt={label} className="mx-auto max-h-[75dvh] w-auto bg-white object-contain" />
          )}
          <div className="flex justify-end p-2">
            <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />{tr("פתיחה בחלון חדש")}
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
