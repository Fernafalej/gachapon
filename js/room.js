// js/room.js – Iso-Renderer, Wände, Boden, Figuren-Sprites
import { drawCharacter, getAllCharacters, getCharacter } from './characters.js';
import { getState } from './state.js';

// ---- Iso-Konstanten ----
export const TW = 52;    // Tile-Breite
export const TH = 26;    // Tile-Höhe (= TW/2)
export const GRID = 6;   // Tiles pro Zimmer (6×6)
export const WALL_H = 66;

// Basis-Ursprung für 375px Viewport (wird dynamisch angepasst)
const BASE_OX = 187;
const BASE_OY = 74;

let ox = BASE_OX;
let oy = BASE_OY;

export function setViewport(w, h) {
  ox = Math.floor(w / 2);
  // Vertikal: Raum im oberen Drittel zentrieren
  const roomHeight = GRID * TH + WALL_H;
  oy = Math.max(BASE_OY, Math.floor((h - roomHeight) * 0.38) + WALL_H);
}

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
const FLOOR_A = '#E8DDD0';
const FLOOR_B = '#DDD2C2';
const FLOOR_STROKE = 'rgba(0,0,0,0.04)';

const WALL_RIGHT_COLOR = '#F2DAC4';
const WALL_LEFT_COLOR  = '#ECDAC8';
const WALL_EDGE_COLOR  = '#D8C8B4';

const WIN_GLASS_RIGHT = '#A8CCE0';
const WIN_GLASS_LEFT  = '#A8D4B8';
const WIN_FRAME        = '#C8B8A4';
const WIN_FRAME_WIDTH  = 1.5;

// ---- Runtime Character Sprites ----
const sprites = [];
let initialized = false;

/**
 * Raum initialisieren: Figuren-Sprites aus State oder Demo erzeugen.
 * Wird einmal beim App-Start und nach State-Änderungen aufgerufen.
 */
export function initRoom() {
  sprites.length = 0;
  const state = getState();
  const collected = Object.keys(state.collection);

  let chars;
  if (collected.length > 0) {
    chars = collected.map(id => getCharacter(id)).filter(Boolean);
  } else {
    // Demo-Figuren bis Gacha implementiert ist
    const all = getAllCharacters();
    chars = all.slice(0, Math.min(5, all.length));
  }

  chars.forEach((char, i) => {
    // Gleichmäßig im Raum verteilen
    const angle = (i / chars.length) * Math.PI * 2 + 0.3;
    const radius = 1.2 + (i % 2) * 0.6;
    const centerX = GRID / 2;
    const centerY = GRID / 2;

    sprites.push({
      char,
      px: clampGrid(centerX + Math.cos(angle) * radius),
      py: clampGrid(centerY + Math.sin(angle) * radius),
      targetPx: 0,
      targetPy: 0,
      pose: 'idle',
      dir: 0,
      idleTimer: 1.5 + Math.random() * 2.5,
      moveSpeed: 0.8 + Math.random() * 0.5,
    });
  });

  initialized = true;
}

/**
 * Sprite-Liste für externe Nutzung (Tap-Detection etc.)
 */
export function getSprites() {
  return sprites;
}

function clampGrid(v) {
  return Math.max(0.4, Math.min(GRID - 0.4, v));
}

function pickRandomTarget() {
  return {
    px: clampGrid(0.5 + Math.random() * (GRID - 1)),
    py: clampGrid(0.5 + Math.random() * (GRID - 1)),
  };
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
        const target = pickRandomTarget();
        sp.targetPx = target.px;
        sp.targetPy = target.py;
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
        // Richtung: Screen-Space X-Bewegung bestimmt Blickrichtung
        const screenDx = (dx - dy);
        sp.dir = screenDx >= 0 ? 0 : 1;
      }
    }
  }
}

// ---- Draw Helpers ----

function worldToScreen(px, py) {
  return {
    x: ox + (px - py) * TW / 2,
    y: oy + (px + py) * TH / 2,
  };
}

function drawQuad(ctx, p1, p2, p3, p4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.closePath();
  ctx.fill();
}

// ---- Floor ----

function drawFloor(ctx) {
  for (let ty = 0; ty < GRID; ty++) {
    for (let tx = 0; tx < GRID; tx++) {
      const top   = tileToScreen(tx, ty);
      const right = tileToScreen(tx + 1, ty);
      const bot   = tileToScreen(tx + 1, ty + 1);
      const left  = tileToScreen(tx, ty + 1);

      const color = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(bot.x, bot.y);
      ctx.lineTo(left.x, left.y);
      ctx.closePath();
      ctx.fill();

      // Subtile Tile-Kanten
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

  // Wand-Fläche
  drawQuad(ctx,
    { x: bl.x, y: bl.y },
    { x: br.x, y: br.y },
    { x: br.x, y: br.y - WALL_H },
    { x: bl.x, y: bl.y - WALL_H },
    WALL_RIGHT_COLOR,
  );

  // Unterkante (Boden-Übergang)
  ctx.strokeStyle = WALL_EDGE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y);
  ctx.lineTo(br.x, br.y);
  ctx.stroke();

  // Oberkante
  ctx.strokeStyle = WALL_EDGE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y - WALL_H);
  ctx.lineTo(br.x, br.y - WALL_H);
  ctx.stroke();

  // Fenster (rechte Wand, Position Tile 3–5)
  drawWindowOnWall(ctx, 'right', 3, 5, WIN_GLASS_RIGHT);
}

