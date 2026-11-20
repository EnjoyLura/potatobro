// Procedural art: every sprite in the game is drawn here with Canvas2D.
// Style: chunky cartoon shapes with thick dark outlines.
import { Atlas } from './Atlas';
import { CHARACTERS, CharDef } from '../data/Characters';
import { TAU } from './Util';
import { ENEMIES, EnemyArt } from '../data/Enemies';
import { ArenaTheme } from '../data/Stages';

const OUT = '#231a26';
type C2D = CanvasRenderingContext2D;

// ---------------------------------------------------------------- helpers
function shade(hex: string, amt: number): string {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    const h = (v: number) => ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2);
    return '#' + h(r) + h(g) + h(b);
}
function ell(ctx: C2D, x: number, y: number, rx: number, ry: number, fill?: string, stroke?: string, lw = 3, rot = 0) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function circ(ctx: C2D, x: number, y: number, r: number, fill?: string, stroke?: string, lw = 3) { ell(ctx, x, y, r, r, fill, stroke, lw); }
function rr(ctx: C2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function rrFill(ctx: C2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUT, lw = 3) {
    rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function poly(ctx: C2D, pts: number[], fill?: string, stroke = OUT, lw = 3) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function line(ctx: C2D, x1: number, y1: number, x2: number, y2: number, color = OUT, lw = 3) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke();
}
function shadow(ctx: C2D, x: number, y: number, rx: number, ry: number, sil: boolean) {
    if (sil) return;
    ell(ctx, x, y, rx, ry, 'rgba(0,0,0,0.28)');
}
/** Plain cartoon eye (the core-bot and friendly things). */
function botEye(ctx: C2D, x: number, y: number, r: number, px = 0.25, py = 0.1, pupil = 0.5) {
    circ(ctx, x, y, r, '#ffffff', OUT, Math.max(1.5, r * 0.28));
    circ(ctx, x + r * px, y + r * py, r * pupil, OUT);
    circ(ctx, x + r * px - r * 0.18, y + r * py - r * 0.2, r * 0.16, '#ffffff');
}
/** Center x of the monster being drawn: eyes left of it slant down toward the middle (angry). */
let EYE_CX = -1;
/** Monster eye: dark almond socket with a hot glowing yellow iris and an angry slanted lid. */
function eye(ctx: C2D, x: number, y: number, r: number, px = 0.25, _py = 0.1, _pupil = 0.5) {
    const side = EYE_CX < 0 || Math.abs(x - EYE_CX) < r * 0.6 ? 0 : (x < EYE_CX ? -1 : 1);
    const d = side === 1 ? -1 : 1;           // direction from the outer corner to the inner corner
    const path = (s: number) => {
        const ox = (u: number) => x + u * r * s, oy = (v: number) => y + 0.12 * r + (v - 0.12) * r * s;
        ctx.beginPath();
        if (side === 0) {
            ctx.moveTo(ox(-1.05), oy(-0.3)); ctx.quadraticCurveTo(ox(0), oy(-0.6), ox(1.05), oy(-0.3));
            ctx.bezierCurveTo(ox(1.05), oy(1.05), ox(-1.05), oy(1.05), ox(-1.05), oy(-0.3));
        } else {
            ctx.moveTo(ox(-1.1 * d), oy(-0.62)); ctx.lineTo(ox(1.05 * d), oy(0.1));
            ctx.bezierCurveTo(ox(0.9 * d), oy(0.95), ox(-1.15 * d), oy(0.85), ox(-1.1 * d), oy(-0.62));
        }
        ctx.closePath();
    };
    // soft glow around the eye
    const g = ctx.createRadialGradient(x, y + r * 0.2, r * 0.2, x, y + r * 0.2, r * 1.9);
    g.addColorStop(0, 'rgba(255,214,70,0.55)'); g.addColorStop(1, 'rgba(255,170,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 1.9, 0, TAU); ctx.fill();
    path(1.12); ctx.fillStyle = OUT; ctx.fill();
    path(0.78); ctx.fillStyle = '#ffc928'; ctx.fill();
    path(0.48); ctx.fillStyle = '#fff4b0'; ctx.fill();
    if (r >= 4.5) ell(ctx, x + px * r * 0.45 + d * r * 0.1, y + r * 0.28, r * 0.13, r * 0.36, OUT);
}
function highlight(ctx: C2D, x: number, y: number, rx: number, ry: number, a = 0.35) {
    ell(ctx, x, y, rx, ry, `rgba(255,255,255,${a})`, undefined, 0, -0.5);
}

// ---------------------------------------------------------------- core / weapon palette (from the key art)
const CORE = '#3ef0ff';                       // core energy
const STEEL = '#9199b0', STEEL_D = '#5d6480', STEEL_L = '#c9cfdd', GUNMETAL = '#474d63';
const GOLD = '#f7a823', GOLD_D = '#c4680f';
/** Glowing energy dot with a halo. */
function energy(ctx: C2D, x: number, y: number, r: number, col = CORE, halo = 2.2) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * halo);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * halo, 0, TAU); ctx.fill(); ctx.restore();
    circ(ctx, x, y, r, col, OUT, Math.max(1.2, r * 0.35));
    circ(ctx, x - r * 0.25, y - r * 0.25, r * 0.38, '#ffffff');
}
/** Glowing energy cell (a rounded slot of light). */
function cell(ctx: C2D, x: number, y: number, w: number, h: number, col = CORE) {
    rrFill(ctx, x, y, w, h, Math.min(w, h) / 2, col, OUT, 1.6);
    rrFill(ctx, x + 1.2, y + 1.2, Math.max(0.5, w - 2.4), Math.max(0.5, h * 0.35), Math.min(w, h) / 4, 'rgba(255,255,255,0.75)', '');
}

// ---------------------------------------------------------------- characters
function drawCharacter(ctx: C2D, c: CharDef, w: number, h: number, sil: boolean) {
    const cx = w / 2, cy = h * 0.56, r = 21;
    shadow(ctx, cx, h - 7, 18, 5, sil);
    // core-bot chassis (key art): round shell, gunmetal limbs, glowing core in a steel ring
    const core = c.accent;
    // mech feet
    for (const s of [-1, 1]) {
        rrFill(ctx, cx + s * 9 - 6.5, cy + r - 6, 13, 9, 4, STEEL_D, OUT, 2.5);
        rrFill(ctx, cx + s * 9 - 4.5, cy + r - 5, 9, 3, 1.5, STEEL_L, '');
    }
    // stubby mech arms
    for (const s of [-1, 1]) {
        ell(ctx, cx + s * (r + 1), cy + 5, 5.5, 8, STEEL, OUT, 2.5, s * -0.35);
        circ(ctx, cx + s * (r + 3), cy + 12, 4.2, STEEL_D, OUT, 2.2);
    }
    // accessory behind
    if (c.accessory === 'fins') {
        poly(ctx, [cx - r + 2, cy, cx - r - 10, cy - 10, cx - r - 6, cy + 8], c.accent);
        poly(ctx, [cx + r - 2, cy, cx + r + 10, cy - 10, cx + r + 6, cy + 8], c.accent);
    }
    if (c.accessory === 'plates') {
        rrFill(ctx, cx - r - 6, cy - 6, 10, 18, 3, c.accent);
        rrFill(ctx, cx + r - 4, cy - 6, 10, 18, 3, c.accent);
    }
    // body
    circ(ctx, cx, cy, r, c.color, OUT, 3.5);
    // lower shade
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, 0, TAU); ctx.clip();
    ell(ctx, cx + 4, cy + 14, r, 10, shade(c.color, -0.18));
    ctx.restore();
    // shell panel seams
    if (!sil) {
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, 0, TAU); ctx.clip();
        ctx.strokeStyle = 'rgba(60,55,80,0.28)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy + 9, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r, cy + 4); ctx.lineTo(cx - 13, cy + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + r, cy + 4); ctx.lineTo(cx + 13, cy + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy - 14); ctx.stroke();
        ctx.restore();
    }
    highlight(ctx, cx - 8, cy - 10, 7, 4, 0.5);
    // face
    if (c.accessory === 'visor') {
        rrFill(ctx, cx - 15, cy - 11, 30, 11, 5, '#1d2b36', OUT, 2.5);
        rrFill(ctx, cx - 11, cy - 8, 8, 5, 2, core, undefined);
        rrFill(ctx, cx + 3, cy - 8, 8, 5, 2, core, undefined);
    } else {
        // big determined eyes with a slanted lid
        for (const s of [-1, 1]) {
            ell(ctx, cx + s * 7.5, cy - 5, 6, 6.6, '#ffffff', OUT, 2.2);
            circ(ctx, cx + s * 6.2, cy - 3.6, 3.3, OUT);
            circ(ctx, cx + s * 6.2 - 1.1, cy - 4.9, 1.1, '#ffffff');
            poly(ctx, [cx + s * 14.5, cy - 13.5, cx + s * 0.8, cy - 13.5, cx + s * 0.8, cy - 6.2, cx + s * 14.5, cy - 10.6], c.color, '');
            line(ctx, cx + s * 13.8, cy - 10.6, cx + s * 1.6, cy - 6.6, OUT, 2.6);
        }
    }
    // core in a steel ring where a mouth would be
    if (!sil) {
        const g = ctx.createRadialGradient(cx, cy + 9, 1, cx, cy + 9, 13);
        g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.35, core); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + 9, 13, 0, TAU); ctx.fill(); ctx.restore();
    }
    circ(ctx, cx, cy + 9, 7.6, STEEL, OUT, 2.4);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; line(ctx, cx + Math.cos(a) * 5.2, cy + 9 + Math.sin(a) * 5.2, cx + Math.cos(a) * 7.4, cy + 9 + Math.sin(a) * 7.4, STEEL_D, 1.4); }
    circ(ctx, cx, cy + 9, 4.6, core, OUT, 1.6);
    circ(ctx, cx, cy + 9, 2.4, '#e9feff');
    circ(ctx, cx - 1.6, cy + 7.4, 1, '#ffffff');
    // accessory on top
    switch (c.accessory) {
        case 'antenna':
            rrFill(ctx, cx - 3, cy - r - 3, 6, 5, 1.5, STEEL, OUT, 2);
            line(ctx, cx, cy - r - 3, cx, cy - r - 10, OUT, 2.5);
            if (sil) circ(ctx, cx, cy - r - 13, 4.5, core, OUT, 2);
            else energy(ctx, cx, cy - r - 13, 4.5, core);
            break;
        case 'band':
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, TAU); ctx.clip();
            ctx.fillStyle = c.accent; ctx.fillRect(cx - r, cy - 17, r * 2, 6); ctx.restore();
            poly(ctx, [cx + r - 3, cy - 15, cx + r + 9, cy - 20, cx + r + 7, cy - 10], c.accent, OUT, 2);
            break;
        case 'hat':
            poly(ctx, [cx - 17, cy - r + 6, cx + 17, cy - r + 6, cx + 4, cy - r - 22], c.accent);
            ell(ctx, cx, cy - r + 6, 20, 4.5, shade(c.accent, -0.2), OUT, 2.5);
            circ(ctx, cx + 4, cy - r - 22, 3, '#ffd166', OUT, 1.5);
            break;
        case 'helmet':
            ctx.beginPath(); ctx.arc(cx, cy - 11, r - 1, Math.PI, 0); ctx.closePath();
            ctx.fillStyle = c.accent; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
            rrFill(ctx, cx - r - 3, cy - 14, r * 2 + 6, 5, 2.5, shade(c.accent, -0.15), OUT, 2.5);
            rrFill(ctx, cx - 3, cy - r - 10, 6, 11, 2, shade(c.accent, 0.2), OUT, 2);
            break;
        case 'clover': {
            line(ctx, cx, cy - r, cx, cy - r - 8, '#2d6a2d', 2.5);
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2 + Math.PI / 4;
                circ(ctx, cx + Math.cos(a) * 5, cy - r - 10 + Math.sin(a) * 5, 4.2, '#5fd35f', OUT, 1.8);
            }
            break;
        }
        case 'plates':
            ctx.beginPath(); ctx.arc(cx, cy - 4, r + 1, Math.PI, 0); ctx.closePath();
            ctx.fillStyle = c.accent; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
            rrFill(ctx, cx - 14, cy - 12, 28, 8, 3, '#1d2b36', OUT, 2);
            circ(ctx, cx - 6, cy - 8, 2.2, '#ff5c5c'); circ(ctx, cx + 6, cy - 8, 2.2, '#ff5c5c');
            break;
        case 'straw':
            ell(ctx, cx, cy - r + 5, 27, 6, '#e8c872', OUT, 2.5);
            ctx.beginPath(); ctx.arc(cx, cy - r + 4, 13, Math.PI, 0); ctx.closePath();
            ctx.fillStyle = '#f2d98a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
            ctx.fillStyle = c.accent; ctx.fillRect(cx - 13, cy - r + 1, 26, 3);
            break;
        case 'fins':
            poly(ctx, [cx - 5, cy - r + 2, cx + 2, cy - r - 13, cx + 7, cy - r + 3], c.accent, OUT, 2.5);
            break;
        case 'crown':
            poly(ctx, [cx - 12, cy - r + 4, cx - 13, cy - r - 9, cx - 6, cy - r - 2, cx, cy - r - 12, cx + 6, cy - r - 2, cx + 13, cy - r - 9, cx + 12, cy - r + 4], '#ffd166', OUT, 2.5);
            circ(ctx, cx, cy - r - 3, 2.5, c.accent);
            break;
    }
}

// ---------------------------------------------------------------- enemies
function alienBody(ctx: C2D, cx: number, cy: number, rx: number, ry: number, col: string, lw = 3.5) {
    // slightly pear shaped blob
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy + ry * 0.2);
    ctx.bezierCurveTo(cx - rx, cy - ry * 1.1, cx + rx, cy - ry * 1.1, cx + rx, cy + ry * 0.2);
    ctx.bezierCurveTo(cx + rx, cy + ry * 1.05, cx - rx, cy + ry * 1.05, cx - rx, cy + ry * 0.2);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
}
function spots(ctx: C2D, cx: number, cy: number, col: string, list: number[]) {
    for (let i = 0; i < list.length; i += 3) circ(ctx, cx + list[i], cy + list[i + 1], list[i + 2], col);
}
function teeth(ctx: C2D, x: number, y: number, w: number, h: number) {
    rrFill(ctx, x - w / 2, y - h / 2, w, h, h / 2, '#3a1530', OUT, 2);
    ctx.fillStyle = '#ffffff';
    const n = Math.max(2, Math.floor(w / 5));
    for (let i = 0; i < n; i++) {
        const tx = x - w / 2 + 2 + i * ((w - 4) / n);
        ctx.beginPath(); ctx.moveTo(tx, y - h / 2 + 1); ctx.lineTo(tx + (w - 4) / n, y - h / 2 + 1); ctx.lineTo(tx + (w - 4) / n / 2, y); ctx.closePath(); ctx.fill();
    }
}
/** Pair of little demon horns rising from y (key-art monsters all have them). */
function horns(ctx: C2D, cx: number, y: number, spread: number, len: number, col = '#2e1a4a', lw = 2.5) {
    for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * spread * 0.45, y + len * 0.3);
        ctx.quadraticCurveTo(cx + s * spread * 0.8, y - len * 0.2, cx + s * spread * 1.25, y - len);
        ctx.quadraticCurveTo(cx + s * spread * 1.15, y - len * 0.1, cx + s * spread * 1.0, y + len * 0.4);
        ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.stroke();
    }
}
/** Soft rim light along the upper edge of a dark body (keeps dark monsters readable on the floor). */
function rim(ctx: C2D, cx: number, cy: number, rx: number, ry: number, col: string) {
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, rx * 0.12);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.78, ry * 0.78, 0, Math.PI * 1.12, Math.PI * 1.6); ctx.stroke(); ctx.restore();
}

