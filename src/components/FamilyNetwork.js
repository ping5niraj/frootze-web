import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Layout constants ──────────────────────────────────────
const NODE_W  = 120;
const NODE_H  = 70;
const H_GAP   = 60;   // horizontal gap between same-gen nodes
const V_GAP   = 100;  // vertical gap between generations

// ── Generation delta per relation type ───────────────────
const GEN_DELTA = {
  // Up (parents)
  father: -1, mother: -1,
  grandfather_paternal: -2, grandmother_paternal: -2,
  grandfather_maternal: -2, grandmother_maternal: -2,
  great_grandfather: -3, great_grandmother: -3,
  father_in_law: -1, mother_in_law: -1,
  uncle_paternal: -1, aunt_paternal: -1,
  uncle_maternal: -1, aunt_maternal: -1,
  // Same level
  brother: 0, sister: 0, spouse: 0,
  brother_in_law: 0, sister_in_law: 0,
  cousin: 0, aunt_by_marriage: 0, uncle_by_marriage: 0,
  // Down (children)
  son: 1, daughter: 1,
  grandson: 2, granddaughter: 2,
  nephew: 1, niece: 1,
  son_in_law: 1, daughter_in_law: 1,
  nephew_by_marriage: 1, niece_by_marriage: 1,
  stepson: 1, stepdaughter: 1,
};

// ── Kutham color palette ──────────────────────────────────
const KUTHAM_PALETTE = [
  { fill: '#4C1D95', stroke: '#7C3AED', text: '#DDD6FE' },
  { fill: '#78350F', stroke: '#F59E0B', text: '#FDE68A' },
  { fill: '#1E3A5F', stroke: '#3B82F6', text: '#BFDBFE' },
  { fill: '#14532D', stroke: '#22C55E', text: '#BBF7D0' },
  { fill: '#4C0519', stroke: '#F43F5E', text: '#FECDD3' },
  { fill: '#0C4A6E', stroke: '#0EA5E9', text: '#BAE6FD' },
  { fill: '#3B0764', stroke: '#A855F7', text: '#E9D5FF' },
  { fill: '#422006', stroke: '#EAB308', text: '#FEF9C3' },
];
const UNKNOWN_COLOR = { fill: '#1F2937', stroke: '#6B7280', text: '#9CA3AF' };
const ROOT_COLOR    = { fill: '#5B21B6', stroke: '#7C3AED', text: '#FFFFFF' };
const OFFLINE_COLOR = { fill: '#374151', stroke: '#6B7280', text: '#9CA3AF' };

