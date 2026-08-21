// src/app/[locale]/privacy/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useIntl } from 'react-intl';
import { Shield, ArrowLeft, Languages } from 'lucide-react';
import { useCompany, addressLines } from '@/lib/useCompany';

const LAST_UPDATED = 'April 3, 2026';
const WEBSITE = 'goexoduslogistics.com';

export default function PrivacyPolicyPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();

  /* Company details come from admin settings so this page stays correct
     when the address or contact email changes. */
  const company = useCompany();
  const addressParts = addressLines(company.address);
  const COMPANY = company.name || 'Exodus Logistics Ltd.';
  const EMAIL = company.email;

  /* The policy itself stays in English deliberately. Translating legal
     text invites divergence between versions, and terms like "processing"
     and "legitimate interest" carry precise meanings that a natural
     translation can lose. The notice below explains that in the reader's
     own language. */
  const languageNotice = intl.formatMessage({ id: 'Legal.languageNotice' });
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
              <Shield className="w-6 h-6 text-blue-700" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-gray-500 mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>

          {/* Language notice, shown only when the reader is not on English */}
          {!isEnglish && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
              <Languages className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">{languageNotice}</p>
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800 leading-relaxed">
            This Privacy Policy describes how {COMPANY} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects your personal information when you use our logistics platform and services available at {WEBSITE}.
          </div>
        </div>

        <div className="prose prose-gray max-w-none space-y-10">

          <Section title="1. Information We Collect">
            <p>We collect information you provide directly to us, information we collect automatically when you use our services, and information from third-party sources. The categories of information we collect include:</p>
            <SubSection title="1.1 Information You Provide">
              <ul>
                <li><strong>Account information:</strong> When you create an account, we collect your full name, email address, phone number, country, and password (stored as an encrypted hash). If you register via Google, we receive your name, email, and profile picture from Google&apos;s OAuth service.</li>
                <li><strong>Shipment information:</strong> When you create or manage a shipment, we collect sender and receiver details including names, email addresses, phone numbers, physical addresses, and country information.</li>
                <li><strong>Package details:</strong> Weight, dimensions, declared value, shipment type, and package description.</li>
                <li><strong>Payment information:</strong> Invoice status, payment method preferences, and transaction references. We do not store full payment card numbers on our servers.</li>
                <li><strong>Communications:</strong> When you contact us for support, through our contact form, or through live chat, we retain records of that correspondence including any attachments.</li>
              </ul>
            </SubSection>
            <SubSection title="1.2 Information Collected Automatically">
              <ul>
                <li><strong>Usage data:</strong> Pages visited, features used, time and duration of visits, and navigation patterns within our platform.</li>
                <li><strong>Device information:</strong> Browser type and version, operating system, device identifiers, and screen resolution.</li>
                <li><strong>Log data:</strong> IP address, access times, referring URLs, and error logs.</li>
                <li><strong>Approximate location:</strong> We use your IP address to select an initial display language. This is a country-level inference only and is not stored as a location record.</li>
                <li><strong>Cookies and similar technologies:</strong> Session tokens, authentication cookies, and preference cookies. See Section 7 for more detail.</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li><strong>Service delivery:</strong> To process shipments, generate invoices, send tracking updates, and provide customer support.</li>
              <li><strong>Account management:</strong> To create and manage your account, authenticate your identity, and maintain account security.</li>
              <li><strong>Communications:</strong> To send transactional emails including shipment confirmations, tracking notifications, invoice summaries, and account alerts.</li>
              <li><strong>Platform improvement:</strong> To analyse usage patterns, diagnose technical issues, and improve the functionality and user experience of our platform.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws, regulations, and legal processes, including customs and import or export regulations.</li>
              <li><strong>Fraud prevention:</strong> To detect, investigate, and prevent fraudulent transactions, unauthorised access, and other illegal activities.</li>
              <li><strong>Administrative communications:</strong> To notify you of important changes to our services, terms, or policies.</li>
            </ul>
            <p>We do not sell your personal information to third parties. We do not use your data to serve third-party advertisements within our platform.</p>
          </Section>

          <Section title="3. How We Share Your Information">
            <p>We may share your information in the following circumstances:</p>
            <ul>
              <li><strong>Service providers:</strong> We share data with trusted third-party vendors who assist us in operating our platform, including MongoDB Atlas (database hosting), Resend (transactional email delivery), and Vercel (application hosting). These providers are contractually obligated to protect your data and use it only for the purposes we specify.</li>
              <li><strong>Live chat:</strong> Our chat widget is provided by Tawk.to. Messages you send through it, together with your IP address and the pages you have viewed, are processed by Tawk.to under their own privacy policy. Do not share payment card details or passwords through chat.</li>
              <li><strong>Google OAuth:</strong> If you choose to sign in with Google, your account creation and authentication is governed by Google&apos;s Privacy Policy in addition to ours. We receive only the data Google shares with us, namely your name, email address, and profile photo.</li>
              <li><strong>Customs and regulatory authorities:</strong> For international shipments, we may be required by law to share shipment and party information with customs authorities, border agencies, and government regulators in origin, transit, and destination countries.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required by law, court order, or other legal process, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of all or part of our assets, your information may be transferred as part of that transaction. We will notify you by email and by a prominent notice on our website before such a transfer takes effect.</li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p>We retain your personal information for as long as necessary to provide our services and comply with our legal obligations:</p>
            <ul>
              <li><strong>Active accounts:</strong> We retain your account data for as long as your account remains active or as needed to provide services.</li>
              <li><strong>Shipment records:</strong> Shipment and invoice records are retained for a minimum of seven (7) years to comply with tax, customs, and financial record-keeping requirements.</li>
              <li><strong>Password history:</strong> To prevent reuse of previous passwords, we retain encrypted hashes of your ten most recent passwords. These cannot be reversed to reveal the original passwords.</li>
              <li><strong>Deleted accounts:</strong> When an account is deleted or banned, we may retain certain information for up to ninety (90) days for fraud prevention and legal compliance purposes, after which it is permanently deleted from our active systems.</li>
              <li><strong>Communication logs:</strong> Support correspondence and contact form messages are retained for up to three (3) years.</li>
              <li><strong>Verification and reset tokens:</strong> Email verification codes and password reset links expire automatically and are removed from our systems shortly afterwards.</li>
            </ul>
          </Section>

          <Section title="5. Data Security">
            <p>We implement industry-standard security measures to protect your personal information against unauthorised access, disclosure, alteration, and destruction:</p>
            <ul>
              <li>All data transmission between your browser and our servers is encrypted using TLS (Transport Layer Security).</li>
              <li>Passwords are hashed using bcrypt with a minimum cost factor of 12 before storage. We never store plaintext passwords.</li>
              <li>Access to personal data within our systems is restricted to authorised personnel on a need-to-know basis.</li>
              <li>Our database infrastructure is hosted on MongoDB Atlas with encryption at rest enabled.</li>
              <li>Optional two-factor authentication and passkey sign-in are available to strengthen the security of your account.</li>
              <li>We conduct regular security reviews and promptly address identified vulnerabilities.</li>
            </ul>
            <p>Despite these measures, no method of transmission over the internet or electronic storage is completely secure. We cannot guarantee absolute security and encourage you to use a strong, unique password and keep your account credentials confidential.</p>
          </Section>

          <Section title="6. Your Rights and Choices">
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> You may request a copy of the personal information we hold about you.</li>
              <li><strong>Correction:</strong> You may request that we correct inaccurate or incomplete information.</li>
              <li><strong>Deletion:</strong> You may request that we delete your personal information, subject to our legal retention obligations.</li>
              <li><strong>Portability:</strong> You may request that we provide your data in a machine-readable format.</li>
              <li><strong>Restriction:</strong> You may request that we restrict processing of your personal information in certain circumstances.</li>
              <li><strong>Objection:</strong> You may object to processing of your personal information for direct marketing purposes.</li>
              <li><strong>Withdrawal of consent:</strong> Where processing is based on consent, you may withdraw consent at any time without affecting the lawfulness of processing carried out before withdrawal.</li>
            </ul>
            {EMAIL && (
              <p>To exercise any of these rights, contact us at <a href={`mailto:${EMAIL}`} className="text-blue-600 font-semibold hover:underline">{EMAIL}</a>. We will respond to your request within thirty (30) days. We may require identity verification before processing your request.</p>
            )}
          </Section>

          <Section title="7. Cookies and Tracking Technologies">
            <p>We use cookies and similar technologies to operate and improve our platform:</p>
            <ul>
              <li><strong>Essential cookies:</strong> Required for authentication, session management, and core platform functionality. These cannot be disabled without preventing you from signing in.</li>
              <li><strong>Preference cookies:</strong> Used to remember your settings, including your selected language, your chosen appearance theme, and a remembered email address for sign-in.</li>
              <li><strong>Live chat cookies:</strong> Our chat provider sets cookies to keep your conversation available as you move between pages. These are cleared when you change language.</li>
              <li><strong>Analytics:</strong> Where we use analytics, it is aggregated and does not identify you individually.</li>
            </ul>
            <p>You can control cookie settings through your browser preferences. Disabling essential cookies will prevent you from using the signed-in areas of our platform. Public features such as tracking a shipment and viewing an invoice remain available.</p>
          </Section>

          <Section title="8. International Data Transfers">
            <p>We operate internationally, and your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws than your own.</p>
            <p>Where we transfer personal data out of the European Economic Area or the United Kingdom, we rely on appropriate safeguards, including the European Commission&apos;s Standard Contractual Clauses and, where applicable, the UK International Data Transfer Addendum. Our principal service providers maintain their own transfer mechanisms, which are described in their respective privacy documentation.</p>
            <p>Separately, shipment data is by its nature shared with authorities in the origin, transit, and destination countries of the goods. This is a legal requirement of international shipping rather than a commercial transfer, and it applies to any carrier you use.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a person under 18, contact us immediately and we will promptly delete that information from our systems.</p>
          </Section>

          <Section title="10. Third-Party Links">
            <p>Our platform may contain links to third-party websites or services. This Privacy Policy does not apply to those services. We encourage you to review the privacy policies of any third-party service you access through links on our platform. We are not responsible for the privacy practices or content of third-party sites.</p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will update the &quot;Last updated&quot; date at the top of this policy and, where appropriate, notify you by email. We encourage you to review this policy periodically. Your continued use of our services after any changes indicates your acceptance of the updated policy.</p>
          </Section>

          <Section title="12. Contact Us">
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, contact us:</p>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 not-prose mt-3">
              <p className="text-sm font-extrabold text-gray-900 mb-2">{COMPANY}</p>
              {addressParts.map((line, i) => (
                <p key={i} className="text-sm text-gray-600">{line}</p>
              ))}
              {EMAIL && (
                <p className="text-sm text-gray-600 mt-1">
                  Email: <a href={`mailto:${EMAIL}`} className="text-blue-600 font-semibold hover:underline break-all">{EMAIL}</a>
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                Website: <a href={`https://www.${WEBSITE}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">{WEBSITE}</a>
              </p>
              {company.registrationNumber && (
                <p className="text-sm text-gray-600 mt-1">Registration: {company.registrationNumber}</p>
              )}
            </div>
          </Section>

        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {COMPANY} All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link href={`/${locale}/terms`} className="text-gray-500 hover:text-blue-700 font-semibold transition">Terms of Service</Link>
            <Link href={`/${locale}/privacy`} className="text-blue-700 font-semibold">Privacy Policy</Link>
            <Link href={`/${locale}`} className="text-gray-500 hover:text-blue-700 font-semibold transition">Home</Link>
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

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-bold text-gray-800 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}