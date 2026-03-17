import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP } from '../services/api';
import { T } from '../utils/strings';

export default function Landing() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('சரியான 10 இலக்க எண் உள்ளிடவும் / Enter a valid 10-digit number');
      return;
    }
    setLoading(true);
    try {
      await sendOTP(phone);
      localStorage.setItem('pmf_pending_phone', phone);
      navigate('/verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🌳</div>
          <h1 className="text-4xl font-bold text-purple-700">frootze</h1>
          <p className="text-gray-600 mt-2 text-base font-medium">
            உங்கள் குடும்பம். உங்கள் வேர்கள்.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Your Family. Your Roots.
          </p>
        </div>

        {/* Features strip */}
        <div className="flex justify-center gap-6 mb-6 text-xs text-gray-500">
          <span className="flex flex-col items-center gap-1">
            <span className="text-xl">🕸️</span>
            <span>குடும்ப மரம்</span>
            <span className="text-gray-400">Family Tree</span>
          </span>
          <span className="flex flex-col items-center gap-1">
            <span className="text-xl">✅</span>
            <span>உறுதிப்படுத்தல்</span>
            <span className="text-gray-400">Verified</span>
          </span>
          <span className="flex flex-col items-center gap-1">
            <span className="text-xl">📤</span>
            <span>பகிர்வு</span>
            <span className="text-gray-400">Share</span>
          </span>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-1">
            {T.getStarted.ta}
            <span className="text-gray-400 font-normal text-sm ml-2">/ {T.getStarted.en}</span>
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            {T.enterPhone.ta} / {T.enterPhone.en}
          </p>

          <div className="flex gap-2 mb-4">
            <div className="bg-gray-100 border border-gray-300 rounded-xl px-3 py-3 text-gray-600 font-medium text-sm whitespace-nowrap">
              🇮🇳 +91
            </div>
            <input
              type="tel"
              maxLength={10}
              placeholder="9999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
              className="input-field"
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleSendOTP}
            disabled={loading || phone.length < 10}
            className="btn-primary"
          >
            {loading ? T.sending.ta : T.sendOtp.ta}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {T.freeTagline.ta}
        </p>
      </div>
    </div>
  );
}
