/**
 * Middleware — intentionally minimal.
 *
 * @supabase/ssr and its transitive deps reference __dirname at module load time,
 * which throws ReferenceError in Vercel's Edge runtime. Auth protection is
 * handled server-side in src/app/app/layout.tsx and src/app/platform/layout.tsx,
 * so middleware only needs to pass requests through.
 */
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};

