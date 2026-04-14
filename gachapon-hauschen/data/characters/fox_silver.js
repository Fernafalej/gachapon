// data/characters/fox_silver.js
export default {
  id: 'fox_silver',
  species: 'fox',
  name: 'Silber-Fuchs',
  rarity: 'super_rare',

  palette: {
    primary:  '#B8C0CC',
    accent:   '#D8DDE6',
    detail1:  '#FFFFFF',
    detail2:  '#8890A0',
  },

  poses: ['hard_work', 'think', 'craft'],

  speech: {
    idle:    ['🌙', '✨', '❄️', '💎'],
    working: ['⚡', '🔨', '💪'],
    meeting: ['👋', '🌟', '💜'],
    levelup: ['✨', '🎉', '👑'],
  },

  bonus: {
    type: 'output',
    value: 0.15,
    activatesAtLevel: 3,
  },
};
