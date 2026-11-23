-- =====================================================================
-- Sheet music attached to a lesson (PDF or image), shown next to the video
-- and downloadable.
--   * lessons.sheet_music_url  – public URL of the file in the "media" bucket
--   * lessons.sheet_music_name – the original file name (used for the download)
--   * the "media" bucket now also accepts PDF files.
-- Nothing is deleted, so this can be undone by dropping the two columns.
-- =====================================================================

alter table public.lessons
  add column if not exists sheet_music_url text check (public.is_http_url(sheet_music_url)),
  add column if not exists sheet_music_name text check (length(sheet_music_name) <= 200);

update storage.buckets
set allowed_mime_types = array(
  select distinct unnest(allowed_mime_types || array['application/pdf'])
)
where id = 'media' and not ('application/pdf' = any (allowed_mime_types));
