// data/activities/build_room.js
export default {
  id: 'build_room',
  name: 'Zimmer anbauen',
  pose: 'hard_work',
  workers: { min: 1, max: 4 },
  duration_base: 3600,
  duration_scaling: 'sqrt',
  cost: { material: 20 },
  output: null,
  unlocks: 'room_slot',
  room_penalty: 0.20,
};
