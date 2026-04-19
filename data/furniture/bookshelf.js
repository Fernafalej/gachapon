import { isoColors } from '../characters/species/_helpers.js';
export default {
  id: 'bookshelf', name: 'Bücherregal', size: { w: 2, d: 1 },
  buy: { cost: { wood: 16, fabric: 4 } },
  craft: { cost: { wood: 12, fabric: 5 }, duration: 900 },
  draw(ctx, tx, ty) {
    const c = isoColors('#A07850');
    ctx.fillStyle = c.left; ctx.fillRect(tx-12, ty-24, 4, 28); ctx.fillRect(tx+8, ty-24, 4, 28);
    ctx.fillStyle = c.top;
    for (let i=0;i<3;i++) ctx.fillRect(tx-12, ty-6-i*9, 24, 3);
    const colors = ['#D47A7A','#7AAAD4','#A0D47A','#D4C07A'];
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) { ctx.fillStyle = colors[(i+j)%4]; ctx.fillRect(tx-8+j*6, ty-14-i*9, 4, 7); }
  },
  adjacency_bonus: { type: 'happiness', value: 0.03 },
};
