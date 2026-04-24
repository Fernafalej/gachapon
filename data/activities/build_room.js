// data/activities/build_room.js
export default {
  id: 'build_room',
  name: 'Zimmer anbauen',
  type: 'countdown',
  pose: 'hard_work',
  workers: { min: 1, max: 3 },
  duration_base: 900,
  duration_scaling: 'sqrt',
  cost: { wood: 20, stone: 10 },
  output: null,
  unlocks: 'room_slot',
  room_penalty: 0.20,
};
