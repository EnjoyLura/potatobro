// Text builders for item / weapon descriptions.
import { STAT_MAP, Stats, modText, statIsGood } from '../data/Stats';
import { WeaponDef, WEAPON_CLASSES, TIER_COLORS } from '../data/Weapons';
import { ItemDef } from '../data/Items';
import { COL } from './UIKit';

export interface Line { t: string; c: string }

const SCALE_NAMES: { [k: string]: string } = { melee: '近战', ranged: '远程', elemental: '元素', engineering: '工程', range: '范围' };

export function itemLines(it: ItemDef): Line[] {
    const out: Line[] = [];
    for (const k in it.mods) {
        const v = (it.mods as any)[k];
        out.push({ t: modText(k, v), c: statIsGood(k, v) ? COL.good : COL.bad });
    }
    if (it.desc) out.push({ t: it.desc, c: COL.text });
    if (it.max) out.push({ t: '（唯一）', c: COL.dim });
    return out;
}

export function weaponDamage(def: WeaponDef, tier: number, st: Stats | null): number {
    let base = def.dmg[tier - 1];
    if (st) {
        for (const k in def.scaling) base += def.scaling[k] * ((st as any)[k] || 0);
        base *= Math.max(0.1, 1 + st.damage / 100);
    }
    return Math.max(1, Math.round(base));
}

export function weaponCd(def: WeaponDef, tier: number, st: Stats | null) {
    const as = st ? st.atkSpd : 0;
    const b = def.cd[tier - 1];
    return as >= 0 ? b / (1 + as / 100) : b * (1 - as / 100);
}

export function weaponLines(def: WeaponDef, tier: number, st: Stats | null): Line[] {
    const out: Line[] = [];
    const t = tier - 1;
    const scal = Object.keys(def.scaling).map(k => Math.round(def.scaling[k] * 100) + '%' + SCALE_NAMES[k]).join(' ');
    const dmg = weaponDamage(def, tier, st);
    out.push({ t: `伤害 ${dmg}${def.count ? '×' + def.count[t] : ''} (${scal})`, c: COL.text });
    out.push({ t: `冷却 ${weaponCd(def, tier, st).toFixed(2)}s · 暴击 ${Math.round((def.crit + (st ? st.crit / 100 : 0)) * 100)}%×${def.critMult}`, c: COL.text });
    const rng = def.range + (st ? (def.melee ? st.range * 0.5 : st.range) : 0);
    let rl = `范围 ${Math.round(rng)}${def.melee ? '(近战)' : ''}`;
    if (def.pierce && def.pierce[t] < 50) rl += ` · 穿透 ${def.pierce[t]}`;
    if (def.bounce) rl += ` · 弹射 ${def.bounce[t]}`;
    out.push({ t: rl, c: COL.text });
    if (def.pierce && def.pierce[t] >= 50) out.push({ t: '穿透所有敌人', c: COL.blue });
    if (def.chain) out.push({ t: `闪电链: ${def.chain[t]} 次跳跃`, c: COL.blue });
    if (def.attack === 'beam') out.push({ t: '激光贯穿直线上的所有敌人', c: COL.blue });
    if (def.burn) out.push({ t: `燃烧: ${def.burn[t]}/秒 持续3秒`, c: '#ffab40' });
    if (def.bullet && def.bullet.explode) out.push({ t: `命中爆炸（半径 ${def.bullet.explode}）`, c: '#ffab40' });
    if (def.heal) out.push({ t: `命中时 ${Math.round(def.heal[t] * 100)}% 几率恢复1生命`, c: COL.good });
    if (def.lifesteal) out.push({ t: `+${Math.round(def.lifesteal * 100)}% 生命窃取`, c: COL.good });
    if (def.desc) out.push({ t: def.desc, c: COL.good });
    return out;
}

export function classText(def: WeaponDef) {
    return def.classes.map(c => WEAPON_CLASSES[c].name).join(' / ');
}

export function tierColor(tier: number) { return TIER_COLORS[Math.max(0, Math.min(3, tier - 1))]; }

export function statValueText(key: string, v: number) {
    const d = STAT_MAP[key];
    const n = Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : Math.round(v * 10) / 10;
    return n + (d && d.pct ? '%' : '');
}
