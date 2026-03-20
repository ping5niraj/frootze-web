import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMyRelationships, verifyRelationship, rejectRelationship } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FamilyTree from '../components/FamilyTree';
import ProfilePhoto from '../components/ProfilePhoto';
import ShareTree from '../components/ShareTree';
import BirthdayBanner from '../components/BirthdayBanner';
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
      const res = await getMyRelationships();
      const { my_relationships, pending_verification, summary } = res.data;
      setRelationships(my_relationships || []);
      setPending(pending_verification || []);
      setSummary(summary || {});
    } catch (err) {
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
    login(localStorage.getItem('pmf_token'), { ...user, profile_photo: photoUrl });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gradient-hero)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-float" style={{ fontSize: '64px', marginBottom: '16px' }}>🌳</div>
          <p style={{ color: '#a7f3d0', fontFamily: 'var(--font-tamil)', fontSize: '16px' }}>குடும்ப மரம் ஏற்றுகிறோம்...</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>Loading your family tree</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f4ff', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{
        background: 'var(--gradient-hero)', padding: '20px 20px 28px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)'
        }} />

        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <ProfilePhoto user={user} onPhotoUpdated={handlePhotoUpdated} />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontFamily: 'var(--font-tamil)' }}>வணக்கம்!</p>
              <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>{user?.name}</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{user?.phone}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
              padding: '8px 14px', cursor: 'pointer'
            }} onClick={() => navigate('/profile')}>
              <span style={{ fontSize: '20px' }}>⚙️</span>
            </div>
            <button onClick={() => { logout(); window.location.href = '/'; }} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px',
              padding: '8px 14px', color: 'white', cursor: 'pointer', fontSize: '12px',
              fontFamily: 'var(--font-display)', fontWeight: '600'
            }}>
              வெளியேறு
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ maxWidth: '600px', margin: '16px auto 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { value: summary.total_verified || 0, ta: 'சரிபார்க்கப்பட்டது', en: 'Verified', color: '#34d399' },
            { value: summary.pending_sent || 0, ta: 'அனுப்பியது', en: 'Sent', color: '#fbbf24' },
            { value: summary.pending_my_action || 0, ta: 'உறுதிப்படுத்தவும்', en: 'To Confirm', color: '#c084fc' },
          ].map((s, i) => (
            <div key={i} className="glass" style={{ borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontFamily: 'var(--font-tamil)', marginTop: '2px' }}>{s.ta}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 16px 0' }}>

        {/* Birthday Banner */}
        <BirthdayBanner />

        {/* Pending Verifications */}
        {pending.length > 0 && (
          <div className="card animate-fadeInUp" style={{ marginBottom: '12px', borderLeft: '4px solid var(--gold)', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <p style={{ fontWeight: '700', fontSize: '14px', color: '#92400e' }}>{T.confirmThese.ta} ({pending.length})</p>
                <p style={{ fontSize: '11px', color: '#b45309' }}>{T.confirmThese.en}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pending.map(rel => (
                <div key={rel.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fffbeb', borderRadius: '12px', padding: '10px 12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {rel.to_user?.profile_photo ? (
                      <img src={rel.to_user.profile_photo} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'var(--gradient-btn)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px'
                      }}>{rel.to_user?.name?.charAt(0)}</div>
                    )}
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '13px' }}>{rel.to_user?.name}</p>
                      <p style={{ fontSize: '11px', color: '#92400e' }}>
                        {T.saysYouAreTheir.ta} <strong style={{ color: 'var(--purple-600)' }}>{rel.relation_tamil}</strong>
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleVerify(rel.id)} disabled={actionLoading === rel.id}
                      style={{ background: 'var(--gradient-green)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      ✓ ஆம்
                    </button>
                    <button onClick={() => handleReject(rel.id)} disabled={actionLoading === rel.id}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Button */}
        {relationships.length > 0 && (
          <div style={{ marginTop: pending.length > 0 ? '0' : '12px', marginBottom: '12px' }}>
            <ShareTree treeRef={treeContainerRef} userName={user?.name} memberCount={relationships.length} />
          </div>
        )}

        {/* Tab Toggle */}
        <div style={{
          display: 'flex', background: 'white', borderRadius: '14px', padding: '4px',
          marginBottom: '12px', boxShadow: 'var(--shadow-sm)'
        }}>
          {[
            { key: 'tree', label: '🌳 குடும்ப மரம்' },
            { key: 'list', label: '📋 பட்டியல்' }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '13px',
              transition: 'all 0.2s ease',
              background: activeTab === tab.key ? 'var(--gradient-btn)' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#9ca3af',
              boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tree View */}
        {activeTab === 'tree' && (
          <div className="card">
            {relationships.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div className="animate-float" style={{ fontSize: '56px', marginBottom: '16px' }}>🌱</div>
                <p style={{ fontWeight: '700', fontSize: '16px', color: 'var(--purple-700)', fontFamily: 'var(--font-tamil)' }}>{T.emptyTree.ta}</p>
                <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>{T.emptyTree.en}</p>
                <button onClick={() => navigate('/add-relative')} className="btn-primary" style={{ marginTop: '20px', maxWidth: '240px' }}>
                  + குடும்பத்தினரை சேர்
                </button>
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
            {relationships.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
                <p style={{ color: '#9ca3af' }}>{T.emptyTree.ta}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {relationships.map((rel, i) => (
                  <div key={rel.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: i < relationships.length - 1 ? '1px solid var(--purple-100)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {rel.to_user?.profile_photo ? (
                        <img src={rel.to_user.profile_photo} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--purple-200)' }} />
                      ) : (
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: 'var(--gradient-btn)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: '700', fontSize: '16px'
                        }}>{rel.to_user?.name?.charAt(0)}</div>
                      )}
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '14px' }}>{rel.to_user?.name}</p>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>{rel.relation_tamil} · {rel.relation_type}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', padding: '4px 10px', borderRadius: '999px', fontWeight: '600',
                      background: rel.verification_status === 'verified' ? 'var(--green-100)' : 'var(--purple-100)',
                      color: rel.verification_status === 'verified' ? 'var(--green-700)' : 'var(--purple-600)'
                    }}>
                      {rel.verification_status === 'verified' ? '✓ சரிபார்க்கப்பட்டது' : '⏳ நிலுவை'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB — Add Relative */}
      <button className="fab" onClick={() => navigate('/add-relative')} title="Add Family Member">
        +
      </button>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {[
          { path: '/dashboard', icon: '🌳', label: 'மரம்' },
          { path: '/directory', icon: '📚', label: 'அகராதி' },
          { path: '/messages', icon: '💬', label: 'செய்தி' },
          { path: '/locations', icon: '📍', label: 'இடம்' },
          { path: '/birthdays', icon: '🎂', label: 'பிறந்தநாள்' },
          { path: '/quiz', icon: '🧠', label: 'வினா' },
        ].map(item => (
          <button
            key={item.path}
            className={`bottom-nav-item ${window.location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <div className="nav-icon">{item.icon}</div>
            <span style={{ fontFamily: 'var(--font-tamil)', fontSize: '9px' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
