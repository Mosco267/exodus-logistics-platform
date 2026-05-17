// src/app/[locale]/dashboard/notifications/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Search, RefreshCw, Trash2, CheckCheck, X, ArrowLeft,
  MessageCircle, Ticket, CreditCard, Truck, Package, Inbox,
  Loader2, AlertCircle, FileText, Mail,
} from "lucide-react";

type Notif = {
  _id: string;
  title?: string;
  message?: string;
  shipmentId?: string;
  trackingNumber?: string;
  invoiceNumber?: string;
  link?: string;
  ticketId?: string;
  ticketNumber?: string;
  isCustomAdminMessage?: boolean;
  read?: boolean;
  createdAt?: string;
};

const PAGE_SIZE = 20;
const LONG_PRESS_MS = 500;

// ─── Identifier regexes ─────────────────────────────────────
// Shipment IDs: EXS-XXXXXX-XXXXXX (e.g. EXS-260508-70BC17)
const SHIPMENT_ID_REGEX = /\bEXS-[A-Z0-9]+-[A-Z0-9]+\b/g;
// Invoice numbers: EXS-INV-YYYY-MM-XXXXXXX (e.g. EXS-INV-2026-05-8154429)
const INVOICE_NUMBER_REGEX = /\bEXS-INV-\d{4}-\d{2}-\d{7}\b/g;
// Tracking numbers: EX + 2 digits + 2 letters + 7 digits + 1 letter (e.g. EX26CA8853535B)
const TRACKING_NUMBER_REGEX = /\bEX\d{2}[A-Z]{2}\d{7}[A-Z]\b/g;

type ParsedToken =
  | { type: "text"; value: string }
  | { type: "shipment"; value: string }
  | { type: "tracking"; value: string }
  | { type: "invoice"; value: string };

function parseMessageTokens(text: string): ParsedToken[] {
  if (!text) return [];

  type Match = { start: number; end: number; type: "shipment" | "tracking" | "invoice"; value: string };
  const matches: Match[] = [];

  // 1. Invoices (most specific — starts with EXS-INV-)
  INVOICE_NUMBER_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INVOICE_NUMBER_REGEX.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: "invoice", value: m[0] });
  }

  // 2. Shipment IDs (starts with EXS- but not EXS-INV-)
  SHIPMENT_ID_REGEX.lastIndex = 0;
  while ((m = SHIPMENT_ID_REGEX.exec(text)) !== null) {
    const s = m.index, e = m.index + m[0].length;
    // Skip if already matched as an invoice
    if (matches.some(x => s < x.end && e > x.start)) continue;
    matches.push({ start: s, end: e, type: "shipment", value: m[0] });
  }

  // 3. Tracking numbers (starts with EX + digit, not EXS-)
  TRACKING_NUMBER_REGEX.lastIndex = 0;
  while ((m = TRACKING_NUMBER_REGEX.exec(text)) !== null) {
    const s = m.index, e = m.index + m[0].length;
    if (matches.some(x => s < x.end && e > x.start)) continue;
    matches.push({ start: s, end: e, type: "tracking", value: m[0] });
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start);

  // Build tokens
  const tokens: ParsedToken[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, match.start) });
    }
    tokens.push({ type: match.type, value: match.value });
    cursor = match.end;
  }
  if (cursor < text.length) {
    tokens.push({ type: "text", value: text.slice(cursor) });
  }
  return tokens;
}

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
  label: string;
} {
  // Admin custom messages get a friendly mail icon — no fancy treatment
  if (n.isCustomAdminMessage) {
    return { Icon: Mail, bg: "bg-indigo-100 dark:bg-indigo-500/15", fg: "text-indigo-600 dark:text-indigo-400", label: "Message" };
  }
  const t = (n.title || "").toLowerCase();
  const m = (n.message || "").toLowerCase();
  const blob = `${t} ${m}`;

  if (n.link?.includes("/support/chat") || blob.includes("message from support")) {
    return { Icon: MessageCircle, bg: "bg-blue-100 dark:bg-blue-500/15", fg: "text-blue-600 dark:text-blue-400", label: "Chat" };
  }
  if (n.ticketId || n.ticketNumber || blob.includes("ticket")) {
    return { Icon: Ticket, bg: "bg-amber-100 dark:bg-amber-500/15", fg: "text-amber-600 dark:text-amber-400", label: "Ticket" };
  }
  if (blob.includes("payment") || blob.includes("receipt") || blob.includes("invoice") || blob.includes("paid")) {
    return { Icon: CreditCard, bg: "bg-emerald-100 dark:bg-emerald-500/15", fg: "text-emerald-600 dark:text-emerald-400", label: "Payment" };
  }
  if (blob.includes("shipment") || blob.includes("tracking") || blob.includes("delivered") || blob.includes("dispatched")) {
    return { Icon: Truck, bg: "bg-violet-100 dark:bg-violet-500/15", fg: "text-violet-600 dark:text-violet-400", label: "Shipment" };
  }
  return { Icon: Package, bg: "bg-gray-100 dark:bg-white/10", fg: "text-gray-600 dark:text-gray-300", label: "Update" };
}

