"use client";

import { useEffect, useState } from "react";

type StageDoc = {
  key: string;
  label: string;
  color?: string;
  icon?: string;
  defaultUpdate?: string;
  nextStep?: string;
};

const ICON_OPTIONS = [
  "Package",
  "Truck",
  "Warehouse",
  "Plane",
  "ShieldCheck",
  "Home",
  "CircleDashed",
  "Clock3",
];

export default function AdminTimelinePage() {
  const [stages, setStages] = useState<StageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("blue");
  const [icon, setIcon] = useState("Package");
  const [defaultUpdate, setDefaultUpdate] = useState("");
  const [nextStep, setNextStep] = useState("");

  const [emailSubject, setEmailSubject] = useState("");
  const [emailTitle, setEmailTitle] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState("");
  const [emailButtonText, setEmailButtonText] = useState("Track Shipment");
  const [emailButtonHref, setEmailButtonHref] = useState("{{trackUrl}}");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/timeline", { cache: "no-store" });
      const json = await res.json();
      setStages(Array.isArray(json?.stages) ? json.stages : []);
    } catch {
      setStages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          label,
          color,
          icon,
          defaultUpdate,
          nextStep,
          emailSubject,
          emailTitle,
          emailBodyHtml,
          emailButtonText,
          emailButtonHref,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Failed to save timeline stage.");
        return;
      }

      setMsg("Timeline stage saved successfully.");
      await load();
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const editStage = async (stageKey: string) => {
    const res = await fetch(`/api/admin/timeline/${encodeURIComponent(stageKey)}`, {
      cache: "no-store",
    });
    const json = await res.json();

    const s = json?.stage;
    const e = json?.emailTemplate;

    if (!s) return;

    setKey(s.key || "");
    setLabel(s.label || "");
    setColor(s.color || "blue");
    setIcon(s.icon || "Package");
    setDefaultUpdate(s.defaultUpdate || "");
    setNextStep(s.nextStep || "");

    setEmailSubject(e?.subject || "");
    setEmailTitle(e?.title || "");
    setEmailBodyHtml(e?.bodyHtml || "");
    setEmailButtonText(e?.buttonText || "Track Shipment");
    setEmailButtonHref(e?.buttonHref || "{{trackUrl}}");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-md">
        <h1 className="text-2xl font-extrabold text-gray-900">Shipment Timeline</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create timeline stages, assign icons/colors, and define automatic emails.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Stage label" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Stage key" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="rounded-xl border border-gray-300 px-4 py-3 text-sm bg-white">
            {ICON_OPTIONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          <div className="md:col-span-2">
            <textarea value={defaultUpdate} onChange={(e) => setDefaultUpdate(e.target.value)} rows={3} placeholder="Default update text" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          </div>

          <div className="md:col-span-2">
            <textarea value={nextStep} onChange={(e) => setNextStep(e.target.value)} rows={2} placeholder="Next step text" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          </div>

          <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={emailTitle} onChange={(e) => setEmailTitle(e.target.value)} placeholder="Email title" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={emailButtonText} onChange={(e) => setEmailButtonText(e.target.value)} placeholder="Email button text" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={emailButtonHref} onChange={(e) => setEmailButtonHref(e.target.value)} placeholder="Email button href" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />

          <div className="md:col-span-2">
            <textarea
              value={emailBodyHtml}
              onChange={(e) => setEmailBodyHtml(e.target.value)}
              rows={10}
              placeholder="Email body HTML"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Timeline Stage"}
          </button>
          {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 className="text-lg font-extrabold text-gray-900">Existing Timeline Stages</h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {stages.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => editStage(s.key)}
                className="text-left rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/40 transition"
              >
                <p className="font-extrabold text-gray-900">{s.label}</p>
                <p className="mt-1 text-xs text-gray-500">key: {s.key}</p>
                <p className="mt-1 text-xs text-gray-500">icon: {s.icon || "Package"} • color: {s.color || "blue"}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}