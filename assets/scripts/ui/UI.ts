// All screens: menu, character select, loadout, HUD, level-up, crates, shop, pause, results.
import { Node, Label, Sprite, Vec3, UITransform, tween, EventTouch, Graphics, screen } from 'cc';
import { mkNode, mkSprite, setTint, setAlpha, hexColor } from '../core/Nodes';
import { Atlas } from '../core/Atlas';
import { Sfx } from '../core/Sfx';
import { Save } from '../core/Save';
import {
    COL, C, panel, shadowPanel, label, button, Btn, blocker, bar, Bar, icon, iconFit, popIn, clearChildren, size, opacity, tappable, drawRR,
} from './UIKit';
import { itemLines, weaponLines, classText, tierColor, statValueText, Line } from './Text';
import { CHARACTERS, CharDef } from '../data/Characters';
import { WEAPON_MAP, WEAPON_CLASSES, TIER_NAMES, TIER_BG, TIER_COLORS, WeaponDef } from '../data/Weapons';
import { ITEM_MAP, ItemDef } from '../data/Items';
import { STAT_DEFS, modText, statIsGood } from '../data/Stats';
import { DANGERS, MAX_WAVE } from '../data/Enemies';
import { Run, MAX_WEAPONS, UpgradeOption } from '../game/Run';

export interface UIHost {
    startRun(c: CharDef, weaponId: string, danger: number): void;
    nextWave(): void;
    resume(): void;
    quitToMenu(): void;
    restart(): void;
    continueEndless(): void;
    viewSize(): { w: number; h: number };
    run(): Run;
    bossInfo(): { name: string; hp: number; max: number } | null;
    waveInfo(): { time: number; wave: number };
    setMove(x: number, y: number): void;
    pause(): void;
}

export class UI {
    host: UIHost;
    root: Node;
    hudLayer: Node;
    inputLayer: Node;
    screen: Node;
    popup: Node;
    W = 1280; H = 720;
    // hud refs
    hud: Node = null;
    hpBar: Bar; xpBar: Bar; hpText: Label; lvText: Label; matText: Label; bagText: Label; waveText: Label; timeText: Label;
    bossNode: Node; bossBar: Bar; bossName: Label; vignette: Sprite; joyBase: Sprite; joyKnob: Sprite;
    private lastHud: any = {};
    // joystick
    joyId = -1; joyOX = 0; joyOY = 0;
    // menu selections
    selChar: CharDef = CHARACTERS[0];
    selWeapon = '';
    selDanger = 0;

    constructor(parent: Node, host: UIHost) {
        this.host = host;
        this.root = mkNode('UI', parent);
        this.inputLayer = mkNode('input', this.root);
        this.hudLayer = mkNode('hud', this.root);
        this.screen = mkNode('screen', this.root);
        this.popup = mkNode('popup', this.root);
        size(this.inputLayer, 4000, 3000);
        this.setupInput();
        this.updateSize();
    }

    scale = 1;
    updateSize() {
        const v = this.host.viewSize();
        // enlarge the UI on small (phone) screens so text stays readable
        const ws = screen.windowSize;
        const dpr = screen.devicePixelRatio || 1;
        const cssH = Math.min(ws.width, ws.height) / dpr;
        this.scale = cssH < 480 ? 1.3 : cssH < 640 ? 1.15 : 1;
        this.root.setScale(this.scale, this.scale, 1);
        this.W = v.w / this.scale; this.H = v.h / this.scale;
    }

    get L() { return -this.W / 2; }
    get R() { return this.W / 2; }
    get T() { return this.H / 2; }
    get B() { return -this.H / 2; }

    clearScreen() { clearChildren(this.screen); clearChildren(this.popup); }

