import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Spinner
} from '@chakra-ui/react';
import api from '../services/api';
import SuggestionsBanner from './SuggestionsBanner';

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────
const NODE_W = 90;
const NODE_H = 100;
const H_GAP  = 28;
const V_GAP  = 90;
const PAD    = 40;

const TAMIL = {
  father:   'அப்பா',
  mother:   'அம்மா',
  son:      'மகன்',
  daughter: 'மகள்',
  brother:  'அண்ணன்/தம்பி',
  sister:   'அக்கா/தங்கை',
  spouse:   'கணவன்/மனைவி',
};

const KUTHAM_PAL = [
  { fill: '#EDE9FE', stroke: '#7C3AED', text: '#5B21B6' },
  { fill: '#FFF7ED', stroke: '#F59E0B', text: '#92400E' },
  { fill: '#EFF6FF', stroke: '#3B82F6', text: '#1D4ED8' },
  { fill: '#F0FDF4', stroke: '#22C55E', text: '#15803D' },
  { fill: '#FFF1F2', stroke: '#F43F5E', text: '#BE123C' },
  { fill: '#F0F9FF', stroke: '#0EA5E9', text: '#0369A1' },
];

async function fetchChain(userId) {
  const res = await api.get(`/api/relationships/linked-chain/${userId}`);
  return res.data.relations || [];
}

// ─────────────────────────────────────────
// Build tree — 2 levels in all directions
// ─────────────────────────────────────────
async function buildTree(rootUser) {
  const seen = new Set([rootUser.id]);

  // Root level relations
  const l1 = await fetchChain(rootUser.id);

  const parents   = l1.filter(r => r.relation_type === 'father' || r.relation_type === 'mother');
  const children  = l1.filter(r => r.relation_type === 'son'    || r.relation_type === 'daughter');
  const siblings  = l1.filter(r => r.relation_type === 'brother' || r.relation_type === 'sister');
  const spouseRel = l1.find(r  => r.relation_type === 'spouse');

  parents.forEach(p => seen.add(p.user.id));
  children.forEach(c => seen.add(c.user.id));
  siblings.forEach(s => seen.add(s.user.id));
  if (spouseRel) seen.add(spouseRel.user.id);

  // Level -2: grandparents (parents of parents)
  const grandparents = [];
  for (const p of parents) {
    const l2 = await fetchChain(p.user.id);
    const gps = l2.filter(r => (r.relation_type === 'father' || r.relation_type === 'mother') && !seen.has(r.user.id));
    gps.forEach(gp => seen.add(gp.user.id));
    grandparents.push(...gps.map(gp => ({ ...gp, viaId: p.user.id })));
  }

  // If no parents but has spouse — get spouse's parents as in-laws for Past Gen 1
  const inlaws = [];
  if (parents.length === 0 && spouseRel) {
    const sl = await fetchChain(spouseRel.user.id);
    const sp = sl.filter(r => (r.relation_type === 'father' || r.relation_type === 'mother') && !seen.has(r.user.id));
    sp.forEach(p => seen.add(p.user.id));
    inlaws.push(...sp.map(p => ({
      ...p,
      relation_type: p.relation_type === 'father' ? 'father_in_law' : 'mother_in_law',
      relation_tamil: p.relation_type === 'father' ? 'மாமனார்' : 'மாமியார்',
      viaId: spouseRel.user.id,
    })));
  }

  // Level 2: grandchildren (children of children)
  const grandchildren = [];
  for (const c of children) {
    const l2 = await fetchChain(c.user.id);
    const gcs = l2.filter(r => (r.relation_type === 'son' || r.relation_type === 'daughter') && !seen.has(r.user.id));
    gcs.forEach(gc => seen.add(gc.user.id));
    grandchildren.push(...gcs.map(gc => ({ ...gc, viaId: c.user.id })));
  }

  return {
    root: rootUser,
    grandparents,
    parents: [...parents, ...inlaws],
    siblings,
    spouse: spouseRel || null,
    children,
    grandchildren,
  };
}

