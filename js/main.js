// js/main.js – App-Init, Screen-Routing, Gacha + Activity Wiring
import { initState, getState, mutate, resetState, saveState } from './state.js';
import { initUI, switchScreen, setOnScreenChange, updateResourceBar, openModal, closeModal, showConfirm } from './ui.js';
import { getAllCharacters, getCharacter, getSpeciesDraw, drawCharacter, getTotalCharacterCount, getCharactersByRarity } from './characters.js';
import { initRoom, updateRoom, renderRoom, initRoomControls, setOnTileTap, setFurniture, findFurnitureAt, GRID } from './room.js';
import { draw, freeRollDraw, processDrawResult, TOKEN_TABLES } from './gacha.js';
import {
  applyOfflineProgress, checkCompletions, getAllActivityDefs, getActivityDef,
  startActivity, removeActivity, getBusyWorkers, calcDuration, canAfford,
  getRemainingTime, getProgress, formatTime
} from './activities.js';
import { allFurniture } from '../data/furniture/index.js';
import {
  sfxCoin, sfxRattle, sfxWobble, sfxCharge, sfxBurst,
  sfxRevealCommon, sfxRevealRare, sfxRevealSuperRare,
  sfxNewChar, sfxLevelUp, sfxTap
} from './sfx.js';

// ---- Möbel-Lookup ----
const furnitureMap = {};
for (const f of allFurniture) furnitureMap[f.id] = f;

// ---- Room Management ----
let currentRoomIndex = 0;
let placingFurnitureMode = false;

// ---- App Start ----
const state = initState();

// Offline-Progress anwenden
const offlineCompletions = applyOfflineProgress(state);
checkFreeRoll(state);
saveState(state);

// UI initialisieren
initUI();
updateResourceBar();

// ---- Canvas-Setup ----
const canvas = document.getElementById('room-canvas');
const ctx = canvas.getContext('2d');
let animationId = null;

