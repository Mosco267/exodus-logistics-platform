'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Package, MapPin, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';



interface QuoteData {
  origin: string;
  destination: string;
  weight: string;
  dimensions: { length: string; width: string; height: string };
  packageType: string;
  shipmentType: string;
  packageValue: string;
  currency: 'USD' | 'EUR' | 'GBP';
}

interface QuoteResult {
  quoteNumber: string;
  serviceType: string;
  origin: string;
  destination: string;
  distance: number; // in miles
  weight: number;
  dimensions: any;
  packageValue: number;
  currency: string;
  charges: {
  shippingPercent: number;
  insurancePercent: number;
  fuelPercent: number;
  discountPercent: number;
  taxPercent: number;

  shipping: number;
  insurance: number;
  fuel: number;
  discount: number;
  tax: number;

  total: number;
};
  estimatedDelivery: string;
  validUntil: string;
}

export default function QuotePage() {
  const [formData, setFormData] = useState<QuoteData>({
    origin: '',
    destination: '',
    weight: '',
    dimensions: { length: '', width: '', height: '' },
    packageType: 'standard',
    shipmentType: 'document',
    packageValue: '',
    currency: 'USD',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [showQuote, setShowQuote] = useState(false);
  const [error, setError] = useState<string>('');

 // Inside QuotePage component
const handlePackageValueChange = (value: string) => {
  // Remove non-digits
  const numericValue = value.replace(/\D/g, '');
  // Store raw number in state
  setFormData(prev => ({ ...prev, packageValue: numericValue }));
};

// Helper to display formatted number
const formatWithCommas = (value: string) => {
  if (!value) return '';
  return parseInt(value).toLocaleString(); // automatically adds commas
};
  
  const getCurrencySymbol = (code: string) => {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '$';
  }
};
  const handleInputChange = (field: keyof QuoteData, value: string) => {
    if (['origin', 'destination'].includes(field)) {
      value = value.replace(/\b\w/g, char => char.toUpperCase());
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [dimension]: value },
    }));
  };

  // Mock function: replace this with actual Google Maps API distance calculation
  const getDistanceMiles = async (origin: string, destination: string) => {
    // TODO: Integrate Google Maps Distance Matrix API
    return Math.floor(Math.random() * 1000) + 100; // temporary mock
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination || !formData.weight || !formData.packageValue) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const distance = await getDistanceMiles(formData.origin, formData.destination);

      setTimeout(() => {
        const declaredValue = parseFloat(formData.packageValue);

// These will later come from Admin
const shippingPercent = 10;
const insurancePercent = 5;
const fuelPercent = 2;
const discountPercent = 3;
const taxPercent = 7;

// 1️⃣ Shipping from Declared Value
const shipping = (shippingPercent / 100) * declaredValue;

// 2️⃣ Others from Shipping
const insurance = (insurancePercent / 100) * shipping;
const fuel = (fuelPercent / 100) * shipping;
const discount = (discountPercent / 100) * shipping;

const subtotal = shipping + insurance + fuel - discount;

const tax = (taxPercent / 100) * subtotal;

const total = subtotal + tax;
        const mockResult: QuoteResult = {
          quoteNumber: `Q-${Date.now().toString(36).slice(-8).toUpperCase()}`,
          serviceType: formData.packageType,
          origin: formData.origin,
          destination: formData.destination,
          distance,
          weight: parseFloat(formData.weight),
          dimensions: { ...formData.dimensions },
          packageValue: parseFloat(formData.packageValue),
          currency: formData.currency,
          charges: {
  shippingPercent,
  insurancePercent,
  fuelPercent,
  discountPercent,
  taxPercent,

  shipping,
  insurance,
  fuel,
  discount,
  tax,

  total,
},
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        };
        setQuoteResult(mockResult);
        setShowQuote(true);
      }, 1000);
    } catch (err) {
      setError('Quote unavailable. Try again later or contact support.');
      setQuoteResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getChargeRow = (label: string, value: number, isTotal: boolean = false) => (
    <div className="flex justify-between text-gray-700">
      <span>{label}</span>
      <span>
        {isTotal ? `${quoteResult?.currency} ${value.toFixed(2)}` : value.toFixed(2)}
      </span>
    </div>
  );

  const handlePrint = () => {
  const printContents = document.querySelector('.printable')?.innerHTML;
  if (!printContents) return;

  const printWindow = window.open('', '', 'height=800,width=1200');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Quote</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2, h4 { margin: 0 0 10px 0; }
          .cost-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .cost-total { font-weight: bold; font-size: 1.1rem; margin-top: 10px; border-top: 1px solid #ccc; padding-top: 8px; }
        </style>
      </head>
      <body>
        ${printContents}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Get Instant Quote</h1>
          <p className="text-xl text-gray-600">Calculate your shipping cost in seconds</p>
        </motion.div>

        {!showQuote ? (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg space-y-6"
          >
            {error && <p className="text-red-500">{error}</p>}

            {/* Origin / Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700">Origin</label>
                <input
                  type="text"
                  value={formData.origin}
                  onChange={e => handleInputChange('origin', e.target.value)}
                  placeholder="City or ZIP Code"
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">Destination</label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={e => handleInputChange('destination', e.target.value)}
                  placeholder="City or ZIP Code"
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                />
              </div>
            </div>

            {/* Package Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700">Weight (lbs)</label>
                <input
                  type="number"
                  value={formData.weight}
                  placeholder="lbs"
                  onChange={e => handleInputChange('weight', e.target.value)}
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">Length (cm)</label>
                <input
                  type="number"
                  value={formData.dimensions.length}
                  placeholder="cm"
                  onChange={e => handleDimensionChange('length', e.target.value)}
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">Width (cm)</label>
                <input
                  type="number"
                  value={formData.dimensions.width}
                  placeholder="cm"
                  onChange={e => handleDimensionChange('width', e.target.value)}
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">Height (cm)</label>
                <input
                  type="number"
                  value={formData.dimensions.height}
                  placeholder="cm"
                  onChange={e => handleDimensionChange('height', e.target.value)}
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                />
              </div>
            </div>

            {/* Shipment Type / Service */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700">Shipment Type</label>
                <select
                  value={formData.shipmentType}
                  onChange={e => handleInputChange('shipmentType', e.target.value)}
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                >
                  <option value="document">Document</option>
                  <option value="fragile">Fragile</option>
                  <option value="package">Package</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 font-medium text-gray-700">Service Type</label>
                <select
                  value={formData.packageType}
                  onChange={e => handleInputChange('packageType', e.target.value)}
                  className="input-field border border-gray-300 p-3 rounded-lg w-full"
                >
                  <option value="economy">Economy (5-7 days)</option>
                  <option value="standard">Standard (3-5 days)</option>
                  <option value="express">Express (1-2 days)</option>
                  <option value="overnight">Overnight</option>
                </select>
              </div>
            </div>

            {/* Declared Value */}
            <div>
  <label className="block mb-2 font-medium text-gray-700">Declared Value</label>
  <div className="flex gap-2">
    <input
      type="text" // must be text to allow commas
      placeholder="Amount"
      value={formatWithCommas(formData.packageValue)}
      onChange={e => handlePackageValueChange(e.target.value)}
      className="input-field border border-gray-300 p-3 rounded-lg w-full"
    />
    <select
      value={formData.currency}
      onChange={e => handleInputChange('currency', e.target.value)}
      className="input-field border border-gray-300 p-3 rounded-lg"
    >
      <option value="USD">USD</option>
      <option value="EUR">EUR</option>
      <option value="GBP">GBP</option>
    </select>
  </div>
</div>

            {/* Submit */}
            <div className="mt-6 flex justify-center">
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold w-full max-w-sm flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5 mr-2" />
                    Get Quote
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        ) : (
          quoteResult && (
  <motion.div
    id="printable-quote"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg printable"
  >
    {/* Header */}
    <div className="flex justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Your Instant Quote</h2>
        <p className="text-gray-600">Quote #{quoteResult.quoteNumber}</p>
      </div>
      <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
        {quoteResult.serviceType} Shipping
      </span>
    </div>

    {/* Route & Package Info */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
      <div>
        <h4 className="font-semibold mb-2">Route</h4>
        <p>
          <MapPin className="w-4 h-4 inline mr-2" />
          {quoteResult.origin} → {quoteResult.destination}
        </p>
        <p className="text-sm text-gray-500">Distance: {quoteResult.distance} miles</p>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Package</h4>
        <p>
          <Package className="w-4 h-4 inline mr-2" />
          Weight: {quoteResult.weight} lbs
        </p>
        <p className="text-sm text-gray-500">
          Dimensions: {quoteResult.dimensions.length} × {quoteResult.dimensions.width} ×{' '}
          {quoteResult.dimensions.height} cm
        </p>
        <p className="text-sm text-gray-500">
          Declared Value: {quoteResult.packageValue} {quoteResult.currency}
        </p>
      </div>
    </div>

    {/* Cost Breakdown */}
    <div className="mb-6">
  <h4 className="font-semibold mb-3 text-gray-800 text-lg">
    Cost Breakdown
  </h4>

  <div className="space-y-2 text-sm text-gray-700">

    <div className="flex justify-between">
      <span>Shipping ({quoteResult.charges.shippingPercent}%)</span>
      <span>{getCurrencySymbol(quoteResult.currency)} {quoteResult.charges.shipping.toFixed(2)}</span>
    </div>

    <div className="flex justify-between">
      <span>Insurance ({quoteResult.charges.insurancePercent}%)</span>
      <span>{getCurrencySymbol(quoteResult.currency)} {quoteResult.charges.insurance.toFixed(2)}</span>
    </div>

    <div className="flex justify-between">
      <span>Fuel ({quoteResult.charges.fuelPercent}%)</span>
      <span>{getCurrencySymbol(quoteResult.currency)} {quoteResult.charges.fuel.toFixed(2)}</span>
    </div>

    <div className="flex justify-between">
      <span>Discount ({quoteResult.charges.discountPercent}%)</span>
      <span>-{getCurrencySymbol(quoteResult.currency)} {quoteResult.charges.discount.toFixed(2)}</span>
    </div>

    <div className="flex justify-between">
      <span>Tax ({quoteResult.charges.taxPercent}%)</span>
      <span>{getCurrencySymbol(quoteResult.currency)} {quoteResult.charges.tax.toFixed(2)}</span>
    </div>

    <div className="flex justify-between font-bold text-lg border-t pt-2">
      <span>Total</span>
      <span>{getCurrencySymbol(quoteResult.currency)} {quoteResult.charges.total.toFixed(2)}</span>
    </div>

  </div>
</div>

    
    {/* Buttons */}
    <div className="mt-6 flex justify-between">
      {/* Print Button */}
      <motion.button
  onClick={() => {
    // Hide everything that should not appear
    const invoiceElement = document.getElementById('printable-quote');
    if (!invoiceElement) return;
    const originalContent = document.body.innerHTML;
    const printContent = invoiceElement.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // reload to restore interactivity
  }}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
>
  Print Quote
</motion.button>

      {/* Back to Form */}
      <motion.button
        onClick={() => setShowQuote(false)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="px-4 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200"
      >
        Back to Form
      </motion.button>
    </div>
  </motion.div>
)
        )}
      </div>
    </div>
  );
}