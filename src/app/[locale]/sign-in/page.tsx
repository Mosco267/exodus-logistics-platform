'use client';

import { useEffect, useRef, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle, Globe } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

const REMEMBER_ENABLED_KEY = 'exodus_remember_enabled';
const REMEMBER_EMAIL_KEY = 'exodus_remember_email';

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

  const toggleShowPassword = () => {
    if (!passwordRef.current) return;
    const pos = passwordRef.current.selectionStart ?? 0;
    setShowPassword(v => !v);
    setTimeout(() => passwordRef.current?.setSelectionRange(pos, pos), 0);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-12">

      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href={`/${locale}`}>
            <Image src="/logo.svg" alt="Exodus Logistics" width={160} height={48} className="h-10 w-auto" priority />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/20 p-7 sm:p-9"
        >
          {/* Header */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-gray-500">Sign in to your Exodus Logistics account</p>
          </div>

          {/* Google button */}
          <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading || isSubmitting}
            className="cursor-pointer w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[.98] transition disabled:opacity-60 mb-5">
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">or sign in with email</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {errors.general && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />{errors.general}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSignIn} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input ref={emailRef} id="email" name="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                onChange={() => setErrors(p => ({ ...p, email: '', general: '' }))}
                className={`w-full h-12 px-4 rounded-2xl border text-sm focus:outline-none focus:ring-2 transition ${
                  errors.email ? 'border-red-400 focus:ring-red-400/30' : 'border-gray-200 focus:border-blue-400 focus:ring-blue-400/20'
                } text-gray-900 placeholder:text-gray-400`} />
              <AnimatePresence>
                {errors.email && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-1.5 text-xs text-red-600 font-medium">{errors.email}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input ref={passwordRef} id="password" name="password"
                  type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Enter your password"
                  onChange={e => { setHasPassword(!!e.target.value); setErrors(p => ({ ...p, password: '', general: '' })); }}
                  onFocus={() => { setTimeout(() => { if (passwordRef.current?.value) setHasPassword(true); }, 50); }}
                  className={`w-full h-12 px-4 pr-11 rounded-2xl border text-sm focus:outline-none focus:ring-2 transition ${
                    errors.password ? 'border-red-400 focus:ring-red-400/30' : 'border-gray-200 focus:border-blue-400 focus:ring-blue-400/20'
                  } text-gray-900 placeholder:text-gray-400`} />
                {hasPassword && (
                  <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={toggleShowPassword}
                    className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-1.5 text-xs text-red-600 font-medium">{errors.password}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600 focus:ring-0 focus:outline-none" />
                Remember me
              </label>
              <button type="button" onClick={() => router.push(`/${locale}/forgot-password`)}
                className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting || googleLoading}
              className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[.98] transition shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : 'Sign In'}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href={`/${locale}/signup`} className="font-semibold text-blue-600 hover:text-blue-700 transition">
              Create account
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/40">
          <Globe className="w-3 h-3" />
          <span>© {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}