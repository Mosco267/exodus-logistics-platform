'use client';

import { useState, useRef, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { LocaleContext } from '@/context/LocaleContext';
import { signIn } from 'next-auth/react';

import en from '@/messages/en.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import de from '@/messages/de.json';
import zh from '@/messages/zh.json';
import it from '@/messages/it.json';

export default function SignInPage() {
  const { locale } = useContext(LocaleContext);
  const router = useRouter();

  const messagesMap: Record<string, any> = { en, es, fr, de, zh, it };
  const messages = messagesMap[locale] || en;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState({ email: '', password: '', general: '' });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const toggleShowPassword = () => {
    if (passwordRef.current) {
      const pos = passwordRef.current.selectionStart;
      setShowPassword((v) => !v);
      setTimeout(() => {
        passwordRef.current?.setSelectionRange(pos ?? 0, pos ?? 0);
      }, 0);
    } else {
      setShowPassword((v) => !v);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    let newErrors = { email: '', password: '', general: '' };

    // Email validation
    if (!email) newErrors.email = messages.emailRequired;
    else if (!/^\S+@\S+\.\S+$/.test(email)) newErrors.email = messages.invalidEmail;

    // Password validation
    if (!password) newErrors.password = messages.passwordRequired;

    setErrors(newErrors);
    if (newErrors.email || newErrors.password) return;

    setIsSubmitting(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setErrors({ email: '', password: '', general: 'Invalid email or password.' });
        return;
      }

      router.push(`/${locale}/dashboard`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'apple') => {
    // This will only work after you add the provider in NextAuth config + env vars.
    await signIn(provider, { callbackUrl: `/${locale}/dashboard` });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl"
      >
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-6 flex items-center justify-center gap-2">
          <LogIn className="w-6 h-6 text-blue-600" /> {messages.signIn}
        </h2>

        {errors.general && (
          <p className="text-red-600 text-center mb-4 font-semibold">{errors.general}</p>
        )}

        

        <form onSubmit={handleSignIn} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {messages.emailAddress}
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              value={email}
              placeholder={messages.enterEmail || 'you@example.com'}
             onChange={(e) => {
  setEmail(e.target.value);
  setErrors((prev) => ({ ...prev, email: '', general: '' }));
}}
              className={`mt-1 block w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } text-gray-700 placeholder-gray-400`}
            />
            <AnimatePresence>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {messages.password}
            </label>
            <div className="relative mt-1">
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder={messages.enterPassword}
                onChange={(e) => {
  setPassword(e.target.value);
  setErrors((prev) => ({ ...prev, password: '', general: '' }));
}}
                className={`block w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                  errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                } pr-10`}
              />
              {password.length > 0 && (
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleShowPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between">
  <button
    type="button"
    className="text-sm text-blue-600 hover:text-blue-700 hover:font-semibold cursor-pointer"
    onClick={() => router.push(`/${locale}/forgot-password`)}
  >
    {messages.forgotPassword || 'Forgot password?'}
  </button>

  <p className="text-sm text-gray-600">
    {messages.noAccount || "Don't have an account?"}{' '}
    <button
      type="button"
      className="text-blue-600 hover:text-blue-700 hover:font-semibold cursor-pointer"
      onClick={() => router.push(`/${locale}/signup`)}
    >
      {messages.signUp || 'Sign up'}
    </button>
  </p>
</div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-2xl hover:font-bold hover:bg-blue-700 transition-all duration-300 cursor-pointer ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Signing in...' : messages.signIn}
          </motion.button>

          <div className="flex items-center gap-3 my-4">
  <div className="h-px bg-gray-200 flex-1" />
  <span className="text-xs text-gray-500">OR</span>
  <div className="h-px bg-gray-200 flex-1" />
</div>

{/* Google Sign In */}
<div className="mt-4">
  <motion.button
  type="button"
  whileHover={{ scale: 1.05 }}
  onClick={() => handleProviderSignIn('google')}
  className="w-full flex justify-center items-center gap-2 px-4 py-2 
             border border-gray-300 rounded-lg 
             font-semibold text-gray-700 
             shadow-lg transition-all duration-300 
             cursor-pointer
             hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:font-bold hover:shadow-2xl"
>
  Continue with Google
</motion.button>
</div>
        </form>
      </motion.div>
    </div>
  );
}