import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Layout constants ──────────────────────────────────────
const NODE_W    = 110;
const NODE_H    = 80;
const H_GAP     = 40;   // horizontal gap between columns
const V_GAP     = 80;   // vertical gap between generations
const COL_W     = NODE_W + H_GAP;
const MARGIN    = { top: 60, left: 40, right: 40, bottom: 60 };

// ── Kutham palette ────────────────────────────────────────
const KUTHAM_PALETTE = [
  { fill: '#EDE9FE', stroke: '#7C3AED', text: '#5B21B6' },
  { fill: '#FFF7ED', stroke: '#F59E0B', text: '#92400E' },
  { fill: '#EFF6FF', stroke: '#3B82F6', text: '#1D4ED8' },
  { fill: '#F0FDF4', stroke: '#22C55E', text: '#15803D' },
  { fill: '#FFF1F2', stroke: '#F43F5E', text: '#BE123C' },
  { fill: '#F0F9FF', stroke: '#0EA5E9', text: '#0369A1' },
  { fill: '#FDF4FF', stroke: '#A855F7', text: '#7E22CE' },
  { fill: '#FFFBEB', stroke: '#EAB308', text: '#854D0E' },
];
const UNKNOWN_COLOR = { fill: '#F3F4F6', stroke: '#9CA3AF', text: '#6B7280' };
const YOU_COLOR     = { fill: '#7C3AED', stroke: '#5B21B6', text: '#FFFFFF' };
const OFFLINE_COLOR = { fill: '#E5E7EB', stroke: '#9CA3AF', text: '#6B7280' };

// ── Relation type → column ────────────────────────────────
const BLOOD_TYPES = new Set([
  'father','mother','brother','sister','son','daughter',
  'grandfather_paternal','grandmother_paternal',
  'grandfather_maternal','grandmother_maternal',
  'grandson','granddaughter','nephew','niece',
  'uncle_paternal','aunt_paternal','uncle_maternal','aunt_maternal',
  'cousin','great_grandfather','great_grandmother',
]);
const WIFE_TYPES = new Set([
  'spouse','father_in_law','mother_in_law',
  'brother_in_law','sister_in_law',
  'son_in_law','daughter_in_law',
  'aunt_by_marriage','uncle_by_marriage',
  'nephew_by_marriage','niece_by_marriage',
  'stepson','stepdaughter',
]);

// ── Generation from relation type ────────────────────────
const GEN_MAP = {
  great_grandfather: 3, great_grandmother: 3,
  grandfather_paternal: 2, grandmother_paternal: 2,
  grandfather_maternal: 2, grandmother_maternal: 2,
  father: 1, mother: 1, father_in_law: 1, mother_in_law: 1,
  uncle_paternal: 1, aunt_paternal: 1, uncle_maternal: 1, aunt_maternal: 1,
  brother: 0, sister: 0, spouse: 0,
  brother_in_law: 0, sister_in_law: 0,
  aunt_by_marriage: 0, uncle_by_marriage: 0,
  cousin: 0,
  son: -1, daughter: -1,
  nephew: -1, niece: -1,
  son_in_law: -1, daughter_in_law: -1,
  nephew_by_marriage: -1, niece_by_marriage: -1,
  stepson: -1, stepdaughter: -1,
  grandson: -2, granddaughter: -2,
};

const GEN_LABELS = {
  3: 'Past Gen 3', 2: 'Past Gen 2', 1: 'Past Gen 1',
  0: 'Current', '-1': 'Future Gen 1', '-2': 'Future Gen 2',
};

