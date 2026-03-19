import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import { T } from '../utils/strings';

let recaptchaInitialized = false;

function resetRecaptcha() {
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  } catch (e) {}
  recaptchaInitialized = false;
  const container = document.getElementById('recaptcha-container');
  if (container) container.innerHTML = '';
}

function initRecaptcha() {
  resetRecaptcha();
  try {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => { resetRecaptcha(); }
    });
    recaptchaInitialized = true;
  } catch (e) {
    console.log('reCAPTCHA init error:', e.message);
  }
}

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
    window.confirmationResult = null;

    try {
      initRecaptcha();
      await new Promise(r => setTimeout(r, 500));

      const phoneNumber = `+91${phone}`;
      const confirmationResult = await signInWithPhoneNumber(
        auth, phoneNumber, window.recaptchaVerifier
      );

      window.confirmationResult = confirmationResult;
      localStorage.setItem('pmf_pending_phone', phone);
      navigate('/verify');

    } catch (err) {
      console.error('OTP Error:', err.code, err.message);
      resetRecaptcha();

      if (err.code === 'auth/invalid-app-credential') {
        setError('reCAPTCHA தோல்வி. பக்கத்தை புதுப்பித்து மீண்டும் முயற்சிக்கவும் / reCAPTCHA failed. Please refresh and try again.');
      } else if (err.code === 'auth/billing-not-enabled') {
        setError('Firebase billing not enabled.');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('தவறான தொலைபேசி எண் / Invalid phone number');
      } else if (err.code === 'auth/too-many-requests') {
        setError('அதிக முயற்சி! சிறிது நேரம் காத்திருங்கள் / Too many attempts. Please wait.');
      } else {
        setError(`தோல்வி / Failed: ${err.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🌳</div>
          <h1 className="text-4xl font-bold text-purple-700">frootze</h1>
          <p className="text-gray-600 mt-2 text-base font-medium">
            உங்கள் குடும்பம். உங்கள் வேர்கள்.
          </p>
          <p className="text-gray-400 text-sm mt-1">Your Family. Your Roots.</p>
        </div>

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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div id="recaptcha-container"></div>

          <button
            onClick={handleSendOTP}
            disabled={loading || phone.length < 10}
            className="btn-primary"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                OTP அனுப்புகிறோம்...
              </span>
            ) : T.sendOtp.ta}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            📱 உங்கள் தொலைபேசிக்கு OTP SMS வரும்
          </p>
          <p className="text-xs text-gray-400 text-center">
            You'll receive an OTP SMS on your phone
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">{T.freeTagline.ta}</p>
      </div>
    </div>
  );
}
