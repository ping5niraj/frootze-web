import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TAMIL_MONTHS = ['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];

function BirthdayCard({ member, isToday }) {
  const handleWhatsAppWish = () => {
    const message = encodeURIComponent(
      `🎂 பிறந்தநாள் வாழ்த்துகள் ${member.name}! 🎉\n\n` +
      `உங்கள் ${member.age}வது பிறந்தநாளில் மனமார்ந்த வாழ்த்துகள்! 🌟\n\n` +
      `Happy ${member.age}th Birthday ${member.name}! 🎈\n` +
      `Wishing you joy, health and happiness always!\n\n` +
      `- frootze குடும்பத்தினர் 🌳`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const dob = new Date(member.date_of_birth);
  const monthTa = TAMIL_MONTHS[dob.getMonth()];

  if (isToday) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🎂</span>
          <div>
            <p className="text-xs font-medium text-purple-200">இன்று பிறந்தநாள்! / Today's Birthday!</p>
          </div>
          <span className="ml-auto text-2xl animate-bounce">🎉</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          {member.profile_photo ? (
            <img src={member.profile_photo} alt=""
              className="w-14 h-14 rounded-full object-cover border-3 border-white shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl font-bold">
              {member.name?.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-xl font-bold">{member.name}</p>
            <p className="text-purple-200 text-sm">{member.relation_tamil}</p>
            <p className="text-purple-200 text-xs">
              {dob.getDate()} {monthTa} — {member.age} வயது / years old
            </p>
          </div>
        </div>

        <button onClick={handleWhatsAppWish}
          className="w-full flex items-center justify-center gap-2 bg-white text-purple-700 py-3 rounded-xl font-bold text-sm hover:bg-purple-50 transition-all">
          <span className="text-lg">💬</span>
          WhatsApp-ல் வாழ்த்துங்கள் / Wish on WhatsApp
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
      {member.profile_photo ? (
        <img src={member.profile_photo} alt=""
          className="w-11 h-11 rounded-full object-cover border-2 border-purple-200 flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700 flex-shrink-0">
          {member.name?.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm">{member.name}</p>
        <p className="text-xs text-gray-500">{member.relation_tamil}</p>
        <p className="text-xs text-gray-400">
          {dob.getDate()} {monthTa}
          {member.days_until === 1 ? (
            <span className="ml-2 text-amber-600 font-semibold">நாளை! / Tomorrow!</span>
          ) : member.days_until <= 7 ? (
            <span className="ml-2 text-orange-500 font-semibold">{member.days_until} நாட்களில் / days</span>
          ) : (
            <span className="ml-2 text-gray-400">{member.days_until} நாட்களில் / days</span>
          )}
        </p>
      </div>
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-2xl">🎂</span>
        <span className="text-xs text-gray-400">{member.age}y</span>
      </div>
    </div>
  );
}

export default function Birthdays() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [allBirthdays, setAllBirthdays] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      const res = await api.get('/api/birthdays');
      setTodayBirthdays(res.data.today || []);
      setUpcomingBirthdays(res.data.upcoming || []);
      setAllBirthdays(res.data.all || []);
      if (res.data.today?.length > 0) setActiveTab('today');
    } catch (err) {
      console.error('Failed to load birthdays');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const todayStr = today.toLocaleDateString('ta-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-purple-200 hover:text-white">← Back</button>
          <div>
            <h1 className="text-lg font-bold">🎂 பிறந்தநாள் நாட்காட்டி</h1>
            <p className="text-purple-300 text-xs">Birthday Calendar</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Today's date */}
        <div className="text-center">
          <p className="text-gray-400 text-xs">{todayStr}</p>
        </div>

        {/* Today's birthdays banner */}
        {todayBirthdays.length > 0 && (
          <div className="space-y-3">
            {todayBirthdays.map(member => (
              <BirthdayCard key={member.id} member={member} isToday={true} />
            ))}
          </div>
        )}

        {/* No birthdays today */}
        {todayBirthdays.length === 0 && (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
            <div className="text-3xl mb-1">🌟</div>
            <p className="text-purple-700 text-sm font-medium">இன்று பிறந்தநாள் இல்லை</p>
            <p className="text-purple-400 text-xs">No birthdays today</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'upcoming' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
            🔔 வரும் பிறந்தநாள்
            {upcomingBirthdays.length > 0 && (
              <span className="ml-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">{upcomingBirthdays.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
            📅 அனைத்தும் / All
          </button>
        </div>

        {/* Upcoming birthdays */}
        {activeTab === 'upcoming' && (
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : upcomingBirthdays.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-4xl mb-2">🎂</div>
                <p className="text-gray-500 text-sm">அடுத்த 30 நாட்களில் பிறந்தநாள் இல்லை</p>
                <p className="text-gray-400 text-xs mt-1">No birthdays in the next 30 days</p>
                <button onClick={() => setActiveTab('all')}
                  className="mt-3 text-purple-600 text-sm hover:underline">
                  அனைத்து பிறந்தநாள்களையும் பார்க்கவும் →
                </button>
              </div>
            ) : (
              upcomingBirthdays.map(member => (
                <BirthdayCard key={member.id} member={member} isToday={false} />
              ))
            )}
          </div>
        )}

        {/* All birthdays */}
        {activeTab === 'all' && (
          <div className="space-y-2">
            {allBirthdays.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-4xl mb-2">🎂</div>
                <p className="text-gray-500 text-sm">பிறந்தநாள் தகவல் இல்லை</p>
                <p className="text-gray-400 text-xs mt-1">No birthday info available</p>
                <p className="text-gray-400 text-xs mt-1">
                  குடும்பத்தினர் பிறந்தநாளை சுயவிவரத்தில் சேர்க்கவும்
                </p>
              </div>
            ) : (
              <>
                {/* Group by month */}
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const monthMembers = allBirthdays.filter(m => m.birth_month === month);
                  if (monthMembers.length === 0) return null;
                  return (
                    <div key={month}>
                      <div className="flex items-center gap-2 py-2">
                        <div className="h-px flex-1 bg-gray-200"></div>
                        <span className="text-xs font-semibold text-gray-500 px-2">
                          {TAMIL_MONTHS[month - 1]}
                        </span>
                        <div className="h-px flex-1 bg-gray-200"></div>
                      </div>
                      <div className="space-y-2">
                        {monthMembers.map(member => (
                          <BirthdayCard key={member.id} member={member} isToday={member.is_today} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Tip */}
        <div className="card bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-700 font-semibold mb-1">💡 குறிப்பு / Tip</p>
          <p className="text-xs text-amber-600">
            குடும்பத்தினர் தங்கள் பிறந்தநாளை சுயவிவரத்தில் சேர்க்க சொல்லுங்கள்.
          </p>
          <p className="text-xs text-amber-500 mt-0.5">
            Ask family members to add their date of birth in their profile.
          </p>
        </div>

      </div>
    </div>
  );
}
