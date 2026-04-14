// js/activities.js – Tätigkeits-Loop, Offline-Progress, Worker-Zuweisung
import { allActivities } from '../data/activities/index.js';

const activityMap = {};
for (const a of allActivities) activityMap[a.id] = a;

export function getActivityDef(id) {
  return activityMap[id] || null;
}

export function getAllActivityDefs() {
  return allActivities;
}

/**
 * Effektive Dauer berechnen.
 * duration_base / sqrt(workers), ggf. mit room_penalty.
 */
export function calcDuration(actDef, workerCount, state) {
  let dur = actDef.duration_base / Math.sqrt(Math.max(1, workerCount));
  if (actDef.room_penalty && state && state.house) {
    const rooms = state.house.rooms || 1;
    dur *= Math.pow(1 + actDef.room_penalty, rooms - 1);
  }
  return Math.round(dur);
}

export function canAfford(actDef, state) {
  if (!actDef.cost) return true;
  for (const [res, amount] of Object.entries(actDef.cost)) {
    if ((state.resources[res] || 0) < amount) return false;
  }
  return true;
}

function payCost(actDef, state) {
  if (!actDef.cost) return;
  for (const [res, amount] of Object.entries(actDef.cost)) {
    state.resources[res] = (state.resources[res] || 0) - amount;
  }
}

/**
 * Aktivität starten. Gibt das neue Objekt zurück oder null.
 */
export function startActivity(state, activityId, workerIds) {
  const def = getActivityDef(activityId);
  if (!def) return null;
  if (workerIds.length < def.workers.min || workerIds.length > def.workers.max) return null;
  if (!canAfford(def, state)) return null;

  const busy = getBusyWorkers(state);
  for (const w of workerIds) {
    if (busy.has(w)) return null;
  }

  payCost(def, state);

  const duration = calcDuration(def, workerIds.length, state);
  const activity = {
    id: activityId,
    workers: workerIds,
    started: Math.floor(Date.now() / 1000),
    duration,
    elapsed: 0,
    output: def.output ? { ...def.output } : null,
    unlocks: def.unlocks || null,
  };

  state.activities.push(activity);
  return activity;
}

export function removeActivity(state, index) {
  if (index >= 0 && index < state.activities.length) {
    state.activities.splice(index, 1);
  }
}

/**
 * Offline-Progress: bei App-Start aufrufen.
 * Gibt Completion-Events zurück.
 */
export function applyOfflineProgress(state) {
  const now = Math.floor(Date.now() / 1000);
  const delta = now - (state.last_seen || now);
  const completions = [];

  for (let i = state.activities.length - 1; i >= 0; i--) {
    const activity = state.activities[i];
    if (activity.workers.length === 0) continue;

    activity.elapsed = (activity.elapsed || 0) + delta;

    let cycles = 0;
    while (activity.elapsed >= activity.duration) {
      activity.elapsed -= activity.duration;
      cycles++;

      if (activity.output) {
        for (const [key, val] of Object.entries(activity.output)) {
          state.resources[key] = (state.resources[key] || 0) + val;
        }
      }

      if (activity.unlocks === 'room_slot') {
        state.house.rooms = (state.house.rooms || 1) + 1;
        completions.push({ type: 'room_built', rooms: state.house.rooms });
        state.activities.splice(i, 1);
        break;
      }
    }

    if (cycles > 0 && activity.output) {
      completions.push({
        type: 'resources',
        activityId: activity.id,
        output: activity.output,
        cycles,
      });
    }
  }

  state.last_seen = now;
  return completions;
}

/**
 * Live-Check: abgeschlossene Aktivitäten auflösen.
 */
export function checkCompletions(state) {
  const now = Math.floor(Date.now() / 1000);
  const completions = [];

  for (let i = state.activities.length - 1; i >= 0; i--) {
    const activity = state.activities[i];
    const totalElapsed = (now - activity.started) + (activity.elapsed || 0);

    if (totalElapsed >= activity.duration) {
      if (activity.output) {
        for (const [key, val] of Object.entries(activity.output)) {
          state.resources[key] = (state.resources[key] || 0) + val;
        }
        completions.push({
          type: 'resources',
          activityId: activity.id,
          output: activity.output,
        });
      }

      if (activity.unlocks === 'room_slot') {
        state.house.rooms = (state.house.rooms || 1) + 1;
        completions.push({ type: 'room_built', rooms: state.house.rooms });
        state.activities.splice(i, 1);
      } else {
        // Repeatable: Timer neu starten
        activity.elapsed = 0;
        activity.started = now;
      }
    }
  }

  return completions;
}

export function getRemainingTime(activity) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = (now - activity.started) + (activity.elapsed || 0);
  return Math.max(0, activity.duration - elapsed);
}

export function getProgress(activity) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = (now - activity.started) + (activity.elapsed || 0);
  return Math.min(1, elapsed / activity.duration);
}

export function getBusyWorkers(state) {
  const busy = new Set();
  for (const act of state.activities) {
    for (const w of act.workers) busy.add(w);
  }
  return busy;
}

export function formatTime(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
