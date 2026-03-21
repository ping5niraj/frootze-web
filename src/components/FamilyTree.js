import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { preloadPhotos } from '../utils/imageLoader';

const C = {
  bloodFill:    '#EDE9FE',
  bloodStroke:  '#7C3AED',
  bloodText:    '#5B21B6',
  derivedFill:  '#FFF7ED',
  derivedStroke:'#F59E0B',
  derivedText:  '#92400E',
  youFill:      '#7C3AED',
  youStroke:    '#5B21B6',
  spouseFill:   '#FFF7ED',
  spouseStroke: '#F59E0B',
  verified:     '#10B981',
  pending:      '#F59E0B',
  lineCenter:   '#7C3AED',
  lineBlood:    '#A78BFA',
  lineDerived:  '#FCD34D',
  linePending:  '#D1D5DB',
};

// Kutham color palette — each unique kutham gets a color pair
const KUTHAM_PALETTE = [
  { fill: '#EDE9FE', stroke: '#7C3AED', text: '#5B21B6' }, // purple — default/self
  { fill: '#FFF7ED', stroke: '#F59E0B', text: '#92400E' }, // amber — wife side
  { fill: '#EFF6FF', stroke: '#3B82F6', text: '#1D4ED8' }, // blue
  { fill: '#F0FDF4', stroke: '#22C55E', text: '#15803D' }, // green
  { fill: '#FFF1F2', stroke: '#F43F5E', text: '#BE123C' }, // rose
  { fill: '#F0F9FF', stroke: '#0EA5E9', text: '#0369A1' }, // sky
  { fill: '#FDF4FF', stroke: '#A855F7', text: '#7E22CE' }, // violet
  { fill: '#FFFBEB', stroke: '#EAB308', text: '#854D0E' }, // yellow
];

function getKuthamColor(kutham, kuthamMap) {
  if (!kutham) return KUTHAM_PALETTE[0];
  const idx = kuthamMap.get(kutham);
  return KUTHAM_PALETTE[idx % KUTHAM_PALETTE.length] || KUTHAM_PALETTE[0];
}

const NODE_W  = 82;
const NODE_H  = 90;
const GAP_X   = 16;
const ROW_H   = 130;
const PAD_TOP = 50;
const PAD_X   = 50;

const GENERATIONS = [
  { key: 'past-4',   label: 'Past Gen 4',   nameRight: 'Fourth Previous Generation',  color: '#F8F7FF' },
  { key: 'past-3',   label: 'Past Gen 3',   nameRight: 'Third Previous Generation',   color: '#F3F0FF' },
  { key: 'past-2',   label: 'Past Gen 2',   nameRight: 'Second Previous Generation',  color: '#EEEBFF' },
  { key: 'past-1',   label: 'Past Gen 1',   nameRight: 'First Previous Generation',   color: '#E9E4FF' },
  { key: 'current',  label: 'Current',      nameRight: 'Your Generation',             color: '#F5F3FF', isCurrent: true },
  { key: 'future-1', label: 'Future Gen 1', nameRight: 'First Next Generation',       color: '#F0FDF4' },
  { key: 'future-2', label: 'Future Gen 2', nameRight: 'Second Next Generation',      color: '#E8FDF1' },
];

const RELATION_META = {
  great_great_grandfather: { gen: 'past-4',   col: 'center', order: 0 },
  great_great_grandmother: { gen: 'past-4',   col: 'center', order: 1 },
  great_grandfather:       { gen: 'past-3',   col: 'center', order: 0 },
  great_grandmother:       { gen: 'past-3',   col: 'center', order: 1 },
  grandfather_paternal:    { gen: 'past-2',   col: 'center', order: 0 },
  grandmother_paternal:    { gen: 'past-2',   col: 'center', order: 1 },
  grandfather_maternal:    { gen: 'past-2',   col: 'center', order: 2 },
  grandmother_maternal:    { gen: 'past-2',   col: 'center', order: 3 },
  father:                  { gen: 'past-1',   col: 'center', order: 0 },
  mother:                  { gen: 'past-1',   col: 'center', order: 1 },
  spouse:                  { gen: 'current',  col: 'center', order: 0 },
  son:                     { gen: 'future-1', col: 'center', order: 0 },
  daughter:                { gen: 'future-1', col: 'center', order: 1 },
  grandson:                { gen: 'future-2', col: 'center', order: 0 },
  granddaughter:           { gen: 'future-2', col: 'center', order: 1 },
  uncle_elder:             { gen: 'past-1',   col: 'left',   order: 0 },
  uncle_younger:           { gen: 'past-1',   col: 'left',   order: 1 },
  aunt_paternal:           { gen: 'past-1',   col: 'left',   order: 2 },
  uncle_maternal:          { gen: 'past-1',   col: 'left',   order: 3 },
  aunt_maternal:           { gen: 'past-1',   col: 'left',   order: 4 },
  brother:                 { gen: 'current',  col: 'left',   order: null },
  sister:                  { gen: 'current',  col: 'left',   order: null },
  cousin_male:             { gen: 'current',  col: 'left',   order: 10 },
  cousin_female:           { gen: 'current',  col: 'left',   order: 11 },
  father_in_law:           { gen: 'past-1',   col: 'right',  order: 0 },
  mother_in_law:           { gen: 'past-1',   col: 'right',  order: 1 },
  brother_in_law:          { gen: 'current',  col: 'right',  order: 0 },
  sister_in_law:           { gen: 'current',  col: 'right',  order: 1 },
  co_brother:              { gen: 'current',  col: 'right',  order: 2 },
};

