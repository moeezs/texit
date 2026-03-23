import { requireAuthenticatedUser } from "@/lib/auth";

async function getOwnedProject(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedUser>>["supabase"],
  ownerId: string,
  projectId: string
) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, title, latex_content, updated_at, created_at")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .single();

  return { project, error };
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[id]">
) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const { id } = await context.params;
  const { project, error: projectError } = await getOwnedProject(
    supabase,
    user.id,
    id
  );

  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: threads, error: threadsError } = await supabase
    .from("chat_threads")
    .select("id, title, updated_at, created_at")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (threadsError) {
    return Response.json({ error: threadsError.message }, { status: 500 });
  }

  const latestThread = threads?.[0];

  const { data: messages, error: messagesError } = latestThread
    ? await supabase
        .from("chat_messages")
        .select("id, role, content, created_at, metadata")
        .eq("thread_id", latestThread.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (messagesError) {
    return Response.json({ error: messagesError.message }, { status: 500 });
  }

  await supabase
    .from("projects")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", project.id)
    .eq("owner_id", user.id);

  return Response.json({
    project: {
      id: project.id,
      title: project.title,
      latexContent: project.latex_content,
      updatedAt: project.updated_at,
      createdAt: project.created_at,
      threadId: latestThread?.id ?? null,
      threads: threads ?? [],
      messages:
        messages?.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.created_at,
          metadata: message.metadata,
        })) ?? [],
    },
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/projects/[id]">
) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const { id } = await context.params;
  const { project, error: projectError } = await getOwnedProject(
    supabase,
    user.id,
    id
  );

  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : project.title;
  const latexContent =
    typeof body.latexContent === "string"
      ? body.latexContent
      : project.latex_content;
  const notes =
    typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  const { data: updatedProject, error: updateError } = await supabase
    .from("projects")
    .update({
      title,
      latex_content: latexContent,
      last_opened_at: new Date().toISOString(),
    })
    .eq("id", project.id)
    .eq("owner_id", user.id)
    .select("id, title, latex_content, updated_at")
    .single();

  if (updateError || !updatedProject) {
    return Response.json(
      { error: updateError?.message ?? "Failed to save project" },
      { status: 500 }
    );
  }

  if (latexContent !== project.latex_content) {
    const { error: revisionError } = await supabase
      .from("project_revisions")
      .insert({
        project_id: project.id,
        created_by: user.id,
        source: "manual",
        latex_content: latexContent,
        notes,
      });

    if (revisionError) {
      return Response.json({ error: revisionError.message }, { status: 500 });
    }
  }

  return Response.json({
    project: {
      id: updatedProject.id,
      title: updatedProject.title,
      latexContent: updatedProject.latex_content,
      updatedAt: updatedProject.updated_at,
    },
  });
}
