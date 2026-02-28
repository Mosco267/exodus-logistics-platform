"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Package,
  Truck,
  MapPin,
  ChevronDown,
  CheckCircle2,
  Clock,
  CreditCard,
} from "lucide-react";

type TrackEvent = {
  key: string;
  label: string;
  note?: string;
  occurredAt?: string; // ISO
  location?: { country?: string; state?: string; city?: string; county?: string };
  meta?: {
    invoicePaid?: boolean;
    invoiceAmount?: number;
    currency?: string;
    destination?: string;
  };
};

type TrackResponse = {
  shipmentId: string;
  trackingNumber: string;

  currentStatus: string;
  statusNote?: string;
  nextStep?: string;

  // new
  createdAt?: string | null;
  updatedAt?: string | null;

  origin?: string | null;
  destination?: string | null;

  invoice?: {
    paid: boolean;
    amount?: number;
    currency?: string;
  } | null;

  events: TrackEvent[]; // timeline (ordered)
  estimatedDelivery?: string | null;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function joinNice(parts: Array<any>) {
  return parts
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
}

export default function TrackingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const searchParams = useSearchParams();
  const qFromUrl = useMemo(
    () => String(searchParams.get("q") || searchParams.get("tracking") || "").trim(),
    [searchParams]
  );

  const [q, setQ] = useState("");
  const [data, setData] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // accordion open state
  const [openIdx, setOpenIdx] = useState<number>(0);

  useEffect(() => {
    if (!qFromUrl) return;
    const upper = qFromUrl.toUpperCase();
    setQ(upper);
    void track(upper, { updateUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl]);

  const track = async (value?: string, opts?: { updateUrl?: boolean }) => {
    const query = String(value ?? q).trim();
    if (!query) {
      setError("Enter your Shipment ID or Tracking Number.");
      return;
    }

    if (opts?.updateUrl !== false) {
      router.replace(`/${locale}/track?q=${encodeURIComponent(query.toUpperCase())}`);
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || "Tracking unavailable. Try again later.");
        return;
      }

      setData(json);

      // default open: current/latest event
      const events = Array.isArray(json?.events) ? json.events : [];
      setOpenIdx(Math.max(0, events.length - 1));
    } catch (e: any) {
      setError(e?.message || "Tracking unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const invoicePaid = Boolean(data?.invoice?.paid ?? false);
  const destinationText =
    data?.destination ||
    data?.events?.[0]?.meta?.destination ||
    "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-16">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">Track Your Shipment</h1>
          <p className="mt-2 text-gray-600">
            Enter a <span className="font-semibold">Shipment ID</span> or{" "}
            <span className="font-semibold">Tracking Number</span>.
          </p>
        </div>

        {/* Search */}
        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            void track(undefined, { updateUrl: true });
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
        >
          <label className="text-sm font-semibold text-gray-700">Shipment ID / Tracking</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            placeholder="e.g. EXS-260222-9BC87D"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40 uppercase"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold
                       hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center"
          >
            {loading ? (
              "Tracking…"
            ) : (
              <>
                <Truck className="w-5 h-5 mr-2" /> Track Shipment
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 flex items-center text-red-600 font-semibold">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
        </motion.form>

        {/* Result */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl overflow-hidden"
          >
            {/* Top summary */}
            <div className="p-6 sm:p-8 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Shipment</p>
                  <p className="text-xl font-extrabold text-gray-900">{data.shipmentId || "—"}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Tracking: <span className="font-semibold">{data.trackingNumber || "—"}</span>
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-800">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      Destination: {destinationText}
                    </span>

                    <span
                      className={[
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-extrabold",
                        invoicePaid
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-yellow-200 bg-yellow-50 text-yellow-800",
                      ].join(" ")}
                    >
                      <CreditCard className="w-4 h-4" />
                      Invoice: {invoicePaid ? "PAID" : "UNPAID"}
                    </span>

                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-800">
                      <Clock className="w-4 h-4 text-gray-500" />
                      Last update: {formatDate(data.updatedAt || null)}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-sm text-gray-600">Current status</p>
                  <p className="text-lg font-extrabold text-blue-700">{data.currentStatus || "—"}</p>
                </div>
              </div>

              {(data.statusNote || data.nextStep) && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  {data.statusNote && (
                    <p className="text-sm text-gray-800">
                      <span className="font-bold">Update:</span> {data.statusNote}
                    </p>
                  )}
                  {data.nextStep && (
                    <p className="mt-1 text-sm text-gray-800">
                      <span className="font-bold">Next step:</span> {data.nextStep}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="p-6 sm:p-8">
              <p className="font-extrabold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-700" />
                Shipment Timeline
              </p>

              <div className="mt-5 space-y-3">
                {(data.events || []).map((ev, idx) => {
                  const isOpen = idx === openIdx;
                  const isLatest = idx === (data.events?.length || 1) - 1;

                  const loc = joinNice([
                    ev.location?.city,
                    ev.location?.county,
                    ev.location?.state,
                    ev.location?.country,
                  ]);

                  return (
                    <button
                      key={`${ev.key}-${idx}`}
                      type="button"
                      onClick={() => setOpenIdx((cur) => (cur === idx ? -1 : idx))}
                      className={[
                        "w-full text-left rounded-2xl border p-4 transition",
                        isLatest ? "border-blue-200 bg-blue-50/60" : "border-gray-200 bg-white",
                        isOpen ? "ring-2 ring-blue-500/30" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            {isLatest ? (
                              <span className="inline-flex items-center text-blue-700 font-extrabold">
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Current
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-gray-500">Completed</span>
                            )}
                          </div>

                          <p className="mt-1 font-extrabold text-gray-900">{ev.label || "Update"}</p>

                          <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="inline-flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {formatDate(ev.occurredAt || null)}
                            </span>

                            {loc ? (
                              <span className="inline-flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                {loc}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <ChevronDown
                          className={[
                            "w-5 h-5 text-gray-500 transition",
                            isOpen ? "rotate-180" : "",
                          ].join(" ")}
                        />
                      </div>

                      {isOpen ? (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          {ev.note ? (
                            <p className="text-sm text-gray-800">
                              <span className="font-bold">Details:</span> {ev.note}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600">No extra details were added for this stage.</p>
                          )}

                          {/* Optional meta shown on Created stage or any stage */}
                          {ev.meta ? (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                              {"invoicePaid" in ev.meta ? (
                                <p>
                                  <span className="font-semibold">Invoice:</span>{" "}
                                  {ev.meta.invoicePaid ? "PAID" : "UNPAID"}
                                </p>
                              ) : null}

                              {ev.meta.destination ? (
                                <p>
                                  <span className="font-semibold">Destination:</span> {ev.meta.destination}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {data.estimatedDelivery ? (
                <div className="mt-6 text-gray-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  Estimated Delivery: <span className="ml-1 font-semibold">{data.estimatedDelivery}</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}