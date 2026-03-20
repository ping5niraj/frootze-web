import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';

let recaptchaInitialized = false;
function resetRecaptcha() {
  try { if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; } } catch (e) {}
  recaptchaInitialized = false;
  const el = document.getElementById('recaptcha-container');
  if (el) el.innerHTML = '';
}
function initRecaptcha() {
  resetRecaptcha();
  try {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible', callback: () => {}, 'expired-callback': () => resetRecaptcha()
    });
    recaptchaInitialized = true;
  } catch (e) {}
}

export default function Landing() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும் / Enter valid 10-digit number'); return; }
    setLoading(true);
    window.confirmationResult = null;
    try {
      initRecaptcha();
      await new Promise(r => setTimeout(r, 500));
      const res = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier);
      window.confirmationResult = res;
      localStorage.setItem('pmf_pending_phone', phone);
      navigate('/verify');
    } catch (err) {
      resetRecaptcha();
      if (err.code === 'auth/invalid-phone-number') setError('தவறான எண் / Invalid number');
      else if (err.code === 'auth/too-many-requests') setError('அதிக முயற்சி / Too many attempts');
      else setError('OTP அனுப்ப தோல்வி / Failed to send OTP');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        .pg {
          position: fixed;
          top: 0; left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #0f0c29 0%, #1e1b4b 50%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow: hidden;
          z-index: 0;
        }
        .orb1 { position: absolute; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%); top: -250px; right: -200px; pointer-events: none; }
        .orb2 { position: absolute; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 65%); bottom: -200px; left: -150px; pointer-events: none; }
        .inner {
          width: 100%;
          max-width: 1100px;
          display: flex;
          align-items: center;
          gap: 80px;
          padding: 0 80px;
          position: relative;
          z-index: 1;
        }
        .lft { flex: 1; min-width: 0; }
        .rgt { width: 420px; flex-shrink: 0; }
        .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
        .logo-sq {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; box-shadow: 0 8px 24px rgba(99,102,241,0.4);
        }
        .logo-nm { font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.5px; }
        .badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);
          border-radius: 999px; padding: 6px 16px; margin-bottom: 18px;
        }
        .bdot { width: 6px; height: 6px; border-radius: 50%; background: #818cf8; animation: blink 2s infinite; }
        .btxt { font-size: 11px; font-weight: 600; color: #a5b4fc; letter-spacing: 1px; text-transform: uppercase; }
        .h1 { font-size: 44px; font-weight: 800; color: white; line-height: 1.2; letter-spacing: -1px; margin-bottom: 14px; }
        .grad { background: linear-gradient(90deg, #818cf8, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .sub-ta { font-size: 16px; color: rgba(255,255,255,0.55); font-family: 'Noto Sans Tamil', sans-serif; margin-bottom: 4px; line-height: 1.6; }
        .sub-en { font-size: 13px; color: rgba(255,255,255,0.25); margin-bottom: 32px; line-height: 1.6; }
        .feats { display: flex; flex-direction: column; gap: 8px; }
        .feat {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
        }
        .ficon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .flbl-bold { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 700; }
        .flbl-muted { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 400; margin-left: 4px; }
        .card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 28px; padding: 44px 40px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .ctitle { font-size: 24px; font-weight: 700; color: white; margin-bottom: 4px; }
        .csub { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 28px; }
        .irow { display: flex; gap: 10px; margin-bottom: 14px; }
        .cc {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 0 16px; color: rgba(255,255,255,0.8);
          font-size: 14px; font-weight: 600; white-space: nowrap;
          display: flex; align-items: center; flex-shrink: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .inp {
          flex: 1; min-width: 0;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px; padding: 15px 18px;
          color: white; font-size: 18px; letter-spacing: 3px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .inp::placeholder { color: rgba(255,255,255,0.2); letter-spacing: 0; font-size: 14px; }
        .inp:focus { border-color: rgba(129,140,248,0.6); background: rgba(99,102,241,0.08); box-shadow: 0 0 0 4px rgba(99,102,241,0.12); }
        .err { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; padding: 11px 16px; color: #fca5a5; font-size: 13px; margin-bottom: 14px; }
        .btn {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white; border: none; border-radius: 14px;
          font-size: 15px; font-weight: 700;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer; transition: all 0.25s ease;
          box-shadow: 0 8px 24px rgba(99,102,241,0.4);
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(99,102,241,0.55); }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { background: rgba(255,255,255,0.08); box-shadow: none; cursor: not-allowed; color: rgba(255,255,255,0.25); }
        .trust { display: flex; justify-content: center; gap: 20px; margin-top: 16px; }
        .titem { font-size: 12px; color: rgba(255,255,255,0.3); }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        @media (max-width: 860px) {
          .inner { flex-direction: column; gap: 36px; padding: 40px 24px; overflow-y: auto; }
          .rgt { width: 100%; }
          .pg { overflow-y: auto; }
          .h1 { font-size: 32px; }
        }
      `}</style>

      <div className="pg">
        <div className="orb1"/><div className="orb2"/>
        <div className="inner">
          <div className="lft">
            <div className="logo">
              <div className="logo-sq">🌳</div>
              <span className="logo-nm">frootze</span>
            </div>
            <div className="badge">
              <div className="bdot"/>
              <span className="btxt">Tamil Family Network</span>
            </div>
            <h1 className="h1">
              உங்கள் குடும்ப மரத்தை<br/>
              <span className="grad">உருவாக்குங்கள்</span>
            </h1>
            <p className="sub-ta">உங்கள் குடும்பம். உங்கள் வேர்கள்.</p>
            <p className="sub-en">Your Family. Your Roots. Connect generations.</p>
            <div className="feats">
              {[
                {icon:'🌳',bg:'rgba(99,102,241,0.2)',ta:'குடும்ப மரம்',en:'Family Tree'},
                {icon:'📍',bg:'rgba(52,211,153,0.2)',ta:'இட பகிர்வு',en:'Location Sharing'},
                {icon:'🎂',bg:'rgba(251,191,36,0.2)',ta:'பிறந்தநாள்',en:'Birthday Calendar'},
                {icon:'🧠',bg:'rgba(167,139,250,0.2)',ta:'வினாடி வினா',en:'Daily Quiz'},
              ].map((f,i) => (
                <div key={i} className="feat">
                  <div className="ficon" style={{background:f.bg}}>{f.icon}</div>
                  <span className="flbl-bold">{f.ta}</span>
                  <span className="flbl-muted">· {f.en}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rgt">
            <div className="card">
              <p className="ctitle">உள்நுழைக 👋</p>
              <p className="csub">Sign in to continue to frootze</p>
              <div className="irow">
                <div className="cc">🇮🇳 +91</div>
                <input type="tel" maxLength={10} placeholder="Phone number"
                  value={phone} className="inp"
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}/>
              </div>
              {error && <div className="err">{error}</div>}
              <div id="recaptcha-container"/>
              <button className="btn" onClick={handleSendOTP} disabled={loading || phone.length < 10}>
                {loading ? (
                  <><svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>OTP அனுப்புகிறோம்...</>
                ) : '📱 OTP அனுப்பு →'}
              </button>
              <div className="trust">
                {['🔐 Secure','⚡ Instant','🆓 Free'].map((t,i) => (
                  <span key={i} className="titem">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
