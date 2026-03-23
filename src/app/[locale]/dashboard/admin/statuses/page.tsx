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

function esc(s: string) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderToneBadgeHtml(text: string, tone: "blue" | "green" | "red" = "blue") {
  const color = tone === "green" ? { bg: "#dcfce7", text: "#166534" } : tone === "red" ? { bg: "#fee2e2", text: "#b91c1c" } : { bg: "#dbeafe", text: "#1d4ed8" };
  return `<div style="margin:0 0 14px 0;"><span style="display:inline-block;background:${color.bg};color:${color.text};font-size:12px;font-weight:800;letter-spacing:.3px;padding:6px 12px;border-radius:999px;text-transform:uppercase;">${esc(text)}</span></div>`;
}

function renderShipmentDetailsCardHtml(args: { shipmentId: string; trackingNumber?: string; invoiceNumber?: string }) {
  return `<table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"><tr><td style="padding:14px 20px;border-radius:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;table-layout:fixed;"><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Shipment Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(args.shipmentId)}</td></tr><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Tracking Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(args.trackingNumber || "—")}</td></tr><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Invoice Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(args.invoiceNumber || "—")}</td></tr></table></td></tr></table>`;
}

function renderSimpleInfoCardHtml(rows: Array<{ label: string; value: string }>) {
  const body = rows.map((row) => `<tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">${esc(row.label)}:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(row.value)}</td></tr>`).join("");
  return `<table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"><tr><td style="padding:14px 20px;border-radius:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;table-layout:fixed;">${body}</table></td></tr></table>`;
}

