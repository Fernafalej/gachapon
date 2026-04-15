// data/activities/gather_stone.js
export default {
  id: 'gather_stone',
  name: 'Steine sammeln',
  type: 'permanent',
  pose: 'hard_work',
  workers: { min: 1, max: 3 },
  duration_base: 2400,
  duration_scaling: 'sqrt',
  cost: null,
  output: { stone: 4 },
  unlocks: null,
  room_penalty: 0,
};
