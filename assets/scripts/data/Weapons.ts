// Weapon definitions (4 tiers each) and weapon class set bonuses.
import { StatMods } from './Stats';

export type AttackKind = 'thrust' | 'sweep' | 'shoot' | 'beam' | 'chain';

export interface BulletSpec {
    sprite: string;
    speed: number;
    size?: number;          // visual scale
    explode?: number;       // explosion radius
    burn?: number[];        // burn dps per tier
    tint?: string;
    trail?: boolean;
}

export interface WeaponDef {
    id: string;
    name: string;
    classes: string[];
    melee: boolean;
    attack: AttackKind;
    sprite: string;
    dmg: number[];
    cd: number[];
    range: number;
    crit: number;           // base crit chance 0..1
    critMult: number;
    kb: number;
    scaling: { [stat: string]: number };
    price: number;          // tier-1 base price
    minTier?: number;
    pierce?: number[];      // extra targets
    count?: number[];       // projectiles per shot
    spread?: number;        // radians
    bounce?: number[];
    chain?: number[];
    lifesteal?: number;     // extra lifesteal chance
    heal?: number[];        // chance to heal 1 on hit
    bullet?: BulletSpec;
    arc?: number;           // sweep arc radians
    turret?: boolean;       // wrench: builds turret each wave
    desc?: string;
    burn?: number[];
}

