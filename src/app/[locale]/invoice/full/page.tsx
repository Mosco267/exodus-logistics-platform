// src/app/[locale]/invoice/full/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useIntl } from "react-intl";
import {
  AlertCircle, ArrowLeft, Calendar, Mail, MapPin, Package,
  Phone, Printer, FileText, Truck, CreditCard, ShieldCheck,
} from "lucide-react";
import {
  getShipmentTypeLabel,
  getShipmentMeansLabel,
  getServiceLevelLabel,
  getShipmentStatusLabel,
  getInvoiceStatusLabel,
} from "@/lib/shipment-utils";

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";

type ApiResponse = {
  company?: { name?: string; address?: string; phone?: string; email?: string };
  invoiceNumber?: string;
  status?: InvoiceStatus;
  currency?: string;
  total?: number;
  paid?: boolean;
  dueDate?: string | null;
  paymentMethod?: string | null;
  breakdown?: {
    declaredValue?: number; shipping?: number; fuel?: number; handling?: number;
    customs?: number; insurance?: number; subtotal?: number; tax?: number;
    discount?: number; total?: number; rates?: any; pricingUsed?: any;
    baseFreight?: number;
  };
  declaredValue?: number;
  shipment?: {
    shipmentId?: string; trackingNumber?: string; originFull?: string;
    destinationFull?: string; status?: string; shipmentType?: string | null;
    serviceLevel?: string | null; weightKg?: number | string | null;
    dimensionsCm?: { length?: any; width?: any; height?: any; unit?: string } | null;
    shipmentMeans?: string | null;
  };
  parties?: { senderName?: string; senderEmail?: string; receiverName?: string; receiverEmail?: string };
  currentStatus?: string;
  lastEventAt?: string | null;
  dates?: { createdAt?: string | null; updatedAt?: string | null };
  estimatedDelivery?: string | null;
  estimatedDeliveryDateMin?: string | null;
  shipmentScope?: string | null;
  error?: string;
};

/* Rendered through PaymentMethod.* so the list follows the reader's language.
   Longer term these should come from payment_settings so they match what is
   actually enabled in admin. */
const ACCEPTED_METHOD_KEYS = ["crypto", "bankTransfer", "paypal", "zelle", "cash", "other"];

const BCP: Record<string, string> = {
  en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", zh: "zh-CN", it: "it-IT",
  ar: "ar-SA", pt: "pt-PT", ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", hi: "hi-IN",
};

