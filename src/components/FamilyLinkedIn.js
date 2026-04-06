/**
 * FamilyLinkedIn.js — குடும்ப வலைதளம்
 *
 * ARCHITECTURE RULE: This file is a PURE RENDERER.
 * - Zero business logic
 * - Zero relation type strings
 * - Zero traversal code
 * - One API call → render what the backend returns
 *
 * To add a new relation type: change backend LINKEDIN_REL_GEN map only.
 * This file requires zero changes.
 */

import { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Spinner } from '@chakra-ui/react';
import api from '../services/api';
import SuggestionsBanner from './SuggestionsBanner';

// ─────────────────────────────────────────
// Layout constants — UI only, no business logic
// ─────────────────────────────────────────
const NODE_W   = 90;
const NODE_H   = 100;
const H_GAP    = 28;
const V_GAP    = 110;  // increased from 90 — more room for labels between rows
const PAD      = 40;
const LEFT_PAD = 70; // space for generation labels

// Generation display labels — UI only
const GEN_LABELS = {
  '3':  { en: 'Past Gen 3',   ta: 'மூன்றாம் முந்தைய தலைமுறை' },
  '2':  { en: 'Past Gen 2',   ta: 'இரண்டாம் முந்தைய தலைமுறை' },
  '1':  { en: 'Past Gen 1',   ta: 'முதல் முந்தைய தலைமுறை'    },
  '0':  { en: 'Current',      ta: 'இப்போதைய தலைமுறை'          },
  '-1': { en: 'Future Gen 1', ta: 'அடுத்த தலைமுறை'            },
  '-2': { en: 'Future Gen 2', ta: 'இரண்டாவது அடுத்த தலைமுறை' },
};

// Kutham color palette — UI only
const KUTHAM_PAL = [
  { fill: '#EDE9FE', stroke: '#7C3AED', text: '#5B21B6' },
  { fill: '#FFF7ED', stroke: '#F59E0B', text: '#92400E' },
  { fill: '#EFF6FF', stroke: '#3B82F6', text: '#1D4ED8' },
  { fill: '#F0FDF4', stroke: '#22C55E', text: '#15803D' },
  { fill: '#FFF1F2', stroke: '#F43F5E', text: '#BE123C' },
  { fill: '#F0F9FF', stroke: '#0EA5E9', text: '#0369A1' },
  { fill: '#FDF4FF', stroke: '#A855F7', text: '#7E22CE' },
  { fill: '#FFFBEB', stroke: '#EAB308', text: '#854D0E' },
];

// ─────────────────────────────────────────
// Layout engine — pure geometry, no business logic
// Input:  nodes[] and edges[] from API
// Output: positioned nodes and edges with x,y coordinates
// ─────────────────────────────────────────
function computeLayout(nodes, edges) {
  // Build kutham color map
  const kuthamMap = new Map();
  let ki = 0;
  nodes.forEach(n => {
    if (n.kutham && !kuthamMap.has(n.kutham)) {
      kuthamMap.set(n.kutham, ki++);
    }
  });

  const getColor = (node) => {
    if (node.is_root) {
      const kc = node.kutham ? KUTHAM_PAL[kuthamMap.get(node.kutham) % KUTHAM_PAL.length] : null;
      return { fill: kc?.stroke || '#7C3AED', stroke: kc?.stroke || '#5B21B6', text: '#FFFFFF' };
    }
    if (node.is_offline) return { fill: '#374151', stroke: '#6B7280', text: '#9CA3AF' };
    if (!node.kutham)    return { fill: '#F3F4F6', stroke: '#9CA3AF', text: '#6B7280' };
    const kc = KUTHAM_PAL[kuthamMap.get(node.kutham) % KUTHAM_PAL.length];
    return kc || { fill: '#F3F4F6', stroke: '#9CA3AF', text: '#6B7280' };
  };

  // Group nodes by generation
  const byGen = {};
  nodes.forEach(n => {
    const g = n.generation;
    if (!byGen[g]) byGen[g] = [];
    byGen[g].push(n);
  });

  // Sort generations descending (past at top, future at bottom)
  const sortedGens = Object.keys(byGen).map(Number).sort((a, b) => b - a);

  // Canvas width based on max nodes in any row
  const rowCounts = Object.values(byGen).map(arr => arr.length);
  const maxNodes = rowCounts.length > 0 ? Math.max(...rowCounts) : 1;
  const totalW = Math.max(600, maxNodes * (NODE_W + H_GAP) + PAD * 2);

  // Assign y position per generation row
  const genRowIndex = {};
  sortedGens.forEach((gen, i) => { genRowIndex[gen] = i; });
  const genY = (gen) => PAD + genRowIndex[gen] * (NODE_H + V_GAP);

  // Position nodes — centered per row
  const posMap = new Map();
  const positionedNodes = [];

  sortedGens.forEach(gen => {
    const rowNodes = byGen[gen];
    const total = rowNodes.length * NODE_W + (rowNodes.length - 1) * H_GAP;
    const startX = (totalW - total) / 2;
    rowNodes.forEach((node, i) => {
      const x = startX + i * (NODE_W + H_GAP);
      const y = genY(gen);
      posMap.set(node.id, { x, y });
      positionedNodes.push({ ...node, x, y, color: getColor(node) });
    });
  });

  // Position edges using node positions
  const positionedEdges = edges.map(e => {
    const from = posMap.get(e.from_id);
    const to   = posMap.get(e.to_id);
    if (!from || !to) return null;

    const isSameGen = e.generation_from === e.generation_to;
    return {
      ...e,
      x1: from.x + NODE_W / 2,
      y1: isSameGen ? from.y + NODE_H / 2 : from.y + NODE_H,
      x2: to.x + NODE_W / 2,
      y2: isSameGen ? to.y + NODE_H / 2 : to.y,
      isSameGen,
    };
  }).filter(Boolean);

  const numRows = sortedGens.length;
  const totalH = PAD + numRows * (NODE_H + V_GAP) + PAD;

  return { positionedNodes, positionedEdges, totalW, totalH, sortedGens, genY };
}

