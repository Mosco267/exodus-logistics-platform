// src/app/[locale]/sign-in/page.tsx
'use client';

import { useEffect, useRef, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Shield, Globe, Package, Zap, Mail, ArrowLeft, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { startAuthentication } from '@simplewebauthn/browser';

const REMEMBER_ENABLED_KEY = 'exodus_remember_enabled';
const REMEMBER_EMAIL_KEY = 'exodus_remember_email';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const features = [
  { icon: Globe, title: 'Global Reach', desc: '120+ countries covered worldwide' },
  { icon: Package, title: 'Real-time Tracking', desc: 'Live updates on every shipment' },
  { icon: Zap, title: 'Instant Invoicing', desc: 'Automated billing and receipts' },
];

type Step = 'choose' | 'email' | 'auth';
type AuthMethod = 'password' | 'passkey' | null;

export default function SignInPage() {
  const { locale } = useContext(LocaleContext);
  const router = useRouter();

  const [navOpen, setNavOpen] = useState(false);
  const navItems = [
    { name: 'Home', href: `/${locale}` },
    { name: 'About', href: `/${locale}/about` },
    { name: 'Services', href: `/${locale}/services` },
    { name: 'Contact', href: `/${locale}/contact` },
    { name: 'Get Started', href: `/${locale}/sign-up` },
  ];

  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailError, setEmailError] = useState('');

  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [checkingPasskey, setCheckingPasskey] = useState(false);

  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyCancelled, setPasskeyCancelled] = useState(false);

  useEffect(() => {
    try {
      const enabled = localStorage.getItem(REMEMBER_ENABLED_KEY);
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
      setRememberMe(enabled === null ? true : enabled === '1');
      if (savedEmail) setEmail(savedEmail);
    } catch {}
  }, []);

  const inputCls = (hasError: boolean) =>
    `w-full h-12 px-4 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 placeholder:text-gray-400 ${
      hasError
        ? 'border-red-400 focus:ring-red-400/20 bg-red-50/30'
        : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
    }`;

  const navigate = async () => {
    const sessionRes = await fetch('/api/auth/session');
    const session = await sessionRes.json();
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
      window.location.href = `/${locale}/dashboard/admin/users`;
    } else {
      window.location.href = `/${locale}/dashboard`;
    }
  };

  const handleEmailNext = async () => {
    setEmailError('');
    if (!email.trim()) { setEmailError('Email address is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailError('Please enter a valid email address.'); return; }
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ENABLED_KEY, '1');
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      } else {
        localStorage.removeItem(REMEMBER_ENABLED_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {}
    setCheckingPasskey(true);
    try {
      const res = await fetch('/api/auth/check-passkey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      setHasPasskey(!!data.hasPasskey);
    } catch { setHasPasskey(false); }
    finally { setCheckingPasskey(false); }
    setStep('auth');
  };

  const handlePasswordSignIn = async () => {
    setPwError(''); setGeneralError('');
    if (!password) { setPwError('Password is required.'); return; }
    setIsSubmitting(true);
    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(), password, redirect: false,
      });
      if (!res || res.error) {
        const msg = res?.error === 'suspended' || res?.error?.toLowerCase().includes('suspended')
          ? 'Your account has been suspended. Please contact support@goexoduslogistics.com.'
          : 'Invalid email or password. Please try again.';
        setGeneralError(msg); return;
      }
      setIsNavigating(true);
      await navigate();
    } finally { setIsSubmitting(false); }
  };

  const handlePasskeySignIn = async () => {
  setGeneralError(''); setPasskeyCancelled(false);
  setPasskeyLoading(true);
  // Force scroll to top before browser can scroll to bottom
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  // Small yield to let React render the full-screen overlay first
  await new Promise(r => setTimeout(r, 10));
    try {
      const optRes = await fetch('/api/auth/passkey/options', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const opts = await optRes.json();
      if (!optRes.ok) { setGeneralError(opts.error || 'Failed to start passkey authentication'); return; }

      const credential = await startAuthentication(opts);

      const verRes = await fetch('/api/auth/passkey/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), credential }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) { setGeneralError(verData.error || 'Passkey authentication failed'); return; }

      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(), passkeyToken: verData.token, redirect: false,
      });
      if (!res || res.error) { setGeneralError('Sign in failed after passkey verification.'); return; }

      setIsNavigating(true);
      await navigate();
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        setPasskeyCancelled(true);
      } else {
        setGeneralError('Passkey authentication failed. Please try your password instead.');
      }
    } finally { setPasskeyLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: `/${locale}/auth/google-redirect` });
    } catch { setGoogleLoading(false); }
  };

  const showFullScreenLoader = isNavigating || (passkeyLoading && !passkeyCancelled);

 return (
  <>
    {/* Full-screen loading overlay — renders on top immediately */}
    {showFullScreenLoader && (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-500">
            {passkeyLoading ? 'Verifying passkey…' : 'Signing you in…'}
          </p>
        </div>
      </div>
    )}
      <style>{`@media (min-width: 1024px) { header, nav[role="navigation"] { display: none !important; } }`}</style>
      <div className="min-h-screen flex">

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0891b2 100%)' }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, transparent 70%)' }} />
            <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            <div className="absolute top-1/3 right-8 w-2 h-2 rounded-full bg-orange-400 opacity-60" />
            <div className="absolute top-1/2 right-24 w-1.5 h-1.5 rounded-full bg-cyan-300 opacity-50" />
            <div className="absolute top-2/3 right-16 w-1 h-1 rounded-full bg-white opacity-40" />
          </div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
            <Link href={`/${locale}`}>
              <Image src="/logo.svg" alt="Exodus Logistics" width={180} height={54} className="h-12 w-auto" priority />
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-white/90 tracking-widest uppercase">Secure Platform</span>
            </div>
            <div>
              <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                Your shipments.<br />
                <span style={{ background: 'linear-gradient(90deg, #67e8f9, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Tracked perfectly.
                </span>
              </h2>
              <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                Manage international and domestic shipments, invoices, and real-time tracking — all in one place.
              </p>
            </div>
            <div className="space-y-3">
              {features.map(({ icon: Icon, title, desc }, i) => (
                <motion.div key={title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="text-xs text-white/50">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[{ value: '50K+', label: 'Shipments' }, { value: '120+', label: 'Countries' }, { value: '99.9%', label: 'Uptime' }].map(({ value, label }, i) => (
                <motion.div key={label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-extrabold text-white">{value}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 font-semibold tracking-wide">{label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <div className="relative z-10">
            <p className="text-xs text-white/30">©️ {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 sm:px-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>

          {/* Desktop nav */}
          <div className="hidden lg:block absolute top-6 right-6 z-20">
            <button onClick={() => setNavOpen(v => !v)} className="cursor-pointer w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>

          <AnimatePresence>
            {navOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className="hidden lg:block fixed inset-0 bg-black/30 z-40" onClick={() => setNavOpen(false)} />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.28, ease: 'easeInOut' }}
                  className="hidden lg:flex fixed top-0 right-0 h-full w-72 z-50 flex-col shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                  <div className="flex items-center justify-between px-6 py-6 border-b border-white/20">
                    <Link href={`/${locale}`} onClick={() => setNavOpen(false)}>
                      <Image src="/logo.svg" alt="Exodus Logistics" width={140} height={42} className="h-9 w-auto" />
                    </Link>
                    <button onClick={() => setNavOpen(false)} className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                    {navItems.map((item, i) => (
                      <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.05 }}>
                        <Link href={item.href} onClick={() => setNavOpen(false)}
                          className={`flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${item.name === 'Get Started' ? 'bg-orange-500 text-white hover:bg-orange-600 mt-4' : 'text-white/80 hover:text-white hover:bg-white/15'}`}>
                          {item.name}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-6 py-5 border-t border-white/20">
                    <p className="text-xs text-white/40">©️ {new Date().getFullYear()} Exodus Logistics Ltd.</p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.04) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[420px] relative z-10 -mt-6"
          >
            <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/8 border border-gray-100/80 p-8 sm:p-9">

              {/* ── STEP: CHOOSE ── */}
              {step === 'choose' && (
                <AnimatePresence mode="wait">
                  <motion.div key="choose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    <div className="mb-6">
                      <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h1>
                      <p className="mt-1 text-sm text-gray-500">Sign in to your Exodus Logistics account</p>
                    </div>

                    {generalError && (
                      <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />{generalError}
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Google FIRST */}
                      <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading}
                        className="cursor-pointer w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[.98] transition-all duration-200 disabled:opacity-60">
                        {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <GoogleIcon />}
                        Continue with Google
                      </button>

                      {/* Divider */}
                      <div className="flex items-center gap-3 py-1">
                        <div className="h-px bg-gray-100 flex-1" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">or</span>
                        <div className="h-px bg-gray-100 flex-1" />
                      </div>

                      {/* Email SECOND */}
                      <button type="button" onClick={() => { setGeneralError(''); setStep('email'); }}
                        className="cursor-pointer w-full h-12 flex items-center justify-center gap-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:scale-[.98]"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                        <Mail className="w-5 h-5" />
                        Continue with Email
                      </button>
                    </div>

                    <p className="mt-5 text-center text-sm text-gray-500">
                      Don&apos;t have an account?{' '}
                      <Link href={`/${locale}/sign-up`} className="font-bold text-blue-600 hover:text-blue-700 transition underline-offset-2 hover:underline">
                        Create account
                      </Link>
                    </p>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* ── STEP: EMAIL ── */}
              {step === 'email' && (
                <AnimatePresence mode="wait">
                  <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    <button onClick={() => { setStep('choose'); setEmailError(''); setGeneralError(''); }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 cursor-pointer mb-5 transition">
                      <ArrowLeft size={14} /> Back
                    </button>

                    <div className="mb-5">
                      <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Enter your email</h1>
                      <p className="mt-1 text-sm text-gray-500">We'll check if you have an account</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') handleEmailNext(); }}
                          placeholder="your@email.com" autoComplete="email" autoFocus
                          style={{ fontSize: '16px' }} className={inputCls(!!emailError)} />
                        {emailError && (
                          <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{emailError}
                          </p>
                        )}
                      </div>

                      {/* Remember me + Forgot password on same line */}
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                          <div className="relative">
                            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="sr-only" />
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                              {rememberMe && (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition">Remember me</span>
                        </label>
                        <Link href={`/${locale}/forgot-password`} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition underline-offset-2 hover:underline">
                          Forgot password?
                        </Link>
                      </div>

                      <button type="button" onClick={handleEmailNext} disabled={checkingPasskey || !email}
                        className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[.98] disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                        {checkingPasskey ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : 'Next'}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* ── STEP: AUTH ── */}
              {step === 'auth' && (
                <AnimatePresence mode="wait">
                  <motion.div key="auth" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    <button onClick={() => { setStep('email'); setGeneralError(''); setPwError(''); setPassword(''); setAuthMethod(null); setPasskeyCancelled(false); setHasPasskey(false); }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 cursor-pointer mb-5 transition">
                      <ArrowLeft size={14} /> Back
                    </button>

                    <div className="mb-5">
                      <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Sign in</h1>
                      <p className="mt-1 text-sm text-gray-500 truncate">{email}</p>
                    </div>

                    {generalError && (
                      <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />{generalError}
                      </div>
                    )}

                    {/* Passkey cancelled — show retry options */}
                    {passkeyCancelled && (
                      <div className="mb-4 space-y-3">
                        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                          <AlertCircle className="w-4 h-4 shrink-0" />Passkey was cancelled
                        </div>
                        <div className="flex gap-2.5">
                          <button type="button" onClick={() => { setPasskeyCancelled(false); handlePasskeySignIn(); }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition cursor-pointer"
                            style={{ borderColor: '#1d4ed8', color: '#1d4ed8' }}>
                            <Fingerprint size={15} /> Retry Passkey
                          </button>
                          <button type="button" onClick={() => { setPasskeyCancelled(false); setAuthMethod('password'); }}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 cursor-pointer hover:bg-gray-50 transition">
                            Use Password
                          </button>
                        </div>
                      </div>
                    )}

                    

                    {!passkeyCancelled && !passkeyLoading && (
                      <div className="space-y-3">
                        {/* Passkey option — only if user has one and hasn't chosen password yet */}
                        {hasPasskey && !authMethod && (
                          <>
                            <button type="button" onClick={() => { setAuthMethod('passkey'); handlePasskeySignIn(); }}
                              className="cursor-pointer w-full h-12 flex items-center justify-center gap-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:scale-[.98]"
                              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                              <Fingerprint className="w-5 h-5" />
                              Use Passkey
                            </button>
                            <div className="flex items-center gap-3">
                              <div className="h-px bg-gray-100 flex-1" />
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">or</span>
                              <div className="h-px bg-gray-100 flex-1" />
                            </div>
                            <button type="button" onClick={() => setAuthMethod('password')}
                              className="cursor-pointer w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[.98] transition-all duration-200">
                              Use Password instead
                            </button>
                          </>
                        )}

                        {/* Password form */}
                        {(!hasPasskey || authMethod === 'password') && (
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700">Password</label>
                                <Link href={`/${locale}/forgot-password`} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition underline-offset-2 hover:underline">
                                  Forgot password?
                                </Link>
                              </div>
                              <div className="relative">
                                <input
                                  type={showPw ? 'text' : 'password'}
                                  value={password}
                                  onChange={e => { setPassword(e.target.value); setPwError(''); setGeneralError(''); }}
                                  onKeyDown={e => { if (e.key === 'Enter') handlePasswordSignIn(); }}
                                  placeholder="Enter your password"
                                  autoComplete="current-password"
                                  autoFocus
                                  style={{ fontSize: '16px' }}
                                  className={`w-full h-12 px-4 pr-11 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 placeholder:text-gray-400 ${pwError ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'}`}
                                />
                                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1 transition"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                              {pwError && (
                                <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />{pwError}
                                </p>
                              )}
                            </div>

                            <button type="button" onClick={handlePasswordSignIn} disabled={isSubmitting || !password}
                              className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[.98] disabled:opacity-60"
                              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                              {isSubmitting
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                                : 'Sign In'
                              }
                            </button>

                            {hasPasskey && authMethod === 'password' && (
                              <button type="button" onClick={() => { setAuthMethod(null); setPassword(''); setPwError(''); setGeneralError(''); }}
                                className="w-full text-center text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                                Use passkey instead
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

            </div>

            {/* Trust badges */}
            <div className="mt-5 flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <Shield className="w-3.5 h-3.5 text-green-500" />SSL Secured
              </div>
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />99.9% Uptime
              </div>
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <Globe className="w-3.5 h-3.5 text-blue-400" />120+ Countries
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}