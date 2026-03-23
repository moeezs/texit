import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Eye,
  Zap,
  ArrowRight,
  Code2,
  FileText,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description:
      "Describe what you need in plain English and get perfectly formatted LaTeX instantly.",
  },
  {
    icon: Eye,
    title: "Live Preview",
    description:
      "See your LaTeX rendered in real-time as you type. No more compile-wait-check cycles.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "From idea to publication-ready LaTeX in seconds, not hours. Focus on content, not syntax.",
  },
  {
    icon: Code2,
    title: "Full Document Support",
    description:
      "Supports sections, math environments, itemize, enumerations, and complex academic documents.",
  },
  {
    icon: FileText,
    title: "Project Management",
    description:
      "Organize all your LaTeX projects in one place. Easy access, easy editing.",
  },
];

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-gradient-to-br from-white to-white/60 flex items-center justify-center">
              <span className="text-sm font-bold text-black">TX</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">TeXit</span>
          </Link>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {user ? (
              <Button size="default" className="h-9" asChild>
                <Link href="/dashboard">
                  Dashboard <ArrowRight className="ml-1" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="default" className="h-9" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="default" className="h-9" asChild>
                  <Link href="/signup">
                    Get Started <ArrowRight className="ml-1" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative flex flex-col items-center justify-center text-center px-6 pt-36 pb-20 overflow-hidden">
          {/* Background gradient effects */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
            <Sparkles className="size-3.5" />
            AI-Powered LaTeX Editor
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl leading-[1.1]">
            Write complex LaTeX at the{" "}
            <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              speed of thought
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Describe what you need in plain English. Get perfectly formatted
            LaTeX instantly. Edit, preview, and export — all in one beautiful
            workspace.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="ml-2" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="h-12 px-8 text-base" asChild>
                  <Link href="/signup">
                    Get Started Free <ArrowRight className="ml-2" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-base"
                  asChild
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mock editor preview */}
          <div className="mt-20 w-full max-w-4xl rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <div className="size-3 rounded-full bg-red-500/60" />
              <div className="size-3 rounded-full bg-yellow-500/60" />
              <div className="size-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">
                editor — assignment.tex
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border/50">
              <div className="p-6 text-left">
                <pre className="text-xs sm:text-sm text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                  {`\\section*{Question 1}
The language $A$ is \\textbf{not regular}.
We prove this using the 
\\textbf{Pumping Lemma}.

\\begin{align*}
  |xuv^iwz| &= |uw| + i|v| \\\\
  &= 2pq(1 + m)
\\end{align*}`}
                </pre>
              </div>
              <div className="p-6 flex items-start justify-center bg-background/50">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="text-base font-bold text-foreground">
                    Question 1
                  </p>
                  <p>
                    The language <em>A</em> is <strong>not regular</strong>. We
                    prove this using the <strong>Pumping Lemma</strong>.
                  </p>
                  <p className="text-center font-mono text-xs opacity-70 pt-2">
                    |xuv<sup>i</sup>wz| = |uw| + i|v| = 2pq(1 + m)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
              Everything you need to write LaTeX
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
              A modern editing experience purpose-built for LaTeX, powered by
              AI.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border/50 bg-card/50 p-6 transition-all hover:border-border hover:bg-card/80"
                >
                  <div className="mb-4 inline-flex items-center justify-center size-10 rounded-lg bg-muted">
                    <feature.icon className="size-5 text-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 border-t border-border/50">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to transform your LaTeX workflow?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of students and researchers who write LaTeX faster
              with TeXit.
            </p>
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/signup">
                Start Writing <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-md bg-gradient-to-br from-white to-white/60 flex items-center justify-center">
              <span className="text-[10px] font-bold text-black">TX</span>
            </div>
            <span className="text-sm text-muted-foreground">
              © 2026 TeXit. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Privacy
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Terms
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Contact
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
