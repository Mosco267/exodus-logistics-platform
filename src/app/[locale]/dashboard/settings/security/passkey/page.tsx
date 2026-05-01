// src/app/[locale]/dashboard/settings/security/passkey/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Fingerprint, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff, X } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';

function PasswordModal({ accent, accentSolid, onConfirm, onClose, title, desc }: {
  accent: string; accentSolid: string;
  onConfirm: () => void; onClose: () => void;
  title: string; desc: string;
}) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pw) { setError('Password is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/user/verify-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Incorrect password'); setLoading(false); return; }
      onConfirm();
    } catch { setError('Something went wrong'); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="h-1 w-full" style={{ background: accent }} />
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-400">
              <X size={16} />
            </button>
          </div>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={e => { setPw(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Your current password"
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="off"
              autoFocus
              className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white/40 transition"
              style={{ fontSize: '16px' }}
            />
            <button type="button" tabIndex={-1} onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer p-1"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading || !pw}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
              style={{ background: accent }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PasskeyPage() {
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
      .finally(() => setReady(true));
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
        if (!optRes.ok) { setError(opts.error || 'Failed to start registration'); return; }
        const credential = await startRegistration(opts);
        const verRes = await fetch('/api/user/passkeys/register/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
        });
        const verData = await verRes.json();
        if (!verRes.ok) { setError(verData.error || 'Registration failed'); return; }
        setEnabled(true);
        setSuccess('Passkey enabled successfully. You can now use biometrics to sign in.');
      } catch (e: any) {
        if (e?.name === 'NotAllowedError') setError('Passkey registration was cancelled.');
        else setError('Registration failed. Please try again.');
      }
    } else {
      try {
        const res = await fetch('/api/user/passkeys/disable-all', { method: 'POST' });
        if (!res.ok) { setError('Failed to disable passkey'); return; }
        setEnabled(false);
        setSuccess('Passkey disabled. You will now sign in with your password.');
      } catch { setError('Something went wrong'); }
    }
    setLoading(false);
  };

  if (!ready) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
        style={{ borderTopColor: accentSolid }} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      {showModal && (
        <PasswordModal
          accent={accent}
          accentSolid={accentSolid}
          title={pendingEnable ? 'Enable Passkey' : 'Disable Passkey'}
          desc={pendingEnable ? 'Enter your password to enable passkey' : 'Enter your password to disable passkey'}
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
            style={isMidnight ? { color: '#ffffff' } : {}}>Passkey</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Sign in with biometrics or hardware key</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="w-2 h-5 rounded-full" style={{ background: accent }} />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Passkey Authentication</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            A passkey lets you sign in using your device's biometrics (Face ID, Touch ID, Windows Hello) or a hardware security key — no password needed. Passkeys are tied to this device.
          </p>

          {!webAuthnSupported && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">Your device or browser does not support passkeys. Please use a modern browser like Chrome, Safari, or Edge.</p>
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
                  {enabled ? 'Passkey Enabled' : 'Passkey Disabled'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {enabled ? 'You can sign in with biometrics' : 'Enable to sign in with biometrics'}
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
              {pendingEnable ? 'Registering passkey...' : 'Disabling passkey...'}
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