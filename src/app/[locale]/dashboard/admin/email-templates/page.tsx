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
  badgeTone?: "" | "blue" | "green" | "red";
  showButton?: boolean;
  showLink?: boolean;
  linkText?: string;
  linkUrlType?: string;
  showDetailsCard?: boolean;
  detailsCardType?: "shipment" | "account" | "invoice" | "changes" | "none";
};

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderToneBadgeHtml(
  text: string,
  tone: "blue" | "green" | "red" = "blue"
) {
  const color =
    tone === "green"
      ? { bg: "#dcfce7", text: "#166534" }
      : tone === "red"
      ? { bg: "#fee2e2", text: "#b91c1c" }
      : { bg: "#dbeafe", text: "#1d4ed8" };

  return `
    <div style="margin:0 0 14px 0;">
      <span style="
        display:inline-block;
        background:${color.bg};
        color:${color.text};
        font-size:12px;
        font-weight:800;
        letter-spacing:.3px;
        padding:6px 12px;
        border-radius:999px;
        text-transform:uppercase;
      ">
        ${esc(text)}
      </span>
    </div>
  `;
}

function renderShipmentDetailsCardHtml(args: {
  shipmentId: string;
  trackingNumber?: string;
  invoiceNumber?: string;
}) {
  return `
<table
  role="presentation"
  align="center"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"
>
  <tr>
    <td style="padding:14px 20px;border-radius:16px;">
      <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        style="border-collapse:collapse;width:100%;table-layout:fixed;"
      >
        <tr>
          <td
            style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;"
          >
            Shipment Number:
          </td>
          <td
            align="right"
            style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;"
          >
            ${esc(args.shipmentId)}
          </td>
        </tr>

        <tr>
          <td
            style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;"
          >
            Tracking Number:
          </td>
          <td
            align="right"
            style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;"
          >
            ${esc(args.trackingNumber || "—")}
          </td>
        </tr>

        <tr>
          <td
            style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;"
          >
            Invoice Number:
          </td>
          <td
            align="right"
            style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;"
          >
            ${esc(args.invoiceNumber || "—")}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;
}

function renderSimpleInfoCardHtml(rows: Array<{ label: string; value: string }>) {
  const body = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">
            ${esc(row.label)}:
          </td>
          <td
            align="right"
            style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;"
          >
            ${esc(row.value)}
          </td>
        </tr>
      `
    )
    .join("");

  return `
<table
  role="presentation"
  align="center"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"
>
  <tr>
    <td style="padding:14px 20px;border-radius:16px;">
      <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        style="border-collapse:collapse;width:100%;table-layout:fixed;"
      >
        ${body}
      </table>
    </td>
  </tr>
</table>
`;
}

