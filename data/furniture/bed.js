import { isoColors } from '../characters/species/_helpers.js';
export default {
  id: 'bed', name: 'Bett', size: { w: 1, d: 2 },
  buy: { cost: { wood: 18, fabric: 7 } },
  craft: { cost: { wood: 15, fabric: 4 }, duration: 1440 },
  draw(ctx, tx, ty) {
    const w = isoColors('#B88B5A'); const b = isoColors('#8AAFD4');
    ctx.fillStyle = w.left; ctx.fillRect(tx-8, ty-6, 16, 18);
    ctx.fillStyle = b.top;
    ctx.beginPath(); ctx.moveTo(tx-6,ty-8); ctx.lineTo(tx+8,ty-3); ctx.lineTo(tx+6,ty+8); ctx.lineTo(tx-8,ty+3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.ellipse(tx-2,ty-5,5,3,-0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = w.right; ctx.fillRect(tx-8, ty-12, 16, 5);
  },
  adjacency_bonus: null,
};
