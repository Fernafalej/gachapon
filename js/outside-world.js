import { getState } from './state.js?v=20260421c';
import { getCurrentScreen } from './ui.js?v=20260421d';
import { getCharacter, getSpeciesDraw } from './characters.js?v=20260421i';
import { getActivityDef, getBusyWorkers } from './activities.js?v=20260421k';
import { getOwnedWorkers, getWorkerInfo, shouldWorkerSpendIdleTimeOutside } from './workers.js?v=20260422a';

export const OUTSIDE_ACTIVITY_IDS = ['gather_wood', 'gather_stone', 'farm_food'];

const OUTSIDE_STATION_CONFIG = {
  gather_wood: {
    id: 'bamboo-grove',
    icon: '🎋',
    title: 'Bambushain',
    hint: 'Holzproduktion liegt draussen zwischen Bambus und Werkzeugkisten.',
    sceneX: 24,
    sceneY: 34,
    accent: 'grove',
    structureIcon: '🎋',
    structureClass: 'grove',
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
    hint: 'Ein robuster Spot fuer Stein, Kisten und spaetere Aufwertungen.',
    sceneX: 74,
    sceneY: 36,
    accent: 'stone',
    structureIcon: '🪨',
    structureClass: 'stone',
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
    hint: 'Nahrung waechst sichtbar im Gartenbereich des Hofs.',
    sceneX: 49,
    sceneY: 68,
    accent: 'garden',
    structureIcon: '🥕',
    structureClass: 'garden',
    slots: [
      { x: 42, y: 82 },
      { x: 52, y: 86 },
      { x: 59, y: 79 },
    ],
  },
};

const OUTSIDE_IDLE_SLOTS = [
  { x: 18, y: 76 },
  { x: 30, y: 85 },
  { x: 52, y: 88 },
  { x: 71, y: 81 },
  { x: 84, y: 72 },
];

let outsideAnimId = null;
let selectedOutsideActivityId = null;
let suppressOutsideStationClickUntil = 0;

const OUTSIDE_DRAG_THRESHOLD_PX = 8;

const OUTSIDE_TILE_ROWS = [7, 8, 9, 10, 11, 11, 10, 9, 8];

