import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { T } from '../utils/strings';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const { login } = useAuth();
  const phone = localStorage.getItem('pmf_pending_phone');
  const navigatingRef = useRef(false); // prevent redirect loop

  useEffect(() => {
    // Only redirect if not already navigating away
    if (!navigatingRef.current && (!phone || !window.confirmationResult)) {
      window.location.href = '/';
    }
  }, [phone]);

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
    if (!window.confirmationResult) {
      window.location.href = '/';
      return;
    }
    setLoading(true);

    try {
      const result = await window.confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      const res = await axios.post(`${BASE_URL}/api/auth/firebase-verify`, {
        id_token: idToken,
        phone: phone
      });

      const { isNewUser, token, tempToken, user } = res.data;

      // Set flag BEFORE clearing confirmationResult
      navigatingRef.current = true;

      if (isNewUser) {
        localStorage.setItem('pmf_temp_token', tempToken);
        window.confirmationResult = null;
        window.location.href = '/register';
      } else {
        login(token, user);
        localStorage.removeItem('pmf_pending_phone');
        window.confirmationResult = null;
        window.location.href = '/dashboard';
      }

    } catch (err) {
      console.error('Verify error:', err);
      setLoading(false);
      if (err.code === 'auth/invalid-verification-code') {
        setError('தவறான OTP / Invalid OTP. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP காலாவதியானது / OTP expired. Please resend.');
        setCanResend(true);
        setResendTimer(0);
      } else {
        setError(err.response?.data?.error || 'சரிபார்க்க தோல்வி / Verification failed.');
      }
    }
  };

  const handleResend = () => {
    navigatingRef.current = true;
    localStorage.removeItem('pmf_pending_phone');
    window.confirmationResult = null;
    window.location.href = '/';
  };

  const handleChangeNumber = () => {
    navigatingRef.current = true;
    localStorage.removeItem('pmf_pending_phone');
    window.confirmationResult = null;
    window.location.href = '/';
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
          <p className="text-xs text-gray-500 text-center mb-1">
            📱 உங்கள் தொலைபேசிக்கு வந்த SMS OTP-ஐ உள்ளிடவும்
          </p>
          <p className="text-xs text-gray-400 text-center mb-4">
            Enter the OTP received on your phone via SMS
          </p>

          <input
            type="tel"
            maxLength={6}
            placeholder="• • • • • •"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            className="input-field text-center text-2xl tracking-widest mb-4"
            autoFocus
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="btn-primary mb-3"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                சரிபார்க்கிறோம்...
              </span>
            ) : T.verify.ta}
          </button>

          <div className="text-center mb-2">
            {canResend ? (
              <button onClick={handleResend}
                className="text-purple-600 text-sm font-medium hover:text-purple-800">
                OTP மீண்டும் அனுப்பு / Resend OTP
              </button>
            ) : (
              <p className="text-gray-400 text-sm">
                மீண்டும் அனுப்ப {resendTimer}s / Resend in {resendTimer}s
              </p>
            )}
          </div>

          <button onClick={handleChangeNumber}
            className="w-full text-center text-gray-400 text-sm mt-2 hover:text-gray-600">
            {T.changeNumber.ta}
          </button>
        </div>
      </div>
    </div>
  );
}
