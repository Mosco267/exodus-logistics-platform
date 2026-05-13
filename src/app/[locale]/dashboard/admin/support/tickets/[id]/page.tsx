// src/app/[locale]/dashboard/admin/support/tickets/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Paperclip, X, AlertCircle, Loader2,
  FileText, Image as ImageIcon, Calendar, Truck, ChevronDown, User, Lock,
} from "lucide-react";
import { getPusherClient, userChatChannel } from "@/lib/pusher-client";
import {
  categoryLabel, categoryEmoji, statusLabel, statusColor,
  fmtChatTime, fmtFileSize,
  MAX_FILE_SIZE_BYTES, MAX_FILES_PER_MESSAGE,
  type TicketStatus,
} from "@/lib/support-utils";

type Attachment = { url: string; filename: string; size: number; type: string };

type Message = {
  _id: string;
  ticketId: string;
  authorType: "user" | "admin" | "system";
  authorEmail: string;
  authorName: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
  readByUser: boolean;
  readByAdmin: boolean;
};

type Ticket = {
  _id: string;
  ticketNumber: string;
  userEmail: string;
  userId: string;
  userName: string;
  category: string;
  subject: string;
  status: TicketStatus;
  shipmentRef: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
};

const ALL_STATUSES: TicketStatus[] = ["open", "awaiting_customer", "in_progress", "resolved", "closed"];

