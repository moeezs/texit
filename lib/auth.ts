import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
      supabase,
      user: null,
    };
  }

  return { error: null, supabase, user };
}
