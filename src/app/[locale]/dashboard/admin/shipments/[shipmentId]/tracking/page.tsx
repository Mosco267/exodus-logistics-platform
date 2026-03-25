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
  Clock,
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
  details?: string;
  additionalNote?: string;
  occurredAt: string;
  color?: string;
  detailColor?: string;
  location?: LocationLite;
  currentLocation?: string;
};

type StatusDoc = {
  key: string;
  label: string;
  color: string;
  icon?: string;
  defaultUpdate?: string;
  nextStep?: string;
};

// Fix 2 — stages that should default to red
const RED_STAGES = new Set(["paymentissue", "invalidaddress", "cancelled", "canceled", "unclaimed"]);
// Fix 2 — stages that default to green
const GREEN_STAGES = new Set(["delivered"]);

function getDefaultColors(key: string): { stageColor: string; detailColor: string } {
  const k = key.toLowerCase().replace(/[\s_-]+/g, "");
  if (RED_STAGES.has(k)) return { stageColor: "#ef4444", detailColor: "#ef4444" };
  if (GREEN_STAGES.has(k)) return { stageColor: "#22c55e", detailColor: "#22c55e" };
  return { stageColor: "#f59e0b", detailColor: "#f59e0b" };
}

const PRESET_COLORS = [
  { label: "Amber", value: "#f59e0b" },
  { label: "Green", value: "#22c55e" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Gray", value: "#6b7280" },
];

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded-xl border border-gray-300 bg-white cursor-pointer" />
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${value === c.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            style={{ borderLeftColor: c.value, borderLeftWidth: "3px" }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getNowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  // Stage
  const [selectedStageKey, setSelectedStageKey] = useState("");
  const [label, setLabel] = useState("");

  // Fix 1 — three separate text fields
  const [details, setDetails] = useState("");           // must be filled by admin
  const [note, setNote] = useState("");                 // default from stage, editable
  const [additionalNote, setAdditionalNote] = useState(""); // default from stage, editable
  const [defaultNote, setDefaultNote] = useState("");   // loaded from stage

  // Colors
  const [stageColor, setStageColor] = useState("#f59e0b");
  const [detailColor, setDetailColor] = useState("#f59e0b");

  // Fix 3 — location fields
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [previousLocation, setPreviousLocation] = useState("");
  const [currentLocation, setCurrentLocation] = useState(""); // only editable one

  // Fix 4 — date mode
  const [useLocalTime, setUseLocalTime] = useState(true);
  const [occurredAt, setOccurredAt] = useState(getNowLocal);

  // Fix 5 — effective stage color logic
  // Red stage color is NEVER overridden
  // Amber/other can be overridden by detail color if detail is green/red
  const effectiveStageColor = useMemo(() => {
    if (stageColor === "#ef4444") return stageColor; // red is permanent
    if (detailColor === "#ef4444") return "#ef4444";
    if (detailColor === "#22c55e") return "#22c55e";
    return stageColor;
  }, [stageColor, detailColor]);

  const events: TrackingEvent[] = useMemo(() => {
    const arr = Array.isArray(shipment?.trackingEvents) ? shipment.trackingEvents : [];
    return [...arr].sort(
      (a: any, b: any) => new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime()
    );
  }, [shipment]);

  const load = async () => {
    setErr(""); setOk(""); setLoading(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load shipment");
      setShipment(json?.shipment || null);
      const s = json?.shipment;
      if (s) {
        // Fix 3 — pre-fill read-only location fields from shipment
        const dest = [s?.receiverCity, s?.receiverState, s?.receiverCountry].filter(Boolean).join(", ");
        const orig = [s?.senderCity, s?.senderState, s?.senderCountry].filter(Boolean).join(", ");
        setDestination(dest);
        setOrigin(orig);

        // Previous location = last event's location if any
        const evts = Array.isArray(s?.trackingEvents) ? s.trackingEvents : [];
        if (evts.length > 0) {
          const last = evts[evts.length - 1];
          const lc = [last?.location?.city, last?.location?.state, last?.location?.country].filter(Boolean).join(", ");
          setPreviousLocation(lc);
        }
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
    } catch { setStatuses([]); }
  };

  useEffect(() => {
    if (!shipmentId) return;
    void load();
    void loadStatuses();
  }, [shipmentId]);

  const selectStage = (s: StatusDoc) => {
    setSelectedStageKey(s.key);
    setLabel(s.label);

    // Fix 2 — set colors based on stage key
    const colors = getDefaultColors(s.key);
    setStageColor(colors.stageColor);
    setDetailColor(colors.detailColor);

    // Fix 1 — load default note/additional note from stage
    const def = s.defaultUpdate || "";
    setDefaultNote(def);
    setNote(def);
    setAdditionalNote(def);
    setDetails(""); // always empty — must be filled by admin

    setShowStageDropdown(false);
  };

  const addEvent = async () => {
    setErr(""); setOk("");

    if (!label.trim()) { setErr("Please select a stage."); return; }

    // Fix 1 — details is required
    if (!details.trim()) {
      setErr("Please fill in the Details field before adding this stage.");
      return;
    }

    // Fix 3 — current location required
    if (!currentLocation.trim()) {
      setErr("Please fill in the Current Location before adding this stage.");
      return;
    }

    // Fix 4 — use local time or custom
    const isoTime = useLocalTime ? new Date().toISOString() : new Date(occurredAt).toISOString();

    // Parse current location into city/state/country
    const parts = currentLocation.split(",").map((p) => p.trim());
    const locCity = parts[0] || "";
    const locState = parts[1] || "";
    const locCountry = parts[2] || "";

    const trackingEvent = {
      key: selectedStageKey || label.toLowerCase().trim().replace(/[\s_-]+/g, "-"),
      label: label.trim(),
      details: details.trim(),
      note: note.trim(),
      additionalNote: additionalNote.trim(),
      occurredAt: isoTime,

      // Fix 5 — store effective color so it's permanent in DB
      color: effectiveStageColor,
      detailColor: detailColor,

      location: {
        country: locCountry,
        state: locState,
        city: locCity,
        county: "",
      },
      currentLocation: currentLocation.trim(),
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
      // Reset form
      setDetails("");
      setNote("");
      setAdditionalNote("");
      setDefaultNote("");
      setCurrentLocation("");
      setLabel("");
      setSelectedStageKey("");
      setStageColor("#f59e0b");
      setDetailColor("#f59e0b");
      setUseLocalTime(true);
      setOccurredAt(getNowLocal());

      await load();
      window.setTimeout(() => setOk(""), 3000);
    } catch (e: any) {
      setErr(e?.message || "Failed to save tracking update.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-gray-700">Loading…</p></div>;
  if (!shipment) return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-red-600">Shipment not found.</p></div>;

  const invoiceStatus = String(shipment?.invoice?.status || "unpaid").toLowerCase();
  const invoiceAmount = Number(shipment?.invoice?.amount ?? 0);
  const invoiceCurrency = String(shipment?.invoice?.currency || shipment?.declaredValueCurrency || "USD");
  const invoiceStatusColor = invoiceStatus === "paid" ? "text-green-700" : invoiceStatus === "overdue" || invoiceStatus === "cancelled" ? "text-red-700" : "text-amber-700";
  const invoiceStatusLabel = invoiceStatus === "paid" ? "PAID" : invoiceStatus === "overdue" ? "OVERDUE" : invoiceStatus === "cancelled" ? "CANCELLED" : "UNPAID";

  const colorMap: Record<string, string> = {
    blue: "#3b82f6", green: "#22c55e", red: "#ef4444", amber: "#f59e0b",
    orange: "#f97316", purple: "#8b5cf6", pink: "#ec4899", cyan: "#06b6d4",
    slate: "#64748b", indigo: "#6366f1", gray: "#6b7280",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <button type="button" onClick={() => router.push(`/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`)} className="cursor-pointer inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-700 transition">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to shipments
            </button>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">Tracking Update</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Shipment: <span className="font-bold text-gray-800">{shipmentId}</span>
              {" · "}Tracking: <span className="font-bold text-gray-800">{shipment?.trackingNumber || "—"}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-right">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Invoice</p>
            <p className={`text-base font-extrabold ${invoiceStatusColor}`}>{invoiceStatusLabel} · {invoiceAmount.toFixed(2)} {invoiceCurrency}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── FORM ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6">
            <h2 className="text-lg font-extrabold text-gray-900">Add Tracking Update</h2>
            <p className="mt-1 text-sm text-gray-500">Each save appends a new entry to the timeline.</p>

            <div className="mt-5 space-y-4">

              {/* Stage dropdown */}
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
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colorMap[s.color?.toLowerCase()] || "#f59e0b" }} />
                              {s.label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fix 4 — Date mode toggle */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Date & Time</label>
                <div className="mt-2 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={useLocalTime} onChange={() => setUseLocalTime(true)} />
                    <Clock className="w-4 h-4 text-gray-400" />
                    Use my local time (auto)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!useLocalTime} onChange={() => setUseLocalTime(false)} />
                    Custom date & time
                  </label>
                </div>
                {!useLocalTime && (
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                )}
                {useLocalTime && (
                  <p className="mt-1.5 text-xs text-gray-400">Time will be recorded as the moment you click Add Update.</p>
                )}
              </div>

              {/* Fix 3 — Location fields */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <p className="text-sm font-extrabold text-gray-700 mb-1">Location</p>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Destination (read-only)</label>
                  <div className="mt-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">{destination || "—"}</div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Origin (read-only)</label>
                  <div className="mt-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">{origin || "—"}</div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous Location (read-only)</label>
                  <div className="mt-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">{previousLocation || "—"}</div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Current Location <span className="text-red-500">*</span></label>
                  <input
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    placeholder="e.g. Lagos, Lagos State, Nigeria"
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  />
                  <p className="mt-1 text-xs text-gray-400">Required. Format: City, State, Country</p>
                </div>
              </div>

              {/* Fix 1 — Details (required, empty by default) */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Details <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-gray-400">(required — describe what happened)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="e.g. Shipment arrived at the sorting facility and is being processed for the next stage."
                  className="mt-2 w-full min-h-[90px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Fix 1 — Note (default from stage, editable) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Note</label>
                  {defaultNote && (
                    <button type="button" onClick={() => setNote(defaultNote)} className="cursor-pointer text-xs text-blue-600 hover:underline">
                      Reset to default
                    </button>
                  )}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={defaultNote || "Optional note about this stage…"}
                  className="w-full min-h-[80px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Fix 1 — Additional Note (default from stage, editable) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Additional Note</label>
                  {defaultNote && (
                    <button type="button" onClick={() => setAdditionalNote(defaultNote)} className="cursor-pointer text-xs text-blue-600 hover:underline">
                      Reset to default
                    </button>
                  )}
                </div>
                <textarea
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  placeholder={defaultNote || "Optional additional note…"}
                  className="w-full min-h-[80px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Colors */}
              <ColorPicker label="Stage Color (main timeline dot)" value={stageColor} onChange={setStageColor} />

              <div>
                <ColorPicker label="Detail Color (inner entry dot)" value={detailColor} onChange={setDetailColor} />
                <p className="mt-1.5 text-xs text-gray-400">
                  Default: Amber. Red or Green detail color overrides the stage color unless the stage is already Red.
                </p>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: effectiveStageColor }} />
                  <span className="text-xs text-gray-500">Stage dot</span>
                  <div className="w-3 h-3 rounded-full ml-4" style={{ background: detailColor }} />
                  <span className="text-xs text-gray-500">Detail dot</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={addEvent}
                disabled={saving}
                className="cursor-pointer w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving…</> : <><PlusCircle className="w-5 h-5 mr-2" />Add Update</>}
              </button>

              {err && <div className="flex items-center text-red-600 font-semibold text-sm"><AlertCircle className="w-4 h-4 mr-2 shrink-0" />{err}</div>}
              {ok && <div className="flex items-center text-green-700 font-semibold text-sm"><CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />{ok}</div>}
            </div>
          </motion.div>

          {/* ── TIMELINE PREVIEW ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6">
            <h2 className="text-lg font-extrabold text-gray-900">Timeline</h2>
            <p className="mt-1 text-sm text-gray-500">Exactly what the public tracking page shows.</p>

            <div className="mt-5 space-y-3">
              {events.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500 text-center">No tracking updates yet.</div>
              ) : (
                events.map((ev, idx) => {
                  const loc = [ev?.location?.city, ev?.location?.state, ev?.location?.country].filter(Boolean).join(", ");
                  return (
                    <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-200 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                            <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ background: ev.color || "#f59e0b" }} />
                            {ev.detailColor && <span className="w-2.5 h-2.5 rounded-full" style={{ background: ev.detailColor }} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-gray-900 text-sm">{ev.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{new Date(ev.occurredAt).toLocaleString()}{loc ? ` · ${loc}` : ""}</p>
                            {ev.details && <p className="mt-1.5 text-sm text-gray-800 font-medium">{ev.details}</p>}
                            {ev.note && <p className="mt-1 text-sm text-gray-600">{ev.note}</p>}
                            {ev.additionalNote && ev.additionalNote !== ev.note && (
                              <p className="mt-1 text-xs text-gray-500 italic">{ev.additionalNote}</p>
                            )}
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