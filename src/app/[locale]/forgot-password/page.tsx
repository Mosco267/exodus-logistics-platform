'use client';

import Link from 'next/link';
import { useContext } from 'react';
import { LocaleContext } from '@/context/LocaleContext';

export default function ForgotPasswordPage() {
  const { locale } = useContext(LocaleContext);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Forgot Password</h2>
        <p className="text-gray-600 mb-6">
          Please enter your email to reset your password.
        </p>
        <form className="space-y-4">
          <input
            type="email"
            placeholder="you@example.com"
            required
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-400"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-2xl hover:bg-blue-700 transition-all duration-300 cursor-pointer"
          >
            Send Reset Link
          </button>
        </form>
        <Link
          href={`/${locale}/sign-in`}
          className="mt-4 block text-blue-600 hover:text-blue-800 font-medium"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}