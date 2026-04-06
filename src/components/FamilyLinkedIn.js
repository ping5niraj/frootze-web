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
const H_GAP    = 40;
const V_GAP    = 160;  // extra vertical gap — room for rotated labels on steep edges
const PAD      = 40;
const LEFT_PAD = 70;

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
// ─────────────────────────────────────────
function computeLayout(nodes, edges) {
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
    // Deceased/offline — soft warm sepia, not harsh gray
    if (node.is_offline) return { fill: '#FEF3C7', stroke: '#B45309', text: '#92400E' };
    if (!node.kutham)    return { fill: '#F5F3FF', stroke: '#7C3AED', text: '#5B21B6' };
    const kc = KUTHAM_PAL[kuthamMap.get(node.kutham) % KUTHAM_PAL.length];
    return kc || { fill: '#F5F3FF', stroke: '#7C3AED', text: '#5B21B6' };
  };

  const byGen = {};
  nodes.forEach(n => {
    const g = n.generation;
    if (!byGen[g]) byGen[g] = [];
    byGen[g].push(n);
  });

  const sortedGens = Object.keys(byGen).map(Number).sort((a, b) => b - a);

  const rowCounts = Object.values(byGen).map(arr => arr.length);
  const maxNodes  = rowCounts.length > 0 ? Math.max(...rowCounts) : 1;
  const totalW    = Math.max(600, maxNodes * (NODE_W + H_GAP) + PAD * 2);

  const genRowIndex = {};
  sortedGens.forEach((gen, i) => { genRowIndex[gen] = i; });
  const genY = (gen) => PAD + genRowIndex[gen] * (NODE_H + V_GAP);

  const posMap = new Map();
  const positionedNodes = [];

  sortedGens.forEach(gen => {
    const rowNodes = byGen[gen];
    const total    = rowNodes.length * NODE_W + (rowNodes.length - 1) * H_GAP;
    const startX   = (totalW - total) / 2;
    rowNodes.forEach((node, i) => {
      const x = startX + i * (NODE_W + H_GAP);
      const y = genY(gen);
      posMap.set(node.id, { x, y });
      positionedNodes.push({ ...node, x, y, color: getColor(node) });
    });
  });

  const positionedEdges = edges.map(e => {
    const from = posMap.get(e.from_id);
    const to   = posMap.get(e.to_id);
    if (!from || !to) return null;

    const isSameGen = e.generation_from === e.generation_to;
    return {
      ...e,
      x1: from.x + NODE_W / 2,
      y1: isSameGen ? from.y + NODE_H / 2 : from.y + NODE_H,
      x2: to.x   + NODE_W / 2,
      y2: isSameGen ? to.y + NODE_H / 2   : to.y,
      isSameGen,
    };
  }).filter(Boolean);

  const numRows = sortedGens.length;
  const totalH  = PAD + numRows * (NODE_H + V_GAP) + PAD;

  return { positionedNodes, positionedEdges, totalW, totalH, sortedGens, genY };
}