export const WEAPONS: WeaponDef[] = [
    {
        id: 'fist', name: '动力拳套', classes: ['blunt', 'primitive'], melee: true, attack: 'thrust', sprite: 'w_fist',
        dmg: [8, 12, 17, 26], cd: [0.78, 0.74, 0.7, 0.62], range: 150, crit: 0.03, critMult: 2, kb: 18,
        scaling: { melee: 1 }, price: 12,
    },
    {
        id: 'blade', name: '等离子刃', classes: ['blade'], melee: true, attack: 'sweep', sprite: 'w_blade', arc: 1.6,
        dmg: [11, 17, 26, 40], cd: [1.0, 0.95, 0.9, 0.82], range: 175, crit: 0.08, critMult: 2, kb: 8,
        scaling: { melee: 0.8 }, price: 20, lifesteal: 0.05,
    },
    {
        id: 'spear', name: '相位长矛', classes: ['precise', 'primitive'], melee: true, attack: 'thrust', sprite: 'w_spear',
        dmg: [13, 21, 32, 48], cd: [1.15, 1.08, 1.0, 0.9], range: 270, crit: 0.15, critMult: 2.5, kb: 10,
        scaling: { melee: 0.8, range: 0.05 }, price: 22, pierce: [99, 99, 99, 99],
    },
    {
        id: 'hammer', name: '震荡重锤', classes: ['blunt'], melee: true, attack: 'sweep', sprite: 'w_hammer', arc: 2.2,
        dmg: [26, 42, 62, 95], cd: [1.75, 1.65, 1.55, 1.4], range: 190, crit: 0.03, critMult: 2, kb: 45,
        scaling: { melee: 1.5 }, price: 34,
    },
    {
        id: 'chainsaw', name: '链锯', classes: ['blade', 'tool'], melee: true, attack: 'thrust', sprite: 'w_chainsaw',
        dmg: [4, 6, 9, 14], cd: [0.26, 0.24, 0.22, 0.19], range: 140, crit: 0.05, critMult: 2, kb: 2,
        scaling: { melee: 0.5 }, price: 30, lifesteal: 0.06,
    },
    {
        id: 'flamesword', name: '熔岩刃', classes: ['elemental', 'blade'], melee: true, attack: 'sweep', sprite: 'w_flamesword', arc: 1.7,
        dmg: [8, 13, 19, 30], cd: [1.05, 1.0, 0.95, 0.85], range: 170, crit: 0.05, critMult: 2, kb: 6,
        scaling: { melee: 0.5, elemental: 0.6 }, price: 30, burn: [3, 5, 8, 12],
    },
    {
        id: 'pistol', name: '脉冲手枪', classes: ['gun'], melee: false, attack: 'shoot', sprite: 'w_pistol',
        dmg: [12, 20, 30, 50], cd: [1.2, 1.12, 1.03, 0.87], range: 430, crit: 0.05, critMult: 2, kb: 15,
        scaling: { ranged: 1 }, price: 12, pierce: [1, 1, 1, 1],
        bullet: { sprite: 'b_round', speed: 1500, tint: '#ffe36a' },
    },
    {
        id: 'smg', name: '冲锋枪', classes: ['gun'], melee: false, attack: 'shoot', sprite: 'w_smg',
        dmg: [3, 4, 5, 7], cd: [0.17, 0.16, 0.15, 0.13], range: 370, crit: 0.01, critMult: 2, kb: 2, spread: 0.22,
        scaling: { ranged: 0.5 }, price: 22,
        bullet: { sprite: 'b_long', speed: 1500, size: 0.8, tint: '#ffd27a' },
    },
    {
        id: 'shotgun', name: '霰弹枪', classes: ['gun'], melee: false, attack: 'shoot', sprite: 'w_shotgun',
        dmg: [3, 5, 7, 10], cd: [1.37, 1.27, 1.17, 1.0], range: 350, crit: 0.03, critMult: 2, kb: 12, spread: 0.55,
        scaling: { ranged: 0.8 }, price: 28, pierce: [2, 2, 2, 3], count: [4, 5, 6, 7],
        bullet: { sprite: 'b_round', speed: 1300, size: 0.8, tint: '#ffb36a' },
    },
    {
        id: 'sniper', name: '电磁狙击', classes: ['gun', 'precise'], melee: false, attack: 'shoot', sprite: 'w_sniper',
        dmg: [16, 26, 40, 66], cd: [2.0, 1.9, 1.75, 1.55], range: 760, crit: 0.3, critMult: 2.5, kb: 25,
        scaling: { ranged: 1 }, price: 35, pierce: [1, 2, 2, 3],
        bullet: { sprite: 'b_long', speed: 2600, size: 1.3, tint: '#9ff0ff', trail: true },
    },
    {
        id: 'rocket', name: '火箭筒', classes: ['explosive', 'gun'], melee: false, attack: 'shoot', sprite: 'w_rocket',
        dmg: [20, 32, 48, 72], cd: [1.9, 1.8, 1.65, 1.45], range: 470, crit: 0.03, critMult: 2, kb: 0,
        scaling: { ranged: 1 }, price: 40,
        bullet: { sprite: 'b_rocket', speed: 800, explode: 95, trail: true },
    },
    {
        id: 'wand', name: '雷霆法杖', classes: ['elemental'], melee: false, attack: 'chain', sprite: 'w_wand',
        dmg: [7, 11, 16, 24], cd: [1.05, 1.0, 0.92, 0.82], range: 420, crit: 0.03, critMult: 2, kb: 0,
        scaling: { elemental: 1 }, price: 20, chain: [2, 3, 4, 6],
    },
    {
        id: 'flamethrower', name: '喷火器', classes: ['elemental'], melee: false, attack: 'shoot', sprite: 'w_flamethrower',
        dmg: [1, 2, 3, 4], cd: [0.15, 0.14, 0.13, 0.11], range: 240, crit: 0, critMult: 2, kb: 0, spread: 0.3,
        scaling: { elemental: 0.4 }, price: 32, pierce: [99, 99, 99, 99], burn: [4, 6, 9, 14],
        bullet: { sprite: 'b_fire', speed: 600, size: 1 },
    },
    {
        id: 'laser', name: '聚能激光', classes: ['precise'], melee: false, attack: 'beam', sprite: 'w_laser',
        dmg: [30, 50, 80, 125], cd: [2.25, 2.1, 1.95, 1.7], range: 620, crit: 0.1, critMult: 2, kb: 10,
        scaling: { ranged: 1.6 }, price: 45,
    },
    {
        id: 'medigun', name: '纳米治疗枪', classes: ['support', 'gun'], melee: false, attack: 'shoot', sprite: 'w_medigun',
        dmg: [8, 14, 20, 30], cd: [1.05, 1.0, 0.95, 0.85], range: 400, crit: 0.03, critMult: 2, kb: 5,
        scaling: { ranged: 0.8 }, price: 25, heal: [0.15, 0.2, 0.25, 0.35],
        bullet: { sprite: 'b_round', speed: 1200, tint: '#7dffa0' },
    },
    {
        id: 'wrench', name: '工程扳手', classes: ['tool', 'blunt'], melee: true, attack: 'thrust', sprite: 'w_wrench',
        dmg: [6, 10, 15, 22], cd: [0.95, 0.9, 0.85, 0.78], range: 150, crit: 0.03, critMult: 2, kb: 15,
        scaling: { melee: 0.4, engineering: 0.6 }, price: 25, turret: true, desc: '每波开始时建造一座炮台（等级=武器阶级）',
    },
    {
        id: 'slingshot', name: '弹弓', classes: ['primitive'], melee: false, attack: 'shoot', sprite: 'w_slingshot',
        dmg: [8, 12, 18, 27], cd: [1.15, 1.05, 0.95, 0.85], range: 390, crit: 0.03, critMult: 2, kb: 10,
        scaling: { ranged: 0.8 }, price: 10, bounce: [1, 2, 3, 4],
        bullet: { sprite: 'b_rock', speed: 1100 },
    },
    {
        id: 'minigun', name: '旋转机枪', classes: ['gun', 'heavy'], melee: false, attack: 'shoot', sprite: 'w_minigun', minTier: 2,
        dmg: [3, 3, 4, 6], cd: [0.1, 0.1, 0.09, 0.08], range: 400, crit: 0.01, critMult: 2, kb: 1, spread: 0.18,
        scaling: { ranged: 0.5 }, price: 30,
        bullet: { sprite: 'b_long', speed: 1700, size: 0.8, tint: '#fff08a' },
    },
    {
        id: 'grenade', name: '榴弹发射器', classes: ['explosive'], melee: false, attack: 'shoot', sprite: 'w_grenade', minTier: 2,
        dmg: [16, 16, 26, 40], cd: [1.6, 1.6, 1.45, 1.3], range: 420, crit: 0.03, critMult: 2, kb: 0, spread: 0.2,
        scaling: { ranged: 0.8, engineering: 0.3 }, price: 34, count: [2, 2, 2, 3],
        bullet: { sprite: 'b_grenade', speed: 650, explode: 75 },
    },
];

