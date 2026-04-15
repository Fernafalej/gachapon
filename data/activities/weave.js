// data/activities/weave.js
export default {
  id: 'weave',
  name: 'Weben',
  type: 'permanent',
  pose: 'craft',
  workers: { min: 1, max: 3 },
  duration_base: 3600,
  duration_scaling: 'sqrt',
  cost: null,
  output: { fabric: 3 },
  unlocks: null,
  room_penalty: 0,
};
