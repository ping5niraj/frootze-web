import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, FormControl, FormLabel, SimpleGrid,
  InputGroup, InputLeftAddon
} from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

const RELATIONS = [
  { value: 'father',               tamil: 'அப்பா',                   english: 'Father'             },
  { value: 'mother',               tamil: 'அம்மா',                   english: 'Mother'             },
  { value: 'spouse',               tamil: 'மனைவி/கணவன்',            english: 'Spouse'             },
  { value: 'brother',              tamil: 'அண்ணன்/தம்பி',           english: 'Brother'            },
  { value: 'sister',               tamil: 'அக்கா/தங்கை',            english: 'Sister'             },
  { value: 'son',                  tamil: 'மகன்',                    english: 'Son'                },
  { value: 'daughter',             tamil: 'மகள்',                    english: 'Daughter'           },
  { value: 'grandfather_paternal', tamil: 'தாத்தா (அப்பா பக்கம்)', english: 'Grandfather (Paternal)' },
  { value: 'grandmother_paternal', tamil: 'பாட்டி (அப்பா பக்கம்)', english: 'Grandmother (Paternal)' },
  { value: 'grandfather_maternal', tamil: 'தாத்தா (அம்மா பக்கம்)', english: 'Grandfather (Maternal)' },
  { value: 'grandmother_maternal', tamil: 'பாட்டி (அம்மா பக்கம்)', english: 'Grandmother (Maternal)' },
  { value: 'grandson',             tamil: 'பேரன்',                   english: 'Grandson'           },
  { value: 'granddaughter',        tamil: 'பேத்தி',                  english: 'Granddaughter'      },
];

const CHILD_RELATIONS = ['son','daughter','grandson','granddaughter'];

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid',
  borderColor: 'whiteAlpha.200', borderRadius: '2xl',
  px: { base: 5, md: 8 },
};

const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white',
  h: { base: '50px', md: '56px' }, fontSize: { base: 'md', md: 'lg' },
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
};

