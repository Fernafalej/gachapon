// js/room.js – Iso-Renderer, simpel, ohne Skalierung
// Raum wird 1:1 in nativer Pixelgröße gerendert.

// ---- Iso-Konstanten ----
export const TW = 52;
export const TH = 26;
export const GRID = 6;
export const WALL_H = 66;

// Dynamischer Iso-Ursprung (wird pro Frame in renderRoom gesetzt)
let ox = 187;
let oy = 120;

export function tileToScreen(tx, ty) {
  return {
    x: ox + (tx - ty) * TW / 2,
    y: oy + (tx + ty) * TH / 2,
  };
}

export function screenToTile(sx, sy) {
  const u = sx - ox;
  const v = sy - oy;
  return {
    tx: Math.floor(u / TW + v / TH),
    ty: Math.floor(-u / TW + v / TH),
  };
}

// ---- Farben ----
const FLOOR_A = '#DED5B8';
const FLOOR_B = '#D2C9AC';
const FLOOR_STROKE = 'rgba(0,0,0,0.03)';
const WALL_RIGHT = '#F2DAC4';
const WALL_LEFT  = '#ECDAC8';
const WALL_EDGE  = '#D8C8B4';
const WIN_GLASS_R = '#A8CCE0';
const WIN_GLASS_L = '#A8D4B8';
const WIN_FRAME   = '#C8B8A4';

// ---- Externe Draw-Funktion ----
let drawCharFn = null;

// ---- Sprites ----
const sprites = [];
let initialized = false;

export function initRoom(chars, drawFn) {
  sprites.length = 0;
  drawCharFn = drawFn || null;

  if (!chars || chars.length === 0) {
    initialized = true;
    return;
  }

  const startPos = [
    { px: 1.5, py: 3.5 }, { px: 3.0, py: 2.0 }, { px: 4.5, py: 4.0 },
    { px: 2.0, py: 1.5 }, { px: 4.0, py: 1.5 }, { px: 1.5, py: 5.0 },
    { px: 3.5, py: 5.0 }, { px: 5.0, py: 3.0 }, { px: 2.5, py: 3.0 },
  ];

  chars.forEach((char, i) => {
    const pos = startPos[i % startPos.length];
    sprites.push({
      char, px: pos.px, py: pos.py,
      targetPx: 0, targetPy: 0,
      pose: 'idle', dir: 0,
      idleTimer: 1.5 + Math.random() * 2.5,
      moveSpeed: 0.8 + Math.random() * 0.5,
    });
  });

  initialized = true;
}

export function getSprites() { return sprites; }

function clmp(v) { return Math.max(0.4, Math.min(GRID - 0.4, v)); }

// ---- Update ----
let lastT = 0;

export function updateRoom(t) {
  if (!initialized) return;
  const dt = lastT === 0 ? 0.016 : Math.min(t - lastT, 0.1);
  lastT = t;

  for (const sp of sprites) {
    if (sp.pose === 'idle') {
      sp.idleTimer -= dt;
      if (sp.idleTimer <= 0) {
        sp.targetPx = clmp(0.5 + Math.random() * (GRID - 1));
        sp.targetPy = clmp(0.5 + Math.random() * (GRID - 1));
        sp.pose = 'walk';
      }
    } else if (sp.pose === 'walk') {
      const dx = sp.targetPx - sp.px;
      const dy = sp.targetPy - sp.py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.08) {
        sp.px = sp.targetPx;
        sp.py = sp.targetPy;
        sp.pose = 'idle';
        sp.idleTimer = 2.5 + Math.random() * 4;
      } else {
        const step = Math.min(sp.moveSpeed * dt, dist);
        sp.px += (dx / dist) * step;
        sp.py += (dy / dist) * step;
        sp.dir = (dx - dy) >= 0 ? 0 : 1;
      }
    }
  }
}

// ---- Draw Helpers ----
function ws(px, py) {
  return { x: ox + (px - py) * TW / 2, y: oy + (px + py) * TH / 2 };
}

