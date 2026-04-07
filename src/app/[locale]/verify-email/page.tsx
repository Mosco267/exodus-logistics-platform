'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Mail } from 'lucide-react';
import { signIn } from 'next-auth/react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const locale = searchParams.get('locale') || 'en';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const COUNTDOWN = 60;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Use Date.now() based countdown so it works when page is backgrounded
  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(newElapsed);
      if (newElapsed >= COUNTDOWN) {
        setCanResend(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [startTime]);

  const remaining = Math.max(COUNTDOWN - elapsed, 0);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[i] = val.slice(-1);
    setCode(newCode);
    setError('');
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error || 'Invalid code. Please try again.'); return; }
      // Get password from sessionStorage
      const password = sessionStorage.getItem('exodus_reg_password') || '';
      setIsNavigating(true);
      const result = await signIn('credentials', { email, password, redirect: false });
      sessionStorage.removeItem('exodus_reg_password');
      if (result?.ok) {
        window.location.href = `/${locale}/dashboard`;
      } else {
        window.location.href = `/${locale}/sign-in`;
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setVerifying(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Reset countdown using a page reload to reset startTime
      setElapsed(0);
      setCanResend(false);
      setCode(['', '', '', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
      // Reload to reset the timer properly
      window.location.reload();
    } catch {}
    finally { setResending(false); }
  };

  const [localPart, domain] = email.split('@');
  const maskedEmail = localPart?.length > 7
    ? localPart.slice(0, 2) + '*****' + '@' + domain
    : email;

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-to-br from-slate-50 via-blue-50/20 to-white" style={{ minHeight: '100dvh' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-[420px]">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Verify your email</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            We've sent a 6-digit verification code to<br />
            <span className="font-semibold text-gray-700 block break-all">{maskedEmail}</span>
          </p>

          <div className="flex justify-center gap-2 mt-7" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{ fontSize: '24px', caretColor: '#3b82f6' }}
                className={`w-12 h-14 text-center font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/15 ${
                  digit ? 'border-blue-500 bg-blue-50 text-gray-900' : 'border-gray-200 text-gray-900'
                } focus:border-blue-500`}
              />
            ))}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600 font-medium flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />{error}
            </p>
          )}

          <button onClick={handleVerify} disabled={verifying || isNavigating || code.join('').length < 6}
            className="cursor-pointer mt-6 w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
            {verifying || isNavigating
              ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{isNavigating ? 'Taking you in…' : 'Verifying...'}</span></>
              : <span>Verify Email</span>}
          </button>

          <div className="mt-5">
            {canResend ? (
              <button onClick={handleResend} disabled={resending}
                className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 transition disabled:opacity-60">
                {resending ? 'Resending...' : 'Resend code'}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend code in <span className="font-bold text-gray-600 tabular-nums">
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </span>
              </p>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-400">
            If you don't see the email, please check your promotions or updates folder.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}