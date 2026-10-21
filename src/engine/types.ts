import { z } from "zod";
import { FONT_NAMES } from "./fonts-list";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** The brand kit every output of a launch kit shares. Changing it restyles the whole kit. */
export const brandSchema = z.object({
  palette: z.object({
    bg: hex, // deepest background tone
    ink: hex, // main text
    muted: hex, // secondary text
    accent: hex, // highlight, glow, key word
  }),
  displayFont: z.enum(FONT_NAMES), // Latin wordmark
  headlineFont: z.enum(FONT_NAMES), // big Hebrew hooks
  bodyFont: z.enum(FONT_NAMES),
});
export type Brand = z.infer<typeof brandSchema>;

/** Per-element overrides from the editor: anything a user moves or restyles. */
export const transformSchema = z.object({
  x: z.number().default(0), // px offset in the output's own pixels
  y: z.number().default(0),
  scale: z.number().default(1),
  rotate: z.number().default(0),
  hidden: z.boolean().default(false),
});
export type Transform = z.infer<typeof transformSchema>;
