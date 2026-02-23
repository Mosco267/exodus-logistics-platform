'use client';

import { motion } from 'framer-motion';
import { Package, Plane, Truck, Ship, Clock, Shield, Globe, FileText, Headphones, Warehouse } from 'lucide-react';

export default function ServicesPage() {
  const services = [
    {
      icon: Plane,
      title: 'Air Freight',
      description: 'Fast and reliable air cargo services for urgent shipments worldwide.',
      features: ['Express delivery', 'Real-time tracking', 'Customs clearance', 'Insurance available'],
      speed: '1-3 days'
    },
    {
      icon: Ship,
      title: 'Ocean Freight',
      description: 'Cost-effective sea freight solutions for large shipments and bulk cargo.',
      features: ['Full container loads', 'Less than container loads', 'Port-to-port delivery', 'Cargo insurance'],
      speed: '15-30 days'
    },
    {
      icon: Truck,
      title: 'Ground Transportation',
      description: 'Comprehensive trucking and land transportation services across regions.',
      features: ['Door-to-door delivery', 'Full truckload', 'Less than truckload', 'Last mile delivery'],
      speed: '1-7 days'
    },
    {
      icon: Package,
      title: 'Express Courier',
      description: 'Premium express delivery service for time-sensitive documents and packages.',
      features: ['Next day delivery', 'Same day delivery', 'Document shipping', 'Package tracking'],
      speed: 'Same day'
    }
  ];

  const additionalServices = [
    {
      icon: Warehouse,
      title: 'Warehousing & Storage',
      description: 'Secure storage solutions with inventory management and distribution.'
    },
    {
      icon: Shield,
      title: 'Cargo Insurance',
      description: 'Comprehensive insurance coverage for all your valuable shipments.'
    },
    {
      icon: FileText,
      title: 'Customs Clearance',
      description: 'Expert customs documentation and clearance services worldwide.'
    },
    {
      icon: Globe,
      title: 'International Shipping',
      description: 'Global logistics solutions connecting over 200 countries.'
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      description: 'Round-the-clock customer service for all your shipping needs.'
    },
    {
      icon: Clock,
      title: 'Expedited Services',
      description: 'Priority handling and faster delivery options for urgent shipments.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Comprehensive logistics solutions tailored to meet your unique shipping requirements.
            </p>
          </motion.div>
        </div>
      </motion.section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Core Shipping Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our range of transportation options designed for speed, reliability, and cost-effectiveness.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <service.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {service.speed}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Additional Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Value-added services to enhance your shipping experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {additionalServices.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center card hover:shadow-xl transition-shadow duration-300"
              >
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <service.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Need a Custom Solution?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              We specialize in tailored logistics solutions for unique requirements. Let's discuss how we can help your business.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/contact'}
              className="btn-primary text-lg px-8 py-4"
            >
              Contact Sales Team
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}