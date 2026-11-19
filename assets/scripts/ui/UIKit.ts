// UI construction helpers: vector panels (Graphics), labels, buttons, bars, icons.
import { Node, Graphics, Label, UITransform, Color, EventTouch, EventMouse, Sprite, tween, Vec3, UIOpacity, Mask } from 'cc';
import { mkNode, mkSprite, hexColor, setTint } from '../core/Nodes';
import { Sfx } from '../core/Sfx';

export const COL = {
    bg: '#15151b',
    panel: '#0d0d12',      // dark translucent panels (drawn with PANEL_A alpha)
    panel2: '#1a1b22',
    cell: '#2a2c34',       // grid cells
    cellLine: '#3f434d',
    stroke: '#0a0a0d',
    text: '#f5f3ee',
    dim: '#9a9aa6',
    good: '#7dff8a',
    bad: '#ff6b6b',
    gold: '#ffc93c',
    mat: '#69f0ae',
    accent: '#ff8a3d',
    blue: '#4fc3f7',
    btn: '#f8c331',        // primary action (yellow, dark text)
    btnDark: '#3a3d48',
    red: '#e8352c',
    green: '#3f9a57',
    purple: '#7e57c2',
    pillBack: '#56688a',   // "返回" pill
    dark: '#1a1206',       // text on yellow
};
export const PANEL_A = 215;

/** Dark text on light fills, white text on dark fills. */
export function textOn(fill: string) {
    const c = fill.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? COL.dark : '#ffffff';
}
function shadeHex(hex: string, amt: number) {
    const c = hex.replace('#', '');
    const f = (i: number) => Math.round(Math.max(0, Math.min(255, parseInt(c.substr(i, 2), 16) * (1 + amt))));
    const h = (v: number) => ('0' + v.toString(16)).slice(-2);
    return '#' + h(f(0)) + h(f(2)) + h(f(4));
}

const colorCache: { [k: string]: Color } = {};
export function C(hex: string, a = 255): Color {
    const key = hex + a;
    if (!colorCache[key]) colorCache[key] = hexColor(hex, a);
    return colorCache[key];
}

export function size(n: Node, w: number, h: number) {
    let ut = n.getComponent(UITransform);
    if (!ut) ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    return ut;
}

export function drawRR(g: Graphics, w: number, h: number, fill: string, stroke?: string, r = 14, lw = 3, fillA = 255) {
    g.clear();
    g.lineWidth = lw;
    g.fillColor = C(fill, fillA);
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.fill();
    if (stroke) {
        g.strokeColor = C(stroke);
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.stroke();
    }
}

export function panel(parent: Node, w: number, h: number, fill = COL.panel, stroke: string | undefined = undefined, r = 16, lw = 3, fillA = PANEL_A): Node {
    const n = mkNode('panel', parent);
    size(n, w, h);
    const g = n.addComponent(Graphics);
    drawRR(g, w, h, fill, stroke, r, lw, fillA);
    // soft drop shadow
    return n;
}

export function shadowPanel(parent: Node, w: number, h: number, fill = COL.panel, stroke: string | undefined = undefined, r = 18): Node {
    return panel(parent, w, h, fill, stroke, r, 3, fill === COL.panel ? PANEL_A : 245);
}

export interface LabelOpts { bold?: boolean; outline?: number; outlineColor?: string; align?: 'left' | 'center' | 'right'; width?: number; lineH?: number; vAlign?: 'top' | 'center' | 'bottom'; anchorX?: number; anchorY?: number }

export function label(parent: Node, text: string, fontSize = 24, color = COL.text, o: LabelOpts = {}): Label {
    const n = mkNode('label', parent);
    const l = n.addComponent(Label);
    l.string = text;
    l.fontSize = fontSize;
    l.lineHeight = o.lineH || Math.round(fontSize * 1.25);
    l.isBold = o.bold !== false;
    l.color = C(color);
    l.cacheMode = Label.CacheMode.NONE;
    if (o.outline !== 0) {
        l.enableOutline = true;
        l.outlineColor = C(o.outlineColor || COL.stroke);
        l.outlineWidth = o.outline || Math.max(2, Math.round(fontSize / 9));
    }
    l.horizontalAlign = o.align === 'left' ? Label.HorizontalAlign.LEFT : o.align === 'right' ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
    l.verticalAlign = o.vAlign === 'top' ? Label.VerticalAlign.TOP : o.vAlign === 'bottom' ? Label.VerticalAlign.BOTTOM : Label.VerticalAlign.CENTER;
    const ut = n.getComponent(UITransform);
    if (o.width) {
        l.overflow = Label.Overflow.RESIZE_HEIGHT;
        l.enableWrapText = true;
        ut.setContentSize(o.width, l.lineHeight);
    }
    const ax = o.anchorX !== undefined ? o.anchorX : (o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5);
    ut.setAnchorPoint(ax, o.anchorY !== undefined ? o.anchorY : 0.5);
    return l;
}

