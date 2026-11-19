// Enemy definitions. Which enemies appear when is decided per stage (data/Stages.ts).

export type AI = 'chase' | 'runner' | 'spitter' | 'charger' | 'splitter' | 'hatcher' | 'looter' | 'tree' | 'bomber' | 'juggernaut' | 'queen' | 'boss' | 'mini';

/** Recolored copy of another enemy's drawing (stage variants). */
export interface EnemyArt {
    base: string;                 // sprite key of the drawing to copy, e.g. 'e_grub'
    hue: number;                  // target hue 0..360 for the colored parts
    sat?: number;                 // saturation multiplier (default 1)
    light?: number;               // lightness offset -1..1 (default 0)
    overlay?: 'ice' | 'lava' | 'void';
}

export interface EnemyDef {
    id: string;
    name: string;
    sprite: string;
    hp: number; hpW: number;      // base hp & per wave
    dmg: number; dmgW: number;    // contact damage
    speed: number;
    r: number;                    // collision radius
    mats: number;                 // materials dropped
    ai: AI;
    desc: string;                 // codex text
    kbRes?: number;               // 0..1 knockback resistance
    elite?: boolean;
    boss?: boolean;
    neutral?: boolean;            // does not hurt player
    scale?: number;
    art?: EnemyArt;
    color?: number[];             // splat / gib color (rgb)
    child?: string;               // splitter: what it splits into; hatcher: what it hatches
    summon?: string[];            // queen / boss: minions it calls in
    stage?: string;               // home stage (codex grouping); none = shared
}

