// src/app/[locale]/dashboard/settings/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Loader2, CheckCircle2 } from 'lucide-react';

type NotifSettings = { shipmentUpdates: boolean; invoiceAlerts: boolean; deliveryAlerts: boolean; promotions: boolean };

export default function NotificationsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');
  const [isMidnight, setIsMidnight] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map: Record<string, { g: string; s: string }> = {
      default: { g: 'linear-gradient(135deg, #0b3aa4, #0e7490)', s: '#0b3aa4' },
      ocean: { g: 'linear-gradient(135deg, #0e7490, #06b6d4)', s: '#0891b2' },
      sunset: { g: 'linear-gradient(135deg, #0b3aa4, #f97316)', s: '#f97316' },
      arctic: { g: 'linear-gradient(135deg, #0284c7, #bae6fd)', s: '#0284c7' },
      midnight: { g: 'linear-gradient(135deg, #0f172a, #0e7490)', s: '#06b6d4' },
    };
    const apply = () => {
      const c = localStorage.getItem('exodus_theme_cache');
      if (c && map[c]) { setAccent(map[c].g); setAccentSolid(map[c].s); }
      setIsMidnight(c === 'midnight');
    };
    apply();
    window.addEventListener('storage', apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  const [notifs, setNotifs] = useState<NotifSettings>({ shipmentUpdates: true, invoiceAlerts: true, deliveryAlerts: true, promotions: false });
  const [saved, setSaved] = useState<NotifSettings>({ shipmentUpdates: true, invoiceAlerts: true, deliveryAlerts: true, promotions: false });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const changed = JSON.stringify(notifs) !== JSON.stringify(saved);

  useEffect(() => {
    fetch('/api/user/notifications')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object' && 'shipmentUpdates' in d) {
          setNotifs(d); setSaved(d);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifs),
      });
      setSaved({ ...notifs }); setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch {}
    finally { setSaving(false); }
  };

  const items = [
    { key: 'shipmentUpdates' as keyof NotifSettings, label: 'Shipment Updates', desc: 'Get notified when your shipment status changes' },
    { key: 'invoiceAlerts' as keyof NotifSettings, label: 'Invoice Alerts', desc: 'Receive alerts for new or unpaid invoices' },
    { key: 'deliveryAlerts' as keyof NotifSettings, label: 'Delivery Alerts', desc: 'Get notified when a shipment is delivered' },
    { key: 'promotions' as keyof NotifSettings, label: 'Promotions', desc: 'Receive news, tips and promotional offers' },
  ];

  if (!ready) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
        style={{ borderTopColor: accentSolid }} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/dashboard/settings`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
            style={isMidnight ? { color: '#ffffff' } : {}}>Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Control what emails and alerts you receive</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="w-2 h-5 rounded-full" style={{ background: accent }} />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Email Notifications</h2>
        </div>
        <div className="p-5 space-y-4">
          {items.map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4 py-1.5">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                className="relative rounded-full transition-all duration-200 cursor-pointer shrink-0 mt-0.5"
                style={{ width: 42, height: 24, background: notifs[key] ? accentSolid : '#d1d5db' }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: notifs[key] ? 18 : 2 }} />
              </button>
            </div>
          ))}

          {success && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={13} />Preferences saved
            </p>
          )}

          <div className="pt-2 border-t border-gray-100 dark:border-white/10">
            <button onClick={handleSave} disabled={saving || !changed}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
              style={{ background: accent }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}