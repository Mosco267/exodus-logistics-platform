"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, Save } from "lucide-react";

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";

function safeStr(v: any) {
  return String(v ?? "").trim();
}
function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminEditShipmentPage() {
  const params = useParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const shipmentId = safeStr(params?.shipmentId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // editable fields
  const [declaredValue, setDeclaredValue] = useState<string>("");
  const [invoicePaid, setInvoicePaid] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("unpaid");
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>(""); // yyyy-mm-dd
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<string>("");

  const dueIso = useMemo(() => {
    const v = safeStr(invoiceDueDate);
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    // store as ISO
    return d.toISOString();
  }, [invoiceDueDate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      setOkMsg("");

      if (!shipmentId) {
        setErr("Missing shipmentId in URL.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setErr(json?.error || "Failed to load shipment.");
          return;
        }

        const sh = json?.shipment || {};
        const inv = sh?.invoice || {};

        setDeclaredValue(String(sh?.declaredValue ?? sh?.packageValue ?? ""));

        setInvoicePaid(Boolean(inv?.paid));

        // status priority:
        // - if paid true => paid
        // - else if inv.status exists => use it
        // - else unpaid
        const rawStatus = safeStr(inv?.status || inv?.invoiceStatus).toLowerCase();
        const normalized: InvoiceStatus =
          Boolean(inv?.paid) ? "paid" :
          rawStatus === "overdue" ? "overdue" :
          rawStatus === "cancelled" || rawStatus === "canceled" ? "cancelled" :
          rawStatus === "unpaid" ? "unpaid" : "unpaid";

        setInvoiceStatus(normalized);

        const due = inv?.dueDate ? String(inv.dueDate) : "";
        if (due) {
          const dd = new Date(due);
          if (!Number.isNaN(dd.getTime())) {
            // yyyy-mm-dd for input[type=date]
            const yyyy = String(dd.getFullYear());
            const mm = String(dd.getMonth() + 1).padStart(2, "0");
            const day = String(dd.getDate()).padStart(2, "0");
            setInvoiceDueDate(`${yyyy}-${mm}-${day}`);
          }
        }

        setInvoicePaymentMethod(safeStr(inv?.paymentMethod || ""));
      } catch (e: any) {
        setErr(e?.message || "Network error while loading shipment.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [shipmentId]);

  const save = async () => {
    setErr("");
    setOkMsg("");

    const dv = num(declaredValue);
    if (!Number.isFinite(dv) || dv < 0) {
      setErr("Declared value must be a valid number.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declaredValue: dv,
          invoice: {
            paid: invoicePaid,
            status: invoiceStatus,
            dueDate: dueIso,
            paymentMethod: safeStr(invoicePaymentMethod) || null,
          },
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Failed to update shipment.");
        return;
      }

      setOkMsg("Shipment updated successfully.");
      window.setTimeout(() => setOkMsg(""), 1800);
    } catch (e: any) {
      setErr(e?.message || "Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/${locale}/dashboard/admin/shipments`}
          className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 bg-white font-semibold hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>

        <div className="min-w-0">
          <p className="text-sm text-gray-600">Editing shipment</p>
          <p className="text-xl font-extrabold text-gray-900 break-all">{shipmentId || "—"}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6"
      >
        {loading ? (
          <div className="flex items-center text-gray-700">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <p className="font-extrabold text-gray-900 mb-4">Invoice fields</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Declared value</label>
                <input
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Invoice status</label>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatus)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="paid">paid</option>
                  <option value="unpaid">unpaid</option>
                  <option value="overdue">overdue</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Due date</label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Payment method</label>
                <input
                  value={invoicePaymentMethod}
                  onChange={(e) => setInvoicePaymentMethod(e.target.value)}
                  placeholder="e.g. Bank transfer / PayPal / Crypto"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Invoice paid?</p>
                  <p className="text-xs text-gray-600">Toggle paid/unpaid.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoicePaid((v) => !v)}
                  className={`px-4 py-2 rounded-xl font-bold transition ${
                    invoicePaid ? "bg-green-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {invoicePaid ? "PAID" : "UNPAID"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={[
                "mt-6 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center",
                saving ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer",
              ].join(" ")}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" /> Save Changes
                </>
              )}
            </button>

            {err && (
              <div className="mt-4 flex items-center text-red-600 font-semibold">
                <AlertCircle className="w-5 h-5 mr-2" />
                {err}
              </div>
            )}

            {okMsg && (
              <div className="mt-4 flex items-center text-green-700 font-semibold">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {okMsg}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}