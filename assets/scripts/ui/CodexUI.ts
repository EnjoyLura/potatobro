// Codex (图鉴): weapons / items / monsters. Tabs on top, filter chips and a scrolling grid on the left,
// details of the selected entry on the right. Undiscovered entries show as dark silhouettes.
import { Node, Graphics, UITransform } from 'cc';
import type { UI } from './UI';
import { mkNode, mkSprite, setTint } from '../core/Nodes';
import { Atlas } from '../core/Atlas';
import { Save } from '../core/Save';
import { COL, C, label, panel, pill, tab, chip, cellBg, size, tappable, scrollArea, clearChildren, icon, iconFit } from './UIKit';
import { weaponLines, itemLines, classText, Line } from './Text';
import { WEAPONS, WEAPON_CLASSES, TIER_COLORS, WeaponDef } from '../data/Weapons';
import { ITEMS, ItemDef } from '../data/Items';
import { ENEMIES, EnemyDef } from '../data/Enemies';
import { STAGES, STAGE_MAP } from '../data/Stages';

type Tab = 'w' | 'i' | 'e';
interface Entry { id: string; frame: string; tint?: string; bar: string; known: boolean; isWeapon?: boolean }

const state = { tab: 'w' as Tab, f1: 0, f2: 0, sel: '' };

const QUALITY = ['全部', '普通', '优秀', '稀有', '传说'];
const MON_KIND = ['全部', '普通', '精英', '首领'];

function weaponEntries(f1: number, f2: number): Entry[] {
    const cls = Object.keys(WEAPON_CLASSES);
    return WEAPONS.filter(w => (f1 === 0 || (f1 === 1) === w.melee) && (f2 === 0 || w.classes.indexOf(cls[f2 - 1]) >= 0))
        .map(w => ({ id: w.id, frame: w.sprite, bar: w.melee ? '#ff8a5c' : '#4fc3f7', known: !!Save.data.codex.w[w.id], isWeapon: true }));
}
function itemEntries(f1: number): Entry[] {
    return ITEMS.filter(it => f1 === 0 || it.tier === f1)
        .map(it => ({ id: it.id, frame: 'g_' + it.glyph, tint: it.color, bar: TIER_COLORS[it.tier - 1], known: !!Save.data.codex.i[it.id] }));
}
function enemyKind(e: EnemyDef) { return e.boss ? 3 : e.elite ? 2 : 1; }
function enemyEntries(f1: number, f2: number): Entry[] {
    const out: Entry[] = [];
    for (const id in ENEMIES) {
        const e = ENEMIES[id];
        const st = e.stage || 'hive';
        if (f1 > 0 && STAGES[f1 - 1].id !== st) continue;
        if (f2 > 0 && enemyKind(e) !== f2) continue;
        out.push({ id, frame: e.sprite, bar: e.boss ? '#ff5c5c' : e.elite ? '#ff9f43' : '#5fd35f', known: Save.data.codex.e[id] !== undefined });
    }
    return out;
}

