// src/components/PasswordInput.tsx
'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  autoComplete = 'current-password',
  className = '',
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => {
          alert('onChange fired: ' + e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => alert('focus fired')}
        onInput={e => alert('onInput fired: ' + (e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`w-full px-4 pr-11 rounded-xl border-2 border-red-500 bg-yellow-100 text-sm text-gray-900 ${className}`}
        style={{
          fontSize: '16px',
          minHeight: '48px',
          paddingTop: '12px',
          paddingBottom: '12px',
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer p-1"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}