// Kit rows and the server flows around them. Reads and writes go through the user's own Supabase
// session (RLS), so a user can only ever touch their own kits.
import { connection } from "next/server";
import type { DesignProps } from "@/engine/design";
import type { Brief } from "./agent/brief";
import type { Concept } from "./agent/concepts";
import { createClient } from "./supabase/server";

export type ChatMessage = { role: "user" | "assistant"; text: string; quickReplies?: string[] };
export type KitConcept = { concept: Concept; design: DesignProps };
export type Kit = {
  id: string;
  title: string;
  status: "interview" | "concepts" | "ready";
  messages: ChatMessage[];
  brief: Brief | null;
  subject: { src: string; aspect: number } | null;
  concepts: KitConcept[] | null;
  chosen: number | null;
  design: DesignProps | null;
  unlocked: boolean; // a gift kit pass opened every paid feature for this kit
  ready: boolean; // the interview has enough for concepts (derived, not stored)
  created_at: string;
  updated_at: string;
};

export const GREETING: ChatMessage = {
  role: "assistant",
  text: "היי, אני הסוכן של Enigma Studio 👋\nספרו לי מה אתם משיקים: קורס, סדנה, אירוע, שירות או מוצר. אפשר לכתוב חופשי, להדביק קישור לדף המכירה או לאתר, ואני אשאל רק את מה שחסר.",
  quickReplies: ["אני משיק/ה קורס דיגיטלי", "יש לי סדנה או אירוע", "אני נותן/ת שירות", "יש לי מוצר"],
};

export async function getUserAndClient() {
  // Per-user data: always rendered at request time (the auth client reads the clock).
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const isReady = (b: Brief | null) => !!(b && b.kind && b.title && b.audience && b.pain && b.promise);

export async function loadKit(id: string): Promise<Kit | null> {
  const { supabase, user } = await getUserAndClient();
  if (!user) return null;
  const { data } = await supabase.from("kits").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return { ...(data as Omit<Kit, "ready">), ready: isReady(data.brief as Brief | null) };
}

export async function listKits() {
  const { supabase } = await getUserAndClient();
  const { data } = await supabase
    .from("kits")
    .select("id, title, status, design, concepts, chosen, updated_at")
    .order("updated_at", { ascending: false });
  return (data ?? []) as Pick<Kit, "id" | "title" | "status" | "design" | "concepts" | "chosen" | "updated_at">[];
}
