// Sound lab: review, mix and stress-test the game's sound effects and music.
// The Engine below follows the same rules as assets/scripts/core/Sfx.ts (synth recipes, trim,
// normalization, pitch variation, gaps, voice limits, busy-bus attenuation, ducking, thumps).
// Change both together.
'use strict';

// The original synth sounds (same table as RECIPES in Sfx.ts). T = tone, N = noise, p = pitch, x = extra.
const R = Math.random;
const RECIPES = {
  blast: (T, N, p) => { N(0.18, 0.18, 1200, 0.7, 'lowpass', 0, 0.3); T(160 * p, 0.12, 'square', 0.06, 0.5); },
  flame: (T, N, p) => { N(0.25, 0.08, 600 * p, 1, 'bandpass', 0, 3); },
  sling: (T, N, p) => { T(1200 * p, 0.05, 'triangle', 0.05, 0.6); },
  zap: (T, N, p) => { N(0.12, 0.1, 4000 * p, 4, 'bandpass', 0, 0.5); T(1600 * p, 0.08, 'sawtooth', 0.04, 0.4); },
  laser: (T, N, p) => { T(1800 * p, 0.3, 'sawtooth', 0.06, 0.2); T(900 * p, 0.3, 'square', 0.04, 0.3); },
  hit: (T, N, p) => { N(0.06, 0.12, 2200 * p, 1, 'lowpass', 0, 0.4); T((220 + R() * 60) * p, 0.06, 'square', 0.035, 0.5); },
  crit: (T, N, p) => { N(0.08, 0.18, 2600 * p, 1, 'lowpass', 0, 0.4); T(1500 * p, 0.12, 'square', 0.04, 0.6); },
  explode: (T, N, p) => { N(0.5, 0.35, 900 * p, 0.8, 'lowpass', 0, 0.12); T(90 * p, 0.4, 'sine', 0.2, 0.4); },
  hurt: (T, N, p) => { T(300 * p, 0.25, 'sawtooth', 0.12, 0.3); N(0.2, 0.12, 800, 1); },
  dodge: (T, N, p) => { N(0.12, 0.08, 3000 * p, 2, 'highpass', 0, 0.5); },
  pickup: (T, N, p, x) => { T((700 + x * 45) * p, 0.07, 'sine', 0.06, 1.3); },
  heal: (T, N, p) => { T(660 * p, 0.15, 'sine', 0.07, 1.5); T(990 * p, 0.15, 'sine', 0.05, 1.3, 0.05); },
  levelUp: (T, N, p) => { [523, 659, 784, 1047].forEach((f, i) => T(f * p, 0.18, 'square', 0.05, 1, i * 0.07)); },
  buy: (T, N, p) => { T(1200 * p, 0.08, 'square', 0.05, 1); T(1800 * p, 0.14, 'square', 0.05, 1, 0.06); },
  deny: (T, N, p) => { T(180 * p, 0.18, 'square', 0.06, 0.8); },
  click: (T, N, p) => { T(900 * p, 0.04, 'triangle', 0.07, 0.7); },
  reroll: (T, N, p) => { [600, 800, 1000].forEach((f, i) => T(f * p, 0.05, 'triangle', 0.05, 1, i * 0.035)); },
  waveStart: (T, N, p) => { [392, 523, 659].forEach((f, i) => T(f * p, 0.22, 'sawtooth', 0.045, 1, i * 0.1)); },
  waveEnd: (T, N, p) => { [659, 784, 988, 1319].forEach((f, i) => T(f * p, 0.25, 'triangle', 0.07, 1, i * 0.09)); },
  spawnWarn: (T, N, p) => { T(220 * p, 0.3, 'square', 0.03, 1.2); },
  gameOver: (T, N, p) => { [392, 330, 262, 196].forEach((f, i) => T(f * p, 0.4, 'sawtooth', 0.07, 0.98, i * 0.22)); },
  victory: (T, N, p) => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f * p, 0.3, 'square', 0.05, 1, i * 0.12)); },
  bossRoar: (T, N, p) => { T(70 * p, 1.2, 'sawtooth', 0.2, 0.6); N(1.0, 0.2, 400, 1, 'lowpass', 0, 0.3); },
};
const SYN = 1.8; // synth loudness at vol 1 (original level +12 dB)

