// data/activities/gather_stone.js
export default {
  id: 'gather_stone',
  name: 'Steine sammeln',
  type: 'permanent',
  pose: 'hard_work',
  workers: { min: 1, max: 3 },
  duration_base: 420,
  duration_scaling: 'linear',
  cost: null,
  output: { stone: 3 },
  unlocks: null,
  room_penalty: 0,
};
