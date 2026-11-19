// 存档 screen (local vs cloud, side by side) and the popup shown when the two differ.
import { Node, Graphics } from 'cc';
import type { UI } from './UI';
import { mkNode } from '../core/Nodes';
import { Save, Progress } from '../core/Save';
import { CloudSave } from '../core/CloudSave';
import { COL, C, label, panel, pill, blocker, tappable, popIn } from './UIKit';
import { STAGES } from '../data/Stages';
import { DANGERS } from '../data/Enemies';
import { WEAPONS } from '../data/Weapons';
import { ITEMS } from '../data/Items';
import { ENEMIES } from '../data/Enemies';

function fmtTime(ms: number) {
    if (!ms) return '—';
    const d = new Date(ms);
    const p = (n: number) => (n < 10 ? '0' : '') + n;
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function rowsFor(p: Progress | null): [string, string][] {
    if (!p) return [['已通关', '—'], ['最高波次', '—'], ['总局数', '—'], ['总击杀', '—'], ['图鉴', '—'], ['保存时间', '—']];
    const cleared = STAGES.filter(s => (p.stages || {})[s.id] !== undefined && p.stages[s.id] >= 0)
        .map(s => `${s.name}·${DANGERS[p.stages[s.id]].name.replace('难度', '')}`);
    const cx = p.codex || { e: {}, w: {}, i: {} };
    const found = Object.keys(cx.e || {}).length + Object.keys(cx.w || {}).length + Object.keys(cx.i || {}).length;
    const all = Object.keys(ENEMIES).length + WEAPONS.length + ITEMS.length;
    return [
        ['已通关', cleared.length ? cleared.join(' ') : '未通关'],
        ['最高波次', '' + p.bestWave],
        ['总局数', '' + p.runs],
        ['总击杀', '' + p.kills],
        ['图鉴', `${found}/${all}`],
        ['保存时间', fmtTime(p.savedAt)],
    ];
}

/** One save card: title, rows, and a button underneath. */
function saveCard(parent: Node, w: number, h: number, title: string, p: Progress | null, note: string | null,
    btnText: string, btnOn: boolean, onBtn: (() => void) | null) {
    const c = panel(parent, w, h, '#000000', undefined, 18, 0, 205);
    const t = label(c, title, 32, COL.gold, { outline: 0 });
    t.node.setPosition(0, h / 2 - 38);
    if (note) {
        const n = label(c, note, 20, COL.dim, { outline: 0, width: w - 60 });
        n.node.setPosition(0, 10);
    } else {
        const rows = rowsFor(p);
        const rh = Math.min(44, (h - 170) / rows.length);
        rows.forEach(([k, v], i) => {
            const y = h / 2 - 86 - i * rh;
            const kl = label(c, k, 21, '#ffffff', { align: 'left', outline: 0 });
            kl.node.setPosition(-w / 2 + 30, y);
            const vl = label(c, v, k === '已通关' && v.length > 12 ? 16 : 21, '#ffffff', { align: 'right', outline: 0 });
            vl.node.setPosition(w / 2 - 30, y);
        });
    }
    if (btnText) {
        const b = pill(c, Math.min(280, w - 80), 58, btnText, () => { if (btnOn && onBtn) onBtn(); }, {
            fill: btnOn ? COL.btn : COL.pillBack, fillA: 255, stroke: btnOn ? undefined : '#dfe6f5', fontSize: 26,
            textColor: btnOn ? COL.dark : '#dfe6f5',
        });
        b.node.setPosition(0, -h / 2 + 46);
    }
    return c;
}

function statusText(): [string, string] {
    switch (CloudSave.status) {
        case 'unavailable': return ['云存档仅在 TapTap 中可用', COL.dim];
        case 'checking': return ['正在读取云存档…', COL.dim];
        case 'empty': return ['云端还没有存档，完成一局后自动上传', COL.dim];
        case 'synced': return ['本地与云端存档一致', '#7dff8a'];
        case 'uploading': return ['正在上传到云端…（每分钟最多上传一次）', '#ffd27a'];
        case 'conflict': return ['本地与云端存档不一致，请选择要保留的存档', '#ffd27a'];
        default: return ['云存档出错：' + CloudSave.error, COL.bad];
    }
}

export function showSaves(ui: UI) {
    ui.updateSize();
    ui.clearScreen();
    ui.hideHud();
    ui.screenName = 'saves';
    const s = ui.screen;
    const W = ui.W, H = ui.H, T = ui.T, B = ui.B;
    const bg = mkNode('bg', s);
    const g = bg.addComponent(Graphics);
    g.fillColor = C('#08080c', 160); g.rect(-W, -H, W * 2, H * 2); g.fill();
    tappable(bg, () => { });
    const title = label(s, '存档', 46, '#ffffff', { outline: 5 });
    title.node.setPosition(0, T - 40);
    const cw = Math.min(460, (W - 80) / 2), ch = Math.min(420, H - 215);
    const cy = T - 80 - ch / 2;
    const st = CloudSave.status;
    const local = Save.progress();
    const conflict = st === 'conflict';
    const synced = st === 'synced';
    saveCard(s, cw, ch, '本地存档', local, null,
        conflict ? '使用本地存档' : synced ? '已同步' : '', conflict, () => { CloudSave.useLocal(); showSaves(ui); }).setPosition(-cw / 2 - 16, cy);
    const cloudNote = st === 'unavailable' ? '在 TapTap 中打开游戏即可使用云存档，换设备也不丢进度。'
        : st === 'checking' ? '读取中…' : st === 'empty' ? '云端暂无存档' : st === 'error' ? '读取失败' : null;
    const cloudBtn = conflict ? '使用云存档' : synced ? '已同步' : st === 'error' ? '重试' : '';
    saveCard(s, cw, ch, '云存档', CloudSave.cloud, cloudNote, cloudBtn, conflict || st === 'error', () => {
        if (st === 'error') CloudSave.retry(); else CloudSave.useCloud();
        showSaves(ui);
    }).setPosition(cw / 2 + 16, cy);
    const [txt, col] = statusText();
    const sl = label(s, txt, 22, col, { outline: 3 });
    sl.node.setPosition(0, cy - ch / 2 - 26);
    const back = pill(s, Math.min(300, W * 0.26), 62, '返回', () => ui.showMenu(), { fill: COL.pillBack, fillA: 255, stroke: '#dfe6f5', fontSize: 30 });
    back.node.setPosition(0, B + 40);
}

/** Popup when local and cloud progress differ (startup). */
export function showCloudConflict(ui: UI) {
    const p = ui.popup;
    const b = blocker(p, 200);
    const box = mkNode('conflict', p);
    const W = ui.W, H = ui.H;
    const cw = Math.min(430, (W - 80) / 2), ch = Math.min(400, H - 170);
    const title = label(box, '存档不一致', 40, COL.gold, { outline: 4 });
    title.node.setPosition(0, ch / 2 + 46);
    const close = () => { b.destroy(); box.destroy(); ui.refreshScreen(); };
    saveCard(box, cw, ch, '本地存档', Save.progress(), null, '使用本地存档', true, () => { CloudSave.useLocal(); close(); }).setPosition(-cw / 2 - 14, 0);
    saveCard(box, cw, ch, '云存档', CloudSave.cloud, null, '使用云存档', true, () => { CloudSave.useCloud(); close(); }).setPosition(cw / 2 + 14, 0);
    const hint = label(box, '另一份存档会被覆盖，请选择要保留的进度', 20, '#ffffff', { outline: 3 });
    hint.node.setPosition(0, -ch / 2 - 30);
    box.setPosition(0, -10);
    popIn(box);
}
