'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock, Bell, Trash2, ChevronRight, Eye, EyeOff,
  Loader2, AlertTriangle, ShieldCheck, CheckCircle2, XCircle,
} from 'lucide-react';
import SuccessModal from '@/components/SuccessModal';

type Section = 'security' | 'notifications' | 'danger';
type NotifSettings = {
  shipmentUpdates: boolean;
  invoiceAlerts: boolean;
  deliveryAlerts: boolean;
  promotions: boolean;
};

// Password strength checker
function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
  checks: { label: string; pass: boolean }[];
} {
  const checks = [
    { label: 'At least 8 characters', pass: pw.length >= 8 },
    { label: 'Uppercase letter (A-Z)', pass: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter (a-z)', pass: /[a-z]/.test(pw) },
    { label: 'Number (0-9)', pass: /[0-9]/.test(pw) },
    { label: 'Special character (!@#$...)', pass: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter(c => c.pass).length;
  const label = score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  const color = score <= 1 ? '#ef4444' : score <= 3 ? '#f97316' : score === 4 ? '#3b82f6' : '#10b981';
  return { score, label, color, checks };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');

  useEffect(() => {
  const map: Record<string, { gradient: string; solid: string }> = {
    default:  { gradient: 'linear-gradient(135deg, #0b3aa4, #0e7490)', solid: '#0b3aa4' },
    ocean:    { gradient: 'linear-gradient(135deg, #0e7490, #06b6d4)', solid: '#0891b2' },
    sunset:   { gradient: 'linear-gradient(135deg, #0b3aa4, #f97316)', solid: '#f97316' },
    arctic:   { gradient: 'linear-gradient(135deg, #0284c7, #bae6fd)', solid: '#0284c7' },
    midnight: { gradient: 'linear-gradient(135deg, #0f172a, #0e7490)', solid: '#06b6d4' },
  };

  const apply = () => {
    const cached = localStorage.getItem('exodus_theme_cache');
    if (cached && map[cached]) {
      setAccent(map[cached].gradient);
      setAccentSolid(map[cached].solid);
    }
  };

  apply();

  window.addEventListener('storage', apply);
  const interval = setInterval(apply, 1000);

  return () => {
    window.removeEventListener('storage', apply);
    clearInterval(interval);
  };
}, []);

  const [activeSection, setActiveSection] = useState<Section | null>(null);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPwSuccess, setShowPwSuccess] = useState(false);

  const pwStrength = getPasswordStrength(newPw);
  const allChecksPassed = pwStrength.score === 5;

  // Notifications
  const [notifs, setNotifs] = useState<NotifSettings>({
    shipmentUpdates: true, invoiceAlerts: true, deliveryAlerts: true, promotions: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [showNotifSuccess, setShowNotifSuccess] = useState(false);

  // Delete
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  const isGoogleUser = (session?.user as any)?.provider === 'google';

  const handlePasswordChange = async () => {
    setPwError('');
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required'); return; }
    if (!allChecksPassed) { setPwError('Password does not meet all requirements'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (currentPw === newPw) { setPwError('New password must differ from current'); return; }

    setPwSaving(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Failed to change password'); return; }
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setShowPwSuccess(true);
    } catch {
      setPwError('Something went wrong');
    } finally {
      setPwSaving(false);
    }
  };

  const handleNotifSave = async () => {
    setNotifSaving(true);
    try {
      await fetch('/api/user/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifs),
      });
      setShowNotifSuccess(true);
    } catch {}
    finally { setNotifSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') { setDeleteError('Please type DELETE to confirm'); return; }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || 'Failed to delete account'); return; }
      setShowDeleteSuccess(true);
      setTimeout(async () => {
        await signOut({ callbackUrl: `/${locale}/sign-in` });
      }, 2500);
    } catch {
      setDeleteError('Something went wrong');
    } finally {
      setDeleting(false);
    }
  };

  const sections = [
    { id: 'security' as Section, icon: <Lock size={18} />, title: 'Security', desc: isGoogleUser ? 'Manage your account security' : 'Change your password', iconBg: 'bg-blue-50 dark:bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
    { id: 'notifications' as Section, icon: <Bell size={18} />, title: 'Notifications', desc: 'Control what emails you receive', iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
    { id: 'danger' as Section, icon: <Trash2 size={18} />, title: 'Delete Account', desc: 'Permanently disable your account', iconBg: 'bg-red-50 dark:bg-red-500/10', iconColor: 'text-red-600 dark:text-red-400' },
  ];

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition text-left";

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <div className="mb-2">
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account preferences</p>
      </div>

      {sections.map(section => (
        <div key={section.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer text-left">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.iconBg}`}>
              <span className={section.iconColor}>{section.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{section.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{section.desc}</p>
            </div>
            <ChevronRight size={16} className={`text-gray-400 transition-transform duration-200 shrink-0 ${activeSection === section.id ? 'rotate-90' : ''}`} />
          </button>

          {activeSection === section.id && (
            <div className="border-t border-gray-100 dark:border-white/10 px-5 py-5">

              {/* SECURITY */}
              {section.id === 'security' && (
                <div className="space-y-4">
                  {isGoogleUser ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                      <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">You signed in with Google. Password is managed through your Google account.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Change Password</p>
                        <Link
                          href={`/${locale}/forgot-password`}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          Forgot password?
                        </Link>
                      </div>

                      {/* Current password */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            placeholder="Enter current password"
                            className={inputClass + " pr-10"}
                            style={{ fontSize: '16px' }}
                          />
                          <button type="button" onClick={() => setShowCurrent(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition">
                            {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* New password */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">New Password</label>
                        <div className="relative">
                          <input
                            type={showNew ? 'text' : 'password'}
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            placeholder="Min. 8 characters"
                            className={inputClass + " pr-10"}
                            style={{ fontSize: '16px' }}
                          />
                          <button type="button" onClick={() => setShowNew(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition">
                            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>

                        {/* Strength bar */}
                        {newPw.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Password strength</span>
                              <span className="text-xs font-bold" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                                  style={{ background: i <= pwStrength.score ? pwStrength.color : '#e5e7eb' }} />
                              ))}
                            </div>
                            <div className="space-y-1 mt-2">
                              {pwStrength.checks.map(({ label, pass }) => (
                                <div key={label} className="flex items-center gap-2">
                                  {pass
                                    ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                    : <XCircle size={12} className="text-gray-300 dark:text-gray-600 shrink-0" />}
                                  <span className={`text-xs ${pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)}
                            placeholder="Re-enter new password"
                            className={inputClass + " pr-10"}
                            style={{ fontSize: '16px' }}
                          />
                          <button type="button" onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition">
                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {confirmPw.length > 0 && newPw !== confirmPw && (
                          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                        {confirmPw.length > 0 && newPw === confirmPw && (
                          <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Passwords match
                          </p>
                        )}
                      </div>

                      {pwError && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{pwError}</p>}

                      <button
                        onClick={handlePasswordChange}
                        disabled={pwSaving || !allChecksPassed || newPw !== confirmPw || !currentPw}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: accent }}>
                        {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                        {pwSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* NOTIFICATIONS */}
              {section.id === 'notifications' && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email Notifications</p>
                  {[
                    { key: 'shipmentUpdates' as keyof NotifSettings, label: 'Shipment Updates', desc: 'Get notified when your shipment status changes' },
                    { key: 'invoiceAlerts' as keyof NotifSettings, label: 'Invoice Alerts', desc: 'Receive alerts for new or unpaid invoices' },
                    { key: 'deliveryAlerts' as keyof NotifSettings, label: 'Delivery Alerts', desc: 'Get notified when a shipment is delivered' },
                    { key: 'promotions' as keyof NotifSettings, label: 'Promotions', desc: 'Receive news, tips and promotional offers' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-start justify-between gap-4 py-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                        className="relative rounded-full transition-all duration-200 cursor-pointer shrink-0 mt-0.5"
                        style={{ width: 42, height: 24, background: notifs[key] ? accentSolid : '#d1d5db' }}>
                        <span
                          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                          style={{ left: notifs[key] ? 18 : 2 }} />
                      </button>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-gray-100 dark:border-white/10 mt-2">
                    <button
                      onClick={handleNotifSave}
                      disabled={notifSaving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                      style={{ background: accent }}>
                      {notifSaving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                      {notifSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              )}

              {/* DANGER */}
              {section.id === 'danger' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                    <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">This action cannot be undone</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1 leading-relaxed">
                        Deleting your account will immediately log you out and block all access. Only an administrator can restore it.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Reason for deletion <span className="font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={deleteReason}
                      onChange={e => setDeleteReason(e.target.value)}
                      placeholder="Tell us why you're leaving..."
                      rows={2}
                      className={inputClass + " resize-none"}
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Type <span className="font-bold text-red-600">DELETE</span> to confirm
                    </label>
                    <input
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="DELETE"
                      autoCapitalize="characters"
                      className={inputClass + " font-mono tracking-widest"}
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  {deleteError && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{deleteError}</p>}

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold transition hover:bg-red-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 size={14} />
                    Delete My Account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Final confirmation</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
              Are you absolutely sure? You will be logged out immediately.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-200 font-semibold text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition">
                Cancel
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); handleDeleteAccount(); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm cursor-pointer hover:bg-red-700 transition disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal open={showPwSuccess} title="Password Updated" message="Your password has been changed successfully." onClose={() => setShowPwSuccess(false)} />
      <SuccessModal open={showNotifSuccess} title="Preferences Saved" message="Your notification preferences have been updated." onClose={() => setShowNotifSuccess(false)} />
      <SuccessModal open={showDeleteSuccess} title="Account Deleted" message="Your account has been deleted. You will be logged out shortly." onClose={() => {}} />
    </div>
  );
}