export default function FamilyNetwork({ currentUser }) {
  const svgRef  = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    console.log('[FamilyNetwork] calling:', `/api/relationships/network/${currentUser.id}`);
    api.get(`/api/relationships/network/${currentUser.id}`)
      .then(res => {
        setLoading(false);
        if (res.data?.nodes) {
          drawNetwork(res.data);
        } else {
          setError('No network data returned');
        }
      })
      .catch(err => {
        setLoading(false);
        console.error('Network fetch error:', err?.response?.status, err?.message);
        setError('Network fetch failed — check backend deployment');
      });
  }, [currentUser?.id]);

  const drawNetwork = (data) => {
    console.log('[FamilyNetwork] nodes:', data.nodes?.length, 'edges:', data.edges?.length);
    const { nodes, edges, root_id } = data;
    if (!svgRef.current || !nodes?.length) return;
    d3.select(svgRef.current).selectAll('*').remove();

    // ── Build kutham color map ────────────────────────────
    const kuthamMap = new Map();
    let kidx = 0;
    nodes.forEach(n => {
      if (n.kutham && !kuthamMap.has(n.kutham)) kuthamMap.set(n.kutham, kidx++);
    });

    // ── Assign generations via BFS from root ─────────────
    const genMap  = new Map(); // id → generation number (root=0)
    const posMap  = new Map(); // id → { x, y }
    genMap.set(root_id, 0);

    // BFS to assign generations
    const bfsQueue = [root_id];
    const bfsVisited = new Set([root_id]);
    while (bfsQueue.length > 0) {
      const uid = bfsQueue.shift();
      const currentGen = genMap.get(uid);

      edges.filter(e => e.from === uid).forEach(e => {
        if (!bfsVisited.has(e.to)) {
          const delta = GEN_DELTA[e.relation_type] ?? 0;
          // Only set gen if not already set (first path wins)
          if (!genMap.has(e.to)) genMap.set(e.to, currentGen + delta);
          bfsVisited.add(e.to);
          bfsQueue.push(e.to);
        }
      });
    }

    // Assign default gen 0 for any unvisited nodes
    nodes.forEach(n => { if (!genMap.has(n.id)) genMap.set(n.id, 0); });

    // ── Group nodes by generation ─────────────────────────
    const genGroups = new Map();
    nodes.forEach(n => {
      const g = genMap.get(n.id) ?? 0;
      if (!genGroups.has(g)) genGroups.set(g, []);
      genGroups.get(g).push(n);
    });

    const allGens   = [...genGroups.keys()].sort((a,b) => a - b);
    const minGen    = allGens[0];
    const maxGen    = allGens[allGens.length - 1];

    // ── Calculate positions ───────────────────────────────
    // Generations: minGen at top (y=0), maxGen at bottom
    // Row index 0 = oldest generation (most negative gen number)

    allGens.forEach((gen, rowIdx) => {
      const group = genGroups.get(gen);
      const totalW = group.length * NODE_W + (group.length - 1) * H_GAP;
      const startX = -totalW / 2;
      const y = rowIdx * (NODE_H + V_GAP); // rowIdx 0 = top
      group.forEach((node, idx) => {
        posMap.set(node.id, {
          x: startX + idx * (NODE_W + H_GAP),
          y,
          gen,
          rowIdx,
        });
      });
    });

    // ── SVG dimensions ────────────────────────────────────
    let minX = Infinity, maxX = -Infinity;
    posMap.forEach(({ x }) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + NODE_W);
    });

    const padding = 80;
    const numRows = allGens.length;
    const svgW = Math.max(maxX - minX + padding * 2 + 100, 600);
    const svgH = numRows * (NODE_H + V_GAP) + padding * 2;
    const offsetX = -minX + padding + 80; // +80 for gen labels on left
    const offsetY = padding;

    const svg = d3.select(svgRef.current)
      .attr('width', svgW)
      .attr('height', svgH);

    // Zoom + pan
    const g = svg.append('g');
    svg.call(d3.zoom()
      .scaleExtent([0.2, 2.5])
      .on('zoom', (e) => g.attr('transform', e.transform)));

    // Arrow marker
    const defs = svg.append('defs');
    ['verified', 'pending'].forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', type === 'verified' ? '#7C3AED' : '#F59E0B');
    });

    // Generation labels (left side)
    const GEN_LABEL = {
      3: 'Past Gen 3', 2: 'Past Gen 2', 1: 'Past Gen 1',
      0: 'Current', '-1': 'Next Gen 1', '-2': 'Next Gen 2',
    };

    allGens.forEach((gen, rowIdx) => {
      const y = rowIdx * (NODE_H + V_GAP) + offsetY;
      g.append('text')
        .attr('x', 8)
        .attr('y', y + NODE_H / 2 + 4)
        .attr('font-size', '10px')
        .attr('fill', '#475569')
        .attr('font-weight', '600')
        .text(GEN_LABEL[gen] ?? `Gen ${gen}`);
    });

    // ── Draw edges ────────────────────────────────────────
    const edgesG = g.append('g').attr('class', 'edges');

    edges.forEach(edge => {
      const sp = posMap.get(edge.from);
      const tp = posMap.get(edge.to);
      if (!sp || !tp) return;

      const sx = sp.x + offsetX + NODE_W / 2;
      const sy = sp.y + offsetY + NODE_H / 2;
      const tx = tp.x + offsetX + NODE_W / 2;
      const ty = tp.y + offsetY + NODE_H / 2;

      // Direction vector for arrow offset
      const dx = tx - sx, dy = ty - sy;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const ux = dx/dist, uy = dy/dist;

      // Start/end at node border
      const startX = sx + ux * (NODE_W/2 + 2);
      const startY = sy + uy * (NODE_H/2 + 2);
      const endX   = tx - ux * (NODE_W/2 + 12);
      const endY   = ty - uy * (NODE_H/2 + 12);

      // Slight curve
      const mx = (startX + endX) / 2 + uy * 15;
      const my = (startY + endY) / 2 - ux * 15;

      const color = edge.verified ? '#7C3AED' : '#F59E0B';

      edgesG.append('path')
        .attr('d', `M${startX},${startY} Q${mx},${my} ${endX},${endY}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', edge.verified ? 'none' : '5,3')
        .attr('marker-end', `url(#arrow-${edge.verified ? 'verified' : 'pending'})`);

      // Relation label on edge midpoint
      const lx = (startX + mx + endX) / 3;
      const ly = (startY + my + endY) / 3;
      const label = edge.relation_tamil || '';
      const labelShort = label.length > 14 ? label.substring(0,14)+'…' : label;

      if (labelShort) {
        const lw = labelShort.length * 5.5 + 12;
        edgesG.append('rect')
          .attr('x', lx - lw/2).attr('y', ly - 9)
          .attr('width', lw).attr('height', 14)
          .attr('rx', 5)
          .attr('fill', '#0f0c29')
          .attr('opacity', 0.9);
        edgesG.append('text')
          .attr('x', lx).attr('y', ly + 1)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('font-weight', '700')
          .attr('fill', color)
          .text(labelShort);
      }
    });

    // ── Draw nodes ────────────────────────────────────────
    const nodesG = g.append('g').attr('class', 'nodes');

    nodes.forEach(node => {
      const pos = posMap.get(node.id);
      if (!pos) return;

      const nx = pos.x + offsetX;
      const ny = pos.y + offsetY;
      const isRoot = node.id === root_id;

      // Color
      let color;
      if (isRoot)          color = ROOT_COLOR;
      else if (node.is_offline) color = OFFLINE_COLOR;
      else if (node.kutham) {
        const idx = kuthamMap.get(node.kutham);
        color = KUTHAM_PALETTE[idx % KUTHAM_PALETTE.length];
      } else               color = UNKNOWN_COLOR;

      const ng = nodesG.append('g')
        .attr('transform', `translate(${nx},${ny})`)
        .style('cursor', 'default');

      // Node rect
      ng.append('rect')
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 10)
        .attr('fill', color.fill)
        .attr('stroke', color.stroke)
        .attr('stroke-width', isRoot ? 3 : 1.5)
        .attr('stroke-dasharray', node.is_offline ? '5,3' : 'none');

      // Name
      const nameShort = (node.name||'').length > 13
        ? node.name.substring(0,13)+'…' : node.name;
      ng.append('text')
        .attr('x', NODE_W/2).attr('y', NODE_H/2 - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .attr('fill', color.text)
        .text(nameShort);

      // Kutham or YOU label
      if (isRoot) {
        ng.append('text')
          .attr('x', NODE_W/2).attr('y', NODE_H/2 + 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('fill', '#A78BFA')
          .text('(நீங்கள்)');
      } else if (node.kutham) {
        const ktShort = node.kutham.length > 14 ? node.kutham.substring(0,14)+'…' : node.kutham;
        ng.append('text')
          .attr('x', NODE_W/2).attr('y', NODE_H/2 + 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('fill', color.stroke)
          .text(ktShort);
      }

      // Deceased icon
      if (node.is_offline) {
        ng.append('text')
          .attr('x', 6).attr('y', 14)
          .attr('font-size', '10px').text('🕊️');
      }

      // Verified/pending dot
      if (!node.is_offline && !isRoot) {
        // Check if any edge to/from this node is verified
        const isVerified = edges.some(e =>
          (e.from === node.id || e.to === node.id) && e.verified
        );
        ng.append('circle')
          .attr('cx', NODE_W - 7).attr('cy', 7).attr('r', 5)
          .attr('fill', isVerified ? '#22C55E' : '#F59E0B');
      }
    });
  };

  if (loading) return (
    <VStack py={10} spacing={3}>
      <Spinner color="purple.300" size="lg"/>
      <Text color="whiteAlpha.500" fontSize="sm">குடும்ப நெட்வொர்க் ஏற்றுகிறோம்...</Text>
    </VStack>
  );

  if (error) return (
    <VStack py={8}>
      <Text color="red.300" fontSize="sm">⚠️ {error}</Text>
    </VStack>
  );

  return (
    <Box w="100%" overflowX="auto" overflowY="auto"
      bg="linear-gradient(to bottom, #0f0c29, #1e1b4b)"
      borderRadius="xl" p={2} minH="300px">
      <svg ref={svgRef} style={{ display: 'block' }}/>
    </Box>
  );
}