export function setLabelColor(l: Label, hex: string) { l.color = C(hex); }

export interface Btn { node: Node; label: Label; g: Graphics; w: number; h: number; color: string; enabled: boolean; setColor(c: string): void; setEnabled(e: boolean): void; setText(t: string): void }

export function button(parent: Node, w: number, h: number, text: string, color: string, cb: () => void, fontSize = 26, textColor?: string): Btn {
    const n = mkNode('btn', parent);
    size(n, w, h);
    const sh = mkNode('sh', n);
    const sg = sh.addComponent(Graphics);
    const rad = Math.min(12, h / 4);
    drawRR(sg, w, h, '#000000', undefined, rad, 0, 90);
    sh.setPosition(0, -4);
    const body = mkNode('body', n);
    const g = body.addComponent(Graphics);
    const tc = textColor || textOn(color);
    const l = label(body, text, fontSize, tc, tc === COL.dark ? { outline: 0 } : { outline: Math.max(2, Math.round(fontSize / 12)) });
    const b: Btn = {
        node: n, label: l, g, w, h, color, enabled: true,
        setColor(c: string) {
            b.color = c;
            g.clear();
            g.fillColor = C(COL.stroke);
            g.roundRect(-w / 2, -h / 2, w, h, rad); g.fill();
            // darker bottom edge, then the face
            g.fillColor = C(shadeHex(c, -0.3));
            g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, rad - 2); g.fill();
            g.fillColor = C(c);
            g.roundRect(-w / 2 + 3, -h / 2 + 3 + Math.max(4, h * 0.1), w - 6, h - 6 - Math.max(4, h * 0.1), rad - 2); g.fill();
            if (!textColor) {
                const t = textOn(c);
                l.color = C(t);
                l.enableOutline = t !== COL.dark;
            }
        },
        setEnabled(e: boolean) { b.enabled = e; b.setColor(e ? b.color : b.color); body.getComponent(UITransform); n.getComponent(UITransform); l.node.setScale(1, 1, 1); opacity(n, e ? 255 : 140); },
        setText(t: string) { l.string = t; },
    };
    b.setColor(color);
    let pressed = false;
    n.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
        pressed = true;
        body.setScale(0.94, 0.94, 1);
        body.setPosition(0, -3);
    });
    const release = () => { pressed = false; body.setScale(1, 1, 1); body.setPosition(0, 0); };
    n.on(Node.EventType.TOUCH_CANCEL, release);
    n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
        if (!pressed) return;
        release();
        if (!b.enabled) { Sfx.deny(); return; }
        Sfx.unlock();
        Sfx.click();
        cb();
    });
    return b;
}

export function opacity(n: Node, a: number) {
    let o = n.getComponent(UIOpacity);
    if (!o) o = n.addComponent(UIOpacity);
    o.opacity = a;
    return o;
}

/** Makes a node tappable with a callback (no visuals). */
export function tappable(n: Node, cb: (e: EventTouch) => void) {
    // Only a press that started on this node counts, once: some phone browsers deliver a second
    // release (touch + emulated mouse), which ran the callback and its click sound twice.
    let pressed = false, lastEnd = 0;
    n.on(Node.EventType.TOUCH_START, () => { pressed = true; });
    n.on(Node.EventType.TOUCH_CANCEL, () => { pressed = false; });
    n.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
        const now = Date.now();
        if (!pressed || now - lastEnd < 80) return;
        pressed = false; lastEnd = now;
        Sfx.unlock(); cb(e); Sfx.tap();
    });
}

