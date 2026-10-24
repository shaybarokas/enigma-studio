// The agent that edits a finished video in words: from the video editor's request box and from the
// kit's chat. It answers with edit operations (video-edits.ts), which the editor applies to its
// preview; nothing is rendered until the user saves a version.
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { VideoProps } from "@/engine/video/schema";
import { structured } from "../ai/claude";
import { describeSpec, EDIT_OPS, type EditOp } from "./video-edits";

const opsSchema = z.object({
  reply: z.string().describe("Hebrew, one short sentence: what was changed (or a question if the request is unclear)"),
  ops: z.array(
    z.object({
      op: z.enum(EDIT_OPS),
      scene: z.number().nullable().describe("1-based scene number, or null for whole-video edits (accent, ink, captions, music)"),
      text: z.string().nullable().describe("title / sub / caption: the new on-screen text; voice: the new narration line (it will be recorded again)"),
      words: z.array(z.string()).nullable().describe("emphasis: the caption words to highlight, exactly as written in the caption"),
      color: z.string().nullable().describe("accent / ink: #rrggbb"),
      value: z.number().nullable().describe("music: level 0–2 (1 = as mixed); calm: 1 = no motion in the scene, 0 = motion back"),
      style: z.string().nullable().describe("captions: bold | box | minimal | off; transition: cut | whip | zoom | flash | fade"),
    }),
  ),
});

const SYSTEM = `You are the editor of a finished promo or marketing video (Hebrew, 9:16). The user asks in Hebrew for small changes and you answer with precise edit operations on the video as described (scenes numbered from 1, with their seconds, what they show, title, sub, caption text, highlighted words, calm, transition to the next scene).
Operations:
- title / sub: the big on-screen words of a scene (fix spelling, shorten, rephrase).
- caption: the caption text of a scene (fix spelling). The narration audio does not change; only the written captions.
- emphasis: which caption words are highlighted (words exactly as in the caption).
- voice: a new narration line for a scene; it will be recorded again (use only when the user wants to change what is SAID).
- delete: remove a scene.
- calm: value 1 removes the motion in a scene (camera moves, cuts, zoom punches) — "remove the animation"; 0 brings it back.
- transition: how a scene hands over to the next (cut, whip, zoom, flash, fade).
- accent / ink: the video's highlight colour / text colour, #rrggbb.
- captions: the caption style (bold, box, minimal, off).
- music: music level, 1 = as mixed, 0.5 quieter, 1.5 louder.
When the user names a moment by time ("in second 12"), find the scene by its seconds. Change only what was asked. Never invent facts.`;

/** The edits a request asks for. `context` is the conversation so far, when the request comes from the chat. */
export async function planVideoEdit(spec: VideoProps, request: string, context = ""): Promise<{ reply: string; ops: EditOp[] }> {
  return structured({
    schema: opsSchema,
    system: SYSTEM,
    effort: "medium",
    maxTokens: 4000,
    messages: [
      {
        role: "user",
        content: `הסרטון:\n${JSON.stringify(describeSpec(spec), null, 2)}\n\n${context ? `השיחה עד עכשיו:\n${context}\n\n` : ""}הבקשה: ${request.slice(0, 1000)}`,
      },
    ],
  });
}

const routeSchema = z.object({
  target: z.enum(["graphics", "video"]),
  video: z.number().nullable().describe("for target video: the number of the video in the list"),
});

/** In the kit's chat, once there are videos: is this request about the graphics or about a video (which)? */
export async function routeKitEdit(history: Anthropic.Beta.BetaMessageParam[], videos: { kind: string; label: string; opening: string }[]) {
  const list = videos.map((v, i) => `${i + 1}. ${v.label} (${v.kind}) — נפתח ב: "${v.opening}"`).join("\n");
  return structured({
    schema: routeSchema,
    system: `The user is editing a course launch kit: still graphics (posts, banners, ads, cover) and finished videos. Decide whether the user's LAST message asks to change the graphics or one of the videos. Talk of a video, a clip, a scene, seconds, narration, captions, music or animation is about a video. When it is about a video and more than one exists, pick the one the user means (default: number 1, the newest). The videos, newest first:\n${list}`,
    effort: "low",
    maxTokens: 300,
    messages: history,
  });
}
