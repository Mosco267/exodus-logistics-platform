"use client";

import { useEffect, useMemo, useState } from "react";

type EmailTemplateDoc = {
  key: string;
  label: string;
  category: string;
  subject: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
  buttonText?: string;
  buttonUrlType?: string;
};

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingKey, setEditingKey] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrlType, setButtonUrlType] = useState("track");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-templates", { cache: "no-store" });
      const data = await res.json();
      setTemplates(Array.isArray(data?.templates) ? data.templates : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const startEdit = (t: EmailTemplateDoc) => {
    setEditingKey(t.key);
    setLabel(t.label || "");
    setCategory(t.category || "");
    setSubject(t.subject || "");
    setTitle(t.title || "");
    setPreheader(t.preheader || "");
    setBodyHtml(t.bodyHtml || "");
    setButtonText(t.buttonText || "");
    setButtonUrlType(t.buttonUrlType || "track");
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingKey("");
    setLabel("");
    setCategory("");
    setSubject("");
    setTitle("");
    setPreheader("");
    setBodyHtml("");
    setButtonText("");
    setButtonUrlType("track");
    setMsg("");
  };

  const canSave = useMemo(() => {
    return Boolean(editingKey && label.trim() && subject.trim() && title.trim() && bodyHtml.trim());
  }, [editingKey, label, subject, title, bodyHtml]);

  const save = async () => {
    if (!canSave) return;

    setSaving(true);
    setMsg("");

    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editingKey,
          label,
          category,
          subject,
          title,
          preheader,
          bodyHtml,
          buttonText,
          buttonUrlType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || "Failed to save template.");
        return;
      }

      setMsg("Email template updated successfully.");
      await fetchTemplates();
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Email Templates</h1>
            <p className="mt-1 text-sm text-gray-600">
              Edit full automatic email templates used across your logistics system.
            </p>
          </div>

          {editingKey && (
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
            >
              Clear
            </button>
          )}
        </div>

        {!editingKey ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
            Select a template below to edit it.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Template Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Button URL Type</label>
                <select
                  value={buttonUrlType}
                  onChange={(e) => setButtonUrlType(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                >
                  <option value="track">track</option>
                  <option value="invoice">invoice</option>
                  <option value="support">support</option>
                  <option value="none">none</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Preheader</label>
              <input
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Button Text</label>
              <input
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Body HTML</label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={16}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono"
              />
              <p className="mt-2 text-xs text-gray-500">
                You can use placeholders like: {"{{shipmentId}}"}, {"{{trackingNumber}}"}, {"{{invoiceNumber}}"}, {"{{name}}"}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={!canSave || saving}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Template"}
              </button>

              {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">Existing Templates</h2>
          <button
            onClick={fetchTemplates}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No templates found.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <button
                key={t.key}
                onClick={() => startEdit(t)}
                className="text-left rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-blue-200 hover:bg-blue-50/30 transition"
              >
                <p className="font-extrabold text-gray-900">{t.label}</p>
                <p className="mt-1 text-xs text-gray-500">key: {t.key}</p>
                <p className="mt-1 text-xs text-gray-500">category: {t.category}</p>
                <p className="mt-3 text-sm text-gray-700 line-clamp-2">{t.subject}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}