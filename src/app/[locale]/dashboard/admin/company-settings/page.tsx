"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRY_LIST, getTimezoneForCountry } from "@/lib/countryTimezones";

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [country, setCountry] = useState("United States");
  const [timezone, setTimezone] = useState("America/New_York");

  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCountries = COUNTRY_LIST.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/company-settings", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load.");
      const s = json?.settings || {};
      setName(s.name || "");
      setAddress(s.address || "");
      setPhone(s.phone || "");
      setEmail(s.email || "");
      setRegistrationNumber(s.registrationNumber || "");
      const savedCountry = s.country || "United States";
      setCountry(savedCountry);
      setTimezone(s.timezone || getTimezoneForCountry(savedCountry));
    } catch (e: any) {
      setErr(e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCountrySelect = (c: string) => {
    setCountry(c);
    setTimezone(getTimezoneForCountry(c));
    setCountrySearch("");
    setShowCountryDropdown(false);
  };

  const save = async () => {
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/company-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, email, registrationNumber, country, timezone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setMsg("Company settings saved successfully.");
      window.setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <h1 className="text-2xl font-extrabold text-gray-900">Company Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update company information used on invoices and across the platform.
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
          <p className="mt-6 text-sm text-gray-600">Loading…</p>
        ) : (
          <div className="mt-6 space-y-4">

            <Field label="Company Name" value={name} onChange={setName} />
            <Field label="Address" value={address} onChange={setAddress} />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Registration Number" value={registrationNumber} onChange={setRegistrationNumber} />

            {/* Country dropdown with search */}
            <div>
              <label className="text-sm font-semibold text-gray-700">Company Country</label>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">
                Determines the platform default timezone for date formatting.
              </p>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown((v) => !v)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-left flex items-center justify-between cursor-pointer hover:border-blue-400 transition focus:outline-none focus:border-blue-400"
                >
                  <span className="font-semibold text-gray-900">{country}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCountryDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showCountryDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        autoFocus
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search country…"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCountries.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-500">No countries found.</p>
                      ) : (
                        filteredCountries.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleCountrySelect(c)}
                            className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition ${
                              c === country
                                ? "bg-blue-50 text-blue-700 font-semibold"
                                : "text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                            }`}
                          >
                            {c}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timezone (read-only, auto-set) */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Auto-detected Timezone</p>
              <p className="mt-1 text-sm font-extrabold text-gray-900">{timezone}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Automatically set from your selected country. Used for invoice and platform date formatting.
              </p>
            </div>

            <button
              onClick={save}
              className="cursor-pointer mt-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:border-blue-400 transition"
      />
    </div>
  );
}