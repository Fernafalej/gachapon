// js/characters.js – Character-Registry, Species-Loader
import { allCharacters } from '../data/characters/index.js?v=20260419g';
import bearDraw from '../data/characters/species/bear.js?v=20260419g';
import bunnyDraw from '../data/characters/species/bunny.js?v=20260419g';
import slimeDraw from '../data/characters/species/slime.js?v=20260419g';
import foxDraw from '../data/characters/species/fox.js?v=20260419g';
import dragonDraw from '../data/characters/species/dragon.js?v=20260419g';

const speciesDrawMap = {
  bear:   bearDraw,
  bunny:  bunnyDraw,
  slime:  slimeDraw,
  fox:    foxDraw,
  dragon: dragonDraw,
};

// Charakter-Map für schnellen Zugriff
const characterMap = new Map();
for (const char of allCharacters) {
  characterMap.set(char.id, char);
}

/**
 * Alle registrierten Figuren
 */
export function getAllCharacters() {
  return allCharacters;
}

/**
 * Figur per ID holen
 */
export function getCharacter(id) {
  return characterMap.get(id) || null;
}

/**
 * Figuren einer bestimmten Seltenheit
 */
export function getCharactersByRarity(rarity) {
  return allCharacters.filter(c => c.rarity === rarity);
}

/**
 * Draw-Bibliothek für eine Spezies holen
 */
export function getSpeciesDraw(species) {
  return speciesDrawMap[species] || null;
}

/**
 * Eine bestimmte Pose für eine Figur zeichnen.
 * Fallback auf work_default wenn die Figur die Pose nicht hat.
 */
export function drawCharacter(ctx, char, pose, x, y, t, dir) {
  const draw = speciesDrawMap[char.species];
  if (!draw) return;

  const palette = char.palette;

  // Standard-Posen
  if (pose === 'idle') {
    draw.idle(ctx, x, y, t, palette);
    return;
  }
  if (pose === 'walk') {
    draw.walk(ctx, x, y, t, dir || 0, palette);
    return;
  }

  // Arbeitsposen
  if (draw.poses && draw.poses[pose] && char.poses && char.poses.includes(pose)) {
    draw.poses[pose](ctx, x, y, t, palette);
    return;
  }

  // Fallback
  draw.work_default(ctx, x, y, t, palette);
}

/**
 * Anzahl aller einzigartigen Figuren
 */
export function getTotalCharacterCount() {
  return allCharacters.length;
}
