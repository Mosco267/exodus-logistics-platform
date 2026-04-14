'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useParams } from 'next/navigation';
import {
  Lock, Bell, Trash2, ChevronRight, Eye, EyeOff,
  Loader2, CheckCircle2, AlertTriangle, ShieldCheck,
} from 'lucide-react';

type Section = 'security' | 'notifications' | 'danger';

type NotifSettings = {
  shipmentUpdates: boolean;
  invoiceAlerts: boolean;
  deliveryAlerts: boolean;
  promotions: boolean;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [activeSection, setActiveSection] = useState<Section | null>(null);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState<NotifSettings>({
    shipmentUpdates: true,
    invoiceAlerts: true,
    deliveryAlerts: true,
    promotions: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Delete account
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isGoogleUser = (session?.user as any)?.provider === 'google';

  const handlePasswordChange = async () => {
    setPwError('');
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (currentPw === newPw) { setPwError('New password must be different from current password'); return; }

    setPwSaving(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Failed to change password'); return; }
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 4000);
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
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
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
      await signOut({ callbackUrl: `/${locale}/sign-in` });
    } catch {
      setDeleteError('Something went wrong');
    } finally {
      setDeleting(false);
    }
  };

  const settingsSections = [
    {
      id: 'security' as Section,
      icon: <Lock size={18} />,
      title: 'Security',
      desc: isGoogleUser ? 'Manage your account security' : 'Change your password and manage security',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'notifications' as Section,
      icon: <Bell size={18} />,
      title: 'Notifications',
      desc: 'Control what emails you receive from us',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'danger' as Section,
      icon: <Trash2 size={18} />,
      title: 'Delete Account',
      desc: 'Permanently disable your account',
      iconBg: 'bg-red-50 dark:bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">

      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Settings list */}
      {settingsSections.map(section => (
        <div key={section.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          {/* Section header */}
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

          {/* Section content */}
          {activeSection === section.id && (
            <div className="border-t border-gray-100 dark:border-white/10 px-5 py-5">

              {/* SECURITY */}
              {section.id === 'security' && (
                <div className="space-y-4">
                  {isGoogleUser ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                      <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        You signed in with Google. Password management is handled through your Google account.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Change Password</p>
                      {[
                        { label: 'Current Password', value: currentPw, set: setCurrentPw, show: showCurrent, toggle: setShowCurrent },
                        { label: 'New Password', value: newPw, set: setNewPw, show: showNew, toggle: setShowNew },
                        { label: 'Confirm New Password', value: confirmPw, set: setConfirmPw, show: showConfirm, toggle: setShowConfirm },
                      ].map(({ label, value, set, show, toggle }) => (
                        <div key={label}>
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">{label}</label>
                          <div className="relative">
                            <input
                              type={show ? 'text' : 'password'}
                              value={value}
                              onChange={e => set(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition"
                              style={{ fontSize: '16px' }}
                            />
                            <button type="button" onClick={() => toggle(!show)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition">
                              {show ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      ))}

                      {pwError && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{pwError}</p>}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={handlePasswordChange}
                          disabled={pwSaving}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
                          {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                          {pwSaving ? 'Updating...' : 'Update Password'}
                        </button>
                        {pwSuccess && (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                            <CheckCircle2 size={14} /> Password updated
                          </div>
                        )}
                      </div>
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
                    <div key={key} className="flex items-start justify-between gap-4 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                        className={`relative w-10 h-5.5 rounded-full transition-all duration-200 cursor-pointer shrink-0 mt-0.5 ${notifs[key] ? 'bg-[#0b3aa4]' : 'bg-gray-200 dark:bg-white/20'}`}
                        style={{ minWidth: 40, height: 22 }}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${notifs[key] ? 'left-5.5' : 'left-0.5'}`}
                          style={{ left: notifs[key] ? 20 : 2 }} />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-white/10 mt-2">
                    <button
                      onClick={handleNotifSave}
                      disabled={notifSaving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
                      {notifSaving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                      {notifSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                    {notifSaved && (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 size={14} /> Saved
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DANGER ZONE */}
              {section.id === 'danger' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                    <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">This action cannot be undone</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1 leading-relaxed">
                        Deleting your account will immediately log you out and block all access. Your data will be retained for admin review. Only an administrator can restore your account.
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
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-red-400 transition resize-none"
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
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-red-400 transition font-mono tracking-widest"
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
              Are you absolutely sure you want to delete your account? You will be logged out immediately.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
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
    </div>
  );
}