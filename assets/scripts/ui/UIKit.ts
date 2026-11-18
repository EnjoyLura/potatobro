// UI construction helpers: vector panels (Graphics), labels, buttons, bars, icons.
import { Node, Graphics, Label, UITransform, Color, EventTouch, Sprite, tween, Vec3, UIOpacity } from 'cc';
import { mkNode, mkSprite, hexColor, setTint } from '../core/Nodes';
import { Sfx } from '../core/Sfx';

export const COL = {
    bg: '#1c1620',
    panel: '#2b2230',
    panel2: '#3a2f40',
    stroke: '#120d14',
    text: '#f5efe6',
    dim: '#a99db0',
    good: '#7dff8a',
    bad: '#ff6b6b',
    gold: '#ffd166',
    mat: '#69f0ae',
    accent: '#ff8a3d',
    blue: '#4fc3f7',
    btn: '#ff8a3d',
    btnDark: '#4a3d52',
};

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

export function panel(parent: Node, w: number, h: number, fill = COL.panel, stroke = COL.stroke, r = 16, lw = 4, fillA = 255): Node {
    const n = mkNode('panel', parent);
    size(n, w, h);
    const g = n.addComponent(Graphics);
    drawRR(g, w, h, fill, stroke, r, lw, fillA);
    // soft drop shadow
    return n;
}

export function shadowPanel(parent: Node, w: number, h: number, fill = COL.panel, stroke = COL.stroke, r = 16): Node {
    const s = panel(parent, w, h, '#000000', undefined, r, 0, 90);
    s.setPosition(0, -6);
    const n = panel(parent, w, h, fill, stroke, r, 4);
    return n;
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

export function button(parent: Node, w: number, h: number, text: string, color: string, cb: () => void, fontSize = 26, textColor = '#ffffff'): Btn {
    const n = mkNode('btn', parent);
    size(n, w, h);
    const sh = mkNode('sh', n);
    const sg = sh.addComponent(Graphics);
    drawRR(sg, w, h, '#000000', undefined, Math.min(16, h / 3), 0, 110);
    sh.setPosition(0, -5);
    const body = mkNode('body', n);
    const g = body.addComponent(Graphics);
    const l = label(body, text, fontSize, textColor);
    const b: Btn = {
        node: n, label: l, g, w, h, color, enabled: true,
        setColor(c: string) {
            b.color = c;
            drawRR(g, w, h, c, COL.stroke, Math.min(16, h / 3), 4);
            g.fillColor = C('#ffffff', 40);
            g.roundRect(-w / 2 + 6, h / 2 - h * 0.42, w - 12, h * 0.32, Math.min(10, h / 5));
            g.fill();
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
    n.on(Node.EventType.TOUCH_END, (e: EventTouch) => { Sfx.unlock(); cb(e); Sfx.tap(); });
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
