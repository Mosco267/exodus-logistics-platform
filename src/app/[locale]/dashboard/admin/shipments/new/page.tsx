"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle, CheckCircle2, Loader2, PlusCircle, ChevronDown, Info,
} from "lucide-react";
import {
  COUNTRIES_WITH_STATES,
  getCountryByName,
  getCountryByCode,
  type CountryEntry,
} from "@/lib/countriesData";
import {
  computeInvoice,
  autoSelectMeans,
  getDeliveryDays,
  DEFAULT_PRICING,
  type PricingProfiles,
  type ShipmentMeans,
  type ServiceLevel,
  type ShipmentScope,
  type ShipmentType,
} from "@/lib/pricing";
import { getCountryDistance, getStateDistance } from "@/lib/distances";
import { addBusinessDays } from "@/lib/holidays";

// ─── Helpers ────────────────────────────────────────────────────
function numericOnly(val: string, allowDecimal = true): string {
  if (allowDecimal) return val.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  return val.replace(/[^0-9]/g, "");
}

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toPct(rate: number) {
  const pct = Number(rate) * 100;
  return Number.isFinite(pct) ? pct.toFixed(2).replace(/\.?0+$/, "") : "0";
}
function fromPct(pct: string) {
  const n = Number(pct);
  return Number.isFinite(n) ? n / 100 : 0;
}
function toMoney(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? String(x) : "0";
}
function fromMoney(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// ─── Country dropdown ───────────────────────────────────────────
function CountrySelect({
  value, onChange, onCountryChange, label, required,
}: {
  value: string;
  onChange: (name: string) => void;
  onCountryChange?: (entry: CountryEntry | undefined) => void;
  label: string;
  required?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () => COUNTRIES_WITH_STATES.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const selected = getCountryByName(value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch(""); }}
        className="cursor-pointer w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <span className="flex items-center gap-2">
          {selected
            ? <><span>{selected.flag}</span><span>{selected.name}</span></>
            : <span className="text-gray-400">Select country…</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No results</p>}
            {filtered.map(c => (
              <button
                key={c.code} type="button"
                onMouseDown={() => { onChange(c.name); onCountryChange?.(c); setOpen(false); setSearch(""); }}
                className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 transition ${value === c.name ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800"}`}
              >
                <span>{c.flag}</span><span>{c.name}</span>
                <span className="ml-auto text-xs text-gray-400">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── State input ────────────────────────────────────────────────
function StateInput({
  country, value, onChange, label, required,
}: {
  country: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
}) {
  const entry = getCountryByName(country);
  const states = entry?.states || [];
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {states.length > 0 ? (
        <div className="space-y-1.5">
          <select
            value={value} onChange={e => onChange(e.target.value)}
            className="cursor-pointer w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="">Select state…</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={value} onChange={e => onChange(e.target.value)} placeholder="Or type manually…"
            className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-gray-300"
          />
        </div>
      ) : (
        <input
          value={value} onChange={e => onChange(e.target.value)} placeholder="Enter state / province"
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      )}
    </div>
  );
}

// ─── Phone input ────────────────────────────────────────────────
function PhoneInput({
  countryName, value, onChange, label, required,
}: {
  countryName: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
}) {
  const entry = getCountryByName(countryName);
  const [dialCode, setDialCode] = useState(entry?.dial || "");
  const [localNumber, setLocalNumber] = useState("");

  useEffect(() => {
    const newDial = getCountryByName(countryName)?.dial || "";
    setDialCode(newDial);
    const full = newDial ? `${newDial} ${localNumber}`.trim() : localNumber;
    onChange(full);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryName]);

  const handleDialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.startsWith("+") ? e.target.value : "+" + e.target.value.replace(/\+/g, "");
    setDialCode(v);
    onChange(v ? `${v} ${localNumber}`.trim() : localNumber);
  };
  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = numericOnly(e.target.value, false);
    setLocalNumber(v);
    onChange(dialCode ? `${dialCode} ${v}`.trim() : v);
  };

  const flag = getCountryByName(countryName)?.flag || "🌐";

  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-2xl border border-gray-300 px-3 py-3 bg-gray-50 shrink-0">
          <span className="text-base">{flag}</span>
          <input
            value={dialCode} onChange={handleDialChange}
            className="w-14 bg-transparent text-sm font-semibold text-gray-700 focus:outline-none" placeholder="+1"
          />
        </div>
        <input
          value={localNumber} onChange={handleLocalChange} inputMode="numeric" placeholder="Phone number"
          className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>
    </div>
  );
}

type ShipmentStatus = "Created" | "In Transit" | "Custom Clearance" | "Unclaimed" | "Delivered";

const PACKAGE_TYPES = [
  "Documents","Parcel","Electronics","Clothing","Food & Perishables",
  "Furniture","Machinery","Bulk / Pallet","Container","Other",
];

const MEANS_CONFIG: Record<ShipmentMeans, { label: string; emoji: string }> = {
  air:  { label: "Air Freight",  emoji: "✈️" },
  sea:  { label: "Sea Freight",  emoji: "🚢" },
  land: { label: "Land Freight", emoji: "🚛" },
};

type PricingApiResponse = { ok?: boolean; settings?: PricingProfiles; error?: string };

// ─── Required-field validator ──────────────────────────────────
function isFormValid(f: Record<string, string>): { valid: boolean; missing: string } {
  const required: Array<[string, string]> = [
    ["senderName", "Sender name"],
    ["senderEmail", "Sender email"],
    ["senderCountry", "Sender country"],
    ["senderState", "Sender state"],
    ["senderCity", "Sender city"],
    ["senderAddress", "Sender address"],
    ["senderPostalCode", "Sender postal code"],
    ["senderPhone", "Sender phone"],
    ["receiverName", "Receiver name"],
    ["receiverEmail", "Receiver email"],
    ["receiverCountry", "Receiver country"],
    ["receiverState", "Receiver state"],
    ["receiverCity", "Receiver city"],
    ["receiverAddress", "Receiver address"],
    ["receiverPostalCode", "Receiver postal code"],
    ["receiverPhone", "Receiver phone"],
    ["packageType", "Package type"],
    ["packageDescription", "Package description"],
    ["weightKg", "Weight"],
    ["lengthCm", "Length"],
    ["widthCm", "Width"],
    ["heightCm", "Height"],
    ["declaredValue", "Declared value"],
    ["currency", "Currency"],
    ["estimatedDeliveryDate", "Estimated delivery date"],
  ];
  for (const [key, label] of required) {
    if (!f[key]?.trim()) return { valid: false, missing: label };
  }
  return { valid: true, missing: "" };
}

export default function AdminCreateShipmentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const router = useRouter();

  // ── Parties ──
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderCountryCode, setSenderCountryCode] = useState("US");
  const [senderCountry, setSenderCountry] = useState("United States");
  const [senderState, setSenderState] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderPostalCode, setSenderPostalCode] = useState("");
  const [senderPhone, setSenderPhone] = useState("+1");

  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("US");
  const [receiverCountry, setReceiverCountry] = useState("United States");
  const [receiverState, setReceiverState] = useState("");
  const [receiverCity, setReceiverCity] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverPostalCode, setReceiverPostalCode] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("+1");

  // ── Package / shipment ──
  const [packageType, setPackageType] = useState("Parcel");
  const [packageTypeOther, setPackageTypeOther] = useState("");
  const [packageDescription, setPackageDescription] = useState("");

  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("Standard");
  const [scope, setScope] = useState<ShipmentScope>("international");

  // Means: auto by default, admin can override
  const [meansOverride, setMeansOverride] = useState<ShipmentMeans | "auto">("auto");

  // Date: auto by default, admin can override
  const [dateOverrideEnabled, setDateOverrideEnabled] = useState(false);
  const [dateOverride, setDateOverride] = useState("");

  const [weightKg, setWeightKg] = useState("2");
  const [lengthCm, setLengthCm] = useState("24");
  const [widthCm, setWidthCm] = useState("18");
  const [heightCm, setHeightCm] = useState("12");

  // ── Invoice ──
  const [currency, setCurrency] = useState("USD");
  const [declaredValue, setDeclaredValue] = useState("1000");

  const [invoiceStatus, setInvoiceStatus] = useState<"paid" | "unpaid" | "overdue" | "cancelled">("unpaid");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState("");
  const [invoicePaymentMethodOther, setInvoicePaymentMethodOther] = useState("");

  const PAYMENT_METHODS = useMemo(
    () => ["", "Cryptocurrency", "Bank transfer", "PayPal", "Zelle", "Cash", "Other"],
    []
  );

  // ── Status ──
  const [status, setStatus] = useState<ShipmentStatus>("Created");
  const [statusNote, setStatusNote] = useState("");

  // ── Pricing ──
  const [ratesLoading, setRatesLoading] = useState(true);
  const [pricingProfiles, setPricingProfiles] = useState<PricingProfiles>(DEFAULT_PRICING);

  const [shippingFee, setShippingFee] = useState("");
  const [handlingFee, setHandlingFee] = useState("");
  const [customsFee, setCustomsFee] = useState("");
  const [taxFee, setTaxFee] = useState("");
  const [discountFee, setDiscountFee] = useState("");
  const [fuelRatePct, setFuelRatePct] = useState("");
  const [insuranceRatePct, setInsuranceRatePct] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [attempted, setAttempted] = useState(false);

  // ── Load pricing on mount ──
  useEffect(() => {
    const load = async () => {
      setErr(""); setRatesLoading(true);
      try {
        const res = await fetch("/api/admin/pricing", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as PricingApiResponse | null;
        if (!res.ok) throw new Error(json?.error || "Failed to load pricing settings.");
        const s = json?.settings;
        if (!s) throw new Error("Pricing settings missing.");
        setPricingProfiles(s);

        const active = s[scope] || DEFAULT_PRICING[scope];
        setShippingFee(toMoney(active.shippingFee ?? DEFAULT_PRICING[scope].shippingFee));
        setHandlingFee(toMoney(active.handlingFee ?? DEFAULT_PRICING[scope].handlingFee));
        setCustomsFee(toMoney(active.customsFee ?? DEFAULT_PRICING[scope].customsFee));
        setTaxFee(toMoney(active.taxFee ?? DEFAULT_PRICING[scope].taxFee));
        setDiscountFee(toMoney(active.discountFee ?? DEFAULT_PRICING[scope].discountFee));
        setFuelRatePct(toPct(Number(active.fuelRate ?? DEFAULT_PRICING[scope].fuelRate)));
        setInsuranceRatePct(toPct(Number(active.insuranceRate ?? DEFAULT_PRICING[scope].insuranceRate)));
      } catch (e: any) {
        setErr(String(e?.message || "Failed to load pricing settings."));
      } finally {
        setRatesLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload pricing fees when scope changes
  useEffect(() => {
    const active = pricingProfiles[scope] || DEFAULT_PRICING[scope];
    setShippingFee(toMoney(active.shippingFee ?? DEFAULT_PRICING[scope].shippingFee));
    setHandlingFee(toMoney(active.handlingFee ?? DEFAULT_PRICING[scope].handlingFee));
    setCustomsFee(toMoney(active.customsFee ?? DEFAULT_PRICING[scope].customsFee));
    setTaxFee(toMoney(active.taxFee ?? DEFAULT_PRICING[scope].taxFee));
    setDiscountFee(toMoney(active.discountFee ?? DEFAULT_PRICING[scope].discountFee));
    setFuelRatePct(toPct(Number(active.fuelRate ?? DEFAULT_PRICING[scope].fuelRate)));
    setInsuranceRatePct(toPct(Number(active.insuranceRate ?? DEFAULT_PRICING[scope].insuranceRate)));
  }, [scope, pricingProfiles]);

  // Lock receiver country to sender for local
  useEffect(() => {
    if (scope === "local") {
      setReceiverCountry(senderCountry);
      setDestinationCountryCode(senderCountryCode);
      setReceiverState("");
    }
  }, [scope, senderCountry, senderCountryCode]);

  // ── Derived: weight, means, service level ──
  const actualWeight = parseFloat(weightKg) || 0;
  const lenN = parseFloat(lengthCm) || 0;
  const widN = parseFloat(widthCm) || 0;
  const hgtN = parseFloat(heightCm) || 0;
  const volumetricWeight = (lenN * widN * hgtN) / 5000;
  const weight = Math.max(actualWeight, volumetricWeight);

  const isBulkOrContainer = packageType === "Container" || packageType === "Bulk / Pallet";

  const finalPackageType = packageType === "Other"
    ? (packageTypeOther.trim() || "Other")
    : packageType;

  const autoMeans: ShipmentMeans = useMemo(
    () => autoSelectMeans(scope, serviceLevel, weight, packageType as ShipmentType),
    [scope, serviceLevel, weight, packageType]
  );

  const means: ShipmentMeans = meansOverride === "auto" ? autoMeans : meansOverride;

  const effectiveServiceLevel: ServiceLevel = useMemo(() => {
    if (means === "sea") return "Standard";
    if (weight >= 500) return "Standard";
    return serviceLevel;
  }, [means, weight, serviceLevel]);

  const distanceKm = useMemo(() => {
    if (scope === "local" && senderCountryCode && senderState && receiverState) {
      return getStateDistance(senderCountryCode, senderState, receiverState);
    }
    if (senderCountryCode && destinationCountryCode) {
      return getCountryDistance(senderCountryCode, destinationCountryCode);
    }
    return 0;
  }, [scope, senderCountryCode, destinationCountryCode, senderState, receiverState]);

  const delivery = useMemo(
    () => getDeliveryDays(means, effectiveServiceLevel, distanceKm),
    [means, effectiveServiceLevel, distanceKm]
  );

  // Auto delivery date range (max for storage; min for display)
  const autoDeliveryDateMaxISO = useMemo(() => {
    return addBusinessDays(new Date(), delivery.max).toISOString().split("T")[0];
  }, [delivery]);
  const autoDeliveryDateMinISO = useMemo(() => {
    return addBusinessDays(new Date(), delivery.min).toISOString().split("T")[0];
  }, [delivery]);

  // The actual estimated delivery date used (override or auto)
  const estimatedDeliveryDate = dateOverrideEnabled
    ? dateOverride
    : autoDeliveryDateMaxISO;

  const deliveryDateStr = useMemo(() => {
    if (dateOverrideEnabled) {
      if (!dateOverride) return "";
      const d = new Date(dateOverride);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
    if (weight <= 0) return "";
    const minD = addBusinessDays(new Date(), delivery.min);
    const maxD = addBusinessDays(new Date(), delivery.max);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const fmtFull = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (delivery.min === delivery.max) return fmtFull(maxD);
    if (minD.getMonth() === maxD.getMonth() && minD.getFullYear() === maxD.getFullYear()) {
      return `${minD.getDate()}–${maxD.getDate()} ${maxD.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
    }
    return `${fmt(minD)} – ${fmtFull(maxD)}`;
  }, [delivery, weight, dateOverrideEnabled, dateOverride]);

  // ── Pricing override object passed to server ──
  const pricingOverride = useMemo(() => {
    return {
      [scope]: {
        shippingFee: fromMoney(shippingFee),
        handlingFee: fromMoney(handlingFee),
        customsFee: fromMoney(customsFee),
        taxFee: fromMoney(taxFee),
        discountFee: fromMoney(discountFee),
        fuelRate: fromPct(fuelRatePct),
        insuranceRate: fromPct(insuranceRatePct),
      },
    };
  }, [scope, shippingFee, handlingFee, customsFee, taxFee, discountFee, fuelRatePct, insuranceRatePct]);

  // ── Live invoice preview (uses computeInvoice — same as user page) ──
  const breakdown = useMemo(() => {
    if (weight <= 0 || !senderCountryCode) return null;
    const safePricing: PricingProfiles = {
      ...DEFAULT_PRICING,
      ...pricingProfiles,
      international: {
        ...DEFAULT_PRICING.international,
        ...(pricingProfiles.international || {}),
        ...(pricingOverride.international || {}),
      },
      local: {
        ...DEFAULT_PRICING.local,
        ...(pricingProfiles.local || {}),
        ...(pricingOverride.local || {}),
      },
      air: { ...DEFAULT_PRICING.air, ...(pricingProfiles.air || {}) },
      sea: { ...DEFAULT_PRICING.sea, ...(pricingProfiles.sea || {}) },
      land: { ...DEFAULT_PRICING.land, ...(pricingProfiles.land || {}) },
    };
    try {
      return computeInvoice({
        scope,
        means,
        serviceLevel: effectiveServiceLevel,
        weightKg: weight,
        declaredValue: parseFloat(declaredValue) || 0,
        currency,
        senderCountryCode,
        receiverCountryCode: destinationCountryCode || senderCountryCode,
        senderCity, senderState, receiverCity, receiverState,
        pricing: safePricing,
      });
    } catch (e) {
      console.error("Invoice preview failed:", e);
      return null;
    }
  }, [
    weight, scope, means, effectiveServiceLevel, declaredValue, currency,
    senderCountryCode, destinationCountryCode, senderCity, senderState,
    receiverCity, receiverState, pricingProfiles, pricingOverride,
  ]);

  // ── Submit ──
  const submit = async () => {
    setAttempted(true);
    setErr(""); setOkMsg("");

    if (ratesLoading) { setErr("Pricing is still loading. Please wait a moment."); return; }

    const { valid, missing } = isFormValid({
      senderName, senderEmail, senderCountry, senderState, senderCity,
      senderAddress, senderPostalCode, senderPhone,
      receiverName, receiverEmail, receiverCountry, receiverState,
      receiverCity, receiverAddress, receiverPostalCode, receiverPhone,
      packageType: finalPackageType, packageDescription,
      weightKg, lengthCm, widthCm, heightCm,
      declaredValue, currency,
      estimatedDeliveryDate,
    });
    if (!valid) { setErr(`${missing} is required.`); return; }

    if (dateOverrideEnabled && !dateOverride) {
      setErr("Estimated delivery date is required when override is enabled.");
      return;
    }

    const dv = Number(declaredValue);
    if (!Number.isFinite(dv) || dv <= 0) { setErr("Declared value must be greater than 0."); return; }

    const finalPaymentMethod =
      invoicePaymentMethod === "Other"
        ? invoicePaymentMethodOther.trim()
        : invoicePaymentMethod.trim();

    setLoading(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderCountryCode,
          destinationCountryCode,

          senderName, senderEmail,
          receiverName, receiverEmail,

          senderCountry, senderState, senderCity, senderAddress,
          senderPostalCode, senderPhone,

          receiverCountry, receiverState, receiverCity, receiverAddress,
          receiverPostalCode, receiverPhone,

          shipmentScope: scope,
          serviceLevel: effectiveServiceLevel,
          shipmentType: finalPackageType,
          packageDescription,
          shipmentMeans: MEANS_CONFIG[means].label,
          means,

          estimatedDeliveryDate: estimatedDeliveryDate
            ? new Date(estimatedDeliveryDate).toISOString()
            : null,
          estimatedDeliveryDateMin: dateOverrideEnabled
            ? null
            : autoDeliveryDateMinISO,

          weightKg: weight,
          dimensionsCm: {
            length: parseFloat(lengthCm) || 0,
            width: parseFloat(widthCm) || 0,
            height: parseFloat(heightCm) || 0,
          },

          declaredValue: dv,
          declaredValueCurrency: currency,

          // Per-shipment pricing override (server merges with stored profiles)
          pricingOverride,

          invoice: {
            status: invoiceStatus,
            dueDate: invoiceDueDate || null,
            paymentMethod: finalPaymentMethod || null,
          },

          status,
          statusNote,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(String(json?.error || "Failed to create shipment.")); return; }

      setOkMsg("Shipment created successfully.");
      const shipmentId = String(json?.shipment?.shipmentId || "").trim();
      if (shipmentId) {
        router.push(
          `/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`
        );
      }
    } catch (e: any) {
      setErr(String(e?.message || "Failed to create shipment."));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Create Shipment</h1>
          <p className="mt-2 text-gray-600">
            Fill in details, preview the invoice, then create the shipment.
          </p>
          {ratesLoading && (
            <p className="mt-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading pricing from Admin settings…
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Form column ─── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 space-y-8"
          >
            {/* Parties */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Parties</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Sender name <span className="text-red-500">*</span></label>
                  <input value={senderName} onChange={e => setSenderName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Sender email <span className="text-red-500">*</span></label>
                  <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} type="email"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Receiver name <span className="text-red-500">*</span></label>
                  <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Receiver email <span className="text-red-500">*</span></label>
                  <input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} type="email"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </section>

            {/* Sender address */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Sender address</h2>
              <div className="space-y-3">
                <CountrySelect label="Country" required value={senderCountry}
                  onChange={name => { setSenderCountry(name); setSenderState(""); setSenderCity(""); }}
                  onCountryChange={entry => { if (entry) setSenderCountryCode(entry.code); }} />
                <StateInput country={senderCountry} value={senderState} onChange={setSenderState} label="State / Province" required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
                    <input value={senderCity} onChange={e => setSenderCity(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Postal code <span className="text-red-500">*</span></label>
                    <input value={senderPostalCode} onChange={e => setSenderPostalCode(numericOnly(e.target.value, false))} inputMode="numeric"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
                  <input value={senderAddress} onChange={e => setSenderAddress(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <PhoneInput countryName={senderCountry} value={senderPhone} onChange={setSenderPhone} label="Phone" required />
              </div>
            </section>

            {/* Receiver address */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Receiver address</h2>
              <div className="space-y-3">
                <div>
                  <CountrySelect label="Country" required value={receiverCountry}
                    onChange={name => { setReceiverCountry(name); setReceiverState(""); setReceiverCity(""); }}
                    onCountryChange={entry => { if (entry) setDestinationCountryCode(entry.code); }} />
                  {scope === "local" && (
                    <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                      <Info size={11} /> Receiver country locked to sender country for local shipments
                    </p>
                  )}
                </div>
                <StateInput country={receiverCountry} value={receiverState} onChange={setReceiverState} label="State / Province" required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
                    <input value={receiverCity} onChange={e => setReceiverCity(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Postal code <span className="text-red-500">*</span></label>
                    <input value={receiverPostalCode} onChange={e => setReceiverPostalCode(numericOnly(e.target.value, false))} inputMode="numeric"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
                  <input value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <PhoneInput countryName={receiverCountry} value={receiverPhone} onChange={setReceiverPhone} label="Phone" required />
              </div>
            </section>

            {/* Shipment details */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Shipment details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Shipping type</label>
                  <select value={scope} onChange={e => setScope(e.target.value as ShipmentScope)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="international">International</option>
                    <option value="local">Local</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Service level</label>
                  <select value={serviceLevel} onChange={e => setServiceLevel(e.target.value as ServiceLevel)}
                    disabled={means === "sea" || weight >= 500 || isBulkOrContainer}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60">
                    <option>Standard</option>
                    <option>Express</option>
                  </select>
                  {means === "sea" && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> Sea is always Standard</p>
                  )}
                  {means === "air" && weight >= 500 && weight <= 10000 && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> 500+ kg uses Air Standard</p>
                  )}
                  {isBulkOrContainer && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> Bulk / Container is always Standard</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Package type <span className="text-red-500">*</span></label>
                  <select value={packageType} onChange={e => setPackageType(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {packageType === "Other" && (
                    <input value={packageTypeOther} onChange={e => setPackageTypeOther(e.target.value)}
                      placeholder="Specify package type"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  )}
                  {isBulkOrContainer && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> This package type uses Sea Freight automatically</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Shipment means {meansOverride === "auto" && <span className="text-xs font-normal text-gray-400">(auto)</span>}
                  </label>
                  <select value={meansOverride} onChange={e => setMeansOverride(e.target.value as any)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="auto">Auto ({MEANS_CONFIG[autoMeans].emoji} {MEANS_CONFIG[autoMeans].label})</option>
                    <option value="air">{MEANS_CONFIG.air.emoji} {MEANS_CONFIG.air.label}</option>
                    <option value="sea">{MEANS_CONFIG.sea.emoji} {MEANS_CONFIG.sea.label}</option>
                    <option value="land">{MEANS_CONFIG.land.emoji} {MEANS_CONFIG.land.label}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Package description <span className="text-red-500">*</span></label>
                  <textarea value={packageDescription} onChange={e => setPackageDescription(e.target.value)} rows={3}
                    placeholder="Describe the package contents..."
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Weight (kg) <span className="text-red-500">*</span></label>
                  <input value={weightKg} onChange={e => setWeightKg(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  {volumetricWeight > actualWeight && actualWeight > 0 && (
                    <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                      <Info size={11} /> Charged at volumetric weight: {formatMoney(volumetricWeight)} kg
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Dimensions (cm) <span className="text-red-500">*</span></label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <input value={lengthCm} onChange={e => setLengthCm(numericOnly(e.target.value))} inputMode="decimal" placeholder="L"
                      className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    <input value={widthCm} onChange={e => setWidthCm(numericOnly(e.target.value))} inputMode="decimal" placeholder="W"
                      className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    <input value={heightCm} onChange={e => setHeightCm(numericOnly(e.target.value))} inputMode="decimal" placeholder="H"
                      className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                </div>
              </div>
            </section>

            {/* Estimated delivery */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Estimated delivery</h2>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-white border border-gray-200">
                    {MEANS_CONFIG[means].emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{MEANS_CONFIG[means].label} · {effectiveServiceLevel}</p>
                    <p className="text-xs text-gray-500">{delivery.label}{distanceKm > 0 && ` · ~${Math.round(distanceKm).toLocaleString()} km`}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Auto Delivery</p>
                    <p className="text-xs font-bold text-gray-700 mt-0.5">{deliveryDateStr || "—"}</p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input type="checkbox" checked={dateOverrideEnabled}
                    onChange={e => {
                      setDateOverrideEnabled(e.target.checked);
                      if (e.target.checked && !dateOverride) setDateOverride(autoDeliveryDateMaxISO);
                    }}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-700 font-medium">Override estimated delivery date</span>
                </label>

                {dateOverrideEnabled && (
                  <input type="date" value={dateOverride} onChange={e => setDateOverride(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                )}
              </div>
            </section>

            {/* Invoice */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Invoice</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Declared value <span className="text-red-500">*</span></label>
                  <input value={declaredValue} onChange={e => setDeclaredValue(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Currency <span className="text-red-500">*</span></label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="USD">USD – US Dollar</option>
                    <option value="EUR">EUR – Euro</option>
                    <option value="GBP">GBP – British Pound</option>
                    <option value="NGN">NGN – Nigerian Naira</option>
                    <option value="AED">AED – UAE Dirham</option>
                    <option value="CAD">CAD – Canadian Dollar</option>
                    <option value="AUD">AUD – Australian Dollar</option>
                    <option value="JPY">JPY – Japanese Yen</option>
                    <option value="CNY">CNY – Chinese Yuan</option>
                    <option value="INR">INR – Indian Rupee</option>
                    <option value="BRL">BRL – Brazilian Real</option>
                    <option value="MXN">MXN – Mexican Peso</option>
                    <option value="ZAR">ZAR – South African Rand</option>
                    <option value="KES">KES – Kenyan Shilling</option>
                    <option value="GHS">GHS – Ghanaian Cedi</option>
                    <option value="EGP">EGP – Egyptian Pound</option>
                    <option value="SAR">SAR – Saudi Riyal</option>
                    <option value="TRY">TRY – Turkish Lira</option>
                    <option value="SGD">SGD – Singapore Dollar</option>
                    <option value="MYR">MYR – Malaysian Ringgit</option>
                    <option value="THB">THB – Thai Baht</option>
                    <option value="PHP">PHP – Philippine Peso</option>
                    <option value="IDR">IDR – Indonesian Rupiah</option>
                    <option value="VND">VND – Vietnamese Dong</option>
                    <option value="PKR">PKR – Pakistani Rupee</option>
                    <option value="BDT">BDT – Bangladeshi Taka</option>
                    <option value="CHF">CHF – Swiss Franc</option>
                    <option value="SEK">SEK – Swedish Krona</option>
                    <option value="NOK">NOK – Norwegian Krone</option>
                    <option value="DKK">DKK – Danish Krone</option>
                    <option value="PLN">PLN – Polish Zloty</option>
                    <option value="CZK">CZK – Czech Koruna</option>
                    <option value="HUF">HUF – Hungarian Forint</option>
                    <option value="RUB">RUB – Russian Ruble</option>
                    <option value="UAH">UAH – Ukrainian Hryvnia</option>
                    <option value="ARS">ARS – Argentine Peso</option>
                    <option value="CLP">CLP – Chilean Peso</option>
                    <option value="COP">COP – Colombian Peso</option>
                    <option value="PEN">PEN – Peruvian Sol</option>
                    <option value="NZD">NZD – New Zealand Dollar</option>
                    <option value="HKD">HKD – Hong Kong Dollar</option>
                    <option value="TWD">TWD – Taiwan Dollar</option>
                    <option value="KRW">KRW – Korean Won</option>
                    <option value="ILS">ILS – Israeli Shekel</option>
                    <option value="QAR">QAR – Qatari Rial</option>
                    <option value="KWD">KWD – Kuwaiti Dinar</option>
                    <option value="OMR">OMR – Omani Rial</option>
                    <option value="JOD">JOD – Jordanian Dinar</option>
                    <option value="LBP">LBP – Lebanese Pound</option>
                    <option value="MAD">MAD – Moroccan Dirham</option>
                    <option value="TND">TND – Tunisian Dinar</option>
                    <option value="DZD">DZD – Algerian Dinar</option>
                    <option value="ETB">ETB – Ethiopian Birr</option>
                    <option value="UGX">UGX – Ugandan Shilling</option>
                    <option value="TZS">TZS – Tanzanian Shilling</option>
                    <option value="RWF">RWF – Rwandan Franc</option>
                    <option value="XOF">XOF – West African CFA</option>
                    <option value="XAF">XAF – Central African CFA</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Invoice status</label>
                  <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value as any)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Invoice due date</label>
                  <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Payment method</label>
                  <select value={invoicePaymentMethod} onChange={e => setInvoicePaymentMethod(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m ? m : "Select a payment method"}</option>
                    ))}
                  </select>
                  {invoicePaymentMethod === "Other" && (
                    <input value={invoicePaymentMethodOther} onChange={e => setInvoicePaymentMethodOther(e.target.value)}
                      placeholder="Enter payment method"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Initial status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as ShipmentStatus)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option>Created</option>
                    <option>In Transit</option>
                    <option>Custom Clearance</option>
                    <option>Unclaimed</option>
                    <option>Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Status note (optional)</label>
                  <input value={statusNote} onChange={e => setStatusNote(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </section>

            {/* Pricing override */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-1">Charges (override per shipment)</h2>
              <p className="text-xs text-gray-600 mb-3">
                Loaded from Admin Pricing for the selected scope. Editing here applies only to this shipment.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Shipping fee</label>
                  <input value={shippingFee} onChange={e => setShippingFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Handling fee</label>
                  <input value={handlingFee} onChange={e => setHandlingFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Customs fee</label>
                  <input value={customsFee} onChange={e => setCustomsFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Tax</label>
                  <input value={taxFee} onChange={e => setTaxFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Discount</label>
                  <input value={discountFee} onChange={e => setDiscountFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Fuel %</label>
                  <input value={fuelRatePct} onChange={e => setFuelRatePct(numericOnly(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Insurance %</label>
                  <input value={insuranceRatePct} onChange={e => setInsuranceRatePct(numericOnly(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
            </section>

            {/* Submit + status */}
            <div>
              <button type="button" onClick={submit} disabled={loading || ratesLoading}
                className={`w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center ${
                  loading || ratesLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"
                }`}>
                {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating…</>)
                  : ratesLoading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading pricing…</>)
                  : (<><PlusCircle className="w-5 h-5 mr-2" /> Create Shipment</>)}
              </button>

              {attempted && (() => {
                const v = isFormValid({
                  senderName, senderEmail, senderCountry, senderState, senderCity,
                  senderAddress, senderPostalCode, senderPhone,
                  receiverName, receiverEmail, receiverCountry, receiverState,
                  receiverCity, receiverAddress, receiverPostalCode, receiverPhone,
                  packageType: finalPackageType, packageDescription,
                  weightKg, lengthCm, widthCm, heightCm,
                  declaredValue, currency, estimatedDeliveryDate,
                });
                return !v.valid ? (
                  <p className="mt-3 text-xs text-amber-600 font-semibold text-center">
                    Please fill in all required fields (*) — missing: {v.missing}
                  </p>
                ) : null;
              })()}

              {err && (
                <div className="mt-4 flex items-center text-red-600 font-semibold">
                  <AlertCircle className="w-5 h-5 mr-2" /> {err}
                </div>
              )}
              {okMsg && (
                <div className="mt-4 flex items-center text-green-700 font-semibold">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> {okMsg}
                </div>
              )}
            </div>
          </motion.div>

          {/* ─── Preview column ─── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 lg:sticky lg:top-6 self-start"
          >
            <p className="font-extrabold text-gray-900 mb-2">Invoice Preview</p>
            <p className="text-sm text-gray-600 mb-4">
              Calculated using full pricing rules — same engine the user dashboard and payment page use.
            </p>

            {!breakdown ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                Fill in weight, country, and declared value to see the invoice preview.
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <p className="font-extrabold text-gray-900">Declared Value</p>
                  <p className="text-sm text-gray-700">
                    {Number(breakdown.declaredValue).toLocaleString()} {currency}
                  </p>
                </div>

                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Base Freight ({MEANS_CONFIG[means].label})</span>
                    <span className="font-semibold">{formatMoney(breakdown.baseFreight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel Surcharge ({fuelRatePct || "—"}%)</span>
                    <span className="font-semibold">{formatMoney(breakdown.fuel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance ({insuranceRatePct || "—"}%)</span>
                    <span className="font-semibold">{formatMoney(breakdown.insurance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Handling</span>
                    <span className="font-semibold">{formatMoney(breakdown.handling)}</span>
                  </div>
                  {breakdown.customs > 0 && (
                    <div className="flex justify-between">
                      <span>Customs</span>
                      <span className="font-semibold">{formatMoney(breakdown.customs)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-bold">Subtotal</span>
                    <span className="font-bold">{formatMoney(breakdown.subtotal)}</span>
                  </div>
                  {breakdown.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span className="font-semibold">{formatMoney(breakdown.tax)}</span>
                    </div>
                  )}
                  {breakdown.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-semibold">−{formatMoney(breakdown.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t text-lg">
                    <span className="font-extrabold text-gray-900">Total</span>
                    <span className="font-extrabold text-blue-700">
                      {formatMoney(breakdown.total)} {currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <p><strong>Means:</strong> {MEANS_CONFIG[means].label}{meansOverride === "auto" ? " (auto)" : " (manual override)"}</p>
              <p><strong>Service:</strong> {effectiveServiceLevel}</p>
              <p><strong>Distance:</strong> {distanceKm > 0 ? `~${Math.round(distanceKm).toLocaleString()} km` : "—"}</p>
              <p><strong>Delivery window:</strong> {deliveryDateStr || "—"}{dateOverrideEnabled ? " (override)" : ""}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}