import type { User } from "@supabase/supabase-js";

// The studio's owners. ADMIN_EMAILS (comma-separated) overrides the default.
const ADMINS = (process.env.ADMIN_EMAILS ?? "shaybarokas@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdmin = (user: User | null) => Boolean(user?.email && ADMINS.includes(user.email.toLowerCase()));
