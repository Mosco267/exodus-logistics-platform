"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Printer, FileText, Truck, Calendar, MapPin, User, Mail, Package } from "lucide-react";

type InvoiceApi = {
  invoiceNumber: string;
  status: "paid" | "pending";
  currency: string;
  total: number;
  paid: boolean;
  paidAt?: string | null;

  declaredValue?: number;
  declaredValueCurrency?: string;

  breakdown?: {
    declaredValue?: number;

    shipping?: number;
    insurance?: number;
    fuel?: number;
    customs?: number;
    tax?: number;
    discount?: number;
    subtotal?: number;
    total?: number;

    rates?: Record<string, any>;
    percentages?: Record<string, any>;
    pricing?: Record<string, any>;

    [key: string]: any;
  };

  shipment: {
    shipmentId: string;
    trackingNumber: string;
    origin: string;
    destination: string;
    status: string;

    shipmentType?: string | null;
    serviceLevel?: string | null;
    weightKg?: number | null;
    dimensionsCm?: { length?: number; width?: number; height?: number } | null;

    senderCountry?: string | null;
    senderState?: string | null;
    senderCity?: string | null;
    senderAddress?: string | null;

    receiverCountry?: string | null;
    receiverState?: string | null;
    receiverCity?: string | null;
    receiverAddress?: string | null;
  };

  parties: {
    senderName: string;
    receiverName: string;
    senderEmail?: string;
    receiverEmail?: string;
  };

  dates: {
    createdAt?: string | null;
    updatedAt?: string | null;
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
    case "NGN":
      return "₦";
    default:
      return "$";
  }
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function toPct(rate: any): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(2).replace(/\.00$/, "")}%`;
}

function formatNumber(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function money(sym: string, v: any) {
  return `${sym} ${formatNumber(v)}`;
}

function pickRate(breakdown: any, key: string) {
  const k = String(key || "").trim(); // e.g. "shippingRate"
  const baseKey = k.toLowerCase().endsWith("rate") ? k.slice(0, -4) : k; // "shipping"

  const candidates = [k, `${baseKey}Rate`, baseKey];
  const sources = [breakdown?.rates, breakdown?.percentages, breakdown?.pricing, breakdown];

  for (const src of sources) {
    if (!src) continue;
    for (const c of candidates) {
      if (src?.[c] !== undefined && src?.[c] !== null) return src[c];
    }
  }
  return null;
}

function pickAmount(breakdown: any, key: string) {
  return breakdown?.[key] ?? breakdown?.amounts?.[key] ?? breakdown?.charges?.[key] ?? null;
}

function joinNice(parts: Array<any>) {
  return parts
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
}

export default function FullInvoicePage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const sp = useSearchParams();

  const q = useMemo(() => String(sp.get("q") || sp.get("tracking") || "").trim(), [sp]);

  const [data, setData] = useState<InvoiceApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!q) {
        setErr("Missing tracking/shipment query.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");
      setData(null);

      try {
        const res = await fetch(`/api/invoice?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setErr(json?.error || "Invoice not available.");
          return;
        }

        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Invoice not available.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [q]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 flex items-center justify-center">
        <p className="text-gray-700 font-semibold">Loading invoice…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6">
          <p className="text-lg font-extrabold text-gray-900">Invoice not available</p>
          <p className="mt-2 text-sm text-gray-700">{err || "Please check your tracking number."}</p>
          <Link
            href={`/${locale}/invoice`}
            className="mt-5 inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            <FileText className="w-5 h-5 mr-2" /> Go to Invoice page
          </Link>
        </div>
      </div>
    );
  }

  const sym = currencySymbol(data.currency);

  const statusBadge =
    data.status === "paid"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";

  const trackingOrShipment =
    String(data.shipment?.trackingNumber || "").trim() ||
    String(data.shipment?.shipmentId || "").trim() ||
    q;

  const receiverEmail = String(data.parties?.receiverEmail || data.parties?.senderEmail || "").trim();
  const breakdown = (data as any)?.breakdown || null;

  const rows = [
    { key: "shipping", label: "Shipping", rateKey: "shippingRate" },
    { key: "insurance", label: "Insurance", rateKey: "insuranceRate" },
    { key: "fuel", label: "Fuel", rateKey: "fuelRate" },
    { key: "customs", label: "Customs / Duties", rateKey: "customsRate" },
    { key: "tax", label: "Tax", rateKey: "taxRate" },
    { key: "discount", label: "Discount", rateKey: "discountRate" },
  ];

  const subtotalToShow = Number(pickAmount(breakdown, "subtotal") ?? 0);

  const totalToShow =
    Number.isFinite(Number(pickAmount(breakdown, "total")))
      ? Number(pickAmount(breakdown, "total"))
      : Number.isFinite(Number(data.total))
        ? Number(data.total)
        : 0;

  const declaredToShowRaw =
    (data as any)?.declaredValue ??
    (data as any)?.breakdown?.declaredValue ??
    0;

  const declaredToShow = Number(declaredToShowRaw);

  // Shipment details for new box
  const shipmentType = String(data.shipment?.shipmentType || "").trim();
  const serviceLevel = String(data.shipment?.serviceLevel || "").trim();
  const weightKg = data.shipment?.weightKg;
  const dims = data.shipment?.dimensionsCm || null;

  const fromFull =
  joinNice([
    data.shipment?.senderCity,
    data.shipment?.senderState,
    data.shipment?.senderCountry || data.shipment?.origin,
  ]) || String(data.shipment?.origin || "—");

