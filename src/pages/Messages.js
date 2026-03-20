import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, Textarea, FormControl, FormLabel, Avatar, Badge, SimpleGrid
} from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid',
  borderColor: 'whiteAlpha.200', borderRadius: '2xl',
  px: { base: 5, md: 8 },
};

const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white',
  fontSize: { base: 'md', md: 'lg' },
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
};

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  // Compose form
  const [toIds, setToIds] = useState([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [msgType, setMsgType] = useState('personal');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [inboxRes, sentRes, membersRes] = await Promise.all([
        api.get('/api/messages/inbox'),
        api.get('/api/messages/sent'),
        api.get('/api/messages/family-members'),
      ]);
      setInbox(inboxRes.data.messages || []);
      setSent(sentRes.data.messages || []);
      setFamilyMembers(membersRes.data.members || []);
    } catch (e) {
      console.error('Load failed:', e.message);
    } finally { setLoading(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/api/messages/${id}/read`);
      setInbox(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    } catch (e) {}
  };

  const toggleRecipient = (id) => {
    setToIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    setSendError(''); setSendSuccess('');
    if (!content.trim()) { setSendError('செய்தி உள்ளிடவும் / Enter message'); return; }
    if (msgType === 'personal' && toIds.length === 0) { setSendError('பெறுநரை தேர்வு செய்யவும் / Select recipient'); return; }
    setSending(true);
    try {
      const recipients = msgType === 'broadcast' || msgType === 'announcement'
        ? familyMembers.map(m => m.id)
        : msgType === 'group' ? familyMembers.map(m => m.id)
        : toIds;

      await api.post('/api/messages/send', {
        to_user_ids: recipients,
        subject, content,
        message_type: msgType,
      });
      setSendSuccess('✅ செய்தி அனுப்பப்பட்டது / Message sent!');
      setContent(''); setSubject(''); setToIds([]);
      await loadData();
      setTimeout(() => { setShowCompose(false); setSendSuccess(''); }, 2000);
    } catch (e) {
      setSendError(e.response?.data?.error || 'அனுப்ப தோல்வி / Failed to send');
    } finally { setSending(false); }
  };

  const getMsgTypeColor = (type) => {
    if (type === 'announcement') return 'red';
    if (type === 'broadcast') return 'orange';
    if (type === 'group') return 'blue';
    return 'purple';
  };

  const unreadCount = inbox.filter(m => !m.is_read).length;

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6} pb={24}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Section 1 — Header */}
        <Box {...sectionBox} py={5}>
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
              <Box>
                <HStack spacing={2}>
                  <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">💬 செய்திகள்</Heading>
                  {unreadCount > 0 && (
                    <Badge colorScheme="purple" borderRadius="full" px={2}>{unreadCount}</Badge>
                  )}
                </HStack>
                <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Messages</Text>
              </Box>
            </HStack>
            <Button size="sm" h="40px"
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" borderRadius="xl" fontWeight="600"
              onClick={() => { setShowCompose(!showCompose); setSendError(''); setSendSuccess(''); }}>
              {showCompose ? '✕ மூடு' : '+ புதிய செய்தி'}
            </Button>
          </HStack>
        </Box>

        {/* Section 2 — Compose */}
        {showCompose && (
          <Box {...sectionBox} py={{ base: 5, md: 6 }}>
            <VStack spacing={4} align="stretch">
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white">
                ✍️ புதிய செய்தி / New Message
              </Text>

              {/* Message Type */}
              <FormControl>
                <FormLabel color="whiteAlpha.700" fontSize="sm">வகை / Type</FormLabel>
                <Select value={msgType} onChange={e => setMsgType(e.target.value)}
                  {...inputStyle} h="44px">
                  <option value="personal" style={{ background: '#1e1b4b' }}>👤 Personal</option>
                  <option value="group" style={{ background: '#1e1b4b' }}>👥 Group</option>
                  <option value="broadcast" style={{ background: '#1e1b4b' }}>📢 Broadcast</option>
                  <option value="announcement" style={{ background: '#1e1b4b' }}>🔔 Announcement</option>
                </Select>
              </FormControl>

              {/* Recipients — only for personal */}
              {msgType === 'personal' && (
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize="sm">பெறுநர் / To *</FormLabel>
                  <VStack spacing={2} align="stretch" maxH="180px" overflowY="auto">
                    {familyMembers.length === 0 ? (
                      <Text color="whiteAlpha.400" fontSize="sm">குடும்பத்தினர் இல்லை</Text>
                    ) : familyMembers.map(m => (
                      <HStack key={m.id} cursor="pointer"
                        bg={toIds.includes(m.id) ? 'purple.800' : 'whiteAlpha.100'}
                        border="1px solid"
                        borderColor={toIds.includes(m.id) ? 'purple.400' : 'whiteAlpha.200'}
                        borderRadius="xl" px={3} py={2}
                        onClick={() => toggleRecipient(m.id)}
                        transition="all 0.2s">
                        <Avatar size="sm" name={m.name} src={m.profile_photo} />
                        <Box flex={1}>
                          <Text fontSize="sm" fontWeight="600" color="white">{m.name}</Text>
                          <Text fontSize="xs" color="whiteAlpha.500">{m.relation_tamil}</Text>
                        </Box>
                        <Text color={toIds.includes(m.id) ? 'purple.300' : 'whiteAlpha.300'}>
                          {toIds.includes(m.id) ? '✓' : '○'}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </FormControl>
              )}

              {msgType !== 'personal' && (
                <Box bg="whiteAlpha.100" borderRadius="xl" px={3} py={2}>
                  <Text fontSize="sm" color="whiteAlpha.600">
                    {msgType === 'broadcast' ? '📢 அனைவருக்கும் / To all family members' :
                     msgType === 'group' ? '👥 குழுவிற்கு / To group' :
                     '🔔 அறிவிப்பு / Announcement to all'}
                  </Text>
                </Box>
              )}

              {/* Subject */}
              <FormControl>
                <FormLabel color="whiteAlpha.700" fontSize="sm">தலைப்பு / Subject (optional)</FormLabel>
                <Input placeholder="செய்தி தலைப்பு..." value={subject}
                  onChange={e => setSubject(e.target.value)} {...inputStyle} h="44px" />
              </FormControl>

              {/* Message */}
              <FormControl>
                <FormLabel color="whiteAlpha.700" fontSize="sm">செய்தி / Message *</FormLabel>
                <Textarea
                  placeholder="உங்கள் செய்தியை இங்கே எழுதுங்கள்..."
                  value={content} onChange={e => setContent(e.target.value)}
                  rows={4} resize="none"
                  bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.300" color="white"
                  fontSize={{ base: 'md', md: 'lg' }}
                  _placeholder={{ color: 'whiteAlpha.400' }}
                  _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' }}
                />
              </FormControl>

              {sendError && <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}><Text color="red.200" fontSize="sm">{sendError}</Text></Box>}
              {sendSuccess && <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}><Text color="green.200" fontSize="sm">{sendSuccess}</Text></Box>}

              <Button w="100%" h={{ base: '50px', md: '56px' }}
                bgGradient="linear(to-r, purple.600, green.500)"
                color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={sending} loadingText="அனுப்புகிறோம்..."
                isDisabled={!content.trim()}
                onClick={handleSend}
                _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                📨 அனுப்பு / Send
              </Button>
            </VStack>
          </Box>
        )}

        {/* Section 3 — Tabs */}
        <Box {...sectionBox} py={3}>
          <HStack bg="whiteAlpha.100" borderRadius="xl" p={1}>
            {[
              { key: 'inbox', label: `📥 இன்பாக்ஸ் ${unreadCount > 0 ? `(${unreadCount})` : ''}` },
              { key: 'sent',  label: '📤 அனுப்பியது' },
            ].map(t => (
              <Button key={t.key} flex={1} size="sm" h="40px"
                bg={activeTab === t.key ? 'purple.600' : 'transparent'}
                color={activeTab === t.key ? 'white' : 'whiteAlpha.600'}
                borderRadius="lg" fontWeight="600"
                onClick={() => setActiveTab(t.key)}
                _hover={{ bg: activeTab === t.key ? 'purple.600' : 'whiteAlpha.100' }}>
                {t.label}
              </Button>
            ))}
          </HStack>
        </Box>

        {/* Section 4 — Messages List */}
        <Box {...sectionBox} py={{ base: 4, md: 5 }}>
          {loading ? (
            <Text color="whiteAlpha.500" textAlign="center" py={6}>ஏற்றுகிறோம்...</Text>
          ) : activeTab === 'inbox' ? (
            inbox.length === 0 ? (
              <VStack py={10} spacing={2}>
                <Text fontSize="3xl">💬</Text>
                <Text color="whiteAlpha.500" textAlign="center">செய்திகள் இல்லை / No messages</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {inbox.map(m => (
                  <Box key={m.id}
                    bg={m.is_read ? 'whiteAlpha.50' : 'whiteAlpha.150'}
                    border="1px solid"
                    borderColor={m.is_read ? 'whiteAlpha.100' : 'purple.500'}
                    borderRadius="xl" px={4} py={3}
                    cursor="pointer"
                    onClick={() => handleMarkRead(m.id)}
                    transition="all 0.2s"
                    _hover={{ bg: 'whiteAlpha.200' }}
                  >
                    <HStack justify="space-between" mb={1}>
                      <HStack spacing={2}>
                        <Avatar size="sm" name={m.message?.from_user?.name} src={m.message?.from_user?.profile_photo} />
                        <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight={m.is_read ? '500' : '700'} color="white">
                          {m.message?.from_user?.name}
                        </Text>
                        <Badge colorScheme={getMsgTypeColor(m.message?.message_type)} borderRadius="full" px={2} fontSize="10px">
                          {m.message?.message_type}
                        </Badge>
                      </HStack>
                      {!m.is_read && <Box w="8px" h="8px" borderRadius="full" bg="purple.400" />}
                    </HStack>
                    {m.message?.subject && (
                      <Text fontSize="sm" fontWeight="600" color="whiteAlpha.800" mb={1}>{m.message.subject}</Text>
                    )}
                    <Text fontSize="sm" color="whiteAlpha.600" noOfLines={2}>{m.message?.content}</Text>
                    <Text fontSize="xs" color="whiteAlpha.400" mt={1}>
                      {new Date(m.message?.created_at).toLocaleString('ta-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )
          ) : (
            sent.length === 0 ? (
              <VStack py={10} spacing={2}>
                <Text fontSize="3xl">📤</Text>
                <Text color="whiteAlpha.500" textAlign="center">அனுப்பிய செய்திகள் இல்லை</Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {sent.map(m => (
                  <Box key={m.id} bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                    borderRadius="xl" px={4} py={3}>
                    <HStack justify="space-between" mb={1}>
                      <Badge colorScheme={getMsgTypeColor(m.message_type)} borderRadius="full" px={2} fontSize="10px">
                        {m.message_type}
                      </Badge>
                      <Text fontSize="xs" color="whiteAlpha.400">
                        {new Date(m.created_at).toLocaleString('ta-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </HStack>
                    {m.subject && <Text fontSize="sm" fontWeight="600" color="whiteAlpha.800" mb={1}>{m.subject}</Text>}
                    <Text fontSize="sm" color="whiteAlpha.600" noOfLines={2}>{m.content}</Text>
                  </Box>
                ))}
              </VStack>
            )
          )}
        </Box>

      </VStack>
    </Box>
  );
}