// ---- Floor ----
function drawFloor(ctx) {
  for (let ty = 0; ty < GRID; ty++) {
    for (let tx = 0; tx < GRID; tx++) {
      const t = tileToScreen(tx, ty);
      const r = tileToScreen(tx + 1, ty);
      const b = tileToScreen(tx + 1, ty + 1);
      const l = tileToScreen(tx, ty + 1);

      ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(r.x, r.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(l.x, l.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = FLOOR_STROKE;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

// ---- Walls ----
function drawRightWall(ctx) {
  const bl = tileToScreen(0, 0);
  const br = tileToScreen(GRID, 0);

  ctx.fillStyle = WALL_RIGHT;
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(br.x, br.y - WALL_H);
  ctx.lineTo(bl.x, bl.y - WALL_H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = WALL_EDGE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y - WALL_H);
  ctx.lineTo(br.x, br.y - WALL_H);
  ctx.stroke();

  drawWindow(ctx, 'right', 3, 5, WIN_GLASS_R);
}

function drawLeftWall(ctx) {
  const br = tileToScreen(0, 0);
  const bl = tileToScreen(0, GRID);

  ctx.fillStyle = WALL_LEFT;
  ctx.beginPath();
  ctx.moveTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.lineTo(bl.x, bl.y - WALL_H);
  ctx.lineTo(br.x, br.y - WALL_H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = WALL_EDGE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(br.x, br.y - WALL_H);
  ctx.lineTo(bl.x, bl.y - WALL_H);
  ctx.stroke();

  drawWindow(ctx, 'left', 1, 3, WIN_GLASS_L);
}

function drawWindow(ctx, wall, s, e, glass) {
  let p1, p2;
  if (wall === 'right') {
    p1 = tileToScreen(s, 0);
    p2 = tileToScreen(e, 0);
  } else {
    p1 = tileToScreen(0, s);
    p2 = tileToScreen(0, e);
  }

  const wb = 22, wt = WALL_H - 14;
  const y1b = p1.y - wb, y2b = p2.y - wb;
  const y1t = p1.y - wt, y2t = p2.y - wt;

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(p1.x, y1b);
  ctx.lineTo(p2.x, y2b);
  ctx.lineTo(p2.x, y2t);
  ctx.lineTo(p1.x, y1t);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#FFFFFF';
  const mx = (p1.x + p2.x) / 2;
  ctx.beginPath();
  ctx.moveTo(p1.x + 3, y1t + 3);
  ctx.lineTo(mx - 2, (y1t + y2t) / 2 + 2);
  ctx.lineTo(mx - 2, (y1b + y2b + y1t + y2t) / 4);
  ctx.lineTo(p1.x + 3, (y1b + y1t) / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = WIN_FRAME;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p1.x, y1b);
  ctx.lineTo(p2.x, y2b);
  ctx.lineTo(p2.x, y2t);
  ctx.lineTo(p1.x, y1t);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mx, (y1b + y2b) / 2);
  ctx.lineTo(mx, (y1t + y2t) / 2);
  ctx.moveTo(p1.x, (y1b + y1t) / 2);
  ctx.lineTo(p2.x, (y2b + y2t) / 2);
  ctx.stroke();
}

function drawCornerEdge(ctx) {
  const c = tileToScreen(0, 0);
  ctx.strokeStyle = WALL_EDGE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x, c.y - WALL_H);
  ctx.stroke();
}

// ---- Kamera (Pan + Zoom) ----
const cam = { panX: 0, panY: 0, zoom: 1, minZoom: 0.7, maxZoom: 2.5 };

// Touch-State
let _touches = [];
let _lastPinch = 0;
let _panning = false;
let _lastX = 0;
let _lastY = 0;
let _lastTap = 0;
let _mouseDown = false;

export function initRoomControls(canvas) {
  canvas.style.touchAction = 'none'; // Browser-Scroll deaktivieren

  // Touch
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    _touches = [...e.touches];
    if (_touches.length === 1) {
      const now = Date.now();
      if (now - _lastTap < 300) { cam.panX = 0; cam.panY = 0; cam.zoom = 1; _lastTap = 0; return; }
      _lastTap = now;
      _panning = true;
      _lastX = _touches[0].clientX;
      _lastY = _touches[0].clientY;
    } else if (_touches.length === 2) {
      _panning = false;
      _lastPinch = _pinchDist(_touches);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = [...e.touches];
    if (t.length === 1 && _panning) {
      cam.panX += t[0].clientX - _lastX;
      cam.panY += t[0].clientY - _lastY;
      _lastX = t[0].clientX;
      _lastY = t[0].clientY;
    } else if (t.length === 2 && _lastPinch > 0) {
      const d = _pinchDist(t);
      cam.zoom = _clampZ(cam.zoom * (d / _lastPinch));
      _lastPinch = d;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    _touches = [...e.touches];
    if (_touches.length < 2) _lastPinch = 0;
    if (_touches.length === 0) _panning = false;
  }, { passive: false });

  // Mouse
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    cam.zoom = _clampZ(cam.zoom * (e.deltaY > 0 ? 0.92 : 1.08));
  }, { passive: false });

  canvas.addEventListener('mousedown', e => { _mouseDown = true; _lastX = e.clientX; _lastY = e.clientY; });
  canvas.addEventListener('mousemove', e => {
    if (!_mouseDown) return;
    cam.panX += e.clientX - _lastX;
    cam.panY += e.clientY - _lastY;
    _lastX = e.clientX;
    _lastY = e.clientY;
  });
  canvas.addEventListener('mouseup', () => { _mouseDown = false; });
  canvas.addEventListener('mouseleave', () => { _mouseDown = false; });
  canvas.addEventListener('dblclick', () => { cam.panX = 0; cam.panY = 0; cam.zoom = 1; });
}

function _pinchDist(t) {
  const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
function _clampZ(z) { return Math.max(cam.minZoom, Math.min(cam.maxZoom, z)); }

// ---- Haupt-Render ----

export function renderRoom(ctx, w, h, t) {
  if (!initialized) return;

  // Iso-Ursprung berechnen (Basis, ohne Kamera)
  const baseOX = Math.floor(w / 2);
  const baseOY = Math.max(WALL_H + 2, Math.min(h - GRID * TH - 2, Math.floor(h / 2 - 45)));

  // Hintergrund (immer volle Canvas-Größe, vor dem Transform)
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, w, h);

  // Kamera-Transform: Zoom um Canvas-Mitte + Pan
  ctx.save();
  ctx.translate(w / 2 + cam.panX, h / 2 + cam.panY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-w / 2, -h / 2);

  // Iso-Ursprung setzen (wird von allen Draw-Funktionen genutzt)
  ox = baseOX;
  oy = baseOY;

  // Wände, Boden, Figuren
  drawRightWall(ctx);
  drawLeftWall(ctx);
  drawCornerEdge(ctx);
  drawFloor(ctx);

  if (drawCharFn && sprites.length > 0) {
    const sorted = [...sprites].sort((a, b) => (a.px + a.py) - (b.px + b.py));
    for (const sp of sorted) {
      const scr = ws(sp.px, sp.py);
      ctx.save();
      drawCharFn(ctx, sp.char, sp.pose, scr.x, scr.y, t, sp.dir);
      ctx.restore();
    }
  }

  ctx.restore();
}
