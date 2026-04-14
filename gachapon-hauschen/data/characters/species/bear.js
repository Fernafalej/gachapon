// data/characters/species/bear.js – Draw-Funktionen für Spezies "bear"
import {
  drawShadow, drawCircle, drawRoundRect,
  drawEyes, drawClosedEyes, drawMouth, drawBlush,
  bounceY, walkLeg, adjustColor,
} from './_helpers.js';

const HEAD_R = 11;
const BODY_W = 14;
const BODY_H = 10;
const TOTAL_H = 36;

function drawBearBase(ctx, x, y, palette, opts = {}) {
  const { headOff = 0, bodyOff = 0, armLOff = 0, armROff = 0, eyeType = 'open', mouthType = 'smile' } = opts;

  const baseY = y; // Füße
  const bodyY = baseY - BODY_H - 2 + bodyOff;
  const headY = bodyY - HEAD_R - 2 + headOff;

  // Schatten
  drawShadow(ctx, x, baseY + 1, 10, 4);

  // Beine
  const legColor = adjustColor(palette.primary, -28);
  drawRoundRect(ctx, x - 5, baseY - 5, 4, 6, 2, legColor);
  drawRoundRect(ctx, x + 1, baseY - 5, 4, 6, 2, legColor);

  // Körper
  drawRoundRect(ctx, x - BODY_W / 2, bodyY - BODY_H / 2, BODY_W, BODY_H, 4, palette.primary);

  // Bauch-Fleck
  drawCircle(ctx, x, bodyY + 1, 4.5, palette.accent);

  // Arme
  const armColor = adjustColor(palette.primary, -10);
  // Links
  ctx.save();
  ctx.translate(x - BODY_W / 2 - 1, bodyY - 2);
  ctx.rotate(-0.2 + armLOff);
  drawRoundRect(ctx, -3, 0, 4, 8, 2, armColor);
  ctx.restore();
  // Rechts
  ctx.save();
  ctx.translate(x + BODY_W / 2 + 1, bodyY - 2);
  ctx.rotate(0.2 + armROff);
  drawRoundRect(ctx, -1, 0, 4, 8, 2, armColor);
  ctx.restore();

  // Kopf
  drawCircle(ctx, x, headY, HEAD_R, palette.primary);

  // Ohren
  const earColor = palette.primary;
  const innerEar = palette.accent;
  drawCircle(ctx, x - 8, headY - 9, 5, earColor);
  drawCircle(ctx, x - 8, headY - 9, 3, innerEar);
  drawCircle(ctx, x + 8, headY - 9, 5, earColor);
  drawCircle(ctx, x + 8, headY - 9, 3, innerEar);

  // Gesicht
  if (eyeType === 'closed') {
    drawClosedEyes(ctx, x, headY - 1, 2.5);
  } else {
    drawEyes(ctx, x, headY - 1, 2.5);
  }
  drawMouth(ctx, x, headY + 4, 3, mouthType);
  drawBlush(ctx, x, headY, 2.5);

  // Schnauze
  drawCircle(ctx, x, headY + 2, 3.5, palette.detail1);
  drawCircle(ctx, x, headY + 1, 1.2, palette.detail2);
}

export default {
  idle(ctx, x, y, t, palette) {
    const bob = bounceY(t, 1.5, 2);
    drawBearBase(ctx, x, y, palette, {
      headOff: bob,
      bodyOff: bob * 0.6,
      eyeType: Math.sin(t * 0.8) > 0.95 ? 'closed' : 'open',
      mouthType: 'smile',
    });
  },

  walk(ctx, x, y, t, dir, palette) {
    const bob = bounceY(t, 1, 5);
    const legOff = walkLeg(t, 6);
    const baseY = y;

    drawShadow(ctx, x, baseY + 1, 10, 4);

    const legColor = adjustColor(palette.primary, -28);
    drawRoundRect(ctx, x - 5, baseY - 5 - Math.max(0, legOff), 4, 6, 2, legColor);
    drawRoundRect(ctx, x + 1, baseY - 5 - Math.max(0, -legOff), 4, 6, 2, legColor);

    drawBearBase(ctx, x, y, palette, {
      headOff: bob,
      bodyOff: bob * 0.5,
      armLOff: Math.sin(t * 6) * 0.3,
      armROff: -Math.sin(t * 6) * 0.3,
      mouthType: 'smile',
    });
  },

  work_default(ctx, x, y, t, palette) {
    const effort = Math.sin(t * 3) * 0.15;
    drawBearBase(ctx, x, y, palette, {
      headOff: -1,
      bodyOff: Math.abs(Math.sin(t * 4)) * -1,
      armLOff: effort,
      armROff: -effort,
      mouthType: 'open',
    });
  },

  poses: {
    hard_work(ctx, x, y, t, palette) {
      const swing = Math.sin(t * 5) * 0.5;
      drawBearBase(ctx, x, y, palette, {
        headOff: -2 + Math.abs(Math.sin(t * 5)),
        bodyOff: -1,
        armLOff: -0.3,
        armROff: swing - 0.8,
        mouthType: 'open',
      });
      // Hammer
      ctx.save();
      const hamX = x + 12;
      const hamY = y - TOTAL_H + 8 + Math.sin(t * 5) * 6;
      ctx.fillStyle = '#8B6B4A';
      ctx.fillRect(hamX, hamY, 2, 10);
      ctx.fillStyle = '#888';
      ctx.fillRect(hamX - 3, hamY - 4, 8, 5);
      ctx.restore();
    },

    think(ctx, x, y, t, palette) {
      drawBearBase(ctx, x, y, palette, {
        headOff: bounceY(t, 0.5, 1.5),
        armLOff: -0.5,
        armROff: 0.2,
        mouthType: 'default',
      });
      // Denkblase-Punkte
      if (Math.sin(t * 2) > 0) {
        ctx.fillStyle = palette.detail2;
        const bx = x + 14;
        const by = y - TOTAL_H + 2;
        drawCircle(ctx, bx, by, 1.5, palette.detail2);
        drawCircle(ctx, bx + 3, by - 4, 2, palette.detail2);
        drawCircle(ctx, bx + 4, by - 9, 3, palette.accent);
      }
    },

    craft(ctx, x, y, t, palette) {
      const handMove = Math.sin(t * 6) * 0.4;
      drawBearBase(ctx, x, y, palette, {
        headOff: -1,
        armLOff: handMove,
        armROff: -handMove - 0.2,
        mouthType: Math.sin(t * 3) > 0.5 ? 'open' : 'smile',
      });
      // Kleine Funken
      if (Math.sin(t * 8) > 0.7) {
        ctx.fillStyle = '#FFD700';
        const sx = x + Math.cos(t * 12) * 5;
        const sy = y - 18 + Math.sin(t * 12) * 3;
        drawCircle(ctx, sx, sy, 1, '#FFD700');
      }
    },
  },
};
