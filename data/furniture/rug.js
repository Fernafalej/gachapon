export default {
  id: 'rug', name: 'Teppich', size: { w: 2, d: 2 },
  buy: { cost: { goods: 12 } },
  craft: { cost: { material: 5, ideas: 2 }, duration: 450, unlock_cost: { ideas: 4 } },
  draw(ctx, tx, ty) {
    ctx.fillStyle = '#D4A0A8'; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(tx,ty-8); ctx.lineTo(tx+18,ty+1); ctx.lineTo(tx,ty+10); ctx.lineTo(tx-18,ty+1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E8C8CC';
    ctx.beginPath(); ctx.moveTo(tx,ty-4); ctx.lineTo(tx+10,ty+1); ctx.lineTo(tx,ty+6); ctx.lineTo(tx-10,ty+1); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  },
  adjacency_bonus: { type: 'happiness', value: 0.02 },
};
