"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  RefreshCw, Users, UserCheck, UserX, MoreVertical,
  Loader2, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
} from "lucide-react";

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  banned?: boolean;
  createdAt?: string;
};

function initials(name?: string, email?: string) {
  const base = (name || email || "U").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(d);
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
];

function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const tableRef = useRef<HTMLDivElement>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuFlip, setMenuFlip] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3500);
  };

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu]")) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenMenu(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const fetchUsers = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json = await res.json();
      setUsers(Array.isArray(json?.users) ? json.users : []);
    } catch {
      showMsg("Failed to load users.", "error");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => !u.banned && u.status !== "banned").length,
    banned: users.filter(u => u.banned || u.status === "banned").length,
  }), [users]);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);

  const displayed = useMemo(() => {
    if (showAll) return users;
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, currentPage, showAll]);

  const deleteUser = async (userId: string) => {
  setDeletingId(userId);
  try {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: true }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) { showMsg(j?.error || "Failed to ban user.", "error"); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true, status: "banned" } : u));
    showMsg("User banned successfully.");
  } catch {
    showMsg("Network error.", "error");
  } finally {
    setDeletingId(""); setConfirmDeleteId("");
  }
};

  const btnCls = "cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition";

  const PageNumbers = () => (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
        .reduce<(number | string)[]>((acc, p, i, arr) => {
          if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
          acc.push(p); return acc;
        }, [])
        .map((p, i) => typeof p === "string"
          ? <span key={`e${i}`} className="px-1 text-gray-300 text-xs">…</span>
          : <button key={p} type="button" onClick={() => setCurrentPage(p as number)}
              className={`cursor-pointer w-8 h-8 rounded-xl text-xs font-bold transition ${
                p === currentPage ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
              }`}>{p}</button>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1200px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Users</h1>
            <p className="mt-0.5 text-sm text-gray-500">Manage user accounts, shipments and access.</p>
          </div>
          <button type="button" onClick={() => fetchUsers(true)} disabled={refreshing}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Users", value: stats.total, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", Icon: Users },
            { label: "Active", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", Icon: UserCheck },
            { label: "Banned", value: stats.banned, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", Icon: UserX },
          ].map(({ label, value, color, bg, border, Icon }) => (
            <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 hover:shadow-sm transition`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
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
        <div ref={tableRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-500">
              {loading ? "Loading…"
                : showAll ? `All ${users.length} users`
                : users.length === 0 ? "No users"
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, users.length)} of ${users.length} users`}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {!showAll && totalPages > 1 && (
                <>
                  <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1} className={btnCls}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <PageNumbers />
                  <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages} className={btnCls}>
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setShowAll(v => !v); setCurrentPage(1); }}
                className={`${btnCls} ${showAll ? "!bg-blue-50 !border-blue-300 !text-blue-700" : ""}`}>
                {showAll ? "Show Pages" : "View All"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Loading users…</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <Users className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-semibold">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    {["#", "User", "Email", "Role", "Created", "Actions"].map(h => (
                      <th key={h} className={`py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"} ${h === "#" ? "w-10" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((u, idx) => {
                    const sn = showAll ? idx + 1 : (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const userHref = `/${locale}/dashboard/admin/users/${encodeURIComponent(u.id)}`;
                    const isBanned = u.banned || u.status === "banned";

                    return (
                      <tr key={u.id} className="group hover:bg-slate-50/80 transition">
                        {/* # */}
                        <td className="py-4 px-4 text-xs font-semibold text-gray-300">{sn}</td>

                        {/* User */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full ${avatarColor(u.id)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                              {initials(u.name, u.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{u.name || "Unnamed user"}</p>
                              <p className="text-[11px] text-gray-400 font-mono truncate max-w-[160px]">{u.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-600">
                          {u.email || "—"}
                        </td>

                        {/* Role / Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isBanned ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-red-50 text-red-700 border-red-200">
                              Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              {u.role === "ADMIN" ? "Admin" : "Active"}
                            </span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                          {fmtDate(u.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <div className="relative inline-block" data-menu>
                            <button type="button"
                              onClick={(e) => {
                                if (openMenu === u.id) { setOpenMenu(null); return; }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const tableBottom = tableRef.current?.getBoundingClientRect().bottom ?? window.innerHeight;
                                setMenuFlip(prev => ({ ...prev, [u.id]: tableBottom - rect.bottom < 220 }));
                                setOpenMenu(u.id);
                              }}
                              className="cursor-pointer inline-flex items-center justify-center h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition shadow-sm"
                              data-menu>
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenu === u.id && (
                              <div
                                className={`absolute right-0 z-50 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden ${menuFlip[u.id] ? "bottom-10" : "top-10"}`}
                                data-menu>
                                <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                                  <p className="text-xs font-bold text-gray-800 truncate">{u.name || "Unnamed user"}</p>
                                  <p className="text-[11px] text-gray-400 truncate">{u.email || "—"}</p>
                                </div>
                                <div className="py-1">
                                  <Link href={userHref} onClick={() => setOpenMenu(null)}
                                    className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                    View User & Shipments
                                  </Link>
                                  <Link href={`${userHref}#notify`} onClick={() => setOpenMenu(null)}
                                    className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                    Create Notification
                                  </Link>
                                </div>
                                <div className="py-1 border-t border-gray-100">
                                  <button type="button"
                                    onClick={() => { setOpenMenu(null); setConfirmDeleteId(u.id); }}
                                    disabled={deletingId === u.id}
                                    className="cursor-pointer flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50">
                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                    {deletingId === u.id ? "Banning…" : "Ban User"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom pagination */}
          {!loading && !showAll && totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-400 font-medium">
                Page <span className="font-bold text-gray-700">{currentPage}</span> of <span className="font-bold text-gray-700">{totalPages}</span>
                <span className="mx-2 text-gray-200">·</span>
                <span className="font-bold text-gray-700">{users.length}</span> total users
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={btnCls}>First</button>
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={btnCls}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <PageNumbers />
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={btnCls}>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={btnCls}>Last</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Ban user?</h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              You are about to ban this user. This action cannot be undone, and the user will lose access to their account and shipments. Are you sure you want to proceed?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmDeleteId("")}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="button" onClick={() => deleteUser(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="cursor-pointer px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition flex items-center gap-2">
                {deletingId === confirmDeleteId
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Banning…</>
                  : "Yes, Ban User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
