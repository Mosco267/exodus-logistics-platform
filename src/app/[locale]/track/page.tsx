"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, Package, Truck } from "lucide-react";

type Step = { name: string; details: string[] };

type TrackResponse = {
  shipmentId: string;
  trackingNumber: string;
  currentStatus: string;
  statusNote?: string;
  nextStep?: string;
  steps: Step[];
  currentStep: number;
  estimatedDelivery: string;
};

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const qFromUrl = useMemo(() => String(searchParams.get("q") || "").trim(), [searchParams]);

  const [q, setQ] = useState("");
  const [data, setData] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (qFromUrl) {
      setQ(qFromUrl.toUpperCase());
      // auto run
      void track(qFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl]);

  const track = async (value?: string) => {
    const query = String(value ?? q).trim();
    if (!query) {
      setError("Enter your Shipment ID or Tracking Number.");
      return;
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
    } catch (e: any) {
      setError(e?.message || "Tracking unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
            Track Your Shipment
          </h1>
          <p className="mt-2 text-gray-600">
            Enter a <span className="font-semibold">Shipment ID</span> or <span className="font-semibold">Tracking Number</span>.
          </p>
        </div>

        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            void track();
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
        >
          <label className="text-sm font-semibold text-gray-700">Shipment ID / Tracking</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            placeholder="e.g. EXS-260222-9BC87D or EX-24-US-123456"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">Shipment</p>
                <p className="text-xl font-extrabold text-gray-900">
                  {data.shipmentId || "—"}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Tracking: <span className="font-semibold">{data.trackingNumber || "—"}</span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-600">Current status</p>
                <p className="text-lg font-extrabold text-blue-700">
                  {data.currentStatus || "—"}
                </p>
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

            <div className="mt-8">
              <p className="font-extrabold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-700" />
                Shipment Progress
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.steps.map((s, idx) => {
                  const active = idx <= data.currentStep;
                  const isCurrent = idx === data.currentStep;

                  return (
                    <div
                      key={idx}
                      className={[
                        "rounded-2xl border p-4 transition",
                        active ? "border-blue-200 bg-blue-50/60" : "border-gray-200 bg-white",
                        isCurrent ? "ring-2 ring-blue-500/30" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900">{s.name}</p>
                        {active && (
                          <span className="text-xs font-extrabold text-blue-700">✓</span>
                        )}
                      </div>

                      {s.details?.length ? (
                        <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc pl-5">
                          {s.details.slice(0, 3).map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-gray-600">—</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                Estimated Delivery: <span className="ml-1 font-semibold">{data.estimatedDelivery}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}