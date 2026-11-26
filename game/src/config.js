// Sky Courier — shared tuning constants and helpers for the whole game.
// Everything here is original: a small prop courier plane flying ring courses
// over a procedurally built harbor island.
export const VIEW = { W: 1280, H: 800, HORIZON: 330 };

export const PLANE = {
  minSpeed: 55,      // knots; below this the wing stops flying
  maxSpeed: 210,
  cruiseSpeed: 130,
  climbRate: 9,      // ft per second at full pitch up, scaled by speed
  turnRate: 0.7,     // radians per second at full bank
  maxBank: 1.1,      // radians
  maxPitch: 0.42,
  fuelBurn: 0.30,    // percent per second at cruise throttle
  startFuel: 100,
  startDamage: 0,
};

export const WORLD = {
  groundY: 0,        // sea level, feet
  runwayX: 0,        // runway centreline x, feet
  runwayZ: 5200,     // runway threshold distance ahead of spawn, feet
  runwayLength: 900,
  runwayWidth: 90,
};

// Deterministic little hash-based noise, so the same seed always builds the
// same island. No external data, no copied terrain.
export function hashNoise(x, z, seed) {
  let h = (Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453) % 1;
  return h < 0 ? h + 1 : h;
}

export function smoothNoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const s = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  const n00 = hashNoise(xi, zi, seed), n10 = hashNoise(xi + 1, zi, seed);
  const n01 = hashNoise(xi, zi + 1, seed), n11 = hashNoise(xi + 1, zi + 1, seed);
  return s(s(n00, n10, xf), s(n01, n11, xf), zf);
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function fmt(n, digits = 0) { return n.toFixed(digits); }
export function pad2(n) { return String(n).padStart(2, '0'); }