function drawLeftWall(ctx) {
  const br = tileToScreen(0, 0);
  const bl = tileToScreen(0, GRID);

  // Wand-Fläche
  drawQuad(ctx,
    { x: br.x, y: br.y },
    { x: bl.x, y: bl.y },
    { x: bl.x, y: bl.y - WALL_H },
    { x: br.x, y: br.y - WALL_H },
    WALL_LEFT_COLOR,
  );

  // Unterkante
  ctx.strokeStyle = WALL_EDGE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.stroke();

  // Oberkante
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(br.x, br.y - WALL_H);
  ctx.lineTo(bl.x, bl.y - WALL_H);
  ctx.stroke();

  // Fenster (linke Wand, Position Tile 1–3)
  drawWindowOnWall(ctx, 'left', 1, 3, WIN_GLASS_LEFT);
}

function drawWindowOnWall(ctx, wall, startTile, endTile, glassColor) {
  // Fenster-Position auf der Wand interpolieren
  let p1, p2;
  if (wall === 'right') {
    p1 = tileToScreen(startTile, 0);
    p2 = tileToScreen(endTile, 0);
  } else {
    p1 = tileToScreen(0, startTile);
    p2 = tileToScreen(0, endTile);
  }

  const winBottomInset = 22;  // Pixel vom Boden der Wand
  const winTopInset = 14;     // Pixel von der Oberkante der Wand

  const y1b = p1.y - winBottomInset;
  const y2b = p2.y - winBottomInset;
  const y1t = p1.y - (WALL_H - winTopInset);
  const y2t = p2.y - (WALL_H - winTopInset);

  // Glasfläche
  ctx.fillStyle = glassColor;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(p1.x, y1b);
  ctx.lineTo(p2.x, y2b);
  ctx.lineTo(p2.x, y2t);
  ctx.lineTo(p1.x, y1t);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Glanz-Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  const cx = (p1.x + p2.x) / 2;
  const cy = ((y1t + y2t) / 2 + (y1b + y2b) / 2) / 2;
  ctx.beginPath();
  ctx.moveTo(p1.x + 4, y1t + 4);
  ctx.lineTo(cx - 2, (y1t + y2t) / 2 + 3);
  ctx.lineTo(cx - 2, cy - 2);
  ctx.lineTo(p1.x + 4, (y1b + y1t) / 2);
  ctx.closePath();
  ctx.fill();

  // Rahmen
  ctx.strokeStyle = WIN_FRAME;
  ctx.lineWidth = WIN_FRAME_WIDTH;
  ctx.beginPath();
  ctx.moveTo(p1.x, y1b);
  ctx.lineTo(p2.x, y2b);
  ctx.lineTo(p2.x, y2t);
  ctx.lineTo(p1.x, y1t);
  ctx.closePath();
  ctx.stroke();

  // Kreuz-Sprossen
  const midX = (p1.x + p2.x) / 2;
  const midYb = (y1b + y2b) / 2;
  const midYt = (y1t + y2t) / 2;
  const horizY1 = (y1b + y1t) / 2;
  const horizY2 = (y2b + y2t) / 2;

  ctx.beginPath();
  // Vertikale Sprosse
  ctx.moveTo(midX, midYb);
  ctx.lineTo(midX, midYt);
  // Horizontale Sprosse
  ctx.moveTo(p1.x, horizY1);
  ctx.lineTo(p2.x, horizY2);
  ctx.stroke();
}

// ---- Eck-Kante (Wand-Übergang) ----

function drawCornerEdge(ctx) {
  const corner = tileToScreen(0, 0);
  ctx.strokeStyle = WALL_EDGE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(corner.x, corner.y);
  ctx.lineTo(corner.x, corner.y - WALL_H);
  ctx.stroke();
}

// ---- Haupt-Render-Funktion ----

/**
 * Zeichnet den kompletten isometrischen Raum.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w  Canvas-Breite in CSS-Pixel
 * @param {number} h  Canvas-Höhe in CSS-Pixel
 * @param {number} t  Zeitstempel in Sekunden (für Animationen)
 */
export function renderRoom(ctx, w, h, t) {
  if (!initialized) return;

  // Viewport anpassen
  setViewport(w, h);

  ctx.clearRect(0, 0, w, h);

  // Hintergrund
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, w, h);

  // 1. Rechte Rückwand (ty=0 Kante)
  drawRightWall(ctx);

  // 2. Linke Rückwand (tx=0 Kante)
  drawLeftWall(ctx);

  // 3. Eck-Kante
  drawCornerEdge(ctx);

  // 4. Boden (von hinten nach vorne)
  drawFloor(ctx);

  // 5. Figuren depth-sorted nach (px + py)
  const sorted = [...sprites].sort((a, b) => (a.px + a.py) - (b.px + b.py));

  for (const sp of sorted) {
    const screen = worldToScreen(sp.px, sp.py);
    ctx.save();
    drawCharacter(ctx, sp.char, sp.pose, screen.x, screen.y, t, sp.dir);
    ctx.restore();
  }
}
