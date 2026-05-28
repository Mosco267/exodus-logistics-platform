// src/app/[locale]/dashboard/settings/forgot-password/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useIntl } from 'react-intl';

export default function SettingsForgotPasswordPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const { data: session } = useSession();
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

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

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

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

  const handleSendLink = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setError(t('ForgotPassword.errValidEmail')); return; }
    if (!emailMatchesAccount) { setError(t('ForgotPassword.errNotAssociated')); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('ForgotPassword.errSendFailed')); return; }
      setSent(true);
      startCountdown();
    } catch { setError(t('ForgotPassword.errGeneric')); }
    finally { setLoading(false); }
  };

  return (
    <>
      {!ready ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
            style={{ borderTopColor: accentSolid }} />
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-5 pb-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${locale}/dashboard/settings/security`)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
              <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
                style={isMidnight ? { color: '#ffffff' } : {}}>{t('ForgotPassword.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('ForgotPassword.subtitle')}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6">

            {!sent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('ForgotPassword.confirmEmail')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('ForgotPassword.confirmEmailSub')}</p>
                  </div>
                </div>

                <div>
                  <input
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    type="email"
                    placeholder={t('ForgotPassword.emailPlaceholder')}
                    className={inputClass}
                    style={{ fontSize: '16px' }}
                  />
                  {email && sessionEmail && !emailMatchesAccount && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{t('ForgotPassword.errNotAssociated')}</p>
                  )}
                </div>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                <button
                  onClick={handleSendLink}
                  disabled={loading || !email || !emailMatchesAccount}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                  style={{ background: accent }}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  {loading ? t('ForgotPassword.sending') : t('ForgotPassword.sendResetLink')}
                </button>

                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-relaxed pt-1">
                  {t('ForgotPassword.formNote')}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: accent }}>
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('ForgotPassword.checkEmail')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t('ForgotPassword.sentDesc', {
                    email: email,
                    strong: (chunks: any) => <strong className="text-gray-900 dark:text-white">{chunks}</strong>,
                  })}
                </p>
                <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-left">
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">{t('ForgotPassword.securityLabel')}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    {t('ForgotPassword.securityNote')}
                  </p>
                </div>

                <div className="pt-2">
                  {countdown > 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('ForgotPassword.resendIn', {
                        seconds: countdown,
                        strong: (chunks: any) => <strong>{chunks}</strong>,
                      })}
                    </p>
                  ) : (
                    <button onClick={handleSendLink} disabled={loading}
                      className="text-xs font-semibold hover:underline cursor-pointer disabled:opacity-50"
                      style={{ color: accentSolid }}>
                      {t('ForgotPassword.resendLink')}
                    </button>
                  )}
                </div>

                <button onClick={() => router.push(`/${locale}/dashboard/settings/security`)}
                  className="w-full py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer mt-2">
                  {t('ForgotPassword.backToSecurity')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}