// data/activities/index.js
import build_room from './build_room.js?v=20260421k';
import gather_wood from './gather_wood.js?v=20260421k';
import gather_stone from './gather_stone.js?v=20260421k';
import farm_food from './farm_food.js?v=20260421k';
import weave from './weave.js?v=20260421k';
import research from './research.js?v=20260421k';

export const allActivities = [
  gather_wood,
  gather_stone,
  farm_food,
  weave,
  build_room,
  research,
];
