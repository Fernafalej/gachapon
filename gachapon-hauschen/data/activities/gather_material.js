// data/activities/gather_material.js
export default {
  id: 'gather_material',
  name: 'Material sammeln',
  pose: 'hard_work',
  workers: { min: 1, max: 3 },
  duration_base: 1800,
  duration_scaling: 'sqrt',
  cost: null,
  output: { material: 5 },
  unlocks: null,
  room_penalty: 0,
};
