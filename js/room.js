// js/room.js – Iso-Renderer with furniture + character depth-sort
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

// ---- Tile Tap Callback ----
let _tileTapCb = null;
export function setOnTileTap(cb) { _tileTapCb = cb; }

// ---- Sprites + Furniture ----
const sprites = [];
let furnitureItems = [];
let initialized = false;

// ---- Canvas ref for coordinate conversion ----
let _canvasRef = null;

/**
 * Raum initialisieren.
 * @param {Array} chars       – Character-Definitionen
 * @param {Function} drawFn   – drawCharacter(ctx, char, pose, x, y, t, dir)
 * @param {Array} [furniture] – Möbel-Objekte: { tx, ty, size: {w,d}, draw(ctx,x,y), flat }
 */
export function initRoom(chars, drawFn, furniture) {
  sprites.length = 0;
  furnitureItems = furniture || [];
  drawCharFn = drawFn || null;

  if (!chars || chars.length === 0) {
    initialized = true;
    return;
  }

  // Begehbare Tiles berechnen (Tiles die nicht von Möbeln blockiert sind)
  const blocked = new Set();
  for (const f of furnitureItems) {
    if (f.flat) continue; // Teppiche blockieren nicht
    for (let dx = 0; dx < f.size.w; dx++) {
      for (let dy = 0; dy < f.size.d; dy++) {
        blocked.add(`${f.tx + dx},${f.ty + dy}`);
      }
    }
  }

  const startPos = [
    { px: 1.5, py: 3.5 }, { px: 3.0, py: 2.0 }, { px: 4.5, py: 4.0 },
    { px: 2.0, py: 1.5 }, { px: 4.0, py: 1.5 }, { px: 1.5, py: 5.0 },
    { px: 3.5, py: 5.0 }, { px: 5.0, py: 3.0 }, { px: 2.5, py: 3.0 },
  ];

  chars.forEach((char, i) => {
    const pos = startPos[i % startPos.length];
    const initialPose = char.roomPose || 'idle';
    sprites.push({
      char, px: pos.px, py: pos.py,
      targetPx: 0, targetPy: 0,
      pose: initialPose, dir: 0,
      idleTimer: initialPose === 'idle' ? 1.5 + Math.random() * 2.5 : Number.POSITIVE_INFINITY,
      moveSpeed: 0.8 + Math.random() * 0.5,
    });
  });

  initialized = true;
}

export function getSprites() { return sprites; }
export function getFurnitureItems() { return furnitureItems; }

/**
 * Swap furniture without reinitializing characters.
 */
export function setFurniture(furniture) {
  furnitureItems = furniture || [];
}

/**
 * Find furniture at a given tile position.
 */
export function findFurnitureAt(tx, ty) {
  for (const f of furnitureItems) {
    if (tx >= f.tx && tx < f.tx + f.size.w &&
        ty >= f.ty && ty < f.ty + f.size.d) {
      return f;
    }
  }
  return null;
}

/**
 * Convert client (touch/mouse) coordinates to tile position,
 * accounting for camera pan/zoom.
 */
function clientToTile(clientX, clientY) {
  if (!_canvasRef) return { tx: -1, ty: -1 };
  const rect = _canvasRef.getBoundingClientRect();
  let sx = clientX - rect.left;
  let sy = clientY - rect.top;
  const w = rect.width;
  const h = rect.height;
  // Invert camera transform: translate(w/2+panX, h/2+panY) scale(zoom) translate(-w/2,-h/2)
  sx = (sx - w / 2 - cam.panX) / cam.zoom + w / 2;
  sy = (sy - h / 2 - cam.panY) / cam.zoom + h / 2;
  return screenToTile(sx, sy);
}

function clmp(v) { return Math.max(0.4, Math.min(GRID - 0.4, v)); }

/**
 * Prüft ob eine Tile-Position von Möbeln blockiert ist.
 * Figuren meiden nicht-flache Möbel mit etwas Abstand.
 */
