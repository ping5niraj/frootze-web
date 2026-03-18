import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, updateProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProfilePhoto from '../components/ProfilePhoto';

const TAMIL_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
  'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
  'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
  'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
  'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
  'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
  'Vellore', 'Viluppuram', 'Virudhunagar'
];

export default function EditProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', gender: '', date_of_birth: '',
    email: '', kutham: '', address: '',
    pincode: '', district: '', city: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getMyProfile();
      const u = res.data.user;
      setForm({
        name: u.name || '',
        gender: u.gender || '',
        date_of_birth: u.date_of_birth || '',
        email: u.email || '',
        kutham: u.kutham || '',
        address: u.address || '',
        pincode: u.pincode || '',
        district: u.district || '',
        city: u.city || ''
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(''); setSuccess(false);
    if (!form.name.trim()) { setError('பெயர் உள்ளிடவும் / Name required'); return; }
    setSaving(true);
    try {
      const res = await updateProfile(form);
      const updatedUser = { ...user, ...res.data.user };
      login(localStorage.getItem('pmf_token'), updatedUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpdated = (photoUrl) => {
    const updatedUser = { ...user, profile_photo: photoUrl };
    login(localStorage.getItem('pmf_token'), updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-purple-600">Loading... 🌳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-purple-200 hover:text-white">← Back</button>
          <div>
            <h1 className="text-lg font-bold">சுயவிவரம் திருத்து</h1>
            <p className="text-purple-300 text-xs">Edit Profile</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Photo */}
        <div className="card flex flex-col items-center py-6">
          <ProfilePhoto user={user} onPhotoUpdated={handlePhotoUpdated} />
          <p className="text-gray-500 text-sm mt-3 font-medium">{user?.name}</p>
          <p className="text-gray-400 text-xs">{user?.phone}</p>
        </div>

        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800">
            அடிப்படை தகவல் <span className="text-gray-400 font-normal text-sm">/ Basic Info</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">பெயர் / Name *</label>
            <input type="text" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="input-field" placeholder="உங்கள் பெயர்" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">பாலினம் / Gender *</label>
            <div className="grid grid-cols-3 gap-2">
              {[['male','👨','ஆண்'],['female','👩','பெண்'],['other','🧑','மற்றவை']].map(([val, emoji, ta]) => (
                <button key={val} onClick={() => setForm({...form, gender: val})}
                  className={`py-2 rounded-xl border text-sm transition-all ${
                    form.gender === val ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300'
                  }`}>
                  {emoji} {ta}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">பிறந்த தேதி / Date of Birth</label>
            <input type="date" value={form.date_of_birth}
              onChange={e => setForm({...form, date_of_birth: e.target.value})}
              className="input-field" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">மின்னஞ்சல் / Email</label>
            <input type="email" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="input-field" placeholder="email@example.com" />
          </div>
        </div>

        {/* Family Info */}
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800">
            குடும்ப தகவல் <span className="text-gray-400 font-normal text-sm">/ Family Info</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              குலம் / கோத்திரம் / Kutham *
            </label>
            <input type="text" value={form.kutham}
              onChange={e => setForm({...form, kutham: e.target.value})}
              className="input-field" placeholder="e.g. Pillai, Mudaliar, Nadar..." />
            <p className="text-xs text-gray-400 mt-1">இது குடும்ப அகராதியில் காட்டப்படும் / Shown in family directory</p>
          </div>
        </div>

        {/* Address Info */}
        <div className="card space-y-4">
          <h2 className="font-bold text-gray-800">
            முகவரி <span className="text-gray-400 font-normal text-sm">/ Address</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">முகவரி / Address</label>
            <textarea value={form.address}
              onChange={e => setForm({...form, address: e.target.value})}
              className="input-field resize-none" rows={3}
              placeholder="வீட்டு எண், தெரு பெயர்..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">நகரம் / City</label>
              <input type="text" value={form.city}
                onChange={e => setForm({...form, city: e.target.value})}
                className="input-field" placeholder="Chennai" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">பின்கோட் / Pincode</label>
              <input type="tel" maxLength={6} value={form.pincode}
                onChange={e => setForm({...form, pincode: e.target.value.replace(/\D/g, '')})}
                className="input-field" placeholder="600001" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">மாவட்டம் / District</label>
            <select value={form.district}
              onChange={e => setForm({...form, district: e.target.value})}
              className="input-field">
              <option value="">-- மாவட்டம் தேர்வு செய்யவும் --</option>
              {TAMIL_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error / Success */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-green-700 text-sm">✅ சுயவிவரம் சேமிக்கப்பட்டது / Profile saved!</p>
          </div>
        )}

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'சேமிக்கிறோம்...' : '💾 சுயவிவரம் சேமி / Save Profile'}
        </button>

        <div className="pb-6" />
      </div>
    </div>
  );
}
