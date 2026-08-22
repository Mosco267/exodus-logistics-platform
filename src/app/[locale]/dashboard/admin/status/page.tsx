"use client";

import { useParams } from "next/navigation";
import AdminStatusIncident from "@/components/AdminStatusIncident";

export default function AdminStatusPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <AdminStatusIncident locale={locale} />
    </div>
  );
}