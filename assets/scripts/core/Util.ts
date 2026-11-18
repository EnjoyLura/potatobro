// Small math / random helpers shared across the game.

export const TAU = Math.PI * 2;

export function clamp(v: number, a: number, b: number) { return v < a ? a : (v > b ? b : v); }
export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
export function rand(a: number, b: number) { return a + Math.random() * (b - a); }
export function randInt(a: number, b: number) { return Math.floor(a + Math.random() * (b - a + 1)); }
export function chance(p: number) { return Math.random() < p; }
export function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
export function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
}
export function dist2(ax: number, ay: number, bx: number, by: number) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
export function angleDiff(a: number, b: number) {
    let d = b - a;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
}
export function weightedPick<T>(items: T[], weight: (t: T) => number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    let r = Math.random() * total;
    for (const it of items) {
        r -= Math.max(0, weight(it));
        if (r <= 0) return it;
    }
    return items[items.length - 1];
}
export function fmtNum(v: number) {
    if (Math.abs(v - Math.round(v)) < 0.01) return '' + Math.round(v);
    return v.toFixed(1);
}
export function signed(v: number, suffix = '') {
    const s = fmtNum(v);
    return (v > 0 ? '+' : '') + s + suffix;
}
export function easeOutBack(t: number) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

/** Uniform spatial hash for fast neighbour queries. */
export class SpatialGrid<T extends { x: number; y: number }> {
    cell: number;
    cells = new Map<number, T[]>();
    private pool: T[][] = [];
    constructor(cell: number) { this.cell = cell; }
    private key(cx: number, cy: number) { return (cx + 512) * 4096 + (cy + 512); }
    clear() {
        this.cells.forEach(arr => { arr.length = 0; this.pool.push(arr); });
        this.cells.clear();
    }
    insert(o: T) {
        const k = this.key(Math.floor(o.x / this.cell), Math.floor(o.y / this.cell));
        let arr = this.cells.get(k);
        if (!arr) { arr = this.pool.pop() || []; this.cells.set(k, arr); }
        arr.push(o);
    }
    query(x: number, y: number, r: number, out: T[]): T[] {
        out.length = 0;
        const c = this.cell;
        const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
        const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
        for (let cx = x0; cx <= x1; cx++) {
            for (let cy = y0; cy <= y1; cy++) {
                const arr = this.cells.get(this.key(cx, cy));
                if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
            }
        }
        return out;
    }
}