type Def = Omit<EnemyDef, 'id' | 'sprite'> & { sprite?: string };
const D: { [id: string]: Def } = {
    // ---------------------------------------------------------------- shared (wasteland hive)
    grub: { name: '幼虫', hp: 3, hpW: 2, dmg: 1, dmgW: 0.6, speed: 165, r: 22, mats: 1, ai: 'chase', color: [126, 87, 194], desc: '最常见的虫群成员，数量众多，径直扑向目标。' },
    runner: { name: '疾行虫', hp: 2, hpW: 1.2, dmg: 1, dmgW: 0.55, speed: 270, r: 18, mats: 1, ai: 'runner', color: [224, 82, 151], desc: '身体脆弱但速度极快，会绕着弯冲过来。' },
    spitter: { name: '喷吐者', hp: 8, hpW: 2, dmg: 1, dmgW: 0.8, speed: 130, r: 24, mats: 1, ai: 'spitter', color: [102, 187, 106], desc: '保持距离并喷吐酸液弹，优先清理。' },
    charger: { name: '冲锋兽', hp: 10, hpW: 3, dmg: 2, dmgW: 0.8, speed: 120, r: 26, mats: 2, ai: 'charger', kbRes: 0.3, color: [239, 108, 58], desc: '蓄力后高速直线冲锋，看准时机侧身躲开。' },
    splitter: { name: '分裂球', hp: 12, hpW: 3, dmg: 1, dmgW: 0.7, speed: 120, r: 28, mats: 1, ai: 'splitter', child: 'mini', color: [66, 165, 245], desc: '被击破后分裂成数个小分裂球。' },
    mini: { name: '小分裂球', hp: 3, hpW: 1, dmg: 1, dmgW: 0.4, speed: 210, r: 15, mats: 1, ai: 'mini', color: [66, 165, 245], desc: '分裂球的碎片，又小又快。' },
    brute: { name: '巨甲虫', hp: 30, hpW: 9, dmg: 3, dmgW: 1, speed: 105, r: 38, mats: 3, ai: 'chase', kbRes: 0.7, color: [94, 75, 139], desc: '厚重甲壳几乎不受击退，伤害很高。' },
    hatcher: { name: '孵化母虫', hp: 20, hpW: 5, dmg: 1, dmgW: 0.5, speed: 55, r: 32, mats: 3, ai: 'hatcher', kbRes: 0.6, child: 'grub', color: [173, 78, 122], desc: '行动缓慢，不断孵化幼虫，越早击杀越好。' },
    bomber: { name: '自爆虫', hp: 6, hpW: 2, dmg: 4, dmgW: 1.2, speed: 200, r: 22, mats: 1, ai: 'bomber', color: [229, 57, 53], desc: '靠近后引爆自己，造成范围伤害。' },
    looter: { name: '宝藏虫', hp: 15, hpW: 5, dmg: 0, dmgW: 0, speed: 230, r: 24, mats: 7, ai: 'looter', neutral: true, color: [255, 202, 40], desc: '背着晶体四处逃窜，击杀可获得大量晶体和补给箱。' },
    tree: { name: '晶体树', hp: 10, hpW: 5, dmg: 0, dmgW: 0, speed: 0, r: 30, mats: 3, ai: 'tree', neutral: true, kbRes: 1, color: [38, 198, 218], desc: '不会攻击。打碎它能得到晶体和恢复生命的果实。' },
    juggernaut: { name: '裂甲巨兽', sprite: 'e_jugg', hp: 900, hpW: 60, dmg: 6, dmgW: 1.2, speed: 115, r: 60, mats: 25, ai: 'juggernaut', kbRes: 0.95, elite: true, color: [163, 59, 59], desc: '精英。会跺地震荡并发起冲撞，血量极高。' },
    queen: { name: '毒雾女王', hp: 750, hpW: 55, dmg: 5, dmgW: 1.1, speed: 95, r: 55, mats: 25, ai: 'queen', kbRes: 0.95, elite: true, summon: ['runner', 'spitter'], color: [76, 175, 80], desc: '精英。扇形喷吐毒弹，并召唤疾行虫与喷吐者。' },
    boss: { name: '星核吞噬者', hp: 4500, hpW: 0, dmg: 8, dmgW: 0, speed: 110, r: 80, mats: 60, ai: 'boss', kbRes: 1, elite: true, boss: true, summon: ['charger', 'grub'], color: [91, 42, 134], desc: '荒原虫巢的首领。弹幕、冲撞、召唤样样精通。' },

    // ---------------------------------------------------------------- frozen rift
    frostgrub: { name: '霜甲虫', stage: 'frost', hp: 5, hpW: 2.6, dmg: 1, dmgW: 0.6, speed: 145, r: 23, mats: 1, ai: 'chase', kbRes: 0.2, art: { base: 'e_grub', hue: 200, light: 0.08, overlay: 'ice' }, color: [120, 200, 255], desc: '覆着冰壳的幼虫，比普通幼虫更耐打。' },
    icerunner: { name: '冰刺疾行者', stage: 'frost', hp: 2.5, hpW: 1.3, dmg: 1, dmgW: 0.55, speed: 285, r: 18, mats: 1, ai: 'runner', art: { base: 'e_runner', hue: 190, light: 0.05 }, color: [130, 220, 255], desc: '在冰面上滑行，速度更快。' },
    frostspit: { name: '寒霜喷吐者', stage: 'frost', hp: 9, hpW: 2.2, dmg: 1, dmgW: 0.8, speed: 125, r: 24, mats: 1, ai: 'spitter', art: { base: 'e_spitter', hue: 178 }, color: [110, 230, 230], desc: '喷吐冰晶弹，远距离骚扰。' },
    icesplit: { name: '冰晶分裂球', stage: 'frost', hp: 14, hpW: 3.2, dmg: 1, dmgW: 0.7, speed: 115, r: 28, mats: 1, ai: 'splitter', child: 'icemini', art: { base: 'e_splitter', hue: 205, sat: 0.6, light: 0.15, overlay: 'ice' }, color: [190, 230, 255], desc: '碎裂成锋利的冰晶碎片。' },
    icemini: { name: '冰晶碎片', stage: 'frost', hp: 3, hpW: 1, dmg: 1, dmgW: 0.45, speed: 220, r: 15, mats: 1, ai: 'mini', art: { base: 'e_mini', hue: 205, sat: 0.6, light: 0.15 }, color: [190, 230, 255], desc: '冰晶分裂球的碎片。' },
    yeti: { name: '雪原冲锋兽', stage: 'frost', hp: 12, hpW: 3.4, dmg: 2, dmgW: 0.85, speed: 125, r: 26, mats: 2, ai: 'charger', kbRes: 0.35, art: { base: 'e_charger', hue: 210, sat: 0.35, light: 0.25 }, color: [220, 235, 250], desc: '冲锋距离更长，被它撞上会很疼。' },
    glacier: { name: '冰川巨甲', stage: 'frost', hp: 34, hpW: 10, dmg: 3, dmgW: 1, speed: 95, r: 38, mats: 3, ai: 'chase', kbRes: 0.75, art: { base: 'e_brute', hue: 212, light: 0.05, overlay: 'ice' }, color: [140, 180, 230], desc: '移动更慢，但甲壳更厚。' },
    frostjugg: { name: '冰霜巨兽', stage: 'frost', sprite: 'e_frostjugg', hp: 950, hpW: 62, dmg: 6, dmgW: 1.2, speed: 110, r: 60, mats: 25, ai: 'juggernaut', kbRes: 0.95, elite: true, art: { base: 'e_jugg', hue: 205, overlay: 'ice' }, color: [120, 190, 255], desc: '精英。冰封的裂甲巨兽。' },
    frostqueen: { name: '冰晶女王', stage: 'frost', hp: 780, hpW: 56, dmg: 5, dmgW: 1.1, speed: 92, r: 55, mats: 25, ai: 'queen', kbRes: 0.95, elite: true, summon: ['icerunner', 'frostspit'], art: { base: 'e_queen', hue: 190, overlay: 'ice' }, color: [120, 230, 240], desc: '精英。召唤冰刺疾行者与寒霜喷吐者。' },
    frostboss: { name: '极寒吞噬者', stage: 'frost', hp: 4800, hpW: 0, dmg: 8, dmgW: 0, speed: 105, r: 80, mats: 60, ai: 'boss', kbRes: 1, elite: true, boss: true, summon: ['yeti', 'frostgrub'], art: { base: 'e_boss', hue: 205, light: 0.06, overlay: 'ice' }, color: [100, 170, 240], desc: '冰封裂谷的首领。' },

    // ---------------------------------------------------------------- molten forge
    lavagrub: { name: '熔岩幼虫', stage: 'forge', hp: 3, hpW: 2, dmg: 1, dmgW: 0.7, speed: 180, r: 22, mats: 1, ai: 'chase', art: { base: 'e_grub', hue: 18, overlay: 'lava' }, color: [255, 120, 40], desc: '体内流淌着熔岩，比普通幼虫更快。' },
    firespit: { name: '火焰喷吐者', stage: 'forge', hp: 8, hpW: 2.1, dmg: 1, dmgW: 0.9, speed: 135, r: 24, mats: 1, ai: 'spitter', art: { base: 'e_spitter', hue: 26, overlay: 'lava' }, color: [255, 150, 50], desc: '喷吐火球，伤害更高。' },
    embercharger: { name: '炽焰冲锋兽', stage: 'forge', hp: 11, hpW: 3.2, dmg: 2, dmgW: 0.9, speed: 125, r: 26, mats: 2, ai: 'charger', kbRes: 0.3, art: { base: 'e_charger', hue: 4, overlay: 'lava' }, color: [230, 60, 40], desc: '浑身火焰的冲锋兽。' },
    magmabomb: { name: '熔岩自爆虫', stage: 'forge', hp: 7, hpW: 2.2, dmg: 5, dmgW: 1.3, speed: 210, r: 22, mats: 1, ai: 'bomber', art: { base: 'e_bomber', hue: 30, light: 0.04 }, color: [255, 140, 30], desc: '爆炸伤害比自爆虫更高。' },
    cinderbrute: { name: '焦岩巨甲', stage: 'forge', hp: 32, hpW: 9.5, dmg: 3, dmgW: 1.05, speed: 110, r: 38, mats: 3, ai: 'chase', kbRes: 0.7, art: { base: 'e_brute', hue: 15, sat: 0.55, light: -0.08, overlay: 'lava' }, color: [120, 70, 60], desc: '焦黑的岩甲下透着熔岩的光。' },
    forgejugg: { name: '熔核巨兽', stage: 'forge', hp: 920, hpW: 62, dmg: 7, dmgW: 1.3, speed: 118, r: 60, mats: 25, ai: 'juggernaut', kbRes: 0.95, elite: true, art: { base: 'e_jugg', hue: 22, overlay: 'lava' }, color: [255, 110, 40], desc: '精英。炽热的裂甲巨兽。' },
    flamequeen: { name: '烈焰女王', stage: 'forge', hp: 760, hpW: 55, dmg: 6, dmgW: 1.2, speed: 96, r: 55, mats: 25, ai: 'queen', kbRes: 0.95, elite: true, summon: ['lavagrub', 'firespit'], art: { base: 'e_queen', hue: 20, overlay: 'lava' }, color: [255, 120, 50], desc: '精英。召唤熔岩幼虫与火焰喷吐者。' },
    forgeboss: { name: '熔核吞噬者', stage: 'forge', hp: 5000, hpW: 0, dmg: 9, dmgW: 0, speed: 112, r: 80, mats: 60, ai: 'boss', kbRes: 1, elite: true, boss: true, summon: ['embercharger', 'lavagrub'], art: { base: 'e_boss', hue: 14, overlay: 'lava' }, color: [230, 70, 40], desc: '熔火工坊的首领。' },

    // ---------------------------------------------------------------- void harbor
    voidgrub: { name: '虚空幼虫', stage: 'void', hp: 4, hpW: 2.3, dmg: 1, dmgW: 0.7, speed: 175, r: 22, mats: 1, ai: 'chase', art: { base: 'e_grub', hue: 268, overlay: 'void' }, color: [150, 90, 255], desc: '从虚空裂隙中涌出的幼虫。' },
    voidrunner: { name: '虚空疾行者', stage: 'void', hp: 3, hpW: 1.5, dmg: 1, dmgW: 0.6, speed: 290, r: 18, mats: 1, ai: 'runner', art: { base: 'e_runner', hue: 285, overlay: 'void' }, color: [190, 90, 255], desc: '比疾行虫更快更耐打。' },
    voidsplit: { name: '虚空分裂球', stage: 'void', hp: 15, hpW: 3.5, dmg: 1, dmgW: 0.75, speed: 120, r: 28, mats: 1, ai: 'splitter', child: 'voidmini', art: { base: 'e_splitter', hue: 280, overlay: 'void' }, color: [160, 100, 255], desc: '分裂成虚空碎片。' },
    voidmini: { name: '虚空碎片', stage: 'void', hp: 3.5, hpW: 1.1, dmg: 1, dmgW: 0.45, speed: 225, r: 15, mats: 1, ai: 'mini', art: { base: 'e_mini', hue: 280 }, color: [160, 100, 255], desc: '虚空分裂球的碎片。' },
    shadebrute: { name: '暗影巨甲', stage: 'void', hp: 36, hpW: 11, dmg: 3, dmgW: 1.1, speed: 112, r: 38, mats: 3, ai: 'chase', kbRes: 0.75, art: { base: 'e_brute', hue: 250, light: -0.12, overlay: 'void' }, color: [70, 60, 130], desc: '在暗影中潜行的巨甲虫。' },
    voidhatch: { name: '虚空孵化者', stage: 'void', hp: 22, hpW: 6, dmg: 1, dmgW: 0.55, speed: 60, r: 32, mats: 3, ai: 'hatcher', kbRes: 0.6, child: 'voidgrub', art: { base: 'e_hatcher', hue: 300, overlay: 'void' }, color: [200, 80, 220], desc: '不断孵化虚空幼虫。' },
    voidjugg: { name: '虚空巨兽', stage: 'void', hp: 1000, hpW: 66, dmg: 7, dmgW: 1.3, speed: 120, r: 60, mats: 25, ai: 'juggernaut', kbRes: 0.95, elite: true, art: { base: 'e_jugg', hue: 265, overlay: 'void' }, color: [140, 80, 230], desc: '精英。来自虚空的裂甲巨兽。' },
    voidqueen: { name: '虚空女王', stage: 'void', hp: 820, hpW: 58, dmg: 6, dmgW: 1.2, speed: 98, r: 55, mats: 25, ai: 'queen', kbRes: 0.95, elite: true, summon: ['voidrunner', 'voidgrub'], art: { base: 'e_queen', hue: 285, overlay: 'void' }, color: [180, 90, 240], desc: '精英。召唤虚空疾行者与虚空幼虫。' },
    voidboss: { name: '虚空吞噬者', stage: 'void', hp: 5600, hpW: 0, dmg: 10, dmgW: 0, speed: 115, r: 80, mats: 60, ai: 'boss', kbRes: 1, elite: true, boss: true, summon: ['shadebrute', 'voidgrub'], art: { base: 'e_boss', hue: 255, light: -0.05, overlay: 'void' }, color: [90, 50, 180], desc: '虚空星港的首领，最终的考验。' },
};

