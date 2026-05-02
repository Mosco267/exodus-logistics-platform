// src/components/ViewportFix.tsx
'use client';

import { useEffect } from 'react';

export default function ViewportFix() {
  useEffect(() => {
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVh();
  document.body.style.position = 'relative'; // ← first snippet

  const handleFocusOut = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      setTimeout(() => {
        setVh();
        window.scrollTo({ top: window.scrollY, behavior: 'instant' as ScrollBehavior });
        document.body.style.height = '';
        document.documentElement.style.height = '';
        document.body.style.position = 'relative'; // ← second snippet line 1
        document.body.style.top = '';              // ← second snippet line 2
      }, 150);
    }
  };
  // ... rest unchanged

    // Also reset on resize (catches keyboard open/close)
    const handleResize = () => {
      setTimeout(setVh, 100);
    };

    // Reset when visual viewport changes (most reliable on iOS)
    const vv = (window as any).visualViewport;
    const handleVisualViewport = () => {
      if (vv) {
        const keyboardOpen = vv.height < window.innerHeight * 0.75;
        if (!keyboardOpen) {
          // Keyboard closed — restore everything
          setTimeout(() => {
            document.body.style.height = '';
            document.body.style.minHeight = '';
            document.documentElement.style.height = '';
            window.scrollTo({ top: window.scrollY });
          }, 100);
        }
      }
    };

    document.addEventListener('focusout', handleFocusOut, true);
    window.addEventListener('resize', handleResize);
    vv?.addEventListener('resize', handleVisualViewport);

    return () => {
      document.removeEventListener('focusout', handleFocusOut, true);
      window.removeEventListener('resize', handleResize);
      vv?.removeEventListener('resize', handleVisualViewport);
    };
  }, []);

  return null;
}