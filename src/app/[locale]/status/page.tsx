// src/app/[locale]/status/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Globe, Package, Bell, Wrench, ArrowLeft,
} from 'lucide-react';
import { useCompany } from '@/lib/useCompany';

type State = 'operational' | 'degraded' | 'down';

type Snapshot = {
  overall: State;
  components: { id: string; state: State }[];
  incident: { active: boolean; severity: string; title: string; body: string; startedAt: string | null } | null;
  checkedAt: string;
};

const COMPONENT_ICONS: Record<string, typeof Globe> = {
  website: Globe,
  tracking: Package,
  notifications: Bell,
};

const BCP: Record<string, string> = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', it: 'it-IT',
  ar: 'ar-SA', pt: 'pt-PT', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN',
};

const STATE_STYLES: Record<State, { dot: string; text: string; bg: string; border: string; Icon: typeof CheckCircle2 }> = {
  operational: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: CheckCircle2 },
  degraded:    { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   Icon: AlertTriangle },
  down:        { dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     Icon: XCircle },
};

export default function StatusPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const bcp = BCP[locale] || 'en-US';
  const company = useCompany();

  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('status unavailable');
      setData(await res.json());
      setFailed(false);
    } catch {
      /* If the status endpoint itself cannot be reached, saying so is
         more honest than showing a stale green page. */
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* Refresh while the tab is open, since this is a page people leave
     up during an outage. Paused when the tab is hidden. */
  useEffect(() => {
    const tick = () => { if (!document.hidden) void load(true); };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(bcp, { hour: '2-digit', minute: '2-digit' });
  };

  const fmtSince = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(bcp, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const overall = data?.overall ?? 'operational';
  const style = STATE_STYLES[overall];
  const OverallIcon = failed ? AlertTriangle : style.Icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">

        <div className="mb-8">
          <Link href={`/${locale}`}
            className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-700 transition">
            <ArrowLeft className="w-4 h-4" /> {intl.formatMessage({ id: 'Legal.backHome' })}
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-blue-700" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {t('Status.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('Status.subtitle', { company: company.name || 'Exodus Logistics' })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 font-medium">{t('Status.checking')}</p>
          </div>
        ) : failed ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-7 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-lg font-extrabold text-amber-900">{t('Status.unreachableTitle')}</p>
                <p className="mt-1.5 text-sm text-amber-800 leading-relaxed">{t('Status.unreachableBody')}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Overall banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`rounded-3xl border ${style.border} ${style.bg} p-6 sm:p-7 shadow-sm`}
            >
              <div className="flex items-start gap-3.5">
                <OverallIcon className={`w-7 h-7 shrink-0 mt-0.5 ${style.text}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-lg sm:text-xl font-extrabold ${style.text}`}>
                    {t(`Status.overall_${overall}`)}
                  </p>
                  <p className={`mt-1 text-sm leading-relaxed ${style.text} opacity-80`}>
                    {t(`Status.overallBody_${overall}`)}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Incident notice */}
            {data?.incident?.active && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 }}
                className="mt-4 rounded-3xl border border-blue-200 bg-white p-5 sm:p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {data.incident.severity === 'maintenance' && <Wrench className="w-3 h-3" />}
                    {t(`Status.severity_${data.incident.severity}`)}
                  </span>
                  {data.incident.startedAt && (
                    <span className="text-xs text-gray-400">
                      {t('Status.since', { time: fmtSince(data.incident.startedAt) })}
                    </span>
                  )}
                </div>
                {data.incident.title && (
                  <p className="text-base font-extrabold text-gray-900">{data.incident.title}</p>
                )}
                {data.incident.body && (
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {data.incident.body}
                  </p>
                )}
              </motion.div>
            )}

            {/* Components */}
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('Status.componentsTitle')}
                </p>
                <button
                  onClick={() => load(true)}
                  disabled={refreshing}
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-700 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {t('Status.refresh')}
                </button>
              </div>

              <ul className="divide-y divide-gray-100">
                {(data?.components || []).map(({ id, state }) => {
                  const Icon = COMPONENT_ICONS[id] || Globe;
                  const s = STATE_STYLES[state];
                  return (
                    <li key={id} className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900">{t(`Status.component_${id}`)}</p>
                          <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                            {t(`Status.componentDesc_${id}`)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        <span className={`text-xs font-bold ${s.text} whitespace-nowrap`}>
                          {t(`Status.state_${state}`)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {data?.checkedAt && (
                <div className="px-5 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    {t('Status.lastChecked', { time: fmtTime(data.checkedAt) })}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer note */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('Status.footerNote', {
              contact: (chunks: any) => (
                <Link href={`/${locale}/contact`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-semibold">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}