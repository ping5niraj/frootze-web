import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Button, Avatar,
  Badge, Spinner, Progress
} from '@chakra-ui/react';
import api from '../services/api';

const ALL_RELATIONS = [
  { value: 'father',               tamil: 'அப்பா'                   },
  { value: 'mother',               tamil: 'அம்மா'                   },
  { value: 'spouse',               tamil: 'மனைவி/கணவன்'            },
  { value: 'brother',              tamil: 'அண்ணன்/தம்பி'           },
  { value: 'sister',               tamil: 'அக்கா/தங்கை'            },
  { value: 'son',                  tamil: 'மகன்'                    },
  { value: 'daughter',             tamil: 'மகள்'                    },
  { value: 'grandfather_paternal', tamil: 'தாத்தா (அப்பா பக்கம்)' },
  { value: 'grandmother_paternal', tamil: 'பாட்டி (அப்பா பக்கம்)' },
  { value: 'grandfather_maternal', tamil: 'தாத்தா (அம்மா பக்கம்)' },
  { value: 'grandmother_maternal', tamil: 'பாட்டி (அம்மா பக்கம்)' },
  { value: 'grandson',             tamil: 'பேரன்'                   },
  { value: 'granddaughter',        tamil: 'பேத்தி'                  },
  { value: 'nephew',               tamil: 'மருமகன்'                 },
  { value: 'niece',                tamil: 'மருமகள்'                 },
  { value: 'uncle_paternal',       tamil: 'பெரியப்பா/சித்தப்பா'   },
  { value: 'aunt_paternal',        tamil: 'அத்தை'                   },
  { value: 'uncle_maternal',       tamil: 'மாமா'                    },
  { value: 'aunt_maternal',        tamil: 'சித்தி'                  },
  { value: 'aunt_by_marriage',     tamil: 'மாமி'                    },
  { value: 'father_in_law',        tamil: 'மாமனார்'                 },
  { value: 'mother_in_law',        tamil: 'மாமியார்'                },
  { value: 'brother_in_law',       tamil: 'மைத்துனன்'              },
  { value: 'sister_in_law',        tamil: 'நாத்தனார்'               },
  { value: 'son_in_law',           tamil: 'மருமகன்'                 },
  { value: 'daughter_in_law',      tamil: 'மருமகள்'                 },
  { value: 'cousin',               tamil: 'உறவினர்'                 },
];

