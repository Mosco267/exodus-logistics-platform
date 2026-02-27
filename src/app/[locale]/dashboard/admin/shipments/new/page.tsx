"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import {
  DEFAULT_PRICING,
  computeInvoiceFromDeclaredValue,
  type PricingSettings,
} from "@/lib/pricing";

type ShipmentStatus =
  | "Created"
  | "In Transit"
  | "Custom Clearance"
  | "Unclaimed"
  | "Delivered";

function toPct(rate: number) {
  const pct = rate * 100;
  return Number.isFinite(pct) ? pct.toFixed(2).replace(/\.00$/, "") : "0";
}
function fromPct(pct: string) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

export default function AdminCreateShipmentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const router = useRouter();

  // Parties
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderCountryCode, setSenderCountryCode] = useState("US");
  const [senderCountry, setSenderCountry] = useState("United States");
  const [senderState, setSenderState] = useState("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("NG");
  const [destinationCountry, setDestinationCountry] = useState("Nigeria");
  const [destinationState, setDestinationState] = useState("");

  // Shipment details
  const [shipmentType, setShipmentType] = useState<"Standard" | "Express">("Standard");
  const [packageType, setPackageType] = useState("Parcel");
  const [weightKg, setWeightKg] = useState<string>("2");
  const [lengthCm, setLengthCm] = useState<string>("24");
  const [widthCm, setWidthCm] = useState<string>("18");
  const [heightCm, setHeightCm] = useState<string>("12");

  // Invoice
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP" | "NGN">("USD");
  const [declaredValue, setDeclaredValue] = useState<string>("1000");
  const [invoicePaid, setInvoicePaid] = useState(false);
  const [status, setStatus] = useState<ShipmentStatus>("Created");
  const [statusNote, setStatusNote] = useState("");

  // Pricing (editable preview)
  const [shippingRatePct, setShippingRatePct] = useState(toPct(DEFAULT_PRICING.shippingRate));
  const [insuranceRatePct, setInsuranceRatePct] = useState(toPct(DEFAULT_PRICING.insuranceRate));
  const [customsRatePct, setCustomsRatePct] = useState(toPct(DEFAULT_PRICING.customsRate));
  const [fuelRatePct, setFuelRatePct] = useState(toPct(DEFAULT_PRICING.fuelRate));
  const [discountRatePct, setDiscountRatePct] = useState(toPct(DEFAULT_PRICING.discountRate));
  const [taxRatePct, setTaxRatePct] = useState(toPct(DEFAULT_PRICING.taxRate));

  const pricing: PricingSettings = useMemo(
    () => ({
      shippingRate: fromPct(shippingRatePct),
      insuranceRate: fromPct(insuranceRatePct),
      customsRate: fromPct(customsRatePct),
      fuelRate: fromPct(fuelRatePct),
      discountRate: fromPct(discountRatePct),
      taxRate: fromPct(taxRatePct),
    }),
    [shippingRatePct, insuranceRatePct, customsRatePct, fuelRatePct, discountRatePct, taxRatePct]
  );

  const breakdown = useMemo(() => {
    return computeInvoiceFromDeclaredValue(Number(declaredValue || 0), pricing);
  }, [declaredValue, pricing]);

  const invoiceAmount = breakdown.total;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const submit = async () => {
    setErr("");
    setOkMsg("");

    const dv = Number(declaredValue);
    if (!Number.isFinite(dv) || dv <= 0) {
      setErr("Declared value must be a valid number greater than 0.");
      return;
    }

    if (!senderCountryCode || senderCountryCode.trim().length !== 2) {
      setErr("Sender country code must be 2 letters (e.g. US).");
      return;
    }
    if (!destinationCountryCode || destinationCountryCode.trim().length !== 2) {
      setErr("Destination country code must be 2 letters (e.g. NG).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderCountryCode,
          destinationCountryCode,

          senderName,
          receiverName,
          senderEmail,
          receiverEmail,

          senderCountry,
          senderState,
          destinationCountry,
          destinationState,

          shipmentType,
          packageType,
          weightKg: Number(weightKg || 0),
          dimensionsCm: {
            length: Number(lengthCm || 0),
            width: Number(widthCm || 0),
            height: Number(heightCm || 0),
          },

          declaredValue: dv,

          invoiceCurrency: currency,
          invoicePaid,

          // let server compute invoiceAmount, but we also send preview + rates
          invoiceBreakdown: breakdown,
          pricingOverride: pricing,

          status,
          statusNote,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Failed to create shipment.");
        return;
      }

      setOkMsg("Shipment created successfully.");
      const shipmentId = String(json?.shipment?.shipmentId || "").trim();
      if (shipmentId) {
        // jump to admin shipments list (you can change later)
        router.push(`/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to create shipment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Create Shipment</h1>
          <p className="mt-2 text-gray-600">
            Fill details, preview invoice breakdown, then create shipment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6"
          >
            {/* Parties */}
            <p className="font-extrabold text-gray-900 mb-3">Parties</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Sender name</label>
                <input value={senderName} onChange={(e) => setSenderName(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Sender email</label>
                <input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Receiver name</label>
                <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Receiver email</label>
                <input value={receiverEmail} onChange={(e) => setReceiverEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender country code</label>
                <input value={senderCountryCode} onChange={(e) => setSenderCountryCode(e.target.value.toUpperCase())} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Destination country code</label>
                <input value={destinationCountryCode} onChange={(e) => setDestinationCountryCode(e.target.value.toUpperCase())} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender country</label>
                <input value={senderCountry} onChange={(e) => setSenderCountry(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Destination country</label>
                <input value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender state</label>
                <input value={senderState} onChange={(e) => setSenderState(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Destination state</label>
                <input value={destinationState} onChange={(e) => setDestinationState(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
            </div>

            {/* Shipment */}
            <p className="font-extrabold text-gray-900 mt-6 mb-3">Shipment details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Shipment type</label>
                <select value={shipmentType} onChange={(e) => setShipmentType(e.target.value as any)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                  <option>Standard</option>
                  <option>Express</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Package type</label>
                <input value={packageType} onChange={(e) => setPackageType(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Weight (kg)</label>
                <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Dimensions (cm)</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} inputMode="decimal" placeholder="L" className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  <input value={widthCm} onChange={(e) => setWidthCm(e.target.value)} inputMode="decimal" placeholder="W" className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} inputMode="decimal" placeholder="H" className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </div>

            {/* Invoice */}
            <p className="font-extrabold text-gray-900 mt-6 mb-3">Invoice</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Declared value</label>
                <input value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="NGN">NGN</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Invoice paid?</p>
                  <p className="text-xs text-gray-600">Default should be unpaid.</p>
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

              <div>
                <label className="text-sm font-semibold text-gray-700">Initial status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                  <option>Created</option>
                  <option>In Transit</option>
                  <option>Custom Clearance</option>
                  <option>Unclaimed</option>
                  <option>Delivered</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Status note (optional)</label>
                <input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
            </div>

            {/* Pricing controls */}
            <p className="font-extrabold text-gray-900 mt-6 mb-3">Rates (percent)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div><label className="text-xs font-semibold text-gray-700">Shipping %</label><input value={shippingRatePct} onChange={(e) => setShippingRatePct(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-700">Insurance %</label><input value={insuranceRatePct} onChange={(e) => setInsuranceRatePct(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-700">Fuel %</label><input value={fuelRatePct} onChange={(e) => setFuelRatePct(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-700">Customs %</label><input value={customsRatePct} onChange={(e) => setCustomsRatePct(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-700">Tax %</label><input value={taxRatePct} onChange={(e) => setTaxRatePct(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-700">Discount %</label><input value={discountRatePct} onChange={(e) => setDiscountRatePct(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" /></div>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className={[
                "mt-6 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center",
                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer",
              ].join(" ")}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 mr-2" /> Create Shipment
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
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6"
          >
            <p className="font-extrabold text-gray-900 mb-2">Invoice Preview</p>
            <p className="text-sm text-gray-600 mb-4">Calculated from declared value.</p>

            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="font-extrabold text-gray-900">Declared Value</p>
                <p className="text-sm text-gray-700">{Number(breakdown.declaredValue).toLocaleString()} {currency}</p>
              </div>

              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span>Shipping ({shippingRatePct}%)</span><span className="font-semibold">{breakdown.shipping.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Insurance ({insuranceRatePct}%)</span><span className="font-semibold">{breakdown.insurance.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Fuel ({fuelRatePct}%)</span><span className="font-semibold">{breakdown.fuel.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Customs / Duties ({customsRatePct}%)</span><span className="font-semibold">{breakdown.customs.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax ({taxRatePct}%)</span><span className="font-semibold">{breakdown.tax.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Discount ({discountRatePct}%)</span><span className="font-semibold">-{breakdown.discount.toFixed(2)}</span></div>
                <div className="flex justify-between pt-3 border-t"><span className="font-bold">Subtotal</span><span className="font-bold">{breakdown.subtotal.toFixed(2)}</span></div>

                <div className="flex justify-between pt-4 border-t text-lg">
                  <span className="font-extrabold text-gray-900">Total</span>
                  <span className="font-extrabold text-blue-700">{invoiceAmount.toFixed(2)} {currency}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}