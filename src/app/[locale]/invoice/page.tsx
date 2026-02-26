"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, FileText } from "lucide-react";

export default function InvoicePage() {
  const sp = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const qFromUrl = useMemo(
    () => String(sp.get("q") || sp.get("tracking") || "").trim(),
    [sp]
  );

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // If user opened /invoice?q=... directly, go straight to full invoice page
  useEffect(() => {
    if (!qFromUrl) return;
    const upper = qFromUrl.toUpperCase();
    setQ(upper);
    router.replace(`/${locale}/invoice/full?q=${encodeURIComponent(upper)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl]);

  const submit = () => {
    const query = String(q || "").trim();
    if (!query) {
      setErr("Enter a Shipment ID or Tracking Number.");
      return;
    }
    setErr("");
    setLoading(true);

    router.push(`/${locale}/invoice/full?q=${encodeURIComponent(query)}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
            Invoice
          </h1>
          <p className="mt-2 text-gray-600">
            View invoice using Shipment ID or Tracking Number.
          </p>
        </div>

        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
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
            placeholder="Example: EXS-260222-9BC87D or EX-24-US-123456"
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
              "Loading…"
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" /> View Invoice
              </>
            )}
          </button>

          {err && (
            <div className="mt-4 flex items-center text-red-600 font-semibold">
              <AlertCircle className="w-5 h-5 mr-2" />
              {err}
            </div>
          )}
        </motion.form>
      </div>
    </div>
  );
}