function drawNode(g, node, photoMap, kuthamMap) {
  const isYou     = node.isYou;
  const isSpouse  = node.relationType === 'spouse';
  const isRight   = node.col === 'right';
  const isOffline = node.isOffline === true;

  // Offline/deceased nodes get grey faded style
  // Online nodes: color by kutham if available
  const kuthamColor = (!isOffline && !isYou && node.kutham)
    ? getKuthamColor(node.kutham, kuthamMap)
    : null;

  // You node uses kutham color with white text + thick border
  const youKuthamColor = (isYou && node.kutham) ? getKuthamColor(node.kutham, kuthamMap) : null;

  const fill   = isOffline   ? '#E5E7EB'
               : isYou       ? (youKuthamColor ? youKuthamColor.stroke : C.youFill)
               : kuthamColor ? kuthamColor.fill
               : isSpouse    ? C.spouseFill
               : isRight     ? C.derivedFill
               : C.bloodFill;

  const stroke  = isOffline   ? '#9CA3AF'
                : isYou       ? (youKuthamColor ? youKuthamColor.stroke : C.youStroke)
                : kuthamColor ? kuthamColor.stroke
                : isSpouse    ? C.spouseStroke
                : isRight     ? C.derivedStroke
                : C.bloodStroke;

  const textColor = isOffline   ? '#6B7280'
                  : isYou       ? '#FFFFFF'
                  : kuthamColor ? kuthamColor.text
                  : isRight     ? C.derivedText
                  : C.bloodText;
  const opacity = isOffline ? 0.65 : 1;

  g.attr('opacity', opacity);

  g.append('rect').attr('x', 2).attr('y', 3)
    .attr('width', NODE_W).attr('height', NODE_H)
    .attr('rx', 12).attr('fill', 'rgba(0,0,0,0.07)');

  g.append('rect').attr('width', NODE_W).attr('height', NODE_H)
    .attr('rx', 12).attr('fill', fill)
    .attr('stroke', stroke).attr('stroke-width', isYou ? 2.5 : 1.5)
    .attr('stroke-dasharray', isOffline ? '4,3' : 'none');

  g.append('rect').attr('width', NODE_W).attr('height', 7)
    .attr('rx', 12).attr('fill', stroke).attr('opacity', 0.75);

  const photoSize = 36;
  const photoX = NODE_W / 2 - photoSize / 2;
  const photoY = 14;

  const base64Photo = !isOffline ? photoMap?.[node.id] : null;

  if (base64Photo) {
    const clipId = `clip-${(node.id || '').replace(/-/g, '').substring(0, 12)}`;
    g.append('defs').append('clipPath').attr('id', clipId)
      .append('circle')
      .attr('cx', photoX + photoSize / 2)
      .attr('cy', photoY + photoSize / 2)
      .attr('r', photoSize / 2);

    g.append('image')
      .attr('href', base64Photo)
      .attr('x', photoX).attr('y', photoY)
      .attr('width', photoSize).attr('height', photoSize)
      .attr('clip-path', `url(#${clipId})`);

    g.append('circle')
      .attr('cx', photoX + photoSize / 2)
      .attr('cy', photoY + photoSize / 2)
      .attr('r', photoSize / 2)
      .attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.5);
  } else {
    g.append('circle')
      .attr('cx', NODE_W / 2).attr('cy', photoY + photoSize / 2)
      .attr('r', photoSize / 2)
      .attr('fill', isOffline ? '#D1D5DB' : isYou ? '#5B21B6' : isRight ? '#FEF3C7' : '#DDD6FE');

    // Offline: show dove emoji, others: show initial
    g.append('text')
      .attr('x', NODE_W / 2).attr('y', photoY + photoSize / 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', isOffline ? '16px' : '14px').attr('font-weight', 'bold')
      .attr('fill', isOffline ? '#6B7280' : isYou ? 'white' : stroke)
      .text(isOffline ? '🕊️' : (node.name ? node.name.charAt(0).toUpperCase() : '?'));
  }

  g.append('text')
    .attr('x', NODE_W / 2).attr('y', photoY + photoSize + 14)
    .attr('text-anchor', 'middle')
    .attr('font-size', '8px').attr('font-weight', '700')
    .attr('fill', textColor)
    .text(node.tamil || '');

  const name = (node.name || '');
  const displayName = name.length > 9 ? name.substring(0, 9) + '…' : name;
  g.append('text')
    .attr('x', NODE_W / 2).attr('y', photoY + photoSize + 28)
    .attr('text-anchor', 'middle')
    .attr('font-size', '9px').attr('font-weight', '600')
    .attr('fill', isOffline ? '#6B7280' : isYou ? '#FFFFFF' : '#374151')
    .text(displayName);

  // Hover tooltip — show kutham name or prompt if empty
  if (!isOffline && !isYou) {
    const tooltipText = node.kutham
      ? (node.kutham.length > 16 ? node.kutham.substring(0, 16) + '…' : node.kutham)
      : 'Kutham?';
    const tooltipFill = node.kutham ? stroke : '#9CA3AF';
    const tooltipW = Math.min(tooltipText.length * 6 + 16, 130);

    const tooltip = g.append('g')
      .attr('class', 'kutham-tooltip')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    tooltip.append('rect')
      .attr('x', NODE_W / 2 - tooltipW / 2)
      .attr('y', -28)
      .attr('width', tooltipW)
      .attr('height', 22)
      .attr('rx', 6)
      .attr('fill', tooltipFill)
      .attr('opacity', 0.9);

    tooltip.append('text')
      .attr('x', NODE_W / 2)
      .attr('y', -13)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('fill', 'white')
      .text(tooltipText);

    g.on('mouseenter', function() {
      d3.select(this).select('.kutham-tooltip').style('opacity', 1);
    }).on('mouseleave', function() {
      d3.select(this).select('.kutham-tooltip').style('opacity', 0);
    });
  }

  // No verification badge for offline or self
  if (!isYou && !isOffline) {
    g.append('circle')
      .attr('cx', NODE_W - 8).attr('cy', 8).attr('r', 7)
      .attr('fill', node.verified ? C.verified : C.pending)
      .attr('stroke', 'white').attr('stroke-width', 1.5);
    g.append('text')
      .attr('x', NODE_W - 8).attr('y', 8)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', '8px').attr('fill', 'white')
      .text(node.verified ? '✓' : '?');
  }
}

