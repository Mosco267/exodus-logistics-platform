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
  badgeText?: string;
  badgeTone?: "blue" | "green" | "red";
  showButton?: boolean;
  showLink?: boolean;
  linkText?: string;
  linkUrlType?: string;
  showDetailsCard?: boolean;
  detailsCardType?: "shipment" | "account" | "invoice" | "changes" | "none";
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

  const [badgeText, setBadgeText] = useState("");
  const [badgeTone, setBadgeTone] = useState<"blue" | "green" | "red">("blue");
  const [showButton, setShowButton] = useState(true);
  const [showLink, setShowLink] = useState(true);
  const [linkText, setLinkText] = useState("View Invoice");
  const [linkUrlType, setLinkUrlType] = useState("invoice");
  const [showDetailsCard, setShowDetailsCard] = useState(true);
  const [detailsCardType, setDetailsCardType] = useState<
    "shipment" | "account" | "invoice" | "changes" | "none"
  >("shipment");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);

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

    setBadgeText(t.badgeText || "");
    setBadgeTone((t.badgeTone as "blue" | "green" | "red") || "blue");
    setShowButton(typeof t.showButton === "boolean" ? t.showButton : true);
    setShowLink(typeof t.showLink === "boolean" ? t.showLink : true);
    setLinkText(t.linkText || "View Invoice");
    setLinkUrlType(t.linkUrlType || "invoice");
    setShowDetailsCard(typeof t.showDetailsCard === "boolean" ? t.showDetailsCard : true);
    setDetailsCardType(
      (t.detailsCardType as "shipment" | "account" | "invoice" | "changes" | "none") ||
        "shipment"
    );

    setMsg("");
    setShowPreview(false);
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

    setBadgeText("");
    setBadgeTone("blue");
    setShowButton(true);
    setShowLink(true);
    setLinkText("View Invoice");
    setLinkUrlType("invoice");
    setShowDetailsCard(true);
    setDetailsCardType("shipment");

    setMsg("");
    setShowPreview(false);
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
          badgeText,
          badgeTone,
          showButton,
          showLink,
          linkText,
          linkUrlType,
          showDetailsCard,
          detailsCardType,
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

  const previewBadgeClass =
    badgeTone === "green"
      ? "bg-green-100 text-green-700"
      : badgeTone === "red"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";

  const previewDetailsCard = () => {
    if (!showDetailsCard || detailsCardType === "none") return null;

    const rows =
      detailsCardType === "account"
        ? [
            { label: "Account Email", value: "gabrielmoses888@gmai..." },
            { label: "Access Status", value: "Restored" },
          ]
        : detailsCardType === "invoice"
        ? [
            { label: "Shipment Number", value: "EXS-2026-001245" },
            { label: "Invoice Number", value: "EXS-INV-2026-03-1234567" },
            { label: "Status", value: "PAID" },
          ]
        : detailsCardType === "changes"
        ? [
            { label: "Field", value: "Destination Address" },
            { label: "Previous", value: "Old value" },
            { label: "Updated", value: "New value" },
          ]
        : [
            { label: "Shipment Number", value: "EXS-2026-001245" },
            { label: "Tracking Number", value: "TRK9283718273" },
            { label: "Invoice Number", value: "EXS-INV-2026-03-1234567" },
          ];

    return (
      <div className="mt-5 rounded-2xl border border-gray-200 bg-slate-50 p-4">
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-gray-500">{row.label}:</span>
              <span className="text-xs font-extrabold text-blue-700 truncate">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const previewHtml = bodyHtml
    .replace(/{{badge}}/g, "")
    .replace(/{{detailsCard}}/g, "")
    .replace(/{{invoiceLink}}/g, showLink ? `<p><a href="#">${linkText || "View Invoice"}</a></p>` : "")
    .replace(/{{changesTable}}/g, "<p><strong>Changes table will appear here.</strong></p>")
    .replace(/{{name}}/g, "Gabriel")
    .replace(/{{receiverName}}/g, "John Doe")
    .replace(/{{senderName}}/g, "Gabriel")
    .replace(/{{shipmentId}}/g, "EXS-2026-001245")
    .replace(/{{trackingNumber}}/g, "TRK9283718273")
    .replace(/{{invoiceNumber}}/g, "EXS-INV-2026-03-1234567")
    .replace(/{{invoiceStatus}}/g, "PAID")
    .replace(/{{estimatedDeliveryDate}}/g, "Mar 16 - Mar 19, 2026")
    .replace(/{{paymentMessage}}/g, "Payment has been confirmed successfully.")
    .replace(/{{invoiceMessage}}/g, "Payment has been confirmed in our system and processing can continue.")
    .replace(/{{intro}}/g, "Some shipment details have been updated in our system.")
    .replace(/{{email}}/g, "gabrielmoses888@gmail.com")
    .replace(/{{shortEmail}}/g, "gabrielmoses888@gmai...")
    .replace(/{{supportUrl}}/g, "#")
    .replace(/{{trackUrl}}/g, "#")
    .replace(/{{invoiceUrl}}/g, "#");

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Badge Text</label>
                <input
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Badge Color</label>
                <select
                  value={badgeTone}
                  onChange={(e) => setBadgeTone(e.target.value as "blue" | "green" | "red")}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                >
                  <option value="blue">blue</option>
                  <option value="green">green</option>
                  <option value="red">red</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showButton}
                  onChange={(e) => setShowButton(e.target.checked)}
                />
                Show Button
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showLink}
                  onChange={(e) => setShowLink(e.target.checked)}
                />
                Show Link
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Button Text</label>
                <input
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Link Text</label>
                <input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Link URL Type</label>
                <select
                  value={linkUrlType}
                  onChange={(e) => setLinkUrlType(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                >
                  <option value="track">track</option>
                  <option value="invoice">invoice</option>
                  <option value="support">support</option>
                  <option value="none">none</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Details Card Type</label>
                <select
                  value={detailsCardType}
                  onChange={(e) =>
                    setDetailsCardType(
                      e.target.value as "shipment" | "account" | "invoice" | "changes" | "none"
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
                >
                  <option value="shipment">shipment</option>
                  <option value="account">account</option>
                  <option value="invoice">invoice</option>
                  <option value="changes">changes</option>
                  <option value="none">none</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showDetailsCard}
                onChange={(e) => setShowDetailsCard(e.target.checked)}
              />
              Show Details Card
            </label>

            <div>
              <label className="text-xs font-semibold text-gray-600">Body HTML</label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={18}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono"
              />
              <p className="mt-2 text-xs text-gray-500">
                You can use placeholders like: {"{{badge}}"}, {"{{detailsCard}}"}, {"{{invoiceLink}}"}, {"{{shipmentId}}"}, {"{{trackingNumber}}"}, {"{{invoiceNumber}}"}, {"{{name}}"}, {"{{email}}"}, {"{{receiverName}}"}, {"{{senderName}}"}, {"{{changesTable}}"}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={save}
                disabled={!canSave || saving}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Template"}
              </button>

              <button
                onClick={() => setShowPreview((v) => !v)}
                className="px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50"
              >
                {showPreview ? "Hide Preview" : "Preview"}
              </button>

              {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
            </div>

            {showPreview && (
              <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-6">
                <h3 className="text-lg font-extrabold text-gray-900">Preview</h3>
                <p className="mt-1 text-sm text-gray-600">
                  This is a live preview of your current template before saving.
                </p>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  {badgeText && (
                    <div className="mb-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${previewBadgeClass}`}
                      >
                        {badgeText}
                      </span>
                    </div>
                  )}

                  <h4 className="text-2xl font-extrabold text-gray-900">{title || "Template Title"}</h4>

                  {preheader && <p className="mt-2 text-sm text-gray-500">{preheader}</p>}

                  {previewDetailsCard()}

                  <div className="mt-5 prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml || "<p>No content yet.</p>" }} />
                  </div>

                  {showButton && buttonText && (
                    <div className="mt-6">
                      <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
                        {buttonText}
                      </button>
                    </div>
                  )}

                  {showLink && linkText && (
                    <div className="mt-4">
                      <span className="text-sm font-semibold text-blue-700 underline">
                        {linkText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                <p className="mt-1 text-xs text-gray-500">badge: {t.badgeText || "—"} / {t.badgeTone || "blue"}</p>
                <p className="mt-3 text-sm text-gray-700 line-clamp-2">{t.subject}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}