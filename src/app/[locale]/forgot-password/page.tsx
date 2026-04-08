'use client';

import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const { locale } = useContext(LocaleContext);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Email address is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) { setError('Please enter a valid email address.'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error || 'Something went wrong.'); return; }
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          header, nav[role="navigation"] { display: none !important; }
        }
      `}</style>
      <div className="min-h-screen flex">

        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0891b2 100%)' }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, transparent 70%)' }} />
            <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1"/>
              </pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="relative z-10">
            <Link href={`/${locale}`}>
              <Image src="/logo.svg" alt="Exodus Logistics" width={180} height={54} className="h-12 w-auto" priority />
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="relative z-10 space-y-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                Forgot your<br />
                <span style={{ background: 'linear-gradient(90deg, #67e8f9, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  password?
                </span>
              </h2>
              <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                No worries. Enter your email address and we'll send you a secure link to reset your password.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { title: 'Secure reset link', desc: 'Valid for 1 hour only' },
                { title: 'No account needed', desc: 'Just your registered email' },
                { title: 'Instant delivery', desc: 'Check your inbox right away' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5">
                  <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="text-xs text-white/50">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="relative z-10">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 sm:px-10 relative"
          style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }} className="w-full max-w-[420px] relative z-10">

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-8 sm:p-10">
              <AnimatePresence mode="wait">
                {!success ? (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="mb-7">
                      <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Forgot password</h1>
                      <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                        Enter your email and we'll send you a reset link.
                      </p>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                        <input
                          value={email}
                          onChange={e => { setEmail(e.target.value); setError(''); }}
                          type="email" placeholder="Enter your email address"
                          autoComplete="email" style={{ fontSize: '16px' }}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/15 hover:border-blue-300 transition-all duration-200 text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                      <button type="submit" disabled={isSubmitting}
                        className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                        {isSubmitting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending...</span></>
                          : <span>Send Reset Link</span>}
                      </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                      Remember your password?{' '}
                      <Link href={`/${locale}/sign-in`} className="font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition">
                        Sign in
                      </Link>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Check your email</h2>
                    <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                      We've sent a password reset link to<br />
                      <strong className="text-gray-700">{email}</strong>
                    </p>
                    <div className="mt-6 bg-blue-50 rounded-xl p-4 text-left">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Didn't receive it?</p>
                      <p className="text-xs text-blue-700">Check your spam or promotions folder. The link expires in 1 hour.</p>
                    </div>
                    <button onClick={() => { setSuccess(false); setEmail(''); }}
                      className="cursor-pointer mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
                      Try a different email
                    </button>
                    <p className="mt-4 text-center text-sm text-gray-500">
                      <Link href={`/${locale}/sign-in`} className="font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition flex items-center justify-center gap-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                      </Link>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}