import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOTP } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { T } from '../utils/strings';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const phone = localStorage.getItem('pmf_pending_phone');

  useEffect(() => {
    if (!phone) navigate('/');
  }, [phone, navigate]);

  const handleVerify = async () => {
    setError('');
    if (!otp || otp.length !== 6) {
      setError('6 இலக்க OTP உள்ளிடவும் / Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOTP(phone, otp);
      const { isNewUser, token, tempToken, user } = res.data;
      if (isNewUser) {
        localStorage.setItem('pmf_temp_token', tempToken);
        navigate('/register');
      } else {
        login(token, user);
        localStorage.removeItem('pmf_pending_phone');
        setTimeout(() => navigate('/dashboard'), 100);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'தவறான OTP / Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-purple-700">{T.verifyOtp.ta}</h1>
          <p className="text-gray-400 text-sm">{T.verifyOtp.en}</p>
          <p className="text-gray-500 mt-2 text-sm">
            {T.otpSentTo.ta}: <span className="font-semibold text-gray-700">+91 {phone}</span>
          </p>
        </div>

        <div className="card">
          <input
            type="tel"
            maxLength={6}
            placeholder={T.enterOtp.ta}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="input-field text-center text-2xl tracking-widest mb-4"
          />

          <p className="text-amber-600 text-xs text-center mb-4 bg-amber-50 rounded-lg py-2">
            🧪 {T.devOtpHint.ta}: <strong>123456</strong>
          </p>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="btn-primary"
          >
            {loading ? T.verifying.ta : T.verify.ta}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-gray-400 text-sm mt-4 hover:text-gray-600"
          >
            {T.changeNumber.ta}
          </button>
        </div>
      </div>
    </div>
  );
}
