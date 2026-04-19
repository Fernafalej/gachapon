// js/ui.js – Screen-Transitions, Modals, Resource-Bar
import { getState } from './state.js';

let currentScreen = 'house';
let onScreenChange = null;

export function setOnScreenChange(cb) {
  onScreenChange = cb;
}

export function initUI() {
  // Navigation
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const screen = tab.dataset.screen;
      switchScreen(screen);
    });
  });

  // Modal overlay schließen bei Tap außerhalb
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Resource-Bar initialisieren
  updateResourceBar();
}

export function switchScreen(name) {
  if (name === currentScreen) return;

  // Alle Screens verstecken
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
  });

  // Ziel-Screen zeigen
  const target = document.getElementById(`screen-${name}`);
  if (target) {
    target.classList.add('active');
  }

  // Nav-Tabs aktualisieren
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.screen === name);
  });

  currentScreen = name;

  if (onScreenChange) onScreenChange(name);
}

export function getCurrentScreen() {
  return currentScreen;
}

// ---- Modal ----

export function openModal(contentHTML) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = contentHTML;
  overlay.classList.remove('hidden');

  // Close-Buttons verdrahten
  content.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}

// ---- Confirm Dialog ----

export function showConfirm(message, onConfirm) {
  openModal(`
    <div class="confirm-dialog">
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="confirm-cancel">Abbrechen</button>
        <button class="confirm-ok">Ja, wirklich</button>
      </div>
    </div>
  `);

  const content = document.getElementById('modal-content');
  content.querySelector('.confirm-cancel').addEventListener('click', closeModal);
  content.querySelector('.confirm-ok').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

// ---- Resource Bar ----

const RES_IDS = {
  wood:   'res-wood',
  stone:  'res-stone',
  food:   'res-food',
  fabric: 'res-fabric',
};

export function updateResourceBar() {
  const state = getState();
  if (!state) return;

  for (const [key, elId] of Object.entries(RES_IDS)) {
    const el = document.querySelector(`#${elId} .resource-value`);
    if (el) el.textContent = Math.floor(state.resources[key] || 0);
  }
}
