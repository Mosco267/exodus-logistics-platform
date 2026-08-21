// src/app/[locale]/terms/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useIntl } from 'react-intl';
import { FileText, ArrowLeft, Languages } from 'lucide-react';
import { useCompany, addressLines } from '@/lib/useCompany';

const LAST_UPDATED = 'April 3, 2026';
const WEBSITE = 'goexoduslogistics.com';

export default function TermsOfServicePage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();

  /* Company details come from admin settings so this page stays correct
     when the address or contact email changes. */
  const company = useCompany();
  const addressParts = addressLines(company.address);
  const COMPANY = company.name || 'Exodus Logistics Ltd.';
  const EMAIL = company.email;

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
              <FileText className="w-6 h-6 text-blue-700" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
              <p className="text-sm text-gray-500 mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>

          {/* Shown only when the reader is not on English */}
          {!isEnglish && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
              <Languages className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                {intl.formatMessage({ id: 'Legal.languageNotice' })}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800 leading-relaxed">
            Please read these Terms of Service carefully before using the {COMPANY} platform. By creating an account or using our services, you agree to be bound by these terms. If you do not agree, you may not use our services.
          </div>
        </div>

        <div className="space-y-10">

          <Section title="1. Acceptance of Terms">
            <p>These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and {COMPANY} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), governing your access to and use of our logistics platform, website, APIs, and related services (collectively, the &quot;Services&quot;) available at {WEBSITE}.</p>
            <p>By registering for an account, indicating your agreement, or otherwise accessing or using our Services, you confirm that you are at least 18 years of age, have read and understood these Terms, and agree to be legally bound by them. If you are using our Services on behalf of a business or organisation, you represent and warrant that you have the authority to bind that entity to these Terms.</p>
          </Section>

          <Section title="2. Description of Services and Our Role">
            <p>We provide logistics services together with a digital platform that enables you to:</p>
            <ul>
              <li>Create, manage, and track international and domestic shipments</li>
              <li>Obtain quotations and generate, view, and manage shipping invoices and documentation</li>
              <li>Receive shipment tracking updates and notifications</li>
              <li>Communicate with our team regarding shipment status and issues</li>
              <li>Access shipment history and account management tools</li>
            </ul>

            <SubSection title="2.1 Where we act as carrier">
              <p>For domestic road freight and for storage in our own facilities, we act as carrier. The goods are collected, carried, and stored by us using our own vehicles and warehouses, and our liability for those movements is governed by Section 8.1 and by applicable carriage law.</p>
            </SubSection>

            <SubSection title="2.2 Where we act as freight forwarder">
              <p>For international air and sea freight, we act as a freight forwarder. In that capacity we arrange carriage with third-party airlines, shipping lines, and their agents, and we contract with them on your behalf. We are responsible for exercising reasonable care in selecting and instructing those carriers, and for the parts of the journey we perform ourselves, but we do not assume the liability of the performing carrier for the international leg. Our liability in that capacity is governed by Section 8.2.</p>
              <p>Where a shipment involves both domestic and international legs, each leg is governed by the corresponding provision above.</p>
            </SubSection>
          </Section>

          <Section title="3. Account Registration and Security">
            <p>To use most features of our Services, you must register for an account. When creating your account, you agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information to keep it accurate and complete</li>
              <li>Keep your password confidential and not share it with any third party</li>
              <li>Notify us immediately of any unauthorised use of your account or any other security breach</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that provide inaccurate, misleading, or fraudulent information, or that violate these Terms. You may not create multiple accounts for the purpose of circumventing our policies or any restriction placed on your account.</p>
            <p>We offer optional two-factor authentication and passkey sign-in. We recommend enabling one of these, particularly for accounts that create shipments regularly.</p>
          </Section>

          <Section title="4. User Responsibilities and Prohibited Conduct">
            <p>You agree to use our Services only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul>
              <li>Use our Services to ship prohibited, illegal, or restricted items, including weapons, narcotics, counterfeit goods, hazardous materials, or items that violate any applicable law or regulation</li>
              <li>Provide false or inaccurate information regarding the nature, value, weight, or contents of any shipment</li>
              <li>Attempt to circumvent or manipulate our invoicing or billing systems</li>
              <li>Access, tamper with, or use non-public areas of our platform or our technical delivery systems</li>
              <li>Probe, scan, or test the vulnerability of any part of our systems without express written authorisation</li>
              <li>Use automated scripts, bots, or data scraping tools to access or collect information from our platform without our written permission</li>
              <li>Impersonate any person or entity, or misrepresent your identity or affiliation</li>
              <li>Engage in conduct that restricts or inhibits anyone else&apos;s use of our Services</li>
              <li>Upload or transmit malware, viruses, or other malicious code</li>
              <li>Violate any applicable local, state, national, or international law or regulation</li>
            </ul>
            <p>Violation of these prohibitions may result in immediate termination of your account and may expose you to civil or criminal liability.</p>
          </Section>

          <Section title="5. Shipments and Cargo">
            <SubSection title="5.1 Shipper Obligations">
              <p>You are solely responsible for ensuring that all shipments comply with applicable laws, customs regulations, import and export controls, and carrier requirements at origin, transit, and destination. You must accurately declare the contents, value, and nature of all shipments, and you must package goods adequately for the mode of transport selected. Misdeclaration of cargo is a serious offence that may result in legal penalties, confiscation of goods, and termination of your account.</p>
            </SubSection>

            <SubSection title="5.2 Prohibited Items">
              <p>You may not use our Services to ship items prohibited by law or regulation in any jurisdiction involved in the shipment, including: illegal drugs and controlled substances; weapons and ammunition without proper licensing; hazardous materials without proper classification and documentation; counterfeit goods or items infringing intellectual property; live animals without required permits; perishable items not properly packaged for transport; and any items subject to embargo by applicable government authorities.</p>
              <p>If we discover that a shipment contains prohibited items, we may hold, return, or surrender it to the relevant authorities without liability to you, and you remain responsible for any costs arising.</p>
            </SubSection>

            <SubSection title="5.3 Declared Value and Insurance">
              <p>The declared value of a shipment is used to calculate the insurance charge shown on your quotation and to establish liability limits. You are responsible for declaring the fair market value of the contents accurately.</p>
              <p>We maintain cargo liability insurance covering the freight we handle. Cover limits are available on request. Where you require cover above those limits, or cover on terms different from ours, you should arrange separate goods-in-transit insurance. Any additional insurance arranged through us is provided by third-party insurers on their own terms, and we act as intermediary in placing it.</p>
            </SubSection>

            <SubSection title="5.4 Claims">
              <p>Claims for loss or damage must be notified to us in writing within seven (7) days of delivery, or within thirty (30) days of the expected delivery date where a shipment has not arrived. Claims should include the tracking number, a description of the loss or damage, and supporting evidence including photographs where applicable. Late notification may prejudice our ability to recover from a carrier or insurer and may reduce or extinguish a claim.</p>
            </SubSection>
          </Section>

          <Section title="6. Quotations, Fees, Invoices, and Payment">
            <p>Our charges are based on shipment characteristics including weight, dimensions, origin, destination, service level, and declared value. Charges are itemised on your quotation before you confirm a shipment.</p>
            <ul>
              <li><strong>Quotations:</strong> A quotation is valid for seven (7) days from the date issued and is based on the details you provide. If a package is remeasured or reweighed at collection and differs materially from what was declared, we may adjust the charge accordingly and will tell you before proceeding.</li>
              <li><strong>Volumetric weight:</strong> Charges are calculated on the greater of actual weight and volumetric weight. Where volumetric weight applies, this is shown on your quotation.</li>
              <li><strong>Invoice terms:</strong> Invoices are due by the date specified on the invoice. Late payment may result in suspension of Services and of shipments in progress.</li>
              <li><strong>Accepted payment methods:</strong> Payment methods available to you are shown on your invoice.</li>
              <li><strong>Customs duties and taxes:</strong> Customs duties, import taxes, and government-imposed fees are the responsibility of the shipper or consignee as applicable under the agreed trade terms, and are not included in our charges unless expressly stated.</li>
              <li><strong>Disputed invoices:</strong> Invoice disputes must be raised in writing within fourteen (14) days of the invoice date. Undisputed portions remain due.</li>
              <li><strong>Currency:</strong> Unless otherwise agreed, charges are invoiced in the currency specified when the shipment was created. Where a currency conversion is applied, the rate used is the one in effect at the time of quotation.</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <p>The Services and all content, features, and functionality, including text, graphics, logos, icons, images, software, and the selection and arrangement thereof, are owned by {COMPANY} or its licensors and are protected by copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
            <p>We grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Services for your internal business or personal logistics purposes in accordance with these Terms. You may not reproduce, distribute, modify, create derivative works of, publicly display, republish, download, store, or transmit material from our platform, except as incidentally necessary for normal use of the Services.</p>
          </Section>

          <Section title="8. Liability">
            <SubSection title="8.1 Where we act as carrier">
              <p>For domestic road freight and storage in our own facilities, we are liable for loss of or damage to goods occurring while they are in our charge, subject to the limits of our cargo liability insurance and to any limits applicable under the law governing the carriage. We are not liable where loss or damage arises from inherent defect in the goods, inadequate packaging by you, inaccurate declaration, or circumstances we could not avoid and the consequences of which we could not prevent.</p>
            </SubSection>

            <SubSection title="8.2 Where we act as freight forwarder">
              <p>For international air and sea freight, we are liable for failure to exercise reasonable care in selecting, instructing, and supervising the carriers we engage on your behalf, and for loss or damage occurring during any part of the journey we perform ourselves. We are not liable for the acts or omissions of performing carriers beyond that duty of care, and any claim against a performing carrier remains subject to the carrier&apos;s own terms and to applicable international conventions.</p>
            </SubSection>

            <SubSection title="8.3 General limitations">
              <p>To the maximum extent permitted by applicable law:</p>
              <ul>
                <li>We are not liable for indirect, incidental, special, consequential, or punitive damages, including loss of profit, loss of market, or loss of business opportunity, regardless of whether we were advised of the possibility of such damages.</li>
                <li>Our total cumulative liability for claims relating to the platform itself, as distinct from claims relating to goods, shall not exceed the total fees you paid to us in the twelve (12) months preceding the claim.</li>
                <li>We are not liable for delay, loss, or damage caused by events beyond our reasonable control, including natural disasters, civil unrest, strikes, government action, and customs delays.</li>
                <li>Tracking information and delivery estimates are provided in good faith and are not guarantees of a specific delivery date unless expressly agreed in writing.</li>
              </ul>
              <p>Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, for fraud, or for any liability that cannot lawfully be excluded. Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for certain damages; in those jurisdictions our liability is limited to the greatest extent permitted by law.</p>
            </SubSection>
          </Section>

          <Section title="9. Indemnification">
            <p>You agree to defend, indemnify, and hold harmless {COMPANY} and its officers, directors, employees, agents, and successors from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, and fees (including reasonable legal fees) arising out of or relating to: (a) your use of the Services; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; (d) any shipment you create using our platform; (e) any claim that your use of the Services caused harm to a third party; or (f) any false or inaccurate information provided by you, including misdeclaration of cargo.</p>
          </Section>

          <Section title="10. Privacy">
            <p>Your use of our Services is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By agreeing to these Terms, you also agree to our Privacy Policy. Please review it at <Link href={`/${locale}/privacy`} className="text-blue-600 font-semibold hover:underline">{WEBSITE}/privacy</Link> to understand our data practices.</p>
          </Section>

          <Section title="11. Termination">
            <p>We reserve the right to suspend or terminate your account and access to our Services at any time, with or without notice, for reasons including:</p>
            <ul>
              <li>Violation of these Terms or our policies</li>
              <li>Fraudulent, illegal, or abusive behaviour</li>
              <li>Non-payment of outstanding invoices</li>
              <li>Requests by law enforcement or government authorities</li>
              <li>Discontinuation or material modification of our Services</li>
            </ul>
            <p>You may terminate your account at any time by contacting us. Upon termination, your right to use the Services ceases immediately, though shipments already in transit will be completed and remain payable. Provisions that by their nature should survive termination will do so, including ownership provisions, liability limitations, and indemnification.</p>
          </Section>

          {/* ─────────────────────────────────────────────────────────────
              REVIEW REQUIRED — Sections 12 and 13

              This arbitration clause names no institution and no seat, which
              means it may not be enforceable as written: if the parties
              cannot agree on a body, there is no mechanism. Before relying
              on it, have a California-qualified lawyer decide between JAMS
              and AAA, fix the seat, and settle how consumer claims and any
              class waiver are treated. An arbitration clause that fails is
              worse than none, because you discover the problem only once a
              dispute is already under way.
             ───────────────────────────────────────────────────────────── */}
          <Section title="12. Dispute Resolution">
            <p>Any dispute, claim, or controversy arising out of or relating to these Terms or the use of our Services shall first be addressed through good-faith negotiation between the parties. Either party may initiate this by giving written notice describing the nature of the dispute.</p>
            <p>If informal negotiation does not resolve the dispute within thirty (30) days, the parties agree to submit it to binding arbitration in accordance with the rules of a mutually agreed arbitration body. The arbitration shall be conducted in the English language. The arbitrator&apos;s decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.</p>
            <p>Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent irreparable harm pending resolution of a dispute. Nothing in this section prevents you from bringing a claim in a small claims court where the claim qualifies, or from raising a matter with a regulator.</p>
          </Section>

          <Section title="13. Governing Law">
            <p>These Terms and any dispute arising under them are governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. To the extent a dispute is not subject to arbitration, the parties consent to the exclusive jurisdiction of the state and federal courts located in California.</p>
            <p>Where you are a consumer resident in a jurisdiction whose law gives you protections that cannot be excluded by agreement, nothing in this section deprives you of those protections or of the right to bring proceedings in your local courts.</p>
          </Section>

          <Section title="14. Changes to Terms">
            <p>We may modify these Terms at any time. When we make material changes, we will notify you by email and update the &quot;Last updated&quot; date at the top of this page. Your continued use of our Services after the effective date of any change constitutes acceptance of the revised Terms. If you do not agree, you must stop using our Services and may request account deletion.</p>
          </Section>

          <Section title="15. Miscellaneous">
            <ul>
              <li><strong>Entire agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Services and supersede all prior agreements and understandings.</li>
              <li><strong>Severability:</strong> If any provision is found unenforceable, it shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions continue in full force.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right or provision does not constitute a waiver of it.</li>
              <li><strong>Assignment:</strong> You may not assign your rights or obligations under these Terms without our prior written consent. We may assign ours without restriction.</li>
              <li><strong>Notices:</strong> Legal notices to us must be sent to the address in Section 16. We may give notice to you at your registered email address.</li>
            </ul>
          </Section>

          <Section title="16. Contact Information">
            <p>If you have questions about these Terms, contact us:</p>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 mt-3">
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
            <Link href={`/${locale}/terms`} className="text-blue-700 font-semibold">Terms of Service</Link>
            <Link href={`/${locale}/privacy`} className="text-gray-500 hover:text-blue-700 font-semibold transition">Privacy Policy</Link>
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