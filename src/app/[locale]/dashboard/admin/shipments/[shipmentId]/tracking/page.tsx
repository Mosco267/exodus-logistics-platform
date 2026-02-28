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
  location?: LocationLite;
};

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

  // form fields
  const [label, setLabel] = useState("Warehouse");
  const [note, setNote] = useState("");

  // ✅ NEW: color picker (default green)
  const [color, setColor] = useState("#22c55e"); // green

  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");

  const [occurredAt, setOccurredAt] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  });

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
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load shipment");

      setShipment(json?.shipment || null);

      // prefill some location defaults from receiver
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

  useEffect(() => {
    if (!shipmentId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId]);

  const addEvent = async () => {
    setErr("");
    setOk("");

    if (!label.trim()) {
      setErr("Stage/Status label is required (e.g. Warehouse, In Transit).");
      return;
    }

    const iso = new Date(occurredAt).toISOString();

    const trackingEvent = {
      key: label.toLowerCase().trim().replace(/[\s_-]+/g, "-"),
      label: label.trim(),
      note: note.trim(),
      occurredAt: iso,

      // ✅ pass color into the timeline
      color: String(color || "").trim(),

      location: {
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        county: county.trim(),
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

      setOk("Saved ✅");
      setNote("");
      setCounty("");
      await load();
      window.setTimeout(() => setOk(""), 2000);
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

  const invoicePaid = Boolean(shipment?.invoice?.paid);
  const invoiceAmount = Number(shipment?.invoice?.amount ?? 0);
  const invoiceCurrency = String(shipment?.invoice?.currency || shipment?.declaredValueCurrency || "USD");

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`
                )
              }
              className="inline-flex items-center text-sm font-semibold text-gray-700 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to shipments
            </button>

            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
              Tracking • {shipmentId}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Tracking: <span className="font-semibold">{shipment?.trackingNumber || "—"}</span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-600">Invoice</p>
            <p className={`text-sm font-extrabold ${invoicePaid ? "text-green-700" : "text-amber-700"}`}>
              {invoicePaid ? "PAID" : "UNPAID"} • {invoiceAmount.toFixed(2)} {invoiceCurrency}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add update */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6"
          >
            <h2 className="text-lg font-extrabold text-gray-900">Add tracking update</h2>
            <p className="mt-1 text-sm text-gray-600">
              Each save APPENDS a new entry (no overwriting).
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Stage / Status</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Warehouse, In Transit, Delivered, Cancelled"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Date & time</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              {/* ✅ NEW: color selector */}
              <div>
                <label className="text-sm font-semibold text-gray-700">Dot color</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 rounded-xl border border-gray-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setColor("#22c55e")}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50"
                  >
                    Green
                  </button>
                  <button
                    type="button"
                    onClick={() => setColor("#f59e0b")}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50"
                  >
                    Amber
                  </button>
                  <button
                    type="button"
                    onClick={() => setColor("#ef4444")}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50"
                  >
                    Red
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">State</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">County (optional)</label>
                <input
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Details (what happened)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Shipment received at warehouse. Departure planned in 10 minutes."
                  className="mt-2 w-full min-h-[110px] rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addEvent}
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center
                         hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 mr-2" /> Add Update
                </>
              )}
            </button>

            {err && (
              <div className="mt-4 flex items-center text-red-600 font-semibold">
                <AlertCircle className="w-5 h-5 mr-2" />
                {err}
              </div>
            )}
            {ok && (
              <div className="mt-4 flex items-center text-green-700 font-semibold">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {ok}
              </div>
            )}
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6"
          >
            <h2 className="text-lg font-extrabold text-gray-900">Timeline</h2>
            <p className="mt-1 text-sm text-gray-600">This is exactly what the public tracking page uses.</p>

            <div className="mt-5 space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-gray-600">No tracking updates yet.</p>
              ) : (
                events.map((ev, idx) => {
                  const loc = [ev?.location?.city, ev?.location?.state, ev?.location?.country]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <div key={idx} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ background: ev.color || "#22c55e" }}
                            />
                            <p className="font-extrabold text-gray-900">{ev.label}</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(ev.occurredAt).toLocaleString()}
                            {loc ? ` • ${loc}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-blue-700">#{idx + 1}</span>
                      </div>
                      {ev.note ? <p className="mt-2 text-sm text-gray-700">{ev.note}</p> : null}
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