// src/app/[locale]/dashboard/support/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Paperclip, X, AlertCircle, Loader2,
  FileText, Image as ImageIcon, Calendar, Tag, Truck, Lock,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";
import { getPusherClient, userChatChannel } from "@/lib/pusher-client";
import {
  categoryLabel, categoryEmoji, statusLabel, statusColor,
  fmtChatTime, fmtFileSize,
  MAX_FILE_SIZE_BYTES, MAX_FILES_PER_MESSAGE,
  type TicketStatus,
} from "@/lib/support-utils";

type Attachment = {
  url: string; filename: string; size: number; type: string;
};

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

export default function UserTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const id = String(params?.id || "");

  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [accentGradient, setAccentGradient] = useState("linear-gradient(135deg, #0b3aa4, #0e7490)");

  useEffect(() => {
    const apply = () => {
      try {
        const t = (localStorage.getItem("exodus_theme_cache") as ThemeId | null) || "default";
        const theme = THEMES.find(x => x.id === t) || THEMES[0];
        setAccentSolid(theme.accent || "#0b3aa4");
        setAccentGradient(theme.sidebar || "linear-gradient(135deg, #0b3aa4, #0e7490)");
      } catch {}
    };
    apply();
    window.addEventListener("storage", apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener("storage", apply); clearInterval(t); };
  }, []);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [composerErr, setComposerErr] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Load ──────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/support/tickets/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to load ticket."); return; }
      setTicket(json.ticket);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) void load(); }, [id]);

  // ─── Pusher: react to admin reply or status change ────────
  useEffect(() => {
    if (!ticket?.userId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const ch = pusher.subscribe(userChatChannel(ticket.userId));

    const onReply = (data: any) => {
      if (data?.ticketId === id) {
        // Reload — easier than reconciling on the client
        void load();
      }
    };

    const onStatus = (data: any) => {
      if (data?.ticketId === id) {
        setTicket(prev => prev ? { ...prev, status: data.status } : prev);
      }
    };

    ch.bind("ticket:reply", onReply);
    ch.bind("ticket:status", onStatus);

    return () => {
      ch.unbind("ticket:reply", onReply);
      ch.unbind("ticket:status", onStatus);
      pusher.unsubscribe(userChatChannel(ticket.userId));
    };
  }, [ticket?.userId, id]);

  // ─── Auto-scroll ────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ─── Upload helper ──────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setComposerErr("");
    const available = MAX_FILES_PER_MESSAGE - attachments.length;
    if (available <= 0) {
      setComposerErr(`Maximum ${MAX_FILES_PER_MESSAGE} attachments per message.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, available);
    setUploading(true);
    try {
      for (const f of toUpload) {
        if (f.size > MAX_FILE_SIZE_BYTES) {
          setComposerErr(`"${f.name}" is too large (max 10 MB).`);
          continue;
        }
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

  // ─── Send reply ──────────────────────────────────────────
  const handleSend = async () => {
    const body = draft.trim();
    if (!body && attachments.length === 0) return;
    if (sending) return;

    setSending(true);
    setComposerErr("");

    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, attachments }),
      });
      const json = await res.json();
      if (!res.ok) { setComposerErr(json?.error || "Failed to send."); return; }

      setDraft("");
      setAttachments([]);
      await load();
    } catch (e: any) {
      setComposerErr(e?.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────
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
        <button onClick={() => router.push(`/${locale}/dashboard/support?tab=tickets`)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
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
        <button onClick={() => router.push(`/${locale}/dashboard/support?tab=tickets`)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </button>
        {ticket.shipmentRef && (
          <Link href={`/${locale}/dashboard/track/${encodeURIComponent(ticket.shipmentRef)}`}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
            <Truck className="w-4 h-4" /> Track Shipment
          </Link>
        )}
      </div>

      {/* Ticket header card */}
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

            <div className="shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {statusLabel(ticket.status)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Opened {fmtChatTime(ticket.createdAt)}
            </span>
            {ticket.shipmentRef && (
              <span className="flex items-center gap-1">
                <Truck size={11} /> {ticket.shipmentRef}
              </span>
            )}
          </div>

          {ticket.status === "resolved" && (
            <div className="mt-4 rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-3 text-xs text-green-700 dark:text-green-400">
              This ticket is marked as resolved. If your issue isn't fully resolved, just reply below and it will be reopened automatically.
            </div>
          )}

          {isClosed && (
            <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 p-3 text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Lock size={12} /> This ticket is closed. To continue this conversation, please open a new ticket.
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 max-h-[60vh] bg-gray-50/50 dark:bg-white/[0.02]">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No messages yet.</p>
          ) : (
            messages.map(m => {
              const mine = m.authorType === "user";
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
            <Lock size={12} /> This ticket is closed. Open a new ticket to continue.
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt"
                onChange={e => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || attachments.length >= MAX_FILES_PER_MESSAGE}
                className="cursor-pointer w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
                title="Attach">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>

              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={ticket.status === "resolved" ? "Reply to reopen this ticket…" : "Type your reply…"}
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition resize-none max-h-32"
                style={{ fontSize: "16px" }}
              />

              <button
                type="button"
                onClick={handleSend}
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