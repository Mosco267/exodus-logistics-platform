"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Calendar, ChevronDown, MapPin, Package, Receipt } from "lucide-react";

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
  occurredAt: string; // ISO
  color?: string;     // ✅ from admin
  location?: LocationLite;
  meta?: {
    invoicePaid?: boolean;
    invoiceAmount?: number;
    currency?: string;
    destination?: string;
    origin?: string;
  };
};

type TrackApiResponse = {
  shipmentId: string;
  trackingNumber: string;

  currentStatus?: string;
  statusNote?: string;
  nextStep?: string;

  createdAt?: string | null;
  updatedAt?: string | null;

  origin?: string | null;
  destination?: string | null;

  invoice?: {
    paid: boolean;
    amount: number;
    currency: string;
  } | null;

  events: TrackingEvent[];
  estimatedDelivery?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtLoc(loc?: LocationLite) {
  if (!loc) return "";
  const parts = [loc.city, loc.state, loc.country]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function safeColor(c?: string) {
  const v = String(c || "").trim();
  // Accept hex like #22c55e or css color names
  return v || "";
}

type GroupedStage = {
  label: string;
  key: string;
  color?: string;
  items: Array<{
    occurredAt: string;
    note?: string;
    location?: LocationLite;
    color?: string;
  }>;
  latestAt: string;
  latestLoc: string;
  latestNote?: string;
};

export default function TrackResultPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const q = String(params?.q || "").trim();

  const [data, setData] = useState<TrackApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // accordion open group index
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const load = async () => {
    setLoading(true);
    setErr("");
    setData(null);

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Tracking unavailable. Try again later.");
        return;
      }

      setData(json as TrackApiResponse);
    } catch (e: any) {
      setErr(e?.message || "Tracking unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!q) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const invoicePaid = Boolean(data?.invoice?.paid);
  const invoiceAmount = Number(data?.invoice?.amount ?? 0);
  const invoiceCurrency = String(data?.invoice?.currency || "USD");

  const groupedStages: GroupedStage[] = useMemo(() => {
    const evs = Array.isArray(data?.events) ? [...(data?.events || [])] : [];
    // oldest -> newest
    evs.sort(
      (a, b) =>
        new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime()
    );

    // group by normalized label
    const map = new Map<string, GroupedStage>();

    for (const ev of evs) {
      const label = String(ev?.label || "Update").trim() || "Update";
      const key = label.toLowerCase().trim().replace(/[\s_-]+/g, "-");
      const loc = ev?.location;
      const note = String(ev?.note || "").trim() || "";

      const item = {
        occurredAt: ev?.occurredAt || new Date().toISOString(),
        note,
        location: loc,
        color: safeColor((ev as any)?.color),
      };

      if (!map.has(key)) {
        map.set(key, {
          label,
          key,
          color: safeColor((ev as any)?.color),
          items: [item],
          latestAt: item.occurredAt,
          latestLoc: fmtLoc(loc),
          latestNote: note || undefined,
        });
      } else {
        const g = map.get(key)!;
        g.items.push(item);

        // latest info
        const last = g.items[g.items.length - 1];
        g.latestAt = last.occurredAt;
        g.latestLoc = fmtLoc(last.location);
        g.latestNote = (last.note || "").trim() || g.latestNote;

        // if stage has no color yet, adopt newest non-empty
        if (!g.color && last.color) g.color = last.color;
      }
    }

    const arr = Array.from(map.values());

    // keep order by first occurrence in timeline (already preserved by insertion order)
    // but for safety, sort by first item time
    arr.sort((a, b) => {
      const ta = new Date(a.items[0]?.occurredAt || 0).getTime();
      const tb = new Date(b.items[0]?.occurredAt || 0).getTime();
      return ta - tb;
    });

    // open latest stage by default
    if (arr.length) setOpenIdx(arr.length - 1);

    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.events]);

  const currentStageIndex = Math.max(0, groupedStages.length - 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href={`/${locale}/track`}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Back to tracking
          </Link>
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl">
            <p className="text-sm text-gray-700">Loading tracking…</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-xl">
            <div className="flex items-center text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5 mr-2" />
              {err}
            </div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-600">Shipment ID</p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {data.shipmentId || "—"}
                  </h1>

                  <p className="mt-1 text-sm text-gray-600">
                    Tracking:{" "}
                    <span className="font-semibold text-gray-900">
                      {data.trackingNumber || "—"}
                    </span>
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-xs text-gray-600">Current status</p>
                  <p className="text-lg font-extrabold text-blue-700">
                    {data.currentStatus || groupedStages[currentStageIndex]?.label || "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Updated:{" "}
                    <span className="font-semibold">
                      {fmtDate(data.updatedAt || groupedStages[currentStageIndex]?.latestAt)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Receipt className="w-4 h-4 text-gray-700" />
                    Invoice
                  </div>
                  <p
                    className={`mt-2 text-sm font-extrabold ${
                      invoicePaid ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {invoicePaid ? "PAID" : "UNPAID"} • {invoiceAmount.toFixed(2)}{" "}
                    {invoiceCurrency}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <MapPin className="w-4 h-4 text-gray-700" />
                    Destination
                  </div>
                  <p className="mt-2 text-sm text-gray-800 font-semibold">
                    {data.destination || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-700" />
                    Created
                  </div>
                  <p className="mt-2 text-sm text-gray-800 font-semibold">
                    {fmtDate(data.createdAt || groupedStages[0]?.items?.[0]?.occurredAt)}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-xl p-6"
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-700" />
                <h2 className="text-lg font-extrabold text-gray-900">
                  Shipment Timeline
                </h2>
              </div>

              <p className="mt-1 text-sm text-gray-600">
                This timeline grows as our team adds updates. Older updates never disappear.
              </p>

              <div className="mt-6">
                {groupedStages.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                    No tracking updates yet.
                  </div>
                ) : (
                  <div className="relative">
                    {/* ✅ Vertical line */}
                    <div className="absolute left-[13px] top-2 bottom-2 w-[2px] bg-gray-200" />

                    <div className="space-y-4">
                      {groupedStages.map((stage, idx) => {
                        const isOpen = openIdx === idx;
                        const isCompleted = idx < currentStageIndex;
                        const isCurrent = idx === currentStageIndex;

                        // prefer stage color; fallback to semantic
                        const dot =
                          stage.color ||
                          (isCompleted ? "#22c55e" : isCurrent ? "#f59e0b" : "#9ca3af");

                        return (
                          <div key={stage.key} className="relative pl-10">
                            {/* dot */}
                            <div className="absolute left-[7px] top-3">
                              <span
                                className="block h-3 w-3 rounded-full ring-4 ring-white"
                                style={{ background: dot }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setOpenIdx((cur) => (cur === idx ? null : idx))}
                              className="w-full text-left rounded-2xl border border-gray-200 hover:border-blue-200 transition bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-base sm:text-lg font-extrabold text-gray-900 truncate">
                                    {stage.label}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-600">
                                    {fmtDate(stage.latestAt)}
                                    {stage.latestLoc ? ` • ${stage.latestLoc}` : ""}
                                  </p>
                                </div>

                                <ChevronDown
                                  className={`w-5 h-5 text-gray-500 transition ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </div>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-3">
                                      {/* ✅ stacked sub-updates under same stage */}
                                      {stage.items.map((it, i) => {
                                        const loc = fmtLoc(it.location);
                                        const note = String(it.note || "").trim();
                                        const c = it.color || dot;

                                        return (
                                          <div key={`${stage.key}-${i}`} className="rounded-xl bg-white border border-gray-200 p-3">
                                            <div className="flex items-start gap-2">
                                              <span
                                                className="mt-[6px] inline-block h-2.5 w-2.5 rounded-full"
                                                style={{ background: c }}
                                              />
                                              <div className="min-w-0">
                                                <p className="text-xs text-gray-600">
                                                  {fmtDate(it.occurredAt)}
                                                  {loc ? ` • ${loc}` : ""}
                                                </p>

                                                <p className="mt-1 text-sm text-gray-800">
                                                  <span className="font-bold">Details:</span>{" "}
                                                  {note || "No additional details for this update."}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}

                                      <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div>
                                          <span className="font-semibold">Invoice:</span>{" "}
                                          {invoicePaid ? "PAID" : "UNPAID"} •{" "}
                                          {invoiceAmount.toFixed(2)} {invoiceCurrency}
                                        </div>
                                        <div>
                                          <span className="font-semibold">Destination:</span>{" "}
                                          {data.destination || "—"}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}