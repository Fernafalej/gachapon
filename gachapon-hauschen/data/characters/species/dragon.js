// data/characters/species/dragon.js – Draw-Funktionen für Spezies "dragon"
import {
  drawShadow, drawCircle, drawRoundRect,
  drawEyes, drawClosedEyes, drawMouth, drawBlush,
  bounceY, adjustColor,
} from './_helpers.js';

const HEAD_R = 11;

function drawDragonBase(ctx, x, y, palette, opts = {}) {
  const { headOff = 0, bodyOff = 0, armLOff = 0, armROff = 0, wingFlap = 0, tailWag = 0, eyeType = 'open', mouthType = 'smile' } = opts;

  const baseY = y;
  const bodyY = baseY - 10 + bodyOff;
  const headY = bodyY - HEAD_R - 3 + headOff;

  drawShadow(ctx, x, baseY + 1, 11, 4.5);

  // Schwanz
  ctx.save();
  ctx.translate(x - 3, bodyY + 3);
  ctx.rotate(-0.4 + tailWag * 0.25);
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-12, -2, -16, -8);
  ctx.quadraticCurveTo(-14, -10, -12, -8);
  ctx.quadraticCurveTo(-8, -2, 0, -2);
  ctx.closePath();
  ctx.fill();
  // Schwanz-Spitze (dreieckig)
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.lineTo(-20, -12);
  ctx.lineTo(-18, -6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Flügel (hinter dem Körper)
  ctx.save();
  ctx.translate(x - 4, bodyY - 4);
  ctx.rotate(-0.8 + wingFlap * 0.4);
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-14, -10);
  ctx.lineTo(-10, -4);
  ctx.lineTo(-16, 0);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.save();
  ctx.translate(x + 4, bodyY - 4);
  ctx.rotate(0.8 - wingFlap * 0.4);
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(14, -10);
  ctx.lineTo(10, -4);
  ctx.lineTo(16, 0);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Beine (stämmig)
  const legColor = adjustColor(palette.primary, -25);
  drawRoundRect(ctx, x - 5.5, baseY - 5, 4.5, 6.5, 2, legColor);
  drawRoundRect(ctx, x + 1, baseY - 5, 4.5, 6.5, 2, legColor);
  // Krallen
  ctx.fillStyle = palette.detail2;
  for (let i = 0; i < 2; i++) {
    const lx = x - 5.5 + i * 6.5;
    ctx.beginPath();
    ctx.moveTo(lx, baseY + 1);
    ctx.lineTo(lx + 1.5, baseY + 3);
    ctx.lineTo(lx + 3, baseY + 1);
    ctx.closePath();
    ctx.fill();
  }

  // Körper (etwas rundlicher)
  drawRoundRect(ctx, x - 7, bodyY - 5, 14, 10, 5, palette.primary);
  // Bauch-Platten
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(x, bodyY + 1.5, 4, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arme
  const armColor = adjustColor(palette.primary, -10);
  ctx.save();
  ctx.translate(x - 7.5, bodyY - 2);
  ctx.rotate(-0.15 + armLOff);
  drawRoundRect(ctx, -2.5, 0, 3.5, 7, 1.5, armColor);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 7.5, bodyY - 2);
  ctx.rotate(0.15 + armROff);
  drawRoundRect(ctx, -1, 0, 3.5, 7, 1.5, armColor);
  ctx.restore();

  // Kopf (etwas größer)
  drawCircle(ctx, x, headY, HEAD_R, palette.primary);

  // Hörner
  ctx.fillStyle = palette.detail2;
  // Links
  ctx.beginPath();
  ctx.moveTo(x - 7, headY - 7);
  ctx.lineTo(x - 10, headY - 16);
  ctx.lineTo(x - 4, headY - 9);
  ctx.closePath();
  ctx.fill();
  // Rechts
  ctx.beginPath();
  ctx.moveTo(x + 7, headY - 7);
  ctx.lineTo(x + 10, headY - 16);
  ctx.lineTo(x + 4, headY - 9);
  ctx.closePath();
  ctx.fill();

  // Schnauze (leicht verlängert)
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(x, headY + 2, 5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nasenlöcher
  drawCircle(ctx, x - 2, headY + 1, 1, palette.detail2);
  drawCircle(ctx, x + 2, headY + 1, 1, palette.detail2);

  // Gesicht
  if (eyeType === 'closed') {
    drawClosedEyes(ctx, x, headY - 2, 2.5);
  } else {
    drawEyes(ctx, x, headY - 2, 2.5, '#8B1A1A');
  }
  drawMouth(ctx, x, headY + 5, 3, mouthType);
  drawBlush(ctx, x, headY, 2.5);
}

