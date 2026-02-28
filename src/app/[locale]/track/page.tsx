"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Truck, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
            Track Your Shipment
          </h1>
          <p className="mt-2 text-gray-600">
            Enter a <span className="font-semibold">Shipment ID</span> or{" "}
            <span className="font-semibold">Tracking Number</span>.
          </p>
        </div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8"
        >
          <label className="text-sm font-semibold text-gray-700">
            Shipment ID / Tracking
          </label>

          <input
  value={q}
  onChange={(e) => setQ(e.target.value.toUpperCase())}
  placeholder="example: EXS-260222-9BC87D or EX24US1234567W"
  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg
             focus:outline-none focus:ring-2 focus:ring-blue-500/40
             uppercase placeholder:normal-case placeholder:text-sm"
  autoComplete="off"
  spellCheck={false}
/>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold
                       hover:bg-blue-700 transition flex items-center justify-center
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
        </motion.form>
      </div>
    </div>
  );
}