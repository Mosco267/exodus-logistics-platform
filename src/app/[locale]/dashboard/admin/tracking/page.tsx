"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PlusCircle,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

type LocationLite = {
  country?: string;
  state?: string;
  city?: string;
  county?: string;
};

type TrackingEvent = {
  key?: string;
  label: string;
  note?: string;
  occurredAt: string;
  color?: string;
  detailColor?: string;
  location?: LocationLite;
};

type StatusDoc = {
  key: string;
  label: string;
  color: string;
  icon?: string;
  defaultUpdate?: string;
  nextStep?: string;
};

const PRESET_COLORS = [
  { label: "Amber", value: "#f59e0b" },
  { label: "Green", value: "#22c55e" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Gray", value: "#6b7280" },
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-xl border border-gray-300 bg-white cursor-pointer"
        />
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              value === c.value
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
            style={{ borderLeftColor: c.value, borderLeftWidth: "3px" }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminShipmentTrackingPage() {
  const params = useParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const shipmentId = String(params?.shipmentId || "").trim();

  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Statuses from DB
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  // Form fields
  const [selectedStageKey, setSelectedStageKey] = useState("");
  const [label, setLabel] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [note, setNote] = useState("");
  const [defaultNote, setDefaultNote] = useState(""); // from status
  const [useDefaultNote, setUseDefaultNote] = useState(true);

  // Two colors:
  // stageColor = the main dot color on timeline (the stage pill color)
  // detailColor = color of the inner entry dot — defaults amber, overrides stageColor if red/green
  const [stageColor, setStageColor] = useState("#f59e0b");
  const [detailColor, setDetailColor] = useState("#f59e0b");

  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const [occurredAt, setOccurredAt] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  // Effective stage color: detail color overrides stage color if detail is red or green
  const effectiveStageColor = useMemo(() => {
    if (stageColor === "#ef4444") return stageColor; // red stage color is never overridden
    if (detailColor === "#ef4444") return "#ef4444";
    if (detailColor === "#22c55e") return "#22c55e";
    return stageColor;
  }, [stageColor, detailColor]);

  const events: TrackingEvent[] = useMemo(() => {
    const arr = Array.isArray(shipment?.trackingEvents) ? shipment.trackingEvents : [];
    return [...arr].sort(
      (a: any, b: any) =>
        new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime()
    );
  }, [shipment]);

  const load = async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load shipment");
      setShipment(json?.shipment || null);
      const s = json?.shipment;
      if (s) {
        setCountry((prev) => prev || String(s?.receiverCountry || s?.destinationCountryCode || "").trim());
        setState((prev) => prev || String(s?.receiverState || "").trim());
        setCity((prev) => prev || String(s?.receiverCity || "").trim());
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load shipment.");
    } finally {
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    try {
      const res = await fetch("/api/statuses", { cache: "no-store" });
      const data = await res.json();
      setStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
    } catch {
      setStatuses([]);
    }
  };

  useEffect(() => {
    if (!shipmentId) return;
    void load();
    void loadStatuses();
  }, [shipmentId]);

  const selectStage = (s: StatusDoc) => {
    setSelectedStageKey(s.key);
    setLabel(s.label);
    setDefaultNote(s.defaultUpdate || "");
    setUseDefaultNote(true);
    // Set stage color from status color name
    const colorMap: Record<string, string> = {
      blue: "#3b82f6", green: "#22c55e", red: "#ef4444", amber: "#f59e0b",
      orange: "#f97316", purple: "#8b5cf6", pink: "#ec4899", cyan: "#06b6d4",
      slate: "#64748b", indigo: "#6366f1", gray: "#6b7280",
    };
    setStageColor(colorMap[s.color?.toLowerCase()] || "#f59e0b");
    setShowStageDropdown(false);
  };

  const addEvent = async () => {
    setErr("");
    setOk("");

    if (!label.trim()) {
      setErr("Please select a stage or enter a status label.");
      return;
    }

    const iso = new Date(occurredAt).toISOString();
    const finalNote = useDefaultNote && defaultNote ? defaultNote : note.trim();

    // Parse current location string into parts
    const locParts = currentLocation.trim().split(",").map((p) => p.trim());
    const locCity = city || locParts[0] || "";
    const locState = state || locParts[1] || "";
    const locCountry = country || locParts[2] || "";

    const trackingEvent = {
      key: selectedStageKey || label.toLowerCase().trim().replace(/[\s_-]+/g, "-"),
      label: label.trim(),
      note: finalNote,
      occurredAt: iso,
      color: effectiveStageColor,
      detailColor: detailColor,
      location: {
        country: locCountry,
        state: locState,
        city: locCity,
        county: "",
      },
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingEvent }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save tracking update");
      setOk("Update saved successfully.");
      setNote("");
      setUseDefaultNote(true);
      await load();
      window.setTimeout(() => setOk(""), 3000);
    } catch (e: any) {
      setErr(e?.message || "Failed to save tracking update.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-gray-700">Loading…</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <p className="text-sm text-red-600">Shipment not found.</p>
      </div>
    );
  }

  const invoiceStatus = String(shipment?.invoice?.status || "unpaid").toLowerCase();
  const invoiceAmount = Number(shipment?.invoice?.amount ?? 0);
  const invoiceCurrency = String(shipment?.invoice?.currency || shipment?.declaredValueCurrency || "USD");

  const invoiceStatusColor =
    invoiceStatus === "paid" ? "text-green-700"
    : invoiceStatus === "overdue" || invoiceStatus === "cancelled" ? "text-red-700"
    : "text-amber-700";

  const invoiceStatusLabel = invoiceStatus === "paid" ? "PAID"
    : invoiceStatus === "overdue" ? "OVERDUE"
    : invoiceStatus === "cancelled" ? "CANCELLED"
    : "UNPAID";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`)}
              className="cursor-pointer inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-700 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to shipments
            </button>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
              Tracking Update
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Shipment: <span className="font-bold text-gray-800">{shipmentId}</span>
              {" · "}Tracking: <span className="font-bold text-gray-800">{shipment?.trackingNumber || "—"}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-right">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Invoice</p>
            <p className={`text-base font-extrabold ${invoiceStatusColor}`}>
              {invoiceStatusLabel} · {invoiceAmount.toFixed(2)} {invoiceCurrency}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── ADD UPDATE FORM ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6">
            <h2 className="text-lg font-extrabold text-gray-900">Add Tracking Update</h2>
            <p className="mt-1 text-sm text-gray-500">Each save appends a new entry to the timeline.</p>

            <div className="mt-5 space-y-4">

              {/* Stage selector dropdown */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Stage</label>
                <div className="relative mt-2">
                  <button
                    type="button"
                    onClick={() => setShowStageDropdown((v) => !v)}
                    className="cursor-pointer w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-left flex items-center justify-between hover:border-blue-400 transition focus:outline-none"
                  >
                    <span className={label ? "font-semibold text-gray-900" : "text-gray-400"}>
                      {label || "Select a timeline stage…"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStageDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {showStageDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                      <div className="max-h-56 overflow-y-auto">
                        {statuses.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-500">No stages found. Create them in Timeline Manager.</p>
                        ) : (
                          statuses.map((s) => (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => selectStage(s)}
                              className={`cursor-pointer w-full text-left px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-3 ${selectedStageKey === s.key ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800"}`}
                            >
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: (() => {
                                const colorMap: Record<string, string> = { blue: "#3b82f6", green: "#22c55e", red: "#ef4444", amber: "#f59e0b", orange: "#f97316", purple: "#8b5cf6", pink: "#ec4899", cyan: "#06b6d4", slate: "#64748b", indigo: "#6366f1", gray: "#6b7280" };
                                return colorMap[s.color?.toLowerCase()] || "#f59e0b";
                              })() }} />
                              {s.label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual override label */}
                <input
                  value={label}
                  onChange={(e) => { setLabel(e.target.value); setSelectedStageKey(""); }}
                  placeholder="Or type a custom label…"
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700 placeholder-gray-400"
                />
              </div>

              {/* Date & time */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Date & Time</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Current location */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Current Location</label>
                <input
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="e.g. Lagos, Lagos State, Nigeria"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                />
                <p className="mt-1 text-xs text-gray-400">Format: City, State, Country — or fill fields below</p>

                {/* Separate location fields */}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400" />
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400" />
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              {/* Details / note */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Details / Note</label>
                  {defaultNote && (
                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useDefaultNote}
                        onChange={(e) => setUseDefaultNote(e.target.checked)}
                        className="rounded"
                      />
                      Use default from stage
                    </label>
                  )}
                </div>

                {useDefaultNote && defaultNote ? (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-gray-700">
                    <p className="text-xs font-semibold text-blue-600 mb-1">Default from stage:</p>
                    {defaultNote}
                  </div>
                ) : (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Shipment received at warehouse. Departure planned in 10 minutes."
                    className="w-full min-h-[100px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                )}
              </div>

              {/* Stage color (main dot) */}
              <ColorPicker
                label="Stage Color (main timeline dot)"
                value={stageColor}
                onChange={setStageColor}
              />

              {/* Detail color (inner entry dot) */}
              <div>
                <ColorPicker
                  label="Detail Color (inner entry dot)"
                  value={detailColor}
                  onChange={setDetailColor}
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Default: Amber. If you set Red or Green here, it will also override the stage color above (unless the stage is already Red).
                </p>
                {/* Preview */}
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: effectiveStageColor }} />
                  <span className="text-xs text-gray-500">Stage dot preview</span>
                  <div className="w-3 h-3 rounded-full ml-4" style={{ background: detailColor }} />
                  <span className="text-xs text-gray-500">Detail dot preview</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={addEvent}
                disabled={saving}
                className="cursor-pointer w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving…</>
                ) : (
                  <><PlusCircle className="w-5 h-5 mr-2" />Add Update</>
                )}
              </button>

              {err && (
                <div className="flex items-center text-red-600 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" />{err}
                </div>
              )}
              {ok && (
                <div className="flex items-center text-green-700 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />{ok}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── TIMELINE PREVIEW ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6">
            <h2 className="text-lg font-extrabold text-gray-900">Timeline</h2>
            <p className="mt-1 text-sm text-gray-500">Exactly what the public tracking page shows.</p>

            <div className="mt-5 space-y-3">
              {events.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500 text-center">
                  No tracking updates yet.
                </div>
              ) : (
                events.map((ev, idx) => {
                  const loc = [ev?.location?.city, ev?.location?.state, ev?.location?.country]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-200 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                            <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0" style={{ background: ev.color || "#f59e0b" }} />
                            {ev.detailColor && (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ev.detailColor || "#f59e0b" }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-gray-900 text-sm">{ev.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(ev.occurredAt).toLocaleString()}
                              {loc ? ` · ${loc}` : ""}
                            </p>
                            {ev.note && <p className="mt-1.5 text-sm text-gray-700 leading-relaxed">{ev.note}</p>}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 shrink-0">#{idx + 1}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}