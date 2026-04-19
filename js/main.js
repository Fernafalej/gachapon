// js/main.js – App-Init, Screen-Routing, Gacha + Activity Wiring
import { initState, getState, mutate, resetState, saveState } from './state.js?v=20260419g';
import { initUI, switchScreen, setOnScreenChange, getCurrentScreen, updateResourceBar, openModal, closeModal, showConfirm } from './ui.js?v=20260419g';
import { getAllCharacters, getCharacter, getSpeciesDraw, drawCharacter, getTotalCharacterCount, getCharactersByRarity } from './characters.js?v=20260419g';
import { initRoom, updateRoom, renderRoom, initRoomControls, setOnTileTap, setFurniture, findFurnitureAt, GRID, getSprites, getSpriteScreenPos } from './room.js?v=20260419g';
import { draw, freeRollDraw, processDrawResult, TOKEN_TABLES } from './gacha.js?v=20260419g';
import {
  applyOfflineProgress, checkCompletions, getAllActivityDefs, getActivityDef,
  startActivity, removeActivity, getBusyWorkers, calcDuration, canAfford,
  getRemainingTime, getProgress, formatTime,
  applyTick, getOutputRate, getTotalProductionRates, formatRate, startFurnitureBuild, RESEARCH_POINTS_PER_RUN
} from './activities.js?v=20260419g';
import { allFurniture } from '../data/furniture/index.js?v=20260419g';
import {
  getAllResearchDefs,
  getUnlockedIds,
  canUnlockResearch,
  applyResearchUnlock,
} from './research.js?v=20260419h';
import {
  sfxCoin, sfxRattle, sfxWobble, sfxCharge, sfxBurst,
  sfxRevealCommon, sfxRevealRare, sfxRevealSuperRare,
  sfxNewChar, sfxLevelUp, sfxTap
} from './sfx.js?v=20260419g';

// ---- Möbel-Lookup ----
const furnitureMap = {};
for (const f of allFurniture) furnitureMap[f.id] = f;
const RES_ICONS = { wood: '🪵', stone: '🪨', food: '🍞', fabric: '🧵' };

// ---- Room Management ----
let currentRoomIndex = 0;
let placingFurnitureMode = false;
let outsideAnimId = null;
const OUTSIDE_ACTIVITY_IDS = ['gather_wood', 'gather_stone', 'farm_food'];
const OUTSIDE_STATION_CONFIG = {
  gather_wood: {
    id: 'bamboo-grove',
    icon: '🎋',
    title: 'Bambushain',
    hint: 'Holzproduktion läuft draußen zwischen Bambus und Werkzeugkisten.',
    sceneX: 20,
    sceneY: 31,
    accent: 'grove',
    slots: [
      { x: 18, y: 54 },
      { x: 28, y: 58 },
      { x: 24, y: 44 },
    ],
  },
  gather_stone: {
    id: 'stone-yard',
    icon: '🪨',
    title: 'Steinplatz',
    hint: 'Ein robuster Außen-Spot für Stein und spätere Aufwertungen.',
    sceneX: 72,
    sceneY: 36,
    accent: 'stone',
    slots: [
      { x: 68, y: 58 },
      { x: 79, y: 54 },
      { x: 74, y: 45 },
    ],
  },
  farm_food: {
    id: 'garden-bed',
    icon: '🌱',
    title: 'Beet',
    hint: 'Nahrung wächst jetzt sichtbar draußen im Gartenbereich.',
    sceneX: 48,
    sceneY: 71,
    accent: 'garden',
    slots: [
      { x: 42, y: 82 },
      { x: 52, y: 86 },
      { x: 59, y: 79 },
    ],
  },
};
const OUTSIDE_IDLE_SLOTS = [
  { x: 10, y: 74 },
  { x: 24, y: 87 },
  { x: 50, y: 89 },
  { x: 76, y: 79 },
  { x: 90, y: 71 },
];

// ---- App Start ----
const state = initState();

// Offline-Progress anwenden
const offlineCompletions = applyOfflineProgress(state);
checkFreeRoll(state);
saveState(state);

// UI initialisieren
initUI();
updateResourceBar();
updateResearchUI();
renderAlphaPanel();
renderHouseView();

// ---- Canvas-Setup ----
const canvas = document.getElementById('room-canvas');
const ctx = canvas.getContext('2d');
let animationId = null;
let layoutReady = false;
const debugPanel = document.getElementById('debug-panel');
const DEBUG_MODE = new URLSearchParams(window.location.search).has('debug');

function setDebugPanel(lines, isError = false) {
  if (!debugPanel) return;
  if (!DEBUG_MODE && !isError) {
    debugPanel.classList.add('hidden');
    return;
  }
  debugPanel.textContent = Array.isArray(lines) ? lines.join('\n') : String(lines);
  debugPanel.classList.remove('hidden');
  debugPanel.style.background = isError ? 'rgba(160, 35, 35, 0.92)' : 'rgba(74, 55, 40, 0.88)';
}

window.addEventListener('error', (event) => {
  setDebugPanel(`JS error:\n${event?.error?.stack || event?.message || 'unknown error'}`, true);
});

window.addEventListener('unhandledrejection', (event) => {
  setDebugPanel(`Promise error:\n${event?.reason?.stack || event?.reason || 'unknown rejection'}`, true);
});

function resizeCanvas() {
  const container = document.getElementById('screen-house');
  if (!container) return false;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return false;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layoutReady = true;
  setDebugPanel([
    'room debug',
    `container: ${width}x${height}`,
    `canvas: ${canvas.width}x${canvas.height}`,
    `dpr: ${dpr}`,
    `layoutReady: ${layoutReady}`,
  ]);
  return true;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    resizeCanvas();
  }).observe(document.getElementById('screen-house'));
}
initRoomControls(canvas);

// ---- Möbel ----
function buildFurnitureForRoom(placements) {
  return placements.map(p => {
    const def = furnitureMap[p.furniture_id];
    if (!def || !def.draw) return null;
    return {
      tx: p.tx, ty: p.ty,
      size: def.size || { w: 1, d: 1 },
      draw: def.draw, id: def.id,
      flat: def.id === 'rug',
    };
  }).filter(Boolean);
}

