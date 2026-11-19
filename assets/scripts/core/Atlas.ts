// Runtime texture atlas: sprites are drawn procedurally with Canvas2D and packed
// into one (or a few) big textures so that all game sprites batch together.
import { director, ImageAsset, Texture2D, SpriteFrame, Rect, Size, Vec2 } from 'cc';

const PAD = 3;

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, sil: boolean) => void;

interface Entry {
    name: string; w: number; h: number; draw: DrawFn; sil: boolean;
    px?: number; py?: number; pw?: number; ph?: number; page?: number;
}

export class Atlas {
    static frames: { [name: string]: SpriteFrame } = {};
    static sizes: { [name: string]: { w: number; h: number } } = {};
    private static entries: Entry[] = [];
    private static textures: Texture2D[] = [];
    /** Screen pixels per design unit at startup (view scale: 1 on a 720p desktop, ~1.6 on a 3x phone). */
    static quality = 1;
    /** Texture pixels per world unit: 2 on desktops, up to 3 on dense phone screens (UI icons are drawn 1.3x there). */
    static scale = 2;
    /** Largest texture the GPU takes (atlas pages and the arena floor stay within it). */
    static maxTex = 2048;

    /** Register a sprite of logical size w×h. If `white` a flash silhouette "<name>_w" is generated too. */
    static add(name: string, w: number, h: number, draw: DrawFn, white = false) {
        this.entries.push({ name, w, h, draw, sil: false });
        if (white) this.entries.push({ name: name + '_w', w, h, draw, sil: true });
    }

    static get(name: string): SpriteFrame {
        const f = this.frames[name];
        if (!f) console.warn('[Atlas] missing frame', name);
        return f || this.frames['dot'];
    }
    static has(name: string) { return !!this.frames[name]; }

    static build(quality = 1) {
        this.quality = Math.max(1, quality || 1);
        const caps = (director.root && director.root.device && director.root.device.capabilities) as { maxTextureSize?: number } | undefined;
        this.maxTex = (caps && caps.maxTextureSize) || 2048;
        const S = this.scale = Math.min(3, Math.max(2, Math.ceil(this.quality * 1.3 * 4) / 4));
        const PAGE = this.maxTex >= 4096 ? 4096 : 2048;
        const list = this.entries.slice();
        for (const e of list) { e.pw = Math.ceil(e.w * S); e.ph = Math.ceil(e.h * S); }
        list.sort((a, b) => b.ph - a.ph);
        // shelf packing
        let page = 0, x = PAD, y = PAD, shelfH = 0;
        const pagesUsedH: number[] = [0];
        for (const e of list) {
            if (x + e.pw + PAD > PAGE) { x = PAD; y += shelfH + PAD; shelfH = 0; }
            if (y + e.ph + PAD > PAGE) { page++; x = PAD; y = PAD; shelfH = 0; pagesUsedH[page] = 0; }
            e.px = x; e.py = y; e.page = page;
            x += e.pw + PAD;
            shelfH = Math.max(shelfH, e.ph);
            pagesUsedH[page] = Math.max(pagesUsedH[page], y + e.ph + PAD);
        }
        const canvases: HTMLCanvasElement[] = [];
        for (let p = 0; p <= page; p++) {
            const c = document.createElement('canvas');
            c.width = PAGE;
            // keep power of two height for safety on WebGL1
            let h = 64; while (h < pagesUsedH[p]) h *= 2;
            c.height = Math.min(PAGE, h);
            canvases.push(c);
        }
        const tmp = document.createElement('canvas');
        const tctx = tmp.getContext('2d');
        for (const e of list) {
            const ctx = canvases[e.page].getContext('2d');
            if (!e.sil) {
                ctx.save();
                ctx.beginPath(); ctx.rect(e.px, e.py, e.pw, e.ph); ctx.clip();
                ctx.translate(e.px, e.py); ctx.scale(S, S);
                try { e.draw(ctx, e.w, e.h, false); } catch (err) { console.error('draw fail', e.name, err); }
                ctx.restore();
            } else {
                tmp.width = e.pw; tmp.height = e.ph;
                tctx.save();
                tctx.clearRect(0, 0, e.pw, e.ph);
                tctx.scale(S, S);
                try { e.draw(tctx, e.w, e.h, true); } catch (err) { console.error('draw fail', e.name, err); }
                tctx.restore();
                tctx.globalCompositeOperation = 'source-in';
                tctx.fillStyle = '#ffffff';
                tctx.fillRect(0, 0, e.pw, e.ph);
                tctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(tmp, e.px, e.py);
            }
        }
        for (let p = 0; p < canvases.length; p++) {
            const img = new ImageAsset(canvases[p]);
            const tex = new Texture2D();
            tex.image = img;
            tex.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
            tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
            this.textures.push(tex);
        }
        for (const e of list) {
            const sf = new SpriteFrame();
            sf.reset({
                texture: this.textures[e.page],
                rect: new Rect(e.px, e.py, e.pw, e.ph),
                originalSize: new Size(e.pw, e.ph),
                offset: new Vec2(0, 0),
                isRotate: false,
            });
            sf.packable = false;
            this.frames[e.name] = sf;
            this.sizes[e.name] = { w: e.w, h: e.h };
        }
        this.entries = [];
    }

    /** Standalone texture from a canvas (used for the arena floor). */
    static frameFromCanvas(c: HTMLCanvasElement): SpriteFrame {
        const img = new ImageAsset(c);
        const tex = new Texture2D();
        tex.image = img;
        tex.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
        const sf = new SpriteFrame();
        sf.reset({ texture: tex, rect: new Rect(0, 0, c.width, c.height), originalSize: new Size(c.width, c.height), offset: new Vec2(0, 0), isRotate: false });
        sf.packable = false;
        return sf;
    }
}
