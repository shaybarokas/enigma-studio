// Course clip files: what the studio accepts, and where each clip lives in storage.
export const CLIP_EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
export const MAX_CLIP_MB = 2048; // a whole recorded lesson (uploaded in resumable chunks)
export const LINK_MAX_MB = 200; // a clip fetched from a link passes through a function's memory
export const MAX_THUMBS = 40;
/** Frames the director sees: one every 30 seconds of a long lesson, at least 3, at most MAX_THUMBS. */
export const thumbCount = (seconds: number) => Math.min(MAX_THUMBS, Math.max(3, Math.round(seconds / 30)));
export const MAX_CLIPS = 8;
export const clipFolder = (userId: string, kitId: string, clipId: string) => `${userId}/${kitId}/clips/${clipId}`;
