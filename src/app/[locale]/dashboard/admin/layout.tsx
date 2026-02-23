import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  // ✅ IMPORTANT:
  // Your main dashboard layout already wraps /dashboard/admin/* with <AdminShell />
  // So this admin layout must NOT render another sidebar/nav.
  return <>{children}</>;
}