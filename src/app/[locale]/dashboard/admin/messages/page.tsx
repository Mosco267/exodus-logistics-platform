// src/app/[locale]/dashboard/admin/messages/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Search, RefreshCw, Trash2, CheckCheck, X, Loader2, Inbox,
    AlertCircle, Building2, Phone, Reply, Globe, MessageSquare, Copy, Check,
} from "lucide-react";

type Status = "new" | "read" | "replied";

type Message = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  locale?: string;
  status: Status;
  createdAt: string;
  readAt?: string | null;
  repliedAt?: string | null;
};

const SUBJECT_LABELS: Record<string, string> = {
  general: "General enquiry",
  support: "Technical support",
  billing: "Billing question",
  quote: "Quote request",
  complaint: "Complaint",
  partnership: "Partnership",
};

const SUBJECT_STYLES: Record<string, string> = {
  general: "bg-gray-100 text-gray-700 border-gray-200",
  support: "bg-blue-100 text-blue-700 border-blue-200",
  billing: "bg-emerald-100 text-emerald-700 border-emerald-200",
  quote: "bg-violet-100 text-violet-700 border-violet-200",
  complaint: "bg-red-100 text-red-700 border-red-200",
  partnership: "bg-amber-100 text-amber-700 border-amber-200",
};

const BCP: Record<string, string> = {
  en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", zh: "zh-CN", it: "it-IT",
  ar: "ar-SA", pt: "pt-PT", ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", hi: "hi-IN",
};

function fmtWhen(iso: string | undefined, bcp: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString(bcp, { month: "short", day: "numeric", year: "numeric" });
}

