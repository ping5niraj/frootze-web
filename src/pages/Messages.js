import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MESSAGE_TYPE_LABELS = {
  personal:     { ta: 'தனிப்பட்ட',    en: 'Personal',      color: 'bg-blue-100 text-blue-700' },
  group:        { ta: 'குழு',          en: 'Group',         color: 'bg-purple-100 text-purple-700' },
  broadcast:    { ta: 'அனைவருக்கும்',  en: 'Broadcast',     color: 'bg-green-100 text-green-700' },
  announcement: { ta: 'அறிவிப்பு',     en: 'Announcement',  color: 'bg-amber-100 text-amber-700' },
};

export default function Messages() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [members, setMembers] = useState([]);
  const [compose, setCompose] = useState({
    message_type: 'personal',
    subject: '',
    content: '',
    to_user_ids: []
  });
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');

  useEffect(() => {
    loadInbox();
    loadSent();
    loadMembers();
  }, []);

  const loadInbox = async () => {
    try {
      const res = await api.get('/api/messages/inbox');
      setInbox(res.data.messages || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Inbox load failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSent = async () => {
    try {
      const res = await api.get('/api/messages/sent');
      setSent(res.data.messages || []);
    } catch (err) {
      console.error('Sent load failed');
    }
  };

  const loadMembers = async () => {
    try {
      const res = await api.get('/api/messages/family-members');
      setMembers(res.data.members || []);
    } catch (err) {
      console.error('Members load failed');
    }
  };

  const handleOpenMessage = async (item) => {
    setSelectedMessage(item);
    if (!item.is_read) {
      try {
        await api.put(`/api/messages/${item.message.id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setInbox(prev => prev.map(m =>
          m.message.id === item.message.id ? { ...m, is_read: true } : m
        ));
      } catch (err) {
        console.error('Mark read failed');
      }
    }
  };

  const handleSend = async () => {
    if (!compose.content.trim()) return;
    setSending(true);
    try {
      const payload = {
        message_type: compose.message_type,
        content: compose.content,
        subject: compose.subject,
      };
      if (['personal', 'group'].includes(compose.message_type)) {
        payload.to_user_ids = compose.to_user_ids;
      }
      const res = await api.post('/api/messages/send', payload);
      setSendSuccess(res.data.message);
      setCompose({ message_type: 'personal', subject: '', content: '', to_user_ids: [] });
      setTimeout(() => {
        setSendSuccess('');
        setShowCompose(false);
        loadSent();
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (id) => {
    setCompose(prev => ({
      ...prev,
      to_user_ids: prev.to_user_ids.includes(id)
        ? prev.to_user_ids.filter(x => x !== id)
        : [...prev.to_user_ids, id]
    }));
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ta-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-purple-200 hover:text-white">← Back</button>
            <div>
              <h1 className="text-lg font-bold">செய்திகள்</h1>
              <p className="text-purple-300 text-xs">Messages</p>
            </div>
          </div>
          <button onClick={() => setShowCompose(true)}
            className="bg-white text-purple-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-50">
            ✏️ எழுது / Compose
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all relative ${activeTab === 'inbox' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
            📥 இன்பாக்ஸ் / Inbox
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('sent')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'sent' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
            📤 அனுப்பியது / Sent
          </button>
        </div>

        {/* Message Detail */}
        {selectedMessage && (
          <div className="card mb-4 border-l-4 border-purple-400">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {selectedMessage.message?.from_user?.profile_photo ? (
                  <img src={selectedMessage.message.from_user.profile_photo} alt=""
                    className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                    {selectedMessage.message?.from_user?.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{selectedMessage.message?.from_user?.name}</p>
                  <p className="text-xs text-gray-400">{formatTime(selectedMessage.message?.created_at)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {selectedMessage.message?.subject && (
              <p className="font-semibold text-gray-800 mb-2">{selectedMessage.message.subject}</p>
            )}
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {selectedMessage.message?.content}
            </p>
          </div>
        )}

        {/* Inbox */}
        {activeTab === 'inbox' && (
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : inbox.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-gray-500 text-sm">இன்பாக்ஸ் காலியாக உள்ளது</p>
                <p className="text-gray-400 text-xs">Inbox is empty</p>
              </div>
            ) : inbox.map(item => (
              <div key={item.id}
                onClick={() => handleOpenMessage(item)}
                className={`card cursor-pointer hover:shadow-md transition-all ${!item.is_read ? 'border-l-4 border-purple-500' : ''}`}>
                <div className="flex items-start gap-3">
                  {item.message?.from_user?.profile_photo ? (
                    <img src={item.message.from_user.profile_photo} alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700 flex-shrink-0">
                      {item.message?.from_user?.name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm ${!item.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {item.message?.from_user?.name}
                      </p>
                      <p className="text-xs text-gray-400">{formatTime(item.message?.created_at)}</p>
                    </div>
                    {item.message?.subject && (
                      <p className="text-sm font-medium text-gray-800 truncate">{item.message.subject}</p>
                    )}
                    <p className="text-xs text-gray-500 truncate">{item.message?.content}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${MESSAGE_TYPE_LABELS[item.message?.message_type]?.color}`}>
                      {MESSAGE_TYPE_LABELS[item.message?.message_type]?.ta}
                    </span>
                  </div>
                  {!item.is_read && (
                    <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sent */}
        {activeTab === 'sent' && (
          <div className="space-y-2">
            {sent.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-2">📤</div>
                <p className="text-gray-500 text-sm">செய்திகள் அனுப்பவில்லை</p>
                <p className="text-gray-400 text-xs">No sent messages</p>
              </div>
            ) : sent.map(msg => (
              <div key={msg.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${MESSAGE_TYPE_LABELS[msg.message_type]?.color}`}>
                    {MESSAGE_TYPE_LABELS[msg.message_type]?.ta} / {MESSAGE_TYPE_LABELS[msg.message_type]?.en}
                  </span>
                  <p className="text-xs text-gray-400">{formatTime(msg.created_at)}</p>
                </div>
                {msg.subject && <p className="font-semibold text-gray-800 text-sm mb-1">{msg.subject}</p>}
                <p className="text-sm text-gray-600 truncate mb-2">{msg.content}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>📨 {msg.recipients?.length || 0} பேருக்கு / recipients</span>
                  <span>·</span>
                  <span>✓ {msg.recipients?.filter(r => r.is_read).length || 0} படித்தனர் / read</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-purple-700 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold">✏️ புதிய செய்தி / New Message</h3>
              <button onClick={() => setShowCompose(false)} className="text-purple-200 hover:text-white">✕</button>
            </div>

            <div className="p-4 space-y-4">
              {/* Message type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">செய்தி வகை / Message Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(MESSAGE_TYPE_LABELS).map(([type, info]) => (
                    <button key={type}
                      onClick={() => setCompose(prev => ({ ...prev, message_type: type, to_user_ids: [] }))}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-left ${
                        compose.message_type === type
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-200'
                      }`}>
                      <div>{info.ta}</div>
                      <div className="opacity-70">{info.en}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient selection for personal/group */}
              {['personal', 'group'].includes(compose.message_type) && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    பெறுநர்கள் / Recipients
                    {compose.message_type === 'personal' && ' (1 மட்டும் / only 1)'}
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {members.length === 0 ? (
                      <p className="text-xs text-gray-400">சரிபார்க்கப்பட்ட குடும்பத்தினர் இல்லை / No verified members</p>
                    ) : members.map(m => (
                      <div key={m.id}
                        onClick={() => {
                          if (compose.message_type === 'personal') {
                            setCompose(prev => ({ ...prev, to_user_ids: [m.id] }));
                          } else {
                            toggleRecipient(m.id);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${
                          compose.to_user_ids.includes(m.id)
                            ? 'bg-purple-50 border border-purple-300'
                            : 'bg-gray-50 border border-transparent hover:border-gray-200'
                        }`}>
                        {m.profile_photo ? (
                          <img src={m.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                            {m.name?.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.relation_tamil}</p>
                        </div>
                        {compose.to_user_ids.includes(m.id) && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Broadcast/Announcement notice */}
              {['broadcast', 'announcement'].includes(compose.message_type) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-700">
                    ✅ இது உங்கள் அனைத்து சரிபார்க்கப்பட்ட குடும்பத்தினருக்கும் அனுப்பப்படும்
                  </p>
                  <p className="text-xs text-green-600">This will be sent to all your verified family members</p>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">தலைப்பு / Subject (optional)</label>
                <input type="text" value={compose.subject}
                  onChange={e => setCompose(prev => ({ ...prev, subject: e.target.value }))}
                  className="input-field" placeholder="செய்தி தலைப்பு..." />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">செய்தி / Message *</label>
                <textarea value={compose.content}
                  onChange={e => setCompose(prev => ({ ...prev, content: e.target.value }))}
                  className="input-field resize-none" rows={4}
                  placeholder="உங்கள் செய்தியை இங்கே எழுதவும்..." />
              </div>

              {sendSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-green-700 text-sm">✅ {sendSuccess}</p>
                </div>
              )}

              <button onClick={handleSend}
                disabled={sending || !compose.content.trim() ||
                  (['personal','group'].includes(compose.message_type) && compose.to_user_ids.length === 0)}
                className="btn-primary">
                {sending ? 'அனுப்புகிறோம்...' : '📤 அனுப்பு / Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