export default function FamilyNetwork({ currentUser, relationships }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !relationships || !currentUser) return;
    drawNetwork();
  }, [relationships, currentUser]);

  const drawNetwork = () => {
    const container = svgRef.current;
    d3.select(container).selectAll('*').remove();

    // ── Build nodes ──────────────────────────────────────
    const kuthamMap = new Map();
    let kuthamIdx = 0;

    // Self node
    const nodes = [{
      id: currentUser.id,
      name: currentUser.name,
      tamil: 'நீங்கள்',
      relationType: 'self',
      col: 'center',
      gen: 0,
      kutham: currentUser.kutham,
      isYou: true,
      verified: true,
      isOffline: false,
      photo: currentUser.profile_photo,
    }];

    if (currentUser.kutham && !kuthamMap.has(currentUser.kutham)) {
      kuthamMap.set(currentUser.kutham, kuthamIdx++);
    }

    // Add relationships as nodes
    for (const rel of (relationships || [])) {
      const person = rel.to_user || (rel.is_offline ? {
        id: `offline-${rel.id}`,
        name: rel.offline_name,
        kutham: null,
        profile_photo: null,
        is_offline: true,
      } : null);

      if (!person || person.id === currentUser.id) continue;

      const relType  = rel.relation_type;
      const col      = BLOOD_TYPES.has(relType) ? 'blood'
                     : WIFE_TYPES.has(relType)  ? 'wife'
                     : 'blood';
      const gen      = GEN_MAP[relType] ?? 0;

      if (person.kutham && !kuthamMap.has(person.kutham)) {
        kuthamMap.set(person.kutham, kuthamIdx++);
      }

      // Avoid duplicates
      if (!nodes.find(n => n.id === person.id)) {
        nodes.push({
          id: person.id,
          name: person.name || rel.offline_name,
          tamil: rel.relation_tamil,
          relationType: relType,
          col,
          gen,
          kutham: person.kutham,
          isYou: false,
          verified: rel.verification_status === 'verified',
          isOffline: rel.is_offline || false,
          photo: person.profile_photo,
        });
      }
    }

    // ── Assign x/y positions ─────────────────────────────
    const genSet = [...new Set(nodes.map(n => n.gen))].sort((a,b) => b - a);

    // Group nodes by gen + col
    const groups = {};
    for (const node of nodes) {
      const key = `${node.gen}_${node.col}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    }

    // Calculate how many columns per gen
    const genMaxCols = {};
    for (const node of nodes) {
      const g = node.gen;
      if (!genMaxCols[g]) genMaxCols[g] = { blood: 0, center: 0, wife: 0 };
      genMaxCols[g][node.col]++;
    }

    // Max nodes per column across all gens
    const maxBlood  = Math.max(...genSet.map(g => (genMaxCols[g]?.blood  || 0)), 1);
    const maxCenter = Math.max(...genSet.map(g => (genMaxCols[g]?.center || 0)), 1);
    const maxWife   = Math.max(...genSet.map(g => (genMaxCols[g]?.wife   || 0)), 1);

    const bloodW  = maxBlood  * (NODE_W + H_GAP);
    const centerW = maxCenter * (NODE_W + H_GAP);
    const wifesW  = maxWife   * (NODE_W + H_GAP);

    const totalW  = bloodW + centerW + wifesW + MARGIN.left + MARGIN.right + 40;
    const totalH  = genSet.length * (NODE_H + V_GAP) + MARGIN.top + MARGIN.bottom;

    // Column x origins
    const bloodX  = MARGIN.left;
    const centerX = bloodX + bloodW + 20;
    const wifeX   = centerX + centerW + 20;

    // Assign positions
    for (const node of nodes) {
      const rowIdx  = genSet.indexOf(node.gen);
      const y       = MARGIN.top + rowIdx * (NODE_H + V_GAP);
      const key     = `${node.gen}_${node.col}`;
      const group   = groups[key];
      const posIdx  = group.indexOf(node);
      const colCount = group.length;

      let colStart;
      if (node.col === 'blood')  colStart = bloodX  + (bloodW  - colCount * (NODE_W + H_GAP)) / 2;
      if (node.col === 'center') colStart = centerX + (centerW - colCount * (NODE_W + H_GAP)) / 2;
      if (node.col === 'wife')   colStart = wifeX   + (wifesW  - colCount * (NODE_W + H_GAP)) / 2;

      node.x = colStart + posIdx * (NODE_W + H_GAP) + NODE_W / 2;
      node.y = y + NODE_H / 2;
    }

    // ── Build edges ──────────────────────────────────────
    const edges = [];
    const selfNode = nodes.find(n => n.isYou);

    for (const rel of (relationships || [])) {
      const person = rel.to_user || (rel.is_offline ? { id: `offline-${rel.id}` } : null);
      if (!person) continue;
      const target = nodes.find(n => n.id === person.id);
      if (!target || !selfNode) continue;

      edges.push({
        source: selfNode,
        target,
        label: rel.relation_tamil || rel.relation_type,
        verified: rel.verification_status === 'verified',
      });
    }

    // ── SVG setup ─────────────────────────────────────────
    const svg = d3.select(container)
      .attr('width', totalW)
      .attr('height', totalH);

    // Zoom + pan
    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.3, 2]).on('zoom', (e) => {
      g.attr('transform', e.transform);
    }));

    // ── Draw generation band labels ───────────────────────
    const bandsG = g.append('g').attr('class', 'bands');
    for (const gen of genSet) {
      const rowIdx = genSet.indexOf(gen);
      const y = MARGIN.top + rowIdx * (NODE_H + V_GAP) - 22;
      bandsG.append('text')
        .attr('x', MARGIN.left)
        .attr('y', y)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#94A3B8')
        .text(GEN_LABELS[gen] || `Gen ${gen}`);
    }

    // ── Draw column header labels ─────────────────────────
    const headerY = MARGIN.top - 36;
    [
      { x: bloodX + bloodW / 2,   label: '← My Blood Relations', color: '#818CF8' },
      { x: centerX + centerW / 2, label: 'Direct Line',          color: '#A78BFA' },
      { x: wifeX + wifesW / 2,    label: "Wife's Relations →",   color: '#FCD34D' },
    ].forEach(({ x, label, color }) => {
      g.append('text')
        .attr('x', x).attr('y', headerY)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .attr('fill', color)
        .text(label);
    });

    // ── Draw column separator lines ───────────────────────
    const lineH = totalH - MARGIN.bottom;
    [centerX - 10, wifeX - 10].forEach(lx => {
      g.append('line')
        .attr('x1', lx).attr('y1', MARGIN.top - 40)
        .attr('x2', lx).attr('y2', lineH)
        .attr('stroke', '#334155').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    });

    // ── Arrow marker definition ───────────────────────────
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#7C3AED');

    defs.append('marker')
      .attr('id', 'arrowhead-pending')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#F59E0B');

    // ── Draw edges ───────────────────────────────────────
    const edgesG = g.append('g').attr('class', 'edges');

    for (const edge of edges) {
      const { source: s, target: t, label, verified } = edge;
      if (!s.x || !t.x) continue;

      // Path from source node edge to target node edge
      const sx = s.x;
      const sy = s.y;
      const tx = t.x;
      const ty = t.y;

      // Offset to node border
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const ux = dx / dist;
      const uy = dy / dist;

      const startX = sx + ux * (NODE_W / 2 + 4);
      const startY = sy + uy * (NODE_H / 2 + 4);
      const endX   = tx - ux * (NODE_W / 2 + 14);
      const endY   = ty - uy * (NODE_H / 2 + 14);

      // Curved path
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const cpX  = midX + (uy * 20);
      const cpY  = midY - (ux * 20);

      const pathD = `M ${startX},${startY} Q ${cpX},${cpY} ${endX},${endY}`;

      edgesG.append('path')
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', verified ? '#7C3AED' : '#F59E0B')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', verified ? 'none' : '5,3')
        .attr('marker-end', `url(#${verified ? 'arrowhead' : 'arrowhead-pending'})`);

      // Relation label on edge
      const labelX = (startX + cpX + endX) / 3;
      const labelY = (startY + cpY + endY) / 3;
      const labelTrunc = label && label.length > 12 ? label.substring(0,12) + '…' : label;

      if (labelTrunc) {
        const lw = labelTrunc.length * 5.5 + 10;
        edgesG.append('rect')
          .attr('x', labelX - lw/2).attr('y', labelY - 9)
          .attr('width', lw).attr('height', 14)
          .attr('rx', 4).attr('fill', '#1e1b4b').attr('opacity', 0.85);

        edgesG.append('text')
          .attr('x', labelX).attr('y', labelY + 1)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('font-weight', '700')
          .attr('fill', verified ? '#A78BFA' : '#FCD34D')
          .text(labelTrunc);
      }
    }

    // ── Draw nodes ───────────────────────────────────────
    const nodesG = g.append('g').attr('class', 'nodes');

    for (const node of nodes) {
      if (!node.x) continue;

      const ng = nodesG.append('g')
        .attr('transform', `translate(${node.x - NODE_W/2},${node.y - NODE_H/2})`)
        .style('cursor', 'pointer');

      // Colors
      let color;
      if (node.isYou)    color = YOU_COLOR;
      else if (node.isOffline) color = OFFLINE_COLOR;
      else if (node.kutham) {
        const idx = kuthamMap.get(node.kutham);
        color = KUTHAM_PALETTE[idx % KUTHAM_PALETTE.length];
      } else             color = UNKNOWN_COLOR;

      // Node background
      ng.append('rect')
        .attr('width', NODE_W).attr('height', NODE_H)
        .attr('rx', 12)
        .attr('fill', color.fill)
        .attr('stroke', color.stroke)
        .attr('stroke-width', node.isYou ? 3 : 1.5)
        .attr('stroke-dasharray', node.isOffline ? '5,3' : 'none');

      // Profile photo or initial
      if (node.photo) {
        const clip = `clip-${node.id}`;
        const clipDefs = svg.select('defs');
        clipDefs.append('clipPath').attr('id', clip)
          .append('circle').attr('cx', NODE_W/2).attr('cy', 24).attr('r', 18);
        ng.append('image')
          .attr('href', node.photo)
          .attr('x', NODE_W/2 - 18).attr('y', 6)
          .attr('width', 36).attr('height', 36)
          .attr('clip-path', `url(#${clip})`);
      } else {
        ng.append('circle')
          .attr('cx', NODE_W/2).attr('cy', 24).attr('r', 18)
          .attr('fill', color.stroke).attr('opacity', 0.2);
        ng.append('text')
          .attr('x', NODE_W/2).attr('y', 29)
          .attr('text-anchor', 'middle')
          .attr('font-size', '14px').attr('font-weight', '700')
          .attr('fill', color.text)
          .text((node.name||'?')[0].toUpperCase());
      }

      // Relation label
      ng.append('text')
        .attr('x', NODE_W/2).attr('y', 50)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px').attr('fill', color.text).attr('opacity', 0.8)
        .text(node.tamil?.length > 14 ? node.tamil.substring(0,14)+'…' : node.tamil);

      // Name
      const nameShort = (node.name||'').length > 12
        ? node.name.substring(0,12)+'…' : node.name;
      ng.append('text')
        .attr('x', NODE_W/2).attr('y', 64)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px').attr('font-weight', '600')
        .attr('fill', color.text)
        .text(nameShort);

      // Verified dot
      if (!node.isOffline) {
        ng.append('circle')
          .attr('cx', NODE_W - 8).attr('cy', 8).attr('r', 5)
          .attr('fill', node.verified ? '#22C55E' : '#F59E0B');
      }

      // Deceased icon
      if (node.isOffline) {
        ng.append('text')
          .attr('x', 8).attr('y', 14)
          .attr('font-size', '10px').text('🕊️');
      }

      // YOU badge
      if (node.isYou) {
        ng.append('rect')
          .attr('x', NODE_W/2 - 16).attr('y', NODE_H - 14)
          .attr('width', 32).attr('height', 12)
          .attr('rx', 4).attr('fill', '#4ADE80');
        ng.append('text')
          .attr('x', NODE_W/2).attr('y', NODE_H - 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', '7px').attr('font-weight', '700')
          .attr('fill', '#14532D').text('நீங்கள்');
      }
    }
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'auto',
      background: 'linear-gradient(to bottom, #0f0c29, #1e1b4b)',
      borderRadius: '16px', padding: '8px', minHeight: '400px' }}>
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}
