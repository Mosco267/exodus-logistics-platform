'use client';

import { useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';

export default function GoogleRedirectPage() {
  const router = useRouter();
  const { locale } = useContext(LocaleContext);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();

        if (!session?.user) {
          router.replace(`/${locale}/sign-in`);
          return;
        }

        const role = session.user.role;
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          window.location.href = `/${locale}/dashboard/admin/shipments`;
        } else {
          window.location.href = `/${locale}/dashboard`;
        }
      } catch {
        router.replace(`/${locale}/sign-in`);
      }
    };

    // Small delay to ensure session is ready after Google redirect
    const timer = setTimeout(checkSession, 500);
    return () => clearTimeout(timer);
  }, [locale, router]);

 return (
  <>
    <style>{`
      header, nav[role="navigation"] { display: none !important; }
    `}</style>
    <div className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)', minHeight: '100dvh' }}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100/80 px-10 py-8 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-gray-600">Signing you in...</p>
      </div>
    </div>
  </>
);
}