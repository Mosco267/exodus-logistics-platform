'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Check,
  ArrowRight, ArrowLeft, User, Building2, Mail, Shield,
  Globe, Package, Zap, Briefcase
} from 'lucide-react';
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

type AccountType = 'individual' | 'company' | null;
type Step = 'type' | 'method' | 'form';

const features = [
  { icon: Globe, title: 'Global Reach', desc: '120+ countries covered worldwide' },
  { icon: Package, title: 'Real-time Tracking', desc: 'Live updates on every shipment' },
  { icon: Zap, title: 'Instant Invoicing', desc: 'Automated billing and receipts' },
];

export default function SignUpPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [step, setStep] = useState<Step>('type');
  const [accountType, setAccountType] = useState<AccountType>(null);

  // Individual fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [companyConfirm, setCompanyConfirm] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactName, setContactName] = useState('');
  const [website, setWebsite] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const inputCls = (hasError: boolean) =>
    `w-full h-12 px-4 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 placeholder:text-gray-400 text-sm ${
      hasError
        ? 'border-red-400 focus:ring-red-400/20'
        : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
    }`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (accountType === 'individual') {
      if (!name.trim()) e.name = 'Full name is required.';
      if (!email.trim()) e.email = 'Email is required.';
      else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Invalid email address.';
      if (!password) e.password = 'Password is required.';
      else if (password.length < 8) e.password = 'At least 8 characters.';
      if (!confirm) e.confirm = 'Please confirm your password.';
      else if (confirm !== password) e.confirm = 'Passwords do not match.';
    } else {
      if (!companyName.trim()) e.companyName = 'Company name is required.';
      if (!contactName.trim()) e.contactName = 'Contact name is required.';
      if (!companyEmail.trim()) e.companyEmail = 'Email is required.';
      else if (!/^\S+@\S+\.\S+$/.test(companyEmail)) e.companyEmail = 'Invalid email address.';
      if (!companyPassword) e.companyPassword = 'Password is required.';
      else if (companyPassword.length < 8) e.companyPassword = 'At least 8 characters.';
      if (!companyConfirm) e.companyConfirm = 'Please confirm your password.';
      else if (companyConfirm !== companyPassword) e.companyConfirm = 'Passwords do not match.';
    }
    if (!agreed) e.agreed = 'You must agree to continue.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const submitEmail = accountType === 'individual' ? email.trim().toLowerCase() : companyEmail.trim().toLowerCase();
    const submitPassword = accountType === 'individual' ? password : companyPassword;
    const submitName = accountType === 'individual' ? name.trim() : contactName.trim();

    setIsSubmitting(true);
    try {
      const body = accountType === 'individual'
        ? { name: submitName, email: submitEmail, password: submitPassword, phone, accountType: 'individual' }
        : { name: submitName, email: submitEmail, password: submitPassword, phone: companyPhone, accountType: 'company', companyName: companyName.trim(), vatNumber, registrationNumber, industry, website };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setGeneralError(json?.error || 'Registration failed. Please try again.'); return; }

      setSuccess(true);
      setTimeout(async () => {
        const result = await signIn('credentials', {
          email: submitEmail, password: submitPassword, redirect: false,
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
    <div className="min-h-screen flex mt-4">

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0891b2 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, transparent 70%)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
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
            <span className="text-xs font-bold text-white/90 tracking-widest uppercase">Trusted Platform</span>
          </div>
          <div>
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
              Ship smarter.<br />
              <span style={{ background: 'linear-gradient(90deg, #67e8f9, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Track everything.
              </span>
            </h2>
            <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
              Join thousands of businesses managing their international shipments with Exodus Logistics.
            </p>
          </div>
          <div className="space-y-3">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
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
        </motion.div>

        <div className="relative z-10">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-10 pb-12 sm:px-10 bg-gradient-to-br from-slate-50 via-blue-50/20 to-white relative overflow-hidden overflow-y-auto">

        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

        {/* Mobile logo */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="lg:hidden mb-8 relative z-10">
          <Link href={`/${locale}`}>
            <Image src="/logo-dark.svg" alt="Exodus Logistics" width={160} height={50} className="h-10 w-auto" priority />
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
          className="w-full max-w-[440px] relative z-10">

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-8 sm:p-10">

            {/* ── STEP 1: Account Type ── */}
            <AnimatePresence mode="wait">
              {step === 'type' && (
                <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <div className="mb-7">
                    <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Create account</h1>
                    <p className="mt-1.5 text-sm text-gray-500">What best describes you?</p>
                  </div>

                  <div className="space-y-3 mb-7">
                    {/* Individual */}
                    <button type="button"
                      onClick={() => { setAccountType('individual'); setStep('method'); }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md text-left group border-gray-200">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-base">Individual</p>
                        <p className="text-sm text-gray-500 mt-0.5">Personal shipments and tracking</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    </button>

                    {/* Company */}
                    <button type="button"
                      onClick={() => { setAccountType('company'); setStep('method'); }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md text-left group border-gray-200">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-base">Company</p>
                        <p className="text-sm text-gray-500 mt-0.5">Business logistics with VAT & registration</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    </button>
                  </div>

                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={`/${locale}/sign-in`} className="font-bold text-blue-600 hover:text-blue-700 transition">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {/* ── STEP 2: Method ── */}
              {step === 'method' && (
                <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <button onClick={() => setStep('type')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  <div className="mb-7">
                    <div className="w-12 h-12 rounded-2xl mb-5 flex items-center justify-center"
                      style={{ background: accountType === 'company' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      {accountType === 'company' ? <Building2 className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {accountType === 'company' ? 'Company account' : 'Individual account'}
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500">How would you like to sign up?</p>
                  </div>

                  <div className="space-y-3 mb-7">
                    <button type="button" onClick={handleGoogleSignUp} disabled={googleLoading}
                      className="cursor-pointer w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[.98] transition-all disabled:opacity-60">
                      {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <GoogleIcon />}
                      Continue with Google
                    </button>

                    <button type="button" onClick={() => setStep('form')}
                      className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:shadow-md active:scale-[.98] transition-all">
                      <Mail className="w-5 h-5 text-blue-500" />
                      Continue with Email
                    </button>
                  </div>

                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={`/${locale}/sign-in`} className="font-bold text-blue-600 hover:text-blue-700 transition">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {/* ── STEP 3: Form ── */}
              {step === 'form' && (
                <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <button onClick={() => setStep('method')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  <div className="mb-6">
                    <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                      style={{ background: accountType === 'company' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      {accountType === 'company' ? <Building2 className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                      {accountType === 'company' ? 'Company details' : 'Your details'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">Fill in your information to get started</p>
                  </div>

                  {generalError && (
                    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />{generalError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-4">

                    {accountType === 'individual' ? (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
                          <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                            placeholder="John Doe" autoComplete="name" style={{ fontSize: '16px' }} className={inputCls(!!errors.name)} />
                          {errors.name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.name}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                          <input value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                            type="email" placeholder="you@example.com" autoComplete="email" style={{ fontSize: '16px' }} className={inputCls(!!errors.email)} />
                          {errors.email && <p className="mt-1 text-xs text-red-600 font-medium">{errors.email}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone number <span className="text-gray-400 font-normal">(optional)</span></label>
                          <input value={phone} onChange={e => setPhone(e.target.value)}
                            type="tel" placeholder="+1 234 567 8900" autoComplete="tel" style={{ fontSize: '16px' }} className={inputCls(false)} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company name</label>
                          <input value={companyName} onChange={e => { setCompanyName(e.target.value); setErrors(p => ({ ...p, companyName: '' })); }}
                            placeholder="Acme Corp Ltd." autoComplete="organization" style={{ fontSize: '16px' }} className={inputCls(!!errors.companyName)} />
                          {errors.companyName && <p className="mt-1 text-xs text-red-600 font-medium">{errors.companyName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact person name</label>
                          <input value={contactName} onChange={e => { setContactName(e.target.value); setErrors(p => ({ ...p, contactName: '' })); }}
                            placeholder="Jane Smith" autoComplete="name" style={{ fontSize: '16px' }} className={inputCls(!!errors.contactName)} />
                          {errors.contactName && <p className="mt-1 text-xs text-red-600 font-medium">{errors.contactName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business email</label>
                          <input value={companyEmail} onChange={e => { setCompanyEmail(e.target.value); setErrors(p => ({ ...p, companyEmail: '' })); }}
                            type="email" placeholder="company@example.com" autoComplete="email" style={{ fontSize: '16px' }} className={inputCls(!!errors.companyEmail)} />
                          {errors.companyEmail && <p className="mt-1 text-xs text-red-600 font-medium">{errors.companyEmail}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone number</label>
                          <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)}
                            type="tel" placeholder="+1 234 567 8900" autoComplete="tel" style={{ fontSize: '16px' }} className={inputCls(false)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">VAT number <span className="text-gray-400 font-normal">(opt)</span></label>
                            <input value={vatNumber} onChange={e => setVatNumber(e.target.value)}
                              placeholder="GB123456789" style={{ fontSize: '16px' }} className={inputCls(false)} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reg. number <span className="text-gray-400 font-normal">(opt)</span></label>
                            <input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)}
                              placeholder="12345678" style={{ fontSize: '16px' }} className={inputCls(false)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Industry <span className="text-gray-400 font-normal">(optional)</span></label>
                          <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ fontSize: '16px' }}
                            className={inputCls(false) + ' cursor-pointer'}>
                            <option value="">Select industry</option>
                            <option value="retail">Retail & E-commerce</option>
                            <option value="manufacturing">Manufacturing</option>
                            <option value="healthcare">Healthcare & Pharma</option>
                            <option value="automotive">Automotive</option>
                            <option value="technology">Technology</option>
                            <option value="food">Food & Beverage</option>
                            <option value="construction">Construction</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website <span className="text-gray-400 font-normal">(optional)</span></label>
                          <input value={website} onChange={e => setWebsite(e.target.value)}
                            placeholder="https://yourcompany.com" style={{ fontSize: '16px' }} className={inputCls(false)} />
                        </div>
                      </>
                    )}

                    {/* Password fields — shared */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          value={accountType === 'individual' ? password : companyPassword}
                          onChange={e => {
                            const val = e.target.value;
                            accountType === 'individual' ? setPassword(val) : setCompanyPassword(val);
                            setErrors(p => ({ ...p, [accountType === 'individual' ? 'password' : 'companyPassword']: '' }));
                          }}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          autoComplete="new-password"
                          style={{ fontSize: '16px' }}
                          className={inputCls(!!(accountType === 'individual' ? errors.password : errors.companyPassword)) + ' pr-11'}
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                          className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {(accountType === 'individual' ? errors.password : errors.companyPassword) && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{accountType === 'individual' ? errors.password : errors.companyPassword}</p>
                      )}
                      <PasswordStrength password={accountType === 'individual' ? password : companyPassword} />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm password</label>
                      <div className="relative">
                        <input
                          value={accountType === 'individual' ? confirm : companyConfirm}
                          onChange={e => {
                            const val = e.target.value;
                            accountType === 'individual' ? setConfirm(val) : setCompanyConfirm(val);
                            setErrors(p => ({ ...p, [accountType === 'individual' ? 'confirm' : 'companyConfirm']: '' }));
                          }}
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          style={{ fontSize: '16px' }}
                          className={inputCls(!!(accountType === 'individual' ? errors.confirm : errors.companyConfirm)) + ' pr-11'}
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                          className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {(accountType === 'individual' ? errors.confirm : errors.companyConfirm) && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{accountType === 'individual' ? errors.confirm : errors.companyConfirm}</p>
                      )}
                      {(() => {
                        const pw = accountType === 'individual' ? password : companyPassword;
                        const cf = accountType === 'individual' ? confirm : companyConfirm;
                        const err = accountType === 'individual' ? errors.confirm : errors.companyConfirm;
                        return cf && cf === pw && !err ? (
                          <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />Passwords match
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {/* Terms */}
                    <div className={`rounded-xl border p-4 transition ${errors.agreed ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-gray-50'}`}>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <div className="relative mt-0.5 shrink-0" onClick={() => { setAgreed(v => !v); setErrors(p => ({ ...p, agreed: '' })); }}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${agreed ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                            {agreed && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 leading-relaxed">
                          I agree to the{' '}
                          <Link href={`/${locale}/terms`} target="_blank" className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">Terms of Service</Link>{' '}
                          and{' '}
                          <Link href={`/${locale}/privacy`} target="_blank" className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">Privacy Policy</Link>.
                          I confirm I am at least 18 years of age.
                        </span>
                      </label>
                      {errors.agreed && <p className="mt-2 text-xs text-red-600 font-medium pl-7">{errors.agreed}</p>}
                    </div>

                    <button type="submit" disabled={isSubmitting || googleLoading}
                      className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                      {isSubmitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating account…</span></>
                        : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>

                  <p className="mt-5 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={`/${locale}/sign-in`} className="font-bold text-blue-600 hover:text-blue-700 transition">Sign in</Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Step indicator */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {(['type', 'method', 'form'] as Step[]).map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-blue-600' : i < (['type', 'method', 'form'] as Step[]).indexOf(step) ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'}`} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}