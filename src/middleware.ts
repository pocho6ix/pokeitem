import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/portfolio", "/profil"];

// Cookie names used by NextAuth
const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
];

// Max acceptable cookie size (8 KB) — anything larger is a corrupt/legacy JWT
const MAX_COOKIE_BYTES = 8 * 1024;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Guard: if any session cookie is oversized, clear it and redirect to home.
  // This fixes the "431 Request Header Too Large" caused by storing base64 images
  // in the JWT cookie (a legacy bug now fixed — image served via /api/avatar/[id]).
  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasOversizedSessionCookie = SESSION_COOKIE_NAMES.some((name) => {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    if (!match) return false;
    return match[1].length > MAX_COOKIE_BYTES;
  });

  if (hasOversizedSessionCookie) {
    // Clear all NextAuth cookies and redirect to home so user can re-login cleanly
    const response = NextResponse.redirect(new URL("/", request.url));
    for (const name of SESSION_COOKIE_NAMES) {
      response.cookies.set(name, "", {
        maxAge: 0,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }
    return response;
  }

  // ── Auth guard for protected routes ──────────────────────────────────────────
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req: request });

  if (!token) {
    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all page routes — exclude Next.js internals, static assets, and
    // NextAuth's own API routes (must never be intercepted by middleware)
    "/((?!_next/static|_next/image|favicon\\.ico|images/|api/).*)",
  ],
};
