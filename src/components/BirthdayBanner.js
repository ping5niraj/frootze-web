import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function BirthdayBanner() {
  const navigate = useNavigate();
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/api/birthdays').then(res => {
      setTodayBirthdays(res.data.today || []);
      setUpcomingCount(res.data.upcoming_count || 0);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  // Today's birthday — show prominent banner
  if (todayBirthdays.length > 0) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl animate-bounce">🎂</span>
          <p className="font-bold text-sm">இன்று பிறந்தநாள்! / Birthday Today!</p>
          <span className="ml-auto text-xl">🎉</span>
        </div>
        {todayBirthdays.map(b => (
          <div key={b.id} className="flex items-center gap-2 mb-2">
            {b.profile_photo ? (
              <img src={b.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white bg-opacity-30 flex items-center justify-center text-sm font-bold">
                {b.name?.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">{b.name}</p>
              <p className="text-purple-200 text-xs">{b.relation_tamil} · {b.age} வயது</p>
            </div>
            <button
              onClick={() => {
                const msg = encodeURIComponent(
                  `🎂 பிறந்தநாள் வாழ்த்துகள் ${b.name}! 🎉\n\n` +
                  `உங்கள் ${b.age}வது பிறந்தநாளில் மனமார்ந்த வாழ்த்துகள்! 🌟\n\n` +
                  `Happy ${b.age}th Birthday! Wishing you joy and happiness! 🎈\n\n` +
                  `- frootze குடும்பம் 🌳`
                );
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              }}
              className="bg-white text-purple-700 text-xs px-2 py-1.5 rounded-lg font-semibold hover:bg-purple-50"
            >
              💬 Wish
            </button>
          </div>
        ))}
        <button onClick={() => navigate('/birthdays')}
          className="w-full text-center text-purple-200 text-xs mt-1 hover:text-white">
          அனைத்து பிறந்தநாள்களும் / View all birthdays →
        </button>
      </div>
    );
  }

  // Upcoming birthdays — show subtle reminder
  if (upcomingCount > 0) {
    return (
      <div onClick={() => navigate('/birthdays')}
        className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer hover:bg-amber-100 transition-all">
        <span className="text-xl">🎂</span>
        <div className="flex-1">
          <p className="text-amber-800 text-sm font-semibold">
            {upcomingCount} பிறந்தநாள் வருகிறது
          </p>
          <p className="text-amber-600 text-xs">{upcomingCount} upcoming birthdays in next 30 days</p>
        </div>
        <span className="text-amber-400 text-sm">→</span>
      </div>
    );
  }

  return null;
}