function renderOutsideIsoGrid() {
  return `
    <div class="outside-iso-grid" aria-hidden="true">
      ${OUTSIDE_TILE_ROWS.map((count, rowIndex) => `
        <div class="outside-iso-row" style="--row-shift:${rowIndex % 2 === 0 ? '0px' : '40px'};">
          ${Array.from({ length: count }, (_, tileIndex) => `
            <span class="outside-iso-tile tile-${(rowIndex + tileIndex) % 3} ${(rowIndex + tileIndex) % 4 === 0 ? 'has-clover' : ''}"></span>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

export function getOutsideSummary(state = getState()) {
  const activeOutsideJobs = (state.activities || []).filter((activity) => OUTSIDE_ACTIVITY_IDS.includes(activity.id));
  const totalWorkers = activeOutsideJobs.reduce((sum, activity) => sum + (activity.workers?.length || 0), 0);
  const stations = Object.entries(OUTSIDE_STATION_CONFIG).map(([activityId, station]) => {
    const activity = activeOutsideJobs.find((entry) => entry.id === activityId) || null;
    const def = getActivityDef(activityId);
    const workers = (activity?.workers || [])
      .map((workerId, index) => {
        const worker = getWorkerInfo(state, workerId);
        if (!worker) return null;
        return {
          id: workerId,
          name: worker.displayName,
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
      level: 1,
      maxWorkers: def?.workers?.max || 1,
      status: activity ? `${workers.length} Worker aktiv` : 'Bereit',
      body: activity
        ? `${def?.name || 'Produktion'} laeuft gerade auf dieser Aussenstation.`
        : station.hint,
    };
  });

  const busyWorkerIds = getBusyWorkers(state);
  const idleResidents = getOwnedWorkers(state)
    .filter((worker) => !busyWorkerIds.has(worker.id) && shouldWorkerSpendIdleTimeOutside(worker.id))
    .slice(0, OUTSIDE_IDLE_SLOTS.length)
    .map((worker, index) => {
      const char = worker.char;
      const slot = OUTSIDE_IDLE_SLOTS[index];
      return {
        id: worker.id,
        name: worker.displayName,
        species: char.species,
        pose: index % 2 === 0 ? 'idle' : 'walk',
        dir: index % 2,
        x: slot.x,
        y: slot.y,
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
        type: 'active',
        currentActivityId: station.activityId,
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

function drawOutsideWorkers(timestamp, getHouseView) {
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

  outsideAnimId = requestAnimationFrame((nextTimestamp) => drawOutsideWorkers(nextTimestamp, getHouseView));
}

function ensureOutsideAnimation(getHouseView) {
  if (outsideAnimId) cancelAnimationFrame(outsideAnimId);
  outsideAnimId = null;
  if (getCurrentScreen() === 'house' && getHouseView() === 'outside') {
    outsideAnimId = requestAnimationFrame((timestamp) => drawOutsideWorkers(timestamp, getHouseView));
  }
}

export function stopOutsideAnimation() {
  if (outsideAnimId) cancelAnimationFrame(outsideAnimId);
  outsideAnimId = null;
}

export function renderOutsideScene({
  getHouseView,
  openActivityModal,
  openWorkerSelectModal,
  onWorkerDrop,
  outsideScene = document.getElementById('outside-scene'),
}) {
  if (!outsideScene) return;

  const outside = getOutsideSummary();
  const selectedStation = outside.stations.find((station) => station.activityId === selectedOutsideActivityId) || null;
  outsideScene.innerHTML = `
    <div class="outside-scroll">
      <div class="outside-scene-backdrop">
        <div class="outside-cloud cloud-a"></div>
        <div class="outside-cloud cloud-b"></div>
        <div class="outside-cloud cloud-c"></div>
        <div class="outside-sun"></div>
        <div class="outside-hills"></div>
        <div class="outside-ground"></div>
      </div>

      <section class="outside-hero">
        <div class="outside-header">
          <div class="outside-title">Aussen</div>
          <button class="gacha-btn secondary outside-open-work" id="btn-open-outside-work">Arbeit oeffnen</button>
        </div>

        <div class="outside-stage">
          <div class="outside-world">
            ${renderOutsideIsoGrid()}

            <div class="outside-house-backdrop" aria-hidden="true">
              <div class="outside-house-shadow"></div>
              <div class="outside-house-chimney"></div>
              <div class="outside-house-roof"></div>
              <div class="outside-house-body">
                <div class="outside-house-window window-left"></div>
                <div class="outside-house-door"></div>
                <div class="outside-house-window window-right"></div>
              </div>
              <div class="outside-house-flower flower-left"></div>
              <div class="outside-house-flower flower-right"></div>
              <div class="outside-house-porch"></div>
            </div>

            <div class="outside-fence-row" aria-hidden="true"></div>
            <div class="outside-path outside-path-main" aria-hidden="true"></div>
            <div class="outside-path outside-path-side" aria-hidden="true"></div>

            <div class="outside-decor-layer" aria-hidden="true">
              <div class="outside-zone outside-zone-grove"></div>
              <div class="outside-zone outside-zone-stone"></div>
              <div class="outside-zone outside-zone-garden"></div>
              <div class="outside-bush bush-a"></div>
              <div class="outside-bush bush-b"></div>
              <div class="outside-bush bush-c"></div>
              <div class="outside-lantern lantern-a"></div>
              <div class="outside-lantern lantern-b"></div>
            </div>

            <div class="outside-station-layer">
              ${outside.stations.map((station) => `
                <button
                  class="outside-station-spot outside-station-spot-${station.structureClass} ${station.activity ? 'is-active' : ''} ${selectedStation?.activityId === station.activityId ? 'is-selected' : ''}"
                  style="left:${station.sceneX}%; top:${station.sceneY}%; z-index:${100 + Math.round(station.sceneY)};"
                  data-outside-activity="${station.activityId}"
                  aria-label="${station.title}"
                  aria-pressed="${selectedStation?.activityId === station.activityId ? 'true' : 'false'}"
                >
                  <div class="outside-station-shadow"></div>
                  <div class="outside-station-pedestal"></div>
                  <div class="outside-station-structure">
                    <div class="outside-station-structure-icon">${station.structureIcon}</div>
                  </div>
                  <div class="outside-station-label">
                    <span class="outside-station-name">${station.title}</span>
                    <span class="outside-station-count">${station.workers.length}/${station.maxWorkers}</span>
                  </div>
                  ${station.activity ? '<div class="outside-station-pulse"></div>' : ''}
                </button>
              `).join('')}
            </div>

            <div class="outside-actors-layer">
              ${outside.residents.map((resident, index) => `
                <div
                  class="outside-actor outside-actor-${resident.type}"
                  style="left:${resident.x}%; top:${resident.y}%; z-index:${160 + Math.round(resident.y)};"
                  data-actor-index="${index}"
                  data-worker-id="${resident.id}"
                  data-current-activity="${resident.currentActivityId || ''}"
                  data-species="${resident.species}"
                  title="${resident.name}"
                >
                  <div class="outside-actor-shadow ${resident.species === 'slime' ? 'is-slime' : ''}"></div>
                  <canvas class="outside-actor-canvas" width="72" height="84" data-worker-id="${resident.id}" data-pose="${resident.pose}" data-dir="${resident.dir}" data-species="${resident.species}"></canvas>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>

      <div class="outside-station-grid ${selectedStation ? 'is-open' : ''}">
        ${selectedStation ? `
          <section class="outside-plot outside-plot-${selectedStation.id} ${selectedStation.activity ? 'is-active' : ''}">
            <button class="outside-plot-close" type="button" data-close-outside-panel="true" aria-label="Panel schliessen">✕</button>
            <div class="outside-plot-sign">
              <span class="outside-plot-icon">${selectedStation.icon}</span>
              <div>
                <div class="outside-plot-title">${selectedStation.title}</div>
                <div class="outside-plot-status">${selectedStation.status}</div>
              </div>
            </div>
            <div class="outside-worker-row">
              ${selectedStation.workers.length > 0 ? selectedStation.workers.map((worker) => `
                <div class="outside-worker">
                  <canvas class="outside-worker-canvas" width="72" height="84" data-worker-id="${worker.id}" data-pose="${worker.pose}" data-dir="${worker.dir}"></canvas>
                  <div class="outside-worker-name">${worker.name}</div>
                </div>
              `).join('') : '<div class="outside-empty-worker">Frei fuer neue Worker</div>'}
            </div>
            <div class="outside-plot-copy">${selectedStation.body}</div>
            <div class="outside-plot-copy">Aktuelle Slots: ${selectedStation.maxWorkers}</div>
            <div class="outside-station-actions">
              <button class="outside-assign-btn" data-outside-activity="${selectedStation.activityId}">Worker zuweisen</button>
            </div>
          </section>
        ` : `
          <div class="outside-station-hint">Tippe auf einen Arbeitsort im Hof, um Details einzublenden.</div>
        `}
      </div>
    </div>
  `;

  const openWorkBtn = document.getElementById('btn-open-outside-work');
  if (openWorkBtn) openWorkBtn.addEventListener('click', openActivityModal);

  outsideScene.querySelectorAll('.outside-station-spot').forEach((button) => {
    button.addEventListener('click', () => {
      if (Date.now() < suppressOutsideStationClickUntil) return;
      selectedOutsideActivityId = button.dataset.outsideActivity || null;
      renderOutsideScene({
        getHouseView,
        openActivityModal,
        openWorkerSelectModal,
        onWorkerDrop,
        outsideScene,
      });
    });
  });

  outsideScene.querySelectorAll('.outside-assign-btn').forEach((button) => {
    button.addEventListener('click', () => openWorkerSelectModal(button.dataset.outsideActivity));
  });

  const closePanelBtn = outsideScene.querySelector('[data-close-outside-panel]');
  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => {
      selectedOutsideActivityId = null;
      renderOutsideScene({
        getHouseView,
        openActivityModal,
        openWorkerSelectModal,
        onWorkerDrop,
        outsideScene,
      });
    });
  }

  if (onWorkerDrop) {
    outsideScene.querySelectorAll('.outside-actor').forEach((actor) => {
      actor.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();

        const startX = event.clientX;
        const startY = event.clientY;
        const originalStyle = actor.getAttribute('style') || '';
        let currentDropTarget = null;
        let dragging = false;

        const clearDropTarget = () => {
          if (currentDropTarget) currentDropTarget.classList.remove('is-drop-target');
          currentDropTarget = null;
        };

        const updateGhostPosition = (clientX, clientY) => {
          actor.style.left = `${clientX}px`;
          actor.style.top = `${clientY}px`;
        };

        const beginDrag = (clientX, clientY) => {
          if (dragging) return;
          dragging = true;
          actor.classList.add('is-dragging');
          outsideScene.classList.add('is-dragging-worker');
          updateGhostPosition(clientX, clientY);
        };

        const handleMove = (moveEvent) => {
          moveEvent.preventDefault();
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          if (!dragging && Math.hypot(dx, dy) < OUTSIDE_DRAG_THRESHOLD_PX) return;

          beginDrag(moveEvent.clientX, moveEvent.clientY);
          updateGhostPosition(moveEvent.clientX, moveEvent.clientY);

          const nextDropTarget = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('.outside-station-spot');
          if (nextDropTarget !== currentDropTarget) {
            clearDropTarget();
            currentDropTarget = nextDropTarget;
            if (currentDropTarget) currentDropTarget.classList.add('is-drop-target');
          }
        };

        const finishDrag = async (upEvent) => {
          upEvent.preventDefault();
          actor.releasePointerCapture?.(event.pointerId);
          actor.removeEventListener('pointermove', handleMove);
          actor.removeEventListener('pointerup', finishDrag);
          actor.removeEventListener('pointercancel', finishDrag);
          outsideScene.classList.remove('is-dragging-worker');

          const dropTarget = dragging
            ? document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('.outside-station-spot')
            : null;
          const workerId = actor.dataset.workerId;
          const fromActivityId = actor.dataset.currentActivity;

          clearDropTarget();
          if (dragging) suppressOutsideStationClickUntil = Date.now() + 250;

          if (dropTarget && workerId) {
            const targetActivityId = dropTarget.dataset.outsideActivity;
            const applied = onWorkerDrop({
              workerId,
              fromActivityId: fromActivityId || null,
              targetActivityId,
            });

            if (applied) {
              selectedOutsideActivityId = targetActivityId || null;
              renderOutsideScene({
                getHouseView,
                openActivityModal,
                openWorkerSelectModal,
                onWorkerDrop,
                outsideScene,
              });
              return;
            }
          }

          actor.classList.remove('is-dragging');
          actor.setAttribute('style', originalStyle);
        };

        actor.setPointerCapture?.(event.pointerId);
        actor.addEventListener('pointermove', handleMove);
        actor.addEventListener('pointerup', finishDrag);
        actor.addEventListener('pointercancel', finishDrag);
      });
    });
  }

  ensureOutsideAnimation(getHouseView);
}
