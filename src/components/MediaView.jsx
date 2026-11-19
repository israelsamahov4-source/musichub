import { ExternalLink } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import { safeUrl, videoEmbedUrl } from "@/lib/utils";

/** Renders an image, audio file, or YouTube/Vimeo video from a URL. */
export default function MediaView({ url, type, title = "", subtitle }) {
  const src = safeUrl(url);
  if (!src) return null;
  const embed = videoEmbedUrl(src);
  if (embed) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={embed}
          title={title || "וידאו"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
    );
  }
  if (type === "image") {
    return <img src={src} alt={title} loading="lazy" className="max-h-[560px] w-full rounded-xl bg-muted object-cover" />;
  }
  if (type === "audio") {
    return <AudioPlayer src={src} title={title || "קטע שמע"} subtitle={subtitle} />;
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
      <ExternalLink className="h-4 w-4" aria-hidden />
      <span className="ltr max-w-[260px] truncate">{src}</span>
    </a>
  );
}