export const WEAPON_MAP: { [id: string]: WeaponDef } = {};
for (const w of WEAPONS) WEAPON_MAP[w.id] = w;

export interface WeaponClass { id: string; name: string; color: string; bonus: StatMods[] /* index 0 => 2 weapons */ }

export const WEAPON_CLASSES: { [id: string]: WeaponClass } = {
    blunt: { id: 'blunt', name: '钝器', color: '#d9a066', bonus: [{ armor: 1 }, { armor: 2 }, { armor: 3 }, { armor: 4 }, { armor: 6 }] },
    blade: { id: 'blade', name: '利刃', color: '#ff7b7b', bonus: [{ lifesteal: 1 }, { lifesteal: 2 }, { lifesteal: 3 }, { lifesteal: 4 }, { lifesteal: 6 }] },
    gun: { id: 'gun', name: '枪械', color: '#ffd166', bonus: [{ range: 10 }, { range: 20 }, { range: 30 }, { range: 40 }, { range: 60 }] },
    precise: { id: 'precise', name: '精准', color: '#7bdcff', bonus: [{ crit: 3 }, { crit: 6 }, { crit: 9 }, { crit: 12 }, { crit: 18 }] },
    elemental: { id: 'elemental', name: '元素', color: '#ff9f43', bonus: [{ elemental: 1 }, { elemental: 2 }, { elemental: 3 }, { elemental: 4 }, { elemental: 6 }] },
    explosive: { id: 'explosive', name: '爆破', color: '#ff6b6b', bonus: [{ explSize: 10 }, { explSize: 20 }, { explSize: 30 }, { explSize: 40 }, { explSize: 60 }] },
    tool: { id: 'tool', name: '工具', color: '#a0e86f', bonus: [{ engineering: 1 }, { engineering: 2 }, { engineering: 3 }, { engineering: 4 }, { engineering: 6 }] },
    support: { id: 'support', name: '支援', color: '#7dffa0', bonus: [{ regen: 1 }, { regen: 2 }, { regen: 3 }, { regen: 4 }, { regen: 6 }] },
    primitive: { id: 'primitive', name: '原始', color: '#c9b18a', bonus: [{ maxHp: 3 }, { maxHp: 6 }, { maxHp: 9 }, { maxHp: 12 }, { maxHp: 18 }] },
    heavy: { id: 'heavy', name: '重型', color: '#b0b0c8', bonus: [{ damage: 5 }, { damage: 10 }, { damage: 15 }, { damage: 20 }, { damage: 30 }] },
};

export const TIER_NAMES = ['I', 'II', 'III', 'IV'];
export const TIER_COLORS = ['#e8e8e8', '#5cc8ff', '#c77dff', '#ff5c5c'];
export const TIER_BG = ['#3b3940', '#1f3a52', '#3d2357', '#561f24'];