// ─────────────────────────────────────────
// Layout engine
// ─────────────────────────────────────────
function layoutTree(tree) {
  const nodes = [];
  const edges = [];

  // Kutham map
  const kuthamMap = new Map();
  let ki = 0;
  const regK = u => { if (u?.kutham && !kuthamMap.has(u.kutham)) kuthamMap.set(u.kutham, ki++); };
  regK(tree.root);
  if (tree.spouse) regK(tree.spouse.user);
  [...tree.grandparents, ...tree.parents, ...tree.siblings, ...tree.children, ...tree.grandchildren]
    .forEach(r => regK(r.user));

  const getColor = (user, isYou) => {
    if (isYou) {
      const kc = user.kutham ? KUTHAM_PAL[kuthamMap.get(user.kutham) % KUTHAM_PAL.length] : null;
      return { fill: kc?.stroke || '#7C3AED', stroke: kc?.stroke || '#5B21B6', text: '#FFFFFF' };
    }
    if (!user.kutham) return { fill: '#F3F4F6', stroke: '#9CA3AF', text: '#6B7280' };
    const kc = KUTHAM_PAL[kuthamMap.get(user.kutham) % KUTHAM_PAL.length];
    return kc || { fill: '#F3F4F6', stroke: '#9CA3AF', text: '#6B7280' };
  };

  // Row Y positions
  const rowY = {
    '-2': PAD,
    '-1': PAD + (NODE_H + V_GAP),
     '0': PAD + (NODE_H + V_GAP) * 2,
     '1': PAD + (NODE_H + V_GAP) * 3,
     '2': PAD + (NODE_H + V_GAP) * 4,
  };

  // Calculate canvas width
  const maxRow = Math.max(
    tree.grandparents.length || 1,
    tree.parents.length || 1,
    (tree.siblings.length + 1 + (tree.spouse ? 1 : 0)),
    tree.children.length || 1,
    tree.grandchildren.length || 1,
  );
  const totalW = Math.max(600, maxRow * (NODE_W + H_GAP) + PAD * 2);

  // Helper: center a list of items in a row
  const placeRow = (items, y) => {
    if (items.length === 0) return [];
    const total = items.length * NODE_W + (items.length - 1) * H_GAP;
    const startX = (totalW - total) / 2;
    return items.map((item, i) => ({ ...item, x: startX + i * (NODE_W + H_GAP), y }));
  };

  const addNode = (item, isYou = false) => {
    const color = getColor(item.user, isYou);
    nodes.push({ ...item, color, isYou });
    return item;
  };

  const addEdge = (x1, y1, x2, y2, label, verified, isHoriz = false) => {
    edges.push({ x1, y1, x2, y2, label, verified, isHoriz });
  };

  // ── Current row ──
  const currentItems = [
    ...tree.siblings.map(s => ({ ...s, isSibling: true })),
    { user: tree.root, relation_tamil: null, relation_type: null, isYou: true, verified: true },
    ...(tree.spouse ? [{ ...tree.spouse, isSpouse: true }] : []),
  ];
  const currentPlaced = placeRow(currentItems, rowY['0']);
  const rootNode = currentPlaced.find(n => n.isYou);
  const spouseNode = currentPlaced.find(n => n.isSpouse);

  currentPlaced.forEach(n => addNode(n, n.isYou));

  // Spouse edge (horizontal)
  if (spouseNode) {
    addEdge(
      rootNode.x + NODE_W, rootNode.y + NODE_H / 2,
      spouseNode.x, spouseNode.y + NODE_H / 2,
      TAMIL.spouse, true, true
    );
  }

  // Sibling edges (horizontal)
  currentPlaced.filter(n => n.isSibling).forEach(sib => {
    addEdge(
      sib.x + NODE_W, sib.y + NODE_H / 2,
      rootNode.x, rootNode.y + NODE_H / 2,
      sib.relation_tamil || sib.relation_type, sib.verified, true
    );
  });

  // ── Parents row ──
  const parentsPlaced = placeRow(tree.parents, rowY['-1']);
  parentsPlaced.forEach(p => {
    addNode(p);
    addEdge(
      p.x + NODE_W / 2, p.y + NODE_H,
      rootNode.x + NODE_W / 2, rootNode.y,
      p.relation_tamil || TAMIL[p.relation_type] || p.relation_type,
      p.verified !== false
    );
  });

  // ── Grandparents row ──
  tree.grandparents.forEach(gp => {
    const parentNode = parentsPlaced.find(p => p.user.id === gp.viaId);
    if (!parentNode) return;
    // Place near parent
    const gpX = parentNode.x;
    const gpY = rowY['-2'];
    addNode({ ...gp, x: gpX, y: gpY });
    addEdge(
      gpX + NODE_W / 2, gpY + NODE_H,
      parentNode.x + NODE_W / 2, parentNode.y,
      gp.relation_tamil || TAMIL[gp.relation_type],
      gp.verified !== false
    );
  });

  // If grandparents overlap, spread them
  const gpNodes = nodes.filter(n => n.y === rowY['-2']);
  if (gpNodes.length > 1) {
    const total = gpNodes.length * NODE_W + (gpNodes.length - 1) * H_GAP;
    const startX = (totalW - total) / 2;
    gpNodes.forEach((n, i) => { n.x = startX + i * (NODE_W + H_GAP); });
    // Update edges too
    edges.filter(e => Math.round(e.y1) === Math.round(rowY['-2'] + NODE_H)).forEach((e, i) => {
      if (gpNodes[i]) {
        e.x1 = gpNodes[i].x + NODE_W / 2;
        e.y1 = rowY['-2'] + NODE_H;
      }
    });
  }

  // ── Children row ──
  const childrenPlaced = placeRow(tree.children, rowY['1']);
  childrenPlaced.forEach(c => {
    addNode(c);
    addEdge(
      rootNode.x + NODE_W / 2, rootNode.y + NODE_H,
      c.x + NODE_W / 2, c.y,
      c.relation_tamil || TAMIL[c.relation_type],
      c.verified !== false
    );
  });

  // ── Grandchildren row ──
  tree.grandchildren.forEach(gc => {
    const childNode = childrenPlaced.find(c => c.user.id === gc.viaId);
    if (!childNode) return;
    const gcX = childNode.x;
    const gcY = rowY['2'];
    addNode({ ...gc, x: gcX, y: gcY });
    addEdge(
      childNode.x + NODE_W / 2, childNode.y + NODE_H,
      gcX + NODE_W / 2, gcY,
      gc.relation_tamil || TAMIL[gc.relation_type],
      gc.verified !== false
    );
  });

  // Spread grandchildren if overlap
  const gcNodes = nodes.filter(n => n.y === rowY['2']);
  if (gcNodes.length > 1) {
    const total = gcNodes.length * NODE_W + (gcNodes.length - 1) * H_GAP;
    const startX = (totalW - total) / 2;
    gcNodes.forEach((n, i) => { n.x = startX + i * (NODE_W + H_GAP); });
  }

  const hasAny = n => nodes.some(nd => Math.round(nd.y) === Math.round(rowY[n]));
  const totalH = (hasAny('2') ? rowY['2'] : hasAny('1') ? rowY['1'] : rowY['0']) + NODE_H + PAD;

  return { nodes, edges, totalW, totalH };
}

