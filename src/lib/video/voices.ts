// Narration voices, shared by the server (which speaks) and the studio (which lists them).
// Native Israeli voices only: voices trained on other languages carry a foreign accent in Hebrew.
export type Engine = "elevenlabs" | "minimax";

export const VOICES = {
  yarin: { engine: "elevenlabs", id: "GgKRSTGwmtjfR1NYAnbM", name: "ירין", note: "גבר" },
  shay: { engine: "elevenlabs", id: "z84kyjkNda5hqZq7TbAN", name: "שי", note: "גבר" },
  yakir: { engine: "elevenlabs", id: "fANXMUBlO7hnVuJQ3yZ9", name: "יקיר", note: "גבר" },
  or: { engine: "elevenlabs", id: "bwlHE9FElMOHHNcB3AWn", name: "אור", note: "גבר" },
  eyal: { engine: "elevenlabs", id: "70Xa4REXU78lNmYiZxQN", name: "אייל", note: "אישה" },
  noa: { engine: "elevenlabs", id: "HiZoAp2bWS9MHcajIHTp", name: "נועה", note: "אישה" },
  omer: { engine: "elevenlabs", id: "k77ZRVqAFg9Hd0ltAuON", name: "עומר", note: "גבר · פרסומי" },
  yael: { engine: "elevenlabs", id: "d4eLZ8u5dfBCsjp4YPyz", name: "יעל", note: "אישה · פרסומי" },
  tomer: { engine: "elevenlabs", id: "yGpVFXFoImvRvaURKypy", name: "תומר", note: "גבר · מספר" },
} as const satisfies Record<string, { engine: Engine; id: string; name: string; note: string }>;

export type VoiceKey = keyof typeof VOICES;
export const DEFAULT_VOICE: VoiceKey = "yarin";
export const VOICE_KEYS = Object.keys(VOICES) as VoiceKey[];
