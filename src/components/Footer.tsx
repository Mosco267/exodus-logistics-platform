'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  MapPin, Phone, Mail,
  ShieldCheck, Clock, Globe,
} from 'lucide-react';
import { useCompany, telHref, addressLines } from '@/lib/useCompany';

export default function Footer() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const l = (path: string) => `/${locale}${path}`;
  const year = new Date().getFullYear();

  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  /* Company details come from admin settings, so changing the address
     or support email there updates everywhere with no code edit. */
  const company = useCompany();
  const lines = addressLines(company.address);
  const hasContact = lines.length > 0 || !!company.phone || !!company.email;

  const columns = [
    {
      title: t('Footer.colServices'),
      links: [
        { label: t('Footer.linkAir'), href: '/services' },
        { label: t('Footer.linkSea'), href: '/services' },
        { label: t('Footer.linkRoad'), href: '/services' },
        { label: t('Footer.linkWarehouse'), href: '/services' },
      ],
    },
    {
      title: t('Footer.colCompany'),
      links: [
        { label: t('Footer.linkAbout'), href: '/about' },
        { label: t('Footer.linkContact'), href: '/contact' },
        { label: t('Footer.linkHelp'), href: '/support' },
      ],
    },
    {
      title: t('Footer.colShipping'),
      links: [
        { label: t('Footer.linkTrack'), href: '/track' },
        { label: t('Footer.linkQuote'), href: '/quote' },
        { label: t('Footer.linkInvoice'), href: '/invoice' },
        { label: t('Footer.linkSignIn'), href: '/sign-in' },
      ],
    },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-900 text-white">

      {/* ── Trust strip ─────────────────────────────────── */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: t('Footer.trust1Title'), text: t('Footer.trust1Text') },
            { icon: Clock, title: t('Footer.trust2Title'), text: t('Footer.trust2Text') },
            { icon: Globe, title: t('Footer.trust3Title'), text: t('Footer.trust3Text') },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">

          {/* Brand */}
          <div className="col-span-2">
            <Link href={l('/')} className="inline-flex items-center mb-4">
              <img
                src="/logo-black.svg"
                alt={company.name || 'Exodus Logistics'}
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              {t('Footer.brandBlurb')}
            </p>
            {company.registrationNumber && (
              <p className="text-xs text-gray-500 mt-4">
                {t('Footer.registrationNumber', { number: company.registrationNumber })}
              </p>
            )}
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link, i) => (
                  <li key={`${col.title}-${i}`}>
                    <Link href={l(link.href)}
                      className="text-sm text-gray-300 hover:text-white transition">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Contact: from admin company settings ───────── */}
        {hasContact && (
          <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            {lines.length > 0 && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-cyan-400 shrink-0" />
                <div className="text-gray-400 leading-relaxed">
                  {lines.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <a href={telHref(company.phone)}
                  className="text-gray-400 hover:text-white transition">
                  {company.phone}
                </a>
              </div>
            )}
            {company.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <a href={`mailto:${company.email}`}
                  className="text-gray-400 hover:text-white transition break-all">
                  {company.email}
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Bottom bar ──────────────────────────────────── */}
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            {t('Footer.copyright', { year, company: company.name || 'Exodus Logistics Ltd.' })}
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { label: t('Footer.linkPrivacy'), href: '/privacy' },
              { label: t('Footer.linkTerms'), href: '/terms' },
              { label: t('Footer.linkCookies'), href: '/cookies' },
              { label: t('Footer.linkStatus'), href: '/servers' },
            ].map(x => (
              <Link key={x.label} href={l(x.href)}
                className="text-xs text-gray-500 hover:text-white transition">
                {x.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.footer>
  );
}