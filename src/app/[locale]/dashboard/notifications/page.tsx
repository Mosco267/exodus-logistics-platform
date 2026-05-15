// src/app/[locale]/dashboard/notifications/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Bell, Search, RefreshCw, Trash2, CheckCheck, X, ArrowLeft,
  MessageCircle, Ticket, CreditCard, Truck, Package, Inbox,
  Loader2, Sparkles, AlertCircle, MoreVertical,
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

const PAGE_SIZE = 20;
const LONG_PRESS_MS = 500;

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

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Confirm + toast + details modal
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

  // ─── Load ──────────────────────────────────────────────────
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

  // Auto-open from ?open= query (when arriving from bell click)
  useEffect(() => {
    if (!openId) { setOpenDetails(null); return; }
    const found = items.find(x => String(x._id) === openId);
    if (found) setOpenDetails(found);
  }, [openId, items]);

  // ─── Filter + search ───────────────────────────────────────
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

  // Reset visibleCount when filter/search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, search]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = filtered.length > visible.length;

  // ─── Counts for filter pills ──────────────────────────────
  const counts = useMemo(() => ({
    all: items.length,
    unread: items.filter(n => !n.read).length,
    read: items.filter(n => Boolean(n.read)).length,
  }), [items]);

  // ─── Resolve where a notification should route to ─────────
  const resolveLink = (n: Notif): string => {
    if (n.link && typeof n.link === "string" && n.link.trim()) {
      return `/${locale}${n.link.startsWith("/") ? n.link : `/${n.link}`}`;
    }
    if (n.ticketId) return `/${locale}/dashboard/support/tickets/${n.ticketId}`;
    if (n.shipmentId) return `/${locale}/dashboard/status/${encodeURIComponent(n.shipmentId)}`;
    return "";
  };

  // ─── Open notification ────────────────────────────────────
  const openNotif = async (n: Notif) => {
    // If we're in selection mode, clicking a row toggles selection
    if (selected.size > 0) {
      toggleSelect(n._id);
      return;
    }

    // Mark read optimistically
    setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n._id }),
    }).catch(() => {});

    const dest = resolveLink(n);
    if (dest) {
      router.push(dest);
      return;
    }
    // No destination — open the details modal
    setOpenDetails(n);
    router.replace(`/${locale}/dashboard/notifications?open=${encodeURIComponent(n._id)}`);
  };

  const closeDetails = () => {
    setOpenDetails(null);
    router.replace(`/${locale}/dashboard/notifications`);
  };

  // ─── Selection ────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAllVisible = () => {
    const next = new Set(selected);
    visible.forEach(n => next.add(n._id));
    setSelected(next);
  };

  // ─── Long-press support (mobile) ──────────────────────────
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

  // ─── Bulk actions ─────────────────────────────────────────
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
      // Optimistic
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
        // If we were viewing one of the deleted, close the modal
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

  // ─── Markup ───────────────────────────────────────────────
  const inSelectionMode = selected.size > 0;
  const allVisibleSelected = visible.length > 0 && visible.every(n => selected.has(n._id));

  return (
    <div className="max-w-3xl mx-auto pb-12">

      {/* ── Header ──────────────────────────────────────── */}
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

      {/* ── Filter pills + search ───────────────────────── */}
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

      {/* ── Selection action bar (sticky) ───────────────── */}
      {inSelectionMode && (
        <div className="sticky top-14 z-20 mb-3 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 backdrop-blur-md shadow-sm p-3 flex items-center justify-between gap-2 flex-wrap">
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
      )}

      {/* ── Notifications list ──────────────────────────── */}
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
                const isAdminMsg = Boolean(n.isCustomAdminMessage);

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
                          : isAdminMsg
                            ? "bg-gradient-to-r from-violet-50/60 to-blue-50/40 dark:from-violet-500/[0.06] dark:to-blue-500/[0.04] hover:from-violet-50 hover:to-blue-50 dark:hover:from-violet-500/10 dark:hover:to-blue-500/[0.08]"
                            : isUnread
                              ? "bg-blue-50/40 dark:bg-blue-500/[0.04] hover:bg-blue-50 dark:hover:bg-blue-500/[0.08]"
                              : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      }`}>

                      {/* Admin message left bar */}
                      {isAdminMsg && !isSelected && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 via-blue-600 to-cyan-500" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Checkbox (selection) */}
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

                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${
                          isAdminMsg
                            ? "bg-gradient-to-br from-violet-500 via-blue-600 to-cyan-500 shadow-sm"
                            : bg
                        }`}>
                          {isAdminMsg
                            ? <Sparkles size={18} className="text-white" />
                            : <Icon size={18} className={fg} />
                          }
                          {isAdminMsg && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-900 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            </span>
                          )}
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {isAdminMsg && (
                                <p className="text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400 bg-clip-text text-transparent mb-0.5">
                                  Message from Exodus Logistics
                                </p>
                              )}
                              <p className={`text-sm leading-tight ${
                                isUnread ? "font-extrabold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"
                              }`}>
                                {n.title || "Notification"}
                              </p>
                            </div>
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
                            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${
                              isAdminMsg ? "text-violet-600 dark:text-violet-400" : fg
                            }`}>
                              {isAdminMsg ? "Custom" : label}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600 text-[10px]">•</span>
                            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Delete button (per-row, desktop only) */}
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

            {/* Load more */}
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

      {/* ── Details modal ───────────────────────────────── */}
      {openDetails && (
        <DetailsModal
          notif={openDetails}
          onClose={closeDetails}
          onDelete={() => askDeleteSingle(openDetails._id)} />
      )}

      {/* ── Confirm delete modal ────────────────────────── */}
      {confirmDelete && (
        <ConfirmDeleteModal
          count={confirmDelete.ids.length}
          isBulk={confirmDelete.isBulk}
          deleting={deleting}
          onCancel={() => !deleting && setConfirmDelete(null)}
          onConfirm={bulkDelete} />
      )}

      {/* ── Toast ───────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`px-4 py-2.5 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
              : "bg-red-600 text-white"
          }`}>
            {toast.type === "success" ? <CheckCheck size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAILS MODAL
// ═══════════════════════════════════════════════════════════════

function DetailsModal({
  notif, onClose, onDelete,
}: {
  notif: Notif;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { Icon, bg, fg, label } = classifyNotif(notif);
  const isAdminMsg = Boolean(notif.isCustomAdminMessage);

  return (
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-gray-100 dark:border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
        </div>

        {/* Admin gradient bar */}
        {isAdminMsg && (
          <div className="h-1.5 bg-gradient-to-r from-violet-500 via-blue-600 to-cyan-500" />
        )}

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAdminMsg ? "bg-gradient-to-br from-violet-500 via-blue-600 to-cyan-500" : bg
            }`}>
              {isAdminMsg
                ? <Sparkles size={18} className="text-white" />
                : <Icon size={18} className={fg} />
              }
            </div>
            <div className="min-w-0">
              {isAdminMsg && (
                <p className="text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-violet-600 to-blue-600 dark:from-violet-400 dark:to-blue-400 bg-clip-text text-transparent mb-0.5">
                  Message from Exodus Logistics
                </p>
              )}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
          {notif.message || ""}
        </div>

        {/* Footer */}
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