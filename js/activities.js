// js/activities.js – Tätigkeits-Loop, Offline-Progress, Worker-Zuweisung
import { allActivities } from '../data/activities/index.js?v=20260421k';
import { getCharacter } from './characters.js?v=20260421i';

const activityMap = {};
for (const a of allActivities) activityMap[a.id] = a;
export const RESEARCH_POINTS_PER_RUN = 6;

export function getActivityDef(id) { return activityMap[id] || null; }
export function getAllActivityDefs() { return allActivities; }

export function calcDuration(actDef, workerCount, state, workerIds) {
  const safeWorkerCount = Math.max(1, workerCount);
  let dur = actDef.duration_base;
  if (actDef.duration_scaling === 'linear') {
    dur = dur / safeWorkerCount;
  } else {
    dur = dur / Math.sqrt(safeWorkerCount);
  }
  if (actDef.room_penalty && state && state.house) {
    const rooms = state.house.rooms || 1;
    dur *= Math.pow(1 + actDef.room_penalty, rooms - 1);
  }
  if (workerIds && workerIds.length > 0 && state) {
    let speedBonus = 0;
    for (const id of workerIds) {
      const char = getCharacter(id);
      const owned = state.collection?.[id];
      if (char?.bonus?.type === 'speed' && owned && owned.level >= char.bonus.activatesAtLevel)
        speedBonus += char.bonus.value;
    }
    if (speedBonus > 0) dur = dur / (1 + speedBonus);
  }
  return Math.round(dur);
}

export function canAfford(actDef, state) {
  if (!actDef.cost) return true;
  for (const [res, amount] of Object.entries(actDef.cost))
    if ((state.resources[res] || 0) < amount) return false;
  return true;
}

function payCost(actDef, state) {
  if (!actDef.cost) return;
  for (const [res, amount] of Object.entries(actDef.cost))
    state.resources[res] = (state.resources[res] || 0) - amount;
}

export function startActivity(state, activityId, workerIds) {
  const def = getActivityDef(activityId);
  if (!def) return null;
  if (workerIds.length < def.workers.min || workerIds.length > def.workers.max) return null;
  if (!canAfford(def, state)) return null;
  const busy = getBusyWorkers(state);
  for (const w of workerIds) if (busy.has(w)) return null;

  payCost(def, state);

  let outputMultiplier = 1;
  for (const id of workerIds) {
    const char = getCharacter(id);
    const owned = state.collection?.[id];
    if (char?.bonus?.type === 'output' && owned && owned.level >= char.bonus.activatesAtLevel)
      outputMultiplier += char.bonus.value;
  }
  const scaledOutput = def.output
    ? Object.fromEntries(Object.entries(def.output).map(([k, v]) => [k, Math.round(v * outputMultiplier)]))
    : null;

  const duration = calcDuration(def, workerIds.length, state, workerIds);
  const activity = {
    id: activityId, workers: workerIds,
    started: Math.floor(Date.now() / 1000),
    duration, elapsed: 0,
    output: scaledOutput,
    unlocks: def.unlocks || null,
  };
  state.activities.push(activity);
  return activity;
}

export function removeActivity(state, index) {
  if (index >= 0 && index < state.activities.length) state.activities.splice(index, 1);
}

// ---------------------------------------------------------------------------
// Rate-basierte Produktion
// ---------------------------------------------------------------------------

/** Produktionsrate einer Aktivität in Einheiten/Sekunde. { resource: perSec } */
export function getOutputRate(activity) {
  if (!activity.output || !activity.duration || activity.duration <= 0) return {};
  const rate = {};
  for (const [key, val] of Object.entries(activity.output)) rate[key] = val / activity.duration;
  return rate;
}

/** Summierte Rate aller laufenden Aktivitäten in Einheiten/Sekunde. */
export function getTotalProductionRates(state) {
  const rates = {};
  for (const act of state.activities) {
    if (!act.output) continue;
    for (const [key, perSec] of Object.entries(getOutputRate(act)))
      rates[key] = (rates[key] || 0) + perSec;
  }
  return rates;
}

/** Rate als lesbaren String. Werte in diesem Spiel sind klein → /min. */
export function formatRate(perSec) {
  const perMinute = perSec * 60;
  if (perMinute === 0) return '';
  return perMinute >= 10 ? `+${Math.round(perMinute)}/min` : `+${perMinute.toFixed(1)}/min`;
}

export function startFurnitureBuild(state, furnitureDef, placement, workerIds) {
  if (!furnitureDef?.craft || !placement) return null;
  if (!workerIds || workerIds.length < 1) return null;
  const busy = getBusyWorkers(state);
  for (const workerId of workerIds) if (busy.has(workerId)) return null;

  for (const [res, amount] of Object.entries(furnitureDef.craft.cost || {})) {
    if ((state.resources[res] || 0) < amount) return null;
  }

  for (const [res, amount] of Object.entries(furnitureDef.craft.cost || {})) {
    state.resources[res] = (state.resources[res] || 0) - amount;
  }

  const activity = {
    id: 'craft_furniture',
    workers: workerIds,
    started: Math.floor(Date.now() / 1000),
    duration: Math.round(furnitureDef.craft.duration || 300),
    elapsed: 0,
    output: null,
    unlocks: 'furniture_build',
    build: {
      furniture_id: furnitureDef.id,
      furniture_name: furnitureDef.name || furnitureDef.id,
      room: placement.room || 0,
      tx: placement.tx,
      ty: placement.ty,
    },
  };
  state.activities.push(activity);
  return activity;
}

