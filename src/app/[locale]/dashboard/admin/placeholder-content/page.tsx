"use client";
import { useEffect, useState } from "react";

type ContentMap = Record<string, string>;

type PlaceholderGroup = {
  id: string;
  label: string;
  color: string;
  items: {
    key: string;
    label: string;
    description: string;
    status?: string;
  }[];
};

const GROUPS: PlaceholderGroup[] = [
  {
    id: "invoiceMessage",
    label: "Invoice Message",
    color: "blue",
    items: [
      { key: "invoiceMessage_paid", label: "{{invoiceMessage}} - Paid", description: "Short status message when invoice is paid", status: "paid" },
      { key: "invoiceMessage_unpaid", label: "{{invoiceMessage}} - Unpaid", description: "Short status message when invoice is unpaid", status: "unpaid" },
      { key: "invoiceMessage_overdue", label: "{{invoiceMessage}} - Overdue", description: "Short status message when invoice is overdue", status: "overdue" },
      { key: "invoiceMessage_cancelled", label: "{{invoiceMessage}} - Cancelled", description: "Short status message when invoice is cancelled", status: "cancelled" },
    ],
  },
  {
    id: "actionMessage",
    label: "Action Message",
    color: "purple",
    items: [
      { key: "actionMessage_paid", label: "{{actionMessage}} - Paid", description: "Follow-up action instructions when invoice is paid", status: "paid" },
      { key: "actionMessage_unpaid", label: "{{actionMessage}} - Unpaid", description: "Follow-up action instructions when invoice is unpaid", status: "unpaid" },
      { key: "actionMessage_overdue", label: "{{actionMessage}} - Overdue", description: "Follow-up action instructions when invoice is overdue", status: "overdue" },
      { key: "actionMessage_cancelled", label: "{{actionMessage}} - Cancelled", description: "Follow-up action instructions when invoice is cancelled", status: "cancelled" },
    ],
  },
  {
    id: "paymentMessage",
    label: "Payment Message",
    color: "green",
    items: [
      { key: "paymentMessage_paid", label: "{{paymentMessage}} - Paid", description: "Used in shipment created emails when invoice is paid", status: "paid" },
      { key: "paymentMessage_unpaid", label: "{{paymentMessage}} - Unpaid", description: "Used in shipment created emails when invoice is unpaid", status: "unpaid" },
      { key: "paymentMessage_overdue", label: "{{paymentMessage}} - Overdue", description: "Used in shipment created emails when invoice is overdue", status: "overdue" },
      { key: "paymentMessage_cancelled", label: "{{paymentMessage}} - Cancelled", description: "Used in shipment created emails when invoice is cancelled", status: "cancelled" },
    ],
  },
  {
    id: "closingText",
    label: "Closing Text",
    color: "orange",
    items: [
      { key: "closingText_invoice", label: "{{closingText}} - Invoice emails", description: "Text shown above the button in invoice update emails" },
      { key: "closingText_shipment", label: "{{closingText}} - Shipment created emails", description: "Text shown above the button in shipment created emails" },
      { key: "closingText_tracking", label: "{{closingText}} - Timeline/tracking emails", description: "Text shown above the button in timeline update emails" },
      { key: "closingText_edited", label: "{{closingText}} - Shipment edited emails", description: "Text shown above the button in shipment edited emails" },
    ],
  },
  {
    id: "timeline_pickup",
    label: "Timeline: Picked Up",
    color: "cyan",
    items: [
      { key: "timeline_pickup_intro", label: "{{intro}}", description: "Opening sentence for picked up email" },
      { key: "timeline_pickup_detail", label: "{{detail}}", description: "Detail paragraph for picked up email" },
      { key: "timeline_pickup_extra", label: "{{extra}}", description: "Closing note for picked up email" },
    ],
  },
  {
    id: "timeline_warehouse",
    label: "Timeline: Warehouse",
    color: "cyan",
    items: [
      { key: "timeline_warehouse_intro", label: "{{intro}}", description: "Opening sentence for warehouse email" },
      { key: "timeline_warehouse_detail", label: "{{detail}}", description: "Detail paragraph for warehouse email" },
      { key: "timeline_warehouse_extra", label: "{{extra}}", description: "Closing note for warehouse email" },
    ],
  },
  {
    id: "timeline_intransit",
    label: "Timeline: In Transit",
    color: "cyan",
    items: [
      { key: "timeline_intransit_intro", label: "{{intro}}", description: "Opening sentence for in transit email" },
      { key: "timeline_intransit_detail", label: "{{detail}}", description: "Detail paragraph for in transit email" },
      { key: "timeline_intransit_extra", label: "{{extra}}", description: "Closing note for in transit email" },
    ],
  },
  {
    id: "timeline_outfordelivery",
    label: "Timeline: Out for Delivery",
    color: "cyan",
    items: [
      { key: "timeline_outfordelivery_intro", label: "{{intro}}", description: "Opening sentence for out for delivery email" },
      { key: "timeline_outfordelivery_detail", label: "{{detail}}", description: "Detail paragraph for out for delivery email" },
      { key: "timeline_outfordelivery_extra", label: "{{extra}}", description: "Closing note for out for delivery email" },
    ],
  },
  {
    id: "timeline_delivered",
    label: "Timeline: Delivered",
    color: "green",
    items: [
      { key: "timeline_delivered_intro", label: "{{intro}}", description: "Opening sentence for delivered email" },
      { key: "timeline_delivered_detail", label: "{{detail}}", description: "Detail paragraph for delivered email" },
      { key: "timeline_delivered_extra", label: "{{extra}}", description: "Closing note for delivered email" },
    ],
  },
  {
    id: "timeline_customclearance",
    label: "Timeline: Custom Clearance",
    color: "cyan",
    items: [
      { key: "timeline_customclearance_intro", label: "{{intro}}", description: "Opening sentence for customs clearance email" },
      { key: "timeline_customclearance_detail", label: "{{detail}}", description: "Detail paragraph for customs clearance email" },
      { key: "timeline_customclearance_extra", label: "{{extra}}", description: "Closing note for customs clearance email" },
    ],
  },
  {
    id: "timeline_cancelled",
    label: "Timeline: Cancelled",
    color: "red",
    items: [
      { key: "timeline_cancelled_intro", label: "{{intro}}", description: "Opening sentence for cancelled email" },
      { key: "timeline_cancelled_detail", label: "{{detail}}", description: "Detail paragraph for cancelled email" },
      { key: "timeline_cancelled_extra", label: "{{extra}}", description: "Closing note for cancelled email" },
    ],
  },
  {
    id: "timeline_unclaimed",
    label: "Timeline: Unclaimed",
    color: "red",
    items: [
      { key: "timeline_unclaimed_intro", label: "{{intro}}", description: "Opening sentence for unclaimed email" },
      { key: "timeline_unclaimed_detail", label: "{{detail}}", description: "Detail paragraph for unclaimed email" },
      { key: "timeline_unclaimed_extra", label: "{{extra}}", description: "Closing note for unclaimed email" },
    ],
  },
  {
    id: "timeline_invalidaddress",
    label: "Timeline: Invalid Address",
    color: "red",
    items: [
      { key: "timeline_invalidaddress_intro", label: "{{intro}}", description: "Opening sentence for invalid address email" },
      { key: "timeline_invalidaddress_detail", label: "{{detail}}", description: "Detail paragraph for invalid address email" },
      { key: "timeline_invalidaddress_extra", label: "{{extra}}", description: "Closing note for invalid address email" },
    ],
  },
  {
    id: "timeline_paymentissue",
    label: "Timeline: Payment Issue",
    color: "red",
    items: [
      { key: "timeline_paymentissue_intro", label: "{{intro}}", description: "Opening sentence for payment issue email" },
      { key: "timeline_paymentissue_detail", label: "{{detail}}", description: "Detail paragraph for payment issue email" },
      { key: "timeline_paymentissue_extra", label: "{{extra}}", description: "Closing note for payment issue email" },
    ],
  },
];

