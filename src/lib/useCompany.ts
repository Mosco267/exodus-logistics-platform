// src/lib/useCompany.ts
'use client';

import { useEffect, useState } from 'react';

/* One shared fetch of company settings for the whole app.
   Change the address in admin and every page that renders it updates,
   with no code edit anywhere. */

export type Company = {
  name: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber: string;
  country: string;
  timezone: string;
};

const EMPTY: Company = {
  name: '', address: '', phone: '', email: '',
  registrationNumber: '', country: '', timezone: '',
};

/* Module-level cache so a page rendering the email in three places
   makes one request, not three. */
let cache: Company | null = null;
let inflight: Promise<Company> | null = null;
const listeners = new Set<(c: Company) => void>();

async function fetchCompany(): Promise<Company> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = fetch('/api/company', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => {
      const c: Company = { ...EMPTY, ...(j?.company || {}) };
      cache = c;
      listeners.forEach(fn => fn(c));
      return c;
    })
    .catch(() => EMPTY)
    .finally(() => { inflight = null; });

  return inflight;
}

export function useCompany(): Company {
  const [company, setCompany] = useState<Company>(cache || EMPTY);

  useEffect(() => {
    let alive = true;
    const onUpdate = (c: Company) => { if (alive) setCompany(c); };
    listeners.add(onUpdate);
    void fetchCompany().then(onUpdate);
    return () => { alive = false; listeners.delete(onUpdate); };
  }, []);

  return company;
}

/** Clears the cache. Call after saving in admin so open tabs refresh. */
export function invalidateCompany() {
  cache = null;
}

/** Strips a phone number down to something tel: accepts. */
export function telHref(phone: string): string {
  return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
}

/** Splits a single-line address into display lines on commas. */
export function addressLines(address: string): string[] {
  return String(address || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}