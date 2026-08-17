// src/lib/notifications-display.ts
import type { IntlShape } from 'react-intl';

/**
 * Renders a stored notification in the reader's language.
 * Falls back to the stored English for records written before keys existed,
 * so history stays readable rather than showing raw key strings.
 */
export function renderNotif(
  intl: IntlShape,
  n: {
    titleKey?: string; messageKey?: string;
    title?: string; message?: string;
    vars?: Record<string, any>;
  }
): { title: string; message: string } {
    /* Any var ending in "Key" holds a translation key rather than a literal.
     Resolve those first so "In Transit" becomes "En transit" inside the
     sentence, not just the sentence around it. Unknown keys fall back to
     the plain value, which covers admin-authored custom statuses. */
  const vars: Record<string, any> = { ...(n.vars || {}) };
  for (const [k, v] of Object.entries(vars)) {
    if (!k.endsWith('Key') || typeof v !== 'string') continue;
    const base = k.slice(0, -3);
    vars[base] = intl.formatMessage(
      { id: v, defaultMessage: vars[base] ?? v },
      {}
    );
  }

  const one = (key?: string, fallback?: string) => {
    if (!key) return fallback || '';
    return intl.formatMessage({ id: key, defaultMessage: fallback || key }, vars);
  };

  return {
    title: one(n.titleKey, n.title),
    message: one(n.messageKey, n.message),
  };
}