const colorMap: Record<string, { border: string; header: string; dot: string }> = {
  blue: { border: "border-blue-100", header: "bg-blue-50", dot: "bg-blue-500" },
  purple: { border: "border-purple-100", header: "bg-purple-50", dot: "bg-purple-500" },
  green: { border: "border-green-100", header: "bg-green-50", dot: "bg-green-500" },
  orange: { border: "border-orange-100", header: "bg-orange-50", dot: "bg-orange-500" },
  cyan: { border: "border-cyan-100", header: "bg-cyan-50", dot: "bg-cyan-500" },
  red: { border: "border-red-100", header: "bg-red-50", dot: "bg-red-500" },
};

const statusBadge: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const DEFAULT_CONTENT: Record<string, string> = {
  invoiceMessage_paid: "Payment for this invoice has been confirmed successfully in our system.",
  invoiceMessage_unpaid: "This invoice is currently unpaid and payment is still required.",
  invoiceMessage_overdue: "This invoice is now overdue and requires prompt attention.",
  invoiceMessage_cancelled: "This invoice has been cancelled in our system.",
  actionMessage_paid: "No further payment action is required at this time. Shipment processing may continue normally, and you may keep this invoice for your billing records and future reference.",
  actionMessage_unpaid: "Please review the invoice details carefully and complete payment as soon as possible so shipment processing can continue without unnecessary interruption.",
  actionMessage_overdue: "To avoid continued shipment delay, processing hold, or additional administrative follow-up, payment should be completed as soon as possible. We recommend reviewing the invoice immediately and settling the outstanding amount without delay.",
  actionMessage_cancelled: "No payment should be made against this invoice unless our support team has specifically instructed otherwise. If this update was not expected, please contact support for clarification.",
  paymentMessage_paid: "Payment has been confirmed successfully. Your shipment is now ready to move through the next logistics stage, and you will continue to receive progress updates as new checkpoints are reached.",
  paymentMessage_unpaid: "Payment is still required before shipment processing can continue. Once payment is completed, the shipment will move to the next stage and you will receive further updates automatically.",
  paymentMessage_overdue: "This invoice is currently overdue. Please complete payment as soon as possible to avoid delay in shipment processing and movement to the next logistics stage.",
  paymentMessage_cancelled: "This invoice has been cancelled. Shipment processing cannot continue under the current invoice status. Please contact support if you believe this was done in error.",
  closingText_invoice: "You can view the invoice directly using the button below.",
  closingText_shipment: "You can use the button below to open the shipment page for tracking updates. You can also use the invoice link below to review billing details.",
  closingText_tracking: "You can use the button below to open the shipment page for the latest tracking updates. You can also use the invoice link below to review billing information when needed.",
  closingText_edited: "You can use the button below to open the shipment page and review the latest details. You can also use the invoice link below if billing verification is needed.",
  timeline_pickup_intro: "We are pleased to inform you that your shipment has been successfully picked up and entered into our logistics network.",
  timeline_pickup_detail: "The shipment is now being processed for movement from the origin facility toward the destination.",
  timeline_pickup_extra: "Our team will continue processing the shipment and you will receive another update once it reaches the next checkpoint.",
  timeline_warehouse_intro: "Your shipment has been received at our warehouse facility.",
  timeline_warehouse_detail: "It is currently undergoing internal handling and preparation before moving to the next shipping stage.",
  timeline_warehouse_extra: "You will be notified again as soon as the shipment leaves the warehouse and proceeds to transit.",
  timeline_intransit_intro: "Your shipment is now in transit.",
  timeline_intransit_detail: "It is currently moving through our logistics network toward the destination.",
  timeline_intransit_extra: "Our system will continue to provide updates as the shipment progresses through the next checkpoints.",
  timeline_outfordelivery_intro: "Your shipment is now out for delivery.",
  timeline_outfordelivery_detail: "Our delivery process is in progress and the shipment is on its final route to the delivery address.",
  timeline_outfordelivery_extra: "Please make sure you are available and prepared to receive or pick up the shipment once delivery is completed.",
  timeline_delivered_intro: "This is to confirm that your shipment has been successfully delivered.",
  timeline_delivered_detail: "Delivery has been completed at the destination address.",
  timeline_delivered_extra: "If you have any concern regarding the delivery or need clarification, please contact our support team with your shipment details.",
  timeline_customclearance_intro: "Your shipment is currently undergoing customs clearance.",
  timeline_customclearance_detail: "This is a routine compliance stage before the shipment proceeds toward the destination.",
  timeline_customclearance_extra: "If any additional verification is required, our team will contact you promptly and provide further guidance.",
  timeline_cancelled_intro: "Your shipment has been marked as cancelled.",
  timeline_cancelled_detail: "This shipment is no longer progressing through our logistics network.",
  timeline_cancelled_extra: "If you believe this update was made in error or require clarification, please contact our support team for assistance.",
  timeline_unclaimed_intro: "Your shipment is currently marked as unclaimed.",
  timeline_unclaimed_detail: "The shipment is being held pending the next required action from the recipient or support team.",
  timeline_unclaimed_extra: "Please contact our support team as soon as possible for assistance regarding pickup, redelivery, or further instructions.",
  timeline_invalidaddress_intro: "Your shipment is currently on hold due to an address issue.",
  timeline_invalidaddress_detail: "We were unable to proceed normally because the destination address requires confirmation or correction.",
  timeline_invalidaddress_extra: "Please contact support to verify the correct delivery details so shipment processing can continue without further delay.",
  timeline_paymentissue_intro: "Your shipment has been updated to Payment Issue.",
  timeline_paymentissue_detail: "There is currently an issue affecting payment confirmation or processing for this shipment.",
  timeline_paymentissue_extra: "Please review the invoice and complete any required payment so shipment processing can resume normally.",
};