/** tone / noise generators writing into `dest` on context `c`; track(end) gets each voice's end time. */
function mkTN(c, noiseBuf, dest, track) {
  const T = (freq, dur, type, vol, slide = 0, delay = 0) => {
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02); track(delay + dur);
  };
  const N = (dur, vol, freq, q = 1, type = 'lowpass', delay = 0, slide = 0) => {
    const t = c.currentTime + delay, s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); track(delay + dur);
  };
  return [T, N];
}
function makeNoise(c) {
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function live(ends, now) {
  let n = 0;
  for (let i = ends.length - 1; i >= 0; i--) { if (ends[i] > now) n++; else ends.splice(i, 1); }
  return n;
}
const hasExt = f => /\.\w+$/.test(f);
const fileName = f => hasExt(f) ? f : f + '.mp3';
const isSynth = def => !(def.files && def.files.length);
/** Review ids of a sound: its files, or '@key' for a synth sound. */
const reviewIds = (key, def) => isSynth(def) ? ['@' + key] : def.files;

const BASE = '../build-templates/web-mobile/';
const SFX = BASE + 'sfx/';
const DUCKED = ['weapon', 'impact', 'kill', 'boom', 'enemy', 'pickup'];
const BUS_ORDER = ['weapon', 'impact', 'kill', 'boom', 'enemy', 'pickup', 'player', 'event', 'ui'];

let cfg = null;          // live config being edited
let savedText = '';      // last saved JSON (dirty check)

// ------------------------------------------------------------------ engine
const E = {
  ctx: null, samples: {}, raw: {}, buses: {}, ends: {}, rr: {}, last: {}, noiseBuf: null, synthInfo: {},
  sfxGain: null, musicGain: null, comp: null,
  bgmEl: null, bgmFilter: null, bgmGain: null, mood: 1,

  init() {
    if (this.ctx) return;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.connect(ctx.destination);
    const comp = this.comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
    comp.connect(master);
    this.sfxGain = ctx.createGain(); this.sfxGain.connect(comp);
    this.musicGain = ctx.createGain(); this.musicGain.connect(master);
    this.noiseBuf = makeNoise(ctx);
    for (const k of BUS_ORDER) {
      const g = ctx.createGain(); g.connect(this.sfxGain);
      this.buses[k] = { gain: g, ends: [], load: 0, loadT: 0 };
    }
    this.applyGains();
  },
  resume() { this.init(); if (this.ctx.state === 'suspended') this.ctx.resume(); },

  applyGains() {
    if (!this.ctx) return;
    this.sfxGain.gain.value = cfg.master.sfx;
    this.musicGain.gain.value = cfg.master.music;
    for (const k of BUS_ORDER) {
      const b = this.buses[k], d = cfg.buses[k];
      if (b && d) { b.gain.gain.cancelScheduledValues(0); b.gain.gain.value = d.vol; }
    }
    this.applyMood(true);
  },

  analyse(buf) {
    const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate;
    const mono = new Float32Array(n);
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
    let peak = 0; for (let i = 0; i < n; i++) { const a = Math.abs(mono[i]); if (a > peak) peak = a; }
    if (peak < 1e-4) return { buf, mono, start: 0, len: buf.duration, norm: 1, peak, rms: 0 };
    let s = 0; while (s < n && Math.abs(mono[s]) < peak * 0.06) s++;
    let e = n - 1; while (e > s && Math.abs(mono[e]) < peak * 0.012) e--;
    s = Math.max(0, s - Math.round(sr * 0.002));
    const win = Math.max(64, Math.round(sr * 0.03)); let best = 0;
    for (let i = s; i < e; i += win >> 1) {
      let acc = 0; const end = Math.min(e, i + win);
      for (let j = i; j < end; j++) acc += mono[j] * mono[j];
      best = Math.max(best, Math.sqrt(acc / Math.max(1, end - i)));
    }
    let norm = best > 0 ? 0.32 / best : 1;
    norm = Math.min(norm, 0.98 / peak, 12);
    return { buf, mono, start: s / sr, len: (e - s) / sr + 0.02, norm, peak, rms: best };
  },

  async loadFile(f) {
    const r = await fetch(SFX + fileName(f), { cache: 'no-store' });
    if (!r.ok) throw new Error(f + ': HTTP ' + r.status);
    const ab = await r.arrayBuffer();
    const buf = await new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej));
    this.samples[f] = this.analyse(buf);
    return this.samples[f];
  },

  busLoad(b, d, add) {
    const now = this.ctx.currentTime;
    b.load = b.load * Math.exp(-(now - b.loadT) / 0.35) + (add ? 1 : 0);
    b.loadT = now;
    return b.load > d.busyAt ? Math.sqrt(d.busyAt / b.load) : 1;
  },

  duck(to, hold) {
    const t = this.ctx.currentTime;
    for (const k of DUCKED) {
      const b = this.buses[k], d = cfg.buses[k]; if (!b || !d) continue;
      const g = b.gain.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(d.vol * to, t + 0.03);
      g.setValueAtTime(d.vol * to, t + hold);
      g.linearRampToValueAtTime(d.vol, t + hold + 0.35);
    }
  },

  /** Same as Sfx.play. opts.file forces one variant, opts.free skips gap/voice limits (preview clicks). */
  play(key, volMul = 1, rate = 1, opts = {}, x = 0) {
    const def = cfg.sounds[key]; if (!def || !this.ctx) return false;
    if (def.mute && !opts.free) return true;
    let smp = null;
    if (!isSynth(def)) {
      let files;
      if (opts.file) files = [opts.file];
      else {
        files = def.files.filter(f => !isFailed(f) && this.samples[f]);
        if (!files.length) files = def.files.filter(f => this.samples[f]);
      }
      if (!files.length || !this.samples[files[0]]) return false;
      const i = this.rr[key] = ((this.rr[key] || 0) + 1 + (files.length > 2 ? Math.floor(Math.random() * 2) : 0)) % files.length;
      smp = this.samples[files[i]];
    } else if (!RECIPES[def.syn || key]) return false;
    const bus = this.buses[def.bus] || this.buses.event, bd = cfg.buses[def.bus] || cfg.buses.event;
    const t = this.ctx.currentTime;
    const ends = this.ends[key] || (this.ends[key] = []);
    if (!opts.free) {
      if (def.gap && this.last[key] !== undefined && t - this.last[key] < def.gap) return true;
      if (live(ends, t) >= (def.voices || 4)) return true;
      if (live(bus.ends, t) >= bd.voices) { this.busLoad(bus, bd, true); stats.dropped++; return true; }
    }
    this.last[key] = t;
    const busy = this.busLoad(bus, bd, true);
    const r = rate * (1 + (def.pv ? (Math.random() * 2 - 1) * def.pv : 0));
    const g = this.ctx.createGain(); g.connect(bus.gain);
    let dur = 0;
    if (smp) {
      const src = this.ctx.createBufferSource(); src.buffer = smp.buf;
      src.playbackRate.value = r;
      const vol = smp.norm * def.vol * volMul * busy;
      dur = Math.min(smp.len, def.max || smp.len) / r;
      g.gain.setValueAtTime(vol, t);
      if (dur < smp.len / r - 0.01) { g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.06)); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
      src.connect(g);
      src.start(t, smp.start, dur + 0.02);
    } else {
      g.gain.value = def.vol * volMul * busy * SYN;
      const [T, N] = mkTN(this.ctx, this.noiseBuf, g, e => { dur = Math.max(dur, e); });
      RECIPES[def.syn || key](T, N, r, x);
    }
    ends.push(t + dur); bus.ends.push(t + dur);
    if (def.duck) this.duck(def.duck, Math.min(0.6, dur * 0.6));
    stats.played++;
    return true;
  },

  /** Render a synth recipe offline: its length and loudest 30 ms RMS at vol 1. */
  async measureSynth(name) {
    const sr = 44100, c = new OfflineAudioContext(1, sr * 2, sr);
    let dur = 0;
    const [T, N] = mkTN(c, makeNoise(c), c.destination, e => { dur = Math.max(dur, e); });
    RECIPES[name](T, N, 1, 4);
    const d = (await c.startRendering()).getChannelData(0);
    const win = Math.round(sr * 0.03); let best = 0;
    for (let i = 0; i + win < d.length; i += win >> 1) {
      let acc = 0; for (let j = i; j < i + win; j++) acc += d[j] * d[j];
      best = Math.max(best, Math.sqrt(acc / win));
    }
    return { dur, rms: best * SYN };
  },

  /** Unprocessed playback of a file (no trim / normalization), through the sfx master only. */
  playRaw(f) {
    const smp = this.samples[f]; if (!smp) return;
    const src = this.ctx.createBufferSource(); src.buffer = smp.buf; src.connect(this.sfxGain); src.start();
  },

  thump(f0, dur, vol, busKey, gap) {
    const m = cfg.master.thump; if (!m) return;
    const key = 'th_' + busKey, t = this.ctx.currentTime;
    if (this.last[key] !== undefined && t - this.last[key] < gap) return;
    this.last[key] = t;
    const b = this.buses[busKey], busy = this.busLoad(b, cfg.buses[busKey], false);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f0 * 0.35), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * m * busy), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(b.gain); o.start(t); o.stop(t + dur + 0.02);
  },

  // game-level helpers (mirror Sfx.shot / swing / hit / kill / explode / pickup)
  shot(id) {
    switch (id) {
      case 'smg': this.play('gun', 0.9, 1.05); break;
      case 'minigun': this.play('gun', 0.8, 1.12); break;
      case 'shotgun': this.play('gun', 1.2, 0.8); break;
      case 'sniper': this.play('gun', 1.25, 0.72); break;
      case 'medigun': this.play('gun', 0.6, 1.25); break;
      case 'turret': this.play('gun', 0.75, 1.15); break;
      case 'rocket': case 'grenade': this.play('rocket'); break;
      case 'flamethrower': this.play('flame'); break;
      case 'slingshot': this.play('sling'); break;
      default: this.play('gun');
    }
  },
  swing(kind) {
    if (kind === 1) this.play('melee');
    else if (kind === 2) this.play('melee', 0.9, 1.2);
    else this.play('melee', 1, 1.1);
  },
  hit(crit, heavy) {
    if (crit) this.play('crit');
    else this.play('hit', heavy ? 1.15 : 1, heavy ? 0.85 : 1);
  },
  kill(big) { this.play('kill', big ? 1.2 : 1, big ? 0.8 : 1); if (big) this.thump(90, 0.16, 0.3, 'kill', 0.07); },
  explode(big) { this.play('explode', big ? 1 : 0.7, big ? 1 : 1.25); this.thump(big ? 70 : 95, big ? 0.3 : 0.18, big ? 0.38 : 0.26, 'boom', 0.1); },
  pickCombo: 0, pickT: 0,
  pickup(opts = {}) {
    const t = this.ctx.currentTime;
    if (t - this.pickT > 0.4) this.pickCombo = 0;
    this.pickT = t; this.pickCombo = Math.min(this.pickCombo + 1, 14);
    this.play('pickup', 1, 1, opts, this.pickCombo);
  },

  // music
  setupBgm() {
    if (this.bgmEl) return;
    const el = this.bgmEl = new Audio(BASE + cfg.bgm.file);
    el.loop = true; el.preload = 'auto';
    const src = this.ctx.createMediaElementSource(el);
    this.bgmFilter = this.ctx.createBiquadFilter(); this.bgmFilter.type = 'lowpass'; this.bgmFilter.Q.value = 0.7;
    this.bgmGain = this.ctx.createGain();
    src.connect(this.bgmFilter); this.bgmFilter.connect(this.bgmGain); this.bgmGain.connect(this.musicGain);
    this.applyMood(true);
  },
  applyMood(instant) {
    if (!this.bgmFilter) return;
    const t = this.ctx.currentTime, tc = instant ? 0.001 : 0.4;
    const battle = this.mood >= 1;
    this.bgmFilter.frequency.setTargetAtTime(battle ? 18000 : cfg.bgm.menuCutoff, t, tc);
    this.bgmGain.gain.setTargetAtTime(battle ? cfg.bgm.battle * (this.mood === 2 ? 1.12 : 1) : cfg.bgm.menu, t, tc);
  },
};

