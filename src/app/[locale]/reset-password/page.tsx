'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Lock, CheckCircle2, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useIntl, type IntlShape } from 'react-intl';
import PasswordInput from '@/components/PasswordInput';
import { useCompany } from '@/lib/useCompany';

function PasswordStrength({ password, intl }: { password: string; intl: IntlShape }) {
  const t = (id: string) => intl.formatMessage({ id });
  const checks = [
    { label: t('SignUp.pwLength'), pass: password.length >= 8 },
    { label: t('SignUp.pwUpper'), pass: /[A-Z]/.test(password) },
    { label: t('SignUp.pwNumber'), pass: /[0-9]/.test(password) },
    { label: t('SignUp.pwSpecial'), pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const barColor = score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : score === 3 ? 'bg-blue-400' : 'bg-emerald-500';
  const label = ['', t('SignUp.pwWeak'), t('SignUp.pwFair'), t('SignUp.pwGood'), t('SignUp.pwStrong')][score];
  const labelColor = ['', 'text-red-500', 'text-amber-600', 'text-blue-600', 'text-emerald-600'][score];
  if (!password) return null;
  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map(i => (
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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
    const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const company = useCompany();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const isValidPassword = password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
        if (!isValidPassword) { setError(t('SignUp.errPasswordWeak')); return; }
    if (password !== confirm) { setError(t('SignUp.errMismatch')); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
                        const code = String(json?.error || '');
        setError(
          code === 'INVALID_TOKEN' ? t('Reset.errInvalidToken')
          : code === 'WEAK_PASSWORD' ? t('SignUp.errPasswordWeak')
          : code === 'PASSWORD_REUSED' ? t('Reset.errReused')
          : code === 'MISSING_FIELDS' ? t('Reset.errMissingFields')
          : t('Reset.errGeneric')
        );
        return;
      }
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
            setTimeout(() => { router.push(`/${locale}/sign-in`); }, 3000);
    } catch {
      setError(t('Reset.errGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-to-br from-slate-50 via-blue-50/20 to-white">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <AlertCircle className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">{t('Reset.invalidTitle')}</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            {t('Reset.invalidBody')}
          </p>
          <Link href={`/${locale}/forgot-password`}
            className="mt-6 inline-flex items-center justify-center w-full h-11 rounded-xl font-bold text-sm text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
            {t('Reset.requestNew')}
          </Link>
        </div>
      </div>
    );
  }

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
              <defs><pattern id="grid2" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1"/>
              </pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid2)" />
            </svg>
            <div className="absolute top-1/3 right-8 w-2 h-2 rounded-full bg-orange-400 opacity-60" />
            <div className="absolute top-1/2 right-24 w-1.5 h-1.5 rounded-full bg-cyan-300 opacity-50" />
            <div className="absolute top-2/3 right-16 w-1 h-1 rounded-full bg-white opacity-40" />
          </div>

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="relative z-10">
                        <Link href={`/${locale}`}>
              <Image src="/logo-gradient.svg" alt={company.name || 'Exodus Logistics'} width={240} height={96} className="h-20 w-auto" priority />
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="relative z-10 space-y-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                                {t('Reset.heroLine1')}<br />
                <span style={{ background: 'linear-gradient(90deg, #67e8f9, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t('Reset.heroLine2')}
                </span>
              </h2>
              <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                                {t('Reset.heroBlurb')}
              </p>
            </div>
            <div className="space-y-3">
              {[t('SignUp.pwLength'), t('SignUp.pwUpper'), t('SignUp.pwNumber'), t('SignUp.pwSpecial')].map(title => (
                <div key={title} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <p className="text-sm font-bold text-white">{title}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="relative z-10">
                        <p className="text-xs text-white/30">{t('SignIn.copyright', { year: new Date().getFullYear(), company: company.name || 'Exodus Logistics Ltd.' })}</p>
          </div>
        </div>

        {/* Right Panel */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:px-10 sm:py-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>

          <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.04) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }} className="w-full max-w-[420px] relative z-10">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-6 sm:p-10">

              {!success ? (
                <>
                  <div className="mb-5 sm:mb-7">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl mb-4 sm:mb-5 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                                        <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{t('Reset.title')}</h1>
                    <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                      {t('Reset.subtitle')}
                    </p>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />{error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div>
                                           <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('Reset.newPassword')}</label>
                      <PasswordInput
                        value={password}
                        onChange={v => { setPassword(v); setError(''); }}
                        placeholder={t('SignUp.passwordPlaceholder')}
                        autoComplete="new-password"
                      />
                      <PasswordStrength password={password} intl={intl} />
                    </div>
                    <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('SignUp.confirmLabel')}</label>
                      <PasswordInput
                        value={confirm}
                        onChange={v => { setConfirm(v); setError(''); }}
                        placeholder={t('SignUp.confirmPlaceholder')}
                        autoComplete="new-password"
                      />
                      {confirm && confirm === password && (
                        <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                                   <CheckCircle2 className="w-3 h-3" />{t('SignUp.passwordsMatch')}
                        </p>
                      )}
                    </div>
                    <button type="submit"
                      disabled={isSubmitting || !isValidPassword || password !== confirm}
                      className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                      {isSubmitting
                                               ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{t('Reset.updating')}</span></>
                        : <span>{t('Reset.submit')}</span>}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-sm text-gray-500">
                                        <Link href={`/${locale}/sign-in`}
                      className="font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline transition">
                      {t('Forgot.backToSignIn')}
                    </Link>
                  </p>
                </>
              ) : (
                <div className="text-center py-2 sm:py-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                    <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{t('Reset.successTitle')}</h2>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                    {t('Reset.successBody')}<br />
                    {t('Reset.redirecting')}
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}