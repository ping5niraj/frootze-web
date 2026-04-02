import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import api from '../services/api';

// ── Constants ─────────────────────────────────────────────
const NODE_W  = 120;
const NODE_H  = 68;
const H_GAP   = 50;
const V_GAP   = 90;
const COL_GAP = 60;  // gap between the 3 columns
const PAD     = { top: 60, left: 100, right: 60, bottom: 60 };

// ── Which column each relation belongs to ─────────────────
const BLOOD_TYPES = new Set([
  'father','mother','brother','sister','son','daughter',
  'grandfather_paternal','grandmother_paternal',
  'grandfather_maternal','grandmother_maternal',
  'great_grandfather','great_grandmother',
  'grandson','granddaughter',
  'nephew','niece',
  'uncle_paternal','aunt_paternal',
  'uncle_maternal','aunt_maternal',
  'cousin',
]);
const WIFE_TYPES = new Set([
  'father_in_law','mother_in_law',
  'brother_in_law','sister_in_law',
  'son_in_law','daughter_in_law',
  'aunt_by_marriage','uncle_by_marriage',
  'nephew_by_marriage','niece_by_marriage',
  'stepson','stepdaughter',
]);
// spouse → center column (same as self)

// ── Generation delta ──────────────────────────────────────
const GEN_DELTA = {
  great_grandfather:-3, great_grandmother:-3,
  grandfather_paternal:-2, grandmother_paternal:-2,
  grandfather_maternal:-2, grandmother_maternal:-2,
  father:-1, mother:-1,
  father_in_law:-1, mother_in_law:-1,
  uncle_paternal:-1, aunt_paternal:-1,
  uncle_maternal:-1, aunt_maternal:-1,
  brother:0, sister:0, spouse:0,
  brother_in_law:0, sister_in_law:0,
  aunt_by_marriage:0, uncle_by_marriage:0, cousin:0,
  son:1, daughter:1,
  nephew:1, niece:1,
  son_in_law:1, daughter_in_law:1,
  nephew_by_marriage:1, niece_by_marriage:1,
  stepson:1, stepdaughter:1,
  grandson:2, granddaughter:2,
};

// ── Kutham colors ─────────────────────────────────────────
const PALETTE = [
  { fill:'#3B1F6E', stroke:'#7C3AED', text:'#DDD6FE' },
  { fill:'#6B2D0D', stroke:'#F59E0B', text:'#FDE68A' },
  { fill:'#0F2D50', stroke:'#3B82F6', text:'#BFDBFE' },
  { fill:'#0A3220', stroke:'#22C55E', text:'#BBF7D0' },
  { fill:'#4C0519', stroke:'#F43F5E', text:'#FECDD3' },
  { fill:'#0C3549', stroke:'#0EA5E9', text:'#BAE6FD' },
  { fill:'#2D0B55', stroke:'#A855F7', text:'#E9D5FF' },
  { fill:'#3D1A00', stroke:'#EAB308', text:'#FEF9C3' },
];
const UNKNOWN = { fill:'#1F2937', stroke:'#6B7280', text:'#9CA3AF' };
const ROOT    = { fill:'#5B21B6', stroke:'#7C3AED', text:'#FFFFFF' };
const OFFLINE = { fill:'#374151', stroke:'#6B7280', text:'#9CA3AF' };

const GEN_LABELS = {
  '-3':'Past Gen 3','-2':'Past Gen 2','-1':'Past Gen 1',
  '0':'Current','1':'Next Gen 1','2':'Next Gen 2',
};

