// Sky Courier — game loop, states, keyboard/mouse input, scoring and
// the deterministic ?shot= poses the screenshots are taken from.
import { VIEW, clamp } from './config.js';
import { makeTerrain } from './terrain.js';
import { makePlane, updatePlane, landingScore } from './plane.js';
import { MISSIONS, makeMissionState, checkRing, missionComplete, finalScore } from './missions.js';
import { makeAudio } from './audio.js';
import { renderGame } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const menuEl = document.getElementById('menu');
const endEl = document.getElementById('endcard');
const missionListEl = document.getElementById('missionList');
const audio = makeAudio();

const params = new URLSearchParams(location.search);
const shot = params.get('shot'); // start | play | end | null
const seedParam = Number(params.get('seed') || 1);

const input = {
  pitchUp: false, pitchDown: false, bankLeft: false, bankRight: false,
  throttleUp: false, throttleDown: false, flaps: false,
};

const state = {
  phase: 'menu', // menu | flying | paused | crashed | landed
  plane: makePlane(),
  terrain: makeTerrain(MISSIONS[0].seed),
  missionState: makeMissionState(MISSIONS[0]),
  toasts: [],
  time: 0,
  crashReason: '',
  landingPoints: 0,
  total: 0,
};

function toast(text, color) {
  state.toasts.push({ text, color: color || '#ffd23e', life: 2.2 });
  if (state.toasts.length > 3) state.toasts.shift();
}

function buildMenu() {
  missionListEl.innerHTML = '';
  MISSIONS.forEach((m) => {
    const b = document.createElement('button');
    b.className = 'missionBtn';
    b.innerHTML = `<b>${m.tag}. ${m.name}</b><span>${m.blurb}</span><span>Par ${m.parSeconds}s &middot; ${m.rings.length} rings</span>`;
    b.addEventListener('click', () => { audio.unlock(); audio.click(); startMission(m); });
    missionListEl.appendChild(b);
  });
}

function startMission(mission) {
  state.missionState = makeMissionState(JSON.parse(JSON.stringify(mission)));
  state.terrain = makeTerrain(mission.seed);
  state.plane = makePlane();
  state.toasts = [];
  state.time = 0;
  state.phase = 'flying';
  state.crashReason = '';
  menuEl.classList.add('hidden');
  endEl.classList.add('hidden');
  toast(`${mission.name} — FLY THE RINGS, THEN LAND`, '#7ee787');
}

function showEnd(title, lines, win) {
  state.phase = win ? 'landed' : 'crashed';
  endEl.innerHTML = `<h2 style="color:${win ? '#7ee787' : '#ff5a3c'}">${title}</h2>`
    + lines.map((l) => `<p>${l}</p>`).join('')
    + `<button id="againBtn">FLY AGAIN (R)</button><button id="menuBtn" style="background:#7ec8ff;margin-left:12px">CHANGE MISSION</button>`;
  endEl.classList.remove('hidden');
  document.getElementById('againBtn').addEventListener('click', () => startMission(state.missionState.mission));
  document.getElementById('menuBtn').addEventListener('click', () => {
    state.phase = 'menu'; endEl.classList.add('hidden'); menuEl.classList.remove('hidden');
  });
}

function endFlightLanded() {
  const landing = landingScore(state.plane);
  state.landingPoints = landing;
  state.total = finalScore(state.missionState, state.plane, landing);
  audio.touchdown(); audio.fanfare();
  showEnd('MISSION COMPLETE', [
    `${state.missionState.mission.name} — all rings flown, wheels down on runway 09.`,
    `Rings ${state.missionState.ringsHit}/${state.missionState.mission.rings.length} &middot; Landing ${landing}/100 &middot; Fuel left ${Math.round(state.plane.fuel)}%`,
    `Time ${state.time.toFixed(0)}s (par ${state.missionState.mission.parSeconds}s)`,
    `<b>FINAL SCORE: ${state.total}</b>`,
  ], true);
}

function endFlightCrashed(reason) {
  audio.crash();
  showEnd('CRASHED', [
    reason,
    `Rings ${state.missionState.ringsHit}/${state.missionState.mission.rings.length} &middot; Score ${state.missionState.score} &middot; Time ${state.time.toFixed(0)}s`,
    'Tip: keep your speed above 55 kt and pull up early — the ground comes up fast.',
  ], false);
}

