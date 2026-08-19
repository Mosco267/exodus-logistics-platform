// src/app/[locale]/unavailable/page.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useIntl } from "react-intl";
import { Clock, ArrowLeft, LifeBuoy, MapPin, FileText } from "lucide-react";
import { useCompany } from "@/lib/useCompany";
import { useAuthAvailability } from "@/lib/useAuthAvailability";

export default function AuthUnavailablePage() {
  const params = useParams();
  const sp = useSearchParams();
  const locale = (params?.locale as string) || "en";
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const company = useCompany();
  const { message } = useAuthAvailability();

  /* middleware appends ?for=signin or ?for=signup so the copy can be
     specific about what is paused. */
  const which = useMemo(() => String(sp.get("for") || "").toLowerCase(), [sp]);

  const heading = which === "signin"
    ? t("Unavailable.signInTitle")
    : which === "signup"
    ? t("Unavailable.signUpTitle")
    : t("Unavailable.genericTitle");

  const body = which === "signin"
    ? t("Unavailable.signInBody")
    : which === "signup"
    ? t("Unavailable.signUpBody")
    : t("Unavailable.genericBody");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-cyan-400" />

        <div className="p-7 sm:p-9 text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>

          <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-gray-900">
            {heading}
          </h1>

          <p className="mt-3 text-gray-600 leading-relaxed">
            {body}
          </p>

          {/* Admin-authored note, shown when one has been set */}
          {message.trim() && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-800 leading-relaxed">{message}</p>
            </div>
          )}

          <div className="mt-7 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link href={`/${locale}`}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
              <ArrowLeft className="w-4 h-4" /> {t("Unavailable.backHome")}
            </Link>
            <Link href={`/${locale}/track`}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
              <MapPin className="w-4 h-4" /> {t("Unavailable.trackShipment")}
            </Link>
            <Link href={`/${locale}/invoice`}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
              <FileText className="w-4 h-4" /> {t("Unavailable.viewInvoice")}
            </Link>
          </div>

          {company.email && (
            <p className="mt-6 text-xs text-gray-500 flex items-center justify-center gap-1.5">
              <LifeBuoy className="w-3.5 h-3.5" />
              {t("Unavailable.contact", {
                email: () => (
                  <a href={`mailto:${company.email}`} className="text-blue-700 underline font-semibold hover:text-blue-900 transition">
                    {company.email}
                  </a>
                ),
              })}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}