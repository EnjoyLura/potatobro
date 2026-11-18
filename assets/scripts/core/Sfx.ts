// Audio: sampled sound effects + streamed background music through WebAudio.
//
// Files live in build-templates/web-mobile/{sfx,bgm}/ and the build copies them next to index.html.
// sfx/config.json (edited with tools/sound-lab.html) overrides the defaults below: per-sound volume,
// pitch variation, gaps, voices, mixer buses and review marks. The sound lab uses the same mixing rules
// (tools/sound-lab.js), so what you hear there is what the game plays.
//
// Mixing: every sound belongs to a bus (weapon, impact, kill, boom, ...). A bus caps simultaneous voices
// and turns itself down when it gets busy (more than `busyAt` plays in ~0.35 s), so six weapons firing
// at once stay readable instead of piling up. Important sounds (hurt, level up, elite) duck the combat
// buses for a moment. Every effect keeps a tiny synth fallback in case a file fails to load.

type Wave = OscillatorType;

interface SDef {
    files: string[];
    bus: string;
    vol: number;      // loudness after normalization
    pv?: number;      // random pitch variation (+/-)
    max?: number;     // max seconds to play (longer files fade out)
    gap?: number;     // min seconds between two plays of this sound
    voices?: number;  // max simultaneous plays of this sound
    duck?: number;    // duck the combat buses to this gain while it plays
    mute?: boolean;
}
interface BusDef { vol: number; voices: number; busyAt: number }
interface Bus { def: BusDef; gain: GainNode; active: number; load: number; loadT: number }
interface Sample { buf: AudioBuffer; start: number; len: number; norm: number }

const DUCKED = ['weapon', 'impact', 'kill', 'boom', 'enemy', 'pickup'];

// Defaults (used when sfx/config.json cannot be loaded). Keep in sync with the generated config.
const S = (files: string[], bus: string, vol: number, pv: number, max: number, gap: number, voices: number, duck = 0): SDef =>
    ({ files, bus, vol, pv, max, gap, voices, duck });
