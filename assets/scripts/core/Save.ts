// Persistent progress via localStorage (guarded).

export interface SaveData {
    sfx: boolean;
    music: boolean;
    bestWave: number;
    wins: { [charId: string]: number };   // highest danger cleared per character (-1 none)
    runs: number;
    kills: number;
    shake: boolean;
}

const KEY = 'core_rush_save_v1';

export class Save {
    static data: SaveData = { sfx: true, music: true, bestWave: 0, wins: {}, runs: 0, kills: 0, shake: true };

    static load() {
        try {
            const s = localStorage.getItem(KEY);
            if (s) Object.assign(this.data, JSON.parse(s));
        } catch (e) { /* ignore */ }
    }
    static save() {
        try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    }
    static winLevel(charId: string) { const v = this.data.wins[charId]; return v === undefined ? -1 : v; }
}