const ENEMY_DRAW: { [k: string]: { w: number; h: number; d: (ctx: C2D, w: number, h: number, sil: boolean) => void } } = {
    // shadow-demon swarm (key art): dark violet bodies, little horns, glowing yellow eyes
    e_grub: {
        w: 60, h: 60, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.57;
            shadow(ctx, cx, h - 7, 20, 5, sil);
            horns(ctx, cx, cy - 15, 11, 12);
            alienBody(ctx, cx, cy, 21, 18, '#6b35b0');
            spots(ctx, cx, cy, '#552591', [-12, 8, 3, 13, 6, 2.5, 8, 12, 2]);
            rim(ctx, cx, cy, 21, 18, 'rgba(200,160,255,0.45)');
            eye(ctx, cx - 8, cy - 4, 5.5, 0.2);
            eye(ctx, cx + 8, cy - 4, 5.5, -0.2);
            teeth(ctx, cx, cy + 8, 14, 6);
            for (const s of [-1, 1]) poly(ctx, [cx + s * 10, cy + 15, cx + s * 16, cy + 19, cx + s * 12, cy + 19, cx + s * 14, cy + 21, cx + s * 7, cy + 19], '#3a1d63', OUT, 2);
        }
    },
    e_runner: {
        w: 50, h: 50, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.56;
            shadow(ctx, cx, h - 6, 15, 4, sil);
            const pts: number[] = [];
            for (let i = 0; i < 14; i++) {
                const a = i / 14 * TAU, rr2 = i % 2 === 0 ? 19 : 14;
                pts.push(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * 0.9);
            }
            poly(ctx, pts, '#9b3fd6', OUT, 3);
            rim(ctx, cx, cy, 15, 13, 'rgba(240,190,255,0.5)');
            eye(ctx, cx - 6, cy - 2, 4.8, 0.2);
            eye(ctx, cx + 6, cy - 2, 4.8, -0.2);
            line(ctx, cx - 4, cy + 7, cx + 4, cy + 7, OUT, 2.5);
        }
    },
    e_spitter: {
        w: 62, h: 62, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.57;
            shadow(ctx, cx, h - 7, 20, 5, sil);
            horns(ctx, cx, cy - 16, 10, 10, '#241540');
            alienBody(ctx, cx, cy, 20, 19, '#4d3aa6');
            spots(ctx, cx, cy, '#3b2b88', [-11, -8, 3, 12, -4, 2.5, -8, 10, 2.5]);
            rim(ctx, cx, cy, 20, 19, 'rgba(180,170,255,0.45)');
            eye(ctx, cx - 7, cy - 6, 5, 0.2);
            eye(ctx, cx + 7, cy - 6, 5, -0.2);
            // acid tube mouth
            rrFill(ctx, cx - 5, cy + 2, 10, 13, 4, '#3b2b88', OUT, 2.5);
            ell(ctx, cx, cy + 14, 5, 3, '#9cff5a', OUT, 2);
            if (!sil) circ(ctx, cx, cy + 14, 2, '#eaffc8');
        }
    },
    e_charger: {
        w: 66, h: 62, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.57;
            shadow(ctx, cx, h - 7, 22, 5, sil);
            poly(ctx, [cx - 14, cy - 12, cx - 27, cy - 27, cx - 20, cy - 8], '#f1dcc0', OUT, 2.5);
            poly(ctx, [cx + 14, cy - 12, cx + 27, cy - 27, cx + 20, cy - 8], '#f1dcc0', OUT, 2.5);
            alienBody(ctx, cx, cy, 23, 19, '#7d2f9e');
            spots(ctx, cx, cy, '#62227f', [-13, 6, 3, 14, 4, 3]);
            rim(ctx, cx, cy, 23, 19, 'rgba(240,170,255,0.45)');
            eye(ctx, cx - 9, cy - 4, 5.5, 0.25);
            eye(ctx, cx + 9, cy - 4, 5.5, -0.25);
            teeth(ctx, cx, cy + 9, 16, 6);
        }
    },
    e_splitter: {
        w: 64, h: 64, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.54;
            shadow(ctx, cx, h - 6, 22, 5, sil);
            horns(ctx, cx, cy - 19, 12, 9, '#1f2160');
            circ(ctx, cx, cy, 24, '#4552c9', OUT, 3.5);
            // glowing energy crack
            ctx.beginPath(); ctx.moveTo(cx, cy - 24); ctx.lineTo(cx - 3, cy - 12); ctx.lineTo(cx + 3, cy - 2); ctx.lineTo(cx - 2, cy + 10); ctx.lineTo(cx + 1, cy + 24);
            ctx.lineWidth = 4; ctx.strokeStyle = '#1d2470'; ctx.stroke();
            if (!sil) { ctx.lineWidth = 1.6; ctx.strokeStyle = '#8ff6ff'; ctx.stroke(); }
            rim(ctx, cx, cy, 24, 24, 'rgba(170,190,255,0.5)');
            eye(ctx, cx - 10, cy - 2, 5.5, 0.2);
            eye(ctx, cx + 10, cy - 2, 5.5, -0.2);
            teeth(ctx, cx, cy + 11, 12, 5);
        }
    },
    e_mini: {
        w: 38, h: 38, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.55;
            shadow(ctx, cx, h - 5, 12, 3.5, sil);
            horns(ctx, cx, cy - 10, 7, 6, '#2a2f78', 2);
            circ(ctx, cx, cy, 13, '#7480ea', OUT, 3);
            rim(ctx, cx, cy, 13, 13, 'rgba(210,220,255,0.55)');
            eye(ctx, cx - 4.5, cy - 1, 3.8, 0.2);
            eye(ctx, cx + 4.5, cy - 1, 3.8, -0.2);
        }
    },
    e_brute: {
        w: 92, h: 88, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.58;
            shadow(ctx, cx, h - 8, 34, 7, sil);
            // legs
            for (const s of [-1, 1]) {
                ell(ctx, cx + s * 24, cy + 26, 9, 6, '#2c1d47', OUT, 3);
            }
            horns(ctx, cx, cy - 26, 20, 16, '#e9d6bd', 3);
            alienBody(ctx, cx, cy, 36, 31, '#3f2a6b', 4);
            // shell plates
            ctx.save(); alienBody(ctx, cx, cy, 36, 31, '#3f2a6b', 4); ctx.clip();
            ctx.beginPath(); ctx.arc(cx, cy - 40, 52, 0, Math.PI); ctx.fillStyle = '#5b3f94'; ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
            line(ctx, cx - 18, cy - 30, cx - 22, cy + 6, OUT, 2.5);
            line(ctx, cx + 18, cy - 30, cx + 22, cy + 6, OUT, 2.5);
            ctx.restore();
            alienBody(ctx, cx, cy, 36, 31, 'rgba(0,0,0,0)', 4);
            eye(ctx, cx - 11, cy + 4, 6.5, 0.2);
            eye(ctx, cx + 11, cy + 4, 6.5, -0.2);
            teeth(ctx, cx, cy + 18, 22, 8);
        }
    },
    e_hatcher: {
        w: 80, h: 80, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.55;
            shadow(ctx, cx, h - 8, 28, 6, sil);
            horns(ctx, cx, cy - 22, 16, 12, '#3d1640', 3);
            alienBody(ctx, cx, cy, 30, 28, '#8c2f86', 4);
            spots(ctx, cx, cy, '#f39be6', [-14, -10, 6, 12, -14, 5, 15, 6, 6, -6, 14, 5, -18, 8, 4]);
            spots(ctx, cx, cy, '#ffe0f8', [-14, -10, 3, 12, -14, 2.5, 15, 6, 3, -6, 14, 2.5]);
            rim(ctx, cx, cy, 30, 28, 'rgba(255,180,240,0.4)');
            eye(ctx, cx - 3, cy - 2, 5, 0.2, 0.2);
            eye(ctx, cx + 7, cy - 4, 4, 0.2, 0.2);
            teeth(ctx, cx + 2, cy + 10, 14, 6);
        }
    },
    e_bomber: {
        w: 56, h: 60, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.58;
            shadow(ctx, cx, h - 6, 18, 5, sil);
            ctx.beginPath(); ctx.moveTo(cx + 6, cy - 18); ctx.quadraticCurveTo(cx + 14, cy - 28, cx + 8, cy - 32); ctx.lineWidth = 3; ctx.strokeStyle = '#6d4c41'; ctx.stroke();
            if (!sil) { circ(ctx, cx + 8, cy - 33, 4, '#ffd166'); circ(ctx, cx + 8, cy - 33, 2, '#ffffff'); }
            horns(ctx, cx - 3, cy - 15, 10, 8, '#4a1010', 2.2);
            circ(ctx, cx, cy, 20, '#d93a2b', OUT, 3.5);
            highlight(ctx, cx - 7, cy - 8, 5, 3, 0.4);
            eye(ctx, cx - 7, cy - 1, 5, 0.2);
            eye(ctx, cx + 7, cy - 1, 5, -0.2);
            ctx.beginPath(); ctx.arc(cx, cy + 12, 5, Math.PI + 0.3, -0.3); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
        }
    },
    e_looter: {
        w: 62, h: 62, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.56;
            shadow(ctx, cx, h - 7, 20, 5, sil);
            // sack on back
            circ(ctx, cx + 12, cy - 6, 13, '#a1887f', OUT, 3);
            poly(ctx, [cx + 9, cy - 16, cx + 12, cy - 27, cx + 15, cy - 16], '#7ff6ff', OUT, 2);
            poly(ctx, [cx + 14, cy - 15, cx + 19, cy - 23, cx + 19, cy - 13], '#3ee0f5', OUT, 2);
            line(ctx, cx + 6, cy - 16, cx + 18, cy - 16, OUT, 3);
            alienBody(ctx, cx - 3, cy + 2, 18, 17, '#ffca28');
            highlight(ctx, cx - 10, cy - 6, 5, 3, 0.45);
            botEye(ctx, cx - 9, cy, 4.5, -0.3, 0.1);
            botEye(ctx, cx + 1, cy, 4.5, -0.3, 0.1);
            ctx.beginPath(); ctx.arc(cx - 4, cy + 9, 3, 0, Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
            if (!sil) { ctx.fillStyle = '#fff59d'; ctx.font = 'bold 9px Arial'; ctx.fillText('✦', cx + 8, cy - 2); }
        }
    },
    e_tree: {
        w: 72, h: 88, d: (ctx, w, h, sil) => {
            const cx = w / 2;
            shadow(ctx, cx, h - 7, 24, 6, sil);
            poly(ctx, [cx - 16, h - 8, cx - 10, h - 36, cx + 9, h - 38, cx + 16, h - 8], '#4a4466', OUT, 3);
            poly(ctx, [cx, 6, cx + 26, h - 38, cx - 26, h - 38], '#26c6da', OUT, 3.5);
            poly(ctx, [cx - 13, 22, cx + 2, 6, cx + 4, h - 40, cx - 18, h - 40], '#4dd0e1', undefined);
            poly(ctx, [cx, 6, cx + 26, h - 38, cx - 26, h - 38], undefined, OUT, 3.5);
            circ(ctx, cx + 8, h - 52, 5, '#ff80ab', OUT, 2);
            circ(ctx, cx - 9, h - 44, 5, '#ff80ab', OUT, 2);
            circ(ctx, cx + 1, 34, 4.5, '#ff80ab', OUT, 2);
        }
    },
    e_jugg: {
        w: 150, h: 140, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.56;
            shadow(ctx, cx, h - 10, 56, 11, sil);
            for (const s of [-1, 1]) {
                poly(ctx, [cx + s * 30, cy - 34, cx + s * 62, cy - 62, cx + s * 46, cy - 22], '#e0d6c2', OUT, 3.5);
                ell(ctx, cx + s * 38, cy + 44, 14, 9, '#3a1030', OUT, 3.5);
            }
            alienBody(ctx, cx, cy, 60, 52, '#7a2a5a', 5);
            ctx.save(); alienBody(ctx, cx, cy, 60, 52, '#7a2a5a', 5); ctx.clip();
            ctx.beginPath(); ctx.arc(cx, cy - 70, 88, 0, Math.PI); ctx.fillStyle = '#56203f'; ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
            for (const s of [-1, 0, 1]) line(ctx, cx + s * 28, cy - 50, cx + s * 34, cy + 16, OUT, 3);
            ctx.restore();
            alienBody(ctx, cx, cy, 60, 52, 'rgba(0,0,0,0)', 5);
            eye(ctx, cx - 19, cy + 8, 11, 0.2);
            eye(ctx, cx + 19, cy + 8, 11, -0.2);
            teeth(ctx, cx, cy + 32, 40, 12);
        }
    },
    e_queen: {
        w: 140, h: 140, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.58;
            shadow(ctx, cx, h - 10, 52, 10, sil);
            // wings
            ell(ctx, cx - 44, cy - 24, 26, 14, 'rgba(180,255,180,0.6)', OUT, 3, -0.5);
            ell(ctx, cx + 44, cy - 24, 26, 14, 'rgba(180,255,180,0.6)', OUT, 3, 0.5);
            alienBody(ctx, cx, cy, 50, 46, '#4caf50', 5);
            spots(ctx, cx, cy, '#2e7d32', [-26, 10, 7, 24, 14, 6, 0, 30, 5, -10, -24, 4, 16, -20, 4]);
            highlight(ctx, cx - 18, cy - 22, 10, 5, 0.3);
            // crown
            poly(ctx, [cx - 24, cy - 40, cx - 26, cy - 62, cx - 12, cy - 48, cx, cy - 68, cx + 12, cy - 48, cx + 26, cy - 62, cx + 24, cy - 40], '#ffd166', OUT, 3);
            eye(ctx, cx - 16, cy - 8, 9, 0.2, 0.2);
            eye(ctx, cx + 16, cy - 8, 9, 0.2, 0.2);
            eye(ctx, cx, cy - 22, 6, 0, 0.2);
            rrFill(ctx, cx - 8, cy + 10, 16, 20, 6, '#388e3c', OUT, 3);
            ell(ctx, cx, cy + 29, 8, 4, '#0d2e0f', OUT, 2);
        }
    },
    e_boss: {
        w: 210, h: 200, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.56;
            shadow(ctx, cx, h - 12, 78, 14, sil);
            // tentacles
            for (let i = 0; i < 6; i++) {
                const a = Math.PI * 0.15 + i * Math.PI * 0.14;
                const x = cx + Math.cos(a) * 70 * (i < 3 ? -1 : 1) * (i < 3 ? 1 : 1);
                ell(ctx, i < 3 ? cx - 40 - i * 14 : cx + 40 + (i - 3) * 14, cy + 58 - (i % 3) * 8, 12, 18, '#3c1f5c', OUT, 3.5);
                void x;
            }
            // spikes crown
            const sp: number[] = [];
            for (let i = 0; i <= 12; i++) {
                const a = Math.PI + i / 12 * Math.PI;
                const rad = i % 2 === 0 ? 96 : 76;
                sp.push(cx + Math.cos(a) * rad, cy - 8 + Math.sin(a) * rad * 0.95);
            }
            poly(ctx, sp, '#2a1640', OUT, 4);
            alienBody(ctx, cx, cy, 80, 70, '#5b2a86', 5);
            spots(ctx, cx, cy, '#47206b', [-40, 20, 9, 42, 24, 8, -10, 42, 6, 30, -30, 6]);
            highlight(ctx, cx - 30, cy - 34, 14, 7, 0.25);
            // many eyes
            eye(ctx, cx, cy - 14, 18, 0, 0.2, 0.6);
            eye(ctx, cx - 38, cy - 4, 9, 0.2, 0.2);
            eye(ctx, cx + 38, cy - 4, 9, -0.2, 0.2);
            eye(ctx, cx - 24, cy - 38, 7, 0.2, 0.2);
            eye(ctx, cx + 24, cy - 38, 7, -0.2, 0.2);
            teeth(ctx, cx, cy + 32, 60, 16);
            if (!sil) { circ(ctx, cx, cy - 60, 10, '#ff4081', OUT, 3); circ(ctx, cx - 3, cy - 63, 3, '#ffffff'); }
        }
    },
};

