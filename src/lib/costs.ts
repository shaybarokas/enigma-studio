// What every outside call costs, recorded against the action that made it (the costs table), so the
// margin on each credit is measured, not guessed. A route names its action once (costContext) and
// every call made while serving it, including work after the response, is charged to that action.
// Recording never blocks or fails the work.
import { AsyncLocalStorage } from "node:async_hooks";
import { createAdminClient } from "./supabase/admin";

// List prices in USD (2026-10-24): Anthropic, fal, ElevenLabs (pay-as-you-go rates, the marginal
// cost once a plan's allowance is used), Vercel Sandbox (Pro, iad1).
export const PRICES = {
  claude: { input: 4 / 1e6, output: 20 / 1e6, cacheRead: 0.2 / 1e6, cacheWrite: 5 / 1e6 }, // Opus 5.5, per token
  fluxUltra: 0.06, // per image
  kling: { first5s: 0.35, extraSecond: 0.07 },
  tts: 0.08 / 1000, // per character
  minimax: 0.1 / 1000, // per character
  music: 0.15 / 60, // per second
  sfx: 0.12 / 60, // per second
  scribe: 0.22 / 3600, // per second of audio
  sandbox: (vcpus: number) => (vcpus * 0.128 + vcpus * 2 * 0.0212) / 3600, // per second, CPU counted as fully busy
};

/** Shekels per dollar for margins: a little above the market rate, so a weaker shekel doesn't hide a loss. */
export const USD_ILS = 3.2;
/** What a shekel paid to us is worth after VAT (18%) and card clearing (about 2.5%). */
export const NET_OF_SALE = (1 / 1.18) * 0.975;
/** Where each action's credits are spent (credit_log reasons). */
export const CREDIT_REASONS: Partial<Record<CostAction, string[]>> = {
  concepts: ["concepts"],
  edit: ["edit", "edit-scene"],
  video: ["video"],
  "video-version": ["video-edit"],
  "video-edit-agent": ["video-edit-chat"],
};

export type CostAction =
  | "interview"
  | "media"
  | "concepts"
  | "edit"
  | "export"
  | "clips"
  | "storyboard"
  | "video"
  | "video-edit-agent"
  | "video-version"
  | "warm";
type Ctx = { action: CostAction; userId?: string | null; kitId?: string | null; videoId?: string | null };
const store = new AsyncLocalStorage<Ctx>();

/** Charges every outside call from here on (in this request, and work it starts) to this action. */
export function costContext(ctx: Ctx) {
  store.enterWith(ctx);
}

/** Records one call. `units` is in the service's own measure (tokens, images, characters, seconds). */
export function recordCost(service: string, units: number, usd: number, meta?: Record<string, unknown>) {
  const ctx = store.getStore();
  void createAdminClient()
    .from("costs")
    .insert({
      action: ctx?.action ?? "unknown",
      user_id: ctx?.userId ?? null,
      kit_id: ctx?.kitId ?? null,
      video_id: ctx?.videoId ?? null,
      service,
      units,
      usd: Math.round(usd * 1e6) / 1e6,
      meta: meta ?? null,
    })
    .then(({ error }) => error && console.error("[costs]", error.message));
}

/** A Claude response's usage, priced. */
export function recordClaude(usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }, model: string) {
  const p = PRICES.claude;
  const read = usage.cache_read_input_tokens ?? 0;
  const write = usage.cache_creation_input_tokens ?? 0;
  const usd = usage.input_tokens * p.input + usage.output_tokens * p.output + read * p.cacheRead + write * p.cacheWrite;
  recordCost("claude", usage.input_tokens + usage.output_tokens + read + write, usd, { model, in: usage.input_tokens, out: usage.output_tokens, read, write });
}

// Work that charges no credits (the interview, writing and revising a video's script, reading a course
// clip or an image) is free so the user can get it right; these daily ceilings, far above real use,
// only stop a runaway loop or abuse from turning into an open-ended bill.
const DAILY: Partial<Record<CostAction, number>> = { interview: 150, storyboard: 60, clips: 40, media: 80 };
export const OVER_DAILY = "הגעתם למכסה היומית של הפעולה הזו. היא תתחדש מחר, ובינתיים אפשר לכתוב לנו בוואטסאפ.";

/** True when the user already made more paid calls for this free action in the last day than allowed. */
export async function overDailyLimit(userId: string, action: CostAction) {
  const max = DAILY[action];
  if (!max) return false;
  const { count } = await createAdminClient()
    .from("costs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  return (count ?? 0) >= max;
}
