// js/sfx.js – Synthesized sound effects via Web Audio API
let ctx = null;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  // Resume if suspended (autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function noise(duration, volume = 0.06, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 1.5;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start(t);
  source.stop(t + duration);
}

// ---- Exported Sounds ----

/** Münze fällt in die Maschine */
export function sfxCoin() {
  playTone(1800, 0.08, 'square', 0.08);
  playTone(2400, 0.12, 'square', 0.06, 0.06);
}

/** Maschine rattert */
export function sfxRattle() {
  for (let i = 0; i < 4; i++) {
    noise(0.06, 0.08, i * 0.08);
    playTone(200 + i * 30, 0.05, 'square', 0.04, i * 0.08);
  }
}

/** Kapsel wackelt */
export function sfxWobble() {
  playTone(300, 0.15, 'sine', 0.05);
  playTone(340, 0.15, 'sine', 0.05, 0.15);
  playTone(300, 0.15, 'sine', 0.05, 0.30);
}

/** Super Rare Charge-Up */
export function sfxCharge() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.6);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.setValueAtTime(0.12, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.7);
}

/** Kapsel platzt – Rarity-abhängig */
export function sfxBurst(rarity) {
  noise(0.15, 0.12);
  if (rarity === 'common') {
    playTone(600, 0.2, 'sine', 0.1);
  } else if (rarity === 'rare') {
    playTone(700, 0.2, 'sine', 0.12);
    playTone(880, 0.25, 'sine', 0.08, 0.08);
  } else {
    playTone(800, 0.2, 'sine', 0.12);
    playTone(1000, 0.25, 'sine', 0.1, 0.06);
    playTone(1200, 0.3, 'sine', 0.08, 0.12);
  }
}

/** Figur erscheint – Common/Shard */
export function sfxRevealCommon() {
  playTone(523, 0.15, 'sine', 0.1);
  playTone(659, 0.2, 'sine', 0.08, 0.1);
}

/** Figur erscheint – Rare */
export function sfxRevealRare() {
  playTone(523, 0.12, 'sine', 0.1);
  playTone(659, 0.12, 'sine', 0.1, 0.1);
  playTone(784, 0.25, 'sine', 0.1, 0.2);
}

/** Figur erscheint – Super Rare Fanfare */
export function sfxRevealSuperRare() {
  playTone(523, 0.12, 'triangle', 0.12);
  playTone(659, 0.12, 'triangle', 0.12, 0.1);
  playTone(784, 0.12, 'triangle', 0.12, 0.2);
  playTone(1047, 0.4, 'triangle', 0.14, 0.3);
  // Shimmer
  playTone(1568, 0.3, 'sine', 0.04, 0.35);
  playTone(2093, 0.3, 'sine', 0.03, 0.4);
}

/** Neue Figur! – Celebratory Jingle */
export function sfxNewChar() {
  // C E G C' E' – aufsteigende Freude
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => {
    playTone(f, 0.18, 'triangle', 0.1, 0.55 + i * 0.1);
  });
  // Kleiner Shimmer am Ende
  playTone(1568, 0.4, 'sine', 0.04, 1.05);
}

/** Level Up! – Aufsteigendes Arpeggio */
export function sfxLevelUp() {
  const notes = [440, 554, 659, 880];
  notes.forEach((f, i) => {
    playTone(f, 0.2, 'square', 0.06, 0.55 + i * 0.12);
  });
  playTone(1760, 0.4, 'sine', 0.05, 1.05);
}

/** Tap / UI Click */
export function sfxTap() {
  playTone(800, 0.06, 'sine', 0.06);
}