const stats = { played: 0, dropped: 0 };

// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = (err ? 'err ' : '') + 'show';
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.className = err ? 'err' : '', 2600);
}
const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function review(f) { return cfg.review[f] || (cfg.review[f] = { status: '', note: '' }); }
function isFailed(f) { return cfg.review[f] && cfg.review[f].status === 'fail'; }
function allFiles() { const out = []; for (const k in cfg.sounds) for (const f of cfg.sounds[k].files || []) if (!out.includes(f)) out.push(f); return out; }
/** Everything that can be reviewed: sample files and synth sounds ('@key'). */
function allIds() { const out = []; for (const k in cfg.sounds) for (const f of reviewIds(k, cfg.sounds[k])) if (!out.includes(f)) out.push(f); return out; }
const dB = v => v > 0 ? (20 * Math.log10(v)).toFixed(0) + 'dB' : '—';
function markDirty() {
  const d = JSON.stringify(cfg) !== savedText;
  $('#dirty').textContent = d ? '● 有未保存的修改' : '';
  updateStats();
}
function cleanReview() {
  // keep the saved file tidy: drop empty review entries
  for (const f in cfg.review) { const r = cfg.review[f]; if (!r.status && !r.note) delete cfg.review[f]; }
}
function slider(label, obj, key, min, max, step, onChange, fmt) {
  const val = h('span', { class: 'v' });
  const show = () => val.textContent = fmt ? fmt(obj[key]) : (+obj[key]).toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0);
  const inp = h('input', { type: 'range', min, max, step, value: obj[key] ?? 0 });
  inp.addEventListener('input', () => { obj[key] = +inp.value; show(); onChange && onChange(); markDirty(); });
  show();
  return h('div', { class: 'row' }, h('span', {}, label), inp, val);
}