function buildTree(relationships, currentUser, photoMap, svgRef) {
  const svg = d3.select(svgRef.current);
  svg.selectAll('*').remove();

  const W = svgRef.current.clientWidth || 800;
  const byGenCol = {};
  const siblings = [];

  relationships.forEach((rel, idx) => {
    if (!rel.to_user) return;
    const meta = RELATION_META[rel.relation_type];
    if (!meta) return;

    const node = {
      id: rel.to_user.id,
      name: rel.to_user.name,
      tamil: rel.relation_tamil,
      relationType: rel.relation_type,
      verified: rel.verification_status === 'verified',
      isOffline: rel.to_user?.is_offline === true,
      kutham: rel.to_user?.kutham || null,
      gen: meta.gen, col: meta.col,
      order: meta.order, addedIdx: idx,
    };

    if (rel.relation_type === 'brother' || rel.relation_type === 'sister') {
      siblings.push(node); return;
    }
    if (!byGenCol[meta.gen]) byGenCol[meta.gen] = { center: [], left: [], right: [] };
    byGenCol[meta.gen][meta.col].push(node);
  });

  siblings.sort((a, b) => a.addedIdx - b.addedIdx);
  const mid = Math.ceil(siblings.length / 2);
  const elderSibs = siblings.slice(0, mid).reverse();
  const youngerSibs = siblings.slice(mid);

  const usedGens = new Set(['current']);
  Object.keys(byGenCol).forEach(g => usedGens.add(g));
  const activeGens = GENERATIONS.filter(g => usedGens.has(g.key));

  const currentRowH = Math.max(ROW_H, ((elderSibs.length + youngerSibs.length) + 1) * 70 + 30);
  const genHeights = {};
  activeGens.forEach(g => { genHeights[g.key] = g.isCurrent ? currentRowH : ROW_H; });

  const totalH = PAD_TOP * 2 + activeGens.reduce((s, g) => s + genHeights[g.key], 0);
  const rowY = {};
  let yy = PAD_TOP;
  activeGens.forEach(g => { rowY[g.key] = yy + genHeights[g.key] / 2; yy += genHeights[g.key]; });

  const centerX = W / 2;
  const youY = rowY['current'];
  const svgEl = svg.attr('width', W).attr('height', totalH);

  let bandY = PAD_TOP;
  activeGens.forEach(g => {
    const bH = genHeights[g.key];
    const isCur = g.isCurrent;
    svgEl.append('rect')
      .attr('x', PAD_X - 10).attr('y', bandY)
      .attr('width', W - (PAD_X - 10) * 2).attr('height', bH)
      .attr('rx', 14).attr('fill', g.color)
      .attr('stroke', isCur ? '#C4B5FD' : 'transparent')
      .attr('stroke-width', isCur ? 2 : 0);
    svgEl.append('text').attr('x', PAD_X).attr('y', bandY + 20)
      .attr('font-size', '10px').attr('font-weight', '700')
      .attr('fill', isCur ? C.bloodStroke : '#9CA3AF').text(g.label);
    svgEl.append('text').attr('x', W - PAD_X).attr('y', bandY + 20)
      .attr('text-anchor', 'end').attr('font-size', '10px').attr('font-weight', '600')
      .attr('fill', isCur ? C.derivedStroke : '#C4B5FD').text(g.nameRight);
    bandY += bH;
  });

  const divLeft  = centerX - NODE_W - GAP_X * 3;
  const divRight = centerX + NODE_W + GAP_X * 3;
  [divLeft, divRight].forEach(dx => {
    svgEl.append('line')
      .attr('x1', dx).attr('y1', PAD_TOP).attr('x2', dx).attr('y2', totalH - PAD_TOP)
      .attr('stroke', '#E9D5FF').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');
  });

  svgEl.append('text').attr('x', (PAD_X + divLeft) / 2).attr('y', PAD_TOP - 16)
    .attr('text-anchor', 'middle').attr('font-size', '10px').attr('font-weight', '700')
    .attr('fill', C.bloodStroke).text('← My Blood Relations');
  svgEl.append('text').attr('x', centerX).attr('y', PAD_TOP - 16)
    .attr('text-anchor', 'middle').attr('font-size', '10px').attr('font-weight', '700')
    .attr('fill', '#6D28D9').text('Direct Line');
  svgEl.append('text').attr('x', (divRight + W - PAD_X) / 2).attr('y', PAD_TOP - 16)
    .attr('text-anchor', 'middle').attr('font-size', '10px').attr('font-weight', '700')
    .attr('fill', C.derivedStroke).text("Wife's Relations →");

  const positioned = [];
  const youNode = {
    id: currentUser.id, name: currentUser.name,
    tamil: 'நீங்கள்', isYou: true, verified: true, col: 'center',
    kutham: currentUser.kutham || null,
    x: centerX - (NODE_W / 2 + GAP_X / 2), y: youY,
  };
  positioned.push(youNode);

  Object.entries(byGenCol).forEach(([gen, cols]) => {
    const cy = rowY[gen]; if (!cy) return;
    const cNodes = [...cols.center].sort((a, b) => a.order - b.order);
    if (gen === 'current') {
      cNodes.forEach((node, i) => {
        node.x = centerX + GAP_X / 2 + i * (NODE_W + GAP_X) + NODE_W / 2;
        node.y = cy; positioned.push(node);
      });
    } else {
      const totalW = cNodes.length * NODE_W + (cNodes.length - 1) * GAP_X;
      const startX = centerX - totalW / 2;
      cNodes.forEach((node, i) => {
        node.x = startX + i * (NODE_W + GAP_X) + NODE_W / 2;
        node.y = cy; positioned.push(node);
      });
    }
    [...cols.left].sort((a, b) => a.order - b.order).forEach((node, i) => {
      node.x = divLeft - GAP_X - i * (NODE_W + GAP_X) - NODE_W / 2;
      node.y = cy; positioned.push(node);
    });
    [...cols.right].sort((a, b) => a.order - b.order).forEach((node, i) => {
      node.x = divRight + GAP_X + i * (NODE_W + GAP_X) + NODE_W / 2;
      node.y = cy; positioned.push(node);
    });
  });

  const sibX = divLeft - GAP_X - NODE_W / 2;
  elderSibs.forEach((node, i) => { node.x = sibX; node.y = youY - (i + 1) * 70; positioned.push(node); });
  youngerSibs.forEach((node, i) => { node.x = sibX; node.y = youY + (i + 1) * 70; positioned.push(node); });

  const linesG = svgEl.append('g');
  const centerNodes = positioned.filter(n => n.col === 'center' || n.isYou);
  if (centerNodes.length > 1) {
    const topN = centerNodes.reduce((a, b) => a.y < b.y ? a : b);
    const botN = centerNodes.reduce((a, b) => a.y > b.y ? a : b);
    linesG.append('line')
      .attr('x1', centerX).attr('y1', topN.y).attr('x2', centerX).attr('y2', botN.y)
      .attr('stroke', C.lineCenter).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,3').attr('opacity', 0.3);
  }

  const spouseNode = positioned.find(n => n.relationType === 'spouse');
  if (spouseNode) {
    linesG.append('line')
      .attr('x1', youNode.x + NODE_W / 2).attr('y1', youY)
      .attr('x2', spouseNode.x - NODE_W / 2).attr('y2', youY)
      .attr('stroke', '#C4B5FD').attr('stroke-width', 2).attr('opacity', 0.8);
    linesG.append('text')
      .attr('x', (youNode.x + NODE_W / 2 + spouseNode.x - NODE_W / 2) / 2)
      .attr('y', youY + 4).attr('text-anchor', 'middle').attr('font-size', '12px').text('💜');
  }

  positioned.filter(n => !n.isYou && n.relationType !== 'spouse').forEach(n => {
    const color = n.col === 'right' ? C.lineDerived : n.col === 'left' ? C.lineBlood : C.lineCenter;
    linesG.append('line')
      .attr('x1', centerX).attr('y1', youY).attr('x2', n.x).attr('y2', n.y)
      .attr('stroke', n.verified ? color : C.linePending)
      .attr('stroke-width', 1).attr('stroke-dasharray', n.verified ? '5,3' : '3,4').attr('opacity', 0.35);
  });

  if (siblings.length > 0) {
    const topY = elderSibs.length > 0 ? youY - elderSibs.length * 70 : youY;
    const botY = youngerSibs.length > 0 ? youY + youngerSibs.length * 70 : youY;
    linesG.append('line').attr('x1', sibX).attr('y1', topY).attr('x2', sibX).attr('y2', botY)
      .attr('stroke', C.lineBlood).attr('stroke-width', 1.5).attr('opacity', 0.3);
    linesG.append('line').attr('x1', sibX + NODE_W / 2).attr('y1', youY)
      .attr('x2', youNode.x).attr('y2', youY)
      .attr('stroke', C.lineBlood).attr('stroke-width', 1.5).attr('opacity', 0.3);
  }

  const nodesG = svgEl.append('g');
  // Build kutham color map — assign index per unique kutham
  const kuthamMap = new Map();
  let kuthamIdx = 0;
  positioned.forEach(node => {
    if (node.kutham && !kuthamMap.has(node.kutham)) {
      kuthamMap.set(node.kutham, kuthamIdx++);
    }
  });

  positioned.forEach(node => {
    const g = nodesG.append('g')
      .attr('transform', `translate(${node.x - NODE_W / 2},${node.y - NODE_H / 2})`);
    drawNode(g, node, photoMap, kuthamMap);
  });
}

