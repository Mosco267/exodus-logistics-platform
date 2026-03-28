"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PlusCircle, Search, UserCircle, LogOut, KeyRound, Image as ImageIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

type Suggestion = {
  shipmentId: string;
  trackingNumber?: string;
  // your API might return ANY of these — we’ll support all
  createdByUserId?: string;
  userId?: string;
  userEmail?: string;
};

function toUpperKeepSpaces(v: string) {
  return v.toUpperCase();
}

export default function AdminHeader() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const router = useRouter();

  const { data: session } = useSession();

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const trimmed = useMemo(() => q.trim(), [q]);

  const adminName = String(session?.user?.name || "Admin").trim();
  const adminEmail = String(session?.user?.email || "").trim();

  const initials = useMemo(() => {
    const parts = adminName.split(" ").filter(Boolean);
    const a = parts[0]?.[0] ?? "A";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [adminName]);

  // close dropdowns on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;

      if (boxRef.current && !boxRef.current.contains(t)) setOpen(false);
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // search suggestions
  useEffect(() => {
    if (!trimmed || trimmed.length < 2) {
      setItems([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/shipments/search?q=${encodeURIComponent(trimmed)}&limit=8`,
          { cache: "no-store" }
        );
        const json = await res.json();
        setItems(Array.isArray(json?.results) ? json.results : []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(t);
  }, [trimmed]);

  const goToSuggestion = (s: Suggestion) => {
    setOpen(false);
    setQ("");

    const userId = String(s.createdByUserId || s.userId || "").trim();
    const shipmentId = String(s.shipmentId || "").trim();

    // ✅ Best route: go to the USER admin page (so you can edit shipment there)
    if (userId && shipmentId) {
      router.push(
        `/${locale}/dashboard/admin/users/${encodeURIComponent(userId)}?focusShipment=${encodeURIComponent(shipmentId)}`
      );
      return;
    }

    // ✅ Fallback route: admin shipments page (avoid user dashboard/status routes)
    if (shipmentId) {
      router.push(
        `/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`
      );
      return;
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.replace(`/${locale}/sign-in`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/85 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="h-16 px-6 flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-[220px]">
          <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
        </div>

        {/* Center search */}
        <div className="flex-1 max-w-xl" ref={boxRef}>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2">
              <Search className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              <input
                value={q}
                onChange={(e) => setQ(toUpperKeepSpaces(e.target.value))}
                onFocus={() => (items.length ? setOpen(true) : null)}
                placeholder="SEARCH SHIPMENT ID / TRACKING NUMBER..."
                className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            {open && (items.length > 0 || loading) && (
              <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
                {loading && (
                  <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    Searching…
                  </div>
                )}

                {!loading && items.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    No matches found.
                  </div>
                )}

                {!loading &&
                  items.map((s) => (
                    <button
                      key={s.shipmentId}
                      type="button"
                      onClick={() => goToSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-white/10 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                            {s.shipmentId}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            {s.trackingNumber ? `Tracking: ${s.trackingNumber}` : "Tracking: —"}
                          </p>
                        </div>

                        <span className="text-xs font-semibold text-blue-700 dark:text-cyan-300">
                          Open →
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/dashboard/admin/shipments/new`}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl
                       hover:bg-blue-700 transition font-semibold shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            Create Shipment
          </Link>

          {/* Admin Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500
                         flex items-center justify-center text-white font-extrabold cursor-pointer shadow-sm"
              aria-label="Admin profile"
              title="Admin profile"
            >
              {initials}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-xl shadow-xl p-2 space-y-2 z-50
                              bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <div className="px-3 pt-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {adminName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {adminEmail}
                  </p>
                </div>

                <div className="border-t my-1 dark:border-gray-800" />

                {/* Update picture (link to your admin profile page) */}
                <Link
                  href={`/${locale}/dashboard/admin/profile`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/10"
                >
                  <ImageIcon size={16} />
                  Update picture
                </Link>

                {/* Change password (link to your admin settings page) */}
                <Link
                  href={`/${locale}/dashboard/admin/settings`}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/10"
                >
                  <KeyRound size={16} />
                  Change password
                </Link>

                <div className="border-t my-1 dark:border-gray-800" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left cursor-pointer
                             text-red-600 hover:bg-red-50 dark:hover:bg-white/10"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile create */}
          <Link
            href={`/${locale}/dashboard/admin/shipments/new`}
            className="sm:hidden flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl
                       shadow-lg hover:bg-blue-700 transition font-semibold"
            aria-label="Create shipment"
          >
            <PlusCircle className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}