// ------------------------------------------------------------------ sidebar: bgm, master, buses
function buildSidebar() {
  $('#bgmFile').textContent = cfg.bgm.file;
  const bp = $('#bgmParams'); bp.innerHTML = '';
  bp.append(
    slider('战斗音量', cfg.bgm, 'battle', 0, 1.5, 0.01, () => E.applyMood()),
    slider('菜单音量', cfg.bgm, 'menu', 0, 1.5, 0.01, () => E.applyMood()),
    slider('菜单闷音', cfg.bgm, 'menuCutoff', 200, 6000, 50, () => E.applyMood(), v => v + 'Hz'),
  );
  const mp = $('#masterParams'); mp.innerHTML = '';
  mp.append(
    slider('音效总量', cfg.master, 'sfx', 0, 1.5, 0.01, () => E.applyGains()),
    slider('音乐总量', cfg.master, 'music', 0, 1.5, 0.01, () => E.applyGains()),
    slider('低频冲击', cfg.master, 'thump', 0, 2, 0.05),
  );
  const bl = $('#busList'); bl.innerHTML = '';
  for (const k of BUS_ORDER) {
    const d = cfg.buses[k]; if (!d) continue;
    const meter = h('i'), st = h('span', { class: 'busstat' });
    E.buses[k] && (E.buses[k].ui = { meter, st });
    bl.append(h('div', { class: 'busrow' },
      h('div', { class: 'busname' }, h('span', {}, `${d.label || k}`, h('span', { class: 'muted' }, '  ' + k)), st),
      h('div', { class: 'meter' }, meter),
      slider('音量', d, 'vol', 0, 1.5, 0.01, () => E.applyGains()),
      slider('最多同时', d, 'voices', 1, 12, 1),
      slider('拥挤阈值', d, 'busyAt', 1, 12, 0.5),
    ));
  }
}

function meters() {
  if (E.ctx) {
    const now = E.ctx.currentTime;
    for (const k of BUS_ORDER) {
      const b = E.buses[k], d = cfg.buses[k]; if (!b || !b.ui || !d) continue;
      const load = b.load * Math.exp(-(now - b.loadT) / 0.35);
      const att = load > d.busyAt ? Math.sqrt(d.busyAt / load) : 1;
      const act = live(b.ends, now);
      b.ui.meter.style.width = Math.min(100, act / d.voices * 100) + '%';
      b.ui.st.textContent = `${act}/${d.voices} 声  ${att < 0.99 ? '压低 ' + Math.round(20 * Math.log10(att)) + 'dB' : ''}`;
    }
    if (E.bgmEl) {
      const el = E.bgmEl;
      $('#bgmT').textContent = fmtT(el.currentTime || 0);
      $('#bgmD').textContent = fmtT(el.duration || 0);
      if (!seeking && el.duration) $('#bgmSeek').value = Math.round(el.currentTime / el.duration * 1000);
      $('#bgmPlay').textContent = el.paused ? '▶' : '❚❚';
    }
  }
  requestAnimationFrame(meters);
}
let seeking = false;

