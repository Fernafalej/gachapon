export default {
  id: 'lamp', name: 'Stehlampe', size: { w: 1, d: 1 },
  buy: { cost: { wood: 4, fabric: 6 } },
  craft: { cost: { wood: 4, fabric: 2 }, duration: 360 },
  draw(ctx, tx, ty) {
    ctx.fillStyle = '#888'; ctx.beginPath(); ctx.ellipse(tx,ty+2,5,2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#AAA'; ctx.fillRect(tx-1, ty-20, 2, 22);
    ctx.fillStyle = '#F5E08C';
    ctx.beginPath(); ctx.moveTo(tx-8,ty-18); ctx.lineTo(tx+8,ty-18); ctx.lineTo(tx+5,ty-26); ctx.lineTo(tx-5,ty-26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(245,224,140,0.15)';
    ctx.beginPath(); ctx.moveTo(tx-8,ty-18); ctx.lineTo(tx+8,ty-18); ctx.lineTo(tx+14,ty+4); ctx.lineTo(tx-14,ty+4); ctx.closePath(); ctx.fill();
  },
  adjacency_bonus: { type: 'happiness', value: 0.03 },
};