type FilterId = "all" | "unread" | "read";

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || "en";

  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; isBulk: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [openDetails, setOpenDetails] = useState<Notif | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const openId = useMemo(() => String(searchParams.get("open") || "").trim(), [searchParams]);

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`/api/notifications?limit=200`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setItems([]); return; }
      setItems(Array.isArray(json?.notifications) ? json.notifications : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!openId) { setOpenDetails(null); return; }
    const found = items.find(x => String(x._id) === openId);
    if (found) setOpenDetails(found);
  }, [openId, items]);

  const filtered = useMemo(() => {
    let r = items;
    if (filter === "unread") r = r.filter(n => !n.read);
    else if (filter === "read") r = r.filter(n => Boolean(n.read));

    if (search.trim()) {
      const v = search.trim().toLowerCase();
      r = r.filter(n =>
        (n.title || "").toLowerCase().includes(v) ||
        (n.message || "").toLowerCase().includes(v)
      );
    }
    return r;
  }, [items, filter, search]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, search]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = filtered.length > visible.length;

  const counts = useMemo(() => ({
    all: items.length,
    unread: items.filter(n => !n.read).length,
    read: items.filter(n => Boolean(n.read)).length,
  }), [items]);

  const resolveLink = (n: Notif): string => {
    if (n.link && typeof n.link === "string" && n.link.trim()) {
      return `/${locale}${n.link.startsWith("/") ? n.link : `/${n.link}`}`;
    }
    if (n.ticketId) return `/${locale}/dashboard/support/tickets/${n.ticketId}`;
    if (n.shipmentId) return `/${locale}/dashboard/status/${encodeURIComponent(n.shipmentId)}`;
    return "";
  };

  const navigateToIdentifier = (type: "shipment" | "tracking" | "invoice", value: string) => {
    if (type === "shipment") {
      router.push(`/${locale}/dashboard/status/${encodeURIComponent(value)}`);
    } else if (type === "tracking") {
      router.push(`/${locale}/dashboard/track?q=${encodeURIComponent(value)}`);
    } else if (type === "invoice") {
      router.push(`/${locale}/dashboard/invoices/${encodeURIComponent(value)}`);
    }
  };

  const openNotif = async (n: Notif) => {
    if (selected.size > 0) { toggleSelect(n._id); return; }

    setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n._id }),
    }).catch(() => {});

    if (n.isCustomAdminMessage) {
      setOpenDetails(n);
      router.replace(`/${locale}/dashboard/notifications?open=${encodeURIComponent(n._id)}`);
      return;
    }

    const dest = resolveLink(n);
    if (dest) { router.push(dest); return; }

    setOpenDetails(n);
    router.replace(`/${locale}/dashboard/notifications?open=${encodeURIComponent(n._id)}`);
  };

  const closeDetails = () => {
    setOpenDetails(null);
    router.replace(`/${locale}/dashboard/notifications`);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAllVisible = () => {
    const next = new Set(selected);
    visible.forEach(n => next.add(n._id));
    setSelected(next);
  };

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressed = useRef(false);

  const handleTouchStart = (id: string) => {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      toggleSelect(id);
      if (navigator.vibrate) try { navigator.vibrate(20); } catch {}
    }, LONG_PRESS_MS);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const bulkMarkRead = async () => {
    if (selected.size === 0 || markingRead) return;
    setMarkingRead(true);
    const ids = Array.from(selected);
    try {
      const res = await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "markRead" }),
      });
      if (res.ok) {
        setItems(prev => prev.map(n => ids.includes(n._id) ? { ...n, read: true } : n));
        clearSelection();
        showToast(`Marked ${ids.length} as read.`);
      } else {
        showToast("Failed to mark as read.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setMarkingRead(false);
    }
  };

  const bulkDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const ids = confirmDelete.ids;
    try {
      const snapshot = items;
      setItems(prev => prev.filter(n => !ids.includes(n._id)));

      const res = await fetch("/api/notifications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "delete" }),
      });

      if (!res.ok) {
        setItems(snapshot);
        showToast("Failed to delete.", "error");
      } else {
        clearSelection();
        showToast(ids.length === 1 ? "Notification deleted." : `${ids.length} notifications deleted.`);
        if (openDetails && ids.includes(openDetails._id)) closeDetails();
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const askDeleteSelected = () => {
    if (selected.size === 0) return;
    setConfirmDelete({ ids: Array.from(selected), isBulk: selected.size > 1 });
  };

  const askDeleteSingle = (id: string) => {
    setConfirmDelete({ ids: [id], isBulk: false });
  };

  const inSelectionMode = selected.size > 0;
  const allVisibleSelected = visible.length > 0 && visible.every(n => selected.has(n._id));

  return (
    <div className="max-w-3xl mx-auto pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={() => router.push(`/${locale}/dashboard`)}
            className="cursor-pointer mt-1 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition md:hidden"
            aria-label="Back">
            <ArrowLeft size={18} className="text-gray-700 dark:text-gray-200" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Notifications</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {counts.unread > 0 ? `${counts.unread} unread · ` : ""}{counts.all} total
            </p>
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-50">
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>

      {/* Filter pills + search */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-white/5 p-1">
          {([
            { id: "all" as FilterId, label: "All", count: counts.all },
            { id: "unread" as FilterId, label: "Unread", count: counts.unread },
            { id: "read" as FilterId, label: "Read", count: counts.read },
          ]).map(f => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  active
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}>
                {f.label}
                {f.count > 0 && <span className={`ml-1.5 ${active ? "opacity-100" : "opacity-60"}`}>({f.count})</span>}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            style={{ fontSize: "16px" }}
          />
        </div>
      </div>

      {/* ✅ Selection bar — FIXED at the very top, covering the dashboard header (mobile only) */}
      {inSelectionMode && (
        <>
          {/* Mobile: fixed across the top, covers header */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-[100] bg-blue-600 dark:bg-blue-700 shadow-lg">
            <div className="px-3 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={clearSelection}
                  className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 transition text-white">
                  <X size={16} />
                </button>
                <p className="text-sm font-bold text-white truncate">
                  {selected.size} selected
                </p>
                {!allVisibleSelected && visible.length > 0 && (
                  <button onClick={selectAllVisible}
                    className="cursor-pointer ml-1 text-[11px] font-bold text-white/90 hover:text-white underline">
                    Select all
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={bulkMarkRead} disabled={markingRead}
                  className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition disabled:opacity-60">
                  {markingRead ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                  <span>Read</span>
                </button>
                <button onClick={askDeleteSelected}
                  className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition">
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop: sticky just under the header */}
          <div className="hidden md:flex sticky top-14 z-30 mb-3 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/95 dark:bg-blue-500/15 backdrop-blur-md shadow-lg p-3 items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={clearSelection}
                className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition text-blue-700 dark:text-blue-300">
                <X size={14} />
              </button>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                {selected.size} selected
              </p>
              {!allVisibleSelected && visible.length > 0 && (
                <button onClick={selectAllVisible}
                  className="cursor-pointer ml-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline">
                  Select all visible
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={bulkMarkRead} disabled={markingRead}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-500/30 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/20 transition disabled:opacity-60">
                {markingRead ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                <span>Read</span>
              </button>
              <button onClick={askDeleteSelected}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition">
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notifications list */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Inbox className="w-7 h-7 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {search.trim()
                ? "No results match your search"
                : filter === "unread" ? "No unread notifications"
                : filter === "read" ? "No read notifications"
                : "No notifications yet"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {search.trim()
                ? "Try a different search term."
                : "You'll see updates here when something happens."}
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 dark:divide-white/10">
              {visible.map(n => {
                const { Icon, bg, fg, label } = classifyNotif(n);
                const isUnread = !n.read;
                const isSelected = selected.has(n._id);

                return (
                  <li key={n._id}
                    onTouchStart={() => handleTouchStart(n._id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}>
                    <button
                      type="button"
                      onClick={() => openNotif(n)}
                      className={`w-full text-left px-4 py-4 cursor-pointer transition relative group ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-500/15"
                          : isUnread
                            ? "bg-blue-50/40 dark:bg-blue-500/[0.04] hover:bg-blue-50 dark:hover:bg-blue-500/[0.08]"
                            : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      }`}>
                      <div className="flex items-start gap-3">
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleSelect(n._id); }}
                          className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 dark:border-white/20 group-hover:border-blue-400 dark:group-hover:border-blue-500/50 bg-white dark:bg-gray-900"
                          } ${inSelectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}
                          style={{ opacity: inSelectionMode || isSelected ? 1 : undefined }}
                          role="checkbox"
                          aria-checked={isSelected}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M2.5 6L5 8.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                          <Icon size={18} className={fg} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-tight ${
                              isUnread ? "font-extrabold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"
                            }`}>
                              {n.title || "Notification"}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 mt-1.5" aria-label="Unread" />}
                            </div>
                          </div>
                          <p className={`mt-1 text-xs leading-relaxed line-clamp-2 ${
                            isUnread ? "text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {n.message || ""}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${fg}`}>
                              {label}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
                            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); askDeleteSingle(n._id); }}
                          className="hidden md:flex shrink-0 w-8 h-8 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                          title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <div className="px-4 py-4 border-t border-gray-100 dark:border-white/10 text-center">
                <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  Load more ({filtered.length - visible.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {openDetails && (
        <DetailsModal
          notif={openDetails}
          onClose={closeDetails}
          onDelete={() => askDeleteSingle(openDetails._id)}
          onNavigateToken={navigateToIdentifier} />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          count={confirmDelete.ids.length}
          isBulk={confirmDelete.isBulk}
          deleting={deleting}
          onCancel={() => !deleting && setConfirmDelete(null)}
          onConfirm={bulkDelete} />
      )}

      {toast && (
        <div className="fixed left-0 right-0 bottom-24 sm:bottom-8 z-[9999] flex justify-center px-4 pointer-events-none">
          <div className={`pointer-events-auto px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center justify-center gap-2 text-center max-w-sm ${
            toast.type === "success"
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
              : "bg-red-600 text-white"
          }`}>
            {toast.type === "success"
              ? <CheckCheck size={14} className="shrink-0" />
              : <AlertCircle size={14} className="shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAILS MODAL — centered + clickable identifier pills
// ═══════════════════════════════════════════════════════════════

function DetailsModal({
  notif, onClose, onDelete, onNavigateToken,
}: {
  notif: Notif;
  onClose: () => void;
  onDelete: () => void;
  onNavigateToken: (type: "shipment" | "tracking" | "invoice", value: string) => void;
}) {
  const { Icon, bg, fg } = classifyNotif(notif);

  const tokens = useMemo(() => parseMessageTokens(notif.message || ""), [notif.message]);

  const TokenPill = ({
    type, value,
  }: { type: "shipment" | "tracking" | "invoice"; value: string }) => {
    const style = {
      shipment: { bg: "bg-violet-100 dark:bg-violet-500/20",   fg: "text-violet-700 dark:text-violet-300",   hov: "hover:bg-violet-200 dark:hover:bg-violet-500/30",   Icon: Truck },
      tracking: { bg: "bg-blue-100 dark:bg-blue-500/20",       fg: "text-blue-700 dark:text-blue-300",       hov: "hover:bg-blue-200 dark:hover:bg-blue-500/30",       Icon: Package },
      invoice:  { bg: "bg-emerald-100 dark:bg-emerald-500/20", fg: "text-emerald-700 dark:text-emerald-300", hov: "hover:bg-emerald-200 dark:hover:bg-emerald-500/30", Icon: FileText },
    }[type];
    const I = style.Icon;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onNavigateToken(type, value); }}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${style.bg} ${style.fg} ${style.hov} font-bold font-mono text-[12px] transition cursor-pointer align-baseline`}>
        <I size={11} /> {value}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 max-h-[85vh] overflow-hidden flex flex-col">

        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
              <Icon size={18} className={fg} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                {notif.title || "Notification"}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-400 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
          {tokens.map((tok, i) => {
            if (tok.type === "text") return <span key={i}>{tok.value}</span>;
            return <TokenPill key={i} type={tok.type} value={tok.value} />;
          })}
        </div>

        {notif.shipmentId && (
          <div className="px-5 pt-2 pb-2">
            <button
              onClick={() => onNavigateToken("shipment", notif.shipmentId!)}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-sm">
              <Truck size={15} />
              View Shipment {notif.shipmentId}
            </button>
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
          <button onClick={onClose}
            className="cursor-pointer px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition">
            Close
          </button>
          <button onClick={onDelete}
            className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM DELETE MODAL
// ═══════════════════════════════════════════════════════════════

function ConfirmDeleteModal({
  count, isBulk, deleting, onCancel, onConfirm,
}: {
  count: number;
  isBulk: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-5">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
          {isBulk ? `Delete ${count} notifications?` : "Delete notification?"}
        </h3>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          This action cannot be undone. {isBulk ? "These notifications" : "This notification"} will be permanently removed.
        </p>

        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} disabled={deleting}
            className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-60">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-1.5">
            {deleting && <Loader2 size={13} className="animate-spin" />}
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );
}