// ---------------------------------------------------------------- weapons (pointing right; grip on the left)
// Key-art palette: steel and gunmetal bodies, gold trim, glowing cyan core cells.
const WEAPON_DRAW: { [k: string]: { w: number; h: number; d: (ctx: C2D, w: number, h: number) => void } } = {
    w_fist: {
        w: 44, h: 34, d: (ctx, w, h) => {
            rrFill(ctx, 3, h / 2 - 6, 14, 12, 3, GUNMETAL);
            rrFill(ctx, 13, 4, 26, 26, 9, STEEL);
            rrFill(ctx, 29, 5, 10, 24, 4, GOLD);
            for (let i = 0; i < 3; i++) line(ctx, 31, 11 + i * 6, 37, 11 + i * 6, GOLD_D, 2);
            cell(ctx, 17, 13, 9, 8);
            highlight(ctx, 20, 8, 5, 2.2, 0.5);
        }
    },
    w_blade: {
        w: 76, h: 26, d: (ctx, w, h) => {
            rrFill(ctx, 3, h / 2 - 4, 14, 8, 3, GUNMETAL);
            circ(ctx, 4, h / 2, 3.4, GOLD, OUT, 2);
            poly(ctx, [22, h / 2 - 6, 62, h / 2 - 6, 74, h / 2, 62, h / 2 + 6, 22, h / 2 + 6], '#b3cbea');
            poly(ctx, [23, h / 2 + 1, 62, h / 2 + 1, 71, h / 2, 62, h / 2 + 5, 23, h / 2 + 5], '#7f9cc4', '');
            line(ctx, 26, h / 2 - 1.5, 63, h / 2 - 1.5, CORE, 2);
            rrFill(ctx, 15, h / 2 - 11, 8, 22, 3, GOLD);
            circ(ctx, 19, h / 2, 2.8, CORE, OUT, 1.5);
        }
    },
    w_spear: {
        w: 96, h: 22, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 3, 70, 6, 3, GUNMETAL);
            for (const x of [12, 40, 63]) rrFill(ctx, x, h / 2 - 4.5, 5, 9, 1.5, GOLD, OUT, 1.6);
            poly(ctx, [68, h / 2 - 8, 94, h / 2, 68, h / 2 + 8, 72, h / 2], '#8ff6ff');
            line(ctx, 73, h / 2, 88, h / 2, '#ffffff', 1.6);
        }
    },
    w_hammer: {
        w: 70, h: 44, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 4, 42, 8, 3, GUNMETAL);
            rrFill(ctx, 8, h / 2 - 5, 6, 10, 2, GOLD, OUT, 1.6);
            rrFill(ctx, 40, 3, 26, 38, 6, STEEL);
            rrFill(ctx, 40, 8, 26, 6, 2, GOLD, OUT, 2);
            rrFill(ctx, 40, 30, 26, 6, 2, GOLD, OUT, 2);
            cell(ctx, 48, 17, 10, 10);
            highlight(ctx, 47, 5.5, 5, 1.4, 0.5);
        }
    },
    w_chainsaw: {
        w: 70, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 22, h / 2 - 6, 44, 12, 6, STEEL_L);
            for (let i = 0; i < 7; i++) poly(ctx, [26 + i * 6, h / 2 - 6, 29 + i * 6, h / 2 - 9, 32 + i * 6, h / 2 - 6], OUT, undefined);
            for (let i = 0; i < 7; i++) poly(ctx, [26 + i * 6, h / 2 + 6, 29 + i * 6, h / 2 + 9, 32 + i * 6, h / 2 + 6], OUT, undefined);
            line(ctx, 26, h / 2, 60, h / 2, 'rgba(62,240,255,0.8)', 2);
            rrFill(ctx, 2, 6, 24, 18, 5, GOLD);
            rrFill(ctx, 6, 10, 12, 10, 3, GUNMETAL);
            cell(ctx, 8, 12, 8, 4);
        }
    },
    w_flamesword: {
        w: 76, h: 28, d: (ctx, w, h) => {
            rrFill(ctx, 3, h / 2 - 4, 14, 8, 3, GUNMETAL);
            circ(ctx, 4, h / 2, 3.4, GOLD, OUT, 2);
            poly(ctx, [22, h / 2 - 7, 60, h / 2 - 9, 74, h / 2, 60, h / 2 + 7, 22, h / 2 + 6], '#ff5722');
            poly(ctx, [26, h / 2 - 3, 58, h / 2 - 4, 68, h / 2, 58, h / 2 + 3, 26, h / 2 + 3], '#ffd54f', undefined);
            rrFill(ctx, 15, h / 2 - 11, 8, 22, 3, GOLD);
            circ(ctx, 19, h / 2, 2.8, '#ff7a1a', OUT, 1.5);
        }
    },
    w_pistol: {
        w: 46, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 6, 14, 10, 14, 3, GUNMETAL);
            rrFill(ctx, 4, 6, 38, 11, 3, STEEL);
            rrFill(ctx, 5, 13, 28, 3.5, 1.5, GOLD, '');
            cell(ctx, 33, 7.5, 9, 7);
            line(ctx, 9, 9, 28, 9, 'rgba(255,255,255,0.6)', 1.5);
        }
    },
    w_smg: {
        w: 56, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 2, 8, 12, 9, 2, GUNMETAL);
            rrFill(ctx, 42, 9, 12, 6, 2, GUNMETAL);
            rrFill(ctx, 22, 16, 7, 12, 2, GOLD);
            rrFill(ctx, 14, 16, 6, 9, 2, GUNMETAL);
            rrFill(ctx, 12, 6, 32, 12, 3, STEEL);
            cell(ctx, 30, 8.5, 10, 4.5);
            line(ctx, 15, 9, 27, 9, 'rgba(255,255,255,0.55)', 1.4);
        }
    },
    w_shotgun: {
        w: 66, h: 26, d: (ctx, w, h) => {
            rrFill(ctx, 2, 9, 20, 11, 4, '#d98a2b');
            rrFill(ctx, 18, 6, 44, 7, 2, STEEL_L);
            rrFill(ctx, 18, 12.5, 44, 7, 2, STEEL);
            rrFill(ctx, 30, 15, 15, 7, 2, GUNMETAL);
            rrFill(ctx, 56, 5, 7, 15, 2, GOLD, OUT, 2);
            cell(ctx, 8, 12, 9, 4);
        }
    },
    w_sniper: {
        w: 88, h: 28, d: (ctx, w, h) => {
            rrFill(ctx, 2, 12, 22, 11, 4, GUNMETAL);
            rrFill(ctx, 4, 14, 8, 6, 2, GOLD, '');
            rrFill(ctx, 20, 12, 64, 6, 2, STEEL);
            rrFill(ctx, 30, 3, 24, 8, 4, GUNMETAL);
            circ(ctx, 54, 7, 3.2, CORE, OUT, 1.5);
            rrFill(ctx, 80, 10, 6, 10, 2, GUNMETAL);
            rrFill(ctx, 56, 11.5, 6, 7, 1.5, GOLD, OUT, 1.5);
        }
    },
    w_rocket: {
        w: 76, h: 32, d: (ctx, w, h) => {
            rrFill(ctx, 22, 21, 8, 10, 2, STEEL_D);
            rrFill(ctx, 4, 7, 66, 16, 6, GUNMETAL);
            rrFill(ctx, 12, 7, 6, 16, 2, GOLD, OUT, 2);
            rrFill(ctx, 48, 7, 6, 16, 2, GOLD, OUT, 2);
            rrFill(ctx, 64, 4, 10, 22, 3, STEEL);
            rrFill(ctx, 1, 5, 8, 20, 3, STEEL_D);
            cell(ctx, 23, 10, 20, 5);
        }
    },
    w_wand: {
        w: 66, h: 28, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 3, 46, 6, 3, GOLD);
            for (const x of [10, 30]) rrFill(ctx, x, h / 2 - 4, 4, 8, 1.5, GOLD_D, OUT, 1.5);
            poly(ctx, [44, h / 2 - 2, 53, 3, 52, h / 2 - 3], GOLD, OUT, 2);
            poly(ctx, [44, h / 2 + 2, 53, h - 3, 52, h / 2 + 3], GOLD, OUT, 2);
            energy(ctx, 56, h / 2, 7, CORE, 1.8);
            poly(ctx, [57, h / 2 - 5, 53, h / 2 + 1, 56, h / 2 + 1, 55, h / 2 + 5, 59, h / 2 - 1, 56, h / 2 - 1], '#ffe14d', OUT, 1);
        }
    },
    w_flamethrower: {
        w: 66, h: 32, d: (ctx, w, h) => {
            rrFill(ctx, 18, 10, 36, 10, 3, STEEL);
            circ(ctx, 12, 16, 10, GOLD);
            line(ctx, 6, 16, 18, 16, GOLD_D, 2);
            rrFill(ctx, 50, 8, 12, 14, 3, GUNMETAL);
            cell(ctx, 24, 12, 16, 4, '#ffab40');
            circ(ctx, 62, 15, 3, '#ffab40');
        }
    },
    w_laser: {
        w: 70, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 10, 18, 9, 11, 3, GUNMETAL);
            rrFill(ctx, 4, 8, 40, 14, 6, STEEL_L);
            rrFill(ctx, 40, 10, 26, 10, 4, STEEL);
            rrFill(ctx, 4, 17, 36, 4, 2, GOLD, '');
            line(ctx, 12, 12.5, 58, 12.5, '#e040fb', 3);
            circ(ctx, 64, 15, 3, '#ea80fc');
        }
    },
    w_medigun: {
        w: 54, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 10, 17, 9, 11, 3, GUNMETAL);
            rrFill(ctx, 4, 6, 40, 13, 5, '#ffffff');
            rrFill(ctx, 40, 9, 12, 7, 2, STEEL);
            ctx.fillStyle = '#43a047'; ctx.fillRect(20, 9, 8, 3); ctx.fillRect(22.5, 6.5, 3, 8);
            cell(ctx, 32, 9, 8, 6, '#7dff8a');
        }
    },
    w_wrench: {
        w: 60, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 4, 42, 8, 3, STEEL);
            circ(ctx, 48, h / 2, 10, STEEL);
            ctx.save(); ctx.globalCompositeOperation = 'destination-out';
            ctx.fillRect(50, h / 2 - 4, 12, 8); ctx.restore();
            line(ctx, 50, h / 2 - 4, 58, h / 2 - 4, OUT, 2.5);
            line(ctx, 50, h / 2 + 4, 58, h / 2 + 4, OUT, 2.5);
            rrFill(ctx, 4, h / 2 - 4, 14, 8, 3, GOLD);
            cell(ctx, 24, h / 2 - 2, 10, 4);
        }
    },
    w_slingshot: {
        w: 46, h: 40, d: (ctx, w, h) => {
            line(ctx, 4, h / 2, 22, h / 2, OUT, 9); line(ctx, 4, h / 2, 22, h / 2, GUNMETAL, 5);
            line(ctx, 22, h / 2, 40, 6, OUT, 8); line(ctx, 22, h / 2, 40, 6, STEEL, 4.5);
            line(ctx, 22, h / 2, 40, h - 6, OUT, 8); line(ctx, 22, h / 2, 40, h - 6, STEEL, 4.5);
            circ(ctx, 22, h / 2, 4, GOLD, OUT, 2);
            line(ctx, 40, 6, 34, h / 2, CORE, 2); line(ctx, 40, h - 6, 34, h / 2, CORE, 2);
        }
    },
    w_minigun: {
        w: 76, h: 34, d: (ctx, w, h) => {
            for (let i = 0; i < 3; i++) rrFill(ctx, 26, 8 + i * 6, 46, 6, 3, i === 1 ? STEEL_L : STEEL);
            rrFill(ctx, 48, 6, 6, 22, 2, GOLD, OUT, 2);
            rrFill(ctx, 66, 6, 8, 22, 3, GUNMETAL);
            rrFill(ctx, 2, 8, 26, 18, 6, GUNMETAL);
            cell(ctx, 8, 13, 13, 6);
        }
    },
    w_grenade: {
        w: 64, h: 34, d: (ctx, w, h) => {
            rrFill(ctx, 2, 10, 18, 12, 4, GUNMETAL);
            rrFill(ctx, 36, 10, 26, 13, 5, STEEL);
            circ(ctx, 30, 17, 12, GOLD);
            for (let i = 0; i < 3; i++) line(ctx, 23 + i * 7, 8, 23 + i * 7, 26, GOLD_D, 1.6);
            circ(ctx, 30, 17, 4, CORE, OUT, 1.5);
        }
    },
};

