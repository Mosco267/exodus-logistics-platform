"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Clock, FileText, AlertCircle } from "lucide-react";

type TrackEvent = {
  key?: string;
  label?: string;
  note?: string;
  occurredAt?: string;
  location?: { country?: string; state?: string; city?: string; county?: string };
  meta?: {
    invoicePaid?: boolean;
    invoiceAmount?: number;
    currency?: string;
    origin?: string;
    destination?: string;
  };
};

type TrackResponse = {
  shipmentId: string;
  trackingNumber: string;
  currentStatus?: string;
  statusNote?: string;
  createdAt?: string;
  updatedAt?: string;
  origin?: string | null;
  destination?: string | null;
  invoice?: { paid: boolean; amount: number; currency: string } | null;
  events: TrackEvent[];
  estimatedDelivery?: string;
};

const norm = (s: any) => String(s || "").toLowerCase().trim().replace(/[\s_-]+/g, "");

const MILESTONES = [
  { key: "created", label: "Order Confirmed" },
  { key: "warehouse", label: "Warehouse" },
  { key: "pickedup", label: "Picked Up" },
  { key: "departedorigin", label: "Departed Origin" },
  { key: "intransit", label: "In Transit" },
  { key: "arriveshub", label: "Arrives Hub" },
  { key: "finaldelivery", label: "Final Delivery" },
];

function formatLoc(ev: TrackEvent) {
  const l = ev?.location || {};
  return [l.city, l.state, l.country].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function TrackResultPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const q = String(params?.q || "").trim();

  const [data, setData] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openKey, setOpenKey] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Tracking unavailable.");
        setData(json);
        // open the most recent event by default
        const last = Array.isArray(json?.events) ? json.events[json.events.length - 1] : null;
        setOpenKey(norm(last?.key || last?.label || "created") || "created");
      } catch (e: any) {
        setErr(e?.message || "Tracking unavailable.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [q]);

  const eventsByKey = useMemo(() => {
    const map = new Map<string, TrackEvent>();
    (data?.events || []).forEach((ev) => {
      const k = norm(ev?.key || ev?.label);
      if (!k) return;
      map.set(k, ev);
    });
    return map;
  }, [data]);

  const lastEventKey = useMemo(() => {
    const evs = data?.events || [];
    const last = evs[evs.length - 1];
    return norm(last?.key || last?.label || "");
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white px-4 py-10">
        <div className="max-w-xl mx-auto">Loading…</div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white px-4 py-10">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => router.push(`/${locale}/track`)}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-red-300 font-semibold">
              <AlertCircle className="w-5 h-5" />
              {err || "Shipment not found."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const invoicePaid = Boolean(data?.invoice?.paid);
  const invoiceAmount = Number(data?.invoice?.amount ?? 0);
  const invoiceCurrency = String(data?.invoice?.currency || "USD");

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-4 py-10">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.push(`/${locale}/track`)}
          className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" /> Back to tracking
        </button>

        <div className="mt-6">
          <h1 className="text-3xl font-extrabold">{data.shipmentId} Milestones</h1>
          <p className="mt-2 text-sm text-white/70">
            Tracking: <span className="font-semibold text-white">{data.trackingNumber}</span>
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white/70">Invoice</p>
                <p className={invoicePaid ? "text-green-300 font-bold" : "text-amber-300 font-bold"}>
                  {invoicePaid ? "PAID" : "UNPAID"} • {invoiceAmount.toFixed(2)} {invoiceCurrency}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/70">Destination</p>
                <p className="font-semibold">{data.destination || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline list (looks like your screenshot) */}
        <div className="mt-6 space-y-4">
          {MILESTONES.map((m) => {
            const k = norm(m.key);
            const ev = eventsByKey.get(k);
            const isDone = Boolean(ev) && k !== lastEventKey;
            const isCurrent = Boolean(ev) && k === lastEventKey;
            const isFuture = !ev;

            const dotClass = isDone
              ? "bg-green-400"
              : isCurrent
              ? "bg-amber-300"
              : "bg-transparent border border-white/25";

            const isOpen = openKey === k;

            return (
              <div key={m.key} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <button
                  onClick={() => setOpenKey((prev) => (prev === k ? "" : k))}
                  className="w-full text-left px-5 py-5 flex items-start gap-4 hover:bg-white/5 transition"
                >
                  <div className={`mt-2 h-4 w-4 rounded-full ${dotClass}`} />
                  <div className="min-w-0">
                    <p className="text-2xl font-extrabold">{ev?.label || m.label}</p>
                    <p className="text-white/50 mt-1">
                      {ev ? (formatLoc(ev) || "—") : "—"}
                    </p>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm space-y-2">
                      {ev ? (
                        <>
                          <div className="flex items-center gap-2 text-white/80">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(ev?.occurredAt) || "—"}</span>
                          </div>

                          <div className="flex items-center gap-2 text-white/80">
                            <MapPin className="w-4 h-4" />
                            <span>{formatLoc(ev) || "—"}</span>
                          </div>

                          {ev?.note ? (
                            <div className="flex items-start gap-2 text-white/80">
                              <FileText className="w-4 h-4 mt-[2px]" />
                              <p className="leading-6">{ev.note}</p>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-white/60">
                          This milestone has not been reached yet.
                        </p>
                      )}

                      {/* Always show core shipment details */}
                      <div className="pt-3 border-t border-white/10 text-white/70">
                        <p><span className="font-semibold text-white/80">Origin:</span> {data.origin || "—"}</p>
                        <p><span className="font-semibold text-white/80">Destination:</span> {data.destination || "—"}</p>
                        <p><span className="font-semibold text-white/80">Invoice:</span> {invoicePaid ? "Paid" : "Unpaid"} • {invoiceAmount.toFixed(2)} {invoiceCurrency}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-xs text-white/50">
          Note: Completed milestones remain visible. New updates are appended (nothing disappears).
        </div>
      </div>
    </div>
  );
}