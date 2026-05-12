// src/lib/support-utils.ts

// ─── Categories ────────────────────────────────────────────
export const SUPPORT_CATEGORIES = [
  { id: "billing", label: "Billing", emoji: "💳" },
  { id: "shipment", label: "Shipment Issue", emoji: "📦" },
  { id: "account", label: "Account", emoji: "👤" },
  { id: "technical", label: "Technical Issue", emoji: "🛠️" },
  { id: "feature", label: "Feature Request", emoji: "💡" },
  { id: "other", label: "Other", emoji: "💬" },
] as const;

export type SupportCategoryId = (typeof SUPPORT_CATEGORIES)[number]["id"];

export function categoryLabel(id: string): string {
  return SUPPORT_CATEGORIES.find(c => c.id === id)?.label || "Support";
}

export function categoryEmoji(id: string): string {
  return SUPPORT_CATEGORIES.find(c => c.id === id)?.emoji || "💬";
}

// ─── Ticket statuses ──────────────────────────────────────
export type TicketStatus = "open" | "awaiting_customer" | "in_progress" | "resolved" | "closed";

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    open: "Open",
    awaiting_customer: "Awaiting Customer",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  return map[s] || s;
}

export function statusColor(s: string): {
  bg: string; text: string; border: string; dot: string;
} {
  switch (s) {
    case "open":
      return {
        bg: "bg-blue-50 dark:bg-blue-500/10",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-500/30",
        dot: "bg-blue-500",
      };
    case "awaiting_customer":
      return {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-500/30",
        dot: "bg-amber-500",
      };
    case "in_progress":
      return {
        bg: "bg-purple-50 dark:bg-purple-500/10",
        text: "text-purple-700 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-500/30",
        dot: "bg-purple-500",
      };
    case "resolved":
      return {
        bg: "bg-green-50 dark:bg-green-500/10",
        text: "text-green-700 dark:text-green-400",
        border: "border-green-200 dark:border-green-500/30",
        dot: "bg-green-500",
      };
    case "closed":
      return {
        bg: "bg-gray-50 dark:bg-white/5",
        text: "text-gray-700 dark:text-gray-300",
        border: "border-gray-200 dark:border-white/20",
        dot: "bg-gray-400",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-white/5",
        text: "text-gray-700 dark:text-gray-300",
        border: "border-gray-200 dark:border-white/10",
        dot: "bg-gray-400",
      };
  }
}

// ─── File size helpers ────────────────────────────────────
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_MESSAGE = 3;

export function fmtFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ─── Date helpers ─────────────────────────────────────────
export function fmtChatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });

  if (sameDay) return time;
  if (isYesterday) return `Yesterday ${time}`;

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" }) + " " + time;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + time;
}

export function fmtRelativeShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}