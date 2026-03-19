import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Quiz() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [todayScore, setTodayScore] = useState(null);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuiz();
    loadLeaderboard();
  }, []);

  const loadQuiz = async () => {
    try {
      const res = await api.get('/api/quiz/today');
      if (res.data.already_played) {
        setAlreadyPlayed(true);
        setTodayScore(res.data.today_score);
        setStreak(res.data.streak);
      } else {
        setQuestions(res.data.questions || []);
      }
    } catch (err) {
      console.error('Quiz load failed');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await api.get('/api/quiz/leaderboard');
      setLeaderboard(res.data.leaderboard || []);
    } catch (err) {
      console.error('Leaderboard load failed');
    }
  };

  const handleSelect = (option) => {
    if (selected) return; // already answered
    setSelected(option);
  };

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = [...answers, { question_id: currentQ, answer: selected }];
    setAnswers(newAnswers);
    setSelected(null);

    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      // Submit quiz
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers) => {
    setSubmitting(true);
    try {
      const res = await api.post('/api/quiz/submit', {
        answers: finalAnswers,
        questions: questions
      });
      setQuizResult(res.data);
      setShowResult(true);
      loadLeaderboard();
    } catch (err) {
      console.error('Submit failed:', err.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionStyle = (option) => {
    if (!selected) {
      return 'bg-white border-2 border-gray-200 text-gray-800 hover:border-purple-400 hover:bg-purple-50 cursor-pointer';
    }
    const currentQuestion = questions[currentQ];
    if (option === currentQuestion.correct_answer) {
      return 'bg-green-500 border-2 border-green-500 text-white';
    }
    if (option === selected && option !== currentQuestion.correct_answer) {
      return 'bg-red-400 border-2 border-red-400 text-white';
    }
    return 'bg-white border-2 border-gray-200 text-gray-400';
  };

  const getScoreEmoji = (score, total) => {
    const pct = score / total;
    if (pct === 1) return '🏆';
    if (pct >= 0.8) return '🌟';
    if (pct >= 0.6) return '👍';
    if (pct >= 0.4) return '💪';
    return '🌱';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-purple-600">Loading quiz...</p>
        </div>
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
            <h1 className="text-lg font-bold">🧠 குடும்ப வினாடி வினா</h1>
            <p className="text-purple-300 text-xs">Daily Family Quiz</p>
          </div>
          {streak > 0 && (
            <div className="ml-auto flex items-center gap-1 bg-purple-600 px-2 py-1 rounded-lg">
              <span className="text-orange-300">🔥</span>
              <span className="text-xs font-bold">{streak}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Already played today */}
        {alreadyPlayed && !showResult && (
          <div className="space-y-4">
            <div className="card text-center py-8">
              <div className="text-5xl mb-3">{getScoreEmoji(todayScore, 5)}</div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                இன்று விளையாடியாயிற்று!
              </h2>
              <p className="text-gray-500 text-sm mb-3">Today's quiz completed!</p>
              <div className="bg-purple-50 rounded-xl p-4 mb-4">
                <p className="text-3xl font-bold text-purple-700">{todayScore}/5</p>
                <p className="text-gray-500 text-sm">இன்றைய மதிப்பெண் / Today's score</p>
              </div>
              {streak > 1 && (
                <div className="flex items-center justify-center gap-2 bg-orange-50 rounded-xl p-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="font-bold text-orange-700">{streak} நாள் தொடர்ச்சி!</p>
                    <p className="text-orange-500 text-xs">{streak} day streak!</p>
                  </div>
                </div>
              )}
              <p className="text-gray-400 text-xs mt-4">
                நாளை மீண்டும் வாருங்கள் / Come back tomorrow for a new quiz!
              </p>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-3">
                  🏆 இந்த வார சாம்பியன்கள்
                  <span className="text-gray-400 font-normal text-sm ml-1">/ This Week's Champions</span>
                </h2>
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.user?.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                      idx === 0 ? 'bg-amber-50 border border-amber-200' :
                      idx === 1 ? 'bg-gray-50 border border-gray-200' :
                      idx === 2 ? 'bg-orange-50 border border-orange-100' :
                      'bg-white border border-gray-100'
                    }`}>
                      <span className="text-xl w-8 text-center">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                      </span>
                      {entry.user?.profile_photo ? (
                        <img src={entry.user.profile_photo} alt=""
                          className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                          {entry.user?.name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{entry.user?.name}</p>
                        <p className="text-xs text-gray-400">
                          {entry.games_played} விளையாட்டு · 🔥{entry.max_streak} streak
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-700">{entry.total_score}</p>
                        <p className="text-xs text-gray-400">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coming soon rewards */}
            <div className="card bg-gradient-to-r from-purple-600 to-pink-500 text-white text-center py-6">
              <div className="text-3xl mb-2">🎁</div>
              <p className="font-bold">பரிசுகள் வரும்! / Rewards Coming Soon!</p>
              <p className="text-purple-200 text-xs mt-1">
                தினமும் விளையாடி புள்ளிகள் சேர்த்து பரிசு வெல்லுங்கள்
              </p>
              <p className="text-purple-300 text-xs">
                Play daily, earn points, win gifts!
              </p>
            </div>
          </div>
        )}

        {/* Quiz in progress */}
        {!alreadyPlayed && !showResult && questions.length > 0 && (
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>கேள்வி {currentQ + 1} / {questions.length}</span>
                <span>{currentQ} சரி / correct</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${((currentQ) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="card">
              {/* Question type badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  questions[currentQ]?.type === 'photo_name' ? 'bg-blue-100 text-blue-700' :
                  questions[currentQ]?.type === 'tamil_word' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {questions[currentQ]?.type === 'photo_name' ? '📷 புகைப்படம்' :
                   questions[currentQ]?.type === 'tamil_word' ? '📚 தமிழ் சொல்' :
                   '🌳 உறவு'}
                </span>
              </div>

              {/* Photo question */}
              {questions[currentQ]?.photo && (
                <div className="flex justify-center mb-4">
                  <img
                    src={questions[currentQ].photo}
                    alt="Who is this?"
                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-md"
                  />
                </div>
              )}

              {/* Question text */}
              <p className="text-gray-800 font-semibold text-base text-center mb-5 leading-relaxed">
                {questions[currentQ]?.question}
              </p>

              {/* Options */}
              <div className="space-y-2">
                {questions[currentQ]?.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(option)}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all text-left ${getOptionStyle(option)}`}
                  >
                    <span className="text-gray-400 mr-2">{['A', 'B', 'C', 'D'][idx]}.</span>
                    {option}
                    {selected && option === questions[currentQ]?.correct_answer && (
                      <span className="float-right">✓</span>
                    )}
                    {selected && option === selected && option !== questions[currentQ]?.correct_answer && (
                      <span className="float-right">✗</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Feedback */}
              {selected && (
                <div className={`mt-4 p-3 rounded-xl text-sm font-medium text-center ${
                  selected === questions[currentQ]?.correct_answer
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {selected === questions[currentQ]?.correct_answer
                    ? '✅ சரியான பதில்! / Correct!'
                    : `❌ தவறு! சரி: ${questions[currentQ]?.correct_answer} / Wrong! Correct: ${questions[currentQ]?.correct_answer}`}
                </div>
              )}
            </div>

            {/* Next button */}
            <button
              onClick={handleNext}
              disabled={!selected || submitting}
              className="btn-primary"
            >
              {submitting ? 'சமர்ப்பிக்கிறோம்...' :
               currentQ + 1 === questions.length ? '🏁 முடிக்கவும் / Finish' : 'அடுத்தது / Next →'}
            </button>
          </div>
        )}

        {/* Quiz Result */}
        {showResult && quizResult && (
          <div className="space-y-4">
            <div className="card text-center py-8">
              <div className="text-6xl mb-3">{getScoreEmoji(quizResult.score, quizResult.total)}</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {quizResult.score === 5 ? 'அருமை! 🎉' : 'நல்ல முயற்சி!'}
              </h2>
              <div className="bg-purple-50 rounded-xl p-4 mb-4">
                <p className="text-5xl font-bold text-purple-700">{quizResult.score}/{quizResult.total}</p>
                <p className="text-gray-500 text-sm mt-1">மதிப்பெண் / Score</p>
              </div>

              {quizResult.streak > 1 && (
                <div className="flex items-center justify-center gap-2 bg-orange-50 rounded-xl p-3 mb-4">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="font-bold text-orange-700">{quizResult.streak} நாள் தொடர்ச்சி!</p>
                    <p className="text-orange-500 text-xs">{quizResult.streak} day streak!</p>
                  </div>
                </div>
              )}

              <p className="text-gray-600 text-sm mb-4">{quizResult.message}</p>

              {/* Results breakdown */}
              <div className="text-left space-y-2">
                {quizResult.results?.map((r, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                    r.is_correct ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span>{r.is_correct ? '✅' : '❌'}</span>
                    <div>
                      <p className="font-medium text-gray-700">{r.question}</p>
                      {!r.is_correct && (
                        <p className="text-red-600">சரி: {r.correct_answer}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-3">🏆 இந்த வார சாம்பியன்கள்</h2>
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.user?.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                      idx === 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}>
                      <span className="text-lg w-8 text-center">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                      </span>
                      {entry.user?.profile_photo ? (
                        <img src={entry.user.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                          {entry.user?.name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{entry.user?.name}</p>
                        <p className="text-xs text-gray-400">🔥{entry.max_streak} streak</p>
                      </div>
                      <p className="font-bold text-purple-700">{entry.total_score} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards teaser */}
            <div className="card bg-gradient-to-r from-purple-600 to-pink-500 text-white text-center py-5">
              <div className="text-3xl mb-2">🎁</div>
              <p className="font-bold">பரிசுகள் வரும்! / Rewards Coming Soon!</p>
              <p className="text-purple-200 text-xs mt-1">தினமும் விளையாடி பரிசு வெல்லுங்கள்!</p>
            </div>

            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              ← Dashboard-க்கு திரும்பு / Back to Dashboard
            </button>
          </div>
        )}

        {/* No questions available */}
        {!alreadyPlayed && !showResult && questions.length === 0 && !loading && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">🌱</div>
            <p className="text-gray-600 font-medium">வினாடி வினா தயார் இல்லை</p>
            <p className="text-gray-400 text-sm mt-1">Quiz not available yet</p>
            <p className="text-gray-400 text-xs mt-2">
              குடும்பத்தினரை சேர்த்து சரிபார்க்கவும்
            </p>
            <p className="text-gray-400 text-xs">Add and verify family members to start</p>
          </div>
        )}

      </div>
    </div>
  );
}