export default function FamilySuggestions() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [accepted, setAccepted]         = useState(0);
  const [skipped, setSkipped]           = useState(0);
  const [changing, setChanging]         = useState(false);
  const [selectedRelation, setSelected] = useState('');
  const [saving, setSaving]             = useState(false);
  const [done, setDone]                 = useState(false);

  useEffect(() => {
    api.get('/api/relationships/suggestions')
      .then(res => {
        setSuggestions(res.data.suggestions || []);
        setLoading(false);
        if (!res.data.suggestions?.length) setDone(true);
      })
      .catch(() => { setLoading(false); setDone(true); });
  }, []);

  const current = suggestions[currentIdx];
  const total   = suggestions.length;
  const progress = total > 0 ? ((currentIdx) / total) * 100 : 0;

  const handleAccept = async (overrideRelation) => {
    setSaving(true);
    const relType  = overrideRelation || current.suggested_relation_type;
    const relTamil = ALL_RELATIONS.find(r => r.value === relType)?.tamil || relType;
    try {
      await api.post('/api/relationships/suggestions/accept', {
        suggested_user_id:    current.suggested_user?.id,
        relation_type:        relType,
        relation_tamil:       relTamil,
        is_offline:           current.suggested_user?.is_offline || false,
        offline_name:         current.suggested_user?.name,
        offline_gender:       current.suggested_user?.offline_gender,
      });
      setAccepted(a => a + 1);
    } catch(e) {}
    setSaving(false);
    setChanging(false);
    setSelected('');
    nextCard();
  };

  const handleSkip = () => {
    setSkipped(s => s + 1);
    setChanging(false);
    setSelected('');
    nextCard();
  };

  const nextCard = () => {
    if (currentIdx + 1 >= total) {
      setDone(true);
    } else {
      setCurrentIdx(i => i + 1);
    }
  };

  if (loading) return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Spinner color="purple.300" size="xl"/>
        <Text color="whiteAlpha.600">உங்கள் குடும்பத்தை தேடுகிறோம்...</Text>
      </VStack>
    </Box>
  );

  if (done) return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex" alignItems="center" justifyContent="center" px={6}>
      <VStack spacing={6} textAlign="center">
        <Text fontSize="5xl">🌳</Text>
        <Text fontSize="2xl" fontWeight="800" color="white">
          {accepted > 0 ? 'குடும்ப மரம் தயார்!' : 'frootze-க்கு வரவேற்கிறோம்!'}
        </Text>
        {accepted > 0 && (
          <Text fontSize="md" color="green.300">
            {accepted} குடும்பத்தினர் சேர்க்கப்பட்டனர் ✅
          </Text>
        )}
        <Text fontSize="sm" color="whiteAlpha.500">
          நீங்கள் எப்போதும் Dashboard-ல் இருந்து மேலும் சேர்க்கலாம்
        </Text>
        <Button h="52px" px={10} bgGradient="linear(to-r, purple.600, green.500)"
          color="white" fontSize="lg" fontWeight="700" borderRadius="xl"
          onClick={() => navigate('/dashboard')}>
          Dashboard திறக்கவும் →
        </Button>
      </VStack>
    </Box>
  );

  if (!current) return null;

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" px={4} py={6}>
      <VStack w="100%" maxW="500px" mx="auto" spacing={5}>

        {/* Header */}
        <VStack spacing={1} textAlign="center">
          <Text fontSize="xl" fontWeight="800" color="white">
            🌳 உங்கள் குடும்பத்தினர்
          </Text>
          <Text fontSize="sm" color="whiteAlpha.500">
            Family suggestions based on your connections
          </Text>
        </VStack>

        {/* Progress */}
        <Box w="100%">
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" color="whiteAlpha.500">{currentIdx + 1} / {total}</Text>
            <Text fontSize="xs" color="green.300">{accepted} accepted</Text>
          </HStack>
          <Progress value={progress} colorScheme="purple" borderRadius="full" size="sm" bg="whiteAlpha.200"/>
        </Box>

        {/* Suggestion Card */}
        <Box w="100%" bg="whiteAlpha.100" border="1px solid" borderColor="purple.500"
          borderRadius="2xl" px={6} py={8}>
          <VStack spacing={5}>

            {/* Person */}
            <VStack spacing={3}>
              <Avatar
                size="xl"
                name={current.suggested_user?.name}
                src={current.suggested_user?.profile_photo}
                border="3px solid"
                borderColor={current.suggested_user?.is_offline ? 'gray.400' : 'purple.400'}
              />
              <VStack spacing={1}>
                <HStack>
                  <Text fontSize="xl" fontWeight="800" color="white">
                    {current.suggested_user?.name}
                  </Text>
                  {current.suggested_user?.is_offline && (
                    <Text fontSize="lg">🕊️</Text>
                  )}
                </HStack>
                {current.suggested_user?.kutham && (
                  <Badge colorScheme="purple" borderRadius="full" px={3}>
                    {current.suggested_user.kutham}
                  </Badge>
                )}
                {current.via && (
                  <Text fontSize="xs" color="whiteAlpha.400">
                    via {current.via}
                  </Text>
                )}
              </VStack>
            </VStack>

            {/* Suggested Relation */}
            {!changing ? (
              <Box w="100%" bg="green.900" border="1px solid" borderColor="green.600"
                borderRadius="xl" px={4} py={3} textAlign="center">
                <Text fontSize="xs" color="green.400" fontWeight="700" mb={1}>
                  {current.confidence === 'high' ? '✅ நேரடி தொடர்பு' : '🔗 தொடர்பு வழி'}
                </Text>
                <Text fontSize="2xl" fontWeight="900" color="white">
                  {current.suggested_relation_tamil}
                </Text>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  {current.suggested_relation_type}
                </Text>
              </Box>
            ) : (
              <Box w="100%" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.300"
                borderRadius="xl" px={4} py={4}>
                <Text fontSize="sm" color="whiteAlpha.600" mb={3}>
                  சரியான உறவை தேர்வு செய்யவும்:
                </Text>
                <Box maxH="200px" overflowY="auto">
                  <VStack spacing={1} align="stretch">
                    {ALL_RELATIONS.map(r => (
                      <Button key={r.value} size="sm" borderRadius="lg" justifyContent="flex-start"
                        bg={selectedRelation === r.value ? 'purple.600' : 'whiteAlpha.100'}
                        color={selectedRelation === r.value ? 'white' : 'whiteAlpha.700'}
                        _hover={{ bg: 'purple.700', color: 'white' }}
                        onClick={() => setSelected(r.value)}>
                        {r.tamil} / {r.value}
                      </Button>
                    ))}
                  </VStack>
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            {!changing ? (
              <VStack w="100%" spacing={3}>
                <Button w="100%" h="52px" bgGradient="linear(to-r, purple.600, green.500)"
                  color="white" fontSize="md" fontWeight="700" borderRadius="xl"
                  isLoading={saving}
                  onClick={() => handleAccept(null)}>
                  ✅ ஏற்கிறேன் / Accept
                </Button>
                <HStack w="100%" spacing={3}>
                  <Button flex={1} h="44px" variant="outline" borderColor="yellow.500"
                    color="yellow.300" borderRadius="xl" fontSize="sm"
                    onClick={() => setChanging(true)}>
                    ✏️ மாற்று / Change
                  </Button>
                  <Button flex={1} h="44px" variant="ghost" color="whiteAlpha.400"
                    borderRadius="xl" fontSize="sm"
                    onClick={handleSkip}>
                    ⏭ தவிர்க்கவும் / Skip
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <VStack w="100%" spacing={3}>
                <Button w="100%" h="52px" bgGradient="linear(to-r, purple.600, green.500)"
                  color="white" fontSize="md" fontWeight="700" borderRadius="xl"
                  isLoading={saving}
                  isDisabled={!selectedRelation}
                  onClick={() => handleAccept(selectedRelation)}>
                  ✅ இந்த உறவுடன் ஏற்கவும்
                </Button>
                <Button w="100%" h="44px" variant="ghost" color="whiteAlpha.400"
                  borderRadius="xl" fontSize="sm"
                  onClick={() => { setChanging(false); setSelected(''); }}>
                  ← திரும்பு / Back
                </Button>
              </VStack>
            )}

          </VStack>
        </Box>

        {/* Skip all */}
        <Button variant="ghost" color="whiteAlpha.300" fontSize="sm"
          onClick={() => setDone(true)}>
          இதை பின்னர் செய்யலாம் / Do this later
        </Button>

      </VStack>
    </Box>
  );
}
