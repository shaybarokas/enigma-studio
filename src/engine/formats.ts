// The four output sizes. Every template lays itself out again for each one (never a crop).
export const FORMATS = {
  landscape: { id: "landscape", label: "16:9", name: "תצוגה ומצגת", width: 1920, height: 1080 },
  square: { id: "square", label: "1:1", name: "פיד", width: 1080, height: 1080 },
  portrait: { id: "portrait", label: "3:4", name: "פוסט", width: 1080, height: 1440 },
  story: { id: "story", label: "9:16", name: "סטורי", width: 1080, height: 1920 },
} as const;

export type FormatId = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

export function formatFromSize(width: number, height: number): FormatId {
  const r = width / height;
  if (r > 1.3) return "landscape";
  if (r > 0.9) return "square";
  if (r > 0.65) return "portrait";
  return "story";
}

// Areas Instagram/TikTok cover with their own UI on a story, as fractions of the height.
export const STORY_SAFE = { top: 0.12, bottom: 0.2 };