function wireBgm() {
  $('#bgmPlay').onclick = () => {
    E.resume(); E.setupBgm();
    if (E.bgmEl.paused) E.bgmEl.play().catch(e => toast('音乐播放失败：' + e.message, true)); else E.bgmEl.pause();
  };
  $('#bgmMood').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of $('#bgmMood').children) x.classList.toggle('on', x === b);
    E.mood = +b.dataset.m; E.applyMood();
  });
  const seek = $('#bgmSeek');
  seek.addEventListener('input', () => { seeking = true; });
  seek.addEventListener('change', () => { if (E.bgmEl && E.bgmEl.duration) E.bgmEl.currentTime = seek.value / 1000 * E.bgmEl.duration; seeking = false; });
}

// ------------------------------------------------------------------ sound list
let filter = 'all', search = '';
const GROUPS = [
  ['weapon', '武器'], ['impact', '命中'], ['kill', '击杀'], ['boom', '爆炸'], ['enemy', '敌人'],
  ['pickup', '拾取'], ['player', '玩家'], ['event', '事件 / 流程'], ['ui', '界面'],
];

function soundStatus(key, def) {
  const st = reviewIds(key, def).map(f => (cfg.review[f] || {}).status || '');
  if (st.includes('fail')) return 'fail';
  if (st.every(s => s === 'pass')) return 'pass';
  return 'todo';
}

function buildList() {
  const list = $('#list'); list.innerHTML = '';
  let shown = 0;
  for (const [bus, title] of GROUPS) {
    const keys = Object.keys(cfg.sounds).filter(k => cfg.sounds[k].bus === bus).filter(k => {
      const d = cfg.sounds[k], st = soundStatus(k, d);
      if (filter === 'fail' && st !== 'fail') return false;
      if (filter === 'pass' && st !== 'pass') return false;
      if (filter === 'todo' && st !== 'todo') return false;
      if (filter === 'mute' && !d.mute) return false;
      if (search) { const q = search.toLowerCase(); return (k + ' ' + (d.label || '') + ' ' + (d.files || []).join(' ') + ' ' + (d.syn || '')).toLowerCase().includes(q); }
      return true;
    });
    if (!keys.length) continue;
    shown += keys.length;
    const grid = h('div', { class: 'grid' });
    for (const k of keys) grid.append(soundCard(k));
    list.append(h('section', { class: 'group' }, h('h2', {}, title, h('span', { class: 'tag' }, `${bus} · ${keys.length} 个`)), grid));
  }
  if (!shown) list.append(h('div', { class: 'empty' }, '没有符合条件的音效'));
}

function soundCard(key) {
  const def = cfg.sounds[key];
  const card = h('div', { class: 'snd' });
  const refreshCls = () => {
    const st = soundStatus(key, def);
    card.className = 'snd' + (st === 'fail' ? ' fail' : st === 'pass' ? ' pass' : '') + (def.mute ? ' mute' : '');
  };
  const playBtn = h('button', { class: 'icon play', title: '按游戏处理播放', onclick: () => { E.resume(); key === 'pickup' ? E.pickup({ free: true }) : E.play(key, 1, 1, { free: true }); } }, '▶');
  const mute = h('input', { type: 'checkbox' }); mute.checked = !!def.mute;
  mute.onchange = () => { def.mute = mute.checked || undefined; if (!def.mute) delete def.mute; refreshCls(); markDirty(); };

  const vars = h('div', { class: 'vars' });
  if (isSynth(def)) vars.append(synthRow(key, refreshCls));
  else for (const f of def.files) vars.append(variantRow(key, f, refreshCls));

  const busSel = h('select', {}, ...BUS_ORDER.map(b => h('option', { value: b, selected: b === def.bus }, (cfg.buses[b] && cfg.buses[b].label || b) + ' ' + b)));
  busSel.onchange = () => { def.bus = busSel.value; markDirty(); };

  const synth = isSynth(def);
  const params = h('div', { class: 'params' },
    slider('音量', def, 'vol', 0, synth ? 3 : 1.5, 0.01, () => card.dispatchEvent(new Event('loud'))),
    slider('音高随机', def, 'pv', 0, 0.3, 0.01),
    synth ? null : slider('最长', def, 'max', 0.05, 3.5, 0.01, null, v => (v ?? 0).toFixed(2) + 's'),
    slider('最小间隔', def, 'gap', 0, 1, 0.01, null, v => (v ?? 0).toFixed(2) + 's'),
    slider('同时数', def, 'voices', 1, 8, 1),
    slider('压低其他', def, 'duck', 0, 1, 0.05, null, v => v ? Math.round(v * 100) + '%' : '关'),
  );
  card.append(
    h('div', { class: 'snd-head' }, playBtn, h('span', { class: 'name' }, def.label || key), h('span', { class: 'key' }, key), h('span', { class: 'sp' }),
      h('label', { class: 'check', title: '游戏里不播放这个音效' }, mute, '静音')),
    vars, params,
    h('div', { class: 'snd-foot' }, '总线', busSel, h('span', { class: 'muted' }, '「压低其他」：播放时临时压低战斗类总线')),
  );
  refreshCls();
  return card;
}

