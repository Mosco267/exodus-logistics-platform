'use client';

import { useEffect, useRef, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Shield, Globe, Package, Zap } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

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

export default function SignInPage() {
  const { locale } = useContext(LocaleContext);
  const router = useRouter();


  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });

  useEffect(() => {
    try {
      const enabled = localStorage.getItem(REMEMBER_ENABLED_KEY) === '1';
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
      setRememberMe(enabled);
      if (enabled && savedEmail && emailRef.current) emailRef.current.value = savedEmail;
    } catch {}
    const t = setTimeout(() => {
      if (passwordRef.current?.value) setHasPassword(true);
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const toggleShowPassword = () => setShowPassword(v => !v);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawEmail = (emailRef.current?.value || '').trim().toLowerCase();
    const rawPassword = passwordRef.current?.value || '';

    const newErrors = { email: '', password: '', general: '' };
    if (!rawEmail) newErrors.email = 'Email address is required.';
    else if (!/^\S+@\S+\.\S+$/.test(rawEmail)) newErrors.email = 'Please enter a valid email address.';
    if (!rawPassword) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    if (newErrors.email || newErrors.password) return;

    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ENABLED_KEY, '1');
        localStorage.setItem(REMEMBER_EMAIL_KEY, rawEmail);
      } else {
        localStorage.removeItem(REMEMBER_ENABLED_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {}

    setIsSubmitting(true);
    try {
      const res = await signIn('credentials', { email: rawEmail, password: rawPassword, redirect: false });
      if (!res || res.error) {
        setErrors({ email: '', password: '', general: 'Invalid email or password. Please try again.' });
        return;
      }
      const sess = await getSession();
      const role = String((sess as any)?.user?.role || 'USER').toUpperCase();
      const nextUrl = role === 'ADMIN' ? `/${locale}/dashboard/admin/users` : `/${locale}/dashboard`;
      router.replace(nextUrl);
      router.refresh();
      setTimeout(() => { window.location.href = nextUrl; }, 200);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: `/${locale}/dashboard` });
    } catch {
      setGoogleLoading(false);
    }
  };

 const inputCls = (hasError: boolean) =>
  `w-full h-12 px-4 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 placeholder:text-gray-400 ${
      hasError
        ? 'border-red-400 focus:ring-red-400/20 bg-red-50/30'
        : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
    }`;

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0891b2 100%)' }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Large orange orb top-right */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)' }} />
          {/* Cyan orb bottom-left */}
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, transparent 70%)' }} />
          {/* Subtle grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {/* Floating circles */}
          <div className="absolute top-1/3 right-8 w-2 h-2 rounded-full bg-orange-400 opacity-60" />
          <div className="absolute top-1/2 right-24 w-1.5 h-1.5 rounded-full bg-cyan-300 opacity-50" />
          <div className="absolute top-2/3 right-16 w-1 h-1 rounded-full bg-white opacity-40" />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <Link href={`/${locale}`}>
            <Image src="/logo.svg" alt="Exodus Logistics" width={180} height={54} className="h-12 w-auto" priority />
          </Link>
        </motion.div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 space-y-8"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-bold text-white/90 tracking-widest uppercase">Secure Platform</span>
          </div>

          {/* Headline */}
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

          {/* Feature pills */}
          <div className="space-y-3">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
              >
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { value: '50K+', label: 'Shipments' },
              { value: '120+', label: 'Countries' },
              { value: '99.9%', label: 'Uptime' },
            ].map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm"
              >
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-[11px] text-white/50 mt-0.5 font-semibold tracking-wide">{label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 sm:px-10 bg-gradient-to-br from-slate-50 via-blue-50/20 to-white relative overflow-hidden">

        {/* Subtle background shape */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.04) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        {/* Mobile logo */}
        <motion.div
  initial={{ opacity: 0, y: -8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  className="lg:hidden mb-8 relative z-10"
>
  <Link href={`/${locale}`}>
    <Image src="/logo-dark.svg" alt="Exodus Logistics" width={160} height={50} className="h-10 w-auto" priority />
  </Link>
</motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/8 border border-gray-100/80 p-8 sm:p-10">

            {/* Heading */}
            <div className="mb-7">
              <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h1>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                Sign in to your Exodus Logistics account
              </p>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 overflow-hidden">
                  <AlertCircle className="w-4 h-4 shrink-0" />{errors.general}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignIn} noValidate className="space-y-5">

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <input ref={emailRef} id="email" name="email" type="email" autoComplete="email"
  placeholder="you@example.com"
  onChange={() => setErrors(p => ({ ...p, email: '', general: '' }))}
  style={{ fontSize: '16px' }}
  className={inputCls(!!errors.email)} />
                <AnimatePresence>
                  {errors.email && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                  <button type="button" onClick={() => router.push(`/${locale}/forgot-password`)}
                    className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 transition underline-offset-2 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
  {/* Hidden text input to trick iOS into opening keyboard */}
  {!showPassword && (
  <input
    key="password-hidden"
    ref={passwordRef}
    id="password"
    name="password"
    type="text"
    inputMode="text"
    autoComplete="current-password"
    placeholder="Enter your password"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck={false}
    onChange={e => {
      setHasPassword(!!e.target.value);
      setErrors(p => ({ ...p, password: '', general: '' }));
    }}
    style={{
      width: '100%',
      height: '48px',
      paddingLeft: '16px',
      paddingRight: '44px',
      borderRadius: '12px',
      border: errors.password ? '1px solid #f87171' : '1px solid #e5e7eb',
      fontSize: '16px',
      backgroundColor: '#ffffff',
      color: 'transparent',
      caretColor: '#111827',
      textShadow: '0 0 0 #111827',
      outline: 'none',
      WebkitAppearance: 'none',
      appearance: 'none',
      letterSpacing: '0.2em',
    }}
  />
)}
  {showPassword && (
    <input
      key="password-visible"
      ref={passwordRef}
      id="password-visible"
      name="password"
      type="text"
      autoComplete="current-password"
      placeholder="Enter your password"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      onChange={e => {
        setHasPassword(!!e.target.value);
        setErrors(p => ({ ...p, password: '', general: '' }));
      }}
      style={{
        width: '100%',
        height: '48px',
        paddingLeft: '16px',
        paddingRight: '44px',
        borderRadius: '12px',
        border: errors.password ? '1px solid #f87171' : '1px solid #e5e7eb',
        fontSize: '16px',
        backgroundColor: '#ffffff',
        color: '#111827',
        outline: 'none',
        WebkitAppearance: 'none',
        appearance: 'none',
      }}
    />
  )}
  <button
    type="button"
    tabIndex={-1}
    onClick={() => {
      const current = passwordRef.current?.value || '';
      setShowPassword(v => !v);
      // Preserve typed value when switching
      setTimeout(() => {
        if (passwordRef.current) {
          passwordRef.current.value = current;
          passwordRef.current.focus();
        }
      }, 10);
    }}
    style={{
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      color: '#9ca3af',
    }}
  >
    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </button>
</div>
                <AnimatePresence>
                  {errors.password && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember me */}
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                <div className="relative">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                    className="sr-only" />
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

              {/* Submit */}
              <button type="submit" disabled={isSubmitting || googleLoading}
                className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in…</span></>
                  : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px bg-gray-100 flex-1" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">or</span>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            {/* Google */}
            <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || isSubmitting}
              className="cursor-pointer w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[.98] transition-all duration-200 disabled:opacity-60">
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <GoogleIcon />}
              Continue with Google
            </button>

            {/* Sign up */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href={`/${locale}/signup`}
                className="font-bold text-blue-600 hover:text-blue-700 transition underline-offset-2 hover:underline">
                Create account
              </Link>
            </p>

          </div>

          {/* Trust badges below card */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              SSL Secured
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              99.9% Uptime
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              120+ Countries
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}