export default function AdminTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const id = String(params?.id || "");

  const accentSolid = "#1d4ed8";
  const accentGradient = "linear-gradient(135deg, #1d4ed8 0%, #0e7490 100%)";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [composerErr, setComposerErr] = useState("");

  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`/api/support/tickets/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to load ticket."); return; }
      setTicket(json.ticket);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load ticket.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (id) void load(); }, [id]);

  // Pusher live updates when user replies
  useEffect(() => {
    if (!ticket?.userId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const ch = pusher.subscribe(userChatChannel(ticket.userId));
    const onReply = (data: any) => { if (data?.ticketId === id) void load(); };
    ch.bind("ticket:reply", onReply);
    return () => {
      ch.unbind("ticket:reply", onReply);
      pusher.unsubscribe(userChatChannel(ticket.userId));
    };
  }, [ticket?.userId, id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setComposerErr("");
    const available = MAX_FILES_PER_MESSAGE - attachments.length;
    if (available <= 0) { setComposerErr(`Max ${MAX_FILES_PER_MESSAGE} attachments.`); return; }
    const toUpload = Array.from(files).slice(0, available);
    setUploading(true);
    try {
      for (const f of toUpload) {
        if (f.size > MAX_FILE_SIZE_BYTES) { setComposerErr(`"${f.name}" is too large (max 10 MB).`); continue; }
        const form = new FormData();
        form.append("file", f);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok || !json?.url) { setComposerErr(json?.error || "Upload failed."); continue; }
        setAttachments(prev => [...prev, { url: json.url, filename: f.name, size: f.size, type: f.type }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (i: number) => setAttachments(prev => prev.filter((_, x) => x !== i));

  const handleSend = async () => {
    const body = draft.trim();
    if (!body && attachments.length === 0) return;
    if (sending) return;
    setSending(true); setComposerErr("");
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, attachments }),
      });
      const json = await res.json();
      if (!res.ok) { setComposerErr(json?.error || "Failed to send."); return; }
      setDraft(""); setAttachments([]);
      await load();
    } catch (e: any) {
      setComposerErr(e?.message || "Failed to send.");
    } finally { setSending(false); }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket || ticket.status === newStatus) { setStatusOpen(false); return; }
    setStatusOpen(false);
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setTicket(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch {}
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentSolid }} />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading ticket…</p>
        </div>
      </div>
    );
  }

  if (err || !ticket) {
    return (
      <div className="max-w-4xl mx-auto pb-12 space-y-4">
        <button onClick={() => router.push(`/${locale}/dashboard/admin/support?tab=tickets`)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </button>
        <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5 flex items-center gap-3 text-red-700 dark:text-red-400 font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" /> {err || "Ticket not found."}
        </div>
      </div>
    );
  }

  const sc = statusColor(ticket.status);
  const isClosed = ticket.status === "closed";

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-4">

      {/* Top nav */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => router.push(`/${locale}/dashboard/admin/support?tab=tickets`)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </button>
        {ticket.shipmentRef && (
          <Link href={`/${locale}/dashboard/admin/shipments`}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
            <Truck className="w-4 h-4" /> View Shipment
          </Link>
        )}
      </div>

      {/* Ticket header */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="h-1.5" style={{ background: accentGradient }} />
        <div className="p-5 sm:p-6">

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl" style={{ background: `${accentSolid}15` }}>
                {categoryEmoji(ticket.category)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{categoryLabel(ticket.category)}</p>
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-tight">{ticket.subject}</h1>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">{ticket.ticketNumber}</p>
              </div>
            </div>

            {/* Status changer dropdown */}
            <div className="shrink-0 relative" ref={statusRef}>
              <button onClick={() => setStatusOpen(v => !v)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${sc.bg} ${sc.text} ${sc.border} hover:opacity-90`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {statusLabel(ticket.status)}
                <ChevronDown size={11} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
              </button>

              {statusOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-30">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10">
                    Change status
                  </p>
                  {ALL_STATUSES.map(s => {
                    const c = statusColor(s);
                    const isCurrent = ticket.status === s;
                    return (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                          isCurrent ? "bg-gray-50 dark:bg-white/5" : "hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        <span className={isCurrent ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-200"}>
                          {statusLabel(s)} {isCurrent && "(current)"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* User info row */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                <User size={10} /> Customer
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.userName}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 break-all">{ticket.userEmail}</p>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
                <Calendar size={10} /> Opened
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtChatTime(ticket.createdAt)}</p>
              {ticket.shipmentRef && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                  <Truck size={10} /> {ticket.shipmentRef}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 max-h-[60vh] bg-gray-50/50 dark:bg-white/[0.02]">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No messages yet.</p>
          ) : (
            messages.map(m => {
              const mine = m.authorType === "admin";
              return (
                <div key={m._id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ${mine ? "" : "bg-gray-300 dark:bg-white/10 text-gray-700 dark:text-gray-300"}`}
                    style={mine ? { background: accentGradient } : undefined}>
                    {(m.authorName?.[0] || "?").toUpperCase()}
                  </div>
                  <div className={`max-w-[85%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {mine ? "You" : m.authorName}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmtChatTime(m.createdAt)}</p>
                    </div>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine
                        ? "text-white"
                        : "bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-white/10"
                      }`}
                      style={mine ? { background: accentGradient } : undefined}>
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}

                      {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                        <div className={`${m.body ? "mt-2" : ""} space-y-1.5`}>
                          {m.attachments.map((a, i) => {
                            const isImg = a.type?.startsWith("image/");
                            if (isImg) {
                              return (
                                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                  className="block rounded-lg overflow-hidden border border-white/20">
                                  <img src={a.url} alt={a.filename} className="max-w-full max-h-72 object-cover" />
                                </a>
                              );
                            }
                            return (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${mine ? "bg-white/10 hover:bg-white/20" : "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"} transition`}>
                                <FileText size={14} className={mine ? "text-white" : "text-gray-500 dark:text-gray-400"} />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs font-semibold truncate ${mine ? "text-white" : "text-gray-900 dark:text-white"}`}>{a.filename}</p>
                                  <p className={`text-[10px] ${mine ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>{fmtFileSize(a.size)}</p>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        {isClosed ? (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <Lock size={12} /> This ticket is closed. Change status to reopen before replying.
          </div>
        ) : (
          <div className="border-t border-gray-100 dark:border-white/10 p-4">
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-xs">
                    {a.type?.startsWith("image/") ? <ImageIcon size={12} /> : <FileText size={12} />}
                    <span className="font-semibold truncate max-w-[120px] text-gray-700 dark:text-gray-200">{a.filename}</span>
                    <button onClick={() => removeAttachment(i)} className="cursor-pointer hover:text-red-500" title="Remove">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {composerErr && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <AlertCircle size={11} /> {composerErr}
              </p>
            )}

            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" multiple
                accept="image/*,application/pdf,.doc,.docx,.txt"
                onChange={e => handleFiles(e.target.files)} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={uploading || attachments.length >= MAX_FILES_PER_MESSAGE}
                className="cursor-pointer w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
                title="Attach">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>

              <textarea value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                }}
                placeholder="Reply to customer…" rows={1}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition resize-none max-h-32"
                style={{ fontSize: "16px" }} />

              <button type="button" onClick={handleSend}
                disabled={sending || (!draft.trim() && attachments.length === 0)}
                className="cursor-pointer h-10 px-4 flex items-center justify-center gap-1.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
                style={{ background: accentGradient }}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}