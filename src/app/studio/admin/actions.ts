"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { structured } from "@/lib/ai/claude";
import { deliver } from "@/lib/email/deliver";
import { campaignMail, marketingEmail } from "@/lib/email/marketing";
import { sendEmail } from "@/lib/email/send";
import { isAdmin } from "@/lib/admin";
import { normalize } from "@/lib/coupons";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminState = { error?: string; done?: string } | undefined;

async function guard() {
  const { user } = await getUserAndClient();
  if (!isAdmin(user)) throw new Error("forbidden");
}

const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.round(n) : null;
};

export async function createCoupon(_: AdminState, f: FormData): Promise<AdminState> {
  await guard();
  const kind = f.get("kind") === "kit" ? "kit" : "discount";
  const typed = normalize(String(f.get("code") ?? ""));
  const code = typed || `${kind === "kit" ? "GIFT" : "ENIGMA"}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) return { error: "קוד: 4–40 תווים, אותיות באנגלית, ספרות ומקף." };
  const percent = int(f.get("percent"));
  const months = int(f.get("months")) ?? 12;
  const credits = int(f.get("credits")) ?? 0;
  const maxUses = int(f.get("max_uses"));
  const expires = String(f.get("expires") ?? "").trim();
  if (kind === "discount" && (!percent || percent < 1 || percent > 100)) return { error: "אחוז הנחה בין 1 ל־100." };
  if (kind === "kit" && (credits < 0 || credits > 1000)) return { error: "קרדיטים לערכה: 0 עד 1000." };
  const { error } = await createAdminClient()
    .from("coupons")
    .insert({
      code,
      kind,
      percent: kind === "discount" ? percent : null,
      months,
      credits: kind === "kit" ? credits : 0,
      max_uses: maxUses,
      expires_at: expires ? new Date(`${expires}T23:59:59+03:00`).toISOString() : null,
      note: String(f.get("note") ?? "").trim() || null,
    });
  if (error) return { error: error.code === "23505" ? "הקוד הזה כבר קיים." : error.message };
  revalidatePath("/studio/admin");
  return { done: `הקוד ${code} נוצר. אפשר להעתיק אותו מהטבלה.` };
}

export async function toggleCoupon(code: string, active: boolean) {
  await guard();
  await createAdminClient().from("coupons").update({ active }).eq("code", code);
  revalidatePath("/studio/admin");
}

// ---------- marketing campaigns ----------

const SEGMENTS = ["all", "free", "paid", "inactive"] as const;
type CampaignInput = { subject: string; heading: string; body: string; button_label: string | null; button_url: string | null; segment: (typeof SEGMENTS)[number] };

function campaignFrom(f: FormData): CampaignInput | string {
  const text = (k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
  const c = {
    subject: text("subject", 120),
    heading: text("heading", 120),
    body: text("body", 6000),
    button_label: text("button_label", 40) || null,
    button_url: text("button_url", 500) || null,
    segment: SEGMENTS.find((s) => s === f.get("segment")) ?? "all",
  };
  if (!c.subject || !c.heading || !c.body) return "צריך נושא, כותרת ותוכן.";
  if (c.button_url && !/^https:\/\//.test(c.button_url)) return "קישור הכפתור צריך להתחיל ב־https://";
  if (Boolean(c.button_label) !== Boolean(c.button_url)) return "לכפתור צריך גם טקסט וגם קישור (או אף אחד מהם).";
  return c;
}

export type CampaignState = { error?: string; done?: string; id?: string } | undefined;

/** Saves the composer as a draft (new, or the draft being edited). */
export async function saveCampaign(_: CampaignState, f: FormData): Promise<CampaignState> {
  await guard();
  const c = campaignFrom(f);
  if (typeof c === "string") return { error: c };
  const db = createAdminClient();
  const id = String(f.get("id") ?? "");
  if (id) {
    const { error } = await db.from("campaigns").update(c).eq("id", id).eq("status", "draft");
    if (error) return { error: error.message };
    revalidatePath("/studio/admin");
    return { done: "הטיוטה נשמרה.", id };
  }
  const { data, error } = await db.from("campaigns").insert(c).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/studio/admin");
  return { done: "הטיוטה נשמרה.", id: data.id };
}

/** A first draft from the agent, in the studio's voice, from a line about what to say. */
export async function draftCampaign(topic: string): Promise<{ subject: string; heading: string; body: string; button_label: string } | { error: string }> {
  await guard();
  if (!topic.trim()) return { error: "על מה הדיוור?" };
  try {
    return await structured({
      schema: z.object({
        subject: z.string().describe("Hebrew email subject, up to 60 characters, specific and inviting (no 'פרסומת:' prefix, it is added automatically)"),
        heading: z.string().describe("Hebrew heading inside the email, up to 50 characters"),
        body: z.string().describe("Hebrew body: 2–4 short paragraphs separated by a blank line, warm and concrete, no emoji spam, no greeting line (the reader's name is added automatically)"),
        button_label: z.string().describe("Hebrew call-to-action button text, 2–4 words"),
      }),
      system:
        "You write marketing emails in natural Israeli Hebrew for Enigma Studio: an AI studio where course creators and business owners get a full launch kit (graphics, ads in four sizes, narrated promo and marketing videos, a video editor) from one conversation with an agent. Readers are Israeli course creators, coaches and small business owners. Write like a sharp Israeli copywriter: short sentences, concrete benefits, one clear ask. Never invent prices, features or discounts that weren't given.",
      effort: "medium",
      maxTokens: 3000,
      messages: [{ role: "user", content: `מה הדיוור צריך להגיד: ${topic.slice(0, 1500)}` }],
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function adminRecipient() {
  const { user } = await getUserAndClient();
  if (!user?.email) throw new Error("forbidden");
  const { data } = await createAdminClient().from("accounts").select("email_token").eq("user_id", user.id).single();
  return { user_id: user.id, email: user.email, name: (user.user_metadata?.full_name as string | undefined) || null, token: data!.email_token as string };
}

/** The campaign as the reader will get it, to the admin's own inbox (not logged). */
export async function testCampaign(id: string): Promise<CampaignState> {
  await guard();
  const { data: c } = await createAdminClient().from("campaigns").select("*").eq("id", id).single();
  if (!c) return { error: "הדיוור לא נמצא" };
  const r = await adminRecipient();
  const res = await sendEmail(marketingEmail(r, campaignMail(c, r)));
  return res.ok ? { done: `נשלח מייל בדיקה ל־${r.email}.` } : { error: res.error };
}

/** Sends a draft to its segment: everyone who opted in and hasn't got this campaign yet. */
export async function sendCampaign(id: string): Promise<CampaignState> {
  await guard();
  const db = createAdminClient();
  const { data: c } = await db.from("campaigns").update({ status: "sending" }).eq("id", id).eq("status", "draft").select("*").single();
  if (!c) return { error: "אפשר לשלוח רק טיוטה" };
  const { data: audience } = await db.rpc("marketing_audience", { p_segment: c.segment });
  const list = ((audience ?? []) as { user_id: string; email: string; name: string | null; token: string }[]).map((r) => ({ r, kind: `campaign:${id}`, mail: campaignMail(c, r) }));
  after(async () => {
    const sent = await deliver(list);
    await db.from("campaigns").update({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent }).eq("id", id);
  });
  revalidatePath("/studio/admin");
  return { done: `הדיוור יוצא עכשיו ל־${list.length} נמענים.` };
}
