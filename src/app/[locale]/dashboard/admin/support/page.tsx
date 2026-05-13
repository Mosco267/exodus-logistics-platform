// src/app/[locale]/dashboard/admin/support/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle, Ticket, Search, Loader2, AlertCircle, ChevronRight,
  Wifi, WifiOff, ChevronLeft, RefreshCw, Mail, Users,
} from "lucide-react";
import { getPusherClient, adminEventsChannel, adminPresenceChannel } from "@/lib/pusher-client";
import LiveChatWidget from "@/components/support/LiveChatWidget";
import {
  statusLabel, statusColor, categoryEmoji, fmtRelativeShort, type TicketStatus,
} from "@/lib/support-utils";

type ChatSession = {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  unreadByAdmin: number;
  lastMessageAt: string;
  lastMessageBy: "user" | "admin";
  lastMessagePreview: string;
};

type TicketRow = {
  _id: string;
  ticketNumber: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: string;
  status: TicketStatus;
  shipmentRef: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessageBy: string | null;
  lastMessagePreview: string;
  unreadByAdmin: number;
};

const STATUS_FILTERS: Array<{ id: "all" | TicketStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "awaiting_customer", label: "Awaiting Customer" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

export default function AdminSupportPage() {
  const params = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  // Admin colors are blue per AdminShell — keeping consistent
  const accentSolid = "#1d4ed8";
  const accentGradient = "linear-gradient(135deg, #1d4ed8 0%, #0e7490 100%)";

  // ─── Initial tab from URL ──────────────────────────────────
  const urlTab = sp.get("tab");
  const urlUserId = sp.get("userId");
  const urlTicketId = sp.get("ticketId");

  const [tab, setTab] = useState<"chats" | "tickets">(urlTab === "tickets" ? "tickets" : "chats");

  // ─── Subscribe to presence-admin so we appear "online" ─────
  // Plus admin events channel for real-time notifications
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const presence = pusher.subscribe(adminPresenceChannel());
    const events = pusher.subscribe(adminEventsChannel());

    return () => {
      pusher.unsubscribe(adminPresenceChannel());
      pusher.unsubscribe(adminEventsChannel());
    };
  }, []);

  // ─── Away toggle ───────────────────────────────────────────
  const [away, setAway] = useState(false);
  const [awayLoading, setAwayLoading] = useState(false);

  const toggleAway = async () => {
    setAwayLoading(true);
    try {
      const res = await fetch("/api/support/presence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ away: !away }),
      });
      if (res.ok) setAway(!away);
    } finally { setAwayLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto pb-8 space-y-5">

      {/* Header with away toggle */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Support</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Handle live chats and ticket inbox.
          </p>
        </div>

        <button onClick={toggleAway} disabled={awayLoading}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-bold transition disabled:opacity-60"
          style={{
            borderColor: away ? "#f59e0b" : "#22c55e",
            background: away ? "#fef3c7" : "#dcfce7",
            color: away ? "#b45309" : "#15803d",
          }}>
          {awayLoading ? <Loader2 size={14} className="animate-spin" />
            : away ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span>{away ? "Away" : "Online"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-white/5 p-1 max-w-md">
        <button
          onClick={() => setTab("chats")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-bold transition cursor-pointer ${
            tab === "chats" ? "text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
          style={tab === "chats" ? { background: accentGradient } : {}}>
          <MessageCircle size={14} /> Live Chats
        </button>
        <button
          onClick={() => setTab("tickets")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-bold transition cursor-pointer ${
            tab === "tickets" ? "text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          }`}
          style={tab === "tickets" ? { background: accentGradient } : {}}>
          <Ticket size={14} /> Ticket Inbox
        </button>
      </div>

      {tab === "chats" ? (
        <ChatsTab accentSolid={accentSolid} accentGradient={accentGradient} initialUserId={urlUserId || null} />
      ) : (
        <TicketsTab accentSolid={accentSolid} accentGradient={accentGradient} locale={locale} initialTicketId={urlTicketId || null} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHATS TAB
// ═══════════════════════════════════════════════════════════════

function ChatsTab({
  accentSolid, accentGradient, initialUserId,
}: {
  accentSolid: string; accentGradient: string; initialUserId: string | null;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
  const [showListOnMobile, setShowListOnMobile] = useState(!initialUserId);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const url = new URL("/api/support/chat/sessions", window.location.origin);
      if (search.trim()) url.searchParams.set("q", search.trim());
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to load chats."); return; }
      setSessions(Array.isArray(json?.sessions) ? json.sessions : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load chats.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 300); return () => clearTimeout(t); }, [search]);

  // ─── Pusher: refresh list on new messages ──────────────────
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const ch = pusher.subscribe(adminEventsChannel());

    const onChatMessage = () => { void load(); };
    ch.bind("chat:message", onChatMessage);

    return () => {
      ch.unbind("chat:message", onChatMessage);
    };
  }, []);

  const selectedSession = useMemo(
    () => sessions.find(s => s.userId === selectedUserId) || null,
    [sessions, selectedUserId]
  );

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-[calc(100vh-260px)] min-h-[500px]">
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full">

        {/* ── Left: chat list ──────────────────────────────── */}
        <div className={`border-r border-gray-100 dark:border-white/10 flex flex-col ${showListOnMobile ? "" : "hidden md:flex"}`}>
          <div className="p-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                style={{ fontSize: "16px" }} />
            </div>
            <button onClick={load} className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentSolid }} />
                <p className="text-xs text-gray-500">Loading…</p>
              </div>
            ) : err ? (
              <p className="p-4 text-xs text-red-500">{err}</p>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No chats yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {sessions.map(s => {
                  const isSelected = s.userId === selectedUserId;
                  return (
                    <button key={s.userId}
                      onClick={() => { setSelectedUserId(s.userId); setShowListOnMobile(false); }}
                      className={`w-full text-left p-3 transition cursor-pointer ${
                        isSelected ? "" : "hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                      style={isSelected ? { background: `${accentSolid}10` } : {}}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: accentGradient }}>
                          {(s.userName?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.userName}</p>
                            <span className="text-[10px] text-gray-400 shrink-0">{fmtRelativeShort(s.lastMessageAt)}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{s.userEmail}</p>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                              {s.lastMessageBy === "admin" ? "You: " : ""}{s.lastMessagePreview}
                            </p>
                            {s.unreadByAdmin > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full shrink-0"
                                style={{ background: accentSolid }}>
                                {s.unreadByAdmin}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: chat view ──────────────────────────────── */}
        <div className={`flex flex-col ${!showListOnMobile ? "" : "hidden md:flex"}`}>
          {selectedSession ? (
            <>
              {/* Mobile back button */}
              <button onClick={() => setShowListOnMobile(true)}
                className="md:hidden cursor-pointer m-3 mb-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition self-start">
                <ChevronLeft size={12} /> All chats
              </button>
              <div className="flex-1 p-3 md:p-4 overflow-hidden">
                <LiveChatWidget
                  userId={selectedSession.userId}
                  viewer="admin"
                  otherPartyLabel={selectedSession.userName || selectedSession.userEmail}
                  accentSolid={accentSolid}
                  accentGradient={accentGradient}
                  canDelete={true}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select a chat</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose a user from the list to view their conversation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TICKETS TAB
// ═══════════════════════════════════════════════════════════════

function TicketsTab({
  accentSolid, accentGradient, locale, initialTicketId,
}: {
  accentSolid: string; accentGradient: string; locale: string; initialTicketId: string | null;
}) {
  const router = useRouter();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [counts, setCounts] = useState({
    all: 0, open: 0, awaiting_customer: 0, in_progress: 0, resolved: 0, closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const url = new URL("/api/support/tickets", window.location.origin);
      if (search.trim()) url.searchParams.set("q", search.trim());
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to load tickets."); return; }
      setTickets(Array.isArray(json?.tickets) ? json.tickets : []);
      setCounts(json?.counts || counts);
    } catch (e: any) {
      setErr(e?.message || "Failed to load tickets.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 300); return () => clearTimeout(t); }, [search]);

  // Pusher: refresh on new ticket events
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const ch = pusher.subscribe(adminEventsChannel());
    const onTicketEvent = () => { void load(); };
    ch.bind("ticket:new", onTicketEvent);
    ch.bind("ticket:reply", onTicketEvent);
    return () => {
      ch.unbind("ticket:new", onTicketEvent);
      ch.unbind("ticket:reply", onTicketEvent);
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return tickets;
    return tickets.filter(t => t.status === filter);
  }, [tickets, filter]);

  return (
    <div className="space-y-4">

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ticket number, subject, user…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            style={{ fontSize: "16px" }} />
        </div>
        <button onClick={load} className="cursor-pointer p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => {
          const isActive = filter === f.id;
          const count = (counts as any)[f.id] ?? 0;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                isActive ? "text-white" : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
              style={isActive ? { background: accentSolid } : {}}>
              {f.label}
              <span className="ml-1.5 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentSolid }} />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading tickets…</p>
          </div>
        ) : err ? (
          <div className="p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4 flex items-start gap-2.5 text-red-700 dark:text-red-400 text-sm font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {err}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {filter === "all" ? "No tickets in inbox" : `No ${statusLabel(filter as string).toLowerCase()} tickets`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {filtered.map(t => {
              const c = statusColor(t.status);
              return (
                <Link key={t._id} href={`/${locale}/dashboard/admin/support/tickets/${t._id}`}
                  className="group block px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: `${accentSolid}15` }}>
                      {categoryEmoji(t.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
                        {t.unreadByAdmin > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white rounded-full"
                            style={{ background: accentSolid }}>
                            {t.unreadByAdmin}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                        <span className="font-mono">{t.ticketNumber}</span> · {t.userName} ({t.userEmail})
                      </p>
                      {t.lastMessagePreview && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {t.lastMessageBy === "admin" ? "You: " : `${t.userName.split(" ")[0]}: `}{t.lastMessagePreview}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        {statusLabel(t.status)}
                      </span>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmtRelativeShort(t.lastMessageAt || t.updatedAt)}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}