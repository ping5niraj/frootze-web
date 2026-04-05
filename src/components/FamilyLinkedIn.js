import { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Avatar, Spinner,
  Badge, Wrap, WrapItem, Flex
} from '@chakra-ui/react';
import api from '../services/api';
import SuggestionsBanner from './SuggestionsBanner';

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────
const GENERATIONS = [
  { key: 'past3',   label: 'Past Gen 3',   labelTa: 'மூன்றாம் முந்தைய தலைமுறை', gen: 3  },
  { key: 'past2',   label: 'Past Gen 2',   labelTa: 'இரண்டாம் முந்தைய தலைமுறை', gen: 2  },
  { key: 'past1',   label: 'Past Gen 1',   labelTa: 'முதல் முந்தைய தலைமுறை',    gen: 1  },
  { key: 'current', label: 'Current',      labelTa: 'இப்போதைய தலைமுறை',          gen: 0  },
  { key: 'future1', label: 'Future Gen 1', labelTa: 'அடுத்த தலைமுறை',            gen: -1 },
  { key: 'future2', label: 'Future Gen 2', labelTa: 'இரண்டாவது அடுத்த தலைமுறை', gen: -2 },
];

const REL_GEN = {
  father: 1, mother: 1,
  spouse: 0, brother: 0, sister: 0,
  son: -1, daughter: -1,
};

const TAMIL = {
  father:   'அப்பா',
  mother:   'அம்மா',
  son:      'மகன்',
  daughter: 'மகள்',
  brother:  'அண்ணன்/தம்பி',
  sister:   'அக்கா/தங்கை',
  spouse:   'கணவன்/மனைவி',
};

const ALLOWED = new Set(['father','mother','son','daughter','brother','sister','spouse']);

