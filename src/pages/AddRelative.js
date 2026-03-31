import { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, HStack, Text, Button, Input, Spinner,
  Badge, Avatar
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RELATIONS = [
  { value: 'father',   tamil: 'அப்பா',          emoji: '👨', label: 'Father'   },
  { value: 'mother',   tamil: 'அம்மா',          emoji: '👩', label: 'Mother'   },
  { value: 'spouse',   tamil: 'மனைவி/கணவன்',   emoji: '💑', label: 'Spouse'   },
  { value: 'brother',  tamil: 'அண்ணன்/தம்பி',  emoji: '👦', label: 'Brother'  },
  { value: 'sister',   tamil: 'அக்கா/தங்கை',   emoji: '👧', label: 'Sister'   },
  { value: 'son',      tamil: 'மகன்',           emoji: '🧒', label: 'Son'      },
  { value: 'daughter', tamil: 'மகள்',           emoji: '👶', label: 'Daughter' },
];

const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white',
  h: '52px', fontSize: 'md', borderRadius: 'xl',
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
};

export default function AddRelative() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone]               = useState('');
  const [relationType, setRelationType] = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

  // Chain detection state
  const [chainLoading, setChainLoading]     = useState(false);
  const [chainData, setChainData]           = useState(null);   // full response
  const [chainDetected, setChainDetected]   = useState(false);
  const chainTimer = useRef(null);

  // Offline member state
  const [isOffline, setIsOffline]       = useState(false);
  const [offlineName, setOfflineName]   = useState('');
  const [offlineGender, setOfflineGender] = useState('male');

  const selectedRelation = RELATIONS.find(r => r.value === relationType);

  // Auto-trigger chain detect when phone is 10 digits
  useEffect(() => {
    if (isOffline) return;
    if (phone.replace(/\D/g,'').length === 10) {
      clearTimeout(chainTimer.current);
      chainTimer.current = setTimeout(() => detectChain(phone), 600);
    } else {
      setChainData(null);
      setChainDetected(false);
    }
    return () => clearTimeout(chainTimer.current);
  }, [phone, isOffline]);

  // Auto-fill suggested relation from chain
  useEffect(() => {
    if (chainData?.suggested_relation?.type && !relationType) {
      const match = RELATIONS.find(r => r.value === chainData.suggested_relation.type);
      if (match) setRelationType(match.value);
    }
  }, [chainData]);

  const detectChain = async (ph) => {
    setChainLoading(true);
    try {
      const res = await api.get(`/api/relationships/chain-detect?to_phone=${ph.replace(/\D/g,'')}`);
      setChainData(res.data);
      setChainDetected(true);
    } catch(e) {
      setChainData(null);
    } finally {
      setChainLoading(false);
    }
  };

  const handleAdd = async () => {
    setError(''); setSuccess(''); setWhatsappLink('');
    if (!isOffline) {
      if (!phone || phone.replace(/\D/g,'').length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
      if (!relationType) { setError('உறவை தேர்வு செய்யவும்'); return; }
    } else {
      if (!offlineName.trim()) { setError('பெயர் உள்ளிடவும்'); return; }
      if (!relationType)       { setError('உறவை தேர்வு செய்யவும்'); return; }
    }
    setLoading(true);
    try {
      const payload = isOffline
        ? { relation_type: relationType, relation_tamil: selectedRelation?.tamil, is_offline: true, offline_name: offlineName.trim(), offline_gender: offlineGender }
        : { to_user_phone: phone, relation_type: relationType, relation_tamil: selectedRelation?.tamil };

      const res = await api.post('/api/relationships', payload);

      if (res.data.success) {
        setSuccess(isOffline ? `${offlineName} குடும்ப மரத்தில் சேர்க்கப்பட்டார்` : `கோரிக்கை அனுப்பப்பட்டது!`);
        setWhatsappLink(res.data.whatsapp_link || '');
        setPhone(''); setRelationType(''); setOfflineName('');
        setChainData(null); setChainDetected(false);
      }
    } catch (e) {
      const msg = e.response?.data?.error || 'பிழை ஏற்பட்டது';
      if (e.response?.status === 404 && e.response?.data?.invite_saved) {
        setError('இந்த எண் பதிவு செய்யப்படவில்லை. WhatsApp மூலம் அழைக்கவும்.');
        setWhatsappLink(e.response?.data?.whatsapp_link || '');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  };

  // Chain visualization component
  const ChainCard = () => {
    if (!chainDetected || !chainData) return null;

    if (!chainData.target_found) return (
      <Box bg="orange.900" border="1px solid" borderColor="orange.500" borderRadius="xl" px={4} py={3}>
        <Text color="orange.200" fontSize="sm">⚠️ இந்த எண் frootze-ல் பதிவு செய்யப்படவில்லை</Text>
        <Text color="orange.300" fontSize="xs" mt={1}>They need to register first. You can still send a WhatsApp invite after adding.</Text>
      </Box>
    );

    if (chainData.already_connected) return (
      <Box bg="blue.900" border="1px solid" borderColor="blue.500" borderRadius="xl" px={4} py={3}>
        <Text color="blue.200" fontSize="sm">ℹ️ Already connected in your family tree</Text>
      </Box>
    );

    if (!chainData.chain) return (
      <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="xl" px={4} py={3}>
        <Text color="white" fontSize="sm" fontWeight="600">✅ Registered on frootze</Text>
        <Text color="whiteAlpha.500" fontSize="xs" mt={1}>No existing family connection found. Select relation manually.</Text>
      </Box>
    );

    // Chain found — show visual
    return (
      <Box bg="whiteAlpha.100" border="1px solid" borderColor="purple.500" borderRadius="xl" px={4} py={4}>
        <Text color="purple.300" fontSize="xs" fontWeight="700" mb={3}>🔗 குடும்ப தொடர்பு கண்டறியப்பட்டது / Connection Found</Text>

        <HStack spacing={0} flexWrap="wrap" align="center" gap={1}>
          {chainData.chain.map((node, idx) => (
            <HStack key={idx} spacing={1} align="center">
              {/* Node */}
              <VStack spacing={1} align="center">
                <Avatar size="xs" name={node.user.name}
                  bg={node.connected ? 'purple.600' : 'gray.600'}
                  border="2px solid"
                  borderColor={node.connected ? 'green.400' : 'gray.500'}/>
                <Text fontSize="2xs" color={node.connected ? 'white' : 'whiteAlpha.500'}
                  maxW="60px" textAlign="center" noOfLines={1}>
                  {node.user.name}
                </Text>
                {!node.connected && idx > 0 && (
                  <Badge colorScheme="green" fontSize="2xs">New</Badge>
                )}
              </VStack>

              {/* Arrow + relation */}
              {idx < chainData.chain.length - 1 && (
                <VStack spacing={0} align="center" mx={1}>
                  <Text fontSize="2xs" color="yellow.300" fontWeight="700" textAlign="center">
                    {chainData.chain[idx].rel_tamil || chainData.chain[idx].relation_to_next}
                  </Text>
                  <Text color="purple.300" fontSize="md">→</Text>
                </VStack>
              )}
            </HStack>
          ))}
        </HStack>

        {chainData.suggested_relation && (
          <Box mt={3} bg="green.900" border="1px solid" borderColor="green.600" borderRadius="lg" px={3} py={2}>
            <Text fontSize="xs" color="green.300">
              💡 Suggested: <Text as="span" fontWeight="700">
                {chainData.suggested_relation.tamil} / {chainData.suggested_relation.type}
              </Text> — auto-selected below
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="600px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <HStack spacing={3} mb={2}>
          <Button size="sm" variant="ghost" color="whiteAlpha.600" onClick={() => navigate('/dashboard')}
            _hover={{ color: 'white' }}>← Back</Button>
          <Text fontSize="xl" fontWeight="800" color="white">👨‍👩‍👧‍👦 குடும்பத்தினரை சேர்</Text>
        </HStack>

        {/* Toggle Online / Offline */}
        <HStack bg="whiteAlpha.100" borderRadius="xl" p={1}>
          <Button flex={1} size="sm" borderRadius="lg"
            bg={!isOffline ? 'purple.600' : 'transparent'}
            color={!isOffline ? 'white' : 'whiteAlpha.500'}
            onClick={() => { setIsOffline(false); setError(''); setSuccess(''); }}
            _hover={{ bg: !isOffline ? 'purple.600' : 'whiteAlpha.100' }}>
            📱 frootze பயனர்
          </Button>
          <Button flex={1} size="sm" borderRadius="lg"
            bg={isOffline ? 'gray.600' : 'transparent'}
            color={isOffline ? 'white' : 'whiteAlpha.500'}
            onClick={() => { setIsOffline(true); setChainData(null); setError(''); setSuccess(''); }}
            _hover={{ bg: isOffline ? 'gray.600' : 'whiteAlpha.100' }}>
            🕊️ காலமானவர் / Offline
          </Button>
        </HStack>

        {/* Phone input (online) */}
        {!isOffline && (
          <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={5} py={5}>
            <Text fontSize="sm" color="whiteAlpha.600" mb={2}>தொலைபேசி எண் / Phone Number</Text>
            <HStack>
              <Box bg="whiteAlpha.200" borderRadius="xl" px={3} h="52px" display="flex" alignItems="center">
                <Text color="white" fontSize="md">+91</Text>
              </Box>
              <Input flex={1} placeholder="10 digit mobile number" value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); setSuccess(''); }}
                maxLength={10} type="tel" {...inputStyle}/>
              {chainLoading && <Spinner color="purple.300" size="sm"/>}
            </HStack>
          </Box>
        )}

        {/* Offline name input */}
        {isOffline && (
          <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={5} py={5}>
            <Text fontSize="sm" color="whiteAlpha.600" mb={2}>பெயர் / Name</Text>
            <Input placeholder="பெயர் உள்ளிடவும்" value={offlineName}
              onChange={e => setOfflineName(e.target.value)} {...inputStyle}/>
            <Text fontSize="sm" color="whiteAlpha.600" mt={3} mb={2}>பாலினம் / Gender</Text>
            <HStack>
              {['male','female','other'].map(g => (
                <Button key={g} flex={1} size="sm" borderRadius="lg"
                  bg={offlineGender === g ? 'purple.600' : 'whiteAlpha.100'}
                  color={offlineGender === g ? 'white' : 'whiteAlpha.500'}
                  onClick={() => setOfflineGender(g)}
                  _hover={{ bg: offlineGender === g ? 'purple.600' : 'whiteAlpha.200' }}>
                  {g === 'male' ? '👨 Male' : g === 'female' ? '👩 Female' : '⚧ Other'}
                </Button>
              ))}
            </HStack>
          </Box>
        )}

        {/* Chain detection card */}
        {!isOffline && <ChainCard/>}

        {/* Relation selector */}
        <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={5} py={5}>
          <Text fontSize="sm" color="whiteAlpha.600" mb={3}>உறவு முறை / Relation Type</Text>
          <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
            {RELATIONS.map(r => (
              <Button key={r.value} size="sm" borderRadius="xl" h="60px"
                flexDirection="column" gap={1}
                bg={relationType === r.value ? 'purple.600' : 'whiteAlpha.100'}
                color={relationType === r.value ? 'white' : 'whiteAlpha.600'}
                border="1px solid"
                borderColor={relationType === r.value ? 'purple.400' : 'whiteAlpha.200'}
                onClick={() => setRelationType(r.value)}
                _hover={{ bg: relationType === r.value ? 'purple.600' : 'whiteAlpha.200' }}>
                <Text fontSize="lg">{r.emoji}</Text>
                <Text fontSize="2xs">{r.tamil}</Text>
              </Button>
            ))}
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}>
            <Text color="red.200" fontSize="sm">{error}</Text>
          </Box>
        )}

        {/* Success */}
        {success && (
          <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}>
            <Text color="green.200" fontSize="sm">✅ {success}</Text>
            {whatsappLink && (
              <Button as="a" href={whatsappLink} target="_blank" size="sm" mt={2}
                bg="green.600" color="white" borderRadius="xl" _hover={{ bg: 'green.500' }}>
                📱 WhatsApp அனுப்பு
              </Button>
            )}
          </Box>
        )}

        {/* WhatsApp invite for unregistered */}
        {!success && whatsappLink && (
          <Box bg="orange.900" border="1px solid" borderColor="orange.500" borderRadius="xl" px={4} py={3}>
            <Text color="orange.200" fontSize="sm" mb={2}>📲 Invite them to join frootze first:</Text>
            <Button as="a" href={whatsappLink} target="_blank" size="sm"
              bg="green.600" color="white" borderRadius="xl" _hover={{ bg: 'green.500' }}>
              💬 WhatsApp Invite
            </Button>
          </Box>
        )}

        {/* Submit button */}
        <Button h="56px" bgGradient="linear(to-r, purple.600, green.500)"
          color="white" fontSize="lg" fontWeight="700" borderRadius="xl"
          isLoading={loading} loadingText="அனுப்புகிறோம்..."
          onClick={handleAdd}
          isDisabled={isOffline ? (!offlineName || !relationType) : (!phone || !relationType)}>
          {isOffline ? '🌳 மரத்தில் சேர்' : '📨 கோரிக்கை அனுப்பு / Send Request'}
        </Button>

      </VStack>
    </Box>
  );
}
