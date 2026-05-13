// src/app/[locale]/dashboard/support/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Mail, Ticket, ChevronRight, Loader2 } from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";

export default function SupportLandingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

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
  const [presence, setPresence] = useState<{ online: boolean }>({ online: false });
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [emailRes, presRes] = await Promise.all([
          fetch("/api/support/meta", { cache: "no-store" }),
          fetch("/api/support/presence", { cache: "no-store" }),
        ]);
        const emailJson = await emailRes.json().catch(() => null);
        const presJson = await presRes.json().catch(() => null);
        setSupportEmail(emailJson?.supportEmail || "");
        setPresence({ online: Boolean(presJson?.online) });
      } catch {}
      finally { setLoadingMeta(false); }
    };
    void load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const headerTitleCls = isMidnight ? "text-white" : "text-gray-900 dark:text-white";
  const headerSubCls = isMidnight ? "text-white/70" : "text-gray-500 dark:text-gray-400";

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">

      <div>
        <h1 className={`text-2xl font-extrabold ${headerTitleCls}`}>Support</h1>
        <p className={`mt-1 text-sm ${headerSubCls}`}>
          Choose how you'd like to reach our team. We're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Live Chat */}
        <Link
          href={`/${locale}/dashboard/support/chat`}
          className="group relative rounded-2xl border-2 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden hover:-translate-y-0.5"
          style={{ borderColor: `${accentSolid}40` }}>
          {!loadingMeta && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${presence.online ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {presence.online ? "Online" : "Offline"}
              </span>
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: accentGradient }}>
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Live Chat</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            Real-time conversation with our support team. Fastest way to get help.
          </p>
          <div className="flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-1" style={{ color: accentSolid }}>
            Start chat <ChevronRight size={12} />
          </div>
        </Link>

        {/* Email */}
        <a
          href={supportEmail ? `mailto:${supportEmail}?subject=Support%20Request` : undefined}
          className={`group relative rounded-2xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden hover:-translate-y-0.5 ${!supportEmail ? "opacity-60 cursor-not-allowed" : ""}`}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-purple-500">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">Email Us</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            Send us a detailed message via your own mail app. We reply within 24 hours.
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 transition-transform group-hover:translate-x-1">
            {loadingMeta ? <Loader2 size={12} className="animate-spin" /> : <>Open mail app <ChevronRight size={12} /></>}
          </div>
          {supportEmail && (
            <p className="absolute bottom-3 left-5 text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[calc(100%-2.5rem)]">
              {supportEmail}
            </p>
          )}
        </a>

        {/* Tickets */}
        <Link
          href={`/${locale}/dashboard/support/tickets`}
          className="group relative rounded-2xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden hover:-translate-y-0.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-amber-500">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white mb-1">My Tickets</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            Open a formal ticket for tracked issues. View status and replies anytime.
          </p>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 transition-transform group-hover:translate-x-1">
            View tickets <ChevronRight size={12} />
          </div>
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-5">
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-3">Not sure which to choose?</h3>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <li className="flex gap-2">
            <span className="text-base shrink-0">💬</span>
            <span><strong>Live Chat</strong> — best for quick questions, immediate help while you're online.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-base shrink-0">📧</span>
            <span><strong>Email</strong> — best if you prefer your own mail app, or you're sending long detailed messages.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-base shrink-0">🎫</span>
            <span><strong>Tickets</strong> — best for issues you want to track formally (billing disputes, shipment problems, account changes).</span>
          </li>
        </ul>
      </div>
    </div>
  );
}