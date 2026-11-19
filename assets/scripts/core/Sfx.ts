// Audio: a few sampled sounds, the original WebAudio synth sounds, and streamed background music.
//
// Only a few sounds use recorded samples: every gun (one SMG shot), every melee swing (one heavy
// swing), kills and the UI click. Everything else plays the synth recipes below (the game's original
// web sounds).
// Sample files live in build-templates/web-mobile/sfx/ and the build copies them next to index.html.
// sfx/config.json (edited with tools/sound-lab.html) overrides the defaults below: per-sound volume,
// pitch variation, gaps, voices, mixer buses and review marks. The sound lab uses the same recipes
// and mixing rules (tools/sound-lab.js), so what you hear there is what the game plays.
//
// Mixing: every sound belongs to a bus (weapon, impact, kill, boom, ...). A bus caps simultaneous voices
// and turns itself down when it gets busy (more than `busyAt` plays in ~0.35 s), so six weapons firing
// at once stay readable instead of piling up. Important sounds (hurt, level up, elite) duck the combat
// buses for a moment.

type Wave = OscillatorType;
type ToneFn = (freq: number, dur: number, type: Wave, vol: number, slide?: number, delay?: number) => void;
type NoiseFn = (dur: number, vol: number, freq: number, q?: number, type?: BiquadFilterType, delay?: number, slide?: number) => void;
/** p = pitch factor (random variation x caller rate), x = extra value (pickup combo). */
type Recipe = (T: ToneFn, N: NoiseFn, p: number, x: number) => void;

