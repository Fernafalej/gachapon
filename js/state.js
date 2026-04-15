// js/state.js – Save/Load, localStorage-Wrapper
const STORAGE_KEY = 'gachapon_hauschen';
const CURRENT_VERSION = 2;

export function getDefaultState() {
  return {
    version: CURRENT_VERSION,
    last_seen: Math.floor(Date.now() / 1000),

    resources: {
      wood:   0,  // 🪵 Holz    – Bauen, Holzmöbel
      stone:  0,  // 🪨 Stein   – Bauen, stabile Möbel
      food:   0,  // 🍞 Nahrung – Figuren-Zufriedenheit (später)
      fabric: 0,  // 🧵 Stoff   – weiche Möbel, Dekoration
    },

    research: {
      progress: 0,    // 0–100 Float
      unlocked: [],   // freigeschaltete Forschungs-IDs
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

    if ((parsed.version || 1) < CURRENT_VERSION) {
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
  const fresh = getDefaultState();

  // v1 → v2: Ressourcen umbenennen
  if ((oldState.version || 1) < 2) {
    const oldRes = oldState.resources || {};
    oldState.resources = {
      wood:   oldRes.material || 0,
      stone:  0,
      food:   0,
      fabric: oldRes.goods   || 0,
    };
    // ideas entfallen – in research.progress umrechnen (grobe Annäherung)
    oldState.research = {
      progress: Math.min(100, (oldRes.ideas || 0) * 5),
      unlocked: [],
    };
    // Aktivitäten: alte Output-Keys migrieren
    if (Array.isArray(oldState.activities)) {
      for (const act of oldState.activities) {
        if (act.output) {
          if ('material' in act.output) { act.output.wood = act.output.material; delete act.output.material; }
          if ('goods'    in act.output) { act.output.fabric = act.output.goods;  delete act.output.goods;    }
          if ('ideas'    in act.output) { delete act.output.ideas; }
        }
        // Alte Aktivitäts-IDs umbiegen
        if (act.id === 'gather_material') act.id = 'gather_wood';
        if (act.id === 'think')           act.id = 'research';
        if (act.id === 'craft')           act.id = 'weave';
      }
    }
    oldState.version = 2;
  }

  // Verschachtelte Objekte sicher mergen
  const merged = { ...fresh, ...oldState, version: CURRENT_VERSION };
  merged.resources = { ...fresh.resources, ...oldState.resources };
  merged.research  = { ...fresh.research,  ...oldState.research  };
  merged.gacha     = { ...fresh.gacha,     ...oldState.gacha     };
  merged.house     = { ...fresh.house,     ...oldState.house     };
  merged.settings  = { ...fresh.settings,  ...oldState.settings  };

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