// ─────────────────────────────────────────
// SVG Renderer — web only, pure drawing
// No logic here — only SVG primitives
// ─────────────────────────────────────────
function SVGRenderer({ positionedNodes, positionedEdges, totalW, totalH }) {
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      <defs>
        <marker id="lk-arrow-v" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#A78BFA" />
        </marker>
        <marker id="lk-arrow-p" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#FCD34D" />
        </marker>
      </defs>

      {/* Edges */}
      {positionedEdges.map((e, i) => {
        const color  = e.verified ? '#A78BFA' : '#FCD34D';
        const marker = e.verified ? 'lk-arrow-v' : 'lk-arrow-p';
        const label  = e.relation_tamil || '';

        // Place label 30% from source node — spreads naturally
        const labelX = e.x1 + (e.x2 - e.x1) * 0.3;
        const labelY = e.y1 + (e.y2 - e.y1) * 0.3;

        // Straight lines — cleaner, no crossing curves
        const pathD = `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`;

        return (
          <g key={`e${i}`}>
            <path
              d={pathD}
              stroke={color} strokeWidth={1.5} fill="none"
              strokeDasharray={e.verified ? 'none' : '4,3'}
              markerEnd={`url(#${marker})`}
            />
            {label && (
              <>
                <rect
                  x={labelX - 32} y={labelY - 9}
                  width={64} height={16} rx={8}
                  fill="#1e1b4b" stroke="#4C1D95" strokeWidth={1}
                  opacity={0.95}
                />
                <text
                  x={labelX} y={labelY + 3}
                  textAnchor="middle" fontSize="8" fontWeight="600" fill="#C4B5FD"
                >
                  {label.length > 10 ? label.substring(0, 9) + '…' : label}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {positionedNodes.map((node, i) => {
        const { x, y, color, is_root, verified, is_offline } = node;
        const cx = x + NODE_W / 2;
        return (
          <g key={`n${node.id}${i}`}>
            {/* Shadow */}
            <rect x={x+2} y={y+3} width={NODE_W} height={NODE_H} rx={12} fill="rgba(0,0,0,0.15)" />
            {/* Card */}
            <rect
              x={x} y={y} width={NODE_W} height={NODE_H} rx={12}
              fill={color.fill} stroke={color.stroke}
              strokeWidth={is_root ? 2.5 : 1.5}
              strokeDasharray={is_offline ? '4,3' : 'none'}
              opacity={is_offline ? 0.7 : 1}
            />
            {/* Top bar */}
            <rect x={x} y={y} width={NODE_W} height={6} rx={12} fill={color.stroke} opacity={0.8} />
            {/* Avatar */}
            <circle cx={cx} cy={y+32} r={20}
              fill={is_root ? color.stroke : '#E9D5FF'}
              stroke={color.stroke} strokeWidth={1.5}
            />
            <text x={cx} y={y+37} textAnchor="middle" fontSize="14" fontWeight="bold"
              fill={is_root ? '#FFF' : color.stroke}>
              {is_offline ? '🕊' : (node.name?.charAt(0) || '?')}
            </text>
            {/* Name */}
            <text x={cx} y={y+62} textAnchor="middle" fontSize="9" fontWeight="700"
              fill={is_root ? '#FFF' : color.text || '#374151'}>
              {node.name?.length > 10 ? node.name.substring(0, 9) + '…' : node.name}
            </text>
            {/* Kutham */}
            {node.kutham && (
              <text x={cx} y={y+74} textAnchor="middle" fontSize="7"
                fill={is_root ? '#C4B5FD' : '#9CA3AF'}>
                {node.kutham.length > 12 ? node.kutham.substring(0, 11) + '…' : node.kutham}
              </text>
            )}
            {/* நீங்கள் */}
            {is_root && (
              <text x={cx} y={y+86} textAnchor="middle" fontSize="8" fill="#C4B5FD">நீங்கள்</text>
            )}
            {/* Verified badge */}
            {!is_root && !is_offline && (
              <>
                <circle cx={x+NODE_W-8} cy={y+8} r={7}
                  fill={verified ? '#10B981' : '#F59E0B'}
                  stroke="white" strokeWidth={1.5}
                />
                <text x={x+NODE_W-8} y={y+12} textAnchor="middle" fontSize="8"
                  fill="white" fontWeight="bold">
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
// Main Component
// Single API call → layout → render
// ─────────────────────────────────────────
export default function FamilyLinkedIn({ currentUser, onRelationAdded }) {
  const [layout, setLayout]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => { load(); }, [currentUser.id]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Single API call — backend returns everything
      const res = await api.get(
        `/api/relationships/linkedin-tree/${currentUser.id}?maxGen=3&minGen=-2`
      );
      const { nodes, edges } = res.data;

      // Pure geometry — no business logic
      const l = computeLayout(nodes || [], edges || []);
      setLayout(l);
    } catch (e) {
      console.error('FamilyLinkedIn load error:', e?.message, e?.stack);
      setError('குடும்ப வலைதளம் ஏற்றுவதில் பிழை / Error loading tree');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack w="100%" spacing={3} align="stretch">
      {/* Suggestions banner */}
      <SuggestionsBanner onRelationAdded={() => { load(); if (onRelationAdded) onRelationAdded(); }} />

      {/* Legend */}
      <HStack spacing={4} flexWrap="wrap" fontSize="10px" color="whiteAlpha.600" px={1}>
        <HStack spacing={1}><Box w={2} h={2} borderRadius="full" bg="#10B981" /><Text>சரிபார்க்கப்பட்டது</Text></HStack>
        <HStack spacing={1}><Box w={2} h={2} borderRadius="full" bg="#F59E0B" /><Text>நிலுவை</Text></HStack>
        <HStack spacing={1}><Text>🕊️</Text><Text>காலமானவர்</Text></HStack>
      </HStack>

      {loading && (
        <VStack py={10}>
          <Spinner color="purple.300" size="lg" />
          <Text color="whiteAlpha.500" fontSize="sm">
            குடும்ப வலைதளம் ஏற்றுகிறோம்...
          </Text>
        </VStack>
      )}

      {error && (
        <Text color="red.300" textAlign="center" py={4}>{error}</Text>
      )}

      {!loading && !error && layout && (
        <Box position="relative">
          {/* Generation labels — left side, UI only */}
          {layout.sortedGens.map(gen => {
            const cfg = GEN_LABELS[String(gen)];
            if (!cfg) return null;
            return (
              <Box
                key={gen}
                position="absolute"
                left="4px"
                top={`${layout.genY(gen) + 4}px`}
                zIndex={1}
                pointerEvents="none"
              >
                <Text fontSize="9px" fontWeight="700" color="purple.400" whiteSpace="nowrap">
                  {cfg.en}
                </Text>
              </Box>
            );
          })}

          {/* SVG canvas */}
          <Box
            bg="rgba(255,255,255,0.02)"
            borderRadius="2xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            overflowX="auto"
            overflowY="auto"
            maxH="70vh"
            pl={`${LEFT_PAD}px`}
          >
            <SVGRenderer
              positionedNodes={layout.positionedNodes}
              positionedEdges={layout.positionedEdges}
              totalW={layout.totalW}
              totalH={layout.totalH}
            />
          </Box>
        </Box>
      )}

      {!loading && !error && layout?.positionedNodes?.length <= 1 && (
        <Text color="whiteAlpha.400" textAlign="center" py={4}>
          குடும்பத்தினர் இல்லை / No family members found
        </Text>
      )}
    </VStack>
  );
}
