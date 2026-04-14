// data/activities/craft.js
export default {
  id: 'craft',
  name: 'Handwerk',
  pose: 'craft',
  workers: { min: 1, max: 3 },
  duration_base: 2100,
  duration_scaling: 'sqrt',
  cost: { material: 3 },
  output: { goods: 4 },
  unlocks: null,
  room_penalty: 0,
};
