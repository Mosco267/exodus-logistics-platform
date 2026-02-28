"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Route, Search } from "lucide-react";

export default function AdminTrackingLookupPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const router = useRouter();

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const hint = useMemo(
    () => "Enter a Shipment ID (EXS-...) or Tracking Number (EX-...)",
    []
  );

  const go = async () => {
    const query = q.trim();
    if (!query) {
      setErr("Please enter a Shipment ID or Tracking Number.");
      return;
    }

    setErr("");
    setLoading(true);

    try {
      // Use your existing tracking API to resolve shipmentId from either input
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "Shipment not found.");
        return;
      }

      const shipmentId = String(json?.shipmentId || "").trim();
      if (!shipmentId) {
        setErr("Could not resolve shipment ID.");
        return;
      }

      router.push(
        `/${locale}/dashboard/admin/shipments/${encodeURIComponent(
          shipmentId
        )}/tracking`
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to look up shipment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                Tracking Updates
              </h1>
              <p className="text-sm text-gray-600">
                Search a shipment, then add real tracking timeline events.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-semibold text-gray-700">
              Shipment ID / Tracking Number
            </label>
            <div className="mt-2 flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-300 bg-white">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value.toUpperCase())}
                  placeholder={hint}
                  className="w-full outline-none bg-transparent text-sm"
                />
              </div>

              <button
                type="button"
                onClick={go}
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…
                  </span>
                ) : (
                  "Open"
                )}
              </button>
            </div>

            {err && (
              <div className="mt-4 flex items-center text-red-600 font-semibold">
                <AlertCircle className="w-5 h-5 mr-2" />
                {err}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm text-gray-800">
              Tip: After you open a shipment, add updates like <b>Warehouse</b>,{" "}
              <b>In Transit</b>, <b>Custom Clearance</b>, and <b>Delivered</b>{" "}
              with location + notes. These will show on the public Track page.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}