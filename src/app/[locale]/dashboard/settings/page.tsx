'use client';

export default function SettingsPage() {
  return (
    <div className="bg-white rounded-2xl shadow-md p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-blue-800 mb-6">
        Account Settings
      </h1>

      <div className="space-y-4">
        <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
          Change Password
        </button>

        <button className="w-full bg-cyan-600 text-white py-3 rounded-lg hover:bg-cyan-700 transition">
          Notification Preferences
        </button>

        <button className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition">
          Delete Account
        </button>
      </div>
    </div>
  );
}