/**
 * Supabase admin client — service role key, Node.js runtime only.
 *
 * Any file that imports from this module MUST declare:
 *   export const runtime = "nodejs";
 *
 * Never import this in middleware or client components.
 */
import { createClient } from "@supabase/supabase-js";

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[RosterIQ] Missing required environment variable: ${name}. ` +
        `Check your .env.local (dev) or Vercel project environment variables (production).`
    );
  }
  return value;
}

export function createAdminClient() {
  const supabaseUrl = assertEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const serviceRoleKey = assertEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
