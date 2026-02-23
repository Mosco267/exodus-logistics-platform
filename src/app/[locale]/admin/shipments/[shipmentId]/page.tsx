'use client';

import { useState } from "react";
import { useParams } from "next/navigation";

export default function AdminShipmentStatusPage() {
  const params = useParams();
  const shipmentId = params?.shipmentId as string;

  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);

    await fetch("/api/admin/shipments/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipmentId,
        status,
        statusNote: note,
      }),
    });

    setLoading(false);
    alert("Status updated successfully.");
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold mb-6">
        Update Shipment: {shipmentId}
      </h1>

      <div className="space-y-4">
        <input
          placeholder="New Status (e.g. In Transit)"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl"
        />

        <textarea
          placeholder="Status description shown to user"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-3 border rounded-xl"
        />

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl"
        >
          {loading ? "Updating..." : "Update Status"}
        </button>
      </div>
    </div>
  );
}