function buildPreviewEmailHtml(args: {
  subject: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
  button?: { text: string; href: string };
}) {
  const year = new Date().getFullYear();
  const appUrl = "https://www.goexoduslogistics.com";
  const logoUrl = `${appUrl}/logo.png`;
  const outerPad = 24;
  const innerPad = 20;

  const buttonHtml = args.button
    ? `<div style="padding:18px 0 6px 0;">
         <a href="${args.button.href}"
           style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
           padding:12px 18px;border-radius:10px;font-size:15px;font-weight:800;">
           ${esc(args.button.text)}
         </a>
       </div>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(args.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${esc(args.preheader || "You have a new message from Exodus Logistics.")}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;">
      <tr>
        <td style="background:#0b3aa4;height:6px;line-height:6px;font-size:0;">&nbsp;</td>
      </tr>

      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;">
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                  style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">

                  <tr>
                    <td style="padding:${outerPad}px ${outerPad}px 14px ${outerPad}px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="left" style="vertical-align:middle;">
                            <img
                              src="${logoUrl}"
                              alt="Exodus Logistics"
                              width="140"
                              height="38"
                              style="display:block;width:140px;height:38px;border:0;outline:none;text-decoration:none;"
                            />
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 ${outerPad}px;">
                      <div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:${innerPad}px ${outerPad}px;">
                      <h1 style="margin:0 0 12px 0;font-size:24px;line-height:30px;font-weight:800;color:#0f172a;">
                        ${esc(args.title)}
                      </h1>

                      ${args.bodyHtml}

                      ${buttonHtml}

                      <p style="margin:14px 0 0 0;font-size:16px;line-height:24px;color:#111827;">
                        Regards,<br />
                        <strong>Exodus Logistics Support</strong>
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 ${outerPad}px;">
                      <div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:14px ${outerPad}px ${outerPad}px ${outerPad}px;">
                      <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                        Support: <a href="mailto:support@goexoduslogistics.com" style="color:#2563eb;text-decoration:none;">support@goexoduslogistics.com</a>
                      </p>
                      <p style="margin:6px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                        ©️ ${year} Exodus Logistics. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 10px 0 10px;font-size:11px;line-height:16px;color:#9ca3af;text-align:center;">
                This message was sent to gabrielmoses888@gmail.com.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

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
  const [badgeTone, setBadgeTone] = useState<"" | "blue" | "green" | "red">("");
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

    setBadgeText("");
    setBadgeTone("");
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

  const previewDetailsCardHtml =
    !showDetailsCard || detailsCardType === "none"
      ? ""
      : detailsCardType === "account"
      ? renderSimpleInfoCardHtml([
          { label: "Account Email", value: "gabrielmoses888@gmai..." },
          { label: "Access Status", value: "Restored" },
        ])
      : detailsCardType === "invoice"
      ? renderSimpleInfoCardHtml([
          { label: "Shipment Number", value: "EXS-2026-001245" },
          { label: "Invoice Number", value: "EXS-INV-2026-03-1234567" },
          { label: "Status", value: "PAID" },
        ])
      : detailsCardType === "changes"
      ? `
        <div style="margin:16px 0 0 0;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#ffffff;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;background:#ffffff;">
            <thead>
              <tr style="background:#f9fafb;">
                <th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Field</th>
                <th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Previous</th>
                <th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Updated</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:700;">Destination</td>
                <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Old address</td>
                <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">New address</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
      : renderShipmentDetailsCardHtml({
          shipmentId: "EXS-2026-001245",
          trackingNumber: "TRK9283718273",
          invoiceNumber: "EXS-INV-2026-03-1234567",
        });

 const previewBadgeHtml = badgeText
  ? renderToneBadgeHtml(
      badgeText,
      ((badgeTone || "blue") as "blue" | "green" | "red")
    )
  : "";
  const previewInvoiceLinkHtml =
    showLink && linkText
      ? `<div style="margin-top:12px"><a href="#" style="color:#2563eb;text-decoration:underline;font-weight:700;">${esc(
          linkText
        )}</a></div>`
      : "";

  const previewBodyHtml = (bodyHtml || "<p>No content yet.</p>")
    .replace(/{{badge}}/g, previewBadgeHtml)
    .replace(/{{detailsCard}}/g, previewDetailsCardHtml)
    .replace(/{{invoiceLink}}/g, previewInvoiceLinkHtml)
    .replace(/{{changesTable}}/g, previewDetailsCardHtml)
    .replace(/{{name}}/g, "Gabriel Moses")
    .replace(/{{receiverName}}/g, "John Doe")
    .replace(/{{senderName}}/g, "Gabriel Moses")
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

  const previewEmailHtml = buildPreviewEmailHtml({
    subject: subject || "Template Preview",
    title: title || "Template Title",
    preheader,
    bodyHtml: previewBodyHtml,
    button: showButton && buttonText ? { text: buttonText, href: "#" } : undefined,
  });

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
  value={badgeTone || ""}
  onChange={(e) => setBadgeTone(e.target.value as "" | "blue" | "green" | "red")}
  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white"
>
  <option value="">Auto (Use system default)</option>
  <option value="blue">Blue</option>
  <option value="green">Green</option>
  <option value="red">Red</option>
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
              <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-lg font-extrabold text-gray-900">Preview</h3>
                <p className="mt-1 text-sm text-gray-600">
                  This preview now renders like the actual sent email wrapper.
                </p>

                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <iframe
                    title="email-preview"
                    srcDoc={previewEmailHtml}
                    className="w-full"
                    style={{ height: "1100px", border: "0" }}
                  />
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
                <p className="mt-1 text-xs text-gray-500">
                  badge: {t.badgeText || "—"} / {t.badgeTone || "blue"}
                </p>
                <p className="mt-3 text-sm text-gray-700 line-clamp-2">{t.subject}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}