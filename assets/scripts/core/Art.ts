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
function eye(ctx: C2D, x: number, y: number, r: number, px = 0.25, py = 0.1, pupil = 0.5) {
    circ(ctx, x, y, r, '#ffffff', OUT, Math.max(1.5, r * 0.28));
    circ(ctx, x + r * px, y + r * py, r * pupil, OUT);
    circ(ctx, x + r * px - r * 0.18, y + r * py - r * 0.2, r * 0.16, '#ffffff');
}
function highlight(ctx: C2D, x: number, y: number, rx: number, ry: number, a = 0.35) {
    ell(ctx, x, y, rx, ry, `rgba(255,255,255,${a})`, undefined, 0, -0.5);
}

// ---------------------------------------------------------------- characters
function drawCharacter(ctx: C2D, c: CharDef, w: number, h: number, sil: boolean) {
    const cx = w / 2, cy = h * 0.56, r = 21;
    shadow(ctx, cx, h - 7, 18, 5, sil);
    // feet
    ell(ctx, cx - 9, cy + r - 1, 6, 4, shade(c.color, -0.35), OUT, 2.5);
    ell(ctx, cx + 9, cy + r - 1, 6, 4, shade(c.color, -0.35), OUT, 2.5);
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
    highlight(ctx, cx - 8, cy - 9, 7, 4);
    // chest core light
    circ(ctx, cx, cy + 9, 4, c.accent, OUT, 2);
    circ(ctx, cx - 1, cy + 8, 1.4, 'rgba(255,255,255,0.8)');
    // face
    if (c.accessory === 'visor') {
        rrFill(ctx, cx - 15, cy - 9, 30, 11, 5, '#1d2b36', OUT, 2.5);
        rrFill(ctx, cx - 11, cy - 6, 8, 5, 2, c.accent, undefined);
        rrFill(ctx, cx + 3, cy - 6, 8, 5, 2, c.accent, undefined);
    } else {
        eye(ctx, cx - 7, cy - 4, 5.5, 0.3, 0.1);
        eye(ctx, cx + 7, cy - 4, 5.5, 0.3, 0.1);
    }
    // mouth
    ctx.beginPath(); ctx.arc(cx + 1, cy + 3, 3.5, 0.2, Math.PI - 0.2); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    // accessory on top
    switch (c.accessory) {
        case 'antenna':
            line(ctx, cx, cy - r, cx + 3, cy - r - 9, OUT, 2.5);
            circ(ctx, cx + 3, cy - r - 11, 4, c.accent, OUT, 2);
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
            ctx.beginPath(); ctx.arc(cx, cy - 6, r + 1, Math.PI, 0); ctx.closePath();
            ctx.fillStyle = c.accent; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
            rrFill(ctx, cx - r - 4, cy - 9, r * 2 + 8, 5, 2.5, shade(c.accent, -0.15), OUT, 2.5);
            rrFill(ctx, cx - 3, cy - r - 8, 6, 12, 2, shade(c.accent, 0.2), OUT, 2);
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

const ENEMY_DRAW: { [k: string]: { w: number; h: number; d: (ctx: C2D, w: number, h: number, sil: boolean) => void } } = {
    e_grub: {
        w: 60, h: 60, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.55;
            shadow(ctx, cx, h - 7, 20, 5, sil);
            line(ctx, cx - 6, cy - 18, cx - 12, cy - 28, OUT, 3); circ(ctx, cx - 12, cy - 29, 3.5, '#b39ddb', OUT, 2);
            line(ctx, cx + 6, cy - 18, cx + 12, cy - 28, OUT, 3); circ(ctx, cx + 12, cy - 29, 3.5, '#b39ddb', OUT, 2);
            alienBody(ctx, cx, cy, 21, 19, '#7e57c2');
            spots(ctx, cx, cy, '#6a43ad', [-12, 8, 3, 13, 6, 2.5, 8, 12, 2]);
            highlight(ctx, cx - 9, cy - 9, 6, 3.5, 0.3);
            eye(ctx, cx, cy - 4, 8, 0.25, 0.15, 0.55);
            teeth(ctx, cx, cy + 9, 14, 6);
        }
    },
    e_runner: {
        w: 50, h: 50, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.55;
            shadow(ctx, cx, h - 6, 15, 4, sil);
            const pts: number[] = [];
            for (let i = 0; i < 14; i++) {
                const a = i / 14 * TAU, rr2 = i % 2 === 0 ? 19 : 14;
                pts.push(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2 * 0.9);
            }
            poly(ctx, pts, '#e05297', OUT, 3);
            highlight(ctx, cx - 6, cy - 6, 5, 3, 0.3);
            eye(ctx, cx - 5, cy - 2, 5, 0.3, 0.1);
            eye(ctx, cx + 5, cy - 2, 5, 0.3, 0.1);
            line(ctx, cx - 4, cy + 7, cx + 4, cy + 7, OUT, 2.5);
        }
    },
    e_spitter: {
        w: 62, h: 62, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.55;
            shadow(ctx, cx, h - 7, 20, 5, sil);
            alienBody(ctx, cx, cy, 20, 20, '#66bb6a');
            spots(ctx, cx, cy, '#4e9a52', [-11, -8, 3, 12, -4, 2.5, -8, 10, 2.5]);
            highlight(ctx, cx - 8, cy - 10, 5, 3, 0.3);
            eye(ctx, cx - 7, cy - 6, 5, 0.3, 0.1);
            eye(ctx, cx + 7, cy - 6, 5, 0.3, 0.1);
            // tube mouth
            rrFill(ctx, cx - 5, cy + 3, 10, 13, 4, '#43a047', OUT, 2.5);
            ell(ctx, cx, cy + 15, 5, 3, '#1b3d1c', OUT, 2);
        }
    },
    e_charger: {
        w: 66, h: 62, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.56;
            shadow(ctx, cx, h - 7, 22, 5, sil);
            poly(ctx, [cx - 14, cy - 12, cx - 26, cy - 26, cx - 20, cy - 8], '#f5e6c8', OUT, 2.5);
            poly(ctx, [cx + 14, cy - 12, cx + 26, cy - 26, cx + 20, cy - 8], '#f5e6c8', OUT, 2.5);
            alienBody(ctx, cx, cy, 23, 19, '#ef6c3a');
            spots(ctx, cx, cy, '#cf5226', [-13, 6, 3, 14, 4, 3]);
            highlight(ctx, cx - 9, cy - 9, 6, 3, 0.3);
            // angry eyes
            eye(ctx, cx - 8, cy - 4, 5, 0.3, 0.2);
            eye(ctx, cx + 8, cy - 4, 5, -0.3, 0.2);
            line(ctx, cx - 14, cy - 11, cx - 4, cy - 7, OUT, 3);
            line(ctx, cx + 14, cy - 11, cx + 4, cy - 7, OUT, 3);
            teeth(ctx, cx, cy + 9, 16, 6);
        }
    },
    e_splitter: {
        w: 64, h: 64, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.53;
            shadow(ctx, cx, h - 6, 22, 5, sil);
            circ(ctx, cx, cy, 24, '#42a5f5', OUT, 3.5);
            // crack line
            ctx.beginPath(); ctx.moveTo(cx, cy - 24); ctx.lineTo(cx - 3, cy - 12); ctx.lineTo(cx + 3, cy - 2); ctx.lineTo(cx - 2, cy + 10); ctx.lineTo(cx + 1, cy + 24);
            ctx.lineWidth = 2.5; ctx.strokeStyle = '#1e5c94'; ctx.stroke();
            highlight(ctx, cx - 10, cy - 10, 6, 4, 0.35);
            eye(ctx, cx - 10, cy - 2, 5.5, 0.2, 0.1);
            eye(ctx, cx + 10, cy - 2, 5.5, 0.2, 0.1);
            ctx.beginPath(); ctx.arc(cx, cy + 10, 5, 0.1, Math.PI - 0.1); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
        }
    },
    e_mini: {
        w: 38, h: 38, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.53;
            shadow(ctx, cx, h - 5, 12, 3.5, sil);
            circ(ctx, cx, cy, 13, '#90caf9', OUT, 3);
            highlight(ctx, cx - 5, cy - 5, 3.5, 2, 0.4);
            eye(ctx, cx - 4, cy - 1, 3.5, 0.2, 0.1);
            eye(ctx, cx + 4, cy - 1, 3.5, 0.2, 0.1);
        }
    },
    e_brute: {
        w: 92, h: 88, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.56;
            shadow(ctx, cx, h - 8, 34, 7, sil);
            // legs
            for (const s of [-1, 1]) {
                ell(ctx, cx + s * 24, cy + 26, 9, 6, '#4a3b63', OUT, 3);
            }
            alienBody(ctx, cx, cy, 36, 31, '#5e4b8b', 4);
            // shell plates
            ctx.save(); alienBody(ctx, cx, cy, 36, 31, '#5e4b8b', 4); ctx.clip();
            ctx.beginPath(); ctx.arc(cx, cy - 40, 52, 0, Math.PI); ctx.fillStyle = '#7a68a8'; ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
            line(ctx, cx - 18, cy - 30, cx - 22, cy + 6, OUT, 2.5);
            line(ctx, cx + 18, cy - 30, cx + 22, cy + 6, OUT, 2.5);
            ctx.restore();
            alienBody(ctx, cx, cy, 36, 31, 'rgba(0,0,0,0)', 4);
            eye(ctx, cx - 10, cy + 4, 6, 0.2, 0.1);
            eye(ctx, cx + 10, cy + 4, 6, 0.2, 0.1);
            line(ctx, cx - 17, cy - 3, cx - 4, cy + 1, OUT, 3.5);
            line(ctx, cx + 17, cy - 3, cx + 4, cy + 1, OUT, 3.5);
            teeth(ctx, cx, cy + 18, 22, 8);
        }
    },
    e_hatcher: {
        w: 80, h: 80, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.55;
            shadow(ctx, cx, h - 8, 28, 6, sil);
            alienBody(ctx, cx, cy, 30, 28, '#ad4e7a', 4);
            spots(ctx, cx, cy, '#f8bbd0', [-14, -10, 6, 12, -14, 5, 15, 6, 6, -6, 14, 5, -18, 8, 4]);
            spots(ctx, cx, cy, '#d77aa3', [-14, -10, 3, 12, -14, 2.5, 15, 6, 3, -6, 14, 2.5]);
            highlight(ctx, cx - 12, cy - 14, 6, 3, 0.3);
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
            circ(ctx, cx, cy, 20, '#e53935', OUT, 3.5);
            highlight(ctx, cx - 7, cy - 8, 5, 3, 0.4);
            eye(ctx, cx - 7, cy - 1, 5, 0.3, 0.1);
            eye(ctx, cx + 7, cy - 1, 5, 0.3, 0.1);
            ctx.beginPath(); ctx.arc(cx, cy + 12, 5, Math.PI + 0.3, -0.3); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
        }
    },
    e_looter: {
        w: 62, h: 62, d: (ctx, w, h, sil) => {
            const cx = w / 2, cy = h * 0.56;
            shadow(ctx, cx, h - 7, 20, 5, sil);
            // sack on back
            circ(ctx, cx + 12, cy - 6, 13, '#a1887f', OUT, 3);
            line(ctx, cx + 8, cy - 17, cx + 16, cy - 17, OUT, 3);
            alienBody(ctx, cx - 3, cy + 2, 18, 17, '#ffca28');
            highlight(ctx, cx - 10, cy - 6, 5, 3, 0.45);
            eye(ctx, cx - 9, cy, 4.5, -0.3, 0.1);
            eye(ctx, cx + 1, cy, 4.5, -0.3, 0.1);
            ctx.beginPath(); ctx.arc(cx - 4, cy + 9, 3, 0, Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
            if (!sil) { ctx.fillStyle = '#fff59d'; ctx.font = 'bold 9px Arial'; ctx.fillText('✦', cx + 8, cy - 2); }
        }
    },
    e_tree: {
        w: 72, h: 88, d: (ctx, w, h, sil) => {
            const cx = w / 2;
            shadow(ctx, cx, h - 7, 24, 6, sil);
            rrFill(ctx, cx - 7, h - 34, 14, 28, 4, '#6d4c41', OUT, 3);
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
                ell(ctx, cx + s * 38, cy + 44, 14, 9, '#5a1f1f', OUT, 3.5);
            }
            alienBody(ctx, cx, cy, 60, 52, '#a33b3b', 5);
            ctx.save(); alienBody(ctx, cx, cy, 60, 52, '#a33b3b', 5); ctx.clip();
            ctx.beginPath(); ctx.arc(cx, cy - 70, 88, 0, Math.PI); ctx.fillStyle = '#7d2b2b'; ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
            for (const s of [-1, 0, 1]) line(ctx, cx + s * 28, cy - 50, cx + s * 34, cy + 16, OUT, 3);
            ctx.restore();
            alienBody(ctx, cx, cy, 60, 52, 'rgba(0,0,0,0)', 5);
            eye(ctx, cx - 18, cy + 8, 10, 0.2, 0.15);
            eye(ctx, cx + 18, cy + 8, 10, 0.2, 0.15);
            line(ctx, cx - 32, cy - 6, cx - 8, cy + 2, OUT, 5);
            line(ctx, cx + 32, cy - 6, cx + 8, cy + 2, OUT, 5);
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
const WEAPON_DRAW: { [k: string]: { w: number; h: number; d: (ctx: C2D, w: number, h: number) => void } } = {
    w_fist: {
        w: 44, h: 34, d: (ctx, w, h) => {
            rrFill(ctx, 3, h / 2 - 6, 14, 12, 3, '#455a64');
            rrFill(ctx, 13, 4, 26, 26, 9, '#ff7043');
            for (let i = 0; i < 3; i++) line(ctx, 34, 10 + i * 7, 39, 10 + i * 7, OUT, 2);
            highlight(ctx, 22, 10, 6, 3, 0.4);
        }
    },
    w_blade: {
        w: 76, h: 26, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 4, 16, 8, 3, '#5d4037');
            rrFill(ctx, 16, h / 2 - 10, 6, 20, 2, '#ffd166');
            poly(ctx, [22, h / 2 - 6, 64, h / 2 - 5, 74, h / 2, 64, h / 2 + 5, 22, h / 2 + 6], '#80deea');
            line(ctx, 26, h / 2, 64, h / 2, 'rgba(255,255,255,0.8)', 2);
        }
    },
    w_spear: {
        w: 96, h: 22, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 3, 70, 6, 3, '#8d6e63');
            poly(ctx, [68, h / 2 - 8, 94, h / 2, 68, h / 2 + 8, 72, h / 2], '#b388ff');
            line(ctx, 72, h / 2, 88, h / 2, 'rgba(255,255,255,0.7)', 1.5);
        }
    },
    w_hammer: {
        w: 70, h: 44, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 4, 46, 8, 3, '#6d4c41');
            rrFill(ctx, 42, 3, 24, 38, 6, '#90a4ae');
            rrFill(ctx, 46, 8, 16, 28, 4, '#cfd8dc', undefined);
            line(ctx, 44, h / 2, 64, h / 2, '#ffd166', 3);
        }
    },
    w_chainsaw: {
        w: 70, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 2, 6, 24, 18, 5, '#ffa000');
            rrFill(ctx, 22, h / 2 - 6, 44, 12, 6, '#b0bec5');
            ctx.fillStyle = OUT;
            for (let i = 0; i < 7; i++) poly(ctx, [26 + i * 6, h / 2 - 6, 29 + i * 6, h / 2 - 9, 32 + i * 6, h / 2 - 6], OUT, undefined);
            for (let i = 0; i < 7; i++) poly(ctx, [26 + i * 6, h / 2 + 6, 29 + i * 6, h / 2 + 9, 32 + i * 6, h / 2 + 6], OUT, undefined);
        }
    },
    w_flamesword: {
        w: 76, h: 28, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 4, 16, 8, 3, '#3e2723');
            rrFill(ctx, 16, h / 2 - 10, 6, 20, 2, '#ff7043');
            poly(ctx, [22, h / 2 - 7, 60, h / 2 - 9, 74, h / 2, 60, h / 2 + 7, 22, h / 2 + 6], '#ff5722');
            poly(ctx, [26, h / 2 - 3, 58, h / 2 - 4, 68, h / 2, 58, h / 2 + 3, 26, h / 2 + 3], '#ffd54f', undefined);
        }
    },
    w_pistol: {
        w: 46, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 6, 14, 10, 14, 3, '#5d4037');
            rrFill(ctx, 4, 6, 38, 11, 3, '#78909c');
            rrFill(ctx, 34, 8, 8, 7, 2, '#4fc3f7', undefined);
            line(ctx, 10, 9, 30, 9, 'rgba(255,255,255,0.5)', 1.5);
        }
    },
    w_smg: {
        w: 56, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 2, 8, 12, 9, 2, '#455a64');
            rrFill(ctx, 12, 6, 32, 12, 3, '#607d8b');
            rrFill(ctx, 42, 9, 12, 6, 2, '#37474f');
            rrFill(ctx, 22, 16, 7, 12, 2, '#37474f');
            rrFill(ctx, 14, 16, 6, 9, 2, '#5d4037');
        }
    },
    w_shotgun: {
        w: 66, h: 26, d: (ctx, w, h) => {
            rrFill(ctx, 2, 9, 20, 11, 4, '#8d6e63');
            rrFill(ctx, 18, 7, 44, 7, 2, '#546e7a');
            rrFill(ctx, 18, 13, 44, 6, 2, '#455a64');
            rrFill(ctx, 30, 15, 14, 7, 2, '#6d4c41');
        }
    },
    w_sniper: {
        w: 88, h: 28, d: (ctx, w, h) => {
            rrFill(ctx, 2, 12, 22, 11, 4, '#4e342e');
            rrFill(ctx, 20, 12, 64, 6, 2, '#37474f');
            rrFill(ctx, 30, 3, 24, 8, 4, '#263238');
            circ(ctx, 54, 7, 3, '#80deea', OUT, 1.5);
            rrFill(ctx, 80, 10, 6, 10, 2, '#263238');
        }
    },
    w_rocket: {
        w: 76, h: 32, d: (ctx, w, h) => {
            rrFill(ctx, 4, 7, 66, 16, 6, '#558b2f');
            rrFill(ctx, 64, 5, 10, 20, 3, '#33691e');
            rrFill(ctx, 22, 21, 8, 10, 2, '#3e2723');
            rrFill(ctx, 10, 9, 14, 4, 2, '#ffd166', undefined);
        }
    },
    w_wand: {
        w: 66, h: 28, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 3, 48, 6, 3, '#5d4037');
            poly(ctx, [48, h / 2, 58, 3, 64, h / 2, 58, h - 3], '#40c4ff');
            line(ctx, 52, h / 2, 60, h / 2, '#ffffff', 2);
        }
    },
    w_flamethrower: {
        w: 66, h: 32, d: (ctx, w, h) => {
            circ(ctx, 12, 16, 10, '#d84315');
            rrFill(ctx, 18, 10, 36, 10, 3, '#78909c');
            rrFill(ctx, 50, 8, 12, 14, 3, '#455a64');
            if (true) circ(ctx, 62, 15, 3, '#ffab40');
        }
    },
    w_laser: {
        w: 70, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 4, 8, 40, 14, 6, '#eceff1');
            rrFill(ctx, 40, 10, 26, 10, 4, '#b0bec5');
            rrFill(ctx, 10, 18, 9, 11, 3, '#37474f');
            line(ctx, 12, 12, 56, 12, '#e040fb', 3);
            circ(ctx, 64, 15, 3, '#ea80fc');
        }
    },
    w_medigun: {
        w: 54, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 4, 6, 40, 13, 5, '#ffffff');
            rrFill(ctx, 40, 9, 12, 7, 2, '#b0bec5');
            rrFill(ctx, 10, 17, 9, 11, 3, '#455a64');
            ctx.fillStyle = '#43a047'; ctx.fillRect(20, 9, 8, 3); ctx.fillRect(22.5, 6.5, 3, 8);
        }
    },
    w_wrench: {
        w: 60, h: 30, d: (ctx, w, h) => {
            rrFill(ctx, 2, h / 2 - 4, 42, 8, 3, '#90a4ae');
            circ(ctx, 48, h / 2, 10, '#90a4ae');
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.save(); ctx.globalCompositeOperation = 'destination-out';
            ctx.fillRect(50, h / 2 - 4, 12, 8); ctx.restore();
            line(ctx, 50, h / 2 - 4, 58, h / 2 - 4, OUT, 2.5);
            line(ctx, 50, h / 2 + 4, 58, h / 2 + 4, OUT, 2.5);
            rrFill(ctx, 4, h / 2 - 4, 14, 8, 3, '#ff7043');
        }
    },
    w_slingshot: {
        w: 46, h: 40, d: (ctx, w, h) => {
            line(ctx, 4, h / 2, 22, h / 2, OUT, 9); line(ctx, 4, h / 2, 22, h / 2, '#8d6e63', 5);
            line(ctx, 22, h / 2, 40, 6, OUT, 8); line(ctx, 22, h / 2, 40, 6, '#8d6e63', 4.5);
            line(ctx, 22, h / 2, 40, h - 6, OUT, 8); line(ctx, 22, h / 2, 40, h - 6, '#8d6e63', 4.5);
            line(ctx, 40, 6, 34, h / 2, '#ef9a9a', 2); line(ctx, 40, h - 6, 34, h / 2, '#ef9a9a', 2);
        }
    },
    w_minigun: {
        w: 76, h: 34, d: (ctx, w, h) => {
            rrFill(ctx, 2, 8, 26, 18, 6, '#546e7a');
            for (let i = 0; i < 3; i++) rrFill(ctx, 26, 8 + i * 6, 46, 6, 3, i === 1 ? '#78909c' : '#607d8b');
            rrFill(ctx, 66, 6, 8, 22, 3, '#37474f');
        }
    },
    w_grenade: {
        w: 64, h: 34, d: (ctx, w, h) => {
            rrFill(ctx, 2, 10, 18, 12, 4, '#5d4037');
            circ(ctx, 30, 17, 12, '#827717');
            rrFill(ctx, 36, 10, 26, 13, 5, '#9e9d24');
            for (let i = 0; i < 3; i++) line(ctx, 22 + i * 7, 8, 22 + i * 7, 26, OUT, 1.5);
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
    // enemies
    for (const k in ENEMY_DRAW) {
        const e = ENEMY_DRAW[k];
        Atlas.add(k, e.w, e.h, e.d, true);
    }
    // stage variants: recolored copies of the drawings above plus an ice / lava / void overlay
    for (const id in ENEMIES) {
        const def = ENEMIES[id];
        if (!def.art || ENEMY_DRAW[def.sprite]) continue;
        const base = ENEMY_DRAW[def.art.base];
        if (!base) { console.warn('[Art] missing base drawing', def.art.base); continue; }
        const art = def.art;
        Atlas.add(def.sprite, base.w, base.h, (ctx, w, h, sil) => {
            if (sil) { base.d(ctx, w, h, true); return; }
            drawVariant(ctx, base.d, w, h, art);
        }, true);
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
    Atlas.add('mat', 22, 24, (ctx, w, h) => {
        poly(ctx, [11, 2, 19, 9, 15, 22, 7, 22, 3, 9], '#69f0ae', OUT, 2.5);
        poly(ctx, [11, 4, 15, 9, 11, 20, 8, 10], '#b9f6ca', undefined);
    });
    Atlas.add('fruit', 30, 30, (ctx, w, h, sil) => {
        shadow(ctx, 15, 26, 9, 3, sil);
        circ(ctx, 15, 16, 10, '#ff6f91', OUT, 2.5);
        highlight(ctx, 11, 12, 3, 2, 0.6);
        ell(ctx, 19, 5, 5, 2.5, '#69f0ae', OUT, 1.5, -0.5);
    });
    Atlas.add('crate', 38, 36, (ctx, w, h, sil) => {
        shadow(ctx, 19, 32, 15, 4, sil);
        rrFill(ctx, 4, 6, 30, 24, 3, '#c8935a', OUT, 3);
        line(ctx, 4, 14, 34, 14, OUT, 2.5); line(ctx, 19, 6, 19, 30, OUT, 2.5);
        rrFill(ctx, 15, 12, 8, 6, 1.5, '#ffd166', OUT, 1.5);
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
        rrFill(ctx, 9, 30, 32, 16, 5, '#78909c', OUT, 3);
        circ(ctx, 25, 26, 12, '#a0e86f', OUT, 3);
        circ(ctx, 25, 26, 4, '#2e7d32');
    });
    Atlas.add('turret_gun', 34, 14, (ctx, w, h) => { rrFill(ctx, 2, 3, 30, 8, 3, '#546e7a', OUT, 2.5); });
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
    const chars = '0123456789!+';
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        Atlas.add('d_' + (ch === '!' ? 'ex' : ch === '+' ? 'plus' : ch), 20, 28, (ctx, w, h) => {
            ctx.font = '900 24px "Arial Black", Arial, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = OUT;
            ctx.strokeText(ch, w / 2, h / 2 + 1);
            ctx.fillStyle = '#ffffff'; ctx.fillText(ch, w / 2, h / 2 + 1);
        });
    }
}

// ---------------------------------------------------------------- arena floor
/**
 * Arena floor texture. `res` = texture pixels per world unit (sharper floor on dense phone screens).
 * `pools` are lava pools (world coordinates, origin at the arena center, y up).
 */
export function drawArena(W: number, H: number, border: number, res: number, th: ArenaTheme, pools: { x: number; y: number; r: number }[] = []): HTMLCanvasElement {
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
        } else {
            circ(ctx, px, py, 3 + rnd() * 2, 'rgba(110,240,255,0.12)');
            circ(ctx, px, py, 1.2 + rnd(), th.tuft);
        }
    }
    // lava pools (molten forge)
    for (const p of pools) {
        const px = total.w / 2 + p.x, py = total.h / 2 - p.y; // world y is up, canvas y is down
        const lg = ctx.createRadialGradient(px, py, p.r * 0.15, px, py, p.r);
        lg.addColorStop(0, '#fff2a8'); lg.addColorStop(0.35, '#ffb02e'); lg.addColorStop(0.8, '#ff4d17'); lg.addColorStop(1, '#a3200f');
        ctx.beginPath();
        for (let k = 0; k <= 18; k++) {
            const a = k / 18 * TAU, rr2 = p.r * (0.9 + 0.1 * Math.sin(a * 3 + p.x));
            const qx = px + Math.cos(a) * rr2, qy = py + Math.sin(a) * rr2;
            if (k === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
        }
        ctx.closePath();
        ctx.fillStyle = lg; ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = '#2a1410'; ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,200,90,0.6)'; ctx.stroke();
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