export function showCodex(ui: UI) {
    ui.updateSize();
    ui.clearScreen();
    ui.hideHud();
    ui.screenName = 'codex';
    const s = ui.screen;
    const W = ui.W, H = ui.H, L = ui.L, R = ui.R, T = ui.T, B = ui.B;
    const bg = mkNode('bg', s);
    const g = bg.addComponent(Graphics);
    g.fillColor = C('#08080c', 150); g.rect(-W, -H, W * 2, H * 2); g.fill();
    tappable(bg, () => { });

    const title = label(s, '图鉴', 46, '#ffffff', { outline: 5 });
    title.node.setPosition(0, T - 34);
    // tabs
    const tabs: [Tab, string][] = [['w', '武器图鉴'], ['i', '物品图鉴'], ['e', '怪物图鉴']];
    const tw = Math.min(200, (W - 80) / 3 - 16), th = 50;
    tabs.forEach(([k, name], i) => {
        const b = tab(s, tw, th, name, state.tab === k, () => {
            if (state.tab === k) return;
            state.tab = k; state.f1 = 0; state.f2 = 0; state.sel = '';
            showCodex(ui);
        }, 24);
        b.node.setPosition((i - 1) * (tw + 18), T - 92);
    });

    const top = T - 128, bottom = B + 82;
    const areaH = top - bottom;
    const leftW = Math.min(W * 0.56, W - 400), rightW = W - leftW - 52;
    const lx = L + 16 + leftW / 2, rx = R - 16 - rightW / 2, cy = (top + bottom) / 2;
    const lp = panel(s, leftW, areaH, '#000000', undefined, 18, 0, 200);
    lp.setPosition(lx, cy);
    const rp = panel(s, rightW, areaH, '#000000', undefined, 18, 0, 200);
    rp.setPosition(rx, cy);

    // entries for the current tab + filters
    let entries: Entry[];
    let rows: { name: string; opts: string[]; colors?: string[]; get: () => number; set: (v: number) => void }[];
    if (state.tab === 'w') {
        entries = weaponEntries(state.f1, state.f2);
        rows = [
            { name: '类型', opts: ['全部', '近战', '远程'], colors: ['#ffffff', '#ff8a5c', '#4fc3f7'], get: () => state.f1, set: v => state.f1 = v },
            { name: '标签', opts: ['全部'].concat(Object.keys(WEAPON_CLASSES).map(k => WEAPON_CLASSES[k].name)), get: () => state.f2, set: v => state.f2 = v },
        ];
    } else if (state.tab === 'i') {
        entries = itemEntries(state.f1);
        rows = [{ name: '品质', opts: QUALITY, colors: ['#ffffff'].concat(TIER_COLORS), get: () => state.f1, set: v => state.f1 = v }];
    } else {
        entries = enemyEntries(state.f1, state.f2);
        rows = [
            { name: '关卡', opts: ['全部'].concat(STAGES.map(st => st.name)), get: () => state.f1, set: v => state.f1 = v },
            { name: '类型', opts: MON_KIND, colors: ['#ffffff', '#5fd35f', '#ff9f43', '#ff5c5c'], get: () => state.f2, set: v => state.f2 = v },
        ];
    }
    const allCount = state.tab === 'w' ? WEAPONS.length : state.tab === 'i' ? ITEMS.length : Object.keys(ENEMIES).length;
    const known = state.tab === 'w' ? Object.keys(Save.data.codex.w).length : state.tab === 'i' ? Object.keys(Save.data.codex.i).length : Object.keys(Save.data.codex.e).length;
    const cnt = label(s, `已发现 ${known}/${allCount}`, 18, COL.dim, { align: 'right', outline: 2 });
    cnt.node.setPosition(R - 20, T - 92);

    // filter chips (wrap onto more lines when needed); measured first so the grid gets the rest
    const chipsNode = mkNode('chips', lp);
    let fy = areaH / 2 - 24;
    const fx0 = -leftW / 2 + 18;
    for (const row of rows) {
        const rl = label(chipsNode, row.name, 20, '#d8d8de', { align: 'left', outline: 0 });
        rl.node.setPosition(fx0, fy);
        let x = fx0 + 52;
        row.opts.forEach((o, i) => {
            const c = chip(chipsNode, o, row.get() === i, () => { row.set(i); state.sel = ''; showCodex(ui); }, row.colors ? row.colors[i] || '#ffffff' : '#ffffff', 17);
            if (x + c.w > leftW / 2 - 12) { x = fx0 + 52; fy -= 38; }
            c.node.setPosition(x + c.w / 2, fy);
            x += c.w + 6;
        });
        fy -= 40;
    }

    // grid
    const gridTop = fy + 12, gridH = gridTop - (-areaH / 2 + 12);
    const gridW = leftW - 24;
    const area = scrollArea(lp, gridW, gridH);
    area.node.setPosition(0, gridTop - gridH / 2);
    chipsNode.setSiblingIndex(lp.children.length - 1); // chips stay on top of scrolled cells
    const cols = Math.max(4, Math.floor(gridW / 92));
    const cs = Math.floor((gridW - (cols - 1) * 10) / cols) - 2;
    if (!state.sel || !entries.some(e => e.id === state.sel)) state.sel = entries.length ? entries[0].id : '';
    const cells: { e: Entry; g: Graphics }[] = [];
    entries.forEach((e, i) => {
        const n = mkNode('cell', area.content);
        size(n, cs, cs);
        n.setPosition(-gridW / 2 + cs / 2 + 4 + (i % cols) * (cs + 10), gridH / 2 - cs / 2 - 6 - Math.floor(i / cols) * (cs + 12));
        const cg = n.addComponent(Graphics);
        cells.push({ e, g: cg });
        cellBg(cg, cs, cs, e.id === state.sel, e.known ? e.bar : undefined);
        let sp;
        if (e.isWeapon) sp = iconFit(n, e.frame, cs * 0.72, Atlas.sizes[e.frame]);
        else if (state.tab === 'i') sp = icon(n, e.frame, cs * 0.66, cs * 0.66, e.tint);
        else {
            sp = mkSprite(n, e.frame);
            const ut = sp.node.getComponent(UITransform);
            const k = cs * 0.78 / Math.max(ut.width, ut.height);
            sp.node.setScale(k, k, 1);
        }
        sp.node.setPosition(0, 3);
        if (!e.known) setTint(sp, 16, 16, 22, 235);
        tappable(n, () => {
            if (area.moved()) return;
            state.sel = e.id;
            for (const c of cells) cellBg(c.g, cs, cs, c.e.id === state.sel, c.e.known ? c.e.bar : undefined);
            detail(ui, rp, rightW, areaH, entries.filter(x => x.id === state.sel)[0]);
        });
    });
    area.setHeight(Math.ceil(entries.length / cols) * (cs + 12) + 12);
    if (!entries.length) label(area.content, '没有符合条件的条目', 20, COL.dim, { outline: 0 }).node.setPosition(0, gridH / 2 - 60);
    detail(ui, rp, rightW, areaH, entries.filter(x => x.id === state.sel)[0]);

    const back = pill(s, Math.min(300, W * 0.26), 62, '返回', () => ui.showMenu(), { fill: COL.pillBack, fillA: 255, stroke: '#dfe6f5', fontSize: 30 });
    back.node.setPosition(0, B + 40);
}

