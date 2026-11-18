// Persistent progress via localStorage (guarded).

export interface SaveData {
    sfx: boolean;       // legacy on/off (kept for old saves; volume 0 = off)
    music: boolean;
    sfxVol: number;     // 0..1
    musicVol: number;   // 0..1
    numbers: boolean;   // floating damage numbers
    bestWave: number;
    wins: { [charId: string]: number };   // highest danger cleared per character (-1 none)
    runs: number;
    kills: number;
    shake: boolean;
}

const KEY = 'core_rush_save_v1';

export class Save {
    static data: SaveData = { sfx: true, music: true, sfxVol: 1, musicVol: 1, numbers: true, bestWave: 0, wins: {}, runs: 0, kills: 0, shake: true };

    static load() {
        try {
            const s = localStorage.getItem(KEY);
            if (s) {
                const old = JSON.parse(s);
                Object.assign(this.data, old);
                // saves from before the volume sliders: an "off" switch becomes volume 0
                if (old.sfxVol === undefined && old.sfx === false) this.data.sfxVol = 0;
                if (old.musicVol === undefined && old.music === false) this.data.musicVol = 0;
            }
        } catch (e) { /* ignore */ }
    }
    static save() {
        try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    }
    static winLevel(charId: string) { const v = this.data.wins[charId]; return v === undefined ? -1 : v; }
}
