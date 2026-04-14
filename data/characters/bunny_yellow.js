// data/characters/bunny_yellow.js
export default {
  id: 'bunny_yellow',
  species: 'bunny',
  name: 'Sonnen-Hase',
  rarity: 'rare',

  palette: {
    primary:  '#F5E08C',
    accent:   '#FFF3C0',
    detail1:  '#FFFFFF',
    detail2:  '#D4B84A',
  },

  poses: ['think', 'craft'],

  speech: {
    idle:    ['🌻', '☀️', '🍋', '💛'],
    working: ['✂️', '💡', '😊'],
    meeting: ['👋', '🌼', '💫'],
    levelup: ['✨', '🎉', '🌟'],
  },

  bonus: {
    type: 'output',
    value: 0.10,
    activatesAtLevel: 3,
  },
};
