'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  invoiceNumber?: string;

  senderName?: string;
  senderEmail?: string;
  receiverName?: string;
  receiverEmail?: string;

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
    status?: string;
    invoiceNumber?: string;
  };

  createdAt?: string;
};

type StatusDoc = {
  key: string;
  label: string;
  color: string;
  defaultUpdate?: string;
  nextStep?: string;
};

const normalizeKey = (v?: string) =>
  (v ?? '').toLowerCase().trim().replace(/[\s_-]+/g, '');

async function copyToClipboard(text: string) {
  const v = String(text || '').trim();
  if (!v) return;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(v);
    return;
  }

  const ta = document.createElement('textarea');
  ta.value = v;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export default function AdminShipmentsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  

  const [copiedKey, setCopiedKey] = useState<string>('');
  const [openMenuId, setOpenMenuId] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedKey, setSelectedKey] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string>('');

  const statusByKey = useMemo(() => {
    const m: Record<string, StatusDoc> = {};
    for (const s of statuses) m[normalizeKey(s.key)] = s;
    return m;
  }, [statuses]);

  const statusKeyByLabel = useMemo(() => {
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

      const init: Record<string, string> = {};
      for (const sh of list) {
        const current = normalizeKey(sh.status);
        const mapped = statusKeyByLabel[current] || current;
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

  const updateStatus = async (shipmentId: string) => {
    const key = normalizeKey(selectedKey[shipmentId] || '');
    if (!key) return;

    setSavingKey((p) => ({ ...p, [shipmentId]: true }));
    setMsg('');

    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  const deleteShipment = async (shipmentId: string) => {
  setDeletingId(shipmentId);
  setMsg('');

  try {
    const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
      method: 'DELETE',
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setMsg(json?.error || 'Failed to delete shipment.');
      return;
    }

    setShipments((prev) => prev.filter((s) => s.shipmentId !== shipmentId));
    setMsg(`Shipment ${shipmentId} deleted successfully.`);
  } catch {
    setMsg('Network error while deleting shipment.');
  } finally {
    setDeletingId('');
    setConfirmDeleteId('');
  }
};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              ADMIN DASHBOARD: SHIPMENTS
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Update shipment status and manage shipment records.
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
                  <th className="py-3 px-3 text-left font-semibold">Sender</th>
                  <th className="py-3 px-3 text-left font-semibold">Receiver</th>
                  <th className="py-3 px-3 text-left font-semibold">Route</th>
                  <th className="py-3 px-3 text-left font-semibold">Status</th>
                  <th className="py-3 px-3 text-left font-semibold">Invoice</th>
                  <th className="py-3 px-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="text-gray-800 dark:text-gray-100">
                {shipments.map((s) => {
                  const invoiceStatus = String(s?.invoice?.status || (s?.invoice?.paid ? "paid" : "unpaid")).toLowerCase();
const amount = Number(s?.invoice?.amount ?? 0);
const currency = String(s?.invoice?.currency || 'USD').toUpperCase();

                  // ✅ invoice number can come either as top-level or inside invoice
                  const invNo =
                    String(s?.invoiceNumber || s?.invoice?.invoiceNumber || '').trim() || '';

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
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{s.shipmentId}</div>
                          <button
                            type="button"
                            onClick={async () => {
                              await copyToClipboard(s.shipmentId);
                              setCopiedKey(`ship-${s.shipmentId}`);
                              window.setTimeout(() => setCopiedKey(''), 1200);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-1 hover:bg-gray-50"
                          >
                            {copiedKey === `ship-${s.shipmentId}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>

                      {/* ✅ Tracking + Invoice number (invoice shown as its own line/row in this cell) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{s.trackingNumber}</div>
                          <button
                            type="button"
                            onClick={async () => {
                              await copyToClipboard(s.trackingNumber);
                              setCopiedKey(`track-${s.shipmentId}`);
                              window.setTimeout(() => setCopiedKey(''), 1200);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-1 hover:bg-gray-50"
                          >
                            {copiedKey === `track-${s.shipmentId}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>

                        {invNo ? (
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              Invoice: <span className="font-semibold">{invNo}</span>
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await copyToClipboard(invNo);
                                setCopiedKey(`inv-${s.shipmentId}`);
                                window.setTimeout(() => setCopiedKey(''), 1200);
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-1 hover:bg-gray-50"
                            >
                              {copiedKey === `inv-${s.shipmentId}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold">{s.senderName || '—'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {s.senderEmail || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold">{s.receiverName || '—'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {s.receiverEmail || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {(s.senderCountryCode || '—').toUpperCase()} → {(s.destinationCountryCode || '—').toUpperCase()}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
  <div className="flex items-center gap-2">
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border"
      style={{
        backgroundColor: `${s.statusColor || "#e5e7eb"}22`,
        color: s.statusColor || "#1f2937",
        borderColor: `${s.statusColor || "#d1d5db"}55`,
      }}
    >
      {s.status || "—"}
    </span>
  </div>

  {s.statusNote ? (
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-[220px] truncate">
      {s.statusNote}
    </p>
  ) : null}
</td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold">
                          {currency} {amount.toLocaleString()}
                        </span>

                        <span
  className={`ml-2 text-xs font-bold px-2 py-1 rounded-full border ${
    invoiceStatus === "paid"
      ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/20'
      : invoiceStatus === "overdue"
      ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/20'
      : invoiceStatus === "cancelled"
      ? 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/15 dark:text-gray-300 dark:border-gray-500/20'
      : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/20'
  }`}
>
  {invoiceStatus === "paid"
    ? "PAID"
    : invoiceStatus === "overdue"
    ? "OVERDUE"
    : invoiceStatus === "cancelled"
    ? "CANCELLED"
    : "UNPAID"}
</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap relative">
  <button
    type="button"
    onClick={() =>
      setOpenMenuId((prev) => (prev === s.shipmentId ? '' : s.shipmentId))
    }
    className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition"
  >
    <MoreVertical className="w-4 h-4" />
  </button>

  {openMenuId === s.shipmentId ? (
    <div className="absolute right-3 top-14 z-20 w-44 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
      <Link
        href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/edit`}
        className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10"
        onClick={() => setOpenMenuId('')}
      >
        Edit
      </Link>

      <Link
        href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/tracking`}
        className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10"
        onClick={() => setOpenMenuId('')}
      >
        Tracking
      </Link>

      <Link
        href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/send-email`}
        className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10"
        onClick={() => setOpenMenuId('')}
      >
        Send Email
      </Link>

      <button
        type="button"
        onClick={() => {
          setOpenMenuId('');
          setConfirmDeleteId(s.shipmentId);
        }}
        disabled={deletingId === s.shipmentId}
        className="block w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-60"
      >
        {deletingId === s.shipmentId ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  ) : null}
</td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
        {confirmDeleteId ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 p-6">
      <h3 className="text-xl font-extrabold text-gray-900">
        Delete shipment?
      </h3>
      <p className="mt-3 text-sm text-gray-600 leading-6">
        You are about to permanently delete shipment{" "}
        <span className="font-semibold text-gray-900">{confirmDeleteId}</span>.
        This action cannot be undone, and the shipment will no longer be available for tracking on your website.
      </p>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setConfirmDeleteId('')}
          className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => deleteShipment(confirmDeleteId)}
          disabled={deletingId === confirmDeleteId}
          className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
        >
          {deletingId === confirmDeleteId ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    </div>
  </div>
) : null}
      </div>
    </div>
  );
}