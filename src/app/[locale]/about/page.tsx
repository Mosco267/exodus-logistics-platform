// src/app/[locale]/about/page.tsx
'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Warehouse, Truck, Globe, Target, Compass, ShieldCheck,
  MapPin, Languages, Calculator, ArrowRight, Package,
} from 'lucide-react';
import { useCompany, addressLines } from '@/lib/useCompany';

export default function AboutPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const company = useCompany();
  const addressParts = addressLines(company.address);

  const yearsOperating = new Date().getFullYear() - 2012;

  /* What we do differently. These are all things the platform actually
     does, rather than claims about scale we cannot support. */
  const differentiators = [
    { icon: Warehouse, title: t('About.diff1Title'), desc: t('About.diff1Desc') },
    { icon: MapPin, title: t('About.diff2Title'), desc: t('About.diff2Desc') },
    { icon: Languages, title: t('About.diff3Title'), desc: t('About.diff3Desc') },
    { icon: Calculator, title: t('About.diff4Title'), desc: t('About.diff4Desc') },
  ];

  const principles = [
    { icon: Target, title: t('About.missionTitle'), desc: t('About.missionDesc') },
    { icon: Compass, title: t('About.visionTitle'), desc: t('About.visionDesc') },
    { icon: ShieldCheck, title: t('About.valuesTitle'), desc: t('About.valuesDesc') },
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm mb-5">
              <Package className="w-3.5 h-3.5" />
              <span className="text-xs font-bold tracking-widest uppercase">
                {t('About.badge', { years: yearsOperating })}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight leading-[1.15]">
              {t('About.title', { company: company.name || 'Exodus Logistics' })}
            </h1>
            <p className="text-lg text-blue-50/90 leading-relaxed">
              {t('About.subtitle')}
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Who we are ────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {t('About.storyTitle')}
              </h2>
              <div className="mt-5 space-y-4 text-gray-600 leading-relaxed">
                <p>{t('About.storyPara1', { year: 2012 })}</p>
                <p>{t('About.storyPara2')}</p>
                <p>{t('About.storyPara3')}</p>
              </div>
            </motion.div>

            {/* Facts card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="lg:col-span-2 rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:p-7"
            >
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-500 mb-5">
                {t('About.factsTitle')}
              </h3>

              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">{t('About.factOperating')}</dt>
                  <dd className="mt-0.5 text-base font-bold text-gray-900">{t('About.factOperatingValue', { year: 2012 })}</dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">{t('About.factFleet')}</dt>
                  <dd className="mt-0.5 text-base font-bold text-gray-900">{t('About.factFleetValue')}</dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">{t('About.factServices')}</dt>
                  <dd className="mt-0.5 text-base font-bold text-gray-900">{t('About.factServicesValue')}</dd>
                </div>

                {addressParts.length > 0 && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">{t('About.factBased')}</dt>
                    <dd className="mt-0.5 text-base font-bold text-gray-900 leading-snug">
                      {addressParts.map((line, i) => <span key={i} className="block">{line}</span>)}
                    </dd>
                  </div>
                )}

                {company.registrationNumber && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">{t('About.factRegistration')}</dt>
                    <dd className="mt-0.5 text-base font-bold text-gray-900">{company.registrationNumber}</dd>
                  </div>
                )}
              </dl>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── What makes us different ───────────────────── */}
      <section className="py-16 sm:py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-2xl mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('About.diffTitle')}
            </h2>
            <p className="mt-3 text-lg text-gray-600 leading-relaxed">
              {t('About.diffSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {differentiators.map(({ icon: Icon, title, desc }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission, vision, values ───────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('About.principlesTitle')}
            </h2>
            <p className="mt-3 text-lg text-gray-600 leading-relaxed">
              {t('About.principlesSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {principles.map(({ icon: Icon, title, desc }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {t('About.howTitle')}
            </h2>
            <p className="mt-3 text-lg text-gray-600 leading-relaxed">
              {t('About.howSubtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[1, 2, 3].map((n, index) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 text-white font-extrabold text-sm"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                  {n}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{t(`About.step${n}Title`)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t(`About.step${n}Desc`)}</p>
              </motion.div>
            ))}
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
              {t('About.ctaTitle')}
            </h2>
            <p className="text-lg mb-8 text-blue-50/90 max-w-2xl mx-auto leading-relaxed">
              {t('About.ctaBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/${locale}/quote`}
                className="cursor-pointer inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition shadow-sm">
                <Calculator className="w-4 h-4" /> {t('About.ctaQuote')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={`/${locale}/contact`}
                className="cursor-pointer inline-flex items-center justify-center gap-2 border border-white/30 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-2xl font-bold hover:bg-white/20 transition">
                {t('About.ctaContact')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}