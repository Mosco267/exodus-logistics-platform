'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Calendar, Package, MapPin, User, Phone, Mail, Building, Printer } from 'lucide-react';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  currencySign: string; // e.g. "$", "€", "£"
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

export default function FullInvoicePage() {
  const searchParams = useSearchParams();
  const [tracking, setTracking] = useState('');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  useEffect(() => {
    const code = searchParams.get('tracking');
    if (code) setTracking(code);
  }, [searchParams]);

  useEffect(() => {
    if (!tracking) return;

    // 🔥 Replace this with real API fetch if available
    setInvoiceData({
      invoiceNumber: 'INV-2024-015678',
      date: 'February 12, 2024',
      dueDate: 'February 26, 2024',
      status: 'pending',
      currencySign: '$',
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
  }, [tracking]);

  const companyInfo = {
    name: 'Exodus Logistics',
    address: '1234 Commerce Street, Los Angeles, CA 90001',
    phone: '+1 (555) 123-4567',
    email: 'info@exoduslogistics.com',
    website: 'www.exoduslogistics.com'
  };

  const handlePrint = () => {
    window.print();
  };

  if (!invoiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-print-area, #invoice-print-area * {
              visibility: visible;
            }
            #invoice-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          id="invoice-print-area"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-lg rounded-lg overflow-hidden"
        >
          <div className="p-8">

            {/* Logo + Print Button */}
            <div className="flex justify-between items-center mb-6 no-print">
              <img
  src={typeof window !== 'undefined' ? `${window.location.origin}/logo.svg` : '/logo.svg'}
  alt="Exodus Logistics"
  className="h-16 mx-auto mb-4"
/>
              <motion.button
                onClick={handlePrint}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary flex items-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Print</span>
              </motion.button>
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-1 text-sm text-gray-600">
                <p>{companyInfo.name}</p>
                <p>{companyInfo.address}</p>
                <p>Phone: {companyInfo.phone}</p>
                <p>Email: {companyInfo.email}</p>
                <p>Website: {companyInfo.website}</p>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold mb-2">INVOICE</h1>
                <p><strong>Invoice #:</strong> {invoiceData.invoiceNumber}</p>
                <p><strong>Date:</strong> {invoiceData.date}</p>
                <p><strong>Due Date:</strong> {invoiceData.dueDate}</p>
              </div>
            </div>

            {/* Customer & Shipment */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold mb-2">Bill To:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{invoiceData.customerInfo.name}</p>
                  <p>{invoiceData.customerInfo.company}</p>
                  <p>{invoiceData.customerInfo.address}</p>
                  <p>Email: {invoiceData.customerInfo.email}</p>
                  <p>Phone: {invoiceData.customerInfo.phone}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Shipment Details:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Tracking Code:</strong> {invoiceData.shipmentInfo.trackingCode}</p>
                  <p><strong>Route:</strong> {invoiceData.shipmentInfo.origin} → {invoiceData.shipmentInfo.destination}</p>
                  <p><strong>Weight:</strong> {invoiceData.shipmentInfo.weight}</p>
                  <p><strong>Dimensions:</strong> {invoiceData.shipmentInfo.dimensions}</p>
                </div>
              </div>
            </div>

            {/* Charges */}
            <table className="w-full mb-8 border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3">Description</th>
                  <th className="text-right py-3">Rate</th>
                  <th className="text-right py-3">%</th>
                  <th className="text-right py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3">Shipping Charges</td>
                  <td className="text-right">{invoiceData.currencySign} 125.00</td>
                  <td className="text-right">-</td>
                  <td className="text-right">{invoiceData.currencySign} {invoiceData.charges.shipping.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">Insurance ({invoiceData.percentages.insuranceRate}%)</td>
                  <td className="text-right">-</td>
                  <td className="text-right">{invoiceData.percentages.insuranceRate}%</td>
                  <td className="text-right">{invoiceData.currencySign} {invoiceData.charges.insurance.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">Customs & Duties ({invoiceData.percentages.customsRate}%)</td>
                  <td className="text-right">-</td>
                  <td className="text-right">{invoiceData.percentages.customsRate}%</td>
                  <td className="text-right">{invoiceData.currencySign} {invoiceData.charges.customs.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">Discount ({invoiceData.percentages.discountRate}%)</td>
                  <td className="text-right">-</td>
                  <td className="text-right">-{invoiceData.percentages.discountRate}%</td>
                  <td className="text-right">-{invoiceData.currencySign} {invoiceData.charges.discount.toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">Tax ({invoiceData.percentages.taxRate}%)</td>
                  <td className="text-right">-</td>
                  <td className="text-right">{invoiceData.percentages.taxRate}%</td>
                  <td className="text-right">{invoiceData.currencySign} {invoiceData.charges.tax.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={3} className="py-3 font-semibold text-lg">Total:</td>
                  <td className="text-right py-3 font-bold text-lg">{invoiceData.currencySign} {invoiceData.charges.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

          </div>
        </motion.div>
      </div>
    </div>
  );
}