    // ================================================================ input (floating joystick)
    setupInput() {
        const n = this.inputLayer;
        const toLocal = (e: EventTouch) => {
            const p = e.getUILocation();
            const ut = this.root.getComponent(UITransform) || size(this.root, 1, 1);
            const v = ut.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
            return v;
        };
        n.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            Sfx.unlock();
            if (this.joyId !== -1) return;
            this.joyId = e.getID();
            const v = toLocal(e);
            this.joyOX = v.x; this.joyOY = v.y;
            if (this.joyBase) {
                this.joyBase.node.active = true; this.joyKnob.node.active = true;
                this.joyBase.node.setPosition(v.x, v.y); this.joyKnob.node.setPosition(v.x, v.y);
            }
        });
        n.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (e.getID() !== this.joyId) return;
            const v = toLocal(e);
            let dx = v.x - this.joyOX, dy = v.y - this.joyOY;
            const R = 70;
            const d = Math.hypot(dx, dy);
            if (d > R) {
                // drag the base along
                this.joyOX = v.x - dx / d * R; this.joyOY = v.y - dy / d * R;
                dx = dx / d * R; dy = dy / d * R;
            }
            if (this.joyBase) {
                this.joyBase.node.setPosition(this.joyOX, this.joyOY);
                this.joyKnob.node.setPosition(this.joyOX + dx, this.joyOY + dy);
            }
            const k = Math.hypot(dx, dy) / R;
            if (k < 0.12) this.host.setMove(0, 0);
            else this.host.setMove(dx / R, dy / R);
        });
        const end = (e: EventTouch) => {
            if (e.getID() !== this.joyId) return;
            this.joyId = -1;
            this.host.setMove(0, 0);
            if (this.joyBase) { this.joyBase.node.active = false; this.joyKnob.node.active = false; }
        };
        n.on(Node.EventType.TOUCH_END, end);
        n.on(Node.EventType.TOUCH_CANCEL, end);
    }

    resetJoystick() {
        this.joyId = -1;
        this.host.setMove(0, 0);
        if (this.joyBase) { this.joyBase.node.active = false; this.joyKnob.node.active = false; }
    }

    // ================================================================ main menu
    showMenu() {
        this.updateSize();
        this.clearScreen();
        this.hideHud();
        const s = this.screen;
        // backdrop
        const bg = mkNode('bg', s);
        const g = bg.addComponent(Graphics);
        g.fillColor = C('#0f0b12', 150); g.rect(-this.W, -this.H, this.W * 2, this.H * 2); g.fill();
        // decorative characters
        const deco = mkNode('deco', s);
        const enemies = ['e_grub', 'e_runner', 'e_spitter', 'e_charger', 'e_brute', 'e_splitter', 'e_hatcher', 'e_bomber'];
        for (let i = 0; i < 14; i++) {
            const sp = mkSprite(deco, enemies[i % enemies.length]);
            const a = i / 14 * Math.PI * 2;
            const x = Math.cos(a) * (this.W * 0.42), y = Math.sin(a) * 250 - 30;
            sp.node.setPosition(x, y);
            const sc = 0.9 + (i % 3) * 0.2;
            sp.node.setScale(x > 0 ? sc : -sc, sc, 1);
            tween(sp.node).repeatForever(tween().by(0.6 + (i % 4) * 0.15, { position: new Vec3(0, 8, 0) }).by(0.6 + (i % 4) * 0.15, { position: new Vec3(0, -8, 0) })).start();
        }
        const H = this.H;
        const hk = Math.min(1, H / 720);
        const heroY = this.T - H * 0.47;
        const heroNode = mkNode('heroGroup', s);
        heroNode.setPosition(0, heroY);
        heroNode.setScale(hk, hk, 1);
        const hero = mkSprite(heroNode, 'c_unit', 72 * 2.2, 78 * 2.2);
        tween(hero.node).repeatForever(tween().to(0.5, { scale: new Vec3(1.04, 0.96, 1) }).to(0.5, { scale: new Vec3(0.97, 1.03, 1) })).start();
        for (let i = 0; i < 3; i++) {
            const ws = ['w_pistol', 'w_blade', 'w_wand'][i];
            const w = mkSprite(heroNode, ws, undefined, undefined, 0.2, 0.5);
            w.node.setScale(1.6, 1.6, 1);
            w.node.setPosition([95, -110, 100][i], [30, 20, -40][i]);
            w.node.angle = [20, 160, -15][i];
            if (i === 1) w.node.setScale(1.6, -1.6, 1);
        }
        const title = label(s, '核芯突围', Math.round(92 * Math.max(0.8, hk)), '#ffd166', { outline: 8 });
        title.node.setPosition(0, this.T - H * 0.14);
        const sub = label(s, 'CORE  RUSH  ·  外星虫潮生存战', 26, COL.text, { outline: 4 });
        sub.node.setPosition(0, this.T - H * 0.14 - 62);
        popIn(title.node);
        const start = button(s, 300, 80, '开始游戏', COL.btn, () => this.showCharSelect(), 38);
        start.node.setPosition(0, this.B + 160);
        tween(start.node).repeatForever(tween().to(0.7, { scale: new Vec3(1.05, 1.05, 1) }).to(0.7, { scale: new Vec3(1, 1, 1) })).start();
        // settings
        const mk = (txt: string, get: () => boolean, set: (v: boolean) => void, x: number) => {
            const b = button(s, 150, 54, '', COL.btnDark, () => { set(!get()); Save.save(); upd(); }, 22);
            const upd = () => { b.setText(txt + (get() ? ' 开' : ' 关')); b.setColor(get() ? '#4f8a5b' : COL.btnDark); };
            upd();
            b.node.setPosition(x, this.B + 70);
        };
        mk('音效', () => Save.data.sfx, v => { Save.data.sfx = v; Sfx.setSfx(v); }, -170);
        mk('音乐', () => Save.data.music, v => { Save.data.music = v; Sfx.setMusic(v); }, 0);
        mk('震屏', () => Save.data.shake, v => { Save.data.shake = v; }, 170);
        const st = label(s, `最高波次 ${Save.data.bestWave}   ·   总局数 ${Save.data.runs}   ·   总击杀 ${Save.data.kills}`, 20, COL.dim, { outline: 3 });
        st.node.setPosition(0, this.B + 22);
        const hint = label(s, '移动：在屏幕任意处拖动  ·  武器自动瞄准射击', 20, COL.dim, { outline: 3 });
        hint.node.setPosition(0, this.B + 220);
    }

    // ================================================================ character select
    showCharSelect() {
        this.updateSize();
        this.clearScreen();
        const s = this.screen;
        const dim = mkNode('dim', s); const dg = dim.addComponent(Graphics); dg.fillColor = C('#0f0b12', 200); dg.rect(-this.W, -this.H, this.W * 2, this.H * 2); dg.fill();
        const t = label(s, '选择机体', 46, COL.gold, { outline: 6 });
        t.node.setPosition(0, this.T - 46);
        const back = button(s, 120, 54, '返回', COL.btnDark, () => this.showMenu(), 24);
        back.node.setPosition(this.L + 85, this.T - 46);

        const detailW = 420;
        const gridW = this.W - detailW - 60;
        const cols = 5;
        const cw = Math.min(150, (gridW - (cols - 1) * 14) / cols), ch = cw * 1.1;
        const gx0 = this.L + 30 + cw / 2;
        const gy0 = this.T - 130 - ch / 2;
        const detail = mkNode('detail', s);
        detail.setPosition(this.R - detailW / 2 - 24, this.H < 650 ? 0 : -30);
        const cards: { c: CharDef; g: Graphics; w: number; h: number }[] = [];
        const redraw = () => {
            for (const cd of cards) drawRR(cd.g, cd.w, cd.h, cd.c === this.selChar ? '#5a4565' : COL.panel, cd.c === this.selChar ? COL.gold : COL.stroke, 14, cd.c === this.selChar ? 5 : 4);
        };
        CHARACTERS.forEach((c, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const n = mkNode('card', s);
            size(n, cw, ch);
            n.setPosition(gx0 + col * (cw + 14), gy0 - row * (ch + 16));
            const g = n.addComponent(Graphics);
            cards.push({ c, g, w: cw, h: ch });
            const sp = mkSprite(n, 'c_' + c.id, cw * 0.62, cw * 0.62 * 78 / 72);
            sp.node.setPosition(0, 10);
            const nm = label(n, c.name, 20, COL.text);
            nm.node.setPosition(0, -ch / 2 + 18);
            const win = Save.winLevel(c.id);
            if (win >= 0) {
                const cr = icon(n, 'g_crown', 26, 26, DANGERS[win].color);
                cr.node.setPosition(cw / 2 - 18, ch / 2 - 18);
            }
            tappable(n, () => { Sfx.click(); this.selChar = c; redraw(); this.charDetail(detail, detailW); });
            popIn(n, i * 0.02);
        });
        redraw();
        this.charDetail(detail, detailW);
        const go = button(s, 260, 68, '下一步', COL.btn, () => { this.selWeapon = this.selChar.weapons[0]; this.showLoadout(); }, 32);
        go.node.setPosition(this.R - detailW / 2 - 24, this.B + 48);
    }

    charDetail(parent: Node, w: number) {
        clearChildren(parent);
        const c = this.selChar;
        const h = Math.min(470, this.H - 190);
        shadowPanel(parent, w, h, COL.panel);
        const sp = mkSprite(parent, 'c_' + c.id, 100, 108);
        sp.node.setPosition(-w / 2 + 70, h / 2 - 70);
        const nm = label(parent, c.name, 34, COL.gold, { align: 'left' });
        nm.node.setPosition(-w / 2 + 135, h / 2 - 50);
        const tt = label(parent, c.title, 20, COL.dim, { align: 'left' });
        tt.node.setPosition(-w / 2 + 135, h / 2 - 88);
        let y = h / 2 - 150;
        const lines: Line[] = [];
        for (const k in c.mods) { const v = (c.mods as any)[k]; lines.push({ t: modText(k, v), c: statIsGood(k, v) ? COL.good : COL.bad }); }
        for (const tr of c.traits) lines.push({ t: '• ' + tr, c: COL.text });
        if (!lines.length) lines.push({ t: '无', c: COL.dim });
        for (const ln of lines) {
            const l = label(parent, ln.t, 22, ln.c, { align: 'left', width: w - 50 });
            l.node.setPosition(-w / 2 + 25, y);
            l.updateRenderData(true);
            y -= Math.max(32, l.node.getComponent(UITransform).height + 6);
        }
        const win = Save.winLevel(c.id);
        const wl = label(parent, win >= 0 ? `最高通关：${DANGERS[win].name}` : '尚未通关', 20, win >= 0 ? DANGERS[win].color : COL.dim, { align: 'left' });
        wl.node.setPosition(-w / 2 + 25, -h / 2 + 30);
    }

    // ================================================================ loadout (weapon + danger)
    showLoadout() {
        this.clearScreen();
        const s = this.screen;
        const c = this.selChar;
        const dim = mkNode('dim', s); const dg = dim.addComponent(Graphics); dg.fillColor = C('#0f0b12', 200); dg.rect(-this.W, -this.H, this.W * 2, this.H * 2); dg.fill();
        const t = label(s, '选择初始武器', 44, COL.gold, { outline: 6 });
        t.node.setPosition(0, this.T - 46);
        const back = button(s, 120, 54, '返回', COL.btnDark, () => this.showCharSelect(), 24);
        back.node.setPosition(this.L + 85, this.T - 46);
        const ws = c.weapons;
        const cw = Math.min(190, (this.W - 120 - (ws.length - 1) * 14) / ws.length), ch = Math.min(250, Math.round(this.H * 0.42));
        const x0 = -((ws.length - 1) * (cw + 14)) / 2;
        const cardY = this.T - 90 - ch / 2;
        const cards: { id: string; g: Graphics }[] = [];
        const redraw = () => { for (const cd of cards) drawRR(cd.g, cw, ch, cd.id === this.selWeapon ? '#5a4565' : COL.panel, cd.id === this.selWeapon ? COL.gold : COL.stroke, 14, cd.id === this.selWeapon ? 5 : 4); };
        ws.forEach((id, i) => {
            const def = WEAPON_MAP[id];
            const tier = def.minTier || 1;
            const n = mkNode('wcard', s);
            size(n, cw, ch);
            n.setPosition(x0 + i * (cw + 14), cardY);
            const g = n.addComponent(Graphics);
            cards.push({ id, g });
            const ic = iconFit(n, def.sprite, cw * 0.6, Atlas.sizes[def.sprite]);
            ic.node.setPosition(0, ch / 2 - 55);
            const nm = label(n, def.name, 22, tierColor(tier));
            nm.node.setPosition(0, ch / 2 - 110);
            const cl = label(n, classText(def), 16, COL.dim);
            cl.node.setPosition(0, ch / 2 - 138);
            const lines = weaponLines(def, tier, null).slice(0, ch > 240 ? 4 : 3);
            lines.forEach((ln, k) => {
                const l = label(n, ln.t, 15, ln.c, { outline: 2, width: cw - 10 });
                l.node.setPosition(0, ch / 2 - 165 - k * 22);
            });
            tappable(n, () => { Sfx.click(); this.selWeapon = id; redraw(); });
            popIn(n, i * 0.03);
        });
        redraw();
        // danger
        const dy = this.T - 90 - ch - 30;
        const dt = label(s, '选择危险等级', 28, COL.text, { outline: 4 });
        dt.node.setPosition(0, dy);
        const desc = label(s, '', 20, COL.dim, { outline: 3 });
        desc.node.setPosition(0, dy - 98);
        const btns: Btn[] = [];
        const upd = () => {
            btns.forEach((b, i) => b.setColor(i === this.selDanger ? DANGERS[i].color : COL.btnDark));
            desc.string = DANGERS[this.selDanger].desc;
        };
        const bw = Math.min(150, (this.W - 100) / 6 - 10);
        DANGERS.forEach((d, i) => {
            const b = button(s, bw, 60, d.name, COL.btnDark, () => { this.selDanger = i; upd(); }, 22);
            b.node.setPosition((i - 2.5) * (bw + 10), dy - 52);
            btns.push(b);
        });
        upd();
        const go = button(s, 300, 66, '出发！', COL.btn, () => this.host.startRun(this.selChar, this.selWeapon, this.selDanger), 36);
        go.node.setPosition(0, this.B + 42);
    }

    // ================================================================ HUD
    buildHud() {
        this.updateSize();
        clearChildren(this.hudLayer);
        const h = mkNode('hudroot', this.hudLayer);
        this.hud = h;
        this.lastHud = {};
        // vignette
        this.vignette = mkSprite(h, 'vignette', this.W + 40, this.H + 40);
        setTint(this.vignette, 200, 0, 20, 0);
        // joystick
        this.joyBase = mkSprite(h, 'joy_base');
        this.joyKnob = mkSprite(h, 'joy_knob');
        this.joyBase.node.active = false; this.joyKnob.node.active = false;
        const x0 = this.L + 24, y0 = this.T - 30;
        this.hpBar = bar(h, 270, 30, '#e8384f');
        this.hpBar.node.setPosition(x0 + 135, y0);
        this.hpText = label(h, '', 20, '#ffffff', { outline: 3 });
        this.hpText.node.setPosition(x0 + 135, y0);
        this.xpBar = bar(h, 270, 16, '#5fd35f');
        this.xpBar.node.setPosition(x0 + 135, y0 - 34);
        this.lvText = label(h, '', 15, '#ffffff', { outline: 3, align: 'right' });
        this.lvText.node.setPosition(x0 + 266, y0 - 34);
        const mi = icon(h, 'mat', 26, 28);
        mi.node.setPosition(x0 + 14, y0 - 72);
        this.matText = label(h, '0', 30, '#ffffff', { outline: 4, align: 'left' });
        this.matText.node.setPosition(x0 + 34, y0 - 72);
        this.bagText = label(h, '', 18, COL.mat, { outline: 3, align: 'left' });
        this.bagText.node.setPosition(x0 + 8, y0 - 104);
        // wave + time
        this.waveText = label(h, '', 26, '#ffffff', { outline: 4 });
        this.waveText.node.setPosition(0, this.T - 26);
        this.timeText = label(h, '', 52, '#ffffff', { outline: 6 });
        this.timeText.node.setPosition(0, this.T - 74);
        // boss bar
        this.bossNode = mkNode('boss', h);
        this.bossNode.setPosition(0, this.T - 130);
        this.bossBar = bar(this.bossNode, 440, 20, '#b04dff');
        this.bossName = label(this.bossNode, '', 20, '#ffffff', { outline: 3 });
        this.bossName.node.setPosition(0, 24);
        this.bossNode.active = false;
        // pause
        const pb = button(h, 64, 64, 'II', COL.btnDark, () => this.host.pause(), 28);
        pb.node.setPosition(this.R - 52, this.T - 48);
    }

    hideHud() { clearChildren(this.hudLayer); this.hud = null; this.joyBase = null; this.joyKnob = null; }

    updateHud() {
        if (!this.hud) return;
        const run = this.host.run();
        if (!run) return;
        const L = this.lastHud;
        const hp = Math.max(0, Math.ceil(run.hp)), mhp = run.maxHp;
        if (L.hp !== hp || L.mhp !== mhp) { L.hp = hp; L.mhp = mhp; this.hpBar.set(hp, mhp); this.hpText.string = `${hp} / ${mhp}`; }
        const need = run.xpNeeded();
        const xpk = Math.floor(run.xp / need * 100);
        if (L.xpk !== xpk || L.lv !== run.level) { L.xpk = xpk; L.lv = run.level; this.xpBar.set(run.xp, need); this.lvText.string = 'LV ' + run.level; }
        if (L.mats !== run.mats) { L.mats = run.mats; this.matText.string = '' + run.mats; }
        const bagStr = run.bag > 0 ? `背包 +${run.bag}` : '';
        if (L.bag !== bagStr) { L.bag = bagStr; this.bagText.string = bagStr; }
        const wi = this.host.waveInfo();
        const wt = `第 ${wi.wave} 波` + (run.endless ? '（无尽）' : '');
        if (L.wave !== wt) { L.wave = wt; this.waveText.string = wt; }
        const tt = Math.ceil(wi.time);
        if (L.time !== tt) {
            L.time = tt; this.timeText.string = '' + tt;
            this.timeText.color = C(tt <= 5 ? '#ff6b6b' : '#ffffff');
        }
        const boss = this.host.bossInfo();
        if (boss) {
            this.bossNode.active = true;
            this.bossBar.set(boss.hp, boss.max);
            if (L.boss !== boss.name) { L.boss = boss.name; this.bossName.string = boss.name; }
        } else if (this.bossNode.active) this.bossNode.active = false;
        // low hp vignette
        const k = hp / mhp;
        const va = k < 0.4 ? Math.round((0.4 - k) / 0.4 * 200 + (Math.sin(Date.now() / 150) + 1) * 15) : 0;
        if (L.va !== va) { L.va = va; setAlpha(this.vignette, va); }
    }

    toast(text: string, color = COL.gold, y = 120, size = 34) {
        const l = label(this.popup, text, size, color, { outline: 5 });
        l.node.setPosition(0, y);
        popIn(l.node);
        const o = opacity(l.node, 255);
        tween(l.node).delay(0.2).by(1.4, { position: new Vec3(0, 50, 0) }).call(() => l.node.destroy()).start();
        tween(o).delay(1.0).to(0.6, { opacity: 0 }).start();
    }

    // ================================================================ shared widgets
    statsPanel(parent: Node, w: number, h: number, run: Run): Node {
        const p = mkNode('stats', parent);
        shadowPanel(p, w, h, COL.panel);
        const t = label(p, '属性', 26, COL.gold);
        t.node.setPosition(0, h / 2 - 24);
        const prim = STAT_DEFS.filter(d => d.primary);
        const sec = STAT_DEFS.filter(d => !d.primary && Math.abs((run.stats as any)[d.key]) > 0.01);
        const rows = prim.length + (sec.length ? sec.length + 1 : 0);
        const rowH = Math.min(28, (h - 60) / rows);
        const fs = Math.max(14, Math.min(19, Math.floor(rowH * 0.72)));
        let y = h / 2 - 54;
        const row = (name: string, v: number, key: string, color?: string) => {
            const nl = label(p, name, fs, color || COL.text, { align: 'left', outline: 2 });
            nl.node.setPosition(-w / 2 + 16, y);
            const valColor = key === 'maxHp' ? COL.text : (v > 0.01 ? (statIsGood(key, v) ? COL.good : COL.bad) : v < -0.01 ? (statIsGood(key, v) ? COL.good : COL.bad) : COL.text);
            const vl = label(p, statValueText(key, v), fs, valColor, { align: 'right', outline: 2 });
            vl.node.setPosition(w / 2 - 16, y);
            y -= rowH;
        };
        for (const d of prim) row(d.name, (run.stats as any)[d.key], d.key);
        if (sec.length) {
            const sl = label(p, '— 其他 —', fs, COL.dim, { outline: 2 });
            sl.node.setPosition(0, y); y -= rowH;
            for (const d of sec) row(d.name, (run.stats as any)[d.key], d.key, COL.dim);
        }
        return p;
    }

    /** Generic card used by shop / crates / level up. */
    card(parent: Node, w: number, h: number, tier: number, iconFrame: string, iconTint: string | null, title: string, sub: string, lines: Line[], isWeapon: boolean): Node {
        const n = mkNode('card', parent);
        size(n, w, h);
        const sh = mkNode('sh', n); const sg = sh.addComponent(Graphics); drawRR(sg, w, h, '#000000', undefined, 16, 0, 100); sh.setPosition(0, -6);
        const bg = mkNode('bg', n); const g = bg.addComponent(Graphics);
        drawRR(g, w, h, TIER_BG[tier - 1], TIER_COLORS[tier - 1], 16, 4);
        // header: icon box on the left, title + subtitle on the right
        const ib = mkNode('ib', n); const ig = ib.addComponent(Graphics);
        drawRR(ig, 58, 58, '#000000', undefined, 10, 0, 70);
        ib.setPosition(-w / 2 + 37, h / 2 - 37);
        if (isWeapon) iconFit(ib, iconFrame, 52, Atlas.sizes[iconFrame]);
        else icon(ib, iconFrame, 46, 46, iconTint);
        const tl = label(n, title, w < 200 ? 17 : 19, TIER_COLORS[tier - 1], { align: 'left', width: w - 80, lineH: 21, anchorY: 1 });
        tl.node.setPosition(-w / 2 + 72, h / 2 - 9);
        tl.updateRenderData(true);
        let ty = h / 2 - 9 - tl.node.getComponent(UITransform).height - 2;
        const sl = label(n, sub, 13, COL.dim, { align: 'left', width: w - 80, outline: 2, lineH: 16, anchorY: 1 });
        sl.node.setPosition(-w / 2 + 72, ty);
        sl.updateRenderData(true);
        ty -= sl.node.getComponent(UITransform).height;
        let y = Math.min(h / 2 - 72, ty - 6);
        const fs = w < 190 ? 14 : 15;
        for (const ln of lines) {
            const l = label(n, ln.t, fs, ln.c, { align: 'left', width: w - 20, outline: 2, lineH: fs + 4, anchorY: 1 });
            l.node.setPosition(-w / 2 + 10, y);
            l.updateRenderData(true);
            y -= l.node.getComponent(UITransform).height + 2;
        }
        return n;
    }

    weaponCell(parent: Node, wpn: { id: string; tier: number }, sz: number): Node {
        const def = WEAPON_MAP[wpn.id];
        const n = mkNode('wcell', parent);
        size(n, sz, sz);
        const g = n.addComponent(Graphics);
        drawRR(g, sz, sz, TIER_BG[wpn.tier - 1], TIER_COLORS[wpn.tier - 1], 10, 3);
        iconFit(n, def.sprite, sz * 0.8, Atlas.sizes[def.sprite]);
        const tl = label(n, TIER_NAMES[wpn.tier - 1], 14, TIER_COLORS[wpn.tier - 1], { outline: 2, align: 'right' });
        tl.node.setPosition(sz / 2 - 5, -sz / 2 + 11);
        return n;
    }

    itemCell(parent: Node, it: ItemDef, count: number, sz: number): Node {
        const n = mkNode('icell', parent);
        size(n, sz, sz);
        const g = n.addComponent(Graphics);
        drawRR(g, sz, sz, TIER_BG[it.tier - 1], TIER_COLORS[it.tier - 1], 9, 3);
        icon(n, 'g_' + it.glyph, sz * 0.74, sz * 0.74, it.color);
        if (count > 1) {
            const cl = label(n, 'x' + count, 14, '#ffffff', { outline: 2, align: 'right' });
            cl.node.setPosition(sz / 2 - 3, -sz / 2 + 10);
        }
        return n;
    }

    infoPopup(build: (p: Node, w: number, h: number) => void, w = 420, h = 360) {
        const b = blocker(this.popup, 120);
        const p = mkNode('pop', this.popup);
        shadowPanel(p, w, h, COL.panel2, COL.gold);
        build(p, w, h);
        popIn(p);
        const close = () => { b.destroy(); p.destroy(); };
        tappable(b, close);
        return close;
    }

    // ================================================================ level up
    showLevelUp(onDone: () => void) {
        const run = this.host.run();
        this.clearScreen();
        const s = this.screen;
        blocker(s, 200);
        const holder = mkNode('lvl', s);
        let rerolls = 0;
        const build = () => {
            clearChildren(holder);
            const s = holder;
            const statW = (this.W - 380 - 48) / 4 < 160 ? 0 : 300;
            const t = label(s, `升级！ LV ${run.level - run.levelsPending + 1}`, 48, COL.gold, { outline: 6 });
            t.node.setPosition(-statW / 2 - 10, this.T - 60);
            if (run.levelsPending > 1) {
                const r = label(s, `还有 ${run.levelsPending - 1} 次升级`, 22, COL.dim);
                r.node.setPosition(-statW / 2 - 10, this.T - 108);
            }
            const opts = run.rollUpgrades();
            const avail = statW ? this.W - statW - 80 : this.W - 60;
            const cw = Math.min(230, (avail - 3 * 16) / 4), ch = Math.min(300, this.H - 250);
            const x0 = this.L + 30 + cw / 2;
            opts.forEach((o, i) => {
                const n = this.upgradeCard(s, cw, ch, o);
                n.setPosition(x0 + i * (cw + 16), -12);
                popIn(n, i * 0.05);
                tappable(n, () => {
                    run.applyUpgrade(o);
                    run.levelsPending--;
                    Sfx.levelUp();
                    if (run.levelsPending > 0) { rerolls = 0; build(); }
                    else onDone();
                });
            });
            const cost = Math.max(1, Math.round(run.wave * 0.6)) + rerolls * Math.max(1, Math.round(run.wave * 0.4));
            const rb = button(s, 230, 64, `刷新 ◆${cost}`, run.mats >= cost ? '#4f8a5b' : COL.btnDark, () => {
                if (run.mats < cost) { Sfx.deny(); return; }
                run.mats -= cost; rerolls++; Sfx.reroll(); build();
            }, 26);
            rb.node.setPosition(x0 + 1.5 * (cw + 16), this.B + 70);
            const ml = label(s, `◆ ${run.mats}`, 28, COL.mat, { align: 'left' });
            ml.node.setPosition(this.L + 30, this.B + 70);
            if (statW) {
                const sp = this.statsPanel(s, statW, this.H - 40, run);
                sp.setPosition(this.R - statW / 2 - 15, 0);
            }
        };
        build();
    }

    upgradeCard(parent: Node, w: number, h: number, o: UpgradeOption): Node {
        const n = mkNode('up', parent);
        size(n, w, h);
        const tier = o.tier + 1;
        const sh = mkNode('sh', n); const sg = sh.addComponent(Graphics); drawRR(sg, w, h, '#000000', undefined, 16, 0, 100); sh.setPosition(0, -6);
        const bg = mkNode('bg', n); const g = bg.addComponent(Graphics);
        drawRR(g, w, h, TIER_BG[tier - 1], TIER_COLORS[tier - 1], 16, 4);
        const ic = icon(n, 'g_' + o.up.glyph, 96, 96, o.up.color);
        ic.node.setPosition(0, h / 2 - 80);
        const nm = label(n, o.up.name + ' ' + TIER_NAMES[o.tier], 24, TIER_COLORS[tier - 1]);
        nm.node.setPosition(0, h / 2 - 160);
        const v = label(n, modText(o.up.stat, o.value), 24, COL.good, { width: w - 20 });
        v.node.setPosition(0, h / 2 - 210);
        const tap = label(n, '点击选择', 16, COL.dim, { outline: 2 });
        tap.node.setPosition(0, -h / 2 + 22);
        return n;
    }

    // ================================================================ crates
    showCrate(tier: number, onDone: () => void) {
        const run = this.host.run();
        this.clearScreen();
        const s = this.screen;
        blocker(s, 200);
        const rarity = tier >= 2 ? Math.max(3, run.rollTier(0.15)) : run.rollTier(0.05);
        const it = run.randomItem(Math.min(4, rarity));
        const t = label(s, tier >= 2 ? '精英宝箱！' : '发现补给箱！', 46, COL.gold, { outline: 6 });
        t.node.setPosition(0, this.T - 56);
        if (run.crates.length > 0) {
            const r = label(s, `还有 ${run.crates.length} 个箱子`, 22, COL.dim);
            r.node.setPosition(0, this.T - 100);
        }
        const c = this.card(s, 320, Math.min(300, this.H - 260), it.tier, 'g_' + it.glyph, it.color, it.name, ['', '普通', '优秀', '稀有', '传说'][it.tier] + ' 物品', itemLines(it), false);
        c.setPosition(0, -5);
        popIn(c);
        const recycle = Math.max(1, Math.round(run.itemPrice(it.id) * 0.35));
        const take = button(s, 200, 70, '拿取', COL.btn, () => { run.addItem(it.id); Sfx.buy(); onDone(); }, 30);
        take.node.setPosition(-115, this.B + 55);
        const rec = button(s, 200, 70, `回收 ◆${recycle}`, '#4f8a5b', () => { run.mats += recycle; Sfx.pickup(); onDone(); }, 26);
        rec.node.setPosition(115, this.B + 55);
    }

    // ================================================================ shop
    showShop() {
        const run = this.host.run();
        this.updateSize();
        this.clearScreen();
        this.hideHud();
        const s = this.screen;
        blocker(s, 215);
        // narrow screens: stats panel goes behind a button so the cards stay readable
        const narrow = (this.W - 330 - 42) / 4 < 175;
        const statW = narrow ? 0 : (this.W < 1300 ? 270 : 300);
        const areaW = narrow ? this.W - 40 : this.W - statW - 60;
        const invW = narrow ? areaW - 280 : areaW;
        const areaL = this.L + 20;
        const areaCX = areaL + areaW / 2;
        // header
        const t = label(s, `商店`, 42, COL.gold, { outline: 5, align: 'left' });
        t.node.setPosition(areaL + 4, this.T - 34);
        const wv = label(s, `第 ${run.wave} 波已完成`, 20, COL.dim, { align: 'left' });
        wv.node.setPosition(areaL + 110, this.T - 38);
        const mi = icon(s, 'mat', 28, 30);
        mi.node.setPosition(areaCX - 20, this.T - 34);
        const matL = label(s, '' + run.mats, 34, '#ffffff', { align: 'left', outline: 4 });
        matL.node.setPosition(areaCX, this.T - 34);
        const cards = mkNode('cards', s);
        const inv = mkNode('inv', s);
        let rerollBtn: Btn = null;
        const statsHolder = mkNode('statsHolder', s);
        const refreshStats = () => {
            clearChildren(statsHolder);
            if (narrow) return;
            const sp = this.statsPanel(statsHolder, statW, this.H - 120, run);
            sp.setPosition(this.R - statW / 2 - 15, 45);
        };
        const refreshMats = () => { matL.string = '' + run.mats; };
        const cw = Math.min(250, (areaW - 3 * 14) / 4), ch = Math.min(400, this.H - 262);
        const buildCards = () => {
            clearChildren(cards);
            run.shop.forEach((slot, i) => {
                const x = areaL + cw / 2 + i * (cw + 14);
                const y = this.T - 66 - ch / 2;
                if (slot.sold) {
                    const sn = panel(cards, cw, ch, '#00000000'.slice(0, 7), '#3b3340', 16, 3, 40);
                    sn.setPosition(x, y);
                    const sl = label(sn, '已售出', 24, '#5d5263', { outline: 0 });
                    return;
                }
                let n: Node;
                if (slot.kind === 'weapon') {
                    const def = WEAPON_MAP[slot.id];
                    n = this.card(cards, cw, ch, slot.tier, def.sprite, null, def.name + ' ' + TIER_NAMES[slot.tier - 1], '武器 · ' + classText(def), weaponLines(def, slot.tier, run.stats), true);
                    if (!run.canEquip(def)) {
                        const nl = label(n, '无法装备', 18, COL.bad);
                        nl.node.setPosition(0, -ch / 2 + 76);
                    }
                } else {
                    const it = ITEM_MAP[slot.id];
                    const cnt = run.itemCount(it.id);
                    n = this.card(cards, cw, ch, it.tier, 'g_' + it.glyph, it.color, it.name, '物品' + (cnt ? `（已有 ${cnt}）` : ''), itemLines(it), false);
                }
                n.setPosition(x, y);
                const afford = run.mats >= slot.price;
                const canAdd = slot.kind === 'weapon' ? run.canAddWeapon(slot.id, slot.tier) : run.canTakeItem(ITEM_MAP[slot.id]);
                const bb = button(n, cw - 76, 50, `◆ ${slot.price}`, afford && canAdd ? '#4f8a5b' : COL.btnDark, () => {
                    if (!afford) { Sfx.deny(); this.toast('晶体不足', COL.bad, 0, 28); return; }
                    if (!canAdd) { Sfx.deny(); this.toast(slot.kind === 'weapon' ? '武器栏已满' : '无法携带更多', COL.bad, 0, 28); return; }
                    if (run.buy(i)) { Sfx.buy(); refreshAll(); }
                }, 26);
                bb.node.setPosition(-26, -ch / 2 + 34);
                // lock toggle (next to the price)
                const locked = run.locked[i];
                const lk = button(n, 48, 50, locked ? '已锁' : '锁定', locked ? '#c27c2c' : COL.btnDark, () => { run.locked[i] = !run.locked[i]; buildCards(); }, 14);
                lk.node.setPosition(cw / 2 - 34, -ch / 2 + 34);
                popIn(n, i * 0.03);
            });
            // reroll
            if (rerollBtn) rerollBtn.node.destroy();
            const rp = run.rerollPrice();
            rerollBtn = button(s, 210, 56, rp === 0 ? '免费刷新' : `刷新 ◆${rp}`, run.mats >= rp ? '#4f8a5b' : COL.btnDark, () => {
                if (!run.doReroll()) { Sfx.deny(); return; }
                Sfx.reroll(); refreshAll();
            }, 24);
            rerollBtn.node.setPosition(areaL + areaW - 105, this.T - 34);
        };
        const buildInv = () => {
            clearChildren(inv);
            const y0 = this.T - 66 - ch - 16;
            const wl = label(inv, `武器 (${run.weapons.length}/${MAX_WEAPONS})`, 20, COL.text, { align: 'left' });
            wl.node.setPosition(areaL + 4, y0);
            const ws = 58;
            run.weapons.forEach((w, i) => {
                const c = this.weaponCell(inv, w, ws);
                c.setPosition(areaL + ws / 2 + i * (ws + 8), y0 - 38);
                if (run.canCombine(i)) {
                    const pl = label(c, '+', 22, COL.good, { outline: 3 });
                    pl.node.setPosition(-ws / 2 + 10, ws / 2 - 12);
                }
                tappable(c, () => this.weaponPopup(i, refreshAll));
            });
            // class bonuses
            const counts = run.classCounts();
            const bonusTxt: string[] = [];
            for (const k in counts) if (counts[k] >= 2) {
                const cls = WEAPON_CLASSES[k];
                const mods = cls.bonus[Math.min(6, counts[k]) - 2];
                bonusTxt.push(`${cls.name}×${counts[k]}: ` + Object.keys(mods).map(m => modText(m, (mods as any)[m])).join(' '));
            }
            const bx = areaL + 6 * (ws + 8) + 14;
            const bl = label(inv, bonusTxt.length ? '套装加成\n' + bonusTxt.join('\n') : '同类武器≥2把时获得套装加成', 15, bonusTxt.length ? COL.good : COL.dim, { align: 'left', width: Math.max(120, areaL + invW - bx), outline: 2, anchorY: 1, lineH: 19 });
            bl.node.setPosition(bx, y0 + 10);
            const il = label(inv, `物品 (${run.itemOrder.length})`, 20, COL.text, { align: 'left' });
            il.node.setPosition(areaL + 4, y0 - 80);
            const is = 40;
            const perRow = Math.max(1, Math.floor(invW / (is + 4)));
            run.itemOrder.forEach((id, i) => {
                const it = ITEM_MAP[id];
                const c = this.itemCell(inv, it, run.items[id], is);
                c.setPosition(areaL + is / 2 + (i % perRow) * (is + 4), y0 - 108 - Math.floor(i / perRow) * (is + 4));
                tappable(c, () => this.infoPopup((p, w, h) => {
                    const cc = this.card(p, w - 20, h - 20, it.tier, 'g_' + it.glyph, it.color, it.name + (run.items[id] > 1 ? ` x${run.items[id]}` : ''), '物品', itemLines(it), false);
                }, 320, 320));
            });
        };
        const refreshAll = () => { refreshMats(); buildCards(); buildInv(); refreshStats(); };
        refreshAll();
        if (narrow) {
            const go = button(s, 260, 62, `出发 → 第 ${run.wave + 1} 波`, COL.btn, () => this.host.nextWave(), 26);
            go.node.setPosition(this.R - 150, this.B + 40);
            const sb = button(s, 260, 50, '查看属性', COL.btnDark, () => {
                const b = blocker(this.popup, 160);
                const h = this.H - 40;
                const sp = this.statsPanel(this.popup, 320, h, run);
                popIn(sp);
                tappable(b, () => { b.destroy(); sp.destroy(); });
                tappable(sp, () => { b.destroy(); sp.destroy(); });
            }, 22);
            sb.node.setPosition(this.R - 150, this.B + 104);
        } else {
            const go = button(s, statW, 70, `出发 → 第 ${run.wave + 1} 波`, COL.btn, () => this.host.nextWave(), 28);
            go.node.setPosition(this.R - statW / 2 - 15, this.B + 45);
        }
    }

    weaponPopup(idx: number, onChange: () => void) {
        const run = this.host.run();
        const w = run.weapons[idx];
        const def = WEAPON_MAP[w.id];
        const close = this.infoPopup((p, pw, ph) => {
            const c = this.card(p, pw - 20, ph - 110, w.tier, def.sprite, null, def.name + ' ' + TIER_NAMES[w.tier - 1], '武器 · ' + classText(def), weaponLines(def, w.tier, run.stats), true);
            c.setPosition(0, 40);
            const canC = run.canCombine(idx);
            const cb = button(p, 150, 56, '合成', canC ? '#7e57c2' : COL.btnDark, () => {
                if (!canC) { Sfx.deny(); this.toast('需要两把相同阶级的同种武器', COL.bad, 0, 24); return; }
                run.combine(idx); Sfx.levelUp(); close(); onChange();
            }, 24);
            cb.node.setPosition(-85, -ph / 2 + 45);
            const sv = run.sellValue(w);
            const sb = button(p, 150, 56, `出售 ◆${sv}`, run.weapons.length > 1 ? '#b8473f' : COL.btnDark, () => {
                if (run.weapons.length <= 1) { Sfx.deny(); this.toast('至少保留一把武器', COL.bad, 0, 24); return; }
                run.sell(idx); Sfx.buy(); close(); onChange();
            }, 24);
            sb.node.setPosition(85, -ph / 2 + 45);
        }, 380, 470);
    }

    // ================================================================ pause
    showPause() {
        const run = this.host.run();
        clearChildren(this.popup);
        const p = this.popup;
        blocker(p, 200);
        const t = label(p, '暂停', 56, COL.gold, { outline: 6 });
        t.node.setPosition(0, this.T - 60);
        const statW = this.W < 900 ? 240 : 300;
        const sp = this.statsPanel(p, statW, this.H - 40, run);
        sp.setPosition(this.R - statW / 2 - 15, 0);
        // inventory
        const areaL = this.L + 30;
        const wl = label(p, '武器', 22, COL.text, { align: 'left' });
        wl.node.setPosition(areaL, this.T - 130);
        run.weapons.forEach((w, i) => {
            const c = this.weaponCell(p, w, 60);
            c.setPosition(areaL + 30 + i * 68, this.T - 175);
            tappable(c, () => {
                const def = WEAPON_MAP[w.id];
                this.infoPopup((pp, pw, ph) => {
                    this.card(pp, pw - 20, ph - 20, w.tier, def.sprite, null, def.name + ' ' + TIER_NAMES[w.tier - 1], '武器 · ' + classText(def), weaponLines(def, w.tier, run.stats), true);
                }, 360, 380);
            });
        });
        const il = label(p, '物品', 22, COL.text, { align: 'left' });
        il.node.setPosition(areaL, this.T - 235);
        const areaW = this.W - statW - 80;
        const per = Math.max(1, Math.floor(areaW / 52));
        run.itemOrder.forEach((id, i) => {
            const it = ITEM_MAP[id];
            const c = this.itemCell(p, it, run.items[id], 46);
            c.setPosition(areaL + 23 + (i % per) * 52, this.T - 270 - Math.floor(i / per) * 52);
            tappable(c, () => this.infoPopup((pp, w, h) => {
                this.card(pp, w - 20, h - 20, it.tier, 'g_' + it.glyph, it.color, it.name, '物品', itemLines(it), false);
            }, 320, 320));
        });
        const cx = areaL + areaW / 2;
        const res = button(p, 260, 70, '继续', COL.btn, () => { clearChildren(this.popup); this.host.resume(); }, 32);
        res.node.setPosition(cx, this.B + 170);
        const mk = (txt: string, get: () => boolean, set: (v: boolean) => void, x: number) => {
            const b = button(p, 130, 50, '', COL.btnDark, () => { set(!get()); Save.save(); upd(); }, 20);
            const upd = () => { b.setText(txt + (get() ? ' 开' : ' 关')); b.setColor(get() ? '#4f8a5b' : COL.btnDark); };
            upd();
            b.node.setPosition(x, this.B + 90);
        };
        mk('音效', () => Save.data.sfx, v => { Save.data.sfx = v; Sfx.setSfx(v); }, cx - 140);
        mk('音乐', () => Save.data.music, v => { Save.data.music = v; Sfx.setMusic(v); }, cx);
        mk('震屏', () => Save.data.shake, v => { Save.data.shake = v; }, cx + 140);
        const quit = button(p, 200, 50, '放弃本局', '#b8473f', () => {
            this.infoPopup((pp, w, h) => {
                const q = label(pp, '确定放弃本局吗？', 28, COL.text);
                q.node.setPosition(0, 40);
                const y = button(pp, 140, 56, '放弃', '#b8473f', () => { clearChildren(this.popup); this.host.quitToMenu(); }, 24);
                y.node.setPosition(-80, -50);
                const n = button(pp, 140, 56, '取消', COL.btnDark, () => { this.showPause(); }, 24);
                n.node.setPosition(80, -50);
            }, 380, 220);
        }, 22);
        quit.node.setPosition(cx, this.B + 30);
    }

    // ================================================================ results
    showResult(win: boolean) {
        const run = this.host.run();
        this.clearScreen();
        this.hideHud();
        const s = this.screen;
        blocker(s, 210);
        const t = label(s, win ? '胜利！' : '核芯损毁', 76, win ? COL.gold : COL.bad, { outline: 8 });
        t.node.setPosition(0, this.T - 70);
        popIn(t.node);
        const sub = label(s, win ? `你在 ${run.dangerDef.name} 中坚持了 ${MAX_WAVE} 波！` : `倒在了第 ${run.wave} 波`, 26, COL.text);
        sub.node.setPosition(0, this.T - 135);
        const pw = 520, ph = Math.min(290, this.H - 280);
        const p = mkNode('p', s);
        p.setPosition(-150, -25);
        shadowPanel(p, pw, ph, COL.panel);
        const sp = mkSprite(p, 'c_' + run.char.id, 110, 119);
        sp.node.setPosition(-pw / 2 + 85, ph / 2 - 90);
        const nm = label(p, run.char.name, 26, COL.gold);
        nm.node.setPosition(-pw / 2 + 85, ph / 2 - 175);
        const rows: [string, string][] = [
            ['波次', `${run.wave}${run.endless ? '（无尽）' : ''}`],
            ['等级', '' + run.level],
            ['击杀', '' + run.kills],
            ['收集晶体', '' + run.matsCollected],
            ['总伤害', '' + Math.round(run.damageDone)],
            ['危险等级', run.dangerDef.name],
        ];
        rows.forEach((r, i) => {
            const a = label(p, r[0], 22, COL.dim, { align: 'left' });
            a.node.setPosition(-pw / 2 + 180, ph / 2 - 40 - i * 40);
            const b = label(p, r[1], 22, COL.text, { align: 'right' });
            b.node.setPosition(pw / 2 - 30, ph / 2 - 40 - i * 40);
        });
        // weapons summary
        const wp = mkNode('w', s);
        wp.setPosition(270, -25);
        shadowPanel(wp, 300, ph, COL.panel);
        const wl = label(wp, '最终构筑', 22, COL.gold);
        wl.node.setPosition(0, ph / 2 - 26);
        run.weapons.forEach((w, i) => {
            const c = this.weaponCell(wp, w, 56);
            c.setPosition(-100 + (i % 3) * 100, ph / 2 - 85 - Math.floor(i / 3) * 66);
        });
        run.itemOrder.slice(0, 12).forEach((id, i) => {
            const c = this.itemCell(wp, ITEM_MAP[id], run.items[id], 36);
            c.setPosition(-110 + (i % 6) * 44, ph / 2 - 225 - Math.floor(i / 6) * 42);
        });
        if (win && !run.endless) {
            const e = button(s, 260, 66, '继续（无尽模式）', '#7e57c2', () => this.host.continueEndless(), 24);
            e.node.setPosition(-290, this.B + 60);
        }
        const r = button(s, 240, 66, '再来一局', COL.btn, () => this.host.restart(), 28);
        r.node.setPosition(win && !run.endless ? 0 : -140, this.B + 60);
        const m = button(s, 240, 66, '主菜单', COL.btnDark, () => this.host.quitToMenu(), 28);
        m.node.setPosition(win && !run.endless ? 290 : 140, this.B + 60);
    }
}
