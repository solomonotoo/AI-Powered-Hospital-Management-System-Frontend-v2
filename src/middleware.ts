import { NextResponse, type NextRequest } from "next/server";

// Route guard, cookie-presence level: requests WITHOUT the refresh
// cookie cannot hold a session, so they go straight to login (with
// returnUrl). Requests WITH it proceed — layouts then validate the
// session for real via useSession (a cookie proves nothing by itself:
// it may be expired, revoked, or forged).
//
// Protected surface grows here as routes land: (platform)/*,
// (facility)/*, /dashboard. Auth pages stay public (the login page
// itself handles already-authed users by routing onward).
const PROTECTED_PREFIXES = ["/dashboard", "/account", "/admin", "/patients", "/visits"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const guarded = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!guarded) return NextResponse.next();

  const hasRefreshCookie = request.cookies.has("refresh_token");
  if (!hasRefreshCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
