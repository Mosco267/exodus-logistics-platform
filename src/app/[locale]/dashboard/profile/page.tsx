'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [image, setImage] = useState<string | null>(null);

  const handleUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 max-w-2xl">

      <h1 className="text-xl font-bold text-blue-800 mb-6">
        My Profile
      </h1>

      <div className="flex items-center gap-6 mb-6">
        <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200">
          {image && <img src={image} className="h-full w-full object-cover" />}
        </div>

        <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          Upload Photo
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      <div className="space-y-4">
        <input placeholder="Full Name" className="w-full border p-3 rounded-lg" />
        <input placeholder="Email Address" className="w-full border p-3 rounded-lg" />
        <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition">
          Save Changes
        </button>
      </div>

    </div>
  );
}