"use client";

import React, { useEffect, useMemo, useState } from "react";

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

type ShipmentHit = {
  shipmentId: string;
  trackingNumber?: string;
  senderName?: string;
  senderEmail?: string;
  receiverName?: string;
  receiverEmail?: string;
  status?: string;
};

function esc(s: string) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderToneBadgeHtml(text: string, tone: "blue" | "green" | "red" = "blue") {
  const color = tone === "green" ? { bg: "#dcfce7", text: "#166534" } : tone === "red" ? { bg: "#fee2e2", text: "#b91c1c" } : { bg: "#dbeafe", text: "#1d4ed8" };
  return `<div style="margin:0 0 14px 0;"><span style="display:inline-block;background:${color.bg};color:${color.text};font-size:12px;font-weight:800;letter-spacing:.3px;padding:6px 12px;border-radius:999px;text-transform:uppercase;">${esc(text)}</span></div>`;
}

function renderShipmentDetailsCardHtml(args: { shipmentId: string; trackingNumber?: string; invoiceNumber?: string }) {
  return `<table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"><tr><td style="padding:14px 20px;border-radius:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;table-layout:fixed;"><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Shipment Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;">${esc(args.shipmentId)}</td></tr><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Tracking Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;">${esc(args.trackingNumber || "—")}</td></tr><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Invoice Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;">${esc(args.invoiceNumber || "—")}</td></tr></table></td></tr></table>`;
}

function renderSimpleInfoCardHtml(rows: Array<{ label: string; value: string }>) {
  const body = rows.map((row) => `<tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">${esc(row.label)}:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(row.value)}</td></tr>`).join("");
  return `<table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"><tr><td style="padding:14px 20px;border-radius:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;table-layout:fixed;">${body}</table></td></tr></table>`;
}

