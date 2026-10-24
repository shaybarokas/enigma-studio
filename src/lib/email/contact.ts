import { createAdminClient } from "../supabase/admin";

/** Where a user's service emails go, and the name they signed up with. */
export async function contactOf(userId: string) {
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  const email = data.user?.email ?? "";
  return { email, name: (data.user?.user_metadata?.full_name as string | undefined) || null };
}
