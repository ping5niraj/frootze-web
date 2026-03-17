// ============================================================
// frootze — Radial Tree Canvas Renderer
// Draws a professional radial family tree on HTML Canvas
// YOU at center, family radiates outward
// ============================================================

const NODE_R = 36;      // node radius
const YOU_R  = 44;      // your node radius (bigger)
const FONT   = 'bold 11px Inter, Arial, sans-serif';
const FONT_SM = '9px Inter, Arial, sans-serif';
const FONT_LG = 'bold 14px Inter, Arial, sans-serif';

// ── Main render function ───────────────────────────────────
export async function renderRadialTree(relationships, currentUser, photoMap, template, canvasWidth = 900) {
  const canvas = document.createElement('canvas');
  const H = canvasWidth;
  canvas.width = canvasWidth;
  canvas.height = H + 120; // extra for header + footer
  const ctx = canvas.getContext('2d');

  const HEADER_H = 80;
  const FOOTER_H = 60;
  const centerX = canvasWidth / 2;
  const centerY = HEADER_H + H / 2;

  // ── Background ─────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, canvasWidth, H + HEADER_H + FOOTER_H);
  grad.addColorStop(0, template.bgGradient[0]);
  grad.addColorStop(1, template.bgGradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, H + HEADER_H + FOOTER_H);

  // ── Stars for night template ───────────────────────────
  if (template.id === 'night') {
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * canvasWidth;
      const sy = Math.random() * (H + HEADER_H);
      const sr = Math.random() * 1.5;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.6 + 0.2})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Kolam pattern for heritage template ───────────────
  if (template.id === 'heritage') {
    drawKolam(ctx, canvasWidth, H + HEADER_H + FOOTER_H);
  }

  // ── Header ─────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, canvasWidth, HEADER_H);

  ctx.fillStyle = template.titleColor;
  ctx.font = 'bold 28px Inter, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🌳 frootze', 24, 36);

  ctx.font = '16px Inter, Arial, sans-serif';
  ctx.fillStyle = template.labelColor;
  ctx.fillText(`${currentUser.name}'s Family Tree`, 24, 62);

  // Template badge
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, canvasWidth - 130, 18, 110, 32, 8);
  ctx.fill();
  ctx.fillStyle = template.titleColor;
  ctx.font = '12px Inter, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${template.emoji} ${template.name}`, canvasWidth - 18, 38);

  // ── Build node positions ───────────────────────────────
  const nodes = buildRadialLayout(relationships, currentUser, centerX, centerY, H * 0.38);

  // ── Draw branches ──────────────────────────────────────
  nodes.filter(n => !n.isYou).forEach(node => {
    drawBranch(ctx, centerX, centerY, node.x, node.y, node.tamil, template);
  });

  // ── Draw nodes ─────────────────────────────────────────
  for (const node of nodes) {
    await drawNode(ctx, node, photoMap, template);
  }

  // ── Footer ─────────────────────────────────────────────
  const footerY = HEADER_H + H;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, footerY, canvasWidth, FOOTER_H);

  ctx.fillStyle = template.footerText;
  ctx.font = '13px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('உங்கள் குடும்ப மரத்தை உருவாக்க:', canvasWidth / 2, footerY + 22);

  ctx.font = 'bold 18px Inter, Arial, sans-serif';
  ctx.fillText('www.frootze.com', canvasWidth / 2, footerY + 46);

  return canvas;
}

