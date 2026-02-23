'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Calendar, Truck, AlertCircle } from 'lucide-react';

interface Step {
  name: string;
  details: string[];
}

interface TrackData {
  trackingNumber: string;
  steps: Step[];
  currentStep: number;
  estimatedDelivery: string;
}

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
    if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
    if (val.length > 8) val = val.slice(0, 8) + '-' + val.slice(8, 14);
    setTrackingNumber(val);
  };

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber || trackingNumber.length < 12) {
      setError('Please enter a valid tracking code');
      return;
    }

    setIsLoading(true);
    setError('');
    setTrackData(null);

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber }),
      });
      if (!res.ok) throw new Error('Tracking unavailable. Try again later.');
      const data = await res.json();
      setTrackData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 py-20">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            Track Your Shipment
          </h1>
          <p className="text-lg text-gray-700">
            Enter your tracking number below.
          </p>
        </div>

        {/* Tracking Input */}
        <motion.form
          onSubmit={handleTrack}
          className="bg-white shadow-xl rounded-2xl p-10 space-y-2 border border-gray-200"
        >
          <input
            type="text"
            value={trackingNumber}
            onChange={handleChange}
            placeholder="Enter Tracking Code…"
            className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none uppercase shadow-sm"
          />
          <p className="text-sm text-gray-500">
            Example: EX-24-US-123456, EX-20-CA-654321
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl flex items-center justify-center hover:bg-blue-700 transition"
          >
            {isLoading ? 'Tracking...' : <><Truck className="w-5 h-5 mr-2" /> Track Shipment</>}
          </button>
          {error && (
            <div className="flex items-center text-red-600 mt-2">
              <AlertCircle className="w-5 h-5 mr-2" /> {error}
            </div>
          )}
        </motion.form>

        {/* Tracking Progress */}
        {trackData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-white rounded-2xl shadow-xl p-8 border border-gray-200"
          >
            <div className="flex items-center mb-6">
              <Truck className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-2xl font-bold">Shipment Progress</h2>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-start relative">
              {trackData.steps.map((step, idx) => {
                const isActive = idx <= trackData.currentStep;
                return (
                  <div key={idx} className="flex flex-col items-center relative w-1/5">
                    {/* Step Circle */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <Package className="w-6 h-6" />
                    </div>
                    <span className="mt-2 text-sm text-center">{step.name}</span>

                    {/* Connecting Line */}
                    {idx < trackData.steps.length - 1 && (
                      <div
                        className={`absolute top-5 left-[105%] w-full h-1 ${
                          idx < trackData.currentStep ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}

                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() => toggleStep(idx)}
                      className="mt-3 text-xs text-blue-600 hover:underline"
                    >
                      {expandedSteps.includes(idx) ? 'Hide Details' : 'View Details'}
                    </button>

                    {/* Step Details */}
                    {expandedSteps.includes(idx) && step.details.length > 0 && (
                      <div className="mt-2 bg-gray-50 p-2 rounded shadow w-48 text-xs text-gray-700 space-y-1">
                        {step.details.map((d, i) => (
                          <p key={i}>{d}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-gray-700 flex items-center">
              <Calendar className="w-4 h-4 inline mr-1" /> Estimated Delivery: {trackData.estimatedDelivery}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}