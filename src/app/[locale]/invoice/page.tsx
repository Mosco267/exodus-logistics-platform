'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Calendar, DollarSign, Package, MapPin, User, Phone, Mail, Building, ArrowRight } from 'lucide-react';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  currency: 'USD' | 'EUR' | 'GBP';
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
    company: string;
  };
  shipmentInfo: {
    trackingCode: string;
    origin: string;
    destination: string;
    weight: string;
    dimensions: string;
  };
  charges: {
    shipping: number;
    insurance: number;
    customs: number;
    discount: number;
    tax: number;
    subtotal: number;
    total: number;
  };
  percentages: {
    taxRate: number;
    discountRate: number;
    insuranceRate: number;
    customsRate: number;
  };
}

export default function InvoicePage() {
  const searchParams = useSearchParams();
  const [showPreview, setShowPreview] = useState(false);
  const [showFullInvoice, setShowFullInvoice] = useState(false); // toggle for full invoice
  const [trackingInput, setTrackingInput] = useState('');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const currencySymbol = (code: string) => {
    switch (code) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return '$';
    }
  };

  const loadInvoice = (tracking: string) => {
    setInvoiceData({
      invoiceNumber: 'INV-2024-015678',
      date: 'February 12, 2024',
      dueDate: 'February 26, 2024',
      status: 'pending',
      currency: 'USD',
      customerInfo: {
        name: 'John Anderson',
        email: 'john.anderson@techcorp.com',
        phone: '+1 (555) 987-6543',
        address: '456 Innovation Drive, Palo Alto, CA 94301',
        company: 'TechCorp Solutions Inc.'
      },
      shipmentInfo: {
        trackingCode: tracking,
        origin: 'Los Angeles, CA',
        destination: 'New York, NY',
        weight: '25.5 lbs',
        dimensions: '24" x 18" x 12"'
      },
      charges: {
        shipping: 125.0,
        insurance: 12.5,
        customs: 35.0,
        discount: 15.0,
        tax: 15.7,
        subtotal: 172.5,
        total: 173.2
      },
      percentages: {
        taxRate: 8.5,
        discountRate: 8.0,
        insuranceRate: 10.0,
        customsRate: 20.0
      }
    });
    setShowPreview(true);
  };

  useEffect(() => {
    const trackingFromURL = searchParams.get('tracking');
    if (trackingFromURL) {
      setTrackingInput(trackingFromURL);
      loadInvoice(trackingFromURL);
    }
  }, [searchParams]);

  const companyInfo = {
    name: 'Exodus Logistics',
    address: '1234 Commerce Street, Los Angeles, CA 90001',
    phone: '+1 (555) 123-4567',
    email: 'info@exoduslogistics.com',
    website: 'www.exoduslogistics.com'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownload = () => alert('PDF download would be implemented here');
  const handleEmail = () => alert('Email functionality would be implemented here');

  if (showPreview && invoiceData) {
  return (
    <div className="relative min-h-screen py-12 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900">
  
  {/* Animated 3D Gradient Blobs */}
  <div className="absolute inset-0 overflow-hidden">
    
    <motion.div
      className="absolute w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-3xl"
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -80, 60, 0],
      }}
      transition={{
        duration: 18,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />

    <motion.div
      className="absolute right-0 bottom-0 w-[600px] h-[600px] bg-indigo-500/30 rounded-full blur-3xl"
      animate={{
        x: [0, -120, 50, 0],
        y: [0, 90, -70, 0],
      }}
      transition={{
        duration: 22,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />

  </div>

  {/* Page Content Container */}
  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    
          <button
  onClick={() => setShowPreview(false)}
  className="mb-8 inline-flex items-center px-5 py-2.5 rounded-xl 
           bg-white/10 text-white border border-white/30 
           backdrop-blur-lg shadow-lg 
           hover:bg-white/20 transition duration-300"
>
  ← Back to Invoice View
</button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Current Invoice</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoiceData.status)}`}>
                    {invoiceData.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-2">
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="text-sm">Invoice Number</span>
                    </div>
                    <p className="font-semibold">{invoiceData.invoiceNumber}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-2">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-sm">Due Date</span>
                    </div>
                    <p className="font-semibold">{invoiceData.dueDate}</p>
                  </div>
                </div>

                <div className="border-t pt-6 mb-6">
                  <h3 className="font-semibold mb-4">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{invoiceData.customerInfo.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{invoiceData.customerInfo.company}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{invoiceData.customerInfo.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{invoiceData.customerInfo.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 mb-6">
                  <h3 className="font-semibold mb-4">Shipment Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Tracking: {invoiceData.shipmentInfo.trackingCode}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Route: {invoiceData.shipmentInfo.origin} → {invoiceData.shipmentInfo.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 mb-6">
                  <h3 className="font-semibold mb-4">Charge Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Shipping Charges</span>
                      <span>{currencySymbol(invoiceData.currency)} {invoiceData.charges.shipping.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance ({invoiceData.percentages.insuranceRate}%)</span>
                      <span>{currencySymbol(invoiceData.currency)} {invoiceData.charges.insurance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customs & Duties ({invoiceData.percentages.customsRate}%)</span>
                      <span>{currencySymbol(invoiceData.currency)} {invoiceData.charges.customs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount (-{invoiceData.percentages.discountRate}%)</span>
                      <span className="text-green-600">-{currencySymbol(invoiceData.currency)} {invoiceData.charges.discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({invoiceData.percentages.taxRate}%)</span>
                      <span>{currencySymbol(invoiceData.currency)} {invoiceData.charges.tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                      <span>Total Amount</span>
                      <span>{currencySymbol(invoiceData.currency)} {invoiceData.charges.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  


<Link
  href={`/invoice/full?tracking=${invoiceData.shipmentInfo.trackingCode}`}
  className="btn-primary flex items-center justify-center"
>
  <Eye className="w-4 h-4 mr-2" />
  View Full Invoice
</Link>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    className="btn-secondary flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleEmail}
                    className="btn-secondary flex items-center justify-center"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Invoice
                  </motion.button>
                </div>

                {/* Full Invoice Section Toggle */}
                {showFullInvoice && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-4">Full Invoice Details</h3>
                    <pre className="text-sm">{JSON.stringify(invoiceData, null, 2)}</pre>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Payment Methods */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="card"
              >
                <h3 className="font-semibold mb-4">Payment Methods</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Credit Card</span>
                    <span className="text-green-600">✓ Accepted</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bank Transfer</span>
                    <span className="text-green-600">✓ Accepted</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>PayPal</span>
                    <span className="text-green-600">✓ Accepted</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cryptocurrency</span>
                    <span className="text-green-600">✓ Accepted</span>
                  </div>
                </div>
              </motion.div>

              {/* Early Payment Discount */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-start">
                  
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Early Payment Discount</h4>
                    <p className="text-sm text-blue-800">
                      Pay within 7 days and receive a 2% early payment discount on your total amount.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

   const handleTrackingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value.toUpperCase(); // Convert all letters to uppercase
  value = value.replace(/[^A-Z0-9]/g, ''); // Allow only letters and numbers

  // Format: EX-23-US-123456
  let formatted = '';
  if (value.length > 0) {
    formatted += value.substring(0, 2); // First 2 letters
  }
  if (value.length > 2) {
    formatted += '-' + value.substring(2, 4); // Next 2 digits
  }
  if (value.length > 4) {
    formatted += '-' + value.substring(4, 6); // Next 2 letters
  }
  if (value.length > 6) {
    formatted += '-' + value.substring(6, 12); // Last 6 digits
  }

  setTrackingInput(formatted);
};
 return (
  <div
    className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
    style={{
      backgroundImage:
        "url('https://www.cssscript.com/3d-globe-webgl/')",
    }}
  >
    {/* Blue overlay for better readability */}
    <div className="absolute inset-0 bg-blue-900/60"></div>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trackingInput) return;
        loadInvoice(trackingInput);
      }}
      className="relative bg-white/95 p-10 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-sm"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Track Your Shipment
        </h2>
        <p className="text-gray-600 mt-2 text-sm">
          Enter your tracking code to view invoice details.
        </p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={trackingInput}
          onChange={handleTrackingInputChange}
          placeholder="EX-23-US-123456"
          className="w-full border border-gray-300 px-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg transition duration-200"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 transition duration-300 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl"
      >
        View Invoice
      </button>
    </form>
  </div>
);
}