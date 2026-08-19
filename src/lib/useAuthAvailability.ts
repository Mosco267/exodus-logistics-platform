// src/lib/useAuthAvailability.ts
'use client';

import { useEffect, useState } from 'react';

export type AuthAvailability = {
  signInDisabled: boolean;
  signUpDisabled: boolean;
  message: string;
  loaded: boolean;
};

const EMPTY: AuthAvailability = {
  signInDisabled: false,
  signUpDisabled: false,
  message: '',
  loaded: false,
};

/* Module-level cache so a page checking this in two places makes one
   request. Short-lived on purpose: an admin flipping the toggle should
   take effect without a hard refresh. */
let cache: AuthAvailability | null = null;
let cachedAt = 0;
const TTL_MS = 30_000;

export function useAuthAvailability(): AuthAvailability {
  const [state, setState] = useState<AuthAvailability>(cache || EMPTY);

  useEffect(() => {
    let alive = true;

    if (cache && Date.now() - cachedAt < TTL_MS) {
      setState(cache);
      return;
    }

    fetch('/api/auth-availability', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!alive) return;
        const next: AuthAvailability = {
          signInDisabled: Boolean(j?.signInDisabled),
          signUpDisabled: Boolean(j?.signUpDisabled),
          message: String(j?.message || ''),
          loaded: true,
        };
        cache = next;
        cachedAt = Date.now();
        setState(next);
      })
      .catch(() => {
        /* Fail open — never block the UI because a check failed. */
        if (alive) setState({ ...EMPTY, loaded: true });
      });

    return () => { alive = false; };
  }, []);

  return state;
}