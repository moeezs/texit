import { requireAuthenticatedUser } from "@/lib/auth";
import { SAMPLE_DOCUMENT, WELCOME_MESSAGE } from "@/lib/editor-defaults";

export async function GET() {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const { data, error: queryError } = await supabase
    .from("projects")
    .select("id, title, latex_content, updated_at, created_at")
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (queryError) {
    return Response.json({ error: queryError.message }, { status: 500 });
  }

  const projects = (data ?? []).map((project) => ({
    id: project.id,
    title: project.title,
    snippet: project.latex_content.slice(0, 180),
    updatedAt: project.updated_at,
    createdAt: project.created_at,
  }));

  return Response.json({ projects });
}

export async function POST(request: Request) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const body = await request.json().catch(() => ({}));
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Untitled Project";
  const latexContent =
    typeof body.latexContent === "string" ? body.latexContent : SAMPLE_DOCUMENT;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      latex_content: latexContent,
      last_opened_at: new Date().toISOString(),
    })
    .select("id, title, latex_content, updated_at, created_at")
    .single();

  if (projectError || !project) {
    return Response.json(
      { error: projectError?.message ?? "Failed to create project" },
      { status: 500 }
    );
  }

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .insert({
      project_id: project.id,
      owner_id: user.id,
      title: "Project Assistant",
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    return Response.json(
      { error: threadError?.message ?? "Failed to create chat thread" },
      { status: 500 }
    );
  }

  const revisionPromise = supabase.from("project_revisions").insert({
    project_id: project.id,
    created_by: user.id,
    source: "system",
    latex_content: latexContent,
    notes: "Initial project scaffold",
  });

  const welcomePromise = supabase.from("chat_messages").insert({
    thread_id: thread.id,
    project_id: project.id,
    user_id: user.id,
    role: "assistant",
    content: WELCOME_MESSAGE,
    metadata: { seeded: true },
  });

  const [{ error: revisionError }, { error: welcomeError }] =
    await Promise.all([revisionPromise, welcomePromise]);

  if (revisionError || welcomeError) {
    return Response.json(
      {
        error:
          revisionError?.message ??
          welcomeError?.message ??
          "Failed to finish project setup",
      },
      { status: 500 }
    );
  }

  return Response.json({
    project: {
      id: project.id,
      title: project.title,
      latexContent: project.latex_content,
      updatedAt: project.updated_at,
      createdAt: project.created_at,
    },
  });
}