function isTileBlocked(px, py) {
  for (const f of furnitureItems) {
    if (f.flat) continue;
    // Figur-Zentrum liegt innerhalb der Möbel-Footprint + kleiner Puffer
    const pad = 0.3;
    if (px >= f.tx - pad && px < f.tx + f.size.w + pad &&
        py >= f.ty - pad && py < f.ty + f.size.d + pad) {
      return true;
    }
  }
  return false;
}

/**
 * Zufälligen freien Waypoint finden (max 10 Versuche)
 */
function randomFreeWaypoint() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const px = clmp(0.5 + Math.random() * (GRID - 1));
    const py = clmp(0.5 + Math.random() * (GRID - 1));
    if (!isTileBlocked(px, py)) return { px, py };
  }
  // Fallback: irgendein Punkt
  return { px: clmp(0.5 + Math.random() * (GRID - 1)), py: clmp(0.5 + Math.random() * (GRID - 1)) };
}

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
        const wp = randomFreeWaypoint();
        sp.targetPx = wp.px;
        sp.targetPy = wp.py;
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
        const nextPx = sp.px + (dx / dist) * step;
        const nextPy = sp.py + (dy / dist) * step;
        // Kollisionsprüfung: Wenn nächste Position blockiert, abbrechen
        if (isTileBlocked(nextPx, nextPy)) {
          sp.pose = 'idle';
          sp.idleTimer = 1.0 + Math.random() * 2;
        } else {
          sp.px = nextPx;
          sp.py = nextPy;
          sp.dir = (dx - dy) >= 0 ? 0 : 1;
        }
      }
    }
  }
}

// ---- Draw Helpers ----
function ws(px, py) {
  return { x: ox + (px - py) * TW / 2, y: oy + (px + py) * TH / 2 };
}

