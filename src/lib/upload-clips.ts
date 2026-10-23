"use client";

// Course clips leave the browser straight for storage. The browser also reads the clip (length,
// shape) and takes a dozen frames from it, so the studio's director can see what is in it without
// the server ever opening the video.
import { createClient } from "./supabase/client";
import { CLIP_EXT, MAX_CLIP_MB, MAX_THUMBS } from "./video/clip-files";
import type { CourseClip } from "./video/storyboard-ui";

type Read = { seconds: number; aspect: number; frames: { t: number; blob: Blob }[] };

/** Length, shape and frames of a video (a local file or a stored URL). */
async function read(src: string): Promise<Read> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.preload = "auto";
  video.src = src;
  await new Promise<void>((ok, fail) => {
    video.onloadedmetadata = () => ok();
    video.onerror = () => fail(new Error("הדפדפן לא מצליח לפתוח את הסרטון. נסו לשמור אותו כ־MP4."));
  });
  const seconds = video.duration;
  if (!Number.isFinite(seconds) || !video.videoWidth) throw new Error("לא הצלחנו לקרוא את הסרטון. נסו לשמור אותו כ־MP4.");
  const n = Math.min(MAX_THUMBS, Math.max(3, Math.round(seconds / 10)));
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const frames: Read["frames"] = [];
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * seconds;
    video.currentTime = t;
    await new Promise<void>((ok) => {
      video.onseeked = () => ok();
    });
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (blob) frames.push({ t, blob });
  }
  video.removeAttribute("src");
  return { seconds, aspect: video.videoWidth / video.videoHeight, frames };
}

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "משהו השתבש. נסו שוב.");
  return data as T;
}

// Frames up, then the clip registered (and analysed, which takes up to a minute or two).
async function finish(kitId: string, clipId: string, name: string, r: Read, onStep: (s: string) => void) {
  const links = await json<{ thumbs: { path: string; token: string }[] }>(
    await fetch(`/api/kits/${kitId}/clips/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clipId, thumbs: r.frames.length }) }),
  );
  const storage = createClient().storage.from("kit-assets");
  await Promise.all(links.thumbs.map((u, i) => storage.uploadToSignedUrl(u.path, u.token, r.frames[i].blob, { contentType: "image/jpeg", upsert: true })));
  onStep("הסוכן צופה בקטע ומסמן את הרגעים החזקים…");
  return json<{ clip: CourseClip; clips: CourseClip[] }>(
    await fetch(`/api/kits/${kitId}/clips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipId, name, seconds: r.seconds, aspect: r.aspect, thumbs: r.frames.map((f) => f.t) }),
    }),
  );
}

/** Uploads a clip file; `onStep` reports what is happening, in Hebrew. */
export async function uploadClip(kitId: string, file: File, onStep: (s: string) => void) {
  if (!(file.type in CLIP_EXT)) throw new Error(`"${file.name}" אינו סרטון MP4, MOV או WebM.`);
  if (file.size > MAX_CLIP_MB * 1024 * 1024) throw new Error(`"${file.name}" גדול מ־${MAX_CLIP_MB}MB. חתכו ממנו קטע קצר יותר והעלו אותו.`);
  onStep("קורא את הסרטון…");
  const local = URL.createObjectURL(file);
  const r = await read(local).finally(() => URL.revokeObjectURL(local));
  const links = await json<{ clipId: string; video: { path: string; token: string } }>(
    await fetch(`/api/kits/${kitId}/clips/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: file.type, thumbs: 0 }) }),
  );
  onStep(`מעלה (${Math.round(file.size / 1024 / 1024)}MB)…`);
  const { error } = await createClient().storage.from("kit-assets").uploadToSignedUrl(links.video.path, links.video.token, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(/size|exceed/i.test(error.message) ? `"${file.name}" גדול מדי לאחסון. חתכו ממנו קטע קצר יותר.` : "ההעלאה נכשלה. בדקו את החיבור ונסו שוב.");
  return finish(kitId, links.clipId, file.name.replace(/\.[^.]+$/, ""), r, onStep);
}

/** A clip from a direct video link (…/clip.mp4). */
export async function importClip(kitId: string, url: string, onStep: (s: string) => void) {
  onStep("מושך את הסרטון מהקישור…");
  const got = await json<{ clipId: string; url: string; name: string }>(
    await fetch(`/api/kits/${kitId}/clips/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }),
  );
  onStep("קורא את הסרטון…");
  return finish(kitId, got.clipId, got.name.replace(/\.[^.]+$/, ""), await read(got.url), onStep);
}