/** A short, nearly still tap (not a drag or a hold). Shared by the click-on-empty-space handlers. */
export class TapCheck {
    private t = 0; private x = 0; private y = 0; private id = -1;
    start(id: number, x: number, y: number) { this.id = id; this.t = Date.now(); this.x = x; this.y = y; }
    end(id: number, x: number, y: number) {
        const ok = id === this.id && Date.now() - this.t < 350 && Math.hypot(x - this.x, y - this.y) < 18;
        this.id = -1;
        return ok;
    }
}

/** Click sound for short taps on a node that otherwise does nothing (backgrounds, blockers). */
export function tapSound(n: Node) {
    const tc = new TapCheck();
    n.on(Node.EventType.TOUCH_START, (e: EventTouch) => { const p = e.getUILocation(); tc.start(e.getID(), p.x, p.y); });
    n.on(Node.EventType.TOUCH_END, (e: EventTouch) => { const p = e.getUILocation(); if (tc.end(e.getID(), p.x, p.y)) { Sfx.unlock(); Sfx.tap(); } });
}

/** Full-screen touch blocker with dim background. */
export function blocker(parent: Node, alpha = 170): Node {
    const n = mkNode('blocker', parent);
    size(n, 6000, 4000);
    const g = n.addComponent(Graphics);
    g.fillColor = C('#0b080d', alpha);
    g.rect(-3000, -2000, 6000, 4000);
    g.fill();
    tapSound(n);
    return n;
}

export interface Bar { node: Node; set(v: number, max: number): void; g: Graphics }
export function bar(parent: Node, w: number, h: number, fill: string, bg = '#2a2030', r = 6): Bar {
    const n = mkNode('bar', parent);
    size(n, w, h);
    const g = n.addComponent(Graphics);
    let last = -1;
    const b: Bar = {
        node: n, g,
        set(v: number, max: number) {
            const k = Math.max(0, Math.min(1, max > 0 ? v / max : 0));
            if (Math.abs(k - last) < 0.002) return;
            last = k;
            g.clear();
            g.fillColor = C(COL.stroke);
            g.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, r + 2); g.fill();
            g.fillColor = C(bg);
            g.roundRect(-w / 2, -h / 2, w, h, r); g.fill();
            if (k > 0) {
                g.fillColor = C(fill);
                g.roundRect(-w / 2, -h / 2, Math.max(r * 2, w * k), h, r); g.fill();
                g.fillColor = C('#ffffff', 50);
                g.roundRect(-w / 2 + 3, 0, Math.max(r * 2, w * k) - 6, h / 2 - 2, r / 2); g.fill();
            }
        },
    };
    b.set(1, 1);
    return b;
}

export function icon(parent: Node, frame: string, w: number, h?: number, tint?: string): Sprite {
    const s = mkSprite(parent, frame, w, h === undefined ? w : h);
    if (tint) { const c = hexColor(tint); setTint(s, c.r, c.g, c.b, 255); }
    return s;
}

/** Fit a sprite's aspect into a box. */
export function iconFit(parent: Node, frame: string, box: number, sizes: { w: number; h: number }, tint?: string): Sprite {
    const k = Math.min(box / sizes.w, box / sizes.h);
    return icon(parent, frame, sizes.w * k, sizes.h * k, tint);
}

