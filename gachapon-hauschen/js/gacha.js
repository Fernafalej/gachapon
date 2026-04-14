// js/gacha.js – Zieh-Logik, Pity, Token-System
// Wird in Schritt 7 implementiert
import { getState, mutate } from './state.js';
import { getAllCharacters, getCharactersByRarity } from './characters.js';

const RATES = { common: 0.65, rare: 0.27, super_rare: 0.08 };
const PITY_THRESHOLD = 10;

/**
 * Einen Gacha-Zug ausführen
 */
export function draw(state) {
  state.gacha.pity_counter++;
  state.gacha.total_draws = (state.gacha.total_draws || 0) + 1;

  let rarity;
  if (state.gacha.pity_counter >= PITY_THRESHOLD) {
    // Pity: garantiert Rare+
    rarity = Math.random() < (RATES.super_rare / (RATES.rare + RATES.super_rare))
      ? 'super_rare' : 'rare';
    state.gacha.pity_counter = 0;
  } else {
    const r = Math.random();
    if (r < RATES.super_rare) {
      rarity = 'super_rare';
      state.gacha.pity_counter = 0;
    } else if (r < RATES.super_rare + RATES.rare) {
      rarity = 'rare';
      state.gacha.pity_counter = 0;
    } else {
      rarity = 'common';
    }
  }

  const pool = getCharactersByRarity(rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Free Roll (mindestens Rare)
 */
export function freeRollDraw() {
  const r = Math.random();
  const rarity = r < 0.08 ? 'super_rare' : 'rare';
  const pool = getCharactersByRarity(rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Duplikat verarbeiten → Scherben
 * Level-Kosten: 1 → 2 → 3 → 4 Scherben
 */
export function processDrawResult(state, char) {
  const id = char.id;
  if (!state.collection[id]) {
    state.collection[id] = { count: 1, level: 1, shards: 0 };
    return { type: 'new', char };
  }

  const entry = state.collection[id];
  entry.count++;
  entry.shards++;

  // Auto-Level-Up prüfen
  const shardCost = entry.level; // Level 1→2: 1 Shard, 2→3: 2, etc.
  if (entry.level < 5 && entry.shards >= shardCost) {
    entry.shards -= shardCost;
    entry.level++;
    return { type: 'levelup', char, newLevel: entry.level };
  }

  return { type: 'shard', char, shards: entry.shards };
}

/**
 * Token-Tabellen
 */
export const TOKEN_TABLES = {
  steps: [
    { amount: 2000,  label: '2.000 Schritte',  tokens: 1 },
    { amount: 4000,  label: '4.000 Schritte',  tokens: 2 },
    { amount: 6000,  label: '6.000 Schritte',  tokens: 3 },
    { amount: 10000, label: '10.000 Schritte', tokens: 5 },
  ],
  sport: [
    { amount: 10, label: '10 Minuten', tokens: 1 },
    { amount: 20, label: '20 Minuten', tokens: 2 },
    { amount: 45, label: '45 Minuten', tokens: 3 },
    { amount: 60, label: '60 Minuten', tokens: 4 },
  ],
  calories: [
    { amount: 250, label: '250 kcal Defizit', tokens: 1 },
    { amount: 500, label: '500 kcal Defizit', tokens: 2 },
    { amount: 750, label: '750 kcal Defizit', tokens: 3 },
  ],
};
