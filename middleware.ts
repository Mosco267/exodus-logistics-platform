import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch?.[1] ?? "en";

  const dashboardPrefix = `/${locale}/dashboard`;
  const signInPath = `/${locale}/sign-in`;

  const isDashboard = pathname.startsWith(dashboardPrefix);
  const isSignIn = pathname === signInPath;

  // ✅ Check only cookie existence (Edge-safe)
  const token = cookies.get("token")?.value;
  const isLoggedIn = !!token;

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