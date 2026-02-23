'use client';

import { motion } from 'framer-motion';
import { Shield, Eye, Lock, User, Database, ChevronRight } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: Eye,
      title: 'Information We Collect',
      content: [
        'Personal information (name, email, phone, address)',
        'Shipment details (origin, destination, package dimensions)',
        'Payment information (processed securely through third-party providers)',
        'Device and usage data (IP address, browser type, pages visited)',
        'Location data for tracking and delivery purposes'
      ]
    },
    {
      icon: Database,
      title: 'How We Use Your Information',
      content: [
        'To provide and improve our shipping services',
        'To process shipments and handle payments',
        'To send tracking updates and notifications',
        'To communicate with you about your orders',
        'To comply with legal obligations and protect against fraud'
      ]
    },
    {
      icon: Lock,
      title: 'Data Security',
      content: [
        'All data is encrypted using industry-standard SSL/TLS protocols',
        'Payment information is handled by PCI-compliant processors',
        'Regular security audits and vulnerability assessments',
        'Employee access is limited and logged',
        'Data is backed up securely across multiple locations'
      ]
    },
    {
      icon: User,
      title: 'Your Rights',
      content: [
        'Access to your personal data',
        'Correction of inaccurate information',
        'Deletion of your data (where legally permitted)',
        'Opt-out of marketing communications',
        'Data portability requests'
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
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your privacy is important to us. Learn how we collect, use, and protect your information.
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
            <Shield className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold mb-3">Our Commitment to Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                At Exodus Logistics, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This privacy policy outlines how we collect, use, store, and protect your data when you use our shipping services 
                and interact with our website.
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
              <ul className="space-y-3 ml-16">
                {section.content.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <ChevronRight className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
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
          <h3 className="text-2xl font-semibold mb-4">Contact Us</h3>
          <p className="text-gray-600 mb-4">
            If you have questions about this privacy policy or how we handle your data, please contact us:
          </p>
          <div className="space-y-2 text-gray-600">
            <p><strong>Email:</strong> privacy@exoduslogistics.com</p>
            <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            <p><strong>Address:</strong> 1234 Commerce Street, Los Angeles, CA 90001</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}