// ─────────────────────────────────────────
// SVG Tree Renderer
// ─────────────────────────────────────────
function SVGTree({ nodes, edges, totalW, totalH }) {
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#A78BFA" />
        </marker>
        <marker id="arr-y" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#FCD34D" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const midX = (e.x1 + e.x2) / 2;
        const midY = (e.y1 + e.y2) / 2;
        const color = e.verified ? '#A78BFA' : '#FCD34D';
        const markerId = e.verified ? 'arr' : 'arr-y';
        return (
          <g key={`e${i}`}>
            <line
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray={e.verified ? 'none' : '4,3'}
              markerEnd={`url(#${markerId})`}
            />
            {e.label && (
              <>
                <rect
                  x={midX - 30} y={midY - 9}
                  width={60} height={16}
                  rx={8}
                  fill="#1e1b4b"
                  stroke="#4C1D95"
                  strokeWidth={1}
                />
                <text
                  x={midX} y={midY + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="600"
                  fill="#C4B5FD"
                >
                  {e.label?.length > 10 ? e.label.substring(0, 9) + '…' : e.label}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const { x, y, user, color, isYou, verified, isOffline } = node;
        if (x === undefined || y === undefined) return null;
        const cx = x + NODE_W / 2;
        return (
          <g key={`n${node.id || i}`}>
            {/* Shadow */}
            <rect x={x+2} y={y+3} width={NODE_W} height={NODE_H} rx={12} fill="rgba(0,0,0,0.15)" />
            {/* Card */}
            <rect
              x={x} y={y} width={NODE_W} height={NODE_H} rx={12}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={isYou ? 2.5 : 1.5}
              strokeDasharray={isOffline ? '4,3' : 'none'}
              opacity={isOffline ? 0.7 : 1}
            />
            {/* Top bar */}
            <rect x={x} y={y} width={NODE_W} height={6} rx={12} fill={color.stroke} opacity={0.8} />
            {/* Avatar circle */}
            <circle cx={cx} cy={y+32} r={20} fill={isYou ? color.stroke : '#E9D5FF'} stroke={color.stroke} strokeWidth={1.5} />
            {/* Initial */}
            <text x={cx} y={y+37} textAnchor="middle" fontSize="14" fontWeight="bold" fill={isYou ? '#FFF' : color.stroke || '#5B21B6'}>
              {isOffline ? '🕊' : (user.name?.charAt(0) || '?')}
            </text>
            {/* Name */}
            <text x={cx} y={y+62} textAnchor="middle" fontSize="9" fontWeight="700" fill={isYou ? '#FFF' : color.text || '#374151'}>
              {user.name?.length > 10 ? user.name.substring(0, 9) + '…' : user.name}
            </text>
            {/* Kutham */}
            {user.kutham && (
              <text x={cx} y={y+74} textAnchor="middle" fontSize="7" fill={isYou ? '#C4B5FD' : '#9CA3AF'}>
                {user.kutham.length > 12 ? user.kutham.substring(0, 11) + '…' : user.kutham}
              </text>
            )}
            {/* நீங்கள் */}
            {isYou && <text x={cx} y={y+86} textAnchor="middle" fontSize="8" fill="#C4B5FD">நீங்கள்</text>}
            {/* Verified badge */}
            {!isYou && !isOffline && (
              <>
                <circle cx={x+NODE_W-8} cy={y+8} r={7} fill={verified ? '#10B981' : '#F59E0B'} stroke="white" strokeWidth={1.5} />
                <text x={x+NODE_W-8} y={y+12} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
                  {verified ? '✓' : '?'}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────
// Row labels overlay
// ─────────────────────────────────────────
const ROW_LABELS = [
  { gen: -2, label: 'Past Gen 2',   labelTa: 'இரண்டாம் முந்தைய தலைமுறை' },
  { gen: -1, label: 'Past Gen 1',   labelTa: 'முதல் முந்தைய தலைமுறை'    },
  { gen:  0, label: 'Current',      labelTa: 'இப்போதைய தலைமுறை'          },
  { gen:  1, label: 'Future Gen 1', labelTa: 'அடுத்த தலைமுறை'            },
  { gen:  2, label: 'Future Gen 2', labelTa: 'இரண்டாவது அடுத்த தலைமுறை' },
];

const rowYForGen = (gen) => PAD + (gen + 2) * (NODE_H + V_GAP);

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export default function FamilyLinkedIn({ currentUser, onRelationAdded }) {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState(null);

  useEffect(() => { load(); }, [currentUser.id]);

  const load = async () => {
    setLoading(true);
    try {
      const t = await buildTree(currentUser);
      setTree(t);
      const l = layoutTree(t);
      setLayout(l);
    } catch (e) {
      console.error('FamilyLinkedIn error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRelationAdded = () => {
    load(); // refresh tree
    if (onRelationAdded) onRelationAdded();
  };

  return (
    <VStack w="100%" spacing={3} align="stretch">
      <SuggestionsBanner onRelationAdded={handleRelationAdded} />

      {/* Legend */}
      <HStack spacing={4} flexWrap="wrap" fontSize="10px" color="whiteAlpha.600" px={1}>
        <HStack spacing={1}><Box w={2} h={2} borderRadius="full" bg="#10B981" /><Text>சரிபார்க்கப்பட்டது</Text></HStack>
        <HStack spacing={1}><Box w={2} h={2} borderRadius="full" bg="#F59E0B" /><Text>நிலுவை</Text></HStack>
        <HStack spacing={1}><Text fontSize="10px">🕊️</Text><Text>காலமானவர்</Text></HStack>
      </HStack>

      {loading ? (
        <VStack py={10}>
          <Spinner color="purple.300" size="lg" />
          <Text color="whiteAlpha.500" fontSize="sm">குடும்ப வலைதளம் ஏற்றுகிறோம்...</Text>
        </VStack>
      ) : layout ? (
        <Box position="relative">
          {/* Generation row labels — left side */}
          <Box position="absolute" left={0} top={0} zIndex={1} pointerEvents="none">
            {ROW_LABELS.map(row => {
              const y = rowYForGen(row.gen);
              const hasNodes = layout.nodes.some(n => Math.round(n.y) === Math.round(y));
              if (!hasNodes) return null;
              return (
                <Box key={row.gen} position="absolute" top={`${y + 4}px`} left="4px">
                  <Text fontSize="9px" fontWeight="700" color="purple.400">{row.label}</Text>
                </Box>
              );
            })}
          </Box>

          {/* SVG canvas */}
          <Box
            bg="rgba(255,255,255,0.02)"
            borderRadius="2xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            overflowX="auto"
            overflowY="auto"
            maxH="70vh"
            pl="60px"
          >
            {layout && (
              <SVGTree
                nodes={layout.nodes}
                edges={layout.edges}
                totalW={layout.totalW}
                totalH={layout.totalH}
              />
            )}
          </Box>
        </Box>
      ) : (
        <Text color="whiteAlpha.400" textAlign="center" py={6}>
          குடும்பத்தினர் இல்லை / No family members found
        </Text>
      )}
    </VStack>
  );
}
