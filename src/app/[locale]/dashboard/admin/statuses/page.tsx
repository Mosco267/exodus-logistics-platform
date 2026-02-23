'use client';

import { useEffect, useMemo, useState } from 'react';

type StatusDoc = {
  key: string;
  label: string;
  color: string;
  defaultUpdate?: string;
  nextStep?: string;
};

const COLOR_OPTIONS = [
  { key: 'blue', label: 'Blue' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'green', label: 'Green' },
  { key: 'orange', label: 'Orange' },
  { key: 'red', label: 'Red' },
  { key: 'purple', label: 'Purple' },
  { key: 'pink', label: 'Pink' },
  { key: 'slate', label: 'Slate' },
  { key: 'amber', label: 'Amber' },
  { key: 'indigo', label: 'Indigo' },
];

const normalizeKey = (v: string) =>
  (v ?? '').toLowerCase().trim().replace(/[\s_-]+/g, '');

export default function AdminStatusesPage() {
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingKey, setEditingKey] = useState<string>('');

  const [label, setLabel] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [color, setColor] = useState('blue');
  const [defaultUpdate, setDefaultUpdate] = useState('');
  const [nextStep, setNextStep] = useState('');

  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/statuses', { cache: 'no-store' });
      const data = await res.json();
      setStatuses(Array.isArray(data?.statuses) ? data.statuses : []);
    } catch {
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const resetForm = () => {
    setMode('create');
    setEditingKey('');
    setLabel('');
    setKeyInput('');
    setColor('blue');
    setDefaultUpdate('');
    setNextStep('');
    setMsg('');
  };

  const startEdit = (s: StatusDoc) => {
    setMode('edit');
    setEditingKey(s.key);
    setLabel(s.label || '');
    setKeyInput(s.key || ''); // show key but we’ll keep it locked when editing
    setColor((s.color || 'blue').toLowerCase());
    setDefaultUpdate(s.defaultUpdate || '');
    setNextStep(s.nextStep || '');
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canSubmit = useMemo(() => {
    if (!label.trim()) return false;
    if (mode === 'create') return true; // key can be blank; server will derive from label
    return Boolean(editingKey); // edit mode: must have a key to update
  }, [label, mode, editingKey]);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setMsg('');

    try {
      const keyToUse = mode === 'edit' ? editingKey : normalizeKey(keyInput || label);

      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: keyToUse,
          label: label.trim(),
          color: color,
          defaultUpdate: defaultUpdate.trim(),
          nextStep: nextStep.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || 'Failed to save status.');
        return;
      }

      setMsg(mode === 'edit' ? 'Status updated successfully.' : 'Status created successfully.');
      await fetchStatuses();

      if (mode === 'create') resetForm();
    } catch {
      setMsg('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStatus = async (s: StatusDoc) => {
    const ok = confirm(`Delete status "${s.label}"?\n\nThis removes it from your Status Manager list.`);
    if (!ok) return;

    setDeletingKey(s.key);
    setMsg('');

    try {
      const res = await fetch(`/api/statuses?key=${encodeURIComponent(s.key)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg(data?.error || 'Failed to delete status.');
        return;
      }

      // If we were editing this status, reset the form
      if (mode === 'edit' && editingKey === s.key) resetForm();

      setMsg('Status deleted successfully.');
      await fetchStatuses();
    } catch {
      setMsg('Network error. Please try again.');
    } finally {
      setDeletingKey('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
              Shipment Status Manager
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Create and edit custom shipment statuses (label, color, default update, and next step).
            </p>
          </div>

          {mode === 'edit' && (
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10
                         bg-white/70 dark:bg-white/5 text-gray-900 dark:text-gray-100 font-semibold
                         hover:bg-gray-50 dark:hover:bg-white/10 transition"
            >
              New Status
            </button>
          )}
        </div>

        {/* Form */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Status Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "Invalid Address"'
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                         bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">This is what users see on the dashboard.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Status Key {mode === 'edit' ? '(locked)' : '(optional)'}
            </label>
            <input
              value={mode === 'edit' ? editingKey : keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder='e.g. "invalidaddress"'
              disabled={mode === 'edit'}
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                         bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                         disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Used internally. If empty, it will be generated from the label.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Badge Color</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                         bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Default Update Text</label>
            <textarea
              value={defaultUpdate}
              onChange={(e) => setDefaultUpdate(e.target.value)}
              placeholder="Shown when a shipment is set to this status (unless that shipment has a custom statusNote)."
              rows={3}
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                         bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Next Step Text</label>
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="Guidance shown to the user as the next action for this status."
              rows={2}
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10
                         bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl
                       bg-blue-600 text-white font-semibold shadow-sm
                       hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Status'}
          </button>

          {mode === 'edit' && (
            <button
              onClick={resetForm}
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl
                         border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5
                         text-gray-900 dark:text-gray-100 font-semibold
                         hover:bg-gray-50 dark:hover:bg-white/10 transition"
            >
              Cancel
            </button>
          )}

          {msg && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{msg}</span>
          )}
        </div>
      </div>

      {/* Existing statuses */}
      <div className="mt-6 rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Existing Statuses</h2>
          <button
            onClick={fetchStatuses}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10
                       bg-white/70 dark:bg-white/5 text-gray-900 dark:text-gray-100 font-semibold
                       hover:bg-gray-50 dark:hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
        ) : statuses.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">No statuses yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {statuses.map((s) => (
              <div
                key={s.key}
                className="text-left rounded-2xl border border-gray-100 dark:border-white/10
                           bg-white dark:bg-white/5 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-gray-900 dark:text-gray-100">{s.label}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      key: <span className="font-semibold">{s.key}</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      color: <span className="font-semibold">{s.color}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      className="text-sm font-semibold text-blue-700 dark:text-cyan-300 hover:underline"
                    >
                      Edit →
                    </button>

                    <button
                      onClick={() => deleteStatus(s)}
                      disabled={deletingKey === s.key}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingKey === s.key ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                {(s.defaultUpdate || s.nextStep) && (
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-2">
                    {s.defaultUpdate && (
                      <p>
                        <span className="font-semibold">Default update:</span> {s.defaultUpdate}
                      </p>
                    )}
                    {s.nextStep && (
                      <p>
                        <span className="font-semibold">Next step:</span> {s.nextStep}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}