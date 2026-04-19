// data/characters/fox_red.js
export default {
  id: 'fox_red',
  species: 'fox',
  name: 'Flammen-Fuchs',
  rarity: 'rare',

  palette: {
    primary:  '#D4784A',
    accent:   '#F0A878',
    detail1:  '#FFF8F0',
    detail2:  '#A85030',
  },

  poses: ['hard_work', 'think', 'craft'],

  speech: {
    idle:    ['🍂', '🔥', '🌙', '⭐'],
    working: ['💪', '🔥', '😤'],
    meeting: ['👋', '😏', '🍁'],
    levelup: ['✨', '🎉', '🦊'],
  },

  bonus: {
    type: 'speed',
    value: 0.08,
    activatesAtLevel: 3,
  },
};
