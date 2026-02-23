"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

type Suggestion = {
  shipmentId: string;
  trackingNumber: string;
  sender?: string;
  destination?: string;
  status?: string;
  date?: string;
};

export default function SearchBar({
  placeholder = "Search Shipment ID / Tracking Number...",
  locale = "en",
}: {
  placeholder?: string;
  locale?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // ✅ Always show uppercase in the input
  const displayValue = useMemo(() => value.toUpperCase(), [value]);

  // Close dropdown if clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Fetch suggestions (debounced)
  useEffect(() => {
    const q = displayValue.trim();
    if (!q) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search/shipments?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [displayValue]);

  const goToResult = (s: Suggestion) => {
    // ✅ Choose where search should go.
    // Example: a Track page with query params
    router.push(`/${locale}/dashboard/track?shipmentId=${encodeURIComponent(s.shipmentId)}&tracking=${encodeURIComponent(s.trackingNumber)}`);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      // If user highlighted an item, select it
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        goToResult(items[activeIndex]);
        return;
      }

      // Otherwise, just go to Track with the typed query
      const q = displayValue.trim();
      if (q) router.push(`/${locale}/dashboard/track?q=${encodeURIComponent(q)}`);
      setOpen(false);
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="flex items-center bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-xl shadow-inner border border-transparent dark:border-gray-800">
        <Search className="w-4 h-4 text-gray-500 dark:text-gray-300 mr-2" />
        <input
          value={displayValue}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => displayValue.trim() && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="bg-transparent outline-none w-full text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 uppercase"
        />
        {loading && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Searching…</span>
        )}
      </div>

      {open && (items.length > 0 || loading) && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl overflow-hidden">
          {items.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No matches found
            </div>
          ) : (
            <ul className="max-h-80 overflow-auto">
              {items.map((s, idx) => {
                const active = idx === activeIndex;
                return (
                  <li key={`${s.shipmentId}-${s.trackingNumber}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => goToResult(s)}
                      className={[
                        "w-full text-left px-4 py-3 transition flex items-start justify-between gap-3",
                        active
                          ? "bg-blue-50 dark:bg-white/10"
                          : "hover:bg-gray-50 dark:hover:bg-white/5",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {s.shipmentId} <span className="text-gray-400">•</span> {s.trackingNumber}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {s.sender ?? "—"} → {s.destination ?? "—"} {s.status ? `• ${s.status}` : ""}
                        </div>
                      </div>

                      {s.date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {s.date}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}