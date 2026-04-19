import { allResearch } from '../data/research/index.js?v=20260419h';

const researchMap = Object.fromEntries(allResearch.map((entry) => [entry.id, entry]));

export function getAllResearchDefs() {
  return allResearch;
}

export function getResearchDef(id) {
  return researchMap[id] || null;
}

export function getUnlockedIds(state, type) {
  return state?.unlocks?.[type] || [];
}

export function isUnlocked(state, type, id) {
  return getUnlockedIds(state, type).includes(id);
}

export function canUnlockResearch(state, researchDef) {
  if (!researchDef) return false;
  if (isUnlocked(state, 'research', researchDef.id)) return false;
  return Math.floor(state?.research?.progress || 0) >= (researchDef.cost || 0);
}

export function applyResearchUnlock(state, researchId) {
  const researchDef = getResearchDef(researchId);
  if (!researchDef || !canUnlockResearch(state, researchDef)) return false;

  if (!state.unlocks) {
    state.unlocks = { furniture: [], research: [], features: [], room_types: [] };
  }

  state.research.progress -= researchDef.cost || 0;
  state.unlocks.research = [...new Set([...(state.unlocks.research || []), researchDef.id])];

  for (const unlock of researchDef.unlocks || []) {
    const current = state.unlocks[unlock.type] || [];
    state.unlocks[unlock.type] = [...new Set([...current, unlock.id])];
  }

  return true;
}
