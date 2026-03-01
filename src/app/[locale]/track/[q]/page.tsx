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
  FileText,
} from "lucide-react";

type LocationLite = {
  country?: string;
  state?: string;
  city?: string;
  county?: string;
};

type Entry = {
  occurredAt: string;
  note?: string;
  color?: string;
  location?: LocationLite;
};

type GroupedEvent = {
  key?: string;
  label: string;
  color?: string;
  occurredAt: string;
  location?: LocationLite;
  entries: Entry[];
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
    invoiceNumber?: string;
    paid: boolean;
    amount: number;
    currency: string;
  } | null;

  events: GroupedEvent[];
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
  return v || "";
}

function stageDotStyle(
  stageIndex: number,
  currentStageIndex: number,
  stageBaseColor?: string
) {
  if (stageIndex < currentStageIndex) return { background: "#22c55e" };

  if (stageIndex === currentStageIndex) {
    return { background: safeColor(stageBaseColor) || "#f59e0b" };
  }

  return { background: "#d1d5db" };
}

export default function TrackResultPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const q = String(params?.q || "").trim();

  const [data, setData] = useState<TrackApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
      setOpenIdx(evs.length ? evs.length - 1 : 0);
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
        new Date(a?.occurredAt || 0).getTime() -
        new Date(b?.occurredAt || 0).getTime()
    );

    evs.forEach((ev: any) => {
      if (Array.isArray(ev?.entries)) {
        ev.entries.sort(
          (x: any, y: any) =>
            new Date(x?.occurredAt || 0).getTime() -
            new Date(y?.occurredAt || 0).getTime()
        );
      } else {
        ev.entries = [];
      }
    });

    return evs as GroupedEvent[];
  }, [data]);

  const currentIndex = Math.max(0, events.length - 1);

  const invoicePaid = Boolean(data?.invoice?.paid);
  const invoiceAmount = Number(data?.invoice?.amount ?? 0);
  const invoiceCurrency = String(data?.invoice?.currency || "USD");
  const invoiceNumber = String(data?.invoice?.invoiceNumber || "");

  const invoiceQ = data?.trackingNumber || data?.shipmentId || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/track`}
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
               hover:border-blue-600 hover:text-blue-700 transition"
          >
            <MapPin className="w-5 h-5 mr-2" /> Back to Track
          </Link>

          {invoiceQ ? (
            <Link
              href={`/${locale}/invoice/full?q=${encodeURIComponent(invoiceQ)}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                 hover:border-blue-600 hover:text-blue-700 transition"
            >
              <FileText className="w-5 h-5 mr-2" /> View Invoice
            </Link>
          ) : null}
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

                  <p className="mt-1 text-sm text-gray-600">
                    Invoice:{" "}
                    <span className="font-semibold text-gray-900">
                      {invoiceNumber || "—"}
                    </span>
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-xs text-gray-600">Current status</p>
                  <p className="text-lg font-extrabold text-blue-700">
                    {data.currentStatus || events[currentIndex]?.label || "—"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Updated:{" "}
                    <span className="font-semibold">
                      {fmtDate(data.updatedAt || events[currentIndex]?.occurredAt)}
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
                  <p className="mt-1 text-xs text-gray-600">
                    <span className="font-semibold">Current location:</span>{" "}
                    {data.currentLocation ||
                      fmtLoc(events[currentIndex]?.location) ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-700" />
                    Created
                  </div>
                  <p className="mt-2 text-sm text-gray-800 font-semibold">
                    {fmtDate(data.createdAt || events[0]?.occurredAt)}
                  </p>
                </div>
              </div>
            </motion.div>

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
                This timeline grows as our team adds updates. Older updates never
                disappear.
              </p>

              <div className="mt-6">
                {events.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
                    No tracking updates yet.
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[10px] top-2 bottom-2 w-[2px] bg-gray-200" />

                    <div className="space-y-4">
                      {events.map((ev, idx) => {
                        const isOpen = openIdx === idx;
                        const stageLoc = fmtLoc(ev.location);
                        const stageWhen = fmtDate(ev.occurredAt);

                        const stageBaseColor =
                          safeColor(ev?.entries?.[0]?.color) || safeColor(ev?.color) || "";

                        const dotStyle = stageDotStyle(idx, currentIndex, stageBaseColor);

                        return (
                          <div key={`${ev.key || ev.label}-${idx}`} className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenIdx((cur) => (cur === idx ? null : idx))
                              }
                              className="w-full text-left rounded-2xl border border-gray-200 hover:border-blue-200 transition bg-white p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="relative pt-1">
                                  <div
                                    className="h-3 w-3 rounded-full ring-2 ring-white"
                                    style={dotStyle}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-base sm:text-lg font-extrabold text-gray-900 truncate">
                                        {ev.label}
                                      </p>
                                      <p className="mt-1 text-xs text-gray-600">
                                        {stageWhen}
                                        {stageLoc ? ` • ${stageLoc}` : ""}
                                      </p>
                                    </div>

                                    <ChevronDown
                                      className={`w-5 h-5 text-gray-500 transition ${
                                        isOpen ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>

                                  {isOpen && (
                                    <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-3">
                                      <div className="relative pl-6">
                                        <div className="absolute left-[8px] top-2 bottom-2 w-[2px] bg-gray-200" />

                                        <div className="space-y-3">
                                          {(ev.entries || []).map((en, j) => {
                                            const loc = fmtLoc(en.location);
                                            const when = fmtDate(en.occurredAt);

                                            const isStageCompleted = idx < currentIndex;
                                            const isLastEntry =
                                              j === (ev.entries?.length || 0) - 1;

                                            const entryDotBg =
                                              isStageCompleted && isLastEntry
                                                ? "#22c55e"
                                                : safeColor(en.color) || "#9ca3af";

                                            return (
                                              <div
                                                key={`${ev.key || ev.label}-entry-${j}`}
                                                className="relative"
                                              >
                                                <div className="flex items-start gap-3">
                                                  <div className="pt-1">
                                                    <div
                                                      className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                                                      style={{ background: entryDotBg }}
                                                    />
                                                  </div>

                                                  <div className="flex-1">
                                                    <p className="text-xs text-gray-600">
                                                      {when}
                                                      {loc ? ` • ${loc}` : ""}
                                                    </p>
                                                    <p className="text-sm text-gray-800 mt-1">
                                                      <span className="font-bold">Details:</span>{" "}
                                                      {en.note?.trim()
                                                        ? en.note
                                                        : "No additional details for this update."}
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
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
                                          {data.currentLocation ||
                                            fmtLoc(events[currentIndex]?.location) ||
                                            "—"}
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