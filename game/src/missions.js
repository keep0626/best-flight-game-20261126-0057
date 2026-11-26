// Sky Courier — missions: three original ring courses over the island.
// Each mission is a list of glowing target rings, a time par and a
// short briefing. Fly every ring, then land on the runway to finish.
import { WORLD } from './config.js';

export const MISSIONS = [
  {
    id: 'harbor',
    name: 'Harbor Ring Run',
    tag: '1',
    blurb: '6 rings along the coast, then land on runway 09. Easy breeze, good first sortie.',
    seed: 11,
    dusk: false,
    parSeconds: 150,
    rings: [
      { x: -500, y: 380, z: 700, r: 72 },
      { x: -900, y: 420, z: 1500, r: 72 },
      { x: -700, y: 500, z: 2300, r: 66 },
      { x: 200, y: 460, z: 2900, r: 66 },
      { x: 600, y: 520, z: 3500, r: 66 },
      { x: 100, y: 240, z: 3950, r: 72 },
    ],
  },
  {
    id: 'mountain',
    name: 'Mountain Pass',
    tag: '2',
    blurb: '8 rings threading the high valleys. Mind the peaks — the ground comes up fast.',
    seed: 47,
    dusk: false,
    parSeconds: 210,
    rings: [
      { x: 300, y: 700, z: 800, r: 72 },
      { x: 900, y: 900, z: 1600, r: 66 },
      { x: 1500, y: 1100, z: 2400, r: 66 },
      { x: 1100, y: 1300, z: 3200, r: 64 },
      { x: 300, y: 1150, z: 3900, r: 64 },
      { x: -600, y: 950, z: 4300, r: 66 },
      { x: -200, y: 600, z: 4700, r: 66 },
      { x: 0, y: 220, z: 5050, r: 72 },
    ],
  },
  {
    id: 'dusk',
    name: 'Dusk Delivery',
    tag: '3',
    blurb: '5 rings at dusk over the city lights. The runway beacons are on — bring her home.',
    seed: 83,
    dusk: true,
    parSeconds: 170,
    rings: [
      { x: -300, y: 420, z: 900, r: 72 },
      { x: 700, y: 480, z: 1800, r: 68 },
      { x: 1300, y: 560, z: 2700, r: 66 },
      { x: 800, y: 480, z: 3500, r: 66 },
      { x: 0, y: 240, z: 3980, r: 72 },
    ],
  },
];

export function makeMissionState(mission) {
  return {
    mission,
    ringIndex: 0,
    ringsHit: 0,
    score: 0,
    time: 0,
    nearMiss: 0,
    finished: false,
  };
}

// Did the plane pass through the current ring? Rings face the pilot
// (their plane is perpendicular to the course direction at that point).
export function checkRing(plane, missionState) {
  const m = missionState.mission;
  if (missionState.ringIndex >= m.rings.length) return null;
  const ring = m.rings[missionState.ringIndex];
  const dx = plane.x - ring.x, dy = plane.y - ring.y, dz = plane.z - ring.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < ring.r) {
    const speedBonus = Math.round(plane.speed / 4);
    const points = 100 + speedBonus;
    missionState.ringsHit += 1;
    missionState.ringIndex += 1;
    missionState.score += points;
    return { hit: true, points, ring: missionState.ringIndex };
  }
  // Near miss: close, but outside the ring — small consolation, once per ring.
  if (dist < ring.r + 40 && !ring.nearMissed) {
    ring.nearMissed = true;
    missionState.nearMiss += 1;
    missionState.score += 15;
    return { hit: false, nearMiss: true };
  }
  return null;
}

export function missionComplete(missionState) {
  return missionState.ringIndex >= missionState.mission.rings.length;
}

export function finalScore(missionState, plane, landing) {
  let s = missionState.score;
  s += Math.round(plane.fuel) * 2;                 // fuel left is worth points
  s += Math.max(0, (missionState.mission.parSeconds - missionState.time)) * 2 | 0;
  if (landing) s += landing;
  return s;
}
