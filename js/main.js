// js/main.js – App-Init, Screen-Routing
import { initState, getState, mutate, resetState, saveState } from './state.js';
import { initUI, switchScreen, setOnScreenChange, updateResourceBar, showConfirm } from './ui.js';
import { getAllCharacters, getCharacter, getSpeciesDraw, drawCharacter, getTotalCharacterCount } from './characters.js';
import { initRoom, updateRoom, renderRoom } from './room.js';

// ---- App Start ----
const state = initState();

// Offline-Progress anwenden (Stub – wird in Schritt 8 implementiert)
applyOfflineProgress(state);
saveState(state);

// UI initialisieren
initUI();
updateResourceBar();

// Canvas-Setup
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

// ---- Iso-Renderer initialisieren ----

function setupRoom() {
  const s = getState();
  const collected = Object.keys(s.collection);

  let chars;
  if (collected.length > 0) {
    chars = collected.map(id => getCharacter(id)).filter(Boolean);
  } else {
    chars = getAllCharacters().slice(0, Math.min(5, getAllCharacters().length));
  }

  initRoom(chars, drawCharacter);
  console.log('🏠 Raum initialisiert mit ' + chars.length + ' Figuren');
}

try {
  setupRoom();
} catch (e) {
  console.error('Fehler bei Raum-Init:', e);
}

// ---- Render-Loop ----

function render(timestamp) {
  const t = timestamp / 1000;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);

  updateRoom(t);
  renderRoom(ctx, w, h, t);

  animationId = requestAnimationFrame(render);
}

function startRender() {
  if (!animationId) {
    animationId = requestAnimationFrame(render);
  }
}

function stopRender() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

setOnScreenChange((screen) => {
  if (screen === 'house') {
    resizeCanvas();
    startRender();
  } else {
    stopRender();
  }
  if (screen === 'collection') renderCollection();
  if (screen === 'profile') renderProfile();
  if (screen === 'gacha') renderGachaScreen();
});

startRender();

// ---- Sammlung-Screen (Vorschau) ----

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = '';

  const all = getAllCharacters();
  const collection = getState().collection;

  all.forEach(char => {
    const owned = collection[char.id];
    const card = document.createElement('div');
    card.className = `collection-card rarity-border-${char.rarity}`;
    if (!owned) card.classList.add('undiscovered');

    if (owned) {
      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 64;
      miniCanvas.height = 64;
      const mCtx = miniCanvas.getContext('2d');
      const draw = getSpeciesDraw(char.species);
      if (draw) {
        draw.idle(mCtx, 32, 52, performance.now() / 1000, char.palette);
      }
      card.appendChild(miniCanvas);

      const name = document.createElement('div');
      name.className = 'char-name';
      name.textContent = char.name;
      card.appendChild(name);

      const lvl = document.createElement('div');
      lvl.className = 'level-badge';
      lvl.textContent = `Lv.${owned.level}`;
      card.appendChild(lvl);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'char-name';
      placeholder.textContent = '???';
      placeholder.style.fontSize = '24px';
      card.appendChild(placeholder);
    }

    grid.appendChild(card);
  });
}

// ---- Gacha-Screen (Vorschau) ----

function renderGachaScreen() {
  const s = getState();
  document.getElementById('gacha-token-count').textContent = s.gacha.tokens;
  document.getElementById('pity-count').textContent = 10 - s.gacha.pity_counter;
  document.getElementById('btn-draw-1').disabled = s.gacha.tokens < 1;
  document.getElementById('btn-draw-10').disabled = s.gacha.tokens < 10;

  const freeRoll = document.getElementById('free-roll-badge');
  freeRoll.classList.toggle('hidden', !s.gacha.free_roll_available);
}

// ---- Profil-Screen ----

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
      const typeLabels = { steps: 'Schritte', sport: 'Sport', calories: 'Kalorien' };
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

// ---- Reset ----

document.getElementById('btn-reset').addEventListener('click', () => {
  showConfirm('Willst du wirklich deinen gesamten Spielstand löschen? Das kann nicht rückgängig gemacht werden.', () => {
    const newState = resetState();
    Object.assign(getState(), newState);
    saveState(getState());
    updateResourceBar();
    setupRoom();
    switchScreen('house');
  });
});

// ---- Offline-Progress Stub ----

function applyOfflineProgress(state) {
  const now = Math.floor(Date.now() / 1000);
  state.last_seen = now;
}

// ---- Free Roll Check ----

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

checkFreeRoll(state);
saveState(state);

console.log(`🏠 Gachapon Häuschen geladen – ${getAllCharacters().length} Figuren, ${getTotalCharacterCount()} total`);
