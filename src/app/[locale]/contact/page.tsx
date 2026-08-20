// src/app/[locale]/contact/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  MapPin, Phone, Mail, Send, Loader2, Clock, MessageCircle,
  CheckCircle2, AlertCircle, Package, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useCompany, telHref, addressLines } from '@/lib/useCompany';

type FormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
};

const SUBJECTS = ['general', 'support', 'billing', 'quote', 'complaint', 'partnership'] as const;

const EMPTY: FormData = {
  name: '', email: '', phone: '', company: '', subject: '', message: '',
};

export default function ContactPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const company = useCompany();
  const addressParts = addressLines(company.address);

  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const set = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setGeneralError('');
  };

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = t('Contact.errName');
    if (!form.email.trim()) e.email = t('Contact.errEmail');
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = t('Contact.errEmailInvalid');
    if (!form.subject) e.subject = t('Contact.errSubject');
    if (!form.message.trim()) e.message = t('Contact.errMessage');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, locale }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        /* The API returns codes rather than prose so messages follow the
           reader's language. */
        const code = String(json?.error || '');
        setGeneralError(
          code === 'RATE_LIMITED' ? t('Contact.errRateLimited')
          : code === 'INVALID_EMAIL' ? t('Contact.errEmailInvalid')
          : code === 'MISSING_FIELDS' ? t('Contact.errMissingFields')
          : t('Contact.errGeneric')
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setIsSubmitted(true);
      setForm(EMPTY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setGeneralError(t('Contact.errGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = () => {
    /* Tawk is loaded per route by LiveChatLoader. Opening it directly is
       better than telling the visitor to phone instead. */
    try {
      const api = (window as any).Tawk_API;
      if (api?.maximize) { api.maximize(); return; }
    } catch {}
    // If the widget has not loaded, fall back to email
    if (company.email) window.location.href = `mailto:${company.email}`;
  };

  const inputCls = (hasError: boolean) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
      hasError
        ? 'border-red-400 focus:ring-red-400/20 bg-red-50/30'
        : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
    }`;

  // ── Success state ──────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-cyan-400" />
          <div className="p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-gray-900">{t('Contact.sentTitle')}</h2>
            <p className="mt-3 text-gray-600 leading-relaxed">{t('Contact.sentBody')}</p>

            <div className="mt-7 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => setIsSubmitted(false)}
                className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
                <Send className="w-4 h-4" /> {t('Contact.sendAnother')}
              </button>
              <Link href={`/${locale}/track`}
                className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
                <Package className="w-4 h-4" /> {t('Contact.trackShipment')}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ──────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-white py-16 sm:py-20 overflow-hidden relative"
        style={{ background: 'linear-gradient(to right, #1d4ed8 0%, #0891b2 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">{t('Contact.title')}</h1>
            <p className="text-lg text-blue-50/90 max-w-2xl mx-auto leading-relaxed">
              {t('Contact.subtitle')}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Form + info ───────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Form */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8"
              >
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('Contact.formTitle')}</h2>
                <p className="mt-1.5 text-sm text-gray-500">{t('Contact.formSubtitle')}</p>

                <AnimatePresence>
                  {generalError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words">{generalError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="c-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('Contact.nameLabel')} <span className="text-red-500">*</span>
                      </label>
                      <input id="c-name" type="text" value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder={t('Contact.namePlaceholder')}
                        style={{ fontSize: '16px' }}
                        className={inputCls(!!errors.name)} />
                      {errors.name && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="c-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('Contact.emailLabel')} <span className="text-red-500">*</span>
                      </label>
                      <input id="c-email" type="email" value={form.email}
                        onChange={e => set('email', e.target.value)}
                        placeholder={t('Contact.emailPlaceholder')}
                        autoComplete="email"
                        style={{ fontSize: '16px' }}
                        className={inputCls(!!errors.email)} />
                      {errors.email && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="c-phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('Contact.phoneLabel')}
                      </label>
                      <input id="c-phone" type="tel" value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        placeholder={t('Contact.phonePlaceholder')}
                        autoComplete="tel"
                        style={{ fontSize: '16px' }}
                        className={inputCls(false)} />
                    </div>
                    <div>
                      <label htmlFor="c-company" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t('Contact.companyLabel')}
                      </label>
                      <input id="c-company" type="text" value={form.company}
                        onChange={e => set('company', e.target.value)}
                        placeholder={t('Contact.companyPlaceholder')}
                        style={{ fontSize: '16px' }}
                        className={inputCls(false)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="c-subject" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('Contact.subjectLabel')} <span className="text-red-500">*</span>
                    </label>
                    <select id="c-subject" value={form.subject}
                      onChange={e => set('subject', e.target.value)}
                      style={{ fontSize: '16px' }}
                      className={`cursor-pointer ${inputCls(!!errors.subject)}`}>
                      <option value="">{t('Contact.subjectPlaceholder')}</option>
                      {SUBJECTS.map(s => (
                        <option key={s} value={s}>{t(`Contact.subject_${s}`)}</option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{errors.subject}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="c-message" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {t('Contact.messageLabel')} <span className="text-red-500">*</span>
                    </label>
                    <textarea id="c-message" value={form.message}
                      onChange={e => set('message', e.target.value.slice(0, 5000))}
                      rows={6}
                      placeholder={t('Contact.messagePlaceholder')}
                      style={{ fontSize: '16px' }}
                      className={`resize-none ${inputCls(!!errors.message)}`} />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {errors.message ? (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errors.message}
                        </p>
                      ) : <span />}
                      <p className="text-xs text-gray-400 tabular-nums shrink-0">{form.message.length}/5000</p>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-2xl font-bold text-sm text-white transition-all hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}
                  >
                    {isLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Contact.sending')}</>
                      : <><Send className="w-4 h-4" /> {t('Contact.submit')}</>}
                  </motion.button>

                  <p className="text-xs text-gray-400 text-center leading-relaxed">
                    {t('Contact.privacyNote', {
                      link: (chunks: any) => (
                        <Link href={`/${locale}/privacy`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                      ),
                    })}
                  </p>
                </form>
              </motion.div>
            </div>

            {/* Info column */}
            <div className="space-y-4">

              {addressParts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }} viewport={{ once: true }}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">{t('Contact.addressLabel')}</h3>
                      {addressParts.map((line, i) => (
                        <p key={i} className="text-sm text-gray-600 leading-relaxed">{line}</p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {company.phone && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }} viewport={{ once: true }}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">{t('Contact.phoneInfoLabel')}</h3>
                      <a href={telHref(company.phone)}
                        className="text-sm text-blue-700 hover:text-blue-800 font-semibold transition">
                        {company.phone}
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              {company.email && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }} viewport={{ once: true }}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">{t('Contact.emailInfoLabel')}</h3>
                      <a href={`mailto:${company.email}`}
                        className="text-sm text-blue-700 hover:text-blue-800 font-semibold transition break-all">
                        {company.email}
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }} viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2.5 rounded-xl shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1">{t('Contact.hoursLabel')}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{t('Contact.hoursBody')}</p>
                  </div>
                </div>
              </motion.div>

              {/* Live chat */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }} viewport={{ once: true }}
                className="rounded-2xl text-white p-5 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-5 h-5" />
                  <h3 className="text-lg font-bold">{t('Contact.chatTitle')}</h3>
                </div>
                <p className="text-sm text-blue-50/90 leading-relaxed mb-4">{t('Contact.chatBody')}</p>
                <button onClick={openChat}
                  className="cursor-pointer w-full bg-white text-blue-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition">
                  {t('Contact.chatButton')}
                </button>
              </motion.div>

              {/* Self service */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }} viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-1">{t('Contact.selfServeTitle')}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{t('Contact.selfServeBody')}</p>
                <div className="space-y-2">
                  <Link href={`/${locale}/track`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition">
                    <Package className="w-4 h-4" /> {t('Contact.trackShipment')}
                  </Link>
                  <Link href={`/${locale}/invoice`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition">
                    <FileText className="w-4 h-4" /> {t('Contact.viewInvoice')}
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('Contact.faqTitle')}
            </h2>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              {t('Contact.faqSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {[1, 2, 3, 4].map((n, index) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }} viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6"
              >
                <h3 className="text-base font-bold text-gray-900 mb-2">{t(`Contact.faq${n}Q`)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t(`Contact.faq${n}A`, {
                    email: () => (
                      <a href={`mailto:${company.email}`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all">
                        {company.email}
                      </a>
                    ),
                    quote: (chunks: any) => (
                      <Link href={`/${locale}/quote`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                    ),
                    track: (chunks: any) => (
                      <Link href={`/${locale}/track`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                    ),
                  })}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}