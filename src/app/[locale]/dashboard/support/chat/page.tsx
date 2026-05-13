// src/app/[locale]/dashboard/support/chat/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";
import LiveChatWidget from "@/components/support/LiveChatWidget";

export default function UserChatPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
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

  const userId = String((session?.user as any)?.id || "");
  const headerTitleCls = isMidnight ? "text-white" : "text-gray-900 dark:text-white";

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-4">

      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/dashboard/support`)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className={`text-xl font-extrabold ${headerTitleCls}`}>Live Chat</h1>
      </div>

      <div className="h-[calc(100vh-220px)] min-h-[480px]">
        {userId ? (
          <LiveChatWidget
            userId={userId}
            viewer="user"
            otherPartyLabel="Exodus Support"
            accentSolid={accentSolid}
            accentGradient={accentGradient}
          />
        ) : (
          <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-8 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentSolid }} />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading chat…</p>
          </div>
        )}
      </div>
    </div>
  );
}