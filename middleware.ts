import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  // ✅ Force non-www -> www (only for your domain)
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

  // ✅ Support BOTH NextAuth v4 cookie names AND Auth.js v5 cookie names
  const sessionToken =
    cookies.get("__Secure-next-auth.session-token")?.value ||
    cookies.get("next-auth.session-token")?.value ||
    cookies.get("__Secure-authjs.session-token")?.value ||
    cookies.get("authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL(signInPath, nextUrl));
  }

  

  if (isDashboard) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:locale(en|es|fr|de|zh|it)/:path*"],
};