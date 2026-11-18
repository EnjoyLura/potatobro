// Playable characters: original "Core-bot" chassis with different modules.
import { StatMods } from './Stats';

export interface CharDef {
    id: string;
    name: string;
    title: string;
    color: string;         // body color
    accent: string;        // accessory color
    accessory: string;     // drawing variant
    mods: StatMods;
    weapons: string[];     // starting weapon choices
    traits: string[];      // extra description lines
    special?: { [k: string]: number };
    meleeOnly?: boolean;
    rangedOnly?: boolean;
    startItems?: string[];
    harvestGrowth?: number;
}

export const CHARACTERS: CharDef[] = [
    {
        id: 'unit', name: '标准型', title: '均衡的量产机体', color: '#f4f1e8', accent: '#4fc3f7', accessory: 'antenna',
        mods: {}, weapons: ['fist', 'pistol', 'blade', 'slingshot', 'wand', 'smg'],
        traits: ['没有任何加成或惩罚', '适合新手熟悉玩法'],
    },
    {
        id: 'brawler', name: '格斗型', title: '为近身肉搏而生', color: '#ffb48a', accent: '#d63031', accessory: 'band',
        mods: { melee: 3, maxHp: 5, armor: 1, ranged: -3 }, weapons: ['fist', 'blade', 'spear', 'hammer'],
        traits: ['近战武器攻击速度 +20%'], special: { meleeAtkSpd: 20 },
    },
    {
        id: 'ranger', name: '射手型', title: '保持距离，精准打击', color: '#c8f7c5', accent: '#27ae60', accessory: 'visor',
        mods: { ranged: 3, range: 50, maxHp: -3 }, weapons: ['pistol', 'smg', 'sniper', 'slingshot', 'shotgun'],
        traits: ['只能装备远程武器'], rangedOnly: true,
    },
    {
        id: 'mage', name: '元素型', title: '驾驭火焰与雷电', color: '#d6c8ff', accent: '#8e44ad', accessory: 'hat',
        mods: { elemental: 4, melee: -2, ranged: -2, burnDmg: 50 }, weapons: ['wand', 'flamesword', 'flamethrower'],
        traits: ['元素武器攻击速度 +15%'], special: { elemAtkSpd: 15 },
    },
    {
        id: 'engineer', name: '工程型', title: '让炮台替你战斗', color: '#ffe08a', accent: '#e67e22', accessory: 'helmet',
        mods: { engineering: 5, damage: -10 }, weapons: ['wrench', 'pistol', 'grenade'],
        traits: ['开局携带一座自动炮台', '工程学每波额外 +1'], startItems: ['turret'], special: { engPerWave: 1 },
    },
    {
        id: 'lucky', name: '幸运型', title: '好运总会眷顾你', color: '#b8f2e6', accent: '#16a085', accessory: 'clover',
        mods: { luck: 60, damage: -5 }, weapons: ['fist', 'pistol', 'slingshot', 'wand'],
        traits: ['击杀敌人时 10% 几率额外掉落晶体'], special: { goldKill: 10 },
    },
    {
        id: 'tank', name: '重装型', title: '移动的钢铁堡垒', color: '#b0bec5', accent: '#455a64', accessory: 'plates',
        mods: { maxHp: 15, armor: 4, speed: -15, atkSpd: -10 }, weapons: ['hammer', 'fist', 'shotgun', 'minigun'],
        traits: ['移动缓慢但非常耐打'],
    },
    {
        id: 'farmer', name: '农场型', title: '播种今天，收获明天', color: '#f7d794', accent: '#6ab04c', accessory: 'straw',
        mods: { harvest: 20, maxHp: 3, damage: -5 }, weapons: ['slingshot', 'fist', 'wrench', 'pistol'],
        traits: ['收获每波增长 12%（默认5%）', '开局携带微型菜园'], harvestGrowth: 0.12, startItems: ['garden'],
    },
    {
        id: 'speedy', name: '疾风型', title: '快到敌人追不上', color: '#a0e9ff', accent: '#0984e3', accessory: 'fins',
        mods: { speed: 30, dodge: 10, maxHp: -4, armor: -2 }, weapons: ['blade', 'smg', 'spear', 'pistol'],
        traits: ['速度越快，伤害越高（每1%速度 +0.3%伤害）'], special: { speedDmg: 30 },
    },
    {
        id: 'gambler', name: '赌徒型', title: '富贵险中求', color: '#ffd1dc', accent: '#e84393', accessory: 'crown',
        mods: { crit: 15, critDmg: 50, dodge: -5 }, weapons: ['sniper', 'spear', 'pistol', 'blade'],
        traits: ['商店刷新费用减半', '每波首次刷新免费'], special: { freeReroll: 1, cheapReroll: 1 },
    },
];

export const CHAR_MAP: { [id: string]: CharDef } = {};
for (const c of CHARACTERS) CHAR_MAP[c.id] = c;
