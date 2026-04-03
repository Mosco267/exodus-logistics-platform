"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, XCircle, Save } from "lucide-react";
import UserSubNav from "./UserSubNav";

type UserDetail = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "long", day: "numeric", year: "numeric",
  }).format(d);
}

function initials(name?: string, email?: string) {
  const base = (name || email || "U").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500",
];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function AdminUserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const userId = decodeURIComponent((params?.userId as string) || "");

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);
  const [banning, setBanning] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3500);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
        const json = await res.json();
        const u = json?.user ?? null;
        setUser(u);
        setEditName(u?.name || "");
        setEditEmail(u?.email || "");
      } catch {
        showMsg("Failed to load user.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) { showMsg(json?.error || "Failed to save.", "error"); return; }
      setUser(prev => prev ? { ...prev, name: editName.trim(), email: editEmail.trim() } : prev);
      showMsg("User updated successfully.");
    } catch {
      showMsg("Network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  const banUser = async () => {
    setBanning(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) { showMsg(json?.error || "Failed to ban.", "error"); return; }
      router.push(`/${locale}/dashboard/admin/users`);
    } catch {
      showMsg("Network error.", "error");
    } finally {
      setBanning(false); setConfirmBan(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <UserSubNav
          locale={locale}
          userId={userId}
          userName={user?.name}
          userEmail={user?.email}
          onBan={() => setConfirmBan(true)}
        />

        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            msgType === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
            {msgType === "error" ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {msg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500 font-medium">Loading…</span>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
            <AlertCircle className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-semibold">User not found.</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Avatar card */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex items-center gap-4">
              <div className={`h-16 w-16 rounded-2xl ${avatarColor(user.id)} text-white flex items-center justify-center text-xl font-extrabold shrink-0`}>
                {initials(user.name, user.email)}
              </div>
              <div>
                <p className="text-lg font-extrabold text-gray-900">{user.name || "Unnamed user"}</p>
                <p className="text-sm text-gray-500">{user.email || "—"}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    user.role === "ADMIN" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {user.role === "ADMIN" ? "Admin" : "User"}
                  </span>
                  <span className="text-xs text-gray-400">Joined {fmtDate(user.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Edit form */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <h2 className="text-base font-extrabold text-gray-900 mb-4">Edit Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Full Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Email Address</label>
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email"
                    placeholder="Enter email"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">User ID</label>
                  <input value={user.id} readOnly
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 font-mono cursor-not-allowed" />
                </div>
                <button type="button" onClick={save} disabled={saving}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Ban modal */}
      {confirmBan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Ban user?</h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              This user will lose access immediately. You can restore them from the Banned Users page.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmBan(false)}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="button" onClick={banUser} disabled={banning}
                className="cursor-pointer px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition flex items-center gap-2">
                {banning ? <><Loader2 className="w-4 h-4 animate-spin" />Banning…</> : "Yes, Ban User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}