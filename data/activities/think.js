// data/activities/think.js
export default {
  id: 'think',
  name: 'Nachdenken',
  pose: 'think',
  workers: { min: 1, max: 2 },
  duration_base: 2400,
  duration_scaling: 'sqrt',
  cost: null,
  output: { ideas: 3 },
  unlocks: null,
  room_penalty: 0,
};
