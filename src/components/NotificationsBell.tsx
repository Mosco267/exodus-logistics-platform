// src/components/NotificationsBell.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Bell, MessageCircle, Ticket, CreditCard, Package, Truck,
  CheckCheck, Inbox, Loader2, Mail,
} from "lucide-react";

type Notif = {
  _id: string;
  title?: string;
  message?: string;
  shipmentId?: string;
  link?: string;
  ticketId?: string;
  ticketNumber?: string;
  isCustomAdminMessage?: boolean;
  read?: boolean;
  createdAt?: string;
};

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return "";
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function classifyNotif(n: Notif): {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  bg: string;
  fg: string;
} {
  if (n.isCustomAdminMessage) {
    return { Icon: Mail, bg: "bg-indigo-100 dark:bg-indigo-500/15", fg: "text-indigo-600 dark:text-indigo-400" };
  }
  const t = (n.title || "").toLowerCase();
  const m = (n.message || "").toLowerCase();
  const blob = `${t} ${m}`;

  if (n.link?.includes("/support/chat") || blob.includes("message from support")) {
    return { Icon: MessageCircle, bg: "bg-blue-100 dark:bg-blue-500/15", fg: "text-blue-600 dark:text-blue-400" };
  }
  if (n.ticketId || n.ticketNumber || blob.includes("ticket")) {
    return { Icon: Ticket, bg: "bg-amber-100 dark:bg-amber-500/15", fg: "text-amber-600 dark:text-amber-400" };
  }
  if (blob.includes("payment") || blob.includes("receipt") || blob.includes("invoice") || blob.includes("paid")) {
    return { Icon: CreditCard, bg: "bg-emerald-100 dark:bg-emerald-500/15", fg: "text-emerald-600 dark:text-emerald-400" };
  }
  if (blob.includes("shipment") || blob.includes("tracking") || blob.includes("delivered") || blob.includes("dispatched")) {
    return { Icon: Truck, bg: "bg-violet-100 dark:bg-violet-500/15", fg: "text-violet-600 dark:text-violet-400" };
  }
  return { Icon: Package, bg: "bg-gray-100 dark:bg-white/10", fg: "text-gray-600 dark:text-gray-300" };
}

export default function NotificationsBell() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/notifications?limit=10`, { cache: "no-store" });
      const json = await res.json();
      setItems(Array.isArray(json?.notifications) ? json.notifications : []);
      setUnreadCount(Number(json?.unreadCount || 0));
    } catch {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifs(true);
    const t = window.setInterval(() => void fetchNotifs(true), 30000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = boxRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpen = async () => {
    setOpen(v => !v);
    if (!open) void fetchNotifs();
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {}
  };

  const markAllRead = async () => {
    if (marking || unreadCount === 0) return;
    setMarking(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setItems(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      } else {
        const unread = items.filter(n => !n.read);
        await Promise.all(unread.map(n => markRead(String(n._id))));
        setItems(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {} finally {
      setMarking(false);
    }
  };

  // ✅ Routes to use existing tracking page
  const resolveLink = (n: Notif): string => {
    // Admin custom notifications: always go to the full notifications page
    if (n.isCustomAdminMessage) {
      return `/${locale}/dashboard/notifications?open=${encodeURIComponent(String(n._id))}`;
    }
    if (n.link && typeof n.link === "string" && n.link.trim()) {
      return `/${locale}${n.link.startsWith("/") ? n.link : `/${n.link}`}`;
    }
    if (n.ticketId) return `/${locale}/dashboard/support/tickets/${n.ticketId}`;
    if (n.shipmentId) return `/${locale}/dashboard/track/${encodeURIComponent(n.shipmentId)}`;
    return `/${locale}/dashboard/notifications?open=${encodeURIComponent(String(n._id))}`;
  };

  const openNotif = async (n: Notif) => {
    setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    if (!n.read) setUnreadCount(c => Math.max(0, c - 1));
    void markRead(String(n._id));
    setOpen(false);
    router.push(resolveLink(n));
  };

  const hasUnread = unreadCount > 0;

  // ✅ Desktop dropdown — clamp to viewport so it doesn't overflow when
  // the bell is at the right edge of the screen.
  // The trick is to anchor it from the RIGHT and use min(380px, calc(100vw - 2rem)).
  const panelClass = [
    "z-50 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden transition-all duration-200",
    "md:absolute md:right-0 md:mt-2 md:rounded-2xl md:border md:border-gray-200 md:dark:border-white/10",
    "fixed left-3 right-3 top-16 mx-auto rounded-2xl border border-gray-200 dark:border-white/10",
    "md:left-auto md:top-auto md:mx-0",
  ].join(" ");

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}>
        <Bell className={`w-5 h-5 transition ${hasUnread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-200"}`} />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 ring-2 ring-white dark:ring-gray-950 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />

          <div
            className={panelClass}
            style={{
              // Desktop: 380px wide, but never wider than viewport minus margins
              width: "min(380px, calc(100vw - 1.5rem))",
            }}>

            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-gradient-to-b from-gray-50 to-white dark:from-white/[0.03] dark:to-transparent">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-extrabold text-gray-900 dark:text-white text-base">Notifications</p>
                {hasUnread && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {hasUnread && (
                  <button
                    onClick={markAllRead}
                    disabled={marking}
                    className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-60 transition px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10"
                    title="Mark all as read">
                    {marking ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                    <span className="hidden sm:inline">Mark all read</span>
                    <span className="sm:hidden">All read</span>
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[60vh] md:max-h-[340px] overflow-y-auto overscroll-contain">
              {loading && items.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>
                </div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <Inbox className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No notifications yet</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    You'll see updates here when something happens.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-white/10">
                  {items.map((n) => {
                    const { Icon, bg, fg } = classifyNotif(n);
                    const isUnread = !n.read;
                    return (
                      <li key={String(n._id)}>
                        <button
                          type="button"
                          onClick={() => openNotif(n)}
                          className={`w-full text-left px-4 py-3 cursor-pointer transition group ${
                            isUnread
                              ? "bg-blue-50/60 dark:bg-blue-500/[0.06] hover:bg-blue-50 dark:hover:bg-blue-500/10"
                              : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                          }`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                              <Icon size={16} className={fg} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm leading-tight truncate ${isUnread ? "font-extrabold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"}`}>
                                  {n.title || "Notification"}
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 mt-1" aria-label="Unread" />}
                                </div>
                              </div>
                              <p className={`mt-0.5 text-xs leading-snug line-clamp-2 ${isUnread ? "text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}`}>
                                {n.message || ""}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                                {timeAgo(n.createdAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
              <Link
                href={`/${locale}/dashboard/notifications`}
                onClick={() => setOpen(false)}
                className="block text-center text-sm font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer py-1">
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}