// Kutham color palette
const KUTHAM_COLORS = [
  { bg: '#EDE9FE', border: '#7C3AED', text: '#5B21B6' },
  { bg: '#FFF7ED', border: '#F59E0B', text: '#92400E' },
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  { bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C' },
  { bg: '#F0F9FF', border: '#0EA5E9', text: '#0369A1' },
];

async function fetchChain(userId) {
  const res = await api.get(`/api/relationships/linked-chain/${userId}`);
  return res.data.relations || [];
}

// ─────────────────────────────────────────
// Person Node Card
// ─────────────────────────────────────────
function PersonNode({ node, kuthamMap, onClick }) {
  const { user, relationTamil, isYou, isExpanded, isLoading, verified, isOffline } = node;

  // Kutham color
  const kuthamIdx = user.kutham ? kuthamMap.get(user.kutham) : undefined;
  const kuthamColor = kuthamIdx !== undefined ? KUTHAM_COLORS[kuthamIdx % KUTHAM_COLORS.length] : null;

  const bgColor = isYou
    ? (kuthamColor ? kuthamColor.border : '#7C3AED')
    : isOffline
    ? '#374151'
    : kuthamColor
    ? kuthamColor.bg
    : 'rgba(255,255,255,0.08)';

  const borderColor = isYou
    ? (kuthamColor ? kuthamColor.border : '#7C3AED')
    : isOffline
    ? '#6B7280'
    : isExpanded
    ? '#10B981'
    : kuthamColor
    ? kuthamColor.border
    : 'rgba(255,255,255,0.2)';

  return (
    <VStack spacing={0} align="center">
      {/* Arrow + relation label */}
      {relationTamil && (
        <VStack spacing={0} align="center" mb={1}>
          <Badge
            bg={kuthamColor ? kuthamColor.border : 'purple.600'}
            color="white"
            fontSize="9px"
            borderRadius="full"
            px={2}
            py={0.5}
          >
            {relationTamil}
          </Badge>
          <Text color={kuthamColor ? kuthamColor.border : 'purple.400'} fontSize="16px" lineHeight="1">
            ↓
          </Text>
        </VStack>
      )}

      {/* Node */}
      <Box
        bg={bgColor}
        border="2px solid"
        borderColor={borderColor}
        borderStyle={isOffline ? 'dashed' : 'solid'}
        borderRadius="xl"
        px={3}
        py={2}
        cursor={isYou ? 'default' : 'pointer'}
        onClick={isYou ? undefined : onClick}
        _hover={isYou ? {} : { borderColor: 'purple.400', transform: 'scale(1.03)' }}
        transition="all 0.2s"
        textAlign="center"
        position="relative"
        minW="80px"
        opacity={isOffline ? 0.7 : 1}
      >
        {/* Verified / Pending badge */}
        {!isYou && !isOffline && (
          <Box
            position="absolute"
            top="-6px"
            right="-6px"
            w="16px"
            h="16px"
            borderRadius="full"
            bg={verified ? '#10B981' : '#F59E0B'}
            border="2px solid"
            borderColor="gray.900"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="8px" color="white" fontWeight="bold">
              {verified ? '✓' : '?'}
            </Text>
          </Box>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <Box position="absolute" top={1} left={1}>
            <Spinner size="xs" color="purple.300" />
          </Box>
        )}

        {/* Profile photo or initial */}
        <Avatar
          size="sm"
          name={user.name}
          src={user.profile_photo}
          mb={1}
          border={isYou ? '2px solid white' : 'none'}
          icon={isOffline ? <Text>🕊️</Text> : undefined}
        />

        {/* Name */}
        <Text
          fontSize="9px"
          fontWeight="700"
          color={isYou ? 'white' : isOffline ? '#9CA3AF' : '#1F2937'}
          noOfLines={1}
          maxW="72px"
        >
          {user.name?.split(' ')[0]}
        </Text>

        {/* Kutham */}
        {user.kutham && (
          <Text fontSize="7px" color={isYou ? 'purple.200' : '#6B7280'} noOfLines={1} maxW="72px">
            {user.kutham}
          </Text>
        )}

        {isYou ? (
          <Text fontSize="8px" color="purple.200" mt={0.5}>நீங்கள்</Text>
        ) : (
          <Text fontSize="8px" color={isExpanded ? '#10B981' : '#9CA3AF'} mt={0.5}>
            {isExpanded ? '▲ மூடு' : '▼ திற'}
          </Text>
        )}
      </Box>
    </VStack>
  );
}

// ─────────────────────────────────────────
// Generation Row
// ─────────────────────────────────────────
function GenRow({ genConfig, nodes, isCurrent, kuthamMap }) {
  if (nodes.length === 0 && !isCurrent) return null;

  return (
    <Box
      w="100%"
      bg={isCurrent ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)'}
      border="1px solid"
      borderColor={isCurrent ? 'purple.500' : 'rgba(255,255,255,0.08)'}
      borderRadius="2xl"
      px={4}
      py={3}
    >
      <HStack justify="space-between" mb={3}>
        <Text fontSize="10px" fontWeight="700" color="purple.300">{genConfig.label}</Text>
        <Text fontSize="10px" color="whiteAlpha.400">{genConfig.labelTa}</Text>
      </HStack>

      <Wrap spacing={4} justify="center">
        {nodes.length === 0 ? (
          <WrapItem>
            <Text fontSize="xs" color="whiteAlpha.300" py={2}>—</Text>
          </WrapItem>
        ) : (
          nodes.map(node => (
            <WrapItem key={node.id}>
              <PersonNode
                node={node}
                kuthamMap={kuthamMap}
                onClick={node.onClick}
              />
            </WrapItem>
          ))
        )}
      </Wrap>
    </Box>
  );
}

// ─────────────────────────────────────────
// Main FamilyLinkedIn Component
// ─────────────────────────────────────────
export default function FamilyLinkedIn({ currentUser, onRelationAdded }) {
  const [nodeMap, setNodeMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [kuthamMap, setKuthamMap] = useState(new Map());

  useEffect(() => {
    loadRoot();
  }, [currentUser.id]);

  // Build kutham color map from all nodes
  const buildKuthamMap = (nodes) => {
    const km = new Map();
    let idx = 0;
    Object.values(nodes).forEach(n => {
      if (n.user.kutham && !km.has(n.user.kutham)) {
        km.set(n.user.kutham, idx++);
      }
    });
    // Add current user's kutham first
    if (currentUser.kutham && !km.has(currentUser.kutham)) {
      km.set(currentUser.kutham, 0);
    }
    return km;
  };

  const loadRoot = async () => {
    setLoading(true);
    try {
      const relations = await fetchChain(currentUser.id);
      const initial = {
        [currentUser.id]: {
          user: currentUser,
          relationTamil: null,
          generation: 0,
          parentId: null,
          isExpanded: true,
          isLoading: false,
          isYou: true,
          verified: true,
          isOffline: false,
        }
      };

      for (const rel of relations) {
        if (!ALLOWED.has(rel.relation_type)) continue;
        const gen = REL_GEN[rel.relation_type] ?? 0;
        initial[rel.user.id] = {
          user: rel.user,
          relationTamil: TAMIL[rel.relation_type] || rel.relation_tamil,
          generation: gen,
          parentId: currentUser.id,
          isExpanded: false,
          isLoading: false,
          isYou: false,
          verified: rel.verified !== false,
          isOffline: rel.user.is_offline || false,
        };
      }

      setNodeMap(initial);
      setKuthamMap(buildKuthamMap(initial));
    } catch (e) {
      console.error('Load root error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = useCallback(async (nodeId) => {
    const node = nodeMap[nodeId];
    if (!node) return;

    if (node.isExpanded) {
      setNodeMap(prev => {
        const next = { ...prev };
        const toRemove = new Set();
        const findChildren = (pid) => {
          Object.entries(next).forEach(([id, n]) => {
            if (n.parentId === pid && !n.isYou) {
              toRemove.add(id);
              findChildren(id);
            }
          });
        };
        findChildren(nodeId);
        toRemove.forEach(id => delete next[id]);
        next[nodeId] = { ...next[nodeId], isExpanded: false };
        return next;
      });
      return;
    }

    setNodeMap(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], isLoading: true }
    }));

    try {
      const relations = await fetchChain(nodeId);
      const parentGen = node.generation;

      setNodeMap(prev => {
        const next = { ...prev };
        next[nodeId] = { ...next[nodeId], isExpanded: true, isLoading: false };

        for (const rel of relations) {
          if (!ALLOWED.has(rel.relation_type)) continue;
          if (next[rel.user.id]) continue;

          const relGen = REL_GEN[rel.relation_type] ?? 0;
          let absGen;
          if (relGen === 1)       absGen = parentGen + 1;
          else if (relGen === -1) absGen = parentGen - 1;
          else                    absGen = parentGen;

          if (absGen > 3 || absGen < -2) continue;

          next[rel.user.id] = {
            user: rel.user,
            relationTamil: TAMIL[rel.relation_type] || rel.relation_tamil,
            generation: absGen,
            parentId: nodeId,
            isExpanded: false,
            isLoading: false,
            isYou: false,
            verified: rel.verified !== false,
            isOffline: rel.user.is_offline || false,
          };
        }

        setKuthamMap(buildKuthamMap(next));
        return next;
      });
    } catch (e) {
      console.error('Expand error:', e);
      setNodeMap(prev => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], isLoading: false }
      }));
    }
  }, [nodeMap]);

  // Build rows
  const rows = {};
  GENERATIONS.forEach(g => { rows[g.gen] = []; });
  Object.entries(nodeMap).forEach(([id, node]) => {
    const gen = node.generation;
    if (rows[gen] !== undefined) {
      rows[gen].push({
        id,
        ...node,
        onClick: () => handleExpand(id),
      });
    }
  });

  if (loading) {
    return (
      <VStack py={10}>
        <Spinner color="purple.300" size="lg" />
        <Text color="whiteAlpha.500" fontSize="sm">
          குடும்ப வலைதளம் ஏற்றுகிறோம்...
        </Text>
      </VStack>
    );
  }

  return (
    <VStack w="100%" spacing={3} align="stretch">
      {/* Suggestions Banner */}
      <SuggestionsBanner onRelationAdded={() => { loadRoot(); if (onRelationAdded) onRelationAdded(); }} />

      {/* Legend */}
      <Flex gap={3} flexWrap="wrap" fontSize="10px" color="whiteAlpha.600">
        <HStack spacing={1}>
          <Box w={2} h={2} borderRadius="full" bg="#10B981" />
          <Text>சரிபார்க்கப்பட்டது</Text>
        </HStack>
        <HStack spacing={1}>
          <Box w={2} h={2} borderRadius="full" bg="#F59E0B" />
          <Text>நிலுவை</Text>
        </HStack>
        <HStack spacing={1}>
          <Box w={2} h={2} borderRadius="sm" bg="#374151" border="1px dashed #6B7280" />
          <Text>🕊️ காலமானவர்</Text>
        </HStack>
        <HStack spacing={1}>
          <Box w={2} h={2} borderRadius="sm" bg="#7C3AED" />
          <Text>நீங்கள்</Text>
        </HStack>
      </Flex>

      <Text fontSize="xs" color="whiteAlpha.400" textAlign="center">
        💡 உறுப்பினரை கிளிக் செய்து விரிவாக்குங்கள் / Click any member to expand
      </Text>

      {/* Generation rows */}
      {GENERATIONS.map(genConfig => {
        const nodes = rows[genConfig.gen] || [];
        if (nodes.length === 0 && genConfig.gen !== 0) return null;
        return (
          <GenRow
            key={genConfig.key}
            genConfig={genConfig}
            nodes={nodes}
            isCurrent={genConfig.gen === 0}
            kuthamMap={kuthamMap}
          />
        );
      })}
    </VStack>
  );
}
