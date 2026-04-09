'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function SentContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const COUNTDOWN = 60;
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const [localPart, domain] = email.split('@');
const maskedEmail = localPart?.length > 7
  ? localPart.slice(0, 2) + '*****' + '@' + domain
  : localPart + '@' + domain;

  const handleResend = async () => {
    setResending(true);
    setResendError('');
    setResendSuccess(false);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) { setResendError(json?.error || 'Something went wrong.'); return; }
      setResendSuccess(true);
      setCanResend(false);
      setElapsed(0);
    } catch {
      setResendError('Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-to-br from-slate-50 via-blue-50/20 to-white" style={{ minHeight: '100dvh' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-[420px]">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-8 sm:p-10 text-center">

          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
            <Mail className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Check your email</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            We've sent a password reset link to<br />
            <span className="font-semibold text-gray-700 block break-all mt-1" style={{ textDecoration: 'none' }}>{maskedEmail}</span>
          </p>

          <div className="mt-6 bg-blue-50 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-blue-800 mb-1">Didn't receive it?</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              If you don't see the email, please check your promotions or updates folder. The link expires in 1 hour.
            </p>
          </div>

          {resendError && (
            <p className="mt-3 text-xs text-red-600 font-medium flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />{resendError}
            </p>
          )}

          {resendSuccess && (
            <p className="mt-3 text-xs text-emerald-600 font-medium">A new reset link has been sent.</p>
          )}

          <div className="mt-5">
            {canResend ? (
              <button onClick={handleResend} disabled={resending}
                className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 transition disabled:opacity-60">
                {resending ? 'Resending...' : 'Resend reset link'}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend link in <span className="font-bold text-gray-600 tabular-nums">
                  {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </span>
              </p>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
  <div>
    <Link href="/en/forgot-password"
      className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition">
      Use a different email?
    </Link>
  </div>
  <div>
    <Link href="/en/sign-in"
      className="text-sm font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition">
      Back to Sign In
    </Link>
  </div>
</div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordSentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    }>
      <SentContent />
    </Suspense>
  );
}