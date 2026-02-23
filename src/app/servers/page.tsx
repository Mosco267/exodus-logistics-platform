'use client';

import { motion } from 'framer-motion';
import { Server, Globe, Shield, Activity, Zap, Database, Cpu, HardDrive } from 'lucide-react';

export default function ServersPage() {
  const serverRegions = [
    {
      icon: Globe,
      region: 'North America',
      locations: ['Los Angeles, CA', 'New York, NY', 'Toronto, Canada', 'Mexico City, Mexico'],
      servers: 24,
      uptime: '99.99%'
    },
    {
      icon: Globe,
      region: 'Europe',
      locations: ['London, UK', 'Frankfurt, Germany', 'Paris, France', 'Amsterdam, Netherlands'],
      servers: 18,
      uptime: '99.98%'
    },
    {
      icon: Globe,
      region: 'Asia Pacific',
      locations: ['Tokyo, Japan', 'Singapore', 'Sydney, Australia', 'Hong Kong'],
      servers: 16,
      uptime: '99.97%'
    },
    {
      icon: Globe,
      region: 'South America',
      locations: ['São Paulo, Brazil', 'Buenos Aires, Argentina', 'Santiago, Chile'],
      servers: 8,
      uptime: '99.96%'
    }
  ];

  const specifications = [
    {
      icon: Server,
      title: 'Server Infrastructure',
      specs: [
        'Enterprise-grade Dell PowerEdge servers',
        'Intel Xeon Platinum processors',
        'Up to 2TB DDR4 RAM per server',
        'NVMe SSD storage with RAID 10'
      ]
    },
    {
      icon: Shield,
      title: 'Security Features',
      specs: [
        'DDoS protection up to 10Tbps',
        '24/7 intrusion detection and prevention',
        'ISO 27001 certified data centers',
        'SOC 2 Type II compliance'
      ]
    },
    {
      icon: Zap,
      title: 'Performance',
      specs: [
        '99.99% uptime SLA guarantee',
        'Sub-50ms response times globally',
        'Auto-scaling infrastructure',
        'Global CDN integration'
      ]
    },
    {
      icon: Database,
      title: 'Data Management',
      specs: [
        'Real-time database replication',
        'Automated daily backups',
        'Geographically distributed storage',
        'End-to-end encryption'
      ]
    }
  ];

  const metrics = [
    { label: 'Total Servers', value: '66', unit: 'machines' },
    { label: 'Global Locations', value: '14', unit: 'cities' },
    { label: 'Uptime This Month', value: '99.98', unit: '%' },
    { label: 'Response Time', value: '<50', unit: 'ms' },
    { label: 'Data Processed Daily', value: '15', unit: 'TB' },
    { label: 'API Requests', value: '50M', unit: '/day' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Our Server Infrastructure
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Enterprise-grade server infrastructure powering Exodus Logistics global operations with unmatched reliability and performance.
          </p>
        </motion.div>

        {/* Metrics Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
              className="bg-white rounded-lg shadow-md p-4 text-center"
            >
              <div className="text-2xl font-bold text-blue-600">
                {metric.value}
                <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">{metric.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Server Regions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Global Server Regions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {serverRegions.map((region, index) => (
              <motion.div
                key={region.region}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <region.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{region.region}</h3>
                    <div className="text-xs text-green-600">Uptime: {region.uptime}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Servers:</span>
                    <span className="font-medium">{region.servers}</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Locations:</p>
                    <div className="space-y-1">
                      {region.locations.map((location, locIndex) => (
                        <div key={locIndex} className="text-xs text-gray-500 flex items-center">
                          <Activity className="w-2 h-2 text-green-500 mr-2" />
                          {location}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Technical Specifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Technical Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {specifications.map((spec, index) => (
              <motion.div
                key={spec.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <spec.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold">{spec.title}</h3>
                </div>
                <ul className="space-y-2">
                  {spec.specs.map((specItem, specIndex) => (
                    <li key={specIndex} className="flex items-start text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-sm">{specItem}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Server Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="card mb-8"
        >
          <h2 className="text-2xl font-semibold mb-6">Current System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">All Systems Operational</h3>
              <p className="text-sm text-gray-600">No reported issues</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Database Performance</h3>
              <p className="text-sm text-gray-600">Optimal - <span className="text-green-600">99.99% uptime</span></p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Server Load</h3>
              <p className="text-sm text-gray-600">Normal - <span className="text-green-600">42% average</span></p>
            </div>
          </div>
        </motion.div>

        {/* Compliance and Certifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="card"
        >
          <h2 className="text-2xl font-semibold mb-6">Compliance & Certifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Industry Standards</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• ISO 27001 Information Security Management</li>
                <li>• SOC 2 Type II Compliance</li>
                <li>• GDPR Compliance</li>
                <li>• HIPAA Ready for Healthcare Shipments</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Security Measures</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 24/7 security monitoring</li>
                <li>• Regular penetration testing</li>
                <li>• Multi-factor authentication</li>
                <li>• Encrypted data transmission</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}