// ---------------------------------------------------------------- glyph icons (white with outline, tinted at runtime)
const W = '#ffffff';
const GLYPHS: { [k: string]: (ctx: C2D) => void } = {
    heart: ctx => {
        ctx.beginPath(); ctx.moveTo(32, 52);
        ctx.bezierCurveTo(4, 34, 10, 10, 32, 22); ctx.bezierCurveTo(54, 10, 60, 34, 32, 52); ctx.closePath();
        ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
    },
    shield: ctx => poly(ctx, [32, 8, 52, 16, 50, 36, 32, 56, 14, 36, 12, 16], W, OUT, 4),
    bolt: ctx => poly(ctx, [36, 6, 16, 36, 30, 36, 26, 58, 48, 26, 34, 26], W, OUT, 4),
    gear: ctx => {
        const pts: number[] = [];
        for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 18 : 24; pts.push(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
        poly(ctx, pts, W, OUT, 4); circ(ctx, 32, 32, 7, OUT);
    },
    coin: ctx => { circ(ctx, 32, 32, 20, W, OUT, 4); circ(ctx, 32, 32, 12, undefined, OUT, 3); },
    eye: ctx => {
        ctx.beginPath(); ctx.moveTo(8, 32); ctx.quadraticCurveTo(32, 8, 56, 32); ctx.quadraticCurveTo(32, 56, 8, 32); ctx.closePath();
        ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); circ(ctx, 32, 32, 8, OUT);
    },
    boot: ctx => poly(ctx, [20, 8, 36, 8, 36, 36, 54, 42, 54, 54, 14, 54, 16, 36], W, OUT, 4),
    clover: ctx => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; circ(ctx, 32 + Math.cos(a) * 11, 28 + Math.sin(a) * 11, 10, W, OUT, 3.5); } line(ctx, 32, 32, 38, 56, OUT, 4); },
    skull: ctx => { circ(ctx, 32, 28, 18, W, OUT, 4); rrFill(ctx, 22, 38, 20, 14, 4, W, OUT, 4); circ(ctx, 25, 28, 5, OUT); circ(ctx, 39, 28, 5, OUT); },
    flask: ctx => poly(ctx, [26, 8, 38, 8, 38, 24, 52, 52, 12, 52, 26, 24], W, OUT, 4),
    battery: ctx => { rrFill(ctx, 14, 14, 36, 42, 5, W, OUT, 4); rrFill(ctx, 24, 6, 16, 8, 2, W, OUT, 3); line(ctx, 24, 36, 40, 36, OUT, 4); line(ctx, 32, 28, 32, 44, OUT, 4); },
    crystal: ctx => poly(ctx, [32, 6, 50, 24, 32, 58, 14, 24], W, OUT, 4),
    magnet: ctx => {
        ctx.beginPath(); ctx.arc(32, 30, 18, Math.PI, 0); ctx.lineTo(50, 52); ctx.lineTo(40, 52); ctx.lineTo(40, 30); ctx.arc(32, 30, 8, 0, Math.PI, true); ctx.lineTo(24, 52); ctx.lineTo(14, 52); ctx.closePath();
        ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
    },
    bomb: ctx => { circ(ctx, 30, 36, 18, W, OUT, 4); line(ctx, 40, 22, 48, 12, OUT, 4); circ(ctx, 50, 10, 4, W, OUT, 2); },
    leaf: ctx => { ctx.beginPath(); ctx.moveTo(12, 52); ctx.quadraticCurveTo(10, 12, 54, 10); ctx.quadraticCurveTo(52, 52, 12, 52); ctx.closePath(); ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); line(ctx, 14, 50, 40, 24, OUT, 3); },
    target: ctx => { circ(ctx, 32, 32, 22, W, OUT, 4); circ(ctx, 32, 32, 13, undefined, OUT, 3); circ(ctx, 32, 32, 5, OUT); },
    star: ctx => { const p: number[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 24; p.push(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } poly(ctx, p, W, OUT, 4); },
    apple: ctx => { circ(ctx, 32, 36, 18, W, OUT, 4); line(ctx, 32, 18, 34, 8, OUT, 4); ell(ctx, 42, 12, 7, 4, W, OUT, 3, -0.5); },
    chip: ctx => { rrFill(ctx, 16, 16, 32, 32, 4, W, OUT, 4); for (let i = 0; i < 3; i++) { line(ctx, 22 + i * 10, 8, 22 + i * 10, 16, OUT, 3); line(ctx, 22 + i * 10, 48, 22 + i * 10, 56, OUT, 3); } rrFill(ctx, 24, 24, 16, 16, 2, OUT, undefined); },
    crown: ctx => poly(ctx, [10, 50, 8, 18, 22, 32, 32, 12, 42, 32, 56, 18, 54, 50], W, OUT, 4),
    claw: ctx => { for (let i = 0; i < 3; i++) poly(ctx, [14 + i * 13, 54, 22 + i * 13, 10, 26 + i * 13, 54], W, OUT, 3.5); },
    fang: ctx => { poly(ctx, [12, 12, 52, 12, 44, 22, 38, 54, 32, 24, 26, 54, 20, 22], W, OUT, 4); },
    wing: ctx => { ctx.beginPath(); ctx.moveTo(10, 44); ctx.quadraticCurveTo(14, 8, 56, 12); ctx.quadraticCurveTo(46, 30, 50, 34); ctx.quadraticCurveTo(36, 40, 40, 48); ctx.quadraticCurveTo(24, 46, 10, 44); ctx.closePath(); ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); },
    turret: ctx => { rrFill(ctx, 14, 38, 36, 16, 4, W, OUT, 4); circ(ctx, 32, 34, 12, W, OUT, 4); rrFill(ctx, 34, 28, 22, 8, 3, W, OUT, 3.5); },
    mine: ctx => { circ(ctx, 32, 36, 16, W, OUT, 4); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; line(ctx, 32 + Math.cos(a) * 16, 36 + Math.sin(a) * 16, 32 + Math.cos(a) * 24, 36 + Math.sin(a) * 24, OUT, 4); } circ(ctx, 32, 36, 5, OUT); },
    drop: ctx => { ctx.beginPath(); ctx.moveTo(32, 6); ctx.quadraticCurveTo(52, 34, 46, 44); ctx.arc(32, 40, 15, 0.3, Math.PI - 0.3); ctx.quadraticCurveTo(12, 34, 32, 6); ctx.closePath(); ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); },
    fire: ctx => { ctx.beginPath(); ctx.moveTo(32, 6); ctx.quadraticCurveTo(54, 30, 46, 46); ctx.quadraticCurveTo(38, 58, 32, 58); ctx.quadraticCurveTo(14, 58, 16, 40); ctx.quadraticCurveTo(18, 30, 26, 26); ctx.quadraticCurveTo(26, 16, 32, 6); ctx.closePath(); ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); },
    snow: ctx => { for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; line(ctx, 32 - Math.cos(a) * 22, 32 - Math.sin(a) * 22, 32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22, OUT, 9); } for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; line(ctx, 32 - Math.cos(a) * 20, 32 - Math.sin(a) * 20, 32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, W, 4); } },
    hourglass: ctx => { poly(ctx, [16, 8, 48, 8, 34, 32, 48, 56, 16, 56, 30, 32], W, OUT, 4); line(ctx, 12, 8, 52, 8, OUT, 4); line(ctx, 12, 56, 52, 56, OUT, 4); },
    book: ctx => { rrFill(ctx, 12, 10, 40, 46, 4, W, OUT, 4); line(ctx, 20, 10, 20, 56, OUT, 3); line(ctx, 26, 22, 44, 22, OUT, 3); line(ctx, 26, 30, 40, 30, OUT, 3); },
    dice: ctx => { rrFill(ctx, 12, 12, 40, 40, 8, W, OUT, 4); circ(ctx, 22, 22, 4, OUT); circ(ctx, 32, 32, 4, OUT); circ(ctx, 42, 42, 4, OUT); },
    scope: ctx => { circ(ctx, 32, 32, 20, W, OUT, 4); line(ctx, 32, 8, 32, 56, OUT, 3); line(ctx, 8, 32, 56, 32, OUT, 3); circ(ctx, 32, 32, 4, OUT); },
    plate: ctx => { rrFill(ctx, 12, 14, 40, 36, 8, W, OUT, 4); line(ctx, 12, 32, 52, 32, OUT, 3); circ(ctx, 20, 22, 2.5, OUT); circ(ctx, 44, 22, 2.5, OUT); },
    ring: ctx => { circ(ctx, 32, 32, 22, W, OUT, 4); circ(ctx, 32, 32, 11, OUT, OUT, 4); },
    cross: ctx => poly(ctx, [24, 8, 40, 8, 40, 24, 56, 24, 56, 40, 40, 40, 40, 56, 24, 56, 24, 40, 8, 40, 8, 24, 24, 24], W, OUT, 4),
    sword: ctx => { poly(ctx, [44, 8, 56, 8, 56, 20, 26, 46, 18, 38], W, OUT, 4); line(ctx, 12, 32, 32, 52, OUT, 6); line(ctx, 14, 50, 8, 56, OUT, 6); },
    fist: ctx => { rrFill(ctx, 12, 16, 40, 34, 10, W, OUT, 4); for (let i = 0; i < 3; i++) line(ctx, 22 + i * 10, 16, 22 + i * 10, 28, OUT, 3); },
    bag: ctx => { rrFill(ctx, 12, 20, 40, 36, 10, W, OUT, 4); rrFill(ctx, 24, 10, 16, 12, 4, W, OUT, 4); },
};
// ---------------------------------------------------------------- creature builder
// Parametric monsters: a body shape plus parts (eyes, mouth, top, sides, tail, pattern, glow).
// Coordinates are in a 60-unit frame scaled by k, so the same spec works at any sprite size.
interface Creature {
    w: number; h: number;
    body: 'blob' | 'round' | 'spiky' | 'tall' | 'flat' | 'diamond' | 'jelly' | 'segment' | 'box';
    col: string; size?: number;
    pattern?: 'spots' | 'cracks' | 'plates' | 'rivets' | 'stripes' | 'swirl' | 'needles' | 'moss';
    patCol?: string;
    eyes: number;                 // 0..5
    eyeStyle?: 'normal' | 'angry' | 'visor' | 'frog' | 'glow' | 'big';
    eyeCol?: string;
    mouth?: 'teeth' | 'fangs' | 'smile' | 'tube' | 'beak' | 'grill' | 'maw' | 'tusks' | 'none';
    top?: 'antenna' | 'horns' | 'spikes' | 'crown' | 'crystal' | 'flame' | 'halo' | 'cap' | 'antlers' | 'dish' | 'flower' | 'mohawk';
    topCol?: string;
    side?: 'wings' | 'claws' | 'tentacles' | 'legs' | 'arms' | 'fins' | 'thrusters';
    sideCol?: string;
    tail?: 'stinger';
    glow?: string;                // glowing core in the belly
    rings?: string;               // planet ring around the body
    aura?: string;                // faint ring
    shield?: string;              // shield held in front
}

function creatureBody(ctx: C2D, c: Creature, cx: number, cy: number, R: number, fill: string, lw: number) {
    ctx.beginPath();
    switch (c.body) {
        case 'round': ctx.arc(cx, cy, R, 0, TAU); break;
        case 'tall': ctx.ellipse(cx, cy - R * 0.1, R * 0.78, R * 1.12, 0, 0, TAU); break;
        case 'flat': ctx.ellipse(cx, cy + R * 0.12, R * 1.25, R * 0.78, 0, 0, TAU); break;
        case 'diamond': ctx.moveTo(cx, cy - R * 1.2); ctx.lineTo(cx + R * 0.95, cy); ctx.lineTo(cx, cy + R * 1.0); ctx.lineTo(cx - R * 0.95, cy); ctx.closePath(); break;
        case 'spiky': {
            for (let i = 0; i <= 16; i++) {
                const a = i / 16 * TAU, rr2 = i % 2 === 0 ? R * 1.12 : R * 0.82;
                const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath(); break;
        }
        case 'jelly':
            ctx.moveTo(cx - R, cy + R * 0.25);
            ctx.bezierCurveTo(cx - R, cy - R * 1.25, cx + R, cy - R * 1.25, cx + R, cy + R * 0.25);
            for (let i = 0; i <= 5; i++) ctx.quadraticCurveTo(cx + R - (i + 0.5) * R * 0.4, cy + R * 0.55, cx + R - (i + 1) * R * 0.4, cy + R * 0.25);
            ctx.closePath(); break;
        case 'box': rr(ctx, cx - R * 0.95, cy - R * 0.95, R * 1.9, R * 1.8, R * 0.32); break;
        case 'segment': ctx.ellipse(cx + R * 0.35, cy, R * 0.85, R * 0.8, 0, 0, TAU); break;
        default: // blob
            ctx.moveTo(cx - R, cy + R * 0.2);
            ctx.bezierCurveTo(cx - R, cy - R * 1.1, cx + R, cy - R * 1.1, cx + R, cy + R * 0.2);
            ctx.bezierCurveTo(cx + R, cy + R * 1.05, cx - R, cy + R * 1.05, cx - R, cy + R * 0.2);
            ctx.closePath();
    }
    ctx.fillStyle = fill; ctx.fill();
    if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke(); }
}

