"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, FileText, Mail, ScanLine } from "lucide-react";

/**
 * Target format:
 * EXS-INV-YYYY-MM-XXXXXXX
 * - prefix: EXS (letters)
 * - middle: INV (locked)
 * - year: 4 digits
 * - month: 2 digits (01-12 allowed; we don't hard-block, just format)
 * - seq: 7 digits
 */
function formatInvoiceInput(raw: string) {
  const upper = String(raw || "").toUpperCase();

  // keep only letters+digits, we add dashes ourselves
  const cleaned = upper.replace(/[^A-Z0-9]/g, "");

  // first 3 letters
  const prefix = cleaned.slice(0, 3).replace(/[^A-Z]/g, "");

  // remaining after prefix
  let rest = cleaned.slice(3);

  // remove any INV user typed so we don’t duplicate
  rest = rest.replace(/^INV/i, "");

  // next: year(4), month(2), seq(7)
  const digits = rest.replace(/[^0-9]/g, "");
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const seq = digits.slice(6, 13);

  // Build progressively (so deleting feels natural)
  if (!prefix) return "";
  if (prefix.length < 3) return prefix;

  let out = `${prefix}-INV`;

  if (!year) return out + "-";
  out += `-${year}`;

  if (!month) return out + "-";
  out += `-${month}`;

  if (!seq) return out + "-";
  out += `-${seq}`;

  return out;
}

/**
 * If user pastes something like:
 * "EXS-INV-2026-02-1234567"
 * it formats cleanly.
 */
function normalizeInvoiceForSubmit(v: string) {
  return formatInvoiceInput(v).replace(/-+$/g, ""); // remove trailing dashes
}

export default function InvoicePage() {
  const sp = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const qFromUrl = useMemo(() => String(sp.get("q") || "").trim(), [sp]);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!qFromUrl) return;
    setInvoiceNumber(formatInvoiceInput(qFromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const inv = normalizeInvoiceForSubmit(invoiceNumber).trim().toUpperCase();
    const em = String(email || "").trim().toLowerCase();

    if (!inv) {
      setErr("Enter your invoice number.");
      return;
    }

    // quick validation: must start with XXX-INV-
    if (!/^[A-Z]{3}-INV-\d{4}-\d{2}-\d{7}$/.test(inv)) {
      setErr("Invoice number format is invalid. Example: EXS-INV-2026-02-1234567");
      return;
    }

    if (!em || !em.includes("@") || !em.includes(".")) {
      setErr("Enter the sender or receiver email address.");
      return;
    }

    setErr("");
    setLoading(true);

    router.push(
      `/${locale}/invoice/full?invoice=${encodeURIComponent(inv)}&email=${encodeURIComponent(em)}`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-14">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-600/10 border border-blue-200 flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-700" />
          </div>

          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-gray-900">
            Invoice
          </h1>

          <p className="mt-2 text-gray-600 max-w-2xl">
            For security, invoices can only be opened using your{" "}
            <span className="font-semibold">invoice number</span> and the{" "}
            <span className="font-semibold">sender or receiver email</span>.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="p-6 sm:p-8">
            <form onSubmit={submit} className="space-y-4">
              {/* Invoice Number */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Invoice number
                </label>

                <div className="mt-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <ScanLine className="w-5 h-5" />
                  </span>

                  <input
                    value={invoiceNumber}
                    onChange={(e) => {
                      // key behavior: always format, but never “re-add” trailing dashes aggressively
                      const next = formatInvoiceInput(e.target.value);
                      setInvoiceNumber(next);
                    }}
                    placeholder="example: EXS-INV-2026-02-1234567"
                    className="w-full rounded-2xl border border-gray-300 pl-12 pr-4 py-4 text-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40
                               uppercase placeholder:normal-case placeholder:text-sm"
                    autoComplete="off"
                    spellCheck={false}
                    inputMode="text"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Email address
                </label>

                <div className="mt-2 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>

                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example: customer@email.com"
                    className="w-full rounded-2xl border border-gray-300 pl-12 pr-4 py-4 text-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40
                               placeholder:normal-case placeholder:text-sm"
                    autoComplete="email"
                    spellCheck={false}
                    inputMode="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 font-semibold
                           hover:from-blue-700 hover:to-cyan-700 transition flex items-center justify-center
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5 mr-2" />
                {loading ? "Opening…" : "View Invoice"}
              </button>

              {err && (
                <div className="flex items-center text-red-600 font-semibold">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {err}
                </div>
              )}
            </form>
          </div>

          <div className="px-6 sm:px-8 py-4 bg-blue-50 border-t border-blue-100 text-sm text-gray-700">
            Tip: Paste the invoice number from your email. It looks like{" "}
            <span className="font-semibold">EXS-INV-2026-02-1234567</span>. The email you enter must match the sender or receiver email on the shipment.
          </div>
        </motion.div>
      </div>
    </div>
  );
}