// data/characters/species/slime.js – Draw-Funktionen für Spezies "slime"
import {
  drawShadow, drawCircle,
  drawEyes, drawClosedEyes, drawMouth, drawBlush,
  bounceY, adjustColor,
} from './_helpers.js';

function drawSlimeBase(ctx, x, y, palette, opts = {}) {
  const { squash = 0, eyeType = 'open', mouthType = 'smile' } = opts;

  const baseY = y;
  // Squash: positive = gedrückt (breiter, flacher)
  const sw = 14 + squash * 3;
  const sh = 16 - squash * 2;
  const centerY = baseY - sh * 0.55;

  drawShadow(ctx, x, baseY + 1, sw * 0.7, 4);

  // Körper: tropfenförmige Blob-Form
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  // Boden breit
  ctx.moveTo(x - sw, baseY);
  // Links hoch
  ctx.quadraticCurveTo(x - sw - 1, centerY - 2, x - sw * 0.5, centerY - sh * 0.6);
  // Oben rund
  ctx.quadraticCurveTo(x, centerY - sh * 0.85, x + sw * 0.5, centerY - sh * 0.6);
  // Rechts runter
  ctx.quadraticCurveTo(x + sw + 1, centerY - 2, x + sw, baseY);
  ctx.closePath();
  ctx.fill();

  // Glanzfleck
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(x - sw * 0.3, centerY - sh * 0.3, sw * 0.25, sh * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Highlight-Punkt
  drawCircle(ctx, x - sw * 0.3, centerY - sh * 0.35, 2.5, palette.detail1);

  // Gesicht
  const faceY = centerY + 1;
  if (eyeType === 'closed') {
    drawClosedEyes(ctx, x, faceY - 2, 2.5);
  } else {
    drawEyes(ctx, x, faceY - 2, 2.5);
  }
  drawMouth(ctx, x, faceY + 3, 2.5, mouthType);
  drawBlush(ctx, x, faceY, 2.5);
}

export default {
  idle(ctx, x, y, t, palette) {
    const squash = Math.sin(t * 2.5) * 0.3;
    drawSlimeBase(ctx, x, y, palette, {
      squash,
      eyeType: Math.sin(t * 0.6) > 0.92 ? 'closed' : 'open',
    });
  },

  walk(ctx, x, y, t, dir, palette) {
    // Schleimi hüpft
    const hopPhase = (t * 3) % (Math.PI * 2);
    const hop = Math.max(0, Math.sin(hopPhase)) * 4;
    const squash = hop > 0.5 ? -0.5 : 0.4 * Math.max(0, Math.sin(hopPhase + Math.PI));

    drawSlimeBase(ctx, x, y - hop, palette, {
      squash,
      mouthType: hop > 2 ? 'open' : 'smile',
    });
  },

  work_default(ctx, x, y, t, palette) {
    const pulse = Math.sin(t * 4) * 0.4;
    drawSlimeBase(ctx, x, y, palette, {
      squash: pulse,
      mouthType: 'open',
    });
    // Kleine Partikel
    if (Math.sin(t * 6) > 0.8) {
      ctx.fillStyle = adjustColor(palette.primary, 30);
      const px = x + Math.cos(t * 8) * 12;
      const py = y - 10 + Math.sin(t * 8) * 5;
      drawCircle(ctx, px, py, 1.5, adjustColor(palette.primary, 30));
    }
  },

  poses: {
    hard_work(ctx, x, y, t, palette) {
      const effort = Math.abs(Math.sin(t * 5));
      drawSlimeBase(ctx, x, y, palette, {
        squash: effort * 0.6 - 0.2,
        mouthType: effort > 0.7 ? 'open' : 'smile',
      });
    },

    think(ctx, x, y, t, palette) {
      drawSlimeBase(ctx, x, y, palette, {
        squash: Math.sin(t * 1.5) * 0.15,
        mouthType: 'default',
      });
      if (Math.sin(t * 2) > 0) {
        const bx = x + 12;
        const by = y - 18;
        drawCircle(ctx, bx, by, 1.5, palette.detail2);
        drawCircle(ctx, bx + 3, by - 4, 2, palette.detail2);
        drawCircle(ctx, bx + 4, by - 9, 3, palette.accent);
      }
    },

    craft(ctx, x, y, t, palette) {
      // Schleimi "schwitzt" Tropfen aus
      const pulse = Math.sin(t * 5) * 0.3;
      drawSlimeBase(ctx, x, y, palette, {
        squash: pulse,
        mouthType: Math.sin(t * 3) > 0.5 ? 'open' : 'smile',
      });
      // Tropfen
      const dropPhase = (t * 2) % 3;
      if (dropPhase < 1.5) {
        ctx.fillStyle = adjustColor(palette.primary, 15);
        drawCircle(ctx, x + 10, y - 12 + dropPhase * 6, 2 - dropPhase * 0.8,
          adjustColor(palette.primary, 15));
      }
    },
  },
};
