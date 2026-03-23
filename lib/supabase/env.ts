type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const storageBucket =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "project-assets";

export function assertSupabaseEnv() {
  const missingKeys: RequiredEnvKey[] = [];

  if (!supabaseUrl) {
    missingKeys.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    missingKeys.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variable${missingKeys.length > 1 ? "s" : ""}: ${missingKeys.join(", ")}`
    );
  }
}

export function getSupabaseSetupErrorMessage() {
  return "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file and restart the dev server.";
}