function detail(ui: UI, p: Node, w: number, h: number, e: Entry | undefined) {
    const holder = p.getChildByName('detail') || mkNode('detail', p);
    clearChildren(holder);
    if (!e) return;
    // header: icon box + name + tags
    const box = mkNode('box', holder);
    const bg = box.addComponent(Graphics);
    const bs = Math.min(130, h * 0.3);
    cellBg(bg, bs, bs, false, e.known ? e.bar : undefined);
    box.setPosition(-w / 2 + 24 + bs / 2, h / 2 - 22 - bs / 2);
    let sp;
    if (e.isWeapon) sp = iconFit(box, e.frame, bs * 0.74, Atlas.sizes[e.frame]);
    else if (ui && e.tint) sp = icon(box, e.frame, bs * 0.66, bs * 0.66, e.tint);
    else {
        sp = mkSprite(box, e.frame);
        const ut = sp.node.getComponent(UITransform);
        const k = bs * 0.8 / Math.max(ut.width, ut.height);
        sp.node.setScale(k, k, 1);
    }
    if (!e.known) setTint(sp, 16, 16, 22, 235);
    const tx = -w / 2 + 44 + bs;
    const lines: Line[] = [];
    let name = '???', tags: [string, string][] = [];
    if (!e.known) {
        lines.push({ t: '尚未发现。', c: COL.dim });
        lines.push({ t: state.tab === 'e' ? '在战斗中遇到后解锁。' : '在商店或补给箱中见到后解锁。', c: COL.dim });
    } else if (state.tab === 'w') {
        const def: WeaponDef = WEAPONS.filter(x => x.id === e.id)[0];
        name = def.name;
        tags = [[def.melee ? '近战' : '远程', def.melee ? '#ff8a5c' : '#4fc3f7']].concat(def.classes.map(c => [WEAPON_CLASSES[c].name, '#c8c8d0'] as [string, string])) as [string, string][];
        const tier = def.minTier || 1;
        lines.push(...weaponLines(def, tier, null));
        lines.push({ t: `价格 ◆${def.price}起  ·  ${classText(def)}`, c: COL.dim });
    } else if (state.tab === 'i') {
        const it: ItemDef = ITEMS.filter(x => x.id === e.id)[0];
        name = it.name;
        tags = [[['', '普通', '优秀', '稀有', '传说'][it.tier], TIER_COLORS[it.tier - 1]]];
        lines.push(...itemLines(it));
        lines.push({ t: `价格 ◆${it.price}`, c: COL.dim });
    } else {
        const def = ENEMIES[e.id];
        name = def.name;
        tags = [[STAGE_MAP[def.stage || 'hive'].name, '#4fc3f7']];
        if (def.boss) tags.push(['首领', '#ff5c5c']); else if (def.elite) tags.push(['精英', '#ff9f43']); else if (def.neutral) tags.push(['中立', '#5fd35f']);
        lines.push({ t: def.desc, c: '#ffffff' });
        lines.push({ t: `生命 ${def.hp}${def.hpW ? ` (+${def.hpW}/波)` : ''}`, c: COL.mat });
        if (!def.neutral) lines.push({ t: `接触伤害 ${def.dmg}${def.dmgW ? ` (+${def.dmgW}/波)` : ''}`, c: '#ff8a8a' });
        lines.push({ t: `速度 ${def.speed}  ·  掉落晶体 ${def.mats}`, c: '#d8d8de' });
        lines.push({ t: `已击杀 ${Save.data.codex.e[e.id] || 0}`, c: COL.gold });
    }
    const nm = label(holder, name, 34, '#ffffff', { align: 'left', outline: 0 });
    nm.node.setPosition(tx, h / 2 - 22 - bs * 0.3);
    let x = tx;
    for (const [t, c] of tags) {
        const tw = Math.max(64, t.length * 20 + 22);
        const tn = mkNode('tag', holder);
        const tg = tn.addComponent(Graphics);
        tg.fillColor = C(c); tg.roundRect(-tw / 2, -17, tw, 34, 8); tg.fill();
        tn.setPosition(x + tw / 2, h / 2 - 22 - bs * 0.72);
        label(tn, t, 19, '#101014', { outline: 0 });
        x += tw + 8;
    }
    const sep = mkNode('sep', holder); const sg = sep.addComponent(Graphics);
    sg.fillColor = C('#ffffff', 30); sg.rect(-w / 2 + 22, h / 2 - 40 - bs, w - 44, 2); sg.fill();
    let y = h / 2 - 58 - bs;
    for (const ln of lines) {
        const l = label(holder, ln.t, 20, ln.c, { align: 'left', outline: 0, width: w - 50, anchorY: 1, lineH: 27 });
        l.node.setPosition(-w / 2 + 26, y);
        l.updateRenderData(true);
        y -= l.node.getComponent(UITransform).height + 4;
    }
}
