"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  RefreshCw, UserX, Loader2, AlertCircle,
  CheckCircle2, XCircle, RotateCcw, Trash2,
} from "lucide-react";

type DU = {
  id: string;
  name: string;
  email: string;
  createdAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(d);
}

function initials(name?: string, email?: string) {
  const base = (name || email || "U").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

export default function BannedUsersPage() {
  const params = useParams();

  const [items, setItems] = useState<DU[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "restore" | "delete" } | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3500);
  };

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch("/api/admin/deleted-users", { cache: "no-store" });
      const json = await res.json();
      setItems(Array.isArray(json?.users) ? json.users : []);
    } catch {
      showMsg("Failed to load banned users.", "error");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const restore = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/restore`, {
        method: "PATCH", cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        showMsg(`Restore failed: ${t.slice(0, 100)}`, "error");
        return;
      }
      setItems(prev => prev.filter(x => x.id !== id));
      showMsg("User restored successfully.");
    } catch {
      showMsg("Network error.", "error");
    } finally {
      setBusyId(null); setConfirmAction(null);
    }
  };

  const deleteUser = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "DELETE", cache: "no-store",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) { showMsg(j?.error || "Failed to delete user.", "error"); return; }
      setItems(prev => prev.filter(x => x.id !== id));
      showMsg("User permanently deleted.");
    } catch {
      showMsg("Network error.", "error");
    } finally {
      setBusyId(null); setConfirmAction(null);
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "restore") restore(confirmAction.id);
    else deleteUser(confirmAction.id);
  };

  const confirmUser = confirmAction ? items.find(u => u.id === confirmAction.id) : null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Banned Users</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {loading ? "Loading…" : `${items.length} banned account${items.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button type="button" onClick={() => load(true)} disabled={refreshing}
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

        {/* Table card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Loading banned users…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <UserX className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold">No banned users.</p>
              <p className="text-xs text-gray-400">Banned accounts will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    {["#", "User", "Email", "Banned At", "Banned By", "Actions"].map(h => (
                      <th key={h} className={`py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"} ${h === "#" ? "w-10" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((u, idx) => (
                    <tr key={u.id} className="group hover:bg-slate-50/80 transition">

                      {/* # */}
                      <td className="py-4 px-4 text-xs font-semibold text-gray-300">{idx + 1}</td>

                      {/* User */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{u.name || "—"}</p>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-600">
                        {u.email || "—"}
                      </td>

                      {/* Banned At */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                        {fmtDate(u.deletedAt)}
                      </td>

                      {/* Banned By */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                        {u.deletedBy || "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button"
                            onClick={() => setConfirmAction({ id: u.id, type: "restore" })}
                            disabled={busyId === u.id}
                            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition disabled:opacity-50">
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                          <button type="button"
                            onClick={() => setConfirmAction({ id: u.id, type: "delete" })}
                            disabled={busyId === u.id}
                            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 hover:border-red-300 transition disabled:opacity-50">
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 p-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              confirmAction.type === "delete" ? "bg-red-100" : "bg-emerald-100"
            }`}>
              {confirmAction.type === "delete"
                ? <Trash2 className="w-6 h-6 text-red-600" />
                : <RotateCcw className="w-6 h-6 text-emerald-600" />}
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">
              {confirmAction.type === "delete" ? "Permanently delete user?" : "Restore user?"}
            </h3>
            {confirmUser && (
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-sm font-bold text-gray-800">{confirmUser.name || "—"}</p>
                <p className="text-xs text-gray-500">{confirmUser.email}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              {confirmAction.type === "delete"
                ? "This will permanently remove this user from the system. This action cannot be undone."
                : "This will restore the user's access. They will be able to sign in again."}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmAction(null)}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="button" onClick={handleConfirm}
                disabled={busyId === confirmAction.id}
                className={`cursor-pointer px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2 ${
                  confirmAction.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}>
                {busyId === confirmAction.id
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{confirmAction.type === "delete" ? "Deleting…" : "Restoring…"}</>
                  : confirmAction.type === "delete" ? "Yes, Delete Permanently" : "Yes, Restore Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}