/** ✓ / ✗ buttons and the note box for one review id (a file or '@key'). */
function reviewControls(id, refreshCls) {
  const r = cfg.review[id] || {};
  const pass = h('button', { class: 'rv pass' + (r.status === 'pass' ? ' on' : ''), title: '通过' }, '✓');
  const fail = h('button', { class: 'rv fail' + (r.status === 'fail' ? ' on' : ''), title: '不及格' }, '✗');
  const note = h('textarea', { class: 'note', rows: 1, placeholder: '不及格原因 / 想要的效果（会一起导出）' });
  note.value = r.note || '';
  note.style.display = r.status === 'fail' || r.note ? '' : 'none';
  const set = st => {
    const rv = review(id); rv.status = rv.status === st ? '' : st;
    pass.classList.toggle('on', rv.status === 'pass'); fail.classList.toggle('on', rv.status === 'fail');
    note.style.display = rv.status === 'fail' || rv.note ? '' : 'none';
    if (rv.status === 'fail') note.focus();
    cleanReview(); refreshCls(); markDirty();
  };
  pass.onclick = () => set('pass'); fail.onclick = () => set('fail');
  note.oninput = () => { review(id).note = note.value; cleanReview(); markDirty(); };
  return { pass, fail, note };
}

/** Refresh `fn` when the card's volume slider moves. */
function onLoud(row, fn) { requestAnimationFrame(() => { const card = row.closest('.snd'); if (card) card.addEventListener('loud', fn); }); }

function variantRow(key, f, refreshCls) {
  const smp = E.samples[f];
  const { pass, fail, note } = reviewControls(f, refreshCls);
  const info = h('span', { class: 'info' });
  const showInfo = () => {
    info.textContent = smp ? `${smp.buf.duration.toFixed(2)}s · 头部静音 ${(smp.start * 1000) | 0}ms · 增益 ×${smp.norm.toFixed(1)} · 响度 ${dB(smp.rms * smp.norm * cfg.sounds[key].vol)}` : '加载失败';
  };
  showInfo();
  const play = h('button', { class: 'icon', title: '按游戏处理播放此变体', onclick: () => { E.resume(); key === 'pickup' ? E.pickup({ file: f, free: true }) : E.play(key, 1, 1, { file: f, free: true }); } }, '▶');
  const raw = h('button', { class: 'icon', title: '原声（不处理）', onclick: () => { E.resume(); E.playRaw(f); } }, '原');
  const cv = h('canvas', { class: 'wave', title: '点击播放原声' });
  cv.onclick = () => { E.resume(); E.playRaw(f); };
  requestAnimationFrame(() => drawWave(cv, smp, cfg.sounds[key]));
  const row = h('div', { class: 'var' }, h('div', { class: 'var-top' }, play, raw, h('span', { class: 'fn' }, fileName(f)), info, pass, fail), cv, note);
  onLoud(row, showInfo);
  return row;
}

function synthRow(key, refreshCls) {
  const name = cfg.sounds[key].syn || key;
  const { pass, fail, note } = reviewControls('@' + key, refreshCls);
  const info = h('span', { class: 'info' });
  const showInfo = () => {
    const m = E.synthInfo[name];
    info.textContent = m ? `合成音色 · ${m.dur.toFixed(2)}s · 响度 ${dB(m.rms * cfg.sounds[key].vol)}` : '合成音色';
  };
  showInfo();
  const row = h('div', { class: 'var' }, h('div', { class: 'var-top' }, h('span', { class: 'fn' }, '♪ ' + name), info, pass, fail), note);
  onLoud(row, showInfo);
  return row;
}

function drawWave(cv, smp, def) {
  const w = cv.width = cv.clientWidth * devicePixelRatio, hgt = cv.height = cv.clientHeight * devicePixelRatio;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, w, hgt);
  if (!smp) return;
  const d = smp.mono, n = d.length, sr = smp.buf.sampleRate;
  const s0 = smp.start * sr, s1 = Math.min(n, s0 + Math.min(smp.len, def.max || 99) * sr);
  g.fillStyle = 'rgba(255,209,102,0.10)';
  g.fillRect(s0 / n * w, 0, (s1 - s0) / n * w, hgt);
  const step = Math.max(1, Math.floor(n / w));
  for (let x = 0; x < w; x++) {
    let mn = 0, mx = 0;
    for (let i = x * step; i < Math.min(n, (x + 1) * step); i++) { const v = d[i] * smp.norm; if (v < mn) mn = v; if (v > mx) mx = v; }
    const inside = x * step >= s0 && x * step <= s1;
    g.fillStyle = inside ? '#8ec5ff' : '#4b4458';
    const y0 = (1 - Math.min(1, mx)) * hgt / 2, y1 = (1 - Math.max(-1, mn)) * hgt / 2;
    g.fillRect(x, y0, 1, Math.max(1, y1 - y0));
  }
}

