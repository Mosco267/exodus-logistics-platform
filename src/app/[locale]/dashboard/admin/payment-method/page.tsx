"use client";

import { useEffect, useRef, useState } from "react";
import {
  CreditCard, Bitcoin, Building2, DollarSign, Plus, X, Loader2,
  Upload, RefreshCw, CheckCircle2, XCircle, Save,
} from "lucide-react";
import { DEFAULT_PAYMENT_SETTINGS, PaymentSettings, CryptoNetwork, CustomMethod } from "@/lib/payment-settings";

const NETWORK_OPTIONS: CryptoNetwork[] = ['BTC', 'ETH', 'TRC20', 'ERC20', 'BEP20', 'SOL', 'POLYGON'];

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition";

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button onClick={() => onChange(!enabled)} type="button"
      className="flex items-center gap-2 cursor-pointer group">
      <div className={`relative w-11 h-6 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
      </div>
      {label && <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, hint, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">{label}</label>
      {hint && <p className="text-[11px] text-gray-400 mb-1.5">{hint}</p>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}

function ImageUploadField({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (url: string) => void; hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">{label}</label>
      {hint && <p className="text-[11px] text-gray-400 mb-1.5">{hint}</p>}
      <div className="flex items-center gap-3">
        {value && (
          <img src={value} alt={label} className="w-20 h-20 rounded-xl border border-gray-200 dark:border-white/10 object-cover shrink-0" />
        )}
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition disabled:opacity-60">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading...' : value ? 'Replace' : 'Upload'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')}
            className="text-xs font-bold text-red-600 hover:underline cursor-pointer">
            Remove
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function AdminPaymentMethodsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(""), 3000);
  };

  const load = async () => {
    try {
      const res = await fetch("/api/admin/payment-settings", { cache: "no-store" });
      const json = await res.json();
      if (json.settings) setSettings(json.settings);
      else setSettings(DEFAULT_PAYMENT_SETTINGS);
    } catch {
      setSettings(DEFAULT_PAYMENT_SETTINGS);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        showMsg('Failed to save', 'error');
        return;
      }
      showMsg('Settings saved successfully');
    } finally { setSaving(false); }
  };

  const updateField = <T extends keyof PaymentSettings>(key: T, value: PaymentSettings[T]) => {
    setSettings(s => s ? { ...s, [key]: value } : s);
  };

  const addCustomMethod = () => {
    if (!settings) return;
    const newMethod: CustomMethod = {
      id: `custom_${Date.now()}`,
      enabled: true,
      name: 'New Method',
      emoji: '💳',
      description: '',
      instructions: '',
      fields: [],
      qrImageUrl: '',
      confirmationTime: 'Varies',
    };
    setSettings(s => s ? { ...s, customMethods: [...s.customMethods, newMethod] } : s);
  };

  const updateCustomMethod = (id: string, updates: Partial<CustomMethod>) => {
    if (!settings) return;
    setSettings(s => s ? {
      ...s,
      customMethods: s.customMethods.map(m => m.id === id ? { ...m, ...updates } : m),
    } : s);
  };

  const removeCustomMethod = (id: string) => {
    if (!settings) return;
    if (!confirm('Remove this payment method?')) return;
    setSettings(s => s ? {
      ...s,
      customMethods: s.customMethods.filter(m => m.id !== id),
    } : s);
  };

  if (!settings) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Payment Methods</h1>
          <p className="mt-0.5 text-sm text-gray-500">Configure all payment methods available to your customers.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button onClick={save} disabled={saving}
            className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
          msgType === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {msgType === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {msg}
        </div>
      )}

      {/* Card */}
      <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Credit / Debit Card</h2>
              <p className="text-xs text-gray-500 mt-0.5">Powered by Stripe. Auto-detects Visa, Mastercard, Amex, Discover, Verve, JCB, etc.</p>
            </div>
          </div>
          <Toggle enabled={settings.card.enabled} onChange={v => updateField('card', { ...settings.card, enabled: v })} />
        </div>
        {settings.card.enabled && (
          <Field label="Confirmation Time" value={settings.card.confirmationTime}
            onChange={v => updateField('card', { ...settings.card, confirmationTime: v })}
            placeholder="Instant" />
        )}
      </section>

      {/* Bitcoin */}
      <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0">
              <Bitcoin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Bitcoin (BTC)</h2>
              <p className="text-xs text-gray-500 mt-0.5">User pays directly to your wallet address.</p>
            </div>
          </div>
          <Toggle enabled={settings.bitcoin.enabled} onChange={v => updateField('bitcoin', { ...settings.bitcoin, enabled: v })} />
        </div>
        {settings.bitcoin.enabled && (
          <div className="space-y-4 pt-2">
            <Field label="Wallet Address" value={settings.bitcoin.walletAddress}
              onChange={v => updateField('bitcoin', { ...settings.bitcoin, walletAddress: v })}
              placeholder="bc1q..." />
            <Field label="Confirmation Time" value={settings.bitcoin.confirmationTime}
              onChange={v => updateField('bitcoin', { ...settings.bitcoin, confirmationTime: v })}
              placeholder="10–30 minutes" />
            <ImageUploadField label="QR Code Image" value={settings.bitcoin.qrImageUrl}
              onChange={v => updateField('bitcoin', { ...settings.bitcoin, qrImageUrl: v })}
              hint="Upload a QR code that points to your wallet address. Users will scan this." />
          </div>
        )}
      </section>

      {/* USDT */}
      <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₮</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">USDT (Tether)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Stablecoin. Choose the network carefully.</p>
            </div>
          </div>
          <Toggle enabled={settings.usdt.enabled} onChange={v => updateField('usdt', { ...settings.usdt, enabled: v })} />
        </div>
        {settings.usdt.enabled && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">Network</label>
              <select value={settings.usdt.network}
                onChange={e => updateField('usdt', { ...settings.usdt, network: e.target.value as CryptoNetwork })}
                className={inputCls}>
                {NETWORK_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Field label="Wallet Address" value={settings.usdt.walletAddress}
              onChange={v => updateField('usdt', { ...settings.usdt, walletAddress: v })}
              placeholder="0x..." />
            <Field label="Confirmation Time" value={settings.usdt.confirmationTime}
              onChange={v => updateField('usdt', { ...settings.usdt, confirmationTime: v })}
              placeholder="5–15 minutes" />
            <ImageUploadField label="QR Code Image" value={settings.usdt.qrImageUrl}
              onChange={v => updateField('usdt', { ...settings.usdt, qrImageUrl: v })} />
          </div>
        )}
      </section>

      {/* Ethereum */}
      <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Ξ</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Ethereum (ETH)</h2>
              <p className="text-xs text-gray-500 mt-0.5">User pays directly to your ETH wallet.</p>
            </div>
          </div>
          <Toggle enabled={settings.ethereum.enabled} onChange={v => updateField('ethereum', { ...settings.ethereum, enabled: v })} />
        </div>
        {settings.ethereum.enabled && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">Network</label>
              <select value={settings.ethereum.network}
                onChange={e => updateField('ethereum', { ...settings.ethereum, network: e.target.value as CryptoNetwork })}
                className={inputCls}>
                {NETWORK_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Field label="Wallet Address" value={settings.ethereum.walletAddress}
              onChange={v => updateField('ethereum', { ...settings.ethereum, walletAddress: v })}
              placeholder="0x..." />
            <Field label="Confirmation Time" value={settings.ethereum.confirmationTime}
              onChange={v => updateField('ethereum', { ...settings.ethereum, confirmationTime: v })}
              placeholder="5–15 minutes" />
            <ImageUploadField label="QR Code Image" value={settings.ethereum.qrImageUrl}
              onChange={v => updateField('ethereum', { ...settings.ethereum, qrImageUrl: v })} />
          </div>
        )}
      </section>

      {/* Bank Transfer */}
      <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Bank Transfer</h2>
              <p className="text-xs text-gray-500 mt-0.5">Direct bank deposit or wire transfer.</p>
            </div>
          </div>
          <Toggle enabled={settings.bankTransfer.enabled} onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, enabled: v })} />
        </div>
        {settings.bankTransfer.enabled && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bank Name" value={settings.bankTransfer.bankName}
                onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, bankName: v })} />
              <Field label="Account Holder Name" value={settings.bankTransfer.accountName}
                onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, accountName: v })} />
              <Field label="Account Number" value={settings.bankTransfer.accountNumber}
                onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, accountNumber: v })} />
              <Field label="Routing Number (US)" value={settings.bankTransfer.routingNumber}
                onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, routingNumber: v })}
                hint="Optional — for US banks" />
              <Field label="SWIFT / BIC Code" value={settings.bankTransfer.swiftCode}
                onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, swiftCode: v })}
                hint="For international wires" />
              <Field label="IBAN" value={settings.bankTransfer.iban}
                onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, iban: v })}
                hint="For European banks" />
            </div>
            <Field label="Branch Address" value={settings.bankTransfer.branchAddress}
              onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, branchAddress: v })} />
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">Special Instructions</label>
              <textarea value={settings.bankTransfer.instructions}
                onChange={e => updateField('bankTransfer', { ...settings.bankTransfer, instructions: e.target.value })}
                rows={3} className={`${inputCls} resize-none`}
                placeholder="e.g. Use the shipment number as payment reference." />
            </div>
            <Field label="Confirmation Time" value={settings.bankTransfer.confirmationTime}
              onChange={v => updateField('bankTransfer', { ...settings.bankTransfer, confirmationTime: v })}
              placeholder="Up to 24 hours" />
          </div>
        )}
      </section>

      {/* PayPal */}
      <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">PayPal</h2>
              <p className="text-xs text-gray-500 mt-0.5">Send PayPal email or PayPal.me link.</p>
            </div>
          </div>
          <Toggle enabled={settings.paypal.enabled} onChange={v => updateField('paypal', { ...settings.paypal, enabled: v })} />
        </div>
        {settings.paypal.enabled && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <Toggle enabled={settings.paypal.useLink}
                onChange={v => updateField('paypal', { ...settings.paypal, useLink: v })}
                label="Use PayPal.me Link" />
              <span className="text-xs text-gray-500">
                {settings.paypal.useLink ? 'Direct payment link' : 'Email-based payment'}
              </span>
            </div>
            {settings.paypal.useLink ? (
              <Field label="PayPal.me Link" value={settings.paypal.link}
                onChange={v => updateField('paypal', { ...settings.paypal, link: v })}
                placeholder="https://paypal.me/yourname" />
            ) : (
              <Field label="PayPal Email" value={settings.paypal.email}
                onChange={v => updateField('paypal', { ...settings.paypal, email: v })}
                placeholder="payments@yourdomain.com" type="email" />
            )}
            <Field label="Confirmation Time" value={settings.paypal.confirmationTime}
              onChange={v => updateField('paypal', { ...settings.paypal, confirmationTime: v })}
              placeholder="10–30 minutes" />
          </div>
        )}
      </section>

      {/* Custom methods */}
      <section className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Other Payment Methods</h2>
            <p className="text-xs text-gray-500 mt-0.5">Add custom methods like Zelle, Cash App, Wise, Apple Pay, etc.</p>
          </div>
          <button onClick={addCustomMethod}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition">
            <Plus className="w-3.5 h-3.5" /> Add Method
          </button>
        </div>
        <div className="space-y-4">
          {settings.customMethods.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              No custom methods configured. Click "Add Method" to add one.
            </div>
          )}
          {settings.customMethods.map(method => (
            <div key={method.id} className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-gray-50/50 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input value={method.emoji}
                    onChange={e => updateCustomMethod(method.id, { emoji: e.target.value })}
                    className="w-12 px-2 py-1.5 text-center text-xl rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800" />
                  <input value={method.name}
                    onChange={e => updateCustomMethod(method.id, { name: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800"
                    placeholder="Payment Method Name" />
                </div>
                <Toggle enabled={method.enabled} onChange={v => updateCustomMethod(method.id, { enabled: v })} />
                <button onClick={() => removeCustomMethod(method.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 cursor-pointer transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <Field label="Description" value={method.description}
                  onChange={v => updateCustomMethod(method.id, { description: v })}
                  placeholder="e.g. Pay via Zelle to our business email." />

                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">Payment Details</label>
                  <p className="text-[11px] text-gray-400 mb-2">Add fields users will see (e.g. Email, Phone, Tag).</p>
                  <div className="space-y-2">
                    {method.fields.map((field, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input value={field.label}
                          onChange={e => {
                            const newFields = [...method.fields];
                            newFields[idx] = { ...field, label: e.target.value };
                            updateCustomMethod(method.id, { fields: newFields });
                          }}
                          placeholder="Field name (e.g. Email)"
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800" />
                        <input value={field.value}
                          onChange={e => {
                            const newFields = [...method.fields];
                            newFields[idx] = { ...field, value: e.target.value };
                            updateCustomMethod(method.id, { fields: newFields });
                          }}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800" />
                        <button type="button"
                          onClick={() => updateCustomMethod(method.id, { fields: method.fields.filter((_, i) => i !== idx) })}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 cursor-pointer transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => updateCustomMethod(method.id, { fields: [...method.fields, { label: '', value: '' }] })}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                      + Add Field
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">Special Instructions</label>
                  <textarea value={method.instructions}
                    onChange={e => updateCustomMethod(method.id, { instructions: e.target.value })}
                    rows={2} className={`${inputCls} resize-none`}
                    placeholder="Any extra info users should know" />
                </div>

                <Field label="Confirmation Time" value={method.confirmationTime}
                  onChange={v => updateCustomMethod(method.id, { confirmationTime: v })}
                  placeholder="e.g. 10-30 minutes" />

                <ImageUploadField label="QR Code (optional)" value={method.qrImageUrl || ''}
                  onChange={v => updateCustomMethod(method.id, { qrImageUrl: v })} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save button at bottom */}
      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={saving}
          className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg hover:bg-blue-700 transition disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}