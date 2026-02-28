import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// These NEXT_PUBLIC vars are inlined at build time — safe for Edge runtime
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  // Guard: if env vars are missing (misconfigured deploy), allow request through
  // rather than crashing the Edge runtime
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "[RosterIQ middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Check your Vercel environment variable configuration."
    );
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() is Edge-safe (reads from cookie, no network call).
  // getUser() makes a network round-trip to Supabase which can be slow/flaky
  // in the Edge runtime and is not required for redirect gating.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { pathname } = request.nextUrl;

  // Never redirect these paths — auth callback, login, API routes
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/app/home";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/app/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Run middleware on all routes EXCEPT:
  //  - _next/static  (static assets)
  //  - _next/image   (Next.js image optimisation)
  //  - favicon.ico
  //  - image/font/media file extensions
  // Note: /api/* and /auth/callback are included in the matcher so cookies
  // are still refreshed, but the redirect logic above skips them.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};

