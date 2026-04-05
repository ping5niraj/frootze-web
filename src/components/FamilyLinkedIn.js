import { useState, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Button, Avatar,
  Spinner, Badge
} from '@chakra-ui/react';
import api from '../services/api';

// ─────────────────────────────────────────
// Single expandable node
// ─────────────────────────────────────────
function ChainNode({ user, relationLabel, depth, excludeIds, mode }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState([]);

  const handleExpand = useCallback(async () => {
    if (expanded) { setExpanded(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`/api/relationships/linked-chain/${user.id}`);
      const rels = (res.data.relations || []).filter(
        r => !excludeIds.has(r.user.id)
      );
      setChildren(rels);
      setExpanded(true);
    } catch (e) {
      console.error('Expand error:', e);
    } finally {
      setLoading(false);
    }
  }, [expanded, user.id, excludeIds]);

  const newExcludeIds = new Set([...excludeIds, user.id]);

  const isTree = mode === 'tree';

  return (
    <Box
      ml={depth === 0 ? 0 : isTree ? 6 : 0}
      mt={depth === 0 ? 0 : 3}
    >
      {/* Relation label connector */}
      {relationLabel && depth > 0 && (
        <HStack spacing={1} mb={1} ml={isTree ? 0 : 2}>
          {isTree ? (
            <Box w="20px" h="1px" bg="purple.300" />
          ) : (
            <Text fontSize="10px" color="purple.400">→</Text>
          )}
          <Badge
            colorScheme="purple"
            fontSize="9px"
            borderRadius="full"
            px={2}
          >
            {relationLabel}
          </Badge>
        </HStack>
      )}

      {/* Node card */}
      <HStack
        bg="whiteAlpha.100"
        border="1px solid"
        borderColor={expanded ? 'purple.400' : 'whiteAlpha.200'}
        borderRadius="xl"
        px={3}
        py={2}
        spacing={3}
        cursor="pointer"
        onClick={handleExpand}
        _hover={{ borderColor: 'purple.400', bg: 'whiteAlpha.200' }}
        transition="all 0.2s"
        maxW="320px"
      >
        <Avatar
          size="sm"
          name={user.name}
          src={user.profile_photo}
        />
        <Box flex={1}>
          <Text fontSize="sm" fontWeight="700" color="white">
            {user.name}
          </Text>
          {user.kutham && (
            <Text fontSize="10px" color="whiteAlpha.500">
              {user.kutham}
            </Text>
          )}
        </Box>
        {loading ? (
          <Spinner size="xs" color="purple.300" />
        ) : (
          <Text fontSize="xs" color="purple.400">
            {expanded ? '▲' : '▼'}
          </Text>
        )}
      </HStack>

      {/* Children — expanded */}
      {expanded && children.length === 0 && (
        <Text fontSize="xs" color="whiteAlpha.400" ml={isTree ? 6 : 4} mt={2}>
          இணைப்புகள் இல்லை / No further connections
        </Text>
      )}

      {expanded && children.length > 0 && (
        <Box
          ml={isTree ? 4 : 0}
          mt={2}
          borderLeft={isTree ? '1px dashed' : 'none'}
          borderColor="purple.800"
          pl={isTree ? 2 : 0}
        >
          {isTree ? (
            <VStack align="start" spacing={2}>
              {children.map(rel => (
                <ChainNode
                  key={rel.user.id}
                  user={rel.user}
                  relationLabel={rel.relation_tamil}
                  depth={depth + 1}
                  excludeIds={newExcludeIds}
                  mode={mode}
                />
              ))}
            </VStack>
          ) : (
            // Chain/loop mode — horizontal flow
            <HStack align="start" spacing={0} flexWrap="wrap">
              {children.map((rel, idx) => (
                <HStack key={rel.user.id} spacing={0} align="start">
                  <ChainNode
                    user={rel.user}
                    relationLabel={rel.relation_tamil}
                    depth={depth + 1}
                    excludeIds={newExcludeIds}
                    mode={mode}
                  />
                  {idx < children.length - 1 && (
                    <Text color="purple.400" fontSize="sm" mt={3} mx={1}>→</Text>
                  )}
                </HStack>
              ))}
            </HStack>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────
// Main FamilyLinkedIn component
// ─────────────────────────────────────────
export default function FamilyLinkedIn({ currentUser }) {
  const [subTab, setSubTab] = useState('tree');
  const [rootData, setRootData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadRoot = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/relationships/linked-chain/${currentUser.id}`);
      setRootData(res.data);
      setLoaded(true);
    } catch (e) {
      console.error('Load root error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, loaded]);

  // Load on first render
  if (!loaded && !loading) loadRoot();

  const excludeRoot = new Set([currentUser.id]);

  return (
    <Box w="100%">
      {/* Sub-tab toggle */}
      <HStack bg="whiteAlpha.100" borderRadius="xl" p={1} mb={4}>
        {[
          { key: 'tree',  label: '🌳 மரக்கோட்டம்' },
          { key: 'chain', label: '🔗 சங்கிலி'      },
        ].map(t => (
          <Button
            key={t.key}
            flex={1}
            size="sm"
            bg={subTab === t.key ? 'purple.600' : 'transparent'}
            color={subTab === t.key ? 'white' : 'whiteAlpha.600'}
            borderRadius="lg"
            onClick={() => setSubTab(t.key)}
            _hover={{ bg: subTab === t.key ? 'purple.600' : 'whiteAlpha.100' }}
          >
            {t.label}
          </Button>
        ))}
      </HStack>

      {/* Content */}
      <Box
        bg="whiteAlpha.50"
        borderRadius="2xl"
        p={4}
        overflowX="auto"
        minH="200px"
      >
        {loading && (
          <VStack py={8}>
            <Spinner color="purple.300" />
            <Text color="whiteAlpha.500" fontSize="sm">
              குடும்ப வலைதளம் ஏற்றுகிறோம்...
            </Text>
          </VStack>
        )}

        {!loading && rootData && (
          <>
            {/* Root user */}
            <HStack mb={4} spacing={3}>
              <Avatar
                size="md"
                name={currentUser.name}
                src={currentUser.profile_photo}
                border="2px solid"
                borderColor="purple.400"
              />
              <Box>
                <Text fontWeight="700" color="white">{currentUser.name}</Text>
                <Text fontSize="xs" color="purple.300">நீங்கள் / You</Text>
              </Box>
            </HStack>

            {rootData.relations?.length === 0 && (
              <Text color="whiteAlpha.400" fontSize="sm">
                இணைப்புகள் இல்லை / No connections found
              </Text>
            )}

            {subTab === 'tree' && (
              <VStack align="start" spacing={2}>
                {rootData.relations?.map(rel => (
                  <ChainNode
                    key={rel.user.id}
                    user={rel.user}
                    relationLabel={rel.relation_tamil}
                    depth={1}
                    excludeIds={excludeRoot}
                    mode="tree"
                  />
                ))}
              </VStack>
            )}

            {subTab === 'chain' && (
              <HStack align="start" spacing={0} flexWrap="wrap" gap={2}>
                {rootData.relations?.map((rel, idx) => (
                  <HStack key={rel.user.id} spacing={0} align="start">
                    <ChainNode
                      user={rel.user}
                      relationLabel={rel.relation_tamil}
                      depth={1}
                      excludeIds={excludeRoot}
                      mode="chain"
                    />
                    {idx < rootData.relations.length - 1 && (
                      <Text color="purple.400" fontSize="sm" mt={3} mx={2}>→</Text>
                    )}
                  </HStack>
                ))}
              </HStack>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
