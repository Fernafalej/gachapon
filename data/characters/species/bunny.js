// data/characters/species/bunny.js – Draw-Funktionen für Spezies "bunny"
import {
  drawShadow, drawCircle, drawRoundRect,
  drawEyes, drawClosedEyes, drawMouth, drawBlush,
  bounceY, walkLeg, adjustColor,
} from './_helpers.js';

const HEAD_R = 10;

function drawBunnyBase(ctx, x, y, palette, opts = {}) {
  const { headOff = 0, bodyOff = 0, armLOff = 0, armROff = 0, eyeType = 'open', mouthType = 'smile', earWiggle = 0 } = opts;

  const baseY = y;
  const bodyY = baseY - 10 + bodyOff;
  const headY = bodyY - HEAD_R - 2 + headOff;

  drawShadow(ctx, x, baseY + 1, 9, 3.5);

  // Beine (Hase: etwas kräftiger)
  const legColor = adjustColor(palette.primary, -25);
  drawRoundRect(ctx, x - 5, baseY - 6, 4.5, 7, 2, legColor);
  drawRoundRect(ctx, x + 0.5, baseY - 6, 4.5, 7, 2, legColor);
  
  // Schwänzchen
  drawCircle(ctx, x, baseY - 4, 3, palette.detail1);
  
  // Körper
  drawRoundRect(ctx, x - 6.5, bodyY - 5, 13, 10, 5, palette.primary);
  // Bauch
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(x, bodyY + 2, 4, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arme
  const armColor = adjustColor(palette.primary, -8);
  ctx.save();
  ctx.translate(x - 7, bodyY - 2);
  ctx.rotate(-0.15 + armLOff);
  drawRoundRect(ctx, -2.5, 0, 3.5, 7, 1.5, armColor);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 7, bodyY - 2);
  ctx.rotate(0.15 + armROff);
  drawRoundRect(ctx, -1, 0, 3.5, 7, 1.5, armColor);
  ctx.restore();

  // Kopf
  drawCircle(ctx, x, headY, HEAD_R, palette.primary);

  // Lange Ohren
  const earInner = palette.accent;
  ctx.save();
  ctx.translate(x - 5, headY - 9);
  ctx.rotate(-0.1 + earWiggle * 0.15);
  drawRoundRect(ctx, -3, -14, 6, 15, 3, palette.primary);
  drawRoundRect(ctx, -1.5, -12, 3, 11, 1.5, earInner);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 5, headY - 9);
  ctx.rotate(0.1 - earWiggle * 0.1);
  drawRoundRect(ctx, -3, -14, 6, 15, 3, palette.primary);
  drawRoundRect(ctx, -1.5, -12, 3, 11, 1.5, earInner);
  ctx.restore();

  // Gesicht
  if (eyeType === 'closed') {
    drawClosedEyes(ctx, x, headY - 1, 2.3);
  } else {
    drawEyes(ctx, x, headY - 1, 2.3);
  }
  // Nase: kleines umgedrehtes Dreieck
  ctx.fillStyle = palette.detail2;
  ctx.beginPath();
  ctx.moveTo(x, headY + 2.5);
  ctx.lineTo(x - 1.5, headY + 1);
  ctx.lineTo(x + 1.5, headY + 1);
  ctx.closePath();
  ctx.fill();

  drawMouth(ctx, x, headY + 4, 2.5, mouthType);
  drawBlush(ctx, x, headY, 2.2);
}

export default {
  idle(ctx, x, y, t, palette) {
    const bob = bounceY(t, 1.5, 2.2);
    drawBunnyBase(ctx, x, y, palette, {
      headOff: bob,
      bodyOff: bob * 0.5,
      earWiggle: Math.sin(t * 1.5),
      eyeType: Math.sin(t * 0.7) > 0.93 ? 'closed' : 'open',
    });
  },

  walk(ctx, x, y, t, dir, palette) {
    const hop = Math.abs(Math.sin(t * 5)) * 3;
    drawBunnyBase(ctx, x, y - hop, palette, {
      headOff: -hop * 0.3,
      earWiggle: Math.sin(t * 6) * 2,
      armLOff: Math.sin(t * 6) * 0.25,
      armROff: -Math.sin(t * 6) * 0.25,
    });
  },

  work_default(ctx, x, y, t, palette) {
    drawBunnyBase(ctx, x, y, palette, {
      headOff: -1,
      bodyOff: Math.abs(Math.sin(t * 4)) * -1,
      armLOff: Math.sin(t * 3) * 0.2,
      armROff: -Math.sin(t * 3) * 0.2,
      earWiggle: Math.sin(t * 2),
      mouthType: 'open',
    });
  },

  poses: {
    hard_work(ctx, x, y, t, palette) {
      const swing = Math.sin(t * 5) * 0.4;
      drawBunnyBase(ctx, x, y, palette, {
        headOff: -2 + Math.abs(Math.sin(t * 5)),
        armROff: swing - 0.7,
        earWiggle: Math.sin(t * 5) * 1.5,
        mouthType: 'open',
      });
      // Schaufel
      ctx.save();
      const sx = x + 11;
      const sy = y - 28 + Math.sin(t * 5) * 5;
      ctx.fillStyle = '#8B6B4A';
      ctx.fillRect(sx, sy, 2, 12);
      ctx.fillStyle = '#999';
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy + 12);
      ctx.lineTo(sx + 5, sy + 12);
      ctx.lineTo(sx + 1, sy + 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    think(ctx, x, y, t, palette) {
      drawBunnyBase(ctx, x, y, palette, {
        headOff: bounceY(t, 0.5, 1.2),
        earWiggle: Math.sin(t * 0.8) * 0.5,
        armROff: -0.6,
        mouthType: 'default',
      });
      if (Math.sin(t * 1.8) > 0) {
        const bx = x + 13;
        const by = y - 40;
        drawCircle(ctx, bx, by + 6, 1.5, palette.detail2);
        drawCircle(ctx, bx + 3, by + 2, 2, palette.detail2);
        drawCircle(ctx, bx + 4, by - 3, 3, palette.accent);
      }
    },

    craft(ctx, x, y, t, palette) {
      const handMove = Math.sin(t * 7) * 0.3;
      drawBunnyBase(ctx, x, y, palette, {
        headOff: -1,
        armLOff: handMove,
        armROff: -handMove - 0.15,
        earWiggle: Math.sin(t * 3),
        mouthType: Math.sin(t * 3) > 0.5 ? 'open' : 'smile',
      });
    },
  },
};