function fmtFull(iso: string | undefined, bcp: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(bcp, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminContactMessagesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const bcp = BCP[locale] || "en-US";

  const [messages, setMessages] = useState<Message[]>([]);
  const [counts, setCounts] = useState({ all: 0, new: 0, read: 0, replied: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Message | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  };

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const url = new URL("/api/admin/contact-messages", window.location.origin);
      if (filter !== "all") url.searchParams.set("status", filter);
      if (subjectFilter) url.searchParams.set("subject", subjectFilter);
      if (search.trim()) url.searchParams.set("q", search.trim());

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setMessages(Array.isArray(json.messages) ? json.messages : []);
        setCounts(json.counts || { all: 0, new: 0, read: 0, replied: 0 });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, [filter, subjectFilter]);

  /* Search is debounced so typing does not fire a request per keystroke. */
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(true); }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const setStatus = async (ids: string[], status: Status, quiet = false) => {
    if (ids.length === 0) return;
    try {
      await fetch("/api/admin/contact-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      setMessages(prev => prev.map(m => ids.includes(m._id) ? { ...m, status } : m));
      setCounts(prev => ({ ...prev })); // refreshed on next load
      if (!quiet) showToast(status === "replied" ? "Marked as replied" : "Marked as read");
      void load(true);
    } catch {}
  };

  const openMessage = (m: Message) => {
    setOpen(m);
    /* Opening a message counts as reading it, so the unread badge reflects
       what has actually been looked at. */
    if (m.status === "new") void setStatus([m._id], "read", true);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/contact-messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmDelete }),
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => !confirmDelete.includes(m._id)));
        setSelected(new Set());
        if (open && confirmDelete.includes(open._id)) setOpen(null);
        showToast(confirmDelete.length === 1 ? "Message deleted" : `${confirmDelete.length} messages deleted`);
        void load(true);
      }
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

   /* mailto: hands off to whatever the OS registered as the mail handler,
     which is often not the one you actually use. Copying the address lets
     you paste it straight into Titan. */
  const [copied, setCopied] = useState(false);

  const copyEmail = async (email: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const replyHref = (m: Message) => {
    const subject = encodeURIComponent(`Re: ${SUBJECT_LABELS[m.subject] || m.subject}`);
    return `mailto:${m.email}?subject=${subject}`;
  };

  const inSelection = selected.size > 0;

  const subjectOptions = useMemo(() => Object.entries(SUBJECT_LABELS), []);

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> Contact messages
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {counts.new > 0
              ? `${counts.new} unread of ${counts.all} total`
              : `${counts.all} message${counts.all === 1 ? "" : "s"}`}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-white/5 p-1">
          {([
            { id: "all" as const, label: "All", count: counts.all },
            { id: "new" as const, label: "Unread", count: counts.new },
            { id: "read" as const, label: "Read", count: counts.read },
            { id: "replied" as const, label: "Replied", count: counts.replied },
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

        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
          className="cursor-pointer rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none">
          <option value="">All subjects</option>
          {subjectOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email or message"
            style={{ fontSize: "16px" }}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
        </div>
      </div>

      {/* Selection bar */}
      {inSelection && (
        <div className="sticky top-2 z-30 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/95 dark:bg-blue-500/15 backdrop-blur-md shadow-lg p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())}
              className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/60 dark:hover:bg-white/10 transition text-blue-700 dark:text-blue-300">
              <X size={14} />
            </button>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{selected.size} selected</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { void setStatus(Array.from(selected), "read"); setSelected(new Set()); }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-500/30 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 transition">
              <CheckCheck size={12} /> Mark read
            </button>
            <button onClick={() => setConfirmDelete(Array.from(selected))}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Inbox className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {search.trim() || subjectFilter || filter !== "all" ? "No messages match those filters" : "No messages yet"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Messages sent through the contact page appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/10">
            {messages.map(m => {
              const isUnread = m.status === "new";
              const isSelected = selected.has(m._id);
              return (
                <li key={m._id}>
                  <div className={`flex items-start gap-3 px-4 py-4 transition ${
                    isSelected ? "bg-blue-50 dark:bg-blue-500/15"
                    : isUnread ? "bg-blue-50/40 dark:bg-blue-500/[0.04]"
                    : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  }`}>
                    <div
                      onClick={() => toggle(m._id)}
                      className={`shrink-0 mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition ${
                        isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-white/20 hover:border-blue-400 bg-white dark:bg-gray-900"
                      }`}
                      role="checkbox" aria-checked={isSelected}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2.5 6L5 8.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    <button onClick={() => openMessage(m)} className="flex-1 min-w-0 text-left cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <p className={`text-sm truncate ${isUnread ? "font-extrabold text-gray-900 dark:text-white" : "font-semibold text-gray-700 dark:text-gray-300"}`}>
                            {m.name}
                          </p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${SUBJECT_STYLES[m.subject] || SUBJECT_STYLES.general}`}>
                            {SUBJECT_LABELS[m.subject] || m.subject}
                          </span>
                          {m.status === "replied" && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-50 border-emerald-200 text-emerald-700">
                              <Reply size={9} /> Replied
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />}
                          <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">{fmtWhen(m.createdAt, bcp)}</span>
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{m.email}</p>
                      <p className={`mt-1 text-xs leading-relaxed line-clamp-2 ${isUnread ? "text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}`}>
                        {m.message}
                      </p>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22 }}
              className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 max-h-[85vh] overflow-hidden flex flex-col">

              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{open.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${SUBJECT_STYLES[open.subject] || SUBJECT_STYLES.general}`}>
                      {SUBJECT_LABELS[open.subject] || open.subject}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{fmtFull(open.createdAt, bcp)}</p>
                </div>
                <button onClick={() => setOpen(null)}
                  className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-400 shrink-0">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a href={`mailto:${open.email}`}
                    className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-white/5 transition">
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{open.email}</span>
                  </a>
                  {open.phone && (
                    <a href={`tel:${open.phone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-white/5 transition">
                      <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{open.phone}</span>
                    </a>
                  )}
                  {open.company && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{open.company}</span>
                    </div>
                  )}
                  {open.locale && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5">
                      <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">{open.locale}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Message</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{open.message}</p>
                </div>

                {open.repliedAt && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                    <Reply size={12} /> Marked as replied on {fmtFull(open.repliedAt, bcp)}
                  </p>
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-white/10 flex flex-wrap justify-end gap-2">
                <button onClick={() => setConfirmDelete([open._id])}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                  <Trash2 size={14} /> Delete
                </button>
                {open.status !== "replied" && (
                  <button onClick={() => { void setStatus([open._id], "replied"); setOpen({ ...open, status: "replied" }); }}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <CheckCheck size={14} /> Mark replied
                  </button>
                )}
                                <button onClick={() => copyEmail(open.email)}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy email"}
                </button>
                <a href={replyHref(open)}
                  onClick={() => { void setStatus([open._id], "replied", true); }}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition">
                  <Reply size={14} /> Reply by email
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !busy && setConfirmDelete(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                {confirmDelete.length === 1 ? "Delete this message?" : `Delete ${confirmDelete.length} messages?`}
              </h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                This cannot be undone. The sender will not be notified.
              </p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setConfirmDelete(null)} disabled={busy}
                  className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-60">
                  Cancel
                </button>
                <button onClick={doDelete} disabled={busy}
                  className="cursor-pointer flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {busy && <Loader2 size={13} className="animate-spin" />}
                  {busy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div className="fixed left-0 right-0 bottom-24 sm:bottom-8 z-[9999] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center gap-2">
            <CheckCheck size={14} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}