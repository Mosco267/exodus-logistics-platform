// src/app/[locale]/services/page.tsx
'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Plane, Ship, Truck, Warehouse, FileCheck, ShieldCheck,
  Calculator, ArrowRight, Check, BadgeCheck, MapPin, Languages,
} from 'lucide-react';
import { useCompany } from '@/lib/useCompany';

export default function ServicesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const company = useCompany();

  /* Delivery ranges come straight from the same tiers the quote engine
     uses, so the page and the price a customer is shown never disagree. */
  const services = [
    {
      icon: Plane,
      key: 'air',
      speed: t('Services.airSpeed'),
      features: ['airF1', 'airF2', 'airF3', 'airF4'],
    },
    {
      icon: Ship,
      key: 'sea',
      speed: t('Services.seaSpeed'),
      features: ['seaF1', 'seaF2', 'seaF3', 'seaF4'],
    },
    {
      icon: Truck,
      key: 'road',
      speed: t('Services.roadSpeed'),
      features: ['roadF1', 'roadF2', 'roadF3', 'roadF4'],
    },
  ];

  const support = [
    { icon: FileCheck, key: 'customs' },
    { icon: Warehouse, key: 'warehousing' },
    { icon: ShieldCheck, key: 'insurance' },
    { icon: MapPin, key: 'tracking' },
    { icon: Calculator, key: 'invoicing' },
    { icon: Languages, key: 'language' },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ──────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-white py-16 sm:py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(to right, #1d4ed8 0%, #0891b2 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight leading-[1.15]">
              {t('Services.title')}
            </h1>
            <p className="text-lg text-blue-50/90 leading-relaxed">
              {t('Services.subtitle')}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Core services ─────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-2xl mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('Services.coreTitle')}
            </h2>
            <p className="mt-3 text-lg text-gray-600 leading-relaxed">
              {t('Services.coreSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {services.map(({ icon: Icon, key, speed, features }, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-bold text-blue-700 whitespace-nowrap">
                    {speed}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-gray-900 mb-2">{t(`Services.${key}Title`)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">{t(`Services.${key}Desc`)}</p>

                <ul className="space-y-2.5 mt-auto">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{t(`Services.${f}`)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-6 text-xs text-gray-500 leading-relaxed max-w-3xl"
          >
            {t('Services.speedNote')}
          </motion.p>
        </div>
      </section>

      {/* ── Credentials ───────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <BadgeCheck className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-base font-bold text-gray-900 mb-2">{t('Services.credFiataTitle')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t('Services.credFiataDesc')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <ShieldCheck className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-base font-bold text-gray-900 mb-2">{t('Services.credLiabilityTitle')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('Services.credLiabilityDesc', {
                  link: (chunks: any) => (
                    <Link href={`/${locale}/contact`} className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{chunks}</Link>
                  ),
                })}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.16 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <Truck className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-base font-bold text-gray-900 mb-2">{t('Services.credFleetTitle')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t('Services.credFleetDesc')}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── What comes with every shipment ────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-2xl mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('Services.includedTitle')}
            </h2>
            <p className="mt-3 text-lg text-gray-600 leading-relaxed">
              {t('Services.includedSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {support.map(({ icon: Icon, key }, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{t(`Services.${key}Title`)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t(`Services.${key}Desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How pricing works ─────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                {t('Services.pricingTitle')}
              </h2>
              <div className="mt-5 space-y-4 text-gray-600 leading-relaxed">
                <p>{t('Services.pricingPara1')}</p>
                <p>{t('Services.pricingPara2')}</p>
              </div>
              <Link href={`/${locale}/quote`}
                className="cursor-pointer mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-bold transition hover:shadow-lg hover:shadow-blue-500/25"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                <Calculator className="w-4 h-4" /> {t('Services.pricingCta')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">
                {t('Services.breakdownTitle')}
              </p>
              <ul className="space-y-3">
                {['breakdown1', 'breakdown2', 'breakdown3', 'breakdown4', 'breakdown5'].map(k => (
                  <li key={k} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700">{t(`Services.${k}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                {t('Services.breakdownNote')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20 text-white"
        style={{ background: 'linear-gradient(to right, #1d4ed8 0%, #0891b2 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              {t('Services.ctaTitle')}
            </h2>
            <p className="text-lg mb-8 text-blue-50/90 max-w-2xl mx-auto leading-relaxed">
              {t('Services.ctaBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/${locale}/quote`}
                className="cursor-pointer inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition shadow-sm">
                <Calculator className="w-4 h-4" /> {t('Services.ctaQuote')}
              </Link>
              <Link href={`/${locale}/contact`}
                className="cursor-pointer inline-flex items-center justify-center gap-2 border border-white/30 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-2xl font-bold hover:bg-white/20 transition">
                {t('Services.ctaContact')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}