function drawCreature(ctx: C2D, c: Creature, w: number, h: number, sil: boolean) {
    const k = Math.min(w, h) / 60;
    const cx = w / 2, cy = h * 0.56;
    const R = 21 * k * (c.size || 1);
    const lw = Math.max(2.5, 3.2 * k);
    const dark = shade(c.col, -0.28), side = c.sideCol || shade(c.col, -0.18), topc = c.topCol || shade(c.col, -0.35);
    shadow(ctx, cx, h - 6 * k, R * (c.body === 'flat' ? 1.2 : 0.95), 5 * k, sil);
    if (c.aura && !sil) { ctx.save(); ctx.strokeStyle = c.aura; ctx.globalAlpha = 0.55; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.45, R * 1.35, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    // ---- behind the body
    if (c.tail === 'stinger') {
        ctx.beginPath(); ctx.moveTo(cx + R * 0.6, cy + R * 0.2);
        ctx.quadraticCurveTo(cx + R * 1.7, cy - R * 0.1, cx + R * 1.1, cy - R * 1.2);
        ctx.lineWidth = 7 * k; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke();
        ctx.lineWidth = 4 * k; ctx.strokeStyle = side; ctx.stroke();
        poly(ctx, [cx + R * 1.1, cy - R * 1.55, cx + R * 1.35, cy - R * 1.05, cx + R * 0.85, cy - R * 1.1], '#f4e2c6', OUT, lw * 0.7);
    }
    if (c.body === 'segment') {
        for (let i = 2; i >= 1; i--) circ(ctx, cx + R * 0.35 - i * R * 0.75, cy + R * 0.12 * i, R * (0.78 - i * 0.12), i % 2 ? c.col : dark, OUT, lw);
    }
    if (c.side === 'wings') {
        for (const s of [-1, 1]) {
            ctx.save(); ctx.translate(cx + s * R * 0.7, cy - R * 0.45); ctx.rotate(s * -0.45);
            ell(ctx, s * R * 0.55, 0, R * 0.8, R * 0.42, c.sideCol || 'rgba(220,250,255,0.75)', OUT, lw * 0.8);
            ctx.restore();
        }
    } else if (c.side === 'tentacles') {
        for (let i = 0; i < 5; i++) {
            const x = cx - R * 0.8 + i * R * 0.4;
            ctx.beginPath(); ctx.moveTo(x, cy + R * 0.4);
            ctx.quadraticCurveTo(x + (i % 2 ? 6 : -6) * k, cy + R * 1.0, x + (i - 2) * 3 * k, cy + R * 1.35);
            ctx.lineCap = 'round'; ctx.lineWidth = 7 * k; ctx.strokeStyle = OUT; ctx.stroke();
            ctx.lineWidth = 4 * k; ctx.strokeStyle = side; ctx.stroke();
        }
    } else if (c.side === 'legs') {
        for (const s of [-1, 1]) for (const j of [0, 1]) ell(ctx, cx + s * R * (0.45 + j * 0.45), cy + R * 0.92, R * 0.24, R * 0.17, dark, OUT, lw * 0.8);
    } else if (c.side === 'fins') {
        for (const s of [-1, 1]) poly(ctx, [cx + s * R * 0.7, cy - R * 0.1, cx + s * R * 1.45, cy + R * 0.15, cx + s * R * 0.75, cy + R * 0.55], side, OUT, lw * 0.8);
    } else if (c.side === 'thrusters') {
        for (const s of [-1, 1]) {
            rrFill(ctx, cx + s * R * 1.05 - R * 0.22, cy - R * 0.3, R * 0.44, R * 0.7, R * 0.12, '#8d99a6', OUT, lw * 0.8);
            if (!sil) ell(ctx, cx + s * R * 1.05, cy + R * 0.55, R * 0.14, R * 0.28, '#7fe7ff');
        }
    }
    if (c.rings) { ctx.save(); ctx.lineWidth = 4 * k; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.55, R * 0.42, -0.25, Math.PI, TAU); ctx.stroke(); ctx.lineWidth = 2.2 * k; ctx.strokeStyle = c.rings; ctx.stroke(); ctx.restore(); }
    // ---- body + pattern (clipped)
    creatureBody(ctx, c, cx, cy, R, c.col, 0);
    if (!sil) {
        ctx.save();
        creatureBody(ctx, c, cx, cy, R, 'rgba(0,0,0,0)', 0); ctx.clip();
        const pc = c.patCol || dark;
        switch (c.pattern) {
            case 'spots': spots(ctx, cx, cy, pc, [-R * 0.55, R * 0.35, R * 0.16, R * 0.5, R * 0.25, R * 0.13, R * 0.2, R * 0.6, R * 0.1, -R * 0.2, -R * 0.55, R * 0.1]); break;
            case 'moss': spots(ctx, cx, cy, pc, [-R * 0.7, -R * 0.5, R * 0.35, R * 0.6, -R * 0.6, R * 0.3, 0, -R * 0.95, R * 0.35, -R * 0.2, R * 0.7, R * 0.2]); break;
            case 'cracks':
                ctx.strokeStyle = pc; ctx.lineWidth = 2.6 * k; ctx.lineCap = 'round';
                for (const p of [[-0.6, -0.2, -0.3, 0.1, -0.45, 0.45], [0.55, -0.4, 0.3, 0, 0.5, 0.35], [-0.1, 0.5, 0.15, 0.8]]) {
                    ctx.beginPath(); ctx.moveTo(cx + p[0] * R, cy + p[1] * R);
                    for (let i = 2; i < p.length; i += 2) ctx.lineTo(cx + p[i] * R, cy + p[i + 1] * R);
                    ctx.stroke();
                }
                break;
            case 'plates':
                ctx.fillStyle = shade(c.col, 0.15);
                ctx.beginPath(); ctx.arc(cx, cy - R * 1.4, R * 1.2, 0, Math.PI); ctx.fill();
                ctx.strokeStyle = OUT; ctx.lineWidth = 2.5 * k; ctx.stroke();
                break;
            case 'rivets':
                for (const p of [[-0.7, -0.65], [0.7, -0.65], [-0.7, 0.65], [0.7, 0.65]]) circ(ctx, cx + p[0] * R, cy + p[1] * R, 2.2 * k, pc);
                ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(cx - R, cy + R * 0.25, R * 2, R * 0.1);
                break;
            case 'stripes':
                ctx.fillStyle = pc;
                for (let i = -2; i <= 2; i++) ctx.fillRect(cx - R * 1.3, cy + i * R * 0.42 - R * 0.07, R * 2.6, R * 0.14);
                break;
            case 'swirl':
                ctx.strokeStyle = pc; ctx.lineWidth = 2.4 * k; ctx.beginPath();
                for (let a = 0; a < TAU * 2; a += 0.2) { const r = R * a / (TAU * 2); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
                ctx.stroke(); break;
            case 'needles':
                ctx.strokeStyle = '#f2ead2'; ctx.lineWidth = 1.6 * k;
                for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x = cx + Math.cos(a) * R * 0.7, y = cy + Math.sin(a) * R * 0.8; line(ctx, x, y, x + Math.cos(a) * 5 * k, y + Math.sin(a) * 5 * k, '#f2ead2', 1.6 * k); }
                break;
        }
        highlight(ctx, cx - R * 0.4, cy - R * 0.5, R * 0.32, R * 0.17, 0.3);
        ctx.restore();
    }
    creatureBody(ctx, c, cx, cy, R, 'rgba(0,0,0,0)', lw);
    // ---- glow core
    if (c.glow && !sil) {
        circ(ctx, cx, cy + R * 0.35, R * 0.34, 'rgba(255,255,255,0.25)');
        circ(ctx, cx, cy + R * 0.35, R * 0.22, c.glow, OUT, lw * 0.6);
        circ(ctx, cx - R * 0.06, cy + R * 0.29, R * 0.07, '#ffffff');
    }
    // ---- top
    const ty = c.body === 'tall' ? cy - R * 1.2 : c.body === 'diamond' ? cy - R * 1.15 : c.body === 'flat' ? cy - R * 0.62 : cy - R * 0.95;
    switch (c.top) {
        case 'antenna':
            for (const s of [-1, 1]) { line(ctx, cx + s * R * 0.25, ty + R * 0.15, cx + s * R * 0.5, ty - R * 0.45, OUT, 3 * k); circ(ctx, cx + s * R * 0.5, ty - R * 0.48, 3.5 * k, topc === OUT ? '#b39ddb' : shade(c.col, 0.35), OUT, 2 * k); }
            break;
        case 'horns':
            for (const s of [-1, 1]) poly(ctx, [cx + s * R * 0.35, ty + R * 0.2, cx + s * R * 0.9, ty - R * 0.55, cx + s * R * 0.7, ty + R * 0.3], c.topCol || '#f2e6cf', OUT, lw * 0.8);
            break;
        case 'spikes':
            for (let i = -2; i <= 2; i++) poly(ctx, [cx + i * R * 0.32 - R * 0.13, ty + R * 0.25, cx + i * R * 0.36, ty - R * (0.45 - Math.abs(i) * 0.08), cx + i * R * 0.32 + R * 0.13, ty + R * 0.25], topc, OUT, lw * 0.7);
            break;
        case 'crown':
            poly(ctx, [cx - R * 0.55, ty + R * 0.2, cx - R * 0.62, ty - R * 0.5, cx - R * 0.28, ty - R * 0.15, cx, ty - R * 0.62, cx + R * 0.28, ty - R * 0.15, cx + R * 0.62, ty - R * 0.5, cx + R * 0.55, ty + R * 0.2], c.topCol || '#ffd166', OUT, lw * 0.8);
            if (!sil) circ(ctx, cx, ty - R * 0.1, R * 0.08, '#ff5c7a');
            break;
        case 'crystal':
            poly(ctx, [cx - R * 0.15, ty + R * 0.25, cx - R * 0.05, ty - R * 0.7, cx + R * 0.25, ty + R * 0.2], c.topCol || '#dff6ff', OUT, lw * 0.7);
            poly(ctx, [cx - R * 0.55, ty + R * 0.3, cx - R * 0.5, ty - R * 0.3, cx - R * 0.2, ty + R * 0.25], c.topCol || '#bfeaff', OUT, lw * 0.7);
            poly(ctx, [cx + R * 0.3, ty + R * 0.3, cx + R * 0.55, ty - R * 0.35, cx + R * 0.6, ty + R * 0.3], c.topCol || '#bfeaff', OUT, lw * 0.7);
            break;
        case 'flame':
            if (!sil) {
                ctx.beginPath(); ctx.moveTo(cx - R * 0.45, ty + R * 0.3);
                ctx.quadraticCurveTo(cx - R * 0.5, ty - R * 0.3, cx - R * 0.15, ty - R * 0.25); ctx.quadraticCurveTo(cx - R * 0.05, ty - R * 0.9, cx + R * 0.2, ty - R * 0.35);
                ctx.quadraticCurveTo(cx + R * 0.45, ty - R * 0.6, cx + R * 0.45, ty + R * 0.3); ctx.closePath();
                ctx.fillStyle = '#ffb02e'; ctx.fill(); ctx.lineWidth = lw * 0.6; ctx.strokeStyle = '#a3200f'; ctx.stroke();
                ell(ctx, cx, ty + R * 0.05, R * 0.15, R * 0.25, '#fff2a8');
            }
            break;
        case 'halo':
            ctx.save(); ctx.lineWidth = 3.5 * k; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.ellipse(cx, ty - R * 0.35, R * 0.55, R * 0.16, 0, 0, TAU); ctx.stroke();
            ctx.lineWidth = 2 * k; ctx.strokeStyle = c.topCol || '#fff3a0'; ctx.stroke(); ctx.restore();
            break;
        case 'cap':
            ctx.beginPath(); ctx.ellipse(cx, ty + R * 0.15, R * 1.05, R * 0.6, 0, Math.PI, TAU); ctx.closePath();
            ctx.fillStyle = c.topCol || '#e2483b'; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
            if (!sil) spots(ctx, cx, ty, '#fff4e0', [-R * 0.5, -R * 0.05, R * 0.13, R * 0.1, -R * 0.25, R * 0.15, R * 0.55, R * 0.02, R * 0.11]);
            break;
        case 'antlers':
            for (const s of [-1, 1]) {
                ctx.lineCap = 'round';
                const a = (x1: number, y1: number, x2: number, y2: number) => { line(ctx, cx + s * x1 * R, ty + y1 * R, cx + s * x2 * R, ty + y2 * R, OUT, 6 * k); line(ctx, cx + s * x1 * R, ty + y1 * R, cx + s * x2 * R, ty + y2 * R, c.topCol || '#c9a57a', 3 * k); };
                a(0.3, 0.2, 0.7, -0.6); a(0.55, -0.25, 1.0, -0.45); a(0.62, -0.42, 0.55, -0.85);
            }
            break;
        case 'dish':
            line(ctx, cx, ty + R * 0.2, cx, ty - R * 0.3, OUT, 3 * k);
            ctx.beginPath(); ctx.ellipse(cx, ty - R * 0.4, R * 0.42, R * 0.2, -0.3, 0, Math.PI); ctx.closePath();
            ctx.fillStyle = c.topCol || '#cfd8dc'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.strokeStyle = OUT; ctx.stroke();
            break;
        case 'flower':
            for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; circ(ctx, cx + Math.cos(a) * R * 0.22, ty - R * 0.1 + Math.sin(a) * R * 0.22, R * 0.16, c.topCol || '#ff7eb6', OUT, lw * 0.5); }
            circ(ctx, cx, ty - R * 0.1, R * 0.13, '#ffd166', OUT, lw * 0.5);
            break;
        case 'mohawk':
            for (let i = -2; i <= 2; i++) poly(ctx, [cx + i * R * 0.18 - R * 0.1, ty + R * 0.2, cx + i * R * 0.22, ty - R * 0.5, cx + i * R * 0.18 + R * 0.1, ty + R * 0.2], c.topCol || '#ff5c5c', OUT, lw * 0.5);
            break;
    }
    // ---- eyes
    const ey = c.body === 'flat' ? cy - R * 0.15 : cy - R * 0.2;
    const er = (c.eyeStyle === 'big' ? 9 : 6) * k * (c.size || 1);
    const ec = c.eyeCol;
    const eyeAt = (x: number, y: number, r: number) => {
        if (c.eyeStyle === 'glow') { circ(ctx, x, y, r, ec || '#fff07a', OUT, lw * 0.6); circ(ctx, x, y, r * 0.4, '#ffffff'); }
        else eye(ctx, x, y, r, 0.2, 0.15, 0.5);
    };
    if (c.eyeStyle === 'visor') {
        rrFill(ctx, cx - R * 0.75, ey - R * 0.2, R * 1.5, R * 0.42, R * 0.2, '#1c2027', OUT, lw * 0.7);
        if (!sil) { const vc = ec || '#ff4d4d'; rrFill(ctx, cx - R * 0.55, ey - R * 0.08, R * 1.1, R * 0.17, R * 0.08, vc, undefined); circ(ctx, cx + R * 0.15, ey, R * 0.12, '#ffffff'); }
    } else if (c.eyeStyle === 'frog') {
        for (const s of [-1, 1]) { circ(ctx, cx + s * R * 0.45, cy - R * 0.62, er * 1.2, c.col, OUT, lw * 0.8); eye(ctx, cx + s * R * 0.45, cy - R * 0.66, er * 0.9, 0.15, 0.1, 0.55); }
    } else if (c.eyes === 1) eyeAt(cx, ey, er * 1.45);
    else if (c.eyes === 2) { eyeAt(cx - R * 0.36, ey, er); eyeAt(cx + R * 0.36, ey, er); }
    else if (c.eyes === 3) { eyeAt(cx - R * 0.42, ey + R * 0.05, er * 0.85); eyeAt(cx + R * 0.42, ey + R * 0.05, er * 0.85); eyeAt(cx, ey - R * 0.3, er); }
    else if (c.eyes === 4) { for (const p of [[-0.45, 0], [0.45, 0], [-0.2, -0.35], [0.2, -0.35]]) eyeAt(cx + p[0] * R, ey + p[1] * R, er * 0.72); }
    else if (c.eyes >= 5) { eyeAt(cx, ey - R * 0.05, er * 1.2); for (const p of [[-0.6, 0.05], [0.6, 0.05], [-0.38, -0.45], [0.38, -0.45]]) eyeAt(cx + p[0] * R, ey + p[1] * R, er * 0.6); }
    if (c.eyeStyle === 'angry' && c.eyes >= 2) {
        line(ctx, cx - R * 0.68, ey - er * 1.5, cx - R * 0.15, ey - er * 0.8, OUT, 3 * k);
        line(ctx, cx + R * 0.68, ey - er * 1.5, cx + R * 0.15, ey - er * 0.8, OUT, 3 * k);
    }
    // ---- mouth
    const my = cy + R * 0.42;
    switch (c.mouth) {
        case 'teeth': teeth(ctx, cx, my, R * 0.7, R * 0.28); break;
        case 'maw': teeth(ctx, cx, my, R * 1.05, R * 0.45); break;
        case 'fangs':
            line(ctx, cx - R * 0.3, my - R * 0.05, cx + R * 0.3, my - R * 0.05, OUT, 2.5 * k);
            poly(ctx, [cx - R * 0.22, my - R * 0.05, cx - R * 0.14, my + R * 0.25, cx - R * 0.06, my - R * 0.05], '#ffffff', OUT, 1.5 * k);
            poly(ctx, [cx + R * 0.06, my - R * 0.05, cx + R * 0.14, my + R * 0.25, cx + R * 0.22, my - R * 0.05], '#ffffff', OUT, 1.5 * k);
            break;
        case 'smile': ctx.beginPath(); ctx.arc(cx, my - R * 0.15, R * 0.28, 0.25, Math.PI - 0.25); ctx.lineWidth = 2.6 * k; ctx.strokeStyle = OUT; ctx.stroke(); break;
        case 'tube': rrFill(ctx, cx - R * 0.18, my - R * 0.15, R * 0.36, R * 0.5, R * 0.14, shade(c.col, -0.15), OUT, 2.2 * k); ell(ctx, cx, my + R * 0.35, R * 0.17, R * 0.1, '#1a1a1a', OUT, 1.5 * k); break;
        case 'beak': poly(ctx, [cx - R * 0.2, my - R * 0.2, cx + R * 0.2, my - R * 0.2, cx, my + R * 0.45], '#f2b134', OUT, 2.2 * k); break;
        case 'grill': rrFill(ctx, cx - R * 0.4, my - R * 0.1, R * 0.8, R * 0.3, R * 0.06, '#22262c', OUT, 2 * k); if (!sil) for (let i = 1; i < 4; i++) line(ctx, cx - R * 0.4 + i * R * 0.2, my - R * 0.06, cx - R * 0.4 + i * R * 0.2, my + R * 0.16, '#6d7680', 1.5 * k); break;
        case 'tusks':
            teeth(ctx, cx, my, R * 0.55, R * 0.24);
            for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * R * 0.3, my); ctx.quadraticCurveTo(cx + s * R * 0.75, my + R * 0.45, cx + s * R * 0.45, my + R * 0.75); ctx.lineCap = 'round'; ctx.lineWidth = 7 * k; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 4 * k; ctx.strokeStyle = '#f5ecd7'; ctx.stroke(); }
            break;
    }
    // ---- in front
    if (c.side === 'claws') {
        for (const s of [-1, 1]) {
            const x = cx + s * R * 1.15, y = cy + R * 0.25;
            circ(ctx, x, y, R * 0.32, side, OUT, lw * 0.8);
            poly(ctx, [x + s * R * 0.1, y - R * 0.15, x + s * R * 0.55, y - R * 0.5, x + s * R * 0.3, y], side, OUT, lw * 0.6);
        }
    } else if (c.side === 'arms') {
        for (const s of [-1, 1]) {
            ell(ctx, cx + s * R * 1.08, cy + R * 0.15, R * 0.3, R * 0.5, side, OUT, lw * 0.8, s * 0.3);
            circ(ctx, cx + s * R * 1.22, cy + R * 0.62, R * 0.24, dark, OUT, lw * 0.7);
        }
    }
    if (c.shield) {
        ctx.save(); ctx.translate(cx - R * 0.95, cy + R * 0.15);
        poly(ctx, [0, -R * 0.75, R * 0.45, -R * 0.55, R * 0.42, R * 0.3, 0, R * 0.75, -R * 0.42, R * 0.3, -R * 0.45, -R * 0.55], c.shield, OUT, lw * 0.8);
        if (!sil) line(ctx, 0, -R * 0.5, 0, R * 0.5, 'rgba(255,255,255,0.6)', 2 * k);
        ctx.restore();
    }
}

