"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type UserRow = {
  id: string;
  name?: string;
  email?: string;
  createdAt?: string;
};

function initials(name?: string, email?: string) {
  const base = (name || email || "U").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase();
}

export default function AdminUsersPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json = await res.json();
      setUsers(Array.isArray(json?.users) ? json.users : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!t.closest("[data-menu-root]")) setOpenMenu(null);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const rows = useMemo(() => users, [users]);

  // ✅ Delete user (your API must exist)
 const deleteUser = async (userId: string) => {
  const id = String(userId || "").trim();
   console.log("Deleting userId:", id);
  if (!id) return alert("Missing user id");

  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });

  const j = await res.json().catch(() => null);

  if (!res.ok) {
    alert(j?.error || "Failed to delete user");
    return;
  }

  // remove from table instantly
  setUsers((prev) => prev.filter((u) => String(u.id) !== id));
};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              Admin • Users
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              View all users and manage shipments/invoices per user.
            </p>
          </div>

          <button
            onClick={fetchUsers}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10
                       bg-white/70 dark:bg-white/5 text-gray-900 dark:text-gray-100 font-semibold
                       hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">No users found.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px] border-collapse">
              <thead className="border-b border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="py-3 px-3 text-left font-semibold">User</th>
                  <th className="py-3 px-3 text-left font-semibold">Email</th>
                  <th className="py-3 px-3 text-left font-semibold">Created</th>
                  <th className="py-3 px-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="text-gray-800 dark:text-gray-100">
                {rows.map((u) => {
                  const userHref = `/${locale}/dashboard/admin/users/${encodeURIComponent(u.id)}`;
                  const notifyHref = `${userHref}#notify`;
                  const menuOpen = openMenu === u.id;

                  return (
                    <tr
                      key={u.id}
                      data-id={u.id}
                      className="border-b border-gray-100 dark:border-white/10 hover:bg-blue-50/60 dark:hover:bg-white/5 transition"
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            {initials(u.name, u.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{u.name || "Unnamed user"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">{u.email || "—"}</td>

                      <td className="py-3 px-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-right relative">
                        <div data-menu-root className="inline-block relative">
                          <button
                            onClick={() => setOpenMenu(menuOpen ? null : u.id)}
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10
                                       bg-white/70 dark:bg-white/5 font-bold
                                       hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            title="Actions"
                          >
                            ⋯
                          </button>

                          {menuOpen && (
                            <div
                              className="absolute right-0 mt-2 w-[320px] rounded-2xl border border-gray-200 dark:border-white/10
                                         bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-[9999]"
                              role="menu"
                            >
                              {/* Header */}
                              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                                <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                                  {u.name || "Unnamed user"}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {u.email || "—"}
                                </p>
                              </div>

                              {/* ✅ Scrollable area */}
                              <div className="max-h-[240px] overflow-y-auto">
                                <Link
                                  href={userHref}
                                  onClick={() => setOpenMenu(null)}
                                  className="block text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-white/10 transition"
                                  role="menuitem"
                                >
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    View user & shipments
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Edit shipment status, invoice & notifications
                                  </p>
                                </Link>

                                <Link
                                  href={notifyHref}
                                  onClick={() => setOpenMenu(null)}
                                  className="block text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-white/10 transition"
                                  role="menuitem"
                                >
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Create notification
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Send a message update to this user
                                  </p>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-white/10" />

                                {/* ✅ Delete user */}
                               <button
  onClick={() => {
  setOpenMenu(null);
  if (confirm("Delete this user permanently? This action cannot be undone.")) {
    deleteUser(u.id);
  }
}}
  className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-red-50 dark:hover:bg-white/10 cursor-pointer"
  role="menuitem"
>
  Delete user
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
      </div>
    </div>
  );
}