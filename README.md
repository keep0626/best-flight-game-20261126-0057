# Sky Courier — Harbor Ring Run

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/keep0626/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/keep0626/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

An original flight game for the [best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057). You are a courier pilot flying a little prop plane over a procedurally built harbor island: thread the glowing rings, mind your fuel and your speed, then bring her home onto runway 09.

## How to play

Open `game/index.html` from any static server (`node serve.ts`, then http://localhost:8080). No network, no build step — every file lives under `game/`.

Pick one of three missions on the menu (click, or press 1 / 2 / 3):

1. **Harbor Ring Run** — 6 rings along the coast, then land. Par 150s.
2. **Mountain Pass** — 8 rings through the high valleys. Par 210s.
3. **Dusk Delivery** — 5 rings at dusk over the city lights. Par 170s.

Fly every ring, then land gently on the runway to finish the sortie.

### Controls

| Key | Action |
| --- | --- |
| W / S (↑ / ↓) | Pitch down / up |
| A / D (← / →) | Bank left / right (bank turns the plane) |
| Shift | Throttle up |
| Ctrl | Throttle down |
| Space | Flaps (slows you down for landing) |
| P | Pause |
| R | Fly again after a crash or landing |
| M | Sound on / off |

Mouse: click the mission buttons and the end-of-flight buttons.

### The flying itself

- **Speed matters.** Below 55 kt the wing stalls: the nose drops and you sink. Pulling up hard bleeds speed; throttle discipline is the whole game.
- **Rings** are worth 100 points plus a speed bonus. A near miss is worth 15.
- **Fuel** burns with throttle. Land with fuel in the tank for bonus points; run dry and the engine quits.
- **Landing** is scored: centreline, gentle touchdown, slow speed. Land before flying all the rings and the sortie fails; hit the ground anywhere else and you crash.
- **Score** = rings + speed bonuses + fuel left × 2 + time under par × 2 + landing quality.

## What you see

A chase view over recognisable terrain — sea and harbor boats to the west, fields and a lit city to the east, snow-capped peaks ahead, and runway 09 with its beacons dead ahead. The courier plane sits in frame with a lit instrument panel below: artificial horizon, airspeed and altitude dials, compass tape, vertical speed, throttle, fuel and damage gauges, plus a HUD with altitude, speed and heading across the top.

## Tech

- Pure Canvas 2D, vanilla ES modules, zero dependencies, zero network requests.
- Sound is synthesized live with WebAudio (engine hum, wind, ring chimes) — no audio files.
- Terrain, city, clouds and missions are procedural and seeded, so every mission builds the same island every time.
- Screenshots are deterministic poses (`?shot=start|play|end`) rendered by the game's own code; see `shots.json`.

## Files

- `game/index.html`, `game/style.css` — page and menu styling
- `game/src/main.js` — game loop, states, input, screenshot poses
- `game/src/config.js` — tuning constants and seeded noise
- `game/src/terrain.js` — island, coastline, city, peaks, projection
- `game/src/plane.js` — flight model (throttle, stall, fuel, landing)
- `game/src/missions.js` — the three ring courses and scoring
- `game/src/render.js` — sky, terrain, runway, rings, plane, instruments, HUD
- `game/src/audio.js` — synthesized WebAudio sounds
- `main.ts` — hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — tiny local static server for play-testing
