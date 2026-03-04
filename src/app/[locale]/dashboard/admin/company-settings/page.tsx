"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CompanySettingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/company-settings", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load company settings.");

      const s = json?.settings || {};
      setName(s.name || "");
      setAddress(s.address || "");
      setPhone(s.phone || "");
      setEmail(s.email || "");
      setRegistrationNumber(s.registrationNumber || "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/company-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, email, registrationNumber }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setMsg("Company settings saved ✅");
      window.setTimeout(() => setMsg(""), 1800);
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
          Company Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Update website/company info used on invoices.
        </p>

        {msg && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
            {err}
          </div>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <Field label="Company name" value={name} onChange={setName} />
            <Field label="Address" value={address} onChange={setAddress} />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Registration number" value={registrationNumber} onChange={setRegistrationNumber} />

            <button
              onClick={save}
              className="mt-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm"
      />
    </div>
  );
}