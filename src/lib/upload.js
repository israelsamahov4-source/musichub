import { supabase } from "./supabase";

const KINDS = {
  image: { types: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxMB: 5 },
  audio: {
    types: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/flac", "audio/webm", "audio/x-m4a"],
    maxMB: 25,
  },
};

/**
 * Uploads into `<bucket>/<user id>/<random>.<ext>` (the storage rules only
 * allow writing inside your own folder) and returns the public URL.
 */
export async function uploadFile(file, { bucket = "media", kind = "image", userId }) {
  const rule = KINDS[kind];
  if (!rule.types.includes(file.type)) throw new Error("mime type not allowed");
  if (file.size > rule.maxMB * 1024 * 1024) throw new Error(`payload too large (max ${rule.maxMB}MB)`);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type === "audio/x-m4a" ? "audio/mp4" : file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export const ACCEPT = { image: KINDS.image.types.join(","), audio: KINDS.audio.types.join(",") };