// The original synth sounds. Same table in tools/sound-lab.js: change both together.
const R = Math.random;
const RECIPES: { [k: string]: Recipe } = {
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
/** Synth loudness at vol 1: the original synth level +12 dB, so it sits with the samples over the BGM. */
const SYN = 1.8;

interface SDef {
    files: string[];  // sample files (no extension = .mp3); empty = synth
    syn?: string;     // synth recipe name when there are no files
    bus: string;
    vol: number;      // loudness (samples: after normalization; synth: x original level)
    pv?: number;      // random pitch variation (+/-)
    max?: number;     // samples: max seconds to play (longer files fade out)
    gap?: number;     // min seconds between two plays of this sound
    voices?: number;  // max simultaneous plays of this sound
    duck?: number;    // duck the combat buses to this gain while it plays
    mute?: boolean;
}
interface BusDef { vol: number; voices: number; busyAt: number }
interface Bus { def: BusDef; gain: GainNode; ends: number[]; load: number; loadT: number }
interface Sample { buf: AudioBuffer; start: number; len: number; norm: number }

const DUCKED = ['weapon', 'impact', 'kill', 'boom', 'enemy', 'pickup'];

// Defaults (used when sfx/config.json cannot be loaded). Keep in sync with the generated config.
const S = (files: string[], bus: string, vol: number, pv: number, max: number, gap: number, voices: number, duck = 0): SDef =>
    ({ files, bus, vol, pv, max, gap, voices, duck });
const Y = (syn: string, bus: string, vol: number, pv: number, gap: number, voices: number, duck = 0): SDef =>
    ({ files: [], syn, bus, vol, pv, gap, voices, duck });
let DEFS: { [k: string]: SDef } = {
    gun: S(['shot_smg'], 'weapon', 0.14, 0.08, 0.2, 0.05, 4),
    melee: S(['swing2'], 'weapon', 0.18, 0.08, 0.35, 0.07, 3),
    kill: S(['kill.wav'], 'kill', 0.34, 0.1, 0.5, 0.045, 4),
    rocket: Y('blast', 'weapon', 1, 0.08, 0.1, 2),
    flame: Y('flame', 'weapon', 2.5, 0.08, 0.12, 2),
    sling: Y('sling', 'weapon', 1, 0.08, 0.06, 3),
    zap: Y('zap', 'weapon', 1, 0.05, 0.08, 2),
    laser: Y('laser', 'weapon', 1, 0.04, 0.1, 2),
    hit: Y('hit', 'impact', 1, 0.05, 0.05, 4),
    crit: Y('crit', 'impact', 1, 0.05, 0.08, 2),
    explode: Y('explode', 'boom', 0.5, 0.05, 0.08, 3),
    hurt: Y('hurt', 'player', 1, 0, 0.12, 2, 0.55),
    dodge: Y('dodge', 'player', 1, 0.05, 0.1, 2),
    shield: Y('zap', 'player', 1, 0, 0.1, 2),
    heal: Y('heal', 'player', 1, 0, 0.08, 2),
    revive: Y('levelUp', 'player', 1, 0, 0.5, 1, 0.5),
    pickup: Y('pickup', 'pickup', 1, 0, 0.03, 4),
    crate: Y('buy', 'pickup', 1, 0, 0.1, 2),
    levelUp: Y('levelUp', 'event', 1, 0, 0.2, 1, 0.6),
    waveStart: Y('waveStart', 'event', 1, 0, 0.3, 1),
    waveEnd: Y('waveEnd', 'event', 1, 0, 0.3, 1, 0.5),
    victory: Y('victory', 'event', 1, 0, 1, 1, 0.4),
    gameOver: Y('gameOver', 'event', 1, 0, 1, 1, 0.4),
    bossRoar: Y('bossRoar', 'event', 0.6, 0, 1, 1, 0.5),
    elite: Y('bossRoar', 'event', 0.6, 0, 1, 1, 0.5),
    spawnWarn: Y('spawnWarn', 'event', 1, 0, 0.5, 1),
    click: S(['click.wav'], 'ui', 0.14, 0.03, 0.3, 0.04, 2),
    buy: Y('buy', 'ui', 1, 0, 0.05, 2),
    deny: Y('deny', 'ui', 1, 0, 0.1, 1),
    reroll: Y('reroll', 'ui', 1, 0, 0.05, 2),
    sell: Y('buy', 'ui', 1, 0, 0.05, 2),
    combine: Y('levelUp', 'ui', 1, 0, 0.1, 1),
};
let BUSES: { [k: string]: BusDef } = {
    weapon: { vol: 0.75, voices: 6, busyAt: 4 },
    impact: { vol: 0.8, voices: 5, busyAt: 4 },
    kill: { vol: 0.85, voices: 5, busyAt: 4 },
    boom: { vol: 0.9, voices: 3, busyAt: 2 },
    enemy: { vol: 0.7, voices: 3, busyAt: 3 },
    pickup: { vol: 0.85, voices: 4, busyAt: 5 },
    player: { vol: 1, voices: 4, busyAt: 8 },
    event: { vol: 1, voices: 3, busyAt: 8 },
    ui: { vol: 1, voices: 3, busyAt: 8 },
};
let MASTER = { sfx: 0.9, music: 0.5, thump: 1 };
let BGM = { file: 'bgm/battle.mp3', battle: 1, menu: 0.55, menuCutoff: 900 };
let FAILED: { [file: string]: boolean } = {};

/** Count entries still playing at time `now` (and drop the finished ones). */
function live(ends: number[], now: number) {
    let n = 0;
    for (let i = ends.length - 1; i >= 0; i--) { if (ends[i] > now) n++; else ends.splice(i, 1); }
    return n;
}

export class Sfx {
    static ctx: AudioContext = null;
    static master: GainNode = null;
    static sfxGain: GainNode = null;
    static musicGain: GainNode = null;
    static noiseBuf: AudioBuffer = null;
    static sfxOn = true;
    static musicOn = true;
    static sfxVol = 1;   // player volume (settings slider), on top of MASTER
    static musicVol = 1;
    private static comp: DynamicsCompressorNode = null;
    private static buses: { [k: string]: Bus } = {};
    private static samples: { [file: string]: Sample } = {};
    private static ends: { [k: string]: number[] } = {};
    private static rr: { [k: string]: number } = {};
    private static last: { [k: string]: number } = {};
    private static loading = false;
    private static uiT = -1; // time of the last UI / event sound (tap() skips its click right after one)
    // music
    private static bgmEl: HTMLAudioElement = null;
    private static bgmFilter: BiquadFilterNode = null;
    private static bgmGain: GainNode = null;
    private static bgmOk = false;
    private static musicTimer: any = null;
    private static step = 0;
    private static nextTime = 0;
    private static _intensity = 0; // 0 menu/shop, 1 battle, 2 boss

    static get intensity() { return this._intensity; }
    static set intensity(v: number) { this._intensity = v; this.applyMusicMood(); }

    static init() {
        if (this.ctx) return;
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        try {
            this.ctx = new AC();
            this.master = this.ctx.createGain(); this.master.gain.value = 1; this.master.connect(this.ctx.destination);
            const comp = this.comp = this.ctx.createDynamicsCompressor();
            comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5;
            comp.attack.value = 0.002; comp.release.value = 0.12;
            comp.connect(this.master);
            this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(comp);
            this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
            this.applyMaster();
            this.buildBuses();
            const len = this.ctx.sampleRate * 1;
            this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { this.ctx = null; }
    }

    private static buildBuses() {
        if (!this.ctx) return;
        for (const k in BUSES) {
            let b = this.buses[k];
            if (!b) {
                const g = this.ctx.createGain(); g.connect(this.sfxGain);
                b = this.buses[k] = { def: BUSES[k], gain: g, ends: [], load: 0, loadT: 0 };
            }
            b.def = BUSES[k];
            b.gain.gain.value = b.def.vol;
        }
    }

    private static applyMaster() {
        if (!this.ctx) return;
        this.sfxGain.gain.value = this.sfxOn ? MASTER.sfx * this.sfxVol : 0;
        this.musicGain.gain.value = this.musicOn ? MASTER.music * this.musicVol : 0;
    }

    /** Load sfx/config.json, then fetch and decode the samples and start streaming the BGM. */
    static load(base = 'sfx/') {
        this.init();
        if (!this.ctx || this.loading) return;
        this.loading = true;
        const go = () => {
            const files: string[] = [];
            for (const k in DEFS) for (const f of DEFS[k].files || []) if (files.indexOf(f) < 0) files.push(f);
            for (const f of files) {
                fetch(base + (/\.\w+$/.test(f) ? f : f + '.mp3'))
                    .then(r => { if (!r.ok) throw new Error('' + r.status); return r.arrayBuffer(); })
                    .then(ab => new Promise<AudioBuffer>((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
                    .then(buf => { this.samples[f] = this.analyse(buf); })
                    .catch(() => { /* that sound stays silent */ });
            }
            this.setupBgm();
        };
        fetch(base + 'config.json')
            .then(r => { if (!r.ok) throw new Error('' + r.status); return r.json(); })
            .then(cfg => this.applyConfig(cfg))
            .catch(() => { /* keep built-in defaults */ })
            .then(go);
    }

    private static applyConfig(cfg: any) {
        if (!cfg) return;
        if (cfg.sounds) {
            const next: { [k: string]: SDef } = {};
            for (const k in DEFS) next[k] = DEFS[k];
            for (const k in cfg.sounds) next[k] = Object.assign({}, DEFS[k] || {}, cfg.sounds[k]);
            DEFS = next;
        }
        if (cfg.buses) for (const k in cfg.buses) BUSES[k] = Object.assign({}, BUSES[k] || { vol: 1, voices: 4, busyAt: 6 }, cfg.buses[k]);
        if (cfg.master) MASTER = Object.assign({}, MASTER, cfg.master);
        if (cfg.bgm) BGM = Object.assign({}, BGM, cfg.bgm);
        FAILED = {};
        if (cfg.review) for (const f in cfg.review) if (cfg.review[f] && cfg.review[f].status === 'fail') FAILED[f] = true;
        this.applyMaster();
        this.buildBuses();
    }

    /** Trim leading silence and work out a loudness normalization factor. Same maths as the sound lab. */
    private static analyse(buf: AudioBuffer): Sample {
        const ch = buf.numberOfChannels;
        const n = buf.length, sr = buf.sampleRate;
        const mono = new Float32Array(n);
        for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
        let peak = 0;
        for (let i = 0; i < n; i++) { const a = Math.abs(mono[i]); if (a > peak) peak = a; }
        if (peak < 1e-4) return { buf, start: 0, len: buf.duration, norm: 1 };
        let s = 0; while (s < n && Math.abs(mono[s]) < peak * 0.06) s++;
        let e = n - 1; while (e > s && Math.abs(mono[e]) < peak * 0.012) e--;
        s = Math.max(0, s - Math.round(sr * 0.002));
        const win = Math.max(64, Math.round(sr * 0.03));
        let best = 0;
        for (let i = s; i < e; i += win >> 1) {
            let acc = 0; const end = Math.min(e, i + win);
            for (let j = i; j < end; j++) acc += mono[j] * mono[j];
            const rms = Math.sqrt(acc / Math.max(1, end - i));
            if (rms > best) best = rms;
        }
        let norm = best > 0 ? 0.32 / best : 1;
        norm = Math.min(norm, 0.98 / peak, 12);
        return { buf, start: s / sr, len: (e - s) / sr + 0.02, norm };
    }

    static unlock() {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (!this.unlocked) {
            this.unlocked = true;
            // iOS: play a silent buffer inside the gesture
            try { const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0); } catch (e) { }
        }
        this.playBgm();
    }
    private static unlocked = false;

    static setSfx(on: boolean) { this.sfxOn = on; this.applyMaster(); }
    /** Settings sliders (0..1). Volume 0 also stops the music stream. */
    static setSfxVolume(v: number) { this.sfxVol = Math.max(0, Math.min(1, v)); this.sfxOn = this.sfxVol > 0; this.applyMaster(); }
    static setMusicVolume(v: number) {
        this.musicVol = Math.max(0, Math.min(1, v));
        if ((this.musicVol > 0) !== this.musicOn) this.setMusic(this.musicVol > 0); else this.applyMaster();
    }
    static setMusic(on: boolean) {
        this.musicOn = on; this.applyMaster();
        if (this.bgmEl) { if (on) this.playBgm(); else this.bgmEl.pause(); }
    }

    /** App went to background / came back. */
    static suspend() { if (this.bgmEl) this.bgmEl.pause(); if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
    static resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); this.playBgm(); }

    private static ready() { return !!this.ctx && this.sfxOn && this.ctx.state === 'running'; }

    private static ok(key: string, minGap: number) {
        if (!this.ready()) return false;
        const t = this.ctx.currentTime;
        if (this.last[key] !== undefined && t - this.last[key] < minGap) return false;
        this.last[key] = t;
        return true;
    }

    /** Busy-bus attenuation: 1 while quiet, sqrt(busyAt/load) once more than busyAt sounds hit in ~0.35 s. */
    private static busLoad(b: Bus, add: boolean): number {
        const now = this.ctx.currentTime;
        b.load = b.load * Math.exp(-(now - b.loadT) / 0.35) + (add ? 1 : 0);
        b.loadT = now;
        return b.load > b.def.busyAt ? Math.sqrt(b.def.busyAt / b.load) : 1;
    }

    /** Lower the combat buses for a moment so an important sound reads clearly. */
    private static duck(to: number, hold: number) {
        const t = this.ctx.currentTime;
        for (const k of DUCKED) {
            const b = this.buses[k]; if (!b) continue;
            const g = b.gain.gain;
            g.cancelScheduledValues(t);
            g.setValueAtTime(g.value, t);
            g.linearRampToValueAtTime(b.def.vol * to, t + 0.03);
            g.setValueAtTime(b.def.vol * to, t + hold);
            g.linearRampToValueAtTime(b.def.vol, t + hold + 0.35);
        }
    }

    /**
     * Play a sound by key: a sample when the sound has files, otherwise its synth recipe.
     * Applies the per-sound gap and voice limits and the bus voice cap / busy attenuation.
     */
    private static play(key: string, volMul = 1, rate = 1, x = 0) {
        const def = DEFS[key];
        if (!def || def.mute || !this.ready()) return;
        const files = def.files || [];
        let smp: Sample = null;
        if (files.length) {
            // pick a variant (round robin with a little randomness), skipping files marked as failed
            let ok = files.filter(f => !FAILED[f] && this.samples[f]);
            if (!ok.length) ok = files.filter(f => this.samples[f]);
            if (!ok.length) return;
            const i = this.rr[key] = ((this.rr[key] || 0) + 1 + (ok.length > 2 ? Math.floor(Math.random() * 2) : 0)) % ok.length;
            smp = this.samples[ok[i]];
        } else if (!RECIPES[def.syn || key]) return;
        const bus = this.buses[def.bus] || this.buses.event;
        const t = this.ctx.currentTime;
        if (def.gap && this.last[key] !== undefined && t - this.last[key] < def.gap) return;
        const ends = this.ends[key] || (this.ends[key] = []);
        if (live(ends, t) >= (def.voices || 4)) return;
        if (live(bus.ends, t) >= bus.def.voices) { this.busLoad(bus, true); return; }
        this.last[key] = t;
        const busy = this.busLoad(bus, true);
        const r = rate * (1 + (def.pv ? (Math.random() * 2 - 1) * def.pv : 0));
        const c = this.ctx;
        const g = c.createGain();
        g.connect(bus.gain);
        let dur: number;
        if (smp) {
            const src = c.createBufferSource();
            src.buffer = smp.buf;
            src.playbackRate.value = r;
            const vol = smp.norm * def.vol * volMul * busy;
            dur = Math.min(smp.len, def.max || smp.len) / r;
            g.gain.setValueAtTime(vol, t);
            if (dur < smp.len / r - 0.01) {
                g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.06));
                g.gain.linearRampToValueAtTime(0.0001, t + dur);
            }
            src.connect(g);
            src.start(t, smp.start, dur + 0.02);
        } else {
            g.gain.value = def.vol * volMul * busy * SYN;
            dur = 0;
            const T: ToneFn = (f, d, type, v, slide = 0, delay = 0) => { this.tone(f, d, type, v, slide, delay, g); dur = Math.max(dur, delay + d); };
            const N: NoiseFn = (d, v, f, q = 1, type = 'lowpass', delay = 0, slide = 0) => { this.noise(d, v, f, q, type, delay, slide, g); dur = Math.max(dur, delay + d); };
            RECIPES[def.syn || key](T, N, r, x);
        }
        ends.push(t + dur);
        bus.ends.push(t + dur);
        if (def.bus === 'ui' || def.bus === 'event' || def.bus === 'pickup') this.uiT = t;
        if (def.duck) this.duck(def.duck, Math.min(0.6, dur * 0.6));
    }

    private static tone(freq: number, dur: number, type: Wave, vol: number, slide = 0, delay = 0, dest?: AudioNode) {
        const c = this.ctx, t = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(dest || this.sfxGain);
        o.start(t); o.stop(t + dur + 0.02);
    }

    private static noise(dur: number, vol: number, freq: number, q = 1, type: BiquadFilterType = 'lowpass', delay = 0, slide = 0, dest?: AudioNode) {
        const c = this.ctx, t = c.currentTime + delay;
        const s = c.createBufferSource(); s.buffer = this.noiseBuf;
        const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
        if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
        s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }

    /** Short sine "thump" under big impacts for low-end punch, routed (and attenuated) through a bus. */
    private static thump(f0: number, dur: number, vol: number, bus: string, gap: number) {
        if (!MASTER.thump || !this.ok('th_' + bus, gap)) return;
        const b = this.buses[bus];
        const busy = b ? this.busLoad(b, false) : 1;
        this.tone(f0, dur, 'sine', vol * MASTER.thump * busy, 0.35, 0, b ? b.gain : undefined);
    }

    // ---------------------------------------------------------------- weapons
    /** Shot sound per weapon id: every gun shares one sample (pitched per gun), the rest are synth. */
    static shot(id: string) {
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
    }
    /** Every melee weapon shares one heavy swing. kind: 0 light blade, 1 heavy blunt, 2 thrust. */
    static swing(kind = 0) {
        if (kind === 1) this.play('melee');
        else if (kind === 2) this.play('melee', 0.9, 1.2);
        else this.play('melee', 1, 1.1);
    }
    static zap() { this.play('zap'); }
    static laser() { this.play('laser'); }

    // ---------------------------------------------------------------- impacts
    static hit(crit = false, heavy = false) {
        if (crit) this.play('crit');
        else this.play('hit', heavy ? 1.15 : 1, heavy ? 0.85 : 1);
    }
    static kill(big = false) {
        this.play('kill', big ? 1.2 : 1, big ? 0.8 : 1);
        if (big) this.thump(90, 0.16, 0.3, 'kill', 0.07);
    }
    static explode(big = true) {
        this.play('explode', big ? 1 : 0.7, big ? 1 : 1.25);
        this.thump(big ? 70 : 95, big ? 0.3 : 0.18, big ? 0.38 : 0.26, 'boom', 0.1);
    }
    static spit() { /* enemy shots stay silent (too busy) */ }

    // ---------------------------------------------------------------- player / pickups
    static hurt() { this.play('hurt'); }
    static dodge() { this.play('dodge'); }
    static shield() { this.play('shield'); }
    private static pickCombo = 0; private static pickT = 0;
    static pickup() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        if (t - this.pickT > 0.4) this.pickCombo = 0;
        this.pickT = t;
        this.pickCombo = Math.min(this.pickCombo + 1, 14);
        // rising pitch while collecting a stream of crystals
        this.play('pickup', 1, 1, this.pickCombo);
    }
    static heal() { this.play('heal'); }
    static crate() { this.play('crate'); }
    static mine() { /* silent */ }
    static revive() { this.play('revive'); }
    static levelUp() { this.play('levelUp'); }

    // ---------------------------------------------------------------- UI
    static buy() { this.play('buy'); }
    static sell() { this.play('sell'); }
    static combine() { this.play('combine'); }
    static deny() { this.play('deny'); }
    static click() { this.play('click'); }
    /**
     * Click for a tap that has no sound of its own (empty screen, dim background, cards). Waits a moment
     * and stays quiet when the tap's handler already played a UI sound (button click, buy, deny...).
     */
    static tap() {
        if (!this.ready()) return;
        const t0 = this.ctx.currentTime;
        setTimeout(() => { if (this.ctx && this.uiT < t0 - 0.005) this.click(); }, 30);
    }
    static reroll() { this.play('reroll'); }

    // ---------------------------------------------------------------- flow
    static waveStart() { this.play('waveStart'); }
    static waveEnd() { this.play('waveEnd'); }
    static spawnWarn() { this.play('spawnWarn'); }
    static gameOver() { this.play('gameOver'); }
    static victory() { this.play('victory'); }
    static bossRoar() { this.play('bossRoar'); }
    static eliteAlarm() { this.play('elite'); }

    // ---------------------------------------------------------------- music
    /** Stream the BGM file through an <audio> element (not decoded into memory) with a mood filter. */
    private static setupBgm() {
        if (!this.ctx || this.bgmEl || !BGM.file) return;
        try {
            const el = new Audio();
            el.src = BGM.file;
            el.loop = true;
            el.preload = 'auto';
            (el as any).playsInline = true;
            el.addEventListener('error', () => { this.bgmOk = false; this.bgmEl = null; this.startSynth(); });
            const src = this.ctx.createMediaElementSource(el);
            const f = this.bgmFilter = this.ctx.createBiquadFilter();
            f.type = 'lowpass'; f.Q.value = 0.7;
            const g = this.bgmGain = this.ctx.createGain();
            src.connect(f); f.connect(g); g.connect(this.musicGain);
            this.bgmEl = el;
            this.bgmOk = true;
            this.stopSynth();
            this.applyMusicMood(true);
            this.playBgm();
        } catch (e) { this.bgmEl = null; this.startSynth(); }
    }

    private static playBgm() {
        if (!this.bgmEl || !this.musicOn || !this.ctx || this.ctx.state !== 'running') return;
        if (this.bgmEl.paused) { const p = this.bgmEl.play(); if (p && p.catch) p.catch(() => { /* waits for a gesture */ }); }
    }

    /** Menu/shop: muffled and quieter. Battle: full. Boss: full and a touch louder. */
    private static applyMusicMood(instant = false) {
        if (!this.ctx || !this.bgmFilter) return;
        const t = this.ctx.currentTime, tc = instant ? 0.001 : 0.4;
        const battle = this._intensity >= 1;
        const cutoff = battle ? 18000 : BGM.menuCutoff;
        const vol = battle ? BGM.battle * (this._intensity === 2 ? 1.12 : 1) : BGM.menu;
        this.bgmFilter.frequency.setTargetAtTime(cutoff, t, tc);
        this.bgmGain.gain.setTargetAtTime(vol, t, tc);
    }

    static startMusic() {
        this.init();
        // the streamed BGM replaces the synth loop; the synth only runs if the BGM file fails
        if (!BGM.file) this.startSynth();
    }
    private static startSynth() {
        if (!this.ctx || this.musicTimer || this.bgmOk) return;
        this.nextTime = this.ctx.currentTime + 0.1;
        this.step = 0;
        this.musicTimer = setInterval(() => this.schedule(), 50);
    }
    private static stopSynth() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } }
    private static schedule() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const bpm = this._intensity === 2 ? 150 : this._intensity === 1 ? 128 : 96;
        const stepDur = 60 / bpm / 4;
        if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
        while (this.nextTime < this.ctx.currentTime + 0.15) {
            this.playStep(this.step, this.nextTime);
            this.nextTime += stepDur;
            this.step = (this.step + 1) % 64;
        }
    }
    private static playStep(s: number, t: number) {
        const c = this.ctx, dest = this.musicGain;
        const prog = this._intensity === 2 ? [41.2, 43.65, 38.89, 36.71] : [55, 43.65, 49, 41.2];
        const root = prog[Math.floor(s / 16) % 4];
        const pos = s % 16;
        const delay = Math.max(0, t - c.currentTime);
        if (this._intensity === 0) {
            if (pos % 8 === 0) this.tone(root * 2, 0.5, 'triangle', 0.18, 1, delay, dest);
            if (pos % 4 === 2) this.tone(root * 4 * (pos === 6 ? 1.5 : 1.25), 0.25, 'sine', 0.06, 1, delay, dest);
            return;
        }
        const bassPat = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1];
        if (bassPat[pos]) this.tone(root * (pos % 4 === 3 ? 2 : 1) * 2, 0.12, 'sawtooth', 0.12, 1, delay, dest);
        if (pos % 4 === 0) { this.tone(110, 0.15, 'sine', 0.5, 0.35, delay, dest); }
        if (pos === 4 || pos === 12) this.noise(0.12, 0.18, 1800, 0.8, 'bandpass', delay, 0, dest);
        if (pos % 2 === 1) this.noise(0.03, 0.06, 7000, 1, 'highpass', delay, 0, dest);
        if (this._intensity >= 1 && pos % 2 === 0) {
            const arp = [1, 1.5, 2, 1.5, 1.2, 1.5, 2, 3];
            this.tone(root * 4 * arp[(pos / 2) % 8], 0.08, 'square', 0.025, 1, delay, dest);
        }
    }
}
