// data/activities/gather_wood.js
export default {
  id: 'gather_wood',
  name: 'Holz sammeln',
  type: 'permanent',
  pose: 'hard_work',
  workers: { min: 1, max: 3 },
  duration_base: 1800,
  duration_scaling: 'sqrt',
  cost: null,
  output: { wood: 5 },
  unlocks: null,
  room_penalty: 0,
};