function buildPreviewEmailHtml(args: { subject: string; title: string; preheader?: string; bodyHtml: string; button?: { text: string; href: string } }) {
  const year = new Date().getFullYear();
  const appUrl = "https://www.goexoduslogistics.com";
  const logoUrl = `${appUrl}/logo.png`;
  const outerPad = 24;
  const innerPad = 20;
  const buttonHtml = args.button ? `<div style="padding:18px 0 6px 0;"><a href="${args.button.href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:15px;font-weight:800;">${esc(args.button.text)}</a></div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(args.subject)}</title></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(args.preheader || "You have a new message from Exodus Logistics.")}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;"><tr><td style="background:#0b3aa4;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr><tr><td align="center" style="padding:28px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;"><tr><td style="padding:0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;"><tr><td style="padding:${outerPad}px ${outerPad}px 14px ${outerPad}px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="left" style="vertical-align:middle;"><img src="${logoUrl}" alt="Exodus Logistics" width="140" height="38" style="display:block;width:140px;height:38px;border:0;outline:none;text-decoration:none;" /></td></tr></table></td></tr><tr><td style="padding:0 ${outerPad}px;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div></td></tr><tr><td style="padding:${innerPad}px ${outerPad}px;"><h1 style="margin:0 0 12px 0;font-size:24px;line-height:30px;font-weight:800;color:#0f172a;">${esc(args.title)}</h1>${args.bodyHtml}${buttonHtml}<p style="margin:14px 0 0 0;font-size:16px;line-height:24px;color:#111827;">Regards,<br /><strong>Exodus Logistics Support</strong></p></td></tr><tr><td style="padding:0 ${outerPad}px;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div></td></tr><tr><td style="padding:14px ${outerPad}px ${outerPad}px ${outerPad}px;"><p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">Support: <a href="mailto:support@goexoduslogistics.com" style="color:#2563eb;text-decoration:none;">support@goexoduslogistics.com</a></p><p style="margin:6px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">©️ ${year} Exodus Logistics. All rights reserved.</p></td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

export default function AdminStatusesPage() {
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingKey, setEditingKey] = useState("");
  const [placeholderContent, setPlaceholderContent] = useState<Record<string, string>>({});

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
  const [showPreview, setShowPreview] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StatusDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/statuses", { cache: "no-store" });
      const data = await res.json();
      setStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
    } catch { setStatuses([]); }
    finally { setLoading(false); }
  };

  const fetchPlaceholderContent = async () => {
    try {
      const res = await fetch("/api/placeholder-content", { cache: "no-store" });
      const data = await res.json();
      setPlaceholderContent(data?.content || {});
    } catch { setPlaceholderContent({}); }
  };

  useEffect(() => { fetchStatuses(); fetchPlaceholderContent(); }, []);

  // Auto-fill subject/title/preheader when label changes in create mode
  useEffect(() => {
    if (mode !== "create" || !label.trim()) return;
    setEmailSubject(`Shipment update: {{shipmentId}}`);
    setEmailTitle(label.trim());
    setEmailPreheader(`Your shipment has been updated to ${label.trim()}.`);
  }, [label, mode]);

  const resetForm = () => {
    setMode("create"); setEditingKey(""); setLabel(""); setKeyInput("");
    setColor("blue"); setIcon("package"); setDefaultUpdate(""); setNextStep("");
    setEmailSubject(""); setEmailTitle(""); setEmailPreheader("");
    setEmailBodyHtml(DEFAULT_BODY); setEmailButtonText("Track Shipment");
    setEmailButtonUrlType("track"); setMsg(""); setShowPreview(false);
  };

  const startEdit = (s: StatusDoc) => {
    setMode("edit"); setEditingKey(s.key); setLabel(s.label || "");
    setKeyInput(s.key || ""); setColor((s.color || "blue").toLowerCase());
    setIcon((s.icon || "package").toLowerCase()); setDefaultUpdate(s.defaultUpdate || "");
    setNextStep(s.nextStep || ""); setEmailSubject(s.emailSubject || "");
    setEmailTitle(s.emailTitle || ""); setEmailPreheader(s.emailPreheader || "");
    setEmailBodyHtml(s.emailBodyHtml || DEFAULT_BODY);
    setEmailButtonText(s.emailButtonText || "Track Shipment");
    setEmailButtonUrlType(s.emailButtonUrlType || "track");
    setMsg(""); setShowPreview(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const canSubmit = useMemo(() => {
    if (!label.trim()) return false;
    if (mode === "create") return true;
    return Boolean(editingKey);
  }, [label, mode, editingKey]);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true); setMsg("");
    try {
      const keyToUse = mode === "edit" ? editingKey : normalizeKey(keyInput || label);
      const res = await fetch("/api/statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: keyToUse, label: label.trim(), color, icon,
          defaultUpdate: defaultUpdate.trim(), nextStep: nextStep.trim(),
          emailSubject: emailSubject.trim(), emailTitle: emailTitle.trim(),
          emailPreheader: emailPreheader.trim(), emailBodyHtml: emailBodyHtml.trim(),
          emailButtonText: emailButtonText.trim(), emailButtonUrlType: emailButtonUrlType.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data?.error || "Failed to save."); return; }
      setMsg(mode === "edit" ? "Timeline stage updated and email template synced." : "Timeline stage created and email template synced.");
      await fetchStatuses();
      if (mode === "create") resetForm();
    } catch { setMsg("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/statuses?key=${encodeURIComponent(deleteTarget.key)}`, { method: "DELETE" });
      await fetch("/api/email-templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `timeline:${deleteTarget.key}` }),
      });
      if (mode === "edit" && editingKey === deleteTarget.key) resetForm();
      setMsg("Timeline stage deleted.");
      await fetchStatuses();
    } catch { setMsg("Network error. Please try again."); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  // Preview logic — always a timeline key
  const previewKey = mode === "edit" ? `timeline:${editingKey}` : `timeline:${normalizeKey(keyInput || label)}`;

  const getTimelinePreviewMeta = (key: string) => {
    const n = key.replace(/^timeline:/, "").toLowerCase();
    if (n === "delivered") return { badgeText: "DELIVERED", badgeTone: "green" as const, buttonText: "View Shipment" };
    if (n === "cancelled" || n === "canceled") return { badgeText: "CANCELLED", badgeTone: "red" as const, buttonText: "Contact Support" };
    if (n === "unclaimed") return { badgeText: "UNCLAIMED", badgeTone: "red" as const, buttonText: "Contact Support" };
    if (n === "invalidaddress") return { badgeText: "INVALID ADDRESS", badgeTone: "red" as const, buttonText: "Contact Support" };
    if (n === "paymentissue") return { badgeText: "PAYMENT ISSUE", badgeTone: "red" as const, buttonText: "Track Shipment" };
    if (n === "outfordelivery") return { badgeText: "OUT FOR DELIVERY", badgeTone: "blue" as const, buttonText: "Track Delivery" };
    if (n === "pickup" || n === "pickedup") return { badgeText: "PICKED UP", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    if (n === "warehouse") return { badgeText: "WAREHOUSE", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    if (n === "intransit") return { badgeText: "IN TRANSIT", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    if (n === "customclearance") return { badgeText: "CUSTOM CLEARANCE", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    if (n === "created") return { badgeText: "CREATED", badgeTone: "blue" as const, buttonText: "View Shipment" };
    // Custom stage — use the label
    const badgeText = label.trim().toUpperCase() || "SHIPMENT UPDATE";
    const tone: "blue" | "green" | "red" = color === "green" ? "green" : color === "red" ? "red" : "blue";
    return { badgeText, badgeTone: tone, buttonText: emailButtonText || "Track Shipment" };
  };

  const getTimelinePreviewContent = (key: string, pc: Record<string, string> = {}) => {
    const n = key.replace(/^timeline:/, "").toLowerCase();
    if (n === "pickup") return { intro: pc.timeline_pickup_intro || "We are pleased to inform you that your shipment <strong>[Shipment ID]</strong> has been successfully picked up.", detail: pc.timeline_pickup_detail || "The shipment is now being processed for movement from <strong>[Origin]</strong> toward <strong>[Destination]</strong>.", extra: pc.timeline_pickup_extra || "Our team will continue processing the shipment and you will receive another update once it reaches the next checkpoint.", destinationLabel: "Destination" };
    if (n === "warehouse") return { intro: pc.timeline_warehouse_intro || "Your shipment <strong>[Shipment ID]</strong> has been received at our warehouse facility.", detail: pc.timeline_warehouse_detail || "It is currently undergoing internal handling and preparation before moving to the next shipping stage toward <strong>[Destination]</strong>.", extra: pc.timeline_warehouse_extra || "You will be notified again as soon as the shipment leaves the warehouse and proceeds to transit.", destinationLabel: "Destination" };
    if (n === "intransit") return { intro: pc.timeline_intransit_intro || "Your shipment <strong>[Shipment ID]</strong> is now <strong>in transit</strong>.", detail: pc.timeline_intransit_detail || "It is currently moving through our logistics network from <strong>[Origin]</strong> toward <strong>[Destination]</strong>.", extra: pc.timeline_intransit_extra || "Our system will continue to provide updates as the shipment progresses through the next checkpoints.", destinationLabel: "Destination" };
    if (n === "outfordelivery") return { intro: pc.timeline_outfordelivery_intro || "Your shipment <strong>[Shipment ID]</strong> is now <strong>out for delivery</strong>.", detail: pc.timeline_outfordelivery_detail || "Our delivery process is in progress and the shipment is on its final route to the delivery address below.", extra: pc.timeline_outfordelivery_extra || "Please make sure you are available and prepared to receive the shipment.", destinationLabel: "Delivery Address" };
    if (n === "delivered") return { intro: pc.timeline_delivered_intro || "This is to confirm that your shipment <strong>[Shipment ID]</strong> has been successfully <strong>delivered</strong>.", detail: pc.timeline_delivered_detail || "Delivery has been completed at <strong>[Full Destination]</strong>.", extra: pc.timeline_delivered_extra || "If you have any concern regarding the delivery, please contact our support team.", destinationLabel: "Delivery Address" };
    if (n === "customclearance") return { intro: pc.timeline_customclearance_intro || "Your shipment <strong>[Shipment ID]</strong> is currently undergoing <strong>customs clearance</strong>.", detail: pc.timeline_customclearance_detail || "This is a routine compliance stage before the shipment proceeds toward <strong>[Destination]</strong>.", extra: pc.timeline_customclearance_extra || "If any additional verification is required, our team will contact you promptly.", destinationLabel: "Destination" };
    if (n === "unclaimed") return { intro: pc.timeline_unclaimed_intro || "Your shipment <strong>[Shipment ID]</strong> is currently marked as <strong>unclaimed</strong>.", detail: pc.timeline_unclaimed_detail || "The shipment is being held pending the next required action.", extra: pc.timeline_unclaimed_extra || "Please contact our support team as soon as possible for assistance.", destinationLabel: "Destination" };
    if (n === "invalidaddress") return { intro: pc.timeline_invalidaddress_intro || "Your shipment <strong>[Shipment ID]</strong> is currently on hold due to an <strong>address issue</strong>.", detail: pc.timeline_invalidaddress_detail || "We were unable to proceed normally because the destination address requires confirmation or correction.", extra: pc.timeline_invalidaddress_extra || "Please contact support to verify the correct delivery details.", destinationLabel: "Destination" };
    if (n === "paymentissue") return { intro: pc.timeline_paymentissue_intro || "Your shipment <strong>[Shipment ID]</strong> has been updated to <strong>Payment Issue</strong>.", detail: pc.timeline_paymentissue_detail || "There is currently an issue affecting payment confirmation or processing for this shipment.", extra: pc.timeline_paymentissue_extra || "Please review the invoice and complete any required payment.", destinationLabel: "Destination" };
    if (n === "cancelled") return { intro: pc.timeline_cancelled_intro || "Your shipment <strong>[Shipment ID]</strong> has been marked as <strong>cancelled</strong>.", detail: pc.timeline_cancelled_detail || "This shipment is no longer progressing through our logistics network.", extra: pc.timeline_cancelled_extra || "If you believe this update was made in error, please contact our support team.", destinationLabel: "Destination" };
    // Custom stage fallback
    return {
      intro: placeholderContent.default_intro || "There has been an update to your shipment.",
      detail: placeholderContent.default_detail || "Please review the latest shipment information using the links below.",
      extra: placeholderContent.default_extra || "You will continue to receive updates as your shipment progresses.",
      destinationLabel: "Destination",
    };
  };

  const previewMeta = getTimelinePreviewMeta(previewKey);
  const previewBadgeHtml = renderToneBadgeHtml(previewMeta.badgeText, previewMeta.badgeTone);
  const timelineContent = getTimelinePreviewContent(previewKey, placeholderContent);

  const previewDetailsCardHtml = renderShipmentDetailsCardHtml({
    shipmentId: "[Shipment ID]",
    trackingNumber: "[Tracking Number]",
    invoiceNumber: "[Invoice Number]",
  });

  const previewInvoiceLinkHtml = `<div style="margin-top:12px"><a href="#" style="color:#2563eb;text-decoration:underline;font-weight:700;">View Invoice</a></div>`;

  const previewBodyHtml = (emailBodyHtml || "<p>No content yet.</p>")
    .replace(/{{closingText}}/g, `<p style='margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;'>${placeholderContent.closingText_tracking || "You can use the button below to open the shipment page for the latest tracking updates."}</p>`)
    .replace(/{{badge}}/g, previewBadgeHtml)
    .replace(/{{detailsCard}}/g, previewDetailsCardHtml)
    .replace(/{{invoiceLink}}/g, previewInvoiceLinkHtml)
    .replace(/{{name}}/g, "<span style='color:#0f172a;font-weight:700;'>[Customer Name]</span>")
    .replace(/{{shipmentId}}/g, "<span style='color:#0f172a;font-weight:700;'>[Shipment ID]</span>")
    .replace(/{{trackingNumber}}/g, "<span style='color:#0f172a;font-weight:700;'>[Tracking Number]</span>")
    .replace(/{{invoiceNumber}}/g, "<span style='color:#0f172a;font-weight:700;'>[Invoice Number]</span>")
    .replace(/{{estimatedDeliveryDate}}/g, "<span style='color:#0f172a;font-weight:700;'>[Estimated Delivery Date]</span>")
    .replace(/{{intro}}/g, `<span style='color:#111827;'>${timelineContent.intro}</span>`)
    .replace(/{{detail}}/g, `<span style='color:#111827;'>${timelineContent.detail}</span>`)
    .replace(/{{extra}}/g, `<span style='color:#111827;'>${timelineContent.extra}</span>`)
    .replace(/{{destination}}/g, "<span style='color:#0f172a;font-weight:700;'>[Destination]</span>")
    .replace(/{{fullDestination}}/g, "<span style='color:#0f172a;font-weight:700;'>[Full Destination]</span>")
    .replace(/{{origin}}/g, "<span style='color:#0f172a;font-weight:700;'>[Origin]</span>")
    .replace(/{{status}}/g, "<span style='color:#0f172a;font-weight:700;'>[Shipment Status]</span>")
    .replace(/{{destinationBlock}}/g, `<div style="margin:18px 0 0 0;"><p style="margin:0 0 6px 0;font-size:14px;line-height:20px;color:#6b7280;">${timelineContent.destinationLabel}</p><p style="margin:0;font-size:15px;line-height:24px;font-weight:700;color:#111827;">${previewKey.includes("outfordelivery") || previewKey.includes("delivered") ? "[Full Destination]" : "[Destination]"}</p></div>`)
    .replace(/{{noteBlock}}/g, `<div style="margin:20px 0 0 0;padding:14px 16px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:10px;"><p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;"><strong>Additional note:</strong> [Additional Note]</p></div>`)
    .replace(/{{note}}/g, `<div style="margin:20px 0 0 0;padding:14px 16px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:10px;"><p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;"><strong>Additional note:</strong> [Additional Note]</p></div>`)
    .replace(/{{changesTable}}/g, "")
    .replace(/{{otherPartyLine}}/g, "")
    .replace(/{{supportUrl}}/g, "#").replace(/{{trackUrl}}/g, "#").replace(/{{invoiceUrl}}/g, "#")
    .replace(/{{email}}/g, "<span style='color:#0f172a;font-weight:700;'>[Email Address]</span>")
    .replace(/{{shortEmail}}/g, "<span style='color:#0f172a;font-weight:700;'>[Short Email]</span>")
    .replace(/{{receiverName}}/g, "<span style='color:#0f172a;font-weight:700;'>[Receiver Name]</span>")
    .replace(/{{senderName}}/g, "<span style='color:#0f172a;font-weight:700;'>[Sender Name]</span>");

  const previewEmailHtml = buildPreviewEmailHtml({
    subject: emailSubject || emailTitle || "Template Preview",
    title: emailTitle || label || "Template Title",
    preheader: emailPreheader,
    bodyHtml: previewBodyHtml,
    button: emailButtonText ? { text: emailButtonText, href: "#" } : undefined,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Form */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Shipment Timeline Manager</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create timeline stages and define the automatic email sent when the stage is used. Changes sync to Email Templates automatically.
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
            Fill in the details below to create a new timeline stage. Subject, title and preheader will auto-fill as you type the label.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4">

          {/* Label + Key */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Stage Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. In Transit" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Stage Key {mode === "edit" ? "(locked)" : "(auto-generated, optional)"}</label>
              <input value={mode === "edit" ? editingKey : keyInput} onChange={(e) => setKeyInput(e.target.value)} disabled={mode === "edit"} placeholder="e.g. intransit" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm disabled:opacity-60 disabled:bg-gray-50" />
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
            <p className="mt-1 text-sm text-gray-500">This email is sent automatically when this stage is applied to a shipment. It also appears in Email Templates under Automated Templates.</p>
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
            <textarea value={emailBodyHtml} onChange={(e) => setEmailBodyHtml(e.target.value)} rows={18} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono" />
            <p className="mt-2 text-xs text-gray-500">
              Placeholders: {"{{badge}}"}, {"{{name}}"}, {"{{intro}}"}, {"{{detail}}"}, {"{{extra}}"}, {"{{detailsCard}}"}, {"{{destinationBlock}}"}, {"{{noteBlock}}"}, {"{{closingText}}"}, {"{{invoiceLink}}"}, {"{{shipmentId}}"}, {"{{trackingNumber}}"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={submit} disabled={!canSubmit || saving} className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 text-sm">
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Timeline Stage"}
          </button>
          <button onClick={() => setShowPreview((v) => !v)} className="px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 text-sm">
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          {mode === "edit" && (
            <button onClick={resetForm} className="px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-sm">
              Cancel
            </button>
          )}
          {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
        </div>

        {showPreview && (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-lg font-extrabold text-gray-900">Preview</h3>
            <p className="mt-1 text-sm text-gray-600">This preview renders like the actual sent email.</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <iframe title="email-preview" srcDoc={previewEmailHtml} className="w-full" style={{ height: "1100px", border: "0" }} />
            </div>
          </div>
        )}
      </div>

      {/* Existing stages */}
      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Existing Timeline Stages</h2>
            <p className="text-xs text-gray-500 mt-0.5">Click Edit to modify a stage. Changes sync to Email Templates automatically.</p>
          </div>
          <button onClick={fetchStatuses} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-sm">Refresh</button>
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
                {s.emailSubject && <p className="mt-1 text-xs text-gray-500 line-clamp-1">subject: {s.emailSubject}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => startEdit(s)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition">Edit</button>
                  <button onClick={() => setDeleteTarget(s)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">Delete</button>
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
              This will also remove <code className="bg-gray-100 px-1 py-0.5 rounded">timeline:{deleteTarget.key}</code> from Email Templates. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition text-sm">
                No, Keep It
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition text-sm">
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}