let DEFS: { [k: string]: SDef } = {
    pistol: S(['shot_pistol'], 'weapon', 0.32, 0.08, 0.28, 0.06, 3),
    smg: S(['shot_smg'], 'weapon', 0.24, 0.1, 0.18, 0.06, 3),
    shotgun: S(['shot_shotgun'], 'weapon', 0.48, 0.06, 0.55, 0.12, 2),
    sniper: S(['shot_sniper'], 'weapon', 0.48, 0.05, 0.55, 0.1, 2),
    rocket: S(['shot_rocket'], 'weapon', 0.42, 0.06, 0.55, 0.1, 2),
    magic: S(['shot_magic'], 'weapon', 0.34, 0.1, 0.38, 0.08, 2),
    sling: S(['shot_sling'], 'weapon', 0.34, 0.12, 0.25, 0.07, 2),
    flame: S(['flame'], 'weapon', 0.26, 0.1, 0.35, 0.12, 2),
    turret: S(['turret'], 'weapon', 0.2, 0.12, 0.18, 0.08, 2),
    laser: S(['laser'], 'weapon', 0.36, 0.06, 0.45, 0.1, 2),
    zap: S(['zap'], 'weapon', 0.34, 0.1, 0.32, 0.08, 2),
    swing: S(['swing1'], 'weapon', 0.3, 0.12, 0.28, 0.07, 3),
    swingHeavy: S(['swing2'], 'weapon', 0.38, 0.08, 0.35, 0.09, 2),
    stab: S(['stab'], 'weapon', 0.3, 0.12, 0.24, 0.07, 3),
    mine: S(['mine'], 'weapon', 0.24, 0.08, 0.25, 0.15, 1),
    hit: S(['hit1', 'hit2', 'hit3'], 'impact', 0.42, 0.12, 0.28, 0.05, 4),
    crit: S(['crit'], 'impact', 0.52, 0.08, 0.42, 0.09, 2),
    kill: S(['kill1', 'kill2', 'kill3'], 'kill', 0.55, 0.16, 0.42, 0.04, 5),
    explode: S(['explode1'], 'boom', 0.62, 0.08, 0.85, 0.1, 2),
    explodeSmall: S(['explode2'], 'boom', 0.5, 0.1, 0.6, 0.08, 3),
    spit: S(['enemy_spit'], 'enemy', 0.26, 0.15, 0.3, 0.1, 2),
    hurt: S(['hurt'], 'player', 0.7, 0.06, 0.45, 0.12, 2, 0.55),
    dodge: S(['dodge'], 'player', 0.42, 0.1, 0.3, 0.1, 2),
    shield: S(['shield'], 'player', 0.46, 0.06, 0.4, 0.1, 2),
    heal: S(['heal'], 'player', 0.45, 0.05, 0.6, 0.1, 2),
    revive: S(['revive'], 'player', 0.62, 0, 1.2, 0.5, 1, 0.5),
    pickup: S(['pickup'], 'pickup', 0.3, 0, 0.2, 0.03, 4),
    crate: S(['crate'], 'pickup', 0.5, 0.04, 0.5, 0.1, 2),
    levelUp: S(['levelup'], 'event', 0.5, 0, 1.0, 0.25, 1, 0.6),
    waveStart: S(['wave_start'], 'event', 0.48, 0, 1.0, 0.3, 1),
    waveEnd: S(['wave_end'], 'event', 0.52, 0, 1.5, 0.3, 1, 0.5),
    victory: S(['victory'], 'event', 0.58, 0, 3.2, 1, 1, 0.4),
    gameOver: S(['gameover'], 'event', 0.58, 0, 2.6, 1, 1, 0.4),
    bossRoar: S(['boss_roar'], 'event', 0.7, 0, 2.0, 1, 1, 0.5),
    elite: S(['elite'], 'event', 0.65, 0, 1.2, 1, 1, 0.5),
    spawnWarn: S(['spawn_warn'], 'event', 0.18, 0.1, 0.35, 0.3, 1),
    click: S(['ui_click'], 'ui', 0.4, 0.05, 0.15, 0.04, 2),
    buy: S(['ui_buy'], 'ui', 0.5, 0.03, 0.5, 0.05, 2),
    deny: S(['ui_deny'], 'ui', 0.42, 0, 0.3, 0.1, 1),
    reroll: S(['ui_reroll'], 'ui', 0.45, 0.04, 0.5, 0.05, 2),
    sell: S(['ui_sell'], 'ui', 0.45, 0.04, 0.4, 0.05, 2),
    combine: S(['ui_combine'], 'ui', 0.55, 0, 0.8, 0.1, 1),
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

export class Sfx {
    static ctx: AudioContext = null;
    static master: GainNode = null;
    static sfxGain: GainNode = null;
    static musicGain: GainNode = null;
    static noiseBuf: AudioBuffer = null;
    static sfxOn = true;
    static musicOn = true;
    private static comp: DynamicsCompressorNode = null;
    private static buses: { [k: string]: Bus } = {};
    private static samples: { [file: string]: Sample } = {};
    private static active: { [k: string]: number } = {};
    private static rr: { [k: string]: number } = {};
    private static last: { [k: string]: number } = {};
    private static loading = false;
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
                b = this.buses[k] = { def: BUSES[k], gain: g, active: 0, load: 0, loadT: 0 };
            }
            b.def = BUSES[k];
            b.gain.gain.value = b.def.vol;
        }
    }

    private static applyMaster() {
        if (!this.ctx) return;
        this.sfxGain.gain.value = this.sfxOn ? MASTER.sfx : 0;
        this.musicGain.gain.value = this.musicOn ? MASTER.music : 0;
    }

    /** Load sfx/config.json, then fetch and decode every sample and start streaming the BGM. */
    static load(base = 'sfx/') {
        this.init();
        if (!this.ctx || this.loading) return;
        this.loading = true;
        const go = () => {
            const files: string[] = [];
            for (const k in DEFS) for (const f of DEFS[k].files) if (files.indexOf(f) < 0) files.push(f);
            for (const f of files) {
                fetch(base + f + '.mp3')
                    .then(r => { if (!r.ok) throw new Error('' + r.status); return r.arrayBuffer(); })
                    .then(ab => new Promise<AudioBuffer>((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
                    .then(buf => { this.samples[f] = this.analyse(buf); })
                    .catch(() => { /* synth fallback stays in use */ });
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
     * Play a sampled sound. Returns false when the sample is not loaded (caller falls back to synth)
     * and true otherwise, also when the play was skipped by the gap / voice limits.
     */
    private static play(key: string, volMul = 1, rate = 1): boolean {
        const def = DEFS[key];
        if (!def || !this.ctx) return false;
        if (def.mute) return true;
        // pick a variant (round robin with a little randomness), skipping files marked as failed
        let files = def.files.filter(f => !FAILED[f] && this.samples[f]);
        if (!files.length) files = def.files.filter(f => this.samples[f]);
        if (!files.length) return false;
        const i = this.rr[key] = ((this.rr[key] || 0) + 1 + (files.length > 2 ? Math.floor(Math.random() * 2) : 0)) % files.length;
        const smp = this.samples[files[i]];
        if (!this.ready()) return true;
        const bus = this.buses[def.bus] || this.buses.event;
        const t = this.ctx.currentTime;
        if (def.gap && this.last[key] !== undefined && t - this.last[key] < def.gap) return true;
        if ((this.active[key] || 0) >= (def.voices || 4)) return true;
        if (bus.active >= bus.def.voices) { this.busLoad(bus, true); return true; }
        this.last[key] = t;
        const busy = this.busLoad(bus, true);
        const c = this.ctx;
        const src = c.createBufferSource();
        src.buffer = smp.buf;
        const r = rate * (1 + (def.pv ? (Math.random() * 2 - 1) * def.pv : 0));
        src.playbackRate.value = r;
        const g = c.createGain();
        const vol = smp.norm * def.vol * volMul * busy;
        const dur = Math.min(smp.len, def.max || smp.len) / r;
        g.gain.setValueAtTime(vol, t);
        if (dur < smp.len / r - 0.01) {
            g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.06));
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
        }
        src.connect(g); g.connect(bus.gain);
        this.active[key] = (this.active[key] || 0) + 1;
        bus.active++;
        src.onended = () => { this.active[key] = Math.max(0, (this.active[key] || 1) - 1); bus.active = Math.max(0, bus.active - 1); };
        src.start(t, smp.start, dur + 0.02);
        if (def.duck) this.duck(def.duck, Math.min(0.6, dur * 0.6));
        return true;
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

    /** Short sine "thump" under impacts for low-end punch, routed (and attenuated) through a bus. */
    private static thump(f0: number, dur: number, vol: number, bus: string, gap: number) {
        if (!MASTER.thump || !this.ok('th_' + bus, gap)) return;
        const b = this.buses[bus];
        const busy = b ? this.busLoad(b, false) : 1;
        this.tone(f0, dur, 'sine', vol * MASTER.thump * busy, 0.35, 0, b ? b.gain : undefined);
    }

    // ---------------------------------------------------------------- weapons
    /** Shot sound per weapon id. */
    static shot(id: string) {
        switch (id) {
            case 'pistol': if (!this.play('pistol')) this.synthShot(0); break;
            case 'smg': if (!this.play('smg')) this.synthShot(0); break;
            case 'minigun': if (!this.play('smg', 0.9, 0.9)) this.synthShot(0); break;
            case 'shotgun': if (!this.play('shotgun')) this.synthShot(1); this.thump(120, 0.12, 0.25, 'weapon', 0.12); break;
            case 'sniper': if (!this.play('sniper')) this.synthShot(2); this.thump(140, 0.1, 0.2, 'weapon', 0.12); break;
            case 'rocket': if (!this.play('rocket')) this.synthShot(1); break;
            case 'grenade': if (!this.play('sling', 0.9, 0.75)) this.synthShot(5); break;
            case 'flamethrower': if (!this.play('flame')) this.synthShot(3); break;
            case 'slingshot': if (!this.play('sling')) this.synthShot(5); break;
            case 'medigun': if (!this.play('magic', 0.7, 1.3)) this.synthShot(4); break;
            case 'turret': if (!this.play('turret')) this.synthShot(5); break;
            default: if (!this.play('pistol')) this.synthShot(0);
        }
    }
    private static synthShot(kind: number) {
        if (!this.ok('shoot' + kind, 0.06)) return;
        const p = 1 + (Math.random() - 0.5) * 0.15;
        if (kind === 0) { this.tone(880 * p, 0.07, 'square', 0.05, 0.4); this.noise(0.05, 0.05, 3000, 1, 'highpass'); }
        else if (kind === 1) { this.noise(0.18, 0.18, 1200, 0.7, 'lowpass', 0, 0.3); this.tone(160 * p, 0.12, 'square', 0.06, 0.5); }
        else if (kind === 2) { this.tone(1400 * p, 0.12, 'sawtooth', 0.05, 0.25); }
        else if (kind === 3) { this.noise(0.25, 0.08, 600, 1, 'bandpass', 0, 3); }
        else if (kind === 4) { this.tone(500 * p, 0.25, 'sawtooth', 0.06, 2.5); this.tone(1000 * p, 0.2, 'sine', 0.05, 2); }
        else { this.tone(1200 * p, 0.05, 'triangle', 0.05, 0.6); }
    }
    /** kind: 0 light blade, 1 heavy blunt, 2 thrust. */
    static swing(kind = 0) {
        const key = kind === 1 ? 'swingHeavy' : kind === 2 ? 'stab' : 'swing';
        if (this.play(key)) return;
        if (!this.ok('swing', 0.07)) return;
        this.noise(0.12, 0.12, 900 + Math.random() * 300, 1.5, 'bandpass', 0, 2.2);
    }
    static zap() { if (this.play('zap')) return; if (!this.ok('zap', 0.08)) return; this.noise(0.12, 0.1, 4000, 4, 'bandpass', 0, 0.5); this.tone(1600, 0.08, 'sawtooth', 0.04, 0.4); }
    static laser() { if (this.play('laser')) return; if (!this.ok('laser', 0.1)) return; this.tone(1800, 0.3, 'sawtooth', 0.06, 0.2); this.tone(900, 0.3, 'square', 0.04, 0.3); }
    static magic() { if (this.play('magic')) return; this.zap(); }

    // ---------------------------------------------------------------- impacts
    static hit(crit = false, heavy = false) {
        if (crit) {
            if (!this.play('crit')) { if (this.ok('crit', 0.08)) { this.noise(0.08, 0.18, 2600, 1, 'lowpass', 0, 0.4); this.tone(1500, 0.12, 'square', 0.04, 0.6); } }
            this.thump(150, 0.09, 0.22, 'impact', 0.08);
            return;
        }
        if (!this.play('hit', heavy ? 1.15 : 1, heavy ? 0.85 : 1)) {
            if (!this.ok('hit', 0.05)) return;
            this.noise(0.06, 0.12, 2200, 1, 'lowpass', 0, 0.4);
            this.tone(220 + Math.random() * 60, 0.06, 'square', 0.035, 0.5);
        }
        if (heavy) this.thump(110, 0.08, 0.18, 'impact', 0.08);
    }
    static kill(big = false) {
        if (!this.play('kill', big ? 1.2 : 1, big ? 0.8 : 1)) {
            if (this.ok('kill', 0.05)) {
                const p = 1 + (Math.random() - 0.5) * 0.3;
                this.tone(340 * p, 0.12, 'sine', 0.09, 0.35);
                this.noise(0.1, 0.07, 1400, 1, 'lowpass', 0, 0.3);
            }
        }
        // a little sub "pop" under kills makes them feel chunky
        this.thump(big ? 90 : 130, big ? 0.16 : 0.07, big ? 0.3 : 0.14, 'kill', 0.07);
    }
    static explode(big = true) {
        if (!this.play(big ? 'explode' : 'explodeSmall')) {
            if (this.ok('explode', 0.08)) { this.noise(0.5, 0.35, 900, 0.8, 'lowpass', 0, 0.12); this.tone(90, 0.4, 'sine', 0.2, 0.4); }
        }
        this.thump(big ? 70 : 95, big ? 0.3 : 0.18, big ? 0.38 : 0.26, 'boom', 0.1);
    }
    static spit() { this.play('spit'); }

    // ---------------------------------------------------------------- player / pickups
    static hurt() { if (this.play('hurt')) { this.thump(90, 0.14, 0.25, 'player', 0.12); return; } if (!this.ok('hurt', 0.12)) return; this.tone(300, 0.25, 'sawtooth', 0.12, 0.3); this.noise(0.2, 0.12, 800, 1); }
    static dodge() { if (this.play('dodge')) return; if (!this.ok('dodge', 0.1)) return; this.noise(0.12, 0.08, 3000, 2, 'highpass', 0, 0.5); }
    static shield() { if (this.play('shield')) return; this.zap(); }
    private static pickCombo = 0; private static pickT = 0;
    static pickup() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        if (t - this.pickT > 0.45) this.pickCombo = 0;
        this.pickT = t;
        this.pickCombo = Math.min(this.pickCombo + 1, 16);
        // rising pitch while collecting a stream of crystals
        if (this.play('pickup', 1, 1 + this.pickCombo * 0.035)) return;
        if (!this.ok('pick', 0.03)) return;
        this.tone(700 + this.pickCombo * 45, 0.07, 'sine', 0.06, 1.3);
    }
    static heal() { if (this.play('heal')) return; if (!this.ok('heal', 0.08)) return; this.tone(660, 0.15, 'sine', 0.07, 1.5); this.tone(990, 0.15, 'sine', 0.05, 1.3, 0.05); }
    static crate() { if (this.play('crate')) return; this.buy(); }
    static mine() { this.play('mine'); }
    static revive() { if (this.play('revive')) return; this.levelUp(); }
    static levelUp() {
        if (this.play('levelUp')) return;
        if (!this.ok('lvl', 0.2)) return;
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.05, 1, i * 0.07));
    }

    // ---------------------------------------------------------------- UI
    static buy() { if (this.play('buy')) return; if (!this.ok('buy', 0.05)) return; this.tone(1200, 0.08, 'square', 0.05, 1); this.tone(1800, 0.14, 'square', 0.05, 1, 0.06); }
    static sell() { if (this.play('sell')) return; this.buy(); }
    static combine() { if (this.play('combine')) return; this.levelUp(); }
    static deny() { if (this.play('deny')) return; if (!this.ok('deny', 0.1)) return; this.tone(180, 0.18, 'square', 0.06, 0.8); }
    static click() { if (this.play('click')) return; if (!this.ok('click', 0.04)) return; this.tone(900, 0.04, 'triangle', 0.07, 0.7); }
    static reroll() { if (this.play('reroll')) return; if (!this.ok('reroll', 0.05)) return; [600, 800, 1000].forEach((f, i) => this.tone(f, 0.05, 'triangle', 0.05, 1, i * 0.035)); }

    // ---------------------------------------------------------------- flow
    static waveStart() { if (this.play('waveStart')) return; if (!this.ok('ws', 0.3)) return; [392, 523, 659].forEach((f, i) => this.tone(f, 0.22, 'sawtooth', 0.045, 1, i * 0.1)); }
    static waveEnd() { if (this.play('waveEnd')) return; if (!this.ok('we', 0.3)) return; [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.07, 1, i * 0.09)); }
    static spawnWarn() { if (this.play('spawnWarn')) return; if (!this.ok('warn', 0.5)) return; this.tone(220, 0.3, 'square', 0.03, 1.2); }
    static gameOver() { if (this.play('gameOver')) return; [392, 330, 262, 196].forEach((f, i) => this.ok('go' + i, 0) && this.tone(f, 0.4, 'sawtooth', 0.07, 0.98, i * 0.22)); }
    static victory() { if (this.play('victory')) return; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.ok('vic' + i, 0) && this.tone(f, 0.3, 'square', 0.05, 1, i * 0.12)); }
    static bossRoar() { if (this.play('bossRoar')) return; if (!this.ok('roar', 1)) return; this.tone(70, 1.2, 'sawtooth', 0.2, 0.6); this.noise(1.0, 0.2, 400, 1, 'lowpass', 0, 0.3); }
    static eliteAlarm() { if (this.play('elite')) return; this.bossRoar(); }

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
