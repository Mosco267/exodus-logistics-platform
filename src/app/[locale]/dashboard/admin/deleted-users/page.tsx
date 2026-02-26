"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DeletedUser = {
  id: string;
  name: string;
  email: string;
  deletedAt?: string;
};

export default function DeletedUsersPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/deleted-users", { cache: "no-store" });
    const json = await res.json();
    setUsers(Array.isArray(json?.users) ? json.users : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const restore = async (id: string) => {
    if (!confirm("Restore this account?")) return;

    setRestoring(id);

    const res = await fetch(
      `/api/admin/users/${id}/restore`,
      { method: "PATCH" }
    );

    setRestoring(null);

    if (res.ok) {
      alert("Account restored successfully.");
      load();
    } else {
      alert("Failed to restore.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold mb-8 text-gray-900 dark:text-gray-100">
        Deleted Users
      </h1>

      {loading ? (
        <p className="text-gray-500">Loading deleted accounts...</p>
      ) : users.length === 0 ? (
        <div className="p-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400">
            No deleted accounts.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="text-left px-6 py-4 font-semibold">Name</th>
                <th className="text-left px-6 py-4 font-semibold">Email</th>
                <th className="text-left px-6 py-4 font-semibold">
                  Deleted At
                </th>
                <th className="text-right px-6 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-gray-100 dark:border-white/10"
                >
                  <td className="px-6 py-4">{u.name || "—"}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    {u.deletedAt
                      ? new Date(u.deletedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => restore(u.id)}
                      disabled={restoring === u.id}
                      className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {restoring === u.id ? "Restoring..." : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}