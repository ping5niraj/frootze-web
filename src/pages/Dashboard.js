/**
 * Dashboard.js — frootze 2.0 (Polished)
 * Changes from previous version:
 *   1. Search bar — functional inline dropdown (name, kutham, district)
 *   2. Stats bar (4 tiles) — removed
 *   3. Create post area — beautified and clearly visible
 *   4. Overall theme — cleaner cards, stronger contrast, tighter spacing
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

// ─── Navigation ──────────────────────────────────────────────
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

// ─── Shared card style ───────────────────────────────────────
const card = {
  w: '100%',
  bg: 'white',
  border: '1px solid',
  borderColor: 'purple.100',
  borderRadius: '2xl',
  boxShadow: '0 1px 8px rgba(124,58,237,0.07)',
};

// ─────────────────────────────────────────
// InlineSearch — functional dropdown search in top bar
// Searches: name, kutham, district from /api/users/directory
// ─────────────────────────────────────────
function InlineSearch() {
  const navigate   = useNavigate();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const wrapRef = useRef(null);

  // Load directory once on mount
  useEffect(() => {
    api.get('/api/users/directory?all=true')
      .then(res => {
        setAllUsers(res.data.users || res.data.members || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Filter on query change
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const q = query.toLowerCase();
    const matched = allUsers.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.kutham?.toLowerCase().includes(q) ||
      m.district?.toLowerCase().includes(q) ||
      m.phone?.includes(q)
    ).slice(0, 6); // max 6 results in dropdown
    setResults(matched);
    setOpen(matched.length > 0);
  }, [query, allUsers]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <Box ref={wrapRef} position="relative" flex={1} mx={{ base: 2, md: 8 }}>
      <Input
        placeholder="🔍 பெயர், குதம், மாவட்டம் தேடுங்கள்..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        bg="purple.50"
        border="1.5px solid"
        borderColor="purple.200"
        borderRadius="full"
        color="purple.900"
        fontSize="sm"
        h="38px"
        _placeholder={{ color: 'purple.300' }}
        _focus={{ bg: 'white', borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(124,58,237,0.12)' }}
      />

      {/* Dropdown results */}
      {open && (
        <Box
          position="absolute"
          top="44px"
          left={0}
          right={0}
          bg="white"
          border="1.5px solid"
          borderColor="purple.200"
          borderRadius="2xl"
          boxShadow="0 8px 32px rgba(124,58,237,0.15)"
          zIndex={999}
          overflow="hidden"
        >
          {results.map(m => (
            <HStack
              key={m.id}
              px={4} py={3}
              spacing={3}
              cursor="pointer"
              _hover={{ bg: 'purple.50' }}
              borderBottom="1px solid"
              borderColor="purple.50"
              onClick={() => {
                setQuery('');
                setOpen(false);
                navigate('/directory');
              }}
            >
              <Avatar size="sm" name={m.name} src={m.profile_photo}
                border="1.5px solid" borderColor="purple.200" />
              <Box flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="700" color="purple.900" noOfLines={1}>
                  {m.name}
                </Text>
                <HStack spacing={2} mt={0.5} flexWrap="wrap">
                  {m.kutham && (
                    <Badge colorScheme="purple" fontSize="9px" borderRadius="full" px={2}>
                      {m.kutham}
                    </Badge>
                  )}
                  {m.district && (
                    <Text fontSize="10px" color="gray.400">📍 {m.district}</Text>
                  )}
                </HStack>
              </Box>
              <Text fontSize="10px" color="purple.300">→</Text>
            </HStack>
          ))}

          {/* View all results link */}
          <HStack
            px={4} py={3} cursor="pointer"
            bg="purple.50"
            _hover={{ bg: 'purple.100' }}
            justify="center"
            onClick={() => { setOpen(false); navigate('/directory'); }}
          >
            <Text fontSize="12px" color="purple.600" fontWeight="700">
              அகராதியில் அனைத்தும் காண →
            </Text>
          </HStack>
        </Box>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const treeRef  = useRef(null);

  const [relationships,         setRelationships]         = useState([]);
  const [extendedRelationships, setExtendedRelationships] = useState([]);
  const [directRelationships,   setDirectRelationships]   = useState([]);
  const [pending,               setPending]               = useState([]);
  const [summary,               setSummary]               = useState({});
  const [topAds,                setTopAds]                = useState([]);
  const [isAgent,               setIsAgent]               = useState(false);
  const [loading,               setLoading]               = useState(true);
  const [actionLoading,         setActionLoading]         = useState('');
  const [activeNav,             setActiveNav]             = useState('home');
  const [treeMode,              setTreeMode]              = useState('direct');

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [editNode,         setEditNode]         = useState(null);
  const [editRelationType, setEditRelationType] = useState('');
  const [editLoading,      setEditLoading]      = useState(false);
  const [editError,        setEditError]        = useState('');

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
      try { const aRes = await api.get(`/api/ads/feed/${user.id}`); setTopAds(aRes.data.ads || []); } catch (e) {}
      try { const uRes = await api.get('/api/users/me'); setIsAgent(uRes.data.user?.is_business_agent === true); } catch (e) {}
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
    <Box minH="100vh" bg="#f5f3ff" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Text fontSize="5xl">🌳</Text>
        <Spinner color="purple.500" size="lg" />
        <Text color="purple.400" fontSize="md">குடும்ப மரம் ஏற்றுகிறோம்...</Text>
      </VStack>
    </Box>
  );

  return (
    <Box minH="100vh" bg="#f5f3ff" pb={24}>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <Box
        position="sticky" top={0} zIndex={200}
        bg="white"
        borderBottom="1px solid" borderColor="purple.100"
        boxShadow="0 2px 12px rgba(124,58,237,0.08)"
        px={{ base: 3, md: 8 }} py={3}
      >
        <HStack maxW="900px" mx="auto" spacing={2}>
          {/* Logo */}
          <HStack
            spacing={2} cursor="pointer" flexShrink={0}
            onClick={() => setActiveNav('home')}
          >
            <Text fontSize="20px">🌳</Text>
            <Text
              fontSize="20px" fontWeight="900" letterSpacing="-0.5px"
              bgGradient="linear(to-r, purple.600, green.500)"
              bgClip="text"
              display={{ base: 'none', sm: 'block' }}
            >
              frootze
            </Text>
          </HStack>

          {/* Inline search */}
          <InlineSearch />

          {/* Right side actions */}
          <HStack spacing={2} flexShrink={0}>
            <Button
              size="sm" variant="ghost" color="purple.500"
              borderRadius="full" px={2} fontSize="18px"
              _hover={{ bg: 'purple.50' }}
              onClick={() => navigate('/messages')}
            >
              💬
            </Button>
            {isAgent && (
              <Button
                size="xs"
                bgGradient="linear(to-r, purple.500, green.500)"
                color="white" borderRadius="full"
                fontSize="11px" fontWeight="700"
                px={3} h="30px"
                _hover={{ opacity: 0.9 }}
                onClick={() => navigate('/create-ad')}
              >
                📢 Ad
              </Button>
            )}
            <Avatar
              size="sm" name={user?.name} src={user?.profile_photo}
              border="2px solid" borderColor="purple.300"
              cursor="pointer"
              onClick={() => setActiveNav('profile')}
            />
          </HStack>
        </HStack>
      </Box>

      {/* ── PAGE CONTENT ────────────────────────────────────── */}
      <Box maxW="680px" mx="auto" px={{ base: 3, md: 4 }} pt={5}>

        {/* ══════════════════════════════════════════
            HOME TAB
        ══════════════════════════════════════════ */}
        {activeNav === 'home' && (
          <VStack spacing={4} align="stretch">

            {/* Banners */}
            <BirthdayBanner />
            <SuggestionsBanner onRelationAdded={fetchAll} />

            {/* ── Family Tree Preview Card ──────────── */}
            <Box
              {...card}
              px={5} py={4}
              cursor="pointer"
              position="relative"
              overflow="hidden"
              onClick={() => setActiveNav('tree')}
              _hover={{ borderColor: 'purple.300', boxShadow: '0 4px 20px rgba(124,58,237,0.13)' }}
              transition="all 0.2s"
            >
              {/* Background accent */}
              <Box
                position="absolute" right="-20px" top="-20px"
                w="120px" h="120px" borderRadius="full"
                bg="purple.50" opacity={0.8}
                pointerEvents="none"
              />

              <HStack justify="space-between" align="flex-start" position="relative">
                <VStack spacing={2} align="flex-start">
                  <Text fontSize="16px" fontWeight="800" color="purple.800">
                    🌳 உங்கள் குடும்ப மரம்
                  </Text>
                  <HStack spacing={2} flexWrap="wrap">
                    <Badge
                      bg="purple.100" color="purple.700"
                      borderRadius="full" fontSize="11px" px={3} py={1}
                      fontWeight="700"
                    >
                      {relationships.length} உறவினர்
                    </Badge>
                    <Badge
                      bg="orange.100" color="orange.700"
                      borderRadius="full" fontSize="11px" px={3} py={1}
                      fontWeight="700"
                    >
                      {summary.total_verified || 0} சரிபார்க்கப்பட்டது
                    </Badge>
                  </HStack>
                </VStack>
                <Button
                  size="sm" colorScheme="purple" borderRadius="xl"
                  fontWeight="700" fontSize="13px"
                  flexShrink={0}
                >
                  மரம் பார்க்க →
                </Button>
              </HStack>

              {/* Family member chips */}
              {relationships.length > 0 && (
                <HStack spacing={2} mt={4} flexWrap="wrap">
                  {relationships.slice(0, 4).map(rel => (
                    <HStack
                      key={rel.id}
                      bg="purple.50" border="1px solid" borderColor="purple.100"
                      borderRadius="full" pl={1} pr={3} py={1}
                      spacing={2}
                    >
                      <Avatar size="2xs" name={rel.to_user?.name} />
                      <Text fontSize="11px" color="purple.800" fontWeight="600">
                        {rel.to_user?.name?.split(' ')[0]}
                      </Text>
                      <Text fontSize="10px" color="purple.400">{rel.relation_tamil}</Text>
                    </HStack>
                  ))}
                  {relationships.length > 4 && (
                    <Text fontSize="11px" color="purple.400" fontWeight="600">
                      +{relationships.length - 4} மேலும்
                    </Text>
                  )}
                </HStack>
              )}

              {relationships.length === 0 && (
                <Text fontSize="13px" color="purple.300" mt={3}>
                  + சேர் பொத்தான் அழுத்தி குடும்பத்தினரை சேர்க்கவும்
                </Text>
              )}
            </Box>

            {/* ── Quick Feature Icons ───────────────── */}
            <Box {...card} px={4} py={4}>
              <SimpleGrid columns={5} spacing={2}>
                {QUICK_FEATURES.map((f, i) => (
                  <VStack
                    key={i} spacing={1} cursor="pointer"
                    onClick={() => navigate(f.path)}
                    bg="white"
                    border="1.5px solid" borderColor="purple.100"
                    borderRadius="xl" py={3}
                    _hover={{ bg: 'purple.50', borderColor: 'purple.300', transform: 'translateY(-1px)' }}
                    _active={{ transform: 'translateY(0px)' }}
                    transition="all 0.15s"
                    boxShadow="0 1px 4px rgba(124,58,237,0.06)"
                  >
                    <Text fontSize="24px">{f.icon}</Text>
                    <Text fontSize="10px" fontWeight="700" color="purple.600" textAlign="center">
                      {f.label}
                    </Text>
                  </VStack>
                ))}
              </SimpleGrid>
            </Box>

            {/* ── Pending Verifications ─────────────── */}
            {pending.length > 0 && (
              <Box
                {...card}
                px={5} py={4}
                borderLeft="4px solid"
                borderLeftColor="yellow.400"
              >
                <Text fontSize="14px" fontWeight="700" color="yellow.700" mb={3}>
                  ⚠️ உறுதிப்படுத்தல் தேவை ({pending.length})
                </Text>
                <VStack spacing={2} align="stretch">
                  {pending.map(rel => (
                    <HStack
                      key={rel.id}
                      justify="space-between"
                      bg="yellow.50" borderRadius="xl"
                      px={4} py={3}
                      border="1px solid" borderColor="yellow.200"
                    >
                      <HStack spacing={3}>
                        <Avatar size="sm" name={rel.to_user?.name}
                          border="1.5px solid" borderColor="yellow.300" />
                        <Box>
                          <Text fontSize="13px" fontWeight="700" color="gray.800">
                            {rel.to_user?.name}
                          </Text>
                          <Text fontSize="11px" color="gray.500">
                            உங்கள்{' '}
                            <Text as="span" color="purple.600" fontWeight="700">
                              {rel.relation_tamil}
                            </Text>
                            {' '}என்று கோருகிறார்
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

            {/* ── Ads at top of feed ────────────────── */}
            {topAds.length > 0 && (
              <VStack spacing={3} align="stretch">
                {topAds.map(ad => <AdCard key={ad.id} ad={ad} />)}
              </VStack>
            )}

            {/* ── Family Feed ───────────────────────── */}
            <FamilyFeed currentUser={user} />

          </VStack>
        )}

        {/* ══════════════════════════════════════════
            TREE TAB
        ══════════════════════════════════════════ */}
        {activeNav === 'tree' && (
          <VStack spacing={4} align="stretch">

            {/* Tree mode selector */}
            <Box {...card} px={3} py={3}>
              <HStack spacing={1} flexWrap="wrap">
                {[
                  { key: 'direct',   label: '👤 நேரடி'      },
                  { key: 'extended', label: '🌳 விரிவான'     },
                  { key: 'network',  label: '🕸️ நெட்வொர்க்' },
                  { key: 'linkedin', label: '🔗 வலைதளம்'    },
                ].map(t => (
                  <Button key={t.key} flex={1} size="sm"
                    bg={treeMode === t.key ? 'purple.600' : 'white'}
                    color={treeMode === t.key ? 'white' : 'purple.600'}
                    borderRadius="xl" fontWeight="600"
                    border="1.5px solid"
                    borderColor={treeMode === t.key ? 'purple.600' : 'purple.200'}
                    onClick={() => setTreeMode(t.key)}
                    _hover={{ bg: treeMode === t.key ? 'purple.700' : 'purple.50' }}>
                    {t.label}
                  </Button>
                ))}
              </HStack>
            </Box>

            {/* Share + Add */}
            <HStack spacing={3}>
              {relationships.length > 0 && (
                <Box flex={1}>
                  <ShareTree treeRef={treeRef} userName={user?.name} memberCount={relationships.length} />
                </Box>
              )}
              <Button
                bgGradient="linear(to-r, purple.600, green.500)"
                color="white" borderRadius="xl" fontWeight="700"
                onClick={() => navigate('/add-relative')}
              >
                + சேர்
              </Button>
            </HStack>

            {/* Tree canvas */}
            <Box {...card} px={4} py={4} overflowX="auto">
              {treeMode === 'linkedin' ? (
                <FamilyLinkedIn currentUser={user} onRelationAdded={fetchAll} />
              ) : treeMode === 'network' ? (
                <FamilyNetwork currentUser={user} relationships={relationships} />
              ) : (
                <Box ref={treeRef}>
                  <FamilyTree
                    relationships={
                      treeMode === 'extended' && extendedRelationships.length > 0
                        ? extendedRelationships
                        : directRelationships
                    }
                    currentUser={user}
                    onNodeClick={handleNodeClick}
                  />
                </Box>
              )}
            </Box>

          </VStack>
        )}

        {/* ══════════════════════════════════════════
            NOTIFICATIONS TAB
        ══════════════════════════════════════════ */}
        {activeNav === 'notify' && (
          <Box {...card} px={5} py={5}>
            <Text fontSize="15px" fontWeight="700" color="purple.800" mb={4}>
              🔔 அறிவிப்புகள்
            </Text>
            {pending.length === 0 ? (
              <VStack py={10} spacing={3}>
                <Text fontSize="3xl">✅</Text>
                <Text color="gray.400" fontSize="14px">புதிய அறிவிப்புகள் இல்லை</Text>
              </VStack>
            ) : (
              <VStack spacing={2} align="stretch">
                {pending.map(rel => (
                  <HStack key={rel.id} justify="space-between"
                    bg="purple.50" borderRadius="xl" px={4} py={3}
                    border="1px solid" borderColor="purple.100">
                    <HStack spacing={3}>
                      <Avatar size="sm" name={rel.to_user?.name}
                        border="1.5px solid" borderColor="purple.300" />
                      <Box>
                        <Text fontSize="13px" fontWeight="700" color="gray.800">
                          {rel.to_user?.name}
                        </Text>
                        <Text fontSize="11px" color="gray.500">
                          உங்கள்{' '}
                          <Text as="span" color="purple.600" fontWeight="700">
                            {rel.relation_tamil}
                          </Text>
                          {' '}என்று கோருகிறார்
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

        {/* ══════════════════════════════════════════
            PROFILE TAB
        ══════════════════════════════════════════ */}
        {activeNav === 'profile' && (
          <VStack spacing={4} align="stretch">

            {/* Profile card */}
            <Box {...card} px={5} py={6} textAlign="center">
              <Box position="relative" display="inline-block" mb={4}>
                <Avatar
                  size="xl" name={user?.name} src={user?.profile_photo}
                  border="3px solid" borderColor="purple.400"
                />
                {isAgent && (
                  <Badge
                    position="absolute" bottom="-4px" right="-4px"
                    colorScheme="green" borderRadius="full"
                    fontSize="9px" px={2} py={1}
                    border="2px solid white"
                  >
                    🏢 Agent
                  </Badge>
                )}
              </Box>
              <Text fontSize="20px" fontWeight="800" color="purple.900">{user?.name}</Text>
              <Text fontSize="13px" color="gray.400" mb={2}>{user?.phone}</Text>
              {user?.kutham && (
                <Badge colorScheme="purple" borderRadius="full" px={4} py={1} fontSize="12px">
                  {user.kutham}
                </Badge>
              )}
              <HStack justify="center" spacing={3} mt={5}>
                <Button colorScheme="purple" borderRadius="xl" size="sm" fontWeight="700"
                  onClick={() => navigate('/profile')}>
                  ✏️ திருத்து
                </Button>
                <Button variant="outline" colorScheme="red" borderRadius="xl" size="sm"
                  onClick={() => { logout(); window.location.href = '/'; }}>
                  வெளியேறு
                </Button>
              </HStack>
            </Box>

            {/* Summary stats */}
            <Box {...card} px={5} py={4}>
              <Text fontSize="13px" fontWeight="700" color="purple.700" mb={3}>
                📊 சுருக்கம்
              </Text>
              <SimpleGrid columns={3} spacing={3}>
                {[
                  { label: 'சரிபார்க்கப்பட்டது', value: summary.total_verified || 0,    color: '#059669', bg: '#ECFDF5' },
                  { label: 'அனுப்பியது',          value: summary.pending_sent || 0,      color: '#D97706', bg: '#FFFBEB' },
                  { label: 'உறுதிப்படுத்தவும்',  value: summary.pending_my_action || 0, color: '#7C3AED', bg: '#F5F3FF' },
                ].map((s, i) => (
                  <VStack key={i} spacing={0}
                    bg={s.bg} borderRadius="xl" py={4}
                    border="1px solid" borderColor={s.color + '30'}>
                    <Text fontSize="22px" fontWeight="800" color={s.color}>{s.value}</Text>
                    <Text fontSize="9px" color="gray.500" textAlign="center" mt={1} px={1}>
                      {s.label}
                    </Text>
                  </VStack>
                ))}
              </SimpleGrid>
            </Box>

            {/* Business Agent card */}
            {isAgent && (
              <Box
                {...card} px={5} py={4}
                bgGradient="linear(135deg, #f5f3ff 0%, #f0fdf4 100%)"
                borderColor="purple.200"
              >
                <HStack justify="space-between">
                  <VStack spacing={0} align="flex-start">
                    <Text fontSize="14px" fontWeight="800" color="purple.800">
                      🏢 Business Agent
                    </Text>
                    <Text fontSize="11px" color="gray.500">
                      விளம்பரம் வெளியிட அனுமதி உள்ளது
                    </Text>
                  </VStack>
                  <Button size="sm" colorScheme="purple" borderRadius="xl" fontWeight="700"
                    onClick={() => navigate('/create-ad')}>
                    📢 Ad வெளியிடு
                  </Button>
                </HStack>
              </Box>
            )}

          </VStack>
        )}

      </Box>

      {/* ── BOTTOM NAV ─────────────────────────────────────── */}
      <Box
        position="fixed" bottom={0} left={0} right={0} zIndex={100}
        bg="white"
        borderTop="1px solid" borderColor="purple.100"
        boxShadow="0 -2px 16px rgba(124,58,237,0.08)"
        py={2}
      >
        <HStack justify="space-around" maxW="680px" mx="auto">
          {BOTTOM_NAV.map(n => {
            const isActive = activeNav === n.key;
            return (
              <VStack
                key={n.key} spacing={0} align="center"
                cursor="pointer" py={1} px={3}
                color={isActive ? 'purple.600' : 'gray.400'}
                onClick={() => {
                  if (n.key === 'add') { navigate('/add-relative'); return; }
                  setActiveNav(n.key);
                }}
                _hover={{ color: 'purple.500' }}
                transition="all 0.15s"
              >
                <Box
                  fontSize="20px"
                  bg={isActive ? 'purple.100' : 'transparent'}
                  borderRadius="xl" px={3} py={1}
                  transition="all 0.15s"
                >
                  <Text>{n.icon}</Text>
                </Box>
                <Text
                  fontSize="9px"
                  fontWeight={isActive ? '800' : '500'}
                  mt={0.5}
                >
                  {n.label}
                </Text>
              </VStack>
            );
          })}
        </HStack>
      </Box>

      {/* ── EDIT RELATION MODAL ─────────────────────────────── */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
        <ModalContent
          bg="white" border="1px solid" borderColor="purple.200"
          borderRadius="2xl" mx={4}
          boxShadow="0 20px 60px rgba(124,58,237,0.2)"
        >
          <ModalHeader color="purple.800" fontSize="15px" fontWeight="700">
            ✏️ உறவு மாற்று — {editNode?.name}
          </ModalHeader>
          <ModalBody>
            <Text fontSize="13px" color="gray.500" mb={3}>
              தற்போதைய உறவு:{' '}
              <Text as="span" color="purple.600" fontWeight="700">
                {ALL_RELATIONS.find(r => r.value === editNode?.relationType)?.tamil || editNode?.relationType}
              </Text>
            </Text>
            <Select
              value={editRelationType}
              onChange={e => setEditRelationType(e.target.value)}
              borderColor="purple.200" color="purple.800"
              _focus={{ borderColor: 'purple.400', boxShadow: 'none' }}
            >
              {ALL_RELATIONS.map(r => (
                <option key={r.value} value={r.value}>{r.tamil} / {r.value}</option>
              ))}
            </Select>
            {editError && (
              <Text color="red.500" fontSize="12px" mt={2}>{editError}</Text>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" color="gray.400" onClick={onEditClose}>ரத்து</Button>
            <Button
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" borderRadius="xl" fontWeight="700"
              isLoading={editLoading}
              isDisabled={!editRelationType || editRelationType === editNode?.relationType || !editNode?.relationId}
              onClick={handleEditSave}
            >
              சேமி
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}
