// js/state.js - Save/Load, localStorage wrapper
const STORAGE_KEY = 'gachapon_hauschen';
const CURRENT_VERSION = 4;

export function getDefaultState() {
  return {
    version: CURRENT_VERSION,
    last_seen: Math.floor(Date.now() / 1000),

    resources: {
      wood: 0,
      stone: 0,
      food: 0,
      fabric: 0,
    },

    research: {
      progress: 0,
    },

    gacha: {
      tokens: 0,
      pity_counter: 0,
      free_roll_available: true,
      free_roll_last: 0,
      total_draws: 0,
    },

    collection: {},

    house: {
      rooms: 1,
      room_build_progress: null,
      placements: [],
    },

    activities: [],

    unlocks: {
      furniture: [],
      research: [],
      features: [],
      room_types: [],
    },

    token_history: [],

    settings: {
      auto_assign: false,
    },

    ui: {
      alpha_panel_dismissed: false,
      house_view: 'inside',
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

    return migrateState(parsed);
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

  if ((oldState.version || 1) < 2) {
    const oldRes = oldState.resources || {};
    oldState.resources = {
      wood: oldRes.material || 0,
      stone: 0,
      food: 0,
      fabric: oldRes.goods || 0,
    };
    oldState.research = {
      progress: Math.min(100, (oldRes.ideas || 0) * 5),
      ...(oldState.research || {}),
    };

    if (Array.isArray(oldState.activities)) {
      for (const act of oldState.activities) {
        if (act.output) {
          if ('material' in act.output) {
            act.output.wood = act.output.material;
            delete act.output.material;
          }
          if ('goods' in act.output) {
            act.output.fabric = act.output.goods;
            delete act.output.goods;
          }
          if ('ideas' in act.output) {
            delete act.output.ideas;
          }
        }
        if (act.id === 'gather_material') act.id = 'gather_wood';
        if (act.id === 'think') act.id = 'research';
        if (act.id === 'craft') act.id = 'weave';
      }
    }
    oldState.version = 2;
  }

  if ((oldState.version || 2) < 3) {
    oldState.version = 3;
  }

  if ((oldState.version || 3) < 4) {
    oldState.version = 4;
  }

  const merged = { ...fresh, ...oldState, version: CURRENT_VERSION };
  merged.resources = { ...fresh.resources, ...oldState.resources };
  merged.research = { ...fresh.research, ...oldState.research };
  merged.gacha = { ...fresh.gacha, ...oldState.gacha };
  merged.house = { ...fresh.house, ...oldState.house };
  merged.settings = { ...fresh.settings, ...oldState.settings };
  merged.ui = { ...fresh.ui, ...oldState.ui };
  merged.unlocks = {
    ...fresh.unlocks,
    ...oldState.unlocks,
    furniture: [
      ...new Set([
        ...(oldState.unlocks?.furniture || []),
        ...(oldState.unlocked_recipes || []),
        ...(oldState.research?.unlocked || []),
      ]),
    ],
    research: [...new Set(oldState.unlocks?.research || [])],
    features: [...new Set(oldState.unlocks?.features || [])],
    room_types: [...new Set(oldState.unlocks?.room_types || [])],
  };

  delete merged.unlocked_recipes;
  if (merged.research) {
    delete merged.research.unlocked;
  }

  return merged;
}

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
