// src/app/[locale]/dashboard/settings/security/passkey/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Fingerprint, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { createPortal } from 'react-dom';
import PasswordInput from '@/components/PasswordInput';
import { useIntl, type IntlShape } from 'react-intl';

function PasswordModal({ accent, accentSolid, onConfirm, onClose, title, desc, intl }: {
  accent: string; accentSolid: string; onConfirm: () => void; onClose: () => void;
  title?: string; desc?: string; intl: IntlShape;
}) {
  const tt = (id: string) => intl.formatMessage({ id });
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pw) { setError(tt('Passkey.errPasswordRequired')); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/user/verify-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || tt('Passkey.errIncorrectPassword')); setLoading(false); return; }
      onConfirm();
    } catch { setError(tt('Passkey.errGeneric')); setLoading(false); }
  };

  return typeof document !== 'undefined' ? createPortal(
  <div className="fixed inset-0 z-[99999] flex flex-col"
    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
    <div className="h-1 w-full shrink-0" style={{ background: accent }} />
    <div className="flex-1 flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {title || tt('Passkey.confirmPasswordTitle')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {desc || tt('Passkey.confirmPasswordDesc')}
            </p>
          </div>
          <PasswordInput
            value={pw}
            onChange={v => { setPw(v); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder={tt('Passkey.passwordPlaceholder')}
            autoComplete="current-password"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
              {tt('Passkey.cancel')}
            </button>
            <button onClick={handleSubmit} disabled={loading || !pw}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
              style={{ background: accent }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? tt('Passkey.verifying') : tt('Passkey.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>,
  document.body
    ) : null;
}

export default function PasskeyPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');
  const [isMidnight, setIsMidnight] = useState(false);
  

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

  const [enabled, setEnabled] = useState(false);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);

  useEffect(() => {
    setWebAuthnSupported(
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      !!navigator.credentials
    );
    fetch('/api/user/passkeys')
      .then(r => r.json())
      .then(d => { setEnabled((d.passkeys || []).length > 0); })
      .catch(() => {})
      .finally(() => {});
  }, []);

  const handleToggle = (newValue: boolean) => {
    setError(''); setSuccess('');
    setPendingEnable(newValue);
    setShowModal(true);
  };

  const onPasswordConfirmed = async () => {
    setShowModal(false);
    setLoading(true); setError('');
    if (pendingEnable) {
      try {
        const optRes = await fetch('/api/user/passkeys/register/options', { method: 'POST' });
        const opts = await optRes.json();
        if (!optRes.ok) { setError(opts.error || t('Passkey.errStartFailed')); return; }
        const credential = await startRegistration(opts);
        const verRes = await fetch('/api/user/passkeys/register/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });
        const verData = await verRes.json();
        if (!verRes.ok) { setError(verData.error || t('Passkey.errRegFailed')); return; }
        setEnabled(true);
        setSuccess(t('Passkey.successEnabled'));
      } catch (e: any) {
        if (e?.name === 'NotAllowedError') setError(t('Passkey.errCancelled'));
        else setError(t('Passkey.errRegRetry'));
      }
    } else {
      try {
        const res = await fetch('/api/user/passkeys/disable-all', { method: 'POST' });
        if (!res.ok) { setError(t('Passkey.errDisableFailed')); return; }
        setEnabled(false);
        setSuccess(t('Passkey.successDisabled'));
      } catch { setError(t('Passkey.errGeneric')); }
    }
    setLoading(false);
  };

 

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      {showModal && (
        <PasswordModal
          accent={accent}
          accentSolid={accentSolid}
          intl={intl}
          title={pendingEnable ? t('Passkey.enableTitle') : t('Passkey.disableTitle')}
          desc={pendingEnable ? t('Passkey.enableDesc') : t('Passkey.disableDesc')}
          onConfirm={onPasswordConfirmed}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/dashboard/settings/security`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
            style={isMidnight ? { color: '#ffffff' } : {}}>{t('Passkey.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('Passkey.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="w-2 h-5 rounded-full" style={{ background: accent }} />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('Passkey.authentication')}</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {t('Passkey.explainer')}
          </p>

          {!webAuthnSupported && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('Passkey.notSupported')}</p>
            </div>
          )}

          {/* Toggle row */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-100 dark:bg-white/10'}`}>
                <Fingerprint size={18} className={enabled ? 'text-emerald-600' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {enabled ? t('Passkey.statusEnabled') : t('Passkey.statusDisabled')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {enabled ? t('Passkey.statusEnabledDesc') : t('Passkey.statusDisabledDesc')}
                </p>
              </div>
            </div>
            <button
              onClick={() => { if (!loading && webAuthnSupported) handleToggle(!enabled); }}
              disabled={loading || !webAuthnSupported}
              className="relative rounded-full transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-50"
              style={{ width: 48, height: 26, background: enabled ? accentSolid : '#d1d5db' }}>
              <span
                className="absolute top-[3px] w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: enabled ? 24 : 3 }} />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" style={{ color: accentSolid }} />
              {pendingEnable ? t('Passkey.registering') : t('Passkey.disabling')}
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          {success && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={13} />{success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}