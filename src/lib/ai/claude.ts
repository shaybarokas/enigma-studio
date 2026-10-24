import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { recordClaude } from "../costs";

export const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

/**
 * One Claude call whose answer must match `schema`. Server-side fallback is on: if the model declines
 * on a safety classifier, the API reruns the request on a fallback model inside the same call.
 */
export async function structured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const res = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: opts.messages,
    output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
  });
  recordClaude(res.usage, res.model);
  if (res.stop_reason === "refusal") throw new Error("הבקשה נדחתה על ידי מסנני הבטיחות");
  if (res.stop_reason === "max_tokens") throw new Error("התשובה נקטעה באמצע");
  if (res.parsed_output == null) throw new Error("התשובה לא תאמה למבנה הצפוי");
  return res.parsed_output as z.infer<S>;
}
