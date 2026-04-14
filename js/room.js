// js/room.js – Iso-Renderer mit Kamera (Zoom + Pan)
// Keine Imports aus anderen Game-Modulen.

// ---- Iso-Konstanten ----
export const TW = 52;
export const TH = 26;
export const GRID = 6;
export const WALL_H = 66;

// Fixes internes Koordinatensystem
const ox = 187;
const oy = 76;  // WALL_H + 10

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

// Raum-Bounding-Box (intern)
const ROOM_W = GRID * TW;              // 312
const ROOM_H = GRID * TH + WALL_H;     // 222
const ROOM_CX = ox;                     // 187
const ROOM_CY = oy - WALL_H + ROOM_H / 2; // 121

// ---- Kamera ----
const cam = {
  zoom: 1,
  panX: 0,    // Screen-Pixel Offset
  panY: 0,
  minZoom: 0.6,
  maxZoom: 3.0,
};

/**
 * Zoom berechnen, der den Raum passend in w×h einpasst.
 */
function fitZoom(w, h) {
  const pad = 30;
  return Math.min((w - pad * 2) / ROOM_W, (h - pad * 2) / ROOM_H);
}

/**
 * Kamera auf Raum-Mitte zurücksetzen, Zoom an Viewport anpassen.
 */
export function resetCamera(w, h) {
  cam.zoom = fitZoom(w, h);
  cam.panX = 0;
  cam.panY = 0;
}

// ---- Touch/Mouse Controls ----

let _canvasEl = null;
let _viewW = 375;
let _viewH = 600;

// Touch-State
let touches = [];
let lastPinchDist = 0;
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;
let lastTapTime = 0;

/**
 * Canvas-Events für Pan + Zoom anbinden.
 * Aus main.js einmal aufrufen.
 */
export function initRoomControls(canvas) {
  _canvasEl = canvas;

  // --- Touch ---
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  // --- Mouse (Desktop) ---
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);
  canvas.addEventListener('dblclick', onDblClick);
}

function onTouchStart(e) {
  e.preventDefault();
  touches = Array.from(e.touches);

  if (touches.length === 1) {
    // Doppel-Tap erkennen
    const now = Date.now();
    if (now - lastTapTime < 300) {
      resetCamera(_viewW, _viewH);
      lastTapTime = 0;
      return;
    }
    lastTapTime = now;

    isPanning = true;
    lastPanX = touches[0].clientX;
    lastPanY = touches[0].clientY;
  } else if (touches.length === 2) {
    isPanning = false;
    lastPinchDist = pinchDist(touches);
  }
}

function onTouchMove(e) {
  e.preventDefault();
  const t = Array.from(e.touches);

  if (t.length === 1 && isPanning) {
    cam.panX += t[0].clientX - lastPanX;
    cam.panY += t[0].clientY - lastPanY;
    lastPanX = t[0].clientX;
    lastPanY = t[0].clientY;
  } else if (t.length === 2) {
    const d = pinchDist(t);
    if (lastPinchDist > 0) {
      const ratio = d / lastPinchDist;
      cam.zoom = clampZoom(cam.zoom * ratio);
    }
    lastPinchDist = d;
  }
}

function onTouchEnd(e) {
  touches = Array.from(e.touches);
  if (touches.length < 2) lastPinchDist = 0;
  if (touches.length === 0) isPanning = false;
}

function onWheel(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  cam.zoom = clampZoom(cam.zoom * factor);
}

let mouseDown = false;
function onMouseDown(e) {
  mouseDown = true;
  lastPanX = e.clientX;
  lastPanY = e.clientY;
}
function onMouseMove(e) {
  if (!mouseDown) return;
  cam.panX += e.clientX - lastPanX;
  cam.panY += e.clientY - lastPanY;
  lastPanX = e.clientX;
  lastPanY = e.clientY;
}
function onMouseUp() { mouseDown = false; }

function onDblClick() {
  resetCamera(_viewW, _viewH);
}

function pinchDist(t) {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampZoom(z) {
  return Math.max(cam.minZoom, Math.min(cam.maxZoom, z));
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

// ---- Haupt-Render ----

export function renderRoom(ctx, w, h, t) {
  if (!initialized) return;

  _viewW = w;
  _viewH = h;

  // Beim allerersten Frame: Kamera passend setzen
  if (cam.zoom === 1 && cam.panX === 0 && cam.panY === 0) {
    resetCamera(w, h);
  }

  // Hintergrund
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, w, h);

  // Kamera-Transform: Raum-Mitte → Viewport-Mitte + Pan, dann Zoom
  ctx.save();
  ctx.translate(w / 2 + cam.panX, h * 0.40 + cam.panY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-ROOM_CX, -ROOM_CY);

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
