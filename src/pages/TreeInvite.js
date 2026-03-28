import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Avatar,
  Select, Badge, SimpleGrid, Spinner
} from '@chakra-ui/react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

const RELATIONS = [
  { value: 'father',               tamil: 'அப்பா / Father'             },
  { value: 'mother',               tamil: 'அம்மா / Mother'             },
  { value: 'spouse',               tamil: 'மனைவி/கணவன் / Spouse'      },
  { value: 'brother',              tamil: 'அண்ணன்/தம்பி / Brother'    },
  { value: 'sister',               tamil: 'அக்கா/தங்கை / Sister'      },
  { value: 'son',                  tamil: 'மகன் / Son'                 },
  { value: 'daughter',             tamil: 'மகள் / Daughter'            },
  { value: 'grandfather_paternal', tamil: 'தாத்தா (அப்பா பக்கம்)'    },
  { value: 'grandmother_paternal', tamil: 'பாட்டி (அப்பா பக்கம்)'    },
  { value: 'grandfather_maternal', tamil: 'தாத்தா (அம்மா பக்கம்)'    },
  { value: 'grandmother_maternal', tamil: 'பாட்டி (அம்மா பக்கம்)'    },
  { value: 'uncle_paternal',       tamil: 'பெரியப்பா/சித்தப்பா'       },
  { value: 'aunt_paternal',        tamil: 'அத்தை / Paternal Aunt'     },
  { value: 'uncle_maternal',       tamil: 'மாமா / Maternal Uncle'     },
  { value: 'aunt_maternal',        tamil: 'சித்தி/பெரியம்மா'          },
  { value: 'cousin',               tamil: 'மச்சான்/மச்சி / Cousin'    },
  { value: 'nephew',               tamil: 'மருமகன் / Nephew'          },
  { value: 'niece',                tamil: 'மருமகள் / Niece'           },
  { value: 'grandson',             tamil: 'பேரன் / Grandson'          },
  { value: 'granddaughter',        tamil: 'பேத்தி / Granddaughter'    },
  { value: 'brother_in_law',       tamil: 'மைத்துனன்'                  },
  { value: 'sister_in_law',        tamil: 'நாத்தனார்'                  },
];

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid',
  borderColor: 'whiteAlpha.200', borderRadius: '2xl',
  px: { base: 5, md: 8 }, py: { base: 5, md: 6 },
};

const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300',
  color: 'white', h: '48px', fontSize: 'md',
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
};

