// Persistent progress via localStorage (guarded). Progress (not settings) is kept separable for a
// future cloud save (removed in V1.9 for the standalone release).
import { STAGES } from '../data/Stages';

export interface Codex {
    e: { [id: string]: number };   // enemies seen -> kills
    w: { [id: string]: number };   // weapons seen
    i: { [id: string]: number };   // items seen
}

export interface SaveData {
    // ---- settings (stay on this device)
    sfx: boolean;       // legacy on/off (kept for old saves; volume 0 = off)
    music: boolean;
    sfxVol: number;     // 0..1
    musicVol: number;   // 0..1
    numbers: boolean;   // floating damage numbers
    shake: boolean;
    // ---- progress (synced)
    bestWave: number;
    wins: { [charId: string]: number };   // highest difficulty cleared per character (-1 none)
    stages: { [stageId: string]: number }; // highest difficulty cleared per stage (-1 none)
    endless: { [stageId: string]: number }; // best wave reached in endless mode per stage
    runs: number;
    kills: number;
    playTime: number;   // seconds in battle
    codex: Codex;
    savedAt: number;    // ms, when progress last changed
}

/** The part of the save that is synced to the cloud. */
export type Progress = Pick<SaveData, 'bestWave' | 'wins' | 'stages' | 'endless' | 'runs' | 'kills' | 'playTime' | 'codex' | 'savedAt'>;
const PROGRESS_KEYS: (keyof Progress)[] = ['bestWave', 'wins', 'stages', 'endless', 'runs', 'kills', 'playTime', 'codex', 'savedAt'];

const KEY = 'core_rush_save_v1';

/** JSON with sorted object keys (two devices may have added codex entries in a different order). */
function stableJson(v: any): string {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(stableJson).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableJson(v[k])).join(',') + '}';
}

export class Save {
    static data: SaveData = {
        sfx: true, music: true, sfxVol: 1, musicVol: 1, numbers: true, shake: true,
        bestWave: 0, wins: {}, stages: {}, endless: {}, runs: 0, kills: 0, playTime: 0, codex: { e: {}, w: {}, i: {} }, savedAt: 0,
    };
    private static lastProgress = '';
    /** Called after every save (cloud sync hook). */
    static onSaved: (() => void) | null = null;

    static load() {
        try {
            const s = localStorage.getItem(KEY);
            if (s) {
                const old = JSON.parse(s);
                Object.assign(this.data, old);
                // saves from before the volume sliders: an "off" switch becomes volume 0
                if (old.sfxVol === undefined && old.sfx === false) this.data.sfxVol = 0;
                if (old.musicVol === undefined && old.music === false) this.data.musicVol = 0;
                // saves from before stages: any win counts as clearing the first stage
                if (!old.stages) {
                    let best = -1;
                    for (const k in this.data.wins) best = Math.max(best, this.data.wins[k]);
                    this.data.stages = best >= 0 ? { hive: best } : {};
                }
                const cx = this.data.codex || ({} as Codex);
                this.data.codex = { e: cx.e || {}, w: cx.w || {}, i: cx.i || {} };
                this.data.endless = this.data.endless || {};
                // saves from before the codex: count the first stage's enemies up to the best wave as seen
                if (!old.codex && this.data.bestWave > 0) {
                    const hive = STAGES[0];
                    for (const r of hive.rules) if (r.from <= this.data.bestWave) this.seeEnemy(r.type);
                    if (this.data.bestWave >= 1) { this.seeEnemy('tree'); this.seeEnemy('mini'); }
                    if (this.data.bestWave >= 2) this.seeEnemy('looter');
                    if (this.data.bestWave >= 10) this.seeEnemy(hive.jugg);
                    if (this.data.bestWave >= 15) this.seeEnemy(hive.queen);
                    if (this.data.bestWave >= 20) this.seeEnemy(hive.boss);
                }
                if (!this.data.savedAt && this.data.runs > 0) this.data.savedAt = Date.now();
            }
        } catch (e) { /* ignore */ }
        this.lastProgress = this.progressKey(this.data);
    }

    static save() {
        const pk = this.progressKey(this.data);
        if (pk !== this.lastProgress) { this.lastProgress = pk; this.data.savedAt = Date.now(); }
        try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
        if (this.onSaved) this.onSaved();
    }

    static winLevel(charId: string) { const v = this.data.wins[charId]; return v === undefined ? -1 : v; }
    static stageLevel(stageId: string) { const v = this.data.stages[stageId]; return v === undefined ? -1 : v; }

    // ---- progress <-> cloud
    static progress(d: SaveData | Progress = this.data): Progress {
        const out: any = {};
        for (const k of PROGRESS_KEYS) out[k] = JSON.parse(JSON.stringify((d as any)[k]));
        return out;
    }
    /** Progress content without the timestamp, for "are these two saves the same" checks. */
    static progressKey(d: SaveData | Progress): string {
        const p: any = {};
        for (const k of PROGRESS_KEYS) if (k !== 'savedAt') p[k] = (d as any)[k];
        return stableJson(p);
    }
    static hasProgress(d: SaveData | Progress = this.data) { return d.runs > 0 || d.bestWave > 0; }
    /** Replace progress with a cloud copy (settings stay). */
    static applyProgress(p: Progress) {
        for (const k of PROGRESS_KEYS) (this.data as any)[k] = JSON.parse(JSON.stringify((p as any)[k]));
        const cx = this.data.codex || ({} as Codex);
        this.data.codex = { e: cx.e || {}, w: cx.w || {}, i: cx.i || {} };
        this.data.stages = this.data.stages || {};
        this.data.endless = this.data.endless || {};
        this.lastProgress = this.progressKey(this.data);
        try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    }

    // ---- codex
    static seeEnemy(id: string) { const e = this.data.codex.e; if (e[id] === undefined) e[id] = 0; }
    static killEnemy(id: string) { const e = this.data.codex.e; e[id] = (e[id] || 0) + 1; }
    static seeWeapon(id: string) { this.data.codex.w[id] = 1; }
    static seeItem(id: string) { this.data.codex.i[id] = 1; }
}
