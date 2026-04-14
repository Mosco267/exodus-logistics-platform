'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Camera, Save, Loader2, CheckCircle2, User, Mail, Phone, Globe, MapPin, Calendar } from 'lucide-react';

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  avatarUrl: string;
  createdAt: string;
  provider: string;
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({
    name: '', email: '', phone: '', country: '',
    address: '', avatarUrl: '', createdAt: '', provider: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          country: data.country || '',
          address: data.address || '',
          avatarUrl: data.avatarUrl || '',
          createdAt: data.createdAt || '',
          provider: data.provider || 'credentials',
        });
        setAvatarPreview(data.avatarUrl || '');
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }

    setUploading(true);
    setError('');
    const local = URL.createObjectURL(file);
    setAvatarPreview(local);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
        setAvatarPreview(data.url);
        setProfile(p => ({ ...p, avatarUrl: data.url }));
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.name
    ? profile.name.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-24 w-full" style={{ background: 'linear-gradient(135deg, #0b3aa4 0%, #0c52c4 40%, #0e7490 100%)' }} />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4 inline-block">
            <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-900 overflow-hidden bg-gradient-to-br from-[#0b3aa4] to-[#0e7490] flex items-center justify-center shadow-lg">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-extrabold text-xl">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{profile.name || 'Your Name'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>

          <div className="flex items-center gap-4 mt-3">
            {memberSince && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <Calendar size={12} />
                Member since {memberSince}
              </div>
            )}
            {profile.provider === 'google' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Google Account
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Personal Information</h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Email — read only */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={profile.email}
                disabled
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                style={{ fontSize: '16px' }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="Enter your phone number"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Country — read only */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Country</label>
            <div className="relative">
              <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={profile.country}
                disabled
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
                style={{ fontSize: '16px' }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Contact support to change your country</p>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">Home Address <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
              <textarea
                value={profile.address}
                onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                placeholder="Enter your home address"
                rows={3}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition resize-none"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0b3aa4, #0e7490)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
              <CheckCircle2 size={15} />
              Saved successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}