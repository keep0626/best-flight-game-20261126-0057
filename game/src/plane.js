// Sky Courier — flight model: throttle, pitch, bank, lift, stall,
// fuel burn and damage. A forgiving arcade model with real trade-offs:
// slow turns bleed speed, steep climbs cost speed, and the wing quits
// below minimum speed.
import { PLANE, WORLD, clamp } from './config.js';

export function makePlane() {
  return {
    x: 0, y: 320, z: 0,          // feet; y is altitude above sea level
    heading: 0,                  // radians, 0 = north along the runway line
    pitch: 0, bank: 0,
    speed: 120,                  // knots
    throttle: 0.65,
    flaps: false,
    fuel: PLANE.startFuel,
    damage: PLANE.startDamage,
    verticalSpeed: 0,            // ft per second, for the VSI needle
    grounded: false,
    stalled: false,
  };
}

export function updatePlane(p, input, dt, terrain) {
  // Throttle: Shift up, Ctrl down. Flaps (Space) trade speed for lift.
  if (input.throttleUp) p.throttle = clamp(p.throttle + dt * 0.5, 0, 1);
  if (input.throttleDown) p.throttle = clamp(p.throttle - dt * 0.5, 0, 1);
  p.flaps = !!input.flaps;

  // Pitch and bank ease toward the pilot's stick position.
  const targetPitch = (input.pitchUp ? -PLANE.maxPitch : 0) + (input.pitchDown ? PLANE.maxPitch : 0);
  const targetBank = (input.bankLeft ? -PLANE.maxBank : 0) + (input.bankRight ? PLANE.maxBank : 0);
  p.pitch += (targetPitch - p.pitch) * Math.min(1, dt * 3.2);
  p.bank += (targetBank - p.bank) * Math.min(1, dt * 4.5);

  // Speed: throttle pulls it up, drag and climbs pull it down;
  // diving gives some of it back.
  const targetSpeed = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed)
    - (p.flaps ? 25 : 0) + Math.max(0, p.pitch) * 120;
  const climbPenalty = Math.max(0, -p.pitch) * 120; // pulling up costs speed
  p.speed += ((targetSpeed - climbPenalty) - p.speed) * Math.min(1, dt * 0.55);
  p.speed = clamp(p.speed, 25, PLANE.maxSpeed + 10);

  // Stall: below minimum speed the wing gives up and the nose drops.
  p.stalled = p.speed < PLANE.minSpeed && !p.grounded;
  if (p.stalled) {
    p.pitch = Math.min(p.pitch + dt * 0.5, 0.35);
    p.verticalSpeed = -55;
  }

  // Heading follows bank, faster when flying faster.
  const turnAuthority = clamp(p.speed / PLANE.cruiseSpeed, 0.25, 1.2);
  p.heading += -p.bank * PLANE.turnRate * turnAuthority * dt;

  // Vertical speed from pitch and speed; flaps soften the sink.
  const lift = -p.pitch * p.speed * 1.15;
  const sink = p.flaps ? -6 : -14;
  const targetVs = p.stalled ? -55 : lift + sink * (1 - p.speed / 260);
  p.verticalSpeed += (targetVs - p.verticalSpeed) * Math.min(1, dt * 2.2);

  // Move forward along the heading.
  const fps = p.speed * 1.68781; // knots to feet per second
  p.x += Math.sin(p.heading) * fps * dt;
  p.z += Math.cos(p.heading) * fps * dt;
  p.y += p.verticalSpeed * dt;

  // Fuel burns with throttle; empty tank means the engine quits.
  p.fuel = Math.max(0, p.fuel - PLANE.fuelBurn * (0.35 + p.throttle) * dt);
  if (p.fuel <= 0) p.throttle = Math.max(0, p.throttle - dt * 0.4);

  // Ground contact: the terrain decides a crash or a landing.
  const ground = terrain.heightAt(p.x, p.z);
  const onRunway = Math.abs(p.x - WORLD.runwayX) < 45
    && p.z > WORLD.runwayZ - 60 && p.z < WORLD.runwayZ + WORLD.runwayLength;
  if (p.y <= ground + 2) {
    p.y = ground + 2;
    // A firm-but-survivable arrival on the runway still counts as a
    // landing (with damage); anything harder, or anywhere else, is a crash.
    if (onRunway && Math.abs(p.verticalSpeed) < 26 && p.speed < 160 && Math.abs(p.bank) < 0.4) {
      p.grounded = true; // a landing, not a crash
      if (Math.abs(p.verticalSpeed) > 16) p.damage = Math.min(100, p.damage + 18);
    } else {
      return { crashed: true, reason: p.y <= 4 ? 'DITCHED IN THE HARBOR' : 'HIT THE GROUND' };
    }
  }
  return { crashed: false };
}

// Landing quality: a gentle touchdown on the centreline scores best.
export function landingScore(p) {
  const centre = Math.max(0, 1 - Math.abs(p.x) / 45);
  const soft = Math.max(0, 1 - Math.abs(p.verticalSpeed) / 16);
  const slow = Math.max(0, 1 - Math.max(0, p.speed - 95) / 55);
  return Math.round(100 * (0.4 * centre + 0.35 * soft + 0.25 * slow));
}