function step(dt) {
  if (state.phase !== 'flying') return;
  state.time += dt;
  state.missionState.time = state.time;
  const result = updatePlane(state.plane, input, dt, state.terrain);
  const ringEvent = checkRing(state.plane, state.missionState);
  if (ringEvent && ringEvent.hit) {
    audio.ring();
    toast(`RING ${ringEvent.ring}/${state.missionState.mission.rings.length}  +${ringEvent.points}`, '#ffd23e');
  } else if (ringEvent && ringEvent.nearMiss) {
    audio.nearMiss();
    toast('NEAR MISS  +15', '#7ec8ff');
  }
  if (result.crashed) { endFlightCrashed(result.reason); return; }
  if (state.plane.grounded) {
    if (missionComplete(state.missionState)) endFlightLanded();
    else {
      state.plane.damage = Math.min(100, state.plane.damage + 12);
      endFlightCrashed('LANDED EARLY — FLY ALL THE RINGS FIRST');
    }
    return;
  }
  if (state.plane.fuel <= 0 && state.plane.y < 60) {
    endFlightCrashed('OUT OF FUEL — GLIDED INTO THE GROUND');
  }
  audio.updateEngine(state.plane.throttle, state.plane.speed, true);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.phase === 'flying') step(dt);
  for (const t of state.toasts) t.life -= dt;
  state.toasts = state.toasts.filter((t) => t.life > 0);
  renderGame(ctx, state);
  requestAnimationFrame(frame);
}

// Keyboard.
const KEYMAP = {
  KeyW: 'pitchUp', ArrowUp: 'pitchUp',
  KeyS: 'pitchDown', ArrowDown: 'pitchDown',
  KeyA: 'bankLeft', ArrowLeft: 'bankLeft',
  KeyD: 'bankRight', ArrowRight: 'bankRight',
  ShiftLeft: 'throttleUp', ShiftRight: 'throttleUp',
  ControlLeft: 'throttleDown', ControlRight: 'throttleDown',
  Space: 'flaps',
};
window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code] !== undefined) { input[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyM') { const m = audio.toggleMute(); toast(m ? 'SOUND OFF' : 'SOUND ON', '#9fc3e8'); }
  if (e.code === 'KeyP' && state.phase === 'flying') { state.phase = 'paused'; toast('PAUSED — PRESS P TO RESUME', '#9fc3e8'); }
  else if (e.code === 'KeyP' && state.phase === 'paused') { state.phase = 'flying'; }
  if (e.code === 'KeyR' && (state.phase === 'crashed' || state.phase === 'landed')) startMission(state.missionState.mission);
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (state.phase === 'menu' && MISSIONS[n - 1]) startMission(MISSIONS[n - 1]);
  }
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = false;
});
window.addEventListener('blur', () => {
  for (const k of Object.keys(input)) input[k] = false;
});
canvas.addEventListener('click', () => audio.unlock());

// Deterministic screenshot poses: the same ?shot= always renders the
// same frame, so the cover and the dossier screenshots are reproducible.
function applyShot() {
  if (!shot) return;
  const mission = MISSIONS[0];
  startMission(mission);
  if (shot === 'start') {
    state.phase = 'menu';
    state.toasts = [];
    menuEl.classList.remove('hidden');
    endEl.classList.add('hidden');
    return;
  }
  if (shot === 'play') {
    // Mid-flight: two rings flown, third ring dead ahead, runway visible.
    const p = state.plane;
    p.x = -820; p.y = 430; p.z = 1650;
    p.heading = 0.45; p.pitch = -0.06; p.bank = 0.25;
    p.speed = 148; p.throttle = 0.72; p.fuel = 78;
    state.missionState.ringsHit = 2; state.missionState.ringIndex = 2;
    state.missionState.score = 264; state.time = 41; state.missionState.time = 41;
    state.toasts = [{ text: 'RING 2/6  +132', color: '#ffd23e', life: 2.2 }];
    state.phase = 'flying';
    // Freeze the pose: hold the frame by pausing updates after first render.
    state.phase = 'paused';
    return;
  }
  if (shot === 'end') {
    const p = state.plane;
    p.x = 4; p.y = 4; p.z = 5600; p.heading = 0; p.speed = 88; p.throttle = 0.2; p.fuel = 34;
    p.grounded = true; p.verticalSpeed = -6;
    state.missionState.ringsHit = 6; state.missionState.ringIndex = 6;
    state.missionState.score = 812; state.time = 138;
    state.landingPoints = 88;
    state.total = finalScore(state.missionState, p, 88);
    state.toasts = [];
    state.phase = 'landed';
    showEnd('MISSION COMPLETE', [
      'Harbor Ring Run — all rings flown, wheels down on runway 09.',
      'Rings 6/6 &middot; Landing 88/100 &middot; Fuel left 34%',
      'Time 138s (par 150s)',
      `<b>FINAL SCORE: ${state.total}</b>`,
    ], true);
  }
}

buildMenu();
applyShot();
requestAnimationFrame(frame);