function finishActivity(state, activity, completions) {
  if (activity.unlocks === 'room_slot') {
    state.house.rooms = (state.house.rooms || 1) + 1;
    completions.push({ type: 'room_built', rooms: state.house.rooms });
    return true;
  }

  if (activity.unlocks === 'research_progress') {
    if (!state.research) state.research = { progress: 0 };
    state.research.progress = (state.research.progress || 0) + RESEARCH_POINTS_PER_RUN;
    completions.push({ type: 'research_progress', progress: state.research.progress, amount: RESEARCH_POINTS_PER_RUN });
    return true;
  }

  if (activity.unlocks === 'furniture_build' && activity.build) {
    const placement = {
      room: activity.build.room || 0,
      furniture_id: activity.build.furniture_id,
      tx: activity.build.tx,
      ty: activity.build.ty,
    };
    state.house.placements.push(placement);
    completions.push({
      type: 'furniture_built',
      furnitureId: activity.build.furniture_id,
      furnitureName: activity.build.furniture_name || activity.build.furniture_id,
    });
    return true;
  }

  return false;
}

/**
 * Sekunden-Tick: Ressourcen kontinuierlich ansammeln.
 * Bruchteils-Akkumulator (_acc) verhindert Verlust sub-ganzzahliger Mengen.
 * _acc wird nicht persistiert – max. ~1 Einheit bei App-Neustart verloren.
 */
export function applyTick(state, dt = 1) {
  for (const activity of state.activities) {
    const def = activityMap[activity.id];
    if (def?.type === 'countdown') continue; // countdown-Jobs ticken nicht
    if (!activity.output || activity.workers.length === 0) continue;
    const rate = getOutputRate(activity);
    for (const [key, perSec] of Object.entries(rate)) {
      state.resources[key] = (state.resources[key] || 0) + perSec * dt;
    }
  }
}

// ---------------------------------------------------------------------------
// Offline-Progress
// ---------------------------------------------------------------------------

/**
 * Ressourcen-Aktivitäten: rate × delta (kontinuierlich, kein Cycle-Overhead).
 * Room-Slot-Aktivitäten: klassisch elapsed-basiert.
 */
export function applyOfflineProgress(state) {
  const now = Math.floor(Date.now() / 1000);
  const delta = now - (state.last_seen || now);
  const completions = [];

  for (let i = state.activities.length - 1; i >= 0; i--) {
    const activity = state.activities[i];
    if (activity.workers.length === 0) continue;
    const def = activityMap[activity.id];

    if (def?.type !== 'countdown' && activity.output) {
      // Permanent-Job: rate × delta
      const earned = {};
      for (const [key, perSec] of Object.entries(getOutputRate(activity))) {
        const amount = perSec * delta;
        if (amount > 0) {
          state.resources[key] = (state.resources[key] || 0) + amount;
          earned[key] = Math.round(amount * 10) / 10;
        }
      }
      if (Object.keys(earned).length > 0)
        completions.push({ type: 'resources', activityId: activity.id, output: earned });
    }

    if (activity.unlocks === 'room_slot') {
      activity.elapsed = (activity.elapsed || 0) + delta;
      if (activity.elapsed >= activity.duration && finishActivity(state, activity, completions)) {
        state.activities.splice(i, 1);
      }
    } else if (activity.unlocks === 'research_progress' || activity.unlocks === 'furniture_build') {
      activity.elapsed = (activity.elapsed || 0) + delta;
      if (activity.elapsed >= activity.duration && finishActivity(state, activity, completions)) {
        state.activities.splice(i, 1);
      }
    }
  }

  state.last_seen = now;
  return completions;
}

// ---------------------------------------------------------------------------
// Live-Checks (nur noch room_slot)
// ---------------------------------------------------------------------------

export function checkCompletions(state) {
  const now = Math.floor(Date.now() / 1000);
  const completions = [];
  for (let i = state.activities.length - 1; i >= 0; i--) {
    const activity = state.activities[i];
    if (activity.unlocks !== 'room_slot' && activity.unlocks !== 'research_progress' && activity.unlocks !== 'furniture_build') continue;
    const elapsed = (now - activity.started) + (activity.elapsed || 0);
    if (elapsed >= activity.duration) {
      if (finishActivity(state, activity, completions)) {
        state.activities.splice(i, 1);
      }
    }
  }
  return completions;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

export function getRemainingTime(activity) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = (now - activity.started) + (activity.elapsed || 0);
  return Math.max(0, activity.duration - elapsed);
}

export function getProgress(activity) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = (now - activity.started) + (activity.elapsed || 0);
  // Ressourcen-Aktivitäten: zyklischer Fortschritt (loopt optisch)
  if (activity.output) return (elapsed % activity.duration) / activity.duration;
  return Math.min(1, elapsed / activity.duration);
}

export function getBusyWorkers(state) {
  const busy = new Set();
  for (const act of state.activities)
    for (const w of act.workers) busy.add(w);
  return busy;
}

export function formatTime(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
