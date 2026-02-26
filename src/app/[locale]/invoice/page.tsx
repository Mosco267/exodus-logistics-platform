"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Eye, FileText, Package, MapPin, User, Mail } from "lucide-react";

type InvoiceApi = {
  invoiceNumber: string;
  status: "paid" | "pending";
  currency: string;
  total: number;
  paid: boolean;
  paidAt?: string | null;

  shipment: {
    shipmentId: string;
    trackingNumber: string;
    origin: string;
    destination: string;
    status: string;
  };

  parties: {
    senderName: string;
    receiverName: string;
    senderEmail?: string;
    receiverEmail?: string;
  };
};

const currencySymbol = (code: string) => {
  switch (String(code).toUpperCase()) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return "$";
  }
};

export default function InvoicePage() {
  const sp = useSearchParams();
  const qFromUrl = useMemo(() => String(sp.get("q") || sp.get("tracking") || "").trim(), [sp]);

  const [q, setQ] = useState("");
  const [data, setData] = useState<InvoiceApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (qFromUrl) {
      setQ(qFromUrl.toUpperCase());
      void load(qFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl]);

  const load = async (value?: string) => {
    const query = String(value ?? q).trim();
    if (!query) {
      setErr("Enter a Shipment ID or Tracking Number.");
      return;
    }

    setLoading(true);
    setErr("");
    setData(null);

    try {
      const res = await fetch(`/api/invoice?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Invoice unavailable. Try again later.");
        return;
      }

      setData(json);
    } catch (e: any) {
      setErr(e?.message || "Invoice unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const badgeClass =
    data?.status === "paid"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">Invoice</h1>
          <p className="mt-2 text-gray-600">View invoice using Shipment ID or Tracking Number.</p>
        </div>

        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
        >
          <label className="text-sm font-semibold text-gray-700">Shipment ID / Tracking</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            placeholder="e.g. EXS-260222-9BC87D or EX-24-US-123456"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold
                       hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center"
          >
            {loading ? (
              "Loading…"
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" /> View Invoice
              </>
            )}
          </button>

          {err && (
            <div className="mt-4 flex items-center text-red-600 font-semibold">
              <AlertCircle className="w-5 h-5 mr-2" />
              {err}
            </div>
          )}
        </motion.form>

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">Invoice Number</p>
                <p className="text-2xl font-extrabold text-gray-900">{data.invoiceNumber}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Shipment: <span className="font-semibold">{data.shipment.shipmentId}</span> • Tracking:{" "}
                  <span className="font-semibold">{data.shipment.trackingNumber}</span>
                </p>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-extrabold ${badgeClass}`}>
                  {data.status.toUpperCase()}
                </span>
                <p className="mt-2 text-xl font-extrabold text-blue-700">
                  {currencySymbol(data.currency)} {Number(data.total || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="font-extrabold text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  Parties
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">Sender:</span> {data.parties.senderName}
                </p>
                {data.parties.senderEmail ? (
                  <p className="text-sm text-gray-700 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {data.parties.senderEmail}
                  </p>
                ) : null}

                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-semibold">Receiver:</span> {data.parties.receiverName}
                </p>
                {data.parties.receiverEmail ? (
                  <p className="text-sm text-gray-700 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {data.parties.receiverEmail}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="font-extrabold text-gray-900 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-gray-500" />
                  Shipment
                </p>
                <p className="mt-2 text-sm text-gray-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {data.shipment.origin} → {data.shipment.destination}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">Status:</span> {data.shipment.status}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/invoice/full?tracking=${encodeURIComponent(data.shipment.trackingNumber || data.shipment.shipmentId)}`}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                <Eye className="w-5 h-5 mr-2" />
                View Full Invoice
              </Link>

              <Link
                href={`/track?q=${encodeURIComponent(data.shipment.trackingNumber || data.shipment.shipmentId)}`}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-700 transition"
              >
                Track Shipment
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}