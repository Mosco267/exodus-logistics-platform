// src/app/[locale]/dashboard/support/tickets/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Plus, ChevronRight, Loader2, AlertCircle, Search,
  ChevronLeft, ChevronRight as ChevronRightIcon, X, Send, ArrowLeft,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";
import {
  SUPPORT_CATEGORIES, categoryEmoji,
  statusLabel, statusColor, fmtRelativeShort, type TicketStatus,
} from "@/lib/support-utils";

type TicketRow = {
  _id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: TicketStatus;
  shipmentRef: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessageBy: string | null;
  lastMessagePreview: string;
  unreadByUser: number;
};

const PAGE_SIZE = 10;

const STATUS_FILTERS: Array<{ id: "all" | TicketStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "awaiting_customer", label: "Awaiting You" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

export default function UserTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [accentGradient, setAccentGradient] = useState("linear-gradient(135deg, #0b3aa4, #0e7490)");
  const [isMidnight, setIsMidnight] = useState(false);

  useEffect(() => {
    const apply = () => {
      try {
        const t = (localStorage.getItem("exodus_theme_cache") as ThemeId | null) || "default";
        const theme = THEMES.find(x => x.id === t) || THEMES[0];
        setAccentSolid(theme.accent || "#0b3aa4");
        setAccentGradient(theme.sidebar || "linear-gradient(135deg, #0b3aa4, #0e7490)");
        setIsMidnight(t === "midnight");
      } catch {}
    };
    apply();
    window.addEventListener("storage", apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener("storage", apply); clearInterval(t); };
  }, []);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [counts, setCounts] = useState({
    all: 0, open: 0, awaiting_customer: 0, in_progress: 0, resolved: 0, closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showNewTicket, setShowNewTicket] = useState(false);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/support/tickets", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to load tickets."); return; }
      setTickets(Array.isArray(json?.tickets) ? json.tickets : []);
      setCounts(json?.counts || counts);
    } catch (e: any) {
      setErr(e?.message || "Failed to load tickets.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    let r = tickets;
    if (filter !== "all") r = r.filter(t => t.status === filter);
    if (search.trim()) {
      const v = search.trim().toLowerCase();
      r = r.filter(t => t.ticketNumber.toLowerCase().includes(v) || t.subject.toLowerCase().includes(v));
    }
    return r;
  }, [tickets, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [filter, search]);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const headerTitleCls = isMidnight ? "text-white" : "text-gray-900 dark:text-white";

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-4">

      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/dashboard/support`)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className={`text-xl font-extrabold ${headerTitleCls}`}>My Tickets</h1>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => setShowNewTicket(true)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 shadow-sm"
          style={{ background: accentGradient }}>
          <Plus size={15} /> New Ticket
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            style={{ fontSize: "16px" }} />
        </div>
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
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gray-100 dark:bg-white/5">
              <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {filter === "all" ? "No tickets yet" : `No ${statusLabel(filter as string).toLowerCase()} tickets`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {search.trim() ? "No results match your search." : filter === "all" ? "Open a ticket and we'll track it for you." : "Try a different filter."}
            </p>
            {filter === "all" && !search.trim() && (
              <button onClick={() => setShowNewTicket(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90 transition"
                style={{ background: accentGradient }}>
                <Plus size={14} /> New Ticket
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {paged.map(t => {
                const c = statusColor(t.status);
                return (
                  <Link
                    key={t._id}
                    href={`/${locale}/dashboard/support/tickets/${t._id}`}
                    className="group block px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: `${accentSolid}15` }}>
                        {categoryEmoji(t.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.subject}</p>
                          {t.unreadByUser > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white rounded-full" style={{ background: accentSolid }}>
                              {t.unreadByUser}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate font-mono">{t.ticketNumber}</p>
                        {t.lastMessagePreview && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                            {t.lastMessageBy === "user" ? "You: " : "Support: "}{t.lastMessagePreview}
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

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} · {filtered.length} tickets
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    Next <ChevronRightIcon size={12} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showNewTicket && (
        <NewTicketModal
          accentSolid={accentSolid}
          accentGradient={accentGradient}
          onClose={() => setShowNewTicket(false)}
          onCreated={(t) => {
            setShowNewTicket(false);
            router.push(`/${locale}/dashboard/support/tickets/${t._id}`);
          }}
        />
      )}
    </div>
  );
}

function NewTicketModal({
  accentSolid, accentGradient, onClose, onCreated,
}: {
  accentSolid: string;
  accentGradient: string;
  onClose: () => void;
  onCreated: (t: any) => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [body, setBody] = useState("");
  const [shipmentRef, setShipmentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setErr("");
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          body: body.trim(),
          shipmentRef: shipmentRef.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to create ticket."); return; }
      onCreated(json.ticket);
    } catch (e: any) {
      setErr(e?.message || "Failed to create ticket.");
    } finally { setSubmitting(false); }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92%] max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 max-h-[90vh] overflow-y-auto">

        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">New Support Ticket</h2>
          <button onClick={onClose}
            className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORT_CATEGORIES.map(c => {
                const isActive = category === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left border-2 flex items-center gap-2 ${
                      isActive ? "text-white border-transparent" : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-gray-300"
                    }`}
                    style={isActive ? { background: accentSolid } : {}}>
                    <span className="text-base">{c.emoji}</span>
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Brief description" required minLength={3} maxLength={120}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition"
              style={{ fontSize: "16px" }} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Shipment / Tracking number (optional)</label>
            <input value={shipmentRef} onChange={e => setShipmentRef(e.target.value.toUpperCase())}
              placeholder="EXS-… or EX…"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition uppercase"
              style={{ fontSize: "16px" }} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Message *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Describe your issue in detail…" required minLength={3} maxLength={5000} rows={6}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition resize-none"
              style={{ fontSize: "16px" }} />
            <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{body.length} / 5000</p>
          </div>

          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-3 flex items-start gap-2.5 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="cursor-pointer flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="cursor-pointer flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: accentGradient }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? "Creating…" : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}