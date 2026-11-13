import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Link2, Loader2, Music, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import UserAvatar from "@/components/UserAvatar";
import MediaView from "@/components/MediaView";
import TagPicker from "@/components/TagPicker";
import { supabase, unwrap } from "@/lib/supabase";
import { ACCEPT, uploadFile } from "@/lib/upload";
import { GENRES } from "@/lib/config";
import { useAuth } from "@/auth/AuthProvider";
import { errorMessage, normalizeUrl, safeUrl, videoEmbedUrl } from "@/lib/utils";

export default function PostComposer() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null); // { url, type }
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState("");
  const [genres, setGenres] = useState([]);
  const [showGenres, setShowGenres] = useState(false);
  const [collab, setCollab] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageRef = useRef(null);
  const audioRef = useRef(null);

  const onFile = async (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, { kind, userId: user.id });
      setMedia({ url, type: kind });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const applyLink = () => {
    const url = safeUrl(normalizeUrl(link));
    if (!url) return toast.error("הקישור אינו תקין");
    setMedia({ url, type: videoEmbedUrl(url) ? "video" : "link" });
    setLinkMode(false);
    setLink("");
  };

  const publish = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.from("posts").insert({
        author_id: user.id,
        content: content.trim(),
        media_url: media?.url ?? null,
        media_type: media?.type ?? null,
        genres,
        collaboration_wanted: collab,
      })),
    onSuccess: () => {
      setContent(""); setMedia(null); setGenres([]); setCollab(false); setShowGenres(false);
      toast.success("הפוסט פורסם");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canPost = (content.trim() || media) && !uploading && !publish.isPending;

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <UserAvatar profile={profile} />
        <div className="flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="על מה אתם עובדים? שתפו קטע, שאלה או חיפוש שותפים…"
            aria-label="תוכן הפוסט"
            className="resize-none border-0 bg-muted/60 focus-visible:ring-1"
          />
          {media && (
            <div className="relative">
              <MediaView url={media.url} type={media.type} />
              <Button size="icon" variant="secondary" className="absolute end-2 top-2 h-7 w-7" onClick={() => setMedia(null)} aria-label="הסרת מדיה"><X /></Button>
            </div>
          )}
          {linkMode && (
            <div className="flex gap-2">
              <Input dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/…" aria-label="קישור" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())} />
              <Button variant="secondary" onClick={applyLink}>הוספה</Button>
            </div>
          )}
          {showGenres && <TagPicker options={GENRES} value={genres} onChange={setGenres} max={3} label="ז'אנרים" />}

          <div className="flex flex-wrap items-center gap-1">
            <input ref={imageRef} type="file" accept={ACCEPT.image} hidden onChange={(e) => onFile(e, "image")} />
            <input ref={audioRef} type="file" accept={ACCEPT.audio} hidden onChange={(e) => onFile(e, "audio")} />
            <Button variant="ghost" size="sm" onClick={() => imageRef.current?.click()} disabled={uploading || !!media}><ImageIcon />תמונה</Button>
            <Button variant="ghost" size="sm" onClick={() => audioRef.current?.click()} disabled={uploading || !!media}><Music />שמע</Button>
            <Button variant="ghost" size="sm" onClick={() => setLinkMode((v) => !v)} disabled={uploading || !!media}><Link2 />קישור / וידאו</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowGenres((v) => !v)} aria-expanded={showGenres}>ז'אנר</Button>
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="מעלה…" />}
            <div className="ms-auto flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="collab" checked={collab} onCheckedChange={setCollab} />
                <Label htmlFor="collab" className="text-sm font-normal">מחפש/ת שותפים</Label>
              </div>
              <Button onClick={() => publish.mutate()} disabled={!canPost}>פרסום</Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
