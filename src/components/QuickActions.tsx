'use client';

import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { Search, Package, FileText } from 'lucide-react';

interface QuickActionsProps {
  onTrackClick?: () => void;
  onInvoiceClick?: () => void;
  onQuoteClick?: () => void;
}

export default function QuickActions({ onTrackClick, onInvoiceClick, onQuoteClick }: QuickActionsProps) {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });

  const cards = [
    {
      icon: Package,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: t('QuickActions.trackTitle'),
      desc: t('QuickActions.trackDesc'),
      onClick: onTrackClick,
    },
    {
      icon: FileText,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: t('QuickActions.invoiceTitle'),
      desc: t('QuickActions.invoiceDesc'),
      onClick: onInvoiceClick,
    },
    {
      icon: Search,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: t('QuickActions.quoteTitle'),
      desc: t('QuickActions.quoteDesc'),
      onClick: onQuoteClick,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(({ icon: Icon, iconBg, iconColor, title, desc, onClick }) => (
          <motion.button
            key={title}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="card text-left shadow-2xl hover:shadow-3xl transition-shadow duration-500 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-center mb-4">
              <div className={`${iconBg} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 text-sm">{desc}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}