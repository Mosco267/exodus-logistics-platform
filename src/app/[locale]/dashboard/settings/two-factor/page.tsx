// src/app/[locale]/dashboard/settings/two-factor/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Smartphone, CheckCircle2,
  Loader2, ChevronRight,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import PasswordInput from '@/components/PasswordInput';

type TwoFaStatus = { emailEnabled: boolean; appEnabled: boolean };

const RESEND_SECONDS = 60;

function PasswordModal({ accent, onConfirm, onClose, title, desc }: {
  accent: string; onConfirm: () => void; onClose: () => void;
  title?: string; desc?: string;
}) {
  const [pw, setPw] = useState('');
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

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="h-1 w-full shrink-0" style={{ background: accent }} />
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {title || 'Confirm Your Password'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {desc || 'Enter your password to continue'}
            </p>
          </div>
          <PasswordInput
            value={pw}
            onChange={v => { setPw(v); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="Your current password"
            autoComplete="current-password"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading || !pw}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
              style={{ background: accent }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}

function CodeBoxes({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0,1,2,3,4,5].map(i => (
        <input key={i} id={`${id}-${i}`} type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ''}
          onChange={e => {
            const val = e.target.value.replace(/\D/g, '');
            if (!val) { const arr = value.split(''); arr[i] = ''; onChange(arr.join('')); return; }
            const arr = value.split(''); arr[i] = val[val.length-1]; onChange(arr.join(''));
            if (i < 5) { const next = document.getElementById(`${id}-${i+1}`); if (next) (next as HTMLInputElement).focus(); }
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              const prev = document.getElementById(`${id}-${i-1}`); if (prev) (prev as HTMLInputElement).focus();
            }
          }}
          onPaste={e => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            onChange(pasted.padEnd(6, '').slice(0, 6));
            const box = document.getElementById(`${id}-${Math.min(pasted.length, 5)}`);
            if (box) (box as HTMLInputElement).focus();
          }}
          className="text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none transition"
          style={{ fontSize: '20px', height: '52px', width: '44px' }} />
      ))}
    </div>
  );
}

