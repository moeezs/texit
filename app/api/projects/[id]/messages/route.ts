import { requireAuthenticatedUser } from "@/lib/auth";
import { buildMockAssistantResponse } from "@/lib/editor-defaults";

async function getOrCreateThread(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedUser>>["supabase"],
  projectId: string,
  userId: string,
  explicitThreadId?: string | null
) {
  if (explicitThreadId === "new") {
    // Drop through and create new thread below
  } else if (explicitThreadId) {
    const { data: existing, error } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("id", explicitThreadId)
      .eq("project_id", projectId)
      .eq("owner_id", userId)
      .single();
    if (!error && existing) return { error: null, threadId: existing.id };
  } else {
    // Find latest thread
    const { data: existingThread, error: threadLookupError } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("project_id", projectId)
      .eq("owner_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (existingThread) return { error: null, threadId: existingThread.id };
  }

  // Create new thread
  const { data: createdThread, error: createError } = await supabase
    .from("chat_threads")
    .insert({
      project_id: projectId,
      owner_id: userId,
      title: "Project Assistant",
    })
    .select("id")
    .single();

  return { error: createError, threadId: createdThread?.id ?? null };
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/projects/[id]/messages">
) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  const requestedThreadId = typeof body.threadId === "string" ? body.threadId : null;
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const attachmentIds = Array.isArray(body.attachmentIds)
    ? body.attachmentIds.filter(
        (value: unknown): value is string => typeof value === "string"
      )
    : [];

  if (!content && attachmentIds.length === 0) {
    return Response.json(
      { error: "A message or attachment is required" },
      { status: 400 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { error: threadError, threadId } = await getOrCreateThread(
    supabase,
    project.id,
    user.id,
    requestedThreadId
  );

  if (threadError || !threadId) {
    return Response.json(
      { error: threadError?.message ?? "Failed to load chat thread" },
      { status: 500 }
    );
  }

  const { data: userMessage, error: userMessageError } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      project_id: project.id,
      user_id: user.id,
      role: "user",
      content: content || "Uploaded attachments",
      metadata: {
        attachmentIds,
        attachments,
      },
    })
    .select("id, role, content, created_at, metadata")
    .single();

  if (userMessageError || !userMessage) {
    return Response.json(
      { error: userMessageError?.message ?? "Failed to save message" },
      { status: 500 }
    );
  }

  const assistantContent = buildMockAssistantResponse(content || "uploaded files");

  const { data: assistantMessage, error: assistantMessageError } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      project_id: project.id,
      user_id: user.id,
      role: "assistant",
      content: assistantContent,
      metadata: {
        generatedFromMessageId: userMessage.id,
      },
    })
    .select("id, role, content, created_at, metadata")
    .single();

  if (assistantMessageError || !assistantMessage) {
    return Response.json(
      {
        error:
          assistantMessageError?.message ?? "Failed to save assistant response",
      },
      { status: 500 }
    );
  }

  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("owner_id", user.id);

  await supabase
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", project.id)
    .eq("owner_id", user.id);

  return Response.json({
    threadId,
    messages: [userMessage, assistantMessage].map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
      metadata: message.metadata,
    })),
  });
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/projects/[id]/messages">
) {
  const { error, supabase, user } = await requireAuthenticatedUser();

  if (error || !user) {
    return error;
  }

  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");

  if (!threadId) {
    return Response.json({ error: "threadId required" }, { status: 400 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at, metadata")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return Response.json({ error: messagesError.message }, { status: 500 });
  }

  return Response.json({
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
      metadata: message.metadata,
    })),
  });
}