function safeStr(v: any) { return String(v ?? "").trim(); }
function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function fmtDate(iso?: string | null, bcp = "en-US"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(bcp, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function fmtNumberWithCommas(value: number, decimals = 2, bcp = "en-US"): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString(bcp, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtMoney(amount: number, currency: string, bcp = "en-US") {
  const c = (currency || "USD").toUpperCase();
  return `${c} ${fmtNumberWithCommas(num(amount), 2, bcp)}`;
}

function fmtIntWithCommas(value: any, bcp = "en-US"): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return safeStr(value) || "—";
  if (Number.isInteger(n)) return n.toLocaleString(bcp);
  return n.toLocaleString(bcp, { maximumFractionDigits: 2 });
}

function fmtPercent(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "0%";
  const pct = n < 1 ? n * 100 : n;
  return `${pct % 1 === 0 ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function cleanTel(phone: string) { return phone.replace(/[^\d+]/g, ""); }

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() > d.getTime();
}

function fmtEstimatedDelivery(
  maxISO?: string | null,
  minISO?: string | null,
  scope?: string | null,
  bcp = "en-US"
): string {
  if (!maxISO) return "—";
  const maxD = new Date(maxISO);
  if (Number.isNaN(maxD.getTime())) return "—";

  let minD: Date;
  if (minISO) {
    const d = new Date(minISO);
    minD = Number.isNaN(d.getTime()) ? new Date(maxD) : d;
  } else {
    const extra = String(scope || "").toLowerCase() === "local" ? 2 : 3;
    minD = new Date(maxD);
    minD.setDate(minD.getDate() - extra);
  }

  const fmt = (d: Date) => d.toLocaleDateString(bcp, { day: "2-digit", month: "short" });
  const fmtFull = (d: Date) => d.toLocaleDateString(bcp, { day: "2-digit", month: "short", year: "numeric" });

  if (minD.getTime() === maxD.getTime()) return fmtFull(maxD);
  if (minD.getMonth() === maxD.getMonth() && minD.getFullYear() === maxD.getFullYear()) {
    return `${minD.getDate()}–${maxD.getDate()} ${maxD.toLocaleDateString(bcp, { month: "short", year: "numeric" })}`;
  }
  return `${fmt(minD)} – ${fmtFull(maxD)}`;
}

export default function InvoiceFullPage() {
  const router = useRouter();
  const params = useParams();
  const sp = useSearchParams();
  const locale = (params?.locale as string) || "en";
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const bcp = BCP[locale] || "en-US";

  const q = useMemo(() => safeStr(sp.get("q")), [sp]);
  const invoice = useMemo(() => safeStr(sp.get("invoice")), [sp]);
  const email = useMemo(() => safeStr(sp.get("email")).toLowerCase(), [sp]);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr(""); setData(null);
      const url = new URL("/api/invoice", window.location.origin);
      if (q) url.searchParams.set("q", q.toUpperCase());
      if (invoice) url.searchParams.set("invoice", invoice.toUpperCase());
      if (email) url.searchParams.set("email", email);
      if (!q && !(invoice && email)) {
        setErr(t("InvoiceFull.errMissingParams"));
        setLoading(false); return;
      }
      try {
        const res = await fetch(url.toString(), { method: "GET" });
        const json = (await res.json().catch(() => null)) as ApiResponse | null;
        if (!res.ok) {
          /* The API returns codes rather than prose so errors can be shown
             in the reader's language. */
          const code = String((json as any)?.error || "");
          setErr(
            code === "EMAIL_MISMATCH" ? t("InvoiceFull.errEmailMismatch")
            : code === "MISSING_PARAMS" ? t("InvoiceFull.errMissingParams")
            : code === "SERVER_ERROR" ? t("InvoiceFull.errUnavailable")
            : t("InvoiceFull.errNotFound")
          );
          return;
        }
        setData(json);
      } catch (e: any) {
        setErr(t("InvoiceFull.errUnavailable"));
      } finally { setLoading(false); }
    };
    void load();
  }, [q, invoice, email, intl.locale]);

  const invoiceNumber = safeStr(data?.invoiceNumber);
  const shipmentId = safeStr(data?.shipment?.shipmentId);
  const trackingNumber = safeStr(data?.shipment?.trackingNumber);
  const currency = safeStr(data?.currency) || "USD";
  const declaredValue = num(data?.breakdown?.declaredValue ?? data?.declaredValue ?? 0);
  const dueDate = data?.dueDate ?? null;

  const statusFromApi = (data?.status as InvoiceStatus) || (data?.paid ? "paid" : "unpaid");
  const status: InvoiceStatus = useMemo(() => {
    if (statusFromApi === "cancelled") return "cancelled";
    if (statusFromApi === "paid") return "paid";
    if (statusFromApi === "overdue") return "overdue";
    if (statusFromApi === "unpaid" && isOverdue(dueDate)) return "overdue";
    return "unpaid";
  }, [statusFromApi, dueDate]);

  const calc = useMemo(() => {
    const b = data?.breakdown || {};
    const baseFreight = num(b.baseFreight ?? b.shipping);
    const fuel = num(b.fuel);
    const handling = num(b.handling);
    const customs = num(b.customs);
    const insurance = num(b.insurance);
    const discount = num(b.discount);
    const tax = num(b.tax);
    const subtotal = num(b.subtotal) || (baseFreight + fuel + handling + customs + insurance - discount);
    const total = num(b.total) || (subtotal + tax);
    return { baseFreight, fuel, handling, customs, insurance, discount, tax, subtotal, total };
  }, [data]);

  const pricingUsed = (data as any)?.pricingUsed || (data as any)?.breakdown?.pricingUsed || {};
  const fuelRate = pricingUsed?.fuelSurchargeRate ?? pricingUsed?.fuelRate ?? pricingUsed?.fuel ?? 0;
  const insuranceRate = pricingUsed?.insuranceRate ?? pricingUsed?.insurance ?? pricingUsed?.insurancePercent ?? 0;

  const paymentMethodRaw = safeStr(data?.paymentMethod);

  /* Stored methods vary in shape. Normalise to a key where possible and
     translate; anything unrecognised passes through as written. */
  const paymentMethodLabel = useMemo(() => {
    const s = paymentMethodRaw.toLowerCase().replace(/[\s_-]+/g, "");
    const key =
      s.includes("crypto") || s.includes("bitcoin") || s.includes("usdt") || s.includes("ethereum") ? "crypto"
      : s.includes("bank") ? "bankTransfer"
      : s.includes("paypal") ? "paypal"
      : s.includes("zelle") ? "zelle"
      : s.includes("cash") ? "cash"
      : s.includes("card") || s.includes("credit") || s.includes("debit") ? "card"
      : s === "other" ? "other"
      : "";
    if (!key) return paymentMethodRaw;
    return intl.formatMessage({ id: `PaymentMethod.${key}`, defaultMessage: paymentMethodRaw });
  }, [paymentMethodRaw, intl.locale]);

  /* Company details come from admin settings. No invented fallbacks — an
     empty field shows nothing rather than a placeholder a customer might act on. */
  const companyName = safeStr(data?.company?.name);
  const companyAddress = safeStr(data?.company?.address);
  const companyPhone = safeStr(data?.company?.phone);
  const companyEmail = safeStr(data?.company?.email);

  const originFull = safeStr(data?.shipment?.originFull) || "—";
  const destinationFull = safeStr(data?.shipment?.destinationFull) || "—";

  const rawType = safeStr(data?.shipment?.shipmentType);
  const rawService = safeStr(data?.shipment?.serviceLevel);
  const rawMeans = safeStr(data?.shipment?.shipmentMeans);
  const shipmentType = rawType ? getShipmentTypeLabel(rawType, intl) : "—";
  const serviceLevel = rawService ? getServiceLevelLabel(rawService, intl) : "—";
  const shipmentMeans = rawMeans ? getShipmentMeansLabel(rawMeans, intl) : "—";

  const weightKg = data?.shipment?.weightKg;
  const weightLine = weightKg != null && safeStr(weightKg) !== ""
    ? `${fmtIntWithCommas(weightKg, bcp)} kg`
    : "—";
  const dim = data?.shipment?.dimensionsCm;
  const dimUnit = safeStr(dim?.unit) || "cm";
  const dimLine = dim
    ? `${fmtIntWithCommas(dim.length, bcp)} × ${fmtIntWithCommas(dim.width, bcp)} × ${fmtIntWithCommas(dim.height, bcp)} ${dimUnit}`
    : "—";

  const estDeliveryStr = useMemo(
    () => fmtEstimatedDelivery(
      data?.estimatedDelivery,
      data?.estimatedDeliveryDateMin,
      data?.shipmentScope,
      bcp,
    ),
    [data?.estimatedDelivery, data?.estimatedDeliveryDateMin, data?.shipmentScope, bcp]
  );

  const statusBadge = getInvoiceStatusLabel(status, intl);
  const statusColor = status === "paid" ? "bg-green-50 border-green-200 text-green-800"
    : status === "overdue" ? "bg-red-50 border-red-200 text-red-800"
    : status === "cancelled" ? "bg-gray-50 border-gray-200 text-gray-700"
    : "bg-amber-50 border-amber-200 text-amber-800";
  const statusDot = status === "paid" ? "bg-green-500"
    : status === "overdue" ? "bg-red-500"
    : status === "cancelled" ? "bg-gray-400"
    : "bg-amber-500";

  const paymentMethodLine = paymentMethodRaw
    ? t("InvoiceFull.methodCompletedVia", { method: paymentMethodLabel })
    : status === "paid" ? t("InvoiceFull.methodNotRecorded")
    : status === "cancelled" ? t("InvoiceFull.methodNotApplicable")
    : status === "overdue" ? t("InvoiceFull.methodAwaitingRemit")
    : t("InvoiceFull.methodAwaitingChoose");

  const paymentMessage = status === "paid" ? t("InvoiceFull.msgPaid")
    : status === "overdue" ? t("InvoiceFull.msgOverdue")
    : status === "cancelled" ? t("InvoiceFull.msgCancelled")
    : t("InvoiceFull.msgUnpaid");

  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString(bcp, { month: "short", day: "numeric", year: "numeric" })
    : "";
  const dueDateLine = dueDate
    ? (status === "overdue" ? t("InvoiceFull.overdueSince", { date: dueDateStr })
      : status === "paid" ? t("InvoiceFull.wasDue", { date: dueDateStr })
      : t("InvoiceFull.dueBy", { date: dueDateStr }))
    : status === "paid" ? t("InvoiceFull.paidInFull") : t("InvoiceFull.noDueDate");

  const amountNote = status === "paid" ? t("InvoiceFull.noteThanks")
    : status === "cancelled" ? t("InvoiceFull.noteInactive")
    : status === "overdue" ? t("InvoiceFull.noteImmediate")
    : t("InvoiceFull.notePrompt");

  const paymentStatusLine = status === "paid" ? t("InvoiceFull.payStatusConfirmed")
    : status === "overdue" ? t("InvoiceFull.payStatusOverdue")
    : status === "cancelled" ? t("InvoiceFull.payStatusCancelled")
    : t("InvoiceFull.payStatusOutstanding");

  const printNow = () => window.print();
  const backToTrackTarget = trackingNumber || shipmentId || (q ? q.toUpperCase() : "");

  const card = "rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:border-blue-400 hover:shadow-md transition";
  const card5 = "rounded-2xl border border-gray-200 bg-white shadow-sm p-5 hover:border-blue-400 hover:shadow-md transition";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-white">
            <style jsx global>{`
        @media print {
          /* Hide everything, then reveal only the invoice. Using visibility
             rather than display lets the invoice show through its hidden
             ancestors, which display:none would collapse. */
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }

          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          .no-print, .no-print * {
            visibility: hidden !important;
            display: none !important;
          }

          /* Third-party widgets sit outside the React tree */
          #tawk-script,
          iframe[title*="chat" i],
          iframe[src*="tawk"] { display: none !important; }

          body { background: white !important; }

          .print-card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 0 !important;
          }

          /* Browsers strip backgrounds by default; the invoice header and
             status badges are meaningless without them. */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Keep cards from splitting across pages */
          .print-area .rounded-2xl { break-inside: avoid; }

          @page { margin: 14mm; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">

        {/* ── TOP NAV ── */}
        <div className="no-print mb-6 flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={() => router.replace(`/${locale}/invoice`)}
            className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
            <ArrowLeft className="w-4 h-4" /> {t("InvoiceFull.backToSearch")}
          </button>
          {backToTrackTarget && (
            <Link href={`/${locale}/track/${encodeURIComponent(backToTrackTarget)}`}
              className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
              <Truck className="w-4 h-4" /> {t("InvoiceFull.trackShipment")}
            </Link>
          )}
          <button type="button" onClick={printNow}
            className="cursor-pointer w-full sm:w-auto sm:ml-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow-sm">
            <Printer className="w-4 h-4" /> {t("InvoiceFull.print")}
          </button>
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg flex items-center gap-3 print-card">
            <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            <p className="text-sm text-gray-600 font-medium">{t("InvoiceFull.loading")}</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-lg print-card">
            <div className="flex items-center gap-3 text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" /> {err}
            </div>
            <p className="mt-2 text-sm text-gray-500 pl-8">
              {t("InvoiceFull.errHint")}
            </p>
          </div>
        )}

        {!loading && data && (
          <div className="print-area">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden print-card">

              {/* ── INVOICE HEADER ── */}
              <div
                style={{ background: "linear-gradient(to right, #1d4ed8 0%, #0891b2 100%)" }}
                className="p-6 sm:p-8 print-white"
              >
                <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-5">

                  <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-4 min-w-0">
                    <Image
                      src="/logo-black.svg"
                      alt={companyName || "Exodus Logistics"}
                      width={160} height={50} priority
                      className="h-10 sm:h-14 w-auto object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      {companyName && (
                        <p className="text-white font-extrabold text-base sm:text-lg leading-tight">{companyName}</p>
                      )}
                      {companyAddress && (
                        <p className="text-white/80 text-xs sm:text-sm mt-0.5">{companyAddress}</p>
                      )}
                      {(companyPhone || companyEmail) && (
                        <div className="mt-2 flex flex-col items-center md:items-start md:flex-row flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
                          {companyPhone && (
                            <a href={`tel:${cleanTel(companyPhone)}`}
                              className="cursor-pointer inline-flex items-center gap-1.5 text-white hover:text-white/80 transition underline underline-offset-2">
                              <Phone className="w-3.5 h-3.5 shrink-0" /> {companyPhone}
                            </a>
                          )}
                          {companyEmail && (
                            <a href={`mailto:${companyEmail}`}
                              className="cursor-pointer inline-flex items-center gap-1.5 text-white hover:text-white/80 transition underline underline-offset-2">
                              <Mail className="w-3.5 h-3.5 shrink-0" /> {companyEmail}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 md:text-right">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{t("InvoiceFull.invoice")}</p>
                    <p className="text-white font-extrabold text-xl sm:text-2xl tracking-wide">{invoiceNumber || "—"}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold bg-white/10 border-white/30 text-white">
                      <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                      {statusBadge}
                    </div>
                  </div>

                </div>
              </div>

              {/* ── BODY ── */}
              <div className="p-5 sm:p-8 space-y-5">

                {/* Top 3 summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={card}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("InvoiceFull.dates")}</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-0.5">{t("InvoiceFull.created")}</p>
                    <p className="text-sm font-bold text-gray-900">{fmtDate(data?.dates?.createdAt || null, bcp)}</p>
                    <p className="text-xs text-gray-500 mt-2 mb-0.5">{t("InvoiceFull.lastUpdated")}</p>
                    <p className="text-sm font-bold text-gray-900">{fmtDate(data?.lastEventAt || data?.dates?.updatedAt || null, bcp)}</p>
                    {data?.estimatedDelivery && (
                      <>
                        <p className="text-xs text-gray-500 mt-2 mb-0.5">{t("InvoiceFull.estDelivery")}</p>
                        <p className="text-sm font-bold text-gray-900">{estDeliveryStr}</p>
                      </>
                    )}
                    <p className="mt-2 text-[10px] text-gray-400">{t("InvoiceFull.localTimezone")}</p>
                  </div>

                  <div className={card}>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("InvoiceFull.shipmentIds")}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{t("InvoiceFull.shipmentNo")}</p>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{shipmentId || "—"}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-2">{t("InvoiceFull.trackingNo")}</p>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{trackingNumber || "—"}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-2">{t("InvoiceFull.invoiceNo")}</p>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{invoiceNumber || "—"}</p>
                  </div>

                  <div className={card}>
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("InvoiceFull.amountDue")}</p>
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{fmtMoney(calc.total, currency, bcp)}</p>
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{statusBadge}
                    </div>
                    <p className="mt-2 text-xs text-gray-600 font-medium">{dueDateLine}</p>
                    <p className="mt-1 text-xs text-gray-500">{amountNote}</p>
                  </div>
                </div>

                {/* Route + Declaration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("InvoiceFull.route")}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.from")}</p>
                        <p className="font-semibold text-gray-900">{originFull}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.to")}</p>
                        <p className="font-semibold text-gray-900">{destinationFull}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {t("InvoiceFull.statusLine", {
                          status: safeStr(data?.currentStatus || data?.shipment?.status)
                            ? getShipmentStatusLabel(safeStr(data?.currentStatus || data?.shipment?.status), intl)
                            : "—",
                          b: (chunks: any) => <span className="font-semibold text-gray-700">{chunks}</span>,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{t("InvoiceFull.declaration")}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.declaredValue")}</p><p className="font-semibold text-gray-900">{fmtMoney(declaredValue, currency, bcp)}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.type")}</p><p className="font-semibold text-gray-900">{shipmentType}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.service")}</p><p className="font-semibold text-gray-900">{serviceLevel}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.weight")}</p><p className="font-semibold text-gray-900">{weightLine}</p></div>
                      <div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.dimensions")}</p><p className="font-semibold text-gray-900">{dimLine}</p></div>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className={card5}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">{t("InvoiceFull.parties")}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{t("InvoiceFull.sender")}</p>
                      <p className="font-semibold text-gray-900 text-sm">{safeStr(data?.parties?.senderName) || "—"}</p>
                      <p className="text-gray-600 text-sm break-all">{safeStr(data?.parties?.senderEmail) || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{t("InvoiceFull.receiver")}</p>
                      <p className="font-semibold text-gray-900 text-sm">{safeStr(data?.parties?.receiverName) || "—"}</p>
                      <p className="text-gray-600 text-sm break-all">{safeStr(data?.parties?.receiverEmail) || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Payment + Charges Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={card5}>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">{t("InvoiceFull.payment")}</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{t("InvoiceFull.acceptedMethods")}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {ACCEPTED_METHOD_KEYS.map((k) => (
                        <span key={k} className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                          {t(`PaymentMethod.${k}`)}
                        </span>
                      ))}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.paymentStatus")}</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">{paymentStatusLine}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("InvoiceFull.recordedMethod")}</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">{paymentMethodLine}</p>
                      </div>
                      <p className="text-xs text-gray-600 pt-2 border-t border-gray-100 leading-relaxed">{paymentMessage}</p>
                    </div>
                  </div>

                  <div className={card5}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">{t("InvoiceFull.charges")}</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      {t("InvoiceFull.chargesNote")}
                    </p>

                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                        <p className="font-extrabold text-gray-900">{t("InvoiceFull.declaredValue")}</p>
                        <p className="text-sm text-gray-700">{fmtNumberWithCommas(declaredValue, 2, bcp)} {currency}</p>
                      </div>

                      <div className="p-5 space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>{t("InvoiceFull.baseFreight", { means: shipmentMeans !== "—" ? shipmentMeans : t("InvoiceFull.shipping") })}</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.baseFreight, 2, bcp)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t("InvoiceFull.fuelSurcharge", { rate: fmtPercent(fuelRate) })}</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.fuel, 2, bcp)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t("InvoiceFull.insurance", { rate: fmtPercent(insuranceRate) })}</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.insurance, 2, bcp)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t("InvoiceFull.handling")}</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.handling, 2, bcp)}</span>
                        </div>
                        {calc.customs > 0 && (
                          <div className="flex justify-between">
                            <span>{t("InvoiceFull.customs")}</span>
                            <span className="font-semibold">{fmtNumberWithCommas(calc.customs, 2, bcp)}</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-3 border-t">
                          <span className="font-bold">{t("InvoiceFull.subtotal")}</span>
                          <span className="font-bold">{fmtNumberWithCommas(calc.subtotal, 2, bcp)}</span>
                        </div>
                        {calc.tax > 0 && (
                          <div className="flex justify-between">
                            <span>{t("InvoiceFull.tax")}</span>
                            <span className="font-semibold">{fmtNumberWithCommas(calc.tax, 2, bcp)}</span>
                          </div>
                        )}
                        {calc.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>{t("InvoiceFull.discount")}</span>
                            <span className="font-semibold">−{fmtNumberWithCommas(calc.discount, 2, bcp)}</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-4 border-t text-lg">
                          <span className="font-extrabold text-gray-900">{t("InvoiceFull.total")}</span>
                          <span className="font-extrabold text-blue-700">
                            {fmtNumberWithCommas(calc.total, 2, bcp)} {currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                  <p className="text-sm font-extrabold text-gray-800 tracking-wide uppercase">
                    {t("InvoiceFull.officiallyIssued", { company: companyName || "Exodus Logistics Ltd." })}
                  </p>
                  <p className="text-xs text-gray-500 max-w-lg leading-relaxed">
                    {t("InvoiceFull.legalNote", {
                      b: (chunks: any) => <span className="font-semibold text-gray-700">{chunks}</span>,
                      site: () => (
                        <a href="https://www.goexoduslogistics.com" target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 underline hover:text-blue-800 transition font-semibold">
                          goexoduslogistics.com
                        </a>
                      ),
                      email: () => (
                        <a href={`mailto:${companyEmail}`}
                          className="text-blue-600 underline hover:text-blue-800 transition font-semibold">
                          {companyEmail}
                        </a>
                      ),
                    })}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {t("InvoiceFull.copyright", {
                      year: new Date().getFullYear(),
                      company: companyName || "Exodus Logistics Ltd.",
                    })}
                  </p>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}