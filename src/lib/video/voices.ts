// Narration voices, shared by the server (which speaks) and the studio (which lists them).
// Native Israeli voices only: voices trained on other languages carry a foreign accent in Hebrew.
export type Engine = "elevenlabs" | "minimax";
type Voice = { engine: Engine; id: string; name: string; note: string };

// Shay's own cloned voices, in the order he set (2026-10-24).
export const VOICES = {
  amit: { engine: "elevenlabs", id: "sTHet81fPiLCxqhuP3Zr", name: "עמית", note: "אישה" },
  liel: { engine: "elevenlabs", id: "prvhUPlM8fCWNEpmoHF8", name: "ליאל", note: "אישה" },
  aviv: { engine: "elevenlabs", id: "oLAFcjKpSMs5fWxhjR5p", name: "אביב", note: "גבר" },
  or: { engine: "elevenlabs", id: "bwlHE9FElMOHHNcB3AWn", name: "אור", note: "גבר" },
  eyal: { engine: "elevenlabs", id: "70Xa4REXU78lNmYiZxQN", name: "אייל", note: "אישה" },
} as const satisfies Record<string, Voice>;

// Voices no longer offered: videos made with them still re-record an edited line in the same voice.
const RETIRED: Record<string, Voice> = {
  noa: { engine: "elevenlabs", id: "HiZoAp2bWS9MHcajIHTp", name: "נועה", note: "אישה" },
  omer: { engine: "elevenlabs", id: "k77ZRVqAFg9Hd0ltAuON", name: "עומר", note: "גבר" },
  yael: { engine: "elevenlabs", id: "d4eLZ8u5dfBCsjp4YPyz", name: "יעל", note: "אישה" },
};

export type VoiceKey = keyof typeof VOICES;
export const DEFAULT_VOICE: VoiceKey = "or";
export const VOICE_KEYS = Object.keys(VOICES) as VoiceKey[];

/** Any voice a video was made with, offered or retired (unknown keys fall back to the default). */
export const voiceOf = (key: string): Voice => (VOICES as Record<string, Voice>)[key] ?? RETIRED[key] ?? VOICES[DEFAULT_VOICE];