function updateStats() {
  const files = allIds();
  let p = 0, f = 0;
  for (const x of files) { const s = (cfg.review[x] || {}).status; if (s === 'pass') p++; else if (s === 'fail') f++; }
  $('#stats').innerHTML = `${files.length} 个音效：<b class="g">${p} 通过</b> · <b class="r">${f} 不及格</b> · <b class="u">${files.length - p - f} 未审</b>`;
}

function buildFilters() {
  const opts = [['all', '全部'], ['todo', '未审'], ['fail', '不及格'], ['pass', '通过'], ['mute', '静音']];
  const box = $('#filters'); box.innerHTML = '';
  for (const [k, t] of opts) box.append(h('button', { class: 'chip' + (filter === k ? ' on' : ''), onclick: () => { filter = k; buildFilters(); buildList(); } }, t));
}

// ------------------------------------------------------------------ battle simulator
const SIM_WEAPONS = {
  pistol: { name: '手枪', cd: 0.9, kind: 'gun', hits: 1 },
  smg: { name: '冲锋枪', cd: 0.22, kind: 'gun', hits: 1 },
  minigun: { name: '加特林', cd: 0.12, kind: 'gun', hits: 1 },
  shotgun: { name: '霰弹枪', cd: 1.15, kind: 'gun', hits: 4 },
  sniper: { name: '狙击枪', cd: 1.6, kind: 'gun', hits: 2, crit: 0.4 },
  rocket: { name: '火箭筒', cd: 1.5, kind: 'boom', big: true },
  grenade: { name: '手雷', cd: 1.3, kind: 'boom', big: false },
  slingshot: { name: '弹弓', cd: 0.75, kind: 'gun', hits: 2 },
  flamethrower: { name: '喷火器', cd: 0.15, kind: 'gun', hits: 1 },
  wand: { name: '魔杖', cd: 1.0, kind: 'chain', hits: 3 },
  laser: { name: '激光', cd: 1.0, kind: 'beam', hits: 3 },
  medigun: { name: '医疗枪', cd: 0.6, kind: 'gun', hits: 1 },
  blade: { name: '刀', cd: 0.7, kind: 'swing', hits: 2 },
  hammer: { name: '锤', cd: 1.1, kind: 'heavy', hits: 3 },
  spear: { name: '矛', cd: 0.8, kind: 'stab', hits: 2 },
  fist: { name: '拳', cd: 0.55, kind: 'punch', hits: 1 },
  turret: { name: '炮台', cd: 0.9, kind: 'gun', hits: 1 },
};
const sim = { on: false, timer: null, slots: ['smg', 'shotgun', 'rocket', 'blade', 'laser', 'minigun'], cds: [], hp: 0.35, crit: 0.15, crowd: 1, t0: 0 };

function buildSim() {
  const box = $('#simSlots'); box.innerHTML = '';
  sim.slots.forEach((id, i) => {
    const sel = h('select', {}, h('option', { value: '' }, '— 空 —'), ...Object.keys(SIM_WEAPONS).map(k => h('option', { value: k, selected: k === id }, SIM_WEAPONS[k].name)));
    sel.onchange = () => { sim.slots[i] = sel.value; };
    box.append(sel);
  });
  const sp = $('#simParams'); sp.innerHTML = '';
  const fake = { hp: sim.hp, crit: sim.crit, crowd: sim.crowd };
  const wrap = (label, key, min, max, step, fmt) => {
    const el = slider(label, fake, key, min, max, step, () => { sim[key] = fake[key]; }, fmt);
    el.querySelector('input').addEventListener('input', e => e.stopPropagation(), true);
    return el;
  };
  sp.append(
    wrap('击杀率', 'hp', 0.05, 0.9, 0.05, v => Math.round(v * 100) + '%'),
    wrap('暴击率', 'crit', 0, 0.8, 0.05, v => Math.round(v * 100) + '%'),
    wrap('敌人密度', 'crowd', 0.3, 2, 0.1, v => '×' + v.toFixed(1)),
  );
}

function simFire(id) {
  const w = SIM_WEAPONS[id]; if (!w) return;
  const later = (ms, fn) => setTimeout(() => sim.on && fn(), ms);
  const hitAll = (n, delay, heavy) => {
    const hits = Math.max(1, Math.round(n * sim.crowd * (0.6 + Math.random() * 0.8)));
    for (let i = 0; i < hits; i++) later(delay + i * 18, () => {
      const crit = Math.random() < (w.crit || sim.crit);
      E.hit(crit, heavy);
      if (Math.random() < sim.hp) later(30, () => {
        E.kill(Math.random() < 0.06);
        const n2 = 1 + (Math.random() * 2 | 0);
        for (let j = 0; j < n2; j++) later(380 + j * 70 + Math.random() * 200, () => E.pickup());
      });
    });
  };
  switch (w.kind) {
    case 'gun': E.shot(id); hitAll(w.hits, 90, false); break;
    case 'boom': E.shot(id); later(id === 'rocket' ? 320 : 480, () => { E.explode(w.big); hitAll(4, 10, true); }); break;
    case 'chain': E.play('zap'); hitAll(w.hits, 30, false); break;
    case 'beam': E.play('laser'); hitAll(w.hits, 40, false); break;
    case 'swing': E.swing(0); hitAll(w.hits, 90, false); break;
    case 'heavy': E.swing(1); hitAll(w.hits, 110, true); break;
    case 'stab': E.swing(2); hitAll(w.hits, 100, false); break;
    case 'punch': E.swing(1); hitAll(w.hits, 90, true); break;
  }
}

