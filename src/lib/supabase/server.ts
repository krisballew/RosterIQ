/**
 * Server-side Supabase client — anon key, session cookie handling.
 * Safe for use in Server Components, Route Handlers, and layouts.
 * Uses next/headers, so callers run in the Node.js runtime by default.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[RosterIQ] Missing required environment variable: ${name}. ` +
        `Check your .env.local (dev) or Vercel project environment variables (production).`
    );
  }
  return value;
}

export async function createClient() {
  // Evaluated at request time — env vars are available
  const supabaseUrl = assertEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseAnonKey = assertEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore.
        }
      },
    },
  });
}
