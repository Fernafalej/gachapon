// data/activities/weave.js
export default {
  id: 'weave',
  name: 'Weben',
  type: 'permanent',
  pose: 'craft',
  workers: { min: 1, max: 3 },
  duration_base: 600,
  duration_scaling: 'linear',
  cost: null,
  output: { fabric: 2 },
  unlocks: null,
  room_penalty: 0,
};
