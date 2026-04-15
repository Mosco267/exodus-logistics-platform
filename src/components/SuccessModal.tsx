'use client';

import { CheckCircle2 } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function SuccessModal({ open, title, message, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92%] max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-white/10 p-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">{message}</p>
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition"
            style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}