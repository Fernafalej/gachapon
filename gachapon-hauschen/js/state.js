// js/state.js – Save/Load, localStorage-Wrapper
const STORAGE_KEY = 'gachapon_hauschen';
const CURRENT_VERSION = 1;

export function getDefaultState() {
  return {
    version: CURRENT_VERSION,
    last_seen: Math.floor(Date.now() / 1000),

    resources: {
      material: 0,
      ideas: 0,
      goods: 0,
    },

    gacha: {
      tokens: 5,  // Starter-Tokens damit man direkt spielen kann
      pity_counter: 0,
      free_roll_available: false,
      free_roll_last: 0,
      total_draws: 0,
    },

    collection: {
      // 'bear_ocean': { count: 1, level: 1, shards: 0 }
    },

    house: {
      rooms: 1,
      room_build_progress: null,
      placements: [],
    },

    activities: [],

    unlocked_recipes: [],

    token_history: [],
    // Jeder Eintrag: { type: 'steps'|'sport'|'calories', amount: 4000, tokens: 2, timestamp: 171400000 }

    settings: {
      auto_assign: false,
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();

    const parsed = JSON.parse(raw);

    // Version-Migration (für Zukunft)
    if (parsed.version < CURRENT_VERSION) {
      return migrateState(parsed);
    }

    return parsed;
  } catch (e) {
    console.warn('State konnte nicht geladen werden, starte neu:', e);
    return getDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('State konnte nicht gespeichert werden:', e);
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return getDefaultState();
}

function migrateState(oldState) {
  // Placeholder: Momentan keine Migration nötig.
  // Fehlende Felder mit Defaults auffüllen:
  const fresh = getDefaultState();
  const merged = { ...fresh, ...oldState, version: CURRENT_VERSION };

  // Verschachtelte Objekte einzeln mergen
  merged.resources = { ...fresh.resources, ...oldState.resources };
  merged.gacha = { ...fresh.gacha, ...oldState.gacha };
  merged.house = { ...fresh.house, ...oldState.house };
  merged.settings = { ...fresh.settings, ...oldState.settings };

  return merged;
}

// Singleton-State: wird in main.js initialisiert und überall importiert
let _state = null;

export function initState() {
  _state = loadState();
  return _state;
}

export function getState() {
  return _state;
}

export function mutate(fn) {
  fn(_state);
  saveState(_state);
}
