"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Settings = {
  shippingRate: number;
  insuranceRate: number;
  customsRate: number;
  fuelRate: number;
  discountRate: number;
  taxRate: number;
};

const toPercent = (n: number) => (Number(n || 0) * 100).toFixed(2);
const fromInput = (s: string) => {
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return n; // user types percent like 10, 8.5, etc
};

export default function AdminPricingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setMsg("");
    const res = await fetch("/api/admin/pricing", { cache: "no-store" });
    const json = await res.json();
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
      body: JSON.stringify({
        settings: {
          shippingRate: fromInput(String(settings.shippingRate)),
          insuranceRate: fromInput(String(settings.insuranceRate)),
          customsRate: fromInput(String(settings.customsRate)),
          fuelRate: fromInput(String(settings.fuelRate)),
          discountRate: fromInput(String(settings.discountRate)),
          taxRate: fromInput(String(settings.taxRate)),
        },
      }),
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

  // UI stores percent values for easy editing
  const ui = {
    shippingRate: toPercent(settings.shippingRate),
    insuranceRate: toPercent(settings.insuranceRate),
    customsRate: toPercent(settings.customsRate),
    fuelRate: toPercent(settings.fuelRate),
    discountRate: toPercent(settings.discountRate),
    taxRate: toPercent(settings.taxRate),
  };

  const setUi = (key: keyof typeof ui, val: string) => {
    // keep user input as percent number (not decimal)
    const num = fromInput(val);
    // convert to decimal in state
    const decimal = num / 100;

    setSettings((prev) =>
      prev
        ? {
            ...prev,
            [key]: decimal,
          }
        : prev
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              Admin • Pricing
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              These percentages control how invoices are calculated from the Declared Value.
            </p>
            {msg && <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-300">{msg}</p>}
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              ["shippingRate", "Shipping Rate (% of Declared Value)"],
              ["insuranceRate", "Insurance (% of Shipping)"],
              ["customsRate", "Customs (% of Shipping)"],
              ["fuelRate", "Fuel (% of Shipping)"],
              ["discountRate", "Discount (% of Shipping)"],
              ["taxRate", "Tax (% of Subtotal)"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</p>
              <input
                value={(ui as any)[k]}
                onChange={(e) => setUi(k as any, e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm"
                inputMode="decimal"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Type as percent (example: 10, 8.5, 0).
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}