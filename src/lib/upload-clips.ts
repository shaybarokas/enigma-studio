"use client";

// Course clips leave the browser straight for storage. The browser also reads the clip (length,
// shape) and takes a dozen frames from it, so the studio's director can see what is in it without
// the server ever opening the video.
import { createClient } from "./supabase/client";
import { Upload } from "tus-js-client";
import { CLIP_EXT, MAX_CLIP_MB, thumbCount } from "./video/clip-files";
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
  const n = thumbCount(seconds);
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

/**
 * The file in 6MB chunks over the resumable (TUS) endpoint, as the signed-in user (storage lets them
 * write only a clip source in their own kit). A dropped connection picks up where it stopped.
 */
function resumable(file: File, path: string, onProgress: (percent: number) => void) {
  const supabase = createClient();
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return new Promise<void>((ok, fail) => {
    const upload = new Upload(file, {
      endpoint: `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024, // what Supabase's resumable endpoint expects
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: "kit-assets", objectName: path, contentType: file.type, cacheControl: "3600" },
      headers: { "x-upsert": "false" },
      // A long upload outlives an access token: each request carries a fresh one.
      onBeforeRequest: async (req) => {
        const { data } = await supabase.auth.getSession();
        req.setHeader("authorization", `Bearer ${data.session?.access_token ?? ""}`);
      },
      onProgress: (sent, total) => onProgress(Math.floor((sent / total) * 100)),
      onError: (e) => fail(new Error(/413|size|exceed/i.test(String(e)) ? `"${file.name}" גדול מדי לאחסון.` : "ההעלאה נעצרה. בדקו את החיבור ונסו שוב.")),
      onSuccess: () => ok(),
    });
    // A file that started uploading before (same file, same browser) resumes instead of starting over.
    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

/** Uploads a clip file; `onStep` reports what is happening, in Hebrew. */
export async function uploadClip(kitId: string, file: File, onStep: (s: string) => void) {
  if (!(file.type in CLIP_EXT)) throw new Error(`"${file.name}" אינו סרטון MP4, MOV או WebM.`);
  if (file.size > MAX_CLIP_MB * 1024 * 1024) throw new Error(`"${file.name}" גדול מ־${MAX_CLIP_MB / 1024}GB. אפשר לחתוך ממנו חלק ולהעלות אותו.`);
  onStep("קורא את הסרטון…");
  const local = URL.createObjectURL(file);
  const r = await read(local).finally(() => URL.revokeObjectURL(local));
  const links = await json<{ clipId: string; video: { path: string; token: string } }>(
    await fetch(`/api/kits/${kitId}/clips/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: file.type, thumbs: 0 }) }),
  );
  await resumable(file, links.video.path, (p) => onStep(`מעלה… ${p}%`));
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
