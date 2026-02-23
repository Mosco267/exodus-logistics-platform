'use client';

import { motion } from 'framer-motion';
import { FileText, Scale, AlertTriangle, Gavel, Users, Globe } from 'lucide-react';

export default function TermsOfServicePage() {
  const sections = [
    {
      icon: FileText,
      title: 'Agreement to Terms',
      content: [
        'By accessing and using Exodus Logistics services, you agree to be bound by these Terms of Service',
        'If you do not agree to these terms, you may not access or use our services',
        'We reserve the right to modify these terms at any time',
        'Continued use of services constitutes acceptance of any changes'
      ]
    },
    {
      icon: Users,
      title: 'Service Description',
      content: [
        'Exodus Logistics provides shipping and logistics services globally',
        'Services include package tracking, delivery, and customs clearance assistance',
        'Delivery times are estimates and not guaranteed',
        'Service availability may vary by location'
      ]
    },
    {
      icon: AlertTriangle,
      title: 'Prohibited Uses',
      content: [
        'Shipping illegal or prohibited items',
        'Providing false or misleading information',
        'Using services for fraudulent activities',
        'Violating international shipping regulations',
        'Interfering with service operations'
      ]
    },
    {
      icon: Scale,
      title: 'Limitation of Liability',
      content: [
        'Our liability is limited to the shipping cost of lost or damaged items',
        'We are not liable for consequential or indirect damages',
        'Maximum liability per shipment is $100 unless additional insurance is purchased',
        'Force majeure events exempt us from liability'
      ]
    },
    {
      icon: Gavel,
      title: 'Dispute Resolution',
      content: [
        'All disputes will be governed by California law',
        'We encourage informal resolution first',
        'Formal disputes must be submitted in writing within 30 days',
        'Arbitration may be required for certain disputes'
      ]
    },
    {
      icon: Globe,
      title: 'International Shipping',
      content: [
        'Customers are responsible for customs documentation',
        'Import duties and taxes are the recipient\'s responsibility',
        'Some items may be restricted in certain countries',
        'We comply with all applicable export control laws'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Read our terms and conditions for using Exodus Logistics services.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: February 12, 2024
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card mb-8"
        >
          <div className="flex items-start">
            <FileText className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold mb-3">Welcome to Exodus Logistics</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms of Service ("Terms") govern your use of Exodus Logistics\' shipping and logistics services 
                and our website. By using our services, you agree to comply with and be bound by these Terms. 
                Please read them carefully before using our services.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="card"
            >
              <div className="flex items-start mb-4">
                <div className="bg-blue-100 p-2 rounded-lg mr-4">
                  <section.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold">{section.title}</h3>
              </div>
              <ul className="space-y-3">
                {section.content.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="card mt-8"
        >
          <h3 className="text-2xl font-semibold mb-4">Contact Information</h3>
          <p className="text-gray-600 mb-4">
            For questions about these Terms of Service, please contact our legal department:
          </p>
          <div className="space-y-2 text-gray-600">
            <p><strong>Email:</strong> legal@exoduslogistics.com</p>
            <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            <p><strong>Address:</strong> 1234 Commerce Street, Los Angeles, CA 90001</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}