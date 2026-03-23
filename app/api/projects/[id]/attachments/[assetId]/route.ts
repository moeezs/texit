import { requireAuthenticatedUser } from "@/lib/auth";
import { storageBucket } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export async function GET(
  request: Request,
  context: RouteContext<"/api/projects/[id]/attachments/[assetId]">
) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const { id: projectId, assetId } = await context.params;

  const { data: asset, error: assetError } = await supabase
    .from("project_assets")
    .select("storage_path, mime_type")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (assetError || !asset) {
    return new Response("Not found", { status: 404 });
  }

  const { data } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(asset.storage_path, 3600);

  if (!data?.signedUrl) {
    return new Response("Failed to generate URL", { status: 500 });
  }

  return redirect(data.signedUrl);
}
