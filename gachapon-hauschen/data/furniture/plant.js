export default {
  id: 'plant', name: 'Topfpflanze', size: { w: 1, d: 1 },
  buy: { cost: { goods: 8 } },
  craft: { cost: { material: 3, ideas: 1 }, duration: 300, unlock_cost: { ideas: 3 } },
  draw(ctx, tx, ty) {
    ctx.fillStyle = '#C87850';
    ctx.beginPath(); ctx.moveTo(tx-6,ty-4); ctx.lineTo(tx+6,ty-4); ctx.lineTo(tx+4,ty+4); ctx.lineTo(tx-4,ty+4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6ABF69'; ctx.beginPath(); ctx.arc(tx, ty-10, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#8ED88D'; ctx.beginPath(); ctx.arc(tx-3, ty-12, 5, 0, Math.PI*2); ctx.fill();
  },
  adjacency_bonus: { type: 'happiness', value: 0.02 },
};
