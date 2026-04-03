"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, Bell, ShieldOff } from "lucide-react";

type Props = {
  locale: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  onBan?: () => void;
};

const tabs = [
  { key: "details", label: "User Details", icon: User, path: "" },
  { key: "shipments", label: "View Shipments", icon: Package, path: "/shipments" },
  { key: "notifications", label: "Create Notification", icon: Bell, path: "/notifications" },
];

export default function UserSubNav({ locale, userId, userName, userEmail, onBan }: Props) {
  const pathname = usePathname();

  const base = `/${locale}/dashboard/admin/users/${encodeURIComponent(userId)}`;

  const activeKey = (() => {
    if (pathname?.endsWith("/shipments")) return "shipments";
    if (pathname?.endsWith("/notifications")) return "notifications";
    return "details";
  })();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-5">
      {/* User identity strip */}
      {(userName || userEmail) && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <p className="text-sm font-extrabold text-gray-900 truncate">{userName || "Unnamed user"}</p>
          <p className="text-xs text-gray-400 truncate">{userEmail || "—"}</p>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex items-center gap-1 px-3 py-2 flex-wrap">
        {tabs.map(({ key, label, icon: Icon, path }) => {
          const href = `${base}${path}`;
          const isActive = activeKey === key;
          return (
            <Link key={key} href={href}
              className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}

        {/* Ban — button not link */}
        {onBan && (
          <button type="button" onClick={onBan}
            className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition ml-auto">
            <ShieldOff className="w-3.5 h-3.5" />
            Ban User
          </button>
        )}
      </div>
    </div>
  );
}