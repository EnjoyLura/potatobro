// Node creation helpers and pools.
import { Node, Sprite, UITransform, Layers, Color, Vec3, Material, gfx, builtinResMgr } from 'cc';
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
    mat: Material;
    constructor(parent: Node, mat: Material = null) { this.parent = parent; this.mat = mat; }
    get(frame: string, w?: number, h?: number, ax = 0.5, ay = 0.5): Sprite {
        let s = this.free.pop();
        if (!s) {
            s = mkSprite(this.parent, frame, w, h, ax, ay);
            if (this.mat) s.customMaterial = this.mat;
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

let _additive: Material | null | undefined;
/** Shared additive-blend sprite material for glows, flashes and sparks (null if it cannot be created). */
export function additiveMaterial(): Material | null {
    if (_additive !== undefined) return _additive;
    try {
        // reuse the effect of the engine's default sprite material ('for2d/builtin-sprite' in 3.8)
        const base = builtinResMgr.get<Material>('ui-sprite-material');
        const m = new Material();
        m.initialize({
            effectAsset: base ? base.effectAsset : undefined,
            effectName: base ? undefined : 'for2d/builtin-sprite',
            defines: { USE_TEXTURE: true },
            states: {
                blendState: {
                    targets: [{
                        blend: true,
                        blendSrc: gfx.BlendFactor.SRC_ALPHA, blendDst: gfx.BlendFactor.ONE,
                        blendSrcAlpha: gfx.BlendFactor.ONE, blendDstAlpha: gfx.BlendFactor.ONE,
                    }],
                },
            },
        });
        _additive = m.passes && m.passes.length ? m : null;
    } catch (e) {
        _additive = null;
    }
    return _additive;
}