export function popIn(n: Node, delay = 0) {
    n.setScale(0.6, 0.6, 1);
    const o = opacity(n, 0);
    tween(n).delay(delay).to(0.18, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' }).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
    tween(o).delay(delay).to(0.12, { opacity: 255 }).start();
}

export function clearChildren(n: Node) {
    for (const c of n.children.slice()) c.destroy();
}

/** Flat dark pill button (menu style). Text is gold for the main action. */
export function pill(parent: Node, w: number, h: number, text: string, cb: () => void, o: { fontSize?: number; textColor?: string; fill?: string; fillA?: number; stroke?: string } = {}): Btn {
    const n = mkNode('pill', parent);
    size(n, w, h);
    const body = mkNode('body', n);
    const g = body.addComponent(Graphics);
    const fill = o.fill || '#0f0b12';
    const draw = (c: string) => drawRR(g, w, h, c, o.stroke, h / 2, o.stroke ? 3 : 0, o.fillA !== undefined ? o.fillA : 235);
    draw(fill);
    const l = label(body, text, o.fontSize || Math.round(h * 0.42), o.textColor || '#ffffff', { outline: 0 });
    const b: Btn = {
        node: n, label: l, g, w, h, color: fill, enabled: true,
        setColor(c: string) { b.color = c; draw(c); },
        setEnabled(e: boolean) { b.enabled = e; opacity(n, e ? 255 : 140); },
        setText(t: string) { l.string = t; },
    };
    let pressed = false;
    n.on(Node.EventType.TOUCH_START, () => { pressed = true; body.setScale(0.95, 0.95, 1); });
    const release = () => { pressed = false; body.setScale(1, 1, 1); };
    n.on(Node.EventType.TOUCH_CANCEL, release);
    n.on(Node.EventType.TOUCH_END, () => {
        if (!pressed) return;
        release();
        if (!b.enabled) { Sfx.deny(); return; }
        Sfx.unlock();
        Sfx.click();
        cb();
    });
    return b;
}

/** Horizontal slider 0..1: drag or tap anywhere on it. onChange fires while dragging, onEnd on release. */
export function slider(parent: Node, w: number, value: number, onChange: (v: number) => void, onEnd?: (v: number) => void): Node {
    const n = mkNode('slider', parent);
    const ut = size(n, w + 40, 52);
    const g = n.addComponent(Graphics);
    const knob = mkNode('knob', n);
    const kg = knob.addComponent(Graphics);
    drawRR(kg, 24, 42, '#ffffff', '#120d14', 10, 4);
    kg.fillColor = C('#120d14');
    kg.roundRect(-3, -12, 6, 24, 3);
    kg.fill();
    let v = Math.max(0, Math.min(1, value));
    const draw = () => {
        g.clear();
        g.fillColor = C('#ffffff', 70);
        g.roundRect(-w / 2, -4, w, 8, 4);
        g.fill();
        if (v > 0) {
            g.fillColor = C('#ffffff');
            g.roundRect(-w / 2, -4, w * v, 8, 4);
            g.fill();
        }
        knob.setPosition(-w / 2 + w * v, 0);
    };
    draw();
    const setFrom = (e: EventTouch) => {
        const p = e.getUILocation();
        const loc = ut.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
        v = Math.max(0, Math.min(1, (loc.x + w / 2) / w));
        draw();
        onChange(v);
    };
    n.on(Node.EventType.TOUCH_START, (e: EventTouch) => { Sfx.unlock(); setFrom(e); });
    n.on(Node.EventType.TOUCH_MOVE, setFrom);
    const end = () => { if (onEnd) onEnd(v); };
    n.on(Node.EventType.TOUCH_END, end);
    n.on(Node.EventType.TOUCH_CANCEL, end);
    return n;
}

/** On/off switch with an 开/关 label on its left. */
export function toggle(parent: Node, get: () => boolean, set: (v: boolean) => void): Node {
    const n = mkNode('toggle', parent);
    size(n, 150, 52);
    const sw = mkNode('sw', n);
    sw.setPosition(30, 0);
    const g = sw.addComponent(Graphics);
    const knob = mkNode('knob', sw);
    const kg = knob.addComponent(Graphics);
    kg.fillColor = C('#ffffff');
    kg.circle(0, 0, 17);
    kg.fill();
    const txt = label(n, '', 24, COL.mat, { outline: 0 });
    txt.node.setPosition(-46, 0);
    const draw = () => {
        const on = get();
        drawRR(g, 88, 44, on ? '#5ff0b0' : '#4a3d52', undefined, 22, 0);
        knob.setPosition(on ? 22 : -22, 0);
        txt.string = on ? '开' : '关';
        txt.color = C(on ? COL.mat : COL.dim);
    };
    draw();
    let pressed = false;
    n.on(Node.EventType.TOUCH_START, () => { pressed = true; });
    n.on(Node.EventType.TOUCH_CANCEL, () => { pressed = false; });
    n.on(Node.EventType.TOUCH_END, () => {
        if (!pressed) return;
        pressed = false;
        Sfx.unlock(); set(!get()); draw(); Sfx.click();
    });
    return n;
}

/** Pill used for tabs and filters: yellow with dark text when selected, black otherwise. */
export function tab(parent: Node, w: number, h: number, text: string, selected: boolean, cb: () => void, fontSize?: number, color?: string): Btn {
    return pill(parent, w, h, text, cb, {
        fontSize: fontSize || Math.round(h * 0.44),
        fill: selected ? COL.btn : '#08080b', fillA: selected ? 255 : 235,
        textColor: selected ? COL.dark : (color || '#ffffff'),
    });
}

/** Small rounded filter chip. */
export function chip(parent: Node, text: string, selected: boolean, cb: () => void, color = '#ffffff', fontSize = 18): Btn {
    const w = Math.max(56, text.length * fontSize + 22), h = Math.round(fontSize * 1.75);
    return pill(parent, w, h, text, cb, {
        fontSize, fill: selected ? COL.btn : '#1d1e25', fillA: 255,
        textColor: selected ? COL.dark : color,
    });
}

/** Grid cell (codex / character grid): dark tile, colored bar at the bottom, yellow frame when selected. */
export function cellBg(g: Graphics, w: number, h: number, selected: boolean, bar?: string) {
    g.clear();
    if (selected) {
        g.fillColor = C(COL.btn);
        g.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 14); g.fill();
    }
    g.fillColor = C('#16171c');
    g.roundRect(-w / 2, -h / 2, w, h, 11); g.fill();
    g.fillColor = C(COL.cell);
    g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 9); g.fill();
    g.lineWidth = 2; g.strokeColor = C(COL.cellLine);
    g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 9); g.stroke();
    if (bar) {
        g.fillColor = C(bar);
        g.roundRect(-w / 2 + 8, -h / 2 + 6, w - 16, 4, 2); g.fill();
    }
}

