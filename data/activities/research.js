// data/activities/research.js
export default {
  id: 'research',
  name: 'Forschen',
  type: 'countdown',
  pose: 'think',
  workers: { min: 1, max: 2 },
  duration_base: 2400,
  duration_scaling: 'sqrt',
  cost: null,
  output: null,
  unlocks: 'research_progress',
  room_penalty: 0,
};
