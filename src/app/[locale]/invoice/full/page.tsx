"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Printer, FileText, MapPin, Calendar, User, Mail, Package, Phone } from "lucide-react";

type InvoiceApi = {
  company?: { name?: string; address?: string; phone?: string; email?: string; registrationNumber?: string };

  invoiceNumber: string;
  status: "paid" | "pending" | "overdue";
  currency: string;
  total: number;
  paid: boolean;
  paidAt?: string | null;
  dueDate?: string | null;
  paymentMethod?: string | null;

  declaredValue?: number;

  breakdown?: any;

  shipment: any;
  parties: any;
  dates: any;
};

const currencySymbol = (code: string) => {
  switch (String(code).toUpperCase()) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    case "NGN": return "₦";
    default: return "$";
  }
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatNumber(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function money(sym: string, v: any) {
  return `${sym} ${formatNumber(v)}`;
}

function toPct(rate: any): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(2).replace(/\.00$/, "")}%`;
}

function pickRate(breakdown: any, key: string) {
  const k = String(key || "").trim();
  const baseKey = k.toLowerCase().endsWith("rate") ? k.slice(0, -4) : k;
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
  return parts.map((x) => String(x || "").trim()).filter(Boolean).join(", ");
}

export default function FullInvoicePage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const sp = useSearchParams();

  const q = useMemo(() => String(sp.get("q") || "").trim(), [sp]);
  const invoice = useMemo(() => String(sp.get("invoice") || "").trim(), [sp]);
  const email = useMemo(() => String(sp.get("email") || "").trim(), [sp]);

  const [data, setData] = useState<InvoiceApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");
      setData(null);

      try {
        // ✅ If invoice+email exists -> secure
        // ✅ Else use q (tracking/shipment)
        const url =
          invoice
            ? `/api/invoice?invoice=${encodeURIComponent(invoice)}&email=${encodeURIComponent(email)}`
            : `/api/invoice?q=${encodeURIComponent(q)}`;

        if (!invoice && !q) {
          setErr("Missing invoice query.");
          setLoading(false);
          return;
        }

        const res = await fetch(url, { cache: "no-store" });
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
  }, [q, invoice, email]);

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
          <p className="mt-2 text-sm text-gray-700">{err || "Please check your query."}</p>
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
  const breakdown = data.breakdown || null;

  const rows = [
    { key: "shipping", label: "Shipping", rateKey: "shippingRate" },
    { key: "insurance", label: "Insurance", rateKey: "insuranceRate" },
    { key: "fuel", label: "Fuel", rateKey: "fuelRate" },
    { key: "customs", label: "Customs / Duties", rateKey: "customsRate" },
    { key: "tax", label: "Tax", rateKey: "taxRate" },
    { key: "discount", label: "Discount", rateKey: "discountRate" },
  ];

  const subtotalToShow = Number(pickAmount(breakdown, "subtotal") ?? 0);
  const totalToShow = Number(pickAmount(breakdown, "total") ?? data.total ?? 0);

  const fromFull =
    data.shipment?.originFull ||
    joinNice([data.shipment?.senderCity, data.shipment?.senderState, data.shipment?.senderCountry]) ||
    data.shipment?.origin ||
    "—";

  const toFull =
    data.shipment?.destinationFull ||
    joinNice([data.shipment?.receiverCity, data.shipment?.receiverState, data.shipment?.receiverCountry]) ||
    data.shipment?.destination ||
    "—";

  const company = data.company || {};
  const companyPhone = String(company.phone || "").trim();
  const companyEmail = String(company.email || "").trim();

  const statusBadge =
    data.status === "paid"
      ? "bg-green-100 text-green-800 border-green-200"
      : data.status === "overdue"
        ? "bg-red-100 text-red-800 border-red-200"
        : "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4">
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
              href={`/${locale}/track/${encodeURIComponent(data.shipment?.trackingNumber || data.shipment?.shipmentId || "")}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                         hover:border-blue-600 hover:text-blue-700 transition"
            >
              <MapPin className="w-5 h-5 mr-2" /> Track Shipment
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
          <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-white to-blue-900 via-blue-800 to-cyan-800 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xl font-extrabold">{company.name || "Exodus Logistics"}</p>
                <p className="text-white/80 text-sm">Invoice</p>

                <p className="text-white/80 text-xs mt-2">{company.address || ""}</p>

                <div className="flex flex-wrap gap-4 mt-2 text-xs text-white/90">
                  {companyPhone ? (
                    <a href={`tel:${companyPhone}`} className="inline-flex items-center gap-1 underline">
                      <Phone className="w-4 h-4" /> {companyPhone}
                    </a>
                  ) : null}
                  {companyEmail ? (
                    <a href={`mailto:${companyEmail}`} className="inline-flex items-center gap-1 underline">
                      <Mail className="w-4 h-4" /> {companyEmail}
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-white/80 text-sm">Invoice #</p>
                <p className="text-2xl font-extrabold">{data.invoiceNumber}</p>
                <span className={`inline-flex mt-2 items-center px-3 py-1 rounded-full border text-xs font-extrabold bg-white/95 ${statusBadge}`}>
                  {String(data.status).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  Created
                </p>
                <p className="mt-1 font-extrabold text-gray-900">{formatDate(data.dates?.createdAt)}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-gray-500" />
                  Shipment
                </p>
                <p className="mt-1 font-extrabold text-gray-900">{data.shipment?.shipmentId || "—"}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Tracking: <span className="font-semibold">{data.shipment?.trackingNumber || "—"}</span>
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="font-extrabold text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  Parties
                </p>

                <div className="mt-3">
                  <p className="text-sm text-gray-600">Sender</p>
                  <p className="font-bold text-gray-900">{data.parties?.senderName || "Sender"}</p>
                  {data.parties?.senderEmail ? (
                    <p className="mt-1 text-sm text-gray-700 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {data.parties.senderEmail}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600">Receiver</p>
                  <p className="font-bold text-gray-900">{data.parties?.receiverName || "Receiver"}</p>
                  {data.parties?.receiverEmail ? (
                    <p className="mt-1 text-sm text-gray-700 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {data.parties.receiverEmail}
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
                  <span className="font-semibold">From:</span> {fromFull}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">To:</span> {toFull}
                </p>

                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Current status:</span>{" "}
                    <span className="font-semibold text-blue-700">{data.shipment?.status || "—"}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="font-extrabold text-gray-900">Charges</p>
                <p className="text-sm text-gray-600">
                  {breakdown ? "Breakdown calculated from declared value." : "Breakdown not available — showing total only."}
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
              <p>This invoice was generated by {company.name || "Exodus Logistics"}. If you need assistance, please contact support.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}