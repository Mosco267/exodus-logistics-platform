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
  supportEmail: string;
  sentTo: string;
}) {
  const { title, bodyHtml, buttonText, buttonHref, supportEmail, sentTo } = args;
  const year = new Date().getFullYear();
  const logoUrl = "https://www.goexoduslogistics.com/logo.png";
  const outerPad = 24;
  const innerPad = 20;

  const buttonHtml = buttonText && buttonHref
    ? `<div style="padding:18px 0 6px 0;">
         <a href="${buttonHref}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:15px;font-weight:800;">
           ${buttonText}
         </a>
       </div>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;">
      <tr>
        <td style="background:#0b3aa4;height:6px;line-height:6px;font-size:0;">&nbsp;</td>
      </tr>
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                  style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">

                  <tr>
                    <td style="padding:${outerPad}px ${outerPad}px 14px ${outerPad}px;">
                      <img src="${logoUrl}" alt="Exodus Logistics" width="220" height="50"
                        style="display:block;width:220px;height:50px;border:0;outline:none;text-decoration:none;"/>
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
                        ${title || '<span style="color:#9ca3af;font-style:italic;">Subject will appear here…</span>'}
                      </h1>

                      ${bodyHtml}

                      ${buttonHtml}

                      <p style="margin:14px 0 0 0;font-size:16px;line-height:24px;color:#111827;">
                        Regards,<br/>
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
                        Support: <a href="mailto:${supportEmail}" style="color:#2563eb;text-decoration:none;">${supportEmail}</a>
                      </p>
                      <p style="margin:6px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                        © ${year} Exodus Logistics. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 10px 0 10px;font-size:11px;line-height:16px;color:#9ca3af;text-align:center;">
                This message was sent to ${sentTo || "recipient@email.com"}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
  buttonText: "Track Shipment",
  buttonHref: trackingNumber ? `${appUrl}/${locale}/track/${encodeURIComponent(trackingNumber)}` : "",
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