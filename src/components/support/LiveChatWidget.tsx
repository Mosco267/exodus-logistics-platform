// src/components/support/LiveChatWidget.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Paperclip, X, Image as ImageIcon, FileText,
  Check, CheckCheck, AlertCircle, Loader2, MessageCircle, Trash2,
} from "lucide-react";
import { getPusherClient, userChatChannel } from "@/lib/pusher-client";
import {
  fmtChatTime, fmtFileSize, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_MESSAGE,
} from "@/lib/support-utils";

type Attachment = {
  url: string;
  filename: string;
  size: number;
  type: string;
};

type ChatMessage = {
  _id: string;
  userId: string;
  authorType: "user" | "admin";
  authorEmail: string;
  authorName: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
  readByUser: boolean;
  readByAdmin: boolean;
  deleted?: boolean;
};

type PresenceStatus = {
  online: boolean;
  availableCount: number;
};

interface LiveChatWidgetProps {
  /** The user this chat belongs to */
  userId: string;
  /** Current viewer side */
  viewer: "user" | "admin";
  /** Display name of the other party (e.g. "Exodus Support" for user view, or user's name for admin view) */
  otherPartyLabel: string;
  /** Accent color (from theme) */
  accentSolid: string;
  accentGradient: string;
  /** For admin only — allow message deletion */
  canDelete?: boolean;
}

