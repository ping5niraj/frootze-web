import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, FormControl, FormLabel, SimpleGrid,
  InputGroup, InputLeftAddon, Spinner
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
  { value: 'nephew',               tamil: 'மருமகன்',                 english: 'Nephew'             },
  { value: 'niece',                tamil: 'மருமகள்',                 english: 'Niece'              },
  { value: 'uncle_paternal',       tamil: 'பெரியப்பா/சித்தப்பா',   english: 'Uncle (Paternal)'   },
  { value: 'aunt_paternal',        tamil: 'அத்தை',                   english: 'Aunt (Paternal)'    },
  { value: 'uncle_maternal',       tamil: 'மாமா',                    english: 'Uncle (Maternal)'   },
  { value: 'aunt_maternal',        tamil: 'சித்தி',                  english: 'Aunt (Maternal)'    },
  { value: 'aunt_by_marriage',     tamil: 'மாமி',                    english: 'Aunt (by marriage)' },
  { value: 'father_in_law',        tamil: 'மாமனார்',                 english: 'Father-in-law'      },
  { value: 'mother_in_law',        tamil: 'மாமியார்',                english: 'Mother-in-law'      },
  { value: 'brother_in_law',       tamil: 'மைத்துனன்',              english: 'Brother-in-law'     },
  { value: 'sister_in_law',        tamil: 'நாத்தனார்',               english: 'Sister-in-law'      },
  { value: 'cousin',               tamil: 'உறவினர்',                 english: 'Cousin'             },
];