const toFull =
  joinNice([
    data.shipment?.receiverCity,
    data.shipment?.receiverState,
    data.shipment?.receiverCountry || data.shipment?.destination,
  ]) || String(data.shipment?.destination || "—");

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #invoice-print-area, #invoice-print-area * { visibility: visible; }
            #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      <div className="max-w-5xl mx-auto px-4">
        {/* Top actions */}
        <div className="no-print flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
          <Link
            href={`/${locale}/invoice`}
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                       hover:border-blue-600 hover:text-blue-700 transition"
          >
            <FileText className="w-5 h-5 mr-2" /> Back to Invoice
          </Link>

          <div className="flex gap-3 flex-col sm:flex-row">
            <Link
              href={`/${locale}/track?q=${encodeURIComponent(trackingOrShipment)}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                         hover:border-blue-600 hover:text-blue-700 transition"
            >
              <Truck className="w-5 h-5 mr-2" /> Track Shipment
            </Link>

            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              <Printer className="w-5 h-5 mr-2" /> Print
            </button>
          </div>
        </div>

        <motion.div
          id="invoice-print-area"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-white to-blue-900 via-blue-800 to-cyan-800 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src="/logo.svg" alt="Exodus Logistics" className="h-12 w-auto" />
                <div>
                  <p className="text-xl font-extrabold">Exodus Logistics</p>
                  <p className="text-white/80 text-sm">Invoice</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-white/80 text-sm">Invoice #</p>
                <p className="text-2xl font-extrabold">{data.invoiceNumber}</p>
                <span
                  className={`inline-flex mt-2 items-center px-3 py-1 rounded-full border text-xs font-extrabold bg-white/95 ${statusBadge}`}
                >
                  {data.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            {/* Key data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  Created
                </p>
                <p className="mt-1 font-extrabold text-gray-900">{formatDate(data.dates?.createdAt)}</p>
              </div>

              {/* ✅ Shipment box (CLEAN) */}
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-gray-500" />
                  Shipment
                </p>
                <p className="mt-1 font-extrabold text-gray-900">{data.shipment.shipmentId || "—"}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Tracking: <span className="font-semibold">{data.shipment.trackingNumber || "—"}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="mt-1 text-2xl font-extrabold text-blue-700">{money(sym, totalToShow)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {data.paid ? `Paid on ${formatDate(data.paidAt || null)}` : "Payment pending"}
                </p>
              </div>
            </div>

            {/* Parties + Route */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="font-extrabold text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  Parties
                </p>

                <div className="mt-3">
                  <p className="text-sm text-gray-600">Sender</p>
                  <p className="font-bold text-gray-900">{data.parties.senderName || "Sender"}</p>

                  {data.parties?.senderEmail ? (
  <p className="mt-1 text-sm text-gray-700 flex items-center">
    <Mail className="w-4 h-4 mr-2 text-gray-400" />
    {data.parties.senderEmail}
  </p>
) : null}
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600">Receiver</p>
                  <p className="font-bold text-gray-900">{data.parties.receiverName || "Receiver"}</p>

                  {receiverEmail ? (
                    <p className="mt-1 text-sm text-gray-700 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {receiverEmail}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="font-extrabold text-gray-900 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  Route
                </p>

                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-semibold">From:</span> {fromFull || "—"}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">To:</span> {toFull || "—"}
                </p>

                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Current status:</span>{" "}
                    <span className="font-semibold text-blue-700">{data.shipment.status || "—"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ NEW Shipment Details box UNDER Route */}
            <div className="mt-4 rounded-2xl border border-gray-200 p-5">
              <p className="font-extrabold text-gray-900 flex items-center">
                <Package className="w-4 h-4 mr-2 text-gray-500" />
                Shipment details
              </p>

              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <p>
                  <span className="font-semibold">Declared value:</span> {money(sym, declaredToShow)}
                </p>

                <p>
                  <span className="font-semibold">Service level:</span> {serviceLevel || "—"}
                </p>

                <p>
                  <span className="font-semibold">Shipment type:</span> {shipmentType || "—"}
                </p>

                <p>
                  <span className="font-semibold">Weight:</span>{" "}
                  {Number.isFinite(Number(weightKg)) ? `${Number(weightKg).toLocaleString()} kg` : "—"}
                </p>

                <p>
                  <span className="font-semibold">Dimensions:</span>{" "}
                  {dims?.length || dims?.width || dims?.height
                    ? `${Number(dims?.length || 0)} × ${Number(dims?.width || 0)} × ${Number(dims?.height || 0)} cm`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Charges */}
            <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="font-extrabold text-gray-900">Charges</p>
                <p className="text-sm text-gray-600">
                  {breakdown ? "Breakdown calculated from declared value." : "(Breakdown not found from API yet — showing total only.)"}
                </p>
              </div>

              <div className="p-5 space-y-3">
                {breakdown ? (
                  <>
                    {rows.map((r) => {
                      const amt = pickAmount(breakdown, r.key);
                      const rate = pickRate(breakdown, r.rateKey);

                      const isDiscount = r.key === "discount";
                      const amountNum = Number(amt ?? 0);
                      const displayAmount = isDiscount && amountNum > 0 ? -amountNum : amountNum;

                      return (
                        <div key={r.key} className="flex justify-between text-sm text-gray-700">
                          <span>
                            {r.label} <span className="text-gray-500">({toPct(rate)})</span>
                          </span>
                          <span className="font-semibold">{money(sym, displayAmount)}</span>
                        </div>
                      );
                    })}

                    <div className="pt-3 border-t border-gray-200 flex justify-between text-sm text-gray-700">
                      <span className="font-semibold">Subtotal</span>
                      <span className="font-semibold">{money(sym, subtotalToShow)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Shipment charges</span>
                    <span className="font-semibold">{money(sym, totalToShow)}</span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-lg">
                  <span className="font-extrabold text-gray-900">Total</span>
                  <span className="font-extrabold text-blue-700">{money(sym, totalToShow)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs text-gray-500">
              <p>This invoice was generated by Exodus Logistics. If you need assistance, please contact support.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}