export default function LiveChatWidget({
  userId,
  viewer,
  otherPartyLabel,
  accentSolid,
  accentGradient,
  canDelete = false,
}: LiveChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [presence, setPresence] = useState<PresenceStatus>({ online: false, availableCount: 0 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Load chat history ─────────────────────────────────────
  const loadMessages = async () => {
    setLoading(true);
    setErr("");
    try {
      const url = new URL("/api/support/chat", window.location.origin);
      if (viewer === "admin") url.searchParams.set("userId", userId);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to load chat."); return; }
      setMessages(Array.isArray(json?.messages) ? json.messages : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load chat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void loadMessages();
    if (viewer === "user") void loadPresence();
  }, [userId, viewer]);

  // ─── Presence (user view only) ─────────────────────────────
  const loadPresence = async () => {
    try {
      const res = await fetch("/api/support/presence", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setPresence({ online: Boolean(json?.online), availableCount: Number(json?.availableCount || 0) });
    } catch {}
  };

  // Refresh presence every 30s
  useEffect(() => {
    if (viewer !== "user") return;
    const id = setInterval(loadPresence, 30000);
    return () => clearInterval(id);
  }, [viewer]);

  // ─── Pusher subscription ──────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = userChatChannel(userId);
    const channel = pusher.subscribe(channelName);

    const onMessage = (msg: ChatMessage) => {
      // Don't re-add a message we just sent (we already added it optimistically)
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // If the new message is from the OTHER side, clear their typing indicator
      const otherSide = viewer === "user" ? "admin" : "user";
      if (msg.authorType === otherSide) {
        setOtherIsTyping(false);
        if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);

        // Auto-mark as read since we're viewing the chat
        void fetch(viewer === "admin"
          ? `/api/support/chat?userId=${encodeURIComponent(userId)}`
          : "/api/support/chat",
          { cache: "no-store" }
        );
      }
    };

    const onTyping = (data: { by: "user" | "admin"; typing: boolean }) => {
      const otherSide = viewer === "user" ? "admin" : "user";
      if (data.by === otherSide) {
        setOtherIsTyping(Boolean(data.typing));
        if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
        if (data.typing) {
          // Auto-clear typing indicator after 4s
          otherTypingTimeoutRef.current = setTimeout(() => setOtherIsTyping(false), 4000);
        }
      }
    };

    const onRead = (data: { by: "user" | "admin" }) => {
      const otherSide = viewer === "user" ? "admin" : "user";
      if (data.by === otherSide) {
        // The other side read our messages — mark them all as read locally
        setMessages(prev => prev.map(m =>
          m.authorType === viewer
            ? { ...m, [viewer === "user" ? "readByAdmin" : "readByUser"]: true } as ChatMessage
            : m
        ));
      }
    };

    const onDelete = (data: { messageId: string }) => {
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, deleted: true } : m));
    };

    channel.bind("chat:message", onMessage);
    channel.bind("chat:typing", onTyping);
    channel.bind("chat:read", onRead);
    channel.bind("chat:delete", onDelete);

    return () => {
      channel.unbind("chat:message", onMessage);
      channel.unbind("chat:typing", onTyping);
      channel.unbind("chat:read", onRead);
      channel.unbind("chat:delete", onDelete);
      pusher.unsubscribe(channelName);
    };
  }, [userId, viewer]);

  // ─── Auto-scroll on new messages ──────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, otherIsTyping]);

  // ─── Typing emitter (throttled) ───────────────────────────
  const emitTyping = (typing: boolean) => {
    const now = Date.now();
    // Throttle: only emit at most once every 1.5 seconds
    if (typing && now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    void fetch("/api/support/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(viewer === "admin" ? { userId, typing } : { typing }),
    }).catch(() => {});
  };

  // ─── File upload ──────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr("");

    const currentCount = attachments.length;
    const available = MAX_FILES_PER_MESSAGE - currentCount;
    if (available <= 0) {
      setErr(`Maximum ${MAX_FILES_PER_MESSAGE} attachments per message.`);
      return;
    }

    const toUpload = Array.from(files).slice(0, available);
    setUploading(true);
    try {
      for (const f of toUpload) {
        if (f.size > MAX_FILE_SIZE_BYTES) {
          setErr(`File "${f.name}" is too large (max 10 MB).`);
          continue;
        }
        const form = new FormData();
        form.append("file", f);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok || !json?.url) {
          setErr(json?.error || "Upload failed.");
          continue;
        }
        setAttachments(prev => [
          ...prev,
          { url: json.url, filename: f.name, size: f.size, type: f.type },
        ]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Send message ─────────────────────────────────────────
  const handleSend = async () => {
    const body = draft.trim();
    if (!body && attachments.length === 0) return;
    if (sending) return;

    setSending(true);
    setErr("");

    // Tell the other side we stopped typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(false);
    lastTypingSentRef.current = 0; // force next typing emit to go through

    try {
      const payload: any = { body, attachments };
      if (viewer === "admin") payload.userId = userId;

      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Failed to send."); return; }

      // Optimistic: add to local state if Pusher hasn't already done it
      if (json?.message) {
        setMessages(prev => {
          if (prev.some(m => m._id === json.message._id)) return prev;
          return [...prev, json.message];
        });
      }

      setDraft("");
      setAttachments([]);
    } catch (e: any) {
      setErr(e?.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const handleDraftChange = (v: string) => {
    setDraft(v);
    emitTyping(true);
    // Schedule a "stopped typing" event 2s after they stop typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
      emitTyping(false);
    }, 2000);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!canDelete) return;
    if (!confirm("Delete this message? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/support/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m));
      }
    } catch {}
  };

  // ─── Render ────────────────────────────────────────────────
  const visibleMessages = useMemo(() => messages.filter(m => !m.deleted), [messages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: accentGradient }}>
            <MessageCircle size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{otherPartyLabel}</p>
            {viewer === "user" && (
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${presence.online ? "bg-green-500" : "bg-gray-400"}`} />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {presence.online ? "Online" : "Offline — we'll get back to you"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages scroll area ────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50 dark:bg-white/[0.02]">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentSolid }} />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversation…</p>
          </div>
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-3 flex items-start gap-2.5 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {err}
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${accentSolid}15` }}>
              <MessageCircle className="w-6 h-6" style={{ color: accentSolid }} />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {viewer === "user" ? "Start a conversation" : "No messages yet"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              {viewer === "user"
                ? presence.online
                  ? "Our support team is online and ready to help."
                  : "We're currently offline. Leave a message and we'll get back to you."
                : "Send the first message to this user."}
            </p>
          </div>
        ) : (
          <>
            {visibleMessages.map((m, idx) => {
              const mine = m.authorType === viewer;
              const prev = visibleMessages[idx - 1];
              const showAvatar = !prev || prev.authorType !== m.authorType;
              const isLastFromMe = mine && (idx === visibleMessages.length - 1 || visibleMessages[idx + 1]?.authorType !== viewer);
              const readReceipt = mine && (viewer === "user" ? m.readByAdmin : m.readByUser);

              return (
                <div key={m._id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className="w-7 shrink-0">
                    {showAvatar ? (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${mine ? "" : "bg-gray-300 dark:bg-white/10 text-gray-700 dark:text-gray-300"}`}
                        style={mine ? { background: accentGradient } : undefined}>
                        {(m.authorName?.[0] || "?").toUpperCase()}
                      </div>
                    ) : null}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[78%] group relative ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    {showAvatar && !mine && (
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 px-1">{m.authorName}</p>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${mine
                        ? "text-white"
                        : "bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-white/10"
                      }`}
                      style={mine ? { background: accentGradient } : undefined}>
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}

                      {/* Attachments */}
                      {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                        <div className={`mt-2 space-y-1.5 ${m.body ? "" : "mt-0"}`}>
                          {m.attachments.map((a, i) => {
                            const isImg = a.type?.startsWith("image/");
                            if (isImg) {
                              return (
                                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                  className="block rounded-lg overflow-hidden border border-white/20">
                                  <img src={a.url} alt={a.filename}
                                    className="max-w-full max-h-56 object-cover" />
                                </a>
                              );
                            }
                            return (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${mine ? "bg-white/10 hover:bg-white/20" : "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"} transition`}>
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

                    {/* Time + read receipt */}
                    <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${mine ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{fmtChatTime(m.createdAt)}</span>
                      {isLastFromMe && (
                        readReceipt
                          ? <CheckCheck className="w-3.5 h-3.5" style={{ color: accentSolid }} />
                          : <Check className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>

                    {/* Admin delete button (hover) */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteMessage(m._id)}
                        className={`absolute top-0 ${mine ? "right-full mr-1" : "left-full ml-1"} opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer`}
                        title="Delete message">
                        <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {otherIsTyping && (
              <div className="flex gap-2">
                <div className="w-7 shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300">
                    {(otherPartyLabel?.[0] || "?").toUpperCase()}
                  </div>
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Composer ──────────────────────────────────────────── */}
      <div className="border-t border-gray-100 dark:border-white/10 p-3 bg-white dark:bg-gray-900">
        {/* Attachment previews */}
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

        {err && (
          <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
            <AlertCircle size={11} /> {err}
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
            className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
            title="Attach file">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>

          <textarea
            value={draft}
            onChange={e => handleDraftChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition resize-none max-h-32"
            style={{ fontSize: "16px" }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!draft.trim() && attachments.length === 0)}
            className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
            style={{ background: accentGradient }}
            title="Send (Enter)">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}