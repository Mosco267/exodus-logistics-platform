"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Truck, AlertCircle, PackageSearch, ScanLine } from "lucide-react";

export default function TrackSearchPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const searchParams = useSearchParams();

  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ If user visits /track?q=XXXX, redirect to /track/XXXX
  useEffect(() => {
    const fromUrl = String(searchParams.get("q") || "").trim();
    if (!fromUrl) return;

    const upper = fromUrl.toUpperCase();
    setQ(upper);
    router.replace(`/${locale}/track/${encodeURIComponent(upper)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();

    if (!v) {
      setError("Enter your Shipment ID or Tracking Number.");
      return;
    }

    setError("");
    setLoading(true);
    router.push(`/${locale}/track/${encodeURIComponent(v.toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-14">
      <div className="max-w-4xl mx-auto px-4">
        {/* Different header style from Invoice */}
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-200 flex items-center justify-center">
            <PackageSearch className="w-7 h-7 text-blue-700" />
          </div>

          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-gray-900">
            Track Shipment
          </h1>

          <p className="mt-2 text-gray-600 max-w-2xl">
            Enter your tracking number or shipment ID to view live milestones and the current location.
          </p>
        </div>

        {/* Different card layout from Invoice */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="p-6 sm:p-8">
            <form onSubmit={submit}>
              <label className="text-sm font-semibold text-gray-700">
                Shipment ID / Tracking Number
              </label>

              <div className="mt-2 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <ScanLine className="w-5 h-5" />
                </span>

                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value.toUpperCase())}
                  placeholder="example: EXS-260222-9BC87D or EX24US1234567W"
                  className="w-full rounded-2xl border border-gray-300 pl-12 pr-4 py-4 text-lg
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40
                             uppercase placeholder:normal-case placeholder:text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 font-semibold
                           hover:from-blue-700 hover:to-cyan-700 transition flex items-center justify-center
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Truck className="w-5 h-5 mr-2" />
                {loading ? "Opening…" : "Track Shipment"}
              </button>

              {error && (
                <div className="mt-4 flex items-center text-red-600 font-semibold">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Footer hint strip (makes it feel different from Invoice) */}
          <div className="px-6 sm:px-8 py-4 bg-blue-50 border-t border-blue-100 text-sm text-gray-700">
            Tip: You can paste either your <span className="font-semibold">Shipment ID</span> or{" "}
            <span className="font-semibold">Tracking Number</span>.
          </div>
        </motion.div>
      </div>
    </div>
  );
}