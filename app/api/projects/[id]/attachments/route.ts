import { requireAuthenticatedUser } from "@/lib/auth";
import { storageBucket } from "@/lib/supabase/env";

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/projects/[id]/attachments">
) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const { id } = await context.params;
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const messageText =
    typeof formData.get("message") === "string"
      ? String(formData.get("message")).trim()
      : "";

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (threadError) {
    return Response.json({ error: threadError.message }, { status: 500 });
  }

  const effectiveThreadId = thread?.id ?? null;
  let messageId: string | null = null;

  if (effectiveThreadId) {
    const { data: uploadMessage, error: messageError } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: effectiveThreadId,
        project_id: project.id,
        user_id: user.id,
        role: "user",
        content: messageText || `Uploaded ${file.name}`,
        metadata: {
          upload: true,
        },
      })
      .select("id, role, content, created_at, metadata")
      .single();

    if (messageError || !uploadMessage) {
      return Response.json(
        { error: messageError?.message ?? "Failed to save upload message" },
        { status: 500 }
      );
    }

    messageId = uploadMessage.id;
  }

  const objectPath = `${user.id}/${project.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(storageBucket)
    .upload(objectPath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: asset, error: assetError } = await supabase
    .from("project_assets")
    .insert({
      owner_id: user.id,
      project_id: project.id,
      thread_id: effectiveThreadId,
      message_id: messageId,
      bucket: storageBucket,
      storage_path: objectPath,
      original_filename: file.name,
      mime_type: file.type || "application/octet-stream",
      byte_size: file.size,
    })
    .select(
      "id, original_filename, mime_type, byte_size, storage_path, created_at, message_id"
    )
    .single();

  if (assetError || !asset) {
    return Response.json(
      { error: assetError?.message ?? "Failed to save asset metadata" },
      { status: 500 }
    );
  }

  await supabase
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", project.id)
    .eq("owner_id", user.id);

  return Response.json({
    asset: {
      id: asset.id,
      fileName: asset.original_filename,
      mimeType: asset.mime_type,
      byteSize: asset.byte_size,
      storagePath: asset.storage_path,
      createdAt: asset.created_at,
      messageId: asset.message_id,
    },
  });
}
