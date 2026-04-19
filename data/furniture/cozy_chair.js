import { isoColors } from '../characters/species/_helpers.js';
export default {
  id: 'cozy_chair', name: 'Gemütlicher Stuhl', size: { w: 1, d: 1 },
  buy: { cost: { wood: 6, fabric: 9 } },
  craft: { cost: { wood: 8, fabric: 3 }, duration: 780 },
  draw(ctx, tx, ty) {
    const c = isoColors('#D47A7A');
    ctx.fillStyle = c.top;
    ctx.beginPath(); ctx.moveTo(tx, ty-6); ctx.lineTo(tx+10, ty-1); ctx.lineTo(tx, ty+4); ctx.lineTo(tx-10, ty-1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.right; ctx.fillRect(tx-8, ty-16, 4, 14);
    ctx.fillStyle = '#8B6B4A'; ctx.fillRect(tx-8, ty+1, 2, 6); ctx.fillRect(tx+6, ty+1, 2, 6);
  },
  adjacency_bonus: { type: 'happiness', value: 0.05 },
};
