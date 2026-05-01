// src/app/[locale]/dashboard/profile/change-email/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Mail, Loader2, CheckCircle2, Eye, EyeOff, Fingerprint, Lock } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

export default function ChangeEmailPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');

  useEffect(() => {
    const map: Record<string, { g: string; s: string }> = {
      default: { g: 'linear-gradient(135deg, #0b3aa4, #0e7490)', s: '#0b3aa4' },
      ocean: { g: 'linear-gradient(135deg, #0e7490, #06b6d4)', s: '#0891b2' },
      sunset: { g: 'linear-gradient(135deg, #0b3aa4, #f97316)', s: '#f97316' },
      arctic: { g: 'linear-gradient(135deg, #0284c7, #bae6fd)', s: '#0284c7' },
      midnight: { g: 'linear-gradient(135deg, #0f172a, #0e7490)', s: '#06b6d4' },
    };
    const apply = () => { const c = localStorage.getItem('exodus_theme_cache'); if (c && map[c]) { setAccent(map[c].g); setAccentSolid(map[c].s); } };
    apply(); window.addEventListener('storage', apply); const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  const [hasPasskey, setHasPasskey] = useState(false);
  useEffect(() => {
    fetch('/api/user/passkeys').then(r => r.json()).then(d => setHasPasskey((d.passkeys || []).length > 0)).catch(() => {});
  }, []);

  const [step, setStep] = useState<'auth' | 'email' | 'code' | 'done'>('auth');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white/40 transition";

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; });
    }, 1000);
  };

  const handlePasswordAuth = async () => {
    if (!password) { setAuthError('Password is required'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch('/api/user/verify-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Incorrect password'); return; }
      setStep('email');
    } catch { setAuthError('Something went wrong'); }
    finally { setAuthLoading(false); }
  };

  const handlePasskeyAuth = async () => {
    setAuthLoading(true); setAuthError('');
    try {
      const optRes = await fetch('/api/user/passkeys/authenticate/options', { method: 'POST' });
      const opts = await optRes.json();
      if (!optRes.ok) { setAuthError(opts.error || 'Failed to start'); return; }
      const credential = await startAuthentication(opts);
      const verRes = await fetch('/api/user/passkeys/authenticate/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) { setAuthError(verData.error || 'Passkey failed'); return; }
      setStep('email');
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') setAuthError('Passkey cancelled');
      else setAuthError('Passkey authentication failed');
    } finally { setAuthLoading(false); }
  };

  const handleSendCode = async () => {
    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) { setEmailError('Enter a valid email address'); return; }
    setEmailLoading(true); setEmailError('');
    try {
      const res = await fetch('/api/user/change-email/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Failed to send code'); return; }
      setStep('code'); setCode(''); startCountdown();
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (code.replace(/\D/g, '').length < 6) { setEmailError('Enter the 6-digit code'); return; }
    setEmailLoading(true); setEmailError('');
    try {
      const res = await fetch('/api/user/change-email/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail, code: code.replace(/\D/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || 'Invalid code'); return; }
      await updateSession();
      window.dispatchEvent(new CustomEvent('emailUpdated', { detail: { email: newEmail } }));
      setStep('done');
    } catch { setEmailError('Something went wrong'); }
    finally { setEmailLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/dashboard/profile`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Change Email</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Update your account email address</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6">

        {/* Step 1: Auth */}
        {step === 'auth' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Confirm your identity</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">For your security, verify before changing email</p>
              </div>
            </div>

            {hasPasskey && (
              <button onClick={handlePasskeyAuth} disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition cursor-pointer disabled:opacity-60"
                style={{ borderColor: accentSolid, color: accentSolid }}>
                {authLoading ? <Loader2 size={15} className="animate-spin" /> : <Fingerprint size={15} />}
                Use Passkey
              </button>
            )}

            {hasPasskey && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                <span className="text-xs text-gray-400">or use password</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Current Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                  placeholder="Enter your password" autoComplete="current-password"
                  className={inputClass + ' pr-11'} style={{ fontSize: '16px' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {authError && <p className="text-xs text-red-500 font-medium">{authError}</p>}
            <button onClick={handlePasswordAuth} disabled={authLoading || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
              style={{ background: accent }}>
              {authLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {authLoading ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 2: New email */}
        {step === 'email' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Enter new email</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">We'll send a verification code to confirm</p>
              </div>
            </div>
            <input value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailError(''); }}
              type="email" placeholder="New email address" autoCapitalize="none" autoCorrect="off"
              className={inputClass} style={{ fontSize: '16px' }} />
            {emailError && <p className="text-xs text-red-500 font-medium">{emailError}</p>}
            <div className="flex gap-2.5">
              <button onClick={() => setStep('auth')}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                Back
              </button>
              <button onClick={handleSendCode} disabled={emailLoading || !newEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                style={{ background: accent }}>
                {emailLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {emailLoading ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verify code */}
        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Enter the 6-digit code sent to <strong className="text-gray-900 dark:text-white">{newEmail}</strong>
            </p>
            <div className="flex items-center justify-center gap-2">
              {[0,1,2,3,4,5].map(i => (
                <input key={i} id={`change-email-${i}`} type="text" inputMode="numeric" maxLength={1}
                  value={code[i] || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (!val) { const arr = code.split(''); arr[i] = ''; setCode(arr.join('')); return; }
                    const arr = code.split(''); arr[i] = val[val.length-1]; setCode(arr.join(''));
                    setEmailError('');
                    if (i < 5) { const next = document.getElementById(`change-email-${i+1}`); if (next) (next as HTMLInputElement).focus(); }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !code[i] && i > 0) {
                      const prev = document.getElementById(`change-email-${i-1}`); if (prev) (prev as HTMLInputElement).focus();
                    }
                  }}
                  onPaste={e => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    setCode(pasted.padEnd(6, '').slice(0, 6));
                    const last = Math.min(pasted.length, 5);
                    const box = document.getElementById(`change-email-${last}`); if (box) (box as HTMLInputElement).focus();
                  }}
                  className="text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none transition"
                  style={{ fontSize: '20px', height: '52px', width: '44px' }} />
              ))}
            </div>
            {emailError && <p className="text-xs text-red-500 text-center font-medium">{emailError}</p>}
            <div className="text-center">
              {countdown > 0
                ? <p className="text-xs text-gray-400">Resend in <strong>{countdown}s</strong></p>
                : <button onClick={handleSendCode} disabled={emailLoading}
                    className="text-xs font-semibold hover:underline cursor-pointer" style={{ color: accentSolid }}>
                    Resend code
                  </button>}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setStep('email')}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                Back
              </button>
              <button onClick={handleVerifyCode} disabled={emailLoading || code.replace(/\D/g, '').length < 6}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                style={{ background: accent }}>
                {emailLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {emailLoading ? 'Updating...' : 'Update Email'}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: accent }}>
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Email Updated!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your email has been changed to <strong>{newEmail}</strong></p>
            <button onClick={() => router.push(`/${locale}/dashboard/profile`)}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer"
              style={{ background: accent }}>
              Back to Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}