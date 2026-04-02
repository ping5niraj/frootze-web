import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import api from '../services/api';

// ── Constants ─────────────────────────────────────────────
const NODE_W  = 120;
const NODE_H  = 68;
const H_GAP   = 50;
const V_GAP   = 90;
const COL_GAP = 60;
const PAD     = { top: 60, left: 100, right: 60, bottom: 60 };

// ── Direct relations (no chain needed) ───────────────────
const DIRECT_TYPES = new Set([
  'father','mother','brother','sister','son','daughter','spouse',
  'grandfather_paternal','grandmother_paternal',
  'grandfather_maternal','grandmother_maternal',
  'grandson','granddaughter',
]);

// ── Column assignment ─────────────────────────────────────
const BLOOD_TYPES = new Set([
  'father','mother','brother','sister','son','daughter',
  'grandfather_paternal','grandmother_paternal',
  'grandfather_maternal','grandmother_maternal',
  'great_grandfather','great_grandmother',
  'grandson','granddaughter',
  'nephew','niece','uncle_paternal','aunt_paternal',
  'uncle_maternal','aunt_maternal','cousin',
]);
const WIFE_TYPES = new Set([
  'father_in_law','mother_in_law','brother_in_law','sister_in_law',
  'son_in_law','daughter_in_law','aunt_by_marriage','uncle_by_marriage',
  'nephew_by_marriage','niece_by_marriage','stepson','stepdaughter',
]);

// ── Generation delta ──────────────────────────────────────
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
const CHAIN   = { fill:'#1E3A5F', stroke:'#60A5FA', text:'#BFDBFE' }; // chain intermediate

const GEN_LABELS = {
  '-3':'Past Gen 3','-2':'Past Gen 2','-1':'Past Gen 1',
  '0':'Current','1':'Next Gen 1','2':'Next Gen 2',
};

