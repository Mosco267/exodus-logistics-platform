// src/app/[locale]/dashboard/settings/security/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Lock, Fingerprint, ChevronRight, Loader2 } from 'lucide-react';

export default function SecurityPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const { data: session } = useSession();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');
  const [isMidnight, setIsMidnight] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map: Record<string, { g: string; s: string }> = {
      default: { g: 'linear-gradient(135deg, #0b3aa4, #0e7490)', s: '#0b3aa4' },
      ocean: { g: 'linear-gradient(135deg, #0e7490, #06b6d4)', s: '#0891b2' },
      sunset: { g: 'linear-gradient(135deg, #0b3aa4, #f97316)', s: '#f97316' },
      arctic: { g: 'linear-gradient(135deg, #0284c7, #bae6fd)', s: '#0284c7' },
      midnight: { g: 'linear-gradient(135deg, #0f172a, #0e7490)', s: '#06b6d4' },
    };
    const apply = () => {
      const c = localStorage.getItem('exodus_theme_cache');
      if (c && map[c]) { setAccent(map[c].g); setAccentSolid(map[c].s); }
      setIsMidnight(c === 'midnight');
    };
    apply();
    window.addEventListener('storage', apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  useEffect(() => {
  const t = setTimeout(() => setReady(true), 400);
  return () => clearTimeout(t);
}, []);

  const isGoogle = (session?.user as any)?.provider === 'google';

 return (
  <>
    {!ready ? (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
          style={{ borderTopColor: accentSolid }} />
      </div>
    ) : (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push(`/${locale}/dashboard/settings`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
            style={isMidnight ? { color: '#ffffff' } : {}}>Security</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your password and passkeys</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Change Password */}
        {!isGoogle && (
          <button onClick={() => router.push(`/${locale}/dashboard/settings/security/change-password`)}
            className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-4 px-5 py-4 hover:shadow-md transition cursor-pointer text-left group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-500/10">
              <Lock size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Change Password</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Update your current account password</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        )}

        {/* Passkey */}
        <button onClick={() => router.push(`/${locale}/dashboard/settings/security/passkey`)}
          className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-4 px-5 py-4 hover:shadow-md transition cursor-pointer text-left group">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-500/10">
            <Fingerprint size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Passkey</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sign in with biometrics or hardware key</p>
          </div>
          <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        {/* Forgot Password */}
        {!isGoogle && (
          <button onClick={() => router.push(`/${locale}/dashboard/settings/forgot-password`)}
            className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-4 px-5 py-4 hover:shadow-md transition cursor-pointer text-left group">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-500/10">
              <Lock size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Forgot Password</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Reset your password via email verification</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        )}
      </div>
    </div>
    )}
  </>
  );
}