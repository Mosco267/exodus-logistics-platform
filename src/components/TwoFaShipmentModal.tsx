// src/components/TwoFaShipmentModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, X, Mail, Smartphone } from 'lucide-react';
import { createPortal } from 'react-dom';

type Props = {
  accent: string;
  method: 'email' | 'app';
  emailHint?: string;
  onSuccess: () => void;
  onClose: () => void;
};

const RESEND_SECONDS = 60;

export default function TwoFaShipmentModal({ accent, method, emailHint, onSuccess, onClose }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentMessage, setResentMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = () => {
    setSecondsLeft(RESEND_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // Send the email code automatically when modal opens (only for email method)
  useEffect(() => {
    if (method !== 'email') return;
    setResending(true);
    fetch('/api/user/2fa/email/send-shipment-code', { method: 'POST' })
      .then(r => r.json())
      .then(() => { setResending(false); startCountdown(); })
      .catch(() => { setResending(false); setError('Failed to send code. Please try again.'); });
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [method]);

  const handleResend = async () => {
    if (method !== 'email' || secondsLeft > 0) return;
    setResending(true);
    setError('');
    setResentMessage('');
    try {
      await fetch('/api/user/2fa/email/send-shipment-code', { method: 'POST' });
      setResentMessage('A new code has been sent to your email.');
      setTimeout(() => setResentMessage(''), 4000);
      startCountdown();
    } catch {
      setError('Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (code.replace(/\s/g, '').length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/user/2fa/verify-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, method }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      onSuccess();
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  };

  if (typeof document === 'undefined') return null;

  const Icon = method === 'email' ? Mail : Smartphone;
  const titleText = method === 'email' ? 'Email Verification' : 'App Verification';
  const subText = method === 'email'
    ? `Enter the code sent to ${emailHint || 'your email'}`
    : 'Enter the 6-digit code from your authenticator app';
  const description = method === 'email'
    ? 'We sent a 6-digit verification code to your email. Please enter it below to confirm your shipment creation.'
    : 'Two-factor authentication is enabled on your account. Open your authenticator app and enter the 6-digit code to proceed with creating your shipment.';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="h-1 w-full" style={{ background: accent }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{titleText}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{subText}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-400">
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            {description}
          </p>

          <div className="flex items-center justify-center gap-2 mb-4">
            {[0,1,2,3,4,5].map(i => (
              <input key={i} id={`twofa-box-${i}`} type="text" inputMode="numeric" maxLength={1}
                value={code[i] || ''}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (!val) { const arr = code.split(''); arr[i] = ''; setCode(arr.join('')); return; }
                  const arr = code.split(''); arr[i] = val[val.length - 1]; setCode(arr.join(''));
                  setError('');
                  if (i < 5) {
                    const next = document.getElementById(`twofa-box-${i + 1}`);
                    if (next) (next as HTMLInputElement).focus();
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) {
                    const prev = document.getElementById(`twofa-box-${i - 1}`);
                    if (prev) (prev as HTMLInputElement).focus();
                  }
                }}
                onPaste={e => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                  setCode(pasted.padEnd(6, '').slice(0, 6));
                  const last = Math.min(pasted.length, 5);
                  const box = document.getElementById(`twofa-box-${last}`);
                  if (box) (box as HTMLInputElement).focus();
                }}
                className="text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none transition"
                style={{ fontSize: '20px', height: '52px', width: '44px', borderColor: code[i] ? '#0b3aa4' : undefined }}
              />
            ))}
          </div>

          {error && <p className="text-xs text-red-500 mb-3 text-center font-medium">{error}</p>}
          {resentMessage && <p className="text-xs text-green-600 mb-3 text-center font-medium">{resentMessage}</p>}

          {method === 'email' && (
            <div className="text-center mb-4">
              {secondsLeft > 0 ? (
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Resend code in <span className="font-bold text-gray-900 dark:text-white">{secondsLeft}s</span>
                </p>
              ) : (
                <button onClick={handleResend} disabled={resending}
                  className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer disabled:opacity-50">
                  {resending ? 'Sending...' : "Didn't receive a code? Resend"}
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
              Cancel
            </button>
            <button onClick={handleVerify} disabled={loading || code.replace(/\D/g, '').length < 6}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
              style={{ background: accent }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}