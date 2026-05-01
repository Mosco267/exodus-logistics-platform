// src/app/[locale]/dashboard/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock, Bell, Shield, Trash2, ChevronRight } from 'lucide-react';

export default function SettingsMenuPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');
  const [isMidnight, setIsMidnight] = useState(false);

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

  const items = [
    {
      href: `/${locale}/dashboard/settings/security`,
      icon: <Lock size={18} />,
      title: 'Security',
      desc: 'Password, passkeys and account security',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      href: `/${locale}/dashboard/settings/two-factor`,
      icon: <Shield size={18} />,
      title: 'Two-Factor Authentication',
      desc: 'Add an extra layer of security to your account',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      href: `/${locale}/dashboard/settings/notifications`,
      icon: <Bell size={18} />,
      title: 'Notifications',
      desc: 'Control what emails and alerts you receive',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      href: `/${locale}/dashboard/settings/delete-account`,
      icon: <Trash2 size={18} />,
      title: 'Delete Account',
      desc: 'Permanently remove your account and all data',
      iconBg: 'bg-red-50 dark:bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-10">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
          style={isMidnight ? { color: '#ffffff' } : {}}>Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account preferences and security</p>
      </div>

      {items.map(item => (
        <button key={item.href} onClick={() => router.push(item.href)}
          className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-4 px-5 py-4 hover:shadow-md transition cursor-pointer text-left group">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
            <span className={item.iconColor}>{item.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
          </div>
          <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      ))}
    </div>
  );
}