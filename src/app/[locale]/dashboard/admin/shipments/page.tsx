'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  senderCountryCode?: string;
  destinationCountryCode?: string;

  status?: string;
  statusColor?: string;
  statusNote?: string;
  nextStep?: string;

  invoice?: {
    amount?: number;
    currency?: string;
    paid?: boolean;
    paidAt?: string | null;
  };

  createdAt?: string;
};

type StatusDoc = {
  key: string;            // e.g. "invalidaddress"
  label: string;          // e.g. "Invalid Address"
  color: string;
  defaultUpdate?: string;
  nextStep?: string;
};

const normalizeKey = (v?: string) =>
  (v ?? '').toLowerCase().trim().replace(/[\s_-]+/g, '');

export default function AdminShipmentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // per-shipment selected status key
  const [selectedKey, setSelectedKey] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string>('');

  const statusByKey = useMemo(() => {
    const m: Record<string, StatusDoc> = {};
    for (const s of statuses) m[normalizeKey(s.key)] = s;
    return m;
  }, [statuses]);

  const statusKeyByLabel = useMemo(() => {
    // helpful if a shipment currently stores "Invalid Address" (label)
    const m: Record<string, string> = {};
    for (const s of statuses) m[normalizeKey(s.label)] = normalizeKey(s.key);
    return m;
  }, [statuses]);

  const fetchAll = async () => {
    setLoading(true);
    setMsg('');
    try {
      const [shipRes, statusRes] = await Promise.all([
        fetch('/api/shipments/recent', { cache: 'no-store' }),
        fetch('/api/statuses', { cache: 'no-store' }),
      ]);

      const shipJson = await shipRes.json();
      const statusJson = await statusRes.json();

      const list: Shipment[] = Array.isArray(shipJson?.results) ? shipJson.results : [];
      const statusList: StatusDoc[] = Array.isArray(statusJson?.statuses) ? statusJson.statuses : [];

      setShipments(list);
      setStatuses(statusList);

      // initialize dropdown values for each shipment
      const init: Record<string, string> = {};
      for (const sh of list) {
        const current = normalizeKey(sh.status);
        // If shipment stores label, map label -> key
        const mapped = statusKeyByLabel[current] || current;

        // If we can’t find it in DB, keep it as-is (fallback)
        init[sh.shipmentId] = mapped;
      }
      setSelectedKey(init);
    } catch {
      setShipments([]);
      setStatuses([]);
      setSelectedKey({});
      setMsg('Failed to load shipments/statuses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePaid = async (shipmentId: string, currentPaid: boolean) => {
    const nextPaid = !currentPaid;

    const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice: { paid: nextPaid },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json?.error || 'Failed to update invoice payment');
      return;
    }

    setShipments((prev) =>
      prev.map((s) => (s.shipmentId === shipmentId ? (json?.shipment as Shipment) : s))
    );

    setMsg(nextPaid ? 'Invoice marked as PAID ✅' : 'Invoice marked as UNPAID ✅');
    window.setTimeout(() => setMsg(''), 1800);
  };

  const updateStatus = async (shipmentId: string) => {
    const key = normalizeKey(selectedKey[shipmentId] || '');
    if (!key) return;

    setSavingKey((p) => ({ ...p, [shipmentId]: true }));
    setMsg('');

    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },

        // ✅ IMPORTANT: send the STATUS KEY, not the label
        // Your PATCH route looks up statuses by key and then applies:
        // label, color, defaultUpdate (statusNote), nextStep
        body: JSON.stringify({
          status: key,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || 'Failed to update status.');
        return;
      }

      setShipments((prev) =>
        prev.map((s) => (s.shipmentId === shipmentId ? (json?.shipment as Shipment) : s))
      );

      const label = statusByKey[key]?.label || 'Status';
      setMsg(`Shipment updated to “${label}” ✅`);
      window.setTimeout(() => setMsg(''), 2000);
    } catch {
      setMsg('Network error while updating status.');
    } finally {
      setSavingKey((p) => ({ ...p, [shipmentId]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              ADMIN TEST 123
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Update shipment status + toggle invoice paid/unpaid.
            </p>
          </div>

          <button
            onClick={fetchAll}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10
                       bg-white/70 dark:bg-white/5 text-gray-900 dark:text-gray-100 font-semibold
                       hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {msg && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900
                          dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200">
            {msg}
          </div>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        ) : shipments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">No shipments found.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px] border-collapse">
              <thead className="border-b border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="py-3 px-3 text-left font-semibold">Shipment ID</th>
                  <th className="py-3 px-3 text-left font-semibold">Tracking #</th>
                  <th className="py-3 px-3 text-left font-semibold">Route</th>
                  <th className="py-3 px-3 text-left font-semibold">Status</th>
                  <th className="py-3 px-3 text-left font-semibold">Invoice</th>
                  <th className="py-3 px-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="text-gray-800 dark:text-gray-100">
                {shipments.map((s) => {
                  const paid = Boolean(s?.invoice?.paid);
                  const amount = Number(s?.invoice?.amount ?? 0);
                  const currency = String(s?.invoice?.currency || 'USD').toUpperCase();

                  const currentKey = normalizeKey(selectedKey[s.shipmentId] || s.status || '');
                  const statusLabel =
                    statusByKey[currentKey]?.label ||
                    s.status ||
                    '—';

                  return (
                    <tr
                      key={s.shipmentId}
                      className="border-b border-gray-100 dark:border-white/10 hover:bg-blue-50/60 dark:hover:bg-white/5 transition"
                    >
                      <td className="py-3 px-3 font-semibold whitespace-nowrap">{s.shipmentId}</td>

                      <td className="py-3 px-3 whitespace-nowrap">{s.trackingNumber}</td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {(s.senderCountryCode || '—').toUpperCase()} → {(s.destinationCountryCode || '—').toUpperCase()}
                      </td>

                      {/* ✅ STATUS DROPDOWN (dynamic from DB) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <select
                            value={currentKey}
                            onChange={(e) =>
                              setSelectedKey((p) => ({ ...p, [s.shipmentId]: e.target.value }))
                            }
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10
                                       bg-white dark:bg-white/5 text-sm cursor-pointer"
                          >
                            {/* Show all admin statuses */}
                            {statuses.map((st) => (
                              <option key={st.key} value={normalizeKey(st.key)}>
                                {st.label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => updateStatus(s.shipmentId)}
                            disabled={Boolean(savingKey[s.shipmentId])}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold
                                       hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer"
                          >
                            {savingKey[s.shipmentId] ? 'Updating…' : 'Update'}
                          </button>
                        </div>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Current: <span className="font-semibold">{statusLabel}</span>
                        </p>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold">
                          {currency} {amount.toLocaleString()}
                        </span>

                        <span
                          className={`ml-2 text-xs font-bold px-2 py-1 rounded-full border ${
                            paid
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/20'
                              : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/20'
                          }`}
                        >
                          {paid ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          onClick={() => togglePaid(s.shipmentId, paid)}
                          className={`px-4 py-2 rounded-xl font-semibold border transition cursor-pointer ${
                            paid
                              ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                              : 'bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-white/10 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:hover:bg-cyan-500 dark:hover:border-cyan-500'
                          }`}
                        >
                          Mark as {paid ? 'Unpaid' : 'Paid'}
                        </button>

                        <Link
                          href={`/${locale}/dashboard/status/${encodeURIComponent(s.shipmentId)}`}
                          className="ml-3 text-sm font-semibold text-blue-700 dark:text-cyan-300 hover:underline cursor-pointer"
                        >
                          View →
                        </Link>
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