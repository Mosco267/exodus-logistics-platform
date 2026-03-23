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

const DEFAULT_BODY = `{{badge}}

<p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
Hello {{name}},
</p>

<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
{{intro}}
</p>

<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
{{detail}}
</p>

<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
{{extra}}
</p>

{{detailsCard}}

{{destinationBlock}}

{{noteBlock}}

<p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;">
{{closingText}}
</p>

{{invoiceLink}}`;

const COLOR_OPTIONS = [
  "blue", "cyan", "green", "orange", "red", "purple",
  "pink", "slate", "amber", "indigo", "gray",
];

const ICON_OPTIONS = [
  "package", "truck", "warehouse", "plane", "shield",
  "home", "clock", "check", "route", "file", "alert",
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
  const [emailBodyHtml, setEmailBodyHtml] = useState(DEFAULT_BODY);
  const [emailButtonText, setEmailButtonText] = useState("Track Shipment");
  const [emailButtonUrlType, setEmailButtonUrlType] = useState("track");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<StatusDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => { fetchStatuses(); }, []);

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
    setEmailBodyHtml(DEFAULT_BODY);
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
    setEmailBodyHtml(s.emailBodyHtml || DEFAULT_BODY);
    setEmailButtonText(s.emailButtonText || "Track Shipment");
    setEmailButtonUrlType(s.emailButtonUrlType || "track");
    setMsg("");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
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
      if (!res.ok) { setMsg(data?.error || "Failed to save timeline stage."); return; }
      setMsg(mode === "edit" ? "Timeline stage updated and email template synced." : "Timeline stage created and email template synced.");
      await fetchStatuses();
      if (mode === "create") resetForm();
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Delete from statuses
      await fetch(`/api/statuses?key=${encodeURIComponent(deleteTarget.key)}`, { method: "DELETE" });
      // Also delete matching email template
      await fetch("/api/email-templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `timeline:${deleteTarget.key}` }),
      });
      if (mode === "edit" && editingKey === deleteTarget.key) resetForm();
      setMsg("Timeline stage deleted successfully.");
      await fetchStatuses();
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Form */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Shipment Timeline Manager</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create timeline stages and define the automatic email sent when the stage is used. Changes sync automatically to Email Templates.
            </p>
          </div>
          {mode === "edit" && (
            <button onClick={resetForm} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-sm">
              Clear
            </button>
          )}
        </div>

        {mode === "create" && (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            Fill in the form below to create a new timeline stage. The email body already has a default template you can customise.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4">

          {/* Label + Key */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Stage Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. In Transit"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Stage Key {mode === "edit" ? "(locked)" : "(auto-generated, optional)"}
              </label>
              <input
                value={mode === "edit" ? editingKey : keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                disabled={mode === "edit"}
                placeholder="e.g. intransit"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm disabled:opacity-60 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Color + Icon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Color</label>
              <select value={color} onChange={(e) => setColor(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Icon</label>
              <select value={icon} onChange={(e) => setIcon(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Default Update + Next Step */}
          <div>
            <label className="text-xs font-semibold text-gray-600">Default Update Text</label>
            <textarea value={defaultUpdate} onChange={(e) => setDefaultUpdate(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Next Step Text</label>
            <textarea value={nextStep} onChange={(e) => setNextStep(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </div>

          {/* Email section */}
          <div className="mt-2 border-t border-gray-100 pt-6">
            <h2 className="text-base font-extrabold text-gray-900">Automatic Email</h2>
            <p className="mt-1 text-sm text-gray-500">This email is sent automatically when this timeline stage is applied to a shipment. It also appears in Email Templates under Automated Templates.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Email Subject</label>
            <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="e.g. Shipment update: {{shipmentId}}" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Email Title</label>
            <input value={emailTitle} onChange={(e) => setEmailTitle(e.target.value)} placeholder="e.g. Shipment in transit" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Email Preheader</label>
            <input value={emailPreheader} onChange={(e) => setEmailPreheader(e.target.value)} placeholder="e.g. Your shipment is now in transit." className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Button Text</label>
              <input value={emailButtonText} onChange={(e) => setEmailButtonText(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Button URL Type</label>
              <select value={emailButtonUrlType} onChange={(e) => setEmailButtonUrlType(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                <option value="track">track</option>
                <option value="invoice">invoice</option>
                <option value="support">support</option>
                <option value="signin">sign-in</option>
                <option value="none">none</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Email Body HTML</label>
            <textarea
              value={emailBodyHtml}
              onChange={(e) => setEmailBodyHtml(e.target.value)}
              rows={18}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono"
            />
            <p className="mt-2 text-xs text-gray-500">
              Placeholders: {"{{badge}}"}, {"{{name}}"}, {"{{intro}}"}, {"{{detail}}"}, {"{{extra}}"}, {"{{detailsCard}}"}, {"{{destinationBlock}}"}, {"{{noteBlock}}"}, {"{{closingText}}"}, {"{{invoiceLink}}"}, {"{{shipmentId}}"}, {"{{trackingNumber}}"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 text-sm"
          >
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Timeline Stage"}
          </button>
          {mode === "edit" && (
            <button onClick={resetForm} className="px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-sm">
              Cancel
            </button>
          )}
          {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
        </div>
      </div>

      {/* Existing stages */}
      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Existing Timeline Stages</h2>
            <p className="text-xs text-gray-500 mt-0.5">Click Edit to modify a stage. Changes sync to Email Templates automatically.</p>
          </div>
          <button onClick={fetchStatuses} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-sm">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        ) : statuses.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No timeline stages yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {statuses.map((s) => (
              <div key={s.key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-blue-200 transition">
                <p className="font-extrabold text-gray-900">{s.label}</p>
                <p className="mt-1 text-xs text-gray-500">key: {s.key}</p>
                <p className="mt-1 text-xs text-gray-500">color: {s.color} · icon: {s.icon || "package"}</p>
                {s.emailSubject && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-1">subject: {s.emailSubject}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => startEdit(s)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 text-center mb-1">Delete Timeline Stage</h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              Are you sure you want to delete <strong>{deleteTarget.label}</strong>?
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              This will also remove the matching email template (<code className="bg-gray-100 px-1 py-0.5 rounded">timeline:{deleteTarget.key}</code>) from Email Templates. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-sm"
              >
                No, Keep It
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition text-sm"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}