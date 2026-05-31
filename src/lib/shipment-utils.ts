// src/lib/shipment-utils.ts
import type { IntlShape } from 'react-intl';
import {
  Package, Truck, CheckCircle2, AlertCircle, Clock3,
} from 'lucide-react';

// ─── Color palette shared across all status badges ─────────────
export const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  blue:    { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",       text: "text-blue-700 dark:text-blue-300",       icon: Truck },
  green:   { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  red:     { bg: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",           text: "text-red-700 dark:text-red-300",         icon: AlertCircle },
  orange:  { bg: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300", text: "text-orange-700 dark:text-orange-300", icon: AlertCircle },
  yellow:  { bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300", text: "text-yellow-700 dark:text-yellow-300", icon: Clock3 },
  purple:  { bg: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300", text: "text-purple-700 dark:text-purple-300", icon: Package },
  emerald: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
 slate:   { bg: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",       text: "text-slate-700 dark:text-slate-300",     icon: Package },
  gray:    { bg: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",          text: "text-gray-700 dark:text-gray-300",       icon: Package },
  cyan:    { bg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",       text: "text-cyan-700 dark:text-cyan-300",       icon: Truck },
};

// ─── SHIPMENT STATUS ───────────────────────────────────────────
export type ShipmentStatusKey =
  | 'created' | 'intransit' | 'customclearance' | 'delivered' | 'unclaimed' | 'cancelled';

export function normalizeShipmentStatusKey(status?: string): string {
  const s = String(status || '').toLowerCase().trim().replace(/[\s_-]+/g, '');
  if (!s) return 'created';
  if (s === 'delivered') return 'delivered';
  if (s === 'intransit') return 'intransit';
  if (s === 'customclearance' || s === 'customs') return 'customclearance';
  if (s === 'unclaimed') return 'unclaimed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'created') return 'created';
  if (s === 'pickedup' || s === 'picked') return 'pickedup';
  if (s === 'inwarehouse' || s === 'warehouse' || s === 'atwarehouse') return 'inwarehouse';
  if (s === 'outfordelivery' || s === 'outdelivery') return 'outfordelivery';
  return s; // admin custom status — return as-is
}

export function getShipmentStatusLabel(status: string | undefined, intl: IntlShape): string {
  const key = normalizeShipmentStatusKey(status);
  return intl.formatMessage({ id: `ShipmentStatus.${key}`, defaultMessage: status || '—' });
}

export function getShipmentStatusBadge(
  status: string | undefined,
  intl: IntlShape,
  options?: { statusMap?: Record<string, { color?: string }>; statusColor?: string }
) {
  const key = normalizeShipmentStatusKey(status);
  const adminColor = (options?.statusMap?.[key]?.color || '').toLowerCase();
  const fallbackColor = (options?.statusColor || '').toLowerCase();

  let colorEntry = STATUS_COLORS.slate;
  if (adminColor && STATUS_COLORS[adminColor]) colorEntry = STATUS_COLORS[adminColor];
  else if (fallbackColor && STATUS_COLORS[fallbackColor]) colorEntry = STATUS_COLORS[fallbackColor];
  else if (key === 'delivered') colorEntry = STATUS_COLORS.green;
  else if (key === 'intransit') colorEntry = STATUS_COLORS.blue;
  else if (key === 'customclearance') colorEntry = STATUS_COLORS.orange;
  else if (key === 'unclaimed') colorEntry = STATUS_COLORS.red;
  else if (key === 'cancelled') colorEntry = STATUS_COLORS.red;
  else if (key === 'pickedup') colorEntry = STATUS_COLORS.blue;
  else if (key === 'inwarehouse') colorEntry = STATUS_COLORS.purple;
  else if (key === 'outfordelivery') colorEntry = STATUS_COLORS.cyan;
  // 'created' or unknown stays slate

  return { ...colorEntry, label: getShipmentStatusLabel(status, intl) };
}

// ─── INVOICE STATUS ────────────────────────────────────────────
export function normalizeInvoiceStatusKey(status?: string): string {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'paid') return 'paid';
  if (s === 'overdue') return 'overdue';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'unpaid';
}

export function getInvoiceStatusLabel(status: string | undefined, intl: IntlShape): string {
  const key = normalizeInvoiceStatusKey(status);
  return intl.formatMessage({ id: `InvoiceStatus.${key}` });
}

export function getInvoiceStatusBadge(status: string | undefined, intl: IntlShape) {
  const key = normalizeInvoiceStatusKey(status);
  const label = getInvoiceStatusLabel(status, intl);
  if (key === 'paid')      return { label, bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30",  text: "text-green-700 dark:text-green-400" };
  if (key === 'overdue')   return { label, bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30",          text: "text-red-700 dark:text-red-400" };
  if (key === 'cancelled') return { label, bg: "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/20",              text: "text-gray-700 dark:text-gray-300" };
  return                          { label, bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
}

// ─── SHIPMENT MEANS ────────────────────────────────────────────
// Accepts: keys ('air'), English labels ('Air Freight'), or even old French labels — normalizes to a key.
export function normalizeShipmentMeansKey(means?: string): string {
  const s = String(means || '').toLowerCase().trim();
  if (s === 'air' || s === 'sea' || s === 'land') return s;
  if (s.includes('air')) return 'air';
  if (s.includes('sea') || s.includes('ocean')) return 'sea';
  if (s.includes('land') || s.includes('road') || s.includes('truck')) return 'land';
  return s;
}

export function getShipmentMeansLabel(means: string | undefined, intl: IntlShape): string {
  const key = normalizeShipmentMeansKey(means);
  return intl.formatMessage({ id: `ShipmentMeans.${key}`, defaultMessage: means || '—' });
}

// ─── SHIPMENT TYPE (Package Type) ──────────────────────────────
export function normalizeShipmentTypeKey(type?: string): string {
  const s = String(type || '').toLowerCase().trim();
  if (s === 'documents' || s === 'document') return 'documents';
  if (s === 'parcel') return 'parcel';
  if (s === 'electronics') return 'electronics';
  if (s === 'clothing') return 'clothing';
  if (s === 'food & perishables' || s === 'food' || s.includes('perishable')) return 'food';
  if (s === 'furniture') return 'furniture';
  if (s === 'machinery') return 'machinery';
  if (s === 'bulk / pallet' || s === 'bulk' || s === 'pallet') return 'bulk';
  if (s === 'container') return 'container';
  if (s === 'other') return 'other';
  return ''; // empty = custom value typed by user
}

export function getShipmentTypeLabel(type: string | undefined, intl: IntlShape): string {
  const key = normalizeShipmentTypeKey(type);
  if (!key) return type || '—'; // user-typed custom type stays as-is
  return intl.formatMessage({ id: `ShipmentType.${key}`, defaultMessage: type || '—' });
}

// ─── SERVICE LEVEL ─────────────────────────────────────────────
export function normalizeServiceLevelKey(level?: string): string {
  const s = String(level || '').toLowerCase().trim();
  if (s === 'express') return 'express';
  if (s === 'standard') return 'standard';
  return s;
}

export function getServiceLevelLabel(level: string | undefined, intl: IntlShape): string {
  const key = normalizeServiceLevelKey(level);
  return intl.formatMessage({ id: `ServiceLevel.${key}`, defaultMessage: level || '—' });
}

// ─── DATE FORMATTING (use everywhere instead of hardcoded en-GB) ──
const BCP47_MAP: Record<string, string> = {
  en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE",
  zh: "zh-CN", it: "it-IT", ar: "ar-SA", pt: "pt-PT",
  ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", hi: "hi-IN",
};

export function getBcp47Locale(locale: string): string {
  return BCP47_MAP[locale] || "en-US";
}

export function fmtShipmentDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(getBcp47Locale(locale), { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtShipmentDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(getBcp47Locale(locale), {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}