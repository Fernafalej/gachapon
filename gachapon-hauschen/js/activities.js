// js/activities.js – Tätigkeits-Loop, Offline-Progress
// Wird in Schritt 8 implementiert

/**
 * Offline-Progress berechnen und anwenden
 */
export function applyOfflineProgress(state) {
  const now = Math.floor(Date.now() / 1000);
  const delta = now - state.last_seen;

  for (const activity of state.activities) {
    const workers = activity.workers.length;
    if (workers === 0) continue;

    const efficiency = Math.sqrt(workers);
    const progress = delta * efficiency;
    activity.elapsed = (activity.elapsed || 0) + progress;

    while (activity.elapsed >= activity.duration) {
      activity.elapsed -= activity.duration;
      if (activity.output) {
        for (const [key, val] of Object.entries(activity.output)) {
          state.resources[key] = (state.resources[key] || 0) + val;
        }
      }
    }
  }

  state.last_seen = now;
}
