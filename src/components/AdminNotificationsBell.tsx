// src/components/AdminNotificationsBell.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bell, MessageCircle, Ticket, Mail, AlertCircle, Loader2, CheckCheck } from "lucide-react";
import { getPusherClient, adminEventsChannel } from "@/lib/pusher-client";

type AdminNotification = {
  _id: string;
  title: string;
  message: string;
  link?: string;
  ticketId?: string;
  ticketNumber?: string;
  read: boolean;
  createdAt: string;
};

function fmtAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function iconForTitle(title: string) {
  const t = title.toLowerCase();
  if (t.includes("chat")) return <MessageCircle size={14} className="text-blue-600 dark:text-blue-400" />;
  if (t.includes("ticket")) return <Ticket size={14} className="text-amber-600 dark:text-amber-400" />;
  return <Mail size={14} className="text-purple-600 dark:text-purple-400" />;
}

export default function AdminNotificationsBell() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/notifications?limit=20", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to load."); return; }
      setItems(Array.isArray(json?.notifications) ? json.notifications : []);
      setUnreadCount(Number(json?.unreadCount || 0));
    } catch (e: any) {
      setErr(e?.message || "Failed to load.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const ch = pusher.subscribe(adminEventsChannel());

    const refresh = () => { void load(); };
    ch.bind("chat:message", refresh);
    ch.bind("ticket:new", refresh);
    ch.bind("ticket:reply", refresh);

    return () => {
      ch.unbind("chat:message", refresh);
      ch.unbind("ticket:new", refresh);
      ch.unbind("ticket:reply", refresh);
    };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleItemClick = async (n: AdminNotification) => {
    setOpen(false);
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n._id }),
      });
    } catch {}
    setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    setUnreadCount(prev => n.read ? prev : Math.max(0, prev - 1));
  };

  // Plain string — no template literal with newlines.
  const dropdownClass = "absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-50";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="cursor-pointer relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-600 dark:text-gray-300"
        title="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={dropdownClass}>

          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <p className="text-sm font-extrabold text-gray-900 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700">
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <p className="text-xs text-gray-500">Loading…</p>
              </div>
            ) : err ? (
              <div className="p-4 flex items-start gap-2 text-xs text-red-500">
                <AlertCircle size={12} className="mt-0.5 shrink-0" /> {err}
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No notifications.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {items.map(n => {
                  const href = n.link ? `/${locale}${n.link}` : null;
                  const rowClass = `px-4 py-3 transition cursor-pointer ${
                    n.read
                      ? "hover:bg-gray-50 dark:hover:bg-white/5"
                      : "bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  }`;
                  const titleClass = `text-xs font-bold truncate ${
                    n.read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white"
                  }`;

                  const inner = (
                    <div className={rowClass}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/5">
                          {iconForTitle(n.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={titleClass}>{n.title}</p>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1" />}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{fmtAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  );

                  if (href) {
                    return (
                      <Link key={n._id} href={href} onClick={() => handleItemClick(n)}>
                        {inner}
                      </Link>
                    );
                  }
                  return (
                    <button key={n._id} onClick={() => handleItemClick(n)} className="w-full text-left">
                      {inner}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}