function buildPreviewEmailHtml(args: { subject: string; title: string; preheader?: string; bodyHtml: string; button?: { text: string; href: string } }) {
  const year = new Date().getFullYear();
  const appUrl = "https://www.goexoduslogistics.com";
  const logoUrl = `${appUrl}/logo.svg`;
  const outerPad = 24;
  const innerPad = 20;
  const buttonHtml = args.button ? `<div style="padding:18px 0 6px 0;"><a href="${args.button.href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:15px;font-weight:800;">${esc(args.button.text)}</a></div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(args.subject)}</title></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(args.preheader || "You have a new message from Exodus Logistics.")}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;"><tr><td style="background:#0b3aa4;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr><tr><td align="center" style="padding:28px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;"><tr><td style="padding:0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;"><tr><td style="padding:${outerPad}px ${outerPad}px 14px ${outerPad}px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="left" style="vertical-align:middle;"><img src="${logoUrl}" alt="Exodus Logistics" width="140" height="38" style="display:block;width:140px;height:38px;border:0;outline:none;text-decoration:none;" /></td></tr></table></td></tr><tr><td style="padding:0 ${outerPad}px;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div></td></tr><tr><td style="padding:${innerPad}px ${outerPad}px;"><h1 style="margin:0 0 12px 0;font-size:24px;line-height:30px;font-weight:800;color:#0f172a;">${esc(args.title)}</h1>${args.bodyHtml}${buttonHtml}<p style="margin:14px 0 0 0;font-size:16px;line-height:24px;color:#111827;">Regards,<br /><strong>Exodus Logistics Support</strong></p></td></tr><tr><td style="padding:0 ${outerPad}px;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div></td></tr><tr><td style="padding:14px ${outerPad}px ${outerPad}px ${outerPad}px;"><p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">Support: <a href="mailto:support@goexoduslogistics.com" style="color:#2563eb;text-decoration:none;">support@goexoduslogistics.com</a></p><p style="margin:6px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">©️ ${year} Exodus Logistics. All rights reserved.</p></td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

// Shared button class helpers
const btnWhite = "cursor-pointer px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition text-sm";
const btnWhiteSm = "cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-xs font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition";
const btnBlue = "cursor-pointer px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm";
const btnBlueSm = "cursor-pointer px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm";
const btnModalKeep = "cursor-pointer flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition text-sm";
const btnModalDelete = "cursor-pointer flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition text-sm";
const btnEdit = "cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition";
const btnSend = "cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition";
const btnDelete = "cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition";

const AUTOMATED_KEYS = new Set([
  "shipment_created_sender", "shipment_created_receiver", "shipment_edited",
  "shipment_deleted", "invoice_status_update", "user_banned", "user_deleted", "user_restored",
]);

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeholderContent, setPlaceholderContent] = useState<Record<string, string>>({});
  const [previewInvoiceStatus, setPreviewInvoiceStatus] = useState<"auto" | "paid" | "unpaid" | "overdue" | "cancelled">("auto");
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
  const [useCustomBadgeText, setUseCustomBadgeText] = useState(false);
  const [badgeTone, setBadgeTone] = useState<"" | "blue" | "green" | "red">("");
  const [showButton, setShowButton] = useState(true);
  const [showLink, setShowLink] = useState(true);
  const [linkText, setLinkText] = useState("View Invoice");
  const [linkUrlType, setLinkUrlType] = useState("invoice");
  const [showDetailsCard, setShowDetailsCard] = useState(true);
  const [detailsCardType, setDetailsCardType] = useState<"shipment" | "account" | "invoice" | "changes" | "none">("shipment");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deletingKey, setDeletingKey] = useState("");
  const [deleteModalTarget, setDeleteModalTarget] = useState<string>("");
  const [deleteModalLabel, setDeleteModalLabel] = useState<string>("");

  const editFormRef = React.useRef<HTMLDivElement>(null);

  const [sendingTemplate, setSendingTemplate] = useState<EmailTemplateDoc | null>(null);
  const [sendStep, setSendStep] = useState<"shipments" | "recipients" | "sending" | "done">("shipments");
  const [allShipments, setAllShipments] = useState<ShipmentHit[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [selectedShipments, setSelectedShipments] = useState<Set<string>>(new Set());
  const [recipientMode, setRecipientMode] = useState<"sender" | "receiver" | "both">("both");
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, errors: 0 });
  const [shipmentSearch, setShipmentSearch] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-templates", { cache: "no-store" });
      const data = await res.json();
      setTemplates(Array.isArray(data?.templates) ? data.templates : []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  };

  const fetchPlaceholderContent = async () => {
    try {
      const res = await fetch("/api/placeholder-content", { cache: "no-store" });
      const data = await res.json();
      setPlaceholderContent(data?.content || {});
    } catch { setPlaceholderContent({}); }
  };

  useEffect(() => { fetchTemplates(); fetchPlaceholderContent(); }, []);

  const startEdit = (t: EmailTemplateDoc) => {
    setEditingKey(t.key); setLabel(t.label || ""); setCategory(t.category || "");
    setSubject(t.subject || ""); setTitle(t.title || ""); setPreheader(t.preheader || "");
    setBodyHtml(t.bodyHtml || ""); setButtonText(t.buttonText || "");
    setButtonUrlType(t.buttonUrlType || "track"); setBadgeText(t.badgeText || "");
    const isShipmentCreated = t.key === "shipment_created_sender" || t.key === "shipment_created_receiver";
    setUseCustomBadgeText(isShipmentCreated ? false : Boolean(String(t.badgeText || "").trim()));
    setBadgeTone((t.badgeTone as "" | "blue" | "green" | "red") || "");
    setShowButton(typeof t.showButton === "boolean" ? t.showButton : true);
    setShowLink(typeof t.showLink === "boolean" ? t.showLink : true);
    setLinkText(t.linkText || "View Invoice"); setLinkUrlType(t.linkUrlType || "invoice");
    setShowDetailsCard(typeof t.showDetailsCard === "boolean" ? t.showDetailsCard : true);
    setDetailsCardType((t.detailsCardType as "shipment" | "account" | "invoice" | "changes" | "none") || "shipment");
    setPreviewInvoiceStatus("auto"); setMsg(""); setShowPreview(false);
    setTimeout(() => editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const resetForm = () => {
    setEditingKey(""); setLabel(""); setCategory(""); setSubject(""); setTitle("");
    setPreheader(""); setBodyHtml(""); setButtonText(""); setButtonUrlType("track");
    setBadgeText(""); setUseCustomBadgeText(false); setBadgeTone("");
    setShowButton(true); setShowLink(true); setLinkText("View Invoice");
    setLinkUrlType("invoice"); setShowDetailsCard(true); setDetailsCardType("shipment");
    setPreviewInvoiceStatus("auto"); setMsg(""); setShowPreview(false);
  };

  const canSave = useMemo(() => Boolean(editingKey && label.trim() && subject.trim() && title.trim() && bodyHtml.trim()), [editingKey, label, subject, title, bodyHtml]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editingKey, label, category, subject, title, preheader, bodyHtml, buttonText, buttonUrlType, badgeText: useCustomBadgeText ? badgeText : "", badgeTone, showButton, showLink, linkText, linkUrlType, showDetailsCard, detailsCardType }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data?.error || "Failed to save template."); return; }
      setMsg("Email template updated successfully.");
      await fetchTemplates();
    } catch { setMsg("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const createTemplate = async () => {
    if (!newLabel.trim() || !newKey.trim()) { setCreateError("Label and key are required."); return; }
    const safeKey = newKey.trim().toLowerCase().replace(/[^a-z0-9_:]/g, "_");
    setCreating(true); setCreateError("");
    const defaultBody = `{{badge}}\n\n<p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">\nHello {{name}},\n</p>\n\n<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">\n{{intro}}\n</p>\n\n{{detailsCard}}\n\n<p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;">\n{{closingText}}\n</p>\n\n{{invoiceLink}}`;
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: safeKey, label: newLabel.trim(), category: newCategory.trim() || "custom", subject: `${newLabel.trim()} - {{shipmentId}}`, title: newLabel.trim(), preheader: "", bodyHtml: defaultBody, buttonText: "View Shipment", buttonUrlType: "track", badgeText: "", badgeTone: "", showButton: true, showLink: false, linkText: "", linkUrlType: "track", showDetailsCard: true, detailsCardType: "shipment" }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data?.error || "Failed to create template."); return; }
      await fetchTemplates();
      setShowCreateModal(false); setNewLabel(""); setNewKey(""); setNewCategory("");
      setTimeout(() => {
        startEdit({ key: safeKey, label: newLabel.trim(), category: newCategory.trim() || "custom", subject: `${newLabel.trim()} - {{shipmentId}}`, title: newLabel.trim(), preheader: "", bodyHtml: defaultBody, buttonText: "View Shipment", buttonUrlType: "track", badgeText: "", badgeTone: "", showButton: true, showLink: false, linkText: "", linkUrlType: "track", showDetailsCard: true, detailsCardType: "shipment" });
      }, 100);
    } catch { setCreateError("Network error. Please try again."); }
    finally { setCreating(false); }
  };

  const deleteTemplate = async () => {
    if (!deleteModalTarget) return;
    setDeletingKey(deleteModalTarget);
    try {
      const res = await fetch("/api/email-templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: deleteModalTarget }) });
      if (res.ok) { if (editingKey === deleteModalTarget) resetForm(); await fetchTemplates(); }
    } catch {}
    finally { setDeletingKey(""); setDeleteModalTarget(""); setDeleteModalLabel(""); }
  };

  const openSendFlow = async (t: EmailTemplateDoc) => {
    setSendingTemplate(t); setSendStep("shipments"); setSelectedShipments(new Set());
    setRecipientMode("both"); setSendProgress({ sent: 0, total: 0, errors: 0 });
    setShipmentSearch(""); setShipmentsLoading(true);
    try {
      const res = await fetch("/api/shipments?limit=200", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data?.shipments) ? data.shipments : Array.isArray(data) ? data : [];
      setAllShipments(list.map((s: any) => ({ shipmentId: s.shipmentId, trackingNumber: s.trackingNumber, senderName: s.senderName, senderEmail: s.senderEmail, receiverName: s.receiverName, receiverEmail: s.receiverEmail, status: s.status })));
    } catch { setAllShipments([]); }
    finally { setShipmentsLoading(false); }
  };

  const closeSendFlow = () => { setSendingTemplate(null); setSendStep("shipments"); };
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const executeSend = async () => {
    if (!sendingTemplate) return;
    setSendStep("sending");
    const selected = allShipments.filter((s) => selectedShipments.has(s.shipmentId));
    const emails: { to: string; name: string; shipmentId: string; trackingNumber: string }[] = [];
    for (const s of selected) {
      if (recipientMode === "sender" || recipientMode === "both") { if (s.senderEmail) emails.push({ to: s.senderEmail, name: s.senderName || "Customer", shipmentId: s.shipmentId, trackingNumber: s.trackingNumber || "" }); }
      if (recipientMode === "receiver" || recipientMode === "both") { if (s.receiverEmail) emails.push({ to: s.receiverEmail, name: s.receiverName || "Customer", shipmentId: s.shipmentId, trackingNumber: s.trackingNumber || "" }); }
    }
    setSendProgress({ sent: 0, total: emails.length, errors: 0 });
    let sent = 0; let errors = 0;
    for (const e of emails) {
      try { await fetch("/api/email-templates/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateKey: sendingTemplate.key, to: e.to, name: e.name, shipmentId: e.shipmentId, trackingNumber: e.trackingNumber }) }); sent++; } catch { errors++; }
      setSendProgress({ sent, total: emails.length, errors });
      await sleep(2000);
    }
    setSendStep("done"); setSendProgress({ sent, total: emails.length, errors });
  };

  const filteredShipments = allShipments.filter((s) => {
    if (!shipmentSearch.trim()) return true;
    const q = shipmentSearch.toLowerCase();
    return s.shipmentId.toLowerCase().includes(q) || (s.senderName || "").toLowerCase().includes(q) || (s.receiverName || "").toLowerCase().includes(q) || (s.trackingNumber || "").toLowerCase().includes(q);
  });

  const toggleSelectAll = () => {
    if (selectedShipments.size === filteredShipments.length) setSelectedShipments(new Set());
    else setSelectedShipments(new Set(filteredShipments.map((s) => s.shipmentId)));
  };

  const previewInvoiceMeta =
    previewInvoiceStatus === "auto" ? { badgeText: "AUTO BADGE", badgeTone: "blue" as const, invoiceStatus: "[Invoice Status]", invoiceMessage: "[Invoice status message will appear here]", followUpMessage: "[Follow-up action message will appear here]" }
    : previewInvoiceStatus === "paid" ? { badgeText: "INVOICE PAID", badgeTone: "green" as const, invoiceStatus: "PAID", invoiceMessage: placeholderContent.invoiceMessage_paid || "Payment for this invoice has been confirmed successfully in our system.", followUpMessage: placeholderContent.actionMessage_paid || "No further payment action is required at this time." }
    : previewInvoiceStatus === "overdue" ? { badgeText: "INVOICE OVERDUE", badgeTone: "red" as const, invoiceStatus: "OVERDUE", invoiceMessage: placeholderContent.invoiceMessage_overdue || "This invoice is now overdue and requires prompt attention.", followUpMessage: placeholderContent.actionMessage_overdue || "Payment should be completed as soon as possible." }
    : previewInvoiceStatus === "cancelled" ? { badgeText: "INVOICE CANCELLED", badgeTone: "red" as const, invoiceStatus: "CANCELLED", invoiceMessage: placeholderContent.invoiceMessage_cancelled || "This invoice has been cancelled in our system.", followUpMessage: placeholderContent.actionMessage_cancelled || "No payment should be made against this invoice." }
    : { badgeText: "INVOICE UNPAID", badgeTone: "blue" as const, invoiceStatus: "UNPAID", invoiceMessage: placeholderContent.invoiceMessage_unpaid || "This invoice is currently unpaid and payment is still required.", followUpMessage: placeholderContent.actionMessage_unpaid || "Please review the invoice details and complete payment." };

  const previewChangesTableHtml = `<div style="margin:16px 0 0 0;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#ffffff;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;background:#ffffff;"><thead><tr style="background:#f9fafb;"><th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Field</th><th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Previous</th><th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Updated</th></tr></thead><tbody><tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:700;vertical-align:top;">Delivery Address</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;vertical-align:top;">12 Old Street, Dallas, TX</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;vertical-align:top;">45 New Avenue, Houston, TX</td></tr><tr><td style="padding:12px 14px;font-size:14px;color:#111827;font-weight:700;vertical-align:top;">Receiver Phone</td><td style="padding:12px 14px;font-size:14px;color:#6b7280;vertical-align:top;">+1 555 0101</td><td style="padding:12px 14px;font-size:14px;color:#111827;vertical-align:top;">+1 555 0188</td></tr></tbody></table></div>`;

  const previewDetailsCardHtml = !showDetailsCard || detailsCardType === "none" ? ""
    : detailsCardType === "account" ? renderSimpleInfoCardHtml([{ label: "Account Email", value: "[Account Email]" }, { label: "Access Status", value: "[Access Status]" }])
    : detailsCardType === "invoice" ? renderSimpleInfoCardHtml([{ label: "Shipment Number", value: "[Shipment Number]" }, { label: "Invoice Number", value: "[Invoice Number]" }, { label: "Status", value: previewInvoiceMeta.invoiceStatus }])
    : detailsCardType === "changes" ? previewChangesTableHtml
    : renderShipmentDetailsCardHtml({ shipmentId: "[Shipment ID]", trackingNumber: "[Tracking Number]", invoiceNumber: "[Invoice Number]" });

  const getTimelinePreviewMeta = (key: string) => {
    const n = key.replace(/^timeline:/, "").toLowerCase();
    if (n === "delivered") return { badgeText: "DELIVERED", badgeTone: "green" as const, buttonText: "View Shipment" };
    if (n === "cancelled" || n === "canceled") return { badgeText: "CANCELLED", badgeTone: "red" as const, buttonText: "Contact Support" };
    if (n === "unclaimed") return { badgeText: "UNCLAIMED", badgeTone: "red" as const, buttonText: "Contact Support" };
    if (n === "invalidaddress") return { badgeText: "INVALID ADDRESS", badgeTone: "red" as const, buttonText: "Contact Support" };
    if (n === "paymentissue") return { badgeText: "PAYMENT ISSUE", badgeTone: "red" as const, buttonText: "Track Shipment" };
    if (n === "outfordelivery") return { badgeText: "OUT FOR DELIVERY", badgeTone: "blue" as const, buttonText: "Track Delivery" };
    if (n === "created") return { badgeText: "CREATED", badgeTone: "blue" as const, buttonText: "View Shipment" };
    if (n === "pickup" || n === "pickedup") return { badgeText: "PICKED UP", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    if (n === "warehouse") return { badgeText: "WAREHOUSE", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    if (n === "intransit") return { badgeText: "IN TRANSIT", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    if (n === "customclearance") return { badgeText: "CUSTOM CLEARANCE", badgeTone: "blue" as const, buttonText: "Track Shipment" };
    return { badgeText: "[Shipment Status]", badgeTone: "blue" as const, buttonText: "Track Shipment" };
  };

  const getAutoPreviewBadge = () => {
    const lk = editingKey.toLowerCase();
    if (lk === "shipment_created_sender" || lk === "shipment_created_receiver") {
      if (useCustomBadgeText && badgeText.trim()) return { text: badgeText.trim(), tone: (badgeTone || "blue") as "blue" | "green" | "red" };
      if (previewInvoiceStatus === "overdue") return { text: "PAYMENT OVERDUE", tone: "red" as const };
      if (previewInvoiceStatus === "cancelled") return { text: "INVOICE CANCELLED", tone: "red" as const };
      if (previewInvoiceStatus === "unpaid") return { text: "PAYMENT PENDING", tone: "blue" as const };
      return { text: "SHIPMENT CREATED", tone: "green" as const };
    }
    if (useCustomBadgeText && badgeText.trim()) return { text: badgeText.trim(), tone: (badgeTone || "blue") as "blue" | "green" | "red" };
    if (lk === "invoice_status_update") {
      if (previewInvoiceStatus === "paid") return { text: "INVOICE PAID", tone: (badgeTone || "green") as "blue" | "green" | "red" };
      if (previewInvoiceStatus === "overdue") return { text: "INVOICE OVERDUE", tone: (badgeTone || "red") as "blue" | "green" | "red" };
      if (previewInvoiceStatus === "cancelled") return { text: "INVOICE CANCELLED", tone: (badgeTone || "red") as "blue" | "green" | "red" };
      if (previewInvoiceStatus === "unpaid") return { text: "INVOICE UNPAID", tone: (badgeTone || "blue") as "blue" | "green" | "red" };
      return { text: "[Invoice Status]", tone: (badgeTone || "blue") as "blue" | "green" | "red" };
    }
    if (lk === "shipment_edited") return { text: "SHIPMENT UPDATED", tone: (badgeTone || "blue") as "blue" | "green" | "red" };
    if (lk === "shipment_deleted") return { text: "SHIPMENT REMOVED", tone: (badgeTone || "red") as "blue" | "green" | "red" };
    if (lk === "user_banned") return { text: "ACCOUNT BANNED", tone: (badgeTone || "red") as "blue" | "green" | "red" };
    if (lk === "user_deleted") return { text: "ACCOUNT DELETED", tone: (badgeTone || "red") as "blue" | "green" | "red" };
    if (lk === "user_restored") return { text: "ACCOUNT RESTORED", tone: (badgeTone || "green") as "blue" | "green" | "red" };
    if (lk.startsWith("timeline:")) { const m = getTimelinePreviewMeta(lk); return { text: m.badgeText, tone: (badgeTone || m.badgeTone) as "blue" | "green" | "red" }; }
    return { text: "AUTO BADGE", tone: (badgeTone || "blue") as "blue" | "green" | "red" };
  };

  const previewBadge = getAutoPreviewBadge();
  const previewBadgeHtml = renderToneBadgeHtml(previewBadge.text, previewBadge.tone);
  const previewButtonMeta = editingKey.startsWith("timeline:") ? getTimelinePreviewMeta(editingKey) : null;
  const previewInvoiceLinkHtml = showLink && linkText ? `<div style="margin-top:12px"><a href="#" style="color:#2563eb;text-decoration:underline;font-weight:700;">${esc(linkText)}</a></div>` : "";

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
    return { intro: "Your shipment <strong>[Shipment ID]</strong> has been successfully created in our system.", detail: "It is now being processed and prepared for the next logistics stage toward <strong>[Destination]</strong>.", extra: "You will receive additional notifications as soon as the shipment moves through the next checkpoints.", destinationLabel: "Destination" };
  };

  const timelinePreviewContent = editingKey.startsWith("timeline:") ? getTimelinePreviewContent(editingKey, placeholderContent) : null;

  const previewBodyHtml = (bodyHtml || "<p>No content yet.</p>")
    .replace(/{{closingText}}/g, (() => {
      const lk = editingKey.toLowerCase();
      const text = lk === "invoice_status_update" ? (placeholderContent.closingText_invoice || "You can view the invoice directly using the button below.")
        : lk === "shipment_created_sender" || lk === "shipment_created_receiver" ? (placeholderContent.closingText_shipment || "You can use the button below to open the shipment page for tracking updates.")
        : lk === "shipment_edited" ? (placeholderContent.closingText_edited || "You can use the button below to open the shipment page and review the latest details.")
        : lk.startsWith("timeline:") ? (placeholderContent.closingText_tracking || "You can use the button below to open the shipment page for the latest tracking updates.")
        : (placeholderContent.default_closingText || "You can use the button below to take the next action on this shipment.");
      return `<p style='margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;'>${text}</p>`;
    })())
    .replace(/{{otherPartyLine}}/g, "<span style='color:#0f172a;'>, sent by/to <strong>[Other Party Name]</strong>,</span>")
    .replace(/{{badge}}/g, previewBadgeHtml)
    .replace(/{{detailsCard}}/g, previewDetailsCardHtml)
    .replace(/{{invoiceLink}}/g, previewInvoiceLinkHtml)
    .replace(/{{changesTable}}/g, previewChangesTableHtml)
    .replace(/{{name}}/g, "<span style='color:#0f172a;font-weight:700;'>[Customer Name]</span>")
    .replace(/{{receiverName}}/g, "<span style='color:#0f172a;font-weight:700;'>[Receiver Name]</span>")
    .replace(/{{senderName}}/g, "<span style='color:#0f172a;font-weight:700;'>[Sender Name]</span>")
    .replace(/{{shipmentId}}/g, "<span style='color:#0f172a;font-weight:700;'>[Shipment ID]</span>")
    .replace(/{{trackingNumber}}/g, "<span style='color:#0f172a;font-weight:700;'>[Tracking Number]</span>")
    .replace(/{{invoiceNumber}}/g, "<span style='color:#0f172a;font-weight:700;'>[Invoice Number]</span>")
    .replace(/{{estimatedDeliveryDate}}/g, "<span style='color:#0f172a;font-weight:700;'>[Estimated Delivery Date]</span>")
    .replace(/{{invoiceStatus}}/g, previewInvoiceStatus === "auto" ? "<span style='color:#0f172a;font-weight:700;'>[Invoice Status]</span>" : `<span style='color:#0f172a;font-weight:700;'>${previewInvoiceMeta.invoiceStatus}</span>`)
    .replace(/{{invoiceMessage}}/g, previewInvoiceStatus === "auto" ? "<span style='color:#0f172a;'>[Invoice status message will appear here]</span>" : `<span style='color:#0f172a;'>${previewInvoiceMeta.invoiceMessage}</span>`)
    .replace(/{{followUpMessage}}/g, previewInvoiceStatus === "auto" ? "<span style='color:#0f172a;'>[Follow-up action message will appear here]</span>" : `<span style='color:#0f172a;'>${previewInvoiceMeta.followUpMessage}</span>`)
    .replace(/{{actionMessage}}/g, previewInvoiceStatus === "auto" ? "<span style='color:#0f172a;'>[Follow-up action message will appear here]</span>" : `<span style='color:#0f172a;'>${previewInvoiceMeta.followUpMessage}</span>`)
    .replace(/{{paymentMessage}}/g, previewInvoiceStatus === "auto"
      ? `<span style='color:#0f172a;'>[Payment message will appear here]</span><br/><span style='color:#0f172a;'>[Follow-up action message will appear here]</span>`
      : editingKey === "shipment_created_sender" || editingKey === "shipment_created_receiver"
      ? (() => { const pm = previewInvoiceStatus === "paid" ? (placeholderContent.paymentMessage_paid || previewInvoiceMeta.invoiceMessage) : previewInvoiceStatus === "overdue" ? (placeholderContent.paymentMessage_overdue || previewInvoiceMeta.invoiceMessage) : previewInvoiceStatus === "cancelled" ? (placeholderContent.paymentMessage_cancelled || previewInvoiceMeta.invoiceMessage) : (placeholderContent.paymentMessage_unpaid || previewInvoiceMeta.invoiceMessage); return `<span style='color:#0f172a;'>${pm}</span>`; })()
      : `<span style='color:#0f172a;'>${previewInvoiceMeta.invoiceMessage}</span><br/><br/><span style='color:#0f172a;'>${previewInvoiceMeta.followUpMessage}</span>`)
    .replace(/{{intro}}/g, editingKey.startsWith("timeline:") ? `<span style='color:#111827;'>${timelinePreviewContent?.intro || ""}</span>` : editingKey === "shipment_edited" ? "<span style='color:#111827;'>Please be informed that certain shipment details have been updated in our system.</span>" : `<span style='color:#0f172a;'>${placeholderContent.default_intro || "[Intro message]"}</span>`)
    .replace(/{{detail}}/g, editingKey.startsWith("timeline:") ? `<span style='color:#111827;'>${timelinePreviewContent?.detail || ""}</span>` : `<span style='color:#0f172a;'>${placeholderContent.default_detail || "[Detail message]"}</span>`)
    .replace(/{{extra}}/g, editingKey.startsWith("timeline:") ? `<span style='color:#111827;'>${timelinePreviewContent?.extra || ""}</span>` : `<span style='color:#0f172a;'>${placeholderContent.default_extra || "[Extra message]"}</span>`)
    .replace(/{{email}}/g, "<span style='color:#0f172a;font-weight:700;'>[Email Address]</span>")
    .replace(/{{shortEmail}}/g, "<span style='color:#0f172a;font-weight:700;'>[Short Email]</span>")
    .replace(/{{supportUrl}}/g, "#").replace(/{{trackUrl}}/g, "#").replace(/{{invoiceUrl}}/g, "#")
    .replace(/{{status}}/g, "<span style='color:#0f172a;font-weight:700;'>[Shipment Status]</span>")
    .replace(/{{destination}}/g, "<span style='color:#0f172a;font-weight:700;'>[Destination]</span>")
    .replace(/{{fullDestination}}/g, "<span style='color:#0f172a;font-weight:700;'>[Full Destination]</span>")
    .replace(/{{origin}}/g, "<span style='color:#0f172a;font-weight:700;'>[Origin]</span>")
    .replace(/{{destinationBlock}}/g, `<div style="margin:18px 0 0 0;"><p style="margin:0 0 6px 0;font-size:14px;line-height:20px;color:#6b7280;">${editingKey.startsWith("timeline:") ? timelinePreviewContent?.destinationLabel || "Destination" : "Destination"}</p><p style="margin:0;font-size:15px;line-height:24px;font-weight:700;color:#111827;">${editingKey === "timeline:outfordelivery" || editingKey === "timeline:delivered" ? "[Full Destination]" : "[Destination]"}</p></div>`)
    .replace(/{{noteBlock}}/g, `<div style="margin:20px 0 0 0;padding:14px 16px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:10px;"><p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;"><strong>Additional note:</strong> [Additional Note]</p></div>`)
    .replace(/{{note}}/g, editingKey.startsWith("timeline:") ? `<div style="margin:20px 0 0 0;padding:14px 16px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:10px;"><p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;"><strong>Additional note:</strong> [Additional Note]</p></div>` : "<span style='color:#0f172a;'>[Additional Note]</span>");

  const previewEmailHtml = buildPreviewEmailHtml({
    subject: subject || "Template Preview", title: title || "Template Title", preheader,
    bodyHtml: previewBodyHtml,
    button: showButton && (editingKey.startsWith("timeline:") ? (buttonText || previewButtonMeta?.buttonText) : buttonText)
      ? { text: editingKey.startsWith("timeline:") ? (buttonText || previewButtonMeta?.buttonText || "Track Shipment") : buttonText, href: "#" }
      : undefined,
  });
  const customTemplates = templates.filter((t) => t.category === "custom");
  const automatedTemplates = templates.filter((t) => t.category !== "custom");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Edit form */}
      <div ref={editFormRef} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Email Templates</h1>
            <p className="mt-1 text-sm text-gray-600">Edit full automatic email templates used across your logistics system.</p>
          </div>
          {editingKey && (
            <button onClick={resetForm} className={btnWhite}>Clear</button>
          )}
        </div>

        {!editingKey ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">Select a template below to edit it.</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Template Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Category</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Button URL Type</label>
                <select value={buttonUrlType} onChange={(e) => setButtonUrlType(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                  <option value="track">track</option><option value="invoice">invoice</option><option value="support">support</option><option value="signin">sign-in</option><option value="none">none</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Preheader</label>
              <input value={preheader} onChange={(e) => setPreheader(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Badge Text</label>
                <select value={useCustomBadgeText ? "custom" : "auto"} onChange={(e) => { const m = e.target.value; setUseCustomBadgeText(m === "custom"); if (m === "auto") setBadgeText(""); }} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                  <option value="auto">Auto (Use system default)</option><option value="custom">Custom</option>
                </select>
                {useCustomBadgeText && <input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder="Enter custom badge text" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" />}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Badge Color</label>
                <select value={badgeTone || ""} onChange={(e) => setBadgeTone(e.target.value as "" | "blue" | "green" | "red")} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                  <option value="">Auto (Use system default)</option><option value="blue">Blue</option><option value="green">Green</option><option value="red">Red</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={showButton} onChange={(e) => setShowButton(e.target.checked)} />Show Button</label>
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={showLink} onChange={(e) => setShowLink(e.target.checked)} />Show Link</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-gray-600">Button Text</label><input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600">Link Text</label><input value={linkText} onChange={(e) => setLinkText(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Link URL Type</label>
                <select value={linkUrlType} onChange={(e) => setLinkUrlType(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                  <option value="track">track</option><option value="invoice">invoice</option><option value="support">support</option><option value="signin">sign-in</option><option value="none">none</option>
                </select>
              </div>
              {(editingKey === "invoice_status_update" || editingKey === "shipment_created_sender" || editingKey === "shipment_created_receiver") && (
                <div>
                  <label className="text-xs font-semibold text-gray-600">Preview Invoice Status</label>
                  <select value={previewInvoiceStatus} onChange={(e) => setPreviewInvoiceStatus(e.target.value as "auto" | "paid" | "unpaid" | "overdue" | "cancelled")} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                    <option value="auto">auto (default)</option><option value="paid">paid</option><option value="unpaid">unpaid</option><option value="overdue">overdue</option><option value="cancelled">cancelled</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600">Details Card Type</label>
                <select value={detailsCardType} onChange={(e) => setDetailsCardType(e.target.value as "shipment" | "account" | "invoice" | "changes" | "none")} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white">
                  <option value="shipment">shipment</option><option value="account">account</option><option value="invoice">invoice</option><option value="changes">changes</option><option value="none">none</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={showDetailsCard} onChange={(e) => setShowDetailsCard(e.target.checked)} />Show Details Card</label>
            <div>
              <label className="text-xs font-semibold text-gray-600">Body HTML</label>
              <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={18} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono" />
              <p className="mt-2 text-xs text-gray-500">You can use placeholders like: {"{{badge}}"}, {"{{detailsCard}}"}, {"{{invoiceLink}}"}, {"{{shipmentId}}"}, {"{{name}}"}, {"{{intro}}"}, {"{{closingText}}"}, etc.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={save} disabled={!canSave || saving} className="cursor-pointer px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 text-sm">{saving ? "Saving..." : "Save Template"}</button>
              <button onClick={() => setShowPreview((v) => !v)} className={btnWhite.replace("px-4 py-2", "px-5 py-3")}>{showPreview ? "Hide Preview" : "Preview"}</button>
              {msg && <span className="text-sm font-semibold text-gray-700">{msg}</span>}
            </div>
            {showPreview && (
              <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-lg font-extrabold text-gray-900">Preview</h3>
                <p className="mt-1 text-sm text-gray-600">This preview renders like the actual sent email wrapper.</p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <iframe title="email-preview" srcDoc={previewEmailHtml} className="w-full" style={{ height: "1100px", border: "0" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Templates */}
      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Custom Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">Templates you created manually. Can be edited, sent, and deleted.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowCreateModal(true); setCreateError(""); }} className={btnBlueSm}>+ Create Template</button>
            <button onClick={fetchTemplates} className={btnWhite}>Refresh</button>
          </div>
        </div>
        {loading ? <p className="mt-4 text-sm text-gray-600">Loading...</p>
        : customTemplates.length === 0 ? <p className="mt-4 text-sm text-gray-500">No custom templates yet. Click Create Template to get started.</p>
        : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {customTemplates.map((t) => (
              <div key={t.key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-blue-200 transition">
                <p className="font-extrabold text-gray-900">{t.label}</p>
                <p className="mt-1 text-xs text-gray-500">key: {t.key}</p>
                <p className="mt-1 text-xs text-gray-500">category: {t.category}</p>
                <p className="mt-3 text-sm text-gray-700 line-clamp-2">{t.subject}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => startEdit(t)} className={btnEdit}>Edit</button>
                  <button onClick={() => openSendFlow(t)} className={btnSend}>Send</button>
                  <button onClick={() => { setDeleteModalTarget(t.key); setDeleteModalLabel(t.label); }} className={btnDelete}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Automated Templates */}
      <div className="mt-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Automated Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">System templates triggered automatically. Can be edited and deleted but cannot be manually sent.</p>
          </div>
          <button onClick={fetchTemplates} className={btnWhite}>Refresh</button>
        </div>
        {loading ? <p className="mt-4 text-sm text-gray-600">Loading...</p>
        : automatedTemplates.length === 0 ? <p className="mt-4 text-sm text-gray-600">No templates found.</p>
        : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {automatedTemplates.map((t) => (
              <div key={t.key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-blue-200 transition">
                <p className="font-extrabold text-gray-900">{t.label}</p>
                <p className="mt-1 text-xs text-gray-500">key: {t.key}</p>
                <p className="mt-1 text-xs text-gray-500">category: {t.category}</p>
                <p className="mt-1 text-xs text-gray-500">badge: {t.badgeText || "—"} / {t.badgeTone || "auto"}</p>
                <p className="mt-3 text-sm text-gray-700 line-clamp-2">{t.subject}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => startEdit(t)} className={btnEdit}>Edit</button>
                  <button onClick={() => { setDeleteModalTarget(t.key); setDeleteModalLabel(t.label); }} className={btnDelete}>Delete</button>
                  <span className="text-xs text-gray-400 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100">Auto</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Create New Template</h3>
            <p className="text-sm text-gray-500 mb-5">The template will open for editing immediately after creation.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Template Label</label>
                <input value={newLabel} onChange={(e) => { setNewLabel(e.target.value); if (!newKey) setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_")); }} placeholder="e.g. Special Offer Email" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Template Key <span className="text-gray-400 font-normal">(unique, no spaces)</span></label>
                <input value={newKey} onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_:]/g, "_"))} placeholder="e.g. special_offer_email" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono outline-none focus:border-blue-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Category <span className="text-gray-400 font-normal">(optional — defaults to "custom")</span></label>
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="custom" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-300" />
              </div>
              {createError && <p className="text-sm text-red-500 font-semibold">{createError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createTemplate} disabled={creating || !newLabel.trim() || !newKey.trim()} className="cursor-pointer flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm">{creating ? "Creating..." : "Create Template"}</button>
              <button onClick={() => { setShowCreateModal(false); setCreateError(""); setNewLabel(""); setNewKey(""); setNewCategory(""); }} className={btnModalKeep}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Flow Modal */}
      {sendingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">Send: {sendingTemplate.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sendStep === "shipments" && "Step 1 of 2 — Select shipments"}
                    {sendStep === "recipients" && "Step 2 of 2 — Choose recipients"}
                    {sendStep === "sending" && "Sending emails..."}
                    {sendStep === "done" && "Send complete"}
                  </p>
                </div>
                {sendStep !== "sending" && (
                  <button onClick={closeSendFlow} className="cursor-pointer text-gray-400 hover:text-gray-600 text-xl font-bold px-2">×</button>
                )}
              </div>
            </div>

            {sendStep === "shipments" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-100">
                  <input value={shipmentSearch} onChange={(e) => setShipmentSearch(e.target.value)} placeholder="Search by shipment ID, name or tracking..." className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-300" />
                  <div className="flex items-center justify-between mt-2">
                    <button onClick={toggleSelectAll} className="cursor-pointer text-xs text-blue-600 font-semibold hover:underline">
                      {selectedShipments.size === filteredShipments.length && filteredShipments.length > 0 ? "Deselect all" : "Select all"}
                    </button>
                    <span className="text-xs text-gray-500">{selectedShipments.size} selected</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-3">
                  {shipmentsLoading ? <p className="text-sm text-gray-500 py-4 text-center">Loading shipments...</p>
                  : filteredShipments.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">No shipments found.</p>
                  : filteredShipments.map((s) => (
                    <label key={s.shipmentId} className="flex items-start gap-3 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 rounded-xl px-2 -mx-2">
                      <input type="checkbox" checked={selectedShipments.has(s.shipmentId)} onChange={(e) => { const n = new Set(selectedShipments); e.target.checked ? n.add(s.shipmentId) : n.delete(s.shipmentId); setSelectedShipments(n); }} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.shipmentId}</p>
                        <p className="text-xs text-gray-500">{s.senderName || "—"} → {s.receiverName || "—"}</p>
                        <p className="text-xs text-gray-400">{s.status || "—"}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-gray-100">
                  <button onClick={() => setSendStep("recipients")} disabled={selectedShipments.size === 0} className="cursor-pointer w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm">
                    Next — Choose Recipients ({selectedShipments.size} shipment{selectedShipments.size !== 1 ? "s" : ""})
                  </button>
                </div>
              </div>
            )}

            {sendStep === "recipients" && (
              <div className="px-6 py-6 flex flex-col gap-4">
                <p className="text-sm text-gray-600">Who should receive this email for each selected shipment?</p>
                <div className="space-y-3">
                  {(["sender", "receiver", "both"] as const).map((mode) => (
                    <label key={mode} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition ${recipientMode === mode ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="recipientMode" value={mode} checked={recipientMode === mode} onChange={() => setRecipientMode(mode)} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm capitalize">{mode === "both" ? "Both sender and receiver" : mode}</p>
                        <p className="text-xs text-gray-500">
                          {mode === "sender" && "Only the person who created/sent the shipment"}
                          {mode === "receiver" && "Only the person receiving the shipment"}
                          {mode === "both" && "Both parties will receive the email"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500">Emails will be sent with a 2 second delay between each one to avoid rate limits. Total emails to send: <strong>{selectedShipments.size * (recipientMode === "both" ? 2 : 1)}</strong></p>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => setSendStep("shipments")} className={btnModalKeep}>Back</button>
                  <button onClick={executeSend} className="cursor-pointer flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition text-sm">Send Emails</button>
                </div>
              </div>
            )}

            {sendStep === "sending" && (
              <div className="px-6 py-10 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                <p className="font-extrabold text-gray-900 text-lg">Sending emails...</p>
                <p className="text-sm text-gray-500">{sendProgress.sent} of {sendProgress.total} sent{sendProgress.errors > 0 ? ` (${sendProgress.errors} failed)` : ""}</p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: sendProgress.total > 0 ? `${(sendProgress.sent / sendProgress.total) * 100}%` : "0%" }} />
                </div>
                <p className="text-xs text-gray-400">Please keep this window open until sending is complete.</p>
              </div>
            )}

            {sendStep === "done" && (
              <div className="px-6 py-10 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-600">✓</div>
                <p className="font-extrabold text-gray-900 text-lg">Send complete!</p>
                <p className="text-sm text-gray-500 text-center">
                  {sendProgress.sent} email{sendProgress.sent !== 1 ? "s" : ""} sent successfully.
                  {sendProgress.errors > 0 && ` ${sendProgress.errors} failed.`}
                </p>
                <button onClick={closeSendFlow} className="cursor-pointer mt-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 text-center mb-1">Delete Email Template</h3>
            <p className="text-sm text-gray-500 text-center mb-2">Are you sure you want to delete <strong>{deleteModalLabel}</strong>?</p>
            <p className="text-xs text-gray-400 text-center mb-6">This template will be permanently removed and cannot be recovered.</p>
            <div className="flex gap-3">
              <button onClick={() => { setDeleteModalTarget(""); setDeleteModalLabel(""); }} disabled={deletingKey === deleteModalTarget} className={btnModalKeep}>No, Keep It</button>
              <button onClick={deleteTemplate} disabled={deletingKey === deleteModalTarget} className={btnModalDelete}>{deletingKey === deleteModalTarget ? "Deleting..." : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}