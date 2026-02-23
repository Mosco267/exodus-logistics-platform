'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Loader2 } from 'lucide-react';

interface QuoteFormData {
  origin: string;
  destination: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  packageType: string;
  urgency: string;
}

interface GetAQuoteFormProps {
  onQuote?: (data: QuoteFormData) => void;
}

export default function GetAQuoteForm({ onQuote }: GetAQuoteFormProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    origin: '',
    destination: '',
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    packageType: 'standard',
    urgency: 'standard'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof QuoteFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDimensionChange = (dimension: keyof QuoteFormData['dimensions'], value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      onQuote?.(formData);
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto"
    >
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-center">Get a Shipping Quote</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-2">
                Origin City/ZIP
              </label>
              <input
                type="text"
                id="origin"
                value={formData.origin}
                onChange={(e) => handleInputChange('origin', e.target.value)}
                placeholder="Los Angeles, CA or 90001"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-2">
                Destination City/ZIP
              </label>
              <input
                type="text"
                id="destination"
                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
                placeholder="New York, NY or 10001"
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
              Package Weight (lbs)
            </label>
            <input
              type="number"
              id="weight"
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              placeholder="10"
              min="0.1"
              step="0.1"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Package Dimensions (inches)
            </label>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="number"
                placeholder="Length"
                value={formData.dimensions.length}
                onChange={(e) => handleDimensionChange('length', e.target.value)}
                className="input-field"
                required
              />
              <input
                type="number"
                placeholder="Width"
                value={formData.dimensions.width}
                onChange={(e) => handleDimensionChange('width', e.target.value)}
                className="input-field"
                required
              />
              <input
                type="number"
                placeholder="Height"
                value={formData.dimensions.height}
                onChange={(e) => handleDimensionChange('height', e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="packageType" className="block text-sm font-medium text-gray-700 mb-2">
                Package Type
              </label>
              <select
                id="packageType"
                value={formData.packageType}
                onChange={(e) => handleInputChange('packageType', e.target.value)}
                className="input-field"
                required
              >
                <option value="standard">Standard Package</option>
                <option value="document">Documents</option>
                <option value="fragile">Fragile</option>
                <option value="oversized">Oversized</option>
                <option value="hazardous">Hazardous Materials</option>
              </select>
            </div>
            <div>
              <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Speed
              </label>
              <select
                id="urgency"
                value={formData.urgency}
                onChange={(e) => handleInputChange('urgency', e.target.value)}
                className="input-field"
                required
              >
                <option value="economy">Economy (5-7 days)</option>
                <option value="standard">Standard (3-5 days)</option>
                <option value="express">Express (1-2 days)</option>
                <option value="overnight">Overnight</option>
              </select>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating Quote...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Get Instant Quote
              </>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}