export function getSpriteScreenPos(px, py, w, h) {
  const baseOX = Math.floor(w / 2);
  const baseOY = Math.max(WALL_H + 2, Math.min(h - GRID * TH - 2, Math.floor(h / 2 - 45)));
  const worldX = baseOX + (px - py) * TW / 2;
  const worldY = baseOY + (px + py) * TH / 2;

  return {
    x: (worldX - w / 2) * cam.zoom + (w / 2 + cam.panX),
    y: (worldY - h / 2) * cam.zoom + (h / 2 + cam.panY),
  };
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
  _canvasRef = canvas;
  canvas.style.touchAction = 'none';

  // Tap detection state
  let _tapStartX = 0, _tapStartY = 0, _tapStartTime = 0;
  let _wasDrag = false;
  let _tapTimeout = null;

  function handleTap(cx, cy) {
    const tile = clientToTile(cx, cy);
    if (_tileTapCb && tile.tx >= 0 && tile.tx < GRID && tile.ty >= 0 && tile.ty < GRID) {
      _tileTapCb(tile);
    }
  }

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    _touches = [...e.touches];
    if (_touches.length === 1) {
      _tapStartX = _touches[0].clientX;
      _tapStartY = _touches[0].clientY;
      _tapStartTime = Date.now();
      _wasDrag = false;
      _panning = true;
      _lastX = _touches[0].clientX;
      _lastY = _touches[0].clientY;
    } else if (_touches.length === 2) {
      _panning = false;
      _wasDrag = true;
      _lastPinch = _pinchDist(_touches);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = [...e.touches];
    if (t.length === 1 && _panning) {
      const mx = t[0].clientX - _lastX;
      const my = t[0].clientY - _lastY;
      cam.panX += mx;
      cam.panY += my;
      _lastX = t[0].clientX;
      _lastY = t[0].clientY;
      const totalDx = t[0].clientX - _tapStartX;
      const totalDy = t[0].clientY - _tapStartY;
      if (Math.abs(totalDx) > 10 || Math.abs(totalDy) > 10) _wasDrag = true;
    } else if (t.length === 2 && _lastPinch > 0) {
      const d = _pinchDist(t);
      cam.zoom = _clampZ(cam.zoom * (d / _lastPinch));
      _lastPinch = d;
      _wasDrag = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    _touches = [...e.touches];
    if (_touches.length < 2) _lastPinch = 0;
    if (_touches.length === 0) {
      _panning = false;
      const elapsed = Date.now() - _tapStartTime;
      if (!_wasDrag && elapsed < 350) {
        // Possible tap – check for double-tap
        if (_tapTimeout) {
          clearTimeout(_tapTimeout);
          _tapTimeout = null;
          cam.panX = 0; cam.panY = 0; cam.zoom = 1;
        } else {
          const sx = _tapStartX, sy = _tapStartY;
          _tapTimeout = setTimeout(() => {
            _tapTimeout = null;
            handleTap(sx, sy);
          }, 280);
        }
      }
    }
  }, { passive: false });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    cam.zoom = _clampZ(cam.zoom * (e.deltaY > 0 ? 0.92 : 1.08));
  }, { passive: false });

  // Mouse controls
  let _mouseStartX = 0, _mouseStartY = 0, _mouseDrag = false;
  canvas.addEventListener('mousedown', e => {
    _mouseDown = true;
    _mouseDrag = false;
    _lastX = e.clientX; _lastY = e.clientY;
    _mouseStartX = e.clientX; _mouseStartY = e.clientY;
  });
  canvas.addEventListener('mousemove', e => {
    if (!_mouseDown) return;
    cam.panX += e.clientX - _lastX;
    cam.panY += e.clientY - _lastY;
    _lastX = e.clientX; _lastY = e.clientY;
    const dx = e.clientX - _mouseStartX, dy = e.clientY - _mouseStartY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) _mouseDrag = true;
  });
  canvas.addEventListener('mouseup', e => {
    if (!_mouseDrag && _mouseDown) {
      handleTap(e.clientX, e.clientY);
    }
    _mouseDown = false;
  });
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

  const baseOX = Math.floor(w / 2);
  const baseOY = Math.max(WALL_H + 2, Math.min(h - GRID * TH - 2, Math.floor(h / 2 - 45)));

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2 + cam.panX, h / 2 + cam.panY);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-w / 2, -h / 2);

  ox = baseOX;
  oy = baseOY;

  // 1. Wände
  drawRightWall(ctx);
  drawLeftWall(ctx);
  drawCornerEdge(ctx);

  // 2. Boden
  drawFloor(ctx);

  // 3. Flache Möbel (Teppiche) direkt auf dem Boden
  for (const f of furnitureItems) {
    if (!f.flat) continue;
    const scr = ws(f.tx + f.size.w / 2, f.ty + f.size.d / 2);
    ctx.save();
    f.draw(ctx, scr.x, scr.y);
    ctx.restore();
  }

  // 4. Depth-sorted: nicht-flache Möbel + Figuren zusammen
  const renderList = [];

  for (const f of furnitureItems) {
    if (f.flat) continue;
    // Depth-Key: Mitte des Footprints
    const cx = f.tx + f.size.w / 2;
    const cy = f.ty + f.size.d / 2;
    renderList.push({
      type: 'furniture',
      depth: cx + cy,
      drawFn: f.draw,
      screenX: ws(cx, cy).x,
      screenY: ws(cx, cy).y,
    });
  }

  if (drawCharFn) {
    for (const sp of sprites) {
      const scr = ws(sp.px, sp.py);
      renderList.push({
        type: 'character',
        depth: sp.px + sp.py,
        sprite: sp,
        screenX: scr.x,
        screenY: scr.y,
      });
    }
  }

  renderList.sort((a, b) => a.depth - b.depth);

  for (const item of renderList) {
    ctx.save();
    if (item.type === 'furniture') {
      item.drawFn(ctx, item.screenX, item.screenY);
    } else {
      drawCharFn(ctx, item.sprite.char, item.sprite.pose, item.screenX, item.screenY, t, item.sprite.dir);
    }
    ctx.restore();
  }

  ctx.restore();
}
