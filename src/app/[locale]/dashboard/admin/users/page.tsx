"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  RefreshCw, Users, UserCheck, UserX, Ban, MoreVertical,
  Loader2, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  banned?: boolean;
  isDeleted?: boolean;
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
  const [menuPos, setMenuPos] = useState<{ top: number; right: number; rectBottom: number } | null>(null);

  const [busyId, setBusyId] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "ban" | "delete" } | null>(null);

  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [bannedCount, setBannedCount] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3500);
  };

  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu]")) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenMenu(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const fetchUsers = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [usersRes, bannedRes, deletedRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/users/unban", { cache: "no-store" }),
        fetch("/api/admin/deleted-users", { cache: "no-store" }),
      ]);
      const usersJson = await usersRes.json();
      const bannedJson = bannedRes.ok ? await bannedRes.json() : { users: [] };
      const deletedJson = deletedRes.ok ? await deletedRes.json() : { users: [] };
      setUsers(Array.isArray(usersJson?.users) ? usersJson.users : []);
      setBannedCount(Array.isArray(bannedJson?.users) ? bannedJson.users.length : 0);
      setDeletedCount(Array.isArray(deletedJson?.users) ? deletedJson.users.length : 0);
    } catch {
      showMsg("Failed to load users.", "error");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line

  const stats = useMemo(() => ({
    total: users.length + bannedCount + deletedCount,
    active: users.length,
    banned: bannedCount,
    deleted: deletedCount,
  }), [users, bannedCount, deletedCount]);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);

  const displayed = useMemo(() => {
    if (showAll) return users;
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, currentPage, showAll]);

  const banUser = async (userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u?.email) { showMsg("User has no email.", "error"); return; }
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, reason: "Banned by admin" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) { showMsg(j?.error || "Failed to ban user.", "error"); return; }
      setUsers(prev => prev.filter(x => x.id !== userId));
      setBannedCount(prev => prev + 1);
      showMsg("User banned successfully.");
    } catch {
      showMsg("Network error.", "error");
    } finally {
      setBusyId(""); setConfirmAction(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) { showMsg(j?.error || "Failed to delete user.", "error"); return; }
      setUsers(prev => prev.filter(x => x.id !== userId));
      setDeletedCount(prev => prev + 1);
      showMsg("User deleted successfully.");
    } catch {
      showMsg("Network error.", "error");
    } finally {
      setBusyId(""); setConfirmAction(null);
    }
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "ban") banUser(confirmAction.id);
    else deleteUser(confirmAction.id);
  };

  const confirmUser = confirmAction ? users.find(u => u.id === confirmAction.id) : null;

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

        {/* Stats — 4 boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Users", value: stats.total, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", Icon: Users, href: null },
            { label: "Active", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", Icon: UserCheck, href: null },
            { label: "Deleted", value: stats.deleted, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", Icon: UserX, href: `/${locale}/dashboard/admin/deleted-users` },
            { label: "Banned", value: stats.banned, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", Icon: Ban, href: `/${locale}/dashboard/admin/users/banned` },
          ].map(({ label, value, color, bg, border, Icon, href }) => {
            const content = (
              <div className={`rounded-2xl border ${border} ${bg} p-4 hover:shadow-sm transition ${href ? 'cursor-pointer' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
              </div>
            );
            return href ? <Link key={label} href={href}>{content}</Link> : <div key={label}>{content}</div>;
          })}
        </div>

        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            msgType === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
            {msgType === "error" ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {msg}
          </div>
        )}

        <div ref={tableRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-visible">

          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-500">
              {loading ? "Loading…"
                : showAll ? `All ${users.length} users`
                : users.length === 0 ? "No active users"
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
              <p className="text-sm font-semibold">No active users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
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
                    const isAdmin = u.role === "ADMIN";

                    return (
                      <tr key={u.id} className="group hover:bg-slate-50/80 transition">
                        <td className="py-4 px-4 text-xs font-semibold text-gray-300">{sn}</td>

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

                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-600">
                          {u.email || "—"}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isAdmin
                              ? "bg-violet-50 text-violet-700 border-violet-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            {isAdmin ? "Admin" : "Active"}
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                          {fmtDate(u.createdAt)}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <div className="relative inline-block" data-menu>
                            <button type="button"
                              onClick={(e) => {
                                if (openMenu === u.id) { setOpenMenu(null); return; }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                setMenuFlip(prev => ({ ...prev, [u.id]: spaceBelow < 260 }));
                                setMenuPos({ top: rect.bottom + window.scrollY, right: window.innerWidth - rect.right, rectBottom: rect.bottom });
                                setOpenMenu(u.id);
                              }}
                              className="cursor-pointer inline-flex items-center justify-center h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition shadow-sm"
                              data-menu>
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenu === u.id && (
                              <div
                                className="fixed z-50 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden"
                                style={menuPos ? {
                                  top: menuFlip[u.id]
                                    ? menuPos.rectBottom - 260 + window.scrollY
                                    : menuPos.top + 8,
                                  right: menuPos.right,
                                } : {}}
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
                                    onClick={() => { setOpenMenu(null); setConfirmAction({ id: u.id, type: "delete" }); }}
                                    disabled={busyId === u.id}
                                    className="cursor-pointer flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition disabled:opacity-50">
                                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                    Delete User
                                  </button>
                                  <button type="button"
                                    onClick={() => { setOpenMenu(null); setConfirmAction({ id: u.id, type: "ban" }); }}
                                    disabled={busyId === u.id}
                                    className="cursor-pointer flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50">
                                    <Ban className="w-3.5 h-3.5 shrink-0" />
                                    Ban User
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

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 p-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              confirmAction.type === "ban" ? "bg-red-100" : "bg-amber-100"
            }`}>
              {confirmAction.type === "ban"
                ? <Ban className="w-6 h-6 text-red-600" />
                : <Trash2 className="w-6 h-6 text-amber-600" />}
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">
              {confirmAction.type === "ban" ? "Ban this user?" : "Delete this user?"}
            </h3>
            {confirmUser && (
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-sm font-bold text-gray-800">{confirmUser.name || "—"}</p>
                <p className="text-xs text-gray-500">{confirmUser.email}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              {confirmAction.type === "ban"
                ? "This user will be banned. They will not be able to sign in or register again with this email. You can unban them later from the Banned Users page."
                : "This user will be moved to Deleted Users. They will not be able to sign in. You can restore them later from the Deleted Users page."}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmAction(null)}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="button" onClick={handleConfirm}
                disabled={busyId === confirmAction.id}
                className={`cursor-pointer px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2 ${
                  confirmAction.type === "ban"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}>
                {busyId === confirmAction.id
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{confirmAction.type === "ban" ? "Banning…" : "Deleting…"}</>
                  : confirmAction.type === "ban" ? "Yes, Ban User" : "Yes, Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}