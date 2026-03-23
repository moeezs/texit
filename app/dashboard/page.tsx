"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";

const mockProjects = [
  {
    id: "1",
    title: "COMPSCI 2AC3 Assignment 3",
    snippet: "\\section*{Question 1}\nThe language $A$ is \\textbf{not regular}...",
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Linear Algebra Midterm Notes",
    snippet: "\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}",
    updatedAt: "Yesterday",
  },
  {
    id: "3",
    title: "Calculus II Problem Set",
    snippet: "\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
    updatedAt: "3 days ago",
  },
  {
    id: "4",
    title: "Physics Lab Report",
    snippet: "F = ma \\quad \\text{Newton's Second Law}",
    updatedAt: "1 week ago",
  },
  {
    id: "5",
    title: "Abstract Algebra Proofs",
    snippet: "\\forall g \\in G, \\exists g^{-1} \\in G",
    updatedAt: "1 week ago",
  },
  {
    id: "6",
    title: "Probability Theory Homework",
    snippet: "P(A|B) = \\frac{P(B|A) P(A)}{P(B)}",
    updatedAt: "2 weeks ago",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return mockProjects;
    const q = searchQuery.toLowerCase();
    return mockProjects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.snippet.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-gradient-to-br from-white to-white/60 flex items-center justify-center">
              <span className="text-sm font-bold text-black">TX</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">TeXit</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="default"
              className="h-9"
              onClick={() => router.push("/")}
            >
              <LogOut className="mr-1.5 size-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8 px-6">
        <div className="mx-auto max-w-6xl">
          {/* Top section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Your Projects
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
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
                onClick={() => router.push("/editor/new")}
              >
                <Plus className="mr-1.5 size-4" />
                New Project
              </Button>
            </div>
          </div>

          {/* Project grid */}
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Search className="size-10 mb-4 opacity-40" />
              <p className="text-sm">No projects found matching &quot;{searchQuery}&quot;</p>
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
                                {project.updatedAt}
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