export default function FamilyTree({ relationships, currentUser }) {
  const svgRef = useRef(null);
  const [photosReady, setPhotosReady] = useState(false);
  const photoMapRef = useRef({});

  useEffect(() => {
    if (!relationships || !currentUser) return;
    setPhotosReady(false);

    preloadPhotos(relationships, currentUser).then(map => {
      photoMapRef.current = map;
      setPhotosReady(true);
    });
  }, [relationships, currentUser]);

  // Only draw AFTER photos are preloaded
  useEffect(() => {
    if (!photosReady || !svgRef.current || !relationships || !currentUser) return;
    buildTree(relationships, currentUser, photoMapRef.current, svgRef);
  }, [photosReady]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-200 border border-purple-500 inline-block"></span> My Blood
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500 inline-block"></span> Direct Line
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 inline-block"></span> Wife's Relations
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Verified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Pending
        </span>
      </div>

      {!photosReady && (
        <div className="text-center py-8 text-purple-400 text-sm">
          Loading family tree... 🌳
        </div>
      )}

      <div className={`w-full bg-white rounded-2xl overflow-x-auto border border-purple-100 shadow-sm ${!photosReady ? 'hidden' : ''}`}>
        <svg ref={svgRef} style={{ minWidth: '650px' }} />
      </div>
    </div>
  );
}
