// The storyboard's vocabulary, safe for the browser: roles, visuals, caption styles, music presets,
// and the length estimate the editor shows while the user types.

export const BEAT_ROLES = ["hook", "intro", "lecturer", "pain", "solution", "glimpse", "outcomes", "proof", "offer", "cta"] as const;
export type BeatRole = (typeof BEAT_ROLES)[number];
export const ROLE_LABELS: Record<BeatRole, string> = {
  hook: "הוק",
  intro: "חשיפת השם",
  lecturer: "המרצה",
  pain: "הכאב",
  solution: "הפתרון",
  glimpse: "הצצה לקורס",
  outcomes: "מה מקבלים",
  proof: "הוכחה",
  offer: "ההצעה",
  cta: "הנעה לפעולה",
};

export const VISUALS = ["lecturer", "scene", "clip", "cover", "props", "list", "logo"] as const;
export type Visual = (typeof VISUALS)[number];
export const VISUAL_LABELS: Record<Visual, string> = {
  lecturer: "המרצה",
  scene: "הסצנה מעולם התוכן",
  clip: "קטע מהקורס",
  cover: "גרפיקת התצוגה",
  props: "האביזרים",
  list: "רשימה על המסך",
  logo: "הלוגו",
};

export const CAPTION_STYLES = ["bold", "box", "minimal", "off"] as const;
export type CaptionStyle = (typeof CAPTION_STYLES)[number];
export const CAPTION_LABELS: Record<CaptionStyle, string> = { bold: "בולטות", box: "בתיבה", minimal: "עדינות", off: "בלי כתוביות" };

/** Music the user can pick instead of the agent's suggestion (Hebrew label → prompt for the composer). */
export const MUSIC_PRESETS: { label: string; prompt: string }[] = [
  { label: "טריילר קולנועי דרמטי", prompt: "epic cinematic hybrid trailer, deep pulses, braams and hits, rising tension, 95 bpm, instrumental" },
  { label: "אנרגטי ומודרני", prompt: "modern energetic electronic pop, punchy drums, bright synths, driving groove, 120 bpm, instrumental" },
  { label: "חם ומעורר השראה", prompt: "warm inspiring cinematic piano and strings, uplifting build, hopeful, 90 bpm, instrumental" },
  { label: "יוקרתי ומינימלי", prompt: "luxury minimal deep house, smooth bass, elegant and restrained, 110 bpm, instrumental" },
  { label: "פופ קצבי לרשתות", prompt: "catchy upbeat pop beat for social reels, claps and plucks, playful, 124 bpm, instrumental" },
  { label: "מתח ואקשן", prompt: "dark tense action score, ticking percussion, low drones, hits on downbeats, 100 bpm, instrumental" },
];

/** How long each kind should run, in seconds. */
export const LENGTH: Record<"promo" | "marketing", [number, number]> = { promo: [35, 45], marketing: [40, 60] };

// Measured on the produced videos (2026-10-23): the Hebrew voices speak about 1.8 words a second,
// and the edit gives each beat about 0.7s more (the picture leads the voice, a breath after it,
// cuts on the music's grid).
export const WORDS_PER_SECOND = 1.8;
export const BEAT_PADDING = 0.7;
type Timed = { voice: string; visual?: string; clipAudio?: boolean; clipStart?: number; clipEnd?: number };
/** A beat's length: its narration, or the clip itself when the clip speaks (the lecturer's own words). */
export const beatSeconds = (b: Timed) =>
  b.visual === "clip" && b.clipAudio ? Math.max(1, (b.clipEnd ?? 0) - (b.clipStart ?? 0)) + 0.4 : b.voice.trim().split(/\s+/).filter(Boolean).length / WORDS_PER_SECOND + BEAT_PADDING;
export const estimateSeconds = (sb: { beats: Timed[] }) => Math.round(sb.beats.reduce((a, b) => a + beatSeconds(b), 0));

/** A clip of the course the user uploaded, as the studio and the director see it. */
export type CourseClip = {
  id: string;
  url: string;
  name: string;
  seconds: number;
  aspect: number; // width / height
  thumbs: { t: number; url: string }[];
  status: "analyzing" | "ready" | "failed";
  summary?: string; // what the clip shows, Hebrew
  words?: { text: string; start: number; end: number }[]; // what is said in it
  highlights?: { start: number; end: number; label: string; quote: boolean }[]; // the moments worth cutting in
};
