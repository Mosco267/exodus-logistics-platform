"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Save,
} from "lucide-react";

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";
type ShipmentStatus =
  | "Created"
  | "In Transit"
  | "Custom Clearance"
  | "Unclaimed"
  | "Delivered"
  | string;

function safeStr(v: any) {
  return String(v ?? "").trim();
}
function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toDateInputValue(v: any) {
  const s = safeStr(v);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminEditShipmentPage() {
  const params = useParams();

  const locale = (params?.locale as string) || "en";
  const shipmentId = safeStr(params?.shipmentId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // parties
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderCountryCode, setSenderCountryCode] = useState("");
  const [senderCountry, setSenderCountry] = useState("");
  const [senderState, setSenderState] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderPostalCode, setSenderPostalCode] = useState("");
  const [senderPhone, setSenderPhone] = useState("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [receiverCountry, setReceiverCountry] = useState("");
  const [receiverState, setReceiverState] = useState("");
  const [receiverCity, setReceiverCity] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverPostalCode, setReceiverPostalCode] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  // shipment details
  const [serviceLevel, setServiceLevel] = useState<"Standard" | "Express">(
    "Standard"
  );
  const [shipmentType, setShipmentType] = useState("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [lengthCm, setLengthCm] = useState<string>("");
  const [widthCm, setWidthCm] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [status, setStatus] = useState<ShipmentStatus>("Created");
  const [statusNote, setStatusNote] = useState("");

  // invoice
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP" | "NGN">("USD");
  const [declaredValue, setDeclaredValue] = useState<string>("");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("unpaid");
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>("");
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<string>("");

  const dueIso = useMemo(() => {
    const v = safeStr(invoiceDueDate);
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
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
        const res = await fetch(
          `/api/shipments/${encodeURIComponent(shipmentId)}`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setErr(json?.error || "Failed to load shipment.");
          return;
        }

        const sh = json?.shipment || {};
        const inv = sh?.invoice || {};
        const dims = sh?.dimensionsCm || {};

        // parties
        setSenderName(safeStr(sh?.senderName));
        setSenderEmail(safeStr(sh?.senderEmail));
        setSenderCountryCode(safeStr(sh?.senderCountryCode).toUpperCase());
        setSenderCountry(safeStr(sh?.senderCountry));
        setSenderState(safeStr(sh?.senderState));
        setSenderCity(safeStr(sh?.senderCity));
        setSenderAddress(safeStr(sh?.senderAddress));
        setSenderPostalCode(safeStr(sh?.senderPostalCode));
        setSenderPhone(safeStr(sh?.senderPhone));

        setReceiverName(safeStr(sh?.receiverName));
        setReceiverEmail(safeStr(sh?.receiverEmail));
        setDestinationCountryCode(safeStr(sh?.destinationCountryCode).toUpperCase());
        setReceiverCountry(safeStr(sh?.receiverCountry));
        setReceiverState(safeStr(sh?.receiverState));
        setReceiverCity(safeStr(sh?.receiverCity));
        setReceiverAddress(safeStr(sh?.receiverAddress));
        setReceiverPostalCode(safeStr(sh?.receiverPostalCode));
        setReceiverPhone(safeStr(sh?.receiverPhone));

        // shipment details
        setServiceLevel(
          safeStr(sh?.serviceLevel) === "Express" ? "Express" : "Standard"
        );
        setShipmentType(safeStr(sh?.shipmentType));
        setWeightKg(
          sh?.weightKg !== undefined && sh?.weightKg !== null
            ? String(sh.weightKg)
            : ""
        );
        setLengthCm(
          dims?.length !== undefined && dims?.length !== null
            ? String(dims.length)
            : ""
        );
        setWidthCm(
          dims?.width !== undefined && dims?.width !== null
            ? String(dims.width)
            : ""
        );
        setHeightCm(
          dims?.height !== undefined && dims?.height !== null
            ? String(dims.height)
            : ""
        );
        setStatus(safeStr(sh?.status) || "Created");
        setStatusNote(safeStr(sh?.statusNote));

        // invoice
        setCurrency(
          (safeStr(inv?.currency || sh?.declaredValueCurrency || "USD").toUpperCase() as
            | "USD"
            | "EUR"
            | "GBP"
            | "NGN") || "USD"
        );
        setDeclaredValue(String(sh?.declaredValue ?? sh?.packageValue ?? ""));

        const rawStatus = safeStr(inv?.status || inv?.invoiceStatus).toLowerCase();
        const normalized: InvoiceStatus =
          rawStatus === "paid"
            ? "paid"
            : rawStatus === "overdue"
            ? "overdue"
            : rawStatus === "cancelled" || rawStatus === "canceled"
            ? "cancelled"
            : "unpaid";

        setInvoiceStatus(normalized);
        setInvoiceDueDate(toDateInputValue(inv?.dueDate));
        setInvoicePaymentMethod(safeStr(inv?.paymentMethod));
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

    if (senderCountryCode && senderCountryCode.trim().length !== 2) {
      setErr("Sender country code must be 2 letters.");
      return;
    }

    if (destinationCountryCode && destinationCountryCode.trim().length !== 2) {
      setErr("Destination country code must be 2 letters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/shipments/${encodeURIComponent(shipmentId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderName,
            senderEmail,
            senderCountryCode: senderCountryCode.toUpperCase(),
            senderCountry,
            senderState,
            senderCity,
            senderAddress,
            senderPostalCode,
            senderPhone,

            receiverName,
            receiverEmail,
            destinationCountryCode: destinationCountryCode.toUpperCase(),
            receiverCountry,
            receiverState,
            receiverCity,
            receiverAddress,
            receiverPostalCode,
            receiverPhone,

            serviceLevel,
            shipmentType,
            weightKg: num(weightKg),
            dimensionsCm: {
              length: num(lengthCm),
              width: num(widthCm),
              height: num(heightCm),
            },

            declaredValue: dv,
            declaredValueCurrency: currency,

            status,
            statusNote,

            invoice: {
              status: invoiceStatus,
              dueDate: dueIso,
              paymentMethod: safeStr(invoicePaymentMethod) || null,
              currency,
            },
          }),
        }
      );

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
    <div className="max-w-6xl mx-auto px-4 py-8">
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
          <p className="text-xl font-extrabold text-gray-900 break-all">
            {shipmentId || "—"}
          </p>
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
            <p className="font-extrabold text-gray-900 mb-4">Parties</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Sender name</label>
                <input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender email</label>
                <input
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Sender country code
                </label>
                <input
                  value={senderCountryCode}
                  onChange={(e) => setSenderCountryCode(e.target.value.toUpperCase())}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender country</label>
                <input
                  value={senderCountry}
                  onChange={(e) => setSenderCountry(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender state</label>
                <input
                  value={senderState}
                  onChange={(e) => setSenderState(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender city</label>
                <input
                  value={senderCity}
                  onChange={(e) => setSenderCity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Sender postal code
                </label>
                <input
                  value={senderPostalCode}
                  onChange={(e) => setSenderPostalCode(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Sender phone</label>
                <input
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Sender address</label>
                <input
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Receiver name</label>
                <input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Receiver email</label>
                <input
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Destination country code
                </label>
                <input
                  value={destinationCountryCode}
                  onChange={(e) =>
                    setDestinationCountryCode(e.target.value.toUpperCase())
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Receiver country
                </label>
                <input
                  value={receiverCountry}
                  onChange={(e) => setReceiverCountry(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Receiver state</label>
                <input
                  value={receiverState}
                  onChange={(e) => setReceiverState(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Receiver city</label>
                <input
                  value={receiverCity}
                  onChange={(e) => setReceiverCity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Receiver postal code
                </label>
                <input
                  value={receiverPostalCode}
                  onChange={(e) => setReceiverPostalCode(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Receiver phone</label>
                <input
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Receiver address
                </label>
                <input
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <p className="font-extrabold text-gray-900 mt-8 mb-4">Shipment details</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Service level</label>
                <select
                  value={serviceLevel}
                  onChange={(e) => setServiceLevel(e.target.value as "Standard" | "Express")}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white"
                >
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Shipment type</label>
                <input
                  value={shipmentType}
                  onChange={(e) => setShipmentType(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Weight (kg)</label>
                <input
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Shipment status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white"
                >
                  <option value="Created">Created</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Custom Clearance">Custom Clearance</option>
                  <option value="Unclaimed">Unclaimed</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Status note
                </label>
                <input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Dimensions (cm)
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    value={lengthCm}
                    onChange={(e) => setLengthCm(e.target.value)}
                    placeholder="Length"
                    inputMode="decimal"
                    className="rounded-2xl border border-gray-300 px-3 py-3 text-sm"
                  />
                  <input
                    value={widthCm}
                    onChange={(e) => setWidthCm(e.target.value)}
                    placeholder="Width"
                    inputMode="decimal"
                    className="rounded-2xl border border-gray-300 px-3 py-3 text-sm"
                  />
                  <input
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="Height"
                    inputMode="decimal"
                    className="rounded-2xl border border-gray-300 px-3 py-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <p className="font-extrabold text-gray-900 mt-8 mb-4">Invoice fields</p>

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
                <label className="text-sm font-semibold text-gray-700">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "EUR" | "GBP" | "NGN")}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="NGN">NGN</option>
                </select>
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

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Payment method</label>
                <input
                  value={invoicePaymentMethod}
                  onChange={(e) => setInvoicePaymentMethod(e.target.value)}
                  placeholder="e.g. Bank transfer / PayPal / Crypto"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={[
                "mt-6 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center",
                saving
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-blue-700 cursor-pointer",
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