'use client';

import { useEffect, useContext } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';

export default function GoogleRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { locale } = useContext(LocaleContext);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace(`/${locale}/sign-in`);
      return;
    }
    if (session?.user) {
      const role = (session.user as any).role;
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        window.location.href = `/${locale}/dashboard/admin/shipments`;
      } else {
        window.location.href = `/${locale}/dashboard`;
      }
    }
  }, [session, status, locale, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm font-semibold text-gray-500">Signing you in...</p>
    </div>
  );
}