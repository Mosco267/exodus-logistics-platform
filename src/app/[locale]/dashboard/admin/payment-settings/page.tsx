// src/app/[locale]/dashboard/admin/payment-settings/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Save, Upload, CheckCircle2, MessageSquare } from 'lucide-react';

type CryptoWallet = { enabled: boolean; address: string; qrImageUrl: string; network?: string };
type PaymentSettings = {
  crypto: { bitcoin: CryptoWallet; ethereum: CryptoWallet; usdt: CryptoWallet };
  zelle: { enabled: boolean; phone: string; email: string; holderName: string };
  bankTransfer: { enabled: boolean; bankName: string; accountName: string; accountNumber: string; routingNumber: string; swiftCode: string; iban: string; instructions: string };
  paypal: { enabled: boolean; email: string; link: string; useLink: boolean };
  cashApp: { enabled: boolean; cashtag: string; qrImageUrl: string };
  others: { enabled: boolean; instructions: string };
};

const DEFAULT: PaymentSettings = {
  crypto: {
    bitcoin: { enabled: false, address: '', qrImageUrl: '', network: 'Bitcoin (BTC)' },
    ethereum: { enabled: false, address: '', qrImageUrl: '', network: 'Ethereum (ERC-20)' },
    usdt: { enabled: false, address: '', qrImageUrl: '', network: 'USDT (TRC-20 / ERC-20)' },
  },
  zelle: { enabled: false, phone: '', email: '', holderName: '' },
  bankTransfer: { enabled: false, bankName: '', accountName: '', accountNumber: '', routingNumber: '', swiftCode: '', iban: '', instructions: '' },
  paypal: { enabled: false, email: '', link: '', useLink: false },
  cashApp: { enabled: false, cashtag: '', qrImageUrl: '' },
  others: { enabled: true, instructions: '' },
};

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-white/20'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function QRUpload({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
      <div className="flex items-center gap-3">
        {value && <img src={value} alt="QR" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-white/10" />}
        <button type="button" onClick={() => ref.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading...' : value ? 'Change QR' : 'Upload QR'}
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

function Card({ title, emoji, enabled, onToggle, children }: {
  title: string; emoji: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{emoji}</span>
          <span className="font-bold text-gray-900 dark:text-white text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{enabled ? 'Enabled' : 'Disabled'}</span>
          <Toggle checked={enabled} onChange={onToggle} />
        </div>
      </div>
      {enabled && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Messages Tab ─────────────────────────────────────────────
type PaymentMessage = {
  _id: string;
  shipmentId: string;
  userId: string;
  userEmail: string;
  userName: string;
  paymentMethod: string;
  message: string;
  status: 'pending' | 'details_sent' | 'receipt_uploaded' | 'confirmed';
  adminDetails?: string;
  receiptUrl?: string;
  createdAt: string;
};

function MessagesTab() {
  const [messages, setMessages] = useState<PaymentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [detailsInput, setDetailsInput] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-messages', { cache: 'no-store' });
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sendDetails = async (id: string, shipmentId: string, userEmail: string) => {
    const details = detailsInput[id];
    if (!details?.trim()) return;
    setConfirming(id);
    try {
      await fetch('/api/admin/payment-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'send_details', adminDetails: details, shipmentId, userEmail }),
      });
      await load();
    } catch {}
    finally { setConfirming(null); }
  };

  const confirmPayment = async (id: string, shipmentId: string, paymentMethod: string) => {
    setConfirming(id);
    try {
      await fetch('/api/admin/payment-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'confirm_payment', shipmentId, paymentMethod }),
      });
      await load();
    } catch {}
    finally { setConfirming(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    </div>
  );

  if (messages.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-3">
        <MessageSquare className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No payment messages yet</p>
    </div>
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    details_sent: 'bg-blue-100 text-blue-700',
    receipt_uploaded: 'bg-purple-100 text-purple-700',
    confirmed: 'bg-green-100 text-green-700',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    details_sent: 'Details Sent',
    receipt_uploaded: 'Receipt Uploaded',
    confirmed: 'Confirmed',
  };

  return (
    <div className="space-y-4">
      {messages.map(msg => (
        <div key={msg._id} className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{msg.userName} <span className="font-normal text-gray-400">({msg.userEmail})</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Shipment: <span className="font-semibold">{msg.shipmentId}</span> · Method: <span className="font-semibold">{msg.paymentMethod}</span></p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${statusColors[msg.status] || 'bg-gray-100 text-gray-600'}`}>
              {statusLabels[msg.status] || msg.status}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-400 mb-1">User message</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</p>
            </div>

            {msg.receiptUrl && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1.5">Receipt uploaded</p>
                <a href={msg.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <img src={msg.receiptUrl} alt="Receipt" className="w-32 h-32 object-cover rounded-xl border border-gray-200 dark:border-white/10 hover:opacity-80 transition" />
                </a>
              </div>
            )}

            {msg.status === 'pending' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Send payment details to user</p>
                <textarea
                  value={detailsInput[msg._id] || ''}
                  onChange={e => setDetailsInput(p => ({ ...p, [msg._id]: e.target.value }))}
                  placeholder="e.g. Send to Western Union MTCN: 123456789, Name: John Doe..."
                  rows={3}
                  className={inputCls + ' resize-none'} />
                <button
                  onClick={() => sendDetails(msg._id, msg.shipmentId, msg.userEmail)}
                  disabled={confirming === msg._id || !detailsInput[msg._id]?.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer hover:bg-blue-700 transition disabled:opacity-60">
                  {confirming === msg._id ? <Loader2 size={14} className="animate-spin" /> : null}
                  Send Details
                </button>
              </div>
            )}

            {msg.status === 'receipt_uploaded' && (
              <button
                onClick={() => confirmPayment(msg._id, msg.shipmentId, msg.paymentMethod)}
                disabled={confirming === msg._id}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold cursor-pointer hover:bg-green-700 transition disabled:opacity-60">
                {confirming === msg._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Confirm Payment
              </button>
            )}

            {msg.adminDetails && (
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Details sent to user</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">{msg.adminDetails}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function AdminPaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'messages'>('settings');

  const load = async () => {
    const res = await fetch('/api/admin/payment-settings', { cache: 'no-store' });
    const json = await res.json();
    setSettings({ ...DEFAULT, ...json.settings, crypto: { ...DEFAULT.crypto, ...json.settings?.crypto } });
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/payment-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    if (!res.ok) { alert('Failed to save'); return; }
    setMsg('Saved ✅');
    setTimeout(() => setMsg(''), 2000);
  };

  const set = (path: string[], value: any) => {
    setSettings(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  };

  if (!settings) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Payment Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure payment methods shown to users</p>
        </div>
        {activeTab === 'settings' && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60 cursor-pointer">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      {msg && <p className="text-sm font-semibold text-green-600 dark:text-green-400">{msg}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-xl p-1">
        {(['settings', 'messages'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition cursor-pointer capitalize ${activeTab === tab ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {tab === 'messages' ? '💬 Messages' : '⚙️ Settings'}
          </button>
        ))}
      </div>

      {activeTab === 'messages' ? <MessagesTab /> : (
        <div className="space-y-4">

          {/* Bitcoin */}
          <Card title="Bitcoin (BTC)" emoji="₿" enabled={settings.crypto.bitcoin.enabled}
            onToggle={v => set(['crypto', 'bitcoin', 'enabled'], v)}>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Wallet Address</label>
              <input value={settings.crypto.bitcoin.address}
                onChange={e => set(['crypto', 'bitcoin', 'address'], e.target.value)}
                placeholder="bc1q..." className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Network</label>
              <input value={settings.crypto.bitcoin.network || ''}
                onChange={e => set(['crypto', 'bitcoin', 'network'], e.target.value)}
                placeholder="Bitcoin (BTC)" className={inputCls} />
            </div>
            <QRUpload value={settings.crypto.bitcoin.qrImageUrl}
              onChange={v => set(['crypto', 'bitcoin', 'qrImageUrl'], v)} label="QR Code Image" />
          </Card>

          {/* Ethereum */}
          <Card title="Ethereum (ETH)" emoji="Ξ" enabled={settings.crypto.ethereum.enabled}
            onToggle={v => set(['crypto', 'ethereum', 'enabled'], v)}>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Wallet Address</label>
              <input value={settings.crypto.ethereum.address}
                onChange={e => set(['crypto', 'ethereum', 'address'], e.target.value)}
                placeholder="0x..." className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Network</label>
              <input value={settings.crypto.ethereum.network || ''}
                onChange={e => set(['crypto', 'ethereum', 'network'], e.target.value)}
                placeholder="Ethereum (ERC-20)" className={inputCls} />
            </div>
            <QRUpload value={settings.crypto.ethereum.qrImageUrl}
              onChange={v => set(['crypto', 'ethereum', 'qrImageUrl'], v)} label="QR Code Image" />
          </Card>

          {/* USDT */}
          <Card title="USDT (Tether)" emoji="₮" enabled={settings.crypto.usdt.enabled}
            onToggle={v => set(['crypto', 'usdt', 'enabled'], v)}>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Wallet Address</label>
              <input value={settings.crypto.usdt.address}
                onChange={e => set(['crypto', 'usdt', 'address'], e.target.value)}
                placeholder="T... or 0x..." className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Network</label>
              <input value={settings.crypto.usdt.network || ''}
                onChange={e => set(['crypto', 'usdt', 'network'], e.target.value)}
                placeholder="TRC-20 / ERC-20" className={inputCls} />
            </div>
            <QRUpload value={settings.crypto.usdt.qrImageUrl}
              onChange={v => set(['crypto', 'usdt', 'qrImageUrl'], v)} label="QR Code Image" />
          </Card>

          {/* Zelle */}
          <Card title="Zelle" emoji="💚" enabled={settings.zelle.enabled}
            onToggle={v => set(['zelle', 'enabled'], v)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Holder Name</label>
                <input value={settings.zelle.holderName} onChange={e => set(['zelle', 'holderName'], e.target.value)}
                  placeholder="John Doe" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Phone Number</label>
                <input value={settings.zelle.phone} onChange={e => set(['zelle', 'phone'], e.target.value)}
                  placeholder="+1 (555) 000-0000" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Email (optional)</label>
                <input value={settings.zelle.email} onChange={e => set(['zelle', 'email'], e.target.value)}
                  placeholder="zelle@email.com" className={inputCls} />
              </div>
            </div>
          </Card>

          {/* Bank Transfer */}
          <Card title="Bank Transfer" emoji="🏦" enabled={settings.bankTransfer.enabled}
            onToggle={v => set(['bankTransfer', 'enabled'], v)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['bankName', 'Bank Name', 'Chase Bank'],
                ['accountName', 'Account Name', 'John Doe'],
                ['accountNumber', 'Account Number', '000123456789'],
                ['routingNumber', 'Routing Number', '021000021'],
                ['swiftCode', 'SWIFT / BIC Code', 'CHASUS33'],
                ['iban', 'IBAN (optional)', 'US12 3456 7890'],
              ].map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">{label}</label>
                  <input value={(settings.bankTransfer as any)[key]}
                    onChange={e => set(['bankTransfer', key], e.target.value)}
                    placeholder={placeholder} className={inputCls} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Additional Instructions (optional)</label>
                <textarea value={settings.bankTransfer.instructions}
                  onChange={e => set(['bankTransfer', 'instructions'], e.target.value)}
                  rows={2} placeholder="e.g. Use shipment ID as reference..."
                  className={inputCls + ' resize-none'} />
              </div>
            </div>
          </Card>

          {/* PayPal */}
          <Card title="PayPal" emoji="🅿️" enabled={settings.paypal.enabled}
            onToggle={v => set(['paypal', 'enabled'], v)}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">Use PayPal.me link instead of email</span>
                <Toggle checked={settings.paypal.useLink} onChange={v => set(['paypal', 'useLink'], v)} />
              </div>
              {settings.paypal.useLink ? (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">PayPal.me Link</label>
                  <input value={settings.paypal.link} onChange={e => set(['paypal', 'link'], e.target.value)}
                    placeholder="https://paypal.me/yourname" className={inputCls} />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">PayPal Email</label>
                  <input value={settings.paypal.email} onChange={e => set(['paypal', 'email'], e.target.value)}
                    placeholder="paypal@email.com" className={inputCls} />
                </div>
              )}
            </div>
          </Card>

          {/* Cash App */}
          <Card title="Cash App" emoji="💵" enabled={settings.cashApp.enabled}
            onToggle={v => set(['cashApp', 'enabled'], v)}>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">$Cashtag</label>
              <input value={settings.cashApp.cashtag} onChange={e => set(['cashApp', 'cashtag'], e.target.value)}
                placeholder="$YourCashtag" className={inputCls} />
            </div>
            <QRUpload value={settings.cashApp.qrImageUrl}
              onChange={v => set(['cashApp', 'qrImageUrl'], v)} label="Cash App QR Code" />
          </Card>

          {/* Others */}
          <Card title="Other Payment Methods" emoji="💬" enabled={settings.others.enabled}
            onToggle={v => set(['others', 'enabled'], v)}>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Instructions shown to user</label>
              <textarea value={settings.others.instructions}
                onChange={e => set(['others', 'instructions'], e.target.value)}
                rows={3} placeholder="e.g. Contact us with your preferred method and we will provide payment details..."
                className={inputCls + ' resize-none'} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}