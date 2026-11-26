// Sky Courier — the island: terrain heights, coastline, city blocks,
// mountain peaks and the runway. All procedural, seeded per mission.
import { WORLD, smoothNoise, hashNoise, clamp } from './config.js';

export function makeTerrain(seed) {
  // Coast: the sea lies to the west (negative x). The shoreline wanders.
  function shoreX(z) {
    return -1500 + 500 * Math.sin(z * 0.0011 + seed) + 260 * Math.sin(z * 0.0031 + seed * 2);
  }

  // Ground height in feet at world (x, z). Sea is 0.
  function heightAt(x, z) {
    const shore = shoreX(z);
    if (x < shore - 60) return 0; // open sea
    const inland = clamp((x - shore) / 2200, 0, 1);
    const hills = smoothNoise(x * 0.0016, z * 0.0016, seed) * 520;
    const ridge = smoothNoise(x * 0.00045 + 9, z * 0.00045, seed + 5);
    // Tall peaks only far to the north and far off the course line,
    // so the ring courses always have clear air beneath them.
    const farNorth = clamp((z - 2500) / 4000, 0, 1);
    const farSide = clamp((Math.abs(x) - 1200) / 2000, 0, 1);
    const mountains = Math.pow(Math.max(0, ridge - 0.55) / 0.45, 2) * 1900 * farNorth * farSide;
    let h = inland * (60 + hills) + mountains;
    // Course valley: a low rolling plain along the line from the spawn
    // to the runway, so every ring sits well above the ground.
    if (Math.abs(x) < 1400 && z > -400 && z < 5600) {
      const edge = clamp((1400 - Math.abs(x)) / 500, 0, 1);
      const plain = smoothNoise(x * 0.004, z * 0.004, seed + 3) * 90;
      h = h * (1 - edge) + plain * edge;
    }
    // Flatten a shelf for the airfield around the runway.
    const dz = z - WORLD.runwayZ, dx = x - WORLD.runwayX;
    const dField = Math.sqrt(dx * dx + dz * dz * 0.6);
    if (dField < 900) h *= clamp((dField - 250) / 650, 0, 1) * 0.9 + 0.1 * clamp((dField - 250) / 650, 0, 1);
    if (dField < 320) h = Math.min(h, 12);
    return h;
  }

  // Mountain peaks for the far ridge silhouettes.
  const peaks = [];
  for (let i = 0; i < 26; i++) {
    const px = -7000 + hashNoise(i, 3, seed) * 14000;
    const pz = 9500 + hashNoise(i, 7, seed) * 11000;
    peaks.push({ x: px, z: pz, h: 900 + hashNoise(i, 11, seed) * 1100 });
  }

  // City blocks near the airfield: little boxes with lit windows at dusk.
  const buildings = [];
  for (let i = 0; i < 90; i++) {
    const bx = 350 + hashNoise(i, 21, seed) * 1500;
    const bz = WORLD.runwayZ - 1600 + hashNoise(i, 29, seed) * 2600;
    buildings.push({ x: bx, z: bz, w: 40 + hashNoise(i, 33, seed) * 70, h: 30 + hashNoise(i, 41, seed) * 150 });
  }

  // Harbor boats bobbing on the water west of the shore.
  const boats = [];
  for (let i = 0; i < 12; i++) {
    boats.push({
      x: shoreX(1200 + i * 420) - 260 - hashNoise(i, 51, seed) * 700,
      z: 1200 + i * 420,
      size: 26 + hashNoise(i, 57, seed) * 30,
    });
  }

  // Clouds drift slowly; positions are fixed per seed.
  const clouds = [];
  for (let i = 0; i < 22; i++) {
    clouds.push({
      x: -5000 + hashNoise(i, 61, seed) * 10000,
      y: 1500 + hashNoise(i, 67, seed) * 1200,
      z: 800 + hashNoise(i, 71, seed) * 12000,
      r: 120 + hashNoise(i, 73, seed) * 220,
    });
  }

  return { seed, shoreX, heightAt, peaks, buildings, boats, clouds };
}

// Project a world point into screen space from the plane's chase camera.
// Camera sits a little behind and above the plane, looking along its heading.
export function makeProjector(plane) {
  const camX = plane.x - Math.sin(plane.heading) * 26;
  const camZ = plane.z - Math.cos(plane.heading) * 26;
  const camY = plane.y + 9;
  const cosH = Math.cos(plane.heading), sinH = Math.sin(plane.heading);
  const focal = 620; // perspective strength
  return function project(x, y, z) {
    const dx = x - camX, dy = y - camY, dz = z - camZ;
    // Rotate into camera space: forward = +f, right = +r.
    const f = dx * sinH + dz * cosH;
    const r = dx * cosH - dz * sinH;
    const up = dy;
    if (f < 8) return null; // behind the camera
    const s = focal / f;
    return { x: 640 + r * s, y: 330 - up * s - plane.pitch * 260, s, f, behind: false };
  };
}
