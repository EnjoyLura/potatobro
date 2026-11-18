// Node creation helpers and pools.
import { Node, Sprite, UITransform, Layers, Color, Vec3 } from 'cc';
import { Atlas } from './Atlas';

const UI_LAYER = Layers.Enum.UI_2D;

export function mkNode(name: string, parent?: Node): Node {
    const n = new Node(name);
    n.layer = UI_LAYER;
    if (parent) parent.addChild(n);
    return n;
}

export function mkSprite(parent: Node, frame: string, w?: number, h?: number, ax = 0.5, ay = 0.5): Sprite {
    const n = mkNode(frame, parent);
    const s = n.addComponent(Sprite);
    s.sizeMode = Sprite.SizeMode.CUSTOM;
    s.trim = false;
    s.spriteFrame = Atlas.get(frame);
    const sz = Atlas.sizes[frame] || { w: 16, h: 16 };
    const ut = n.getComponent(UITransform);
    ut.setContentSize(w === undefined ? sz.w : w, h === undefined ? sz.h : h);
    ut.setAnchorPoint(ax, ay);
    return s;
}

export function setFrame(s: Sprite, frame: string, w?: number, h?: number) {
    s.spriteFrame = Atlas.get(frame);
    const sz = Atlas.sizes[frame];
    s.node.getComponent(UITransform).setContentSize(w === undefined ? sz.w : w, h === undefined ? sz.h : h);
}

export function hexColor(hex: string, a = 255): Color {
    const c = new Color();
    Color.fromHEX(c, hex);
    c.a = a;
    return c;
}

const _tmpC = new Color();
export function setTint(s: Sprite, r: number, g: number, b: number, a = 255) {
    _tmpC.set(r, g, b, a);
    s.color = _tmpC;
}
export function setAlpha(s: Sprite, a: number) {
    const c = s.color;
    _tmpC.set(c.r, c.g, c.b, Math.max(0, Math.min(255, a)));
    s.color = _tmpC;
}

/** Simple pool of sprite nodes living under one parent. */
export class SpritePool {
    parent: Node;
    free: Sprite[] = [];
    constructor(parent: Node) { this.parent = parent; }
    get(frame: string, w?: number, h?: number, ax = 0.5, ay = 0.5): Sprite {
        let s = this.free.pop();
        if (!s) {
            s = mkSprite(this.parent, frame, w, h, ax, ay);
        } else {
            s.node.active = true;
            setFrame(s, frame, w, h);
            s.node.getComponent(UITransform).setAnchorPoint(ax, ay);
        }
        s.node.angle = 0;
        s.node.setScale(1, 1, 1);
        setTint(s, 255, 255, 255, 255);
        return s;
    }
    put(s: Sprite) {
        s.node.active = false;
        this.free.push(s);
    }
}

export const V3 = new Vec3();
