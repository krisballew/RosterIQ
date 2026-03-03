import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// next/headers (used by createClient) requires Node.js runtime
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/portal";

  const supabase = await createClient();

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const baseUrl = isLocalEnv ? origin : forwardedHost ? `https://${forwardedHost}` : origin;

  // token_hash flow — used by password reset and invite emails
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "invite" | "email" | "signup" | "magiclink",
    });
    if (!error) {
      const destination = type === "recovery" ? "/auth/reset-password" : next;
      return NextResponse.redirect(`${baseUrl}${destination}`);
    }
  }

  // code flow — used by OAuth and PKCE
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = type === "recovery" ? "/auth/reset-password" : next;
      return NextResponse.redirect(`${baseUrl}${destination}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}
