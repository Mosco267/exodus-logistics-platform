"use client";

import { useEffect, useMemo, useState } from "react";

type StatusDoc = {
  key: string;
  label: string;
  color: string;
  icon?: string;
  defaultUpdate?: string;
  nextStep?: string;
  emailSubject?: string;
  emailTitle?: string;
  emailPreheader?: string;
  emailBodyHtml?: string;
  emailButtonText?: string;
  emailButtonUrlType?: string;
};

const COLOR_OPTIONS = [
  "blue",
  "cyan",
  "green",
  "orange",
  "red",
  "purple",
  "pink",
  "slate",
  "amber",
  "indigo",
  "gray",
];

const ICON_OPTIONS = [
  "package",
  "truck",
  "warehouse",
  "plane",
  "shield",
  "home",
  "clock",
  "check",
  "route",
  "file",
  "alert",
];

const normalizeKey = (v: string) =>
  (v ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

export default function AdminStatusesPage() {
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingKey, setEditingKey] = useState("");

  const [label, setLabel] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [color, setColor] = useState("blue");
  const [icon, setIcon] = useState("package");
  const [defaultUpdate, setDefaultUpdate] = useState("");
  const [nextStep, setNextStep] = useState("");

  const [emailSubject, setEmailSubject] = useState("");
  const [emailTitle, setEmailTitle] = useState("");
  const [emailPreheader, setEmailPreheader] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState("");
  const [emailButtonText, setEmailButtonText] = useState("Track Shipment");
  const [emailButtonUrlType, setEmailButtonUrlType] = useState("track");

  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState("");
  const [msg, setMsg] = useState("");

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/statuses", { cache: "no-store" });
      const data = await res.json();
      setStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
    } catch {
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const resetForm = () => {
    setMode("create");
    setEditingKey("");
    setLabel("");
    setKeyInput("");
    setColor("blue");
    setIcon("package");
    setDefaultUpdate("");
    setNextStep("");
    setEmailSubject("");
    setEmailTitle("");
    setEmailPreheader("");
    setEmailBodyHtml("");
    setEmailButtonText("Track Shipment");
    setEmailButtonUrlType("track");
    setMsg("");
  };

  const startEdit = (s: StatusDoc) => {
    setMode("edit");
    setEditingKey(s.key);
    setLabel(s.label || "");
    setKeyInput(s.key || "");
    setColor((s.color || "blue").toLowerCase());
    setIcon((s.icon || "package").toLowerCase());
    setDefaultUpdate(s.defaultUpdate || "");
    setNextStep(s.nextStep || "");
    setEmailSubject(s.emailSubject || "");
    setEmailTitle(s.emailTitle || "");
    setEmailPreheader(s.emailPreheader || "");
    setEmailBodyHtml(s.emailBodyHtml || "");
    setEmailButtonText(s.emailButtonText || "Track Shipment");
    setEmailButtonUrlType(s.emailButtonUrlType || "track");
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const canSubmit = useMemo(() => {
    if (!label.trim()) return false;
    if (mode === "create") return true;
    return Boolean(editingKey);
  }, [label, mode, editingKey]);

  const submit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setMsg("");

    try {
      const keyToUse = mode === "edit" ? editingKey : normalizeKey(keyInput || label);

      const res = await fetch("/api/statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: keyToUse,
          label: label.trim(),
          color,
          icon,
          defaultUpdate: defaultUpdate.trim(),
          nextStep: nextStep.trim(),
          emailSubject: emailSubject.trim(),
          emailTitle: emailTitle.trim(),
          emailPreheader: emailPreheader.trim(),
          emailBodyHtml: emailBodyHtml.trim(),
          emailButtonText: emailButtonText.trim(),
          emailButtonUrlType: emailButtonUrlType.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || "Failed to save timeline stage.");
        return;
      }

      setMsg(mode === "edit" ? "Timeline stage updated and email template synced." : "Timeline stage created and email template synced.");
      await fetchStatuses();

      if (mode === "create") resetForm();
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteStatus = async (s: StatusDoc) => {
    const ok = confirm(`Delete timeline stage "${s.label}"?`);
    if (!ok) return;

    setDeletingKey(s.key);
    setMsg("");

    try {
      const res = await fetch(`/api/statuses?key=${encodeURIComponent(s.key)}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || "Failed to delete timeline stage.");
        return;
      }

      if (mode === "edit" && editingKey === s.key) resetForm();

      setMsg("Timeline stage deleted successfully.");
      await fetchStatuses();
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setDeletingKey("");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Shipment Timeline Manager</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create timeline stages, choose icons and colors, and define the automatic email sent when the stage is used.
            </p>
          </div>

          {mode === "edit" && (
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
            >
              New Timeline Stage
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">Stage Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">
              Stage Key {mode === "edit" ? "(locked)" : "(optional)"}
            </label>
            <input
              value={mode === "edit" ? editingKey : keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              disabled={mode === "edit"}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Color</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Icon</label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
            >
              {ICON_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Default Update Text</label>
            <textarea
              value={defaultUpdate}
              onChange={(e) => setDefaultUpdate(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600">Next Step Text</label>
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-extrabold text-gray-900">Automatic Email for this Timeline Stage</h2>
          <p className="mt-1 text-sm text-gray-600">
            This email can later appear inside Email Templates too, but here you define what gets sent for this shipment stage.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Email Subject</label>
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Email Title</label>
              <input
                value={emailTitle}
                onChange={(e) => setEmailTitle(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Email Preheader</label>
              <input
                value={emailPreheader}
                onChange={(e) => setEmailPreheader(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Email Button Text</label>
              <input
                value={emailButtonText}
                onChange={(e) => setEmailButtonText(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Email Button URL Type</label>
              <select
                value={emailButtonUrlType}
                onChange={(e) => setEmailButtonUrlType(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
              >
                <option value="track">track</option>
                <option value="invoice">invoice</option>
                <option value="support">support</option>
                <option value="none">none</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Email Body HTML</label>
              <textarea
                value={emailBodyHtml}
                onChange={(e) => setEmailBodyHtml(e.target.value)}
                rows={10}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Timeline Stage"}
          </button>

          {mode === "edit" && (
            <button
              onClick={resetForm}
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}

          {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">Existing Timeline Stages</h2>
          <button
            onClick={fetchStatuses}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading…</p>
        ) : statuses.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No timeline stages yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {statuses.map((s) => (
              <div
                key={s.key}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-gray-900">{s.label}</p>
                    <p className="mt-1 text-xs text-gray-500">key: {s.key}</p>
                    <p className="mt-1 text-xs text-gray-500">color: {s.color}</p>
                    <p className="mt-1 text-xs text-gray-500">icon: {s.icon || "package"}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Edit →
                    </button>

                    <button
                      onClick={() => deleteStatus(s)}
                      disabled={deletingKey === s.key}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                      {deletingKey === s.key ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-600 space-y-2">
                  {s.defaultUpdate && (
                    <p><span className="font-semibold">Default update:</span> {s.defaultUpdate}</p>
                  )}
                  {s.nextStep && (
                    <p><span className="font-semibold">Next step:</span> {s.nextStep}</p>
                  )}
                  {s.emailSubject && (
                    <p><span className="font-semibold">Email subject:</span> {s.emailSubject}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}