export default function FamilyNetwork({ currentUser }) {
  const svgRef = useRef(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [netData, setNetData]   = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    setLoading(true);
    buildNetworkData().then(data => {
      setLoading(false);
      setNetData(data);
    }).catch(err => {
      setLoading(false);
      console.error('[FamilyNetwork] error:', err);
      setError('Failed to load network');
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!netData || !svgRef.current) return;
    drawNetwork(netData);
  }, [netData]);

  // ── Build network data ───────────────────────────────────
  const buildNetworkData = async () => {
    // Step 1: Get my direct relationships
    const myRels = await api.get('/api/relationships/mine');
    const myRelationships = myRels.data.my_relationships || [];

    // Node map: id → node object
    const nodeMap = new Map();
    // Edge array
    const edges = [];

    // Add self node
    nodeMap.set(currentUser.id, {
      id: currentUser.id,
      name: currentUser.name,
      kutham: currentUser.kutham,
      profile_photo: currentUser.profile_photo,
      is_offline: false,
      is_root: true,
      is_chain: false,
      gen: 0,
      col: 'center',
    });

    // Step 2: Process each relationship
    for (const rel of myRelationships) {
      const relType = rel.relation_type;
      const person  = rel.to_user;
      if (!person) continue;

      const isDirectType = DIRECT_TYPES.has(relType);

      if (isDirectType) {
        // Simple direct relation — add node + edge
        const gen = GEN_DELTA[relType] ?? 0;
        const col = BLOOD_TYPES.has(relType) ? 'blood'
                  : WIFE_TYPES.has(relType)  ? 'wife'
                  : relType === 'spouse'      ? 'center'
                  : 'blood';

        if (!nodeMap.has(person.id)) {
          nodeMap.set(person.id, {
            id: person.id,
            name: person.name,
            kutham: person.kutham,
            profile_photo: person.profile_photo,
            is_offline: false,
            is_root: false,
            is_chain: false,
            gen,
            col,
          });
        }
        edges.push({
          from: currentUser.id,
          to: person.id,
          relation_type: relType,
          relation_tamil: rel.relation_tamil,
          verified: rel.verification_status === 'verified',
          is_chain: false,
        });

      } else {
        // Extended/derived relation — call chain-detect
        const phone = person.phone;
        if (!phone) continue;

        try {
          const chainRes = await api.get(
            `/api/relationships/chain-detect?to_phone=${phone.replace(/\D/g,'')}`
          );
          const chainData = chainRes.data;

          if (chainData.chain && chainData.chain.length > 1) {
            // Add all chain nodes with correct gen/col
            let prevGen = 0;
            let prevCol = 'center';

            for (let i = 0; i < chainData.chain.length; i++) {
              const chainNode = chainData.chain[i];
              const nodeId = chainNode.user.id;
              if (!nodeId || nodeId === currentUser.id) continue;

              // Determine gen from the relation leading to this node
              const relToThis = i > 0 ? chainData.chain[i-1].relation_to_next : null;
              const delta = GEN_DELTA[relToThis] ?? 0;
              const thisGen = i === 0 ? 0 : prevGen + delta;
              const thisCol = i === 0 ? 'center'
                : BLOOD_TYPES.has(relToThis) ? prevCol === 'center' ? 'blood' : prevCol
                : WIFE_TYPES.has(relToThis)  ? 'wife'
                : relToThis === 'spouse'      ? prevCol
                : prevCol;

              if (!nodeMap.has(nodeId)) {
                nodeMap.set(nodeId, {
                  id: nodeId,
                  name: chainNode.user.name,
                  kutham: null,
                  profile_photo: null,
                  is_offline: false,
                  is_root: false,
                  is_chain: i < chainData.chain.length - 1, // intermediates are chain nodes
                  gen: thisGen,
                  col: thisCol,
                });
              }

              prevGen = thisGen;
              prevCol = thisCol;

              // Add edge from previous chain node to this one
              const fromId = i === 0 ? currentUser.id : chainData.chain[i-1].user.id;
              const edgeRel = i > 0 ? chainData.chain[i-1].relation_to_next : relType;
              const edgeTamil = i > 0 ? chainData.chain[i-1].rel_tamil : rel.relation_tamil;

              if (fromId && nodeId && fromId !== nodeId) {
                const exists = edges.find(e => e.from === fromId && e.to === nodeId);
                if (!exists) {
                  edges.push({
                    from: fromId,
                    to: nodeId,
                    relation_type: edgeRel,
                    relation_tamil: edgeTamil,
                    verified: chainNode.connected,
                    is_chain: i < chainData.chain.length - 1,
                  });
                }
              }
            }
          } else {
            // No chain found — show as direct with unknown path
            const gen = GEN_DELTA[relType] ?? 0;
            const col = WIFE_TYPES.has(relType) ? 'wife' : 'blood';
            if (!nodeMap.has(person.id)) {
              nodeMap.set(person.id, {
                id: person.id, name: person.name,
                kutham: person.kutham, profile_photo: person.profile_photo,
                is_offline: false, is_root: false, is_chain: false,
                gen, col,
              });
            }
            edges.push({
              from: currentUser.id, to: person.id,
              relation_type: relType, relation_tamil: rel.relation_tamil,
              verified: rel.verification_status === 'verified',
              is_chain: false,
            });
          }
        } catch (e) {
          console.warn('[FamilyNetwork] chain-detect failed for', phone, e.message);
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
      root_id: currentUser.id,
    };
  };

  // ── Draw network ─────────────────────────────────────────
  const drawNetwork = (data) => {
    const { nodes, edges, root_id } = data;
    if (!svgRef.current || !nodes?.length) return;
    d3.select(svgRef.current).selectAll('*').remove();

    // Kutham map
    const kuthamMap = new Map();
    let kidx = 0;
    nodes.forEach(n => {
      if (n.kutham && !kuthamMap.has(n.kutham)) kuthamMap.set(n.kutham, kidx++);
    });

    // Group by col + gen
    const groups = {};
    nodes.forEach(n => {
      const key = `${n.col}_${n.gen}`;
      if (!groups[key]) groups[key] = [];
      if (!groups[key].find(x => x.id === n.id)) groups[key].push(n);
    });

    const allGens = [...new Set(nodes.map(n => n.gen))].sort((a,b) => a - b);
    const maxBlood  = Math.max(...allGens.map(g=>(groups[`blood_${g}`]||[]).length),  1);
    const maxCenter = Math.max(...allGens.map(g=>(groups[`center_${g}`]||[]).length), 1);
    const maxWife   = Math.max(...allGens.map(g=>(groups[`wife_${g}`]||[]).length),   1);

    const bloodColW  = maxBlood  * (NODE_W + H_GAP);
    const centerColW = maxCenter * (NODE_W + H_GAP);
    const wifeColW   = maxWife   * (NODE_W + H_GAP);

    const bloodX  = PAD.left;
    const centerX = bloodX  + bloodColW  + COL_GAP;
    const wifeX   = centerX + centerColW + COL_GAP;
    const totalW  = wifeX + wifeColW + PAD.right;
    const totalH  = allGens.length * (NODE_H + V_GAP) + PAD.top + PAD.bottom;

    // Assign x/y positions
    const posMap = new Map();
    const placeGroup = (col, colX, colW) => {
      nodes.filter(n => n.col === col).forEach(n => {
        const rowIdx = allGens.indexOf(n.gen);
        const group  = (groups[`${col}_${n.gen}`] || []);
        const idx    = group.findIndex(x => x.id === n.id);
        const groupW = group.length * NODE_W + (group.length-1) * H_GAP;
        const startX = colX + (colW - groupW) / 2;
        const y      = PAD.top + rowIdx * (NODE_H + V_GAP);
        posMap.set(n.id, { x: startX + idx * (NODE_W + H_GAP), y });
      });
    };
    placeGroup('blood',  bloodX,  bloodColW);
    placeGroup('center', centerX, centerColW);
    placeGroup('wife',   wifeX,   wifeColW);

    // SVG
    const svg = d3.select(svgRef.current)
      .attr('width',  Math.max(totalW, 700))
      .attr('height', Math.max(totalH, 300))
      .style('background', '#0f0c29');

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.2,2.5]).on('zoom', e => g.attr('transform', e.transform)));

    // Column headers
    [
      { x: bloodX+bloodColW/2,   label:'← My Blood Relations', color:'#818CF8' },
      { x: centerX+centerColW/2, label:'Direct Line',          color:'#A78BFA' },
      { x: wifeX+wifeColW/2,     label:"Wife's Relations →",   color:'#FCD34D' },
    ].forEach(({x,label,color}) => {
      g.append('text').attr('x',x).attr('y',PAD.top-32)
        .attr('text-anchor','middle').attr('font-size','11px')
        .attr('font-weight','700').attr('fill',color).text(label);
    });

    // Separators
    [centerX-COL_GAP/2, wifeX-COL_GAP/2].forEach(lx => {
      g.append('line').attr('x1',lx).attr('y1',PAD.top-42)
        .attr('x2',lx).attr('y2',totalH-PAD.bottom)
        .attr('stroke','#334155').attr('stroke-width',1).attr('stroke-dasharray','4,4');
    });

    // Gen labels
    allGens.forEach((gen, rowIdx) => {
      g.append('text').attr('x',8).attr('y', PAD.top + rowIdx*(NODE_H+V_GAP) + NODE_H/2+4)
        .attr('font-size','10px').attr('fill','#475569').attr('font-weight','600')
        .text(GEN_LABELS[gen] ?? `Gen ${gen}`);
    });

    // Arrow markers
    const defs = svg.append('defs');
    [
      { id:'arr-v',  color:'#7C3AED' },
      { id:'arr-p',  color:'#F59E0B' },
      { id:'arr-c',  color:'#60A5FA' },
    ].forEach(({id,color}) => {
      defs.append('marker').attr('id',id)
        .attr('viewBox','0 -4 8 8').attr('refX',8).attr('refY',0)
        .attr('markerWidth',5).attr('markerHeight',5).attr('orient','auto')
        .append('path').attr('d','M0,-4L8,0L0,4').attr('fill',color);
    });

    // Draw edges
    const edgesG = g.append('g');
    edges.forEach(e => {
      const sp = posMap.get(e.from), tp = posMap.get(e.to);
      if (!sp || !tp) return;

      const sx=sp.x+NODE_W/2, sy=sp.y+NODE_H/2;
      const tx=tp.x+NODE_W/2, ty=tp.y+NODE_H/2;
      const dx=tx-sx, dy=ty-sy;
      const dist=Math.sqrt(dx*dx+dy*dy)||1;
      const ux=dx/dist, uy=dy/dist;
      const startX=sx+ux*(NODE_W/2+2), startY=sy+uy*(NODE_H/2+2);
      const endX=tx-ux*(NODE_W/2+12), endY=ty-uy*(NODE_H/2+12);
      const mx=(startX+endX)/2+uy*20, my=(startY+endY)/2-ux*20;

      const color = e.is_chain ? '#60A5FA' : e.verified ? '#7C3AED' : '#F59E0B';
      const markerId = e.is_chain ? 'arr-c' : e.verified ? 'arr-v' : 'arr-p';

      edgesG.append('path')
        .attr('d',`M${startX},${startY} Q${mx},${my} ${endX},${endY}`)
        .attr('fill','none').attr('stroke',color)
        .attr('stroke-width', e.is_chain ? 1.2 : 1.8)
        .attr('stroke-dasharray', e.is_chain ? '4,3' : e.verified ? 'none' : '5,3')
        .attr('marker-end',`url(#${markerId})`);

      // Label
      const lx=(startX+mx+endX)/3, ly=(startY+my+endY)/3;
      const label=(e.relation_tamil||'');
      const ls=label.length>14?label.substring(0,14)+'…':label;
      if (ls) {
        const lw=ls.length*5.5+12;
        edgesG.append('rect').attr('x',lx-lw/2).attr('y',ly-9)
          .attr('width',lw).attr('height',14).attr('rx',5)
          .attr('fill','#0f0c29').attr('opacity',0.9);
        edgesG.append('text').attr('x',lx).attr('y',ly+1)
          .attr('text-anchor','middle').attr('font-size','8px')
          .attr('font-weight','700').attr('fill',color).text(ls);
      }
    });

    // Draw nodes
    const nodesG = g.append('g');
    nodes.forEach(node => {
      const pos = posMap.get(node.id);
      if (!pos) return;
      const isRoot = node.id === root_id;

      let color;
      if (isRoot)          color = ROOT;
      else if (node.is_offline) color = OFFLINE;
      else if (node.is_chain)   color = CHAIN;
      else if (node.kutham) {
        const idx = kuthamMap.get(node.kutham);
        color = PALETTE[idx % PALETTE.length];
      } else color = UNKNOWN;

      const ng = nodesG.append('g').attr('transform',`translate(${pos.x},${pos.y})`);

      ng.append('rect').attr('width',NODE_W).attr('height',NODE_H).attr('rx',10)
        .attr('fill',color.fill).attr('stroke',color.stroke)
        .attr('stroke-width',isRoot?3:node.is_chain?1:1.5)
        .attr('stroke-dasharray',node.is_offline?'5,3':'none');

      // Photo or initial
      if (node.profile_photo) {
        const clipId=`clip-${node.id.replace(/[^a-z0-9]/gi,'')}`;
        svg.select('defs').append('clipPath').attr('id',clipId)
          .append('circle').attr('cx',NODE_W/2).attr('cy',22).attr('r',16);
        ng.append('image').attr('href',node.profile_photo)
          .attr('x',NODE_W/2-16).attr('y',6).attr('width',32).attr('height',32)
          .attr('clip-path',`url(#${clipId})`);
      } else {
        ng.append('circle').attr('cx',NODE_W/2).attr('cy',22).attr('r',16)
          .attr('fill',color.stroke).attr('opacity',0.2);
        ng.append('text').attr('x',NODE_W/2).attr('y',27)
          .attr('text-anchor','middle').attr('font-size','14px')
          .attr('font-weight','700').attr('fill',color.text)
          .text((node.name||'?')[0].toUpperCase());
      }

      // Name
      const nameShort=(node.name||'').length>13?node.name.substring(0,13)+'…':node.name;
      ng.append('text').attr('x',NODE_W/2).attr('y',48)
        .attr('text-anchor','middle').attr('font-size','11px')
        .attr('font-weight','700').attr('fill',color.text).text(nameShort);

      // Sub label
      if (isRoot) {
        ng.append('text').attr('x',NODE_W/2).attr('y',61)
          .attr('text-anchor','middle').attr('font-size','8px')
          .attr('fill','#A78BFA').text('(நீங்கள்)');
      } else if (node.kutham && !node.is_chain) {
        const kt=node.kutham.length>15?node.kutham.substring(0,15)+'…':node.kutham;
        ng.append('text').attr('x',NODE_W/2).attr('y',61)
          .attr('text-anchor','middle').attr('font-size','7px')
          .attr('fill',color.stroke).text(kt);
      } else if (node.is_chain) {
        ng.append('text').attr('x',NODE_W/2).attr('y',61)
          .attr('text-anchor','middle').attr('font-size','7px')
          .attr('fill','#60A5FA').text('(தொடர்பு வழி)');
      }

      // Verified dot
      if (!node.is_offline && !node.is_chain) {
        const isVerified = edges.some(e=>(e.from===node.id||e.to===node.id)&&e.verified&&!e.is_chain);
        ng.append('circle').attr('cx',NODE_W-7).attr('cy',7).attr('r',5)
          .attr('fill',isVerified?'#22C55E':'#F59E0B');
      }

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
