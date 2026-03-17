import { useState, useRef } from 'react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

export default function ProfilePhoto({ user, onPhotoUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size — max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('pmf_token');
      const res = await axios.post(`${BASE_URL}/api/photos/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      onPhotoUpdated(res.data.photo_url);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Photo display */}
      <div
        className="relative cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        {user?.profile_photo ? (
          <img
            src={user.profile_photo}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-purple-200 shadow-md"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-purple-100 border-4 border-purple-200 shadow-md flex items-center justify-center">
            <span className="text-2xl font-bold text-purple-600">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-xs font-medium">
            {uploading ? '...' : '📷'}
          </span>
        </div>
      </div>

      {/* Upload hint */}
      <p className="text-xs text-purple-300 cursor-pointer hover:text-purple-100"
        onClick={() => fileInputRef.current?.click()}>
        {uploading ? 'Uploading...' : 'Tap to change photo'}
      </p>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
