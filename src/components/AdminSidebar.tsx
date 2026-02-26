// src/components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Users, Package, Tags, Shield, UserX } from "lucide-react"; // ✅ add UserX

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const links = [
    {
      href: `/${locale}/dashboard/admin/users`,
      label: "Users",
      icon: <Users className="w-5 h-5" />,
    },
    // ✅ NEW
    {
      href: `/${locale}/dashboard/admin/deleted-users`,
      label: "Deleted Users",
      icon: <UserX className="w-5 h-5" />,
    },
    {
      href: `/${locale}/dashboard/admin/shipments`,
      label: "Shipments",
      icon: <Package className="w-5 h-5" />,
    },
    {
      href: `/${locale}/dashboard/admin/statuses`,
      label: "Statuses",
      icon: <Tags className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-gradient-to-b from-blue-900 via-blue-800 to-cyan-800 text-white border-r border-white/10">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold leading-tight truncate">Admin Panel</p>
            <p className="text-xs text-white/70 truncate">Manage users, shipments & statuses</p>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl font-semibold transition cursor-pointer
                ${active ? "bg-white text-blue-900 shadow-md" : "hover:bg-white/10 text-white"}`}
            >
              <span className={`${active ? "text-blue-900" : "text-white/90"}`}>{l.icon}</span>
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 text-xs text-white/70">
        Tip: Use the search bar to find shipments by <span className="font-semibold">Shipment ID</span> or{" "}
        <span className="font-semibold">Tracking #</span>.
      </div>
    </aside>
  );
}