'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Menu, X, Search, LogOut, User, Settings, Package,
  FileText, Clock, LayoutDashboard, PlusCircle, Moon, Sun, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import SearchBar from "@/components/dashboard/SearchBar";
import NotificationsBell from "@/components/NotificationsBell";
import AdminShell from "@/components/AdminShell";
import { usePathname, useParams, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import CongratulationsModal from "@/components/CongratulationsModal";
import OnboardingTour from "@/components/OnboardingTour";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('exodus_dark_mode');
  const savedSource = localStorage.getItem('exodus_dark_mode_source');
  if (savedSource === 'manual' && saved !== null) return saved === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});
const [darkModeSource, setDarkModeSource] = useState<'auto' | 'manual'>('auto');
  const [isNewUser, setIsNewUser] = useState(false);
const [showCongrats, setShowCongrats] = useState(false);
const [showTour, setShowTour] = useState(false);

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

  // Use last name for greeting, fallback to first name
  const greetingName = useMemo(() => {
    const parts = userName.split(' ').filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'User';
  }, [userName]);

  const initials = useMemo(() => {
    const parts = userName.split(' ').filter(Boolean);
    return ((parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '')).toUpperCase();
  }, [userName]);

  

  // Check if new user (first login)
  useEffect(() => {
  if (!session?.user?.email) return;
  const key = `exodus_visited_${session.user.email}`;
  const storedTime = localStorage.getItem(key);

  // Get account creation time from session
  const createdAt = (session.user as any).createdAt
    ? new Date((session.user as any).createdAt).getTime()
    : null;

  const isNew = !storedTime || (createdAt && createdAt > parseInt(storedTime));

  if (isNew) {
    setIsNewUser(true);
    setShowCongrats(true);
    localStorage.setItem(key, String(Date.now()));
  }
}, [session?.user?.email]);

  // Dark mode
