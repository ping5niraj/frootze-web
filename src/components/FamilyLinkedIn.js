import { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Avatar, Spinner,
  Badge, Wrap, WrapItem
} from '@chakra-ui/react';
import api from '../services/api';

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

async function fetchChain(userId) {
  const res = await api.get(`/api/relationships/linked-chain/${userId}`);
  return res.data.relations || [];
}

function PersonNode({ person, relationTamil, isYou, isExpanded, isLoading, onClick }) {
  return (
    <VStack spacing={1} align="center" minW="80px">
      {relationTamil && (
        <Badge colorScheme="purple" fontSize="9px" borderRadius="full" px={2}>
          {relationTamil}
        </Badge>
      )}
      <Box
        bg={isYou ? 'purple.600' : 'whiteAlpha.100'}
        border="2px solid"
        borderColor={isYou ? 'purple.400' : isExpanded ? 'green.400' : 'whiteAlpha.300'}
        borderStyle={isExpanded ? 'solid' : 'dashed'}
        borderRadius="xl"
        px={3}
        py={2}
        cursor={isYou ? 'default' : 'pointer'}
        onClick={isYou ? undefined : onClick}
        _hover={isYou ? {} : { borderColor: 'purple.400', bg: 'whiteAlpha.200' }}
        transition="all 0.2s"
        textAlign="center"
        position="relative"
        minH="80px"
      >
        {isLoading && (
          <Box position="absolute" top={1} right={1}>
            <Spinner size="xs" color="purple.300" />
          </Box>
        )}
        <Avatar size="sm" name={person.name} src={person.profile_photo} mb={1} />
        <Text fontSize="9px" fontWeight="700" color={isYou ? 'white' : 'whiteAlpha.900'} noOfLines={1}>
          {person.name?.split(' ')[0]}
        </Text>
        {isYou ? (
          <Text fontSize="8px" color="purple.200">நீங்கள்</Text>
        ) : (
          <Text fontSize="8px" color={isExpanded ? 'green.300' : 'whiteAlpha.400'}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        )}
      </Box>
    </VStack>
  );
}

function GenRow({ genConfig, nodes, isCurrent }) {
  return (
    <Box
      w="100%"
      bg={isCurrent ? 'rgba(124,58,237,0.15)' : 'whiteAlpha.50'}
      border="1px solid"
      borderColor={isCurrent ? 'purple.500' : 'whiteAlpha.100'}
      borderRadius="2xl"
      px={4}
      py={3}
    >
      <HStack justify="space-between" mb={3}>
        <Text fontSize="10px" fontWeight="700" color="purple.300">{genConfig.label}</Text>
        <Text fontSize="10px" color="whiteAlpha.400">{genConfig.labelTa}</Text>
      </HStack>
      <Wrap spacing={3} justify="center">
        {nodes.length === 0 ? (
          <WrapItem>
            <Text fontSize="xs" color="whiteAlpha.300" py={2}>
              {isCurrent ? '—' : 'விரிவாக்க கீழே உள்ள உறுப்பினரை கிளிக் செய்யுங்கள்'}
            </Text>
          </WrapItem>
        ) : (
          nodes.map(node => (
            <WrapItem key={node.id}>
              <PersonNode
                person={node}
                relationTamil={node.relationTamil}
                isYou={node.isYou}
                isExpanded={node.isExpanded}
                isLoading={node.isLoading}
                onClick={node.onClick}
              />
            </WrapItem>
          ))
        )}
      </Wrap>
    </Box>
  );
}

export default function FamilyLinkedIn({ currentUser }) {
  const [nodeMap, setNodeMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoot();
  }, [currentUser.id]);

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
        };
      }
      setNodeMap(initial);
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
      // Collapse — remove children recursively
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

    // Set loading
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
          if (next[rel.user.id]) continue; // already shown

          const relGen = REL_GEN[rel.relation_type] ?? 0;
          let absGen;
          if (relGen === 1)       absGen = parentGen + 1; // parent
          else if (relGen === -1) absGen = parentGen - 1; // child
          else                    absGen = parentGen;      // same gen

          if (absGen > 3 || absGen < -2) continue;

          next[rel.user.id] = {
            user: rel.user,
            relationTamil: TAMIL[rel.relation_type] || rel.relation_tamil,
            generation: absGen,
            parentId: nodeId,
            isExpanded: false,
            isLoading: false,
            isYou: false,
          };
        }
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

  // Build rows by generation
  const rows = {};
  GENERATIONS.forEach(g => { rows[g.gen] = []; });
  Object.entries(nodeMap).forEach(([id, node]) => {
    const gen = node.generation;
    if (rows[gen] !== undefined) {
      rows[gen].push({
        id,
        ...node.user,
        relationTamil: node.relationTamil,
        isYou: node.isYou,
        isExpanded: node.isExpanded,
        isLoading: node.isLoading,
        onClick: () => handleExpand(id),
      });
    }
  });

  if (loading) {
    return (
      <VStack py={10}>
        <Spinner color="purple.300" size="lg" />
        <Text color="whiteAlpha.500" fontSize="sm">குடும்ப வலைதளம் ஏற்றுகிறோம்...</Text>
      </VStack>
    );
  }

  return (
    <VStack w="100%" spacing={2} align="stretch">
      <Text fontSize="xs" color="whiteAlpha.500" textAlign="center" mb={1}>
        💡 உறுப்பினரை கிளிக் செய்து விரிவாக்குங்கள் / Click any member to expand
      </Text>
      {GENERATIONS.map(genConfig => {
        const nodes = rows[genConfig.gen] || [];
        if (nodes.length === 0 && genConfig.gen !== 0) return null;
        return (
          <GenRow
            key={genConfig.key}
            genConfig={genConfig}
            nodes={nodes}
            isCurrent={genConfig.gen === 0}
          />
        );
      })}
    </VStack>
  );
}
