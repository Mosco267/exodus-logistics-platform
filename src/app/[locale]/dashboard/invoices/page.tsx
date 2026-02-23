'use client';

export default function InvoicesPage() {
  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InvoiceCard title="Total Paid" amount="$12,400" />
        <InvoiceCard title="Outstanding" amount="$4,230" />
        <InvoiceCard title="Overdue" amount="$780" />
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">
          Invoice History
        </h2>

        <table className="w-full text-sm">
          <thead className="border-b text-blue-600">
            <tr>
              <th className="py-2 text-left">Invoice ID</th>
              <th className="text-left">Amount</th>
              <th className="text-left">Status</th>
              <th className="text-left">Date</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b hover:bg-blue-50">
              <td className="py-3">INV-001</td>
              <td>$1,200</td>
              <td className="text-green-600 font-medium">Paid</td>
              <td>2026-02-15</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

function InvoiceCard({ title, amount }: any) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl p-6 shadow-lg">
      <h3 className="text-sm opacity-80">{title}</h3>
      <p className="text-2xl font-bold mt-2">{amount}</p>
    </div>
  );
}