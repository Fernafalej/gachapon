// data/characters/index.js – Registry: exportiert Array aller Figuren
import bear_tan from './bear_tan.js';
import bear_ocean from './bear_ocean.js';
import bunny_white from './bunny_white.js';
import bunny_yellow from './bunny_yellow.js';
import slime_blue from './slime_blue.js';
import slime_pink from './slime_pink.js';
import fox_red from './fox_red.js';
import fox_silver from './fox_silver.js';
import dragon_gold from './dragon_gold.js';

// Neue Figur hinzufügen:
// 1. Datei in data/characters/ anlegen (Schema siehe bear_ocean.js)
// 2. Hier importieren und ins Array einfügen
// Fertig!

export const allCharacters = [
  // Common (5)
  bear_tan,
  bunny_white,
  slime_blue,
  slime_pink,

  // Rare (3)
  bear_ocean,
  bunny_yellow,
  fox_red,

  // Super Rare (2)
  fox_silver,
  dragon_gold,
];