function resizeCanvas() {
  const container = document.getElementById('screen-house');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
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

function getDemoFurniture() {
  return buildFurnitureForRoom([
    { furniture_id: 'rug',          tx: 2, ty: 2 },
    { furniture_id: 'wooden_table', tx: 1, ty: 0 },
    { furniture_id: 'cozy_chair',   tx: 0, ty: 2 },
    { furniture_id: 'plant',        tx: 5, ty: 0 },
    { furniture_id: 'bookshelf',    tx: 0, ty: 4 },
    { furniture_id: 'lamp',         tx: 5, ty: 5 },
    { furniture_id: 'bed',          tx: 4, ty: 0 },
  ]);
}

// ---- Raum-Setup ----
function setupRoom(roomIndex) {
  if (roomIndex !== undefined) currentRoomIndex = roomIndex;
  const s = getState();
  const collected = Object.keys(s.collection);
  let chars;
  if (collected.length > 0) {
    chars = collected.map(id => getCharacter(id)).filter(Boolean);
  } else {
    chars = getAllCharacters().slice(0, Math.min(5, getAllCharacters().length));
  }

  const placements = (s.house.placements || []).filter(p => (p.room || 0) === currentRoomIndex);
  const furniture = placements.length > 0
    ? buildFurnitureForRoom(placements)
    : (currentRoomIndex === 0 ? getDemoFurniture() : []);

  initRoom(chars, drawCharacter, furniture);
  updateRoomIndicator();
}

try { setupRoom(); } catch (e) { console.error('Raum-Init Fehler:', e); }

// ---- Render-Loop ----
function render(timestamp) {
  const t = timestamp / 1000;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  updateRoom(t);
  renderRoom(ctx, w, h, t);
  animationId = requestAnimationFrame(render);
}

function startRender() { if (!animationId) animationId = requestAnimationFrame(render); }
function stopRender() { if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }

// ---- Screen-Wechsel ----
setOnScreenChange((screen) => {
  if (screen === 'house') { resizeCanvas(); startRender(); updateActivityBadge(); updateRoomIndicator(); }
  else stopRender();
  if (screen === 'collection') renderCollection();
  if (screen === 'profile') renderProfile();
  if (screen === 'gacha') renderGachaScreen();
});

startRender();

// ---- Room Indicator ----
function updateRoomIndicator() {
  const s = getState();
  const container = document.getElementById('room-indicator');
  if (!container) return;
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

// ---- Furniture Placement Button ----
document.getElementById('btn-place-furniture').addEventListener('click', () => {
  placingFurnitureMode = !placingFurnitureMode;
  document.getElementById('btn-place-furniture').classList.toggle('fab-active', placingFurnitureMode);
});

// ---- Tile Tap Handler ----
setOnTileTap((tile) => {
  if (placingFurnitureMode) {
    const existing = findFurnitureAt(tile.tx, tile.ty);
    if (existing) {
      openFurnitureManageModal(existing, tile);
    } else {
      openFurniturePlaceModal(tile.tx, tile.ty);
    }
  }
});

function openFurniturePlaceModal(tx, ty) {
  const s = getState();
  const owned = s.unlocked_recipes || [];

  let itemsHTML = '<div class="furniture-grid">';
  for (const f of allFurniture) {
    const fits = checkFurnitureFits(tx, ty, f.size || { w: 1, d: 1 });
    const hasRecipe = owned.includes(f.id);
    const canBuy = fits && f.buy && s.resources.goods >= f.buy.cost.goods;
    const unlockCost = f.craft?.unlock_cost?.ideas || 0;
    const canUnlock = fits && !hasRecipe && s.resources.ideas >= unlockCost;
    const canCraft = fits && hasRecipe && f.craft &&
      s.resources.material >= (f.craft.cost.material || 0) &&
      s.resources.ideas >= (f.craft.cost.ideas || 0);

    const buyLabel = f.buy ? `${f.buy.cost.goods} 🧁` : '–';

    // Craft button has 3 states: unlock / build / locked
    let craftBtnClass, craftBtnText;
    if (!hasRecipe) {
      craftBtnClass = canUnlock ? 'furniture-unlock-btn' : 'furniture-unlock-btn btn-too-poor';
      craftBtnText = `🔓 Rezept ${unlockCost} 💡`;
    } else {
      const matCost = f.craft?.cost?.material || 0;
      const ideaCost = f.craft?.cost?.ideas || 0;
      craftBtnClass = canCraft ? 'furniture-craft-btn' : 'furniture-craft-btn btn-too-poor';
      craftBtnText = `🔨 Bauen ${matCost} 🪵 + ${ideaCost} 💡`;
    }

    itemsHTML += `
      <div class="furniture-option ${!fits ? 'furniture-no-fit' : ''}" data-furniture-id="${f.id}">
        <canvas width="64" height="64" data-furniture-id="${f.id}"></canvas>
        <div class="furniture-option-info">
          <div class="furniture-name">${f.name}</div>
          <div class="furniture-size">${f.size.w}×${f.size.d}${!fits ? ' · passt hier nicht' : ''}</div>
          <div class="furniture-actions">
            <button class="furniture-buy-btn ${canBuy ? '' : 'btn-too-poor'}" data-id="${f.id}" ${!fits ? 'disabled' : ''}>
              🛒 ${buyLabel}
            </button>
            <button class="${craftBtnClass}" data-id="${f.id}" ${!fits ? 'disabled' : ''}>
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

  // Buy buttons – all of them, check affordability in handler
  document.querySelectorAll('.furniture-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fId = btn.dataset.id;
      const fDef = furnitureMap[fId];
      if (!fDef || !fDef.buy) return;
      const cur = getState();
      if (cur.resources.goods < fDef.buy.cost.goods) {
        btn.classList.add('btn-shake');
        setTimeout(() => btn.classList.remove('btn-shake'), 400);
        return;
      }
      mutate(s => {
        s.resources.goods -= fDef.buy.cost.goods;
        s.house.placements.push({ room: currentRoomIndex, furniture_id: fId, tx, ty });
      });
      closeModal();
      placingFurnitureMode = false;
      document.getElementById('btn-place-furniture').classList.remove('fab-active');
      updateResourceBar();
      setupRoom(currentRoomIndex);
    });
  });

  // Unlock-Recipe buttons
  document.querySelectorAll('.furniture-unlock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fId = btn.dataset.id;
      const fDef = furnitureMap[fId];
      if (!fDef) return;
      const cost = fDef.craft?.unlock_cost?.ideas || 0;
      const cur = getState();
      if (cur.resources.ideas < cost) {
        btn.classList.add('btn-shake');
        setTimeout(() => btn.classList.remove('btn-shake'), 400);
        return;
      }
      mutate(s => {
        s.resources.ideas -= cost;
        if (!s.unlocked_recipes) s.unlocked_recipes = [];
        s.unlocked_recipes.push(fId);
      });
      updateResourceBar();
      openFurniturePlaceModal(tx, ty); // Re-render with recipe unlocked
    });
  });

  // Craft buttons (recipe already unlocked)
  document.querySelectorAll('.furniture-craft-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fId = btn.dataset.id;
      const fDef = furnitureMap[fId];
      if (!fDef || !fDef.craft) return;
      const cur = getState();
      const matCost = fDef.craft.cost.material || 0;
      const ideaCost = fDef.craft.cost.ideas || 0;
      if (cur.resources.material < matCost || cur.resources.ideas < ideaCost) {
        btn.classList.add('btn-shake');
        setTimeout(() => btn.classList.remove('btn-shake'), 400);
        return;
      }
      mutate(s => {
        s.resources.material -= matCost;
        s.resources.ideas -= ideaCost;
        s.house.placements.push({ room: currentRoomIndex, furniture_id: fId, tx, ty });
      });
      closeModal();
      placingFurnitureMode = false;
      document.getElementById('btn-place-furniture').classList.remove('fab-active');
      updateResourceBar();
      setupRoom(currentRoomIndex);
    });
  });
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
        const icons = { material: '🪵', ideas: '💡', goods: '🧁' };
        return `${icons[k] || ''} +${v * (c.cycles || 1)} ${k}`;
      }).join(', ');
      msg += `<div class="offline-item">${name}: ${outputStr}</div>`;
    } else if (c.type === 'room_built') {
      msg += `<div class="offline-item">🏠 Neues Zimmer gebaut! (${c.rooms} Räume)</div>`;
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
    updateRoomIndicator();
    // If a room was built, refresh the room
    if (completions.some(c => c.type === 'room_built')) {
      setupRoom(currentRoomIndex);
    }
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
      updateRoomIndicator();
      updateActivityBadge();
    }
  }, 5000);
}

startActivityChecker();

// ---- Aktivitäts-Zuweisung ----
document.getElementById('btn-assign-activity').addEventListener('click', () => {
  openActivityModal();
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
      const remaining = getRemainingTime(act);
      const progress = getProgress(act);
      const workerNames = act.workers.map(id => {
        const c = getCharacter(id);
        return c ? c.name : id;
      }).join(', ');

      activeHTML += `
        <div class="activity-item active-activity">
          <div class="activity-name">${def ? def.name : act.id}</div>
          <div class="activity-meta">
            ${workerNames} · ${formatTime(remaining)} verbleibend
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
            const icons = { material: '🪵', ideas: '💡', goods: '🧁' };
            return `${icons[k] || ''} ${v}`;
          }).join(' + ')
        : 'Keine';

      const outputStr = def.output
        ? Object.entries(def.output).map(([k, v]) => {
            const icons = { material: '🪵', ideas: '💡', goods: '🧁' };
            return `${icons[k] || ''} +${v}`;
          }).join(', ')
        : (def.unlocks === 'room_slot' ? '🏠 Neues Zimmer' : '–');

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
      mutate(s => removeActivity(s, idx));
      updateResourceBar();
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
    const duration = calcDuration(def, Math.max(1, selected.size), s);
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
        updateActivityBadge();
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
      <div class="gacha-globe"></div>
      <div class="gacha-base"></div>
      <div class="gacha-knob"></div>
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
    const fresh = initState();
    currentRoomIndex = 0;
    updateResourceBar();
    setupRoom(0);
    switchScreen('house');
  });
});

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
