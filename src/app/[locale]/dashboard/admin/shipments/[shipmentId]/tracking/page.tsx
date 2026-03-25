"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle, CheckCircle2, Loader2, PlusCircle, ArrowLeft,
  ChevronDown, Clock, Pencil, Trash2, Plus, X, Save,
} from "lucide-react";

type LocationLite = { country?: string; state?: string; city?: string; county?: string; };

type TrackingEvent = {
  key?: string;
  label: string;
  details?: string;
  note?: string;
  additionalNote?: string;
  occurredAt: string;
  color?: string;
  detailColor?: string;
  currentLocation?: string;
  location?: LocationLite;
  subEntries?: SubEntry[];
};

type SubEntry = {
  details?: string;
  note?: string;
  additionalNote?: string;
  color?: string;
  occurredAt: string;
  currentLocation?: string;
  location?: LocationLite;
};

type StatusDoc = { key: string; label: string; color: string; icon?: string; defaultUpdate?: string; nextStep?: string; };

const RED_STAGES = new Set(["paymentissue", "invalidaddress", "cancelled", "canceled", "unclaimed"]);
const GREEN_STAGES = new Set(["delivered"]);

function getDefaultColors(key: string) {
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

const colorMap: Record<string, string> = {
  blue: "#3b82f6", green: "#22c55e", red: "#ef4444", amber: "#f59e0b",
  orange: "#f97316", purple: "#8b5cf6", pink: "#ec4899", cyan: "#06b6d4",
  slate: "#64748b", indigo: "#6366f1", gray: "#6b7280",
};

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded-xl border border-gray-300 bg-white cursor-pointer" />
        {PRESET_COLORS.map((c) => (
          <button key={c.value} type="button" onClick={() => onChange(c.value)}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${value === c.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            style={{ borderLeftColor: c.value, borderLeftWidth: "3px" }}>
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

  // Form
  const [selectedStageKey, setSelectedStageKey] = useState("");
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [defaultNote, setDefaultNote] = useState("");
  const [stageColor, setStageColor] = useState("#f59e0b");
  const [detailColor, setDetailColor] = useState("#f59e0b");
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [previousLocation, setPreviousLocation] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [useLocalTime, setUseLocalTime] = useState(true);
  const [occurredAt, setOccurredAt] = useState(getNowLocal);

  // Fix 3 — inline edit state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<TrackingEvent>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Fix 3 — add sub-entry state
  const [addingSubIdx, setAddingSubIdx] = useState<number | null>(null);
  const [subEntry, setSubEntry] = useState({ details: "", note: "", additionalNote: "", color: "#f59e0b", currentLocation: "" });
  const [subSaving, setSubSaving] = useState(false);

  // Fix 3 — delete confirm
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  const effectiveStageColor = useMemo(() => {
    if (stageColor === "#ef4444") return stageColor;
    if (detailColor === "#ef4444") return "#ef4444";
    if (detailColor === "#22c55e") return "#22c55e";
    return stageColor;
  }, [stageColor, detailColor]);

  const events: TrackingEvent[] = useMemo(() => {
    const arr = Array.isArray(shipment?.trackingEvents) ? shipment.trackingEvents : [];
    return [...arr].sort((a: any, b: any) => new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime());
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
        const dest = [s?.receiverCity, s?.receiverState, s?.receiverCountry].filter(Boolean).join(", ");
        const orig = [s?.senderCity, s?.senderState, s?.senderCountry].filter(Boolean).join(", ");
        setDestination(dest);
        setOrigin(orig);
        const evts = Array.isArray(s?.trackingEvents) ? s.trackingEvents : [];
        if (evts.length > 0) {
          const last = evts[evts.length - 1];
          const lc = [last?.location?.city, last?.location?.state, last?.location?.country].filter(Boolean).join(", ");
          setPreviousLocation(lc);
        }
      }
    } catch (e: any) { setErr(e?.message || "Failed to load shipment."); }
    finally { setLoading(false); }
  };

  const loadStatuses = async () => {
    try {
      const res = await fetch("/api/statuses", { cache: "no-store" });
      const data = await res.json();
      setStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
    } catch { setStatuses([]); }
  };

  useEffect(() => { if (!shipmentId) return; void load(); void loadStatuses(); }, [shipmentId]);

  const selectStage = (s: StatusDoc) => {
    setSelectedStageKey(s.key);
    setLabel(s.label);
    const colors = getDefaultColors(s.key);
    setStageColor(colors.stageColor);
    setDetailColor(colors.detailColor);
    const def = s.defaultUpdate || "";
    setDefaultNote(def);
    setNote(def);
    setAdditionalNote(def);
    setDetails("");
    setShowStageDropdown(false);
  };

  const addEvent = async () => {
    setErr(""); setOk("");
    if (!label.trim()) { setErr("Please select a stage."); return; }
    if (!details.trim()) { setErr("Please fill in the Details field."); return; }
    if (!currentLocation.trim()) { setErr("Please fill in the Current Location."); return; }

    const isoTime = useLocalTime ? new Date().toISOString() : new Date(occurredAt).toISOString();
    const parts = currentLocation.split(",").map((p) => p.trim());

    const trackingEvent = {
      key: selectedStageKey || label.toLowerCase().trim().replace(/[\s_-]+/g, "-"),
      label: label.trim(),
      details: details.trim(),
      note: note.trim(),
      additionalNote: additionalNote.trim(),
      occurredAt: isoTime,
      color: effectiveStageColor,
      detailColor: detailColor,
      currentLocation: currentLocation.trim(),
      location: { country: parts[2] || "", state: parts[1] || "", city: parts[0] || "", county: "" },
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingEvent }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      setOk("Update saved successfully.");
      setDetails(""); setNote(""); setAdditionalNote(""); setDefaultNote("");
      setCurrentLocation(""); setLabel(""); setSelectedStageKey("");
      setStageColor("#f59e0b"); setDetailColor("#f59e0b");
      setUseLocalTime(true); setOccurredAt(getNowLocal());
      await load();
      window.setTimeout(() => setOk(""), 3000);
    } catch (e: any) { setErr(e?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  // Fix 3 — delete event
  const deleteEvent = async (idx: number) => {
    setDeletingIdx(idx);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteTrackingEventIndex: idx }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      setConfirmDeleteIdx(null);
      await load();
    } catch (e: any) { setErr(e?.message || "Failed to delete event."); }
    finally { setDeletingIdx(null); }
  };

  // Fix 3 — save edit
  const saveEdit = async (idx: number) => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editTrackingEventIndex: idx, editTrackingEventData: editData }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      setEditingIdx(null);
      setEditData({});
      await load();
    } catch (e: any) { setErr(e?.message || "Failed to save edit."); }
    finally { setEditSaving(false); }
  };

  // Fix 3 — save sub-entry
  const saveSubEntry = async (idx: number) => {
    if (!subEntry.details.trim()) { setErr("Details is required for sub-entry."); return; }
    setSubSaving(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addSubEntryToEventIndex: idx, subEntry }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add");
      setAddingSubIdx(null);
      setSubEntry({ details: "", note: "", additionalNote: "", color: "#f59e0b", currentLocation: "" });
      await load();
    } catch (e: any) { setErr(e?.message || "Failed to add sub-entry."); }
    finally { setSubSaving(false); }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-gray-700">Loading…</p></div>;
  if (!shipment) return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-red-600">Shipment not found.</p></div>;

  const invoiceStatus = String(shipment?.invoice?.status || "unpaid").toLowerCase();
  const invoiceAmount = Number(shipment?.invoice?.amount ?? 0);
  const invoiceCurrency = String(shipment?.invoice?.currency || shipment?.declaredValueCurrency || "USD");
  const invoiceStatusColor = invoiceStatus === "paid" ? "text-green-700" : invoiceStatus === "overdue" || invoiceStatus === "cancelled" ? "text-red-700" : "text-amber-700";
  const invoiceStatusLabel = invoiceStatus === "paid" ? "PAID" : invoiceStatus === "overdue" ? "OVERDUE" : invoiceStatus === "cancelled" ? "CANCELLED" : "UNPAID";

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
              Shipment: <span className="font-bold text-gray-800">{shipmentId}</span>{" · "}
              Tracking: <span className="font-bold text-gray-800">{shipment?.trackingNumber || "—"}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-right">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Invoice</p>
            <p className={`text-base font-extrabold ${invoiceStatusColor}`}>{invoiceStatusLabel} · {invoiceAmount.toFixed(2)} {invoiceCurrency}</p>
          </div>
        </div>

        {err && <div className="mb-4 flex items-center text-red-600 font-semibold text-sm bg-red-50 border border-red-200 rounded-2xl px-4 py-3"><AlertCircle className="w-4 h-4 mr-2 shrink-0" />{err}<button onClick={() => setErr("")} className="ml-auto cursor-pointer"><X className="w-4 h-4" /></button></div>}
        {ok && <div className="mb-4 flex items-center text-green-700 font-semibold text-sm bg-green-50 border border-green-200 rounded-2xl px-4 py-3"><CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />{ok}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── ADD FORM ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6">
            <h2 className="text-lg font-extrabold text-gray-900">Add Tracking Update</h2>
            <p className="mt-1 text-sm text-gray-500">Each save appends a new entry to the timeline.</p>

            <div className="mt-5 space-y-4">

              {/* Stage */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Stage</label>
                <div className="relative mt-2">
                  <button type="button" onClick={() => setShowStageDropdown((v) => !v)}
                    className="cursor-pointer w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-left flex items-center justify-between hover:border-blue-400 transition">
                    <span className={label ? "font-semibold text-gray-900" : "text-gray-400"}>{label || "Select a timeline stage…"}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStageDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showStageDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                      <div className="max-h-56 overflow-y-auto">
                        {statuses.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">No stages found.</p>
                          : statuses.map((s) => (
                            <button key={s.key} type="button" onClick={() => selectStage(s)}
                              className={`cursor-pointer w-full text-left px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-3 ${selectedStageKey === s.key ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800"}`}>
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colorMap[s.color?.toLowerCase()] || "#f59e0b" }} />
                              {s.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Date & Time</label>
                <div className="mt-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={useLocalTime} onChange={() => setUseLocalTime(true)} /><Clock className="w-4 h-4 text-gray-400" />Auto (local time)</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={!useLocalTime} onChange={() => setUseLocalTime(false)} />Custom</label>
                </div>
                {!useLocalTime && <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />}
                {useLocalTime && <p className="mt-1 text-xs text-gray-400">Recorded at the moment you click Add Update.</p>}
              </div>

              {/* Location */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <p className="text-sm font-extrabold text-gray-700">Location</p>
                {[["Destination", destination], ["Origin", origin], ["Previous Location", previousLocation]].map(([lbl, val]) => (
                  <div key={lbl}>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{lbl} (read-only)</label>
                    <div className="mt-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">{val || "—"}</div>
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Current Location <span className="text-red-500">*</span></label>
                  <input value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} placeholder="e.g. Lagos, Lagos State, Nigeria"
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <p className="mt-1 text-xs text-gray-400">Required. Format: City, State, Country</p>
                </div>
              </div>

              {/* Details (required) */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Details <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-400">(required)</span></label>
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what happened at this stage…"
                  className="mt-2 w-full min-h-[90px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
              </div>

              {/* Note */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Note</label>
                  {defaultNote && <button type="button" onClick={() => setNote(defaultNote)} className="cursor-pointer text-xs text-blue-600 hover:underline">Reset to default</button>}
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={defaultNote || "Optional note…"}
                  className="w-full min-h-[70px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
              </div>

              {/* Additional Note */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Additional Note</label>
                  {defaultNote && <button type="button" onClick={() => setAdditionalNote(defaultNote)} className="cursor-pointer text-xs text-blue-600 hover:underline">Reset to default</button>}
                </div>
                <textarea value={additionalNote} onChange={(e) => setAdditionalNote(e.target.value)} placeholder={defaultNote || "Optional additional note…"}
                  className="w-full min-h-[70px] rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
              </div>

              {/* Colors */}
              <ColorPicker label="Stage Color (main dot)" value={stageColor} onChange={setStageColor} />
              <div>
                <ColorPicker label="Detail Color (inner dot)" value={detailColor} onChange={setDetailColor} />
                <p className="mt-1.5 text-xs text-gray-400">Red or Green detail color overrides stage color unless stage is already Red.</p>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: effectiveStageColor }} />
                  <span className="text-xs text-gray-500">Stage dot</span>
                  <div className="w-3 h-3 rounded-full ml-4" style={{ background: detailColor }} />
                  <span className="text-xs text-gray-500">Detail dot</span>
                </div>
              </div>

              <button type="button" onClick={addEvent} disabled={saving}
                className="cursor-pointer w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center hover:bg-blue-700 disabled:opacity-60">
                {saving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving…</> : <><PlusCircle className="w-5 h-5 mr-2" />Add Update</>}
              </button>
            </div>
          </motion.div>

          {/* ── TIMELINE with Edit/Delete/Add ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6">
            <h2 className="text-lg font-extrabold text-gray-900">Timeline</h2>
            <p className="mt-1 text-sm text-gray-500">Edit, delete or add sub-entries to any stage.</p>

            <div className="mt-5 space-y-3">
              {events.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500 text-center">No tracking updates yet.</div>
              ) : (
                events.map((ev, idx) => {
                  const loc = [ev?.location?.city, ev?.location?.state, ev?.location?.country].filter(Boolean).join(", ");
                  const isEditing = editingIdx === idx;
                  const isAddingSub = addingSubIdx === idx;
                  const isConfirmDelete = confirmDeleteIdx === idx;

                  return (
                    <div key={idx} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

                      {/* Event header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                              <span className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ background: ev.color || "#f59e0b" }} />
                              {ev.detailColor && <span className="w-2.5 h-2.5 rounded-full" style={{ background: ev.detailColor }} />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-gray-900 text-sm">{ev.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{new Date(ev.occurredAt).toLocaleString()}{loc ? ` · ${loc}` : ""}</p>
                              {/* Fix 2 — show details, note, additionalNote separately */}
                              {ev.details && <p className="mt-1.5 text-sm text-gray-900 font-medium leading-relaxed">{ev.details}</p>}
                              {ev.note && <p className="mt-1 text-sm text-gray-600 leading-relaxed">{ev.note}</p>}
                              {ev.additionalNote && ev.additionalNote !== ev.note && (
                                <p className="mt-1 text-xs text-gray-500 italic leading-relaxed">{ev.additionalNote}</p>
                              )}
                              {ev.currentLocation && <p className="mt-1 text-xs text-blue-600 font-semibold">📍 {ev.currentLocation}</p>}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                            <button type="button" onClick={() => { setEditingIdx(isEditing ? null : idx); setEditData({ label: ev.label, details: ev.details || "", note: ev.note || "", additionalNote: ev.additionalNote || "", color: ev.color || "#f59e0b", detailColor: ev.detailColor || "#f59e0b", currentLocation: ev.currentLocation || "" }); }}
                              className="cursor-pointer p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition" title="Edit">
                              {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                            </button>
                            <button type="button" onClick={() => setAddingSubIdx(isAddingSub ? null : idx)}
                              className="cursor-pointer p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition" title="Add sub-entry">
                              <Plus className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteIdx(isConfirmDelete ? null : idx)}
                              className="cursor-pointer p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sub-entries */}
                      {Array.isArray(ev.subEntries) && ev.subEntries.length > 0 && (
                        <div className="border-t border-gray-100 px-4 pb-3 pt-2 space-y-2">
                          {ev.subEntries.map((sub, si) => (
                            <div key={si} className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                              <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: sub.color || "#f59e0b" }} />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">{new Date(sub.occurredAt).toLocaleString()}{sub.currentLocation ? ` · ${sub.currentLocation}` : ""}</p>
                                {sub.details && <p className="text-sm text-gray-800 font-medium mt-0.5">{sub.details}</p>}
                                {sub.note && <p className="text-xs text-gray-600 mt-0.5">{sub.note}</p>}
                                {sub.additionalNote && sub.additionalNote !== sub.note && <p className="text-xs text-gray-500 italic mt-0.5">{sub.additionalNote}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="border-t border-blue-100 bg-blue-50/40 p-4 space-y-3">
                          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Editing Stage #{idx + 1}</p>
                          <input value={editData.label || ""} onChange={(e) => setEditData({ ...editData, label: e.target.value })} placeholder="Label" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                          <textarea value={editData.details || ""} onChange={(e) => setEditData({ ...editData, details: e.target.value })} placeholder="Details" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:border-blue-400" />
                          <textarea value={editData.note || ""} onChange={(e) => setEditData({ ...editData, note: e.target.value })} placeholder="Note" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:border-blue-400" />
                          <textarea value={editData.additionalNote || ""} onChange={(e) => setEditData({ ...editData, additionalNote: e.target.value })} placeholder="Additional Note" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:border-blue-400" />
                          <input value={editData.currentLocation || ""} onChange={(e) => setEditData({ ...editData, currentLocation: e.target.value })} placeholder="Current Location" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                          <div className="flex gap-2 flex-wrap">
                            {PRESET_COLORS.map((c) => (
                              <button key={c.value} type="button" onClick={() => setEditData({ ...editData, color: c.value })}
                                className={`cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${editData.color === c.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                                style={{ borderLeftColor: c.value, borderLeftWidth: "3px" }}>{c.label}</button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => saveEdit(idx)} disabled={editSaving}
                              className="cursor-pointer flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                              {editSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save</>}
                            </button>
                            <button type="button" onClick={() => { setEditingIdx(null); setEditData({}); }} className="cursor-pointer px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Add sub-entry form */}
                      {isAddingSub && (
                        <div className="border-t border-green-100 bg-green-50/30 p-4 space-y-3">
                          <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Add Detail to Stage #{idx + 1}</p>
                          <textarea value={subEntry.details} onChange={(e) => setSubEntry({ ...subEntry, details: e.target.value })} placeholder="Details (required)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:border-green-400" />
                          <textarea value={subEntry.note} onChange={(e) => setSubEntry({ ...subEntry, note: e.target.value })} placeholder="Note (optional)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:border-green-400" />
                          <textarea value={subEntry.additionalNote} onChange={(e) => setSubEntry({ ...subEntry, additionalNote: e.target.value })} placeholder="Additional Note (optional)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:border-green-400" />
                          <input value={subEntry.currentLocation} onChange={(e) => setSubEntry({ ...subEntry, currentLocation: e.target.value })} placeholder="Current Location" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-green-400" />
                          <div className="flex gap-2 flex-wrap">
                            {PRESET_COLORS.map((c) => (
                              <button key={c.value} type="button" onClick={() => setSubEntry({ ...subEntry, color: c.value })}
                                className={`cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${subEntry.color === c.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
                                style={{ borderLeftColor: c.value, borderLeftWidth: "3px" }}>{c.label}</button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => saveSubEntry(idx)} disabled={subSaving}
                              className="cursor-pointer flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                              {subSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Plus className="w-4 h-4" />Add</>}
                            </button>
                            <button type="button" onClick={() => { setAddingSubIdx(null); setSubEntry({ details: "", note: "", additionalNote: "", color: "#f59e0b", currentLocation: "" }); }} className="cursor-pointer px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Delete confirm */}
                      {isConfirmDelete && (
                        <div className="border-t border-red-100 bg-red-50/30 p-4">
                          <p className="text-sm font-semibold text-red-700 mb-3">Delete stage "{ev.label}"? This cannot be undone.</p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => deleteEvent(idx)} disabled={deletingIdx === idx}
                              className="cursor-pointer flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                              {deletingIdx === idx ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Yes, Delete</>}
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteIdx(null)} className="cursor-pointer px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">No, Keep</button>
                          </div>
                        </div>
                      )}
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