import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import api from '../services/api';

// ── Layout constants ──────────────────────────────────────
const NODE_W  = 130;
const NODE_H  = 60;
const H_GAP   = 80;   // horizontal gap between nodes in same row
const V_GAP   = 100;  // vertical gap between rows

// ── Generation delta per relation ────────────────────────
const GEN_DELTA = {
  great_grandfather:-3, great_grandmother:-3,
  grandfather_paternal:-2, grandmother_paternal:-2,
  grandfather_maternal:-2, grandmother_maternal:-2,
  father:-1, mother:-1, father_in_law:-1, mother_in_law:-1,
  uncle_paternal:-1, aunt_paternal:-1, uncle_maternal:-1, aunt_maternal:-1,
  brother:0, sister:0, spouse:0,
  brother_in_law:0, sister_in_law:0,
  aunt_by_marriage:0, uncle_by_marriage:0, cousin:0,
  son:1, daughter:1, nephew:1, niece:1,
  son_in_law:1, daughter_in_law:1,
  nephew_by_marriage:1, niece_by_marriage:1,
  stepson:1, stepdaughter:1,
  grandson:2, granddaughter:2,
};

// ── Direct types ──────────────────────────────────────────
const DIRECT_TYPES = new Set([
  'father','mother','brother','sister','son','daughter','spouse',
  'grandfather_paternal','grandmother_paternal',
  'grandfather_maternal','grandmother_maternal',
  'grandson','granddaughter',
]);

// ── Colors ────────────────────────────────────────────────
const COLORS = {
  root:    { fill:'#3B3F9E', stroke:'#6366F1', text:'#fff' },
  blood:   { fill:'#1E3A8A', stroke:'#3B82F6', text:'#BFDBFE' },
  wife:    { fill:'#5B21B6', stroke:'#7C3AED', text:'#DDD6FE' },
  chain:   { fill:'#1E3A8A', stroke:'#60A5FA', text:'#BAE6FD' },
  unknown: { fill:'#1F2937', stroke:'#6B7280', text:'#9CA3AF' },
};

