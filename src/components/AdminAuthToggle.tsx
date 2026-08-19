// Drop this into your admin settings page, or keep it as its own component.
"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, AlertCircle, UserPlus, LogIn } from "lucide-react";

function Toggle({ on, onChange, label, hint, disabled }: {
  on: boolean; onChange: (v: boolean) => void;
  label: string; hint: string; disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 dark:border-white/10 p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition cursor-pointer disabled:opacity-50 ${
          on ? "bg-red-600" : "bg-gray-300 dark:bg-white/20"
        }`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

export default function AdminAuthToggle() {
  const [signInDisabled, setSignInDisabled] = useState(false);
  const [signUpDisabled, setSignUpDisabled] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth-availability", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.settings) {
        setSignInDisabled(Boolean(json.settings.signInDisabled));
        setSignUpDisabled(Boolean(json.settings.signUpDisabled));
        setMessage(String(json.settings.message || ""));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true); setOk(""); setErr("");
    try {
      const res = await fetch("/api/admin/auth-availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signInDisabled, signUpDisabled, message }),
      });
      if (!res.ok) { setErr("Failed to save"); return; }
      setOk("Saved");
      window.setTimeout(() => setOk(""), 2500);
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Account access</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-lg">
            Temporarily pause sign-in or registration. Anyone who tries reaches a notice
            page instead, including via a direct link.
          </p>
          {ok && <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-300">{ok}</p>}
          {err && <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">{err}</p>}
        </div>
        <button onClick={save} disabled={saving}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 cursor-pointer">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <Toggle
          on={signUpDisabled}
          onChange={setSignUpDisabled}
          label="Pause new registrations"
          hint="New visitors cannot create an account. Existing customers can still sign in and use their dashboard normally."
        />
        <Toggle
          on={signInDisabled}
          onChange={setSignInDisabled}
          label="Pause sign-in"
          hint="Existing customers cannot sign in. Anyone already signed in stays signed in, and admins are never blocked. Use sparingly — this locks out paying customers."
        />
      </div>

      {signInDisabled && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Sign-in is paused. Existing customers cannot reach their shipments or invoices
            through the dashboard, though public tracking and invoice lookup still work.
          </p>
        </div>
      )}

      <div className="mt-5">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Message shown to visitors <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 300))}
          placeholder="For example: New registrations reopen on Monday 3 March."
          className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm min-h-[80px] resize-none focus:outline-none focus:border-blue-400"
        />
        <p className="mt-1 text-xs text-gray-400">
          {message.length}/300 — shown as written, so it stays in the language you type it in.
        </p>
      </div>
    </div>
  );
}