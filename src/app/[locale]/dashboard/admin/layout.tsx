// src/app/[locale]/dashboard/admin/layout.tsx
import type { ReactNode } from "react";

type Params = { locale: string };

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params | Promise<Params>;
}) {
  // Next.js can pass params as a Promise in some builds
  const { locale } = await Promise.resolve(params);

  // If you need locale later, you have it here:
  // console.log("admin locale:", locale);

  return <>{children}</>;
}