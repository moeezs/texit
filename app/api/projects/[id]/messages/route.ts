import { requireAuthenticatedUser } from "@/lib/auth";
import { storageBucket } from "@/lib/supabase/env";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
    const { data } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("project_id", projectId)
      .eq("owner_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (data) {
      return { error: null, threadId: data.id };
    }
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

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: requestCount, error: countError } = await supabase
    .from("chat_messages")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", startOfMonth.toISOString());

  if (countError) {
    return Response.json({ error: "Failed to verify account usage limits." }, { status: 500 });
  }

  if (requestCount !== null && requestCount >= 10) {
    return Response.json({ error: "Rate limit exceeded. Free accounts are currently limited to 10 AI requests." }, { status: 429 });
  }

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

  let assistantContent = "I'm sorry, I couldn't generate a response.";
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are an expert LaTeX assistant built specifically for the TeXit editor. Your sole purpose is to help the user write, debug, and format LaTeX code. DO NOT answer general knowledge questions, solve off-topic problems, or engage in discussions outside the scope of LaTeX generation and document formatting. If the user asks for something unrelated, politely decline and steer them back to LaTeX. Provide high-quality, compilable LaTeX code when requested. Keep your explanations concise and directly related to the provided LaTeX. CRITICAL: NEVER start your LaTeX code with \\documentclass, \\usepackage, or \\begin{document} unless explicitly asked to. Assume the environment is already initialized and just provide the raw LaTeX content.",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            message: {
              type: SchemaType.STRING,
              description: "The plaintext response to the user's prompt. Do NOT include any codeblocks in this message parameter."
            },
            latexCode: {
              type: SchemaType.STRING,
              description: "The complete LaTeX code string snippet required by the user. Do NOT wrap this in markdown ```latex blocks! Omit if no code changes."
            }
          },
          required: ["message"]
        }
      }
    });

    const fileParts: { inlineData: { data: string; mimeType: string } }[] = [];
    if (attachmentIds && attachmentIds.length > 0) {
      const { data: assets } = await supabase
        .from("project_assets")
        .select("storage_path, mime_type")
        .in("id", attachmentIds);

      if (assets) {
        await Promise.all(assets.map(async (asset) => {
          const { data } = await supabase.storage.from(storageBucket).download(asset.storage_path);
          if (data) {
            const arrayBuffer = await data.arrayBuffer();
            fileParts.push({
              inlineData: {
                data: Buffer.from(arrayBuffer).toString("base64"),
                mimeType: asset.mime_type
              }
            });
          }
        }));
      }
    }

    const { data: previousMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("thread_id", threadId)
      .lt("created_at", userMessage.created_at)
      .order("created_at", { ascending: true })
      .limit(10);

    const history: { role: string; parts: { text: string }[] }[] = [];
    for (const m of previousMessages || []) {
      const role = m.role === "assistant" ? "model" : "user";
      if (history.length === 0 && role !== "user") continue;
      if (history.length > 0 && history[history.length - 1].role === role) {
        history[history.length - 1].parts[0].text += "\n\n" + m.content;
      } else {
        history.push({ role, parts: [{ text: m.content }] });
      }
    }

    const chat = model.startChat({ history });
    const contentParts = [content || "Please review the attached files.", ...fileParts];
    const result = await chat.sendMessage(contentParts);
    const resultText = result.response.text();

    const resultObj = JSON.parse(resultText);
    assistantContent = resultObj.message;
    if (resultObj.latexCode && resultObj.latexCode.trim().length > 0 && resultObj.latexCode.trim() !== "none") {
      assistantContent += `\n\n\`\`\`latex\n${resultObj.latexCode}\n\`\`\``;
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Gemini Error:", error);
    assistantContent = "An error occurred while generating the response: " + error.message;
  }

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
  request: Request
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

