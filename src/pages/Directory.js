import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Directory() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ kuthams: [], districts: [], cities: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [form, setForm] = useState({
    kutham: '', district: '', pincode: '', city: '', search: ''
  });

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const res = await api.get('/api/users/directory/filters');
      setFilters(res.data);
    } catch (err) {
      console.error('Failed to load filters');
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (form.kutham) params.kutham = form.kutham;
      if (form.district) params.district = form.district;
      if (form.pincode) params.pincode = form.pincode;
      if (form.city) params.city = form.city;
      if (form.search) params.search = form.search;

      const res = await api.get('/api/users/directory', { params });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setForm({ kutham: '', district: '', pincode: '', city: '', search: '' });
    setUsers([]);
    setSearched(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-purple-200 hover:text-white">← Back</button>
          <div>
            <h1 className="text-lg font-bold">குடும்ப அகராதி</h1>
            <p className="text-purple-300 text-xs">Family Directory</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Search filters */}
        <div className="card space-y-3">
          <h2 className="font-bold text-gray-800">
            தேடல் வடிகட்டிகள் <span className="text-gray-400 font-normal text-sm">/ Search Filters</span>
          </h2>

          {/* Name search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">பெயர் தேடு / Search by Name</label>
            <input type="text" value={form.search}
              onChange={e => setForm({...form, search: e.target.value})}
              className="input-field" placeholder="பெயர் உள்ளிடவும்..." />
          </div>

          {/* Kutham filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">குலம் / Kutham</label>
            <select value={form.kutham}
              onChange={e => setForm({...form, kutham: e.target.value})}
              className="input-field">
              <option value="">-- அனைத்து குலங்கள் --</option>
              {filters.kuthams?.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* District filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">மாவட்டம் / District</label>
              <select value={form.district}
                onChange={e => setForm({...form, district: e.target.value})}
                className="input-field">
                <option value="">-- அனைத்து --</option>
                {filters.districts?.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Pincode filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">பின்கோட் / Pincode</label>
              <input type="tel" maxLength={6} value={form.pincode}
                onChange={e => setForm({...form, pincode: e.target.value.replace(/\D/g, '')})}
                className="input-field" placeholder="600001" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSearch} disabled={loading}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-all disabled:opacity-50">
              {loading ? 'தேடுகிறோம்...' : '🔍 தேடு / Search'}
            </button>
            <button onClick={handleClear}
              className="px-4 py-3 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-50 text-sm">
              Clear
            </button>
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">
                முடிவுகள் <span className="text-gray-400 font-normal text-sm">/ Results</span>
              </h2>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                {users.length} பேர் / members
              </span>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-500 text-sm">யாரும் கிடைக்கவில்லை / No members found</p>
                <p className="text-gray-400 text-xs mt-1">Try different filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    {/* Photo */}
                    {u.profile_photo ? (
                      <img src={u.profile_photo} alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-200 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-lg font-bold text-purple-700 flex-shrink-0">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                      {u.kutham && (
                        <p className="text-xs text-purple-600 font-medium">{u.kutham}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.district && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            📍 {u.district}
                          </span>
                        )}
                        {u.city && (
                          <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                            🏙️ {u.city}
                          </span>
                        )}
                        {u.pincode && (
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                            📮 {u.pincode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Prompt to fill profile */}
        {!searched && (
          <div className="card bg-purple-50 border border-purple-100">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-semibold text-purple-800 text-sm mb-1">
                  உங்கள் குலத்தை சேர்க்கவும்!
                </p>
                <p className="text-purple-700 text-xs mb-2">
                  குடும்ப அகராதியில் தெரிய உங்கள் குலம், மாவட்டம், பின்கோட் சேர்க்கவும்.
                </p>
                <p className="text-purple-600 text-xs">
                  Add your Kutham, District and Pincode to appear in the family directory.
                </p>
                <button
                  onClick={() => navigate('/profile')}
                  className="mt-2 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700"
                >
                  சுயவிவரம் திருத்து / Edit Profile →
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