const CHILD_RELATIONS = ['son', 'daughter', 'grandson', 'granddaughter'];

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

  const [isOffline, setIsOffline]               = useState(false);
  const [isMinor, setIsMinor]                   = useState(false);
  const [phone, setPhone]                       = useState('');
  const [email, setEmail]                       = useState('');
  const [offlineName, setOfflineName]           = useState('');
  const [offlineGender, setOfflineGender]       = useState('');
  const [relationType, setRelationType]         = useState('');
  const [loading, setLoading]                   = useState(false);
  const [inviteLoading, setInviteLoading]       = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [notifStatus, setNotifStatus]           = useState({ whatsapp: false, email: false, telegram: false });
  const [whatsappLink, setWhatsappLink]         = useState('');

  // Chain detection
  const [chainLoading, setChainLoading] = useState(false);
  const [chainData, setChainData]       = useState(null);
  const [overrideRelation, setOverride] = useState(false);
  const chainTimer = useRef(null);

  // Offline search
  const [offlineSearchResults, setOfflineSearchResults] = useState([]);
  const [offlineSearchLoading, setOfflineSearchLoading] = useState(false);
  const [selectedOfflineUser, setSelectedOfflineUser]   = useState(null); // confirmed existing
  const offlineSearchTimer = useRef(null);

  const selectedRelation  = RELATIONS.find(r => r.value === relationType);
  const suggestedRelation = chainData?.suggested_relation;
  const hasSuggestion     = !!suggestedRelation?.type && !!chainData?.chain;

  useEffect(() => {
    if (isOffline) return;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      clearTimeout(chainTimer.current);
      chainTimer.current = setTimeout(() => detectChain(digits), 700);
    } else {
      setChainData(null);
      setOverride(false);
      setShowInvitePrompt(false);
    }
    return () => clearTimeout(chainTimer.current);
  }, [phone, isOffline]);

  useEffect(() => {
    if (hasSuggestion && !overrideRelation) {
      setRelationType(suggestedRelation.type);
    }
  }, [chainData, overrideRelation]);

  // Search existing offline users when name is typed
  useEffect(() => {
    if (!isOffline || offlineName.trim().length < 2) {
      setOfflineSearchResults([]);
      return;
    }
    // If user already confirmed an existing node, don't search again
    if (selectedOfflineUser) return;

    clearTimeout(offlineSearchTimer.current);
    offlineSearchTimer.current = setTimeout(async () => {
      setOfflineSearchLoading(true);
      try {
        const res = await api.get(`/api/relationships/offline-users/search?name=${encodeURIComponent(offlineName.trim())}&user_id=${user?.id}`);
        setOfflineSearchResults(res.data.results || []);
      } catch (e) {
        setOfflineSearchResults([]);
      } finally {
        setOfflineSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(offlineSearchTimer.current);
  }, [offlineName, isOffline, selectedOfflineUser]);

  const detectChain = async (digits) => {
    setChainLoading(true);
    setOverride(false);
    try {
      const res = await api.get(`/api/relationships/chain-detect?to_phone=${digits}`);
      setChainData(res.data);
      if (!res.data.target_found) setShowInvitePrompt(true);
    } catch(e) { setChainData(null); }
    finally { setChainLoading(false); }
  };

  const handleAdd = async () => {
    setError(''); setSuccess(''); setShowInvitePrompt(false);
    if (!relationType) { setError('உறவு முறை தேர்வு செய்யவும்'); return; }
    const isChildRelation = CHILD_RELATIONS.includes(relationType);
    if (isOffline) {
      if (!selectedOfflineUser && !offlineName.trim()) { setError('பெயர் உள்ளிடவும்'); return; }
      if (!selectedOfflineUser && !offlineGender) { setError('பாலினம் தேர்வு செய்யவும்'); return; }
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
          is_offline: true,
          offline_name: selectedOfflineUser ? selectedOfflineUser.name : offlineName.trim(),
          offline_gender: selectedOfflineUser ? selectedOfflineUser.gender : offlineGender,
          offline_user_id: selectedOfflineUser ? selectedOfflineUser.id : null,
        });
        setSuccess(`${isOffline ? '🕊️' : '👶'} ${selectedOfflineUser ? selectedOfflineUser.name : offlineName} குடும்ப மரத்தில் சேர்க்கப்பட்டார்`);
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
        setSuccess(`✅ கோரிக்கை அனுப்பப்பட்டது! ${selectedRelation?.tamil} என்று கோரிக்கையை Dashboard-ல் காண்பார்.`);
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
        setError(errorMsg || 'சேர்க்க முடியவில்லை / Failed');
      }
    } finally { setLoading(false); }
  };

  const handleSendInvite = async () => {
    setInviteLoading(true);
    setShowInvitePrompt(false);
    try {
      const cachedTree = sessionStorage.getItem('pmf_tree_image');
      if (cachedTree) {
        const a = document.createElement('a');
        a.href = cachedTree;
        a.download = `${user?.name}-frootze-family-tree.png`;
        a.click();
      }
      const res2 = await api.get('/api/relationships/mine');
      const members2 = (res2.data.my_relationships || []).slice(0, 5);
      const memberLines = members2.map(m => {
        const nm = m.to_user?.name || m.offline_name || '';
        return `• ${nm} (${m.relation_tamil})`;
      }).join('\n');
      const waText =
        `🌳 ${user?.name} என்னோடு frootze குடும்ப மரத்தில் சேர அழைக்கிறார்!\n\n` +
        (memberLines ? `நமது குடும்பத்தினர்:\n${memberLines}\n\n` : '') +
        `இப்போதே சேருங்கள்:\nhttps://frootze.com\n\nஇலவசம் 🌳`;
      setTimeout(() => {
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(waText)}`, '_blank');
      }, cachedTree ? 800 : 0);
      setSuccess(cachedTree
        ? '✅ படம் பதிவிறக்கம் ஆனது! WhatsApp திறக்கும் — படத்தை 📎 மூலம் இணைத்து அனுப்பவும்.'
        : '📨 அழைப்பு அனுப்பப்பட்டது!');
    } catch(e) {
      setSuccess('📨 அழைப்பு அனுப்பப்பட்டது!');
    } finally { setInviteLoading(false); }
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox} py={5}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')}
              color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>&#8592;</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">
                Add Family Member
              </Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">
                குடும்பத்தினரை சேர்
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Online / Offline Toggle */}
        <Box {...sectionBox} py={4}>
          <Text fontSize="sm" fontWeight="600" color="whiteAlpha.700" mb={3}>
            Are they on frootze? / இவர் frootze-ல் உள்ளாரா?
          </Text>
          <HStack spacing={3}>
            <Button flex={1} h="48px"
              bg={!isOffline ? 'purple.600' : 'whiteAlpha.100'}
              color={!isOffline ? 'white' : 'whiteAlpha.600'}
              border="1px solid" borderColor={!isOffline ? 'purple.400' : 'whiteAlpha.200'}
              borderRadius="xl" fontSize="sm" fontWeight="700"
              onClick={() => { setIsOffline(false); setError(''); setSuccess(''); setChainData(null); setShowInvitePrompt(false); }}
              _hover={{ bg: !isOffline ? 'purple.700' : 'whiteAlpha.200' }}>
              Yes — on frootze
            </Button>
            <Button flex={1} h="48px"
              bg={isOffline ? 'orange.700' : 'whiteAlpha.100'}
              color={isOffline ? 'white' : 'whiteAlpha.600'}
              border="1px solid" borderColor={isOffline ? 'orange.400' : 'whiteAlpha.200'}
              borderRadius="xl" fontSize="sm" fontWeight="700"
              onClick={() => { setIsOffline(true); setError(''); setSuccess(''); setChainData(null); setShowInvitePrompt(false); }}
              _hover={{ bg: isOffline ? 'orange.800' : 'whiteAlpha.200' }}>
              Deceased / Offline
            </Button>
          </HStack>
        </Box>

        {/* Form */}
        <Box {...sectionBox} py={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">

            {/* Relation selector */}
            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>
                Relation / உறவு *
              </FormLabel>
              <Select placeholder="Select relation / உறவை தேர்வு செய்யவும்" value={relationType}
                onChange={e => setRelationType(e.target.value)} {...inputStyle}>
                {RELATIONS.map(r => (
                  <option key={r.value} value={r.value} style={{ background: '#1e1b4b' }}>
                    {r.tamil} / {r.english}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Minor toggle */}
            {!isOffline && CHILD_RELATIONS.includes(relationType) && (
              <Box bg={isMinor ? 'blue.900' : 'whiteAlpha.100'}
                border="1px solid" borderColor={isMinor ? 'blue.500' : 'whiteAlpha.200'}
                borderRadius="xl" px={4} py={3}>
                <HStack justify="space-between" alignItems="center">
                  <Box>
                    <Text fontSize="sm" color="white" fontWeight="600">Under 18? / 18 வயதுக்கு குறைவா?</Text>
                    <Text fontSize="xs" color="whiteAlpha.500">Minor — phone number optional</Text>
                  </Box>
                  <HStack spacing={2}>
                    <Button size="xs" bg={!isMinor ? 'purple.600' : 'whiteAlpha.200'} color="white"
                      onClick={() => setIsMinor(false)}>No</Button>
                    <Button size="xs" bg={isMinor ? 'blue.600' : 'whiteAlpha.200'} color="white"
                      onClick={() => setIsMinor(true)}>Yes</Button>
                  </HStack>
                </HStack>
              </Box>
            )}

            {/* Phone + Email */}
            {!isOffline && (!CHILD_RELATIONS.includes(relationType) || !isMinor) && (
              <>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>
                    Phone / மொபைல் எண் *
                  </FormLabel>
                  <InputGroup size="lg">
                    <InputLeftAddon bg="whiteAlpha.200" border="1px solid" borderColor="whiteAlpha.300"
                      color="white" fontSize="sm" fontWeight="600" h={{ base: '50px', md: '56px' }} px={4}>
                      +91
                    </InputLeftAddon>
                    <Input type="tel" maxLength={10} placeholder="9999999999"
                      value={phone}
                      onChange={e => {
                        setPhone(e.target.value.replace(/\D/g, ''));
                        setError(''); setSuccess(''); setShowInvitePrompt(false);
                      }}
                      {...inputStyle} />
                  </InputGroup>
                  {chainLoading && (
                    <HStack mt={2} px={1}>
                      <Spinner color="purple.300" size="sm"/>
                      <Text color="whiteAlpha.500" fontSize="sm">Detecting connection...</Text>
                    </HStack>
                  )}
                </FormControl>

                {/* Chain suggestion badge */}
                {!chainLoading && hasSuggestion && !overrideRelation && (
                  <Box bg="green.900" border="1px solid" borderColor="green.600" borderRadius="xl" px={4} py={3}>
                    <HStack justify="space-between">
                      <Box>
                        <Text fontSize="xs" color="green.400" fontWeight="700">
                          Connection found — auto-selected:
                        </Text>
                        <Text fontSize="md" color="white" fontWeight="800" mt={1}>
                          {suggestedRelation.tamil} / {suggestedRelation.type}
                        </Text>
                      </Box>
                      <Button size="xs" variant="ghost" color="whiteAlpha.500"
                        onClick={() => { setOverride(true); setRelationType(''); }}
                        _hover={{ color: 'white' }}>Change</Button>
                    </HStack>
                  </Box>
                )}

                {overrideRelation && (
                  <HStack>
                    <Text fontSize="xs" color="whiteAlpha.500">Selecting manually</Text>
                    <Button size="xs" variant="ghost" color="purple.300"
                      onClick={() => { setOverride(false); setRelationType(suggestedRelation?.type || ''); }}>
                      Revert
                    </Button>
                  </HStack>
                )}

                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>
                    Email (optional)
                  </FormLabel>
                  <Input type="email" placeholder="relative@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} {...inputStyle} />
                </FormControl>

                <Box bg="purple.900" border="1px solid" borderColor="purple.600" borderRadius="xl" px={4} py={3}>
                  <Text fontSize="xs" color="purple.300" fontWeight="600" mb={1}>Note</Text>
                  <Text fontSize="xs" color="purple.200">
                    A WhatsApp notification will be sent. They can accept from their Dashboard.
                  </Text>
                </Box>
              </>
            )}

            {/* Minor child fields */}
            {!isOffline && CHILD_RELATIONS.includes(relationType) && isMinor && (
              <>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>Child's Name *</FormLabel>
                  <Input placeholder="e.g. Raman Kumar" value={offlineName}
                    onChange={e => setOfflineName(e.target.value)} {...inputStyle} />
                </FormControl>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>Gender *</FormLabel>
                  <Select placeholder="Select gender" value={offlineGender}
                    onChange={e => setOfflineGender(e.target.value)} {...inputStyle}>
                    <option value="male" style={{ background: '#1e1b4b' }}>Male</option>
                    <option value="female" style={{ background: '#1e1b4b' }}>Female</option>
                  </Select>
                </FormControl>
              </>
            )}

            {/* Offline/Deceased fields */}
            {isOffline && (
              <>
                <Box bg="orange.900" border="1px solid" borderColor="orange.600" borderRadius="xl" px={4} py={3}>
                  <Text fontSize="xs" color="orange.300" fontWeight="600" mb={1}>Deceased / Offline Member</Text>
                  <Text fontSize="xs" color="orange.200">
                    This person will be added directly to the tree without needing a phone number.
                  </Text>
                </Box>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>Name *</FormLabel>
                  <Input placeholder="e.g. Raman Kumar" value={offlineName}
                    onChange={e => { setOfflineName(e.target.value); setSelectedOfflineUser(null); }}
                    {...inputStyle} />
                </FormControl>

                {/* Existing offline node search results */}
                {offlineSearchLoading && (
                  <HStack spacing={2} px={1}>
                    <Spinner size="xs" color="purple.300" />
                    <Text fontSize="xs" color="whiteAlpha.500">தேடுகிறோம்...</Text>
                  </HStack>
                )}

                {!offlineSearchLoading && offlineSearchResults.length > 0 && !selectedOfflineUser && (
                  <Box bg="purple.900" border="1px solid" borderColor="purple.500" borderRadius="xl" px={4} py={3}>
                    <Text fontSize="xs" color="purple.300" fontWeight="700" mb={2}>
                      🔍 இந்த பெயரில் ஏற்கனவே உறுப்பினர்கள் உள்ளனர் / Existing members found:
                    </Text>
                    <VStack spacing={2} align="stretch">
                      {offlineSearchResults.map(r => (
                        <HStack key={r.id} justify="space-between"
                          bg="whiteAlpha.100" borderRadius="lg" px={3} py={2}>
                          <VStack spacing={0} align="start">
                            <Text fontSize="sm" color="white" fontWeight="600">{r.name}</Text>
                            <Text fontSize="xs" color="whiteAlpha.500">
                              {r.gender} {r.kutham ? `• ${r.kutham}` : ''} • சேர்த்தவர்: {r.added_by}
                            </Text>
                          </VStack>
                          <Button size="xs" colorScheme="purple" borderRadius="lg"
                            onClick={() => {
                              setSelectedOfflineUser(r);
                              setOfflineName(r.name);
                              setOfflineGender(r.gender);
                              setOfflineSearchResults([]);
                            }}>
                            இதுவே ✓
                          </Button>
                        </HStack>
                      ))}
                      <Button size="sm" variant="ghost" color="whiteAlpha.500"
                        onClick={() => setOfflineSearchResults([])}
                        _hover={{ color: 'white' }}>
                        வேறு நபர் / Different person — create new
                      </Button>
                    </VStack>
                  </Box>
                )}

                {/* Confirmed existing node */}
                {selectedOfflineUser && (
                  <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}>
                    <HStack justify="space-between">
                      <VStack spacing={0} align="start">
                        <Text fontSize="xs" color="green.300" fontWeight="700">✅ ஏற்கனவே உள்ள உறுப்பினர் / Existing member confirmed</Text>
                        <Text fontSize="sm" color="white" fontWeight="600">{selectedOfflineUser.name}</Text>
                        <Text fontSize="xs" color="whiteAlpha.500">சேர்த்தவர்: {selectedOfflineUser.added_by}</Text>
                      </VStack>
                      <Button size="xs" variant="ghost" color="whiteAlpha.400"
                        onClick={() => { setSelectedOfflineUser(null); setOfflineName(''); }}
                        _hover={{ color: 'white' }}>
                        மாற்று
                      </Button>
                    </HStack>
                  </Box>
                )}
                {!selectedOfflineUser && (
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>Gender *</FormLabel>
                  <Select placeholder="Select gender" value={offlineGender}
                    onChange={e => setOfflineGender(e.target.value)} {...inputStyle}>
                    <option value="male" style={{ background: '#1e1b4b' }}>Male</option>
                    <option value="female" style={{ background: '#1e1b4b' }}>Female</option>
                  </Select>
                </FormControl>
                )}
              </>
            )}
          </VStack>
        </Box>

        {/* Result Section */}
        <Box {...sectionBox} py={{ base: 5, md: 6 }}>
          <VStack spacing={4} align="stretch">

            {/* Invite prompt for unregistered */}
            {showInvitePrompt && (
              <Box bg="yellow.900" border="1px solid" borderColor="yellow.500" borderRadius="xl" px={4} py={4}>
                <Text color="yellow.200" fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" mb={1}>
                  This number is not on frootze yet
                </Text>
                <Text color="yellow.300" fontSize="sm" mb={3}>
                  இந்த எண் frootze-ல் பதிவு செய்யப்படவில்லை. Invite அனுப்பலாம்.
                </Text>
                <Box bg="blue.900" border="1px solid" borderColor="blue.600"
                  borderRadius="xl" px={3} py={3} mb={3}>
                  <Text fontSize="xs" color="blue.200" fontWeight="700" mb={1}>How to share with family tree image:</Text>
                  <Text fontSize="xs" color="blue.300">1. Click "Send Invite" below</Text>
                  <Text fontSize="xs" color="blue.300">2. Tree image downloads automatically</Text>
                  <Text fontSize="xs" color="blue.300">3. WhatsApp opens with invite message</Text>
                  <Text fontSize="xs" color="blue.300">4. Attach image in WhatsApp and Send</Text>
                </Box>
                <HStack spacing={3}>
                  <Button flex={1} h="44px" bgGradient="linear(to-r, purple.600, green.500)"
                    color="white" fontSize="sm" fontWeight="700" borderRadius="xl"
                    isLoading={inviteLoading} loadingText="Sending..."
                    onClick={handleSendInvite}>
                    Send Invite / அழைப்பு அனுப்பு
                  </Button>
                  <Button flex={1} h="44px" variant="ghost" color="whiteAlpha.500"
                    fontSize="sm" borderRadius="xl"
                    onClick={() => setShowInvitePrompt(false)}
                    _hover={{ color: 'white' }}>
                    Cancel
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

            {/* Notification badges */}
            {!isOffline && success && whatsappLink && (
              <SimpleGrid columns={3} spacing={3}>
                {[
                  { key: 'whatsapp', icon: 'WhatsApp', label: 'WhatsApp' },
                  { key: 'email',    icon: 'Email',    label: 'Email'    },
                  { key: 'telegram', icon: 'Telegram', label: 'Telegram' },
                ].map(n => (
                  <Box key={n.key}
                    bg={notifStatus[n.key] ? 'green.900' : 'whiteAlpha.100'}
                    border="1px solid"
                    borderColor={notifStatus[n.key] ? 'green.500' : 'whiteAlpha.200'}
                    borderRadius="xl" px={3} py={3} textAlign="center">
                    <Text fontSize="xs" color={notifStatus[n.key] ? 'green.300' : 'whiteAlpha.400'}>
                      {notifStatus[n.key] ? 'Sent' : n.label}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}

            {/* Submit */}
            {!success && !showInvitePrompt && (
              <Button w="100%" h={{ base: '50px', md: '56px' }}
                bgGradient={isOffline ? 'linear(to-r, orange.600, orange.500)' : 'linear(to-r, purple.600, green.500)'}
                color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={loading} loadingText="Adding..."
                isDisabled={
                  isOffline
                    ? selectedOfflineUser
                      ? !relationType
                      : (!offlineName.trim() || !offlineGender || !relationType || offlineSearchResults.length > 0)
                    : (CHILD_RELATIONS.includes(relationType) && isMinor)
                    ? (!offlineName.trim() || !offlineGender || !relationType)
                    : (phone.length < 10 || !relationType)
                }
                onClick={handleAdd}
                _hover={{ transform: 'translateY(-2px)' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                {isOffline
                  ? 'Add to Tree'
                  : (CHILD_RELATIONS.includes(relationType) && isMinor)
                  ? 'Add Child'
                  : 'Send Request'}
              </Button>
            )}

            {success && (
              <HStack spacing={3}>
                {whatsappLink && (
                  <Button flex={1} h="50px" colorScheme="whatsapp" borderRadius="xl"
                    onClick={() => window.open(whatsappLink, '_blank')}>
                    Open WhatsApp
                  </Button>
                )}
                <Button flex={1} h="50px" variant="ghost" color="whiteAlpha.600" borderRadius="xl"
                  onClick={() => navigate('/dashboard')} _hover={{ color: 'white' }}>
                  Back to Dashboard
                </Button>
              </HStack>
            )}

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
