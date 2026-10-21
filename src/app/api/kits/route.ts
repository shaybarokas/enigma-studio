import { NextResponse } from "next/server";
import { GREETING, getUserAndClient } from "@/lib/kits";

// Creates an empty kit that opens with the agent's greeting.
export async function POST() {
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data, error } = await supabase
    .from("kits")
    .insert({ user_id: user.id, messages: [GREETING] })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "לא הצלחנו ליצור ערכה" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
