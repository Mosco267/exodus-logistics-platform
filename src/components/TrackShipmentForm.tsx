'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';

interface TrackShipmentFormProps {
  onTrack?: (result: any) => void;
}

export default function TrackShipmentForm({ onTrack }: TrackShipmentFormProps) {
  const [trackingCode, setTrackingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackingCode }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Call the original onTrack callback with the actual shipment data
        onTrack?.(result.data);
      } else {
        // Handle error case - show error message
        onTrack?.({ error: result.error, message: result.message });
      }
    } catch (error) {
      // Handle network error
      onTrack?.({ 
        error: 'Network error', 
        message: 'Unable to connect to tracking service. Please check your connection and try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-center">Track Your Shipment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="trackingCode" className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Code
            </label>
            <input
              type="text"
              id="trackingCode"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              placeholder="Enter tracking code (e.g., EX-2024-US-1234567)"
              className="input-field"
              required
            />
          </div>
          <motion.button
            type="submit"
            disabled={isLoading || !trackingCode.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Tracking...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Track Shipment
              </>
            )}
          </motion.button>
        </form>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Example tracking codes:</strong> EX-2024-US-1234567, EX-2024-CA-7654321
          </p>
        </div>
      </div>
    </motion.div>
  );
}