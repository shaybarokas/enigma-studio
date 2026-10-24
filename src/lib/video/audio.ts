// Narration and music. Two speech engines: ElevenLabs (returns the timing of every character)
// and MiniMax via fal (timing recovered by transcribing the audio). Music is an instrumental bed
// from ElevenLabs, licensed for commercial use on the paid plan.
import { PRICES, recordCost } from "../costs";
import { createAdminClient } from "../supabase/admin";
import { stripNiqqud } from "./speech";

const API = "https://api.elevenlabs.io/v1";
const BUCKET = "kit-assets";
// The model Shay uses in ElevenLabs' own studio; its Hebrew sounds native where v3 did not.
const TTS_MODEL = process.env.TTS_MODEL ?? "eleven_v4";

import { voiceOf } from "./voices";
export { VOICES, type VoiceKey } from "./voices";

async function store(path: string, data: Buffer, contentType: string) {
  const db = createAdminClient();
  const { error } = await db.storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`storage: ${error.message}`);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export type Word = { text: string; start: number; end: number };

async function retrying(call: () => Promise<Response>): Promise<Response> {
  let res = await call();
  for (let attempt = 1; attempt < 4 && (res.status === 409 || res.status === 429); attempt++) {
    await new Promise((r) => setTimeout(r, 1500 * attempt)); // busy: wait and retry
    res = await call();
  }
  if (!res.ok) throw new Error(`${res.url} ${res.status}: ${await res.text()}`);
  return res;
}

async function elevenlabs(text: string, voiceId: string): Promise<{ audio: Buffer; words: Word[] }> {
  recordCost("tts", text.length, text.length * PRICES.tts);
  const res = await retrying(() =>
    fetch(`${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: TTS_MODEL, ...(TTS_MODEL === "eleven_v3" ? { language_code: "he" } : {}) }),
    }),
  );
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
  return { audio: Buffer.from(d.audio_base64, "base64"), words };
}

/** Word timings of any audio, by transcribing it. */
async function transcribeWords(audio: Buffer): Promise<Word[]> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "he");
  form.append("file", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), "speech.mp3");
  const res = await retrying(() => fetch(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! }, body: form }));
  const d = (await res.json()) as { words: { text: string; start: number; end: number; type: string }[] };
  const seconds = d.words.at(-1)?.end ?? 0;
  recordCost("scribe", seconds, seconds * PRICES.scribe);
  return d.words.filter((w) => w.type === "word").map(({ text, start, end }) => ({ text, start, end }));
}

async function minimax(text: string, voiceId: string): Promise<{ audio: Buffer; words: Word[] }> {
  recordCost("minimax", text.length, text.length * PRICES.minimax);
  const res = await retrying(() =>
    fetch("https://fal.run/fal-ai/minimax/speech-2.6-hd", {
      method: "POST",
      headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, language_boost: "Hebrew", voice_setting: { voice_id: voiceId } }),
    }),
  );
  const { audio } = (await res.json()) as { audio: { url: string } };
  const buf = Buffer.from(await (await fetch(audio.url)).arrayBuffer());
  return { audio: buf, words: await transcribeWords(buf) };
}

/**
 * Lays the caption's own words (as written) over the spoken timing. Equal counts map one to one;
 * otherwise each word gets a share of the spoken span by its length.
 */
function alignCaption(caption: string, spoken: Word[]): Word[] {
  const words = caption.split(/\s+/).filter(Boolean);
  if (!spoken.length) return [];
  if (words.length === spoken.length) return words.map((text, i) => ({ text, start: spoken[i].start, end: spoken[i].end }));
  const start = spoken[0].start;
  const span = spoken.at(-1)!.end - start;
  const total = words.reduce((a, w) => a + w.length + 1, 0);
  let at = 0;
  return words.map((text) => {
    const s = start + (at / total) * span;
    at += text.length + 1;
    return { text, start: s, end: start + (at / total) * span };
  });
}

/**
 * Speaks one line (`spoken` may carry vowel points; `caption` is how it's written on screen).
 * Returns the stored mp3, its length and each caption word's timing in seconds.
 */
export async function speak(spoken: string, caption: string, voice: string, path: string): Promise<{ url: string; seconds: number; words: Word[] }> {
  const v = voiceOf(voice);
  const out = v.engine === "minimax" ? await minimax(spoken, v.id) : await elevenlabs(spoken, v.id);
  const timed = out.words.map((w) => ({ ...w, text: stripNiqqud(w.text) }));
  const url = await store(path, out.audio, "audio/mpeg");
  return { url, seconds: timed.at(-1)?.end ?? 0, words: alignCaption(caption, timed) };
}

/** An instrumental track of the given length. */
export async function compose(prompt: string, seconds: number, path: string): Promise<string> {
  const billed = Math.min(Math.max(seconds, 10), 120);
  recordCost("music", billed, billed * PRICES.music);
  const res = await retrying(() =>
    fetch(`${API}/music?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, music_length_ms: Math.round(Math.min(Math.max(seconds, 10), 120) * 1000), force_instrumental: true }),
    }),
  );
  return store(path, Buffer.from(await res.arrayBuffer()), "audio/mpeg");
}
