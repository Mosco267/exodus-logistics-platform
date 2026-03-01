"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Printer,
  FileText,
  Calendar,
  MapPin,
  User,
  Mail,
  Package,
  Phone,
  Building2,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

type CompanyInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber?: string;
};

type InvoiceApi = {
  company?: CompanyInfo;

  invoiceNumber: string;
  status: "paid" | "pending" | "overdue";
  currency: string;
  total: number;
  paid: boolean;
  paidAt?: string | null;

  dueDate?: string | null;
  paymentMethod?: string | null;

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
    originFull?: string;
    destinationFull?: string;
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
  return t.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString();
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
  return parts
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
}

function phoneToTel(phone: string) {
  // keep digits and leading +
  const p = String(phone || "").trim();
  const cleaned = p.replace(/(?!^\+)[^\d]/g, "");
  return cleaned || p;
}

export default function FullInvoicePage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const sp = useSearchParams();

  // ✅ New secure params
  const invoice = useMemo(() => String(sp.get("invoice") || "").trim(), [sp]);
  const email = useMemo(() => String(sp.get("email") || "").trim(), [sp]);

  const [data, setData] = useState<InvoiceApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!invoice || !email) {
        setErr("Missing invoice number or email.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");
      setData(null);

      try {
        const res = await fetch(
          `/api/invoice?invoice=${encodeURIComponent(invoice)}&email=${encodeURIComponent(email)}`,
          { cache: "no-store" }
        );
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
  }, [invoice, email]);

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
          <p className="mt-2 text-sm text-gray-700">{err || "Please check your invoice details."}</p>
          <Link
            href={`/${locale}/invoice`}
            className="mt-5 inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            <FileText className="w-5 h-5 mr-2" /> Back to Invoice
          </Link>
        </div>
      </div>
    );
  }

  const sym = currencySymbol(data.currency);

  const statusBadge =
    data.status === "paid"
      ? "bg-green-100 text-green-800 border-green-200"
      : data.status === "overdue"
        ? "bg-red-100 text-red-800 border-red-200"
        : "bg-amber-100 text-amber-800 border-amber-200";

  const statusLabel =
    data.status === "paid" ? "PAID" : data.status === "overdue" ? "OVERDUE" : "PENDING";

  const trackingNumber = String(data.shipment?.trackingNumber || "").trim();

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
    (data as any)?.declaredValue ?? (data as any)?.breakdown?.declaredValue ?? 0;
  const declaredToShow = Number(declaredToShowRaw);

  const shipmentType = String(data.shipment?.shipmentType || "").trim();
  const serviceLevel = String(data.shipment?.serviceLevel || "").trim();
  const weightKg = data.shipment?.weightKg;
  const dims = data.shipment?.dimensionsCm || null;

  const fromFull =
    data.shipment?.originFull ||
    joinNice([data.shipment?.senderCity, data.shipment?.senderState, data.shipment?.senderCountry || data.shipment?.origin]) ||
    String(data.shipment?.origin || "—");

  const toFull =
    data.shipment?.destinationFull ||
    joinNice([data.shipment?.receiverCity, data.shipment?.receiverState, data.shipment?.receiverCountry || data.shipment?.destination]) ||
    String(data.shipment?.destination || "—");

  // ✅ Company fallback until DB is set up
  const company: CompanyInfo = {
    name: data.company?.name || "Exodus Logistics Ltd.",
    address: data.company?.address || "1199 E Calaveras Blvd, California, USA 90201",
    phone: data.company?.phone || "+1 (516) 243 7836",
    email: data.company?.email || "support@goexoduslogistics.com",
    registrationNumber: data.company?.registrationNumber || "",
  };

  const paymentMethod = String(data.paymentMethod || "Online / Bank Transfer").trim();
  const dueDate = data.dueDate || null;

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
            {trackingNumber ? (
              <Link
                href={`/${locale}/track/${encodeURIComponent(trackingNumber)}`}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                           hover:border-blue-600 hover:text-blue-700 transition"
              >
                <MapPin className="w-5 h-5 mr-2" /> Track Shipment
              </Link>
            ) : null}

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
          <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src="/logo.svg" alt="Exodus Logistics" className="h-12 w-auto" />
                <div>
                  <p className="text-xl font-extrabold">{company.name}</p>
                  <p className="text-white/80 text-sm">Commercial Invoice</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-white/80 text-sm">Invoice #</p>
                <p className="text-2xl font-extrabold">{data.invoiceNumber}</p>
                <span
                  className={`inline-flex mt-2 items-center px-3 py-1 rounded-full border text-xs font-extrabold bg-white/95 ${statusBadge}`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            {/* Company + Key data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ✅ Company section */}
              <div className="rounded-2xl border border-gray-200 p-4 md:col-span-1">
                <p className="text-sm text-gray-600 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                  Company
                </p>

                <p className="mt-1 font-extrabold text-gray-900">{company.name}</p>

                <p className="mt-2 text-sm text-gray-700">{company.address}</p>

                <div className="mt-3 space-y-1 text-sm">
                  <a
                    href={`tel:${phoneToTel(company.phone)}`}
                    className="inline-flex items-center text-blue-700 hover:text-blue-800 font-semibold"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {company.phone}
                  </a>

                  <a
                    href={`mailto:${company.email}`}
                    className="flex items-center text-blue-700 hover:text-blue-800 font-semibold break-all"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {company.email}
                  </a>

                  {company.registrationNumber ? (
                    <p className="text-xs text-gray-600">
                      Reg. No: <span className="font-semibold">{company.registrationNumber}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  Created
                </p>
                <p className="mt-1 font-extrabold text-gray-900">
                  {formatDate(data.dates?.createdAt)}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  Last updated: <span className="font-semibold">{formatDateTime(data.dates?.updatedAt)}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="mt-1 text-2xl font-extrabold text-blue-700">
                  {money(sym, totalToShow)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {data.paid ? `Paid on ${formatDate(data.paidAt || null)}` : "Payment pending"}
                </p>
              </div>
            </div>

            {/* Payment details (critical) */}
            <div className="mt-4 rounded-2xl border border-gray-200 p-5">
              <p className="font-extrabold text-gray-900 flex items-center">
                <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
                Payment details
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-gray-600">Status</p>
                  <p className="mt-1 font-extrabold text-gray-900">{statusLabel}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-gray-600">Due date</p>
                  <p className="mt-1 font-extrabold text-gray-900">
                    {dueDate ? formatDate(dueDate) : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-gray-600">Payment method</p>
                  <p className="mt-1 font-extrabold text-gray-900">{paymentMethod}</p>
                </div>
              </div>

              {!data.paid ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-gray-800">
                  Payment is required to proceed. Please contact support via{" "}
                  <a className="font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${company.email}`}>
                    {company.email}
                  </a>{" "}
                  or call{" "}
                  <a className="font-semibold text-blue-700 hover:text-blue-800" href={`tel:${phoneToTel(company.phone)}`}>
                    {company.phone}
                  </a>
                  .
                </div>
              ) : null}
            </div>

            {/* Shipment + Parties + Route */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="font-extrabold text-gray-900 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-gray-500" />
                  Shipment
                </p>

                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">Shipment ID:</span>{" "}
                  <span className="font-bold text-gray-900">{data.shipment.shipmentId || "—"}</span>
                </p>

                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">Tracking number:</span>{" "}
                  <span className="font-bold text-gray-900">{data.shipment.trackingNumber || "—"}</span>
                </p>

                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Current status:</span>{" "}
                    <span className="font-semibold text-blue-700">
                      {data.shipment.status || "—"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="font-extrabold text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  Parties
                </p>

                <div className="mt-3">
                  <p className="text-sm text-gray-600">Sender</p>
                  <p className="font-bold text-gray-900">{data.parties.senderName || "Sender"}</p>
                  {data.parties?.senderEmail ? (
                    <a
                      className="mt-1 text-sm text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center break-all"
                      href={`mailto:${data.parties.senderEmail}`}
                    >
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {data.parties.senderEmail}
                    </a>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-600">Receiver</p>
                  <p className="font-bold text-gray-900">{data.parties.receiverName || "Receiver"}</p>
                  {receiverEmail ? (
                    <a
                      className="mt-1 text-sm text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center break-all"
                      href={`mailto:${receiverEmail}`}
                    >
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {receiverEmail}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="mt-4 rounded-2xl border border-gray-200 p-5">
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
            </div>

            {/* Shipment details */}
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
                  {breakdown
                    ? "Breakdown calculated from declared value."
                    : "(Breakdown not found from API yet — showing total only.)"}
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

            {/* Verification note */}
            <div className="mt-6 rounded-2xl border border-gray-200 p-5">
              <p className="font-extrabold text-gray-900 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-gray-500" />
                Verification
              </p>
              <p className="mt-2 text-sm text-gray-700">
                This invoice is system-generated and valid without a signature. For verification, open the invoice
                using your invoice number and the sender/receiver email on our official website.
              </p>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>
                If you need assistance, contact{" "}
                <a className="text-blue-700 font-semibold hover:text-blue-800" href={`mailto:${company.email}`}>
                  {company.email}
                </a>{" "}
                or call{" "}
                <a className="text-blue-700 font-semibold hover:text-blue-800" href={`tel:${phoneToTel(company.phone)}`}>
                  {company.phone}
                </a>
                .
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}