function drawConstructionPlaceholder(ctx, tx, ty, furnitureDef) {
  const w = (furnitureDef?.size?.w || 1) * 18 + 16;
  const h = (furnitureDef?.size?.d || 1) * 10 + 12;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(255, 246, 223, 0.92)';
  ctx.beginPath();
  ctx.moveTo(tx, ty - h / 2);
  ctx.lineTo(tx + w / 2, ty);
  ctx.lineTo(tx, ty + h / 2);
  ctx.lineTo(tx - w / 2, ty);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(146, 103, 52, 0.32)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = '#C5873E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(tx - w / 3, ty - h / 5);
  ctx.lineTo(tx + w / 3, ty + h / 5);
  ctx.moveTo(tx - w / 3, ty + h / 5);
  ctx.lineTo(tx + w / 3, ty - h / 5);
  ctx.stroke();

  ctx.fillStyle = '#8A5B2C';
  ctx.fillRect(tx - 2, ty - h / 2 - 18, 4, 18);
  ctx.fillStyle = '#F3C96B';
  ctx.beginPath();
  ctx.moveTo(tx - 12, ty - h / 2 - 18);
  ctx.lineTo(tx + 12, ty - h / 2 - 18);
  ctx.lineTo(tx + 8, ty - h / 2 - 28);
  ctx.lineTo(tx - 8, ty - h / 2 - 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getResearchPoints(state = getState()) {
  return Math.floor(state?.research?.progress || 0);
}

function getAvailableBuilders(state = getState()) {
  const busy = getBusyWorkers(state);
  return Object.keys(state.collection || {})
    .map((id) => getCharacter(id))
    .filter(Boolean)
    .filter((char) => !busy.has(char.id))
    .sort((a, b) => {
      const aCraft = a.poses?.includes('craft') ? 1 : 0;
      const bCraft = b.poses?.includes('craft') ? 1 : 0;
      return bCraft - aCraft || a.name.localeCompare(b.name);
    });
}

function getPendingFurnitureBuilds(state = getState()) {
  return (state.activities || []).filter((activity) => activity.unlocks === 'furniture_build' && activity.build);
}

function findPendingFurnitureBuildAt(tx, ty, state = getState()) {
  for (const pending of getPendingFurnitureBuilds(state)) {
    const build = pending.build;
    if ((build.room || 0) !== currentRoomIndex) continue;
    const def = furnitureMap[build.furniture_id];
    if (!def) continue;
    const size = def.size || { w: 1, d: 1 };
    if (tx >= build.tx && tx < build.tx + size.w &&
        ty >= build.ty && ty < build.ty + size.d) {
      return pending;
    }
  }
  return null;
}

function getRecipeResearchDef(furnitureId) {
  return getAllResearchDefs().find((entry) =>
    (entry.unlocks || []).some((unlock) => unlock.type === 'furniture' && unlock.id === furnitureId)
  ) || null;
}

function updateResearchUI() {
  const countEl = document.getElementById('research-point-count');
  if (countEl) countEl.textContent = getResearchPoints();
}

function getDemoPlacementsForRoom0() {
  return [
    { room: 0, furniture_id: 'rug',          tx: 2, ty: 2 },
    { room: 0, furniture_id: 'wooden_table', tx: 1, ty: 0 },
    { room: 0, furniture_id: 'cozy_chair',   tx: 0, ty: 2 },
    { room: 0, furniture_id: 'plant',        tx: 5, ty: 0 },
    { room: 0, furniture_id: 'bookshelf',    tx: 0, ty: 4 },
    { room: 0, furniture_id: 'lamp',         tx: 5, ty: 5 },
    { room: 0, furniture_id: 'bed',          tx: 4, ty: 0 },
  ];
}

/**
 * Seed demo furniture into state so it can be managed (removed/replaced) normally.
 * Only runs once – when room 0 has zero placements.
 */
function seedDemoFurniture() {
  return;
}

// ---- Raum-Setup ----
function setupRoom(roomIndex) {
  if (roomIndex !== undefined) currentRoomIndex = roomIndex;
  const s = getState();
  const collected = Object.keys(s.collection);
  const busySet = getBusyWorkers(s);
  let chars;
  if (collected.length > 0) {
    chars = collected
      .map(id => getCharacter(id))
      .filter(c => c && !busySet.has(c.id));
    // Fallback: if everyone is busy, show them all anyway (working pose handled later)
    if (chars.length === 0) {
      chars = collected.map(id => getCharacter(id)).filter(Boolean);
    }
  } else {
    chars = [];
  }

  // Always build furniture from state – no separate demo path
  const placements = (s.house.placements || []).filter(p => (p.room || 0) === currentRoomIndex);
  const pendingBuilds = getPendingFurnitureBuilds(s)
    .filter((activity) => (activity.build?.room || 0) === currentRoomIndex)
    .map((activity) => {
      const def = furnitureMap[activity.build?.furniture_id];
      if (!def) return null;
      return {
        tx: activity.build.tx,
        ty: activity.build.ty,
        size: def.size || { w: 1, d: 1 },
        draw: (roomCtx, drawX, drawY) => drawConstructionPlaceholder(roomCtx, drawX, drawY, def),
        id: `pending-${activity.build.furniture_id}`,
        flat: def.id === 'rug',
      };
    })
    .filter(Boolean);
  const furniture = [...buildFurnitureForRoom(placements), ...pendingBuilds];

  initRoom(chars, drawCharacter, furniture);
  updateRoomIndicator();
}

try { setupRoom(); } catch (e) {
  console.error('Raum-Init Fehler:', e);
  setDebugPanel(`setupRoom failed:\n${e?.stack || e}`, true);
}

// ---- Render-Loop ----
function render(timestamp) {
  if (!layoutReady && !resizeCanvas()) {
    animationId = requestAnimationFrame(render);
    return;
  }
  const t = timestamp / 1000;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  try {
    updateRoom(t);
    renderRoom(ctx, w, h, t);
  } catch (e) {
    setDebugPanel(`render failed:\n${e?.stack || e}`, true);
    throw e;
  }
  animationId = requestAnimationFrame(render);
}

function startRender() { if (!animationId) animationId = requestAnimationFrame(render); }
function stopRender() { if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }

// ---- Screen-Wechsel ----
setOnScreenChange((screen) => {
  if (screen === 'house') { resizeCanvas(); startRender(); updateActivityBadge(); renderHouseView(); }
  else stopRender();
  if (screen === 'collection') renderCollection();
  if (screen === 'profile') renderProfile();
  if (screen === 'gacha') renderGachaScreen();
});

startRender();
requestAnimationFrame(() => {
  if (resizeCanvas()) {
    setupRoom(currentRoomIndex);
    renderHouseView();
    setDebugPanel([
      'room debug',
      `container: ${document.getElementById('screen-house')?.clientWidth || 0}x${document.getElementById('screen-house')?.clientHeight || 0}`,
      `canvas: ${canvas.width}x${canvas.height}`,
      `sprites: ${getSprites().length}`,
      `ctx: ${ctx ? 'ok' : 'missing'}`,
    ]);
  }
});

// ---- Room Indicator ----
function updateRoomIndicator() {
  const s = getState();
  const container = document.getElementById('room-indicator');
  if (!container) return;
  if (getHouseView(s) !== 'inside') { container.innerHTML = ''; return; }
  if (s.house.rooms <= 1) { container.innerHTML = ''; return; }
  let html = '';
  for (let i = 0; i < s.house.rooms; i++) {
    html += `<button class="room-dot ${i === currentRoomIndex ? 'active' : ''}" data-room="${i}">${i + 1}</button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.room-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.room);
      if (idx !== currentRoomIndex) {
        setupRoom(idx);
      }
    });
  });
}

updateRoomIndicator();
renderHouseViewToggle();

function getAlphaProgress(state = getState()) {
  return {
    hasResident: Object.keys(state.collection || {}).length > 0,
    hasActivity: (state.activities || []).length > 0,
    hasResources: Object.values(state.resources || {}).some((value) => (value || 0) > 0),
    hasResearchUnlock: (state.unlocks?.research || []).length > 0,
    hasFurniture: (state.house?.placements || []).length > 0,
  };
}

function getHouseView(state = getState()) {
  return state.ui?.house_view === 'outside' ? 'outside' : 'inside';
}

function setHouseView(view) {
  const nextView = view === 'outside' ? 'outside' : 'inside';
  if (nextView === 'outside') placingFurnitureMode = false;
  mutate((s) => {
    if (!s.ui) s.ui = {};
    s.ui.house_view = nextView;
  });
  renderHouseView();
}

function isAlphaPanelDismissed(state = getState()) {
  return !!state.ui?.alpha_panel_dismissed;
}

function setAlphaPanelDismissed(dismissed) {
  mutate((s) => {
    if (!s.ui) s.ui = {};
    s.ui.alpha_panel_dismissed = dismissed;
  });
}

function getOutsideSummary(state = getState()) {
  const activeOutsideJobs = (state.activities || []).filter((activity) => OUTSIDE_ACTIVITY_IDS.includes(activity.id));
  const totalWorkers = activeOutsideJobs.reduce((sum, activity) => sum + (activity.workers?.length || 0), 0);
  const stations = Object.entries(OUTSIDE_STATION_CONFIG).map(([activityId, station]) => {
    const activity = activeOutsideJobs.find((entry) => entry.id === activityId) || null;
    const def = getActivityDef(activityId);
    const workers = (activity?.workers || [])
      .map((workerId, index) => {
        const char = getCharacter(workerId);
        if (!char) return null;
        return {
          id: workerId,
          name: char.name,
          pose: def?.pose || 'hard_work',
          dir: index % 2,
        };
      })
      .filter(Boolean);

    return {
      ...station,
      activityId,
      activity,
      workers,
      status: activity ? `${workers.length} Worker aktiv` : 'Noch frei',
      body: activity
        ? `${def?.name || 'Produktion'} läuft gerade auf dieser Außenstation.`
        : station.hint,
    };
  });

  const busyWorkerIds = new Set(activeOutsideJobs.flatMap((activity) => activity.workers || []));
  const idleResidents = Object.keys(state.collection || {})
    .filter((workerId) => !busyWorkerIds.has(workerId))
    .slice(0, OUTSIDE_IDLE_SLOTS.length)
    .map((workerId, index) => {
      const char = getCharacter(workerId);
      if (!char) return null;
      const slot = OUTSIDE_IDLE_SLOTS[index];
      return {
        id: workerId,
        name: char.name,
        species: char.species,
        pose: index % 2 === 0 ? 'idle' : 'walk',
        dir: index % 2,
        x: slot.x,
        y: slot.y,
        status: 'spaziert',
        type: 'idle',
      };
    })
    .filter(Boolean);

  const activeResidents = stations.flatMap((station) =>
    station.workers.map((worker, index) => {
      const slot = station.slots[index % station.slots.length];
      return {
        ...worker,
        x: slot.x,
        y: slot.y,
        status: station.title,
        type: 'active',
        accent: station.accent,
        species: getCharacter(worker.id)?.species || 'unknown',
      };
    })
  );

  return {
    activeJobs: activeOutsideJobs.length,
    activeWorkers: totalWorkers,
    stations,
    residents: [...activeResidents, ...idleResidents],
  };
}

function renderHouseViewToggle() {
  const container = document.getElementById('house-view-toggle');
  if (!container) return;
  const view = getHouseView();

  container.innerHTML = `
    <div class="house-view-switch">
      <button class="house-view-btn ${view === 'inside' ? 'active' : ''}" data-house-view="inside">Innen</button>
      <button class="house-view-btn ${view === 'outside' ? 'active' : ''}" data-house-view="outside">Außen</button>
    </div>
  `;

  container.querySelectorAll('[data-house-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextView = button.dataset.houseView;
      if (nextView !== getHouseView()) setHouseView(nextView);
    });
  });
}

function drawOutsideWorkers(timestamp) {
  if (getCurrentScreen() !== 'house' || getHouseView() !== 'outside') {
    outsideAnimId = null;
    return;
  }

  document.querySelectorAll('.outside-worker-canvas, .outside-actor-canvas').forEach((canvas) => {
    const workerId = canvas.dataset.workerId;
    const char = getCharacter(workerId);
    if (!char) return;
    const specDraw = getSpeciesDraw(char.species);
    const ctx2d = canvas.getContext('2d');
    if (!specDraw || !ctx2d) return;

    const t = timestamp / 1000;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.save();
    ctx2d.translate(canvas.width / 2, canvas.height - 12);
    ctx2d.scale(1.55, 1.55);
    const pose = canvas.dataset.pose || 'hard_work';
    const dir = parseInt(canvas.dataset.dir || '0', 10) || 0;

    if (pose === 'walk') specDraw.walk(ctx2d, 0, 0, t, dir, char.palette);
    else if (pose === 'idle') specDraw.idle(ctx2d, 0, 0, t, char.palette);
    else if (specDraw.poses && specDraw.poses[pose] && char.poses?.includes(pose)) specDraw.poses[pose](ctx2d, 0, 0, t, char.palette);
    else specDraw.work_default(ctx2d, 0, 0, t, char.palette);
    ctx2d.restore();
  });

  outsideAnimId = requestAnimationFrame(drawOutsideWorkers);
}

function ensureOutsideAnimation() {
  if (outsideAnimId) cancelAnimationFrame(outsideAnimId);
  outsideAnimId = null;
  if (getCurrentScreen() === 'house' && getHouseView() === 'outside') {
    outsideAnimId = requestAnimationFrame(drawOutsideWorkers);
  }
}

function renderOutsideScene() {
  const outsideScene = document.getElementById('outside-scene');
  if (!outsideScene) return;

  const outside = getOutsideSummary();
  outsideScene.innerHTML = `
    <div class="outside-scroll">
      <div class="outside-scene-backdrop">
        <div class="outside-cloud cloud-a"></div>
        <div class="outside-cloud cloud-b"></div>
        <div class="outside-cloud cloud-c"></div>
        <div class="outside-hills"></div>
        <div class="outside-ground"></div>
      </div>

      <section class="outside-hero">
        <div class="outside-header">
          <div>
            <div class="outside-title">Außenbereich</div>
            <div class="outside-copy">Deine Tierchen leben jetzt auch draußen: sie laufen zwischen Bambus, Steinen und Beeten herum und arbeiten direkt in ihrer Umgebung.</div>
          </div>
          <button class="gacha-btn secondary outside-open-work" id="btn-open-outside-work">Arbeit öffnen</button>
        </div>

        <div class="outside-world">
          ${outside.stations.map((station) => `
            <button class="outside-zone outside-zone-${station.accent} ${station.activity ? 'is-active' : ''}" style="left:${station.sceneX}%; top:${station.sceneY}%;" data-outside-activity="${station.activityId}">
              <span class="outside-zone-icon">${station.icon}</span>
              <span class="outside-zone-label">${station.title}</span>
            </button>
          `).join('')}

          <div class="outside-actors-layer">
            ${outside.residents.map((resident, index) => `
              <div class="outside-actor outside-actor-${resident.type}" style="left:${resident.x}%; top:${resident.y}%;" data-actor-index="${index}" data-species="${resident.species}">
                ${resident.type === 'active' ? `<div class="outside-actor-badge">${resident.status}</div>` : ''}
                <div class="outside-actor-shadow ${resident.species === 'slime' ? 'is-slime' : ''}"></div>
                <canvas class="outside-actor-canvas" width="72" height="84" data-worker-id="${resident.id}" data-pose="${resident.pose}" data-dir="${resident.dir}" data-species="${resident.species}"></canvas>
                <div class="outside-actor-name">${resident.name}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <div class="outside-station-grid">
        ${outside.stations.map((station) => `
          <section class="outside-plot outside-plot-${station.id} ${station.activity ? 'is-active' : ''}">
            <div class="outside-plot-sign">
              <span class="outside-plot-icon">${station.icon}</span>
              <div>
                <div class="outside-plot-title">${station.title}</div>
                <div class="outside-plot-status">${station.status}</div>
              </div>
            </div>
            <div class="outside-worker-row">
              ${station.workers.length > 0 ? station.workers.map((worker) => `
                <div class="outside-worker">
                  <canvas class="outside-worker-canvas" width="72" height="84" data-worker-id="${worker.id}" data-pose="${worker.pose}" data-dir="${worker.dir}"></canvas>
                  <div class="outside-worker-name">${worker.name}</div>
                </div>
              `).join('') : '<div class="outside-empty-worker">Frei für neue Worker</div>'}
            </div>
            <div class="outside-plot-copy">${station.body}</div>
            <button class="outside-assign-btn" data-outside-activity="${station.activityId}">Worker zuweisen</button>
          </section>
        `).join('')}
      </div>
    </div>
  `;

  const openWorkBtn = document.getElementById('btn-open-outside-work');
  if (openWorkBtn) openWorkBtn.addEventListener('click', openActivityModal);

  outsideScene.querySelectorAll('[data-outside-activity]').forEach((button) => {
    button.addEventListener('click', () => openActivityModal());
  });

  ensureOutsideAnimation();
}

function renderHouseView() {
  const outsideScene = document.getElementById('outside-scene');
  const canvasEl = document.getElementById('room-canvas');
  const bubbleLayer = document.getElementById('speech-bubbles-layer');
  const houseScreen = document.getElementById('screen-house');
  const view = getHouseView();

  renderHouseViewToggle();

  if (outsideScene) {
    if (view === 'outside') {
      outsideScene.classList.remove('hidden');
      renderOutsideScene();
    } else {
      outsideScene.classList.add('hidden');
      outsideScene.innerHTML = '';
    }
  }

  if (canvasEl) canvasEl.classList.toggle('hidden', view !== 'inside');
  if (bubbleLayer) bubbleLayer.classList.toggle('hidden', view !== 'inside');
  if (houseScreen) houseScreen.classList.toggle('outside-active', view === 'outside');

  if (view !== 'outside' && outsideAnimId) {
    cancelAnimationFrame(outsideAnimId);
    outsideAnimId = null;
  }

  updateRoomIndicator();
  renderAlphaPanel();
}

function renderAlphaPanel() {
  const panel = document.getElementById('alpha-panel');
  const guideChip = document.getElementById('btn-alpha-guide');
  if (!panel) return;

  const s = getState();
  if (getHouseView(s) !== 'inside') {
    panel.innerHTML = '';
    panel.classList.add('hidden');
    if (guideChip) {
      guideChip.classList.add('hidden');
      guideChip.onclick = null;
    }
    return;
  }
  const dismissed = isAlphaPanelDismissed(s);
  const progress = getAlphaProgress(s);
  const allDone = Object.values(progress).every(Boolean);

  const steps = [
    { done: progress.hasResident, label: 'Gratis-Roll nutzen und ersten Bewohner holen' },
    { done: progress.hasActivity, label: 'Eine erste Tätigkeit starten' },
    { done: progress.hasResources, label: 'Die ersten Ressourcen verdienen' },
    { done: progress.hasResearchUnlock, label: 'Einen Bauplan erforschen' },
    { done: progress.hasFurniture, label: 'Das erste Möbel platzieren' },
  ];

  let primaryAction = { action: 'gacha', label: 'Zum Gacha' };
  let secondaryAction = { action: 'collection', label: 'Sammlung' };
  let copy = 'Starte mit einem leeren Häuschen und arbeite dich durch alle Kernsysteme.';

  if (!progress.hasResident) {
    copy = 'Dein Alpha-Start beginnt bei null. Nutze zuerst den garantierten Gratis-Roll.';
    primaryAction = { action: 'gacha', label: 'Gratis-Roll nutzen' };
    secondaryAction = { action: 'collection', label: 'Sammlung ansehen' };
  } else if (!progress.hasActivity) {
    copy = 'Dein erster Bewohner ist da. Schicke ihn jetzt in die erste Tätigkeit.';
    primaryAction = { action: 'activities', label: 'Arbeit zuweisen' };
    secondaryAction = { action: 'gacha', label: 'Mehr Ziehungen' };
  } else if (!progress.hasResearchUnlock) {
    copy = 'Jetzt läuft der Ressourcen- und Forschungsloop. Öffne Forschung, sobald genug Punkte da sind.';
    primaryAction = { action: 'research', label: 'Forschung öffnen' };
    secondaryAction = { action: 'activities', label: 'Tätigkeiten' };
  } else if (!progress.hasFurniture) {
    copy = 'Der Bauplan ist freigeschaltet. Platziere jetzt dein erstes Möbel im Haus.';
    primaryAction = { action: 'place-furniture', label: 'Möbel platzieren' };
    secondaryAction = { action: 'research', label: 'Weitere Forschung' };
  } else if (allDone) {
    copy = 'Der komplette Alpha-Kernloop ist spielbar: sammeln, arbeiten, forschen, bauen und ausbauen.';
    primaryAction = { action: 'activities', label: 'Weiter optimieren' };
    secondaryAction = { action: 'gacha', label: 'Neue Bewohner' };
  }

  if (dismissed) {
    panel.innerHTML = '';
    panel.classList.add('hidden');
    if (guideChip) {
      guideChip.classList.remove('hidden');
      guideChip.onclick = () => {
        setAlphaPanelDismissed(false);
        renderAlphaPanel();
      };
    }
    return;
  }

  if (guideChip) {
    guideChip.classList.add('hidden');
    guideChip.onclick = null;
  }

  panel.innerHTML = `
    <div class="alpha-panel-head">
      <div class="alpha-panel-title">Alpha Start 0 -> Core Loop</div>
      <button class="alpha-panel-close" type="button" data-alpha-dismiss="true" aria-label="Guide ausblenden">–</button>
    </div>
    <div class="alpha-panel-copy">${copy}</div>
    <div class="alpha-checklist">
      ${steps.map((step, index) => `
        <div class="alpha-check ${step.done ? 'done' : ''}">
          <span class="alpha-check-dot">${step.done ? 'OK' : index + 1}</span>
          <span class="alpha-check-label">${step.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="alpha-panel-actions">
      <button class="alpha-action-btn primary" data-alpha-action="${primaryAction.action}">${primaryAction.label}</button>
      <button class="alpha-action-btn secondary" data-alpha-action="${secondaryAction.action}">${secondaryAction.label}</button>
    </div>
  `;

  panel.classList.remove('hidden');

  const dismissBtn = panel.querySelector('[data-alpha-dismiss]');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      setAlphaPanelDismissed(true);
      renderAlphaPanel();
    });
  }

  panel.querySelectorAll('[data-alpha-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.alphaAction;
      if (action === 'gacha') {
        switchScreen('gacha');
      } else if (action === 'activities') {
        openGameMenuModal('activities');
      } else if (action === 'research') {
        openGameMenuModal('research');
      } else if (action === 'place-furniture') {
        openGameMenuModal('furniture');
      } else if (action === 'collection') {
        switchScreen('collection');
      }
    });
  });
}

function getAdventureSummary(state = getState()) {
  const hasResident = Object.keys(state.collection || {}).length > 0;
  const hasCoreLoop = (state.activities || []).length > 0 && ((state.unlocks?.research || []).length > 0);
  return {
    unlocked: hasResident,
    readySoon: hasCoreLoop,
    title: hasCoreLoop ? 'Abenteuer kommen als nächster großer Schritt' : 'Abenteuer folgen nach dem Kernloop',
    body: hasCoreLoop
      ? 'Das Haus hat jetzt Arbeit, Forschung und Möbel. Als Nächstes können wir aktive Abenteuer und Entscheidungen ergänzen.'
      : 'Sobald der Kernloop sitzt, hängen wir hier ein Abenteuersystem mit Teams, Entscheidungen und Belohnungen ein.',
  };
}

function activateFurniturePlacement() {
  placingFurnitureMode = true;
  closeModal();
  openModal(`
    <div class="modal-header">
      <span class="modal-title">Möbel platzieren</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="activity-empty">Tippe jetzt auf ein freies Feld im Raum, um Möbel zu platzieren oder vorhandene Möbel zu verwalten.</div>
  `);
}

function openGameMenuModal(activeSection = 'overview') {
  const s = getState();
  const adventure = getAdventureSummary(s);
  const outside = getOutsideSummary(s);
  const alphaDismissed = isAlphaPanelDismissed(s);
  const activeCount = (s.activities || []).length;
  const recipeCount = (s.unlocks?.furniture || []).length;
  const researchCount = (s.unlocks?.research || []).length;

  const cards = [
    {
      id: 'activities',
      emoji: '⚒️',
      title: 'Arbeit',
      meta: activeCount > 0 ? `${activeCount} laufend` : 'Noch nichts gestartet',
      body: 'Weise Bewohner Tätigkeiten zu, sammle Ressourcen und halte den Kernloop am Laufen.',
      cta: 'Arbeit öffnen',
      enabled: Object.keys(s.collection || {}).length > 0,
    },
    {
      id: 'research',
      emoji: '🔬',
      title: 'Forschung',
      meta: `${getResearchPoints(s)} Punkte · ${researchCount} Baupläne`,
      body: 'Schalte Möbel-Rezepte frei und baue damit den Haus-Fortschritt aus.',
      cta: 'Forschung öffnen',
      enabled: true,
    },
    {
      id: 'furniture',
      emoji: '🪑',
      title: 'Möbel',
      meta: `${recipeCount} Rezepte · ${(s.house?.placements || []).length} platziert`,
      body: 'Starte den Platzierungsmodus und richte dein Häuschen sichtbar ein.',
      cta: 'Platzierungsmodus',
      enabled: true,
    },
    {
      id: 'adventures',
      emoji: '🗺️',
      title: 'Abenteuer',
      meta: adventure.readySoon ? 'Nächster Ausbauschritt' : 'Noch gesperrt',
      body: adventure.body,
      cta: adventure.readySoon ? 'Vorschau ansehen' : 'Info',
      enabled: adventure.unlocked,
    },
    {
      id: 'outside',
      emoji: '🌿',
      title: 'Außenbereich',
      meta: outside.activeJobs > 0 ? `${outside.activeJobs} Stationen aktiv · ${outside.activeWorkers} Worker draußen` : 'Produktionsflächen vorbereiten',
      body: 'Verortet Holz, Stein und Beete außerhalb des Hauses. Erste Stationen sind jetzt als eigener Bereich vorbereitet.',
      cta: 'Außenbereich ansehen',
      enabled: true,
    },
  ];

  openModal(`
    <div class="modal-header">
      <span class="modal-title">Spielmenü</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="hub-menu">
      <div class="hub-menu-intro">
        <div class="hub-menu-title">Alle Kernsysteme an einem Ort</div>
        <div class="hub-menu-copy">Arbeit, Forschung, Möbel, Außenbereich und Abenteuer teilen sich jetzt einen gemeinsamen Einstieg.</div>
      </div>
      ${alphaDismissed ? `
        <button class="gacha-btn secondary hub-utility-btn" id="btn-restore-alpha-panel">
          Guide im Haus wieder einblenden
        </button>
      ` : ''}
      <div class="hub-card-grid">
        ${cards.map((card) => `
          <div class="hub-card ${card.id === activeSection ? 'is-active' : ''} ${card.enabled ? '' : 'is-disabled'}">
            <div class="hub-card-head">
              <div class="hub-card-icon">${card.emoji}</div>
              <div>
                <div class="hub-card-title">${card.title}</div>
                <div class="hub-card-meta">${card.meta}</div>
              </div>
            </div>
            <div class="hub-card-body">${card.body}</div>
            <button class="gacha-btn ${card.enabled ? 'primary' : 'secondary'} hub-card-btn" data-hub-action="${card.id}">
              ${card.cta}
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `);

  const restoreGuideBtn = document.getElementById('btn-restore-alpha-panel');
  if (restoreGuideBtn) {
    restoreGuideBtn.addEventListener('click', () => {
      setAlphaPanelDismissed(false);
      closeModal();
      renderAlphaPanel();
    });
  }

  document.querySelectorAll('.hub-card-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.hubAction;
      if (action === 'activities') {
        openActivityModal();
      } else if (action === 'research') {
        openResearchModal();
      } else if (action === 'furniture') {
        setHouseView('inside');
        activateFurniturePlacement();
      } else if (action === 'outside') {
        closeModal();
        switchScreen('house');
        setHouseView('outside');
      } else if (action === 'adventures') {
        openModal(`
          <div class="modal-header">
            <span class="modal-title">Abenteuer</span>
            <button class="modal-close">✕</button>
          </div>
          <div class="research-summary">
            <div class="research-hero">
              <div class="research-hero-top">
                <div class="research-hero-title">Abenteuer im Alpha-Plan</div>
                <div class="research-hero-points">Bald</div>
              </div>
              <div class="research-hero-hint">${adventure.title}. ${adventure.body}</div>
            </div>
            <div class="activity-empty">Der Menüpunkt ist jetzt vorbereitet. Als Nächstes können wir hier Team-Abenteuer, Events und Belohnungen anschließen.</div>
            <div class="alpha-panel-actions">
              <button class="gacha-btn secondary" id="btn-close-adventures-preview">Schließen</button>
              <button class="gacha-btn primary" id="btn-back-to-hub">Zurück zum Spielmenü</button>
            </div>
          </div>
        `);
        const closeBtn = document.getElementById('btn-close-adventures-preview');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        const backBtn = document.getElementById('btn-back-to-hub');
        if (backBtn) backBtn.addEventListener('click', () => openGameMenuModal('adventures'));
      }
    });
  });
}

// ---- Tile Tap Handler ----
setOnTileTap((tile) => {
  if (placingFurnitureMode) {
    const existing = findFurnitureAt(tile.tx, tile.ty);
    const pendingBuild = findPendingFurnitureBuildAt(tile.tx, tile.ty);
    if (existing) {
      openFurnitureManageModal(existing, tile);
    } else if (pendingBuild) {
      openPendingBuildModal(pendingBuild);
    } else {
      openFurniturePlaceModal(tile.tx, tile.ty);
    }
  }
});

function openFurniturePlaceModal(tx, ty) {
  const s = getState();
  const owned = getUnlockedIds(s, 'furniture');
  const availableBuilders = getAvailableBuilders(s);

  let itemsHTML = '<div class="furniture-grid">';
  for (const f of allFurniture) {
    const fits = checkFurnitureFits(tx, ty, f.size || { w: 1, d: 1 });
    const hasRecipe = owned.includes(f.id);
    const recipeResearch = getRecipeResearchDef(f.id);
    const unlockCost = recipeResearch?.cost || 0;
    const canUnlock = fits && !!recipeResearch && canUnlockResearch(s, recipeResearch);
    const canCraft = fits && hasRecipe && f.craft &&
      Object.entries(f.craft.cost || {}).every(([k, v]) => (s.resources[k] || 0) >= v);
    const hasBuilder = availableBuilders.length > 0;

    let craftBtnClass, craftBtnText;
    let helperText = '';
    if (!hasRecipe) {
      craftBtnClass = canUnlock ? 'furniture-unlock-btn' : 'furniture-unlock-btn btn-too-poor';
      craftBtnText = `🔓 Rezept freischalten ${unlockCost ? `(${unlockCost} 🔬)` : ''}`;
      helperText = `Forschung nötig${unlockCost ? ` · ${unlockCost} Punkte` : ''}`;
    } else {
      const costParts = Object.entries(f.craft?.cost || {}).map(([k, v]) => `${v} ${RES_ICONS[k] || k}`).join(' + ');
      const buildDuration = formatTime(f.craft?.duration || 0);
      const builderLabel = hasBuilder ? ` · ${availableBuilders[0].name} baut` : ' · Kein freier Builder';
      craftBtnClass = canCraft && hasBuilder ? 'furniture-craft-btn' : 'furniture-craft-btn btn-too-poor';
      craftBtnText = `🔨 Bauen ${costParts || ''}${buildDuration ? ` · ${buildDuration}` : ''}${builderLabel}`;
      helperText = hasBuilder ? 'Wird erst gebaut und dann aufgestellt' : 'Ein freier Builder fehlt gerade';
    }

    itemsHTML += `
      <div class="furniture-option ${!fits ? 'furniture-no-fit' : ''}" data-furniture-id="${f.id}">
        <canvas width="64" height="64" data-furniture-id="${f.id}"></canvas>
        <div class="furniture-option-info">
          <div class="furniture-name">${f.name}</div>
          <div class="furniture-size">${f.size.w}×${f.size.d}${!fits ? ' · passt hier nicht' : ''}</div>
          <div class="furniture-size">${helperText}</div>
          <div class="furniture-actions">
            <button class="${craftBtnClass}" data-id="${recipeResearch?.id || f.id}" ${!fits || (!hasRecipe && !recipeResearch) || (hasRecipe && !hasBuilder) ? 'disabled' : ''}>
              ${craftBtnText}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  itemsHTML += '</div>';

  openModal(`
    <div class="modal-header">
      <span class="modal-title">Möbel platzieren</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="furniture-tile-hint">Tile (${tx}, ${ty})</div>
    ${itemsHTML}
  `);

  // Draw furniture previews
  document.querySelectorAll('.furniture-option canvas').forEach(c => {
    const fId = c.dataset.furnitureId;
    const fDef = furnitureMap[fId];
    if (fDef && fDef.draw) {
      const fCtx = c.getContext('2d');
      fCtx.save();
      fDef.draw(fCtx, 32, 48);
      fCtx.restore();
    }
  });

  document.querySelectorAll('.furniture-unlock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const researchId = btn.dataset.id;
      mutate(s => {
        applyResearchUnlock(s, researchId);
      });
      updateResourceBar();
      updateResearchUI();
      renderAlphaPanel();
      openFurniturePlaceModal(tx, ty);
    });
  });

  document.querySelectorAll('.furniture-craft-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fId = btn.dataset.id;
      const fDef = furnitureMap[fId];
      if (!fDef || !fDef.craft) return;
      const cur = getState();
      const canAffordCraft = Object.entries(fDef.craft.cost || {}).every(([k, v]) => (cur.resources[k] || 0) >= v);
      const builder = getAvailableBuilders(cur)[0];
      if (!canAffordCraft || !builder) {
        btn.classList.add('btn-shake');
        setTimeout(() => btn.classList.remove('btn-shake'), 400);
        return;
      }
      mutate(s => {
        startFurnitureBuild(s, fDef, { room: currentRoomIndex, tx, ty }, [builder.id]);
      });
      closeModal();
      placingFurnitureMode = false;
      updateResourceBar();
      updateResearchUI();
      updateActivityBadge();
      renderAlphaPanel();
      renderHouseView();
      setupRoom(currentRoomIndex);
    });
  });
}

function openPendingBuildModal(activity) {
  const build = activity.build || {};
  const def = furnitureMap[build.furniture_id];
  const progress = Math.round(getProgress(activity) * 100);
  const remaining = formatTime(getRemainingTime(activity));
  const workerNames = (activity.workers || [])
    .map((id) => getCharacter(id)?.name || id)
    .join(', ');

  openModal(`
    <div class="modal-header">
      <span class="modal-title">${build.furniture_name || def?.name || 'Möbelbau'}</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="activity-item active-activity">
      <div class="activity-name">Im Aufbau</div>
      <div class="activity-meta">${workerNames || 'Ein Worker'} · ${remaining} verbleibend</div>
      <div class="activity-progress-bar">
        <div class="activity-progress-fill" style="width: ${progress}%"></div>
      </div>
    </div>
    <div class="alpha-panel-copy">Dieses Möbel wird gerade gebaut und stellt sich nach Abschluss automatisch auf dieses Tile.</div>
  `);
}

function checkFurnitureFits(tx, ty, size) {
  if (tx + size.w > GRID || ty + size.d > GRID) return false;
  const s = getState();
  const placements = (s.house.placements || []).filter(p => (p.room || 0) === currentRoomIndex);
  for (const p of placements) {
    const pDef = furnitureMap[p.furniture_id];
    if (!pDef) continue;
    const ps = pDef.size || { w: 1, d: 1 };
    if (tx < p.tx + ps.w && tx + size.w > p.tx &&
        ty < p.ty + ps.d && ty + size.d > p.ty) {
      return false;
    }
  }
  for (const pending of getPendingFurnitureBuilds(s)) {
    const build = pending.build;
    if ((build.room || 0) !== currentRoomIndex) continue;
    const pDef = furnitureMap[build.furniture_id];
    if (!pDef) continue;
    const ps = pDef.size || { w: 1, d: 1 };
    if (tx < build.tx + ps.w && tx + size.w > build.tx &&
        ty < build.ty + ps.d && ty + size.d > build.ty) {
      return false;
    }
  }
  return true;
}

function openFurnitureManageModal(furniture, tile) {
  const fDef = furnitureMap[furniture.id];
  const name = fDef ? fDef.name : furniture.id;

  openModal(`
    <div class="modal-header">
      <span class="modal-title">${name}</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="furniture-manage">
      <canvas id="manage-furniture-canvas" width="120" height="120"></canvas>
      <div class="furniture-manage-actions">
        <button class="gacha-btn secondary" id="btn-remove-furniture">🗑️ Entfernen</button>
      </div>
    </div>
  `);

  const c = document.getElementById('manage-furniture-canvas');
  if (c && fDef && fDef.draw) {
    const fCtx = c.getContext('2d');
    fCtx.save();
    fCtx.translate(60, 80);
    fCtx.scale(1.5, 1.5);
    fDef.draw(fCtx, 0, 0);
    fCtx.restore();
  }

  document.getElementById('btn-remove-furniture').addEventListener('click', () => {
    mutate(s => {
      s.house.placements = s.house.placements.filter(p =>
        !((p.room || 0) === currentRoomIndex && p.tx === furniture.tx && p.ty === furniture.ty && p.furniture_id === furniture.id)
      );
    });
    closeModal();
    updateResourceBar();
    updateResearchUI();
    renderAlphaPanel();
    setupRoom(currentRoomIndex);
  });
}

// ---- Offline-Completions anzeigen ----
if (offlineCompletions.length > 0) {
  let msg = '<div class="modal-header"><span class="modal-title">Willkommen zurück!</span><button class="modal-close">✕</button></div>';
  msg += '<div class="offline-summary">';
  for (const c of offlineCompletions) {
    if (c.type === 'resources') {
      const def = getActivityDef(c.activityId);
      const name = def ? def.name : c.activityId;
      const outputStr = Object.entries(c.output).map(([k, v]) => {
        const icons = { wood: '🪵', stone: '🪨', food: '🍞', fabric: '🧵' };
        return `${icons[k] || ''} +${v} ${k}`;
      }).join(', ');
      msg += `<div class="offline-item">${name}: ${outputStr}</div>`;
    } else if (c.type === 'room_built') {
      msg += `<div class="offline-item">🏠 Neues Zimmer gebaut! (${c.rooms} Räume)</div>`;
    } else if (c.type === 'research_progress') {
      msg += `<div class="offline-item">🔬 Forschung abgeschlossen! (+${c.amount || RESEARCH_POINTS_PER_RUN} Punkte, jetzt ${c.progress} gesamt)</div>`;
    } else if (c.type === 'furniture_built') {
      msg += `<div class="offline-item">🪑 ${c.furnitureName} wurde fertig gebaut.</div>`;
    }
  }
  msg += '</div>';
  setTimeout(() => openModal(msg), 300);
}

// ========================================
// GACHA SYSTEM (Schritt 7)
// ========================================

let gachaAnimating = false;

/** Nur Buttons/Zähler aktualisieren (nach Draws, Token-Eingabe) */
function updateGachaUI() {
  const s = getState();
  document.getElementById('gacha-token-count').textContent = s.gacha.tokens;
  document.getElementById('pity-count').textContent = Math.max(0, 10 - s.gacha.pity_counter);
  document.getElementById('btn-draw-1').disabled = s.gacha.tokens < 1 || gachaAnimating;
  document.getElementById('btn-draw-10').disabled = s.gacha.tokens < 10 || gachaAnimating;

  const freeRoll = document.getElementById('free-roll-badge');
  freeRoll.classList.toggle('hidden', !s.gacha.free_roll_available);

  const draw1Btn = document.getElementById('btn-draw-1');
  if (s.gacha.free_roll_available) {
    draw1Btn.textContent = '🎁 Free Roll!';
    draw1Btn.disabled = false;
  } else {
    draw1Btn.textContent = '×1 ziehen';
  }
}

/** Voller Screen-Render (bei Screen-Wechsel) */
function renderGachaScreen() {
  updateGachaUI();
  // Result clearen und Machine zeigen wenn nicht gerade Animation läuft
  if (!gachaAnimating) {
    document.getElementById('gacha-result').classList.add('hidden');
    renderGachaMachine();
  }
}

// ---- Token-Eingabe ----
document.getElementById('btn-add-tokens').addEventListener('click', () => {
  let activeTab = 'steps';

  function renderTokenModal() {
    const table = TOKEN_TABLES[activeTab];
    const tabsHTML = ['steps', 'sport', 'calories'].map(t => {
      const labels = { steps: '🚶 Schritte', sport: '🏃 Sport', calories: '🔥 Kalorien' };
      return `<button class="token-tab ${t === activeTab ? 'active' : ''}" data-tab="${t}">${labels[t]}</button>`;
    }).join('');

    const optionsHTML = table.map(opt =>
      `<div class="token-option" data-type="${activeTab}" data-amount="${opt.amount}" data-tokens="${opt.tokens}">
        <span class="option-desc">${opt.label}</span>
        <span class="option-reward">+${opt.tokens} 🪙</span>
      </div>`
    ).join('');

    return `
      <div class="modal-header">
        <span class="modal-title">Tokens verdienen</span>
        <button class="modal-close">✕</button>
      </div>
      <div class="token-tabs">${tabsHTML}</div>
      <div class="token-options">${optionsHTML}</div>
      <p class="token-hint">Ehrensystem – trage ein was du heute geschafft hast!</p>
    `;
  }

  openModal(renderTokenModal());
  wireTokenModal();

  function wireTokenModal() {
    const content = document.getElementById('modal-content');

    content.querySelectorAll('.token-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        openModal(renderTokenModal());
        wireTokenModal();
      });
    });

    content.querySelectorAll('.token-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const type = opt.dataset.type;
        const amount = parseInt(opt.dataset.amount);
        const tokens = parseInt(opt.dataset.tokens);

        mutate(s => {
          s.gacha.tokens += tokens;
          if (!s.token_history) s.token_history = [];
          s.token_history.push({
            type, amount, tokens,
            timestamp: Math.floor(Date.now() / 1000),
          });
        });

        closeModal();
        updateGachaUI();
        updateResourceBar();
        renderAlphaPanel();
      });
    });
  }
});

// ---- Einzelziehung ----
document.getElementById('btn-draw-1').addEventListener('click', () => {
  if (gachaAnimating) return;
  const s = getState();

  // Free Roll prüfen
  if (s.gacha.free_roll_available) {
    performDraw(true);
    return;
  }

  if (s.gacha.tokens < 1) return;
  performDraw(false);
});

// ---- 10er-Ziehung ----
document.getElementById('btn-draw-10').addEventListener('click', () => {
  if (gachaAnimating) return;
  const s = getState();
  if (s.gacha.tokens < 10) return;
  performMultiDraw();
});

// ---- Free Roll Badge als Button ----
document.getElementById('free-roll-badge').addEventListener('click', () => {
  if (gachaAnimating) return;
  const s = getState();
  if (!s.gacha.free_roll_available) return;
  performDraw(true);
});

// ---- Zieh-Animation ----
function performDraw(isFreeRoll) {
  gachaAnimating = true;
  updateGachaUI();

  const screen = document.getElementById('screen-gacha');
  const stage = document.getElementById('gacha-stage');
  const machine = document.getElementById('gacha-machine');
  const result = document.getElementById('gacha-result');

  result.classList.add('hidden');
  result.innerHTML = '';
  machine.innerHTML = '';
  machine.className = '';

  // Ziehung durchführen
  let drawnChar;
  mutate(s => {
    if (isFreeRoll) {
      drawnChar = freeRollDraw();
      s.gacha.free_roll_available = false;
      s.gacha.free_roll_last = Math.floor(Date.now() / 1000);
    } else {
      s.gacha.tokens--;
      drawnChar = draw(s);
    }
  });

  const drawResult = processDrawResult(getState(), drawnChar);
  saveState(getState());

  const rarity = drawnChar.rarity;
  const isSuper = rarity === 'super_rare';
  const isRare = rarity === 'rare';

  // Phase 0: Münze fällt ein
  sfxCoin();
  const coin = document.createElement('div');
  coin.className = 'gacha-coin';
  machine.appendChild(coin);

  // Phase 1: Maschine wackelt, Kapsel erscheint
  setTimeout(() => {
    coin.remove();
    machine.classList.add('machine-shake');
    sfxRattle();

    const capsule = document.createElement('div');
    capsule.className = `capsule ${rarity} capsule-drop`;
    capsule.id = 'active-capsule';
    machine.appendChild(capsule);

    if (isRare || isSuper) capsule.classList.add('capsule-glow');
  }, 500);

  // Phase 2: Wobble
  setTimeout(() => {
    machine.classList.remove('machine-shake');
    sfxWobble();
    const capsule = document.getElementById('active-capsule');
    if (capsule) capsule.classList.add('wobble-long');
  }, 1100);

  // Phase 2b: Super Rare charge-up
  const extraDelay = isSuper ? 800 : 0;
  if (isSuper) {
    setTimeout(() => {
      sfxCharge();
      const capsule = document.getElementById('active-capsule');
      if (capsule) {
        capsule.classList.remove('wobble-long');
        capsule.classList.add('capsule-charge');
      }
      const screenFlash = document.createElement('div');
      screenFlash.className = 'screen-flash gold';
      stage.appendChild(screenFlash);
      setTimeout(() => screenFlash.remove(), 600);
    }, 2400);
  }

  // Phase 3: Burst!
  setTimeout(() => {
    sfxBurst(rarity);
    const capsule = document.getElementById('active-capsule');
    if (capsule) {
      capsule.classList.remove('wobble-long', 'capsule-charge');
      capsule.classList.add('burst');
    }

    const flash = document.createElement('div');
    flash.className = `rarity-flash-big ${rarity}`;
    stage.appendChild(flash);
    setTimeout(() => flash.remove(), 1200);

    spawnParticles(stage, rarity, isSuper ? 20 : isRare ? 12 : 6);
  }, 2400 + extraDelay);

  // Phase 4: Full-Screen Character Reveal
  setTimeout(() => {
    machine.innerHTML = '';
    machine.className = '';

    // Gacha-Chrome ausblenden, Reveal übernimmt den ganzen Screen
    screen.classList.add('revealing');
    showDrawResult(drawnChar, drawResult, rarity);

    // Sound je nach Rarity + Ergebnis
    if (isSuper) sfxRevealSuperRare();
    else if (isRare) sfxRevealRare();
    else sfxRevealCommon();

    if (drawResult.type === 'new') {
      setTimeout(() => sfxNewChar(), 100);
    } else if (drawResult.type === 'levelup') {
      setTimeout(() => sfxLevelUp(), 100);
    }
  }, 3200 + extraDelay);
}

/** Reveal schließen */
function dismissReveal() {
  const screen = document.getElementById('screen-gacha');
  const result = document.getElementById('gacha-result');
  screen.classList.remove('revealing');
  result.classList.add('hidden');
  result.innerHTML = '';
  result.className = '';
  gachaAnimating = false;
  updateGachaUI();
  updateResourceBar();
  renderAlphaPanel();
  renderGachaMachine();
}

/** Partikel-Effekt beim Aufplatzen */
function spawnParticles(container, rarity, count) {
  const colors = {
    common: ['#D8D0C8', '#B8B0A8', '#C8C0B8'],
    rare: ['#A8CCF0', '#6B9FD4', '#88BBE8', '#FFFFFF'],
    super_rare: ['#FFE680', '#E8B830', '#FFF0A0', '#FFD700', '#FFFFFF'],
  };
  const palette = colors[rarity] || colors.common;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'gacha-particle';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 60 + Math.random() * 80;
    const size = 4 + Math.random() * 6;
    p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.background = palette[Math.floor(Math.random() * palette.length)];
    p.style.animationDelay = `${Math.random() * 0.15}s`;
    p.style.left = '50%';
    p.style.top = '50%';
    container.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

/** Konfetti-Regen für neue Figuren / Level-Up */
function spawnConfetti(container, colorSet, count) {
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = `${10 + Math.random() * 80}%`;
    c.style.background = colorSet[Math.floor(Math.random() * colorSet.length)];
    c.style.animationDelay = `${Math.random() * 1.2}s`;
    c.style.animationDuration = `${1.5 + Math.random() * 1}s`;
    const size = 5 + Math.random() * 5;
    c.style.width = size + 'px';
    c.style.height = size * (0.6 + Math.random() * 0.8) + 'px';
    c.style.setProperty('--drift', `${(Math.random() - 0.5) * 60}px`);
    c.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    container.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}

function performMultiDraw() {
  gachaAnimating = true;
  updateGachaUI();

  const results = [];
  mutate(s => {
    for (let i = 0; i < 10; i++) {
      s.gacha.tokens--;
      const char = draw(s);
      const res = processDrawResult(s, char);
      results.push({ char, result: res });
    }
  });
  saveState(getState());

  sfxRevealRare();
  showMultiDrawResult(results);
  gachaAnimating = false;
  updateGachaUI();
  updateResourceBar();
  if (results.some(r => r.result.type === 'new')) setupRoom();
}

/** Full-Screen Character Reveal */
function showDrawResult(char, drawResult, rarity) {
  const el = document.getElementById('gacha-result');
  el.classList.remove('hidden');
  el.innerHTML = '';
  el.className = `gacha-reveal-fullscreen ${rarity}`;

  const isNew = drawResult.type === 'new';
  const isLevelUp = drawResult.type === 'levelup';
  const isSpecial = isNew || isLevelUp;

  // Hintergrund-Glow
  const bg = document.createElement('div');
  bg.className = `reveal-bg ${rarity}`;
  el.appendChild(bg);

  // Zentrierter Content-Container
  const content = document.createElement('div');
  content.className = 'reveal-content';
  el.appendChild(content);

  // Glow-Ring hinter der Figur
  const glowRing = document.createElement('div');
  glowRing.className = `reveal-glow ${rarity}${isSpecial ? ' reveal-glow-special' : ''}`;
  content.appendChild(glowRing);

  // Großer Canvas – Figur richtig groß und zentriert
  const canvasSize = 320;
  const scale = 4.5;
  const revealCanvas = document.createElement('canvas');
  revealCanvas.width = canvasSize;
  revealCanvas.height = canvasSize;
  revealCanvas.className = `reveal-canvas${isSpecial ? ' reveal-canvas-special' : ''}`;
  const rCtx = revealCanvas.getContext('2d');
  rCtx.save();
  rCtx.translate(canvasSize / 2, canvasSize / 2);
  rCtx.scale(scale, scale);
  const specDraw = getSpeciesDraw(char.species);
  if (specDraw) specDraw.idle(rCtx, 0, 14, performance.now() / 1000, char.palette);
  rCtx.restore();
  content.appendChild(revealCanvas);

  // Name
  const name = document.createElement('div');
  name.className = 'reveal-name reveal-slide-up';
  name.textContent = char.name;
  content.appendChild(name);

  // Seltenheits-Label
  const rarityLabel = document.createElement('div');
  rarityLabel.className = `reveal-rarity reveal-slide-up rarity-label-${rarity}`;
  const rarityNames = { common: 'Common', rare: '★ Rare', super_rare: '★★ Super Rare' };
  rarityLabel.textContent = rarityNames[rarity];
  content.appendChild(rarityLabel);

  // Ergebnis-Badge
  const badge = document.createElement('div');
  if (isNew) {
    badge.className = 'reveal-badge badge-new reveal-pop';
    badge.textContent = '✨ Neu entdeckt!';
  } else if (isLevelUp) {
    badge.className = 'reveal-badge badge-levelup reveal-pop';
    badge.textContent = `⬆ Level ${drawResult.newLevel}!`;
  } else {
    badge.className = 'reveal-badge badge-shard reveal-pop';
    badge.textContent = `+1 Scherbe (${drawResult.shards}/${getState().collection[char.id].level})`;
  }
  content.appendChild(badge);

  // Super Rare: Sparkles
  if (rarity === 'super_rare') {
    const sparkles = document.createElement('div');
    sparkles.className = 'reveal-sparkles';
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('div');
      s.className = 'reveal-sparkle';
      s.style.animationDelay = `${i * 0.16}s`;
      const angle = (Math.PI * 2 * i) / 10;
      const r = 70 + Math.random() * 15;
      s.style.setProperty('--sx', `${Math.cos(angle) * r}px`);
      s.style.setProperty('--sy', `${Math.sin(angle) * r}px`);
      sparkles.appendChild(s);
    }
    content.appendChild(sparkles);
  }

  // Neue Figur → Konfetti!
  if (isNew) {
    const confettiColors = {
      common: ['#D8D0C8', '#C8C0B8', '#B8B0A8', '#F2A7B0'],
      rare: ['#A8CCF0', '#6B9FD4', '#88BBE8', '#F2A7B0', '#FFFFFF'],
      super_rare: ['#FFE680', '#E8B830', '#FFD700', '#F2A7B0', '#FFFFFF', '#A8D8A8'],
    };
    setTimeout(() => spawnConfetti(el, confettiColors[rarity] || confettiColors.common, 35), 200);
  }

  // Level-Up → goldene Partikel
  if (isLevelUp) {
    setTimeout(() => spawnConfetti(el, ['#FFE680', '#E8B830', '#FFD700', '#FFF0A0'], 20), 200);
  }

  // "Antippen" Hinweis
  const hint = document.createElement('div');
  hint.className = 'reveal-hint reveal-slide-up';
  hint.textContent = 'Antippen zum Weitermachen';
  el.appendChild(hint);

  // Tap to dismiss
  let canDismiss = false;
  setTimeout(() => { canDismiss = true; }, 600);

  const dismiss = () => {
    if (!canDismiss) return;
    sfxTap();
    if (isNew) setupRoom();
    dismissReveal();
    el.removeEventListener('click', dismiss);
  };
  el.addEventListener('click', dismiss);
}

function showMultiDrawResult(results) {
  let html = `
    <div class="modal-header">
      <span class="modal-title">×10 Ziehung!</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="multi-draw-grid">
  `;

  for (const { char, result } of results) {
    const badgeClass = result.type === 'new' ? 'badge-new' : result.type === 'levelup' ? 'badge-levelup' : 'badge-shard';
    const badgeText = result.type === 'new' ? 'Neu!' : result.type === 'levelup' ? `Lv.${result.newLevel}` : '+1💎';
    html += `
      <div class="multi-draw-card rarity-border-${char.rarity}">
        <canvas width="120" height="120" data-species="${char.species}" data-palette='${JSON.stringify(char.palette)}'></canvas>
        <div class="char-name">${char.name}</div>
        <span class="result-badge-sm ${badgeClass}">${badgeText}</span>
      </div>
    `;
  }

  html += '</div>';
  openModal(html);

  // Figuren in die Canvases zeichnen – skaliert für bessere Sichtbarkeit
  document.querySelectorAll('.multi-draw-card canvas').forEach(c => {
    const mCtx = c.getContext('2d');
    const species = c.dataset.species;
    const palette = JSON.parse(c.dataset.palette);
    const specDraw = getSpeciesDraw(species);
    if (specDraw) {
      mCtx.save();
      mCtx.translate(60, 60);
      mCtx.scale(1.8, 1.8);
      specDraw.idle(mCtx, 0, 14, performance.now() / 1000, palette);
      mCtx.restore();
    }
  });
}

// ========================================
// AKTIVITÄTEN-SYSTEM (Schritt 8)
// ========================================

let activityCheckInterval = null;

// Aktivitäts-Badge auf Haus-Screen
function updateActivityBadge() {
  const s = getState();
  const badge = document.getElementById('activity-badge');
  const completions = checkCompletions(s);
  if (completions.length > 0) {
    saveState(s);
    updateResourceBar();
    updateResearchUI();
    updateRoomIndicator();
    renderAlphaPanel();
    // If a room was built, refresh the room
    if (completions.some(c => c.type === 'room_built')) {
      setupRoom(currentRoomIndex);
    }
    renderHouseView();
    badge.classList.remove('hidden');
    setTimeout(() => badge.classList.add('hidden'), 3000);
  } else {
    badge.classList.add('hidden');
  }
}

// Periodischer Check alle 5 Sekunden
function startActivityChecker() {
  if (activityCheckInterval) return;
  activityCheckInterval = setInterval(() => {
    const s = getState();
    const completions = checkCompletions(s);
    if (completions.length > 0) {
      saveState(s);
      updateResourceBar();
      updateResearchUI();
      updateRoomIndicator();
      renderAlphaPanel();
      renderHouseView();
      updateActivityBadge();
    }
  }, 5000);
}

startActivityChecker();

// ---- Produktions-Tick (1×/s) ----
// Ressourcen laufen kontinuierlich, die UI aktualisiert sich ebenfalls sekündlich.
setInterval(() => {
  mutate(s => applyTick(s));
  updateResourceBar();
  updateResearchUI();
  renderAlphaPanel();
  renderHouseView();
  updateProductionRates();
}, 1000);

/**
 * Zeigt die aktuelle Produktionsrate (+X/min) neben jedem Ressourcen-Icon.
 * Injiziert einen <span class="resource-rate"> falls noch nicht vorhanden.
 */
function updateProductionRates() {
  const s = getState();
  const rates = getTotalProductionRates(s);
  const keys = { wood: 'res-wood', stone: 'res-stone', food: 'res-food', fabric: 'res-fabric' };

  for (const [key, elId] of Object.entries(keys)) {
    const container = document.getElementById(elId);
    if (!container) continue;

    let rateEl = container.querySelector('.resource-rate');
    if (!rateEl) {
      rateEl = document.createElement('span');
      rateEl.className = 'resource-rate';
      container.appendChild(rateEl);
    }
    const perSec = rates[key] || 0;
    rateEl.textContent = perSec > 0 ? formatRate(perSec) : '';
    rateEl.style.display = perSec > 0 ? '' : 'none';
  }
}

// ========================================
// SPRECHBLASEN (Schritt 11)
// ========================================

// Cooldown-Map: charId → timestamp (ms) der letzten Blase
const bubbleCooldowns = new Map();

/**
 * Gibt true zurück, wenn charId noch auf Cooldown ist.
 */
function bubbleOnCooldown(charId, now, cooldownMs) {
  return (now - (bubbleCooldowns.get(charId) || 0)) < cooldownMs;
}

/**
 * Erzeugt eine DOM-Sprechblase über dem Sprite.
 * @param {object} sprite  – Sprite-Objekt aus room.js
 * @param {string} context – 'idle' | 'meeting' | 'working' | 'levelup'
 * @param {number} cw      – Canvas CSS-Breite
 * @param {number} ch      – Canvas CSS-Höhe
 * @param {number} now     – Date.now()
 */
function showBubble(sprite, context, cw, ch, now) {
  const char = sprite.char;
  const speech = char.speech?.[context];
  if (!speech || speech.length === 0) return;

  // Max 1 aktive Blase pro Figur
  if (document.querySelector(`.speech-bubble[data-char="${char.id}"]`)) return;

  const emoji = speech[Math.floor(Math.random() * speech.length)];
  const pos = getSpriteScreenPos(sprite.px, sprite.py, cw, ch);

  // Blase ~45px über dem Sprite-FußKopf ist ca. 50-60% der Höhe über dem Ankerpunkt)
  const HEAD_OFFSET = 48;

  bubbleCooldowns.set(char.id, now);

  const layer = document.getElementById('speech-bubbles-layer');
  if (!layer) return;

  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  bubble.dataset.char = char.id;
  bubble.textContent = emoji;
  bubble.style.left = `${Math.round(pos.x)}px`;
  bubble.style.top  = `${Math.round(pos.y - HEAD_OFFSET)}px`;
  layer.appendChild(bubble);

  // Aufräumen nach Animation (bubbleFade: 2.4s → etwas Puffer)
  setTimeout(() => bubble.remove(), 2600);
}

/**
 * Führt den Proximity- und Idle-Check durch.
 * Wird einmal pro Sekunde aufgerufen.
 */
function checkSpeechBubbles() {
  if (getCurrentScreen() !== 'house') return;
  if (getHouseView() !== 'inside') return;

  const sprites = getSprites();
  if (!sprites.length) return;

  const canvas = document.getElementById('room-canvas');
  if (!canvas) return;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const now = Date.now();

  const MEETING_COOLDOWN  = 30_000;  // 30 s zwischen Meeting-Blasen pro Figur
  const IDLE_COOLDOWN     = 60_000;  // 60 s zwischen Idle-Blasen pro Figur
  const IDLE_CHANCE       = 0.12;    // 12 % pro Sekunde pro ruhender Figur
  const PROXIMITY         = 2.0;     // Tiles

  // --- Meeting-Check: alle Sprite-Paare ---
  // Jedes Paar löst höchstens eine Blase aus (von wem auch immer noch Cooldown-frei ist)
  const triggeredMeeting = new Set();
  for (let i = 0; i < sprites.length; i++) {
    for (let j = i + 1; j < sprites.length; j++) {
      const a = sprites[i];
      const b = sprites[j];
      const dx = a.px - b.px;
      const dy = a.py - b.py;
      if (dx * dx + dy * dy > PROXIMITY * PROXIMITY) continue;

      // Wähle die Figur, die noch nicht getriggert wurde und nicht auf Cooldown ist
      for (const sp of [a, b]) {
        if (!triggeredMeeting.has(sp.char.id) &&
            !bubbleOnCooldown(sp.char.id, now, MEETING_COOLDOWN)) {
          showBubble(sp, 'meeting', cw, ch, now);
          triggeredMeeting.add(sp.char.id);
          break;
        }
      }
    }
  }

  // --- Idle-Blasen (zufällig, nur ruhende Figuren, die keine Meeting-Blase bekommen haben) ---
  for (const sp of sprites) {
    if (sp.pose !== 'idle') continue;
    if (triggeredMeeting.has(sp.char.id)) continue;
    if (bubbleOnCooldown(sp.char.id, now, IDLE_COOLDOWN)) continue;
    if (Math.random() < IDLE_CHANCE) {
      showBubble(sp, 'idle', cw, ch, now);
    }
  }
}

// Starte den Bubble-Checker
const _bubbleInterval = setInterval(checkSpeechBubbles, 1000);

// ---- Aktivitäts-Zuweisung ----
document.getElementById('btn-open-menu').addEventListener('click', () => {
  openGameMenuModal();
});

function openActivityModal() {
  const s = getState();
  const defs = getAllActivityDefs();
  const busy = getBusyWorkers(s);
  const collected = Object.keys(s.collection);

  // Laufende Aktivitäten
  let activeHTML = '';
  if (s.activities.length > 0) {
    activeHTML = '<div class="activity-section-title">Laufende Tätigkeiten</div>';
    activeHTML += '<div class="activity-list">';
    s.activities.forEach((act, idx) => {
      const def = getActivityDef(act.id);
      const progress = getProgress(act);
      const activityName = act.unlocks === 'furniture_build'
        ? `Bau: ${act.build?.furniture_name || 'Möbel'}`
        : (def ? def.name : act.id);
      const workerNames = act.workers.map(id => {
        const c = getCharacter(id);
        return c ? c.name : id;
      }).join(', ');

      // Zimmer-Bau: zeige Countdown. Ressourcen: zeige Rate.
      let metaRight;
      if (act.unlocks === 'room_slot') {
        const remaining = getRemainingTime(act);
        metaRight = `${formatTime(remaining)} verbleibend`;
      } else if (act.unlocks === 'research_progress') {
        const remaining = getRemainingTime(act);
        metaRight = `${formatTime(remaining)} bis +${RESEARCH_POINTS_PER_RUN} 🔬`;
      } else if (act.unlocks === 'furniture_build') {
        const remaining = getRemainingTime(act);
        const buildName = act.build?.furniture_name || 'Möbelbau';
        metaRight = `${formatTime(remaining)} bis ${buildName}`;
      } else {
        const rateStr = Object.entries(getOutputRate(act)).map(([k, perSec]) => {
          const icons = { wood: '🪵', stone: '🪨', food: '🍞', fabric: '🧵' };
          return `${icons[k] || ''}${formatRate(perSec)}`;
        }).join(' ');
        metaRight = rateStr || '…';
      }

      activeHTML += `
        <div class="activity-item active-activity">
          <div class="activity-name">${activityName}</div>
          <div class="activity-meta">
            ${workerNames} · ${metaRight}
          </div>
          <div class="activity-progress-bar">
            <div class="activity-progress-fill" style="width: ${Math.round(progress * 100)}%"></div>
          </div>
          <button class="activity-cancel-btn" data-index="${idx}">Abbrechen</button>
        </div>
      `;
    });
    activeHTML += '</div>';
  }

  // Verfügbare Aktivitäten
  let availableHTML = '<div class="activity-section-title">Neue Tätigkeit starten</div>';

  if (collected.length === 0) {
    availableHTML += '<div class="activity-empty">Ziehe zuerst Figuren im Gacha, um sie arbeiten zu lassen!</div>';
  } else {
    availableHTML += '<div class="activity-list">';
    for (const def of defs) {
      const affordable = canAfford(def, s);
      const costStr = def.cost
        ? Object.entries(def.cost).map(([k, v]) => {
            const icons = { wood: '🪵', stone: '🪨', food: '🍞', fabric: '🧵' };
            return `${icons[k] || ''} ${v}`;
          }).join(' + ')
        : 'Keine';

      // Zeige Rate statt einmaligen Output (außer bei room_slot)
      const outputStr = def.output
        ? (() => {
            // Berechne Rate für Vorschau mit 1 Worker (Basisdauer)
            const previewActivity = { output: def.output, duration: def.duration_base };
            return Object.entries(getOutputRate(previewActivity)).map(([k, perSec]) => {
              const icons = { wood: '🪵', stone: '🪨', food: '🍞', fabric: '🧵' };
              return `${icons[k] || ''}${formatRate(perSec)}`;
            }).join(', ');
          })()
        : (def.unlocks === 'room_slot' ? '🏠 Neues Zimmer' : def.unlocks === 'research_progress' ? `🔬 +${RESEARCH_POINTS_PER_RUN} Forschung` : '–');

      const durationStr = formatTime(def.duration_base);

      availableHTML += `
        <div class="activity-item ${affordable ? '' : 'activity-locked'}" data-activity-id="${def.id}">
          <div class="activity-name">${def.name}</div>
          <div class="activity-meta">
            Kosten: ${costStr} · Ertrag: ${outputStr} · ~${durationStr}
          </div>
          <div class="activity-meta">Worker: ${def.workers.min}–${def.workers.max}</div>
          ${!affordable ? '<div class="activity-locked-hint">Nicht genug Ressourcen</div>' : ''}
        </div>
      `;
    }
    availableHTML += '</div>';
  }

  const html = `
    <div class="modal-header">
      <span class="modal-title">Tätigkeiten</span>
      <button class="modal-close">✕</button>
    </div>
    ${activeHTML}
    ${availableHTML}
  `;

  openModal(html);

  // Cancel-Buttons verdrahten
  document.querySelectorAll('.activity-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      mutate(s => {
        const act = s.activities[idx];
        if (act?.unlocks === 'furniture_build' && act.build?.furniture_id) {
          const furnitureDef = furnitureMap[act.build.furniture_id];
          for (const [key, value] of Object.entries(furnitureDef?.craft?.cost || {})) {
            s.resources[key] = (s.resources[key] || 0) + value;
          }
        }
        removeActivity(s, idx);
      });
      updateResourceBar();
      updateResearchUI();
      renderAlphaPanel();
      renderHouseView();
      openActivityModal(); // Modal neu rendern
    });
  });

  // Aktivitäten starten
  document.querySelectorAll('.activity-item[data-activity-id]').forEach(item => {
    if (item.classList.contains('activity-locked')) return;
    item.addEventListener('click', () => {
      openWorkerSelectModal(item.dataset.activityId);
    });
  });
}

function openWorkerSelectModal(activityId) {
  const s = getState();
  const def = getActivityDef(activityId);
  if (!def) return;

  const busy = getBusyWorkers(s);
  const collected = Object.keys(s.collection);
  const available = collected.filter(id => !busy.has(id));
  const selected = new Set();

  function renderWorkerModal() {
    const duration = calcDuration(def, Math.max(1, selected.size), s, [...selected]);
    const durationStr = formatTime(duration);

    let workersHTML = '';
    if (available.length === 0) {
      workersHTML = '<div class="activity-empty">Alle Figuren sind beschäftigt!</div>';
    } else {
      workersHTML = '<div class="worker-grid">';
      for (const id of available) {
        const char = getCharacter(id);
        if (!char) continue;
        const isSelected = selected.has(id);
        const canSelect = selected.size < def.workers.max || isSelected;
        workersHTML += `
          <div class="worker-card ${isSelected ? 'selected' : ''} ${canSelect ? '' : 'worker-full'}" data-char-id="${id}">
            <canvas width="48" height="48" data-species="${char.species}" data-palette='${JSON.stringify(char.palette)}'></canvas>
            <div class="worker-name">${char.name}</div>
            ${isSelected ? '<div class="worker-check">✓</div>' : ''}
          </div>
        `;
      }
      workersHTML += '</div>';
    }

    return `
      <div class="modal-header">
        <span class="modal-title">${def.name}</span>
        <button class="modal-close">✕</button>
      </div>
      <div class="worker-info">
        Wähle ${def.workers.min}–${def.workers.max} Figuren · Dauer: ~${durationStr}
      </div>
      ${workersHTML}
      <button class="worker-start-btn gacha-btn primary" ${selected.size >= def.workers.min ? '' : 'disabled'}>
        ${selected.size >= def.workers.min ? `Starten (${selected.size} Worker)` : `Mindestens ${def.workers.min} wählen`}
      </button>
      <button class="worker-back-btn gacha-btn secondary">Zurück</button>
    `;
  }

  function showAndWire() {
    openModal(renderWorkerModal());

    // Mini-Canvases zeichnen
    document.querySelectorAll('.worker-card canvas').forEach(c => {
      const mCtx = c.getContext('2d');
      const species = c.dataset.species;
      const palette = JSON.parse(c.dataset.palette);
      const specDraw = getSpeciesDraw(species);
      if (specDraw) specDraw.idle(mCtx, 24, 40, performance.now() / 1000, palette);
    });

    // Worker-Auswahl
    document.querySelectorAll('.worker-card').forEach(card => {
      if (card.classList.contains('worker-full')) return;
      card.addEventListener('click', () => {
        const id = card.dataset.charId;
        if (selected.has(id)) {
          selected.delete(id);
        } else if (selected.size < def.workers.max) {
          selected.add(id);
        }
        showAndWire();
      });
    });

    // Start-Button
    const startBtn = document.querySelector('.worker-start-btn');
    if (startBtn && !startBtn.disabled) {
      startBtn.addEventListener('click', () => {
        const workerIds = [...selected];
        mutate(s => {
          const result = startActivity(s, activityId, workerIds);
          if (!result) {
            console.warn('Aktivität konnte nicht gestartet werden');
          }
        });
        closeModal();
        updateResourceBar();
        updateResearchUI();
        updateActivityBadge();
        renderAlphaPanel();
        renderHouseView();
        if (activityId === 'research') openResearchModal();
      });
    }

    // Zurück-Button
    const backBtn = document.querySelector('.worker-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => openActivityModal());
    }
  }

  showAndWire();
}

// ========================================
// SAMMLUNG-SCREEN
// ========================================

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = '';
  const all = getAllCharacters();
  const collection = getState().collection;
  const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const activeSpecies = document.querySelector('.species-btn.active')?.dataset.species || 'all';

  let filtered = activeFilter === 'all' ? all : all.filter(c => c.rarity === activeFilter);
  if (activeSpecies !== 'all') filtered = filtered.filter(c => c.species === activeSpecies);

  filtered.forEach(char => {
    const owned = collection[char.id];
    const card = document.createElement('div');
    card.className = `collection-card rarity-border-${char.rarity}`;
    if (!owned) card.classList.add('undiscovered');

    // Always draw the character – undiscovered ones get silhouette via CSS
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 80;
    miniCanvas.height = 80;
    const mCtx = miniCanvas.getContext('2d');
    const specDraw = getSpeciesDraw(char.species);
    if (specDraw) {
      mCtx.save();
      if (!owned) {
        // Draw silhouette: render character, then composite to solid color
        specDraw.idle(mCtx, 40, 64, performance.now() / 1000, char.palette);
        mCtx.globalCompositeOperation = 'source-atop';
        mCtx.fillStyle = '#C8BEB4';
        mCtx.fillRect(0, 0, 80, 80);
      } else {
        specDraw.idle(mCtx, 40, 64, performance.now() / 1000, char.palette);
      }
      mCtx.restore();
    }
    card.appendChild(miniCanvas);

    const name = document.createElement('div');
    name.className = 'char-name';
    name.textContent = owned ? char.name : '???';
    card.appendChild(name);

    if (owned) {
      const lvl = document.createElement('div');
      lvl.className = 'level-badge';
      lvl.textContent = `Lv.${owned.level}`;
      card.appendChild(lvl);
      card.addEventListener('click', () => showCharDetail(char, owned));
    }

    grid.appendChild(card);
  });
}

// Filter-Buttons (rarity)
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCollection();
  });
});

// Species-Buttons
document.querySelectorAll('.species-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.species-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCollection();
  });
});

function showCharDetail(char, owned) {
  const rarityNames = { common: 'Common', rare: 'Rare', super_rare: 'Super Rare' };
  const shardCost = owned.level < 5 ? owned.level : '–';
  const shardProgress = owned.level < 5 ? Math.min(1, owned.shards / owned.level) : 1;
  const bonusText = char.bonus && owned.level >= char.bonus.activatesAtLevel
    ? `${char.bonus.type === 'speed' ? '⚡' : '📦'} +${Math.round(char.bonus.value * 100)}% ${char.bonus.type}`
    : char.bonus
      ? `Ab Lv.${char.bonus.activatesAtLevel}: +${Math.round(char.bonus.value * 100)}% ${char.bonus.type}`
      : 'Keiner';

  // Available poses
  const allPoses = ['idle', 'walk'];
  if (char.poses) allPoses.push(...char.poses);

  const poseLabels = {
    idle: '😊 Ruhe', walk: '🚶 Laufen', hard_work: '🔨 Arbeit',
    think: '💭 Denken', craft: '✂️ Handwerk'
  };

  const poseBtnsHTML = allPoses.map(p =>
    `<button class="pose-btn ${p === 'idle' ? 'active' : ''}" data-pose="${p}">${poseLabels[p] || p}</button>`
  ).join('');

  const html = `
    <div class="modal-header">
      <span class="modal-title">${char.name}</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="char-detail">
      <canvas id="char-detail-canvas" width="160" height="160"></canvas>
      <div class="pose-selector">${poseBtnsHTML}</div>
      <div class="char-detail-info">
        <div class="detail-row">
          <span>Seltenheit</span>
          <span style="color:var(--${char.rarity.replace('_', '-')}-color);font-weight:700">${rarityNames[char.rarity]}</span>
        </div>
        <div class="detail-row">
          <span>Level</span>
          <span>${owned.level} / 5</span>
        </div>
        <div class="detail-row detail-row-bar">
          <span>Scherben</span>
          <span>${owned.shards} / ${shardCost}</span>
        </div>
        <div class="shard-bar"><div class="shard-bar-fill" style="width:${Math.round(shardProgress * 100)}%"></div></div>
        <div class="detail-row">
          <span>Duplikate</span>
          <span>${owned.count}×</span>
        </div>
        <div class="detail-row">
          <span>Bonus</span>
          <span>${bonusText}</span>
        </div>
      </div>
    </div>
  `;

  openModal(html);

  // Animated pose preview
  let currentPose = 'idle';
  let detailAnimId = null;
  const detailCanvas = document.getElementById('char-detail-canvas');
  if (!detailCanvas) return;
  const dCtx = detailCanvas.getContext('2d');
  const specDraw = getSpeciesDraw(char.species);

  function drawPose(timestamp) {
    const t = timestamp / 1000;
    dCtx.clearRect(0, 0, 160, 160);
    if (specDraw) {
      dCtx.save();
      dCtx.translate(80, 130);
      dCtx.scale(2.5, 2.5);
      if (currentPose === 'idle') specDraw.idle(dCtx, 0, 0, t, char.palette);
      else if (currentPose === 'walk') specDraw.walk(dCtx, 0, 0, t, 0, char.palette);
      else if (specDraw.poses && specDraw.poses[currentPose]) specDraw.poses[currentPose](dCtx, 0, 0, t, char.palette);
      else specDraw.work_default(dCtx, 0, 0, t, char.palette);
      dCtx.restore();
    }
    detailAnimId = requestAnimationFrame(drawPose);
  }
  detailAnimId = requestAnimationFrame(drawPose);

  // Stop animation when modal closes
  const observer = new MutationObserver(() => {
    if (document.getElementById('modal-overlay')?.classList.contains('hidden')) {
      if (detailAnimId) cancelAnimationFrame(detailAnimId);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('modal-overlay'), { attributes: true });

  // Pose buttons
  document.querySelectorAll('.pose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pose-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPose = btn.dataset.pose;
    });
  });
}

// ========================================
// GACHA-SCREEN RENDERING
// ========================================

// Gacha-Machine Deko (statische Darstellung)
function renderGachaMachine() {
  const machine = document.getElementById('gacha-machine');
  if (machine.children.length > 0) return; // Schon was drin (z.B. Animation)
  machine.innerHTML = `
    <div class="gacha-deko">
      <div class="gacha-topper"></div>
      <div class="gacha-globe"></div>
      <div class="gacha-chute">
        <div class="gacha-chute-inner"></div>
      </div>
      <div class="gacha-capsules">
        <span class="mini-capsule capsule-gold"></span>
        <span class="mini-capsule capsule-blue"></span>
        <span class="mini-capsule capsule-cream"></span>
        <span class="mini-capsule capsule-pink"></span>
        <span class="mini-capsule capsule-mint"></span>
        <span class="mini-capsule capsule-lilac"></span>
      </div>
      <div class="gacha-base"></div>
      <div class="gacha-trim"></div>
      <div class="gacha-panel">
        <div class="gacha-panel-light"></div>
        <div class="gacha-panel-slot"></div>
      </div>
      <div class="gacha-knob"></div>
      <div class="gacha-knob-center"></div>
      <div class="gacha-feet">
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

// ========================================
// PROFIL-SCREEN
// ========================================

function renderProfile() {
  const s = getState();
  document.getElementById('stat-total-draws').textContent = s.gacha.total_draws || 0;
  document.getElementById('stat-unique-chars').textContent = Object.keys(s.collection).length;
  document.getElementById('stat-rooms').textContent = s.house.rooms;

  const list = document.getElementById('token-history-list');
  list.innerHTML = '';
  const history = s.token_history || [];
  if (history.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px;">Noch keine Einträge</div>';
  } else {
    history.slice(-20).reverse().forEach(entry => {
      const div = document.createElement('div');
      div.className = 'history-entry';
      const typeLabels = { steps: '🚶 Schritte', sport: '🏃 Sport', calories: '🔥 Kalorien' };
      const date = new Date(entry.timestamp * 1000);
      const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      div.innerHTML = `
        <span>${typeLabels[entry.type] || entry.type}: ${entry.amount}</span>
        <span>+${entry.tokens} 🪙 · ${dateStr}</span>
      `;
      list.appendChild(div);
    });
  }
}

// ========================================
// RESET
// ========================================

document.getElementById('btn-reset').addEventListener('click', () => {
  showConfirm('Willst du wirklich deinen gesamten Spielstand löschen? Das kann nicht rückgängig gemacht werden.', () => {
    resetState();
    initState();
    currentRoomIndex = 0;
    updateResourceBar();
    updateResearchUI();
    renderAlphaPanel();
    setupRoom(0);
    setHouseView('inside');
    renderHouseView();
    renderProfile();
    renderGachaScreen();
    switchScreen('house');
  });
});

function openResearchModal() {
  const s = getState();
  const points = getResearchPoints(s);
  const unlocked = new Set(getUnlockedIds(s, 'research'));
  const researchables = getAllResearchDefs()
    .filter((entry) => entry.category === 'furniture')
    .sort((a, b) => a.cost - b.cost);
  const nextUnlockCost = researchables
    .filter((entry) => !unlocked.has(entry.id))
    .map((entry) => entry.cost || 0)
    .sort((a, b) => a - b)[0] || 1;
  const progressToNextUnlock = Math.min(100, (points / nextUnlockCost) * 100);

  const cards = researchables.map((entry) => {
    const cost = entry.cost || 0;
    const isUnlocked = unlocked.has(entry.id);
    const canUnlockNow = !isUnlocked && points >= cost;
    const furnitureUnlock = (entry.unlocks || []).find((unlock) => unlock.type === 'furniture');
    const furniture = furnitureUnlock ? furnitureMap[furnitureUnlock.id] : null;
    const craftCost = Object.entries(furniture?.craft?.cost || {})
      .map(([k, v]) => `${v} ${k}`)
      .join(' · ');

    return `
      <div class="research-card ${isUnlocked ? 'unlocked' : ''}">
        <div class="research-card-head">
          <div>
            <div class="research-card-title">${entry.name}</div>
            <div class="research-card-meta">Bauplan für ${furniture?.size?.w || '?'}×${furniture?.size?.d || '?'} · Baukosten: ${craftCost || '–'}</div>
          </div>
          <div class="research-card-status">${isUnlocked ? 'Freigeschaltet' : 'Gesperrt'}</div>
        </div>
        <div class="research-card-cost">🔬 ${cost} Forschung</div>
        ${isUnlocked ? '' : `<button class="research-unlock-btn gacha-btn ${canUnlockNow ? 'primary' : 'secondary'}" data-recipe-id="${entry.id}" ${canUnlockNow ? '' : 'disabled'}>Rezept freischalten</button>`}
      </div>
    `;
  }).join('');

  openModal(`
    <div class="modal-header">
      <span class="modal-title">Forschung</span>
      <button class="modal-close">✕</button>
    </div>
      <div class="research-summary">
      <div class="research-hero">
        <div class="research-hero-top">
          <div class="research-hero-title">Forschungspunkte</div>
          <div class="research-hero-points">${points} 🔬</div>
        </div>
        <div class="research-bar"><div class="research-bar-fill" style="width:${progressToNextUnlock}%"></div></div>
        <div class="research-hero-hint">Schicke Figuren auf „Forschen“, um pro Run ${RESEARCH_POINTS_PER_RUN} Punkte zu erhalten. Baupläne sind jetzt deutlich teurer und werden Stück für Stück freigeschaltet.</div>
      </div>
      <div class="research-section-title">Baupläne</div>
      <div class="research-card-list">${cards || '<div class="activity-empty">Noch keine Forschungsobjekte vorhanden.</div>'}</div>
    </div>
  `);

  document.querySelectorAll('.research-unlock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const recipeId = btn.dataset.recipeId;
      mutate(state => {
        applyResearchUnlock(state, recipeId);
      });
      updateResearchUI();
      renderAlphaPanel();
      openResearchModal();
    });
  });
}

// ========================================
// FREE ROLL CHECK
// ========================================

function checkFreeRoll(state) {
  const now = Math.floor(Date.now() / 1000);
  const lastRoll = state.gacha.free_roll_last || 0;
  const daysSinceLast = (now - lastRoll) / 86400;

  if (daysSinceLast >= 1 && !state.gacha.free_roll_available) {
    if (Math.random() < 0.03) {
      state.gacha.free_roll_available = true;
    }
  }
}

// ========================================
// INIT DONE
// ========================================

console.log(`🏠 Gachapon Häuschen geladen – ${getAllCharacters().length} Figuren, ${getTotalCharacterCount()} total`);

