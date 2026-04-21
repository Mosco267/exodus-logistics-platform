import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'it'];
const DEFAULT_LOCALE = 'en';

// Map country code -> locale. Anything not listed defaults to English.
const COUNTRY_TO_LOCALE: Record<string, string> = {
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es',
  HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  // French
  FR: 'fr', BE: 'fr', CD: 'fr', CM: 'fr', CI: 'fr',
  SN: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', GN: 'fr', TG: 'fr', BJ: 'fr',
  // German
  DE: 'de', AT: 'de', LI: 'de',
  // Chinese
  CN: 'zh', TW: 'zh',
  // Italian
  IT: 'it', SM: 'it', VA: 'it',
  // English — explicitly listed (everything else also falls back to en)
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
  ZA: 'en', NG: 'en', GH: 'en', KE: 'en', UG: 'en', TZ: 'en',
  IN: 'en', SG: 'en', PH: 'en', PK: 'en', BD: 'en', MY: 'en',
};

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  // ✅ Force non-www -> www
  if (nextUrl.hostname === "goexoduslogistics.com") {
    const url = nextUrl.clone();
    url.hostname = "www.goexoduslogistics.com";
    return NextResponse.redirect(url);
  }

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) return NextResponse.next();

  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch?.[1] ?? null;

  const dashboardPrefix = locale ? `/${locale}/dashboard` : null;
  const signInPath = locale ? `/${locale}/sign-in` : null;

  const isDashboard = dashboardPrefix ? pathname.startsWith(dashboardPrefix) : false;

  // ✅ Auth check for dashboard
  const sessionToken =
    cookies.get("__Secure-next-auth.session-token")?.value ||
    cookies.get("next-auth.session-token")?.value ||
    cookies.get("__Secure-authjs.session-token")?.value ||
    cookies.get("authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  if (isDashboard && !isLoggedIn && signInPath) {
    return NextResponse.redirect(new URL(signInPath, nextUrl));
  }

  if (isDashboard) {
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // ✅ Auto-detect locale for root or non-localed paths
  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    // 1. Check if user manually chose a language (cookie)
    const cookieLocale = cookies.get('exodus_locale')?.value;
    if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
      const newPath = `/${cookieLocale}${pathname === '/' ? '' : pathname}`;
      return NextResponse.redirect(new URL(newPath, nextUrl));
    }

    // 2. Auto-detect from Vercel geo header
    const country = req.headers.get('x-vercel-ip-country') || '';
    const detectedLocale = COUNTRY_TO_LOCALE[country.toUpperCase()] || DEFAULT_LOCALE;

    const newPath = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.redirect(new URL(newPath, nextUrl));

    // Save detected locale to cookie (user can override via language modal)
    response.cookies.set('exodus_locale', detectedLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};