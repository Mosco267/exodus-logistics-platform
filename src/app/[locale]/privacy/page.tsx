'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Shield, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'April 3, 2026';
const COMPANY = 'Exodus Logistics Ltd.';
const EMAIL = 'support@goexoduslogistics.com';
const WEBSITE = 'goexoduslogistics.com';

export default function PrivacyPolicyPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/20 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">

        {/* Back */}
        <div className="mb-8">
          <Link href={`/${locale}`}
            className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-700 transition">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-gray-500 mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800 leading-relaxed">
            This Privacy Policy describes how {COMPANY} (&quot;Exodus Logistics&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects your personal information when you use our logistics platform and services available at {WEBSITE}.
          </div>
        </div>

        <div className="prose prose-gray max-w-none space-y-10">

          <Section title="1. Information We Collect">
            <p>We collect information you provide directly to us, information we collect automatically when you use our services, and information from third-party sources. The categories of information we collect include:</p>
            <SubSection title="1.1 Information You Provide">
              <ul>
                <li><strong>Account information:</strong> When you create an account, we collect your full name, email address, and password (stored as an encrypted hash). If you register via Google, we receive your name, email, and profile picture from Google&apos;s OAuth service.</li>
                <li><strong>Shipment information:</strong> When you create or manage a shipment, we collect sender and receiver details including names, email addresses, phone numbers, physical addresses, and country information.</li>
                <li><strong>Package details:</strong> Weight, dimensions, declared value, shipment type, and package description.</li>
                <li><strong>Payment information:</strong> Invoice status, payment method preferences, and transaction references. We do not store full payment card numbers on our servers.</li>
                <li><strong>Communications:</strong> When you contact us for support, we retain records of your correspondence including email messages and any attachments.</li>
              </ul>
            </SubSection>
            <SubSection title="1.2 Information Collected Automatically">
              <ul>
                <li><strong>Usage data:</strong> Pages visited, features used, time and duration of visits, and navigation patterns within our platform.</li>
                <li><strong>Device information:</strong> Browser type and version, operating system, device identifiers, and screen resolution.</li>
                <li><strong>Log data:</strong> IP address, access times, referring URLs, and error logs.</li>
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
              <li><strong>Platform improvement:</strong> To analyze usage patterns, diagnose technical issues, and improve the functionality and user experience of our platform.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws, regulations, and legal processes, including customs and import/export regulations.</li>
              <li><strong>Fraud prevention:</strong> To detect, investigate, and prevent fraudulent transactions, unauthorized access, and other illegal activities.</li>
              <li><strong>Administrative communications:</strong> To notify you of important changes to our services, terms, or policies.</li>
            </ul>
            <p>We do not sell your personal information to third parties. We do not use your data to serve third-party advertisements within our platform.</p>
          </Section>

          <Section title="3. How We Share Your Information">
            <p>We may share your information in the following circumstances:</p>
            <ul>
              <li><strong>Service providers:</strong> We share data with trusted third-party vendors who assist us in operating our platform, including MongoDB Atlas (database hosting), Resend (transactional email delivery), and Vercel or similar hosting providers. These providers are contractually obligated to protect your data and use it only for the purposes we specify.</li>
              <li><strong>Google OAuth:</strong> If you choose to sign in with Google, your account creation and authentication is governed by Google&apos;s Privacy Policy in addition to ours. We receive only the data Google shares with us (name, email address, and profile photo).</li>
              <li><strong>Customs and regulatory authorities:</strong> For international shipments, we may be required by law to share shipment and party information with customs authorities, border agencies, and government regulators in origin, transit, and destination countries.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required by law, court order, or other legal process, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of all or part of our assets, your information may be transferred as part of that transaction. We will notify you via email and a prominent notice on our website prior to such a transfer.</li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p>We retain your personal information for as long as necessary to provide our services and comply with our legal obligations:</p>
            <ul>
              <li><strong>Active accounts:</strong> We retain your account data for as long as your account remains active or as needed to provide services.</li>
              <li><strong>Shipment records:</strong> Shipment and invoice records are retained for a minimum of seven (7) years to comply with tax, customs, and financial record-keeping requirements.</li>
              <li><strong>Deleted accounts:</strong> When an account is deleted or banned, we may retain certain information for up to ninety (90) days for fraud prevention and legal compliance purposes, after which it is permanently deleted from our active systems.</li>
              <li><strong>Communication logs:</strong> Support correspondence is retained for up to three (3) years.</li>
            </ul>
          </Section>

          <Section title="5. Data Security">
            <p>We implement industry-standard security measures to protect your personal information against unauthorized access, disclosure, alteration, and destruction:</p>
            <ul>
              <li>All data transmission between your browser and our servers is encrypted using TLS (Transport Layer Security).</li>
              <li>Passwords are hashed using bcrypt with a minimum cost factor of 12 before storage. We never store plaintext passwords.</li>
              <li>Access to personal data within our systems is restricted to authorized personnel on a need-to-know basis.</li>
              <li>Our database infrastructure is hosted on MongoDB Atlas with encryption at rest enabled.</li>
              <li>We conduct regular security reviews and promptly address identified vulnerabilities.</li>
            </ul>
            <p>Despite these measures, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security and encourage you to use strong, unique passwords and keep your account credentials confidential.</p>
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
              <li><strong>Withdrawal of consent:</strong> Where processing is based on consent, you may withdraw consent at any time without affecting the lawfulness of prior processing.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at {EMAIL}. We will respond to your request within thirty (30) days. We may require identity verification before processing your request.</p>
          </Section>

          <Section title="7. Cookies and Tracking Technologies">
            <p>We use cookies and similar tracking technologies to operate and improve our platform:</p>
            <ul>
              <li><strong>Essential cookies:</strong> Required for authentication, session management, and core platform functionality. These cannot be disabled without affecting platform operation.</li>
              <li><strong>Preference cookies:</strong> Used to remember your settings and preferences, such as your selected language and remembered email address for sign-in.</li>
              <li><strong>Analytics:</strong> We may use aggregated, anonymized analytics to understand how our platform is used and improve our services.</li>
            </ul>
            <p>You can control cookie settings through your browser preferences. Disabling essential cookies will prevent you from using authenticated features of our platform.</p>
          </Section>

          <Section title="8. International Data Transfers">
            <p>Exodus Logistics operates globally and your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws than your own. When we transfer data internationally, we implement appropriate safeguards including standard contractual clauses and data processing agreements with our service providers to ensure your data receives adequate protection regardless of where it is processed.</p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a person under 18, please contact us immediately at {EMAIL} and we will promptly delete such information from our systems.</p>
          </Section>

          <Section title="10. Third-Party Links">
            <p>Our platform may contain links to third-party websites or services. This Privacy Policy does not apply to those third-party services. We encourage you to review the privacy policies of any third-party services you access through links on our platform. We are not responsible for the privacy practices or content of third-party sites.</p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by updating the &quot;Last updated&quot; date at the top of this policy and, where appropriate, by sending you an email notification. We encourage you to review this policy periodically. Your continued use of our services after any changes indicates your acceptance of the updated policy.</p>
          </Section>

          <Section title="12. Contact Us">
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 not-prose mt-3">
              <p className="text-sm font-extrabold text-gray-900 mb-2">{COMPANY}</p>
              <p className="text-sm text-gray-600">1199 E Calaveras Blvd, California, USA 90201</p>
              <p className="text-sm text-gray-600 mt-1">Email: <a href={`mailto:${EMAIL}`} className="text-blue-600 font-semibold hover:underline">{EMAIL}</a></p>
              <p className="text-sm text-gray-600 mt-1">Website: <a href={`https://www.${WEBSITE}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">{WEBSITE}</a></p>
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