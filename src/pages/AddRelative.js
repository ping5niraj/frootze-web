import { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, HStack, Text, Button, Input, Spinner, Badge
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Core 7 — for manual add without chain
const CORE_RELATIONS = [
  { value: 'father',   tamil: 'அப்பா',         emoji: '👨', label: 'Father'   },
  { value: 'mother',   tamil: 'அம்மா',         emoji: '👩', label: 'Mother'   },
  { value: 'spouse',   tamil: 'மனைவி/கணவன்',  emoji: '💑', label: 'Spouse'   },
  { value: 'brother',  tamil: 'அண்ணன்/தம்பி', emoji: '👦', label: 'Brother'  },
  { value: 'sister',   tamil: 'அக்கா/தங்கை',  emoji: '👧', label: 'Sister'   },
  { value: 'son',      tamil: 'மகன்',          emoji: '🧒', label: 'Son'      },
  { value: 'daughter', tamil: 'மகள்',          emoji: '👶', label: 'Daughter' },
];

// Extended — shown when manually overriding chain suggestion
const ALL_RELATIONS = [
  ...CORE_RELATIONS,
  { value: 'nephew',               tamil: 'மருமகன்',                 emoji: '👦', label: 'Nephew'          },
  { value: 'niece',                tamil: 'மருமகள்',                 emoji: '👧', label: 'Niece'           },
  { value: 'uncle_paternal',       tamil: 'பெரியப்பா/சித்தப்பா',   emoji: '👴', label: 'Uncle (Paternal)'},
  { value: 'aunt_paternal',        tamil: 'அத்தை',                   emoji: '👵', label: 'Aunt (Paternal)' },
  { value: 'uncle_maternal',       tamil: 'மாமா',                    emoji: '👴', label: 'Uncle (Maternal)'},
  { value: 'aunt_maternal',        tamil: 'சித்தி',                  emoji: '👵', label: 'Aunt (Maternal)' },
  { value: 'grandfather_paternal', tamil: 'தாத்தா (அப்பா பக்கம்)', emoji: '👴', label: 'Grandfather (P)' },
  { value: 'grandmother_paternal', tamil: 'பாட்டி (அப்பா பக்கம்)', emoji: '👵', label: 'Grandmother (P)' },
  { value: 'grandfather_maternal', tamil: 'தாத்தா (அம்மா பக்கம்)', emoji: '👴', label: 'Grandfather (M)' },
  { value: 'grandmother_maternal', tamil: 'பாட்டி (அம்மா பக்கம்)', emoji: '👵', label: 'Grandmother (M)' },
  { value: 'grandson',             tamil: 'பேரன்',                   emoji: '🧒', label: 'Grandson'        },
  { value: 'granddaughter',        tamil: 'பேத்தி',                  emoji: '👶', label: 'Granddaughter'   },
  { value: 'cousin',               tamil: 'உறவினர்',                 emoji: '🤝', label: 'Cousin'          },
  { value: 'father_in_law',        tamil: 'மாமனார்',                 emoji: '👴', label: 'Father-in-law'   },
  { value: 'mother_in_law',        tamil: 'மாமியார்',                emoji: '👵', label: 'Mother-in-law'   },
  { value: 'brother_in_law',       tamil: 'மைத்துனன்',              emoji: '👦', label: 'Brother-in-law'  },
  { value: 'sister_in_law',        tamil: 'நாத்தனார்',               emoji: '👧', label: 'Sister-in-law'   },
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

  // Chain detection
  const [chainLoading, setChainLoading]   = useState(false);
  const [chainData, setChainData]         = useState(null);
  const [overrideRelation, setOverride]   = useState(false); // manual override
  const chainTimer = useRef(null);

  // Offline
  const [isOffline, setIsOffline]         = useState(false);
  const [offlineName, setOfflineName]     = useState('');
  const [offlineGender, setOfflineGender] = useState('male');

  const suggestedRelation = chainData?.suggested_relation;
  const hasSuggestion     = !!suggestedRelation?.type && chainData?.chain;
  const showDropdown      = !hasSuggestion || overrideRelation;
  const RELATIONS_TO_SHOW = showDropdown ? ALL_RELATIONS : CORE_RELATIONS;
  const selectedRelation  = ALL_RELATIONS.find(r => r.value === relationType);

  // Auto-trigger chain detect
  useEffect(() => {
    if (isOffline) return;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      clearTimeout(chainTimer.current);
      chainTimer.current = setTimeout(() => detectChain(digits), 700);
    } else {
      setChainData(null);
      setOverride(false);
      setRelationType('');
    }
    return () => clearTimeout(chainTimer.current);
  }, [phone, isOffline]);

  // Auto-apply suggested relation
  useEffect(() => {
    if (hasSuggestion && !overrideRelation) {
      setRelationType(suggestedRelation.type);
    }
  }, [chainData, overrideRelation]);

  const detectChain = async (digits) => {
    setChainLoading(true);
    setOverride(false);
    setRelationType('');
    try {
      const res = await api.get(`/api/relationships/chain-detect?to_phone=${digits}`);
      setChainData(res.data);
    } catch(e) { setChainData(null); }
    finally { setChainLoading(false); }
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
        ? { relation_type: relationType, relation_tamil: selectedRelation?.tamil,
            is_offline: true, offline_name: offlineName.trim(), offline_gender: offlineGender }
        : { to_user_phone: phone, relation_type: relationType,
            relation_tamil: selectedRelation?.tamil };

      const res = await api.post('/api/relationships', payload);
      if (res.data.success) {
        setSuccess(isOffline
          ? `${offlineName} குடும்ப மரத்தில் சேர்க்கப்பட்டார்`
          : `கோரிக்கை அனுப்பப்பட்டது!`);
        setWhatsappLink(res.data.whatsapp_link || '');
        setPhone(''); setRelationType(''); setOfflineName('');
        setChainData(null); setOverride(false);
      }
    } catch (e) {
      const errData = e.response?.data;
      if (e.response?.status === 404 && errData?.invite_saved) {
        // Not registered — show WhatsApp invite only, no error text
        const digits = phone.replace(/\D/g,'');
        const waMsg = encodeURIComponent(
          `வணக்கம்! நான் frootze-ல் என் குடும்ப மரத்தை உருவாக்கினேன்.\n\n` +
          `நீங்களும் சேர்ந்து உங்கள் இடத்தை சேர்க்கலாம்:\n` +
          `https://frootze.com\n\n` +
          `இலவசம் 🌳 #frootze`
        );
        setWhatsappLink(errData?.whatsapp_link || `https://wa.me/91${digits}?text=${waMsg}`);
      } else {
        setError(errData?.error || 'பிழை ஏற்பட்டது');
      }
    } finally { setLoading(false); }
  };

  // ── Chain Card ──
  const ChainCard = () => {
    if (!chainData || isOffline) return null;

    if (!chainData.target_found) return (
      <Box bg="orange.900" border="1px solid" borderColor="orange.600" borderRadius="xl" px={4} py={3}>
        <Text color="orange.200" fontSize="sm" fontWeight="700">⚠️ frootze-ல் பதிவு செய்யப்படவில்லை</Text>
        <Text color="orange.300" fontSize="xs" mt={1}>WhatsApp மூலம் அழைக்கவும்</Text>
      </Box>
    );

    if (chainData.already_connected) return (
      <Box bg="blue.900" border="1px solid" borderColor="blue.600" borderRadius="xl" px={4} py={3}>
        <Text color="blue.200" fontSize="sm">ℹ️ ஏற்கனவே குடும்ப மரத்தில் இணைக்கப்பட்டுள்ளார்</Text>
      </Box>
    );

    if (!chainData.chain) return (
      <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.300" borderRadius="xl" px={4} py={3}>
        <Text color="white" fontSize="sm" fontWeight="700">✅ frootze-ல் பதிவு செய்யப்பட்டவர்</Text>
        <Text color="whiteAlpha.500" fontSize="xs" mt={1}>நேரடி குடும்ப தொடர்பு இல்லை — கைமுறையாக தேர்வு செய்யவும்</Text>
      </Box>
    );

    return (
      <Box bg="whiteAlpha.100" border="1px solid" borderColor="purple.500" borderRadius="xl" px={4} py={4}>
        <Text color="purple.300" fontSize="xs" fontWeight="700" mb={3}>
          🔗 குடும்ப தொடர்பு கண்டறியப்பட்டது / Connection Found
        </Text>

        {/* Chain visualization */}
        <HStack spacing={1} flexWrap="wrap" align="center" mb={3}>
          {chainData.chain.map((node, idx) => (
            <HStack key={idx} spacing={1} align="center">
              <VStack spacing={0} align="center">
                <Box w="32px" h="32px" borderRadius="full" display="flex"
                  alignItems="center" justifyContent="center"
                  bg={node.connected ? 'purple.600' : 'gray.600'}
                  border="2px solid"
                  borderColor={node.connected ? 'green.400' : 'gray.500'}>
                  <Text color="white" fontSize="xs" fontWeight="700">
                    {(node.user.name||'?')[0].toUpperCase()}
                  </Text>
                </Box>
                <Text fontSize="2xs" color={node.connected ? 'white' : 'whiteAlpha.500'}
                  maxW="50px" textAlign="center" noOfLines={1}>
                  {node.user.name?.split(' ')[0]}
                </Text>
                {!node.connected && idx > 0 &&
                  <Badge colorScheme="green" fontSize="2xs">NEW</Badge>}
              </VStack>
              {idx < chainData.chain.length - 1 && (
                <VStack spacing={0} align="center" mx={1}>
                  <Text fontSize="2xs" color="yellow.300" fontWeight="700">
                    {chainData.chain[idx].rel_tamil || ''}
                  </Text>
                  <Text color="purple.300">→</Text>
                </VStack>
              )}
            </HStack>
          ))}
        </HStack>

        {/* Suggested relation — pre-filled badge */}
        {hasSuggestion && !overrideRelation && (
          <Box bg="green.900" border="1px solid" borderColor="green.600" borderRadius="lg" px={3} py={2}>
            <HStack justify="space-between" align="center">
              <VStack spacing={0} align="start">
                <Text fontSize="xs" color="green.400" fontWeight="700">✅ தொடர்பு தானாக தேர்வு செய்யப்பட்டது</Text>
                <Text fontSize="md" color="white" fontWeight="800">
                  {suggestedRelation.tamil} / {suggestedRelation.type}
                </Text>
              </VStack>
              <Button size="xs" variant="ghost" color="whiteAlpha.500"
                onClick={() => { setOverride(true); setRelationType(''); }}
                _hover={{ color: 'white' }}>
                ✏️ மாற்று
              </Button>
            </HStack>
          </Box>
        )}

        {overrideRelation && (
          <HStack mb={2}>
            <Text fontSize="xs" color="whiteAlpha.500">கைமுறையாக தேர்வு செய்கிறீர்கள்</Text>
            <Button size="xs" variant="ghost" color="purple.300"
              onClick={() => { setOverride(false); setRelationType(suggestedRelation?.type || ''); }}>
              ↩ திரும்பு
            </Button>
          </HStack>
        )}
      </Box>
    );
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="600px" mx="auto" spacing={4} align="stretch">

        <HStack spacing={3} mb={2}>
          <Button size="sm" variant="ghost" color="whiteAlpha.600"
            onClick={() => navigate('/dashboard')} _hover={{ color: 'white' }}>← Back</Button>
          <Text fontSize="xl" fontWeight="800" color="white">👨‍👩‍👧‍👦 குடும்பத்தினரை சேர்</Text>
        </HStack>

        {/* Online / Offline toggle */}
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

        {/* Phone input */}
        {!isOffline && (
          <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={5} py={5}>
            <Text fontSize="sm" color="whiteAlpha.600" mb={2}>தொலைபேசி எண் / Phone Number</Text>
            <HStack>
              <Box bg="whiteAlpha.200" borderRadius="xl" px={3} h="52px" display="flex" alignItems="center">
                <Text color="white" fontSize="md">+91</Text>
              </Box>
              <Input flex={1} placeholder="10 digit mobile number" value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g,'')); setError(''); setSuccess(''); }}
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

        {/* Chain card — shows connection + auto-selected relation */}
        {!isOffline && <ChainCard/>}

        {/* Relation selector — only shown when no suggestion OR override */}
        {(showDropdown || isOffline) && (
          <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={5} py={5}>
            <Text fontSize="sm" color="whiteAlpha.600" mb={3}>
              {overrideRelation ? '✏️ உறவு மாற்று / Change Relation' : 'உறவு முறை / Relation Type'}
            </Text>
            <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
              {(isOffline ? CORE_RELATIONS : ALL_RELATIONS).map(r => (
                <Button key={r.value} size="sm" borderRadius="xl" h="60px"
                  flexDirection="column" gap={1}
                  bg={relationType === r.value ? 'purple.600' : 'whiteAlpha.100'}
                  color={relationType === r.value ? 'white' : 'whiteAlpha.600'}
                  border="1px solid"
                  borderColor={relationType === r.value ? 'purple.400' : 'whiteAlpha.200'}
                  onClick={() => setRelationType(r.value)}
                  _hover={{ bg: relationType === r.value ? 'purple.600' : 'whiteAlpha.200' }}>
                  <Text fontSize="lg">{r.emoji}</Text>
                  <Text fontSize="2xs" textAlign="center">{r.tamil}</Text>
                </Button>
              ))}
            </Box>
          </Box>
        )}

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

        {/* WhatsApp invite */}
        {!success && whatsappLink && (
          <Box bg="orange.900" border="1px solid" borderColor="orange.500" borderRadius="xl" px={4} py={3}>
            <Text color="orange.200" fontSize="sm" mb={2}>📲 Invite them to join frootze:</Text>
            <Button as="a" href={whatsappLink} target="_blank" size="sm"
              bg="green.600" color="white" borderRadius="xl" _hover={{ bg: 'green.500' }}>
              💬 WhatsApp Invite
            </Button>
          </Box>
        )}

        {/* WhatsApp invite for unregistered */}
        {!success && whatsappLink && !isOffline && (
          <Box bg="orange.900" border="1px solid" borderColor="orange.500" borderRadius="xl" px={4} py={4}>
            <Text color="orange.200" fontSize="sm" fontWeight="700" mb={1}>
              ⚠️ frootze-ல் பதிவு செய்யப்படவில்லை
            </Text>
            <Text color="orange.300" fontSize="xs" mb={3}>
              இந்த எண் இன்னும் frootze-ல் இல்லை. WhatsApp மூலம் அழைக்கவும்.
            </Text>
            <HStack spacing={3}>
              <Button as="a" href={whatsappLink} target="_blank" flex={1} h="44px"
                bg="green.600" color="white" borderRadius="xl" fontSize="sm"
                fontWeight="700" _hover={{ bg: 'green.500' }}>
                📱 WhatsApp அழைப்பு
              </Button>
              <Button flex={1} h="44px" variant="ghost" color="whiteAlpha.500"
                borderRadius="xl" fontSize="sm"
                onClick={() => { setWhatsappLink(''); setError(''); }}>
                ரத்து
              </Button>
            </HStack>
          </Box>
        )}

        {/* Submit */}
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