export default function FamilyNetwork({ currentUser }) {
  const svgRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [netData, setNetData] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    api.get(`/api/relationships/network/${currentUser.id}`)
      .then(res => {
        setLoading(false);
        if (res.data?.nodes) setNetData(res.data);
        else setError('No data returned');
      })
      .catch(() => { setLoading(false); setError('Failed to load network'); });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!netData || !svgRef.current) return;
    drawNetwork(netData);
  }, [netData]);

  const drawNetwork = (data) => {
    const { nodes, edges: rawEdges, root_id } = data;
    if (!svgRef.current || !nodes?.length) return;
    d3.select(svgRef.current).selectAll('*').remove();

    // ── Dedup edges (remove A↔B duplicates) ─────────────
    const pairSeen = new Set();
    const edges = rawEdges.filter(e => {
      const key = [e.from, e.to].sort().join('|');
      if (pairSeen.has(key)) return false;
      pairSeen.add(key);
      return true;
    });

    // ── Kutham map ────────────────────────────────────────
    const kuthamMap = new Map();
    let kidx = 0;
    nodes.forEach(n => {
      if (n.kutham && !kuthamMap.has(n.kutham)) kuthamMap.set(n.kutham, kidx++);
    });

    // ── Assign column and generation via BFS from root ───
    const colMap = new Map();  // id → 'blood'|'center'|'wife'
    const genMap = new Map();  // id → generation number (root=0)
    colMap.set(root_id, 'center');
    genMap.set(root_id, 0);

    // Build adjacency from edges
    const adjOut = new Map();
    edges.forEach(e => {
      if (!adjOut.has(e.from)) adjOut.set(e.from, []);
      adjOut.get(e.from).push(e);
    });

    const bfsQ = [root_id];
    const bfsV = new Set([root_id]);
    while (bfsQ.length) {
      const uid = bfsQ.shift();
      const parentGen = genMap.get(uid) ?? 0;
      const parentCol = colMap.get(uid) ?? 'center';

      (adjOut.get(uid) || []).forEach(e => {
        const tid = e.to;
        if (!bfsV.has(tid)) {
          bfsV.add(tid);
          bfsQ.push(tid);
          // Gen
          const delta = GEN_DELTA[e.relation_type] ?? 0;
          genMap.set(tid, parentGen + delta);
          // Column — inherit from parent, or use relation type
          if (parentCol === 'center') {
            if (BLOOD_TYPES.has(e.relation_type))     colMap.set(tid, 'blood');
            else if (WIFE_TYPES.has(e.relation_type)) colMap.set(tid, 'wife');
            else if (e.relation_type === 'spouse')    colMap.set(tid, 'center');
            else colMap.set(tid, 'blood'); // default
          } else {
            colMap.set(tid, parentCol); // inherit parent column
          }
        }
      });
    }
    // Defaults for unvisited
    nodes.forEach(n => {
      if (!genMap.has(n.id)) genMap.set(n.id, 0);
      if (!colMap.has(n.id)) colMap.set(n.id, 'blood');
    });

    // ── Group by col + gen ────────────────────────────────
    const groups = {}; // key=`${col}_${gen}` → [nodes]
    nodes.forEach(n => {
      const col = colMap.get(n.id) ?? 'blood';
      const gen = genMap.get(n.id) ?? 0;
      const key = `${col}_${gen}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    // Unique gens per column
    const bloodGens  = [...new Set(nodes.filter(n=>colMap.get(n.id)==='blood' ).map(n=>genMap.get(n.id)))].sort((a,b)=>a-b);
    const centerGens = [...new Set(nodes.filter(n=>colMap.get(n.id)==='center').map(n=>genMap.get(n.id)))].sort((a,b)=>a-b);
    const wifeGens   = [...new Set(nodes.filter(n=>colMap.get(n.id)==='wife'  ).map(n=>genMap.get(n.id)))].sort((a,b)=>a-b);
    const allGens    = [...new Set([...bloodGens,...centerGens,...wifeGens])].sort((a,b)=>a-b);

    // Max nodes per column (for width calculation)
    const maxBlood  = Math.max(...bloodGens.map(g=>(groups[`blood_${g}`]||[]).length),  1);
    const maxCenter = Math.max(...centerGens.map(g=>(groups[`center_${g}`]||[]).length), 1);
    const maxWife   = Math.max(...wifeGens.map(g=>(groups[`wife_${g}`]||[]).length),   1);

    const bloodColW  = maxBlood  * (NODE_W + H_GAP);
    const centerColW = maxCenter * (NODE_W + H_GAP);
    const wifeColW   = maxWife   * (NODE_W + H_GAP);

    // Column x origins
    const bloodX  = PAD.left;
    const centerX = bloodX  + bloodColW  + COL_GAP;
    const wifeX   = centerX + centerColW + COL_GAP;

    const totalW  = wifeX + wifeColW + PAD.right;
    const totalH  = allGens.length * (NODE_H + V_GAP) + PAD.top + PAD.bottom;

    // ── Assign positions ──────────────────────────────────
    const posMap = new Map();

    const placeGroup = (col, colX, colW) => {
      const gens = [...new Set(nodes.filter(n=>colMap.get(n.id)===col).map(n=>genMap.get(n.id)))].sort((a,b)=>a-b);
      gens.forEach(gen => {
        const group = groups[`${col}_${gen}`] || [];
        const rowIdx = allGens.indexOf(gen);
        const y = PAD.top + rowIdx * (NODE_H + V_GAP);
        const groupW = group.length * NODE_W + (group.length-1) * H_GAP;
        const startX = colX + (colW - groupW) / 2;
        group.forEach((node, idx) => {
          posMap.set(node.id, { x: startX + idx * (NODE_W + H_GAP), y });
        });
      });
    };

    placeGroup('blood',  bloodX,  bloodColW);
    placeGroup('center', centerX, centerColW);
    placeGroup('wife',   wifeX,   wifeColW);

    // ── SVG setup ─────────────────────────────────────────
    const svg = d3.select(svgRef.current)
      .attr('width',  Math.max(totalW, 500))
      .attr('height', Math.max(totalH, 300))
      .style('background', '#0f0c29');

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.2, 2.5]).on('zoom', e => g.attr('transform', e.transform)));

    // ── Column header labels ──────────────────────────────
    const headerY = PAD.top - 30;
    [
      { x: bloodX  + bloodColW/2,  label:'← My Blood Relations', color:'#818CF8' },
      { x: centerX + centerColW/2, label:'Direct Line',          color:'#A78BFA' },
      { x: wifeX   + wifeColW/2,   label:"Wife's Relations →",   color:'#FCD34D' },
    ].forEach(({x,label,color}) => {
      g.append('text').attr('x',x).attr('y',headerY)
        .attr('text-anchor','middle').attr('font-size','11px')
        .attr('font-weight','700').attr('fill',color).text(label);
    });

    // Column separator lines
    [centerX - COL_GAP/2, wifeX - COL_GAP/2].forEach(lx => {
      g.append('line')
        .attr('x1',lx).attr('y1',PAD.top-40).attr('x2',lx).attr('y2',totalH-PAD.bottom)
        .attr('stroke','#334155').attr('stroke-width',1).attr('stroke-dasharray','4,4');
    });

    // Generation labels (left margin)
    allGens.forEach((gen, rowIdx) => {
      const y = PAD.top + rowIdx * (NODE_H + V_GAP);
      g.append('text').attr('x',8).attr('y', y + NODE_H/2 + 4)
        .attr('font-size','10px').attr('fill','#475569').attr('font-weight','600')
        .text(GEN_LABELS[gen] ?? `Gen ${gen}`);
    });

    // ── Arrow markers ─────────────────────────────────────
    const defs = svg.append('defs');
    ['verified','pending'].forEach(type => {
      defs.append('marker').attr('id',`arr-${type}`)
        .attr('viewBox','0 -4 8 8').attr('refX',8).attr('refY',0)
        .attr('markerWidth',5).attr('markerHeight',5).attr('orient','auto')
        .append('path').attr('d','M0,-4L8,0L0,4')
        .attr('fill', type==='verified' ? '#7C3AED' : '#F59E0B');
    });

    // ── Draw edges ────────────────────────────────────────
    const edgesG = g.append('g');
    edges.forEach(e => {
      const sp = posMap.get(e.from);
      const tp = posMap.get(e.to);
      if (!sp || !tp) return;

      const sx = sp.x + NODE_W/2, sy = sp.y + NODE_H/2;
      const tx = tp.x + NODE_W/2, ty = tp.y + NODE_H/2;
      const dx = tx-sx, dy = ty-sy;
      const dist = Math.sqrt(dx*dx+dy*dy) || 1;
      const ux = dx/dist, uy = dy/dist;

      const startX = sx + ux*(NODE_W/2+2), startY = sy + uy*(NODE_H/2+2);
      const endX   = tx - ux*(NODE_W/2+12), endY = ty - uy*(NODE_H/2+12);
      const mx = (startX+endX)/2 + uy*20, my = (startY+endY)/2 - ux*20;

      const color = e.verified ? '#7C3AED' : '#F59E0B';
      edgesG.append('path')
        .attr('d',`M${startX},${startY} Q${mx},${my} ${endX},${endY}`)
        .attr('fill','none').attr('stroke',color).attr('stroke-width',1.8)
        .attr('stroke-dasharray', e.verified ? 'none' : '5,3')
        .attr('marker-end',`url(#arr-${e.verified?'verified':'pending'})`);

      // Label
      const lx=(startX+mx+endX)/3, ly=(startY+my+endY)/3;
      const label = e.relation_tamil||'';
      const ls = label.length>14 ? label.substring(0,14)+'…' : label;
      if (ls) {
        const lw = ls.length*5.5+12;
        edgesG.append('rect').attr('x',lx-lw/2).attr('y',ly-9)
          .attr('width',lw).attr('height',14).attr('rx',5)
          .attr('fill','#0f0c29').attr('opacity',0.9);
        edgesG.append('text').attr('x',lx).attr('y',ly+1)
          .attr('text-anchor','middle').attr('font-size','8px')
          .attr('font-weight','700').attr('fill',color).text(ls);
      }
    });

    // ── Draw nodes ────────────────────────────────────────
    const nodesG = g.append('g');
    nodes.forEach(node => {
      const pos = posMap.get(node.id);
      if (!pos) return;
      const isRoot = node.id === root_id;

      let color;
      if (isRoot) color = ROOT;
      else if (node.is_offline) color = OFFLINE;
      else if (node.kutham) {
        const idx = kuthamMap.get(node.kutham);
        color = PALETTE[idx % PALETTE.length];
      } else color = UNKNOWN;

      const ng = nodesG.append('g')
        .attr('transform',`translate(${pos.x},${pos.y})`);

      ng.append('rect').attr('width',NODE_W).attr('height',NODE_H).attr('rx',10)
        .attr('fill',color.fill).attr('stroke',color.stroke)
        .attr('stroke-width', isRoot?3:1.5)
        .attr('stroke-dasharray', node.is_offline?'5,3':'none');

      // Photo or initial circle
      if (node.profile_photo) {
        const clipId = `clip-${node.id.replace(/-/g,'')}`;
        svg.select('defs').append('clipPath').attr('id',clipId)
          .append('circle').attr('cx',NODE_W/2).attr('cy',22).attr('r',16);
        ng.append('image').attr('href',node.profile_photo)
          .attr('x',NODE_W/2-16).attr('y',6).attr('width',32).attr('height',32)
          .attr('clip-path',`url(#${clipId})`);
      } else {
        ng.append('circle').attr('cx',NODE_W/2).attr('cy',22).attr('r',16)
          .attr('fill',color.stroke).attr('opacity',0.25);
        ng.append('text').attr('x',NODE_W/2).attr('y',27)
          .attr('text-anchor','middle').attr('font-size','13px')
          .attr('font-weight','700').attr('fill',color.text)
          .text((node.name||'?')[0].toUpperCase());
      }

      // Name
      const nameShort = (node.name||'').length>13 ? node.name.substring(0,13)+'…' : node.name;
      ng.append('text').attr('x',NODE_W/2).attr('y',48)
        .attr('text-anchor','middle').attr('font-size','11px')
        .attr('font-weight','700').attr('fill',color.text).text(nameShort);

      // Kutham
      if (!isRoot && node.kutham) {
        const kt = node.kutham.length>15 ? node.kutham.substring(0,15)+'…' : node.kutham;
        ng.append('text').attr('x',NODE_W/2).attr('y',61)
          .attr('text-anchor','middle').attr('font-size','7px')
          .attr('fill',color.stroke).text(kt);
      }
      if (isRoot) {
        ng.append('text').attr('x',NODE_W/2).attr('y',61)
          .attr('text-anchor','middle').attr('font-size','8px')
          .attr('fill','#A78BFA').text('(நீங்கள்)');
      }

      // Verified dot
      if (!node.is_offline) {
        const isVerified = edges.some(e=>(e.from===node.id||e.to===node.id)&&e.verified);
        ng.append('circle').attr('cx',NODE_W-7).attr('cy',7).attr('r',5)
          .attr('fill', isVerified?'#22C55E':'#F59E0B');
      }

      // Deceased icon
      if (node.is_offline) {
        ng.append('text').attr('x',6).attr('y',14).attr('font-size','10px').text('🕊️');
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
