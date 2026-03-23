"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  LogOut,
  FileText,
  Clock,
  MoreHorizontal,
  Search,
  Loader2,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseSetupErrorMessage } from "@/lib/supabase/env";

interface ProjectCard {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      let supabase;
      try {
        supabase = createSupabaseBrowserClient();
      } catch {
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          router.push("/login");
        }
        return;
      }

      setLoadingProjects(true);
      setErrorMessage("");

      const response = await fetch("/api/projects", {
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; projects?: ProjectCard[] }
        | null;

      if (!response.ok) {
        if (!cancelled) {
          setErrorMessage(payload?.error ?? "Failed to load your projects.");
          setLoadingProjects(false);
        }
        return;
      }

      if (!cancelled) {
        setProjects(payload?.projects ?? []);
        setLoadingProjects(false);
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(q) ||
        project.snippet.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const handleCreateProject = async () => {
    setActionLoading(true);
    setErrorMessage("");

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; project?: { id: string } }
      | null;

    if (!response.ok || !payload?.project) {
      setActionLoading(false);
      setErrorMessage(payload?.error ?? "Failed to create a project.");
      return;
    }

    router.push(`/editor/${payload.project.id}`);
  };

  const handleSignOut = async () => {
    setActionLoading(true);
    setErrorMessage("");

    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      setActionLoading(false);
      setErrorMessage(getSupabaseSetupErrorMessage());
      return;
    }

    const { error } = await supabase.auth.signOut();

    setActionLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-gradient-to-br from-white to-white/60 flex items-center justify-center">
              <span className="text-sm font-bold text-black">TX</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">TeXit</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full bg-muted/50 border border-border/50 hover:bg-muted"
                title="Profile"
              >
                <User className="size-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="default"
              className="h-9"
              onClick={handleSignOut}
              disabled={actionLoading}
            >
              <LogOut className="mr-1.5 size-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Your Projects
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredProjects.length} project
                {filteredProjects.length !== 1 ? "s" : ""}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9 h-10 w-full sm:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                size="default"
                className="h-10"
                onClick={handleCreateProject}
                disabled={actionLoading}
              >
                <Plus className="mr-1.5 size-4" />
                New Project
              </Button>
            </div>
          </div>

          {errorMessage ? (
            <p className="mb-4 text-sm text-destructive">{errorMessage}</p>
          ) : null}

          {loadingProjects ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-10 mb-4 animate-spin opacity-60" />
              <p className="text-sm">Loading your projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Search className="size-10 mb-4 opacity-40" />
              <p className="text-sm">
                No projects found matching &quot;{searchQuery}&quot;
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link key={project.id} href={`/editor/${project.id}`}>
                  <Card className="group cursor-pointer transition-all hover:border-border hover:bg-card/80 h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <FileText className="size-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-medium truncate">
                              {project.title}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatRelativeDate(project.updatedAt)}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground leading-relaxed overflow-hidden h-20">
                        <pre className="whitespace-pre-wrap">{project.snippet}</pre>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
