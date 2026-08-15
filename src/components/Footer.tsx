'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  MapPin, Phone, Mail, Facebook, Twitter, Linkedin, Instagram,
  ShieldCheck, Clock, Globe,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   ADJUST THIS to match your admin company-settings endpoint.
   ───────────────────────────────────────────────────────────── */
const COMPANY_SETTINGS_ENDPOINT = '/api/company';

type CompanySettings = {
  addressLines: string[];
  phone: string;
  email: string;
  socials: { facebook?: string; twitter?: string; linkedin?: string; instagram?: string };
};

/**
 * Reads whatever shape your admin settings return and normalises it.
 * Field names are guessed across common variants. If a value doesn't
 * show up, add your actual key to the relevant `pick()` list below.
 */
function normalizeSettings(raw: any): CompanySettings {
  const c = raw?.settings || raw?.company || raw || {};

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = c[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };

  let addressLines: string[] = [];
  if (Array.isArray(c.addressLines)) {
    addressLines = c.addressLines.filter(Boolean);
  } else {
    const street = pick('addressStreet', 'street', 'address', 'addressLine1');
    const city = pick('addressCity', 'city');
    const state = pick('addressState', 'state', 'region');
    const postal = pick('addressPostalCode', 'postalCode', 'zip', 'zipCode');
    const country = pick('addressCountry', 'country');

    const cityLine = [city, state, postal].filter(Boolean).join(', ');
    addressLines = [street, cityLine, country].filter(Boolean);
  }

  return {
    addressLines,
    phone: pick('phone', 'phoneNumber', 'companyPhone', 'contactPhone'),
    email: pick('email', 'companyEmail', 'contactEmail', 'supportEmail'),
    socials: {
      facebook: pick('facebook', 'facebookUrl'),
      twitter: pick('twitter', 'twitterUrl', 'x', 'xUrl'),
      linkedin: pick('linkedin', 'linkedinUrl'),
      instagram: pick('instagram', 'instagramUrl'),
    },
  };
}

export default function Footer() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const l = (path: string) => `/${locale}${path}`;
  const year = new Date().getFullYear();

  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(COMPANY_SETTINGS_ENDPOINT, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (json && !cancelled) setCompany(normalizeSettings(json)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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

  const socialLinks = [
    { Icon: Facebook, href: company?.socials.facebook, label: 'Facebook' },
    { Icon: Twitter, href: company?.socials.twitter, label: 'X' },
    { Icon: Linkedin, href: company?.socials.linkedin, label: 'LinkedIn' },
    { Icon: Instagram, href: company?.socials.instagram, label: 'Instagram' },
  ].filter(s => s.href);

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
              <img src="/logo-black.svg" alt="Exodus Logistics" className="h-8 w-auto brightness-0 invert" />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              {t('Footer.brandBlurb')}
            </p>

            {socialLinks.length > 0 && (
              <div className="flex gap-3 mt-6">
                {socialLinks.map(({ Icon, href, label }) => (
                  <a key={label} href={href} aria-label={label}
                    target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
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
        {company && (company.addressLines.length > 0 || company.phone || company.email) && (
          <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            {company.addressLines.length > 0 && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-cyan-400 shrink-0" />
                <div className="text-gray-400 leading-relaxed">
                  {company.addressLines.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`}
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
            {t('Footer.copyright', { year })}
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