export default function AddRelative() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOffline, setIsOffline] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [offlineName, setOfflineName] = useState('');
  const [offlineGender, setOfflineGender] = useState('');
  const [relationType, setRelationType] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [treeInviteLoading, setTreeInviteLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState({ whatsapp: false, email: false, telegram: false });
  const [whatsappLink, setWhatsappLink] = useState('');

  const selectedRelation = RELATIONS.find(r => r.value === relationType);

  const handleAdd = async () => {
    setError(''); setSuccess(''); setShowInvitePrompt(false);
    if (!relationType) { setError('உறவை தேர்வு செய்யவும்'); return; }
    const isChildRelation = CHILD_RELATIONS.includes(relationType);
    if (isOffline) {
      if (!offlineName.trim()) { setError('பெயர் உள்ளிடவும்'); return; }
      if (!offlineGender) { setError('பாலினம் தேர்வு செய்யவும்'); return; }
    } else if (isChildRelation && isMinor) {
      if (!offlineName.trim()) { setError('குழந்தையின் பெயர் உள்ளிடவும்'); return; }
      if (!offlineGender) { setError('பாலினம் தேர்வு செய்யவும்'); return; }
    } else {
      if (!phone || phone.length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
    }
    setLoading(true);
    try {
      const isChildRelation2 = CHILD_RELATIONS.includes(relationType);
      if (isOffline || (isChildRelation2 && isMinor)) {
        await api.post('/api/relationships', {
          relation_type: relationType, relation_tamil: selectedRelation?.tamil,
          is_offline: true, offline_name: offlineName.trim(), offline_gender: offlineGender,
        });
        const label = isOffline ? '🕊️' : '👶';
        setSuccess(`${label} ${offlineName} குடும்ப மரத்தில் சேர்க்கப்பட்டார்`);
      } else {
        const res = await api.post('/api/relationships', {
          to_user_phone: phone, relation_type: relationType,
          relation_tamil: selectedRelation?.tamil, is_offline: false,
        });
        const notifResults = {
          whatsapp: false,
          email: res.data.notifications?.email || false,
          telegram: res.data.notifications?.telegram || false,
        };
        setNotifStatus(notifResults);
        setWhatsappLink(res.data.whatsapp_link || '');
        setSuccess(`✅ கோரிக்கை அனுப்பப்பட்டது! ${selectedRelation?.tamil} உங்கள் கோரிக்கையை Dashboard-ல் காண்பார்.`);
        if (res.data.whatsapp_link) {
          window.open(res.data.whatsapp_link, '_blank');
          notifResults.whatsapp = true;
          setNotifStatus({ ...notifResults });
        }
        if (email && !notifResults.email) {
          try {
            await axios.post(`${BASE_URL}/api/auth/send-invite-email`, {
              to_email: email, from_name: user?.name,
              relation_tamil: selectedRelation?.tamil, invite_link: 'https://frootze.com',
            }, { headers: { Authorization: `Bearer ${localStorage.getItem('pmf_token')}` } });
            notifResults.email = true; setNotifStatus({ ...notifResults });
          } catch (e) {}
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '';
      if (errorMsg.includes('No user found') || errorMsg.includes('register')) {
        setShowInvitePrompt(true);
      } else {
        setError(errorMsg || 'சேர்க்க தோல்வி / Failed');
      }
    } finally { setLoading(false); }
  };

  const handleSendInvite = async () => {
    setInviteLoading(true);
    setShowInvitePrompt(false);
    try {
      // Download cached tree image if available
      const cachedTree = sessionStorage.getItem('pmf_tree_image');
      if (cachedTree) {
        const a = document.createElement('a');
        a.href = cachedTree;
        a.download = `${user?.name}-frootze-family-tree.png`;
        a.click();
      }

      // Build WhatsApp message
      const res2 = await api.get('/api/relationships/mine');
      const members2 = (res2.data.my_relationships || []).slice(0, 5);
      const memberLines = members2.map(m => {
        const nm = m.to_user?.name || m.offline_name || '';
        return `• ${nm} (${m.relation_tamil})`;
      }).join('\n');

      const waText =
        `🌳 ${user?.name} உங்களை frootze குடும்ப மரத்தில் சேர அழைக்கிறார்!\n\n` +
        (memberLines ? `நமது குடும்பத்தினர்:\n${memberLines}\n\n` : '') +
        `இப்போதே சேருங்கள்:\nhttps://frootze.com\n\nஇலவசம் 🌳`;

      setTimeout(() => {
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(waText)}`, '_blank');
      }, cachedTree ? 800 : 0);

      setSuccess(cachedTree
        ? '✅ படம் பதிவிறக்கம் ஆனது! WhatsApp திறக்கும் — படத்தை 📎 மூலம் இணைத்து அனுப்பவும்.\nImage downloaded! Open WhatsApp → tap 📎 → attach image → Send'
        : '📨 அழைப்பு அனுப்பப்பட்டது!');

    } catch(e) {
      setSuccess('📨 அழைப்பு அனுப்பப்பட்டது!');
    } finally { setInviteLoading(false); }
  };

  const handleShareTree = async () => {
    if (!relationType) { setError('உறவை தேர்வு செய்யவும் / Select relation first'); return; }
    if (!phone || phone.length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
    setTreeInviteLoading(true);
    try {
      const res = await api.post('/api/tree-invite/send', {
        to_phone: phone,
        relation_type: relationType,
        relation_tamil: selectedRelation?.tamil,
      });
      if (res.data.whatsapp_link) {
        window.open(res.data.whatsapp_link, '_blank');
      }
      setSuccess(`✅ குடும்ப மரம் அழைப்பு அனுப்பப்பட்டது!
Tree invite sent! Link: ${res.data.invite_url}`);
    } catch (e) {
      setError(e.response?.data?.error || 'Tree invite failed');
    } finally { setTreeInviteLoading(false); }
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox} py={5}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">👨‍👩‍👧 குடும்பத்தினரை சேர்</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Add Family Member</Text>
            </Box>
          </HStack>
        </Box>

        {/* Online / Offline Toggle */}
        <Box {...sectionBox} py={4}>
          <Text fontSize="sm" fontWeight="600" color="whiteAlpha.700" mb={3}>
            இவர் frootze-ல் உள்ளாரா? / Are they on frootze?
          </Text>
          <HStack spacing={3}>
            <Button flex={1} h="48px"
              bg={!isOffline ? 'purple.600' : 'whiteAlpha.100'}
              color={!isOffline ? 'white' : 'whiteAlpha.600'}
              border="1px solid" borderColor={!isOffline ? 'purple.400' : 'whiteAlpha.200'}
              borderRadius="xl" fontSize="sm" fontWeight="700"
              onClick={() => { setIsOffline(false); setError(''); setSuccess(''); }}
              _hover={{ bg: !isOffline ? 'purple.700' : 'whiteAlpha.200' }}>
              📱 ஆம் — frootze-ல் உள்ளார் / Yes
            </Button>
            <Button flex={1} h="48px"
              bg={isOffline ? 'orange.700' : 'whiteAlpha.100'}
              color={isOffline ? 'white' : 'whiteAlpha.600'}
              border="1px solid" borderColor={isOffline ? 'orange.400' : 'whiteAlpha.200'}
              borderRadius="xl" fontSize="sm" fontWeight="700"
              onClick={() => { setIsOffline(true); setError(''); setSuccess(''); }}
              _hover={{ bg: isOffline ? 'orange.800' : 'whiteAlpha.200' }}>
              🕊️ இல்லை — காலமானவர் / Deceased
            </Button>
          </HStack>
        </Box>

        {/* Form */}
        <Box {...sectionBox} py={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" color="whiteAlpha.800">
              அடிப்படை விவரம் / Basic Details
            </Text>

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>உறவு / Relation *</FormLabel>
              <Select placeholder="உறவை தேர்வு செய்யவும்" value={relationType}
                onChange={e => setRelationType(e.target.value)} {...inputStyle}>
                {RELATIONS.map(r => (
                  <option key={r.value} value={r.value} style={{ background: '#1e1b4b' }}>
                    {r.tamil} / {r.english}
                  </option>
                ))}
              </Select>
            </FormControl>

            {!isOffline && CHILD_RELATIONS.includes(relationType) && (
              <Box bg={isMinor ? 'blue.900' : 'whiteAlpha.100'}
                border="1px solid" borderColor={isMinor ? 'blue.500' : 'whiteAlpha.200'}
                borderRadius="xl" px={4} py={3}>
                <HStack justify="space-between" alignItems="center">
                  <Box>
                    <Text fontSize="sm" color="white" fontWeight="600">👶 18 வயதுக்கு கீழா? / Under 18?</Text>
                    <Text fontSize="xs" color="whiteAlpha.500">Minor — phone number optional</Text>
                  </Box>
                  <HStack spacing={2}>
                    <Button size="xs" bg={!isMinor ? 'purple.600' : 'whiteAlpha.200'} color="white"
                      onClick={() => setIsMinor(false)}>இல்லை</Button>
                    <Button size="xs" bg={isMinor ? 'blue.600' : 'whiteAlpha.200'} color="white"
                      onClick={() => setIsMinor(true)}>ஆம்</Button>
                  </HStack>
                </HStack>
                {isMinor && (
                  <Text fontSize="xs" color="blue.300" mt={2}>
                    பெயர் மட்டும் போதும் — தொலைபேசி தேவையில்லை / Phone not required for minors
                  </Text>
                )}
              </Box>
            )}

            {!isOffline && (!CHILD_RELATIONS.includes(relationType) || !isMinor) && (
              <>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>தொலைபேசி எண் / Phone *</FormLabel>
                  <InputGroup size="lg">
                    <InputLeftAddon bg="whiteAlpha.200" border="1px solid" borderColor="whiteAlpha.300"
                      color="white" fontSize="sm" fontWeight="600" h={{ base: '50px', md: '56px' }} px={4}>
                      🇮🇳 +91
                    </InputLeftAddon>
                    <Input type="tel" maxLength={10} placeholder="9999999999"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      {...inputStyle} />
                  </InputGroup>
                </FormControl>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>📧 Email (optional)</FormLabel>
                  <Input type="email" placeholder="relative@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} {...inputStyle} />
                </FormControl>
                <Box bg="purple.900" border="1px solid" borderColor="purple.600" borderRadius="xl" px={4} py={3}>
                  <Text fontSize="xs" color="purple.300" fontWeight="600" mb={1}>💡 குறிப்பு / Note</Text>
                  <Text fontSize="xs" color="purple.200">கோரிக்கை அனுப்பியதும் WhatsApp தானாக திறக்கும். அவர் frootze Dashboard-ல் ஏற்கலாம்.</Text>
                </Box>
              </>
            )}

            {/* Minor child name+gender fields */}
            {!isOffline && CHILD_RELATIONS.includes(relationType) && isMinor && (
              <>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>குழந்தையின் பெயர் / Child's Name *</FormLabel>
                  <Input placeholder="உதா: Raman Kumar" value={offlineName}
                    onChange={e => setOfflineName(e.target.value)} {...inputStyle} />
                </FormControl>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>பாலினம் / Gender *</FormLabel>
                  <Select placeholder="தேர்வு செய்யவும்" value={offlineGender}
                    onChange={e => setOfflineGender(e.target.value)} {...inputStyle}>
                    <option value="male" style={{ background: '#1e1b4b' }}>ஆண் / Male</option>
                    <option value="female" style={{ background: '#1e1b4b' }}>பெண் / Female</option>
                  </Select>
                </FormControl>
              </>
            )}

            {isOffline && (
              <>
                <Box bg="orange.900" border="1px solid" borderColor="orange.600" borderRadius="xl" px={4} py={3}>
                  <Text fontSize="xs" color="orange.300" fontWeight="600" mb={1}>🕊️ காலமானவர் / Deceased Member</Text>
                  <Text fontSize="xs" color="orange.200">இவர் நேரடியாக குடும்ப மரத்தில் சேர்க்கப்படுவார். தொலைபேசி தேவையில்லை.</Text>
                </Box>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>பெயர் / Name *</FormLabel>
                  <Input placeholder="உதா: Raman Kumar" value={offlineName}
                    onChange={e => setOfflineName(e.target.value)} {...inputStyle} />
                </FormControl>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>பாலினம் / Gender *</FormLabel>
                  <Select placeholder="தேர்வு செய்யவும்" value={offlineGender}
                    onChange={e => setOfflineGender(e.target.value)} {...inputStyle}>
                    <option value="male" style={{ background: '#1e1b4b' }}>ஆண் / Male</option>
                    <option value="female" style={{ background: '#1e1b4b' }}>பெண் / Female</option>
                  </Select>
                </FormControl>
              </>
            )}
          </VStack>
        </Box>

        {/* Result Section */}
        <Box {...sectionBox} py={{ base: 5, md: 6 }}>
          <VStack spacing={4} align="stretch">

            {/* Unregistered invite prompt */}
            {showInvitePrompt && (
              <Box bg="yellow.900" border="1px solid" borderColor="yellow.500" borderRadius="xl" px={4} py={4}>
                <Text color="yellow.200" fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" mb={1}>
                  ⚠️ இந்த எண் frootze-ல் பதிவு செய்யப்படவில்லை
                </Text>
                <Text color="yellow.300" fontSize="sm" mb={3}>
                  This number is not on frootze yet.
                </Text>
                <Box bg="blue.900" border="1px solid" borderColor="blue.600"
                  borderRadius="xl" px={3} py={3} mb={3}>
                  <Text fontSize="xs" color="blue.200" fontWeight="700" mb={1}>
                    📋 How to share with family tree image:
                  </Text>
                  <Text fontSize="xs" color="blue.300">1️⃣ Click "Send Invite" below</Text>
                  <Text fontSize="xs" color="blue.300">2️⃣ Tree image downloads automatically</Text>
                  <Text fontSize="xs" color="blue.300">3️⃣ WhatsApp opens with invite message</Text>
                  <Text fontSize="xs" color="blue.300">4️⃣ Tap 📎 in WhatsApp → attach image → Send</Text>
                  <Text fontSize="xs" color="blue.400" mt={1} fontStyle="italic">
                    Full auto-share available in the frootze mobile app
                  </Text>
                </Box>
                <HStack spacing={3}>
                  <Button flex={1} h="44px" bgGradient="linear(to-r, purple.600, green.500)"
                    color="white" fontSize="sm" fontWeight="700" borderRadius="xl"
                    isLoading={inviteLoading} loadingText="அனுப்புகிறோம்..."
                    onClick={handleSendInvite}>
                    📨 அழைப்பு அனுப்பு / Send Invite
                  </Button>
                  <Button flex={1} h="44px" variant="ghost" color="whiteAlpha.500"
                    fontSize="sm" borderRadius="xl"
                    onClick={() => setShowInvitePrompt(false)}
                    _hover={{ color: 'white' }}>
                    ரத்து / Cancel
                  </Button>
                </HStack>
              </Box>
            )}

            {error && (
              <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}>
                <Text color="red.200" fontSize="sm">{error}</Text>
              </Box>
            )}

            {success && (
              <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}>
                <Text color="green.200" fontSize={{ base: 'sm', md: 'md' }}>{success}</Text>
              </Box>
            )}

            {!isOffline && success && whatsappLink && (
              <SimpleGrid columns={3} spacing={3}>
                {[
                  { key: 'whatsapp', icon: '📱', label: 'WhatsApp' },
                  { key: 'email',    icon: '📧', label: 'Email'    },
                  { key: 'telegram', icon: '✈️', label: 'Telegram' },
                ].map(n => (
                  <Box key={n.key}
                    bg={notifStatus[n.key] ? 'green.900' : 'whiteAlpha.100'}
                    border="1px solid"
                    borderColor={notifStatus[n.key] ? 'green.500' : 'whiteAlpha.200'}
                    borderRadius="xl" px={3} py={3} textAlign="center">
                    <Text fontSize="xl">{n.icon}</Text>
                    <Text fontSize="xs" color={notifStatus[n.key] ? 'green.300' : 'whiteAlpha.400'} mt={1}>
                      {notifStatus[n.key] ? '✓ Sent' : n.label}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}

            {!success && !showInvitePrompt && !isOffline && !(CHILD_RELATIONS.includes(relationType) && isMinor) && (
              <Button w="100%" h={{ base: '50px', md: '56px' }}
                variant="outline"
                borderColor="green.500" color="green.300"
                fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={treeInviteLoading} loadingText="அனுப்புகிறோம்..."
                isDisabled={phone.length < 10 || !relationType}
                onClick={handleShareTree}
                mb={3}
                _hover={{ bg: 'green.900' }}>
                🌳 குடும்ப மரம் பகிர் / Share My Family Tree
              </Button>
            )}

            {!success && !showInvitePrompt && (
              <Button w="100%" h={{ base: '50px', md: '56px' }}
                bgGradient={isOffline ? 'linear(to-r, orange.600, orange.500)' : 'linear(to-r, purple.600, green.500)'}
                color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={loading} loadingText="சேர்க்கிறோம்..."
                isDisabled={
                  isOffline ? (!offlineName.trim() || !offlineGender || !relationType) :
                  (CHILD_RELATIONS.includes(relationType) && isMinor) ? (!offlineName.trim() || !offlineGender || !relationType) :
                  (phone.length < 10 || !relationType)
                }
                onClick={handleAdd}
                _hover={{ transform: 'translateY(-2px)' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                {isOffline ? '🕊️ குடும்ப மரத்தில் சேர் / Add to Tree' :
                     (CHILD_RELATIONS.includes(relationType) && isMinor) ? '👶 குழந்தையை சேர் / Add Child' :
                     '👨‍👩‍👧 கோரிக்கை அனுப்பு / Send Request'}
              </Button>
            )}

            {success && (
              <HStack spacing={3}>
                {whatsappLink && (
                  <Button flex={1} h="50px" colorScheme="whatsapp" borderRadius="xl"
                    onClick={() => window.open(whatsappLink, '_blank')}>
                    📱 WhatsApp மீண்டும் திற
                  </Button>
                )}
                <Button flex={1} h="50px" variant="ghost" color="whiteAlpha.600" borderRadius="xl"
                  onClick={() => navigate('/dashboard')} _hover={{ color: 'white' }}>
                  ← Dashboard
                </Button>
              </HStack>
            )}

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
