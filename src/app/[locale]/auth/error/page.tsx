'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useContext } from 'react';
import { Loader2, AlertCircle, ShieldX, Mail } from 'lucide-react';
import Link from 'next/link';
import { LocaleContext } from '@/context/LocaleContext';
import { motion } from 'framer-motion';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { locale } = useContext(LocaleContext);

  const getMessage = () => {
    switch (error) {
      case 'AccessDenied':
        return {
          icon: ShieldX,
          title: 'Account Suspended',
          desc: 'Your account has been suspended and cannot sign in. Please contact our support team for assistance.',
          color: '#ef4444',
        };
      case 'OAuthAccountNotLinked':
        return {
          icon: Mail,
          title: 'Email Already Registered',
          desc: 'This email is already registered with a different sign-in method. Please sign in with your email and password instead.',
          color: '#f97316',
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Sign In Failed',
          desc: 'Something went wrong during sign in. Please try again.',
          color: '#f97316',
        };
    }
  };

  const { icon: Icon, title, desc, color } = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center px-5"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)', minHeight: '100dvh' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }} className="w-full max-w-[420px]">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">{desc}</p>

          {error === 'AccessDenied' && (
            <a href="mailto:support@goexoduslogistics.com"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
              <Mail className="w-4 h-4" />
              support@goexoduslogistics.com
            </a>
          )}

          <div className="mt-6 space-y-3">
            <Link href={`/${locale}/sign-in`}
              className="block w-full h-11 flex items-center justify-center rounded-xl font-bold text-sm text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
              Back to Sign In
            </Link>
            <Link href={`/${locale}`}
              className="block w-full h-11 flex items-center justify-center rounded-xl font-bold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all">
              Go to Homepage
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}