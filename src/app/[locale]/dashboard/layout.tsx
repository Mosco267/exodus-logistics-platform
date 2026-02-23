'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Menu,
  X,
  Search,
  LogOut,
  User,
  Settings,
  Package,
  FileText,
  Clock,
  LayoutDashboard,
  PlusCircle,
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

  const pathname = usePathname();
  const isAdmin = pathname.includes("/dashboard/admin");

  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.replace(`/${locale}/sign-in`);
  };

  const userName = (session?.user?.name || 'User').trim();
  const firstName = useMemo(() => userName.split(' ')[0] || 'User', [userName]);
  const initials = useMemo(() => {
    const parts = userName.split(' ').filter(Boolean);
    const a = parts[0]?.[0] ?? 'U';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }, [userName]);

  useEffect(() => {
    const savedSidebar = localStorage.getItem("exodus_sidebar_open");
    if (savedSidebar === "true") setSidebarOpen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("exodus_sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const onPageShow = (_event: PageTransitionEvent) => {
      if (status === "unauthenticated") {
        router.replace(`/${locale}/sign-in`);
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [status, locale, router]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (status === "unauthenticated") return null;
  if (status === "loading") return null;

  // ✅ Admin pages should NOT use user layout at all
  if (isAdmin) {
  return <AdminShell locale={locale}>{children}</AdminShell>;
}

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-gradient-to-br from-white via-blue-50 to-cyan-50
                    dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* SIDEBAR */}
      <aside
        className={`text-white transition-all duration-300 shadow-xl flex-shrink-0 flex flex-col
        bg-gradient-to-b from-blue-800 via-cyan-700 to-blue-900
        sticky top-0 h-screen
        ${sidebarOpen ? 'w-72' : 'w-20'}`}
      >
        {/* Top Brand Row */}
        <div className="px-4 pt-4 pb-3 border-b border-white/15">
          {sidebarOpen ? (
            <div className="flex items-center justify-between gap-2">
              <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center font-extrabold">
                  EX
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight truncate">Exodus</p>
                  <p className="text-[11px] text-white/70 leading-tight truncate">Logistics Portal</p>
                </div>
              </Link>

              <button
                className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu size={22} />
              </button>
            </div>
          )}

          {/* Greeting */}
          {sidebarOpen && (
            <div className="mt-4 rounded-xl bg-white/10 px-3 py-3">
              <p className="text-xs text-white/70">Welcome back,</p>
              <p className="text-sm font-bold truncate">{firstName}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="mt-3 px-2 space-y-1">
          <SidebarLink
            href={`/${locale}/dashboard`}
            label="Overview"
            icon={<LayoutDashboard className="w-5 h-5" />}
            pathname={pathname}
            sidebarOpen={sidebarOpen}
          />

          <SidebarLink
            href={`/${locale}/dashboard/track`}
            label="Track"
            icon={<Package className="w-5 h-5" />}
            pathname={pathname}
            sidebarOpen={sidebarOpen}
          />

          <SidebarLink
            href={`/${locale}/dashboard/invoices`}
            label="Invoices"
            icon={<FileText className="w-5 h-5" />}
            pathname={pathname}
            sidebarOpen={sidebarOpen}
          />

          <SidebarLink
            href={`/${locale}/dashboard/history`}
            label="History"
            icon={<Clock className="w-5 h-5" />}
            pathname={pathname}
            sidebarOpen={sidebarOpen}
          />

          <SidebarLink
            href={`/${locale}/dashboard/settings`}
            label="Settings"
            icon={<Settings className="w-5 h-5" />}
            pathname={pathname}
            sidebarOpen={sidebarOpen}
          />
        </nav>

        {/* Bottom */}
        <div className="mt-auto p-3 -6">
          <button
            onClick={() => setLogoutOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition font-semibold cursor-pointer
              ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TOPBAR (USER ONLY) */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/85 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="h-16 px-6 flex items-center justify-between gap-4">
            {/* Left: Logo */}
            <div className="flex items-center gap-3 min-w-[220px]">
              <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
            </div>

            {/* Center: Search */}
            <div className="hidden md:block flex-1 max-w-xl">
              <SearchBar locale={locale} />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={`/${locale}/dashboard/shipments/new`}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl
                           hover:bg-blue-700 transition font-semibold shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                Create Shipment
              </Link>

              <NotificationsBell />

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="ml-1 h-9 w-9 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500
                             flex items-center justify-center text-white font-extrabold cursor-pointer shadow-sm"
                  aria-label="Profile"
                >
                  {initials}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-xl shadow-xl p-2 space-y-2 z-50
                                  bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="px-3 pt-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email ?? ''}</p>
                    </div>

                    <div className="border-t my-1 dark:border-gray-800" />

                    <Link
                      href={`/${locale}/dashboard/profile`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg
                                 hover:bg-blue-50 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User size={16} /> Profile
                    </Link>

                    <Link
                      href={`/${locale}/dashboard/settings`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg
                                 hover:bg-blue-50 dark:hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings size={16} /> Settings
                    </Link>

                    <div className="border-t my-1 dark:border-gray-800" />

                    <button
                      onClick={() => signOut({ callbackUrl: `/${locale}/signin` })}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left cursor-pointer
                                 text-red-600 hover:bg-red-50 dark:hover:bg-white/10"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search + Create */}
          <div className="md:hidden px-6 pb-4 flex gap-3">
            <div className="flex-1 flex items-center px-4 py-2 rounded-xl shadow-inner
                            bg-gray-100 dark:bg-white/10">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-300 mr-2" />
              <input
                placeholder="Search shipment..."
                className="bg-transparent outline-none w-full text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            <Link
              href={`/${locale}/dashboard/shipments/new`}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl
                         shadow-lg hover:bg-blue-700 transition font-semibold"
            >
              <PlusCircle className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 min-w-0 text-gray-900 dark:text-gray-100">
          {children}
        </main>

        {/* LOGOUT MODAL */}
        {logoutOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setLogoutOpen(false)}
            />

            <div className="relative w-[92%] max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-white/10 p-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Confirm logout
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to logout?
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-4 sm:justify-between">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl
                             border-2 border-gray-300 dark:border-white/20
                             text-gray-800 dark:text-gray-200
                             hover:border-red-500 hover:text-red-600
                             hover:bg-red-50 dark:hover:bg-red-500/10
                             transition-all duration-200 font-semibold cursor-pointer"
                >
                  Yes, logout
                </button>

                <button
                  type="button"
                  onClick={() => setLogoutOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl
                             bg-cyan-600 text-white
                             hover:bg-cyan-700
                             transition-all duration-200 font-semibold cursor-pointer"
                >
                  No, don’t logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarLink({ href, label, pathname, icon, sidebarOpen }: any) {
  const isDashboardRoot = href.endsWith("/dashboard");

  const isActive = isDashboardRoot
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition font-semibold
      ${sidebarOpen ? "" : "justify-center"}
      ${isActive ? "bg-white text-blue-800 shadow-md" : "hover:bg-white/10 text-white"}`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={`shrink-0 ${isActive ? "text-blue-800" : "text-white/90 group-hover:text-white"}`}>
        {icon}
      </span>

      {sidebarOpen && <span className="truncate">{label}</span>}
    </Link>
  );
}