import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const ids = ["ec23f435-605a-43c0-a03f-6b5fe6041713", "10144129-6b27-45f2-96d7-f0afeddbf6c7", "4a0f470a-a812-4168-96ab-5a632ff0e5c5"];
const since = new Date(Date.now() - 120_000).toISOString();
for (let i = 0; i < 90; i++) {
  const { data } = await db.from("videos").select("kit_id, status, url, error").in("kit_id", ids).gte("created_at", since);
  if (data && data.length === 3 && data.every((v) => v.status === "ready" || v.status === "failed")) {
    console.log(JSON.stringify(data));
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 10_000));
}
console.log("timeout");
