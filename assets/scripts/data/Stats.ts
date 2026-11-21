// Player stat definitions.

export type StatKey =
    'maxHp' | 'regen' | 'lifesteal' | 'damage' | 'melee' | 'ranged' | 'elemental' |
    'atkSpd' | 'crit' | 'engineering' | 'range' | 'armor' | 'dodge' | 'speed' | 'luck' | 'harvest' |
    // secondary stats
    'pickup' | 'xpGain' | 'explSize' | 'knockback' | 'pierce' | 'bounce' | 'projectiles' |
    'shopDiscount' | 'enemySpeed' | 'burnDmg' | 'fruitHeal' | 'structAtkSpd' | 'critDmg';

export interface StatDef { key: StatKey; name: string; pct: boolean; primary: boolean; desc: string; color?: string }

export const STAT_DEFS: StatDef[] = [
    { key: 'maxHp', name: '最大生命', pct: false, primary: true, desc: '生命值上限' },
    { key: 'regen', name: '生命再生', pct: false, primary: true, desc: '每秒恢复 0.2×再生 点生命' },
    { key: 'lifesteal', name: '生命窃取', pct: true, primary: true, desc: '每次命中有几率恢复1点生命（每秒最多4点）' },
    { key: 'damage', name: '伤害', pct: true, primary: true, desc: '所有伤害的百分比加成' },
    { key: 'melee', name: '近战伤害', pct: false, primary: true, desc: '提高近战武器伤害' },
    { key: 'ranged', name: '远程伤害', pct: false, primary: true, desc: '提高远程武器伤害' },
    { key: 'elemental', name: '元素伤害', pct: false, primary: true, desc: '提高元素武器与燃烧伤害' },
    { key: 'atkSpd', name: '攻击速度', pct: true, primary: true, desc: '武器冷却时间缩短' },
    { key: 'crit', name: '暴击率', pct: true, primary: true, desc: '附加暴击几率' },
    { key: 'engineering', name: '工程学', pct: false, primary: true, desc: '提高炮塔、地雷等建筑的伤害' },
    { key: 'range', name: '范围', pct: false, primary: true, desc: '武器攻击距离（近战效果减半）' },
    { key: 'armor', name: '护甲', pct: false, primary: true, desc: '按比例减少受到的伤害' },
    { key: 'dodge', name: '闪避', pct: true, primary: true, desc: '闪避攻击的几率（上限60%）' },
    { key: 'speed', name: '速度', pct: true, primary: true, desc: '移动速度' },
    { key: 'luck', name: '幸运', pct: false, primary: true, desc: '提高掉落率与商店稀有度' },
    { key: 'harvest', name: '收获', pct: false, primary: true, desc: '每波结束获得等量晶体与经验，每波增长5%' },
    { key: 'pickup', name: '拾取范围', pct: true, primary: false, desc: '吸取晶体的范围' },
    { key: 'xpGain', name: '经验获取', pct: true, primary: false, desc: '额外经验' },
    { key: 'explSize', name: '爆炸范围', pct: true, primary: false, desc: '爆炸半径' },
    { key: 'knockback', name: '击退', pct: false, primary: false, desc: '额外击退' },
    { key: 'pierce', name: '穿透', pct: false, primary: false, desc: '远程子弹额外穿透' },
    { key: 'bounce', name: '弹射', pct: false, primary: false, desc: '远程子弹额外弹射' },
    { key: 'projectiles', name: '弹丸数', pct: false, primary: false, desc: '远程武器额外子弹' },
    { key: 'shopDiscount', name: '商店折扣', pct: true, primary: false, desc: '商店价格降低' },
    { key: 'enemySpeed', name: '敌人速度', pct: true, primary: false, desc: '敌人移动速度' },
    { key: 'burnDmg', name: '燃烧伤害', pct: true, primary: false, desc: '燃烧伤害加成' },
    { key: 'fruitHeal', name: '果实治疗', pct: false, primary: false, desc: '拾取果实额外治疗' },
    { key: 'structAtkSpd', name: '建筑攻速', pct: true, primary: false, desc: '炮塔攻击速度' },
    { key: 'critDmg', name: '暴击伤害', pct: true, primary: false, desc: '暴击伤害加成' },
];

export const STAT_MAP: { [k: string]: StatDef } = {};
for (const d of STAT_DEFS) STAT_MAP[d.key] = d;

export type Stats = { [K in StatKey]: number };

export function emptyStats(): Stats {
    const s: any = {};
    for (const d of STAT_DEFS) s[d.key] = 0;
    return s;
}

export type StatMods = Partial<Stats>;

export function addMods(target: Stats, mods: StatMods, mult = 1) {
    for (const k in mods) (target as any)[k] += (mods as any)[k] * mult;
}

/** Human readable modifier text e.g. "+5 近战伤害" */
export function modText(key: string, v: number): string {
    const d = STAT_MAP[key];
    if (!d) return '';
    const n = Math.abs(v - Math.round(v)) < 0.01 ? Math.round(v) : v.toFixed(1);
    return (v > 0 ? '+' : '') + n + (d.pct ? '%' : '') + ' ' + d.name;
}

/** Whether a positive value of this stat is good for the player. */
export function statIsGood(key: string, v: number) {
    if (key === 'enemySpeed') return v < 0;
    return v > 0;
}
