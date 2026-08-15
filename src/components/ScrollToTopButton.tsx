'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';

/* Rendered through a portal into document.body so that a
   transformed ancestor (framer-motion applies transforms)
   cannot break position: fixed. */

const SHOW_AFTER_PX = 120;

export default function ScrollToTopButton() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setVisible(y > SHOW_AFTER_PX);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed bottom-6 left-6 z-[9999] w-11 h-11 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center transition-all duration-300 cursor-pointer hover:bg-blue-700 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>,
    document.body
  );
}