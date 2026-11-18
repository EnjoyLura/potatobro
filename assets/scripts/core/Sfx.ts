// Tiny WebAudio synthesizer: all sound effects and the background loop are generated in code.

type Wave = OscillatorType;

export class Sfx {
    static ctx: AudioContext = null;
    static master: GainNode = null;
    static sfxGain: GainNode = null;
    static musicGain: GainNode = null;
    static noiseBuf: AudioBuffer = null;
    static sfxOn = true;
    static musicOn = true;
    private static last: { [k: string]: number } = {};
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
            this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
            this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxOn ? 0.55 : 0; this.sfxGain.connect(this.master);
            this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicOn ? 0.22 : 0; this.musicGain.connect(this.master);
            const len = this.ctx.sampleRate * 1;
            this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { this.ctx = null; }
    }

    static unlock() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    static setSfx(on: boolean) { this.sfxOn = on; if (this.sfxGain) this.sfxGain.gain.value = on ? 0.55 : 0; }
    static setMusic(on: boolean) { this.musicOn = on; if (this.musicGain) this.musicGain.gain.value = on ? 0.22 : 0; }

    private static ok(key: string, minGap: number) {
        if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return false;
        const t = this.ctx.currentTime;
        if (this.last[key] !== undefined && t - this.last[key] < minGap) return false;
        this.last[key] = t;
        return true;
    }

    private static tone(freq: number, dur: number, type: Wave, vol: number, slide = 0, delay = 0, dest?: AudioNode) {
        const c = this.ctx, t = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
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

    // ---------------------------------------------------------------- effects
    static shoot(kind = 0) {
        if (!this.ok('shoot' + kind, 0.045)) return;
        const p = 1 + (Math.random() - 0.5) * 0.15;
        if (kind === 0) { this.tone(880 * p, 0.07, 'square', 0.05, 0.4); this.noise(0.05, 0.05, 3000, 1, 'highpass'); }
        else if (kind === 1) { this.noise(0.18, 0.18, 1200, 0.7, 'lowpass', 0, 0.3); this.tone(160 * p, 0.12, 'square', 0.06, 0.5); }
        else if (kind === 2) { this.tone(1400 * p, 0.12, 'sawtooth', 0.05, 0.25); }
        else if (kind === 3) { this.noise(0.25, 0.08, 600, 1, 'bandpass', 0, 3); }
        else if (kind === 4) { this.tone(500 * p, 0.25, 'sawtooth', 0.06, 2.5); this.tone(1000 * p, 0.2, 'sine', 0.05, 2); }
        else if (kind === 5) { this.tone(1200 * p, 0.05, 'triangle', 0.05, 0.6); }
    }
    static swing() { if (!this.ok('swing', 0.06)) return; this.noise(0.12, 0.12, 900 + Math.random() * 300, 1.5, 'bandpass', 0, 2.2); }
    static hit() {
        if (!this.ok('hit', 0.035)) return;
        this.noise(0.06, 0.12, 2200, 1, 'lowpass', 0, 0.4);
        this.tone(220 + Math.random() * 60, 0.06, 'square', 0.035, 0.5);
    }
    static kill() {
        if (!this.ok('kill', 0.04)) return;
        const p = 1 + (Math.random() - 0.5) * 0.3;
        this.tone(340 * p, 0.12, 'sine', 0.09, 0.35);
        this.noise(0.1, 0.07, 1400, 1, 'lowpass', 0, 0.3);
    }
    private static pickCombo = 0; private static pickT = 0;
    static pickup() {
        if (!this.ok('pick', 0.03)) return;
        const t = this.ctx.currentTime;
        if (t - this.pickT > 0.4) this.pickCombo = 0;
        this.pickT = t;
        this.pickCombo = Math.min(this.pickCombo + 1, 14);
        this.tone(700 + this.pickCombo * 45, 0.07, 'sine', 0.06, 1.3);
    }
    static hurt() { if (!this.ok('hurt', 0.12)) return; this.tone(300, 0.25, 'sawtooth', 0.12, 0.3); this.noise(0.2, 0.12, 800, 1); }
    static dodge() { if (!this.ok('dodge', 0.1)) return; this.noise(0.12, 0.08, 3000, 2, 'highpass', 0, 0.5); }
    static explode() {
        if (!this.ok('explode', 0.07)) return;
        this.noise(0.5, 0.35, 900, 0.8, 'lowpass', 0, 0.12);
        this.tone(90, 0.4, 'sine', 0.2, 0.4);
    }
    static levelUp() {
        if (!this.ok('lvl', 0.2)) return;
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.05, 1, i * 0.07));
    }
    static buy() { if (!this.ok('buy', 0.05)) return; this.tone(1200, 0.08, 'square', 0.05, 1); this.tone(1800, 0.14, 'square', 0.05, 1, 0.06); }
    static deny() { if (!this.ok('deny', 0.1)) return; this.tone(180, 0.18, 'square', 0.06, 0.8); }
    static click() { if (!this.ok('click', 0.04)) return; this.tone(900, 0.04, 'triangle', 0.07, 0.7); }
    static reroll() { if (!this.ok('reroll', 0.05)) return; [600, 800, 1000].forEach((f, i) => this.tone(f, 0.05, 'triangle', 0.05, 1, i * 0.035)); }
    static heal() { if (!this.ok('heal', 0.08)) return; this.tone(660, 0.15, 'sine', 0.07, 1.5); this.tone(990, 0.15, 'sine', 0.05, 1.3, 0.05); }
    static waveStart() { if (!this.ok('ws', 0.3)) return; [392, 523, 659].forEach((f, i) => this.tone(f, 0.22, 'sawtooth', 0.045, 1, i * 0.1)); }
    static waveEnd() { if (!this.ok('we', 0.3)) return; [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.07, 1, i * 0.09)); }
    static spawnWarn() { if (!this.ok('warn', 0.5)) return; this.tone(220, 0.3, 'square', 0.03, 1.2); }
    static gameOver() { [392, 330, 262, 196].forEach((f, i) => this.ok('go' + i, 0) && this.tone(f, 0.4, 'sawtooth', 0.07, 0.98, i * 0.22)); }
    static victory() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.ok('vic' + i, 0) && this.tone(f, 0.3, 'square', 0.05, 1, i * 0.12)); }
    static bossRoar() { if (!this.ok('roar', 1)) return; this.tone(70, 1.2, 'sawtooth', 0.2, 0.6); this.noise(1.0, 0.2, 400, 1, 'lowpass', 0, 0.3); }
    static zap() { if (!this.ok('zap', 0.06)) return; this.noise(0.12, 0.1, 4000, 4, 'bandpass', 0, 0.5); this.tone(1600, 0.08, 'sawtooth', 0.04, 0.4); }
    static laser() { if (!this.ok('laser', 0.1)) return; this.tone(1800, 0.3, 'sawtooth', 0.06, 0.2); this.tone(900, 0.3, 'square', 0.04, 0.3); }

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
