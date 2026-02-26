"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Users,
  Package,
  Tags,
  Search,
  PlusCircle,
  LogOut,
  UserX,
} from "lucide-react";
import { Percent } from "lucide-react";
import { signOut } from "next-auth/react";

type Props = { children: ReactNode };

type Hit = {
  shipmentId: string;
  trackingNumber?: string;
  status?: string;
  createdAt?: string;
  createdByUserId?: string;
};

export default function AdminShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  // ✅ default collapsed
  const [open, setOpen] = useState(false);

  // search
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const v = q.trim();
    if (v.length < 2) {
      setHits([]);
      setShowDrop(false);
      return;
    }

    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/shipments/search?q=${encodeURIComponent(v.toUpperCase())}&limit=8`,
          { cache: "no-store" }
        );
        const json = await res.json();
        setHits(Array.isArray(json?.results) ? json.results : []);
        setShowDrop(true);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(t);
  }, [q]);

  const goToHit = (h: Hit) => {
    setShowDrop(false);
    setQ("");

    // ✅ Best: open user detail page if we have createdByUserId
    if (h.createdByUserId) {
      router.push(
        `/${locale}/dashboard/admin/users/${encodeURIComponent(
          h.createdByUserId
        )}#${encodeURIComponent(h.shipmentId)}`
      );
      return;
    }

    // ✅ Fallback
    router.push(`/${locale}/dashboard/admin/shipments`);
  };

  const nav = [
    {
      href: `/${locale}/dashboard/admin/users`,
      label: "Users",
      icon: <Users className="w-5 h-5" />,
    },
    {
      href: `/${locale}/dashboard/admin/shipments`,
      label: "Shipments",
      icon: <Package className="w-5 h-5" />,
    },
    {
      href: `/${locale}/dashboard/admin/statuses`,
      label: "Statuses",
      icon: <Tags className="w-5 h-5" />,
    },

    { href: `/${locale}/dashboard/admin/pricing`, label: "Pricing", icon: <Percent className="w-5 h-5" /> },

    // ✅ NEW: Deleted Users
    {
      href: `/${locale}/dashboard/admin/deleted-users`,
      label: "Deleted Users",
      icon: <UserX className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-gradient-to-br from-white via-blue-50 to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ✅ ONLY ONE ADMIN SIDEBAR */}
      <aside
        className={`text-white transition-all duration-300 shadow-xl flex-shrink-0 flex flex-col
        bg-gradient-to-b from-blue-800 via-blue-700 to-cyan-700 sticky top-0 h-screen
        ${open ? "w-72" : "w-20"}`}
      >
        <div className="px-4 pt-4 pb-3 border-b border-white/15">
          <div
            className={`flex items-center ${
              open ? "justify-between" : "justify-center"
            }`}
          >
            {open ? (
              <>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold truncate">Admin Panel</p>
                  <p className="text-[11px] text-white/70 truncate">
                    Manage users & shipments
                  </p>
                </div>
                <button
                  className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
                  onClick={() => setOpen(false)}
                  aria-label="Collapse"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <button
                className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                onClick={() => setOpen(true)}
                aria-label="Expand"
              >
                <Menu size={22} />
              </button>
            )}
          </div>
        </div>

        <nav className="mt-3 px-2 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition font-semibold
                ${open ? "" : "justify-center"}
                ${
                  active
                    ? "bg-white text-blue-800 shadow-md"
                    : "hover:bg-white/10 text-white"
                }`}
              >
                <span
                  className={`${
                    active ? "text-blue-800" : "text-white/90 group-hover:text-white"
                  }`}
                >
                  {n.icon}
                </span>
                {open && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-3">
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}/sign-in` })}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition font-semibold cursor-pointer
            ${open ? "" : "justify-center"}`}
          >
            <LogOut className="w-5 h-5" />
            {open && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TOPBAR */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/85 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="h-16 px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-[220px]">
              <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
            </div>

            {/* Search */}
            <div className="hidden md:block flex-1 max-w-xl" ref={wrapRef}>
              <div className="relative">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value.toUpperCase())}
                    onFocus={() => q.trim().length >= 2 && setShowDrop(true)}
                    placeholder="Search shipment ID / tracking number…"
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </div>

                {showDrop && (hits.length > 0 || loading) && (
                  <div className="absolute mt-2 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50">
                    {loading ? (
                      <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        Searching…
                      </div>
                    ) : hits.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        No results.
                      </div>
                    ) : (
                      hits.map((h) => (
                        <button
                          key={h.shipmentId}
                          onClick={() => goToHit(h)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-white/10 transition cursor-pointer"
                        >
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {h.shipmentId}{" "}
                            <span className="text-xs font-semibold text-gray-500">
                              • {h.trackingNumber || "—"}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {h.status || "—"}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Create shipment (admin) */}
            <Link
              href={`/${locale}/dashboard/admin/shipments/new`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              Create Shipment
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 min-w-0 text-gray-900 dark:text-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}