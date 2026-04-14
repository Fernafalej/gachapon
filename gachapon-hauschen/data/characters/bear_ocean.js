// data/characters/bear_ocean.js
export default {
  id: 'bear_ocean',
  species: 'bear',
  name: 'Ozean-Bär',
  rarity: 'rare',

  palette: {
    primary:  '#8AAFD4',
    accent:   '#BACAE8',
    detail1:  '#FFFFFF',
    detail2:  '#5A8AB0',
  },

  poses: ['hard_work', 'craft'],

  speech: {
    idle:    ['😴', '☁️', '🌊', '⭐'],
    working: ['💪', '😤', '🔨'],
    meeting: ['👋', '😊', '❤️'],
    levelup: ['✨', '🎉', '😍'],
  },

  bonus: {
    type: 'speed',
    value: 0.10,
    activatesAtLevel: 3,
  },
};
