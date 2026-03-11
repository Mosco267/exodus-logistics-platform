"use client";

import { useEffect, useState } from "react";

type TemplateDoc = {
  key: string;
  name: string;
  category?: string;
  subject: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
  buttonText?: string;
  buttonHref?: string;
};

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonHref, setButtonHref] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates", { cache: "no-store" });
      const json = await res.json();
      setTemplates(Array.isArray(json?.templates) ? json.templates : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const fillForm = (t: TemplateDoc) => {
    setKey(t.key || "");
    setName(t.name || "");
    setCategory(t.category || "general");
    setSubject(t.subject || "");
    setTitle(t.title || "");
    setPreheader(t.preheader || "");
    setBodyHtml(t.bodyHtml || "");
    setButtonText(t.buttonText || "");
    setButtonHref(t.buttonHref || "");
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name,
          category,
          subject,
          title,
          preheader,
          bodyHtml,
          buttonText,
          buttonHref,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Failed to save template.");
        return;
      }

      setMsg("Template saved successfully.");
      await load();
    } catch {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-md">
        <h1 className="text-2xl font-extrabold text-gray-900">Email Templates</h1>
        <p className="mt-1 text-sm text-gray-600">
          Edit full automatic email templates used by the system.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Template key" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Preheader" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Button text" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <input value={buttonHref} onChange={(e) => setButtonHref(e.target.value)} placeholder="Button href or placeholder" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <div className="md:col-span-2">
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={12}
              placeholder="HTML body"
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
            {saving ? "Saving..." : "Save Template"}
          </button>
          {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-md">
        <h2 className="text-lg font-extrabold text-gray-900">Existing Templates</h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => fillForm(t)}
                className="text-left rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/40 transition"
              >
                <p className="font-extrabold text-gray-900">{t.name}</p>
                <p className="mt-1 text-xs text-gray-500">key: {t.key}</p>
                <p className="mt-1 text-xs text-gray-500">category: {t.category || "general"}</p>
                <p className="mt-2 text-sm text-gray-700 line-clamp-2">{t.subject}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}