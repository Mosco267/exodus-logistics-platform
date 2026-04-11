'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Menu, X, Search, LogOut, User, Settings, Package,
  FileText, Clock, LayoutDashboard, PlusCircle, Moon, Sun,
} from 'lucide-react';
import Link from 'next/link';
import SearchBar from "@/components/dashboard/SearchBar";
import NotificationsBell from "@/components/NotificationsBell";
import AdminShell from "@/components/AdminShell";
import { usePathname, useParams, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
const [darkModeSource, setDarkModeSource] = useState<'auto' | 'manual'>('auto');

  const pathname = usePathname();
  const isAdmin = pathname.includes("/dashboard/admin");
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: `/${locale}/sign-in` });
  };

  const userName = (session?.user?.name || 'User').trim();
  const firstName = useMemo(() => userName.split(' ')[0] || 'User', [userName]);
  const initials = useMemo(() => {
    const parts = userName.split(' ').filter(Boolean);
    return ((parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '')).toUpperCase();
  }, [userName]);

  // Dark mode
  useEffect(() => {
  const saved = localStorage.getItem('exodus_dark_mode');
  const savedSource = localStorage.getItem('exodus_dark_mode_source') as 'auto' | 'manual' | null;

  if (savedSource === 'manual' && saved !== null) {
    // User manually set it — respect their choice
    const isDark = saved === 'true';
    setDarkMode(isDark);
    setDarkModeSource('manual');
    document.documentElement.classList.toggle('dark', isDark);
  } else {
    // Auto mode — use time of day
    const hour = new Date().getHours();
    const isDark = hour >= 19 || hour < 7; // dark from 7pm to 7am
    setDarkMode(isDark);
    setDarkModeSource('auto');
    document.documentElement.classList.toggle('dark', isDark);
  }
}, []);

const toggleDark = () => {
  const next = !darkMode;
  setDarkMode(next);
  setDarkModeSource('manual');
  localStorage.setItem('exodus_dark_mode', String(next));
  localStorage.setItem('exodus_dark_mode_source', 'manual');
  document.documentElement.classList.toggle('dark', next);
};

  useEffect(() => {
    const onPageShow = (_event: PageTransitionEvent) => {
      if (status === "unauthenticated") router.replace(`/${locale}/sign-in`);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [status, locale, router]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (status === "unauthenticated" || status === "loading") return null;
  if (isAdmin) return <AdminShell>{children}</AdminShell>;

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-gray-50 dark:bg-gray-950">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR — hidden on mobile, fixed overlay when open */}
      <aside className={`
        fixed md:sticky top-0 h-screen z-50
        text-white flex-shrink-0 flex flex-col
        bg-gradient-to-b from-[#0b3aa4] to-[#0e7490]
        shadow-xl transition-all duration-300
        ${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'}
      `}>
        {/* Brand */}
        <div className="px-3 pt-4 pb-3 border-b border-white/15">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen ? (
              <>
                <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 min-w-0">
                  <img src="/logo.svg" alt="Exodus" className="h-7 w-auto brightness-0 invert" />
                </Link>
                <button className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer" onClick={() => setSidebarOpen(false)}>
                  <X size={17} />
                </button>
              </>
            ) : (
              <button className="p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
            )}
          </div>
          {sidebarOpen && (
            <div className="mt-3 rounded-xl bg-white/10 px-3 py-2.5">
              <p className="text-[11px] text-white/60">Welcome back,</p>
              <p className="text-sm font-bold truncate">{firstName}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="mt-2 px-2 space-y-0.5 flex-1">
          {[
            { href: `/${locale}/dashboard`, label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
            { href: `/${locale}/dashboard/shipments/new`, label: 'New Shipment', icon: <PlusCircle className="w-5 h-5" />, mobileOnly: true },
            { href: `/${locale}/dashboard/track`, label: 'Track', icon: <Package className="w-5 h-5" /> },
            { href: `/${locale}/dashboard/invoices`, label: 'Invoices', icon: <FileText className="w-5 h-5" /> },
            { href: `/${locale}/dashboard/history`, label: 'History', icon: <Clock className="w-5 h-5" /> },
            { href: `/${locale}/dashboard/settings`, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
          ].map(({ href, label, icon, exact, mobileOnly }) => {
            const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-semibold
                  ${mobileOnly ? 'md:hidden' : ''}
                  ${sidebarOpen ? '' : 'justify-center'}
                  ${isActive ? 'bg-white text-[#0b3aa4] shadow-sm' : 'hover:bg-white/10 text-white'}`}>
                <span className={`shrink-0 ${isActive ? 'text-[#0b3aa4]' : 'text-white/90'}`}>{icon}</span>
                {sidebarOpen && <span className="truncate text-sm">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-white/15">
          <button onClick={() => setLogoutOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition font-semibold cursor-pointer text-sm
              ${sidebarOpen ? '' : 'justify-center'}`}>
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* TOPBAR */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="h-14 px-3 sm:px-5 flex items-center gap-2 sm:gap-3">

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-600 dark:text-gray-300"
              onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>

            {/* Logo — mobile only */}
            <Link href={`/${locale}/dashboard`} className="md:hidden">
              <img src="/logo.svg" alt="Exodus" className="h-8 w-auto" />
            </Link>

            {/* Search — desktop */}
            <div className="hidden md:block flex-1 max-w-md">
              <SearchBar locale={locale} />
            </div>

            <div className="flex-1 md:hidden" />

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Dark mode toggle */}
              <button onClick={toggleDark}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-600 dark:text-gray-300">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Create shipment */}
              <Link href={`/${locale}/dashboard/shipments/new`}
  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#0b3aa4] text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-sm text-sm cursor-pointer">
  <PlusCircle className="w-4 h-4" />
  <span>Create</span>
</Link>

              <NotificationsBell />

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button type="button" onClick={() => setProfileOpen(v => !v)}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0b3aa4] to-[#0e7490] flex items-center justify-center text-white font-extrabold cursor-pointer shadow-sm text-xs">
                  {initials}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-52 rounded-xl shadow-xl p-2 space-y-1 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session?.user?.email ?? ''}</p>
                    </div>
                    <div className="border-t dark:border-gray-800 my-1" />
                    <Link href={`/${locale}/dashboard/profile`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}>
                      <User size={15} /> Profile
                    </Link>
                    <Link href={`/${locale}/dashboard/settings`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}>
                      <Settings size={15} /> Settings
                    </Link>
                    <div className="border-t dark:border-gray-800 my-1" />
                    <button onClick={() => signOut({ callbackUrl: `/${locale}/sign-in` })}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left text-sm cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-white/10">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile search */}
          <div className="md:hidden px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input placeholder="Search shipment..."
                className="bg-transparent outline-none w-full text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400" />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0 text-gray-900 dark:text-gray-100">
          {children}
        </main>

        {/* LOGOUT MODAL */}
        {logoutOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setLogoutOpen(false)} />
            <div className="relative w-[92%] max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-white/10 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm logout</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Are you sure you want to logout?</p>
              <div className="mt-6 flex gap-3">
                <button onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition font-semibold cursor-pointer text-sm">
                  Yes, logout
                </button>
                <button onClick={() => setLogoutOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#0b3aa4] text-white hover:bg-blue-700 transition font-semibold cursor-pointer text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}