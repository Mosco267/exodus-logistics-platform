'use client';

import { ReactNode, useEffect, useState } from 'react';

export default function ClientGate({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // You can return a full-page skeleton here if you want
  if (!mounted) return null;

  return <>{children}</>;
}