import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addRelationship } from '../services/api';

const RELATIONS = [
  { type: 'father',   tamil: 'Appa',  emoji: '👨', label: 'Father' },
  { type: 'mother',   tamil: 'Amma',  emoji: '👩', label: 'Mother' },
  { type: 'spouse',   tamil: 'Manam', emoji: '💑', label: 'Spouse' },
  { type: 'brother',  tamil: 'Annan', emoji: '👦', label: 'Brother' },
  { type: 'sister',   tamil: 'Akka',  emoji: '👧', label: 'Sister' },
  { type: 'son',      tamil: 'Magan', emoji: '👶', label: 'Son' },
  { type: 'daughter', tamil: 'Magal', emoji: '👶', label: 'Daughter' },
];

export default function AddRelative() {
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleAdd = async () => {
    setError('');
    setSuccess('');

    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!selected) {
      setError('Please select the relationship type');
      return;
    }

    setLoading(true);
    try {
      const res = await addRelationship(phone, selected);
      setSuccess(res.data.message);
      setPhone('');
      setSelected('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add relationship');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-purple-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-purple-200 hover:text-white">
            ← Back
          </button>
          <h1 className="text-lg font-bold">Add Family Member</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        <div className="card">
          {/* Phone */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Their Phone Number
          </label>
          <div className="flex gap-2 mb-5">
            <div className="bg-gray-100 border border-gray-300 rounded-xl px-3 py-3 text-gray-600 text-sm whitespace-nowrap">
              🇮🇳 +91
            </div>
            <input
              type="tel"
              maxLength={10}
              placeholder="9999999998"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="input-field"
            />
          </div>

          {/* Relationship selector */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            This person is my...
          </label>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {RELATIONS.map((rel) => (
              <button
                key={rel.type}
                onClick={() => setSelected(rel.type)}
                className={`py-3 rounded-xl border text-sm transition-all ${
                  selected === rel.type
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="text-xl mb-1">{rel.emoji}</div>
                <div className="font-medium">{rel.label}</div>
                <div className="text-xs opacity-75">{rel.tamil}</div>
              </button>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
              <p className="text-green-700 text-sm">✅ {success}</p>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={loading || !phone || !selected}
            className="btn-primary"
          >
            {loading ? 'Sending request...' : 'Send Relationship Request →'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            They will receive a notification to confirm this relationship
          </p>
        </div>

      </div>
    </div>
  );
}