export const ENEMIES: { [id: string]: EnemyDef } = {};
for (const id in D) ENEMIES[id] = Object.assign({ id, sprite: 'e_' + id }, D[id]) as EnemyDef;

export interface SpawnRule { type: string; from: number; interval: number; group: number; groupW: number; until?: number }

export const MAX_WAVE = 20;

export function waveDuration(w: number) {
    if (w >= MAX_WAVE) return 90;
    return Math.min(20 + (w - 1) * 5, 60);
}

export interface DangerDef { name: string; desc: string; hpMul: number; dmgMul: number; spawnMul: number; color: string }
export const DANGERS: DangerDef[] = [
    { name: '难度一', desc: '标准难度', hpMul: 1, dmgMul: 1, spawnMul: 1, color: '#e8e8e8' },
    { name: '难度二', desc: '敌人数量增加', hpMul: 1, dmgMul: 1, spawnMul: 1.15, color: '#7bdcff' },
    { name: '难度三', desc: '新增精英敌人（第12波）', hpMul: 1.05, dmgMul: 1.05, spawnMul: 1.2, color: '#5fd35f' },
    { name: '难度四', desc: '敌人生命与伤害+12%，更多精英', hpMul: 1.12, dmgMul: 1.12, spawnMul: 1.25, color: '#ffd166' },
    { name: '难度五', desc: '敌人生命与伤害+25%，精英成群', hpMul: 1.25, dmgMul: 1.25, spawnMul: 1.3, color: '#ff9f43' },
    { name: '难度六', desc: '最终考验：双重首领', hpMul: 1.4, dmgMul: 1.4, spawnMul: 1.4, color: '#ff5c5c' },
];