export interface ScrollArea { node: Node; content: Node; setHeight(h: number): void; moved(): boolean; scrollTo(y: number): void }
/**
 * Vertically scrolling, clipped area. Put children in `content` with y going down from h/2 (the top edge),
 * then call setHeight(total). Drag or mouse wheel scrolls; moved() tells taps apart from drags.
 */
export function scrollArea(parent: Node, w: number, h: number, horizontal = false): ScrollArea {
    const n = mkNode('scroll', parent);
    size(n, w, h);
    const m = n.addComponent(Mask);
    m.type = Mask.Type.GRAPHICS_RECT;
    const content = mkNode('content', n);
    const view = horizontal ? w : h;
    let total = view, y = 0, startY = 0, lastY = 0, moved = false;
    const clampY = (v: number) => Math.max(0, Math.min(Math.max(0, total - view), v));
    // vertical: content moves up as y grows; horizontal: content moves left
    const apply = () => (horizontal ? content.setPosition(-y, 0) : content.setPosition(0, y));
    const pos = (e: EventTouch) => (horizontal ? -e.getUILocation().x : e.getUILocation().y);
    n.on(Node.EventType.TOUCH_START, (e: EventTouch) => { startY = lastY = pos(e); moved = false; });
    n.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
        const p = pos(e);
        if (Math.abs(p - startY) > 12) moved = true;
        if (moved) { y = clampY(y + (p - lastY) / Math.max(0.01, n.worldScale.y)); apply(); }
        lastY = p;
    });
    n.on(Node.EventType.MOUSE_WHEEL, (e: EventMouse) => { y = clampY(y - e.getScrollY() * 0.6); apply(); });
    return {
        node: n, content,
        setHeight(v: number) { total = Math.max(view, v); y = clampY(y); apply(); },
        moved() { return moved; },
        scrollTo(v: number) { y = clampY(v); apply(); },
    };
}

/** Rewarded-ad button: purple, with a small "广告" tag (see core/Ads.ts). */
export function adButton(parent: Node, w: number, h: number, text: string, cb: () => void, fontSize = 22): Btn {
    const b = button(parent, w, h, '▶ ' + text, COL.purple, cb, fontSize);
    const tagN = mkNode('adtag', b.node);
    const tg = tagN.addComponent(Graphics);
    tg.fillColor = C('#ffd23f'); tg.roundRect(-18, -10, 36, 20, 6); tg.fill();
    label(tagN, '广告', 13, COL.dark, { outline: 0 });
    tagN.setPosition(w / 2 - 14, h / 2 - 4);
    return b;
}