const CREATURES: { [sprite: string]: Creature } = {
    // ---- frozen rift
    e_icebomb: { w: 56, h: 60, body: 'round', col: '#9fdcf5', pattern: 'cracks', patCol: '#5fa8cf', eyes: 2, mouth: 'smile', top: 'crystal' },
    e_frostjugg: { w: 150, h: 140, body: 'flat', col: '#8db5d6', size: 1.05, pattern: 'plates', eyes: 2, eyeStyle: 'angry', mouth: 'tusks', top: 'crystal', side: 'legs' },
    e_frostqueen: { w: 140, h: 140, body: 'diamond', col: '#a9e6ff', size: 1.05, pattern: 'cracks', patCol: '#6fb6dc', eyes: 3, mouth: 'none', top: 'crown', topCol: '#dff6ff', side: 'wings' },
    e_frostboss: { w: 210, h: 200, body: 'tall', col: '#7aaee0', size: 1.08, pattern: 'cracks', patCol: '#d8f3ff', eyes: 1, eyeStyle: 'glow', eyeCol: '#e9fdff', mouth: 'maw', top: 'crystal', side: 'arms', glow: '#c9f6ff' },
    // ---- molten forge
    e_lavaworm: { w: 72, h: 56, body: 'segment', col: '#d9542b', pattern: 'cracks', patCol: '#ffb02e', eyes: 2, mouth: 'fangs', top: 'flame' },
    e_forgejugg: { w: 150, h: 140, body: 'box', col: '#5d4b45', pattern: 'cracks', patCol: '#ff8a2e', eyes: 2, eyeStyle: 'glow', eyeCol: '#ffd166', mouth: 'grill', top: 'spikes', topCol: '#3a2e2a', side: 'arms', glow: '#ffb02e' },
    e_flamequeen: { w: 140, h: 140, body: 'tall', col: '#ff7a2e', pattern: 'stripes', patCol: '#c9431a', eyes: 4, mouth: 'beak', top: 'antenna', side: 'wings', sideCol: 'rgba(255,190,90,0.85)' },
    e_forgeboss: { w: 210, h: 200, body: 'round', col: '#3f3633', size: 1.05, pattern: 'rivets', patCol: '#8d7b72', eyes: 3, eyeStyle: 'glow', eyeCol: '#ffb02e', mouth: 'maw', top: 'flame', side: 'legs', glow: '#ff7a1a' },
    // ---- void harbor
    e_blinker: { w: 54, h: 60, body: 'diamond', col: '#8a5cff', eyes: 1, mouth: 'none', side: 'fins', aura: '#78f0ff' },
    e_voidjugg: { w: 150, h: 140, body: 'blob', col: '#4b2f8f', size: 1.05, pattern: 'spots', patCol: '#3a2270', eyes: 5, mouth: 'teeth', top: 'horns', topCol: '#c9b8ff', side: 'tentacles' },
    e_voidqueen: { w: 140, h: 140, body: 'jelly', col: '#b07cff', size: 1.05, pattern: 'spots', patCol: '#d8b8ff', eyes: 2, mouth: 'smile', top: 'halo', topCol: '#9ff8ff', side: 'tentacles', sideCol: '#9a6be6' },
    e_voidboss: { w: 210, h: 200, body: 'round', col: '#2c1d5c', size: 1.05, eyes: 1, eyeStyle: 'big', mouth: 'maw', top: 'spikes', topCol: '#1b1240', side: 'tentacles', aura: '#78f0ff', rings: '#9ff8ff' },
    // ---- toxic marsh
    e_healer: { w: 58, h: 66, body: 'tall', col: '#efe1c0', size: 0.9, eyes: 2, mouth: 'smile', top: 'cap', topCol: '#58c46a', aura: '#7dff8a' },
    e_gasbag: { w: 62, h: 62, body: 'round', col: '#a6e35f', pattern: 'spots', patCol: '#7cc23d', eyes: 2, mouth: 'tube', top: 'antenna' },
    e_hopper: { w: 64, h: 56, body: 'flat', col: '#4caf50', pattern: 'spots', patCol: '#2e8b3e', eyes: 2, eyeStyle: 'frog', mouth: 'smile', side: 'legs' },
    e_mosquito: { w: 56, h: 56, body: 'tall', col: '#7a5a8c', size: 0.8, eyes: 2, eyeStyle: 'big', mouth: 'beak', side: 'wings' },
    e_frogking: { w: 150, h: 140, body: 'flat', col: '#2e8b84', size: 1.1, pattern: 'spots', patCol: '#2a6b28', eyes: 2, eyeStyle: 'frog', mouth: 'teeth', top: 'crown', side: 'legs' },
    e_blightmother: { w: 140, h: 140, body: 'blob', col: '#7c8f2a', size: 1.05, pattern: 'moss', patCol: '#b5c94a', eyes: 3, mouth: 'tube', top: 'cap', topCol: '#9b4dbf', side: 'tentacles' },
    e_marshlord: { w: 210, h: 200, body: 'tall', col: '#2f6b3a', size: 1.08, pattern: 'moss', patCol: '#4f9a4a', eyes: 2, eyeStyle: 'glow', eyeCol: '#e8ff6b', mouth: 'maw', top: 'antlers', side: 'arms' },
    // ---- dune ruins
    e_burrower: { w: 60, h: 58, body: 'round', col: '#d9a85b', pattern: 'stripes', patCol: '#b8863f', eyes: 2, mouth: 'fangs', top: 'horns' },
    e_scorpion: { w: 68, h: 60, body: 'flat', col: '#c47a3a', pattern: 'plates', eyes: 2, eyeStyle: 'angry', mouth: 'fangs', side: 'claws', tail: 'stinger' },
    e_dustwhirl: { w: 54, h: 54, body: 'round', col: '#e6c98a', pattern: 'swirl', patCol: '#b8975a', eyes: 2, mouth: 'smile' },
    e_cactus: { w: 56, h: 70, body: 'tall', col: '#5a9e4b', pattern: 'needles', eyes: 2, mouth: 'smile', top: 'flower' },
    e_sandworm: { w: 160, h: 140, body: 'segment', col: '#b8834a', size: 1.05, pattern: 'stripes', patCol: '#94653a', eyes: 4, mouth: 'maw', top: 'spikes', topCol: '#7a5230' },
    e_scorpqueen: { w: 140, h: 140, body: 'flat', col: '#a0522d', pattern: 'plates', eyes: 4, mouth: 'fangs', top: 'crown', side: 'claws', tail: 'stinger' },
    e_dunetyrant: { w: 210, h: 200, body: 'box', col: '#c9a56b', size: 1.02, pattern: 'stripes', patCol: '#3f7fbf', eyes: 2, eyeStyle: 'glow', eyeCol: '#7ff0ff', mouth: 'grill', top: 'crown', topCol: '#ffd166', side: 'arms' },
    // ---- scrap ruins
    e_sentry: { w: 60, h: 64, body: 'box', col: '#7d8a96', size: 0.85, pattern: 'rivets', patCol: '#4d5761', eyes: 1, eyeStyle: 'visor', mouth: 'none', top: 'dish', side: 'legs' },
    e_drone: { w: 58, h: 52, body: 'round', col: '#c7cdd4', size: 0.85, eyes: 1, eyeStyle: 'visor', mouth: 'none', top: 'antenna', side: 'thrusters' },
    e_shieldbot: { w: 80, h: 80, body: 'box', col: '#5c7a99', pattern: 'rivets', patCol: '#3c5269', eyes: 1, eyeStyle: 'visor', eyeCol: '#6fe3ff', mouth: 'grill', side: 'arms', shield: '#9fb8cf' },
    e_spark: { w: 46, h: 52, body: 'diamond', col: '#ffd23f', size: 0.8, eyes: 2, eyeStyle: 'angry', mouth: 'none', top: 'mohawk', topCol: '#7fe7ff', aura: '#7fe7ff' },
    e_mech: { w: 150, h: 140, body: 'box', col: '#56606b', pattern: 'rivets', patCol: '#2f363d', eyes: 1, eyeStyle: 'visor', eyeCol: '#ff4d4d', mouth: 'grill', top: 'spikes', topCol: '#3c444c', side: 'arms', glow: '#7fe7ff' },
    e_factory: { w: 140, h: 140, body: 'round', col: '#8a939c', pattern: 'rivets', patCol: '#5a636c', eyes: 3, eyeStyle: 'glow', eyeCol: '#ffd166', mouth: 'grill', top: 'dish', side: 'thrusters' },
    e_overlord: { w: 210, h: 200, body: 'diamond', col: '#3f4a57', size: 1.05, pattern: 'rivets', patCol: '#7fe7ff', eyes: 1, eyeStyle: 'big', mouth: 'grill', top: 'halo', topCol: '#7fe7ff', side: 'tentacles', sideCol: '#5c6b7a', glow: '#ff4d4d' },
    // ---- star abyss
    e_orbiter: { w: 60, h: 54, body: 'round', col: '#5ad1ff', size: 0.85, eyes: 2, mouth: 'smile', rings: '#ffe08a' },
    e_starling: { w: 40, h: 40, body: 'spiky', col: '#ffe8a3', size: 0.7, eyes: 2, mouth: 'none' },
    e_nebulaspore: { w: 58, h: 60, body: 'jelly', col: '#ff8ad8', size: 0.9, eyes: 2, mouth: 'smile', top: 'halo', aura: '#ffb3ec' },
    e_starbeast: { w: 150, h: 140, body: 'spiky', col: '#2b3a7a', size: 1.05, pattern: 'spots', patCol: '#ffe08a', eyes: 3, eyeStyle: 'angry', mouth: 'maw', side: 'legs' },
    e_nebulaqueen: { w: 140, h: 140, body: 'jelly', col: '#d96cff', size: 1.05, pattern: 'swirl', patCol: '#ffb3ff', eyes: 3, mouth: 'smile', top: 'crown', side: 'wings', sideCol: 'rgba(255,190,255,0.8)' },
    e_starcore: { w: 210, h: 200, body: 'round', col: '#ffcf4d', size: 1.0, pattern: 'swirl', patCol: '#ff9f2e', eyes: 1, eyeStyle: 'big', mouth: 'teeth', top: 'spikes', topCol: '#ff7a1a', rings: '#9ff8ff', aura: '#fff3a0' },
};

// ---------------------------------------------------------------- extra item glyphs (each item has its own icon)
const GLYPHS2: { [k: string]: (ctx: C2D) => void } = {
    exo: ctx => { rrFill(ctx, 16, 12, 32, 40, 8, W, OUT, 4); line(ctx, 32, 14, 32, 50, OUT, 3); for (let i = 0; i < 3; i++) line(ctx, 18, 22 + i * 10, 46, 22 + i * 10, OUT, 3); rrFill(ctx, 6, 16, 10, 22, 4, W, OUT, 3); rrFill(ctx, 48, 16, 10, 22, 4, W, OUT, 3); },
    heartplus: ctx => { GLYPHS.heart(ctx); poly(ctx, [29, 24, 35, 24, 35, 30, 41, 30, 41, 36, 35, 36, 35, 42, 29, 42, 29, 36, 23, 36, 23, 30, 29, 30], OUT, undefined); },
    crosshair: ctx => { circ(ctx, 32, 32, 16, undefined, OUT, 5); circ(ctx, 32, 32, 16, undefined, W, 2.5); for (const [x1, y1, x2, y2] of [[32, 4, 32, 20], [32, 44, 32, 60], [4, 32, 20, 32], [44, 32, 60, 32]]) { line(ctx, x1, y1, x2, y2, OUT, 7); line(ctx, x1, y1, x2, y2, W, 3); } circ(ctx, 32, 32, 4, W, OUT, 2.5); },
    sprout: ctx => { poly(ctx, [16, 36, 48, 36, 44, 56, 20, 56], W, OUT, 4); line(ctx, 32, 36, 32, 18, OUT, 4); ell(ctx, 22, 18, 9, 5, W, OUT, 3, 0.5); ell(ctx, 42, 14, 9, 5, W, OUT, 3, -0.5); },
    gyro: ctx => { circ(ctx, 32, 32, 7, W, OUT, 3.5); ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; for (const r of [-0.6, 0.6]) { ctx.beginPath(); ctx.ellipse(32, 32, 24, 9, r, 0, TAU); ctx.stroke(); } ctx.lineWidth = 2; ctx.strokeStyle = W; for (const r of [-0.6, 0.6]) { ctx.beginPath(); ctx.ellipse(32, 32, 24, 9, r, 0, TAU); ctx.stroke(); } ctx.restore(); },
    ticket: ctx => { poly(ctx, [8, 18, 56, 18, 56, 28, 52, 32, 56, 36, 56, 46, 8, 46, 8, 36, 12, 32, 8, 28], W, OUT, 4); for (let y = 22; y < 44; y += 6) line(ctx, 40, y, 40, y + 3, OUT, 2.5); line(ctx, 16, 28, 32, 28, OUT, 3); line(ctx, 16, 36, 28, 36, OUT, 3); },
    bubble: ctx => { circ(ctx, 32, 32, 23, W, OUT, 4); ctx.save(); ctx.globalAlpha = 0.5; circ(ctx, 32, 32, 15, undefined, OUT, 2.5); ctx.restore(); ell(ctx, 23, 22, 6, 3.5, OUT, undefined, 0, -0.6); },
    mail: ctx => { poly(ctx, [18, 10, 46, 10, 56, 22, 48, 26, 48, 54, 16, 54, 16, 26, 8, 22], W, OUT, 4); ctx.save(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; for (let y = 28; y < 52; y += 6) for (let x = 20; x < 46; x += 6) { ctx.beginPath(); ctx.arc(x + 3, y, 2.5, 0, Math.PI); ctx.stroke(); } ctx.restore(); },
    oilcan: ctx => { rrFill(ctx, 12, 26, 30, 28, 4, W, OUT, 4); poly(ctx, [42, 32, 58, 20, 60, 24, 44, 40], W, OUT, 3.5); rrFill(ctx, 20, 18, 14, 8, 2, W, OUT, 3); ctx.beginPath(); ctx.moveTo(60, 28); ctx.quadraticCurveTo(64, 36, 60, 38); ctx.quadraticCurveTo(56, 36, 60, 28); ctx.fillStyle = OUT; ctx.fill(); },
    tooth: ctx => { ctx.beginPath(); ctx.moveTo(14, 18); ctx.quadraticCurveTo(14, 8, 24, 10); ctx.quadraticCurveTo(32, 14, 40, 10); ctx.quadraticCurveTo(50, 8, 50, 18); ctx.quadraticCurveTo(50, 30, 44, 36); ctx.lineTo(42, 54); ctx.lineTo(36, 54); ctx.lineTo(32, 40); ctx.lineTo(28, 54); ctx.lineTo(22, 54); ctx.lineTo(20, 36); ctx.quadraticCurveTo(14, 30, 14, 18); ctx.closePath(); ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); },
    bat: ctx => { poly(ctx, [32, 26, 40, 20, 46, 24, 58, 18, 54, 34, 46, 32, 40, 40, 32, 34, 24, 40, 18, 32, 10, 34, 6, 18, 18, 24, 24, 20], W, OUT, 3.5); circ(ctx, 29, 28, 1.8, OUT); circ(ctx, 35, 28, 1.8, OUT); },
    belt: ctx => { ctx.save(); ctx.translate(32, 32); ctx.rotate(-0.5); rrFill(ctx, -28, -6, 56, 12, 4, W, OUT, 3.5); for (let i = -2; i <= 2; i++) rrFill(ctx, i * 10 - 3, -16, 6, 12, 3, W, OUT, 2.5); ctx.restore(); },
    vortex: ctx => { circ(ctx, 32, 32, 24, W, OUT, 4); ctx.save(); ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.15) { const r = 2 + a * 1.4; const x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); },
    tri: ctx => { for (const [x, y, a] of [[18, 40, -0.5], [32, 34, 0], [46, 40, 0.5]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); poly(ctx, [-5, 14, -5, -4, 0, -14, 5, -4, 5, 14], W, OUT, 3); ctx.restore(); } },
    speedo: ctx => { ctx.beginPath(); ctx.arc(32, 40, 24, Math.PI, 0); ctx.closePath(); ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); for (let i = 0; i <= 4; i++) { const a = Math.PI + i * Math.PI / 4; line(ctx, 32 + Math.cos(a) * 18, 40 + Math.sin(a) * 18, 32 + Math.cos(a) * 23, 40 + Math.sin(a) * 23, OUT, 2.5); } line(ctx, 32, 40, 48, 26, OUT, 4); circ(ctx, 32, 40, 4, OUT); },
    axe: ctx => { line(ctx, 18, 56, 40, 14, OUT, 7); line(ctx, 18, 56, 40, 14, W, 3); ctx.beginPath(); ctx.moveTo(36, 10); ctx.quadraticCurveTo(58, 10, 58, 32); ctx.lineTo(42, 26); ctx.closePath(); ctx.fillStyle = W; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke(); },
    trio: ctx => { for (const [x, y] of [[20, 24], [44, 24], [32, 44]]) { circ(ctx, x, y, 8, W, OUT, 3); line(ctx, x - 12, y - 8, x + 12, y - 8, OUT, 3); } },
    flag: ctx => { line(ctx, 14, 8, 14, 58, OUT, 5); poly(ctx, [14, 10, 54, 14, 44, 24, 54, 34, 14, 32], W, OUT, 4); poly(ctx, [24, 18, 28, 14, 32, 18, 28, 26], OUT, undefined); },
    gem: ctx => { poly(ctx, [18, 14, 46, 14, 56, 26, 32, 56, 8, 26], W, OUT, 4); line(ctx, 8, 26, 56, 26, OUT, 3); line(ctx, 22, 26, 32, 56, OUT, 2.5); line(ctx, 42, 26, 32, 56, OUT, 2.5); line(ctx, 24, 14, 22, 26, OUT, 2.5); line(ctx, 40, 14, 42, 26, OUT, 2.5); },
};
for (const k in GLYPHS2) GLYPHS[k] = GLYPHS2[k];

export const GLYPH_NAMES = Object.keys(GLYPHS);

// ---------------------------------------------------------------- registration
// ---------------------------------------------------------------- stage enemy variants
function rgb2hsl(r: number, g: number, b: number): number[] {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
}
function hsl2rgb(h: number, s: number, l: number): number[] {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t: number) => {
        t = ((t % 1) + 1) % 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 0.5) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    return [f(h / 360 + 1 / 3) * 255, f(h / 360) * 255, f(h / 360 - 1 / 3) * 255];
}

/** Draws `d` off-screen, moves its colored pixels to the target hue, then adds the stage overlay. */
function drawVariant(ctx: C2D, d: (ctx: C2D, w: number, h: number, sil: boolean) => void, w: number, h: number, art: EnemyArt) {
    const S = Atlas.scale;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
    const x = c.getContext('2d');
    x.scale(S, S);
    d(x, w, h, false);
    const img = x.getImageData(0, 0, c.width, c.height), px = img.data;
    const satMul = art.sat === undefined ? 1 : art.sat, lAdd = art.light || 0;
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        const hsl = rgb2hsl(px[i], px[i + 1], px[i + 2]);
        const ss = hsl[1], ll = hsl[2];
        // keep outlines, eyes, teeth and highlights; recolor the body
        if (ss < 0.22 || ll < 0.13 || ll > 0.93) continue;
        // the glowing yellow eyes stay yellow in every stage
        if (hsl[0] > 38 && hsl[0] < 62 && ss > 0.6 && ll > 0.5) continue;
        const o = hsl2rgb(art.hue, Math.min(1, ss * satMul), Math.max(0.05, Math.min(0.92, ll + lAdd)));
        px[i] = o[0]; px[i + 1] = o[1]; px[i + 2] = o[2];
    }
    x.putImageData(img, 0, 0);
    ctx.drawImage(c, 0, 0, w, h);
    if (art.overlay) drawOverlay(ctx, art.overlay, w, h);
}

