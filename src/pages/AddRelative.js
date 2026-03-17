import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addRelationship } from '../services/api';
import { T } from '../utils/strings';

const RELATIONS = [
  { type: 'father',   emoji: '👨' },
  { type: 'mother',   emoji: '👩' },
  { type: 'spouse',   emoji: '💑' },
  { type: 'brother',  emoji: '👦' },
  { type: 'sister',   emoji: '👧' },
  { type: 'son',      emoji: '👶' },
  { type: 'daughter', emoji: '👶' },
];

export default function AddRelative() {
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const navigate = useNavigate();

  const handleAdd = async () => {
    setError(''); setSuccess(''); setShowInvite(false);
    if (!phone || phone.length < 10) {
      setError('சரியான எண் உள்ளிடவும் / Enter valid number');
      return;
    }
    if (!selected) {
      setError('உறவை தேர்வு செய்யவும் / Select relationship');
      return;
    }
    setLoading(true);
    try {
      const res = await addRelationship(phone, selected);
      setSuccess(res.data.message);
      setPhone(''); setSelected('');
    } catch (err) {
      const errMsg = err.response?.data?.error || '';
      if (errMsg.toLowerCase().includes('no user found') || err.response?.status === 404) {
        setShowInvite(true); setError('');
      } else {
        setError(errMsg || 'தோல்வி / Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppInvite = () => {
    const rel = T.relations[selected];
    const tamilLabel = rel?.ta || selected;
    const englishLabel = rel?.en || selected;

    const message = encodeURIComponent(
      `வணக்கம்! 🙏\n\n` +
      `நான் frootze-ல் என் குடும்ப மரத்தை உருவாக்கினேன்.\n` +
      `(I built my family tree on frootze!)\n\n` +
      `நீங்கள் என் ${tamilLabel} (${englishLabel}) என்று சேர்க்க விரும்புகிறேன்.\n\n` +
      `இங்கே இணையுங்கள்:\nwww.frootze.com\n\n` +
      `உங்கள் எண்: +91 ${phone}\n\n` +
      `#frootze #குடும்பம்`
    );
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-purple-200 hover:text-white">← {T.changeNumber.en.replace('← Change number', 'Back')}</button>
          <div>
            <h1 className="text-lg font-bold">{T.addFamilyMemberTitle.ta}</h1>
            <p className="text-purple-300 text-xs">{T.addFamilyMemberTitle.en}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="card">
          {/* Phone */}
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {T.theirPhone.ta}
            <span className="text-gray-400 font-normal ml-1">/ {T.theirPhone.en}</span>
          </label>
          <div className="flex gap-2 mb-5">
            <div className="bg-gray-100 border border-gray-300 rounded-xl px-3 py-3 text-gray-600 text-sm whitespace-nowrap">🇮🇳 +91</div>
            <input type="tel" maxLength={10} placeholder="9999999998" value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setShowInvite(false); setError(''); }}
              className="input-field" />
          </div>

          {/* Relationship */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {T.thisPersonIsMy.ta}
            <span className="text-gray-400 font-normal ml-1">/ {T.thisPersonIsMy.en}</span>
          </label>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {RELATIONS.map((rel) => {
              const names = T.relations[rel.type];
              return (
                <button key={rel.type} onClick={() => setSelected(rel.type)}
                  className={`py-3 rounded-xl border text-sm transition-all ${
                    selected === rel.type
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                  }`}>
                  <div className="text-xl mb-1">{rel.emoji}</div>
                  <div className="font-medium text-xs">{names?.ta}</div>
                  <div className="text-xs opacity-70">{names?.en}</div>
                </button>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
              <p className="text-green-700 text-sm">✅ {success}</p>
            </div>
          )}

          {/* Not on frootze */}
          {showInvite && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤔</span>
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 text-sm mb-1">{T.notOnFrootze.ta}</p>
                  <p className="text-amber-600 text-xs mb-1">{T.notOnFrootze.en}</p>
                  <p className="text-amber-700 text-xs mb-3">
                    அவர்களை WhatsApp மூலம் அழைக்கவும், பின்னர் மீண்டும் சேர்க்கவும்.
                  </p>
                  <button onClick={handleWhatsAppInvite}
                    className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all">
                    <span className="text-lg">💬</span>
                    {T.inviteViaWhatsApp.ta} / {T.inviteViaWhatsApp.en}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showInvite && (
            <button onClick={handleAdd} disabled={loading || !phone || !selected} className="btn-primary">
              {loading ? T.checking.ta : T.sendRequest.ta}
            </button>
          )}

          {showInvite && (
            <button onClick={() => { setShowInvite(false); setPhone(''); setSelected(''); }}
              className="w-full text-center text-gray-400 text-sm mt-2 hover:text-gray-600">
              {T.addDifferent.ta}
            </button>
          )}

          <p className="text-xs text-gray-400 text-center mt-3">{T.theyWillReceive.ta}</p>
        </div>

        {/* How it works */}
        <div className="card bg-purple-50 border border-purple-100">
          <h3 className="font-semibold text-purple-800 text-sm mb-2">{T.howItWorks.ta}</h3>
          <div className="space-y-1.5 text-xs text-purple-700">
            <p>1️⃣ அவர்களின் எண் + உறவை தேர்வு செய்யவும்</p>
            <p>2️⃣ frootze-ல் இருந்தால் → உடனே கோரிக்கை அனுப்பப்படும்</p>
            <p>3️⃣ இல்லையென்றால் → WhatsApp மூலம் அழைக்கவும்</p>
            <p>4️⃣ அவர்கள் சேர்ந்தால் → மீண்டும் சேர்க்கவும்</p>
            <p>5️⃣ உறுதிப்படுத்தல் → குடும்ப மரத்தில் சேர்வார்கள் ✅</p>
          </div>
        </div>
      </div>
    </div>
  );
}
