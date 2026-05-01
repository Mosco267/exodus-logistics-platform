// src/app/[locale]/dashboard/settings/forgot-password/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Mail, Loader2, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';

export default function SettingsForgotPasswordPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const { data: session } = useSession();

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

  const [step, setStep] = useState<'email' | 'code' | 'newpassword' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Pre-fill email from session and set ready
  useEffect(() => {
    if (session?.user?.email) setEmail(session.user.email);
    setReady(true);
  }, [session]);

  const sessionEmail = session?.user?.email || '';
  const emailMatchesAccount = !sessionEmail || email.trim().toLowerCase() === sessionEmail.toLowerCase();

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white/40 transition";

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address'); return; }
    if (!emailMatchesAccount) { setError('This email is not associated with your account'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send code'); return; }
      setStep('code'); startCountdown();
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (code.replace(/\D/g, '').length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.replace(/\D/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      setStep('newpassword');
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.replace(/\D/g, ''), newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password'); return; }
      setStep('done');
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  };

  if (!ready) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
        style={{ borderTopColor: accentSolid }} />
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (step === 'email') router.push(`/${locale}/dashboard/settings/security`);
            else if (step === 'code') setStep('email');
            else if (step === 'newpassword') setStep('code');
            else router.push(`/${locale}/dashboard/settings/security`);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
            style={isMidnight ? { color: '#ffffff' } : {}}>Forgot Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Reset your account password</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6">

        {step === 'email' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Confirm your email</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">We'll send a reset code to your email</p>
              </div>
            </div>
            <div>
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                type="email"
                placeholder="Your email address"
                className={inputClass}
                style={{ fontSize: '16px' }}
              />
              {email && sessionEmail && !emailMatchesAccount && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">This email is not associated with your account</p>
              )}
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <button
              onClick={handleSendCode}
              disabled={loading || !email || !emailMatchesAccount}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
              style={{ background: accent }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Enter the 6-digit code sent to <strong className="text-gray-900 dark:text-white">{email}</strong>
            </p>
            <div className="flex items-center justify-center gap-2">
              {[0,1,2,3,4,5].map(i => (
                <input key={i} id={`reset-box-${i}`} type="text" inputMode="numeric" maxLength={1}
                  value={code[i] || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (!val) { const arr = code.split(''); arr[i] = ''; setCode(arr.join('')); return; }
                    const arr = code.split(''); arr[i] = val[val.length-1]; setCode(arr.join(''));
                    setError('');
                    if (i < 5) { const next = document.getElementById(`reset-box-${i+1}`); if (next) (next as HTMLInputElement).focus(); }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !code[i] && i > 0) {
                      const prev = document.getElementById(`reset-box-${i-1}`); if (prev) (prev as HTMLInputElement).focus();
                    }
                  }}
                  onPaste={e => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    setCode(pasted.padEnd(6, '').slice(0, 6));
                    const box = document.getElementById(`reset-box-${Math.min(pasted.length, 5)}`);
                    if (box) (box as HTMLInputElement).focus();
                  }}
                  className="text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none transition"
                  style={{ fontSize: '20px', height: '52px', width: '44px' }} />
              ))}
            </div>
            {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}
            <div className="text-center">
              {countdown > 0
                ? <p className="text-xs text-gray-400">Resend in <strong>{countdown}s</strong></p>
                : <button onClick={handleSendCode} disabled={loading}
                    className="text-xs font-semibold hover:underline cursor-pointer disabled:opacity-50"
                    style={{ color: accentSolid }}>Resend code</button>}
            </div>
            <button onClick={handleVerifyCode} disabled={loading || code.replace(/\D/g, '').length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
              style={{ background: accent }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        )}

        {step === 'newpassword' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">Create a new strong password for your account.</p>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Create new password" autoComplete="new-password"
                  className={inputClass + ' pr-11'} style={{ fontSize: '16px' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer p-1"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password" autoComplete="new-password"
                  className={inputClass + ' pr-11'} style={{ fontSize: '16px' }} />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer p-1"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPw && newPw !== confirmPw && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <button onClick={handleResetPassword} disabled={loading || !newPw || newPw !== confirmPw}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
              style={{ background: accent }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: accent }}>
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Password Reset!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your password has been updated successfully.</p>
            <button onClick={() => router.push(`/${locale}/dashboard/settings/security`)}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer"
              style={{ background: accent }}>
              Back to Security
            </button>
          </div>
        )}
      </div>
    </div>
  );
}