// ── Build radial layout ────────────────────────────────────
function buildRadialLayout(relationships, currentUser, cx, cy, radius) {
  const nodes = [];

  // YOU at center
  nodes.push({
    id: currentUser.id,
    name: currentUser.name,
    tamil: 'நீங்கள்',
    x: cx, y: cy,
    isYou: true,
    r: YOU_R,
  });

  if (!relationships || relationships.length === 0) return nodes;

  // Group by generation for angle distribution
  const genGroups = {
    'past':    [], // appa, amma, grandparents
    'current': [], // spouse, siblings, in-laws
    'future':  [], // children, grandchildren
  };

  relationships.forEach(rel => {
    const type = rel.relation_type;
    const node = {
      id: rel.to_user?.id,
      name: rel.to_user?.name || '?',
      tamil: rel.relation_tamil || type,
      relationType: type,
      verified: rel.verification_status === 'verified',
      r: NODE_R,
    };

    if (['father','mother','grandfather_paternal','grandmother_paternal',
         'grandfather_maternal','grandmother_maternal','uncle_elder',
         'uncle_younger','aunt_paternal','aunt_maternal','uncle_maternal',
         'father_in_law','mother_in_law'].includes(type)) {
      genGroups.past.push(node);
    } else if (['son','daughter','grandson','granddaughter'].includes(type)) {
      genGroups.future.push(node);
    } else {
      genGroups.current.push(node);
    }
  });

  // Assign angles:
  // Past → top half (270° ± 90°) = 180° to 360°
  // Future → bottom half (90° ± 60°) = 30° to 150°
  // Current → left and right (0° ± 60° and 180° ± 60°)

  const allGroups = [
    { nodes: genGroups.past,    startAngle: -150, endAngle: -30,  radiusMult: 1.0 },
    { nodes: genGroups.current, startAngle: -170, endAngle: 170,  radiusMult: 0.85, skipMiddle: true },
    { nodes: genGroups.future,  startAngle: 30,   endAngle: 150,  radiusMult: 0.9 },
  ];

  allGroups.forEach(group => {
    const count = group.nodes.length;
    if (count === 0) return;

    if (group.skipMiddle && count > 1) {
      // Split current gen: left side + right side (skip center where YOU is)
      const half = Math.ceil(count / 2);
      const leftNodes = group.nodes.slice(0, half);
      const rightNodes = group.nodes.slice(half);

      leftNodes.forEach((node, i) => {
        const angle = (-160 + i * (60 / Math.max(leftNodes.length - 1, 1))) * Math.PI / 180;
        const r = radius * group.radiusMult;
        node.x = cx + r * Math.cos(angle);
        node.y = cy + r * Math.sin(angle);
        nodes.push(node);
      });

      rightNodes.forEach((node, i) => {
        const angle = (100 + i * (60 / Math.max(rightNodes.length - 1, 1))) * Math.PI / 180;
        const r = radius * group.radiusMult;
        node.x = cx + r * Math.cos(angle);
        node.y = cy + r * Math.sin(angle);
        nodes.push(node);
      });
    } else {
      const span = group.endAngle - group.startAngle;
      group.nodes.forEach((node, i) => {
        const angle = (group.startAngle + (count > 1 ? i * span / (count - 1) : span / 2)) * Math.PI / 180;
        const r = radius * group.radiusMult;
        node.x = cx + r * Math.cos(angle);
        node.y = cy + r * Math.sin(angle);
        nodes.push(node);
      });
    }
  });

  return nodes;
}

// ── Draw curved branch ─────────────────────────────────────
function drawBranch(ctx, x1, y1, x2, y2, label, template) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Curved line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(
    mx + (y2 - y1) * 0.1,
    my - (x2 - x1) * 0.1,
    x2, y2
  );
  ctx.strokeStyle = template.branch;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Relation label on branch
  const lx = mx + (y2 - y1) * 0.05;
  const ly = my - (x2 - x1) * 0.05;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.font = FONT_SM;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(label).width;
  roundRect(ctx, lx - tw / 2 - 4, ly - 8, tw + 8, 14, 4);
  ctx.fill();

  ctx.fillStyle = template.labelColor;
  ctx.fillText(label, lx, ly + 2);
}

// ── Draw a node ────────────────────────────────────────────
async function drawNode(ctx, node, photoMap, template) {
  const { x, y, r, isYou, name, tamil, verified } = node;

  const fill   = isYou ? template.youFill   : template.nodeFill;
  const stroke = isYou ? template.youFill   : template.nodeStroke;
  const tColor = isYou ? template.youText   : template.nodeText;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur  = 12;
  ctx.shadowOffsetY = 4;

  // Circle background
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = isYou ? 3 : 2;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetY = 0;

  // Photo
  const photo = photoMap?.[node.id];
  if (photo) {
    const img = new Image();
    img.src = photo;
    await new Promise(resolve => {
      if (img.complete) { resolve(); return; }
      img.onload = resolve;
      img.onerror = resolve;
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y - 6, r - 6, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x - (r - 6), y - (r - 6) - 6, (r - 6) * 2, (r - 6) * 2);
    ctx.restore();

    // Photo border
    ctx.beginPath();
    ctx.arc(x, y - 6, r - 6, 0, Math.PI * 2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // Initial letter
    ctx.fillStyle = isYou ? 'rgba(255,255,255,0.2)' : template.nodeStroke + '30';
    ctx.beginPath();
    ctx.arc(x, y - 6, r - 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tColor;
    ctx.font = `bold ${isYou ? 20 : 16}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(name ? name.charAt(0).toUpperCase() : '?', x, y - 1);
  }

  // Tamil label below
  ctx.fillStyle = tColor;
  ctx.font = `bold 9px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(tamil, x, y + r - 8);

  // Name
  ctx.fillStyle = tColor;
  ctx.font = `bold 10px Inter, Arial, sans-serif`;
  const displayName = (name || '').length > 8 ? name.substring(0, 8) + '…' : (name || '');
  ctx.fillText(displayName, x, y + r + 12);

  // Verified badge
  if (!isYou) {
    ctx.beginPath();
    ctx.arc(x + r - 5, y - r + 5, 8, 0, Math.PI * 2);
    ctx.fillStyle = verified ? '#10B981' : '#F59E0B';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(verified ? '✓' : '?', x + r - 5, y - r + 9);
  }
}

// ── Kolam decorative pattern ───────────────────────────────
function drawKolam(ctx, w, h) {
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;

  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * (w / 4);
    const y = Math.floor(i / 4) * (h / 2);
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Round rect helper ──────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