function drawOverlay(ctx: C2D, kind: 'ice' | 'lava' | 'void', w: number, h: number) {
    const cx = w / 2, cy = h * 0.55, k = Math.min(w, h) / 60;
    if (kind === 'ice') {
        // ice shards on the head and shoulders
        const shard = (x: number, y: number, s: number, a: number) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(a);
            poly(ctx, [0, -s, s * 0.45, 0, 0, s * 0.35, -s * 0.45, 0], '#e8f7ff', OUT, 1.6 * k);
            poly(ctx, [0, -s, s * 0.45, 0, 0, 0], '#ffffff', undefined);
            ctx.restore();
        };
        shard(cx - 9 * k, cy - 16 * k, 7 * k, -0.4);
        shard(cx + 1 * k, cy - 20 * k, 8 * k, 0.05);
        shard(cx + 10 * k, cy - 15 * k, 6 * k, 0.45);
    } else if (kind === 'lava') {
        // glowing cracks
        ctx.save();
        ctx.lineCap = 'round';
        const crack = (pts: number[]) => {
            ctx.beginPath(); ctx.moveTo(cx + pts[0] * k, cy + pts[1] * k);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(cx + pts[i] * k, cy + pts[i + 1] * k);
            ctx.strokeStyle = 'rgba(255,90,20,0.9)'; ctx.lineWidth = 3.2 * k; ctx.stroke();
            ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 1.3 * k; ctx.stroke();
        };
        crack([-14, 4, -9, 8, -11, 13]);
        crack([10, 2, 14, 7, 11, 12]);
        crack([-3, 13, 2, 16]);
        ctx.restore();
    } else {
        // void: faint glow ring and floating sparks
        ctx.save();
        ctx.strokeStyle = 'rgba(120,240,255,0.55)'; ctx.lineWidth = 1.6 * k;
        ctx.beginPath(); ctx.ellipse(cx, cy + 2 * k, 24 * k, 22 * k, 0, 0, TAU); ctx.stroke();
        const sparks = [[-18, -14, 2.4], [17, -10, 2], [12, 16, 1.8], [-15, 14, 1.6]];
        for (const sp of sparks) {
            circ(ctx, cx + sp[0] * k, cy + sp[1] * k, sp[2] * k + 1.5, 'rgba(120,240,255,0.35)');
            circ(ctx, cx + sp[0] * k, cy + sp[1] * k, sp[2] * k * 0.6, '#d8fdff');
        }
        ctx.restore();
    }
}

export function registerArt() {
    // characters
    for (const c of CHARACTERS) {
        Atlas.add('c_' + c.id, 72, 78, (ctx, w, h, sil) => drawCharacter(ctx, c, w, h, sil), true);
    }
    // enemies (EYE_CX lets the glowing eyes slant toward the middle of each monster)
    const withEyes = (d: (ctx: C2D, w: number, h: number, sil: boolean) => void) =>
        (ctx: C2D, w: number, h: number, sil: boolean) => { EYE_CX = w / 2; try { d(ctx, w, h, sil); } finally { EYE_CX = -1; } };
    for (const k in ENEMY_DRAW) {
        const e = ENEMY_DRAW[k];
        Atlas.add(k, e.w, e.h, withEyes(e.d), true);
    }
    // stage variants: recolored copies of the drawings above plus an ice / lava / void overlay
    for (const id in ENEMIES) {
        const def = ENEMIES[id];
        if (ENEMY_DRAW[def.sprite]) continue;
        const cr = CREATURES[def.sprite];
        if (cr) { Atlas.add(def.sprite, cr.w, cr.h, withEyes((ctx, w, h, sil) => drawCreature(ctx, cr, w, h, sil)), true); continue; }
        if (!def.art) continue;
        const base = ENEMY_DRAW[def.art.base];
        if (!base) { console.warn('[Art] missing base drawing', def.art.base); continue; }
        const art = def.art;
        Atlas.add(def.sprite, base.w, base.h, withEyes((ctx, w, h, sil) => {
            if (sil) { base.d(ctx, w, h, true); return; }
            drawVariant(ctx, base.d, w, h, art);
        }), true);
    }
    // weapons
    for (const k in WEAPON_DRAW) {
        const e = WEAPON_DRAW[k];
        Atlas.add(k, e.w, e.h, (ctx, w, h) => e.d(ctx, w, h));
    }
    // glyphs (64x64 logical, drawn at 0.75 to save space -> 48 logical)
    for (const k in GLYPHS) {
        Atlas.add('g_' + k, 48, 48, (ctx) => { ctx.scale(0.75, 0.75); GLYPHS[k](ctx); });
    }
    // bullets / fx
    Atlas.add('dot', 12, 12, (ctx, w) => circ(ctx, w / 2, w / 2, w / 2 - 0.5, '#ffffff'));
    Atlas.add('soft', 32, 32, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    });
    Atlas.add('b_round', 18, 18, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(0.6, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    });
    Atlas.add('b_long', 28, 12, (ctx, w, h) => {
        rr(ctx, 1, 2, w - 2, h - 4, (h - 4) / 2); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
        rr(ctx, 4, 4, w - 6, h - 8, (h - 8) / 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    });
    Atlas.add('b_rocket', 30, 16, (ctx, w, h) => {
        poly(ctx, [4, 3, 20, 3, 28, h / 2, 20, h - 3, 4, h - 3], '#eceff1', OUT, 2);
        poly(ctx, [2, 1, 8, 4, 8, h - 4, 2, h - 1], '#e53935', OUT, 1.5);
        line(ctx, 20, 3, 20, h - 3, '#e53935', 2);
    });
    Atlas.add('b_grenade', 18, 18, (ctx, w) => { circ(ctx, w / 2, w / 2, 7, '#827717', OUT, 2.5); highlight(ctx, 7, 7, 2.5, 1.5, 0.5); });
    Atlas.add('b_fire', 28, 28, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(0.3, 'rgba(255,190,60,0.95)'); g.addColorStop(0.7, 'rgba(255,90,20,0.6)'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    });
    Atlas.add('b_rock', 16, 16, (ctx, w) => poly(ctx, [3, 6, 8, 2, 13, 4, 14, 10, 9, 14, 3, 12], '#a1887f', OUT, 2));
    Atlas.add('b_enemy', 24, 24, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.5, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
        circ(ctx, w / 2, w / 2, 6.5, undefined, OUT, 2);
    });
    Atlas.add('splat', 44, 44, (ctx, w) => {
        ctx.fillStyle = '#ffffff';
        circ(ctx, w / 2, w / 2, 13, '#ffffff');
        const pts = [[8, 10, 6], [36, 12, 5], [34, 34, 7], [10, 34, 5], [22, 4, 4], [40, 24, 4], [4, 22, 4], [24, 40, 4]];
        for (const p of pts) circ(ctx, p[0], p[1], p[2], '#ffffff');
    });
    Atlas.add('puff', 36, 36, (ctx, w) => {
        circ(ctx, 18, 20, 11, '#ffffff'); circ(ctx, 11, 15, 8, '#ffffff'); circ(ctx, 25, 14, 9, '#ffffff'); circ(ctx, 18, 10, 8, '#ffffff');
    });
    Atlas.add('ring', 64, 64, (ctx, w) => { circ(ctx, 32, 32, 28, undefined, '#ffffff', 5); });
    Atlas.add('ringsoft', 128, 128, (ctx, w) => {
        const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 62);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.25)'); g.addColorStop(0.92, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    });
    Atlas.add('spark', 20, 6, (ctx, w, h) => { rr(ctx, 0, 0, w, h, h / 2); ctx.fillStyle = '#ffffff'; ctx.fill(); });
    Atlas.add('beam', 16, 12, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,0.8)'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.7, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    Atlas.add('slash', 120, 120, (ctx) => {
        ctx.beginPath(); ctx.arc(60, 60, 56, -0.9, 0.9); ctx.arc(60, 60, 40, 0.9, -0.9, true); ctx.closePath();
        const g = ctx.createRadialGradient(60, 60, 38, 60, 60, 58);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0.1)');
        ctx.fillStyle = g; ctx.fill();
    });
    Atlas.add('marker', 40, 40, (ctx) => {
        line(ctx, 8, 8, 32, 32, OUT, 10); line(ctx, 32, 8, 8, 32, OUT, 10);
        line(ctx, 8, 8, 32, 32, '#ff3b3b', 6); line(ctx, 32, 8, 8, 32, '#ff3b3b', 6);
    });
    // impact star: four sharp spikes plus a hot core (drawn additively)
    Atlas.add('hitstar', 48, 48, (ctx) => {
        const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 48, 48);
        ctx.fillStyle = '#ffffff';
        const spike = (a: number, L: number, wd: number) => {
            ctx.beginPath();
            ctx.moveTo(24 + Math.cos(a) * L, 24 + Math.sin(a) * L);
            ctx.lineTo(24 + Math.cos(a + Math.PI / 2) * wd, 24 + Math.sin(a + Math.PI / 2) * wd);
            ctx.lineTo(24 - Math.cos(a) * L, 24 - Math.sin(a) * L);
            ctx.lineTo(24 + Math.cos(a - Math.PI / 2) * wd, 24 + Math.sin(a - Math.PI / 2) * wd);
            ctx.closePath(); ctx.fill();
        };
        spike(0, 23, 3.2); spike(Math.PI / 2, 23, 3.2); spike(Math.PI / 4, 13, 2.2); spike(-Math.PI / 4, 13, 2.2);
    });
    // muzzle flash pointing right (+x), origin on the left
    Atlas.add('muzzle', 44, 28, (ctx, w, h) => {
        const g = ctx.createRadialGradient(10, h / 2, 0, 10, h / 2, 14);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.moveTo(4, h / 2 - 5); ctx.lineTo(w - 1, h / 2); ctx.lineTo(4, h / 2 + 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.moveTo(8, h / 2); ctx.lineTo(26, 2); ctx.lineTo(14, h / 2); ctx.lineTo(26, h - 2); ctx.closePath(); ctx.fill();
    });
    // tracer streak: bright head on the right fading to the left
    Atlas.add('streak', 48, 8, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,1)');
        rr(ctx, 0, 1, w, h - 2, (h - 2) / 2); ctx.fillStyle = g; ctx.fill();
    });
    Atlas.add('glow', 64, 64, (ctx, w) => {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.75)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    // soft fluffy smoke
    Atlas.add('smoke', 48, 48, (ctx) => {
        const blob = (x: number, y: number, r: number) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        };
        blob(24, 27, 16); blob(15, 21, 12); blob(33, 20, 12); blob(24, 15, 11);
    });
    Atlas.add('shock', 128, 128, (ctx) => {
        circ(ctx, 64, 64, 58, undefined, 'rgba(255,255,255,0.35)', 10);
        circ(ctx, 64, 64, 60, undefined, '#ffffff', 3.5);
    });
    // gib chunk with the same dark outline as the characters (tinted per enemy)
    Atlas.add('gib', 16, 14, (ctx) => {
        poly(ctx, [3, 5, 7, 2, 12, 3, 14, 8, 10, 12, 4, 11], '#ffffff', OUT, 2);
        ell(ctx, 7, 5, 2, 1.2, 'rgba(255,255,255,0.9)');
    });
    Atlas.add('casing', 10, 6, (ctx) => { rrFill(ctx, 1, 1, 8, 4, 1.5, '#ffca28', OUT, 1.2); });
    Atlas.add('px', 8, 8, (ctx) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 8, 8); });
    Atlas.add('circle', 64, 64, (ctx) => circ(ctx, 32, 32, 31, '#ffffff'));
    // pickups
    // core crystal shard (the materials you collect)
    Atlas.add('mat', 22, 24, (ctx, w, h) => {
        const g = ctx.createRadialGradient(11, 13, 1, 11, 13, 11);
        g.addColorStop(0, 'rgba(62,240,255,0.55)'); g.addColorStop(1, 'rgba(62,240,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        poly(ctx, [11, 2, 18, 9, 15, 22, 7, 22, 4, 9], '#3ee6f8', OUT, 2.5);
        poly(ctx, [11, 4, 15, 9, 11, 20, 8, 10], '#d4fdff', undefined);
    });
    // glowing ring the weapons orbit on (drawn additively, squashed into an ellipse at runtime)
    Atlas.add('orbit', 160, 160, (ctx) => {
        const c = 80;
        const g = ctx.createRadialGradient(c, c, 56, c, c, 80);
        g.addColorStop(0, 'rgba(62,240,255,0)'); g.addColorStop(0.5, 'rgba(62,240,255,0.32)');
        g.addColorStop(0.7, 'rgba(170,250,255,0.85)'); g.addColorStop(0.86, 'rgba(62,240,255,0.28)'); g.addColorStop(1, 'rgba(62,240,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 160);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(230,255,255,0.95)'; ctx.lineWidth = 3.5;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(c, c, 72, i * TAU / 3, i * TAU / 3 + 1.2); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(62,240,255,0.7)'; ctx.lineWidth = 2;
        for (let i = 0; i < 24; i++) {
            const a = i / 24 * TAU;
            ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * 62, c + Math.sin(a) * 62); ctx.lineTo(c + Math.cos(a) * 66, c + Math.sin(a) * 66); ctx.stroke();
        }
    });
    Atlas.add('fruit', 30, 30, (ctx, w, h, sil) => {
        shadow(ctx, 15, 26, 9, 3, sil);
        circ(ctx, 15, 16, 10, '#ff6f91', OUT, 2.5);
        highlight(ctx, 11, 12, 3, 2, 0.6);
        ell(ctx, 19, 5, 5, 2.5, '#69f0ae', OUT, 1.5, -0.5);
    });
    Atlas.add('crate', 38, 36, (ctx, w, h, sil) => {
        shadow(ctx, 19, 32, 15, 4, sil);
        rrFill(ctx, 4, 6, 30, 24, 4, STEEL, OUT, 3);
        rrFill(ctx, 4, 12, 30, 5, 1.5, GOLD, OUT, 2);
        rrFill(ctx, 7, 20, 24, 7, 2, STEEL_D, '');
        cell(ctx, 14, 11, 10, 7);
    });
    Atlas.add('crate_l', 42, 40, (ctx, w, h, sil) => {
        shadow(ctx, 21, 36, 17, 4, sil);
        rrFill(ctx, 4, 6, 34, 28, 4, '#7e57c2', OUT, 3);
        line(ctx, 4, 16, 38, 16, '#ffd166', 3); line(ctx, 21, 6, 21, 34, '#ffd166', 3);
        rrFill(ctx, 16, 12, 10, 8, 2, '#ffd166', OUT, 1.5);
    });
    // structures
    Atlas.add('turret', 50, 52, (ctx, w, h, sil) => {
        shadow(ctx, 25, 46, 18, 5, sil);
        rrFill(ctx, 9, 30, 32, 16, 5, STEEL_D, OUT, 3);
        rrFill(ctx, 9, 36, 32, 4, 1.5, GOLD, '');
        circ(ctx, 25, 26, 12, STEEL, OUT, 3);
        if (sil) circ(ctx, 25, 26, 5, CORE); else energy(ctx, 25, 26, 5, CORE, 1.6);
    });
    Atlas.add('turret_gun', 34, 14, (ctx, w, h) => { rrFill(ctx, 2, 3, 30, 8, 3, GUNMETAL, OUT, 2.5); cell(ctx, 24, 4.5, 6, 5); });
    Atlas.add('mine', 30, 30, (ctx, w, h, sil) => {
        shadow(ctx, 15, 25, 11, 3, sil);
        circ(ctx, 15, 15, 10, '#546e7a', OUT, 2.5);
        circ(ctx, 15, 15, 4, '#ff5252', OUT, 1.5);
    }, true);
    Atlas.add('drone', 32, 32, (ctx) => {
        circ(ctx, 16, 16, 10, '#48dbfb', OUT, 3);
        circ(ctx, 16, 16, 4, '#ffffff', OUT, 1.5);
        line(ctx, 4, 4, 9, 9, OUT, 3); line(ctx, 28, 4, 23, 9, OUT, 3); line(ctx, 4, 28, 9, 23, OUT, 3); line(ctx, 28, 28, 23, 23, OUT, 3);
    });
    // ui bits
    Atlas.add('joy_base', 160, 160, (ctx) => {
        circ(ctx, 80, 80, 74, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.45)', 4);
    });
    Atlas.add('joy_knob', 70, 70, (ctx) => {
        circ(ctx, 35, 35, 30, 'rgba(255,255,255,0.55)', 'rgba(40,30,45,0.6)', 4);
    });
    Atlas.add('vignette', 128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 30, 64, 64, 92);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    });
    // digits for damage numbers
    const chars = '0123456789+KW.';
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        Atlas.add('d_' + (ch === '+' ? 'plus' : ch === '.' ? 'dot' : ch), 20, 28, (ctx, w, h) => {
            ctx.font = '900 24px "Arial Black", Arial, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = OUT;
            ctx.strokeText(ch, w / 2, h / 2 + 1);
            ctx.fillStyle = '#ffffff'; ctx.fillText(ch, w / 2, h / 2 + 1);
        });
    }
}

