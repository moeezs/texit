import { requireAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  return Response.json({ profile: data });
}

export async function PATCH(request: Request) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const json = await request.json().catch(() => ({}));
  const fullName = json.full_name;

  if (typeof fullName !== "string") {
    return Response.json({ error: "Invalid full name" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
