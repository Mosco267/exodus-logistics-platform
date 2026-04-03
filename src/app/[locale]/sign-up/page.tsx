'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Check, ArrowRight, Package2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const barColor = score === 0 ? 'bg-gray-200' : score === 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : 'bg-emerald-500';
  const label = ['', 'Weak', 'Fair', 'Strong'][score];
  const labelColor = ['', 'text-red-500', 'text-amber-600', 'text-emerald-600'][score];

  if (!password) return null;

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? barColor : 'bg-gray-200'}`} />
        ))}
        {label && <span className={`text-xs font-bold ml-1 ${labelColor}`}>{label}</span>}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`text-[11px] flex items-center gap-1 font-medium transition ${pass ? 'text-emerald-600' : 'text-gray-400'}`}>
            <Check className="w-3 h-3" />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required.';
    if (!email.trim()) e.email = 'Email address is required.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Please enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (confirm !== password) e.confirm = 'Passwords do not match.';
    if (!agreed) e.agreed = 'You must agree to the Terms and Privacy Policy to continue.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json();
      if (!res.ok) { setGeneralError(json?.error || 'Registration failed. Please try again.'); return; }

      setSuccess(true);
      setTimeout(async () => {
        const result = await signIn('credentials', {
          email: email.trim().toLowerCase(), password, redirect: false,
        });
        if (result?.ok) {
          router.replace(`/${locale}/dashboard`);
          setTimeout(() => { window.location.href = `/${locale}/dashboard`; }, 200);
        } else {
          router.replace(`/${locale}/sign-in`);
        }
      }, 1500);
    } catch {
      setGeneralError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: `/${locale}/dashboard` });
    } catch {
      setGoogleLoading(false);
    }
  };

  const inputCls = (hasError: boolean, extraCls = '') =>
    `w-full h-12 px-4 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 transition text-gray-900 placeholder:text-gray-400 ${extraCls} ${
      hasError
        ? 'border-red-400 focus:ring-red-400/20'
        : 'border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-500/15'
    }`;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-xl border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Account created!</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">Welcome to Exodus Logistics. Signing you in…</p>
          <div className="mt-5 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — brand (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b3aa4 0%, #0e7490 60%, #0f4c81 100%)' }}>

        {/* Decorative */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid2)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href={`/${locale}`}>
            <Image src="/logo.svg" alt="Exodus Logistics" width={160} height={48} className="h-10 w-auto" priority />
          </Link>
        </div>

        {/* Center */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white/80 tracking-wide uppercase">
            <Package2 className="w-3 h-3" /> Global Logistics
          </div>
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Ship smarter.<br />
            <span className="text-cyan-300">Track everything.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Join thousands of businesses managing their international shipments with Exodus Logistics.
          </p>

          {/* Benefits */}
          <div className="space-y-3 pt-2">
            {[
              'Real-time shipment tracking',
              'Automated invoice generation',
              'Global coverage in 120+ countries',
              'Secure and encrypted data',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-cyan-300" />
                </div>
                <span className="text-sm text-white/80 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8 bg-gray-50 overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href={`/${locale}`}>
            <Image src="/logo.svg" alt="Exodus Logistics" width={140} height={44} className="h-9 w-auto" priority />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[420px]"
        >
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm text-gray-500">Join Exodus Logistics and start shipping today</p>
          </div>

          {/* Google */}
          <button type="button" onClick={handleGoogleSignUp} disabled={googleLoading || isSubmitting}
            className="cursor-pointer w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm active:scale-[.98] transition disabled:opacity-60 mb-5">
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <GoogleIcon />}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">or sign up with email</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {generalError && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />{generalError}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Full name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                placeholder="John Doe" autoComplete="name" className={inputCls(!!errors.name)} />
              {errors.name && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                type="email" placeholder="you@example.com" autoComplete="email" className={inputCls(!!errors.email)} />
              {errors.email && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  type={showPassword ? 'text' : 'password'} placeholder="Create a strong password"
                  autoComplete="new-password" className={inputCls(!!errors.password, 'pr-11')} />
                {password && (
                  <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()}
                    onClick={() => setShowPassword(v => !v)}
                    className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.password}</p>}
              <PasswordStrength password={password} />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <input value={confirm} onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })); }}
                  type={showConfirm ? 'text' : 'password'} placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={inputCls(!!errors.confirm, 'pr-11') + (confirm && confirm === password && !errors.confirm ? ' !border-emerald-400 !focus:ring-emerald-400/20' : '')} />
                {confirm && (
                  <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()}
                    onClick={() => setShowConfirm(v => !v)}
                    className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {errors.confirm && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.confirm}</p>}
              {confirm && confirm === password && !errors.confirm && (
                <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />Passwords match
                </p>
              )}
            </div>

            {/* Terms */}
            <div className={`rounded-xl border p-4 transition ${errors.agreed ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setErrors(p => ({ ...p, agreed: '' })); }}
                  className="h-4 w-4 mt-0.5 rounded border-gray-300 accent-blue-600 focus:ring-0 focus:outline-none shrink-0" />
                <span className="text-sm text-gray-600 leading-relaxed">
                  I agree to the{' '}
                  <Link href={`/${locale}/terms`} target="_blank"
                    className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href={`/${locale}/privacy`} target="_blank"
                    className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  . I confirm I am at least 18 years of age.
                </span>
              </label>
              {errors.agreed && <p className="mt-2 text-xs text-red-600 font-medium pl-7">{errors.agreed}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting || googleLoading}
              className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0e7490 100%)' }}>
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
                : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Sign in */}
          <p className="mt-7 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href={`/${locale}/sign-in`} className="font-semibold text-blue-600 hover:text-blue-700 transition">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
