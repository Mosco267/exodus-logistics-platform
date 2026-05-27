// src/app/[locale]/dashboard/support/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Mail, ChevronRight, Loader2 } from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";
import { useIntl } from "react-intl";

export default function SupportLandingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [accentGradient, setAccentGradient] = useState("linear-gradient(135deg, #0b3aa4, #0e7490)");
  const [isMidnight, setIsMidnight] = useState(false);

  useEffect(() => {
    const apply = () => {
      try {
        const t = (localStorage.getItem("exodus_theme_cache") as ThemeId | null) || "default";
        const theme = THEMES.find(x => x.id === t) || THEMES[0];
        setAccentSolid(theme.accent || "#0b3aa4");
        setAccentGradient(theme.sidebar || "linear-gradient(135deg, #0b3aa4, #0e7490)");
        setIsMidnight(t === "midnight");
      } catch {}
    };
    apply();
    window.addEventListener("storage", apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener("storage", apply); clearInterval(t); };
  }, []);

  const [supportEmail, setSupportEmail] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/support/meta", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        setSupportEmail(json?.supportEmail || "");
      } catch {}
      finally { setLoadingMeta(false); }
    };
    void load();
  }, []);

  const headerTitleCls = isMidnight ? "text-white" : "text-gray-900 dark:text-white";
  const headerSubCls = isMidnight ? "text-white/70" : "text-gray-500 dark:text-gray-400";

  return (
    // ✅ Container narrowed to max-w-2xl so cards + header + help panel align
    <div className="max-w-2xl mx-auto pb-12 space-y-6">

      <div>
        <h1 className={`text-2xl font-extrabold ${headerTitleCls}`}>{t("Support.title")}</h1>
        <p className={`mt-1 text-sm ${headerSubCls}`}>
          {t("Support.subtitle")}
        </p>
      </div>

      {/* ✅ Grid fills the centered container — no extra max-width needed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Live Chat */}
        <Link
          href={`/${locale}/dashboard/support/chat`}
          className="group relative rounded-2xl border-2 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden hover:-translate-y-0.5"
          style={{ borderColor: `${accentSolid}40` }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: accentGradient }}>
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">{t("Support.liveChatTitle")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            {t("Support.liveChatDesc")}
          </p>
          <div className="flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-1" style={{ color: accentSolid }}>
            {t("Support.startChat")} <ChevronRight size={12} />
          </div>
        </Link>

        {/* Email Us */}
        <a
          href={supportEmail ? `mailto:${supportEmail}?subject=${encodeURIComponent(t("Support.mailSubject"))}` : undefined}
          className={`group relative rounded-2xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden hover:-translate-y-0.5 ${!supportEmail ? "opacity-60 cursor-not-allowed" : ""}`}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-purple-500">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">{t("Support.emailTitle")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            {t("Support.emailDesc")}
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 transition-transform group-hover:translate-x-1 mb-3">
            {loadingMeta ? <Loader2 size={12} className="animate-spin" /> : <>{t("Support.openMail")} <ChevronRight size={12} /></>}
          </div>
          {supportEmail && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
              {supportEmail}
            </p>
          )}
        </a>
      </div>

      {/* ✅ Help panel — matches container width naturally now */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-5">
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-3">{t("Support.helpHeading")}</h3>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <li className="flex gap-2">
            <span className="text-base shrink-0">💬</span>
            <span>{t("Support.helpChat", {
              strong: (chunks: any) => <strong>{chunks}</strong>,
            })}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-base shrink-0">📧</span>
            <span>{t("Support.helpEmail", {
              strong: (chunks: any) => <strong>{chunks}</strong>,
            })}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}