'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'April 3, 2026';
const COMPANY = 'Exodus Logistics Ltd.';
const EMAIL = 'support@goexoduslogistics.com';
const WEBSITE = 'goexoduslogistics.com';

export default function TermsOfServicePage() {
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
              <FileText className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
              <p className="text-sm text-gray-500 mt-0.5">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800 leading-relaxed">
            Please read these Terms of Service carefully before using the Exodus Logistics platform. By creating an account or using our services, you agree to be bound by these terms. If you do not agree, you may not use our services.
          </div>
        </div>

        <div className="space-y-10">

          <Section title="1. Acceptance of Terms">
            <p>These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and {COMPANY} (&quot;Exodus Logistics&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), governing your access to and use of our logistics management platform, website, APIs, and related services (collectively, the &quot;Services&quot;) available at {WEBSITE}.</p>
            <p>By registering for an account, clicking &quot;I agree&quot;, or otherwise accessing or using our Services, you confirm that you are at least 18 years of age, have read and understood these Terms, and agree to be legally bound by them. If you are using our Services on behalf of a business or organization, you represent and warrant that you have the authority to bind that entity to these Terms.</p>
          </Section>

          <Section title="2. Description of Services">
            <p>Exodus Logistics provides a digital logistics management platform that enables users to:</p>
            <ul>
              <li>Create, manage, and track international and domestic shipments</li>
              <li>Generate, view, and manage shipping invoices and documentation</li>
              <li>Receive real-time shipment tracking updates and notifications</li>
              <li>Communicate with our logistics team regarding shipment status and issues</li>
              <li>Access shipment history and account management tools</li>
            </ul>
            <p>Our Services facilitate the management and documentation of logistics operations. The actual physical transportation of goods may be carried out by third-party carriers and freight partners. We act as an intermediary and logistics coordinator and are not responsible for the actions or omissions of third-party carriers.</p>
          </Section>

          <Section title="3. Account Registration and Security">
            <p>To use most features of our Services, you must register for an account. When creating your account, you agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information during the registration process</li>
              <li>Maintain and promptly update your account information to keep it accurate and complete</li>
              <li>Keep your password confidential and not share it with any third party</li>
              <li>Notify us immediately at {EMAIL} of any unauthorized use of your account or any other security breach</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that provide inaccurate, misleading, or fraudulent information, or that violate these Terms. You may not create multiple accounts for the purpose of circumventing our policies or any restrictions placed on your account.</p>
          </Section>

          <Section title="4. User Responsibilities and Prohibited Conduct">
            <p>You agree to use our Services only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul>
              <li>Use our Services to ship prohibited, illegal, or restricted items including but not limited to weapons, narcotics, counterfeit goods, hazardous materials, or items that violate any applicable law or regulation</li>
              <li>Provide false or inaccurate information regarding the nature, value, weight, or contents of any shipment</li>
              <li>Attempt to circumvent or manipulate our invoice or billing systems</li>
              <li>Access, tamper with, or use non-public areas of our platform or our technical delivery systems</li>
              <li>Probe, scan, or test the vulnerability of any part of our systems without express written authorization</li>
              <li>Use automated scripts, bots, or data scraping tools to access or collect information from our platform without our written permission</li>
              <li>Impersonate any person or entity or misrepresent your identity or affiliation</li>
              <li>Engage in any conduct that restricts or inhibits anyone&apos;s use or enjoyment of our Services</li>
              <li>Upload or transmit any malware, viruses, or other malicious code</li>
              <li>Violate any applicable local, state, national, or international law or regulation</li>
            </ul>
            <p>Violation of these prohibitions may result in immediate termination of your account and may subject you to civil or criminal liability.</p>
          </Section>

          <Section title="5. Shipments and Cargo">
            <SubSection title="5.1 Shipper Obligations">
              <p>You are solely responsible for ensuring that all shipments comply with applicable laws, customs regulations, import/export controls, and carrier requirements at origin, transit, and destination locations. You must accurately declare the contents, value, and nature of all shipments. Misdeclaration of cargo is a serious offense that may result in legal penalties, confiscation of goods, and termination of your account.</p>
            </SubSection>
            <SubSection title="5.2 Prohibited Items">
              <p>You may not use our Services to ship items that are prohibited by law or regulation in any jurisdiction involved in the shipment, including but not limited to: illegal drugs and controlled substances, weapons and ammunition without proper licensing, hazardous materials without proper classification and documentation, counterfeit goods or intellectual property infringements, live animals without required permits, perishable items not properly packaged for transport, and any items embargoed by applicable government authorities.</p>
            </SubSection>
            <SubSection title="5.3 Declared Value and Insurance">
              <p>The declared value of a shipment is used to calculate insurance premiums and liability limits. You are responsible for accurately declaring the fair market value of your shipment contents. Exodus Logistics is not an insurer and does not provide cargo insurance directly. Any insurance coverage is provided by third-party insurers. In the absence of purchased insurance, our liability for lost or damaged cargo is limited as described in Section 8.</p>
            </SubSection>
          </Section>

          <Section title="6. Fees, Invoices, and Payment">
            <p>Our fee structure is based on shipment characteristics including weight, dimensions, origin, destination, service level, and declared value. Applicable fees will be presented to you prior to shipment confirmation:</p>
            <ul>
              <li><strong>Invoice terms:</strong> Invoices are due by the date specified on the invoice. Late payment may result in suspension of Services.</li>
              <li><strong>Accepted payment methods:</strong> We accept payment via bank transfer, cryptocurrency, PayPal, Zelle, cash, and other methods as indicated on your invoice.</li>
              <li><strong>Customs duties and taxes:</strong> Customs duties, import taxes, and any government-imposed fees are the responsibility of the shipper or consignee as applicable under the agreed trade terms and are not included in our quoted fees unless expressly stated.</li>
              <li><strong>Disputed invoices:</strong> Any invoice disputes must be raised in writing to {EMAIL} within fourteen (14) days of the invoice date. Undisputed portions of invoices remain due regardless of any dispute.</li>
              <li><strong>Currency:</strong> Unless otherwise agreed, all fees are invoiced in the currency specified at the time of shipment creation.</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <p>The Services and all content, features, and functionality thereof, including but not limited to text, graphics, logos, icons, images, software, and the selection and arrangement thereof, are owned by {COMPANY} or its licensors and are protected by copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
            <p>We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Services for your internal business or personal logistics purposes in accordance with these Terms. You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our platform, except as incidentally necessary for the normal use of our Services.</p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law:</p>
            <ul>
              <li>Exodus Logistics shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our Services, regardless of whether we have been advised of the possibility of such damages.</li>
              <li>Our total cumulative liability to you for any claims arising out of or related to our Services shall not exceed the total fees paid by you to Exodus Logistics in the twelve (12) months preceding the claim.</li>
              <li>We are not liable for delays, loss, or damage caused by events beyond our reasonable control including acts of God, natural disasters, civil unrest, strikes, government actions, customs delays, or third-party carrier failures.</li>
              <li>We are not responsible for the acts or omissions of third-party carriers, customs authorities, or other parties involved in the physical transportation of your shipments.</li>
            </ul>
            <p>Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for certain types of damages. In such jurisdictions, our liability shall be limited to the greatest extent permitted by law.</p>
          </Section>

          <Section title="9. Indemnification">
            <p>You agree to defend, indemnify, and hold harmless {COMPANY} and its officers, directors, employees, agents, and successors from and against any and all claims, liabilities, damages, judgments, awards, losses, costs, expenses, and fees (including reasonable attorneys&apos; fees) arising out of or relating to: (a) your use of the Services; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; (d) any shipment you create using our platform; (e) any claim that your use of the Services caused harm to a third party; or (f) any false or inaccurate information provided by you.</p>
          </Section>

          <Section title="10. Privacy">
            <p>Your use of our Services is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By agreeing to these Terms, you also agree to our Privacy Policy. Please review our Privacy Policy at <Link href={`/${locale}/privacy`} className="text-blue-600 font-semibold hover:underline">goexoduslogistics.com/privacy</Link> to understand our data practices.</p>
          </Section>

          <Section title="11. Termination">
            <p>We reserve the right to suspend or terminate your account and access to our Services at any time, with or without notice, for any reason including but not limited to:</p>
            <ul>
              <li>Violation of these Terms or our policies</li>
              <li>Fraudulent, illegal, or abusive behavior</li>
              <li>Non-payment of outstanding invoices</li>
              <li>Requests by law enforcement or government authorities</li>
              <li>Discontinuation or material modification of our Services</li>
            </ul>
            <p>You may terminate your account at any time by contacting us at {EMAIL}. Upon termination, your right to use the Services ceases immediately. Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability.</p>
          </Section>

          <Section title="12. Dispute Resolution">
            <p>Any dispute, claim, or controversy arising out of or relating to these Terms or the use of our Services shall first be attempted to be resolved through good-faith negotiation between the parties. Either party may initiate dispute resolution by providing written notice to the other party describing the nature of the dispute.</p>
            <p>If informal negotiation does not resolve the dispute within thirty (30) days, the parties agree to submit the dispute to binding arbitration in accordance with the rules of a mutually agreed arbitration body. The arbitration shall be conducted in the English language. The arbitrator&apos;s decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.</p>
            <p>Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent irreparable harm pending resolution of a dispute.</p>
          </Section>

          <Section title="13. Governing Law">
            <p>These Terms and any disputes arising hereunder shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. To the extent that any dispute is not subject to arbitration, the parties consent to the exclusive jurisdiction of the state and federal courts located in California for the resolution of such disputes.</p>
          </Section>

          <Section title="14. Changes to Terms">
            <p>We reserve the right to modify these Terms at any time. When we make material changes, we will notify you by email and by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of our Services after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must discontinue using our Services and may request account deletion.</p>
          </Section>

          <Section title="15. Miscellaneous">
            <ul>
              <li><strong>Entire agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and Exodus Logistics regarding the Services and supersede all prior agreements and understandings.</li>
              <li><strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</li>
              <li><strong>Assignment:</strong> You may not assign your rights or obligations under these Terms without our prior written consent. We may assign our rights and obligations without restriction.</li>
              <li><strong>Notices:</strong> All legal notices to us must be sent to {EMAIL}. We may provide notices to you via your registered email address.</li>
            </ul>
          </Section>

          <Section title="16. Contact Information">
            <p>If you have any questions about these Terms of Service, please contact us:</p>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 mt-3">
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