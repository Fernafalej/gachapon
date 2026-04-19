// data/characters/dragon_gold.js
export default {
  id: 'dragon_gold',
  species: 'dragon',
  name: 'Gold-Drache',
  rarity: 'super_rare',

  palette: {
    primary:  '#E8C840',
    accent:   '#FFF0A0',
    detail1:  '#FFFFFF',
    detail2:  '#B89820',
  },

  poses: ['hard_work', 'think', 'craft'],

  speech: {
    idle:    ['💰', '🔥', '👑', '⭐'],
    working: ['🔥', '💪', '⚒️'],
    meeting: ['👋', '✨', '🐉'],
    levelup: ['✨', '🎉', '👑'],
  },

  bonus: {
    type: 'speed',
    value: 0.20,
    activatesAtLevel: 3,
  },
};
