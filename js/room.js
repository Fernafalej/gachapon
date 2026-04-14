// js/room.js – Iso-Renderer, Möbel, Scroll
// Wird in Schritt 4 implementiert

export const TW = 52;    // Tile-Breite
export const TH = 26;    // Tile-Höhe (= TW/2)
export const GRID = 6;   // Tiles pro Zimmer (6×6)
export const WALL_H = 66;
export const OX = 187;   // Iso-Ursprung X (Mitte des 375px Viewports)
export const OY = 74;    // Iso-Ursprung Y

export function tileToScreen(tx, ty) {
  return {
    x: OX + (tx - ty) * TW / 2,
    y: OY + (tx + ty) * TH / 2,
  };
}

export function screenToTile(sx, sy) {
  const u = sx - OX;
  const v = sy - OY;
  return {
    tx: Math.floor(u / TW + v / TH),
    ty: Math.floor(-u / TW + v / TH),
  };
}
