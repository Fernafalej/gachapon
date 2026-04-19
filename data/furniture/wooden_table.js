import { isoColors } from '../characters/species/_helpers.js';
export default {
  id: 'wooden_table', name: 'Holztisch', size: { w: 2, d: 1 },
  buy: { cost: { wood: 10, fabric: 2 } },
  craft: { cost: { wood: 6, fabric: 2 }, duration: 480 },
  draw(ctx, tx, ty) {
    const c = isoColors('#B88B5A');
    ctx.fillStyle = c.top;
    ctx.beginPath(); ctx.moveTo(tx, ty-12); ctx.lineTo(tx+20, ty-2); ctx.lineTo(tx, ty+8); ctx.lineTo(tx-20, ty-2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.left;
    ctx.fillRect(tx-14, ty-1, 3, 10); ctx.fillRect(tx+11, ty-1, 3, 10);
  },
  adjacency_bonus: null,
};
