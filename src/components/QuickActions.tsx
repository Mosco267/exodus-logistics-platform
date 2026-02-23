'use client';

import { motion } from 'framer-motion';
import { Search, Package, FileText } from 'lucide-react';

interface QuickActionsProps {
  onTrackClick?: () => void;
  onInvoiceClick?: () => void;
  onQuoteClick?: () => void;
}

export default function QuickActions({ onTrackClick, onInvoiceClick, onQuoteClick }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={onTrackClick}
  className="card text-left shadow-2xl hover:shadow-3xl transition-shadow duration-500 cursor-pointer"
>
        
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Track Shipment</h3>
          <p className="text-gray-600 text-sm">Track your package in real-time with tracking code</p>
        </motion.button>

        <motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={onTrackClick}
  className="card text-left shadow-2xl hover:shadow-3xl transition-shadow duration-500 cursor-pointer"
>
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">View Invoice</h3>
          <p className="text-gray-600 text-sm">Access and download your invoices instantly</p>
        </motion.button>

        <motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={onTrackClick}
  className="card text-left shadow-2xl hover:shadow-3xl transition-shadow duration-500 cursor-pointer"
>
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Get a Quote</h3>
          <p className="text-gray-600 text-sm">Instant pricing for your shipping needs</p>
        </motion.button>
      </div>
    </motion.div>
  );
}