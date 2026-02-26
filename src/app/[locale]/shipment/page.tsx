"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Package, MapPin, Truck } from "lucide-react";

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
  origin?: string;
  destination?: string;
};

export default function ShipmentOverviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const sp = useSearchParams();

  const q = useMemo(() => String(sp.get("q") || sp.get("tracking") || "").trim(), [sp]);

  const [data, setData] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!q) {
        setErr("Missing shipment query.");
        setLoading(false);
        return;
      }

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
          setErr(json?.error || "Shipment not available.");
          return;
        }

        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Shipment not available.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [q]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 flex items-center justify-center">
        <p className="text-gray-700 font-semibold">Loading shipment…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6">
          <p className="text-lg font-extrabold text-gray-900">Shipment not available</p>
          <p className="mt-2 text-sm text-gray-700">{err || "Please check your shipment ID / tracking."}</p>
          <Link
            href={`/${locale}/track`}
            className="mt-5 inline-flex items-center justify-center w-full px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            <Truck className="w-5 h-5 mr-2" /> Go to Tracking
          </Link>
        </div>
      </div>
    );
  }

  const trackingOrShipment =
    String(data.trackingNumber || "").trim() || String(data.shipmentId || "").trim() || q;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">Shipment</p>
              <p className="text-2xl font-extrabold text-gray-900">{data.shipmentId}</p>
              <p className="mt-1 text-sm text-gray-600">
                Tracking: <span className="font-semibold">{data.trackingNumber || "—"}</span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">Current status</p>
              <p className="text-lg font-extrabold text-blue-700">{data.currentStatus || "—"}</p>
            </div>
          </div>

          {(data.statusNote || data.nextStep) && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              {data.statusNote ? (
                <p className="text-sm text-gray-800">
                  <span className="font-bold">Update:</span> {data.statusNote}
                </p>
              ) : null}
              {data.nextStep ? (
                <p className="mt-1 text-sm text-gray-800">
                  <span className="font-bold">Next step:</span> {data.nextStep}
                </p>
              ) : null}
            </div>
          )}

          {/* Mini-progress (half page) */}
          <div className="mt-8">
            <p className="font-extrabold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-700" />
              Progress
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.steps.slice(0, 3).map((s, idx) => (
                <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="mt-2 text-sm text-gray-600">
                    {idx <= data.currentStep ? "Completed / Current" : "Upcoming"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/${locale}/shipment/full?q=${encodeURIComponent(trackingOrShipment)}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              <MapPin className="w-5 h-5 mr-2" />
              View Full Shipment
            </Link>

            <Link
              href={`/${locale}/track?q=${encodeURIComponent(trackingOrShipment)}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-700 transition"
            >
              <Truck className="w-5 h-5 mr-2" />
              Track Shipment
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}