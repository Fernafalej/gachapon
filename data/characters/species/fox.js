// data/characters/species/fox.js – Draw-Funktionen für Spezies "fox"
import {
  drawShadow, drawCircle, drawRoundRect,
  drawEyes, drawClosedEyes, drawMouth, drawBlush,
  bounceY, walkLeg, adjustColor,
} from './_helpers.js';

const HEAD_R = 10;

function drawFoxBase(ctx, x, y, palette, opts = {}) {
  const { headOff = 0, bodyOff = 0, armLOff = 0, armROff = 0, tailWag = 0, eyeType = 'open', mouthType = 'smile' } = opts;

  const baseY = y;
  const bodyY = baseY - 10 + bodyOff;
  const headY = bodyY - HEAD_R - 2 + headOff;

  drawShadow(ctx, x, baseY + 1, 10, 4);

  // Buschiger Schwanz
  ctx.save();
  ctx.translate(x - 2, bodyY + 2);
  ctx.rotate(-0.5 + tailWag * 0.3);
  // Schwanz-Basis
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-10, -8, -8, -18);
  ctx.quadraticCurveTo(-4, -22, 0, -16);
  ctx.quadraticCurveTo(2, -10, 0, 0);
  ctx.closePath();
  ctx.fill();
  // Weiße Spitze
  ctx.fillStyle = palette.detail1;
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.quadraticCurveTo(-4, -22, 0, -16);
  ctx.quadraticCurveTo(-2, -12, -6, -14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Beine
  const legColor = adjustColor(palette.primary, -25);
  drawRoundRect(ctx, x - 5, baseY - 5, 3.5, 6, 1.5, legColor);
  drawRoundRect(ctx, x + 1.5, baseY - 5, 3.5, 6, 1.5, legColor);
  // Pfoten
  drawRoundRect(ctx, x - 5.5, baseY, 4.5, 2, 1, palette.detail2);
  drawRoundRect(ctx, x + 1, baseY, 4.5, 2, 1, palette.detail2);

  // Körper (etwas schmaler)
  drawRoundRect(ctx, x - 6, bodyY - 4.5, 12, 9, 4, palette.primary);
  // Brust-Fell
  ctx.fillStyle = palette.detail1;
  ctx.beginPath();
  ctx.ellipse(x, bodyY + 1, 3.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arme
  const armColor = adjustColor(palette.primary, -8);
  ctx.save();
  ctx.translate(x - 6.5, bodyY - 2);
  ctx.rotate(-0.15 + armLOff);
  drawRoundRect(ctx, -2, 0, 3, 7, 1.5, armColor);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 6.5, bodyY - 2);
  ctx.rotate(0.15 + armROff);
  drawRoundRect(ctx, -1, 0, 3, 7, 1.5, armColor);
  ctx.restore();

  // Kopf
  drawCircle(ctx, x, headY, HEAD_R, palette.primary);

  // Spitze Ohren
  ctx.fillStyle = palette.primary;
  // Links
  ctx.beginPath();
  ctx.moveTo(x - 9, headY - 2);
  ctx.lineTo(x - 11, headY - 15);
  ctx.lineTo(x - 3, headY - 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(x - 8.5, headY - 4);
  ctx.lineTo(x - 10, headY - 13);
  ctx.lineTo(x - 4.5, headY - 7);
  ctx.closePath();
  ctx.fill();
  // Rechts
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.moveTo(x + 9, headY - 2);
  ctx.lineTo(x + 11, headY - 15);
  ctx.lineTo(x + 3, headY - 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(x + 8.5, headY - 4);
  ctx.lineTo(x + 10, headY - 13);
  ctx.lineTo(x + 4.5, headY - 7);
  ctx.closePath();
  ctx.fill();

  // Gesichts-Maske (weißes Dreieck)
  ctx.fillStyle = palette.detail1;
  ctx.beginPath();
  ctx.moveTo(x - 5, headY - 1);
  ctx.lineTo(x, headY + 6);
  ctx.lineTo(x + 5, headY - 1);
  ctx.closePath();
  ctx.fill();

  // Gesicht
  if (eyeType === 'closed') {
    drawClosedEyes(ctx, x, headY - 1, 2.2);
  } else {
    drawEyes(ctx, x, headY - 1, 2.2, '#3A2A14');
  }
  // Nase
  drawCircle(ctx, x, headY + 2, 1.5, '#2A1F14');
  drawMouth(ctx, x, headY + 4.5, 2.5, mouthType);
  drawBlush(ctx, x, headY + 1, 2);
}

export default {
  idle(ctx, x, y, t, palette) {
    const bob = bounceY(t, 1.2, 2);
    drawFoxBase(ctx, x, y, palette, {
      headOff: bob,
      bodyOff: bob * 0.5,
      tailWag: Math.sin(t * 2.5),
      eyeType: Math.sin(t * 0.7) > 0.94 ? 'closed' : 'open',
    });
  },

  walk(ctx, x, y, t, dir, palette) {
    const bob = bounceY(t, 1.2, 5.5);
    drawFoxBase(ctx, x, y, palette, {
      headOff: bob,
      bodyOff: bob * 0.4,
      tailWag: Math.sin(t * 5) * 1.5,
      armLOff: Math.sin(t * 5.5) * 0.3,
      armROff: -Math.sin(t * 5.5) * 0.3,
    });
  },

  work_default(ctx, x, y, t, palette) {
    drawFoxBase(ctx, x, y, palette, {
      headOff: -1,
      tailWag: Math.sin(t * 3) * 0.5,
      armLOff: Math.sin(t * 3) * 0.2,
      armROff: -Math.sin(t * 3) * 0.2,
      mouthType: 'open',
    });
  },

  poses: {
    hard_work(ctx, x, y, t, palette) {
      drawFoxBase(ctx, x, y, palette, {
        headOff: -2 + Math.abs(Math.sin(t * 5)),
        tailWag: Math.sin(t * 4),
        armROff: Math.sin(t * 5) * 0.5 - 0.7,
        mouthType: 'open',
      });
      // Werkzeug
      const wx = x + 11;
      const wy = y - 30 + Math.sin(t * 5) * 5;
      ctx.fillStyle = '#8B6B4A';
      ctx.fillRect(wx, wy, 2, 10);
      ctx.fillStyle = '#AAA';
      ctx.fillRect(wx - 2, wy - 3, 6, 4);
    },

    think(ctx, x, y, t, palette) {
      drawFoxBase(ctx, x, y, palette, {
        headOff: bounceY(t, 0.4, 1.2),
        tailWag: Math.sin(t * 1) * 0.3,
        armROff: -0.5,
        mouthType: 'default',
      });
      if (Math.sin(t * 2) > 0) {
        drawCircle(ctx, x + 13, y - 32, 1.5, palette.detail2);
        drawCircle(ctx, x + 16, y - 36, 2, palette.detail2);
        drawCircle(ctx, x + 17, y - 41, 3, palette.accent);
      }
    },

    craft(ctx, x, y, t, palette) {
      drawFoxBase(ctx, x, y, palette, {
        headOff: -1,
        tailWag: Math.sin(t * 4) * 0.8,
        armLOff: Math.sin(t * 6) * 0.3,
        armROff: -Math.sin(t * 6) * 0.3 - 0.15,
        mouthType: Math.sin(t * 3) > 0.5 ? 'open' : 'smile',
      });
    },
  },
};