export default function TreeInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [inviter, setInviter] = useState(null);
  const [members, setMembers] = useState([]);
  const [selections, setSelections] = useState({});
  const [skipped, setSkipped] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { loadInvite(); }, [token]);

  const loadInvite = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/tree-invite/${token}`);
      setInvite(res.data.invite);
      setInviter(res.data.inviter);
      setMembers(res.data.members || []);

      // Pre-fill inferred relations
      const preSelections = {};
      res.data.members?.forEach(m => {
        if (m.inferred_relation_type && !m.is_offline && m.user_id) {
          preSelections[m.user_id] = {
            relation_type: m.inferred_relation_type,
            relation_tamil: m.inferred_relation_tamil,
          };
        }
      });
      setSelections(preSelections);
    } catch (e) {
      setError(e.response?.data?.error || 'Invite not found or expired');
    } finally { setLoading(false); }
  };

  const handleSelectionChange = (userId, value) => {
    if (!value) {
      const s = { ...selections };
      delete s[userId];
      setSelections(s);
      return;
    }
    const rel = RELATIONS.find(r => r.value === value);
    setSelections(prev => ({
      ...prev,
      [userId]: { relation_type: value, relation_tamil: rel?.tamil || value }
    }));
    setSkipped(prev => { const s = {...prev}; delete s[userId]; return s; });
  };

  const handleSkip = (userId) => {
    setSkipped(prev => ({ ...prev, [userId]: true }));
    setSelections(prev => { const s = {...prev}; delete s[userId]; return s; });
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate(`/login?redirect=/tree-invite/${token}`);
      return;
    }

    const selectedList = Object.entries(selections).map(([user_id, rel]) => ({
      user_id,
      relation_type: rel.relation_type,
      relation_tamil: rel.relation_tamil,
    }));

    if (selectedList.length === 0) {
      setError('குறைந்தது ஒருவரை தேர்வு செய்யவும் / Select at least one member');
      return;
    }

    setSubmitting(true);
    try {
      const token_header = localStorage.getItem('pmf_token');
      const res = await axios.post(
        `${BASE_URL}/api/tree-invite/${token}/submit`,
        { selections: selectedList },
        { headers: { Authorization: `Bearer ${token_header}` } }
      );
      setSuccess(res.data.message);
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Submit failed');
    } finally { setSubmitting(false); }
  };

  const selectedCount = Object.keys(selections).length;
  const eligibleMembers = members.filter(m => !m.is_offline && m.user_id);

  if (loading) return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Text fontSize="4xl">🌳</Text>
        <Spinner color="purple.400" size="xl" />
        <Text color="whiteAlpha.600">ஏற்றுகிறோம்...</Text>
      </VStack>
    </Box>
  );

  if (error && !invite) return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex" alignItems="center" justifyContent="center" px={4}>
      <VStack spacing={4} textAlign="center">
        <Text fontSize="5xl">😕</Text>
        <Heading color="white" fontSize="xl">அழைப்பு கிடைக்கவில்லை</Heading>
        <Text color="whiteAlpha.500">{error}</Text>
        <Button onClick={() => navigate('/')} colorScheme="purple" borderRadius="xl">
          frootze-க்கு செல்லவும்
        </Button>
      </VStack>
    </Box>
  );

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6} pb={24}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox}>
          <VStack spacing={3} align="center" textAlign="center">
            <Avatar size="xl" name={inviter?.name} src={inviter?.profile_photo}
              border="3px solid" borderColor="purple.400" />
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">
                🌳 {inviter?.name} உங்களை அழைக்கிறார்!
              </Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500" mt={1}>
                {inviter?.name} is inviting you to join their family tree
              </Text>
            </Box>
            <Badge colorScheme="purple" borderRadius="full" px={3} py={1} fontSize="sm">
              {invite?.relation_tamil} / {invite?.relation_type}
            </Badge>
          </VStack>
        </Box>

        {/* Login check */}
        {!user && (
          <Box bg="blue.900" border="1px solid" borderColor="blue.500"
            borderRadius="2xl" px={{ base: 5, md: 8 }} py={5}>
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <Box>
                <Text color="white" fontWeight="700">👋 உள்நுழைக / Sign in first</Text>
                <Text color="blue.300" fontSize="sm" mt={1}>
                  குடும்பத்தினரை சேர்க்க உள்நுழைய வேண்டும்
                </Text>
              </Box>
              <Button colorScheme="blue" borderRadius="xl"
                onClick={() => navigate(`/login?redirect=/tree-invite/${token}`)}>
                உள்நுழை / Login →
              </Button>
            </HStack>
          </Box>
        )}

        {/* Instructions */}
        <Box {...sectionBox} py={4}>
          <HStack spacing={3} align="start">
            <Text fontSize="2xl">💡</Text>
            <Box>
              <Text color="white" fontWeight="600" fontSize="sm">
                {inviter?.name}-ன் குடும்பத்தினர் கீழே உள்ளனர்
              </Text>
              <Text color="whiteAlpha.500" fontSize="xs" mt={1}>
                ஒவ்வொருவருக்கும் உங்கள் உறவை தேர்வு செய்யவும்.
                Auto-suggested relations are shown — you can change them.
                Skip anyone you don't know.
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Member list */}
        {!submitted && (
          <Box {...sectionBox}>
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white" mb={4}>
              👨‍👩‍👧 {inviter?.name}-ன் குடும்பத்தினர் ({eligibleMembers.length} members)
            </Text>

            <VStack spacing={3} align="stretch">
              {eligibleMembers.map(m => {
                const isSelected = !!selections[m.user_id];
                const isSkippedMember = skipped[m.user_id];

                return (
                  <Box key={m.user_id}
                    bg={isSkippedMember ? 'whiteAlpha.50' : isSelected ? 'purple.900' : 'whiteAlpha.100'}
                    border="1px solid"
                    borderColor={isSkippedMember ? 'whiteAlpha.100' : isSelected ? 'purple.400' : 'whiteAlpha.200'}
                    borderRadius="2xl" px={4} py={4}
                    opacity={isSkippedMember ? 0.5 : 1}
                    transition="all 0.2s">

                    <HStack spacing={3} mb={3}>
                      <Avatar size="md" name={m.name} src={m.profile_photo}
                        border="2px solid" borderColor={isSelected ? 'purple.400' : 'whiteAlpha.300'} />
                      <Box flex={1}>
                        <Text fontWeight="700" color="white" fontSize="md">{m.name}</Text>
                        <Text fontSize="xs" color="whiteAlpha.500">
                          {inviter?.name}-ன் {m.niranjan_relation_tamil}
                        </Text>
                        {m.inferred_relation_tamil && !isSkippedMember && (
                          <Badge colorScheme="green" borderRadius="full" fontSize="xs" mt={1}>
                            💡 Auto: {m.inferred_relation_tamil}
                          </Badge>
                        )}
                      </Box>
                      {!isSkippedMember && (
                        <Button size="xs" variant="ghost" color="whiteAlpha.400"
                          onClick={() => handleSkip(m.user_id)}
                          _hover={{ color: 'white' }}>
                          தெரியாது / Skip
                        </Button>
                      )}
                      {isSkippedMember && (
                        <Button size="xs" variant="ghost" color="purple.300"
                          onClick={() => setSkipped(prev => { const s = {...prev}; delete s[m.user_id]; return s; })}
                          _hover={{ color: 'white' }}>
                          மீட்டமை
                        </Button>
                      )}
                    </HStack>

                    {!isSkippedMember && (
                      <Select
                        placeholder="இவர் உங்கள்... / This person is your..."
                        value={selections[m.user_id]?.relation_type || ''}
                        onChange={e => handleSelectionChange(m.user_id, e.target.value)}
                        {...inputStyle} h="44px" fontSize="sm">
                        {RELATIONS.map(r => (
                          <option key={r.value} value={r.value} style={{ background: '#1e1b4b' }}>
                            {r.tamil}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Box>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* Result */}
        {submitted && (
          <Box bg="green.900" border="1px solid" borderColor="green.500"
            borderRadius="2xl" px={{ base: 5, md: 8 }} py={6} textAlign="center">
            <Text fontSize="4xl" mb={3}>🎉</Text>
            <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white" mb={2}>
              வெற்றிகரமாக அனுப்பப்பட்டது!
            </Heading>
            <Text color="green.300" fontSize={{ base: 'sm', md: 'md' }}>
              {success}
            </Text>
            <Text color="whiteAlpha.500" fontSize="sm" mt={2}>
              Each family member will receive a request to confirm.
              As they accept, your family tree will grow automatically!
            </Text>
          </Box>
        )}

        {/* Error */}
        {error && invite && (
          <Box bg="red.900" border="1px solid" borderColor="red.500"
            borderRadius="xl" px={4} py={3}>
            <Text color="red.200" fontSize="sm">{error}</Text>
          </Box>
        )}

        {/* Submit button */}
        {!submitted && user && (
          <Box {...sectionBox} py={4}>
            <HStack justify="space-between" mb={4}>
              <Text color="whiteAlpha.600" fontSize="sm">
                {selectedCount} members selected
              </Text>
              <Button size="sm" variant="ghost" color="purple.300"
                onClick={() => {
                  const allSelections = {};
                  eligibleMembers.forEach(m => {
                    if (m.inferred_relation_type) {
                      allSelections[m.user_id] = {
                        relation_type: m.inferred_relation_type,
                        relation_tamil: m.inferred_relation_tamil,
                      };
                    }
                  });
                  setSelections(allSelections);
                  setSkipped({});
                }}>
                அனைத்தும் தேர்வு / Select All Suggested
              </Button>
            </HStack>

            <Button w="100%" h={{ base: '52px', md: '56px' }}
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" fontSize={{ base: 'md', md: 'lg' }}
              fontWeight="700" borderRadius="xl"
              isLoading={submitting} loadingText="அனுப்புகிறோம்..."
              isDisabled={selectedCount === 0}
              onClick={handleSubmit}
              _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
              _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
              🌳 {selectedCount} பேருடன் இணை / Connect with {selectedCount} members
            </Button>
          </Box>
        )}

        {/* Post submit action */}
        {submitted && (
          <Button w="100%" maxW="900px" mx="auto" h="52px"
            bgGradient="linear(to-r, purple.600, green.500)"
            color="white" fontSize="md" fontWeight="700" borderRadius="xl"
            onClick={() => navigate('/dashboard')}>
            Dashboard-க்கு செல்லவும் →
          </Button>
        )}

      </VStack>
    </Box>
  );
}
