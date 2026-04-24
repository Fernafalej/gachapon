// data/activities/farm_food.js
export default {
  id: 'farm_food',
  name: 'Nahrung anbauen',
  type: 'permanent',
  pose: 'hard_work',
  workers: { min: 1, max: 3 },
  duration_base: 360,
  duration_scaling: 'linear',
  cost: null,
  output: { food: 2 },
  unlocks: null,
  room_penalty: 0,
};
