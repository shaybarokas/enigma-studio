// Course clip files: what the studio accepts, and where each clip lives in storage.
export const CLIP_EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
export const MAX_CLIP_MB = 200;
export const MAX_THUMBS = 12;
export const MAX_CLIPS = 8;
export const clipFolder = (userId: string, kitId: string, clipId: string) => `${userId}/${kitId}/clips/${clipId}`;
