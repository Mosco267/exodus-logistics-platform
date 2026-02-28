"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  MapPin,
  Package,
  Receipt,
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
  occurredAt: string; // ISO
  color?: string; // optional (hex or simple string)
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
  currentLocation?: string | null;

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

function normalizeKey(ev: TrackingEvent, idx: number) {
  const k = String(ev?.key || "").trim();
  if (k) return k.toLowerCase();
  const l = String(ev?.label || "update").trim().toLowerCase();
  return (l || `update-${idx}`).replace(/[\s_-]+/g, "-");
}

function isValidCssColor(c: string) {
  if (!c) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(c)) return true;
  if (/^[a-z]+$/i.test(c)) return true;
  return false;
}

type Stage = {
  key: string;
  label: string;
  color?: string; // preferred color for this stage when it's the CURRENT stage
  items: TrackingEvent[]; // all timeline items in this stage (details/locations)
  firstAt: string;
  lastAt: string;
  lastLoc: string;
};

export default function TrackResultPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const q = String(params?.q || "").trim();

  const [data, setData] = useState<TrackApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // accordion open stage
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

      const evs = Array.isArray((json as any)?.events) ? (json as any).events : [];
      // open latest stage by default (we’ll compute stage count below)
      setOpenIdx(evs.length ? 999999 : 0);
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

  const events = useMemo(() => {
    const evs = Array.isArray(data?.events) ? [...(data?.events || [])] : [];
    evs.sort(
      (a, b) =>
        new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime()
    );
    return evs;
  }, [data]);

  const stages: Stage[] = useMemo(() => {
    // group by key, but keep first-seen order
    const map = new Map<string, Stage>();
    const order: string[] = [];

    events.forEach((ev, idx) => {
      const key = normalizeKey(ev, idx);
      const label = String(ev?.label || "Update").trim() || "Update";

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          color: isValidCssColor(String(ev?.color || "")) ? String(ev.color) : "",
          items: [],
          firstAt: ev.occurredAt,
          lastAt: ev.occurredAt,
          lastLoc: fmtLoc(ev.location),
        });
        order.push(key);
      }

      const st = map.get(key)!;
      st.items.push(ev);

      // keep latest label if admin slightly edits naming later
      st.label = label || st.label;

      const t = new Date(ev.occurredAt || 0).getTime();
      const tFirst = new Date(st.firstAt || 0).getTime();
      const tLast = new Date(st.lastAt || 0).getTime();
      if (!Number.isNaN(t)) {
        if (Number.isNaN(tFirst) || t < tFirst) st.firstAt = ev.occurredAt;
        if (Number.isNaN(tLast) || t >= tLast) {
          st.lastAt = ev.occurredAt;
          st.lastLoc = fmtLoc(ev.location);
          // stage preferred color = latest non-empty color
          if (isValidCssColor(String(ev?.color || ""))) st.color = String(ev.color);
        }
      }
    });

    // sort items inside stage just in case
    const out = order.map((k) => map.get(k)!).filter(Boolean);
    out.forEach((s) =>
      s.items.sort(
        (a, b) =>
          new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime()
      )
    );

    return out;
  }, [events]);

  // current stage is always the last stage (because timeline grows)
  const currentStageIndex = Math.max(0, stages.length - 1);

  // if openIdx was forced to 999999, clamp to last stage
  useEffect(() => {
    if (openIdx === 999999) setOpenIdx(currentStageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStageIndex]);

  const invoicePaid = Boolean(data?.invoice?.paid);
  const invoiceAmount = Number(data?.invoice?.amount ?? 0);
  const invoiceCurrency = String(data?.invoice?.currency || "USD");

  const currentLocation =
    String(data?.currentLocation || "").trim() ||
    (stages[currentStageIndex]?.lastLoc || "") ||
    "—";

  // main dot colors:
  // - past stages: green
  // - current stage: use admin color if provided, else amber
  // - future: gray (you won’t have future stages in this design)
  const stageDotStyle = (idx: number, stage: Stage): React.CSSProperties => {
    if (idx < currentStageIndex) return { backgroundColor: "#22c55e" }; // green-500
    if (idx === currentStageIndex) {
      const c = String(stage.color || "").trim();
      if (isValidCssColor(c)) return { backgroundColor: c };
      return { backgroundColor: "#f59e0b" }; // amber-500
    }
    return { backgroundColor: "#d1d5db" }; // gray-300
  };

  const stageLineStyle = (idx: number): React.CSSProperties => {
    // connecting line: green for completed segment, gray otherwise
    if (idx < currentStageIndex) return { backgroundColor: "rgba(34,197,94,0.35)" };
    return { backgroundColor: "rgba(209,213,219,0.9)" };
  };

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
            {/* Header card */}
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
                    {data.currentStatus || stages[currentStageIndex]?.label || "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Updated:{" "}
                    <span className="font-semibold">
                      {fmtDate(data.updatedAt || stages[currentStageIndex]?.lastAt)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
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
                    <MapPin className="w-4 h-4 text-gray-700" />
                    Current location
                  </div>
                  <p className="mt-2 text-sm text-gray-800 font-semibold">
                    {currentLocation}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-700" />
                    Created
                  </div>
                  <p className="mt-2 text-sm text-gray-800 font-semibold">
                    {fmtDate(data.createdAt || stages[0]?.firstAt)}
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
                {stages.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                    No tracking updates yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stages.map((st, idx) => {
                      const isOpen = openIdx === idx;

                      const titleWhen = fmtDate(st.lastAt);
                      const titleLoc = st.lastLoc;

                      const dotStyle = stageDotStyle(idx, st);

                      return (
                        <div key={st.key} className="relative">
                          {/* vertical connector between MAIN stages */}
                          {idx !== stages.length - 1 && (
                            <div
                              className="absolute left-[7px] top-[26px] w-[2px] h-[calc(100%-10px)]"
                              style={stageLineStyle(idx)}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => setOpenIdx((cur) => (cur === idx ? null : idx))}
                            className="w-full text-left rounded-2xl border border-gray-200 hover:border-blue-200 transition bg-white p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="pt-1">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={dotStyle}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-base sm:text-lg font-extrabold text-gray-900 truncate">
                                      {st.label}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600">
                                      {titleWhen}
                                      {titleLoc ? ` • ${titleLoc}` : ""}
                                    </p>
                                  </div>

                                  <ChevronDown
                                    className={`w-5 h-5 text-gray-500 transition ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>

                                {isOpen && (
                                  <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                                    {/* SUB timeline inside the stage */}
                                    <div className="relative pl-6">
                                      {/* sub-line */}
                                      {st.items.length > 1 && (
                                        <div
                                          className="absolute left-[7px] top-[10px] w-[2px] h-[calc(100%-10px)]"
                                          style={{
                                            backgroundColor:
                                              idx < currentStageIndex
                                                ? "rgba(34,197,94,0.25)"
                                                : "rgba(209,213,219,0.9)",
                                          }}
                                        />
                                      )}

                                      <div className="space-y-4">
                                        {st.items.map((it, j) => {
                                          const itWhen = fmtDate(it.occurredAt);
                                          const itLoc = fmtLoc(it.location);

                                          return (
                                            <div key={`${st.key}-${j}`} className="relative">
                                              <div
                                                className="absolute left-0 top-[6px] h-2.5 w-2.5 rounded-full"
                                                style={
                                                  idx < currentStageIndex
                                                    ? { backgroundColor: "#22c55e" }
                                                    : dotStyle
                                                }
                                              />

                                              <div className="ml-4">
                                                <p className="text-xs text-gray-600">
                                                  {itWhen}
                                                  {itLoc ? ` • ${itLoc}` : ""}
                                                </p>

                                                <p className="mt-1 text-sm text-gray-800">
                                                  <span className="font-bold">Details:</span>{" "}
                                                  {it.note
                                                    ? it.note
                                                    : "No additional details for this update."}
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                                      <div>
                                        <span className="font-semibold">Invoice:</span>{" "}
                                        {invoicePaid ? "PAID" : "UNPAID"} •{" "}
                                        {invoiceAmount.toFixed(2)} {invoiceCurrency}
                                      </div>
                                      <div>
                                        <span className="font-semibold">Destination:</span>{" "}
                                        {data.destination || "—"}
                                      </div>
                                      <div>
                                        <span className="font-semibold">Current location:</span>{" "}
                                        {currentLocation}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
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