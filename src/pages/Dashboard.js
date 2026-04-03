import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button,
  SimpleGrid, Avatar, Badge, Spinner
} from '@chakra-ui/react';
import api, { getMyRelationships, verifyRelationship, rejectRelationship } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FamilyTree from '../components/FamilyTree';
import FamilyNetwork from '../components/FamilyNetwork';
import SuggestionsBanner from '../components/SuggestionsBanner';
import ShareTree from '../components/ShareTree';
import BirthdayBanner from '../components/BirthdayBanner';

const navItems = [
  { path: '/dashboard',  icon: '🌳', ta: 'மரம்'      },
  { path: '/directory',  icon: '📚', ta: 'அகராதி'    },
  { path: '/messages',   icon: '💬', ta: 'செய்தி'    },
  { path: '/locations',  icon: '📍', ta: 'இடம்'      },
  { path: '/birthdays',  icon: '🎂', ta: 'பிறந்தநாள்' },
  { path: '/quiz',       icon: '🧠', ta: 'வினா'      },
];

const sectionBox = {
  w: '100%',
  bg: 'whiteAlpha.100',
  border: '1px solid',
  borderColor: 'whiteAlpha.200',
  borderRadius: '2xl',
  px: { base: 4, md: 6 },
  py: { base: 4, md: 5 },
};