function simTick() {
  const dt = 0.02;
  sim.slots.forEach((id, i) => {
    if (!id) return;
    sim.cds[i] = (sim.cds[i] ?? Math.random() * SIM_WEAPONS[id].cd) - dt;
    if (sim.cds[i] <= 0) { sim.cds[i] += SIM_WEAPONS[id].cd * (0.9 + Math.random() * 0.2); simFire(id); }
  });
  if ($('#simEvents').checked) {
    if (Math.random() < dt / 4) E.play('hurt');
    if (Math.random() < dt / 9) E.play('levelUp');
    if (Math.random() < dt / 25) E.play('elite');
  }
  const secs = (performance.now() - sim.t0) / 1000;
  $('#simInfo').textContent = `${(stats.played / Math.max(1, secs)).toFixed(0)} 声/秒 · 被限流 ${stats.dropped}`;
}

function toggleSim() {
  E.resume();
  sim.on = !sim.on;
  $('#simBtn').textContent = sim.on ? '■ 停止模拟' : '▶ 开始模拟';
  if (sim.on) {
    stats.played = 0; stats.dropped = 0; sim.t0 = performance.now(); sim.cds = [];
    sim.timer = setInterval(simTick, 20);
    if ($('#simMusic').checked) {
      E.setupBgm(); E.mood = 1; E.applyMood();
      for (const x of $('#bgmMood').children) x.classList.toggle('on', x.dataset.m === '1');
      E.bgmEl.play().catch(() => { });
    }
  } else {
    clearInterval(sim.timer);
    if (E.bgmEl && $('#simMusic').checked) E.bgmEl.pause();
  }
}

// ------------------------------------------------------------------ save / export
function exportText() { cleanReview(); return JSON.stringify(cfg, null, 2) + '\n'; }

async function save() {
  const text = exportText();
  try {
    const r = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const res = await r.json();
    savedText = JSON.stringify(cfg);
    markDirty();
    toast('已保存：' + res.written.join('、'));
  } catch (e) {
    toast('保存失败（需要用 tools/sound-lab.bat 打开）。已改为下载 JSON。', true);
    download();
  }
}
function download() {
  const a = h('a', { href: URL.createObjectURL(new Blob([exportText()], { type: 'application/json' })), download: 'config.json' });
  document.body.append(a); a.click(); a.remove();
}
function failList() {
  const lines = [];
  for (const k in cfg.sounds) for (const f of reviewIds(k, cfg.sounds[k])) {
    const r = cfg.review[f];
    const what = f[0] === '@' ? '合成音效 ' + k : fileName(f);
    if (r && r.status === 'fail') lines.push(`- ${what}（${cfg.sounds[k].label || k}）：${r.note || '（无备注）'}`);
  }
  const text = lines.length ? '不及格的音效：\n' + lines.join('\n') : '';
  if (!text) { toast('还没有标记不及格的文件'); return; }
  navigator.clipboard.writeText(text).then(() => toast(`已复制 ${lines.length} 条，发给 Claude 重新生成`), () => { prompt('复制下面的内容：', text); });
}

// ------------------------------------------------------------------ boot
async function boot() {
  const r = await fetch(SFX + 'config.json', { cache: 'no-store' });
  cfg = await r.json();
  cfg.review = cfg.review || {};
  cfg.master = Object.assign({ sfx: 0.9, music: 0.5, thump: 1 }, cfg.master || {});
  savedText = JSON.stringify(cfg);
  E.init();
  $('#list').append(h('div', { class: 'empty' }, '正在加载音效…'));
  const files = allFiles();
  const errs = [];
  await Promise.all(files.map(f => E.loadFile(f).catch(e => errs.push(e.message))));
  for (const name in RECIPES) E.synthInfo[name] = await E.measureSynth(name);
  if (errs.length) toast('部分文件加载失败：' + errs.join('；'), true);
  buildFilters(); buildSidebar(); buildSim(); wireBgm(); buildList(); updateStats(); markDirty();
  $('#search').addEventListener('input', e => { search = e.target.value.trim(); buildList(); });
  $('#btnSave').onclick = save;
  $('#btnDownload').onclick = download;
  $('#btnRevert').onclick = () => { if (!confirm('撤销所有未保存的修改？')) return; cfg = JSON.parse(savedText); E.applyGains(); buildSidebar(); buildList(); markDirty(); };
  $('#btnFailList').onclick = failList;
  $('#simBtn').onclick = toggleSim;
  window.addEventListener('beforeunload', e => { if (JSON.stringify(cfg) !== savedText) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } });
  document.addEventListener('pointerdown', () => E.resume(), { once: true });
  requestAnimationFrame(meters);
}
boot().catch(e => { document.body.append(h('pre', { style: 'color:#ff6b6b;padding:20px' }, '启动失败：' + e.message + '\n请用 tools/sound-lab.bat 打开（需要本地服务器）。')); });
