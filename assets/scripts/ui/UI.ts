// All screens: menu, character select, loadout, HUD, level-up, crates, shop, pause, results.
import { Node, Label, Sprite, Vec3, UITransform, tween, EventTouch, Graphics, screen } from 'cc';
import { mkNode, mkSprite, setTint, setAlpha, hexColor } from '../core/Nodes';
import { Atlas } from '../core/Atlas';
import { Sfx } from '../core/Sfx';
import { Save } from '../core/Save';
import {
    COL, C, panel, shadowPanel, label, button, Btn, blocker, bar, Bar, icon, iconFit, popIn, clearChildren, size, opacity, tappable, tapSound, drawRR,
    pill, slider, toggle, cellBg,
} from './UIKit';
import { STAGES, StageDef, ENDLESS } from '../data/Stages';
import { showStageSelect } from './StageUI';
import { showCodex } from './CodexUI';
import { showSaves, showCloudConflict } from './SaveUI';

/** Shown on the main menu and settings screen; bump with each release (see changelogPopup). */
export const VERSION = 'V1.5';
import { itemLines, weaponLines, classText, tierColor, statValueText, Line } from './Text';
import { CHARACTERS, CharDef } from '../data/Characters';
import { WEAPON_MAP, WEAPON_CLASSES, TIER_NAMES, TIER_BG, TIER_COLORS, WeaponDef } from '../data/Weapons';
import { ITEM_MAP, ItemDef } from '../data/Items';
import { STAT_DEFS, modText, statIsGood } from '../data/Stats';
import { DANGERS, MAX_WAVE } from '../data/Enemies';
import { Run, MAX_WEAPONS, UpgradeOption } from '../game/Run';

export interface UIHost {
    startRun(c: CharDef, weaponId: string, danger: number, stage: StageDef, endless?: boolean): void;
    previewStage(st: StageDef): void;
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
    selStage: StageDef = STAGES[0];
    /** '难度三' or '无尽模式' for the current stage screen choice. */
    dangerLabel() { return this.selDanger === ENDLESS ? '无尽模式' : DANGERS[this.selDanger].name; }
    /** Which full screen is showing (rebuilt on resize / cloud save changes). */
    screenName = '';

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
    /** Safe-area insets (notch, home indicator) in UI units, already applied to W/H and the root position. */
    safe = { l: 0, r: 0, t: 0, b: 0 };
    updateSize() {
        const v = this.host.viewSize();
        // enlarge the UI on small (phone) screens so text stays readable
        const ws = screen.windowSize;
        const dpr = screen.devicePixelRatio || 1;
        const winW = ws.width / dpr, winH = ws.height / dpr;
        // CSS size of the drawn game area (smaller than the window when letterboxed)
        const cssH = Math.min(winH, winW * v.h / v.w), cssW = cssH * v.w / v.h;
        this.scale = cssH < 480 ? 1.3 : cssH < 640 ? 1.15 : 1;
        this.root.setScale(this.scale, this.scale, 1);
        // label text is rendered this much sharper (engine hook from tools/postbuild.py + index.ejs)
        (window as unknown as { __CR_TEXT_SCALE?: number }).__CR_TEXT_SCALE = this.scale;
        // keep HUD and buttons out of the notch / rounded corners / home indicator
        const ins = safeInsetsCss(winW, winH);
        const k = v.h / cssH / this.scale; // UI units per CSS pixel
        const side = Math.max(ins.l, ins.r) * k; // symmetric, so screens stay centered
        const sf = this.safe = { l: side, r: side, t: ins.t * k, b: ins.b * k };
        this.W = v.w / this.scale - sf.l - sf.r;
        this.H = v.h / this.scale - sf.t - sf.b;
        this.root.setPosition((sf.l - sf.r) / 2 * this.scale, (sf.b - sf.t) / 2 * this.scale, 0);
    }

    get L() { return -this.W / 2; }
    get R() { return this.W / 2; }
    get T() { return this.H / 2; }
    get B() { return -this.H / 2; }

    clearScreen() { clearChildren(this.screen); clearChildren(this.popup); }

