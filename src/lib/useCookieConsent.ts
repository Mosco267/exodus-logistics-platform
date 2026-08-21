// src/lib/useCookieConsent.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

export type ConsentValue = 'accepted' | 'rejected' | null;

const COOKIE_NAME = 'exodus_cookie_consent';
const MAX_AGE_DAYS = 180;

/* Consent is re-asked every six months rather than stored forever.
   A choice made once and never revisited stops being informed. */
const MAX_AGE = 60 * 60 * 24 * MAX_AGE_DAYS;

/* Fired when consent changes so components already mounted — the chat
   loader in particular — react without waiting for a page load. */
const EVENT = 'exodus:consent-change';

export function readConsent(): ConsentValue {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const value = decodeURIComponent(match.split('=')[1] || '');
    return value === 'accepted' || value === 'rejected' ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Exclude<ConsentValue, null>) {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE}; path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
  } catch {}
}

/* Clearing the third party's own cookies when consent is withdrawn.
   Without this, rejecting after having accepted would leave the
   previously set cookies in place. */
export function clearThirdPartyCookies() {
  try {
    const isTawkKey = (k: string) => {
      const key = k.toLowerCase();
      return key.startsWith('twk') || key.startsWith('__tawk') || key.includes('tawk');
    };
    Object.keys(localStorage).filter(isTawkKey).forEach(k => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter(isTawkKey).forEach(k => sessionStorage.removeItem(k));
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (isTawkKey(name)) {
        document.cookie = `${name}=; max-age=0; path=/`;
        document.cookie = `${name}=; max-age=0; path=/; domain=.${window.location.hostname}`;
      }
    });
  } catch {}
}

export function useCookieConsent() {
  const [consent, setConsentState] = useState<ConsentValue>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConsentState(readConsent());
    setLoaded(true);

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setConsentState(detail === 'accepted' || detail === 'rejected' ? detail : null);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const accept = useCallback(() => {
    writeConsent('accepted');
    setConsentState('accepted');
  }, []);

  const reject = useCallback(() => {
    /* Remove anything the third party set before withdrawal, then
       reload so its script is no longer running on the page. */
    clearThirdPartyCookies();
    writeConsent('rejected');
    setConsentState('rejected');
    if (document.getElementById('tawk-script')) {
      window.location.reload();
    }
  }, []);

  return { consent, loaded, accept, reject };
}