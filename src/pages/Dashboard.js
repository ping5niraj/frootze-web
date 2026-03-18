import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyRelationships, verifyRelationship, rejectRelationship } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FamilyTree from '../components/FamilyTree';
import ProfilePhoto from '../components/ProfilePhoto';
import ShareTree from '../components/ShareTree';
import { T } from '../utils/strings';

export default function Dashboard() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [relationships, setRelationships] = useState([]);
  const [pending, setPending] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [activeTab, setActiveTab] = useState('tree');
  const treeContainerRef = useRef(null);

  useEffect(() => {
    if (user && user.id) fetchRelationships();
  }, [user]);

  const fetchRelationships = async () => {
    try {
      const token = localStorage.getItem('pmf_token');
      if (!token) { setLoading(false); return; }
      const res = await getMyRelationships();
      const { my_relationships, pending_verification, summary } = res.data;
      setRelationships(my_relationships || []);
      setPending(pending_verification || []);
      setSummary(summary || {});
    } catch (err) {
      console.error('Failed to fetch relationships:', err.message);
      setRelationships([]); setPending([]); setSummary({});
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    setActionLoading(id);
    try { await verifyRelationship(id); await fetchRelationships(); }
    catch (err) { alert(err.response?.data?.error || 'தோல்வி'); }
    finally { setActionLoading(''); }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try { await rejectRelationship(id); await fetchRelationships(); }
    catch (err) { alert(err.response?.data?.error || 'தோல்வி'); }
    finally { setActionLoading(''); }
  };

  const handlePhotoUpdated = (photoUrl) => {
    const updatedUser = { ...user, profile_photo: photoUrl };
    login(localStorage.getItem('pmf_token'), updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🌳</div>
          <p className="text-purple-600">{T.loading.ta}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ProfilePhoto user={user} onPhotoUpdated={handlePhotoUpdated} />
            <div>
              <h1 className="text-xl font-bold">🌳 frootze</h1>
              <p className="text-purple-200 text-sm">{T.welcome.ta}, {user?.name}!</p>
              <p className="text-purple-300 text-xs">{user?.phone}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/'); }}
            className="text-purple-200 text-sm hover:text-white">
            {T.logout.ta}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { ta: T.verified.ta, en: T.verified.en, value: summary.total_verified || 0, color: 'text-green-600', bg: 'bg-green-50' },
            { ta: T.sent.ta, en: T.sent.en, value: summary.pending_sent || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
            { ta: T.toConfirm.ta, en: T.toConfirm.en, value: summary.pending_my_action || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((stat) => (
            <div key={stat.ta} className={`${stat.bg} rounded-2xl p-3 text-center`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-medium text-gray-600 mt-1">{stat.ta}</div>
              <div className="text-xs text-gray-400">{stat.en}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-1 bg-white border border-purple-200 rounded-xl p-3 hover:bg-purple-50 transition-all">
            <span className="text-xl">👤</span>
            <p className="text-xs font-semibold text-gray-800">சுயவிவரம்</p>
            <p className="text-xs text-gray-400">Profile</p>
          </button>
          <button onClick={() => navigate('/directory')}
            className="flex flex-col items-center gap-1 bg-white border border-purple-200 rounded-xl p-3 hover:bg-purple-50 transition-all">
            <span className="text-xl">📚</span>
            <p className="text-xs font-semibold text-gray-800">அகராதி</p>
            <p className="text-xs text-gray-400">Directory</p>
          </button>
          <button onClick={() => navigate('/messages')}
            className="flex flex-col items-center gap-1 bg-white border border-purple-200 rounded-xl p-3 hover:bg-purple-50 transition-all">
            <span className="text-xl">💬</span>
            <p className="text-xs font-semibold text-gray-800">செய்திகள்</p>
            <p className="text-xs text-gray-400">Messages</p>
          </button>
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="card border-l-4 border-amber-400">
            <h2 className="font-semibold text-gray-800 mb-1">{T.confirmThese.ta} ({pending.length})</h2>
            <div className="space-y-3">
              {pending.map((rel) => (
                <div key={rel.id} className="flex items-center justify-between bg-amber-50 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    {rel.to_user?.profile_photo ? (
                      <img src={rel.to_user.profile_photo} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-amber-300" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-sm font-bold text-amber-800">
                        {rel.to_user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{rel.to_user?.name}</p>
                      <p className="text-xs text-gray-500">
                        {T.saysYouAreTheir.ta}{' '}
                        <span className="font-semibold text-purple-600">{rel.relation_tamil}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleVerify(rel.id)} disabled={actionLoading === rel.id}
                      className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg">{T.yes.ta}</button>
                    <button onClick={() => handleReject(rel.id)} disabled={actionLoading === rel.id}
                      className="bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg">{T.no.ta}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add + Share buttons */}
        <button onClick={() => navigate('/add-relative')} className="btn-primary">
          {T.addFamilyMember.ta}
          <span className="block text-xs opacity-75 font-normal">{T.addFamilyMember.en}</span>
        </button>

        {relationships.length > 0 && (
          <ShareTree treeRef={treeContainerRef} userName={user?.name} memberCount={relationships.length} />
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setActiveTab('tree')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tree' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
            {T.familyTree.ta}
          </button>
          <button onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
            {T.listView.ta}
          </button>
        </div>

        {/* Tree View */}
        {activeTab === 'tree' && (
          <div className="card">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="font-semibold text-gray-800">{T.myFamilyTree.ta}</h2>
              <span className="text-gray-400 text-sm">{T.myFamilyTree.en}</span>
            </div>
            {relationships.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🌱</div>
                <p className="text-gray-600 text-sm font-medium">{T.emptyTree.ta}</p>
                <p className="text-gray-400 text-xs mt-1">{T.emptyTree.en}</p>
              </div>
            ) : (
              <div ref={treeContainerRef}>
                <FamilyTree relationships={relationships} currentUser={user} />
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {activeTab === 'list' && (
          <div className="card">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="font-semibold text-gray-800">{T.myFamilyTree.ta}</h2>
            </div>
            {relationships.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🌱</div>
                <p className="text-gray-500 text-sm">{T.emptyTree.ta}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relationships.map((rel) => (
                  <div key={rel.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      {rel.to_user?.profile_photo ? (
                        <img src={rel.to_user.profile_photo} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-purple-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                          {rel.to_user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{rel.to_user?.name}</p>
                        <p className="text-xs text-gray-500">{rel.relation_tamil} · {rel.relation_type}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      rel.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                      rel.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {rel.verification_status === 'verified' ? T.verifiedBadge.ta :
                       rel.verification_status === 'pending' ? T.pendingBadge.ta : T.rejectedBadge.ta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
