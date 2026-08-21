// src/app/[locale]/cookies/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useIntl } from 'react-intl';
import { Cookie, ArrowLeft, Languages, Check, X, RotateCcw } from 'lucide-react';
import { useCompany } from '@/lib/useCompany';
import { useCookieConsent } from '@/lib/useCookieConsent';

const LAST_UPDATED = 'April 3, 2026';
const WEBSITE = 'goexoduslogistics.com';

/* Every cookie listed here is one the site actually sets. Naming a
   cookie that does not exist, or omitting one that does, is the most
   common failure in a cookie policy. */
type Row = { name: string; purpose: string; duration: string; party: string };

const ESSENTIAL: Row[] = [
  {
    name: 'authjs.session-token',
    purpose: 'Keeps you signed in as you move between pages. Without it you would have to sign in on every page.',
    duration: 'Session, or 30 days if you chose to stay signed in',
    party: 'First party',
  },
  {
    name: 'authjs.csrf-token',
    purpose: 'Protects sign-in and account forms against cross-site request forgery.',
    duration: 'Session',
    party: 'First party',
  },
  {
    name: 'exodus_locale',
    purpose: 'Remembers the language you chose, so the site does not revert to a guess based on your location.',
    duration: '1 year',
    party: 'First party',
  },
  {
    name: 'exodus_cookie_consent',
    purpose: 'Records whether you accepted or rejected non-essential cookies, so you are not asked repeatedly.',
    duration: '6 months',
    party: 'First party',
  },
];

const FUNCTIONAL: Row[] = [
  {
    name: 'exodus_theme_cache',
    purpose: 'Remembers whether you prefer the light or dark appearance.',
    duration: 'Stored locally until you clear your browser data',
    party: 'First party',
  },
  {
    name: 'exodus_remember_enabled',
    purpose: 'Remembers that you asked us to keep your email address on the sign-in form.',
    duration: 'Stored locally until you clear your browser data',
    party: 'First party',
  },
  {
    name: 'exodus_remember_email',
    purpose: 'Stores the email address to prefill on the sign-in form. Only set if you tick "Remember me".',
    duration: 'Stored locally until you clear your browser data',
    party: 'First party',
  },
];

const THIRD_PARTY: Row[] = [
  {
    name: 'Tawk.to cookies (names beginning TWK or __tawk)',
    purpose: 'Runs our live chat widget. Keeps your conversation available as you move between pages and tells the agent whether you are a returning visitor. Tawk.to also receives your IP address and the pages you have viewed.',
    duration: 'Varies by cookie, from session to 12 months',
    party: 'Tawk.to',
  },
];

