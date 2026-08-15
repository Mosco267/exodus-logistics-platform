'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';

/* Portal-rendered so a transformed ancestor cannot break position:fixed.
   Long-press to pick it up, drag anywhere, release to snap to the
   nearest side. Position persists in localStorage. */

const SHOW_AFTER_PX = 120;
const LONG_PRESS_MS = 400;
const DRAG_CANCEL_PX = 8;       // movement before long-press counts as a scroll
const EDGE_MARGIN = 24;
const BTN = 44;
const STORAGE_KEY = 'exodus_scrolltop_pos';

type Pos = { side: 'left' | 'right'; y: number };

export default function ScrollToTopButton() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState<Pos>({ side: 'left', y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const pressTimer = useRef<number | null>(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const movedFar = useRef(false);
  const didDrag = useRef(false);

  // Mount + restore saved position
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Pos;
        if (saved?.side === 'left' || saved?.side === 'right') setPos(saved);
      } else {
        setPos({ side: 'left', y: window.innerHeight - BTN - EDGE_MARGIN });
      }
    } catch {
      setPos({ side: 'left', y: window.innerHeight - BTN - EDGE_MARGIN });
    }
  }, []);

  // Default y once we know the viewport
  useEffect(() => {
    if (mounted && pos.y === 0) {
      setPos(p => ({ ...p, y: window.innerHeight - BTN - EDGE_MARGIN }));
    }
  }, [mounted]); // eslint-disable-line

  // Scroll visibility
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

  const clearPress = useCallback(() => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    startPt.current = { x: e.clientX, y: e.clientY };
    movedFar.current = false;
    didDrag.current = false;

    pressTimer.current = window.setTimeout(() => {
      if (movedFar.current) return;
      setDragging(true);
      didDrag.current = true;
      setDrag({ x: e.clientX, y: e.clientY });
      try { navigator.vibrate?.(30); } catch {}
    }, LONG_PRESS_MS);

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) {
      const s = startPt.current;
      if (s) {
        const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
        if (dist > DRAG_CANCEL_PX) {
          movedFar.current = true;
          clearPress();
        }
      }
      return;
    }
    e.preventDefault();
    setDrag({ x: e.clientX, y: e.clientY });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    clearPress();
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    if (dragging && drag) {
      // Snap to whichever side is nearer
      const side: 'left' | 'right' =
        drag.x < window.innerWidth / 2 ? 'left' : 'right';
      const y = Math.min(
        Math.max(drag.y - BTN / 2, EDGE_MARGIN),
        window.innerHeight - BTN - EDGE_MARGIN
      );
      const next: Pos = { side, y };
      setPos(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      setDragging(false);
      setDrag(null);
      return;
    }

    setDragging(false);
    setDrag(null);

    // A plain tap scrolls to top; a drag must not
    if (!didDrag.current && !movedFar.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onPointerCancel = () => {
    clearPress();
    setDragging(false);
    setDrag(null);
  };

  if (!mounted) return null;

  const style: React.CSSProperties = dragging && drag
    ? {
        left: drag.x - BTN / 2,
        top: drag.y - BTN / 2,
        right: 'auto',
        bottom: 'auto',
        transition: 'none',
        cursor: 'grabbing',
        scale: '1.15',
      }
    : {
        [pos.side]: EDGE_MARGIN,
        top: pos.y,
        bottom: 'auto',
        [pos.side === 'left' ? 'right' : 'left']: 'auto',
      } as React.CSSProperties;

  return createPortal(
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={e => e.preventDefault()}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed z-[9999] rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center select-none transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        dragging ? 'shadow-2xl ring-4 ring-blue-300/50' : 'hover:bg-blue-700 cursor-pointer'
      } ${
        visible || dragging
          ? 'opacity-100'
          : 'opacity-0 pointer-events-none'
      }`}
      style={{
        width: BTN,
        height: BTN,
        touchAction: 'none',
        WebkitUserSelect: 'none',
        ...style,
      }}
    >
      <ArrowUp className="w-5 h-5 pointer-events-none" />
    </button>,
    document.body
  );
}