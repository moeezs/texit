"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { LogOut, Loader2, ArrowLeft, User as UserIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseSetupErrorMessage } from "@/lib/supabase/env";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [aiRequestsCount, setAiRequestsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      let supabase;
      try {
        supabase = createSupabaseBrowserClient();
      } catch {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) router.push("/login");
        return;
      }

      const response = await fetch("/api/profile", {
        credentials: "include",
      });
      
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; profile?: UserProfile; aiRequestsCount?: number }
        | null;

      if (!response.ok) {
        if (!cancelled) {
          setErrorMessage(payload?.error ?? "Failed to load profile.");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setProfile(payload?.profile ?? null);
        setFullName(payload?.profile?.full_name ?? "");
        setAiRequestsCount(payload?.aiRequestsCount ?? 0);
        setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ full_name: fullName }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    setSaving(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Failed to save profile.");
      return;
    }

    setSuccessMessage("Profile updated successfully");
    
    // Update local profile state
    if (profile) {
      setProfile({
        ...profile,
        full_name: fullName
      });
    }
  };

  const handleSignOut = async () => {
    setSaving(true);
    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      setSaving(false);
      setErrorMessage(getSupabaseSetupErrorMessage());
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setSaving(false);
      setErrorMessage(error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() ?? 
                  profile?.email?.charAt(0)?.toUpperCase() ?? 
                  "U";

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
            <Button
              variant="ghost"
              size="default"
              className="h-9"
              onClick={handleSignOut}
              disabled={saving}
            >
              <LogOut className="mr-1.5 size-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-12 px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="size-10 rounded-full">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Profile View</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your personal information
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : !profile ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Profile not found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <form onSubmit={handleSave}>
                <CardHeader className="flex flex-row items-center gap-6 pb-6">
                  <div className="size-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-border/50 shrink-0 mx-auto sm:mx-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-3xl font-medium">{initial}</span>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <CardTitle className="text-xl">{profile.full_name || "New User"}</CardTitle>
                    <CardDescription className="mt-1">
                      {profile.email}
                    </CardDescription>
                    <div className="mt-2 text-xs text-muted-foreground/80 flex items-center justify-center sm:justify-start gap-1">
                      <UserIcon className="size-3" />
                      Member since {memberSince}
                    </div>
                    <div className="mt-3 flex items-center justify-center sm:justify-start">
                      <div className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium border border-primary/20">
                        {aiRequestsCount} / 10 AI Requests Used This Month
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <div className="h-px bg-border/50 w-full" />
                <CardContent className="space-y-6 pt-6 px-8">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Display Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="max-w-md h-11"
                    />
                  </div>
                  
                  {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  ) : null}
                  {successMessage ? (
                    <p className="text-sm text-emerald-500">{successMessage}</p>
                  ) : null}
                </CardContent>
                <CardFooter className="bg-muted/30 px-8 py-5 flex items-center justify-between border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Your name will be displayed on your generated documents.
                  </p>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