export default function CookiePolicyPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();
  const company = useCompany();
  const COMPANY = company.name || 'Exodus Logistics Ltd.';

  const { consent, loaded, accept, reject } = useCookieConsent();
  const isEnglish = locale === 'en';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/20 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">

        {/* Back */}
        <div className="mb-8">
          <Link href={`/${locale}`}
            className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-700 transition">
            <ArrowLeft className="w-4 h-4" /> {intl.formatMessage({ id: 'Legal.backHome' })}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
              <Cookie className="w-6 h-6 text-blue-700" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Cookie Policy</h1>
              <p className="text-sm text-gray-500 mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>

          {!isEnglish && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
              <Languages className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                {intl.formatMessage({ id: 'Legal.languageNotice' })}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800 leading-relaxed">
            This policy explains which cookies {COMPANY} sets at {WEBSITE}, what each one does, and how to change your choice. It sits alongside our <Link href={`/${locale}/privacy`} className="font-semibold underline hover:no-underline">Privacy Policy</Link>.
          </div>
        </div>

        {/* Current choice */}
        <div className="mb-10 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-extrabold text-gray-900 mb-1">Your current choice</h2>

          {!loaded ? (
            <p className="text-sm text-gray-500">Checking…</p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-2.5">
                {consent === 'accepted' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    <Check className="w-3.5 h-3.5" /> Non-essential cookies accepted
                  </span>
                )}
                {consent === 'rejected' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700">
                    <X className="w-3.5 h-3.5" /> Non-essential cookies rejected
                  </span>
                )}
                {consent === null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                    No choice recorded yet
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                {consent === 'accepted'
                  ? 'Our live chat is loaded and may set its own cookies. You can withdraw this at any time.'
                  : consent === 'rejected'
                  ? 'Our live chat is not loaded and no third-party cookies are set. Everything else on the site works normally, including tracking a shipment and viewing an invoice.'
                  : 'Until you choose, only essential cookies are set and live chat stays unloaded.'}
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                {consent !== 'accepted' && (
                  <button onClick={accept}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-white text-sm font-bold transition hover:shadow-lg hover:shadow-blue-500/25"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                    <Check className="w-4 h-4" /> Accept non-essential cookies
                  </button>
                )}
                {consent !== 'rejected' && (
                  <button onClick={reject}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition">
                    <RotateCcw className="w-4 h-4" /> Reject and remove them
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-10">

          <Section title="1. What cookies are">
            <p>Cookies are small text files a website stores on your device. They let a site remember things between page loads, such as that you are signed in or which language you chose. Some information is stored in your browser&apos;s local storage rather than in a cookie proper; it works the same way from your point of view, so it is listed here too.</p>
          </Section>

          <Section title="2. Strictly necessary cookies">
            <p>These are required for the site to function. They cannot be switched off, because without them you could not sign in or stay signed in. We do not ask for consent to set these, as they are exempt.</p>
            <CookieTable rows={ESSENTIAL} />
          </Section>

          <Section title="3. Functional cookies">
            <p>These remember preferences you have set. They are not required for the site to work, but turning them off means the site forgets your choices each time you return.</p>
            <CookieTable rows={FUNCTIONAL} />
          </Section>

          <Section title="4. Third-party cookies">
            <p>Our live chat is provided by Tawk.to. When it loads, Tawk.to sets its own cookies and receives your IP address and the pages you have viewed, under their privacy policy rather than ours.</p>
            <p><strong>These load only if you accept.</strong> If you reject, the chat script is never injected and none of these cookies are set. The rest of the site continues to work: you can get a quote, track a shipment, open an invoice, sign in, and contact us through the contact form.</p>
            <CookieTable rows={THIRD_PARTY} />
          </Section>

          <Section title="5. What we do not use">
            <p>We do not use advertising cookies. We do not sell your data to advertisers, and we do not run third-party advertising trackers on this site. We do not build advertising profiles from your browsing.</p>
          </Section>

          <Section title="6. Changing your mind">
            <p>You can change your choice at any time using the buttons at the top of this page. Rejecting after having accepted removes the third-party cookies already set and reloads the page so the script stops running.</p>
            <p>You can also manage cookies through your browser settings, where you can block or delete cookies for individual sites. Blocking strictly necessary cookies will prevent you from signing in, though public features such as tracking a shipment and viewing an invoice will still work.</p>
            <p>We ask again after six months, so your choice is revisited rather than made once and kept indefinitely.</p>
          </Section>

          <Section title="7. Questions">
            <p>
              If you have questions about how we use cookies, contact us
              {company.email ? <> at <a href={`mailto:${company.email}`} className="text-blue-600 font-semibold hover:underline break-all">{company.email}</a></> : null}
              . For a fuller account of how we handle personal data, see our <Link href={`/${locale}/privacy`} className="text-blue-600 font-semibold hover:underline">Privacy Policy</Link>.
            </p>
          </Section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {COMPANY} All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link href={`/${locale}/terms`} className="text-gray-500 hover:text-blue-700 font-semibold transition">Terms of Service</Link>
            <Link href={`/${locale}/privacy`} className="text-gray-500 hover:text-blue-700 font-semibold transition">Privacy Policy</Link>
            <Link href={`/${locale}/cookies`} className="text-blue-700 font-semibold">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b border-gray-200">{title}</h2>
      <div className="space-y-3 text-gray-600 leading-relaxed text-sm sm:text-base">{children}</div>
    </section>
  );
}

function CookieTable({ rows }: { rows: Row[] }) {
  return (
    <div className="mt-4 space-y-3">
      {rows.map(row => (
        <div key={row.name} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="font-mono text-xs font-bold text-gray-900 break-all">{row.name}</p>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 whitespace-nowrap">
              {row.party}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{row.purpose}</p>
          <p className="mt-2 text-xs text-gray-400">
            <span className="font-semibold">Retained:</span> {row.duration}
          </p>
        </div>
      ))}
    </div>
  );
}