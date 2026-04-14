// data/characters/species/_helpers.js – Shared draw utilities

/**
 * Parse hex to {r, g, b}
 */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * RGB to hex
 */
export function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

/**
 * Aufhellen/Abdunkeln: offset positiv = heller, negativ = dunkler
 */
export function adjustColor(hex, offset) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + offset, g + offset, b + offset);
}

/**
 * Iso-Farbvarianten für eine Basisfarbe
 * Top: +26, Right: +5, Left: -28
 */
export function isoColors(hex) {
  return {
    top:   adjustColor(hex, 26),
    right: adjustColor(hex, 5),
    left:  adjustColor(hex, -28),
  };
}

/**
 * Ellipse zeichnen (Schatten)
 */
export function drawShadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Runde Form zeichnen (Kopf, Körper)
 */
export function drawCircle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Abgerundetes Rechteck
 */
export function drawRoundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
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
  ctx.fill();
}

/**
 * Augen zeichnen (Chibi-Stil: groß, mit Glanzpunkt)
 */
export function drawEyes(ctx, x, y, size, eyeColor) {
  const gap = size * 1.3;
  const ec = eyeColor || '#2A1F14';

  // Linkes Auge
  drawCircle(ctx, x - gap, y, size, ec);
  // Glanzpunkt
  drawCircle(ctx, x - gap + size * 0.3, y - size * 0.3, size * 0.35, '#FFFFFF');

  // Rechtes Auge
  drawCircle(ctx, x + gap, y, size, ec);
  drawCircle(ctx, x + gap + size * 0.3, y - size * 0.3, size * 0.35, '#FFFFFF');
}

/**
 * Geschlossene Augen (schlafend)
 */
export function drawClosedEyes(ctx, x, y, size) {
  const gap = size * 1.3;
  ctx.strokeStyle = '#2A1F14';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  // Linkes Auge
  ctx.beginPath();
  ctx.arc(x - gap, y, size * 0.7, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // Rechtes Auge
  ctx.beginPath();
  ctx.arc(x + gap, y, size * 0.7, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
}

/**
 * Kleiner Mund
 */
export function drawMouth(ctx, x, y, width, type) {
  ctx.strokeStyle = '#2A1F14';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';

  if (type === 'smile') {
    ctx.beginPath();
    ctx.arc(x, y - width * 0.3, width, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (type === 'open') {
    drawCircle(ctx, x, y, width * 0.5, '#2A1F14');
  } else {
    // default: kleiner Strich
    ctx.beginPath();
    ctx.moveTo(x - width * 0.5, y);
    ctx.lineTo(x + width * 0.5, y);
    ctx.stroke();
  }
}

/**
 * Rötliche Wangen (Kawaii-Blush)
 */
export function drawBlush(ctx, x, y, size) {
  ctx.fillStyle = 'rgba(242, 167, 176, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x - size * 2.2, y + size * 0.5, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + size * 2.2, y + size * 0.5, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Bounce-Offset für idle animation
 */
export function bounceY(t, amplitude, speed) {
  return Math.sin(t * speed) * amplitude;
}

/**
 * Walk-Bein-Offset
 */
export function walkLeg(t, speed) {
  return Math.sin(t * speed) * 2;
}
