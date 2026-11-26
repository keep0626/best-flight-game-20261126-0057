// Sky Courier — all sound is synthesized live with WebAudio.
// No audio files, no samples: a soft engine hum, a ring chime,
// a landing thump and a crash thud, all built from oscillators.
export function makeAudio() {
  let ctx = null, engineOsc = null, engineGain = null, muted = false;
  let windGain = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 62;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
    // Wind: filtered noise loop, gain follows speed.
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass'; windFilter.frequency.value = 500;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    noise.connect(windFilter).connect(windGain).connect(ctx.destination);
    noise.start();
    return ctx;
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; if (engineGain) engineGain.gain.value = 0; return muted; },
    get muted() { return muted; },
    updateEngine(throttle, speed, flying) {
      if (!ctx || muted) return;
      const target = flying ? 0.02 + throttle * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(52 + throttle * 55 + speed * 0.12, ctx.currentTime, 0.1);
      windGain.gain.setTargetAtTime(flying ? Math.min(0.06, speed * 0.00028) : 0, ctx.currentTime, 0.15);
    },
    ring() { blip(880, 0.35, 'sine', 0.22); blip(1318, 0.4, 'sine', 0.16, 0.09); },
    nearMiss() { blip(520, 0.18, 'triangle', 0.12); },
    touchdown() { blip(90, 0.25, 'sine', 0.3); blip(140, 0.2, 'triangle', 0.15, 0.05); },
    crash() { blip(55, 0.7, 'sawtooth', 0.3); blip(38, 0.9, 'sine', 0.3, 0.08); },
    click() { blip(660, 0.07, 'square', 0.08); },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.5, 'sine', 0.18, i * 0.13)); },
  };
}