useEffect(() => {
  const saved = localStorage.getItem('exodus_dark_mode');
  const savedSource = localStorage.getItem('exodus_dark_mode_source');

  if (savedSource === 'manual' && saved !== null) {
    const isDark = saved === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } else {
    // Always re-read system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}, []);

const toggleDark = () => {
  const next = !darkMode;
  setDarkMode(next);
  localStorage.setItem('exodus_dark_mode', String(next));
  localStorage.setItem('exodus_dark_mode_source', 'manual');
  if (next) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
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

  const navItems = [
    { href: `/${locale}/dashboard`, label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { href: `/${locale}/dashboard/shipments/new`, label: 'New Shipment', icon: <PlusCircle className="w-5 h-5" />, mobileOnly: true },
    { href: `/${locale}/dashboard/track`, label: 'Track Shipment', icon: <Package className="w-5 h-5" /> },
    { href: `/${locale}/dashboard/invoices`, label: 'Invoices', icon: <FileText className="w-5 h-5" /> },
    { href: `/${locale}/dashboard/history`, label: 'History', icon: <Clock className="w-5 h-5" /> },
    { href: `/${locale}/dashboard/settings`, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-gray-50 dark:bg-gray-950">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed md:sticky top-0 h-screen z-50
        text-white flex-shrink-0 flex flex-col
        shadow-2xl transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'}
      `} style={{ background: 'linear-gradient(160deg, #0b3aa4 0%, #0c52c4 40%, #0e7490 100%)' }}>

        {/* Decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/20 via-white/40 to-white/20" />

        {/* Brand header */}
        <div className="px-3 pt-5 pb-4">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen ? (
              <>
                <Link href={`/${locale}/dashboard`} className="flex items-center min-w-0">
                  <img src="/logo.svg" alt="Exodus" className="h-9 w-auto" />
                </Link>
                <button
                  className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer shrink-0"
                  onClick={() => setSidebarOpen(false)}>
                  <X size={17} />
                </button>
              </>
            ) : (
              <button
                className="p-2 rounded-xl hover:bg-white/15 transition cursor-pointer"
                onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
            )}
          </div>

          {/* Greeting card */}
          {sidebarOpen && (
            <div className="mt-4 rounded-2xl bg-white/10 border border-white/15 px-4 py-3.5 backdrop-blur-sm">
              {isNewUser ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <p className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider">Welcome!</p>
                  </div>
                  <p className="text-sm font-bold text-white">Congratulations, {greetingName}! 🎉</p>
                  <p className="text-[11px] text-white/60 mt-0.5">Your account is ready to use.</p>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">Welcome back,</p>
                  <p className="text-sm font-bold text-white mt-0.5">{greetingName} 👋</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto" data-tour="nav">
          {navItems.map(({ href, label, icon, exact, mobileOnly }) => {
            const isActive = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                title={!sidebarOpen ? label : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold
                  ${mobileOnly ? 'md:hidden' : ''}
                  ${!sidebarOpen ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-white text-[#0b3aa4] shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/12'
                  }`}>
                <span className={`shrink-0 transition-colors ${isActive ? 'text-[#0b3aa4]' : 'text-white/80 group-hover:text-white'}`}>
                  {icon}
                </span>
                {sidebarOpen && <span className="truncate text-sm">{label}</span>}
                {/* Active indicator dot when collapsed */}
                {!sidebarOpen && isActive && (
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2 pb-4 mt-2">
          <div className="border-t border-white/15 pt-2">
            <button
              onClick={() => setLogoutOpen(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/12 transition-all duration-200 font-semibold cursor-pointer text-sm text-white/80 hover:text-white
                ${!sidebarOpen ? 'justify-center' : ''}`}
              title={!sidebarOpen ? 'Logout' : undefined}>
              <LogOut className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* TOPBAR */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="h-14 px-3 sm:px-5 flex items-center gap-2 sm:gap-3">

            {/* Mobile menu button */}
            <button
  data-tour="mobile-menu"
  className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-600 dark:text-gray-300 shrink-0"
  onClick={() => setSidebarOpen(true)}>
  <Menu size={20} />
</button>

            {/* Logo — mobile only */}
            <Link href={`/${locale}/dashboard`} className="md:hidden shrink-0">
              <img src={darkMode ? '/logo.svg' : '/logo-dark.svg'} alt="Exodus" className="h-9 w-auto" />
            </Link>

            {/* Logo — desktop only */}
            <Link href={`/${locale}/dashboard`} className="hidden md:block shrink-0">
              <img src={darkMode ? '/logo.svg' : '/logo-dark.svg'} alt="Exodus" className="h-12 w-auto" />
            </Link>

            {/* Search — desktop */}
            <div className="hidden md:flex flex-1 mx-6" data-tour="search">
  <SearchBar locale={locale} />
</div>

            {/* Spacer on mobile */}
            <div className="flex-1 md:hidden" />

            {/* Right actions */}
            <div className="flex items-center gap-2.5">

              {/* Dark mode toggle */}
              <button
  data-tour="dark-toggle"
  onClick={toggleDark}
  className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-500 dark:text-gray-300 shrink-0">
  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
</button>

              {/* Notifications */}
              <div className="h-8 w-8 flex items-center justify-center shrink-0" data-tour="notifications">
  <NotificationsBell />
</div>

              {/* Create shipment — desktop only */}
              <Link
  href={`/${locale}/dashboard/shipments/new`}
  data-tour="create"
  className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-[#0b3aa4] text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-sm text-sm cursor-pointer shrink-0">
                <PlusCircle className="w-4 h-4" />
                <span>Create Shipment</span>
              </Link>

              {/* Profile */}
              <div className="relative shrink-0" ref={profileRef} data-tour="profile">
                <button
                  type="button"
                  onClick={() => setProfileOpen(v => !v)}
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
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200"
                      onClick={() => setProfileOpen(false)}>
                      <User size={15} /> Profile
                    </Link>
                    <Link href={`/${locale}/dashboard/settings`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200"
                      onClick={() => setProfileOpen(false)}>
                      <Settings size={15} /> Settings
                    </Link>
                    <div className="border-t dark:border-gray-800 my-1" />
                    <button
                      onClick={() => signOut({ callbackUrl: `/${locale}/sign-in` })}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left text-sm cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-white/10">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile search */}
          <div className="md:hidden px-3 pb-3" data-tour="mobile-search">
  <SearchBar locale={locale} />
</div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0 text-gray-900 dark:text-gray-100">
          {children}
        </main>

        {/* LOGOUT MODAL */}
        {logoutOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLogoutOpen(false)} />
            <div className="relative w-[92%] max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-white/10 p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Confirm logout</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">Are you sure you want to logout?</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 hover:border-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition font-semibold cursor-pointer text-sm">
                  Yes, logout
                </button>
                <button
                  onClick={() => setLogoutOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#0b3aa4] text-white hover:bg-blue-700 transition font-semibold cursor-pointer text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <CongratulationsModal
        open={showCongrats}
        name={greetingName}
        onClose={() => setShowCongrats(false)}
        onStartTour={() => setShowTour(true)}
      />
      <OnboardingTour
        active={showTour}
        onDone={() => setShowTour(false)}
      />
    </div>
  );
}