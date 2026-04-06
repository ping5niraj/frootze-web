/**
 * Dashboard.js — frootze 2.0
 * Facebook-style social media portal for family network
 * Light purple/cream theme — feed is primary, tree is highlighted
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Button, Avatar,
  Input, Spinner, SimpleGrid, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, Select, useDisclosure,
} from '@chakra-ui/react';
import api, { getMyRelationships, verifyRelationship, rejectRelationship } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FamilyFeed from '../components/FamilyFeed';
import AdCard from '../components/AdCard';
import ShareTree from '../components/ShareTree';
import BirthdayBanner from '../components/BirthdayBanner';
import SuggestionsBanner from '../components/SuggestionsBanner';
import FamilyTree from '../components/FamilyTree';
import FamilyLinkedIn from '../components/FamilyLinkedIn';
import FamilyNetwork from '../components/FamilyNetwork';

const BOTTOM_NAV = [
  { key: 'home',    icon: '🏠', label: 'முகப்பு'   },
  { key: 'tree',    icon: '🌳', label: 'மரம்'       },
  { key: 'add',     icon: '➕', label: 'சேர்'       },
  { key: 'notify',  icon: '🔔', label: 'அறிவிப்பு' },
  { key: 'profile', icon: '👤', label: 'நான்'       },
];

const QUICK_FEATURES = [
  { icon: '📚', label: 'அகராதி',     path: '/directory'  },
  { icon: '💬', label: 'செய்தி',     path: '/messages'   },
  { icon: '📍', label: 'இடம்',       path: '/locations'  },
  { icon: '🎂', label: 'பிறந்தநாள்', path: '/birthdays'  },
  { icon: '❓', label: 'வினா',       path: '/quiz'       },
];

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
  { value: 'father_in_law',        tamil: 'மாமனார்'                 },
  { value: 'mother_in_law',        tamil: 'மாமியார்'                },
  { value: 'brother_in_law',       tamil: 'மைத்துனன்'              },
  { value: 'sister_in_law',        tamil: 'நாத்தனார்'               },
  { value: 'son_in_law',           tamil: 'மருமகன்'                 },
  { value: 'daughter_in_law',      tamil: 'மருமகள்'                 },
  { value: 'cousin',               tamil: 'உறவினர்'                 },
];

const DIRECT_RELATIONS = new Set([
  'father','mother','father_in_law','mother_in_law',
  'uncle_paternal','uncle_maternal','uncle_elder','uncle_younger',
  'aunt_paternal','aunt_maternal','aunt_by_marriage',
  'spouse','brother','sister','brother_in_law','sister_in_law','cousin',
  'son','daughter','son_in_law','daughter_in_law','nephew','niece',
]);

const card = {
  w: '100%', bg: 'white',
  border: '1px solid', borderColor: 'purple.100',
  borderRadius: '2xl',
  boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const treeRef  = useRef(null);

  const [relationships,         setRelationships]         = useState([]);
  const [extendedRelationships, setExtendedRelationships] = useState([]);
  const [directRelationships,   setDirectRelationships]   = useState([]);
  const [pending,               setPending]               = useState([]);
  const [summary,               setSummary]               = useState({});
  const [familyStats,           setFamilyStats]           = useState(null);
  const [topAds,                setTopAds]                = useState([]);
  const [isAgent,               setIsAgent]               = useState(false);
  const [loading,               setLoading]               = useState(true);
  const [actionLoading,         setActionLoading]         = useState('');
  const [activeNav,             setActiveNav]             = useState('home');
  const [treeMode,              setTreeMode]              = useState('direct');

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [editNode,          setEditNode]          = useState(null);
  const [editRelationType,  setEditRelationType]  = useState('');
  const [editLoading,       setEditLoading]       = useState(false);
  const [editError,         setEditError]         = useState('');

  useEffect(() => { if (user?.id) fetchAll(); }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/relationships/tree/${user.id}`)
      .then(res => {
        const seenIds = new Set();
        const ext = (res.data.nodes || [])
          .filter(n => { if (seenIds.has(n.id)) return false; seenIds.add(n.id); return true; })
          .map(n => ({
            id: n.relationship_id || null,
            relation_type: n.relation_type,
            relation_tamil: n.relation_tamil,
            verification_status: 'verified',
            is_offline: n.is_offline,
            to_user: { id: n.id, name: n.name, kutham: n.kutham, is_offline: n.is_offline },
          }));
        setExtendedRelationships(ext);
      })
      .catch(() => setExtendedRelationships([]));
  }, [user?.id]);

  const fetchAll = async () => {
    try {
      const res = await getMyRelationships();
      const allRels  = res.data.my_relationships || [];
      const pendList = res.data.pending_verification || [];
      setRelationships(allRels);
      setDirectRelationships(allRels.filter(r => DIRECT_RELATIONS.has(r.relation_type)));
      setPending(pendList);
      setSummary(res.data.summary || {});
      try { const sRes = await api.get(`/api/posts/stats/${user.id}`);  setFamilyStats(sRes.data.stats || null); } catch (e) {}
      try { const aRes = await api.get(`/api/ads/feed/${user.id}`);     setTopAds(aRes.data.ads || []);          } catch (e) {}
      try { const uRes = await api.get('/api/users/me');                 setIsAgent(uRes.data.user?.is_business_agent === true); } catch (e) {}
    } catch (e) {
      setRelationships([]); setPending([]); setSummary({});
    } finally { setLoading(false); }
  };

  const handleVerify = async (id) => {
    setActionLoading(id);
    try { await verifyRelationship(id); await fetchAll(); } catch (e) {}
    finally { setActionLoading(''); }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try { await rejectRelationship(id); await fetchAll(); } catch (e) {}
    finally { setActionLoading(''); }
  };

  const handleNodeClick = (node) => {
    setEditNode(node);
    setEditRelationType(node.relationType || '');
    setEditError(node.relationId ? '' : 'இந்த உறவு நேரடியாக சேர்க்கப்படவில்லை — திருத்த முடியாது');
    onEditOpen();
  };

  const handleEditSave = async () => {
    if (!editNode || !editRelationType) return;
    setEditLoading(true); setEditError('');
    try {
      const newTamil = ALL_RELATIONS.find(r => r.value === editRelationType)?.tamil || editRelationType;
      await api.put(`/api/relationships/${editNode.relationId}`, { relation_type: editRelationType, relation_tamil: newTamil });
      onEditClose(); await fetchAll();
    } catch (e) { setEditError(e.response?.data?.error || 'Failed to update'); }
    finally { setEditLoading(false); }
  };

  if (loading) return (
    <Box minH="100vh" bg="purple.50" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Text fontSize="5xl">🌳</Text>
        <Spinner color="purple.500" size="lg" />
        <Text color="purple.400" fontSize="md">குடும்ப மரம் ஏற்றுகிறோம்...</Text>
      </VStack>
    </Box>
  );

  return (
    <Box minH="100vh" bg="#f5f3ff" pb={24}>

      {/* TOP BAR */}
      <Box position="sticky" top={0} zIndex={100}
        bg="white" borderBottom="1px solid" borderColor="purple.100"
        boxShadow="0 2px 8px rgba(124,58,237,0.08)"
        px={{ base: 4, md: 8 }} py={3}>
        <HStack maxW="900px" mx="auto" justify="space-between">
          <HStack spacing={2} cursor="pointer" onClick={() => setActiveNav('home')}>
            <Text fontSize="xl">🌳</Text>
            <Text fontSize="xl" fontWeight="900"
              bgGradient="linear(to-r, purple.600, green.500)" bgClip="text">
              frootze
            </Text>
          </HStack>
          <Box display={{ base: 'none', md: 'block' }} flex={1} mx={8}>
            <Input placeholder="🔍 தேடுங்கள்..."
              bg="purple.50" border="none" borderRadius="full"
              color="purple.800" fontSize="sm"
              _placeholder={{ color: 'purple.300' }}
              _focus={{ bg: 'purple.100', boxShadow: 'none' }}
              readOnly onClick={() => navigate('/directory')} cursor="pointer" />
          </Box>
          <HStack spacing={2}>
            <Button size="sm" variant="ghost" color="purple.600" borderRadius="full" px={3}
              onClick={() => navigate('/messages')}>💬</Button>
            {isAgent && (
              <Button size="sm" bgGradient="linear(to-r, purple.500, green.400)"
                color="white" borderRadius="full" fontSize="xs" fontWeight="700"
                onClick={() => navigate('/create-ad')}>📢 Ad</Button>
            )}
            <Avatar size="sm" name={user?.name} src={user?.profile_photo}
              border="2px solid" borderColor="purple.300"
              cursor="pointer" onClick={() => setActiveNav('profile')} />
          </HStack>
        </HStack>
      </Box>

      {/* MAIN CONTENT */}
      <Box maxW="680px" mx="auto" px={{ base: 3, md: 4 }} pt={4}>

        {/* ══ HOME ══ */}
        {activeNav === 'home' && (
          <VStack spacing={4} align="stretch">
            <BirthdayBanner />
            <SuggestionsBanner onRelationAdded={fetchAll} />

            {/* Family Stats Bar */}
            {familyStats && (
              <Box {...card} px={4} py={4}>
                <SimpleGrid columns={4} spacing={3}>
                  {[
                    { icon: '👨‍👩‍👧‍👦', label: 'உறவினர்',    value: familyStats.total_relatives,   color: 'purple.600' },
                    { icon: '🏮',        label: 'குதம்',       value: familyStats.kutham_count,       color: 'orange.500' },
                    { icon: '🎂',        label: 'பிறந்தநாள்', value: familyStats.upcoming_birthdays, color: 'pink.500'   },
                    { icon: '📸',        label: 'பதிவுகள்',   value: familyStats.total_posts,        color: 'blue.500'   },
                  ].map((s, i) => (
                    <VStack key={i} spacing={0} align="center"
                      bg="purple.50" borderRadius="xl" py={3}
                      border="1px solid" borderColor="purple.100">
                      <Text fontSize="xl">{s.icon}</Text>
                      <Text fontSize="xl" fontWeight="800" color={s.color}>{s.value}</Text>
                      <Text fontSize="9px" color="gray.500" textAlign="center">{s.label}</Text>
                    </VStack>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Family Tree Preview Card */}
            <Box {...card} px={4} py={4}
              bgGradient="linear(135deg, white 60%, purple.50 100%)"
              cursor="pointer" onClick={() => setActiveNav('tree')}
              _hover={{ boxShadow: '0 4px 20px rgba(124,58,237,0.15)', borderColor: 'purple.300' }}
              transition="all 0.2s">
              <HStack justify="space-between" mb={3}>
                <VStack spacing={0} align="flex-start">
                  <Text fontSize="md" fontWeight="800" color="purple.800">🌳 உங்கள் குடும்ப மரம்</Text>
                  <HStack spacing={2} mt={1}>
                    <Badge colorScheme="purple" borderRadius="full" fontSize="10px" px={2}>
                      {relationships.length} உறவினர்
                    </Badge>
                    {familyStats?.kutham_count > 0 && (
                      <Badge colorScheme="orange" borderRadius="full" fontSize="10px" px={2}>
                        {familyStats.kutham_count} குதம்
                      </Badge>
                    )}
                  </HStack>
                </VStack>
                <Button size="sm" colorScheme="purple" borderRadius="xl" fontWeight="700">
                  மரம் பார்க்க →
                </Button>
              </HStack>
              {relationships.length > 0 ? (
                <HStack spacing={2} flexWrap="wrap">
                  {relationships.slice(0, 5).map(rel => (
                    <HStack key={rel.id} bg="white" border="1px solid" borderColor="purple.100"
                      borderRadius="full" px={3} py={1} spacing={2}>
                      <Avatar size="2xs" name={rel.to_user?.name} />
                      <Text fontSize="11px" color="purple.700" fontWeight="600">
                        {rel.to_user?.name?.split(' ')[0]}
                      </Text>
                      <Text fontSize="10px" color="purple.400">{rel.relation_tamil}</Text>
                    </HStack>
                  ))}
                  {relationships.length > 5 && (
                    <Text fontSize="11px" color="purple.400">+{relationships.length - 5} மேலும்</Text>
                  )}
                </HStack>
              ) : (
                <Text fontSize="sm" color="purple.300">குடும்பத்தினரை சேர்க்க + சேர் பொத்தானை கிளிக் செய்யவும்</Text>
              )}
            </Box>

            {/* Quick Feature Icons */}
            <Box {...card} px={4} py={4}>
              <SimpleGrid columns={5} spacing={2}>
                {QUICK_FEATURES.map((f, i) => (
                  <VStack key={i} spacing={1} cursor="pointer"
                    onClick={() => navigate(f.path)}
                    bg="purple.50" borderRadius="xl" py={3}
                    border="1px solid" borderColor="purple.100"
                    _hover={{ bg: 'purple.100', borderColor: 'purple.300' }}
                    transition="all 0.15s">
                    <Text fontSize="22px">{f.icon}</Text>
                    <Text fontSize="9px" fontWeight="700" color="purple.600" textAlign="center">{f.label}</Text>
                  </VStack>
                ))}
              </SimpleGrid>
            </Box>

            {/* Pending Verifications */}
            {pending.length > 0 && (
              <Box {...card} px={4} py={4} borderLeft="4px solid" borderLeftColor="yellow.400">
                <Text fontSize="sm" fontWeight="700" color="yellow.700" mb={3}>
                  ⚠️ உறுதிப்படுத்தல் தேவை ({pending.length})
                </Text>
                <VStack spacing={2} align="stretch">
                  {pending.map(rel => (
                    <HStack key={rel.id} justify="space-between"
                      bg="yellow.50" borderRadius="xl" px={4} py={3}
                      border="1px solid" borderColor="yellow.200">
                      <HStack spacing={3}>
                        <Avatar size="sm" name={rel.to_user?.name} />
                        <Box>
                          <Text fontSize="sm" fontWeight="600" color="gray.800">{rel.to_user?.name}</Text>
                          <Text fontSize="xs" color="gray.500">
                            உங்கள் <Text as="span" color="purple.600" fontWeight="600">{rel.relation_tamil}</Text>
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

            {/* Ads at top of feed */}
            {topAds.length > 0 && (
              <VStack spacing={3} align="stretch">
                {topAds.map(ad => <AdCard key={ad.id} ad={ad} />)}
              </VStack>
            )}

            {/* Family Feed */}
            <FamilyFeed currentUser={user} />
          </VStack>
        )}

        {/* ══ TREE ══ */}
        {activeNav === 'tree' && (
          <VStack spacing={4} align="stretch">
            <Box {...card} px={3} py={3}>
              <HStack spacing={1} flexWrap="wrap">
                {[
                  { key: 'direct',   label: '👤 நேரடி'      },
                  { key: 'extended', label: '🌳 விரிவான'     },
                  { key: 'network',  label: '🕸️ நெட்வொர்க்' },
                  { key: 'linkedin', label: '🔗 வலைதளம்'    },
                ].map(t => (
                  <Button key={t.key} flex={1} size="sm"
                    bg={treeMode === t.key ? 'purple.600' : 'purple.50'}
                    color={treeMode === t.key ? 'white' : 'purple.600'}
                    borderRadius="xl" fontWeight="600"
                    border="1px solid" borderColor="purple.200"
                    onClick={() => setTreeMode(t.key)}
                    _hover={{ bg: treeMode === t.key ? 'purple.700' : 'purple.100' }}>
                    {t.label}
                  </Button>
                ))}
              </HStack>
            </Box>
            <HStack spacing={2}>
              {relationships.length > 0 && (
                <Box flex={1}>
                  <ShareTree treeRef={treeRef} userName={user?.name} memberCount={relationships.length} />
                </Box>
              )}
              <Button bgGradient="linear(to-r, purple.600, green.500)"
                color="white" borderRadius="xl" fontWeight="700"
                onClick={() => navigate('/add-relative')}>+ சேர்</Button>
            </HStack>
            <Box {...card} px={4} py={4} overflowX="auto">
              {treeMode === 'linkedin' ? (
                <FamilyLinkedIn currentUser={user} onRelationAdded={fetchAll} />
              ) : treeMode === 'network' ? (
                <FamilyNetwork currentUser={user} relationships={relationships} />
              ) : (
                <Box ref={treeRef}>
                  <FamilyTree
                    relationships={treeMode === 'extended' && extendedRelationships.length > 0 ? extendedRelationships : directRelationships}
                    currentUser={user} onNodeClick={handleNodeClick}
                  />
                </Box>
              )}
            </Box>
          </VStack>
        )}

        {/* ══ NOTIFICATIONS ══ */}
        {activeNav === 'notify' && (
          <Box {...card} px={4} py={4}>
            <Text fontSize="md" fontWeight="700" color="purple.800" mb={4}>🔔 அறிவிப்புகள்</Text>
            {pending.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text fontSize="3xl">✅</Text>
                <Text color="gray.400" fontSize="sm">புதிய அறிவிப்புகள் இல்லை</Text>
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch">
                {pending.map(rel => (
                  <HStack key={rel.id} justify="space-between"
                    bg="purple.50" borderRadius="xl" px={4} py={3}
                    border="1px solid" borderColor="purple.100">
                    <HStack spacing={3}>
                      <Avatar size="sm" name={rel.to_user?.name} />
                      <Box>
                        <Text fontSize="sm" fontWeight="600" color="gray.800">{rel.to_user?.name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          உங்கள் <Text as="span" color="purple.600">{rel.relation_tamil}</Text> என்று கோருகிறார்
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
            )}
          </Box>
        )}

        {/* ══ PROFILE ══ */}
        {activeNav === 'profile' && (
          <VStack spacing={4} align="stretch">
            <Box {...card} px={4} py={6} textAlign="center">
              <Avatar size="xl" name={user?.name} src={user?.profile_photo}
                border="3px solid" borderColor="purple.400" mx="auto" mb={3} />
              <Text fontSize="xl" fontWeight="800" color="purple.800">{user?.name}</Text>
              <Text fontSize="sm" color="gray.500" mb={1}>{user?.phone}</Text>
              {user?.kutham && (
                <Badge colorScheme="purple" borderRadius="full" px={3} fontSize="sm">{user.kutham}</Badge>
              )}
              <HStack justify="center" spacing={4} mt={4}>
                <Button colorScheme="purple" borderRadius="xl" size="sm" onClick={() => navigate('/profile')}>✏️ திருத்து</Button>
                <Button variant="outline" colorScheme="red" borderRadius="xl" size="sm"
                  onClick={() => { logout(); window.location.href = '/'; }}>வெளியேறு</Button>
              </HStack>
            </Box>
            <Box {...card} px={4} py={4}>
              <SimpleGrid columns={3} spacing={3}>
                {[
                  { label: 'சரிபார்க்கப்பட்டது', value: summary.total_verified || 0,    color: 'green.500'  },
                  { label: 'அனுப்பியது',          value: summary.pending_sent || 0,      color: 'yellow.600' },
                  { label: 'உறுதிப்படுத்தவும்',  value: summary.pending_my_action || 0, color: 'purple.600' },
                ].map((s, i) => (
                  <VStack key={i} spacing={0} bg="purple.50" borderRadius="xl" py={4}
                    border="1px solid" borderColor="purple.100">
                    <Text fontSize="2xl" fontWeight="800" color={s.color}>{s.value}</Text>
                    <Text fontSize="9px" color="gray.500" textAlign="center" mt={1}>{s.label}</Text>
                  </VStack>
                ))}
              </SimpleGrid>
            </Box>
            {isAgent && (
              <Box {...card} px={4} py={4}
                bgGradient="linear(135deg, purple.50, green.50)"
                border="1px solid" borderColor="purple.200">
                <HStack justify="space-between">
                  <VStack spacing={0} align="flex-start">
                    <Text fontSize="sm" fontWeight="700" color="purple.800">🏢 Business Agent</Text>
                    <Text fontSize="xs" color="gray.500">விளம்பரம் வெளியிட அனுமதி உள்ளது</Text>
                  </VStack>
                  <Button size="sm" colorScheme="purple" borderRadius="xl"
                    onClick={() => navigate('/create-ad')}>📢 Ad வெளியிடு</Button>
                </HStack>
              </Box>
            )}
          </VStack>
        )}

      </Box>

      {/* BOTTOM NAV */}
      <Box position="fixed" bottom={0} left={0} right={0} zIndex={100}
        bg="white" borderTop="1px solid" borderColor="purple.100"
        boxShadow="0 -2px 12px rgba(124,58,237,0.08)" py={2}>
        <HStack justify="space-around" maxW="680px" mx="auto">
          {BOTTOM_NAV.map(n => (
            <VStack key={n.key} spacing={0} align="center" cursor="pointer"
              color={activeNav === n.key ? 'purple.600' : 'gray.400'}
              onClick={() => { if (n.key === 'add') { navigate('/add-relative'); return; } setActiveNav(n.key); }}
              _hover={{ color: 'purple.500' }} transition="all 0.15s" py={1} px={3}>
              <Box fontSize="22px"
                bg={activeNav === n.key ? 'purple.100' : 'transparent'}
                borderRadius="xl" px={3} py={1} transition="all 0.15s">
                <Text>{n.icon}</Text>
              </Box>
              <Text fontSize="9px" fontWeight={activeNav === n.key ? '700' : '500'}>{n.label}</Text>
            </VStack>
          ))}
        </HStack>
      </Box>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
        <ModalOverlay bg="blackAlpha.500" />
        <ModalContent bg="white" border="1px solid" borderColor="purple.200"
          borderRadius="2xl" mx={4} boxShadow="xl">
          <ModalHeader color="purple.800" fontSize="md">✏️ உறவு மாற்று — {editNode?.name}</ModalHeader>
          <ModalBody>
            <Text fontSize="sm" color="gray.500" mb={3}>
              தற்போதைய உறவு: <Text as="span" color="purple.600" fontWeight="700">
                {ALL_RELATIONS.find(r => r.value === editNode?.relationType)?.tamil || editNode?.relationType}
              </Text>
            </Text>
            <Select value={editRelationType} onChange={e => setEditRelationType(e.target.value)}
              borderColor="purple.200" color="purple.800" _focus={{ borderColor: 'purple.400' }}>
              {ALL_RELATIONS.map(r => <option key={r.value} value={r.value}>{r.tamil} / {r.value}</option>)}
            </Select>
            {editError && <Text color="red.500" fontSize="sm" mt={2}>{editError}</Text>}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" color="gray.500" onClick={onEditClose}>ரத்து</Button>
            <Button bgGradient="linear(to-r, purple.600, green.500)"
              color="white" borderRadius="xl" fontWeight="700"
              isLoading={editLoading}
              isDisabled={!editRelationType || editRelationType === editNode?.relationType || !editNode?.relationId}
              onClick={handleEditSave}>சேமி</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}
