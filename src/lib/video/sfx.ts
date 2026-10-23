// The editor's sound effects: whooshes on the cuts, a hit on the reveal, a riser before it, a pop
// for each item on a list, a shimmer on the logo. Generated once by ElevenLabs and kept in storage,
// so every video uses the same, tested sounds.
import { createAdminClient } from "../supabase/admin";

const VERSION = "v1";
const SOUNDS = {
  whoosh: { text: "fast cinematic whoosh swoosh for a video transition, clean and airy, no music", seconds: 0.8 },
  impact: { text: "deep cinematic trailer impact hit with a sub boom and short reverb tail, no music", seconds: 1.6 },
  riser: { text: "short cinematic riser building tension, rising airy swell into a hit, no music", seconds: 2 },
  pop: { text: "soft clean subtle pop click for text appearing on screen, minimal", seconds: 0.5 },
  shimmer: { text: "bright magical shimmer sweep, light sparkle passing across, short and elegant", seconds: 1.2 },
} as const;
export type Sfx = Record<keyof typeof SOUNDS, string>;

async function ensure(name: keyof typeof SOUNDS): Promise<string> {
  const db = createAdminClient();
  const path = `library/sfx-${VERSION}/${name}.mp3`;
  const url = db.storage.from("kit-assets").getPublicUrl(path).data.publicUrl;
  if ((await fetch(url, { method: "HEAD" })).ok) return url;
  const { text, seconds } = SOUNDS[name];
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.6 }),
  });
  if (!res.ok) throw new Error(`sfx ${name} ${res.status}: ${await res.text()}`);
  const { error } = await db.storage.from("kit-assets").upload(path, Buffer.from(await res.arrayBuffer()), { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error(`storage: ${error.message}`);
  return url;
}

/** The sound effects' URLs (made on first use). A video without them is still a video. */
export async function soundEffects(): Promise<Sfx | undefined> {
  try {
    const names = Object.keys(SOUNDS) as (keyof typeof SOUNDS)[];
    const urls = await Promise.all(names.map(ensure));
    return Object.fromEntries(names.map((n, i) => [n, urls[i]])) as Sfx;
  } catch (e) {
    console.error("[sfx]", e);
    return undefined;
  }
}
