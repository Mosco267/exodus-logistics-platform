"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Send, Package, CheckCircle2,
  XCircle, Loader2, Bell, AlertCircle,
} from "lucide-react";

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  status?: string;
  statusColor?: string;
  invoice?: {
    amount?: number;
    currency?: string;
    paid?: boolean;
    status?: string;
    paidAt?: string | null;
  };
  createdAt?: string;
};

type UserDetail = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
};

type StatusDoc = {
  key: string;
  label: string;
  color?: string;
};

const normalizeKey = (v: string) =>
  (v ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric",
  }).format(d);
}

function fmtAmount(amount: number, currency: string) {
  return `${(currency || "USD").toUpperCase()} ${Number(amount || 0).toFixed(2)}`;
}

function invoiceBadgeCls(status: string) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "overdue") return "bg-red-50 text-red-700 border-red-200";
  if (status === "cancelled") return "bg-gray-100 text-gray-500 border-gray-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function invoiceBadgeLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  if (status === "cancelled") return "Cancelled";
  return "Unpaid";
}

function getInvoiceStatus(s: Shipment): string {
  return String(s?.invoice?.status || (s?.invoice?.paid ? "paid" : "unpaid")).toLowerCase();
}

function initials(name?: string, email?: string) {
  const base = (name || email || "U").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const userId = decodeURIComponent((params?.userId as string) || "");
  const focusShipment = useMemo(() => String(searchParams?.get("focusShipment") || "").trim(), [searchParams]);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [draftKey, setDraftKey] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [focusedRow, setFocusedRow] = useState("");

  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  // Notification
  const [nTitle, setNTitle] = useState("");
  const [nMessage, setNMessage] = useState("");
  const [nShipmentId, setNShipmentId] = useState("");
  const [nSending, setNSending] = useState(false);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3000);
  };

  const statusByKey = useMemo(() => {
    const m: Record<string, StatusDoc> = {};
    for (const s of statuses) m[normalizeKey(s.key)] = s;
    return m;
  }, [statuses]);

  const sortedStatuses = useMemo(() =>
    [...statuses].sort((a, b) => a.label.localeCompare(b.label)), [statuses]);

  const fetchAll = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setMsg("");
    try {
      const [uRes, sRes, stRes] = await Promise.all([
        fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }),
        fetch(`/api/admin/users/${encodeURIComponent(userId)}/shipments`, { cache: "no-store" }),
        fetch(`/api/statuses`, { cache: "no-store" }),
      ]);
      const uj = await uRes.json();
      const sj = await sRes.json();
      const stj = await stRes.json();

      const shipmentList: Shipment[] = Array.isArray(sj?.shipments) ? sj.shipments : [];
      const statusList: StatusDoc[] = Array.isArray(stj?.statuses) ? stj.statuses : [];

      setUser(uj?.user ?? null);
      setShipments(shipmentList);
      setStatuses(statusList);

      const localStatusByKey: Record<string, StatusDoc> = {};
      const localKeyByLabel: Record<string, string> = {};
      for (const st of statusList) {
        localStatusByKey[normalizeKey(st.key)] = st;
        localKeyByLabel[st.label.toLowerCase()] = normalizeKey(st.key);
      }

      const nextDraft: Record<string, string> = {};
      for (const sh of shipmentList) {
        const raw = String(sh.status || "").trim();
        const asKey = normalizeKey(raw);
        if (localStatusByKey[asKey]) { nextDraft[sh.shipmentId] = asKey; continue; }
        const fromLabel = localKeyByLabel[raw.toLowerCase()];
        if (fromLabel) { nextDraft[sh.shipmentId] = fromLabel; continue; }
        nextDraft[sh.shipmentId] = "";
      }
      setDraftKey(nextDraft);
    } catch {
      showMsg("Failed to load data.", "error");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, [userId]); // eslint-disable-line

  useEffect(() => {
    if (!focusShipment) return;
    setNShipmentId(prev => prev || focusShipment);
  }, [focusShipment]);

  useEffect(() => {
    if (loading || !focusShipment) return;
    const el = document.getElementById(`shipment-row-${focusShipment}`);
    if (!el) return;
    setFocusedRow(focusShipment);
    requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    const t = window.setTimeout(() => setFocusedRow(""), 4500);
    return () => window.clearTimeout(t);
  }, [loading, focusShipment]);

  const sendNotification = async () => {
    if (!user) return;
    if (!nTitle.trim() || !nMessage.trim()) {
      showMsg("Please enter a title and message.", "error"); return;
    }
    setNSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id, userEmail: user.email,
          title: nTitle.trim(), message: nMessage.trim(),
          shipmentId: nShipmentId.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { showMsg(json?.error || "Failed to send.", "error"); return; }
      setNTitle(""); setNMessage(""); setNShipmentId("");
      showMsg("Notification sent successfully.");
    } finally {
      setNSending(false);
    }
  };

  const updateStatus = async (shipmentId: string) => {
    const key = normalizeKey(draftKey[shipmentId] || "");
    if (!key) { showMsg("Please select a status.", "error"); return; }
    setSavingId(shipmentId);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: key }),
      });
      const json = await res.json();
      if (!res.ok) { showMsg(json?.error || "Failed to update status.", "error"); return; }
      setShipments(prev => prev.map(s => s.shipmentId === shipmentId ? json?.shipment as Shipment : s));
      showMsg(`Status updated to "${statusByKey[key]?.label || key}".`);
    } finally {
      setSavingId("");
    }
  };

  const togglePaid = async (shipmentId: string, currentPaid: boolean) => {
    const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice: { paid: !currentPaid } }),
    });
    const json = await res.json();
    if (!res.ok) { showMsg(json?.error || "Failed to update invoice.", "error"); return; }
    setShipments(prev => prev.map(s => s.shipmentId === shipmentId ? json?.shipment as Shipment : s));
    showMsg(`Invoice marked as ${!currentPaid ? "paid" : "unpaid"}.`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/dashboard/admin/users`}
              className="cursor-pointer inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition shadow-sm">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">User Detail</h1>
              <p className="mt-0.5 text-sm text-gray-500">Manage shipments, status and notifications.</p>
            </div>
          </div>
          <button type="button" onClick={() => fetchAll(true)} disabled={refreshing}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            msgType === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
            {msgType === "error" ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {msg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Loading…</span>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
            <AlertCircle className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-semibold">User not found.</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* User card */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-extrabold shrink-0">
                  {initials(user.name, user.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-lg font-extrabold text-gray-900">{user.name || "Unnamed user"}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      user.role === "ADMIN"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {user.role === "ADMIN" ? "Admin" : "User"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{user.email || "—"}</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{user.id}</p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Joined</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{fmtDate(user.createdAt)}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{shipments.length} shipment{shipments.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>

            {/* Create Notification */}
            <div id="notify" className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-base font-extrabold text-gray-900">Create Notification</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Title</label>
                  <input value={nTitle} onChange={e => setNTitle(e.target.value)}
                    placeholder="e.g. Shipment delayed"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Message</label>
                  <textarea value={nMessage} onChange={e => setNMessage(e.target.value)}
                    placeholder="Write the notification message…"
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Shipment ID <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={nShipmentId} onChange={e => setNShipmentId(e.target.value)}
                    placeholder="e.g. EXS-260222-9BC87D"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={sendNotification} disabled={nSending}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                    {nSending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      : <><Send className="w-4 h-4" /> Send Notification</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Shipments */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-base font-extrabold text-gray-900">Shipment History</h2>
                </div>
                <span className="text-xs font-bold text-gray-400">{shipments.length} shipment{shipments.length !== 1 ? "s" : ""}</span>
              </div>

              {shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                  <Package className="w-8 h-8 text-gray-200" />
                  <p className="text-sm font-semibold">No shipments found for this user.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        {["#", "Shipment ID", "Tracking No.", "Current Status", "Update Status", "Invoice", "Actions"].map(h => (
                          <th key={h} className={`py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"} ${h === "#" ? "w-10" : ""}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {shipments.map((s, idx) => {
                        const invStatus = getInvoiceStatus(s);
                        const paid = invStatus === "paid" || s?.invoice?.paid === true;
                        const amount = Number(s?.invoice?.amount ?? 0);
                        const currency = String(s?.invoice?.currency || "USD").toUpperCase();
                        const currentDraft = draftKey[s.shipmentId] || "";
                        const isFocused = focusedRow === s.shipmentId;

                        return (
                          <tr
                            id={`shipment-row-${s.shipmentId}`}
                            key={s.shipmentId}
                            className={`group transition ${isFocused ? "bg-blue-50/60 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50/80"}`}>

                            <td className="py-4 px-4 text-xs font-semibold text-gray-300">{idx + 1}</td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="font-bold text-gray-900 text-xs font-mono">{s.shipmentId}</span>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="text-xs font-semibold text-gray-700 font-mono">{s.trackingNumber || "—"}</span>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border"
                                style={{
                                  backgroundColor: `${s.statusColor || "#e5e7eb"}22`,
                                  color: s.statusColor || "#374151",
                                  borderColor: `${s.statusColor || "#d1d5db"}55`,
                                }}>
                                {s.status || "—"}
                              </span>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <select value={currentDraft}
                                  onChange={e => setDraftKey(prev => ({ ...prev, [s.shipmentId]: e.target.value }))}
                                  className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400">
                                  <option value="">Select status…</option>
                                  {sortedStatuses.map(st => (
                                    <option key={st.key} value={normalizeKey(st.key)}>{st.label}</option>
                                  ))}
                                </select>
                                <button type="button" onClick={() => updateStatus(s.shipmentId)}
                                  disabled={savingId === s.shipmentId}
                                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                                  {savingId === s.shipmentId ? <><Loader2 className="w-3 h-3 animate-spin" />Saving…</> : "Update"}
                                </button>
                              </div>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <p className="text-xs font-bold text-gray-900">{fmtAmount(amount, currency)}</p>
                              <span className={`mt-1 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${invoiceBadgeCls(invStatus)}`}>
                                {invoiceBadgeLabel(invStatus)}
                              </span>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => togglePaid(s.shipmentId, paid)}
                                  className={`cursor-pointer inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                    paid
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  }`}>
                                  Mark {paid ? "Unpaid" : "Paid"}
                                </button>
                                <button type="button"
                                  onClick={() => router.push(`/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(s.shipmentId)}`)}
                                  className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition">
                                  View →
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {statuses.length === 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 bg-amber-50">
                      <p className="text-xs text-amber-700 font-semibold">
                        No statuses found. Create statuses in Admin → Statuses first.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}