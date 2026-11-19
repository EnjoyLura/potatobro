// Stage select: arena preview behind, stage info + difficulty on the left, enemies on the right,
// stage slots along the bottom between 返回 and 开始.
import { Graphics, tween, Vec3, UITransform } from 'cc';
import type { UI } from './UI';
import { mkNode, mkSprite, setTint } from '../core/Nodes';
import { Save } from '../core/Save';
import { Sfx } from '../core/Sfx';
import { COL, C, label, button, panel, cellBg, size, tappable, popIn, opacity, bar, scrollArea } from './UIKit';
import { STAGES, StageDef, stageEnemies, ENDLESS } from '../data/Stages';
import { ENEMIES, DANGERS, MAX_WAVE } from '../data/Enemies';

export function stageUnlocked(i: number) { return i === 0 || Save.stageLevel(STAGES[i - 1].id) >= 0; }
/** Difficulty N+1 unlocks after clearing N; endless mode after clearing the stage on any difficulty. */
export function dangerUnlocked(st: StageDef, d: number) { return d === ENDLESS ? Save.stageLevel(st.id) >= 0 : d <= Save.stageLevel(st.id) + 1; }

export function showStageSelect(ui: UI) {
    ui.updateSize();
    ui.clearScreen();
    ui.hideHud();
    ui.screenName = 'stage';
    if (!stageUnlocked(STAGES.indexOf(ui.selStage))) ui.selStage = STAGES[0];
    const st = ui.selStage;
    // highest unlocked difficulty by default, never a locked one
    if (!dangerUnlocked(st, ui.selDanger)) ui.selDanger = Math.min(DANGERS.length - 1, Save.stageLevel(st.id) + 1);
    ui.host.previewStage(st);
    const s = ui.screen;
    const W = ui.W, H = ui.H, L = ui.L, R = ui.R, T = ui.T, B = ui.B;

    // light dim so the arena floor shows through
    const bg = mkNode('bg', s);
    const g = bg.addComponent(Graphics);
    g.fillColor = C('#000000', 70); g.rect(-W, -H, W * 2, H * 2); g.fill();

    // enemies of this stage wandering on the right
    const deco = mkNode('deco', s);
    const ids = stageEnemies(st).filter(id => !ENEMIES[id].elite);
    const boss = ENEMIES[st.boss];
    const artCX = R - Math.min(300, W * 0.24), artCY = T - H * 0.42;
    const bs = mkSprite(deco, boss.sprite);
    bs.node.setPosition(artCX, artCY + 10);
    const bsc = Math.min(1, H / 640);
    bs.node.setScale(-bsc, bsc, 1);
    if (Save.data.codex.e[boss.id] === undefined) setTint(bs, 20, 20, 28, 230);
    ids.slice(0, 6).forEach((id, i) => {
        const sp = mkSprite(deco, ENEMIES[id].sprite);
        const a = Math.PI * (0.65 + i * 0.28);
        sp.node.setPosition(artCX + Math.cos(a) * 170, artCY + Math.sin(a) * 120 - 30);
        sp.node.setScale(i % 2 ? -0.9 : 0.9, 0.9, 1);
        if (Save.data.codex.e[id] === undefined) setTint(sp, 20, 20, 28, 230);
        tween(sp.node).repeatForever(tween().by(0.55 + i * 0.07, { position: new Vec3(0, 7, 0) }).by(0.55 + i * 0.07, { position: new Vec3(0, -7, 0) })).start();
    });

    // ---- info panel (top left)
    const pw = Math.min(560, W * 0.47), ph = Math.min(250, H * 0.42);
    const px = L + 16 + pw / 2, py = T - 16 - ph / 2;
    const info = panel(s, pw, ph, '#000000', undefined, 18, 0, 205);
    info.setPosition(px, py);
    const en = label(info, st.en, 30, '#ffffff', { align: 'left', outline: 0 });
    en.node.setPosition(-pw / 2 + 26, ph / 2 - 30);
    opacity(en.node, 45);
    const nm = label(info, st.name, 38, COL.gold, { align: 'left', outline: 0 });
    nm.node.setPosition(-pw / 2 + 26, ph / 2 - 52);
    const sz = label(info, `${MAX_WAVE} 波  ·  场地 ${st.aw}×${st.ah}`, 20, '#d8d8de', { align: 'right', outline: 0 });
    sz.node.setPosition(pw / 2 - 24, ph / 2 - 56);
    const ln = mkNode('line', info); const lg = ln.addComponent(Graphics);
    lg.fillColor = C('#ffffff', 40); lg.rect(-pw / 2 + 24, ph / 2 - 84, pw - 48, 3); lg.fill();
    let ly = ph / 2 - 108;
    const desc = label(info, st.desc, 18, COL.dim, { align: 'left', outline: 0, width: pw - 52, anchorY: 1, lineH: 24 });
    desc.node.setPosition(-pw / 2 + 26, ly + 12);
    desc.updateRenderData(true);
    ly -= 22 + Math.max(0, desc.node.getComponent(UITransform).height - 24);
    for (const m of st.mods) {
        const l = label(info, '- ' + m, 20, '#ffffff', { align: 'left', outline: 0 });
        l.node.setPosition(-pw / 2 + 26, ly - 8);
        ly -= 28;
    }

    // ---- difficulty row
    const dh = 60, dy = py - ph / 2 - 14 - dh / 2;
    const drow = panel(s, pw, dh, '#000000', undefined, 16, 0, 205);
    drow.setPosition(px, dy);
    const endless = ui.selDanger === ENDLESS;
    const d = endless ? null : DANGERS[ui.selDanger];
    const locked = !dangerUnlocked(st, ui.selDanger);
    const dl = label(drow, endless ? '无尽模式' : d.name, 30, locked ? COL.dim : endless ? '#c38bff' : COL.gold, { align: 'left', outline: 0 });
    dl.node.setPosition(-pw / 2 + 66, 0);
    const best = Save.stageLevel(st.id);
    const eb = Save.data.endless[st.id] || 0;
    const bl = label(drow, endless ? (eb ? `最佳  第 ${eb} 波` : '暂无记录') : best >= 0 ? `最佳通关  ${DANGERS[best].name}` : '尚未通关', 18, '#c8c8d0', { align: 'right', outline: 0 });
    bl.node.setPosition(pw / 2 - 66, 0);
    const arrow = (dir: number) => {
        const a = mkNode('arrow', s);
        size(a, 54, 54);
        a.setPosition(px + dir * (pw / 2 - 32), dy);
        const ag = a.addComponent(Graphics);
        const can = ui.selDanger + dir >= 0 && ui.selDanger + dir <= ENDLESS;
        ag.fillColor = C('#ffffff', can ? 255 : 70);
        ag.circle(0, 0, 21); ag.fill();
        ag.fillColor = C('#16161c');
        ag.moveTo(dir * 10, 0); ag.lineTo(-dir * 6, 10); ag.lineTo(-dir * 6, -10); ag.close(); ag.fill();
        tappable(a, () => {
            if (!can) { Sfx.deny(); return; }
            ui.selDanger += dir;
            showStageSelect(ui);
        });
    };
    arrow(-1); arrow(1);
    const hint = label(s, locked ? (endless ? '通关本关任意难度后解锁' : `通关 ${DANGERS[ui.selDanger - 1].name} 后解锁`) : '左右箭头切换难度（最右为无尽模式）', 18, '#ffffff', { outline: 3 });
    hint.node.setPosition(px, dy - dh / 2 - 18);
    const dd = label(s, endless ? '波次无限，敌人越来越强；第 20 波后每 5 波一个首领' : d.desc, 18, locked ? COL.dim : '#ffd27a', { outline: 3 });
    dd.node.setPosition(px, dy - dh / 2 - 44);

    // ---- bottom bar: 返回, stage slots, 开始
    const bh = 64, by = B + bh / 2 + 10;
    const back = button(s, Math.min(230, W * 0.2), bh, '返回', COL.red, () => ui.showMenu(), 30);
    back.node.setPosition(L + 16 + back.w / 2, by);
    const go = button(s, Math.min(250, W * 0.21), bh, '开始', COL.btn, () => {
        if (locked) { Sfx.deny(); ui.toast('该难度尚未解锁', COL.bad, 0, 28); return; }
        ui.showCharSelect();
    }, 32);
    go.node.setPosition(R - 16 - go.w / 2, by);
    if (locked) go.setEnabled(false);
    // progress over the start button
    const prog = panel(s, go.w + 40, 54, '#000000', undefined, 14, 0, 205);
    prog.setPosition(R - 16 - (go.w + 40) / 2, by + bh / 2 + 40);
    const cleared = best + 1;
    const pl = label(prog, '难度进度', 18, '#ffffff', { align: 'left', outline: 0 });
    pl.node.setPosition(-(go.w + 40) / 2 + 16, 8);
    const pv = label(prog, `${cleared}/${DANGERS.length}`, 18, COL.mat, { align: 'right', outline: 0 });
    pv.node.setPosition((go.w + 40) / 2 - 16, 8);
    const pb = bar(prog, go.w + 8, 8, COL.mat, '#30313a', 4);
    pb.node.setPosition(0, -12);
    pb.set(cleared, DANGERS.length);

    // stage slots: a sideways-scrolling row between 返回 and 开始 (drag to see more)
    const slotW = 96, slotH = 92, gap = 14;
    const rowL = L + 16 + back.w + 18, rowR = R - 16 - go.w - 18;
    const rowW = rowR - rowL;
    const slotsW = STAGES.length * slotW + (STAGES.length - 1) * gap;
    const area = scrollArea(s, rowW, slotH + 16, true);
    area.node.setPosition((rowL + rowR) / 2, by + 6);
    const fits = slotsW <= rowW;
    const sx0 = fits ? -slotsW / 2 + slotW / 2 : -rowW / 2 + slotW / 2 + 4;
    STAGES.forEach((stg, i) => {
        const open = stageUnlocked(i);
        const n = mkNode('slot', area.content);
        size(n, slotW, slotH);
        n.setPosition(sx0 + i * (slotW + gap), 0);
        const cg = n.addComponent(Graphics);
        cellBg(cg, slotW, slotH, stg === st, open ? (Save.stageLevel(stg.id) >= 0 ? COL.mat : '#4fc3f7') : undefined);
        if (open) {
            const ic = mkSprite(n, stg.icon);
            const k = 52 / Math.max(ic.node.getComponent(UITransform).width, ic.node.getComponent(UITransform).height);
            ic.node.setScale(k, k, 1);
            ic.node.setPosition(0, 12);
        } else {
            const q = label(n, '?', 44, '#ffffff', { outline: 0 });
            q.node.setPosition(0, 12);
        }
        const t = label(n, open ? stg.name : '未解锁', 17, '#ffffff', { outline: 3 });
        t.node.setPosition(0, -slotH / 2 + 16);
        tappable(n, () => {
            if (area.moved()) return;
            if (!open) { Sfx.deny(); ui.toast(`通关「${STAGES[i - 1].name}」后解锁`, COL.bad, 0, 26); return; }
            if (ui.selStage === stg) return;
            ui.selStage = stg;
            ui.selDanger = Math.min(DANGERS.length - 1, Save.stageLevel(stg.id) + 1);
            showStageSelect(ui);
        });
    });
    area.setHeight(slotsW + 8);
    // keep the selected stage in view
    if (!fits) area.scrollTo(STAGES.indexOf(st) * (slotW + gap) - (rowW - slotW) / 2);
    // fade hint at the right edge when more stages are off-screen
    if (!fits) {
        const more = label(s, '‹ 滑动查看更多 ›', 15, COL.dim, { outline: 2 });
        more.node.setPosition((rowL + rowR) / 2, by + slotH / 2 + 22);
    }
    popIn(info);
}

