"use client";

// Images leave the browser straight for storage: each is decoded, scaled to at most 2400px and
// re-encoded (PNG when it may hold transparency, like a logo; JPEG otherwise), then sent with a
// one-time signed link. Only the storage paths go to the studio's server.
import { createClient } from "./supabase/client";

const MAX_SIDE = 2400;

async function prepare(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Not decodable here (e.g. HEIC outside Safari): send the original if storage accepts it.
    if (["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 20 * 1024 * 1024) return file;
    throw new Error(`לא הצלחנו לפתוח את "${file.name}". נסו לשמור אותה כ־JPG או PNG.`);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepAlpha = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, keepAlpha ? "image/png" : "image/jpeg", 0.9));
  if (!blob) throw new Error(`לא הצלחנו לעבד את "${file.name}".`);
  return blob;
}

/** Uploads images for a kit and returns their storage paths, ready for POST /media. */
export async function uploadKitImages(kitId: string, files: File[]): Promise<string[]> {
  const blobs = await Promise.all(files.map(prepare));
  const res = await fetch(`/api/kits/${kitId}/media/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ types: blobs.map((b) => b.type) }) });
  const data = (await res.json().catch(() => ({}))) as { uploads?: { path: string; token: string }[]; error?: string };
  if (!res.ok || !data.uploads) throw new Error(data.error ?? "ההעלאה לא התחילה. נסו שוב.");
  const storage = createClient().storage.from("kit-assets");
  await Promise.all(
    data.uploads.map(async (u, i) => {
      const { error } = await storage.uploadToSignedUrl(u.path, u.token, blobs[i], { contentType: blobs[i].type });
      if (error) throw new Error("העלאת התמונה נכשלה. בדקו את החיבור ונסו שוב.");
    }),
  );
  return data.uploads.map((u) => u.path);
}
