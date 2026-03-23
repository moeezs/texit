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
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LatexRenderer from "@/components/latex-renderer";
import CodeEditor from "@/components/code-editor";
import {
  Save,
  Loader2,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Eye,
  Download,
  Send,
  Paperclip,
  Bot,
  User,
  Code2,
  Play,
  Sparkles,
} from "lucide-react";
import { SAMPLE_DOCUMENT, WELCOME_MESSAGE } from "@/lib/editor-defaults";

type PreviewMode = "preview" | "pdf";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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
            className={`text-[10px] font-medium flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${
              view === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="size-3" /> Code
          </button>
          <button
            onClick={() => setView("render")}
            className={`text-[10px] font-medium flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors ${
              view === "render"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="size-3" /> Rendered
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-3 mr-1 text-green-500" />
            ) : (
              <Copy className="size-3 mr-1" />
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

function PaginatedPDF({ content, previewRef }: { content: string, previewRef: React.RefObject<HTMLDivElement | null> }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    if (measureRef.current) {
      const height = measureRef.current.offsetHeight;
      const pageCount = Math.max(1, Math.ceil(height / 864));
      setPages(pageCount);
    }
  }, [content]);

  return (
    <div className="flex flex-col items-center gap-8 pdf-preview-mode w-full" ref={previewRef}>
      <div className="absolute opacity-0 pointer-events-none left-0 top-0 overflow-hidden" style={{ width: 0, height: 0 }}>
        <div 
          ref={measureRef} 
          style={{ 
            width: "624px",
            fontFamily: "'Computer Modern Serif', Georgia, 'Times New Roman', serif",
            fontSize: "11pt",
            lineHeight: "1.5",
          }}
        >
          <LatexRenderer content={content} />
        </div>
      </div>

      {Array.from({ length: pages }).map((_, i) => (
        <div 
          key={i} 
          className="pdf-page bg-white relative shadow-2xl shadow-black/40 shrink-0"
          style={{ width: '816px', height: '1056px', padding: '96px', boxSizing: 'border-box' }}
        >
          <div className="relative w-full h-full overflow-hidden">
            <div 
              className="absolute left-0 w-full"
              style={{ 
                top: `-${i * 864}px`, 
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
  const [projectId, setProjectId] = useState(
    routeProjectId && routeProjectId !== "new" ? routeProjectId : ""
  );
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  const [loadingProject, setLoadingProject] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
        setLatexCode(payload.project.latexContent);
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
    if (!prompt.trim() || !projectId) return;

    const currentPrompt = prompt;
    setPrompt("");
    setGenerating(true);
    setErrorMessage("");

    const response = await fetch(`/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: currentPrompt,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; messages?: ChatMessage[] }
      | null;
    const returnedMessages = payload?.messages;

    setGenerating(false);

    if (!response.ok || !returnedMessages) {
      setPrompt(currentPrompt);
      setErrorMessage(payload?.error ?? "Failed to send message.");
      return;
    }

    setMessages((prev) => [...prev, ...returnedMessages]);
  }, [projectId, prompt]);

  const handleUploadFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file || !projectId) {
        return;
      }

      setGenerating(true);
      setErrorMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      event.target.value = "";

      if (!response.ok) {
        setGenerating(false);
        setErrorMessage(payload?.error ?? "Failed to upload file.");
        return;
      }

      const refreshResponse = await fetch(`/api/projects/${projectId}`);
      const refreshPayload = (await refreshResponse.json().catch(() => null)) as
        | { project?: { messages: ChatMessage[] } }
        | null;

      setGenerating(false);

      if (refreshResponse.ok && refreshPayload?.project) {
        setMessages(refreshPayload.project.messages);
      }
    },
    [projectId]
  );

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
        title: projectTitle,
        latexContent: latexCode,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; project?: { title: string } }
      | null;

    setSavingProject(false);

    if (!response.ok || !payload?.project) {
      setErrorMessage(payload?.error ?? "Failed to save project.");
      return;
    }

    setProjectTitle(payload.project.title);
  }, [latexCode, projectId, projectTitle]);

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
        return <SnippetBox key={index} code={code} />;
      }

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
              <div className="size-8 rounded-md bg-gradient-to-br from-white to-white/60 flex items-center justify-center">
                <span className="text-xs font-bold text-black">TX</span>
              </div>
            </Link>
            <div className="h-5 w-px bg-border/50" />
            <span className="text-sm font-medium text-muted-foreground">
              {projectTitle}
            </span>
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
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={handleDownloadPDF}
            >
              <Download className="mr-1.5 size-3.5" />
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={handleSaveProject}
              disabled={loadingProject || savingProject}
            >
              <Save className="mr-1.5 size-3.5" />
              {savingProject ? "Saving..." : "Save"}
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
                <div className="px-4 pb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> AI Assistant
                  </span>
                </div>
                {errorMessage ? (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-destructive">{errorMessage}</p>
                  </div>
                ) : null}

                <div className="flex-1 overflow-y-auto px-4 min-h-0">
                  <div className="space-y-4 py-2">
                    {messages.map((msg) => (
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
                          {msg.role === "user"
                            ? msg.content
                            : renderMessageContent(msg.content)}
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
                      disabled={loadingProject || generating || !prompt.trim()}
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
              <div className="w-full mx-auto md:max-w-[850px] lg:max-w-none flex justify-center">
                <PaginatedPDF content={latexCode} previewRef={previewRef} />
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
