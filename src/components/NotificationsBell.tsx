"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type Notif = {
  _id: string;
  title?: string;
  message?: string;
  shipmentId?: string;
  read?: boolean;
  createdAt?: string;
};

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function NotificationsBell() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const boxRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifs = async () => {
    try {
      const res = await fetch(`/api/notifications?limit=5`, { cache: "no-store" });
      const json = await res.json();

      setItems(Array.isArray(json?.notifications) ? json.notifications : []);
      setUnreadCount(Number(json?.unreadCount || 0));
    } catch {
      setItems([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const t = window.setInterval(fetchNotifs, 8000); // poll every 8s
    return () => window.clearInterval(t);
  }, []);

  // close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const el = boxRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open) await fetchNotifs(); // refresh when opening
  };

  const openNotif = async (n: Notif) => {
    // UI first
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    setUnreadCount((c) => (n.read ? c : Math.max(0, c - 1)));

    await markRead(String(n._id));

    setOpen(false);

    if (n.shipmentId) {
      router.push(`/${locale}/dashboard/status/${encodeURIComponent(n.shipmentId)}`);
    } else {
      router.push(`/${locale}/dashboard/notifications`);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer select-none focus:outline-none focus:ring-0"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
            <p className="font-extrabold text-gray-900 dark:text-gray-100">Notifications</p>

            <Link
              href={`/${locale}/dashboard/notifications`}
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-blue-700 dark:text-cyan-300 hover:underline cursor-pointer"
            >
              View all
            </Link>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <div
                  key={String(n._id)}
                  onClick={() => openNotif(n)}
                  className={`px-4 py-3 border-b border-gray-100 dark:border-white/10 cursor-pointer hover:bg-blue-50/60 dark:hover:bg-white/5 transition ${
                    n.read ? "" : "bg-blue-50/60 dark:bg-blue-500/10 border-l-4 border-l-blue-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                      {n.title || "Notification"}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 line-clamp-2">
                    {n.message || ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}