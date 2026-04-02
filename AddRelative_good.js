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
  { value: 'father',               tamil: 'α«àα«¬α»ìα«¬α«╛',                   english: 'Father'             },
  { value: 'mother',               tamil: 'α«àα««α»ìα««α«╛',                   english: 'Mother'             },
  { value: 'spouse',               tamil: 'α««α«⌐α»êα«╡α«┐/α«òα«úα«╡α«⌐α»ì',            english: 'Spouse'             },
  { value: 'brother',              tamil: 'α«àα«úα»ìα«úα«⌐α»ì/α«ñα««α»ìα«¬α«┐',           english: 'Brother'            },
  { value: 'sister',               tamil: 'α«àα«òα»ìα«òα«╛/α«ñα«Öα»ìα«òα»ê',            english: 'Sister'             },
  { value: 'son',                  tamil: 'α««α«òα«⌐α»ì',                    english: 'Son'                },
  { value: 'daughter',             tamil: 'α««α«òα«│α»ì',                    english: 'Daughter'           },
  { value: 'grandfather_paternal', tamil: 'α«ñα«╛α«ñα»ìα«ñα«╛ (α«àα«¬α»ìα«¬α«╛ α«¬α«òα»ìα«òα««α»ì)', english: 'Grandfather (Paternal)' },
  { value: 'grandmother_paternal', tamil: 'α«¬α«╛α«ƒα»ìα«ƒα«┐ (α«àα«¬α»ìα«¬α«╛ α«¬α«òα»ìα«òα««α»ì)', english: 'Grandmother (Paternal)' },
  { value: 'grandfather_maternal', tamil: 'α«ñα«╛α«ñα»ìα«ñα«╛ (α«àα««α»ìα««α«╛ α«¬α«òα»ìα«òα««α»ì)', english: 'Grandfather (Maternal)' },
  { value: 'grandmother_maternal', tamil: 'α«¬α«╛α«ƒα»ìα«ƒα«┐ (α«àα««α»ìα««α«╛ α«¬α«òα»ìα«òα««α»ì)', english: 'Grandmother (Maternal)' },
  { value: 'grandson',             tamil: 'α«¬α»çα«░α«⌐α»ì',                   english: 'Grandson'           },
  { value: 'granddaughter',        tamil: 'α«¬α»çα«ñα»ìα«ñα«┐',                  english: 'Granddaughter'      },
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
  const [notifStatus, setNotifStatus] = useState({ whatsapp: false, email: false, telegram: false });
  const [whatsappLink, setWhatsappLink] = useState('');

  const selectedRelation = RELATIONS.find(r => r.value === relationType);

  const handleAdd = async () => {
    setError(''); setSuccess(''); setShowInvitePrompt(false);
    if (!relationType) { setError('α«ëα«▒α«╡α»ê α«ñα»çα«░α»ìα«╡α»ü α«Üα»åα«»α»ìα«»α«╡α»üα««α»ì'); return; }
    const isChildRelation = CHILD_RELATIONS.includes(relationType);
    if (isOffline) {
      if (!offlineName.trim()) { setError('α«¬α»åα«»α«░α»ì α«ëα«│α»ìα«│α«┐α«ƒα«╡α»üα««α»ì'); return; }
      if (!offlineGender) { setError('α«¬α«╛α«▓α«┐α«⌐α««α»ì α«ñα»çα«░α»ìα«╡α»ü α«Üα»åα«»α»ìα«»α«╡α»üα««α»ì'); return; }
    } else if (isChildRelation && isMinor) {
      if (!offlineName.trim()) { setError('α«òα»üα«┤α«¿α»ìα«ñα»êα«»α«┐α«⌐α»ì α«¬α»åα«»α«░α»ì α«ëα«│α»ìα«│α«┐α«ƒα«╡α»üα««α»ì'); return; }
      if (!offlineGender) { setError('α«¬α«╛α«▓α«┐α«⌐α««α»ì α«ñα»çα«░α»ìα«╡α»ü α«Üα»åα«»α»ìα«»α«╡α»üα««α»ì'); return; }
    } else {
      if (!phone || phone.length < 10) { setError('α«Üα«░α«┐α«»α«╛α«⌐ 10 α«çα«▓α«òα»ìα«ò α«Äα«úα»ì α«ëα«│α»ìα«│α«┐α«ƒα«╡α»üα««α»ì'); return; }
    }
    setLoading(true);
    try {
      const isChildRelation2 = CHILD_RELATIONS.includes(relationType);
      if (isOffline || (isChildRelation2 && isMinor)) {
        await api.post('/api/relationships', {
          relation_type: relationType, relation_tamil: selectedRelation?.tamil,
          is_offline: true, offline_name: offlineName.trim(), offline_gender: offlineGender,
        });
        const label = isOffline ? '≡ƒòè∩╕Å' : '≡ƒæ╢';
        setSuccess(`${label} ${offlineName} α«òα»üα«ƒα»üα««α»ìα«¬ α««α«░α«ñα»ìα«ñα«┐α«▓α»ì α«Üα»çα«░α»ìα«òα»ìα«òα«¬α»ìα«¬α«ƒα»ìα«ƒα«╛α«░α»ì`);
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
        setSuccess(`Γ£à α«òα»ïα«░α«┐α«òα»ìα«òα»ê α«àα«⌐α»üα«¬α»ìα«¬α«¬α»ìα«¬α«ƒα»ìα«ƒα«ñα»ü! ${selectedRelation?.tamil} α«ëα«Öα»ìα«òα«│α»ì α«òα»ïα«░α«┐α«òα»ìα«òα»êα«»α»ê Dashboard-α«▓α»ì α«òα«╛α«úα»ìα«¬α«╛α«░α»ì.`);
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
        setError(errorMsg || 'α«Üα»çα«░α»ìα«òα»ìα«ò α«ñα»ïα«▓α»ìα«╡α«┐ / Failed');
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
        return `ΓÇó ${nm} (${m.relation_tamil})`;
      }).join('\n');

      const waText =
        `≡ƒî│ ${user?.name} α«ëα«Öα»ìα«òα«│α»ê frootze α«òα»üα«ƒα»üα««α»ìα«¬ α««α«░α«ñα»ìα«ñα«┐α«▓α»ì α«Üα»çα«░ α«àα«┤α»êα«òα»ìα«òα«┐α«▒α«╛α«░α»ì!\n\n` +
        (memberLines ? `α«¿α««α«ñα»ü α«òα»üα«ƒα»üα««α»ìα«¬α«ñα»ìα«ñα«┐α«⌐α«░α»ì:\n${memberLines}\n\n` : '') +
        `α«çα«¬α»ìα«¬α»ïα«ñα»ç α«Üα»çα«░α»üα«Öα»ìα«òα«│α»ì:\nhttps://frootze.com\n\nα«çα«▓α«╡α«Üα««α»ì ≡ƒî│`;

      setTimeout(() => {
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(waText)}`, '_blank');
      }, cachedTree ? 800 : 0);

      setSuccess(cachedTree
        ? 'Γ£à α«¬α«ƒα««α»ì α«¬α«ñα«┐α«╡α«┐α«▒α«òα»ìα«òα««α»ì α«åα«⌐α«ñα»ü! WhatsApp α«ñα«┐α«▒α«òα»ìα«òα»üα««α»ì ΓÇö α«¬α«ƒα«ñα»ìα«ñα»ê ≡ƒôÄ α««α»éα«▓α««α»ì α«çα«úα»êα«ñα»ìα«ñα»ü α«àα«⌐α»üα«¬α»ìα«¬α«╡α»üα««α»ì.\nImage downloaded! Open WhatsApp ΓåÆ tap ≡ƒôÄ ΓåÆ attach image ΓåÆ Send'
        : '≡ƒô¿ α«àα«┤α»êα«¬α»ìα«¬α»ü α«àα«⌐α»üα«¬α»ìα«¬α«¬α»ìα«¬α«ƒα»ìα«ƒα«ñα»ü!');

    } catch(e) {
      setSuccess('≡ƒô¿ α«àα«┤α»êα«¬α»ìα«¬α»ü α«àα«⌐α»üα«¬α»ìα«¬α«¬α»ìα«¬α«ƒα»ìα«ƒα«ñα»ü!');
    } finally { setInviteLoading(false); }
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox} py={5}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>ΓåÉ</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">≡ƒæ¿ΓÇì≡ƒæ⌐ΓÇì≡ƒæº α«òα»üα«ƒα»üα««α»ìα«¬α«ñα»ìα«ñα«┐α«⌐α«░α»ê α«Üα»çα«░α»ì</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Add Family Member</Text>
            </Box>
          </HStack>
        </Box>

        {/* Online / Offline Toggle */}
        <Box {...sectionBox} py={4}>
          <Text fontSize="sm" fontWeight="600" color="whiteAlpha.700" mb={3}>
            α«çα«╡α«░α»ì frootze-α«▓α»ì α«ëα«│α»ìα«│α«╛α«░α«╛? / Are they on frootze?
          </Text>
          <HStack spacing={3}>
            <Button flex={1} h="48px"
              bg={!isOffline ? 'purple.600' : 'whiteAlpha.100'}
              color={!isOffline ? 'white' : 'whiteAlpha.600'}
              border="1px solid" borderColor={!isOffline ? 'purple.400' : 'whiteAlpha.200'}
              borderRadius="xl" fontSize="sm" fontWeight="700"
              onClick={() => { setIsOffline(false); setError(''); setSuccess(''); }}
              _hover={{ bg: !isOffline ? 'purple.700' : 'whiteAlpha.200' }}>
              ≡ƒô▒ α«åα««α»ì ΓÇö frootze-α«▓α»ì α«ëα«│α»ìα«│α«╛α«░α»ì / Yes
            </Button>
            <Button flex={1} h="48px"
              bg={isOffline ? 'orange.700' : 'whiteAlpha.100'}
              color={isOffline ? 'white' : 'whiteAlpha.600'}
              border="1px solid" borderColor={isOffline ? 'orange.400' : 'whiteAlpha.200'}
              borderRadius="xl" fontSize="sm" fontWeight="700"
              onClick={() => { setIsOffline(true); setError(''); setSuccess(''); }}
              _hover={{ bg: isOffline ? 'orange.800' : 'whiteAlpha.200' }}>
              ≡ƒòè∩╕Å α«çα«▓α»ìα«▓α»ê ΓÇö α«òα«╛α«▓α««α«╛α«⌐α«╡α«░α»ì / Deceased
            </Button>
          </HStack>
        </Box>

        {/* Form */}
        <Box {...sectionBox} py={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" color="whiteAlpha.800">
              α«àα«ƒα«┐α«¬α»ìα«¬α«ƒα»ê α«╡α«┐α«╡α«░α««α»ì / Basic Details
            </Text>

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>α«ëα«▒α«╡α»ü / Relation *</FormLabel>
              <Select placeholder="α«ëα«▒α«╡α»ê α«ñα»çα«░α»ìα«╡α»ü α«Üα»åα«»α»ìα«»α«╡α»üα««α»ì" value={relationType}
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
                    <Text fontSize="sm" color="white" fontWeight="600">≡ƒæ╢ 18 α«╡α«»α«ñα»üα«òα»ìα«òα»ü α«òα»Çα«┤α«╛? / Under 18?</Text>
                    <Text fontSize="xs" color="whiteAlpha.500">Minor ΓÇö phone number optional</Text>
                  </Box>
                  <HStack spacing={2}>
                    <Button size="xs" bg={!isMinor ? 'purple.600' : 'whiteAlpha.200'} color="white"
                      onClick={() => setIsMinor(false)}>α«çα«▓α»ìα«▓α»ê</Button>
                    <Button size="xs" bg={isMinor ? 'blue.600' : 'whiteAlpha.200'} color="white"
                      onClick={() => setIsMinor(true)}>α«åα««α»ì</Button>
                  </HStack>
                </HStack>
                {isMinor && (
                  <Text fontSize="xs" color="blue.300" mt={2}>
                    α«¬α»åα«»α«░α»ì α««α«ƒα»ìα«ƒα»üα««α»ì α«¬α»ïα«ñα»üα««α»ì ΓÇö α«ñα»èα«▓α»êα«¬α»çα«Üα«┐ α«ñα»çα«╡α»êα«»α«┐α«▓α»ìα«▓α»ê / Phone not required for minors
                  </Text>
                )}
              </Box>
            )}

            {!isOffline && (!CHILD_RELATIONS.includes(relationType) || !isMinor) && (
              <>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>α«ñα»èα«▓α»êα«¬α»çα«Üα«┐ α«Äα«úα»ì / Phone *</FormLabel>
                  <InputGroup size="lg">
                    <InputLeftAddon bg="whiteAlpha.200" border="1px solid" borderColor="whiteAlpha.300"
                      color="white" fontSize="sm" fontWeight="600" h={{ base: '50px', md: '56px' }} px={4}>
                      ≡ƒç«≡ƒç│ +91
                    </InputLeftAddon>
                    <Input type="tel" maxLength={10} placeholder="9999999999"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      {...inputStyle} />
                  </InputGroup>
                </FormControl>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>≡ƒôº Email (optional)</FormLabel>
                  <Input type="email" placeholder="relative@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} {...inputStyle} />
                </FormControl>
                <Box bg="purple.900" border="1px solid" borderColor="purple.600" borderRadius="xl" px={4} py={3}>
                  <Text fontSize="xs" color="purple.300" fontWeight="600" mb={1}>≡ƒÆí α«òα»üα«▒α«┐α«¬α»ìα«¬α»ü / Note</Text>
                  <Text fontSize="xs" color="purple.200">α«òα»ïα«░α«┐α«òα»ìα«òα»ê α«àα«⌐α»üα«¬α»ìα«¬α«┐α«»α«ñα»üα««α»ì WhatsApp α«ñα«╛α«⌐α«╛α«ò α«ñα«┐α«▒α«òα»ìα«òα»üα««α»ì. α«àα«╡α«░α»ì frootze Dashboard-α«▓α»ì α«Åα«▒α»ìα«òα«▓α«╛α««α»ì.</Text>
                </Box>
              </>
            )}

            {/* Minor child name+gender fields */}
            {!isOffline && CHILD_RELATIONS.includes(relationType) && isMinor && (
              <>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>α«òα»üα«┤α«¿α»ìα«ñα»êα«»α«┐α«⌐α»ì α«¬α»åα«»α«░α»ì / Child's Name *</FormLabel>
                  <Input placeholder="α«ëα«ñα«╛: Raman Kumar" value={offlineName}
                    onChange={e => setOfflineName(e.target.value)} {...inputStyle} />
                </FormControl>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>α«¬α«╛α«▓α«┐α«⌐α««α»ì / Gender *</FormLabel>
                  <Select placeholder="α«ñα»çα«░α»ìα«╡α»ü α«Üα»åα«»α»ìα«»α«╡α»üα««α»ì" value={offlineGender}
                    onChange={e => setOfflineGender(e.target.value)} {...inputStyle}>
                    <option value="male" style={{ background: '#1e1b4b' }}>α«åα«úα»ì / Male</option>
                    <option value="female" style={{ background: '#1e1b4b' }}>α«¬α»åα«úα»ì / Female</option>
                  </Select>
                </FormControl>
              </>
            )}

            {isOffline && (
              <>
                <Box bg="orange.900" border="1px solid" borderColor="orange.600" borderRadius="xl" px={4} py={3}>
                  <Text fontSize="xs" color="orange.300" fontWeight="600" mb={1}>≡ƒòè∩╕Å α«òα«╛α«▓α««α«╛α«⌐α«╡α«░α»ì / Deceased Member</Text>
                  <Text fontSize="xs" color="orange.200">α«çα«╡α«░α»ì α«¿α»çα«░α«ƒα«┐α«»α«╛α«ò α«òα»üα«ƒα»üα««α»ìα«¬ α««α«░α«ñα»ìα«ñα«┐α«▓α»ì α«Üα»çα«░α»ìα«òα»ìα«òα«¬α»ìα«¬α«ƒα»üα«╡α«╛α«░α»ì. α«ñα»èα«▓α»êα«¬α»çα«Üα«┐ α«ñα»çα«╡α»êα«»α«┐α«▓α»ìα«▓α»ê.</Text>
                </Box>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>α«¬α»åα«»α«░α»ì / Name *</FormLabel>
                  <Input placeholder="α«ëα«ñα«╛: Raman Kumar" value={offlineName}
                    onChange={e => setOfflineName(e.target.value)} {...inputStyle} />
                </FormControl>
                <FormControl>
                  <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>α«¬α«╛α«▓α«┐α«⌐α««α»ì / Gender *</FormLabel>
                  <Select placeholder="α«ñα»çα«░α»ìα«╡α»ü α«Üα»åα«»α»ìα«»α«╡α»üα««α»ì" value={offlineGender}
                    onChange={e => setOfflineGender(e.target.value)} {...inputStyle}>
                    <option value="male" style={{ background: '#1e1b4b' }}>α«åα«úα»ì / Male</option>
                    <option value="female" style={{ background: '#1e1b4b' }}>α«¬α»åα«úα»ì / Female</option>
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
                  ΓÜá∩╕Å α«çα«¿α»ìα«ñ α«Äα«úα»ì frootze-α«▓α»ì α«¬α«ñα«┐α«╡α»ü α«Üα»åα«»α»ìα«»α«¬α»ìα«¬α«ƒα«╡α«┐α«▓α»ìα«▓α»ê
                </Text>
                <Text color="yellow.300" fontSize="sm" mb={3}>
                  This number is not on frootze yet.
                </Text>
                <Box bg="blue.900" border="1px solid" borderColor="blue.600"
                  borderRadius="xl" px={3} py={3} mb={3}>
                  <Text fontSize="xs" color="blue.200" fontWeight="700" mb={1}>
                    ≡ƒôï How to share with family tree image:
                  </Text>
                  <Text fontSize="xs" color="blue.300">1∩╕ÅΓâú Click "Send Invite" below</Text>
                  <Text fontSize="xs" color="blue.300">2∩╕ÅΓâú Tree image downloads automatically</Text>
                  <Text fontSize="xs" color="blue.300">3∩╕ÅΓâú WhatsApp opens with invite message</Text>
                  <Text fontSize="xs" color="blue.300">4∩╕ÅΓâú Tap ≡ƒôÄ in WhatsApp ΓåÆ attach image ΓåÆ Send</Text>
                  <Text fontSize="xs" color="blue.400" mt={1} fontStyle="italic">
                    Full auto-share available in the frootze mobile app
                  </Text>
                </Box>
                <HStack spacing={3}>
                  <Button flex={1} h="44px" bgGradient="linear(to-r, purple.600, green.500)"
                    color="white" fontSize="sm" fontWeight="700" borderRadius="xl"
                    isLoading={inviteLoading} loadingText="α«àα«⌐α»üα«¬α»ìα«¬α»üα«òα«┐α«▒α»ïα««α»ì..."
                    onClick={handleSendInvite}>
                    ≡ƒô¿ α«àα«┤α»êα«¬α»ìα«¬α»ü α«àα«⌐α»üα«¬α»ìα«¬α»ü / Send Invite
                  </Button>
                  <Button flex={1} h="44px" variant="ghost" color="whiteAlpha.500"
                    fontSize="sm" borderRadius="xl"
                    onClick={() => setShowInvitePrompt(false)}
                    _hover={{ color: 'white' }}>
                    α«░α«ñα»ìα«ñα»ü / Cancel
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
                  { key: 'whatsapp', icon: '≡ƒô▒', label: 'WhatsApp' },
                  { key: 'email',    icon: '≡ƒôº', label: 'Email'    },
                  { key: 'telegram', icon: 'Γ£ê∩╕Å', label: 'Telegram' },
                ].map(n => (
                  <Box key={n.key}
                    bg={notifStatus[n.key] ? 'green.900' : 'whiteAlpha.100'}
                    border="1px solid"
                    borderColor={notifStatus[n.key] ? 'green.500' : 'whiteAlpha.200'}
                    borderRadius="xl" px={3} py={3} textAlign="center">
                    <Text fontSize="xl">{n.icon}</Text>
                    <Text fontSize="xs" color={notifStatus[n.key] ? 'green.300' : 'whiteAlpha.400'} mt={1}>
                      {notifStatus[n.key] ? 'Γ£ô Sent' : n.label}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}

            {!success && !showInvitePrompt && (
              <Button w="100%" h={{ base: '50px', md: '56px' }}
                bgGradient={isOffline ? 'linear(to-r, orange.600, orange.500)' : 'linear(to-r, purple.600, green.500)'}
                color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={loading} loadingText="α«Üα»çα«░α»ìα«òα»ìα«òα«┐α«▒α»ïα««α»ì..."
                isDisabled={
                  isOffline ? (!offlineName.trim() || !offlineGender || !relationType) :
                  (CHILD_RELATIONS.includes(relationType) && isMinor) ? (!offlineName.trim() || !offlineGender || !relationType) :
                  (phone.length < 10 || !relationType)
                }
                onClick={handleAdd}
                _hover={{ transform: 'translateY(-2px)' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                {isOffline ? '≡ƒòè∩╕Å α«òα»üα«ƒα»üα««α»ìα«¬ α««α«░α«ñα»ìα«ñα«┐α«▓α»ì α«Üα»çα«░α»ì / Add to Tree' :
                     (CHILD_RELATIONS.includes(relationType) && isMinor) ? '≡ƒæ╢ α«òα»üα«┤α«¿α»ìα«ñα»êα«»α»ê α«Üα»çα«░α»ì / Add Child' :
                     '≡ƒæ¿ΓÇì≡ƒæ⌐ΓÇì≡ƒæº α«òα»ïα«░α«┐α«òα»ìα«òα»ê α«àα«⌐α»üα«¬α»ìα«¬α»ü / Send Request'}
              </Button>
            )}

            {success && (
              <HStack spacing={3}>
                {whatsappLink && (
                  <Button flex={1} h="50px" colorScheme="whatsapp" borderRadius="xl"
                    onClick={() => window.open(whatsappLink, '_blank')}>
                    ≡ƒô▒ WhatsApp α««α»Çα«úα»ìα«ƒα»üα««α»ì α«ñα«┐α«▒
                  </Button>
                )}
                <Button flex={1} h="50px" variant="ghost" color="whiteAlpha.600" borderRadius="xl"
                  onClick={() => navigate('/dashboard')} _hover={{ color: 'white' }}>
                  ΓåÉ Dashboard
                </Button>
              </HStack>
            )}

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
