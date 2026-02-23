'use client';

export default function ShipmentsPage() {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h1 className="text-xl font-bold text-blue-800 mb-6">
        All Shipments
      </h1>

      <table className="w-full text-sm">
        <thead className="border-b text-blue-600">
          <tr>
            <th className="py-2 text-left">ID</th>
            <th className="text-left">Origin</th>
            <th className="text-left">Destination</th>
            <th className="text-left">Status</th>
            <th className="text-left">Weight</th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b hover:bg-blue-50 transition">
              <td className="py-3">SH00{i + 1}</td>
              <td>London</td>
              <td>New York</td>
              <td>
                <span className="px-3 py-1 rounded-full text-xs bg-cyan-100 text-cyan-600">
                  In Transit
                </span>
              </td>
              <td>45kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}