// src/app/[locale]/dashboard/settings/delete-account/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ArrowLeft, Trash2, AlertTriangle, Loader2, Eye, EyeOff, CheckCircle2, Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

export default function DeleteAccountPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const { data: session } = useSession();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');

  useEffect(() => {
    const map: Record<string, { g: string; s: string }> = {
      default: { g: 'linear-gradient(135deg, #0b3aa4, #0e7490)', s: '#0b3aa4' },
      ocean: { g: 'linear-gradient(135deg, #0e7490, #06b6d4)', s: '#0891b2' },
      sunset: { g: 'linear-gradient(135deg, #0b3aa4, #f97316)', s: '#f97316' },
      arctic: { g: 'linear-gradient(135deg, #0284c7, #bae6fd)', s: '#0284c7' },
      midnight: { g: 'linear-gradient(135deg, #0f172a, #0e7490)', s: '#06b6d4' },
    };
    const apply = () => { const c = localStorage.getItem('exodus_theme_cache'); if (c && map[c]) { setAccent(map[c].g); setAccentSolid(map[c].s); } };
    apply(); window.addEventListener('storage', apply); const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  const [step, setStep] = useState<'auth' | 'confirm' | 'done'>('auth');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);

  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetch('/api/user/passkeys').then(r => r.json()).then(d => setHasPasskey((d.passkeys || []).length > 0)).catch(() => {});
  }, []);

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white/40 transition";

  const handlePasswordAuth = async () => {
    if (!password) { setAuthError('Password is required'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch('/api/user/verify-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Incorrect password'); return; }
      setStep('confirm');
    } catch { setAuthError('Something went wrong'); }
    finally { setAuthLoading(false); }
  };

  const handlePasskeyAuth = async () => {
    setAuthLoading(true); setAuthError('');
    try {
      const optRes = await fetch('/api/user/passkeys/authenticate/options', { method: 'POST' });
      const opts = await optRes.json();
      if (!optRes.ok) { setAuthError(opts.error || 'Failed to start'); return; }
      const credential = await startAuthentication(opts);
      const verRes = await fetch('/api/user/passkeys/authenticate/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) { setAuthError(verData.error || 'Passkey failed'); return; }
      setStep('confirm');
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') setAuthError('Passkey cancelled');
      else setAuthError('Passkey authentication failed');
    } finally { setAuthLoading(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') { setDeleteError('Type DELETE to confirm'); return; }
    setDeleting(true); setDeleteError('');
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || 'Failed'); return; }
      setStep('done');
      setTimeout(() => signOut({ callbackUrl: `/${locale}/sign-in` }), 2500);
    } catch { setDeleteError('Something went wrong'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/dashboard/settings`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Delete Account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">This action cannot be undone</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6 space-y-5">

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">This action is permanent</p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1 leading-relaxed">
              Deleting your account will immediately log you out and remove your data. Only an administrator can restore it.
            </p>
          </div>
        </div>

        {/* Step 1: Auth */}
        {step === 'auth' && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Confirm your identity to continue</p>

            {hasPasskey && (
              <button onClick={handlePasskeyAuth} disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition cursor-pointer disabled:opacity-60"
                style={{ borderColor: accentSolid, color: accentSolid }}>
                {authLoading ? <Loader2 size={15} className="animate-spin" /> : <Fingerprint size={15} />}
                Use Passkey
              </button>
            )}

            {hasPasskey && <div className="flex items-center gap-2"><div className="flex-1 h-px bg-gray-200 dark:bg-white/10" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200 dark:bg-white/10" /></div>}

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                  placeholder="Your current password" autoComplete="current-password"
                  className={inputClass + ' pr-11'} style={{ fontSize: '16px' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {authError && <p className="text-xs text-red-500 font-medium">{authError}</p>}
            <button onClick={handlePasswordAuth} disabled={authLoading || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
              {authLoading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              {authLoading ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                Reason for deletion <span className="font-normal">(optional)</span>
              </label>
              <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                placeholder="Tell us why you're leaving..." rows={2}
                className={inputClass + ' resize-none'} style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                Type <strong className="text-red-600">DELETE</strong> to confirm
              </label>
              <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE" autoCapitalize="characters"
                className={inputClass + ' font-mono tracking-widest'} style={{ fontSize: '16px' }} />
            </div>
            {deleteError && <p className="text-xs text-red-500 font-medium">{deleteError}</p>}
            <div className="flex gap-2.5">
              <button onClick={() => setStep('auth')}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                Back
              </button>
              <button onClick={handleDelete} disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold transition hover:bg-red-700 cursor-pointer disabled:opacity-40">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: accent }}>
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Account Deleted</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">You will be logged out shortly.</p>
          </div>
        )}
      </div>
    </div>
  );
}