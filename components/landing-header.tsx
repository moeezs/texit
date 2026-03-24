"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/components/ui/use-scroll";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

export function LandingHeader({ user }: { user: User | null }) {
  const scrolled = useScroll(20);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 mx-auto w-full max-w-6xl border-b border-transparent md:transition-all md:duration-300 md:ease-out",
        {
          "bg-background/80 supports-[backdrop-filter]:bg-background/60 border-border backdrop-blur-xl md:top-4 md:max-w-4xl md:rounded-full md:shadow-lg":
            scrolled,
          "bg-background/80": !scrolled,
        }
      )}
    >
      <nav
        className={cn(
          "flex h-16 w-full items-center justify-between px-6 md:transition-all md:duration-300 md:ease-out",
          {
            "md:h-14 md:px-8": scrolled,
          }
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="size-9 text-foreground" />
          <span className="text-lg font-semibold tracking-tight">TeXit</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <Button size="default" className="h-9" asChild>
              <Link href="/dashboard">
                Dashboard <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="default" className="h-9" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="default" className="h-9" asChild>
                <Link href="/signup">
                  Get Started <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