export default function FamilyNetwork({ currentUser }) {
  const svgRef  = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [netData, setNetData] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    buildNetworkData()
      .then(d => { setLoading(false); setNetData(d); })
      .catch(e => { setLoading(false); setError('Failed to load'); console.error(e); });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!netData || !svgRef.current) return;
    drawNetwork(netData);
  }, [netData]);

  // ── Build nodes + edges from relationships ────────────────
  const buildNetworkData = async () => {
    const res  = await api.get('/api/relationships/mine');
    const rels = res.data.my_relationships || [];

    // nodeMap: id → { id, name, gen, horizPos, col, isRoot, isChain, ... }
    const nodeMap = new Map();
    const edges   = [];

    // Self node — gen=0, center of horizontal axis
    nodeMap.set(currentUser.id, {
      id: currentUser.id, name: currentUser.name,
      gen: 0, horizIdx: 0, isRoot: true, isChain: false,
      profile_photo: currentUser.profile_photo, kutham: currentUser.kutham,
    });

    for (const rel of rels) {
      const relType = rel.relation_type;
      const person  = rel.to_user;
      if (!person) continue;

      const isDirect = DIRECT_TYPES.has(relType);

      if (isDirect) {
        // Direct relation — simple node + edge from self
        if (!nodeMap.has(person.id)) {
          nodeMap.set(person.id, {
            id: person.id, name: person.name,
            gen: GEN_DELTA[relType] ?? 0,
            horizIdx: 0, isRoot: false, isChain: false,
            profile_photo: person.profile_photo, kutham: person.kutham,
          });
        }
        edges.push({
          from: currentUser.id, to: person.id,
          label: rel.relation_tamil || relType,
          verified: rel.verification_status === 'verified',
          isChain: false,
        });
      } else {
        // Extended — get chain path
        const phone = person.phone?.replace(/\D/g,'');
        if (!phone) continue;
        try {
          const chainRes = await api.get(`/api/relationships/chain-detect?to_phone=${phone}`);
          const chain    = chainRes.data?.chain;

          if (chain && chain.length > 1) {
            // Build chain: [self, node1, node2, ..., target]
            // chain[0] = self, chain[last] = target
            // chain[i].relation_to_next = relation from chain[i] to chain[i+1]
            let prevGen = 0;

            for (let i = 1; i < chain.length; i++) {
              const node    = chain[i];
              const nodeId  = node.user?.id;
              if (!nodeId) continue;

              const relToThis = chain[i-1].relation_to_next;
              const delta     = GEN_DELTA[relToThis] ?? 0;
              const thisGen   = prevGen + delta;
              const isTarget  = i === chain.length - 1;

              if (!nodeMap.has(nodeId)) {
                nodeMap.set(nodeId, {
                  id: nodeId, name: node.user.name,
                  gen: thisGen, horizIdx: 0,
                  isRoot: false,
                  isChain: !isTarget, // intermediates are chain nodes, target is not
                  profile_photo: null, kutham: null,
                });
              }
              prevGen = thisGen;

              // Edge from previous node to this
              const fromId    = chain[i-1].user?.id || currentUser.id;
              const edgeLabel = chain[i-1].rel_tamil || chain[i-1].relation_to_next || '';

              const exists = edges.find(e => e.from===fromId && e.to===nodeId);
              if (!exists && fromId !== nodeId) {
                edges.push({
                  from: fromId, to: nodeId,
                  label: edgeLabel,
                  verified: node.connected !== false,
                  isChain: !isTarget,
                });
              }
            }
          } else {
            // No chain — show direct
            if (!nodeMap.has(person.id)) {
              nodeMap.set(person.id, {
                id: person.id, name: person.name,
                gen: GEN_DELTA[relType] ?? 0,
                horizIdx: 0, isRoot: false, isChain: false,
                profile_photo: person.profile_photo, kutham: person.kutham,
              });
            }
            edges.push({
              from: currentUser.id, to: person.id,
              label: rel.relation_tamil || relType,
              verified: rel.verification_status === 'verified',
              isChain: false,
            });
          }
        } catch(e) {
          console.warn('chain-detect failed:', e.message);
        }
      }
    }

    return { nodes: Array.from(nodeMap.values()), edges, root_id: currentUser.id };
  };

  // ── Draw ──────────────────────────────────────────────────
  const drawNetwork = ({ nodes, edges, root_id }) => {
    if (!svgRef.current || !nodes.length) return;
    d3.select(svgRef.current).selectAll('*').remove();

    // ── Assign horizontal positions ───────────────────────
    // Group by generation
    const genGroups = new Map();
    nodes.forEach(n => {
      if (!genGroups.has(n.gen)) genGroups.set(n.gen, []);
      genGroups.get(n.gen).push(n);
    });

    const allGens = [...genGroups.keys()].sort((a,b) => a - b);

    // For each gen, spread nodes horizontally
    // Root is at horizIdx=0, gen 0 nodes spread around it
    genGroups.forEach((group, gen) => {
      const count = group.length;
      group.forEach((node, idx) => {
        node.horizIdx = idx - Math.floor(count / 2);
      });
    });

    // Calculate pixel positions
    // Y: gen 0 at center, negative gens above, positive below
    // But flip so most negative gen (oldest) is at TOP
    const minGen = allGens[0];
    const maxGen = allGens[allGens.length - 1];
    const numRows = maxGen - minGen + 1;

    // Max nodes in any gen row
    const maxNodesPerRow = Math.max(...[...genGroups.values()].map(g => g.length));
    const svgW = Math.max(maxNodesPerRow * (NODE_W + H_GAP) + 200, 700);
    const svgH = numRows * (NODE_H + V_GAP) + 120;
    const centerX = svgW / 2;
    const PAD_TOP = 60;

    const posMap = new Map();
    nodes.forEach(n => {
      const rowIdx = n.gen - minGen; // 0 = oldest (top)
      const x = centerX + n.horizIdx * (NODE_W + H_GAP) - NODE_W / 2;
      const y = PAD_TOP + rowIdx * (NODE_H + V_GAP);
      posMap.set(n.id, { x, y });
    });

    // ── SVG ────────────────────────────────────────────────
    const svg = d3.select(svgRef.current)
      .attr('width', svgW)
      .attr('height', Math.max(svgH, 300))
      .style('background', '#0f0c29');

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.2,2.5]).on('zoom', e => g.attr('transform',e.transform)));

    // Generation labels
    const GEN_LABEL = {
      '-3':'Past Gen 3','-2':'Past Gen 2','-1':'Past Gen 1',
      '0':'Current','1':'Next Gen 1','2':'Next Gen 2',
    };
    allGens.forEach(gen => {
      const rowIdx = gen - minGen;
      g.append('text')
        .attr('x', 8)
        .attr('y', PAD_TOP + rowIdx*(NODE_H+V_GAP) + NODE_H/2 + 4)
        .attr('font-size','10px').attr('fill','#475569').attr('font-weight','600')
        .text(GEN_LABEL[String(gen)] ?? `Gen ${gen}`);
    });

    // Arrow markers
    const defs = svg.append('defs');
    [
      { id:'av', color:'#6366F1' },
      { id:'ap', color:'#F59E0B' },
      { id:'ac', color:'#60A5FA' },
    ].forEach(({id,color}) => {
      defs.append('marker').attr('id',id)
        .attr('viewBox','0 -4 8 8').attr('refX',8).attr('refY',0)
        .attr('markerWidth',5).attr('markerHeight',5).attr('orient','auto')
        .append('path').attr('d','M0,-4L8,0L0,4').attr('fill',color);
    });

    // ── Draw edges ────────────────────────────────────────
    const edgesG = g.append('g');
    edges.forEach(e => {
      const sp = posMap.get(e.from), tp = posMap.get(e.to);
      if (!sp || !tp) return;

      const sx = sp.x + NODE_W/2, sy = sp.y + NODE_H/2;
      const tx = tp.x + NODE_W/2, ty = tp.y + NODE_H/2;
      const dx = tx-sx, dy = ty-sy;
      const dist = Math.sqrt(dx*dx+dy*dy)||1;
      const ux = dx/dist, uy = dy/dist;

      const startX = sx + ux*(NODE_W/2+2), startY = sy + uy*(NODE_H/2+2);
      const endX   = tx - ux*(NODE_W/2+12), endY = ty - uy*(NODE_H/2+12);

      // Straight line with slight curve
      const cpX = (startX+endX)/2 + uy*15;
      const cpY = (startY+endY)/2 - ux*15;

      const strokeColor = e.isChain ? '#60A5FA' : e.verified ? '#6366F1' : '#F59E0B';
      const markId = e.isChain ? 'ac' : e.verified ? 'av' : 'ap';

      edgesG.append('path')
        .attr('d',`M${startX},${startY} Q${cpX},${cpY} ${endX},${endY}`)
        .attr('fill','none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', e.verified || e.isChain ? 'none' : '5,3')
        .attr('marker-end',`url(#${markId})`);

      // Relation label
      const lx = (startX+cpX+endX)/3;
      const ly = (startY+cpY+endY)/3;
      const label = e.label || '';
      const ls = label.length>16 ? label.substring(0,16)+'…' : label;
      if (ls) {
        const lw = ls.length*6+14;
        edgesG.append('rect')
          .attr('x',lx-lw/2).attr('y',ly-10)
          .attr('width',lw).attr('height',16).attr('rx',5)
          .attr('fill','#0f0c29').attr('opacity',0.92);
        edgesG.append('text')
          .attr('x',lx).attr('y',ly+2)
          .attr('text-anchor','middle').attr('font-size','9px')
          .attr('font-weight','700').attr('fill',strokeColor)
          .text(ls);
      }
    });

    // ── Draw nodes ────────────────────────────────────────
    const nodesG = g.append('g');
    nodes.forEach(node => {
      const pos = posMap.get(node.id);
      if (!pos) return;

      const isRoot = node.id === root_id;
      const color = isRoot ? COLORS.root
        : node.isChain ? COLORS.chain
        : COLORS.blood;

      const ng = nodesG.append('g').attr('transform',`translate(${pos.x},${pos.y})`);

      // Node rect
      ng.append('rect')
        .attr('width', NODE_W).attr('height', NODE_H).attr('rx', 8)
        .attr('fill', color.fill)
        .attr('stroke', color.stroke)
        .attr('stroke-width', isRoot ? 3 : 1.5);

      // Photo or initial
      if (node.profile_photo) {
        const clipId = `cl${node.id.replace(/[^a-z0-9]/gi,'')}`;
        svg.select('defs').append('clipPath').attr('id', clipId)
          .append('circle').attr('cx', NODE_W/2).attr('cy', 20).attr('r', 14);
        ng.append('image')
          .attr('href', node.profile_photo)
          .attr('x', NODE_W/2-14).attr('y', 6)
          .attr('width', 28).attr('height', 28)
          .attr('clip-path', `url(#${clipId})`);
      } else {
        ng.append('circle')
          .attr('cx', NODE_W/2).attr('cy', 20).attr('r', 14)
          .attr('fill', color.stroke).attr('opacity', 0.2);
        ng.append('text')
          .attr('x', NODE_W/2).attr('y', 25)
          .attr('text-anchor','middle').attr('font-size','13px')
          .attr('font-weight','700').attr('fill', color.text)
          .text((node.name||'?')[0].toUpperCase());
      }

      // Name
      const nameShort = (node.name||'').length > 14
        ? node.name.substring(0,14)+'…' : node.name;
      ng.append('text')
        .attr('x', NODE_W/2).attr('y', 44)
        .attr('text-anchor','middle').attr('font-size','11px')
        .attr('font-weight','600').attr('fill', color.text)
        .text(nameShort);

      // YOU label
      if (isRoot) {
        ng.append('text')
          .attr('x', NODE_W/2).attr('y', 56)
          .attr('text-anchor','middle').attr('font-size','8px')
          .attr('fill','#A78BFA').text('(நீங்கள்)');
      }

      // Chain indicator
      if (node.isChain) {
        ng.append('text')
          .attr('x', NODE_W/2).attr('y', 56)
          .attr('text-anchor','middle').attr('font-size','7px')
          .attr('fill','#60A5FA').text('(வழி)');
      }

      // Verified dot (non-chain non-root nodes)
      if (!isRoot && !node.isChain) {
        ng.append('circle')
          .attr('cx', NODE_W-6).attr('cy', 6).attr('r', 5)
          .attr('fill','#22C55E');
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
    <Box w="100%" overflowX="auto" overflowY="auto" borderRadius="xl" minH="350px">
      <svg ref={svgRef} style={{ display:'block' }}/>
    </Box>
  );
}
