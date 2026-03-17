import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { T } from '../utils/strings';

export default function Register() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const tempToken = localStorage.getItem('pmf_temp_token');

  useEffect(() => {
    if (!tempToken) navigate('/');
  }, [tempToken, navigate]);

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError('பெயர் உள்ளிடவும் / Please enter your name'); return; }
    if (!gender) { setError('பாலினம் தேர்வு செய்யவும் / Please select gender'); return; }
    setLoading(true);
    try {
      const res = await registerUser({ name: name.trim(), gender }, tempToken);
      const { token, user } = res.data;
      login(token, user);
      localStorage.removeItem('pmf_temp_token');
      localStorage.removeItem('pmf_pending_phone');
      setTimeout(() => navigate('/dashboard'), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'பதிவு தோல்வி / Registration failed');
      setLoading(false);
    }
  };

  const genders = [
    { value: 'male',   ta: T.male.ta,   en: T.male.en,   emoji: '👨' },
    { value: 'female', ta: T.female.ta, en: T.female.en, emoji: '👩' },
    { value: 'other',  ta: T.other.ta,  en: T.other.en,  emoji: '🧑' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👤</div>
          <h1 className="text-2xl font-bold text-purple-700">{T.createProfile.ta}</h1>
          <p className="text-gray-400 text-sm">{T.createProfile.en}</p>
          <p className="text-gray-500 mt-1 text-sm">{T.tellAboutYou.ta}</p>
        </div>

        <div className="card">
          {/* Name */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {T.yourName.ta} <span className="text-gray-400">/ {T.yourName.en}</span>
          </label>
          <input
            type="text"
            placeholder={T.namePlaceholder.ta}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field mb-4"
          />

          {/* Gender */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {T.gender.ta} <span className="text-gray-400">/ {T.gender.en}</span>
          </label>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {genders.map((g) => (
              <button
                key={g.value}
                onClick={() => setGender(g.value)}
                className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                  gender === g.value
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="text-xl mb-1">{g.emoji}</div>
                <div>{g.ta}</div>
                <div className="text-xs opacity-70">{g.en}</div>
              </button>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading || !name.trim() || !gender}
            className="btn-primary"
          >
            {loading ? T.creating.ta : T.createMyProfile.ta}
          </button>
        </div>
      </div>
    </div>
  );
}
