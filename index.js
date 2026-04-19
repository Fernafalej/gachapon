// data/activities/index.js
import build_room    from './build_room.js';
import gather_wood   from './gather_wood.js';
import gather_stone  from './gather_stone.js';
import farm_food     from './farm_food.js';
import weave         from './weave.js';
import research      from './research.js';

export const allActivities = [
  gather_wood,
  gather_stone,
  farm_food,
  weave,
  build_room,
  research,
];
