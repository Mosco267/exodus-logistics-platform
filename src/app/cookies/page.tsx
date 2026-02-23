'use client';

import { motion } from 'framer-motion';
import { Cookie, Settings, Eye, Shield, ChevronRight } from 'lucide-react';

export default function CookiePolicyPage() {
  const cookieTypes = [
    {
      icon: Cookie,
      title: 'Essential Cookies',
      description: 'Required for the website to function properly',
      examples: ['Authentication tokens', 'Shopping cart contents', 'Security settings'],
      required: true
    },
    {
      icon: Settings,
      title: 'Functional Cookies',
      description: 'Enhance user experience and remember preferences',
      examples: ['Language preferences', 'Remembered tracking codes', 'Saved quotes'],
      required: false
    },
    {
      icon: Eye,
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors use our site',
      examples: ['Page views', 'Time on site', 'Navigation patterns'],
      required: false
    },
    {
      icon: Shield,
      title: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements',
      examples: ['Ad personalization', 'Campaign tracking', 'Retargeting'],
      required: false
    }
  ];

  const policies = [
    {
      title: 'Cookie Duration',
      content: 'Session cookies expire when you close your browser, while persistent cookies remain for a set period (typically 30 days to 1 year).'
    },
    {
      title: 'Third-Party Cookies',
      content: 'We use trusted third-party services that may place their own cookies for analytics, payment processing, and customer support.'
    },
    {
      title: 'Cookie Management',
      content: 'You can control cookies through your browser settings. However, disabling essential cookies may affect website functionality.'
    },
    {
      title: 'International Transfers',
      content: 'Some cookies may transfer data to servers in other countries. We ensure appropriate safeguards are in place for international data transfers.'
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
            Cookie Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn about the cookies we use and how they enhance your experience on Exodus Logistics.
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
            <Cookie className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold mb-3">What Are Cookies?</h2>
              <p className="text-gray-600 leading-relaxed">
                Cookies are small text files that are stored on your device when you visit our website. 
                They help us remember your preferences, analyze website traffic, and personalize your experience. 
                This policy explains the different types of cookies we use and why.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {cookieTypes.map((cookie, index) => (
            <motion.div
              key={cookie.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="card"
            >
              <div className="flex items-start mb-4">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <cookie.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{cookie.title}</h3>
                  {cookie.required && (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Required
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-3">{cookie.description}</p>
              <div className="space-y-1">
                {cookie.examples.map((example, exampleIndex) => (
                  <div key={exampleIndex} className="flex items-center text-sm">
                    <ChevronRight className="w-3 h-3 text-blue-600 mr-2" />
                    <span className="text-gray-500">{example}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6 mb-8">
          {policies.map((policy, index) => (
            <motion.div
              key={policy.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              className="card"
            >
              <h3 className="text-xl font-semibold mb-3">{policy.title}</h3>
              <p className="text-gray-600">{policy.content}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="card"
        >
          <h3 className="text-2xl font-semibold mb-4">Managing Your Cookie Preferences</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Browser Settings</h4>
              <p className="text-gray-600">
                Most browsers allow you to control cookies through their settings. You can typically:
              </p>
              <ul className="mt-2 space-y-1 ml-6 text-gray-600">
                <li>• Block all cookies</li>
                <li>• Accept only first-party cookies</li>
                <li>• Delete existing cookies</li>
                <li>• Set notifications when cookies are sent</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Cookie Preferences Center</h4>
              <p className="text-gray-600">
                You can manage your cookie preferences through our cookie consent banner that appears 
                when you first visit our website. This allows you to customize which types of cookies you accept.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="card mt-8"
        >
          <h3 className="text-2xl font-semibold mb-4">Contact Us</h3>
          <p className="text-gray-600 mb-4">
            If you have questions about our cookie policy, please contact us:
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