// ─────────────────────────────────────────
// SVG Renderer — pure drawing, no logic
// ─────────────────────────────────────────
function SVGRenderer({ positionedNodes, positionedEdges, totalW, totalH }) {
  return (
    <svg width={totalW} height={totalH} style={{ display: 'block' }}>
      <defs>
        <marker id="lk-arrow-v" markerWidth="10" markerHeight="10" refX="7" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L10,3.5 z" fill="#7C3AED" />
        </marker>
        <marker id="lk-arrow-p" markerWidth="10" markerHeight="10" refX="7" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L10,3.5 z" fill="#D97706" />
        </marker>
      </defs>

      {/* ── Edges ───────────────────────────────────────────────────────
          Label sits directly ON the line, rotated to match the edge angle.

          How it works:
            1. midX, midY  — exact center of the edge line
            2. angleDeg    — atan2 converts dx/dy into degrees
            3. The entire label group (pill + text) is rotated around
               the midpoint using SVG transform="rotate(angle, cx, cy)"
            4. Result: label always lies flat along its own edge line
               regardless of direction — vertical, diagonal, horizontal
      ──────────────────────────────────────────────────────────────── */}
      {positionedEdges.map((e, i) => {
        const color  = e.verified ? '#A78BFA' : '#FCD34D';
        const marker = e.verified ? 'lk-arrow-v' : 'lk-arrow-p';
        const label  = e.relation_tamil || '';

        // Center of the edge line
        const midX = (e.x1 + e.x2) / 2;
        const midY = (e.y1 + e.y2) / 2;

        // Exact angle of this edge in degrees
        const angleDeg = Math.atan2(e.y2 - e.y1, e.x2 - e.x1) * (180 / Math.PI);

        // Pill sized to fit full Tamil text — no truncation
        const pillW = 88;
        const pillH = 20;

        return (
          <g key={`e${i}`}>
            {/* Arrow line — drawn in two segments so label gap looks intentional */}
            <line
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={color} strokeWidth={2}
              strokeDasharray={e.verified ? 'none' : '5,4'}
              markerEnd={`url(#${marker})`}
            />

            {/* Label group — rotated around the midpoint to lie ON the line */}
            {label && (
              <g transform={`rotate(${angleDeg}, ${midX}, ${midY})`}>
                {/* Pill background — solid, high contrast */}
                <rect
                  x={midX - pillW / 2}
                  y={midY - pillH / 2}
                  width={pillW}
                  height={pillH}
                  rx={10}
                  fill={e.verified ? '#6D28D9' : '#D97706'}
                  stroke="white"
                  strokeWidth={1.5}
                  opacity={1}
                />
                {/* Label text — white, clear, larger */}
                <text
                  x={midX}
                  y={midY + 4.5}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="white"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {label.length > 12 ? label.substring(0, 11) + '…' : label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* ── Nodes — drawn AFTER edges so cards always appear on top ───── */}
      {positionedNodes.map((node, i) => {
        const { x, y, color, is_root, verified, is_offline } = node;
        const cx = x + NODE_W / 2;
        return (
          <g key={`n${node.id}${i}`}>
            {/* Drop shadow */}
            <rect x={x+2} y={y+4} width={NODE_W} height={NODE_H} rx={14}
              fill="rgba(0,0,0,0.10)" />

            {/* Card background */}
            <rect
              x={x} y={y} width={NODE_W} height={NODE_H} rx={14}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={is_root ? 3 : is_offline ? 1.5 : 2}
              strokeDasharray="none"
              opacity={1}
            />

            {/* Top colour bar */}
            <rect x={x} y={y} width={NODE_W} height={7} rx={14}
              fill={color.stroke} />
            {/* Cover bottom rounded corners of top bar */}
            <rect x={x} y={y+4} width={NODE_W} height={3} fill={color.stroke} />

            {/* Avatar circle */}
            <circle cx={cx} cy={y+34} r={22}
              fill={is_offline ? '#FDE68A' : is_root ? color.stroke : color.fill}
              stroke={color.stroke}
              strokeWidth={is_root ? 0 : 2}
            />

            {/* Avatar content */}
            {is_offline ? (
              <>
                {/* Deceased — simple cross / rest symbol */}
                <text x={cx} y={y+40} textAnchor="middle"
                  fontSize="15" fill="#92400E" fontWeight="900">
                  †
                </text>
              </>
            ) : (
              <text x={cx} y={y+40} textAnchor="middle"
                fontSize="16" fontWeight="800"
                fill={is_root ? '#FFF' : color.stroke}>
                {node.name?.charAt(0)?.toUpperCase() || '?'}
              </text>
            )}

            {/* Deceased label */}
            {is_offline && (
              <text x={cx} y={y+58} textAnchor="middle"
                fontSize="8" fontWeight="700" fill="#B45309"
                letterSpacing="0.5">
                காலமானவர்
              </text>
            )}

            {/* Name */}
            <text x={cx} y={is_offline ? y+70 : y+66}
              textAnchor="middle" fontSize="10" fontWeight="700"
              fill={is_root ? '#FFF' : color.text || '#374151'}>
              {node.name?.length > 10 ? node.name.substring(0, 9) + '…' : node.name}
            </text>

            {/* Kutham */}
            {node.kutham && !is_offline && (
              <text x={cx} y={y+79} textAnchor="middle" fontSize="8"
                fill={is_root ? '#DDD6FE' : color.stroke} opacity={0.8}>
                {node.kutham.length > 11 ? node.kutham.substring(0, 10) + '…' : node.kutham}
              </text>
            )}

            {/* நீங்கள் label for root */}
            {is_root && (
              <text x={cx} y={y+90} textAnchor="middle"
                fontSize="8" fontWeight="700" fill="#DDD6FE">
                நீங்கள்
              </text>
            )}

            {/* Verified / pending badge — top right */}
            {!is_root && !is_offline && (
              <>
                <circle cx={x+NODE_W-9} cy={y+9} r={8}
                  fill={verified ? '#10B981' : '#F59E0B'}
                  stroke="white" strokeWidth={1.5}
                />
                <text x={x+NODE_W-9} y={y+13} textAnchor="middle"
                  fontSize="9" fill="white" fontWeight="800">
                  {verified ? '✓' : '?'}
                </text>
              </>
            )}

            {/* Deceased badge — top right */}
            {is_offline && (
              <circle cx={x+NODE_W-9} cy={y+9} r={8}
                fill="#B45309" stroke="white" strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────
// Main Component — single API call → layout → render
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
      const res = await api.get(
        `/api/relationships/linkedin-tree/${currentUser.id}?maxGen=3&minGen=-2`
      );
      const { nodes, edges } = res.data;
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
        <HStack spacing={1}><Box w={2} h={2} borderRadius="full" bg="#B45309" /><Text>காலமானவர்</Text></HStack>
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
          {/* Generation labels — left side */}
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
