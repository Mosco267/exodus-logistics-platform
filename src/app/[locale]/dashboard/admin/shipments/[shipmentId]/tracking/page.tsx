"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, CheckCircle2, Loader2, PlusCircle, ArrowLeft,
  ChevronDown, Clock, Pencil, Trash2, Plus, X, Save,
  MapPin, FileText, StickyNote, MessageSquare,
} from "lucide-react";

type LocationLite = { country?: string; state?: string; city?: string; county?: string; };
type TrackingEvent = {
  key?: string; label: string; details?: string; note?: string; additionalNote?: string;
  occurredAt: string; color?: string; detailColor?: string; currentLocation?: string; location?: LocationLite;
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

const colorMap: Record<string, string> = {
  blue: "#3b82f6", green: "#22c55e", red: "#ef4444", amber: "#f59e0b",
  orange: "#f97316", purple: "#8b5cf6", pink: "#ec4899", cyan: "#06b6d4",
  slate: "#64748b", indigo: "#6366f1", gray: "#6b7280",
};

const PRESET_COLORS = [
  { label: "Amber", value: "#f59e0b", bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" },
  { label: "Green", value: "#22c55e", bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
  { label: "Red", value: "#ef4444", bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
  { label: "Blue", value: "#3b82f6", bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  { label: "Purple", value: "#8b5cf6", bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700" },
  { label: "Gray", value: "#6b7280", bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700" },
];

// Simple country/state/city data
const COUNTRIES = ["Nigeria", "United States", "United Kingdom", "Canada", "Germany", "France", "Australia", "Ghana", "South Africa", "Kenya", "India", "China", "Brazil", "Mexico", "Japan", "South Korea", "Italy", "Spain", "Netherlands", "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Belgium", "Portugal", "Poland", "Turkey", "Saudi Arabia", "UAE", "Qatar", "Egypt", "Morocco", "Ethiopia", "Tanzania", "Uganda", "Rwanda", "Senegal", "Ivory Coast", "Cameroon", "Angola", "Mozambique", "Zimbabwe", "Zambia", "Botswana", "Namibia", "Singapore", "Malaysia", "Indonesia", "Philippines", "Thailand", "Vietnam", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Jamaica", "Trinidad and Tobago", "Barbados", "New Zealand", "Ireland", "Scotland", "Wales"].sort();

const STATES_BY_COUNTRY: Record<string, string[]> = {
  "Nigeria": ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"],
  "United States": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  "Canada": ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan"],
  "Germany": ["Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"],
  "Ghana": ["Ashanti", "Brong-Ahafo", "Central", "Eastern", "Greater Accra", "Northern", "Upper East", "Upper West", "Volta", "Western"],
  "South Africa": ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape"],
  "Kenya": ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Machakos", "Meru", "Kilifi", "Kakamega", "Kisii"],
};

function getStates(country: string): string[] {
  return STATES_BY_COUNTRY[country] || [];
}

function getNowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ColorDots({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          title={c.label}
          className={`cursor-pointer relative w-8 h-8 rounded-full border-2 transition-all ${
            value === c.value ? "border-gray-800 scale-110 shadow-md" : "border-white shadow-sm hover:scale-105"
          }`}
          style={{ background: c.value }}
        >
          {value === c.value && (
            <span className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
            </span>
          )}
        </button>
      ))}
      <div className="relative flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer overflow-hidden"
          title="Custom color"
        />
        <span className="text-xs text-gray-400">Custom</span>
      </div>
      <div className="flex items-center gap-1.5 ml-1">
        <div className="w-5 h-5 rounded-full border border-gray-200 shadow-sm" style={{ background: value }} />
        <span className="text-xs font-mono text-gray-500">{value}</span>
      </div>
    </div>
  );
}

function LocationFields({
  city, state, country,
  onCity, onState, onCountry,
  label = "Location",
}: {
  city: string; state: string; country: string;
  onCity: (v: string) => void; onState: (v: string) => void; onCountry: (v: string) => void;
  label?: string;
}) {
  const states = getStates(country);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</label>
      <div className="grid grid-cols-1 gap-2">
        {/* Country dropdown */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Country</label>
          <select
            value={country}
            onChange={(e) => { onCountry(e.target.value); onState(""); onCity(""); }}
            className="cursor-pointer w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-800"
          >
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {/* State dropdown or input */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">State / Province</label>
          {states.length > 0 ? (
            <select
              value={state}
              onChange={(e) => { onState(e.target.value); onCity(""); }}
              className="cursor-pointer w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-800"
            >
              <option value="">Select state…</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input
              value={state}
              onChange={(e) => onState(e.target.value)}
              placeholder="Enter state / province"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
          )}
        </div>
        {/* City input */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">City</label>
          <input
            value={city}
            onChange={(e) => onCity(e.target.value)}
            placeholder="Enter city"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
      {(city || state || country) && (
        <p className="text-xs text-blue-600 font-medium">
          📍 {[city, state, country].filter(Boolean).join(", ")}
        </p>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
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
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  // Main form
  const [selectedStageKey, setSelectedStageKey] = useState("");
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [defaultNote, setDefaultNote] = useState("");
  const [stageColor, setStageColor] = useState("#f59e0b");
  const [detailColor, setDetailColor] = useState("#f59e0b");
  const [locCity, setLocCity] = useState("");
  const [locState, setLocState] = useState("");
  const [locCountry, setLocCountry] = useState("");
  const [useLocalTime, setUseLocalTime] = useState(true);
  const [occurredAt, setOccurredAt] = useState(getNowLocal);

  // Read-only info
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [previousLocation, setPreviousLocation] = useState("");

  // Edit state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDetails, setEditDetails] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editAdditionalNote, setEditAdditionalNote] = useState("");
  const [editColor, setEditColor] = useState("#f59e0b");
  const [editDetailColor, setEditDetailColor] = useState("#f59e0b");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Add sub-entry state
  const [addingSubIdx, setAddingSubIdx] = useState<number | null>(null);
  const [subDetails, setSubDetails] = useState("");
  const [subNote, setSubNote] = useState("");
  const [subAdditionalNote, setSubAdditionalNote] = useState("");
  const [subColor, setSubColor] = useState("#f59e0b");
  const [subCity, setSubCity] = useState("");
  const [subState, setSubState] = useState("");
  const [subCountry, setSubCountry] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  // Delete state
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
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setShipment(json?.shipment || null);
      const s = json?.shipment;
      if (s) {
        setDestination([s?.receiverCity, s?.receiverState, s?.receiverCountry].filter(Boolean).join(", "));
        setOrigin([s?.senderCity, s?.senderState, s?.senderCountry].filter(Boolean).join(", "));
        const evts = Array.isArray(s?.trackingEvents) ? s.trackingEvents : [];
        if (evts.length > 0) {
          const last = evts[evts.length - 1];
          setPreviousLocation([last?.location?.city, last?.location?.state, last?.location?.country].filter(Boolean).join(", "));
        }
      }
    } catch (e: any) { setErr(e?.message || "Failed to load."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!shipmentId) return;
    void load();
    fetch("/api/statuses", { cache: "no-store" }).then(r => r.json()).then(d => setStatuses(Array.isArray(d?.statuses) ? d.statuses : [])).catch(() => {});
  }, [shipmentId]);

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
    if (!details.trim()) { setErr("Details is required."); return; }
    if (!locCity.trim() && !locCountry.trim()) { setErr("Please fill in at least city and country."); return; }

    const isoTime = useLocalTime ? new Date().toISOString() : new Date(occurredAt).toISOString();
    const locStr = [locCity, locState, locCountry].filter(Boolean).join(", ");

    setSaving(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingEvent: {
            key: selectedStageKey || label.toLowerCase().trim().replace(/[\s_-]+/g, "-"),
            label: label.trim(), details: details.trim(), note: note.trim(),
            additionalNote: additionalNote.trim(), occurredAt: isoTime,
            color: effectiveStageColor, detailColor,
            currentLocation: locStr,
            location: { city: locCity.trim(), state: locState.trim(), country: locCountry.trim(), county: "" },
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      setOk("Update saved.");
      setDetails(""); setNote(""); setAdditionalNote(""); setDefaultNote("");
      setLocCity(""); setLocState(""); setLocCountry("");
      setLabel(""); setSelectedStageKey(""); setStageColor("#f59e0b"); setDetailColor("#f59e0b");
      setUseLocalTime(true); setOccurredAt(getNowLocal());
      await load();
      window.setTimeout(() => setOk(""), 3000);
    } catch (e: any) { setErr(e?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  // Fix 1 — open edit with existing data pre-filled
  const openEdit = (idx: number) => {
    const ev = events[idx];
    setEditingIdx(idx);
    setEditDetails(ev.details || "");
    setEditNote(ev.note || "");
    setEditAdditionalNote(ev.additionalNote || "");
    setEditColor(ev.color || "#f59e0b");
    setEditDetailColor(ev.detailColor || "#f59e0b");
    setEditCity(ev.location?.city || "");
    setEditState(ev.location?.state || "");
    setEditCountry(ev.location?.country || "");
  };

  const saveEdit = async (idx: number) => {
    setEditSaving(true);
    const locStr = [editCity, editState, editCountry].filter(Boolean).join(", ");
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editTrackingEventIndex: idx,
          editTrackingEventData: {
            details: editDetails, note: editNote, additionalNote: editAdditionalNote,
            color: editColor, detailColor: editDetailColor,
            currentLocation: locStr,
            location: { city: editCity, state: editState, country: editCountry, county: "" },
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      setEditingIdx(null);
      setOk("Edit saved.");
      await load();
      window.setTimeout(() => setOk(""), 3000);
    } catch (e: any) { setErr(e?.message || "Failed to save edit."); }
    finally { setEditSaving(false); }
  };

  // Fix 2 — open add-sub with existing event data pre-filled
  const openAddSub = (idx: number) => {
    const ev = events[idx];
    setAddingSubIdx(idx);
    setSubDetails(ev.details || "");
    setSubNote(ev.note || "");
    setSubAdditionalNote(ev.additionalNote || "");
    setSubColor(ev.detailColor || ev.color || "#f59e0b");
    setSubCity(ev.location?.city || "");
    setSubState(ev.location?.state || "");
    setSubCountry(ev.location?.country || "");
  };

  const saveSubEntry = async (idx: number) => {
    if (!subDetails.trim()) { setErr("Details is required."); return; }
    setSubSaving(true);
    const locStr = [subCity, subState, subCountry].filter(Boolean).join(", ");
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addSubEntryToEventIndex: idx,
          subEntry: {
            details: subDetails, note: subNote, additionalNote: subAdditionalNote,
            color: subColor, currentLocation: locStr,
            location: { city: subCity, state: subState, country: subCountry, county: "" },
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add");
      setAddingSubIdx(null);
      setSubDetails(""); setSubNote(""); setSubAdditionalNote("");
      setSubColor("#f59e0b"); setSubCity(""); setSubState(""); setSubCountry("");
      setOk("Sub-entry added.");
      await load();
      window.setTimeout(() => setOk(""), 3000);
    } catch (e: any) { setErr(e?.message || "Failed to add."); }
    finally { setSubSaving(false); }
  };

  const deleteEvent = async (idx: number) => {
    setDeletingIdx(idx);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteTrackingEventIndex: idx }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setConfirmDeleteIdx(null);
      await load();
    } catch (e: any) { setErr(e?.message || "Failed to delete."); }
    finally { setDeletingIdx(null); }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-gray-500">Loading…</p></div>;
  if (!shipment) return <div className="max-w-5xl mx-auto px-4 py-10"><p className="text-sm text-red-600">Shipment not found.</p></div>;

  const invoiceStatus = String(shipment?.invoice?.status || "unpaid").toLowerCase();
  const invoiceAmount = Number(shipment?.invoice?.amount ?? 0);
  const invoiceCurrency = String(shipment?.invoice?.currency || "USD");
  const invoiceStatusColor = invoiceStatus === "paid" ? "text-green-700 bg-green-50 border-green-200" : invoiceStatus === "overdue" || invoiceStatus === "cancelled" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200";
  const invoiceStatusLabel = invoiceStatus === "paid" ? "PAID" : invoiceStatus === "overdue" ? "OVERDUE" : invoiceStatus === "cancelled" ? "CANCELLED" : "UNPAID";

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition placeholder:text-gray-400";
  const textareaCls = `${inputCls} min-h-[90px] resize-none`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <button type="button" onClick={() => router.push(`/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`)}
            className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-700 transition mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to shipments
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Tracking Update</h1>
              <p className="mt-1 text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{shipmentId}</span>
                <span className="mx-2 text-gray-300">·</span>
                <span className="font-semibold text-gray-700">{shipment?.trackingNumber || "—"}</span>
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-extrabold ${invoiceStatusColor}`}>
              {invoiceStatusLabel} · {invoiceAmount.toFixed(2)} {invoiceCurrency}
            </span>
          </div>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 flex items-center justify-between text-red-700 font-semibold text-sm bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>
              <button onClick={() => setErr("")} className="cursor-pointer ml-4 text-red-400 hover:text-red-700"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
          {ok && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-2 text-green-700 font-semibold text-sm bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{ok}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── ADD FORM ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-extrabold text-gray-900">Add Tracking Update</h2>
              <p className="mt-0.5 text-xs text-gray-500">Appends a new entry to the shipment timeline.</p>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Stage */}
              <Field label="Stage" required>
                <div className="relative">
                  <button type="button" onClick={() => setShowStageDropdown(v => !v)}
                    className="cursor-pointer w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-left flex items-center justify-between hover:border-blue-400 transition focus:outline-none focus:ring-2 focus:ring-blue-100">
                    {label ? (
                      <span className="flex items-center gap-2 font-semibold text-gray-900">
                        <span className="w-3 h-3 rounded-full" style={{ background: effectiveStageColor }} />
                        {label}
                      </span>
                    ) : <span className="text-gray-400">Select a timeline stage…</span>}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${showStageDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showStageDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                      <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                        {statuses.length === 0
                          ? <p className="px-4 py-3 text-sm text-gray-500">No stages found.</p>
                          : statuses.map((s) => (
                            <button key={s.key} type="button" onClick={() => selectStage(s)}
                              className={`cursor-pointer w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition ${selectedStageKey === s.key ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-gray-50 text-gray-800"}`}>
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colorMap[s.color?.toLowerCase()] || "#f59e0b" }} />
                              {s.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              {/* Date */}
              <Field label="Date & Time">
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                    <input type="radio" checked={useLocalTime} onChange={() => setUseLocalTime(true)} className="accent-blue-600" />
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> Auto (now)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                    <input type="radio" checked={!useLocalTime} onChange={() => setUseLocalTime(false)} className="accent-blue-600" />
                    Custom
                  </label>
                </div>
                {!useLocalTime && <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={inputCls} />}
                {useLocalTime && <p className="text-xs text-gray-400">Time is recorded when you click Add Update.</p>}
              </Field>

              {/* Location */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {[["Destination", destination], ["Origin", origin], ["Previous Location", previousLocation]].map(([lbl, val]) => (
                    <div key={lbl}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{lbl}</p>
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">{val || "—"}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <LocationFields
                    city={locCity} state={locState} country={locCountry}
                    onCity={setLocCity} onState={setLocState} onCountry={setLocCountry}
                    label="Current Location *"
                  />
                </div>
              </div>

              {/* Details */}
              <Field label="Details" required>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-300 pointer-events-none" />
                  <textarea value={details} onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe what happened at this stage…"
                    className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 min-h-[90px] resize-none placeholder:text-gray-400 transition" />
                </div>
              </Field>

              {/* Note */}
              <Field label="Note">
                <div className="relative">
                  <StickyNote className="absolute left-3 top-3 w-4 h-4 text-gray-300 pointer-events-none" />
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={defaultNote || "Optional note shown on tracking page…"}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 min-h-[70px] resize-none placeholder:text-gray-400 transition" />
                </div>
                {defaultNote && <button type="button" onClick={() => setNote(defaultNote)} className="cursor-pointer mt-1 text-xs text-blue-600 hover:underline">Reset to default</button>}
              </Field>

              {/* Additional Note */}
              <Field label="Additional Note">
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-300 pointer-events-none" />
                  <textarea value={additionalNote} onChange={(e) => setAdditionalNote(e.target.value)}
                    placeholder={defaultNote || "Shown in email to customer…"}
                    className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 min-h-[70px] resize-none placeholder:text-gray-400 transition" />
                </div>
                {defaultNote && <button type="button" onClick={() => setAdditionalNote(defaultNote)} className="cursor-pointer mt-1 text-xs text-blue-600 hover:underline">Reset to default</button>}
              </Field>

              {/* Colors */}
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Stage Color <span className="text-xs font-normal text-gray-400">(main dot)</span></p>
                  <ColorDots value={stageColor} onChange={setStageColor} />
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Detail Color <span className="text-xs font-normal text-gray-400">(inner dot — red/green overrides stage)</span></p>
                  <ColorDots value={detailColor} onChange={setDetailColor} />
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-md" style={{ background: effectiveStageColor }} />
                    <span className="text-xs text-gray-500">Stage dot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-white shadow" style={{ background: detailColor }} />
                    <span className="text-xs text-gray-500">Detail dot</span>
                  </div>
                </div>
              </div>

              <button type="button" onClick={addEvent} disabled={saving}
                className="cursor-pointer w-full rounded-2xl bg-blue-600 text-white py-3.5 font-bold text-sm transition flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><PlusCircle className="w-4 h-4" />Add Update</>}
              </button>
            </div>
          </motion.div>

          {/* ── TIMELINE ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-extrabold text-gray-900">Timeline</h2>
              <p className="mt-0.5 text-xs text-gray-500">{events.length} event{events.length !== 1 ? "s" : ""} · Edit, delete or add details to any stage.</p>
            </div>
            <div className="px-6 py-5 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {events.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">No tracking events yet.</div>
              ) : events.map((ev, idx) => {
                const loc = [ev?.location?.city, ev?.location?.state, ev?.location?.country].filter(Boolean).join(", ");
                const isEditing = editingIdx === idx;
                const isAddingSub = addingSubIdx === idx;
                const isConfirmDelete = confirmDeleteIdx === idx;

                return (
                  <div key={idx} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                            <span className="w-4 h-4 rounded-full ring-2 ring-white shadow" style={{ background: ev.color || "#f59e0b" }} />
                            {ev.detailColor && <span className="w-2.5 h-2.5 rounded-full" style={{ background: ev.detailColor }} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900 text-sm">{ev.label}</p>
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">#{idx + 1}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(ev.occurredAt).toLocaleString()}{loc ? ` · ${loc}` : ""}</p>
                            {ev.details && <p className="mt-1.5 text-sm text-gray-800 font-medium leading-relaxed">{ev.details}</p>}
                            {ev.note && <p className="mt-1 text-xs text-gray-500 leading-relaxed">{ev.note}</p>}
                            {ev.additionalNote && ev.additionalNote !== ev.note && <p className="mt-1 text-xs text-gray-400 italic">{ev.additionalNote}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => isEditing ? setEditingIdx(null) : openEdit(idx)}
                            className={`cursor-pointer p-1.5 rounded-lg transition ${isEditing ? "bg-blue-100 text-blue-700" : "hover:bg-blue-50 text-blue-500"}`}>
                            {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                          </button>
                          <button type="button" onClick={() => isAddingSub ? setAddingSubIdx(null) : openAddSub(idx)}
                            className={`cursor-pointer p-1.5 rounded-lg transition ${isAddingSub ? "bg-green-100 text-green-700" : "hover:bg-green-50 text-green-500"}`}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteIdx(isConfirmDelete ? null : idx)}
                            className={`cursor-pointer p-1.5 rounded-lg transition ${isConfirmDelete ? "bg-red-100 text-red-700" : "hover:bg-red-50 text-red-400"}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Edit form */}
                    {isEditing && (
                      <div className="border-t border-blue-100 bg-blue-50/30 px-4 py-4 space-y-3">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Edit Stage #{idx + 1}</p>
                        <textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Details"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 min-h-[80px] resize-none" />
                        <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 min-h-[60px] resize-none" />
                        <textarea value={editAdditionalNote} onChange={(e) => setEditAdditionalNote(e.target.value)} placeholder="Additional Note"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 min-h-[60px] resize-none" />
                        <LocationFields city={editCity} state={editState} country={editCountry} onCity={setEditCity} onState={setEditState} onCountry={setEditCountry} label="Location" />
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">Color</p>
                          <ColorDots value={editColor} onChange={setEditColor} />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => saveEdit(idx)} disabled={editSaving}
                            className="cursor-pointer flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                            {editSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}
                          </button>
                          <button type="button" onClick={() => setEditingIdx(null)}
                            className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Add sub-entry form */}
                    {isAddingSub && (
                      <div className="border-t border-green-100 bg-green-50/30 px-4 py-4 space-y-3">
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Add Details to Stage #{idx + 1}</p>
                        <textarea value={subDetails} onChange={(e) => setSubDetails(e.target.value)} placeholder="Details (required)"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 min-h-[80px] resize-none" />
                        <textarea value={subNote} onChange={(e) => setSubNote(e.target.value)} placeholder="Note (optional)"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 min-h-[60px] resize-none" />
                        <textarea value={subAdditionalNote} onChange={(e) => setSubAdditionalNote(e.target.value)} placeholder="Additional Note (optional)"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 min-h-[60px] resize-none" />
                        <LocationFields city={subCity} state={subState} country={subCountry} onCity={setSubCity} onState={setSubState} onCountry={setSubCountry} label="Location" />
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">Detail Color</p>
                          <ColorDots value={subColor} onChange={setSubColor} />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => saveSubEntry(idx)} disabled={subSaving}
                            className="cursor-pointer flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                            {subSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Plus className="w-4 h-4" />Add Details</>}
                          </button>
                          <button type="button" onClick={() => setAddingSubIdx(null)}
                            className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Delete confirm */}
                    {isConfirmDelete && (
                      <div className="border-t border-red-100 bg-red-50/30 px-4 py-4">
                        <p className="text-sm font-semibold text-red-700 mb-3">Delete "{ev.label}"? This cannot be undone.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => deleteEvent(idx)} disabled={deletingIdx === idx}
                            className="cursor-pointer flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                            {deletingIdx === idx ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Yes, Delete</>}
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteIdx(null)}
                            className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}