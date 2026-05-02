// src/app/[locale]/dashboard/settings/two-factor/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Shield, Mail, Smartphone, CheckCircle2,
  Loader2, Eye, EyeOff, ChevronRight, X,
} from 'lucide-react';

type TwoFaStatus = { emailEnabled: boolean; appEnabled: boolean };

function PasswordModal({ accent, onConfirm, onClose, title, desc }: {
  accent: string; onConfirm: () => void; onClose: () => void;
  title?: string; desc?: string;
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
    <div className="fixed inset-0 z-[99999] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      {/* Top accent bar */}
      <div className="h-1 w-full shrink-0" style={{ background: accent }} />
      {/* Centered content */}
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
    </div>
  );
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

  // Email 2FA
  const [emailStep, setEmailStep] = useState<'idle' | 'verify'>('idle');
  const [emailCode, setEmailCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

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

  const requestAction = (action: typeof pendingAction) => {
    setPendingAction(action);
    setShowPasswordModal(true);
  };

  const onPasswordConfirmed = async () => {
    setShowPasswordModal(false);
    if (pendingAction === 'enable-email') await startEmailSetup();
    else if (pendingAction === 'disable-email') await disableEmail();
    else if (pendingAction === 'enable-app') await startAppSetup();
    else if (pendingAction === 'disable-app') { setAppStep('disable'); setAppCode(''); setAppError(''); }
    setPendingAction(null);
  };

  const startEmailSetup = async () => {
  // Close app setup if open
  setAppStep('idle'); setAppCode(''); setAppError('');
  setEmailError(''); setEmailLoading(true);
  // ...rest unchanged
    try {
      const res = await fetch('/api/user/2fa/email/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Failed'); return; }
      setEmailStep('verify'); setEmailCode('');
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  const verifyEmailCode = async () => {
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
      setEmailSuccess('Email 2FA enabled'); setTimeout(() => setEmailSuccess(''), 3000);
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  const disableEmail = async () => {
    setEmailLoading(true);
    try {
      await fetch('/api/user/2fa/email/disable', { method: 'POST' });
      setStatus(s => ({ ...s, emailEnabled: false }));
      setEmailSuccess('Email 2FA disabled'); setTimeout(() => setEmailSuccess(''), 3000);
    } catch {}
    finally { setEmailLoading(false); }
  };

  const startAppSetup = async () => {
  // Close email setup if open
  setEmailStep('idle'); setEmailCode(''); setEmailError('');
  setAppError(''); setAppLoading(true);
  // ...rest unchanged
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
      setAppSuccess('Authenticator app enabled'); setTimeout(() => setAppSuccess(''), 3000);
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
      setAppSuccess('Authenticator app disabled'); setTimeout(() => setAppSuccess(''), 3000);
    } catch { setAppError('Something went wrong'); }
    finally { setAppLoading(false); }
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

          {emailStep === 'verify' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">A 6-digit code has been sent to your email. Enter it below to activate.</p>
              <CodeBoxes id="email2fa" value={emailCode} onChange={setEmailCode} />
              {emailError && <p className="text-xs text-red-500 text-center font-medium">{emailError}</p>}
              <div className="flex gap-2.5">
                <button onClick={() => { setEmailStep('idle'); setEmailCode(''); setEmailError(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                  Cancel
                </button>
                <button onClick={verifyEmailCode} disabled={emailLoading || emailCode.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                  style={{ background: accent }}>
                  {emailLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {emailLoading ? 'Activating...' : 'Activate'}
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
  {/* Scrollable code — only this part scrolls */}
  <div className="flex-1 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
    <span className="text-xs font-mono text-gray-700 dark:text-gray-300 tracking-[0.12em] whitespace-nowrap">
      {appSecret}
    </span>
  </div>
  {/* Fixed copy button — stays visible always */}
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