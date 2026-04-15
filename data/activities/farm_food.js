// data/activities/farm_food.js
export default {
  id: 'farm_food',
  name: 'Nahrung anbauen',
  type: 'permanent',
  pose: 'hard_work',
  workers: { min: 1, max: 2 },
  duration_base: 2700,
  duration_scaling: 'sqrt',
  cost: null,
  output: { food: 3 },
  unlocks: null,
  room_penalty: 0,
};