export default function TwoFactorPage() {
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

  const [status, setStatus] = useState<TwoFaStatus>({ emailEnabled: false, appEnabled: false });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'enable-email' | 'disable-email' | 'enable-app' | 'disable-app' | null>(null);

  // Email 2FA — enable + disable both have verify steps now
  const [emailStep, setEmailStep] = useState<'idle' | 'verify-enable' | 'verify-disable'>('idle');
  const [emailCode, setEmailCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailSecondsLeft, setEmailSecondsLeft] = useState(0);
  const [emailResending, setEmailResending] = useState(false);
  const [emailResentMessage, setEmailResentMessage] = useState('');
  const emailIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emailExpiryRef = useRef<number | null>(null);

  // App 2FA
  const [appStep, setAppStep] = useState<'idle' | 'qr' | 'verify' | 'disable'>('idle');
  const [appQr, setAppQr] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [appCode, setAppCode] = useState('');
  const [appError, setAppError] = useState('');
  const [appLoading, setAppLoading] = useState(false);
  const [appSuccess, setAppSuccess] = useState('');
  const [appCopied, setAppCopied] = useState(false);

  useEffect(() => {
    fetch('/api/user/2fa/status-full')
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Countdown using wall-clock time (works when tab is hidden/minimized)
  const tickEmail = () => {
    if (!emailExpiryRef.current) return;
    const remaining = Math.max(0, Math.ceil((emailExpiryRef.current - Date.now()) / 1000));
    setEmailSecondsLeft(remaining);
    if (remaining <= 0 && emailIntervalRef.current) {
      clearInterval(emailIntervalRef.current);
      emailIntervalRef.current = null;
    }
  };

  const startEmailCountdown = () => {
    emailExpiryRef.current = Date.now() + RESEND_SECONDS * 1000;
    setEmailSecondsLeft(RESEND_SECONDS);
    if (emailIntervalRef.current) clearInterval(emailIntervalRef.current);
    emailIntervalRef.current = setInterval(tickEmail, 1000);
  };

  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) tickEmail(); };
    const onFocus = () => tickEmail();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      if (emailIntervalRef.current) clearInterval(emailIntervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const requestAction = (action: typeof pendingAction) => {
    setPendingAction(action);
    setShowPasswordModal(true);
  };

  const onPasswordConfirmed = async () => {
    setShowPasswordModal(false);
    if (pendingAction === 'enable-email') await startEmailEnable();
    else if (pendingAction === 'disable-email') await startEmailDisable();
    else if (pendingAction === 'enable-app') await startAppSetup();
    else if (pendingAction === 'disable-app') { setAppStep('disable'); setAppCode(''); setAppError(''); }
    setPendingAction(null);
  };

  const startEmailEnable = async () => {
    setAppStep('idle'); setAppCode(''); setAppError('');
    setEmailError(''); setEmailLoading(true); setEmailResentMessage('');
    try {
      const res = await fetch('/api/user/2fa/email/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Failed'); return; }
      setEmailStep('verify-enable'); setEmailCode('');
      startEmailCountdown();
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  const startEmailDisable = async () => {
    setAppStep('idle'); setAppCode(''); setAppError('');
    setEmailError(''); setEmailLoading(true); setEmailResentMessage('');
    try {
      const res = await fetch('/api/user/2fa/email/send-disable-code', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Failed'); return; }
      setEmailStep('verify-disable'); setEmailCode('');
      startEmailCountdown();
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  const handleResendEmailCode = async () => {
    if (emailSecondsLeft > 0) return;
    setEmailResending(true);
    setEmailError('');
    setEmailResentMessage('');
    try {
      const endpoint = emailStep === 'verify-disable'
        ? '/api/user/2fa/email/send-disable-code'
        : '/api/user/2fa/email/setup';
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setEmailError(data.error || 'Failed to resend');
        return;
      }
      setEmailResentMessage('A new code has been sent to your email.');
      setTimeout(() => setEmailResentMessage(''), 4000);
      startEmailCountdown();
    } catch {
      setEmailError('Failed to resend code.');
    } finally {
      setEmailResending(false);
    }
  };

  const verifyEmailEnable = async () => {
    if (emailCode.length < 6) { setEmailError('Enter the 6-digit code'); return; }
    setEmailLoading(true); setEmailError('');
    try {
      const res = await fetch('/api/user/2fa/email/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Invalid code'); return; }
      setStatus(s => ({ ...s, emailEnabled: true }));
      setEmailStep('idle'); setEmailCode('');
      if (emailIntervalRef.current) clearInterval(emailIntervalRef.current);
      setEmailSecondsLeft(0);
      setEmailSuccess('Email 2FA enabled — confirmation email sent'); setTimeout(() => setEmailSuccess(''), 3500);
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  const verifyEmailDisable = async () => {
    if (emailCode.length < 6) { setEmailError('Enter the 6-digit code'); return; }
    setEmailLoading(true); setEmailError('');
    try {
      const res = await fetch('/api/user/2fa/email/disable', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Invalid code'); return; }
      setStatus(s => ({ ...s, emailEnabled: false }));
      setEmailStep('idle'); setEmailCode('');
      if (emailIntervalRef.current) clearInterval(emailIntervalRef.current);
      setEmailSecondsLeft(0);
      setEmailSuccess('Email 2FA disabled — confirmation email sent'); setTimeout(() => setEmailSuccess(''), 3500);
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  const startAppSetup = async () => {
    setEmailStep('idle'); setEmailCode(''); setEmailError('');
    setAppError(''); setAppLoading(true);
    try {
      const res = await fetch('/api/user/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setAppError(data.error || 'Failed'); return; }
      setAppQr(data.qrCodeDataUrl); setAppSecret(data.manualEntryKey);
      setAppStep('qr');
    } catch { setAppError('Something went wrong'); }
    finally { setAppLoading(false); }
  };

  const verifyAppCode = async () => {
    if (appCode.length < 6) { setAppError('Enter the 6-digit code'); return; }
    setAppLoading(true); setAppError('');
    try {
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: appCode, purpose: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok) { setAppError(data.error || 'Invalid code'); return; }
      setStatus(s => ({ ...s, appEnabled: true }));
      setAppStep('idle'); setAppCode('');
      setAppSuccess('Authenticator app enabled — confirmation email sent'); setTimeout(() => setAppSuccess(''), 3500);
    } catch { setAppError('Something went wrong'); }
    finally { setAppLoading(false); }
  };

  const disableApp = async () => {
    if (appCode.length < 6) { setAppError('Enter code to confirm'); return; }
    setAppLoading(true); setAppError('');
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: appCode }),
      });
      const data = await res.json();
      if (!res.ok) { setAppError(data.error || 'Invalid code'); return; }
      setStatus(s => ({ ...s, appEnabled: false }));
      setAppStep('idle'); setAppCode('');
      setAppSuccess('Authenticator app disabled — confirmation email sent'); setTimeout(() => setAppSuccess(''), 3500);
    } catch { setAppError('Something went wrong'); }
    finally { setAppLoading(false); }
  };

  const cancelEmailVerify = () => {
    setEmailStep('idle');
    setEmailCode('');
    setEmailError('');
    setEmailResentMessage('');
    if (emailIntervalRef.current) clearInterval(emailIntervalRef.current);
    setEmailSecondsLeft(0);
  };

  return (
    <>
      {!ready ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
            style={{ borderTopColor: accentSolid }} />
        </div>
      ) : (
      <div className="max-w-2xl mx-auto space-y-5 pb-10">
        {showPasswordModal && (
          <PasswordModal accent={accent} onConfirm={onPasswordConfirmed} onClose={() => { setShowPasswordModal(false); setPendingAction(null); }} />
        )}

        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/${locale}/dashboard/settings`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
            <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
              style={isMidnight ? { color: '#ffffff' } : {}}>Two-Factor Authentication</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Add extra security to your account</p>
          </div>
        </div>

        {/* ── EMAIL 2FA ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
            <div className="w-2 h-5 rounded-full" style={{ background: accent }} />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail size={15} /> Email Authentication
                {status.emailEnabled && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Active</span>
                )}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Receive a verification code to your email when creating shipments</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {emailSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={13} />{emailSuccess}
              </p>
            )}

            {emailStep === 'idle' && (
              status.emailEnabled ? (
                <button onClick={() => requestAction('disable-email')} disabled={emailLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white cursor-pointer hover:bg-red-700 transition disabled:opacity-60">
                  {emailLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Disable Email 2FA
                </button>
              ) : (
                <button onClick={() => requestAction('enable-email')} disabled={emailLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer hover:opacity-90 transition disabled:opacity-60"
                  style={{ background: accent }}>
                  {emailLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  {emailLoading ? 'Setting up...' : 'Enable Email 2FA'}
                </button>
              )
            )}

            {(emailStep === 'verify-enable' || emailStep === 'verify-disable') && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {emailStep === 'verify-enable'
                    ? 'A 6-digit code has been sent to your email. Enter it below to activate.'
                    : 'A 6-digit code has been sent to your email. Enter it below to confirm disabling email 2FA.'}
                </p>
                <CodeBoxes id="email2fa" value={emailCode} onChange={setEmailCode} />
                {emailError && <p className="text-xs text-red-500 text-center font-medium">{emailError}</p>}
                {emailResentMessage && <p className="text-xs text-emerald-600 text-center font-medium">{emailResentMessage}</p>}

                <div className="text-center">
                  {emailSecondsLeft > 0 ? (
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Resend code in <span className="font-bold text-gray-900 dark:text-white">{emailSecondsLeft}s</span>
                    </p>
                  ) : (
                    <button onClick={handleResendEmailCode} disabled={emailResending}
                      className="text-xs font-semibold transition cursor-pointer disabled:opacity-50 hover:opacity-80"
  style={{ background: accent, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
  {emailResending ? 'Sending...' : <>Didn't receive a code? <span className="underline underline-offset-2">Resend</span></>}
                    </button>
                  )}
                </div>

                <div className="flex gap-2.5">
                  <button onClick={cancelEmailVerify}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                    Cancel
                  </button>
                  <button onClick={emailStep === 'verify-enable' ? verifyEmailEnable : verifyEmailDisable}
                    disabled={emailLoading || emailCode.length < 6}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50 ${emailStep === 'verify-disable' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    style={emailStep === 'verify-enable' ? { background: accent } : {}}>
                    {emailLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {emailLoading ? (emailStep === 'verify-enable' ? 'Activating...' : 'Disabling...') : (emailStep === 'verify-enable' ? 'Activate' : 'Disable')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── APP 2FA ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
            <div className="w-2 h-5 rounded-full" style={{ background: accent }} />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone size={15} /> Authenticator App
                {status.appEnabled && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Active</span>
                )}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use Google Authenticator, Microsoft Authenticator, or Authy</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {appSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={13} />{appSuccess}
              </p>
            )}

            {appStep === 'idle' && (
              status.appEnabled ? (
                <button onClick={() => requestAction('disable-app')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white cursor-pointer hover:bg-red-700 transition">
                  Disable Authenticator App
                </button>
              ) : (
                <button onClick={() => requestAction('enable-app')} disabled={appLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer hover:opacity-90 transition disabled:opacity-60"
                  style={{ background: accent }}>
                  {appLoading ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
                  {appLoading ? 'Setting up...' : 'Set Up Authenticator App'}
                </button>
              )
            )}

            {appStep === 'qr' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Step 1 — Download an Authenticator App</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Download <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> from the App Store or Google Play.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Step 2 — Scan the QR Code</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Open your authenticator app, tap the <strong>+</strong> button, then choose <strong>Scan QR code</strong>.</p>
                  <div className="flex justify-center py-2">
                    <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm inline-block">
                      <img src={appQr} alt="QR Code" className="w-48 h-48" style={{ imageRendering: 'pixelated' }} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Step 3 — Or Enter the Key Manually</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tap <strong>Enter key manually</strong> in the app and type this key:</p>
                  <div className="flex items-center rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gray-50 dark:bg-white/5">
                    <div className="flex-1 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                      <span className="text-xs font-mono text-gray-700 dark:text-gray-300 tracking-[0.12em] whitespace-nowrap">
                        {appSecret}
                      </span>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(appSecret); setAppCopied(true); setTimeout(() => setAppCopied(false), 2000); }}
                      className="shrink-0 px-4 py-3 text-xs font-bold cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-white/10 transition whitespace-nowrap"
                      style={{ color: accentSolid }}>
                      {appCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1.5">
                    ⚠️ Use the Copy button. Do not type this manually to avoid mistakes.
                  </p>
                </div>
                <button onClick={() => setAppStep('verify')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer"
                  style={{ background: accent }}>
                  Next — Enter Verification Code
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            {appStep === 'verify' && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Step 4 — Enter the 6-Digit Code</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Open the authenticator app and enter the 6-digit code shown for Exodus Logistics.</p>
                <CodeBoxes id="app2fa" value={appCode} onChange={setAppCode} />
                {appError && <p className="text-xs text-red-500 text-center font-medium">{appError}</p>}
                <div className="flex gap-2.5">
                  <button onClick={() => { setAppStep('qr'); setAppCode(''); setAppError(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                    Back
                  </button>
                  <button onClick={verifyAppCode} disabled={appLoading || appCode.length < 6}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                    style={{ background: accent }}>
                    {appLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {appLoading ? 'Activating...' : 'Activate 2FA'}
                  </button>
                </div>
              </div>
            )}

            {appStep === 'disable' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Enter the 6-digit code from your authenticator app to disable it.</p>
                <CodeBoxes id="disable2fa" value={appCode} onChange={setAppCode} />
                {appError && <p className="text-xs text-red-500 text-center font-medium">{appError}</p>}
                <div className="flex gap-2.5">
                  <button onClick={() => { setAppStep('idle'); setAppCode(''); setAppError(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                    Cancel
                  </button>
                  <button onClick={disableApp} disabled={appLoading || appCode.length < 6}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold transition hover:bg-red-700 cursor-pointer disabled:opacity-50">
                    {appLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {appLoading ? 'Disabling...' : 'Disable'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
}