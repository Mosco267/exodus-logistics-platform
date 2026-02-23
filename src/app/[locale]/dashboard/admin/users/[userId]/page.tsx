"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  status?: string;
  invoice?: { amount?: number; currency?: string; paid?: boolean; paidAt?: string | null };
  createdAt?: string;
};

type UserDetail = { id: string; name?: string; email?: string };

type StatusDoc = {
  key: string;
  label: string;
  color?: string;
  defaultUpdate?: string;
  nextStep?: string;
};

const normalizeKey = (v: string) =>
  (v ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

export default function AdminUserDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const userId = decodeURIComponent((params?.userId as string) || "");

  // ✅ focusShipment support (from AdminHeader search suggestion)
  const focusShipment = useMemo(() => {
    return String(searchParams?.get("focusShipment") || "").trim();
  }, [searchParams]);

  // ✅ Create Notification states
  const [nTitle, setNTitle] = useState("");
  const [nMessage, setNMessage] = useState("");
  const [nShipmentId, setNShipmentId] = useState("");
  const [nSending, setNSending] = useState(false);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // per shipment selected status KEY (e.g. "customclearance")
  const [draftKey, setDraftKey] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  // focused row UI highlight
  const [focusedRow, setFocusedRow] = useState<string>("");

  const statusByKey = useMemo(() => {
    const m: Record<string, StatusDoc> = {};
    for (const s of statuses) m[normalizeKey(s.key)] = s;
    return m;
  }, [statuses]);

  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [statuses]);

  const sendNotification = async () => {
    if (!user) return;

    if (!nTitle.trim() || !nMessage.trim()) {
      alert("Please enter title and message.");
      return;
    }

    setNSending(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          title: nTitle.trim(),
          message: nMessage.trim(),
          shipmentId: nShipmentId.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json?.error || "Failed to send notification");
        return;
      }

      setNTitle("");
      setNMessage("");
      setNShipmentId("");

      setMsg("Notification sent ✅");
      window.setTimeout(() => setMsg(""), 2000);
    } finally {
      setNSending(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
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

      const userData: UserDetail | null = uj?.user ?? null;
      const shipmentList: Shipment[] = Array.isArray(sj?.shipments) ? sj.shipments : [];
      const statusList: StatusDoc[] = Array.isArray(stj?.statuses) ? stj.statuses : [];

      setUser(userData);
      setShipments(shipmentList);
      setStatuses(statusList);

      // Build draft based on fetched statuses (avoid stale state)
      const localStatusByKey: Record<string, StatusDoc> = {};
      const localKeyByLabel: Record<string, string> = {};
      for (const st of statusList) {
        localStatusByKey[normalizeKey(st.key)] = st;
        localKeyByLabel[String(st.label || "").toLowerCase()] = normalizeKey(st.key);
      }

      const nextDraft: Record<string, string> = {};
      for (const sh of shipmentList) {
        const raw = String(sh.status || "").trim(); // label or key
        const asKey = normalizeKey(raw);

        if (localStatusByKey[asKey]) {
          nextDraft[sh.shipmentId] = asKey;
          continue;
        }

        const fromLabel = localKeyByLabel[raw.toLowerCase()];
        if (fromLabel) {
          nextDraft[sh.shipmentId] = fromLabel;
          continue;
        }

        nextDraft[sh.shipmentId] = "";
      }

      setDraftKey(nextDraft);
    } catch {
      setUser(null);
      setShipments([]);
      setStatuses([]);
      setDraftKey({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ Auto-fill notification shipmentId when opened via search suggestion
  useEffect(() => {
    if (!focusShipment) return;
    setNShipmentId((prev) => (prev ? prev : focusShipment));
  }, [focusShipment]);

  // ✅ Auto-scroll + highlight focused shipment after data loads
  useEffect(() => {
    if (loading) return;
    if (!focusShipment) return;

    const id = `shipment-row-${focusShipment}`;
    const el = document.getElementById(id);

    if (!el) return;

    setFocusedRow(focusShipment);

    // scroll smoothly
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // remove highlight after a few seconds
    const t = window.setTimeout(() => setFocusedRow(""), 4500);
    return () => window.clearTimeout(t);
  }, [loading, focusShipment]);

  const togglePaid = async (shipmentId: string, currentPaid: boolean) => {
    setMsg("");

    const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice: { paid: !currentPaid } }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || "Failed to update invoice");
      return;
    }

    setShipments((prev) =>
      prev.map((s) => (s.shipmentId === shipmentId ? (json?.shipment as Shipment) : s))
    );

    setMsg("Invoice updated ✅");
    window.setTimeout(() => setMsg(""), 2000);
  };

  const updateStatus = async (shipmentId: string) => {
    setMsg("");
    setSavingId(shipmentId);

    try {
      const key = normalizeKey(draftKey[shipmentId] || "");
      if (!key) {
        alert("Please choose a status.");
        return;
      }

      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // ✅ send KEY, API converts to label + defaults
        body: JSON.stringify({ status: key }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json?.error || "Failed to update status");
        return;
      }

      setShipments((prev) =>
        prev.map((x) => (x.shipmentId === shipmentId ? (json?.shipment as Shipment) : x))
      );

      const label = statusByKey[key]?.label || "Status";
      setMsg(`Shipment updated to “${label}” ✅`);
      window.setTimeout(() => setMsg(""), 2200);
    } finally {
      setSavingId("");
    }
  };

  const goToAdminShipment = (shipmentId: string) => {
    // ✅ Admin-only route (NOT /dashboard/status)
    router.push(`/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              Admin • User
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Update shipment status, invoice status, and send notifications.
            </p>
            {msg && (
              <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-300">
                {msg}
              </p>
            )}
          </div>

          <Link
            href={`/${locale}/dashboard/admin/users`}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10
                       bg-white/70 dark:bg-white/5 text-gray-900 dark:text-gray-100 font-semibold
                       hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-cyan-500 dark:hover:border-cyan-500
                       transition cursor-pointer"
          >
            Back to users
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        ) : !user ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">User not found.</p>
        ) : (
          <>
            {/* User card */}
            <div className="mt-5 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {user.name || "Unnamed user"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{user.email || "—"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.id}</p>
            </div>

            {/* ✅ Create Notification */}
            <div
              id="notify"
              className="mt-6 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  Create Notification
                </h2>

                <button
                  onClick={sendNotification}
                  disabled={nSending}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold
                             hover:bg-blue-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {nSending ? "Sending…" : "Send"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Title
                  </label>
                  <input
                    value={nTitle}
                    onChange={(e) => setNTitle(e.target.value)}
                    placeholder="e.g. Shipment delayed"
                    className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                               bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Message
                  </label>
                  <textarea
                    value={nMessage}
                    onChange={(e) => setNMessage(e.target.value)}
                    placeholder="Write the notification message to the user…"
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                               bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Shipment ID (optional)
                  </label>
                  <input
                    value={nShipmentId}
                    onChange={(e) => setNShipmentId(e.target.value)}
                    placeholder="e.g. EXS-260222-9BC87D"
                    className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                               bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Optional: attach a shipment ID to give context.
                  </p>
                </div>
              </div>
            </div>

            {/* Shipments */}
            <div className="mt-6">
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                Shipment history
              </h2>

              {shipments.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  No shipments linked to this user yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm min-w-[980px] border-collapse">
                    <thead className="border-b border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                      <tr>
                        <th className="py-3 px-3 text-left font-semibold">Shipment ID</th>
                        <th className="py-3 px-3 text-left font-semibold">Tracking</th>
                        <th className="py-3 px-3 text-left font-semibold">Status</th>
                        <th className="py-3 px-3 text-left font-semibold">Invoice</th>
                        <th className="py-3 px-3 text-left font-semibold">Action</th>
                      </tr>
                    </thead>

                    <tbody className="text-gray-800 dark:text-gray-100">
                      {shipments.map((s) => {
                        const paid = Boolean(s?.invoice?.paid);
                        const amount = Number(s?.invoice?.amount ?? 0);
                        const currency = String(s?.invoice?.currency || "USD").toUpperCase();

                        const currentDraft = draftKey[s.shipmentId] || "";
                        const draftLabel = currentDraft
                          ? statusByKey[normalizeKey(currentDraft)]?.label
                          : "";

                        const isFocused = focusedRow && focusedRow === s.shipmentId;

                        return (
                          <tr
                            id={`shipment-row-${s.shipmentId}`}
                            key={s.shipmentId}
                            className={[
                              "border-b border-gray-100 dark:border-white/10 transition",
                              "hover:bg-blue-50/60 dark:hover:bg-white/5",
                              isFocused ? "bg-blue-50/70 dark:bg-cyan-500/10 ring-2 ring-blue-500/40" : "",
                            ].join(" ")}
                          >
                            <td className="py-3 px-3 font-semibold whitespace-nowrap">{s.shipmentId}</td>
                            <td className="py-3 px-3 whitespace-nowrap">{s.trackingNumber}</td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <select
                                  value={currentDraft}
                                  onChange={(e) =>
                                    setDraftKey((prev) => ({
                                      ...prev,
                                      [s.shipmentId]: e.target.value,
                                    }))
                                  }
                                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10
                                             bg-white dark:bg-white/5 text-sm cursor-pointer"
                                >
                                  <option value="">Select status…</option>
                                  {sortedStatuses.map((st) => (
                                    <option key={st.key} value={normalizeKey(st.key)}>
                                      {st.label}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => updateStatus(s.shipmentId)}
                                  disabled={savingId === s.shipmentId}
                                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold
                                             hover:bg-blue-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {savingId === s.shipmentId ? "Updating…" : "Update"}
                                </button>
                              </div>

                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Current: <span className="font-semibold">{s.status || "—"}</span>
                                {draftLabel ? (
                                  <>
                                    {" "}
                                    • Selected: <span className="font-semibold">{draftLabel}</span>
                                  </>
                                ) : null}
                              </p>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-semibold">
                                {currency} {amount.toLocaleString()}
                              </span>
                              <span
                                className={`ml-2 text-xs font-bold px-2 py-1 rounded-full border ${
                                  paid
                                    ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/20"
                                    : "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/20"
                                }`}
                              >
                                {paid ? "PAID" : "UNPAID"}
                              </span>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <button
                                onClick={() => togglePaid(s.shipmentId, paid)}
                                className={`px-4 py-2 rounded-xl font-semibold border transition cursor-pointer ${
                                  paid
                                    ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                    : "bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-white/10 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-cyan-500 dark:hover:border-cyan-500"
                                }`}
                              >
                                Mark as {paid ? "Unpaid" : "Paid"}
                              </button>

                              {/* ✅ Admin-only view (no user dashboard/status) */}
                              <button
                                type="button"
                                onClick={() => goToAdminShipment(s.shipmentId)}
                                className="ml-3 text-sm font-semibold text-blue-700 dark:text-cyan-300 hover:underline cursor-pointer"
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {statuses.length === 0 && (
                    <p className="mt-4 text-sm text-orange-700 dark:text-orange-300">
                      No statuses found. Create statuses in Admin → Statuses first.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}