    // ================================================================ input (floating joystick)
    setupInput() {
        const n = this.inputLayer;
        tapSound(n); // a quick tap on empty space clicks (drags for the joystick stay quiet)
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
    /** True while the settings screen opened from the main menu is showing (rebuilt on resize). */
    inSettings = false;

    /**
     * Main menu: title and a stack of pill buttons in a left column, art on the right,
     * secondary pills along the top right, records at the bottom right.
     */
    showMenu() {
        this.inSettings = false;
        this.screenName = 'menu';
        this.updateSize();
        this.clearScreen();
        this.hideHud();
        const s = this.screen;
        const H = this.H, hk = Math.min(1, H / 720);
        // backdrop: darker on the left behind the buttons
        const bg = mkNode('bg', s);
        const g = bg.addComponent(Graphics);
        g.fillColor = C('#0f0b12', 110); g.rect(-this.W, -this.H, this.W * 2, this.H * 2); g.fill();
        const colW = Math.min(440, this.W * 0.4);
        const colX = this.L + 30 + colW / 2;

        // right half: hero with weapons, enemies around it
        const artL = this.L + colW + 60, artCX = (artL + this.R) / 2, artCY = -H * 0.04;
        const deco = mkNode('deco', s);
        const enemies = ['e_grub', 'e_runner', 'e_spitter', 'e_charger', 'e_brute', 'e_splitter', 'e_hatcher', 'e_bomber'];
        const rx = (this.R - artL) * 0.42, ry = H * 0.34;
        for (let i = 0; i < 12; i++) {
            const sp = mkSprite(deco, enemies[i % enemies.length]);
            const a = i / 12 * Math.PI * 2 + 0.3;
            const x = artCX + Math.cos(a) * rx, y = artCY + Math.sin(a) * ry;
            sp.node.setPosition(x, y);
            const sc = (0.85 + (i % 3) * 0.2) * Math.max(0.8, hk);
            sp.node.setScale(x > artCX ? -sc : sc, sc, 1);
            tween(sp.node).repeatForever(tween().by(0.6 + (i % 4) * 0.15, { position: new Vec3(0, 8, 0) }).by(0.6 + (i % 4) * 0.15, { position: new Vec3(0, -8, 0) })).start();
        }
        const heroNode = mkNode('heroGroup', s);
        heroNode.setPosition(artCX, artCY);
        const hs = Math.max(0.8, hk) * 1.25;
        heroNode.setScale(hs, hs, 1);
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

        // left column: title, buttons, version
        const titleY = this.T - H * 0.2;
        const title = label(s, '核芯突围', Math.round(96 * Math.max(0.75, hk)), '#ffd166', { outline: 9 });
        title.node.setPosition(colX, titleY);
        popIn(title.node);
        const sub = label(s, '万械狂潮  ·  CORE RUSH: OVERDRIVE', Math.round(24 * Math.max(0.85, hk)), COL.text, { outline: 4 });
        sub.node.setPosition(colX, titleY - Math.round(70 * Math.max(0.75, hk)));
        const bw = Math.min(400, colW - 10), bh = Math.round(Math.max(54, Math.min(76, H * 0.11)));
        const gap = Math.round(bh * 0.24);
        const items: [string, () => void, string][] = [
            ['开始游戏', () => this.showStageSelect(), COL.gold],
            ['设置', () => this.showSettings(false), '#ffffff'],
        ];
        if (screen.supportsFullScreen) {
            items.push([screen.fullScreen() ? '退出全屏' : '全屏', () => {
                if (screen.fullScreen()) screen.exitFullScreen().catch(() => { });
                else screen.requestFullScreen().then(() => {
                    // phones: also try to hold landscape while fullscreen
                    const so: any = (window as any).screen && (window as any).screen.orientation;
                    if (so && so.lock) so.lock('landscape').catch(() => { });
                }).catch(() => { });
            }, '#ffffff']);
        }
        let by = this.T - H * 0.47 - bh / 2;
        for (const [txt, cb, col] of items) {
            const b = pill(s, bw, bh, txt, cb, { textColor: col, fontSize: Math.round(bh * 0.44) });
            b.node.setPosition(colX, by);
            by -= bh + gap;
        }
        const ver = label(s, VERSION, 20, COL.dim, { outline: 3 });
        ver.node.setPosition(colX, Math.max(this.B + 22, by + bh / 2 - 6));

        // top right: secondary pills
        const tw = Math.min(150, (this.W - colW - 120) / 4 - 14), th = 52;
        const tops: [string, () => void][] = [['玩法', () => this.howToPopup()], ['图鉴', () => this.showCodex()], ['存档', () => this.showSaves()], ['更新日志', () => this.changelogPopup()]];
        tops.forEach(([txt, cb], i) => {
            const b = pill(s, tw, th, txt, cb, { fontSize: 22 });
            b.node.setPosition(this.R - tw / 2 - 20 - (tops.length - 1 - i) * (tw + 14), this.T - th / 2 - 16);
        });
        // bottom right: records
        const d = Save.data;
        const recTxt = `最高波次 ${d.bestWave}  ·  总局数 ${d.runs}  ·  总击杀 ${d.kills}`;
        const rw = Math.min(this.R - artL - 20, 470);
        const rec = pill(s, rw, 46, recTxt, () => this.recordsPopup(), { fontSize: 18, textColor: COL.dim });
        rec.node.setPosition(this.R - rw / 2 - 20, this.B + 23 + 16);
    }

    showStageSelect() { showStageSelect(this); }
    showCodex() { showCodex(this); }
    showSaves() { showSaves(this); }
    showCloudConflict() { showCloudConflict(this); }
    /** Rebuild the current menu-side screen (after a resize or a cloud save change). */
    refreshScreen() {
        switch (this.screenName) {
            case 'menu': this.showMenu(); break;
            case 'saves': this.showSaves(); break;
            case 'stage': this.showStageSelect(); break;
            case 'codex': this.showCodex(); break;
            case 'char': this.showCharSelect(); break;
            case 'loadout': this.showLoadout(); break;
        }
    }

    // ================================================================ settings
    /**
     * Settings: a column of rows on the left (volume sliders, switches), 返回 on the right.
     * From the main menu it replaces the menu; from the pause screen it opens on top of the game.
     */
    showSettings(fromPause: boolean) {
        this.updateSize();
        let s: Node;
        if (fromPause) {
            clearChildren(this.popup);
            s = this.popup;
            blocker(s, 215);
        } else {
            this.inSettings = true;
            this.screenName = 'settings';
            this.clearScreen();
            this.hideHud();
            s = this.screen;
            const bg = mkNode('bg', s);
            const g = bg.addComponent(Graphics);
            g.fillColor = C('#0f0b12', 190); g.rect(-this.W, -this.H, this.W * 2, this.H * 2); g.fill();
            tappable(bg, () => { });
        }
        const H = this.H;
        const title = label(s, '设置', 44, '#ffffff', { outline: 5 });
        title.node.setPosition(0, this.T - 46);
        const rowW = Math.min(660, this.W * 0.56), rowH = Math.round(Math.max(54, Math.min(72, (H - 150) / 4 - 14)));
        const rowX = this.L + 40 + rowW / 2;
        const rowGap = Math.round(rowH * 0.22);
        let y = this.T - 100 - rowH / 2;
        const row = (name: string) => {
            const r = mkNode('row', s);
            const rg = r.addComponent(Graphics);
            drawRR(rg, rowW, rowH, '#0f0b12', undefined, 10, 0, 235);
            r.setPosition(rowX, y);
            const l = label(r, name, Math.round(rowH * 0.4), '#ffffff', { align: 'left', outline: 0 });
            l.node.setPosition(-rowW / 2 + 28, 0);
            y -= rowH + rowGap;
            return r;
        };
        const sliderW = Math.max(160, rowW - 220);
        const volRow = (name: string, get: () => number, apply: (v: number) => void) => {
            const r = row(name);
            const sl = slider(r, sliderW, get(), v => apply(v), v => { apply(v); Save.save(); });
            sl.setPosition(rowW / 2 - 30 - sliderW / 2 - 10, 0);
        };
        volRow('游戏音乐', () => Save.data.musicVol, v => { Save.data.musicVol = v; Save.data.music = v > 0; Sfx.setMusicVolume(v); });
        volRow('游戏音效', () => Save.data.sfxVol, v => { Save.data.sfxVol = v; Save.data.sfx = v > 0; Sfx.setSfxVolume(v); });
        const swRow = (name: string, get: () => boolean, set: (v: boolean) => void) => {
            const r = row(name);
            const t = toggle(r, get, v => { set(v); Save.save(); });
            t.setPosition(rowW / 2 - 90, 0);
        };
        swRow('伤害数字', () => Save.data.numbers, v => { Save.data.numbers = v; });
        swRow('屏幕震动', () => Save.data.shake, v => { Save.data.shake = v; });

        const back = pill(s, Math.min(300, this.R - (rowX + rowW / 2) - 60), 70, '返回', () => {
            if (fromPause) this.showPause(); else this.showMenu();
        }, { fill: '#56688a', fillA: 255, stroke: '#dfe6f5', fontSize: 30 });
        back.node.setPosition((rowX + rowW / 2 + this.R) / 2, -20);
        const ver = label(s, VERSION, 20, COL.dim, { outline: 3 });
        ver.node.setPosition(rowX, this.B + 22);
    }

    // ================================================================ menu popups
    private textPopup(titleTxt: string, body: string, w = 560, h = 420) {
        h = Math.min(h, this.H - 30);
        this.infoPopup((p, pw, ph) => {
            const t = label(p, titleTxt, 30, COL.gold, { outline: 4 });
            t.node.setPosition(0, ph / 2 - 36);
            const b = label(p, body, 18, COL.text, { width: pw - 60, align: 'left', outline: 2, anchorY: 1, lineH: 27 });
            b.node.setPosition(-pw / 2 + 30, ph / 2 - 70);
        }, Math.min(w, this.W - 40), h);
    }

    howToPopup() {
        this.textPopup('玩法', [
            '· 在屏幕任意处按住拖动来移动，武器会自动瞄准最近的敌人射击。',
            '· 击杀敌人掉落晶体，靠近即可拾取：晶体既是经验，也是商店货币。',
            '· 每波坚持到倒计时结束。升级时选一项属性强化。',
            '· 波次之间进入商店：买武器和物品，锁定想要的商品，刷新换一批。',
            '· 两把同种同阶武器可以合成为更高一阶；同类武器凑齐 2 把以上有套装加成。',
            `· 撑过第 ${MAX_WAVE} 波即通关，可继续挑战无尽模式。`,
        ].join('\n'), 600, 400);
    }

    recordsPopup() {
        const d = Save.data;
        const lines = [`最高波次  ${d.bestWave}`, `总局数  ${d.runs}`, `总击杀  ${d.kills}`, `战斗时长  ${Math.floor(d.playTime / 60)} 分钟`, '', '各关卡最高通关难度：'];
        for (const st of STAGES) {
            const lv = Save.stageLevel(st.id);
            const en = Save.data.endless[st.id];
            lines.push(`  ${st.name}  ·  ${lv >= 0 ? DANGERS[lv].name : '未通关'}${en ? `  ·  无尽 ${en} 波` : ''}`);
        }
        lines.push('', '各机体最高通关难度：');
        let any = false;
        for (const c of CHARACTERS) {
            const lv = Save.winLevel(c.id);
            if (lv >= 0) { lines.push(`  ${c.name}  ·  ${DANGERS[lv].name}`); any = true; }
        }
        if (!any) lines.push('  还没有通关记录');
        this.textPopup('战绩', lines.join('\n'), 480, 560);
    }

    changelogPopup() {
        this.textPopup('更新日志', [
            `${VERSION}  新地图：毒沼雨林、沙海遗迹、机械废墟、星渊回廊（共 8 张）；新怪物与机制：治疗、钻地、炮塔、瞬移、环绕射击、跳跃、毒雾与灼烧痕迹；每张地图都有独立造型的精英与首领；每个关卡新增无尽模式；物品图标不再重复。`,
            'V1.4  关卡：荒原虫巢、冰封裂谷、熔火工坊、虚空星港，各有场地、怪物、精英与首领；难度逐级解锁。图鉴（武器、物品、怪物）。TapTap 云存档。全新界面风格。',
            'V1.3  屏幕适配：手机竖握自动横屏、刘海屏避让、平板与带鱼屏；手机画面更清晰；新菜单与设置（音量滑条）。',
            'V1.2  音效精简：枪械与近战统一音色，击杀与点击换新音效，其余回归经典合成音；战斗 BGM。',
            'V1.1  打击感：命中停顿、爆炸与碎片特效、录音音效。',
            `V1.0  首个版本：${Object.keys(WEAPON_MAP).length} 种武器、${CHARACTERS.length} 种机体、${MAX_WAVE} 波 + 无尽模式。`,
        ].join('\n\n'), 640, 460);
    }

    // ================================================================ character select
    showCharSelect() {
        this.updateSize();
        this.clearScreen();
        this.screenName = 'char';
        const s = this.screen;
        const dim = mkNode('dim', s); const dg = dim.addComponent(Graphics); dg.fillColor = C('#08080c', 150); dg.rect(-this.W, -this.H, this.W * 2, this.H * 2); dg.fill();
        tappable(dim, () => { });
        const t = label(s, '选择机体', 44, '#ffffff', { outline: 5 });
        t.node.setPosition(0, this.T - 36);
        const st = label(s, `${this.selStage.name}  ·  ${this.dangerLabel()}`, 20, COL.gold, { outline: 3 });
        st.node.setPosition(0, this.T - 76);

        const top = this.T - 100, bottom = this.B + 92;
        const areaH = top - bottom, cy = (top + bottom) / 2;
        const detailW = Math.min(440, this.W * 0.4);
        const gridW = this.W - detailW - 48;
        const gp = panel(s, gridW, areaH, '#000000', undefined, 18, 0, 200);
        gp.setPosition(this.L + 16 + gridW / 2, cy);
        const detail = mkNode('detail', s);
        detail.setPosition(this.R - 16 - detailW / 2, cy);
        const cols = 5;
        const cw = Math.min(140, (gridW - 40 - (cols - 1) * 14) / cols);
        const ch = Math.min(cw * 1.12, (areaH - 40 - 14) / 2);
        const gx0 = -gridW / 2 + 20 + cw / 2 + (gridW - 40 - cols * cw - (cols - 1) * 14) / 2;
        const gy0 = areaH / 2 - 20 - ch / 2;
        const cards: { c: CharDef; g: Graphics }[] = [];
        const redraw = () => { for (const cd of cards) cellBg(cd.g, cw, ch, cd.c === this.selChar, Save.winLevel(cd.c.id) >= 0 ? COL.mat : undefined); };
        CHARACTERS.forEach((c, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const n = mkNode('card', gp);
            size(n, cw, ch);
            n.setPosition(gx0 + col * (cw + 14), gy0 - row * (ch + 14));
            const g = n.addComponent(Graphics);
            cards.push({ c, g });
            const sp = mkSprite(n, 'c_' + c.id, cw * 0.6, cw * 0.6 * 78 / 72);
            sp.node.setPosition(0, 10);
            const nm = label(n, c.name, 19, '#ffffff', { outline: 3 });
            nm.node.setPosition(0, -ch / 2 + 20);
            const win = Save.winLevel(c.id);
            if (win >= 0) {
                const cr = icon(n, 'g_crown', 24, 24, DANGERS[win].color);
                cr.node.setPosition(cw / 2 - 18, ch / 2 - 18);
            }
            tappable(n, () => { this.selChar = c; redraw(); this.charDetail(detail, detailW, areaH); });
        });
        redraw();
        this.charDetail(detail, detailW, areaH);
        const back = button(s, Math.min(230, this.W * 0.2), 62, '返回', COL.red, () => this.showStageSelect(), 28);
        back.node.setPosition(this.L + 16 + back.w / 2, this.B + 44);
        const go = button(s, Math.min(250, this.W * 0.21), 62, '下一步', COL.btn, () => { this.selWeapon = this.selChar.weapons[0]; this.showLoadout(); }, 30);
        go.node.setPosition(this.R - 16 - go.w / 2, this.B + 44);
    }

    charDetail(parent: Node, w: number, h: number) {
        clearChildren(parent);
        const c = this.selChar;
        panel(parent, w, h, '#000000', undefined, 18, 0, 200);
        const box = mkNode('box', parent); const bg = box.addComponent(Graphics);
        cellBg(bg, 100, 100, false, Save.winLevel(c.id) >= 0 ? COL.mat : undefined);
        box.setPosition(-w / 2 + 22 + 50, h / 2 - 22 - 50);
        mkSprite(box, 'c_' + c.id, 76, 82);
        const nm = label(parent, c.name, 32, '#ffffff', { align: 'left', outline: 0 });
        nm.node.setPosition(-w / 2 + 140, h / 2 - 44);
        const tt = label(parent, c.title, 18, COL.dim, { align: 'left', outline: 0 });
        tt.node.setPosition(-w / 2 + 140, h / 2 - 78);
        const win = Save.winLevel(c.id);
        const wl = label(parent, win >= 0 ? `最高通关：${DANGERS[win].name}` : '尚未通关', 17, win >= 0 ? DANGERS[win].color : COL.dim, { align: 'left', outline: 0 });
        wl.node.setPosition(-w / 2 + 140, h / 2 - 104);
        const sep = mkNode('sep', parent); const sg = sep.addComponent(Graphics);
        sg.fillColor = C('#ffffff', 30); sg.rect(-w / 2 + 22, h / 2 - 134, w - 44, 2); sg.fill();
        let y = h / 2 - 156;
        const lines: Line[] = [];
        for (const k in c.mods) { const v = (c.mods as any)[k]; lines.push({ t: modText(k, v), c: statIsGood(k, v) ? COL.good : COL.bad }); }
        for (const tr of c.traits) lines.push({ t: '• ' + tr, c: '#ffffff' });
        if (!lines.length) lines.push({ t: '无', c: COL.dim });
        const step = Math.min(30, (h - 170) / lines.length);
        for (const ln of lines) {
            const l = label(parent, ln.t, step < 26 ? 17 : 19, ln.c, { align: 'left', width: w - 50, outline: 0 });
            l.node.setPosition(-w / 2 + 25, y);
            l.updateRenderData(true);
            y -= Math.max(step, l.node.getComponent(UITransform).height + 4);
        }
    }

    // ================================================================ loadout (starting weapon)
    showLoadout() {
        this.clearScreen();
        this.screenName = 'loadout';
        const s = this.screen;
        const c = this.selChar;
        const dim = mkNode('dim', s); const dg = dim.addComponent(Graphics); dg.fillColor = C('#08080c', 150); dg.rect(-this.W, -this.H, this.W * 2, this.H * 2); dg.fill();
        tappable(dim, () => { });
        const t = label(s, '选择初始武器', 44, '#ffffff', { outline: 5 });
        t.node.setPosition(0, this.T - 36);
        const st = label(s, `${this.selStage.name}  ·  ${this.dangerLabel()}  ·  ${c.name}`, 20, COL.gold, { outline: 3 });
        st.node.setPosition(0, this.T - 76);
        const ws = c.weapons;
        for (const id of ws) Save.seeWeapon(id);
        const cw = Math.min(196, (this.W - 60 - (ws.length - 1) * 14) / ws.length), ch = Math.min(330, this.H - 220);
        const x0 = -((ws.length - 1) * (cw + 14)) / 2;
        const cardY = (this.T - 100 + this.B + 92) / 2;
        const cards: { id: string; g: Graphics }[] = [];
        const redraw = () => { for (const cd of cards) cellBg(cd.g, cw, ch, cd.id === this.selWeapon, WEAPON_MAP[cd.id].melee ? '#ff8a5c' : '#4fc3f7'); };
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
            const cl = label(n, (def.melee ? '近战 · ' : '远程 · ') + classText(def), 15, COL.dim, { outline: 2 });
            cl.node.setPosition(0, ch / 2 - 138);
            const lines = weaponLines(def, tier, null).slice(0, ch > 280 ? 5 : 3);
            let ly = ch / 2 - 162;
            lines.forEach((ln) => {
                const l = label(n, ln.t, 15, ln.c, { outline: 2, width: cw - 14, anchorY: 1, lineH: 19 });
                l.node.setPosition(0, ly + 8);
                l.updateRenderData(true);
                ly -= l.node.getComponent(UITransform).height + 3;
            });
            tappable(n, () => { this.selWeapon = id; redraw(); });
            popIn(n, i * 0.03);
        });
        redraw();
        const back = button(s, Math.min(230, this.W * 0.2), 62, '返回', COL.red, () => this.showCharSelect(), 28);
        back.node.setPosition(this.L + 16 + back.w / 2, this.B + 44);
        const go = button(s, Math.min(250, this.W * 0.21), 62, '出发！', COL.btn, () => this.host.startRun(this.selChar, this.selWeapon, this.selDanger === ENDLESS ? 0 : this.selDanger, this.selStage, this.selDanger === ENDLESS), 30);
        go.node.setPosition(this.R - 16 - go.w / 2, this.B + 44);
    }

    // ================================================================ HUD
    buildHud() {
        this.updateSize();
        clearChildren(this.hudLayer);
        const h = mkNode('hudroot', this.hudLayer);
        this.hud = h;
        this.lastHud = {};
        // vignette
        this.vignette = mkSprite(h, 'vignette', this.W + this.safe.l + this.safe.r + 40, this.H + this.safe.t + this.safe.b + 40);
        this.vignette.node.setPosition((this.safe.r - this.safe.l) / 2, (this.safe.t - this.safe.b) / 2);
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
        const wt = (run.endlessMode ? '无尽 · ' : '') + `第 ${wi.wave} 波` + (run.endless && !run.endlessMode ? '（无尽）' : '');
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
        let va = k < 0.4 ? Math.round((0.4 - k) / 0.4 * 200 + (Math.sin(Date.now() / 150) + 1) * 15) : 0;
        // red flash when hit, fading over ~0.35 s
        const now = Date.now();
        if (this.hurtAt) {
            const h = 1 - (now - this.hurtAt) / 350;
            if (h > 0) va = Math.max(va, Math.round(230 * h)); else this.hurtAt = 0;
        }
        if (L.va !== va) { L.va = va; setAlpha(this.vignette, va); }
    }
    private hurtAt = 0;
    flashHurt() { this.hurtAt = Date.now(); }

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
    card(parent: Node, w: number, h: number, tier: number, iconFrame: string, iconTint: string | null, title: string, sub: string, lines: Line[], isWeapon: boolean, reserve = 8): Node {
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
        const y0 = Math.min(h / 2 - 72, ty - 6);
        const bottom = -h / 2 + reserve;
        // stat lines: normal size if they fit above the bottom reserve (buttons), otherwise shrink
        const base = w < 190 ? 14 : 15;
        for (let fs = base; fs >= 10; fs--) {
            const box = mkNode('lines', n);
            let y = y0;
            const gap = fs >= 13 ? 2 : 1;
            for (const ln of lines) {
                const l = label(box, ln.t, fs, ln.c, { align: 'left', width: w - 20, outline: fs >= 13 ? 2 : 1, lineH: fs + (fs >= 13 ? 4 : 3), anchorY: 1 });
                l.node.setPosition(-w / 2 + 10, y);
                l.updateRenderData(true);
                y -= l.node.getComponent(UITransform).height + gap;
            }
            if (y >= bottom - 1 || fs === 10) break;
            box.removeFromParent(); box.destroy();
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
        shadowPanel(p, w, h, COL.panel2, '#3a3c47');
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
            const rb = button(s, 230, 64, `刷新 ◆${cost}`, run.mats >= cost ? COL.green : COL.btnDark, () => {
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
        Save.seeItem(it.id);
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
        const rec = button(s, 200, 70, `回收 ◆${recycle}`, COL.green, () => { run.mats += recycle; Sfx.sell(); onDone(); }, 26);
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
        const cw = Math.min(250, (areaW - 3 * 14) / 4);
        // Inventory (weapons, set bonuses, items) is measured first; the cards get the remaining height.
        const ws = 58, wsGap = 8;
        const bx = areaL + MAX_WEAPONS * (ws + wsGap) + 14;
        const bonusW = Math.max(120, areaL + invW - bx);
        let ch = 0, isz = 40, perRow = 1, rows = 1, weaponBand = 92, bonusTxt: string[] = [];
        const layout = () => {
            const counts = run.classCounts();
            bonusTxt = [];
            for (const k in counts) if (counts[k] >= 2) {
                const cls = WEAPON_CLASSES[k];
                const mods = cls.bonus[Math.min(6, counts[k]) - 2];
                bonusTxt.push(`${cls.name}×${counts[k]}: ` + Object.keys(mods).map(m => modText(m, (mods as any)[m])).join(' '));
            }
            // rough wrap estimate (15px glyphs) so the item section starts below the bonus text
            const lineCount = (t: string) => Math.max(1, Math.ceil(t.length * 15 / bonusW));
            const bonusLines = bonusTxt.length ? 1 + bonusTxt.reduce((a, t) => a + lineCount(t), 0) : lineCount('同类武器≥2把时获得套装加成');
            weaponBand = Math.max(92, bonusLines * 19 + 10);
            const n = run.itemOrder.length;
            isz = n > 2 * Math.floor(invW / 44) ? 34 : 40;
            perRow = Math.max(1, Math.floor(invW / (isz + 4)));
            const want = Math.max(1, Math.ceil(n / perRow));
            const room = (r: number) => this.H - 66 - 12 - (weaponBand + 28 + r * (isz + 4)) - 8;
            rows = want;
            while (rows > 1 && room(rows) < 230) rows--; // keep the cards readable; extra items collapse into "+N"
            ch = Math.max(180, Math.min(400, room(rows)));
        };
        const buildCards = () => {
            clearChildren(cards);
            run.shop.forEach((slot, i) => {
                if (slot.kind === 'weapon') Save.seeWeapon(slot.id); else Save.seeItem(slot.id);
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
                    n = this.card(cards, cw, ch, slot.tier, def.sprite, null, def.name + ' ' + TIER_NAMES[slot.tier - 1], '武器 · ' + classText(def), weaponLines(def, slot.tier, run.stats), true, run.canEquip(def) ? 64 : 92);
                    if (!run.canEquip(def)) {
                        const nl = label(n, '无法装备', 18, COL.bad);
                        nl.node.setPosition(0, -ch / 2 + 76);
                    }
                } else {
                    const it = ITEM_MAP[slot.id];
                    const cnt = run.itemCount(it.id);
                    n = this.card(cards, cw, ch, it.tier, 'g_' + it.glyph, it.color, it.name, '物品' + (cnt ? `（已有 ${cnt}）` : ''), itemLines(it), false, 64);
                }
                n.setPosition(x, y);
                const afford = run.mats >= slot.price;
                const canAdd = slot.kind === 'weapon' ? run.canAddWeapon(slot.id, slot.tier) : run.canTakeItem(ITEM_MAP[slot.id]);
                const bb = button(n, cw - 76, 50, `◆ ${slot.price}`, afford && canAdd ? COL.green : COL.btnDark, () => {
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
            rerollBtn = button(s, 210, 56, rp === 0 ? '免费刷新' : `刷新 ◆${rp}`, run.mats >= rp ? COL.green : COL.btnDark, () => {
                if (!run.doReroll()) { Sfx.deny(); return; }
                Sfx.reroll(); refreshAll();
            }, 24);
            rerollBtn.node.setPosition(areaL + areaW - 105, this.T - 34);
        };
        const buildInv = () => {
            clearChildren(inv);
            const y0 = this.T - 66 - ch - 12; // top of the inventory block
            const wl = label(inv, `武器 (${run.weapons.length}/${MAX_WEAPONS})`, 20, COL.text, { align: 'left' });
            wl.node.setPosition(areaL + 4, y0 - 10);
            run.weapons.forEach((w, i) => {
                const c = this.weaponCell(inv, w, ws);
                c.setPosition(areaL + ws / 2 + i * (ws + wsGap), y0 - 24 - ws / 2);
                if (run.canCombine(i)) {
                    const pl = label(c, '+', 22, COL.good, { outline: 3 });
                    pl.node.setPosition(-ws / 2 + 10, ws / 2 - 12);
                }
                tappable(c, () => this.weaponPopup(i, refreshAll));
            });
            // class bonuses, right of the weapon slots
            const bl = label(inv, bonusTxt.length ? '套装加成\n' + bonusTxt.join('\n') : '同类武器≥2把时获得套装加成', 15, bonusTxt.length ? COL.good : COL.dim, { align: 'left', width: bonusW, outline: 2, anchorY: 1, lineH: 19 });
            bl.node.setPosition(bx, y0 - 2);
            // items
            const iy = y0 - weaponBand;
            const il = label(inv, `物品 (${run.itemOrder.length})`, 20, COL.text, { align: 'left' });
            il.node.setPosition(areaL + 4, iy - 10);
            const cap = rows * perRow;
            const n = run.itemOrder.length;
            const shown = n > cap ? cap - 1 : n;
            const cellPos = (i: number) => [areaL + isz / 2 + (i % perRow) * (isz + 4), iy - 26 - isz / 2 - Math.floor(i / perRow) * (isz + 4)];
            run.itemOrder.slice(0, shown).forEach((id, i) => {
                const it = ITEM_MAP[id];
                const c = this.itemCell(inv, it, run.items[id], isz);
                const [cx, cy] = cellPos(i);
                c.setPosition(cx, cy);
                tappable(c, () => this.infoPopup((p, w, h) => {
                    const cc = this.card(p, w - 20, h - 20, it.tier, 'g_' + it.glyph, it.color, it.name + (run.items[id] > 1 ? ` x${run.items[id]}` : ''), '物品', itemLines(it), false);
                }, 320, 320));
            });
            if (n > shown) {
                // too many to show: the last cell lists every item
                const more = mkNode('more', inv); size(more, isz, isz);
                const mg = more.addComponent(Graphics); drawRR(mg, isz, isz, '#2b2434', COL.stroke, 9, 3);
                label(more, '+' + (n - shown), 15, COL.text, { outline: 2 });
                const [cx, cy] = cellPos(shown);
                more.setPosition(cx, cy);
                tappable(more, () => this.infoPopup((p, w, h) => {
                    const list = run.itemOrder.map(id => ITEM_MAP[id].name + (run.items[id] > 1 ? ' x' + run.items[id] : '')).join('、');
                    label(p, '全部物品', 24, COL.gold, { outline: 3 }).node.setPosition(0, h / 2 - 30);
                    const t = label(p, list, 16, COL.text, { width: w - 40, outline: 2, anchorY: 1, lineH: 22 });
                    t.node.setPosition(0, h / 2 - 56);
                }, 560, Math.min(420, this.H - 40)));
            }
        };
        const refreshAll = () => { layout(); refreshMats(); buildCards(); buildInv(); refreshStats(); };
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
            const cb = button(p, 150, 56, '合成', canC ? COL.purple : COL.btnDark, () => {
                if (!canC) { Sfx.deny(); this.toast('需要两把相同阶级的同种武器', COL.bad, 0, 24); return; }
                run.combine(idx); Sfx.combine(); close(); onChange();
            }, 24);
            cb.node.setPosition(-85, -ph / 2 + 45);
            const sv = run.sellValue(w);
            const sb = button(p, 150, 56, `出售 ◆${sv}`, run.weapons.length > 1 ? COL.red : COL.btnDark, () => {
                if (run.weapons.length <= 1) { Sfx.deny(); this.toast('至少保留一把武器', COL.bad, 0, 24); return; }
                run.sell(idx); Sfx.sell(); close(); onChange();
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
        const st = button(p, 200, 50, '设置', COL.btnDark, () => this.showSettings(true), 22);
        st.node.setPosition(cx, this.B + 95);
        const quit = button(p, 200, 50, '放弃本局', COL.red, () => {
            this.infoPopup((pp, w, h) => {
                const q = label(pp, '确定放弃本局吗？', 28, COL.text);
                q.node.setPosition(0, 40);
                const y = button(pp, 140, 56, '放弃', COL.red, () => { clearChildren(this.popup); this.host.quitToMenu(); }, 24);
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
        const sub = label(s, run.endlessMode ? `「${run.stage.name}」无尽模式  ·  坚持到第 ${run.wave} 波（最佳 ${Save.data.endless[run.stage.id] || run.wave}）` : (win ? `你在「${run.stage.name}」${run.dangerDef.name} 中坚持了 ${MAX_WAVE} 波！` : `「${run.stage.name}」${run.dangerDef.name}  ·  倒在了第 ${run.wave} 波`), 26, COL.text);
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
            ['关卡', run.stage.name + ' · ' + (run.endlessMode ? '无尽模式' : run.dangerDef.name)],
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
            const e = button(s, 260, 66, '继续（无尽模式）', COL.purple, () => this.host.continueEndless(), 24);
            e.node.setPosition(-290, this.B + 60);
        }
        const r = button(s, 240, 66, '再来一局', COL.btn, () => this.host.restart(), 28);
        r.node.setPosition(win && !run.endless ? 0 : -140, this.B + 60);
        const m = button(s, 240, 66, '主菜单', COL.btnDark, () => this.host.quitToMenu(), 28);
        m.node.setPosition(win && !run.endless ? 290 : 140, this.B + 60);
    }
}

/**
 * Safe-area insets in CSS pixels, in game orientation. The page sets --safe-* from env(safe-area-inset-*)
 * (needs viewport-fit=cover). When the engine rotates the game to landscape on a portrait phone, the
 * device's top edge becomes the game's left edge, right becomes top, bottom becomes right, left becomes bottom.
 */
function safeInsetsCss(gameW: number, gameH: number) {
    const out = { l: 0, r: 0, t: 0, b: 0 };
    if (typeof window === 'undefined' || typeof document === 'undefined') return out;
    try {
        const cs = getComputedStyle(document.documentElement);
        const px = (n: string) => parseFloat(cs.getPropertyValue(n)) || 0;
        const t = px('--safe-top'), r = px('--safe-right'), b = px('--safe-bottom'), l = px('--safe-left');
        const rotated = (window.innerWidth > window.innerHeight) !== (gameW > gameH);
        if (rotated) { out.l = t; out.t = r; out.r = b; out.b = l; }
        else { out.l = l; out.r = r; out.t = t; out.b = b; }
    } catch (e) { /* no CSS env support */ }
    return out;
}
