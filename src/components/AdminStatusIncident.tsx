// src/components/AdminStatusIncident.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, AlertTriangle, Activity, ExternalLink } from 'lucide-react';

type Severity = 'investigating' | 'identified' | 'monitoring' | 'maintenance';

const SEVERITY_LABELS: Record<Severity, string> = {
  investigating: 'Investigating',
  identified: 'Cause identified',
  monitoring: 'Monitoring',
  maintenance: 'Scheduled maintenance',
};

export default function AdminStatusIncident({ locale = 'en' }: { locale?: string }) {
  const [active, setActive] = useState(false);
  const [severity, setSeverity] = useState<Severity>('investigating');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/status-incident', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.incident) {
          setActive(Boolean(json.incident.active));
          setSeverity((json.incident.severity as Severity) || 'investigating');
          setTitle(String(json.incident.title || ''));
          setBody(String(json.incident.body || ''));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setOk(''); setErr('');
    try {
      const res = await fetch('/api/admin/status-incident', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active, severity, title, body }),
      });
      if (!res.ok) { setErr('Could not save'); return; }
      setOk('Saved');
      window.setTimeout(() => setOk(''), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Status page notice
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-lg leading-relaxed">
            Automated checks tell customers whether systems respond. They cannot explain
            what is happening or when it will be fixed. Post a notice here when something
            is wrong, and customers see it on the public status page.
          </p>
          {ok && <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-300">{ok}</p>}
          {err && <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">{err}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href={`/${locale}/status`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
            <ExternalLink className="w-3.5 h-3.5" /> View page
          </a>
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 cursor-pointer">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Toggle */}
      <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Show notice on the status page</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Turn this on during an incident or planned maintenance. Turn it off once resolved.
          </p>
        </div>
        <button
          type="button" role="switch" aria-checked={active}
          onClick={() => setActive(v => !v)}
          className={`relative shrink-0 w-12 h-7 rounded-full transition cursor-pointer ${active ? 'bg-amber-500' : 'bg-gray-300 dark:bg-white/20'}`}
        >
          <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {active && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3.5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            This notice is public. Write it for a customer rather than an engineer, and avoid
            naming internal systems or providers.
          </p>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Stage</label>
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value as Severity)}
            className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm cursor-pointer focus:outline-none focus:border-blue-400"
          >
            {(Object.keys(SEVERITY_LABELS) as Severity[]).map(s => (
              <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Headline</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 200))}
            placeholder="For example: Tracking updates are delayed"
            className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-gray-400">{title.length}/200</p>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Details</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 1000))}
            placeholder="What customers can expect, and what they should do in the meantime. Update this as the situation changes."
            className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm min-h-[110px] resize-none focus:outline-none focus:border-blue-400"
          />
          <p className="mt-1 text-xs text-gray-400">
            {body.length}/1000 — shown as written, so it stays in the language you type it in.
          </p>
        </div>
      </div>
    </div>
  );
}