import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  // ✅ Force non-www -> www (ONLY for your real domain)
  if (nextUrl.hostname === "goexoduslogistics.com") {
    const url = nextUrl.clone();
    url.hostname = "www.goexoduslogistics.com";
    return NextResponse.redirect(url);
  }

  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch?.[1] ?? "en";

  const dashboardPrefix = `/${locale}/dashboard`;
  const signInPath = `/${locale}/sign-in`;

  const isDashboard = pathname.startsWith(dashboardPrefix);
  const isSignIn = pathname === signInPath;

  // ✅ NextAuth session cookie names (http + https)
  const nextAuthToken =
    cookies.get("__Secure-next-auth.session-token")?.value ||
    cookies.get("next-auth.session-token")?.value;

  const isLoggedIn = !!nextAuthToken;

  // 🔒 Block dashboard if not logged in
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL(signInPath, nextUrl));
  }

  // 🔁 Prevent logged in users from seeing sign-in
  if (isSignIn && isLoggedIn) {
    return NextResponse.redirect(new URL(dashboardPrefix, nextUrl));
  }

  // 🚫 Prevent caching dashboard pages
  if (isDashboard) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:locale(en|es|fr|de|zh|it)/:path*"],
};