"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw, MapPin, Loader2, Plus, X,
  CheckCircle2, XCircle, Search,
} from "lucide-react";
import { COUNTRIES_WITH_STATES } from "@/lib/countriesData";

type LocalCountry = {
  countryCode: string;
  countryName: string;
  enabled: boolean;
  addedAt?: string | null;
};

export default function LocalAvailabilityPage() {
  const [items, setItems] = useState<LocalCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3500);
  };

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch("/api/admin/local-availability", { cache: "no-store" });
      const json = await res.json();
      setItems(Array.isArray(json?.countries) ? json.countries : []);
    } catch {
      showMsg("Failed to load.", "error");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addCountry = async (countryCode: string, countryName: string) => {
    setBusy(countryCode);
    try {
      const res = await fetch("/api/admin/local-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, countryName, enabled: true }),
      });
      if (!res.ok) {
        showMsg("Failed to add country.", "error");
        return;
      }
      showMsg(`${countryName} added.`);
      await load(true);
      setShowAdd(false);
      setSearch('');
    } finally { setBusy(null); }
  };

  const toggleEnabled = async (item: LocalCountry) => {
    setBusy(item.countryCode);
    try {
      const res = await fetch("/api/admin/local-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: item.countryCode,
          countryName: item.countryName,
          enabled: !item.enabled,
        }),
      });
      if (!res.ok) {
        showMsg("Failed to update.", "error");
        return;
      }
      showMsg(`${item.countryName} ${!item.enabled ? 'enabled' : 'disabled'}.`);
      await load(true);
    } finally { setBusy(null); }
  };

  const removeCountry = async (item: LocalCountry) => {
    if (!confirm(`Remove ${item.countryName} from local availability?`)) return;
    setBusy(item.countryCode);
    try {
      const res = await fetch("/api/admin/local-availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: item.countryCode }),
      });
      if (!res.ok) {
        showMsg("Failed to remove.", "error");
        return;
      }
      showMsg(`${item.countryName} removed.`);
      await load(true);
    } finally { setBusy(null); }
  };

  const existingCodes = new Set(items.map(i => i.countryCode));
  const availableToAdd = COUNTRIES_WITH_STATES.filter(c =>
    !existingCodes.has(c.code) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Local Availability</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Countries where local (in-country) shipping is available. Users in countries not on this list can only ship internationally.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => load(true)} disabled={refreshing}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button type="button" onClick={() => setShowAdd(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
              <Plus className="w-3.5 h-3.5" />
              Add Country
            </button>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            msgType === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
            {msgType === "error" ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {msg}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Loading countries…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold">No countries configured.</p>
              <p className="text-xs text-gray-400 max-w-xs text-center">
                Add countries to enable local shipping. Without any countries, local shipping is unavailable to all users.
              </p>
              <button onClick={() => setShowAdd(true)}
                className="mt-2 cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                <Plus className="w-3.5 h-3.5" /> Add your first country
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.countryCode} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition">
                  <img src={`https://flagcdn.com/w40/${item.countryCode.toLowerCase()}.png`}
                    alt={item.countryName} className="w-10 h-7 rounded-sm shrink-0 object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{item.countryName}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{item.countryCode}</p>
                  </div>
                  <button onClick={() => toggleEnabled(item)} disabled={busy === item.countryCode}
                    className={`cursor-pointer inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                      item.enabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                    }`}>
                    {item.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button onClick={() => removeCountry(item)} disabled={busy === item.countryCode}
                    className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition disabled:opacity-50">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add country modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Add Country</h3>
              <button onClick={() => { setShowAdd(false); setSearch(''); }}
                className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search country…" autoFocus
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-500"
                  style={{ fontSize: '16px' }} />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {availableToAdd.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  {search ? 'No countries match your search.' : 'All countries already added.'}
                </p>
              ) : (
                availableToAdd.map(c => (
                  <button key={c.code} onClick={() => addCountry(c.code, c.name)}
                    disabled={busy === c.code}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-blue-50/50 transition cursor-pointer disabled:opacity-50">
                    <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                      alt={c.name} className="w-8 h-6 rounded-sm shrink-0 object-cover" />
                    <span className="text-sm font-semibold text-gray-900 flex-1">{c.name}</span>
                    {busy === c.code
                      ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      : <Plus className="w-4 h-4 text-gray-400" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}