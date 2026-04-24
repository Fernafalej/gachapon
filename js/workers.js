import { getCharacter, getBaseCharacterId } from './characters.js?v=20260421i';
import { getActivityDef } from './activities.js?v=20260421k';

const IDLE_LOCATION_WINDOW_MS = 5 * 60 * 1000;

function hashWorkerKey(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function getOwnedWorkerIds(state) {
  return Object.keys(state?.collection || {});
}

export function getWorkerInfo(state, workerId) {
  const char = getCharacter(workerId);
  if (!char) return null;

  const characterId = getBaseCharacterId(workerId);
  const owned = state?.collection?.[characterId] || null;

  return {
    id: characterId,
    characterId,
    char,
    owned,
    displayName: char.name,
    renderChar: {
      ...char,
      id: characterId,
      name: char.name,
    },
  };
}

export function getOwnedWorkers(state) {
  return getOwnedWorkerIds(state)
    .map((workerId) => getWorkerInfo(state, workerId))
    .filter(Boolean);
}

export function getWorkerDisplayName(state, workerId) {
  return getWorkerInfo(state, workerId)?.displayName || getCharacter(workerId)?.name || workerId;
}

export function getWorkerAssignment(state, workerId) {
  const normalizedId = getBaseCharacterId(workerId);
  const activityIndex = (state?.activities || []).findIndex((activity) => (activity.workers || []).includes(normalizedId));
  if (activityIndex < 0) return null;
  const activity = state.activities[activityIndex];
  return {
    activityIndex,
    activity,
  };
}

export function shouldWorkerSpendIdleTimeOutside(workerId, nowMs = Date.now()) {
  const normalizedId = getBaseCharacterId(workerId);
  const windowBucket = Math.floor(nowMs / IDLE_LOCATION_WINDOW_MS);
  return (hashWorkerKey(`${normalizedId}:${windowBucket}`) % 100) < 50;
}

export function normalizeStateWorkers(state) {
  if (!state || !Array.isArray(state.activities)) return false;

  let changed = false;
  const seenWorkers = new Set();
  const nextActivities = [];

  for (const activity of state.activities) {
    const def = getActivityDef(activity.id);
    const maxWorkers = def?.workers?.max || 1;
    const normalizedWorkers = [];
    for (const workerId of activity.workers || []) {
      const normalizedId = getBaseCharacterId(workerId);
      if (!normalizedId || !state.collection?.[normalizedId] || seenWorkers.has(normalizedId)) {
        changed = true;
        continue;
      }
      if (normalizedWorkers.length >= maxWorkers) {
        changed = true;
        continue;
      }
      seenWorkers.add(normalizedId);
      normalizedWorkers.push(normalizedId);
      if (normalizedId !== workerId) changed = true;
    }

    if (normalizedWorkers.length === 0) {
      changed = true;
      continue;
    }

    activity.workers = normalizedWorkers;
    nextActivities.push(activity);
  }

  if (changed) state.activities = nextActivities;
  return changed;
}
