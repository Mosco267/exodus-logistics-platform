"use client";

import { useEffect, useState } from "react";

type PricingProfile = {
  shippingFee: number;
  handlingFee: number;
  customsFee: number;
  taxFee: number;
  discountFee: number;

  fuelRate: number;
  insuranceRate: number;
};

type Settings = {
  international: PricingProfile;
  local: PricingProfile;
};

const toPercent = (n: number) => (Number(n || 0) * 100).toFixed(2).replace(/\.00$/, "");
const pctToDec = (s: string) => {
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
};

const toMoneyStr = (n: number) => Number(n || 0).toFixed(2).replace(/\.00$/, "");
const moneyToNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export default function AdminPricingPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setMsg("");
    const res = await fetch("/api/admin/pricing", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    setSettings(json?.settings || null);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMsg("");

    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      alert(json?.error || "Failed to save");
      return;
    }

    setMsg("Saved ✅");
    window.setTimeout(() => setMsg(""), 2000);
    await load();
  };

  if (!settings) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-gray-700 dark:text-gray-200">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              Admin • Pricing
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Configure fixed fees + percentage rates used for invoice calculations.
            </p>
            {msg && (
              <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-300">
                {msg}
              </p>
            )}
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold
                       hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {(["international", "local"] as const).map((scope) => {
  const profile = settings[scope];

  return (
    <div key={scope} className="mt-8">
      <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
        {scope === "international" ? "International Pricing" : "Local Pricing"}
      </h2>

      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
        Default pricing used for {scope} shipments.
      </p>

      {/* Fixed fees */}
      <p className="mt-6 text-sm font-bold text-gray-900 dark:text-gray-100">
        Fixed fees (amount)
      </p>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            ["shippingFee", "Shipping Fee"],
            ["handlingFee", "Handling Fee"],
            ["customsFee", "Customs Clearance"],
            ["taxFee", "Tax"],
            ["discountFee", "Discount"],
          ] as const
        ).map(([k, label]) => (
          <div
            key={k}
            className="rounded-2xl border border-gray-100 dark:border-white/10 p-4"
          >
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {label}
            </p>

            <input
              value={toMoneyStr((profile as any)[k])}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        [scope]: {
                          ...prev[scope],
                          [k]: moneyToNum(e.target.value),
                        },
                      }
                    : prev
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm"
              inputMode="decimal"
            />
          </div>
        ))}
      </div>

      {/* Percentage rates */}
      <p className="mt-8 text-sm font-bold text-gray-900 dark:text-gray-100">
        Percentage rates
      </p>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            ["fuelRate", "Fuel surcharge % (of shipping)"],
            ["insuranceRate", "Insurance % (of declared value)"],
          ] as const
        ).map(([k, label]) => (
          <div
            key={k}
            className="rounded-2xl border border-gray-100 dark:border-white/10 p-4"
          >
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {label}
            </p>

            <input
              value={toPercent((profile as any)[k])}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        [scope]: {
                          ...prev[scope],
                          [k]: pctToDec(e.target.value),
                        },
                      }
                    : prev
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm"
              inputMode="decimal"
            />
          </div>
        ))}
      </div>
    </div>
  );
})}
        </div>
      </div>
  );
}