// ---------------------------------------------------------------- arena floor
/** Core ruins (key art): cracked stone slabs, glowing lava seams, cyan conduits, rune rings and crystals. */
function drawRuins(ctx: C2D, x0: number, y0: number, W: number, H: number, rnd: () => number) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
    // staggered stone slabs
    const SW = 150, SH = 104;
    for (let gy = y0, row = 0; gy < y0 + H; gy += SH, row++) {
        const off = (row % 2) * SW * 0.5;
        for (let gx = x0 - off; gx < x0 + W; gx += SW) {
            const a = rnd() * 0.1;
            ctx.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a * 0.6})` : `rgba(10,5,25,${a})`;
            ctx.fillRect(gx + 3, gy + 3, SW - 6, SH - 6);
            ctx.strokeStyle = 'rgba(22,15,40,0.42)'; ctx.lineWidth = 3;
            ctx.strokeRect(gx + 1.5, gy + 1.5, SW - 3, SH - 3);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(gx + 5, gy + SH - 6); ctx.lineTo(gx + 5, gy + 5); ctx.lineTo(gx + SW - 6, gy + 5); ctx.stroke();
            // the odd broken slab
            if (rnd() < 0.12) {
                ctx.strokeStyle = 'rgba(22,15,40,0.5)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(gx + rnd() * SW, gy + 3); ctx.lineTo(gx + SW * 0.5 + (rnd() - 0.5) * 40, gy + SH * 0.5); ctx.lineTo(gx + rnd() * SW, gy + SH - 3); ctx.stroke();
            }
        }
    }
    // rune rings (faint cyan circles with ticks)
    for (let i = 0; i < 4; i++) {
        const px = x0 + 200 + rnd() * (W - 400), py = y0 + 150 + rnd() * (H - 300), r = 70 + rnd() * 50;
        ctx.strokeStyle = 'rgba(62,240,255,0.14)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, r * 0.72, 0, TAU); ctx.stroke();
        for (let k = 0; k < 12; k++) {
            const a = k / 12 * TAU;
            ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * r * 0.76, py + Math.sin(a) * r * 0.76); ctx.lineTo(px + Math.cos(a) * r * 0.94, py + Math.sin(a) * r * 0.94); ctx.stroke();
        }
    }
    // cyan conduits: right-angle light lines with nodes
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 7; i++) {
        let px = x0 + rnd() * W, py = y0 + rnd() * H;
        const pts = [[px, py]];
        let horiz = rnd() < 0.5;
        for (let k = 0; k < 3 + Math.floor(rnd() * 2); k++) {
            const len = (60 + rnd() * 160) * (rnd() < 0.5 ? -1 : 1);
            if (horiz) px += len; else py += len;
            horiz = !horiz; pts.push([px, py]);
        }
        const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); };
        path(); ctx.strokeStyle = 'rgba(15,10,35,0.55)'; ctx.lineWidth = 8; ctx.stroke();
        ctx.shadowColor = 'rgba(62,240,255,0.9)'; ctx.shadowBlur = 10;
        path(); ctx.strokeStyle = 'rgba(62,240,255,0.55)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.shadowBlur = 0;
        for (const p of pts) { circ(ctx, p[0], p[1], 5, 'rgba(15,10,35,0.7)'); circ(ctx, p[0], p[1], 2.6, 'rgba(160,250,255,0.85)'); }
    }
    // glowing lava seams
    for (let i = 0; i < 16; i++) {
        let px = x0 + rnd() * W, py = y0 + rnd() * H;
        const pts = [[px, py]];
        let dir = rnd() * TAU;
        for (let k = 0; k < 5 + Math.floor(rnd() * 3); k++) {
            dir += (rnd() - 0.5) * 1.4;
            const len = 25 + rnd() * 45;
            px += Math.cos(dir) * len; py += Math.sin(dir) * len;
            pts.push([px, py]);
        }
        const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); };
        path(); ctx.strokeStyle = 'rgba(255,110,30,0.10)'; ctx.lineWidth = 34; ctx.stroke();
        path(); ctx.strokeStyle = 'rgba(255,120,40,0.16)'; ctx.lineWidth = 18; ctx.stroke();
        path(); ctx.strokeStyle = 'rgba(25,8,12,0.8)'; ctx.lineWidth = 10; ctx.stroke();
        ctx.shadowColor = 'rgba(255,110,30,0.95)'; ctx.shadowBlur = 14;
        path(); ctx.strokeStyle = '#ff6a1e'; ctx.lineWidth = 5.5; ctx.stroke();
        ctx.shadowBlur = 0;
        path(); ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2; ctx.stroke();
    }
    // crystal clusters
    const shard = (x: number, y: number, hgt: number, wd: number, lean: number) => {
        const tx = x + lean, ty = y - hgt;
        poly(ctx, [x - wd, y, tx - wd * 0.3, ty + hgt * 0.15, tx, ty, tx + wd * 0.35, ty + hgt * 0.2, x + wd, y], '#46e3f5', 'rgba(16,20,48,0.85)', 2);
        poly(ctx, [x - wd * 0.2, y, tx - wd * 0.1, ty + hgt * 0.12, tx, ty, x + wd * 0.5, y - 1], '#c6fbff', '', 0);
    };
    for (let i = 0; i < 18; i++) {
        const px = x0 + 40 + rnd() * (W - 80), py = y0 + 40 + rnd() * (H - 80);
        const g = ctx.createRadialGradient(px, py - 10, 2, px, py - 10, 46);
        g.addColorStop(0, 'rgba(62,240,255,0.30)'); g.addColorStop(1, 'rgba(62,240,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py - 10, 46, 0, TAU); ctx.fill();
        ell(ctx, px, py + 2, 18, 6, 'rgba(10,5,25,0.35)');
        const n = 3 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) shard(px + (k - n / 2) * 7 + rnd() * 4, py + rnd() * 4, 14 + rnd() * 18, 4 + rnd() * 3, (k - n / 2) * 4);
    }
    ctx.restore();
}

/**
 * Arena floor texture. `res` = texture pixels per world unit (sharper floor on dense phone screens).
 * `pools` are lava pools (world coordinates, origin at the arena center, y up).
 */
export function drawArena(W: number, H: number, border: number, res: number, th: ArenaTheme, pools: { x: number; y: number; r: number }[] = [], poolKind: 'lava' | 'mud' = 'lava'): HTMLCanvasElement {
    const c = document.createElement('canvas');
    const total = { w: W + border * 2, h: H + border * 2 };
    c.width = Math.round(total.w * res); c.height = Math.round(total.h * res);
    const ctx = c.getContext('2d');
    ctx.scale(res, res);
    // outside darkness
    ctx.fillStyle = th.outside; ctx.fillRect(0, 0, total.w, total.h);
    // floor
    const x0 = border, y0 = border;
    const grd = ctx.createRadialGradient(total.w / 2, total.h / 2, 100, total.w / 2, total.h / 2, Math.max(W, H) * 0.7);
    grd.addColorStop(0, th.floor[0]); grd.addColorStop(1, th.floor[1]);
    ctx.fillStyle = grd; ctx.fillRect(x0, y0, W, H);
    let seed = 1234;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // mottled patches
    for (let i = 0; i < 90; i++) {
        const px = x0 + rnd() * W, py = y0 + rnd() * H, r = 30 + rnd() * 90;
        ctx.fillStyle = rnd() < 0.5 ? th.patch[0] : th.patch[1];
        ctx.beginPath(); ctx.ellipse(px, py, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, TAU); ctx.fill();
    }
    if (th.deco === 'grid') {
        // void harbor: faint deck plating
        ctx.strokeStyle = 'rgba(120,200,255,0.07)'; ctx.lineWidth = 2;
        for (let gx = x0; gx <= x0 + W; gx += 120) { ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + H); ctx.stroke(); }
        for (let gy = y0; gy <= y0 + H; gy += 120) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + W, gy); ctx.stroke(); }
    }
    if (th.deco === 'sand') {
        // dunes: wind ripples
        ctx.strokeStyle = 'rgba(150,100,40,0.16)'; ctx.lineWidth = 3;
        for (let i = 0; i < 60; i++) {
            const px = x0 + rnd() * W, py = y0 + rnd() * H, len = 80 + rnd() * 140;
            ctx.beginPath(); ctx.moveTo(px, py);
            ctx.bezierCurveTo(px + len * 0.3, py - 10, px + len * 0.6, py + 10, px + len, py);
            ctx.stroke();
        }
    }
    if (th.deco === 'metal') {
        // scrap ruins: floor plates, rivets and hazard stripes
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 3;
        for (let gx = x0; gx <= x0 + W; gx += 160) { ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + H); ctx.stroke(); }
        for (let gy = y0; gy <= y0 + H; gy += 160) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + W, gy); ctx.stroke(); }
        ctx.fillStyle = 'rgba(210,220,230,0.25)';
        for (let gx = x0; gx <= x0 + W; gx += 160) for (let gy = y0; gy <= y0 + H; gy += 160) for (const [ox, oy] of [[10, 10], [-10, 10], [10, -10], [-10, -10]]) { ctx.beginPath(); ctx.arc(gx + ox, gy + oy, 2.5, 0, TAU); ctx.fill(); }
        for (let i = 0; i < 7; i++) {
            const px = x0 + 80 + rnd() * (W - 260), py = y0 + 80 + rnd() * (H - 120);
            ctx.save(); ctx.beginPath(); ctx.rect(px, py, 180, 26); ctx.clip();
            ctx.fillStyle = 'rgba(255,200,40,0.35)'; ctx.fillRect(px, py, 180, 26);
            ctx.fillStyle = 'rgba(20,20,20,0.45)';
            for (let k = -2; k < 12; k++) { ctx.beginPath(); ctx.moveTo(px + k * 22, py + 26); ctx.lineTo(px + k * 22 + 11, py + 26); ctx.lineTo(px + k * 22 + 37, py); ctx.lineTo(px + k * 22 + 26, py); ctx.closePath(); ctx.fill(); }
            ctx.restore();
        }
    }
    if (th.deco === 'ice') {
        // frozen rift: cracks in the ice
        ctx.strokeStyle = 'rgba(70,120,160,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 26; i++) {
            let px = x0 + rnd() * W, py = y0 + rnd() * H;
            ctx.beginPath(); ctx.moveTo(px, py);
            for (let k = 0; k < 4; k++) { px += (rnd() - 0.5) * 120; py += (rnd() - 0.5) * 120; ctx.lineTo(px, py); }
            ctx.stroke();
        }
    }
    if (th.deco === 'ruins') drawRuins(ctx, x0, y0, W, H, rnd);
    // specks
    for (let i = 0; i < 2600; i++) {
        const px = x0 + rnd() * W, py = y0 + rnd() * H;
        ctx.fillStyle = rnd() < 0.7 ? th.speck[0] : th.speck[1];
        const s = 1 + rnd() * 2.2;
        ctx.fillRect(px, py, s, s);
    }
    // pebbles
    for (let i = 0; i < 220; i++) {
        const px = x0 + 10 + rnd() * (W - 20), py = y0 + 10 + rnd() * (H - 20);
        const r = 2 + rnd() * 4;
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(px + 1, py + 2, r, r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rnd() < 0.5 ? th.pebble[0] : th.pebble[1];
        ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(35,26,38,0.7)'; ctx.stroke();
    }
    // tufts: grass / ice crystals / embers / glowing nodes
    for (let i = 0; i < 140; i++) {
        const px = x0 + 10 + rnd() * (W - 20), py = y0 + 10 + rnd() * (H - 20);
        if (th.deco === 'grass') {
            ctx.strokeStyle = th.tuft; ctx.lineWidth = 2; ctx.lineCap = 'round';
            const n = 2 + Math.floor(rnd() * 3);
            for (let k = 0; k < n; k++) {
                ctx.beginPath(); ctx.moveTo(px + k * 3 - 3, py); ctx.lineTo(px + k * 3 - 3 + (rnd() - 0.5) * 6, py - 5 - rnd() * 6); ctx.stroke();
            }
        } else if (th.deco === 'ice') {
            const s = 4 + rnd() * 5;
            poly(ctx, [px, py - s * 1.6, px + s * 0.6, py, px, py + s * 0.3, px - s * 0.6, py], th.tuft, 'rgba(40,70,100,0.6)', 1.2);
        } else if (th.deco === 'ember') {
            circ(ctx, px, py, 1.5 + rnd() * 2, th.tuft);
        } else if (th.deco === 'ruins') {
            // drifting sparks: mostly cyan core dust, some lava embers
            const ember = rnd() < 0.35;
            circ(ctx, px, py, 3 + rnd() * 2, ember ? 'rgba(255,140,50,0.14)' : 'rgba(62,240,255,0.12)');
            circ(ctx, px, py, 1 + rnd() * 1.2, ember ? 'rgba(255,190,90,0.8)' : th.tuft);
        } else if (th.deco === 'sand' || th.deco === 'metal') {
            circ(ctx, px, py, 1.2 + rnd() * 1.6, th.tuft);
        } else if (th.deco === 'stars') {
            const s2 = 2 + rnd() * 3;
            ctx.fillStyle = th.tuft;
            ctx.beginPath(); ctx.moveTo(px, py - s2 * 2); ctx.lineTo(px + s2 * 0.5, py); ctx.lineTo(px, py + s2 * 2); ctx.lineTo(px - s2 * 0.5, py); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(px - s2 * 2, py); ctx.lineTo(px, py + s2 * 0.5); ctx.lineTo(px + s2 * 2, py); ctx.lineTo(px, py - s2 * 0.5); ctx.closePath(); ctx.fill();
        } else {
            circ(ctx, px, py, 3 + rnd() * 2, 'rgba(110,240,255,0.12)');
            circ(ctx, px, py, 1.2 + rnd(), th.tuft);
        }
    }
    // lava pools (molten forge)
    for (const p of pools) {
        const px = total.w / 2 + p.x, py = total.h / 2 - p.y; // world y is up, canvas y is down
        const lg = ctx.createRadialGradient(px, py, p.r * 0.15, px, py, p.r);
        if (poolKind === 'mud') { lg.addColorStop(0, '#6b5a2e'); lg.addColorStop(0.7, '#4c4222'); lg.addColorStop(1, '#2f2a16'); }
        else { lg.addColorStop(0, '#fff2a8'); lg.addColorStop(0.35, '#ffb02e'); lg.addColorStop(0.8, '#ff4d17'); lg.addColorStop(1, '#a3200f'); }
        ctx.beginPath();
        for (let k = 0; k <= 18; k++) {
            const a = k / 18 * TAU, rr2 = p.r * (0.9 + 0.1 * Math.sin(a * 3 + p.x));
            const qx = px + Math.cos(a) * rr2, qy = py + Math.sin(a) * rr2;
            if (k === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
        }
        ctx.closePath();
        ctx.fillStyle = lg; ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = poolKind === 'mud' ? '#1c1a0c' : '#2a1410'; ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = poolKind === 'mud' ? 'rgba(160,200,90,0.5)' : 'rgba(255,200,90,0.6)'; ctx.stroke();
        if (poolKind === 'mud') for (let b = 0; b < 4; b++) circ(ctx, px + (rnd() - 0.5) * p.r, py + (rnd() - 0.5) * p.r * 0.8, 3 + rnd() * 4, 'rgba(160,190,90,0.45)');
    }
    // cliff border: jagged dark rim
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, total.w, total.h);
    const jag = (len: number, cb: (t: number, o: number) => void) => {
        for (let t = 0; t <= len; t += 14) cb(t, 6 + rnd() * 14);
    };
    const pts: number[][] = [];
    jag(W, (t, o) => pts.push([x0 + t, y0 + o]));
    jag(H, (t, o) => pts.push([x0 + W - o, y0 + t]));
    jag(W, (t, o) => pts.push([x0 + W - t, y0 + H - o]));
    jag(H, (t, o) => pts.push([x0 + o, y0 + H - t]));
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    ctx.fillStyle = th.rim;
    ctx.fill('evenodd');
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.closePath();
    ctx.lineWidth = 4; ctx.strokeStyle = shade(th.rim, 0.22); ctx.stroke();
    // inner shadow
    const ig = 40;
    const sides: [number, number, number, number, number, number, number, number][] = [
        [x0, y0, W, ig, x0, y0, x0, y0 + ig], [x0, y0 + H - ig, W, ig, x0, y0 + H, x0, y0 + H - ig],
        [x0, y0, ig, H, x0, y0, x0 + ig, y0], [x0 + W - ig, y0, ig, H, x0 + W, y0, x0 + W - ig, y0],
    ];
    for (const s of sides) {
        const g = ctx.createLinearGradient(s[4], s[5], s[6], s[7]);
        g.addColorStop(0, 'rgba(10,5,10,0.45)'); g.addColorStop(1, 'rgba(10,5,10,0)');
        ctx.fillStyle = g; ctx.fillRect(s[0], s[1], s[2], s[3]);
    }
    return c;
}
