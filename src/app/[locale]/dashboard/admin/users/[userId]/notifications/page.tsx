"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bell, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import UserSubNav from "../UserSubNav";

export default function UserNotificationsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const userId = decodeURIComponent((params?.userId as string) || "");

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  const [nTitle, setNTitle] = useState("");
  const [nMessage, setNMessage] = useState("");
  const [nShipmentId, setNShipmentId] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
        const json = await res.json();
        setUserName(json?.user?.name || "");
        setUserEmail(json?.user?.email || "");
      } finally {
        setLoadingUser(false);
      }
    };
    load();
  }, [userId]);

  const send = async () => {
    if (!nTitle.trim() || !nMessage.trim()) {
      showMsg("Please enter a title and message.", "error"); return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userEmail,
          title: nTitle.trim(),
          message: nMessage.trim(),
          shipmentId: nShipmentId.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { showMsg(json?.error || "Failed to send.", "error"); return; }
      setNTitle(""); setNMessage(""); setNShipmentId("");
      showMsg("Notification sent successfully.");
    } catch {
      showMsg("Network error.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <UserSubNav locale={locale} userId={userId} userName={userName} userEmail={userEmail} />

        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            msgType === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
            {msgType === "error" ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {msg}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Create Notification</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Send a notification to {loadingUser ? "this user" : userName || userEmail || "this user"}.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input value={nTitle} onChange={e => setNTitle(e.target.value)}
                placeholder="e.g. Shipment delayed in customs"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea value={nMessage} onChange={e => setNMessage(e.target.value)}
                placeholder="Write the notification message for the user…"
                rows={5}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 resize-none" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Shipment ID <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={nShipmentId} onChange={e => setNShipmentId(e.target.value)}
                placeholder="e.g. EXS-260222-9BC87D"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
              <p className="mt-1.5 text-xs text-gray-400">Attach a shipment ID to give the notification context.</p>
            </div>

            {/* Recipient info */}
            {!loadingUser && (userEmail || userId) && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Sending to</p>
                <p className="text-sm font-semibold text-gray-800">{userName || "Unnamed user"}</p>
                <p className="text-xs text-gray-500">{userEmail || userId}</p>
              </div>
            )}

            <button type="button" onClick={send} disabled={sending}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                : <><Send className="w-4 h-4" />Send Notification</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}