export default function PlaceholderContentPage() {
  const [content, setContent] = useState<ContentMap>({});
  const [edited, setEdited] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set([GROUPS[0].id]));
  const [globalMsg, setGlobalMsg] = useState("");

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/placeholder-content", { cache: "no-store" });
      const data = await res.json();
      const merged = { ...DEFAULT_CONTENT, ...(data?.content || {}) };
      setContent(merged);
      setEdited(merged);
    } catch {
      setContent(DEFAULT_CONTENT);
      setEdited(DEFAULT_CONTENT);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const getValue = (key: string) => edited[key] ?? DEFAULT_CONTENT[key] ?? "";

  const handleChange = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = (key: string) => (edited[key] ?? "") !== (content[key] ?? "");

  const saveAll = async () => {
    setSaving(true);
    setGlobalMsg("");
    try {
      const res = await fetch("/api/placeholder-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: edited }),
      });
      if (res.ok) {
        setContent(edited);
        setGlobalMsg("All placeholder content saved successfully.");
        setTimeout(() => setGlobalMsg(""), 3000);
      } else {
        setGlobalMsg("Failed to save. Please try again.");
      }
    } catch {
      setGlobalMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetKey = (key: string) => {
    setEdited((prev) => ({ ...prev, [key]: content[key] ?? "" }));
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalChanges = Object.keys(edited).filter((k) => hasChanges(k)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-md mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Placeholder Content</h1>
            <p className="mt-1 text-sm text-gray-500 max-w-xl">
              Edit the text behind each placeholder used in your email templates.
              Changes save to the database and affect all future emails immediately.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {totalChanges > 0 && (
              <span className="text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
                {totalChanges} unsaved change{totalChanges !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={saveAll}
              disabled={saving || totalChanges === 0}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </div>
        </div>
        {globalMsg && (
          <p className="mt-3 text-sm font-semibold text-gray-700">{globalMsg}</p>
        )}

        <div className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <code className="text-blue-500 text-xs mt-0.5 shrink-0">{"{{invoiceMessage}}"}</code>
              <span>Short status description in invoice emails</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-purple-500 text-xs mt-0.5 shrink-0">{"{{actionMessage}}"}</code>
              <span>Follow-up instruction paragraph in invoice emails</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-green-500 text-xs mt-0.5 shrink-0">{"{{paymentMessage}}"}</code>
              <span>Payment status paragraph in shipment created emails</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-orange-500 text-xs mt-0.5 shrink-0">{"{{closingText}}"}</code>
              <span>Text above the action button in all emails</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-cyan-500 text-xs mt-0.5 shrink-0">{"{{intro}} {{detail}} {{extra}}"}</code>
              <span>Three paragraphs in each timeline/tracking email</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-10 shadow-md text-center text-sm text-gray-500">
          Loading placeholder content...
        </div>
      ) : (
        <div className="space-y-3">
          {GROUPS.map((group) => {
            const colors = colorMap[group.color] || colorMap.blue;
            const isExpanded = expandedGroups.has(group.id);
            const groupHasChanges = group.items.some((item) => hasChanges(item.key));

            return (
              <div
                key={group.id}
                className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${colors.border}`}
              >
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition hover:bg-gray-50 ${colors.header}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <div>
                      <p className="font-extrabold text-gray-900 text-sm">{group.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {group.items.length} placeholder{group.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {groupHasChanges && (
                      <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                        edited
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">{isExpanded ? "v" : ">"}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => {
                      const changed = hasChanges(item.key);
                      return (
                        <div key={item.key} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                                {item.label}
                              </code>
                              {item.status && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusBadge[item.status] || "bg-gray-100 text-gray-600"}`}>
                                  {item.status}
                                </span>
                              )}
                              {changed && (
                                <span className="text-xs font-semibold text-orange-500">unsaved</span>
                              )}
                            </div>
                            {changed && (
                              <button
                                onClick={() => resetKey(item.key)}
                                className="text-xs text-gray-400 hover:text-gray-600 transition underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{item.description}</p>
                          <textarea
                            value={getValue(item.key)}
                            onChange={(e) => handleChange(item.key, e.target.value)}
                            rows={3}
                            className={`w-full rounded-xl border px-4 py-3 text-sm leading-relaxed resize-none outline-none transition ${
                              changed
                                ? "border-orange-300 bg-orange-50 focus:border-orange-400"
                                : "border-gray-200 bg-white focus:border-blue-300"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}