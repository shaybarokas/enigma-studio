// Narration voices, shared by the server (which speaks) and the studio (which lists them).
// Native Israeli voices only: voices trained on other languages carry a foreign accent in Hebrew.
export type Engine = "elevenlabs" | "minimax";

// The voices Shay approved by ear (2026-10-22); more of his own will be added.
export const VOICES = {
  or: { engine: "elevenlabs", id: "bwlHE9FElMOHHNcB3AWn", name: "אור", note: "גבר" },
  noa: { engine: "elevenlabs", id: "HiZoAp2bWS9MHcajIHTp", name: "נועה", note: "אישה" },
  eyal: { engine: "elevenlabs", id: "70Xa4REXU78lNmYiZxQN", name: "אייל", note: "אישה" },
} as const satisfies Record<string, { engine: Engine; id: string; name: string; note: string }>;

export type VoiceKey = keyof typeof VOICES;
export const DEFAULT_VOICE: VoiceKey = "or";
export const VOICE_KEYS = Object.keys(VOICES) as VoiceKey[];
