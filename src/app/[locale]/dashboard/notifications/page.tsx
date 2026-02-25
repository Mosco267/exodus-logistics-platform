"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Notif = {
  _id: string;
  title?: string;
  message?: string;
  shipmentId?: string;
  read?: boolean;
  createdAt?: string;
};

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  // confirm modal state
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const email = useMemo(() => {
    if (typeof window === "undefined") return "";
    return String(localStorage.getItem("userEmail") || "").toLowerCase().trim();
  }, []);

  const loadNotifications = async () => {
    if (!email) return;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/notifications?email=${encodeURIComponent(email)}&limit=200`,
        { cache: "no-store" }
      );
      const json = await res.json();
      setItems(Array.isArray(json?.notifications) ? json.notifications : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const markRead = async (id: string) => {
   await fetch("/api/notifications", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id }),
});
  };

  const openNotif = async (n: Notif) => {
    setItems((prev) =>
      prev.map((x) => (x._id === n._id ? { ...x, read: true } : x))
    );
    await markRead(String(n._id));

    if (n.shipmentId) {
      router.push(`/${locale}/dashboard/status/${encodeURIComponent(n.shipmentId)}`);
    }
  };

  const deleteNotif = async (id: string) => {
    if (!email) return;

    // optimistic remove
    const snapshot = items;
    setItems((prev) => prev.filter((n) => String(n._id) !== String(id)));

    const res = await fetch(
      `/api/notifications/${encodeURIComponent(String(id))}?email=${encodeURIComponent(email)}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      setItems(snapshot); // rollback
      const j = await res.json().catch(() => null);
      alert(j?.error || "Failed to delete notification");
      return false;
    }

    return true;
  };

  const confirmDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteNotif(confirmId);
      setConfirmId(null); // ✅ close modal (DO NOT use n here)
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-center justify-between mb-6">
          {/* Left */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All your shipment and invoice updates.
            </p>
          </div>

          {/* Right */}
          <Link
            href={`/${locale}/dashboard`}
            className="text-sm font-semibold px-4 py-2 border border-gray-300 dark:border-white/20 rounded-xl
                       text-gray-700 dark:text-gray-300 hover:border-blue-600 hover:text-blue-700
                       dark:hover:border-cyan-400 dark:hover:text-cyan-300 transition-all duration-200 cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">No notifications yet.</p>
        ) : (
          <div className="mt-6 divide-y divide-gray-100 dark:divide-white/10">
            {items.map((n) => (
              <div
                key={String(n._id)}
                onClick={() => openNotif(n)}
                className={`p-4 cursor-pointer hover:bg-blue-50/60 dark:hover:bg-white/5 transition ${
                  n.read ? "" : "bg-blue-50/60 dark:bg-blue-500/10 border-l-[6px] border-l-blue-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-gray-900 dark:text-gray-100">
                      {n.title || "Notification"}
                    </p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                      {n.message || ""}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(String(n._id));
                    }}
                    className="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10
                               text-xs font-semibold text-gray-700 dark:text-gray-200
                               hover:bg-red-600 hover:text-white hover:border-red-600 transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal (like logout) */}
      {confirmId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => (deleting ? null : setConfirmId(null))}
          />

          <div className="relative w-[92%] max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-white/10 p-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete notification?
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete this notification?
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-4 sm:justify-between">
              {/* YES */}
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl
                           border-2 border-gray-300 dark:border-white/20
                           text-gray-800 dark:text-gray-200
                           hover:border-red-500 hover:text-red-600
                           hover:bg-red-50 dark:hover:bg-red-500/10
                           transition-all duration-200 font-semibold cursor-pointer
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>

              {/* NO */}
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmId(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl
                           bg-cyan-600 text-white
                           hover:bg-cyan-700
                           transition-all duration-200 font-semibold cursor-pointer
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                No, keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}