export default {
  idle(ctx, x, y, t, palette) {
    const bob = bounceY(t, 1.5, 1.8);
    drawDragonBase(ctx, x, y, palette, {
      headOff: bob,
      bodyOff: bob * 0.5,
      wingFlap: Math.sin(t * 2) * 0.5,
      tailWag: Math.sin(t * 1.5),
      eyeType: Math.sin(t * 0.6) > 0.93 ? 'closed' : 'open',
    });
  },

  walk(ctx, x, y, t, dir, palette) {
    const bob = bounceY(t, 1.5, 5);
    drawDragonBase(ctx, x, y, palette, {
      headOff: bob,
      bodyOff: bob * 0.4,
      wingFlap: Math.sin(t * 4) * 1.2,
      tailWag: Math.sin(t * 5) * 1.5,
      armLOff: Math.sin(t * 5) * 0.25,
      armROff: -Math.sin(t * 5) * 0.25,
    });
  },

  work_default(ctx, x, y, t, palette) {
    drawDragonBase(ctx, x, y, palette, {
      headOff: -1,
      wingFlap: Math.sin(t * 3) * 0.3,
      tailWag: Math.sin(t * 3) * 0.5,
      armLOff: Math.sin(t * 3) * 0.2,
      armROff: -Math.sin(t * 3) * 0.2,
      mouthType: 'open',
    });
  },

  poses: {
    hard_work(ctx, x, y, t, palette) {
      drawDragonBase(ctx, x, y, palette, {
        headOff: -2 + Math.abs(Math.sin(t * 5)),
        wingFlap: Math.sin(t * 5) * 0.8,
        tailWag: Math.sin(t * 4),
        armROff: Math.sin(t * 5) * 0.5 - 0.7,
        mouthType: 'open',
      });
      // Feuer-Partikel
      if (Math.sin(t * 7) > 0.5) {
        const fx = x + 12 + Math.cos(t * 10) * 3;
        const fy = y - 28 + Math.sin(t * 10) * 4;
        drawCircle(ctx, fx, fy, 2.5, '#FF6B35');
        drawCircle(ctx, fx + 1, fy - 2, 1.5, '#FFD700');
      }
    },

    think(ctx, x, y, t, palette) {
      drawDragonBase(ctx, x, y, palette, {
        headOff: bounceY(t, 0.5, 1.2),
        wingFlap: Math.sin(t * 1) * 0.2,
        tailWag: Math.sin(t * 0.8) * 0.3,
        armROff: -0.5,
        mouthType: 'default',
      });
      // Feuerchen statt Denkblasen
      if (Math.sin(t * 2) > 0) {
        ctx.fillStyle = '#FF6B35';
        const fx = x + 14;
        const fy = y - 38;
        drawCircle(ctx, fx, fy + 3, 2, '#FF6B35');
        drawCircle(ctx, fx + 2, fy, 2.5, '#FFD700');
        drawCircle(ctx, fx + 1, fy - 4, 1.5, '#FFF3D0');
      }
    },

    craft(ctx, x, y, t, palette) {
      drawDragonBase(ctx, x, y, palette, {
        headOff: -1,
        wingFlap: Math.sin(t * 5) * 0.5,
        tailWag: Math.sin(t * 4) * 0.6,
        armLOff: Math.sin(t * 6) * 0.3,
        armROff: -Math.sin(t * 6) * 0.3 - 0.15,
        mouthType: Math.sin(t * 3) > 0.5 ? 'open' : 'smile',
      });
      // Funken
      if (Math.sin(t * 8) > 0.6) {
        drawCircle(ctx, x + Math.cos(t * 12) * 8, y - 16 + Math.sin(t * 12) * 4, 1.5, '#FFD700');
      }
    },
  },
};
