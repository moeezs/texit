"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LatexRenderer from "@/components/latex-renderer";
import CodeEditor from "@/components/code-editor";
import {
  Loader2,
  Paperclip,
  X,
  FileText,
  Eye,
  Download,
  Code2,
  Play,
  Bot,
  User,
  Send,
  Sparkles,
  Check,
  Copy,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { SAMPLE_DOCUMENT, WELCOME_MESSAGE } from "@/lib/editor-defaults";

type PreviewMode = "preview" | "pdf";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    attachments?: { id?: string; name: string; type: string; url?: string }[];
  };
}

function SnippetBox({ code }: { code: string }) {
  const [view, setView] = useState<"code" | "render">("code");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-1.5 rounded-lg border border-border/60 bg-background/50 overflow-hidden flex flex-col shadow-sm">
      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/40 border-b border-border/50">
        <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-md border border-border/50">
          <button
            onClick={() => setView("code")}
            className={`text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${
              view === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="size-3.5" /> Code
          </button>
          <button
            onClick={() => setView("render")}
            className={`text-xs font-medium flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${
              view === "render"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="size-3.5" /> Rendered
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-3.5 mr-1 text-green-500" />
            ) : (
              <Copy className="size-3.5 mr-1" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="p-3 text-xs overflow-x-auto bg-background/80 min-h-[60px] flex items-center">
        {view === "code" ? (
          <pre className="font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed w-full">
            {code}
          </pre>
        ) : (
          <div className="text-foreground w-full flex justify-center py-2 pointer-events-none">
            <LatexRenderer
              content={
                code.trim().startsWith("\\begin") ||
                code.includes("$$") ||
                code.includes("\\[")
                  ? code
                  : `$$\n${code}\n$$`
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PaginatedPDF({ content, previewRef, zoom = 1 }: { content: string, previewRef: React.RefObject<HTMLDivElement | null>, zoom?: number }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const contentWidth = 624;
  const contentHeight = 864;
  const columnGap = 96;

  useEffect(() => {
    if (measureRef.current) {
      // The browser natively flows content into additional columns. Calculate total columns = pages.
      const sw = measureRef.current.scrollWidth;
      const pageCount = Math.max(1, Math.round((sw + columnGap) / (contentWidth + columnGap)));
      setPages(pageCount);
    }
  }, [content]);

  return (
    <div className="flex flex-col items-center gap-8 pdf-preview-mode w-full" ref={previewRef}>
      {/* Invisible measurement container to get true page count */}
      <div className="absolute opacity-0 pointer-events-none left-0 top-0 overflow-hidden" style={{ width: 0, height: 0 }}>
        <div 
          ref={measureRef} 
          style={{ 
            height: `${contentHeight}px`,
            columnWidth: `${contentWidth}px`,
            columnGap: `${columnGap}px`,
            columnFill: "auto",
            width: "max-content",
            fontFamily: "'Computer Modern Serif', Georgia, 'Times New Roman', serif",
            fontSize: "11pt",
            lineHeight: "1.5",
          }}
        >
          <LatexRenderer content={content} />
        </div>
      </div>

      {Array.from({ length: pages }).map((_, i) => (
        <div key={i} style={{ width: 816 * zoom, height: 1056 * zoom, marginBottom: 32 * zoom }} className="relative shrink-0">
          <div 
            className="pdf-page bg-white absolute top-0 left-0 shadow-2xl shadow-black/40 origin-top-left"
            style={{ width: '816px', height: '1056px', padding: '96px', boxSizing: 'border-box', transform: `scale(${zoom})` }}
          >
          <div className="relative w-full h-full overflow-hidden">
            <div 
              className="absolute top-0"
              style={{ 
                left: `-${i * (contentWidth + columnGap)}px`, 
                width: `${pages * contentWidth + (pages - 1) * columnGap}px`,
                height: `${contentHeight}px`,
                columnWidth: `${contentWidth}px`,
                columnGap: `${columnGap}px`,
                columnFill: "auto",
                fontFamily: "'Computer Modern Serif', Georgia, 'Times New Roman', serif",
                fontSize: "11pt",
                lineHeight: "1.5",
                color: "#1a1a1a"
              }}
            >
              <LatexRenderer content={content} />
            </div>
          </div>
        </div>
        </div>
      ))}
    </div>
  );
}

export default function EditorPage() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const routeProjectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [prompt, setPrompt] = useState("");
  const [latexCode, setLatexCode] = useState(SAMPLE_DOCUMENT);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("preview");
  const [pdfZoom, setPdfZoom] = useState(1);
  const [projectId, setProjectId] = useState(
    routeProjectId && routeProjectId !== "new" ? routeProjectId : ""
  );
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  const [loadingProject, setLoadingProject] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [threads, setThreads] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [initialLatexCode, setInitialLatexCode] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
    },
  ]);
  const previewRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [verticalSplitRatio, setVerticalSplitRatio] = useState(0.4);
  const isDraggingHoriz = useRef(false);
  const isDraggingVert = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapProject() {
      if (!routeProjectId) {
        return;
      }

      setLoadingProject(true);
      setErrorMessage("");

      if (routeProjectId === "new") {
        const createResponse = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const createPayload = (await createResponse.json().catch(() => null)) as
          | { error?: string; project?: { id: string } }
          | null;

        if (!createResponse.ok || !createPayload?.project) {
          if (!cancelled) {
            setErrorMessage(createPayload?.error ?? "Failed to create project.");
            setLoadingProject(false);
          }
          return;
        }

        if (!cancelled) {
          router.replace(`/editor/${createPayload.project.id}`);
        }
        return;
      }

      const response = await fetch(`/api/projects/${routeProjectId}`, {
        credentials: "include",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            project?: {
              id: string;
              title: string;
              latexContent: string;
              threadId: string | null;
              threads: { id: string; title: string; updated_at: string }[];
              messages: ChatMessage[];
            };
          }
        | null;

      if (!response.ok || !payload?.project) {
        if (!cancelled) {
          setErrorMessage(payload?.error ?? "Failed to load project.");
          setLoadingProject(false);
        }
        return;
      }

      if (!cancelled) {
        setProjectId(payload.project.id);
        setProjectTitle(payload.project.title);
        setLatexCode(payload.project.latexContent || "");
        setInitialLatexCode(payload.project.latexContent || "");
        setThreads(payload.project.threads || []);
        setActiveThreadId(payload.project.threadId);
        setMessages(
          payload.project.messages.length
            ? payload.project.messages
            : [
                {
                  id: "welcome",
                  role: "assistant",
                  content: WELCOME_MESSAGE,
                },
              ]
        );
        setLoadingProject(false);
      }
    }

    void bootstrapProject();

    return () => {
      cancelled = true;
    };
  }, [routeProjectId, router]);

  const handleGenerate = useCallback(async () => {
    if ((!prompt.trim() && pendingFiles.length === 0) || !projectId) return;

    const currentPrompt = prompt;
    const currentFiles = [...pendingFiles];
    
    setPrompt("");
    setPendingFiles([]);
    setGenerating(true);
    setErrorMessage("");

    const optimisticTempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticTempId,
      role: "user",
      content: currentPrompt,
      metadata: {
        attachments: currentFiles.map(f => ({
          id: `temp-asset-${Math.random()}`,
          name: f.name,
          type: f.type,
          url: URL.createObjectURL(f)
        }))
      }
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const attachmentsMeta: { id?: string; name: string; type: string; url?: string }[] = [];
      
      for (const file of currentFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("suppressMessage", "true");

        const uploadRes = await fetch(`/api/projects/${projectId}/attachments`, {
          method: "POST",
          body: formData,
        });

        const uploadPayload = (await uploadRes.json().catch(() => null)) as { error?: string; asset?: { id: string } } | null;
        if (!uploadRes.ok || !uploadPayload?.asset?.id) {
          throw new Error(uploadPayload?.error || `Failed to upload ${file.name}`);
        }
        attachmentsMeta.push({ id: uploadPayload.asset.id, name: file.name, type: file.type });
      }

      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentPrompt,
          threadId: activeThreadId || "new",
          attachmentIds: attachmentsMeta.map(a => a.id),
          attachments: attachmentsMeta,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; threadId?: string; messages?: ChatMessage[] }
        | null;
      const returnedMessages = payload?.messages;

      if (!response.ok || !returnedMessages) {
        throw new Error(payload?.error ?? "Failed to send message.");
      }

      setMessages((prev) => [
        ...prev.filter(m => m.id !== optimisticTempId),
        ...returnedMessages
      ]);
      
      if (payload?.threadId && payload.threadId !== activeThreadId) {
         setActiveThreadId(payload.threadId);
         setThreads(prev => {
           if (prev.find(t => t.id === payload.threadId)) return prev;
           return [{ id: payload.threadId!, title: "Project Assistant", updated_at: new Date().toISOString() }, ...prev];
         });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setMessages((prev) => prev.filter(m => m.id !== optimisticTempId));
      setPrompt(currentPrompt);
      setPendingFiles(currentFiles);
      setErrorMessage(error.message || "An error occurred");
    } finally {
      setGenerating(false);
    }
  }, [projectId, prompt, pendingFiles, activeThreadId, threads]);

  const handleUploadFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file || !projectId) {
        return;
      }

      setPendingFiles((prev) => {
        if (prev.length >= 3) return prev;
        return [...prev, file];
      });

      event.target.value = "";
    },
    [projectId]
  );
  
  const handleThreadSwitch = async (threadId: string) => {
    if (threadId === activeThreadId) return;

    if (threadId === "new") {
      setActiveThreadId(null);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: WELCOME_MESSAGE,
        },
      ]);
      return;
    }

    setActiveThreadId(threadId);
    setLoadingThread(true);
    setErrorMessage("");

    const res = await fetch(`/api/projects/${projectId}/messages?threadId=${threadId}`);
    const payload = await res.json().catch(() => null);

    setLoadingThread(false);

    if (!res.ok || !payload?.messages) {
      setErrorMessage(payload?.error ?? "Failed to load chat history.");
      return;
    }

    setMessages(payload.messages.length ? payload.messages : [{ id: "welcome", role: "assistant", content: WELCOME_MESSAGE }]);
  };

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [latexCode]);

  const handleDownloadPDF = useCallback(() => {
    const originalTitle = document.title;
    document.title = projectTitle || "Untitled Project";

    const triggerPrint = () => {
      window.print();
      document.title = originalTitle;
    };

    if (previewMode !== "pdf") {
      setPreviewMode("pdf");
      setTimeout(triggerPrint, 500);
    } else {
      triggerPrint();
    }
  }, [previewMode, projectTitle]);

  const handleSaveTitle = useCallback(async () => {
    if (!projectId || !projectTitle.trim()) return;

    setSavingProject(true);

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: projectTitle.trim(),
      }),
    });

    setSavingProject(false);
    
    if (!response.ok) {
      setErrorMessage("Failed to save project title.");
    }
  }, [projectId, projectTitle]);

  const handleSaveProject = useCallback(async () => {
    if (!projectId) return;

    setSavingProject(true);
    setErrorMessage("");

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latexContent: latexCode,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; project?: { title: string } }
      | null;

    setSavingProject(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Failed to save project.");
      return;
    }
  }, [latexCode, projectId]);

  useEffect(() => {
    if (!projectId || latexCode === initialLatexCode || savingProject) return;
    
    const timeout = setTimeout(() => {
      handleSaveProject();
      setInitialLatexCode(latexCode);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [latexCode, initialLatexCode, projectId, savingProject, handleSaveProject]);

  const handleMouseUpGlobal = useCallback(() => {
    isDraggingHoriz.current = false;
    isDraggingVert.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const handleMouseMoveGlobal = useCallback((e: globalThis.MouseEvent) => {
    if (isDraggingHoriz.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      setSplitRatio(Math.min(0.75, Math.max(0.25, ratio)));
    } else if (isDraggingVert.current && leftPaneRef.current) {
      const rect = leftPaneRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = y / rect.height;
      setVerticalSplitRatio(Math.min(0.8, Math.max(0.2, ratio)));
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMoveGlobal);
    document.addEventListener("mouseup", handleMouseUpGlobal);
    return () => {
      document.removeEventListener("mousemove", handleMouseMoveGlobal);
      document.removeEventListener("mouseup", handleMouseUpGlobal);
    };
  }, [handleMouseMoveGlobal, handleMouseUpGlobal]);

  const handleMouseDownHoriz = (e: ReactMouseEvent) => {
    e.preventDefault();
    isDraggingHoriz.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseDownVert = (e: ReactMouseEvent) => {
    e.preventDefault();
    isDraggingVert.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```(?:latex)?\n[\s\S]*?\n```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const code = part
          .replace(/^```(?:latex)?\n/, "")
          .replace(/\n```$/, "");
          
        if (!code.trim() || code.trim() === "none" || code.trim() === "null") {
          return null;
        }
        
        return <SnippetBox key={index} code={code} />;
      }

      if (!part.trim()) return null;

      return (
        <span
          key={index}
          className="whitespace-pre-wrap font-sans block mb-1.5"
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl z-10">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Logo className="size-8 text-foreground" />
            </Link>
            <div className="h-4 w-px bg-border" />
          <input
            type="text"
            className="font-medium text-sm bg-transparent border-0 outline-none w-[200px] truncate focus:ring-1 focus:ring-border rounded-sm px-1 -ml-1 text-foreground"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            onBlur={() => void handleSaveTitle()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Untitled Project"
          />
        </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              title={showLeftPanel ? "Hide editor" : "Show editor"}
            >
              {showLeftPanel ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>

            <div className="h-5 w-px bg-border/50 mx-0.5" />

            <div className="flex items-center rounded-lg border border-border/50 p-0.5">
              <button
                onClick={() => setPreviewMode("preview")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  previewMode === "preview"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="size-3.5" />
                Preview
              </button>
              <button
                onClick={() => setPreviewMode("pdf")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  previewMode === "pdf"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="size-3.5" />
                PDF
              </button>
            </div>

            {previewMode === "pdf" && (
              <>
                <div className="h-5 w-px bg-border/50 mx-0.5" />
                <div className="flex items-center rounded-lg border border-border/50 p-0.5">
                  <button 
                    onClick={() => setPdfZoom(z => Math.max(0.25, z - 0.25))} 
                    className="px-2 hover:bg-muted rounded-md text-muted-foreground font-semibold"
                  >
                    -
                  </button>
                  <span className="text-[10px] w-8 text-center font-mono">{Math.round(pdfZoom * 100)}%</span>
                  <button 
                    onClick={() => setPdfZoom(z => Math.min(3, z + 0.25))} 
                    className="px-2 hover:bg-muted rounded-md text-muted-foreground font-semibold"
                  >
                    +
                  </button>
                </div>
              </>
            )}

            <div className="h-5 w-px bg-border/50 mx-0.5" />

            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="mr-1.5 size-3.5" />
              ) : (
                <Copy className="mr-1.5 size-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDownloadPDF}
                disabled={loadingProject}
              >
                <Download className="size-4" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
        {showLeftPanel && (
          <>
            <div
              className="flex flex-col min-w-0 bg-background"
              style={{ width: `${splitRatio * 100}%` }}
              ref={leftPaneRef}
            >
              <div
                className="flex flex-col min-h-0 bg-background pt-2"
                style={{ height: `${verticalSplitRatio * 100}%` }}
              >
                <div className="px-4 pb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> AI Assistant
                  </span>
                  <select
                    className="bg-transparent text-[10px] text-muted-foreground outline-none border-none cursor-pointer pr-1 w-28 text-right truncate"
                    value={activeThreadId || "new"}
                    onChange={(e) => void handleThreadSwitch(e.target.value)}
                  >
                    <option value="new">+ New Chat</option>
                    {threads.map(t => (
                      <option key={t.id} value={t.id}>
                        {new Date(t.updated_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                {errorMessage ? (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-destructive">{errorMessage}</p>
                  </div>
                ) : null}

                <div className="flex-1 overflow-y-auto px-4 min-h-0">
                  <div className="space-y-4 py-2">
                    {loadingThread ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="size-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground max-w-[80%]"
                              : "bg-muted/30 text-foreground max-w-[95%]"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <>
                              {msg.metadata?.attachments && msg.metadata.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {msg.metadata.attachments.map((att: { id?: string; name: string; type: string; url?: string }, i: number) => (
                                    <div key={i} className="flex items-center gap-1 rounded-sm text-[10px] overflow-hidden max-w-[200px]">
                                      {att.type?.startsWith("image/") ? (
                                        <div className="relative border border-primary-foreground/20 rounded-md overflow-hidden shadow-sm">
                                          <img 
                                            src={att.url || `/api/projects/${projectId}/attachments/${att.id}`} 
                                            alt={att.name} 
                                            className="w-full h-auto max-h-[160px] object-cover" 
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 bg-primary-foreground/20 px-2 py-1 rounded-sm">
                                          <Paperclip className="size-3 shrink-0" />
                                          <span className="truncate max-w-[120px]">{att.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            </>
                          ) : (
                            renderMessageContent(msg.content)
                          )}
                        </div>
                        {msg.role === "user" && (
                          <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <User className="size-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {generating && (
                      <div className="flex gap-3 justify-start">
                        <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="size-4 text-primary" />
                        </div>
                        <div className="bg-muted/30 rounded-xl px-4 py-3 text-xs text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                <div className="px-4 pb-2 pt-1">
                  {pendingFiles.length > 0 && (
                    <div className="flex gap-2 mb-2 px-1">
                      {pendingFiles.map((file, i) => (
                        <div key={i} className="relative size-12 group">
                          <div className="size-full rounded-md border border-border/50 overflow-hidden bg-muted/20">
                            {file.type.startsWith("image/") ? (
                              <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover opacity-80" />
                            ) : (
                              <div className="size-full flex justify-center items-center text-[10px] text-muted-foreground break-all p-1 text-center leading-tight">
                                {file.name.length > 15 ? file.name.slice(0, 12) + "..." : file.name}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setPendingFiles(prev => prev.filter((_, index) => index !== i))}
                            className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm hover:scale-110 z-10"
                            type="button"
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="relative flex items-end gap-2 rounded-xl border border-border/60 bg-muted/20 p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleUploadFile}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload file or image"
                    >
                      <Paperclip className="size-4" />
                    </Button>
                    <Textarea
                      id="ai-prompt"
                      placeholder="Ask the AI to generate LaTeX..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="resize-none text-sm min-h-[36px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 px-2 py-1.5 shadow-none flex-1"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleGenerate();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg"
                      onClick={() => void handleGenerate()}
                      disabled={loadingProject || generating || (!prompt.trim() && pendingFiles.length === 0)}
                    >
                      {generating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-end mt-1.5 mr-2">
                    <span className="text-[10px] text-muted-foreground/60">
                      Enter to send · Shift+Enter for newline
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="h-[3px] -my-[1px] cursor-row-resize hover:bg-primary/40 active:bg-primary/60 transition-colors shrink-0 z-10"
                onMouseDown={handleMouseDownVert}
              />

              <div className="flex-1 flex flex-col min-h-0 bg-background border-t border-border/50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/10 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    LaTeX Source
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {latexCode.split("\n").length} lines · ⌘F to search
                  </span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {loadingProject ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Loading project...
                    </div>
                  ) : (
                    <CodeEditor value={latexCode} onChange={setLatexCode} />
                  )}
                </div>
              </div>
            </div>

            <div
              className="w-[3px] -ml-[3px] border-r border-border/50 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors shrink-0 z-10"
              onMouseDown={handleMouseDownHoriz}
            />
          </>
        )}

        <div
          className="flex flex-col min-w-0"
          style={{ width: showLeftPanel ? `${(1 - splitRatio) * 100}%` : "100%" }}
        >
          <div className="flex items-center px-4 py-2 border-b border-border/50 bg-muted/10 shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {previewMode === "pdf" ? "PDF Preview" : "Live Preview"}
            </span>
          </div>
          <div
            className={`flex-1 overflow-auto ${
              previewMode === "pdf" ? "bg-[#595959] p-8" : "p-6 sm:p-8"
            }`}
          >
            {previewMode === "pdf" ? (
              <div className="w-full mx-auto md:max-w-none flex justify-center">
                <PaginatedPDF content={latexCode} previewRef={previewRef} zoom={pdfZoom} />
              </div>
            ) : (
              <div className="max-w-2xl mx-auto" ref={previewRef}>
                <LatexRenderer content={latexCode} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
