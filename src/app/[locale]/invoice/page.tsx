"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, FileText, Receipt, ScanLine, CreditCard, ClipboardList } from "lucide-react";

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = String(q || "").trim();

    if (!query) {
      setErr("Enter a Shipment ID or Tracking Number.");
      return;
    }

    setErr("");
    setLoading(true);

    // ✅ Navigate to Full Invoice page
    router.push(`/${locale}/invoice/full?q=${encodeURIComponent(query.toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-14">
      <div className="max-w-4xl mx-auto px-4">
        {/* Same header style as Track page */}
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-200 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-blue-700" />
          </div>

          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-gray-900">
            Invoice
          </h1>

          <p className="mt-2 text-gray-600 max-w-2xl">
            View your invoice using a shipment ID or tracking number.
          </p>
        </div>

        {/* Same card style as Track page */}
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
                  placeholder="example: EXS-260222-9BC87D or EX24US1234567A"
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
                <FileText className="w-5 h-5 mr-2" />
                {loading ? "Opening…" : "View Invoice"}
              </button>

              {err && (
                <div className="mt-4 flex items-center text-red-600 font-semibold">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {err}
                </div>
              )}
            </form>
          </div>

          {/* Same footer hint strip */}
          <div className="px-6 sm:px-8 py-4 bg-blue-50 border-t border-blue-100 text-sm text-gray-700">
            Tip: You can paste either your <span className="font-semibold">Shipment ID</span> or{" "}
            <span className="font-semibold">Tracking Number</span>.
          </div>
        </motion.div>
      </div>
    </div>
  );
}