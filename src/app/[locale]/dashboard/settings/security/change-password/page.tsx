// src/app/[locale]/dashboard/settings/security/change-password/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const barColor = score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : score === 3 ? 'bg-blue-400' : 'bg-emerald-500';
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const labelColor = ['', 'text-red-500', 'text-amber-600', 'text-blue-600', 'text-emerald-600'][score];
  if (!password) return null;
  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? barColor : 'bg-gray-200'}`} />
        ))}
        {label && <span className={`text-xs font-bold ml-1 ${labelColor}`}>{label}</span>}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`text-[11px] flex items-center gap-1 font-medium ${pass ? 'text-emerald-600' : 'text-gray-400'}`}>
            <CheckCircle2 className="w-3 h-3" />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PwField({ value, onChange, placeholder, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white/40 transition"
        style={{ fontSize: '16px' }}
      />
      <button type="button" tabIndex={-1} onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 transition"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function ChangePasswordPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');
  const [isMidnight, setIsMidnight] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map: Record<string, { g: string; s: string }> = {
      default: { g: 'linear-gradient(135deg, #0b3aa4, #0e7490)', s: '#0b3aa4' },
      ocean: { g: 'linear-gradient(135deg, #0e7490, #06b6d4)', s: '#0891b2' },
      sunset: { g: 'linear-gradient(135deg, #0b3aa4, #f97316)', s: '#f97316' },
      arctic: { g: 'linear-gradient(135deg, #0284c7, #bae6fd)', s: '#0284c7' },
      midnight: { g: 'linear-gradient(135deg, #0f172a, #0e7490)', s: '#06b6d4' },
    };
    const apply = () => {
      const c = localStorage.getItem('exodus_theme_cache');
      if (c && map[c]) { setAccent(map[c].g); setAccentSolid(map[c].s); }
      setIsMidnight(c === 'midnight');
    };
    apply();
    window.addEventListener('storage', apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  useEffect(() => { setReady(true); }, []);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const allChecksPassed = newPw.length >= 8 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && /[^A-Za-z0-9]/.test(newPw);

  const handleSave = async () => {
    setError(''); setSuccess('');
    if (!currentPw || !newPw || !confirmPw) { setError('All fields are required'); return; }
    if (!allChecksPassed) { setError('Password does not meet all requirements'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (currentPw === newPw) { setError('New password must differ from current'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to change password'); return; }
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setSuccess('Password updated successfully');
    } catch { setError('Something went wrong'); }
    finally { setSaving(false); }
  };

  if (!ready) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin"
        style={{ borderTopColor: accentSolid }} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/dashboard/settings/security`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white"
            style={isMidnight ? { color: '#ffffff' } : {}}>Change Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Update your account password</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="w-2 h-5 rounded-full" style={{ background: accent }} />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Password</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Current Password</label>
            <PwField value={currentPw} onChange={setCurrentPw} placeholder="Enter current password" autoComplete="current-password" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">New Password</label>
            <PwField value={newPw} onChange={setNewPw} placeholder="Create a strong password" autoComplete="new-password" />
            <PasswordStrength password={newPw} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Confirm New Password</label>
            <PwField value={confirmPw} onChange={setConfirmPw} placeholder="Re-enter new password" autoComplete="new-password" />
            {confirmPw.length > 0 && newPw !== confirmPw && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            {confirmPw.length > 0 && newPw === confirmPw && (
              <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><CheckCircle2 size={11} />Passwords match</p>
            )}
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
          {success && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5"><CheckCircle2 size={13} />{success}</p>}
          <button onClick={handleSave} disabled={saving || !allChecksPassed || newPw !== confirmPw || !currentPw}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-40"
            style={{ background: accent }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}