export default function Dashboard() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [relationships, setRelationships] = useState([]);
  const [extendedRelationships, setExtendedRelationships] = useState([]);
  const [pending, setPending] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tree');
  const [treeMode, setTreeMode] = useState('direct'); // 'direct' or 'extended'
  const [actionLoading, setActionLoading] = useState('');
  const treeRef = useRef(null);

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user]);

  // Separate fetch for extended tree — fires when user.id is ready
  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/relationships/tree/${user.id}`)
      .then(treeRes => {
        const extNodes = (treeRes.data.nodes || []).map(n => ({
          id: n.id,
          relation_type: n.relation_type,
          relation_tamil: n.relation_tamil,
          verification_status: 'verified',
          is_offline: n.is_offline,
          offline_name: n.offline_name,
          offline_gender: n.offline_gender,
          to_user: {
            id: n.id,
            name: n.name,
            phone: null,
            kutham: n.kutham,
            is_offline: n.is_offline,
            offline_gender: n.offline_gender,
          }
        }));
        setExtendedRelationships(extNodes);
      })
      .catch(() => setExtendedRelationships([]));
  }, [user?.id]);

  const fetchData = async () => {
    try {
      const res = await getMyRelationships();
      setRelationships(res.data.my_relationships || []);
      setPending(res.data.pending_verification || []);
      setSummary(res.data.summary || {});
    } catch (e) {
      setRelationships([]); setPending([]); setSummary({});
    } finally { setLoading(false); }
  };

  const handleVerify = async (id) => {
    setActionLoading(id);
    try {
      await verifyRelationship(id);
      await fetchData();
      // After accepting — redirect to suggestions page
      // Small delay so fetchData completes first
      setTimeout(() => navigate('/family-suggestions'), 300);
    } catch (e) {}
    finally { setActionLoading(''); }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try { await rejectRelationship(id); await fetchData(); } catch (e) {}
    finally { setActionLoading(''); }
  };

  if (loading) {
    return (
      <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
        display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Text fontSize="5xl">🌳</Text>
          <Spinner color="purple.300" size="lg" />
          <Text color="whiteAlpha.600" fontSize="md">குடும்ப மரம் ஏற்றுகிறோம்...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      pb={24} px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Section 1 — Header */}
        <Box {...sectionBox}>
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Avatar
                size="md"
                name={user?.name}
                src={user?.profile_photo}
                border="2px solid"
                borderColor="purple.400"
              />
              <Box>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="700" color="white">{user?.name}</Text>
                <Text fontSize="xs" color="whiteAlpha.500">{user?.phone}</Text>
              </Box>
            </HStack>
            <HStack spacing={2}>
              <Button size="sm" variant="ghost" color="whiteAlpha.600"
                _hover={{ color: 'white' }} onClick={() => navigate('/profile')}>
                ⚙️
              </Button>
              <Button size="sm" variant="ghost" color="whiteAlpha.600"
                _hover={{ color: 'red.300' }}
                onClick={() => { logout(); window.location.href = '/'; }}>
                வெளியேறு
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Section 2 — Stats */}
        <SimpleGrid columns={3} spacing={3}>
          {[
            { label: 'சரிபார்க்கப்பட்டது', value: summary.total_verified || 0, color: 'green.300' },
            { label: 'அனுப்பியது', value: summary.pending_sent || 0, color: 'yellow.300' },
            { label: 'உறுதிப்படுத்தவும்', value: summary.pending_my_action || 0, color: 'purple.300' },
          ].map((s, i) => (
            <Box key={i} bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
              borderRadius="2xl" px={4} py={4} textAlign="center">
              <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color={s.color}>{s.value}</Text>
              <Text fontSize={{ base: '9px', md: 'xs' }} color="whiteAlpha.600" mt={1}>{s.label}</Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* Section 3 — Birthday Banner */}
        <BirthdayBanner />
        <SuggestionsBanner />

        {/* Section 4 — Pending Verifications */}
        {pending.length > 0 && (
          <Box {...sectionBox} borderColor="yellow.600" borderLeftWidth="4px">
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="yellow.300" mb={3}>
              ⚠️ உறுதிப்படுத்தல் தேவை ({pending.length})
            </Text>
            <VStack spacing={2} align="stretch">
              {pending.map(rel => (
                <HStack key={rel.id} justify="space-between" bg="whiteAlpha.100"
                  borderRadius="xl" px={4} py={3}>
                  <HStack spacing={3}>
                    <Avatar size="sm" name={rel.to_user?.name} src={rel.to_user?.profile_photo} />
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="white">{rel.to_user?.name}</Text>
                      <Text fontSize="xs" color="whiteAlpha.500">
                        உங்கள் <Text as="span" color="purple.300">{rel.relation_tamil}</Text> என்று சொல்கிறார்
                      </Text>
                    </Box>
                  </HStack>
                  <HStack spacing={2}>
                    <Button size="sm" colorScheme="green" borderRadius="lg"
                      isLoading={actionLoading === rel.id}
                      onClick={() => handleVerify(rel.id)}>✓</Button>
                    <Button size="sm" colorScheme="red" variant="outline" borderRadius="lg"
                      isLoading={actionLoading === rel.id}
                      onClick={() => handleReject(rel.id)}>✗</Button>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Section 5 — Quick Actions */}
        <Box {...sectionBox}>
          <SimpleGrid columns={{ base: 3, sm: 6 }} spacing={3}>
            {navItems.map((item, i) => (
              <VStack key={i} spacing={1} align="center" cursor="pointer"
                onClick={() => navigate(item.path)}
                bg={window.location.pathname === item.path ? 'purple.800' : 'whiteAlpha.50'}
                border="1px solid"
                borderColor={window.location.pathname === item.path ? 'purple.400' : 'whiteAlpha.100'}
                borderRadius="xl" py={3}
                _hover={{ bg: 'purple.800', borderColor: 'purple.400' }}
                transition="all 0.2s"
              >
                <Text fontSize="xl">{item.icon}</Text>
                <Text fontSize={{ base: '9px', md: 'xs' }} color="whiteAlpha.700" fontWeight="600">{item.ta}</Text>
              </VStack>
            ))}
          </SimpleGrid>
        </Box>

        {/* Section 6 — Family Tree */}
        <Box {...sectionBox}>
          <HStack justify="space-between" mb={4}>
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white">
              🌳 குடும்ப மரம் / Family Tree
            </Text>
            <HStack spacing={2}>
              {relationships.length > 0 && (
                <ShareTree treeRef={treeRef} userName={user?.name} memberCount={relationships.length} />
              )}
              <Button size="sm" bgGradient="linear(to-r, purple.600, green.500)"
                color="white" borderRadius="xl" onClick={() => navigate('/add-relative')}>
                + சேர்
              </Button>
            </HStack>
          </HStack>

          {/* Tree Mode Toggle */}
          <HStack bg="whiteAlpha.100" borderRadius="xl" p={1} mb={4}>
            {[
              { key: 'direct',   label: '👤 நேரடி'     },
              { key: 'extended', label: '🌳 விரிவான'    },
              { key: 'network',  label: '🕸️ நெட்வொர்க்' },
            ].map(t => (
              <Button key={t.key} flex={1} size="sm"
                bg={treeMode === t.key ? 'purple.600' : 'transparent'}
                color={treeMode === t.key ? 'white' : 'whiteAlpha.600'}
                borderRadius="lg"
                onClick={() => setTreeMode(t.key)}
                _hover={{ bg: treeMode === t.key ? 'purple.600' : 'whiteAlpha.100' }}>
                {t.label}
              </Button>
            ))}
          </HStack>

          {/* Tab Toggle */}
          <HStack bg="whiteAlpha.100" borderRadius="xl" p={1} mb={4}>
            {[{ key: 'tree', label: '🌳 மரம்' }, { key: 'list', label: '📋 பட்டியல்' }].map(t => (
              <Button key={t.key} flex={1} size="sm"
                bg={activeTab === t.key ? 'purple.600' : 'transparent'}
                color={activeTab === t.key ? 'white' : 'whiteAlpha.600'}
                borderRadius="lg" onClick={() => setActiveTab(t.key)}
                _hover={{ bg: activeTab === t.key ? 'purple.600' : 'whiteAlpha.100' }}
              >
                {t.label}
              </Button>
            ))}
          </HStack>

          {activeTab === 'tree' && (
            relationships.length === 0 ? (
              <VStack py={10} spacing={3}>
                <Text fontSize="4xl">🌱</Text>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="whiteAlpha.600">
                  குடும்ப மரம் காலி / Family tree is empty
                </Text>
                <Button bgGradient="linear(to-r, purple.600, green.500)" color="white"
                  borderRadius="xl" onClick={() => navigate('/add-relative')}>
                  + குடும்பத்தினரை சேர்
                </Button>
              </VStack>
            ) : treeMode === 'network' ? (
              <FamilyNetwork
                currentUser={user}
                relationships={relationships}
              />
            ) : (
              <Box ref={treeRef} overflowX="auto">
                <FamilyTree
                  relationships={treeMode === 'extended' && extendedRelationships.length > 0
                    ? extendedRelationships
                    : relationships}
                  currentUser={user}
                />
                {treeMode === 'extended' && extendedRelationships.length === 0 && (
                  <Text color="whiteAlpha.400" fontSize="sm" textAlign="center" py={4}>
                    விரிவான குடும்பம் இல்லை / No extended family found yet
                  </Text>
                )}
              </Box>
            )
          )}

          {activeTab === 'list' && (
            <VStack spacing={2} align="stretch">
              {relationships.length === 0 ? (
                <Text color="whiteAlpha.500" textAlign="center" py={6}>
                  குடும்பத்தினர் இல்லை / No family members yet
                </Text>
              ) : relationships.map(rel => (
                <HStack key={rel.id} bg="whiteAlpha.100" borderRadius="xl" px={4} py={3} justify="space-between">
                  <HStack spacing={3}>
                    <Avatar size="sm" name={rel.to_user?.name} src={rel.to_user?.profile_photo} />
                    <Box>
                      <Text fontSize="sm" fontWeight="600" color="white">{rel.to_user?.name}</Text>
                      <Text fontSize="xs" color="whiteAlpha.500">{rel.relation_tamil}</Text>
                    </Box>
                  </HStack>
                  <Badge
                    colorScheme={rel.verification_status === 'verified' ? 'green' : 'yellow'}
                    borderRadius="full" px={2}
                  >
                    {rel.verification_status === 'verified' ? '✓ சரிபார்க்கப்பட்டது' : '⏳ நிலுவை'}
                  </Badge>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

      </VStack>

      {/* FAB */}
      <Box position="fixed" bottom={6} right={6} zIndex={100}>
        <Button
          w="56px" h="56px" borderRadius="full"
          bgGradient="linear(to-r, purple.600, green.500)"
          color="white" fontSize="2xl"
          boxShadow="0 8px 24px rgba(128,0,255,0.4)"
          onClick={() => navigate('/add-relative')}
          _hover={{ transform: 'scale(1.1)', boxShadow: '0 12px 28px rgba(128,0,255,0.5)' }}
          transition="all 0.2s"
        >
          +
        </Button>
      </Box>

      {/* Bottom Nav */}
      <Box position="fixed" bottom={0} left={0} right={0} zIndex={50}
        bg="rgba(15,12,41,0.95)" backdropFilter="blur(20px)"
        borderTop="1px solid" borderColor="whiteAlpha.100" py={2}>
        <HStack justify="space-around" maxW="900px" mx="auto">
          {navItems.map((item, i) => (
            <VStack key={i} spacing={0} align="center" cursor="pointer"
              onClick={() => navigate(item.path)}
              color={window.location.pathname === item.path ? 'purple.300' : 'whiteAlpha.500'}
              _hover={{ color: 'white' }} transition="all 0.2s" py={2} px={3}
            >
              <Text fontSize="xl">{item.icon}</Text>
              <Text fontSize="9px" fontWeight="600">{item.ta}</Text>
            </VStack>
          ))}
        </HStack>
      </Box>

    </Box>
  );
}
