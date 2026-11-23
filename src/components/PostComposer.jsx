import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Loader2, Music, PenLine, Tag, Video, X } from "lucide-react";
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
import { ScoreEditorDialog, ScoreView } from "@/components/notation";
import { supabase, unwrap } from "@/lib/supabase";
import { ACCEPT, uploadFile } from "@/lib/upload";
import { GENRES } from "@/lib/config";
import { useAuth } from "@/auth/AuthProvider";
import { cn, errorMessage, normalizeUrl, safeUrl, videoEmbedUrl } from "@/lib/utils";
import { tr } from "@/lib/i18n";

export default function PostComposer() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null); // { url, type }
  const [notation, setNotation] = useState(null); // sheet music written in the editor (ABC text)
  const [writing, setWriting] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(null);
  const [genres, setGenres] = useState([]);
  const [showGenres, setShowGenres] = useState(false);
  const [collab, setCollab] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
    if (!url) return setLinkError(tr("הקישור לא נראה תקין. הדביקו כתובת מלאה, לדוגמה: https://youtube.com/…"));
    setLinkError(null);
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
        notation,
        genres,
        collaboration_wanted: collab,
      })),
    onSuccess: () => {
      setContent(""); setMedia(null); setNotation(null); setGenres([]); setCollab(false); setShowGenres(false); setExpanded(false);
      toast.success(tr("הפוסט פורסם"));
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canPost = (content.trim() || media || notation) && !uploading && !publish.isPending;
  // On phones the box starts as one line and opens when you tap it, like other social apps.
  const open = expanded || Boolean(content) || Boolean(media) || Boolean(notation) || linkMode || showGenres;

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <UserAvatar profile={profile} size="md" />
        <div className="min-w-0 flex-1 space-y-3">
          <Textarea
            onFocus={() => setExpanded(true)}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={open ? 3 : 1}
            placeholder={open ? tr("על מה אתם עובדים? שתפו קטע, שאלה או חיפוש שותפים…") : tr("על מה אתם עובדים?")}
            aria-label={tr("תוכן הפוסט")}
            className={cn("resize-none rounded-2xl border-0 bg-muted px-4 py-3 text-[15px] focus-visible:bg-card focus-visible:ring-2", open ? "min-h-[84px]" : "min-h-[48px] overflow-hidden md:min-h-[84px]")}
          />
          {media && (
            <div className="relative">
              <MediaView url={media.url} type={media.type} />
              <Button size="icon" variant="secondary" className="absolute end-2 top-2 h-7 w-7" onClick={() => setMedia(null)} aria-label={tr("הסרת מדיה")}><X /></Button>
            </div>
          )}
          {notation && (
            <div className="relative">
              <ScoreView abc={notation} actions={false} />
              <div className="absolute end-2 top-2 flex gap-1">
                <Button size="sm" variant="secondary" className="h-7" onClick={() => setWriting(true)}>{tr("עריכה")}</Button>
                <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setNotation(null)} aria-label={tr("הסרת התווים")}><X /></Button>
              </div>
            </div>
          )}
          <ScoreEditorDialog open={writing} onOpenChange={setWriting} initialAbc={notation}
            onSave={(abc) => { setNotation(abc); setWriting(false); setExpanded(true); }} />
          {linkMode && (
            <div className="flex gap-2">
              <Input dir="ltr" value={link} onChange={(e) => { setLink(e.target.value); setLinkError(null); }} placeholder="https://youtube.com/…" aria-label={tr("קישור")}
                aria-invalid={linkError ? true : undefined} aria-describedby={linkError ? "link-error" : undefined} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())} />
              <Button variant="secondary" onClick={applyLink}>{tr("הוספה")}</Button>
            </div>
          )}
          {linkMode && linkError && <p id="link-error" role="alert" className="text-xs font-medium text-destructive">{linkError}</p>}
          {showGenres && <TagPicker options={GENRES} value={genres} onChange={setGenres} max={3} label={tr("ז'אנרים")} />}

          <div className={cn("-ms-2 flex-wrap items-center gap-0.5", open ? "flex" : "hidden md:flex")}>
            <input ref={imageRef} type="file" accept={ACCEPT.image} hidden onChange={(e) => onFile(e, "image")} />
            <input ref={audioRef} type="file" accept={ACCEPT.audio} hidden onChange={(e) => onFile(e, "audio")} />
            <Button variant="ghost" size="sm" onClick={() => imageRef.current?.click()} disabled={uploading || !!media}><ImageIcon className="text-primary" />{tr("תמונה")}</Button>
            <Button variant="ghost" size="sm" onClick={() => audioRef.current?.click()} disabled={uploading || !!media}><Music className="text-riso-pink" />{tr("שמע")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setLinkMode((v) => !v)} disabled={uploading || !!media}><Video className="text-[#C79300]" />{tr("וידאו או קישור")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setWriting(true)}><PenLine className="text-primary" />{notation ? tr("עריכת תווים") : tr("תווים")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowGenres((v) => !v)} aria-expanded={showGenres}><Tag className="text-muted-foreground" />{tr("ז'אנר")}</Button>
            {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={tr("מעלה…")} />}
            <div className="ms-auto flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="collab" checked={collab} onCheckedChange={setCollab} />
                <Label htmlFor="collab" className="text-sm font-normal">{tr("מחפש/ת שותפים")}</Label>
              </div>
              <Button onClick={() => publish.mutate()} disabled={!canPost}>{tr("פרסום")}</Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
