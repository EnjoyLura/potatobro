// Audio: sampled sound effects (sfx/*.mp3, copied into the build from build-templates/web-mobile/sfx)
// played through WebAudio with pitch variation, voice limits and a bus compressor. Every effect has a small
// synth fallback so the game still has sound if a file fails to load. The background music is generated in code.

type Wave = OscillatorType;

interface SDef {
    files: string[];
    vol: number;      // loudness after normalization
    pv?: number;      // random pitch variation (+/-)
    max?: number;     // max seconds to play (longer files fade out)
    gap?: number;     // min seconds between two plays of this sound
    voices?: number;  // max simultaneous plays
}

const DEFS: { [k: string]: SDef } = {
    hit: { files: ['hit1', 'hit2', 'hit3'], vol: 0.5, pv: 0.12, max: 0.28, gap: 0.035, voices: 5 },
    crit: { files: ['crit'], vol: 0.62, pv: 0.08, max: 0.42, gap: 0.07, voices: 3 },
    kill: { files: ['kill1', 'kill2', 'kill3'], vol: 0.62, pv: 0.16, max: 0.42, gap: 0.03, voices: 6 },
    pistol: { files: ['shot_pistol'], vol: 0.36, pv: 0.08, max: 0.28, gap: 0.06, voices: 4 },
    smg: { files: ['shot_smg'], vol: 0.28, pv: 0.1, max: 0.18, gap: 0.05, voices: 4 },
    shotgun: { files: ['shot_shotgun'], vol: 0.55, pv: 0.06, max: 0.55, gap: 0.12, voices: 3 },
    sniper: { files: ['shot_sniper'], vol: 0.55, pv: 0.05, max: 0.55, gap: 0.1, voices: 3 },
    magic: { files: ['shot_magic'], vol: 0.4, pv: 0.1, max: 0.38, gap: 0.07, voices: 3 },
    sling: { files: ['shot_sling'], vol: 0.4, pv: 0.12, max: 0.25, gap: 0.06, voices: 3 },
    rocket: { files: ['shot_rocket'], vol: 0.48, pv: 0.06, max: 0.55, gap: 0.1, voices: 3 },
    flame: { files: ['flame'], vol: 0.3, pv: 0.1, max: 0.35, gap: 0.12, voices: 2 },
    turret: { files: ['turret'], vol: 0.26, pv: 0.12, max: 0.18, gap: 0.06, voices: 3 },
    swing: { files: ['swing1'], vol: 0.36, pv: 0.12, max: 0.28, gap: 0.06, voices: 4 },
    swingHeavy: { files: ['swing2'], vol: 0.44, pv: 0.08, max: 0.35, gap: 0.08, voices: 3 },
    stab: { files: ['stab'], vol: 0.36, pv: 0.12, max: 0.24, gap: 0.06, voices: 4 },
    explode: { files: ['explode1'], vol: 0.7, pv: 0.08, max: 0.85, gap: 0.08, voices: 4 },
    explodeSmall: { files: ['explode2'], vol: 0.55, pv: 0.1, max: 0.6, gap: 0.06, voices: 4 },
    zap: { files: ['zap'], vol: 0.42, pv: 0.1, max: 0.32, gap: 0.07, voices: 3 },
    laser: { files: ['laser'], vol: 0.42, pv: 0.06, max: 0.45, gap: 0.1, voices: 3 },
    spit: { files: ['enemy_spit'], vol: 0.3, pv: 0.15, max: 0.3, gap: 0.08, voices: 3 },
    hurt: { files: ['hurt'], vol: 0.72, pv: 0.06, max: 0.45, gap: 0.12, voices: 2 },
    dodge: { files: ['dodge'], vol: 0.45, pv: 0.1, max: 0.3, gap: 0.1, voices: 2 },
    shield: { files: ['shield'], vol: 0.5, pv: 0.06, max: 0.4, gap: 0.1, voices: 2 },
    pickup: { files: ['pickup'], vol: 0.34, pv: 0, max: 0.2, gap: 0.028, voices: 5 },
    heal: { files: ['heal'], vol: 0.5, pv: 0.05, max: 0.6, gap: 0.08, voices: 2 },
    crate: { files: ['crate'], vol: 0.55, pv: 0.04, max: 0.5, gap: 0.1, voices: 2 },
    mine: { files: ['mine'], vol: 0.3, pv: 0.08, max: 0.25, gap: 0.1, voices: 2 },
    levelUp: { files: ['levelup'], vol: 0.55, pv: 0, max: 1.0, gap: 0.25, voices: 2 },
    click: { files: ['ui_click'], vol: 0.45, pv: 0.05, max: 0.15, gap: 0.04, voices: 2 },
    buy: { files: ['ui_buy'], vol: 0.55, pv: 0.03, max: 0.5, gap: 0.05, voices: 2 },
    deny: { files: ['ui_deny'], vol: 0.45, pv: 0, max: 0.3, gap: 0.1, voices: 1 },
    reroll: { files: ['ui_reroll'], vol: 0.5, pv: 0.04, max: 0.5, gap: 0.05, voices: 2 },
    sell: { files: ['ui_sell'], vol: 0.5, pv: 0.04, max: 0.4, gap: 0.05, voices: 2 },
    combine: { files: ['ui_combine'], vol: 0.6, pv: 0, max: 0.8, gap: 0.1, voices: 1 },
    waveStart: { files: ['wave_start'], vol: 0.5, pv: 0, max: 1.0, gap: 0.3, voices: 1 },
    waveEnd: { files: ['wave_end'], vol: 0.55, pv: 0, max: 1.5, gap: 0.3, voices: 1 },
    victory: { files: ['victory'], vol: 0.6, pv: 0, max: 3.2, gap: 1, voices: 1 },
    gameOver: { files: ['gameover'], vol: 0.6, pv: 0, max: 2.6, gap: 1, voices: 1 },
    bossRoar: { files: ['boss_roar'], vol: 0.75, pv: 0, max: 2.0, gap: 1, voices: 1 },
    elite: { files: ['elite'], vol: 0.7, pv: 0, max: 1.2, gap: 1, voices: 1 },
    spawnWarn: { files: ['spawn_warn'], vol: 0.2, pv: 0.1, max: 0.35, gap: 0.25, voices: 2 },
    revive: { files: ['revive'], vol: 0.65, pv: 0, max: 1.2, gap: 0.5, voices: 1 },
};

