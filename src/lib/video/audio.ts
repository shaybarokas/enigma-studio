// Narration and music from ElevenLabs: Hebrew speech with the timing of every word, and an
// instrumental bed generated for the video (licensed for commercial use on the paid plan).
import { createAdminClient } from "../supabase/admin";

const API = "https://api.elevenlabs.io/v1";
const BUCKET = "kit-assets";

/** Hebrew narration voices from ElevenLabs' library, picked for ads and storytelling. */
export const VOICES = {
  omer: { id: "k77ZRVqAFg9Hd0ltAuON", name: "עומר", note: "גבר · בטוח, פרסומי" },
  itai: { id: "JIxTgeeS5w0UQyBxEnrl", name: "איתי", note: "גבר · אנרגטי, רשתות" },
  yael: { id: "d4eLZ8u5dfBCsjp4YPyz", name: "יעל", note: "אישה · עדינה ובטוחה" },
  noa: { id: "6WRlPmU1fqPwYbSxeP16", name: "נועה", note: "אישה · חמה, מספרת" },
} as const;
export type VoiceKey = keyof typeof VOICES;

async function store(path: string, data: Buffer, contentType: string) {
  const db = createAdminClient();
  const { error } = await db.storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`storage: ${error.message}`);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export type Word = { text: string; start: number; end: number };

/** Speaks one line; returns the stored mp3, its length and each word's timing (seconds). */
export async function speak(text: string, voice: VoiceKey, path: string): Promise<{ url: string; seconds: number; words: Word[] }> {
  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(`${API}/text-to-speech/${VOICES[voice].id}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_v3", language_code: "he" }),
    });
    if (res.status !== 409 && res.status !== 429) break; // busy: wait and retry
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res?.ok) throw new Error(`tts ${res?.status}: ${await res?.text()}`);
  const d = (await res.json()) as {
    audio_base64: string;
    alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
  };
  const a = d.alignment;
  // Characters → words: a word is a run of non-space characters.
  const words: Word[] = [];
  let cur: Word | null = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
    } else if (!cur) cur = { text: ch, start: a.character_start_times_seconds[i], end: a.character_end_times_seconds[i] };
    else {
      cur.text += ch;
      cur.end = a.character_end_times_seconds[i];
    }
  });
  if (cur) words.push(cur);
  const url = await store(path, Buffer.from(d.audio_base64, "base64"), "audio/mpeg");
  return { url, seconds: a.character_end_times_seconds.at(-1) ?? 0, words };
}

/** An instrumental track of the given length. */
export async function compose(prompt: string, seconds: number, path: string): Promise<string> {
  const res = await fetch(`${API}/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, music_length_ms: Math.round(Math.min(Math.max(seconds, 10), 120) * 1000), force_instrumental: true }),
  });
  if (!res.ok) throw new Error(`music ${res.status}: ${await res.text()}`);
  return store(path, Buffer.from(await res.arrayBuffer()), "audio/mpeg");
}
