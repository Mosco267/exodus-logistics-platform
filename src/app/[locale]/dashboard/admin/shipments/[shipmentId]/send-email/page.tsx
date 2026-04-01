"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle, Eye } from "lucide-react";

// Mirrors renderEmailTemplate from src/lib/emailTemplate.ts
function buildPreviewHtml(args: {
  subject: string;
  title: string;
  bodyHtml: string;
  buttonText?: string;
  buttonHref?: string;
  appUrl: string;
  supportEmail: string;
  sentTo: string;
}) {
  const { title, bodyHtml, buttonText, buttonHref, appUrl, supportEmail, sentTo } = args;

  const buttonHtml =
    buttonText && buttonHref
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0 0;">
          <tr>
            <td style="border-radius:10px;background:#2563eb;">
              <a href="${buttonHref}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:.2px;">
                ${buttonText}
              </a>
            </td>
          </tr>
        </table>
      `
      : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0"
              style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;background:#ffffff;box-shadow:0 4px 24px rgba(0,0,0,.08);">

              <!-- HEADER GRADIENT -->
              <tr>
                <td style="background:linear-gradient(to right,#ffffff 0%,#1d4ed8 40%,#0891b2 100%);padding:28px 32px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:20px;font-weight:900;color:#1e3a8a;letter-spacing:-.3px;">EXODUS</p>
                        <p style="margin:2px 0 0 0;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">LOGISTICS</p>
                      </td>
                      <td align="right">
                        <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;opacity:.8;text-transform:uppercase;letter-spacing:.5px;">
                          ${title}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding:36px 36px 28px 36px;">
                  ${bodyHtml}
                  ${buttonHtml}
                </td>
              </tr>

              <!-- DIVIDER -->
              <tr>
                <td style="padding:0 36px;">
                  <div style="height:1px;background:#e5e7eb;"></div>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="padding:24px 36px 28px 36px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#1d4ed8;">Exodus Logistics</p>
                  <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;">
                    <a href="mailto:${supportEmail}" style="color:#6b7280;text-decoration:none;">${supportEmail}</a>
                  </p>
                  <p style="margin:0;font-size:11px;color:#d1d5db;">
                    This email was sent to ${sentTo}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export default function AdminShipmentSendEmailPage() {
  const params = useParams();
  const router = useRouter();

  const locale = String(params?.locale || "en");
  const shipmentId = String(params?.shipmentId || "").trim();

  const [recipientType, setRecipientType] = useState<"receiver" | "sender">("receiver");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const [loadingRecipient, setLoadingRecipient] = useState(true);
  const [senderEmail, setSenderEmail] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  useEffect(() => {
    const loadShipment = async () => {
      setLoadingRecipient(true);
      try {
        const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Failed to load shipment.");
        const sh = json?.shipment || {};
        setSenderEmail(String(sh?.senderEmail || sh?.createdByEmail || "").trim());
        setReceiverEmail(String(sh?.receiverEmail || "").trim());
        setSenderName(String(sh?.senderName || "").trim());
        setReceiverName(String(sh?.receiverName || "").trim());
        setTrackingNumber(String(sh?.trackingNumber || "").trim());
        setInvoiceNumber(String(sh?.invoice?.invoiceNumber || "").trim());
      } catch (e: any) {
        setErr(e?.message || "Failed to load shipment.");
      } finally {
        setLoadingRecipient(false);
      }
    };
    if (shipmentId) void loadShipment();
  }, [shipmentId]);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://www.goexoduslogistics.com";

  const resolvedTo = email.trim() || (recipientType === "sender" ? senderEmail : receiverEmail);
  const resolvedName = recipientType === "sender" ? (senderName || "Sender") : (receiverName || "Receiver");

  // Live preview HTML
  const previewHtml = useMemo(() => {
    const trackUrl = trackingNumber
      ? `${appUrl}/${locale}/track/${encodeURIComponent(trackingNumber)}`
      : `${appUrl}/${locale}/track`;
    const invoiceUrl = trackingNumber
      ? `${appUrl}/${locale}/invoice/full?q=${encodeURIComponent(trackingNumber)}`
      : `${appUrl}/${locale}/invoice`;

    const bodyHtml = `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
        Hello ${resolvedName || "Customer"},
      </p>

      <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;white-space:pre-wrap;">${
        message
          ? message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          : '<span style="color:#9ca3af;font-style:italic;">Your message will appear here…</span>'
      }</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
        style="margin:20px 0 0 0;border-collapse:separate;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;">
        <tr>
          <td style="padding:14px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#6b7280;font-weight:600;width:45%;">Shipment ID:</td>
                <td align="right" style="padding:6px 0;font-size:12px;color:#1d4ed8;font-weight:800;">${shipmentId || "—"}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#6b7280;font-weight:600;">Tracking Number:</td>
                <td align="right" style="padding:6px 0;font-size:12px;color:#1d4ed8;font-weight:800;">${trackingNumber || "—"}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:12px;color:#6b7280;font-weight:600;">Invoice Number:</td>
                <td align="right" style="padding:6px 0;font-size:12px;color:#1d4ed8;font-weight:800;">${invoiceNumber || "—"}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
        <a href="${trackUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">
          Track Shipment
        </a>
        <a href="${invoiceUrl}" style="display:inline-block;padding:10px 18px;background:#111827;color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">
          View Invoice
        </a>
      </div>
    `;

    return buildPreviewHtml({
      subject: subject || "Email subject",
      title: subject || "Email subject",
      bodyHtml,
      appUrl,
      supportEmail: "support@goexoduslogistics.com",
      sentTo: resolvedTo || "recipient@email.com",
    });
  }, [message, subject, resolvedName, resolvedTo, shipmentId, trackingNumber, invoiceNumber, appUrl, locale]);

  const submit = async () => {
    setOk(""); setErr("");
    if (!subject.trim()) { setErr("Subject is required."); return; }
    if (!message.trim()) { setErr("Message is required."); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientType, email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send email.");
      setOk("Email sent successfully.");
      setMessage(""); setSubject(""); setEmail("");
    } catch (e: any) {
      setErr(e?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <button type="button" onClick={() => router.push(`/${locale}/dashboard/admin/shipments`)}
          className="cursor-pointer inline-flex items-center text-sm font-semibold text-gray-700 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to shipments
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Mail className="w-5 h-5 text-blue-700" />
          <h1 className="text-2xl font-extrabold text-gray-900">Send Email · {shipmentId}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── FORM ── */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Select the recipient below. The real email address saved on the shipment will be used automatically unless you enter a custom email.
            </p>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Send to</label>
              <select value={recipientType} onChange={(e) => setRecipientType(e.target.value as "receiver" | "sender")}
                className="cursor-pointer w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:border-blue-400">
                <option value="receiver">Receiver email {receiverEmail ? `(${receiverEmail})` : "(not available)"}</option>
                <option value="sender">Sender email {senderEmail ? `(${senderEmail})` : "(not available)"}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Custom email <span className="text-xs font-normal text-gray-400">(optional)</span></label>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Leave empty to use sender/receiver email"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
            </div>

            <p className="text-xs text-gray-500">
              {loadingRecipient ? "Loading saved recipient emails…"
                : recipientType === "sender"
                ? `Saved sender email: ${senderEmail || "Not available"}`
                : `Saved receiver email: ${receiverEmail || "Not available"}`}
            </p>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject…"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8}
                placeholder="Type your email message here…"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />
            </div>

            <button type="button" onClick={submit} disabled={sending}
              className="cursor-pointer w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center hover:bg-blue-700 disabled:opacity-60">
              {sending
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Sending…</>
                : <><Mail className="w-5 h-5 mr-2" />Send Email</>}
            </button>

            {err && (
              <div className="flex items-center text-red-600 font-semibold text-sm">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0" />{err}
              </div>
            )}
            {ok && (
              <div className="flex items-center text-green-700 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />{ok}
              </div>
            )}
          </div>

          {/* ── LIVE PREVIEW ── */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-extrabold text-gray-900">Live Preview</h2>
              <span className="ml-auto text-xs text-gray-400">Updates as you type</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                style={{ minHeight: "600px" }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}