interface Sample { buf: AudioBuffer; start: number; len: number; norm: number }

export class Sfx {
    static ctx: AudioContext = null;
    static master: GainNode = null;
    static sfxGain: GainNode = null;
    static musicGain: GainNode = null;
    static noiseBuf: AudioBuffer = null;
    static sfxOn = true;
    static musicOn = true;
    private static samples: { [file: string]: Sample } = {};
    private static active: { [k: string]: number } = {};
    private static rr: { [k: string]: number } = {};
    private static last: { [k: string]: number } = {};
    private static loading = false;
    private static musicTimer: any = null;
    private static step = 0;
    private static nextTime = 0;
    static intensity = 0; // 0 menu, 1 battle, 2 boss

    static init() {
        if (this.ctx) return;
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        try {
            this.ctx = new AC();
            this.master = this.ctx.createGain(); this.master.gain.value = 0.85; this.master.connect(this.ctx.destination);
            // the effects bus goes through a compressor: dense fights stay loud and punchy without clipping
            const comp = this.ctx.createDynamicsCompressor();
            comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5;
            comp.attack.value = 0.002; comp.release.value = 0.12;
            comp.connect(this.master);
            this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxOn ? 1 : 0; this.sfxGain.connect(comp);
            this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicOn ? 0.2 : 0; this.musicGain.connect(this.master);
            const len = this.ctx.sampleRate * 1;
            this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { this.ctx = null; }
    }

    /** Fetch and decode every sample. Safe to call before the first user gesture. */
    static load(base = 'sfx/') {
        this.init();
        if (!this.ctx || this.loading) return;
        this.loading = true;
        const files: string[] = [];
        for (const k in DEFS) for (const f of DEFS[k].files) if (files.indexOf(f) < 0) files.push(f);
        for (const f of files) {
            fetch(base + f + '.mp3')
                .then(r => { if (!r.ok) throw new Error('' + r.status); return r.arrayBuffer(); })
                .then(ab => new Promise<AudioBuffer>((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
                .then(buf => { this.samples[f] = this.analyse(buf); })
                .catch(() => { /* synth fallback stays in use */ });
        }
    }

    /** Trim leading silence and work out a loudness normalization factor. */
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
        // loudest 30 ms window RMS
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
    }
    private static unlocked = false;

    static setSfx(on: boolean) { this.sfxOn = on; if (this.sfxGain) this.sfxGain.gain.value = on ? 1 : 0; }
    static setMusic(on: boolean) { this.musicOn = on; if (this.musicGain) this.musicGain.gain.value = on ? 0.2 : 0; }

    private static ready() { return !!this.ctx && this.sfxOn && this.ctx.state === 'running'; }

    private static ok(key: string, minGap: number) {
        if (!this.ready()) return false;
        const t = this.ctx.currentTime;
        if (this.last[key] !== undefined && t - this.last[key] < minGap) return false;
        this.last[key] = t;
        return true;
    }

    /**
     * Play a sampled sound. Returns false when the sample is not loaded (caller falls back to synth)
     * and true otherwise, also when the play was skipped by the gap / voice limits.
     */
    private static play(key: string, volMul = 1, rate = 1, delay = 0): boolean {
        const def = DEFS[key];
        if (!def || !this.ctx) return false;
        const i = this.rr[key] = ((this.rr[key] || 0) + 1 + (def.files.length > 2 ? Math.floor(Math.random() * 2) : 0)) % def.files.length;
        const smp = this.samples[def.files[i]] || this.samples[def.files[0]];
        if (!smp) return false;
        if (!this.ready()) return true;
        const t0 = this.ctx.currentTime;
        if (def.gap && this.last[key] !== undefined && t0 - this.last[key] < def.gap) return true;
        if ((this.active[key] || 0) >= (def.voices || 4)) return true;
        this.last[key] = t0;
        const c = this.ctx, t = t0 + delay;
        const src = c.createBufferSource();
        src.buffer = smp.buf;
        const r = rate * (1 + (def.pv ? (Math.random() * 2 - 1) * def.pv : 0));
        src.playbackRate.value = r;
        const g = c.createGain();
        const vol = smp.norm * def.vol * volMul;
        const dur = Math.min(smp.len, def.max || smp.len) / r;
        g.gain.setValueAtTime(vol, t);
        if (dur < smp.len / r - 0.01) {
            // cut long tails with a short fade
            g.gain.setValueAtTime(vol, t + Math.max(0, dur - 0.06));
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
        }
        src.connect(g); g.connect(this.sfxGain);
        this.active[key] = (this.active[key] || 0) + 1;
        src.onended = () => { this.active[key] = Math.max(0, (this.active[key] || 1) - 1); };
        src.start(t, smp.start, dur + 0.02);
        return true;
    }

    private static tone(freq: number, dur: number, type: Wave, vol: number, slide = 0, delay = 0, dest?: AudioNode) {
        const c = this.ctx, t = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
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

    /** Short sine "thump" layered under impacts for low-end punch. */
    private static thump(f0: number, dur: number, vol: number, key: string, gap: number) {
        if (!this.ok(key, gap)) return;
        this.tone(f0, dur, 'sine', vol, 0.35);
    }

    // ---------------------------------------------------------------- weapons
    /** Shot sound per weapon id. */
    static shot(id: string) {
        switch (id) {
            case 'pistol': if (!this.play('pistol')) this.synthShot(0); break;
            case 'smg': if (!this.play('smg')) this.synthShot(0); break;
            case 'minigun': if (!this.play('smg', 0.9, 0.9)) this.synthShot(0); break;
            case 'shotgun': if (!this.play('shotgun')) this.synthShot(1); this.thump(120, 0.12, 0.25, 'th_gun', 0.1); break;
            case 'sniper': if (!this.play('sniper')) this.synthShot(2); this.thump(140, 0.1, 0.2, 'th_gun', 0.1); break;
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
        if (!this.ok('shoot' + kind, 0.045)) return;
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
        if (!this.ok('swing', 0.06)) return;
        this.noise(0.12, 0.12, 900 + Math.random() * 300, 1.5, 'bandpass', 0, 2.2);
    }
    static zap() { if (this.play('zap')) return; if (!this.ok('zap', 0.06)) return; this.noise(0.12, 0.1, 4000, 4, 'bandpass', 0, 0.5); this.tone(1600, 0.08, 'sawtooth', 0.04, 0.4); }
    static laser() { if (this.play('laser')) return; if (!this.ok('laser', 0.1)) return; this.tone(1800, 0.3, 'sawtooth', 0.06, 0.2); this.tone(900, 0.3, 'square', 0.04, 0.3); }
    static magic() { if (this.play('magic')) return; this.zap(); }

    // ---------------------------------------------------------------- impacts
    static hit(crit = false, heavy = false) {
        if (crit) {
            if (!this.play('crit')) { if (this.ok('crit', 0.06)) { this.noise(0.08, 0.18, 2600, 1, 'lowpass', 0, 0.4); this.tone(1500, 0.12, 'square', 0.04, 0.6); } }
            this.thump(150, 0.09, 0.22, 'th_hit', 0.06);
            return;
        }
        if (!this.play('hit', heavy ? 1.15 : 1, heavy ? 0.85 : 1)) {
            if (!this.ok('hit', 0.035)) return;
            this.noise(0.06, 0.12, 2200, 1, 'lowpass', 0, 0.4);
            this.tone(220 + Math.random() * 60, 0.06, 'square', 0.035, 0.5);
        }
        if (heavy) this.thump(110, 0.08, 0.18, 'th_hit', 0.06);
    }
    static kill(big = false) {
        if (!this.play('kill', big ? 1.2 : 1, big ? 0.8 : 1)) {
            if (this.ok('kill', 0.04)) {
                const p = 1 + (Math.random() - 0.5) * 0.3;
                this.tone(340 * p, 0.12, 'sine', 0.09, 0.35);
                this.noise(0.1, 0.07, 1400, 1, 'lowpass', 0, 0.3);
            }
        }
        // a little sub "pop" under every kill makes them feel chunky
        this.thump(big ? 90 : 130, big ? 0.16 : 0.07, big ? 0.3 : 0.14, 'th_kill', 0.05);
    }
    static explode(big = true) {
        if (!this.play(big ? 'explode' : 'explodeSmall')) {
            if (this.ok('explode', 0.07)) { this.noise(0.5, 0.35, 900, 0.8, 'lowpass', 0, 0.12); this.tone(90, 0.4, 'sine', 0.2, 0.4); }
        }
        this.thump(big ? 70 : 95, big ? 0.3 : 0.18, big ? 0.38 : 0.26, 'th_boom', 0.07);
    }
    static spit() { this.play('spit'); }

    // ---------------------------------------------------------------- player / pickups
    static hurt() { if (this.play('hurt')) { this.thump(90, 0.14, 0.25, 'th_hurt', 0.12); return; } if (!this.ok('hurt', 0.12)) return; this.tone(300, 0.25, 'sawtooth', 0.12, 0.3); this.noise(0.2, 0.12, 800, 1); }
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

    // ---------------------------------------------------------------- music: simple generative bass + drums
    static startMusic() {
        this.init();
        if (!this.ctx || this.musicTimer) return;
        this.nextTime = this.ctx.currentTime + 0.1;
        this.step = 0;
        this.musicTimer = setInterval(() => this.schedule(), 50);
    }
    private static schedule() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const bpm = this.intensity === 2 ? 150 : this.intensity === 1 ? 128 : 96;
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
        const prog = this.intensity === 2 ? [41.2, 43.65, 38.89, 36.71] : [55, 43.65, 49, 41.2];
        const root = prog[Math.floor(s / 16) % 4];
        const pos = s % 16;
        const delay = Math.max(0, t - c.currentTime);
        if (this.intensity === 0) {
            if (pos % 8 === 0) this.tone(root * 2, 0.5, 'triangle', 0.18, 1, delay, dest);
            if (pos % 4 === 2) this.tone(root * 4 * (pos === 6 ? 1.5 : 1.25), 0.25, 'sine', 0.06, 1, delay, dest);
            return;
        }
        // bass
        const bassPat = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1];
        if (bassPat[pos]) this.tone(root * (pos % 4 === 3 ? 2 : 1) * 2, 0.12, 'sawtooth', 0.12, 1, delay, dest);
        // kick
        if (pos % 4 === 0) { this.tone(110, 0.15, 'sine', 0.5, 0.35, delay, dest); }
        // snare
        if (pos === 4 || pos === 12) this.noise(0.12, 0.18, 1800, 0.8, 'bandpass', delay, 0, dest);
        // hats
        if (pos % 2 === 1) this.noise(0.03, 0.06, 7000, 1, 'highpass', delay, 0, dest);
        // arp
        if (this.intensity >= 1 && pos % 2 === 0) {
            const arp = [1, 1.5, 2, 1.5, 1.2, 1.5, 2, 3];
            this.tone(root * 4 * arp[(pos / 2) % 8], 0.08, 'square', 0.025, 1, delay, dest);
        }
    }
}
