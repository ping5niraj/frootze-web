import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOTP, sendOTP } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { T } from '../utils/strings';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const phone = localStorage.getItem('pmf_pending_phone');

  useEffect(() => {
    if (!phone) navigate('/');
  }, [phone, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

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
      setError(err.response?.data?.error || 'தவறான OTP / Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(30);
    setError('');
    try {
      await sendOTP(phone);
    } catch (err) {
      setError('OTP அனுப்ப தோல்வி / Failed to resend OTP');
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
            {T.otpSentTo.ta}:{' '}
            <span className="font-semibold text-gray-700">+91 {phone}</span>
          </p>
        </div>

        <div className="card">
          <input
            type="tel"
            maxLength={6}
            placeholder="• • • • • •"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="input-field text-center text-2xl tracking-widest mb-4"
          />

          {error && (
            <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="btn-primary mb-3"
          >
            {loading ? T.verifying.ta : T.verify.ta}
          </button>

          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-purple-600 text-sm font-medium hover:text-purple-800"
              >
                OTP மீண்டும் அனுப்பு / Resend OTP
              </button>
            ) : (
              <p className="text-gray-400 text-sm">
                மீண்டும் அனுப்ப {resendTimer}s / Resend in {resendTimer}s
              </p>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-gray-400 text-sm mt-4 hover:text-gray-600"
          >
            {T.changeNumber.ta}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          உங்கள் தொலைபேசிக்கு OTP அனுப்பப்பட்டது
        </p>
        <p className="text-center text-xs text-gray-400">
          OTP has been sent to your phone
        </p>
      </div>
    </div>
  );
}
