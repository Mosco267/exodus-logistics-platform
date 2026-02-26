"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DU = {
  id: string;
  name: string;
  email: string;
  createdAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string;
};

export default function DeletedUsersPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [items, setItems] = useState<DU[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/deleted-users", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      setItems(Array.isArray(json?.users) ? json.users : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/restore`, {
        method: "PATCH",
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        alert(`Restore failed: ${res.status}\n${t.slice(0, 300)}`);
        return;
      }

      // remove from list immediately
      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Deleted Users</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View deleted/blocked accounts and restore access.
          </p>
        </div>

        <button
          onClick={load}
          className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/20 text-sm font-semibold
                     hover:border-blue-600 hover:text-blue-700 dark:hover:border-cyan-400 dark:hover:text-cyan-300 transition"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 shadow-md overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">No deleted users.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-white/10">
              <tr className="text-left text-gray-700 dark:text-gray-200">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Deleted</th>
                <th className="py-3 px-4">Deleted By</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-white/10">
                  <td className="py-3 px-4 font-semibold">{u.name || "—"}</td>
                  <td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                    {u.deletedAt ? new Date(u.deletedAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{u.deletedBy || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      disabled={busyId === u.id}
                      onClick={() => restore(u.id)}
                      className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold
                                 hover:bg-cyan-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {busyId === u.id ? "Restoring…" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}