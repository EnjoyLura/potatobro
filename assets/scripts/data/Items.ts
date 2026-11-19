// Passive items: stat modifiers plus special effects.
import { StatMods } from './Stats';

export interface ItemDef {
    id: string;
    name: string;
    tier: number;            // 1..4
    price: number;
    mods: StatMods;
    special?: { [k: string]: number };
    desc?: string;           // special effect description
    glyph: string;
    color: string;
    max?: number;
}

export const ITEMS: ItemDef[] = [
    // ---------- Tier 1 ----------
    { id: 'battery', name: '备用电池', tier: 1, price: 18, mods: { atkSpd: 8 }, glyph: 'battery', color: '#ffd166' },
    { id: 'kneepad', name: '合金护膝', tier: 1, price: 18, mods: { armor: 2, speed: -3 }, glyph: 'plate', color: '#b8c4d6' },
    { id: 'snack', name: '能量零食', tier: 1, price: 15, mods: { maxHp: 5 }, glyph: 'heart', color: '#ff6b81' },
    { id: 'bandage', name: '纳米绷带', tier: 1, price: 15, mods: { regen: 2 }, glyph: 'cross', color: '#7dffa0' },
    { id: 'whetstone', name: '磨刀石', tier: 1, price: 15, mods: { melee: 2 }, glyph: 'sword', color: '#ff9f80' },
    { id: 'scope_s', name: '简易瞄具', tier: 1, price: 16, mods: { ranged: 1, range: 15 }, glyph: 'target', color: '#ffd27a' },
    { id: 'sparkplug', name: '火花塞', tier: 1, price: 15, mods: { elemental: 2 }, glyph: 'fire', color: '#ff9f43' },
    { id: 'clover', name: '四叶草', tier: 1, price: 15, mods: { luck: 10 }, glyph: 'clover', color: '#5fd35f' },
    { id: 'boots', name: '轻便跑鞋', tier: 1, price: 16, mods: { speed: 5 }, glyph: 'boot', color: '#7bdcff' },
    { id: 'compass', name: '罗盘', tier: 1, price: 16, mods: { range: 25 }, glyph: 'eye', color: '#c9b18a' },
    { id: 'magnet', name: '磁铁', tier: 1, price: 14, mods: { pickup: 40 }, glyph: 'magnet', color: '#ff5c5c' },
    { id: 'seedbag', name: '种子袋', tier: 1, price: 20, mods: { harvest: 5 }, glyph: 'leaf', color: '#8fdc5a' },
    { id: 'toolbox', name: '工具箱', tier: 1, price: 18, mods: { engineering: 2 }, glyph: 'gear', color: '#a0e86f' },
    { id: 'coffee', name: '浓咖啡', tier: 1, price: 16, mods: { atkSpd: 10, maxHp: -2 }, glyph: 'flask', color: '#c08552' },
    { id: 'gloves', name: '拳击绷带', tier: 1, price: 16, mods: { melee: 3, ranged: -1 }, glyph: 'fist', color: '#ff7b7b' },
    { id: 'lens', name: '聚光镜片', tier: 1, price: 18, mods: { crit: 4 }, glyph: 'scope', color: '#9ff0ff' },
    { id: 'cape', name: '迷彩披风', tier: 1, price: 20, mods: { dodge: 4 }, glyph: 'wing', color: '#8fbf6a' },
    { id: 'piggybank', name: '存钱罐', tier: 1, price: 25, mods: {}, special: { interest: 8 }, desc: '每波结束获得当前晶体8%的利息（最多25）', glyph: 'coin', color: '#ffb3c6' },

    // ---------- Tier 2 ----------
    { id: 'helmet', name: '战术头盔', tier: 2, price: 38, mods: { armor: 3, speed: -2 }, glyph: 'shield', color: '#8fa3bf' },
    { id: 'adrenaline', name: '肾上腺素', tier: 2, price: 40, mods: { atkSpd: 12, speed: 5 }, glyph: 'drop', color: '#ff4d6d' },
    { id: 'bloodfang', name: '血牙', tier: 2, price: 42, mods: { lifesteal: 4 }, glyph: 'fang', color: '#ff5c5c' },
    { id: 'turret', name: '自动炮台', tier: 2, price: 45, mods: {}, special: { turret: 1 }, desc: '每波开始时建造一座炮台，伤害随工程学提高', glyph: 'turret', color: '#a0e86f' },
    { id: 'mine', name: '感应地雷', tier: 2, price: 40, mods: { engineering: 1 }, special: { mine: 1 }, desc: '每隔一段时间在场上布置地雷', glyph: 'mine', color: '#ff9f43' },
    { id: 'garden', name: '微型菜园', tier: 2, price: 40, mods: { harvest: 3 }, special: { garden: 1 }, desc: '每10秒在附近长出一个能量果', glyph: 'apple', color: '#7dffa0' },
    { id: 'thornarmor', name: '荆棘甲', tier: 2, price: 38, mods: { armor: 2 }, special: { thorns: 8 }, desc: '受到攻击时对攻击者造成8点伤害', glyph: 'claw', color: '#c9a06a' },
    { id: 'grease', name: '润滑油', tier: 2, price: 36, mods: { speed: 8, atkSpd: 5, armor: -1 }, glyph: 'oilcan', color: '#3a3a4a' },
    { id: 'volatile', name: '不稳定核心', tier: 2, price: 48, mods: {}, special: { explodeOnKill: 15 }, desc: '敌人死亡时有15%几率爆炸', glyph: 'bomb', color: '#ff6b6b' },
    { id: 'coupon', name: '优惠券', tier: 2, price: 35, mods: { shopDiscount: 8 }, glyph: 'ticket', color: '#ffd166' },
    { id: 'dice', name: '幸运骰子', tier: 2, price: 40, mods: { luck: 20, crit: 2 }, glyph: 'dice', color: '#ffffff' },
    { id: 'bouncer', name: '弹力胶', tier: 2, price: 45, mods: { bounce: 1, damage: -5 }, glyph: 'ring', color: '#ff9ff3' },
    { id: 'spike', name: '穿甲弹头', tier: 2, price: 45, mods: { pierce: 1, ranged: 1 }, glyph: 'bolt', color: '#c8d6e5' },
    { id: 'xpchip', name: '学习芯片', tier: 2, price: 35, mods: { xpGain: 15 }, glyph: 'chip', color: '#48dbfb' },
    { id: 'shield', name: '能量护盾', tier: 2, price: 40, mods: {}, special: { shield: 1 }, desc: '每波抵挡第一次受到的伤害', glyph: 'bubble', color: '#48dbfb' },
    { id: 'rage', name: '狂怒徽章', tier: 2, price: 38, mods: {}, special: { lowHpDmg: 20 }, desc: '生命低于50%时伤害+20%', glyph: 'skull', color: '#ff4d4d' },
    { id: 'gyro', name: '陀螺仪', tier: 2, price: 45, mods: { dodge: 6, crit: 3 }, glyph: 'gyro', color: '#c77dff' },
    { id: 'fertilizer', name: '肥料', tier: 2, price: 35, mods: { fruitHeal: 2, harvest: 5 }, glyph: 'sprout', color: '#b5835a' },
    { id: 'grenadebelt', name: '弹药带', tier: 2, price: 40, mods: { explSize: 15, damage: 4 }, glyph: 'belt', color: '#d9a066' },

    // ---------- Tier 3 ----------
    { id: 'drone', name: '环绕无人机', tier: 3, price: 70, mods: {}, special: { orbit: 1 }, desc: '一台无人机环绕你旋转并撞击敌人', glyph: 'star', color: '#48dbfb' },
    { id: 'executioner', name: '处刑芯片', tier: 3, price: 80, mods: { crit: 5 }, special: { execute: 5 }, desc: '命中时5%几率直接消灭非精英敌人', glyph: 'axe', color: '#c77dff' },
    { id: 'goldtooth', name: '金牙', tier: 3, price: 70, mods: { luck: 20, harvest: 6 }, special: { goldKill: 15 }, desc: '击杀敌人时15%几率额外掉落晶体', glyph: 'tooth', color: '#ffd166' },
    { id: 'exoskeleton', name: '外骨骼', tier: 3, price: 75, mods: { maxHp: 12, armor: 3, speed: -5 }, glyph: 'exo', color: '#576574' },
    { id: 'overclock', name: '超频模块', tier: 3, price: 70, mods: { atkSpd: 25, maxHp: -5 }, glyph: 'speedo', color: '#ff6b6b' },
    { id: 'frost', name: '冰霜光环', tier: 3, price: 70, mods: {}, special: { slowAura: 25 }, desc: '附近的敌人减速25%', glyph: 'snow', color: '#9ff0ff' },
    { id: 'pyro', name: '纵火手册', tier: 3, price: 70, mods: { burnDmg: 50, elemental: 3 }, glyph: 'book', color: '#ff9f43' },
    { id: 'multishot', name: '分裂弹匣', tier: 3, price: 90, mods: { projectiles: 1, damage: -10 }, glyph: 'tri', color: '#ffd166' },
    { id: 'critlens', name: '致命准星', tier: 3, price: 75, mods: { critDmg: 50, crit: 5 }, glyph: 'crosshair', color: '#ff5c5c' },
    { id: 'vampire', name: '吸血獠牙', tier: 3, price: 75, mods: { lifesteal: 6, maxHp: 3 }, glyph: 'bat', color: '#c0392b' },
    { id: 'chainmail', name: '纳米链甲', tier: 3, price: 72, mods: { armor: 5, dodge: -3 }, glyph: 'mail', color: '#c8d6e5' },

    // ---------- Tier 4 ----------
    { id: 'heart', name: '不朽之心', tier: 4, price: 140, mods: { maxHp: 10 }, special: { revive: 1 }, desc: '死亡时以50%生命复活一次', glyph: 'heartplus', color: '#ff2e63', max: 1 },
    { id: 'blackhole', name: '引力奇点', tier: 4, price: 110, mods: { pickup: 100 }, special: { autoCollect: 1 }, desc: '自动吸取场上所有晶体', glyph: 'vortex', color: '#5f27cd', max: 1 },
    { id: 'titan', name: '泰坦核心', tier: 4, price: 140, mods: { damage: 25, maxHp: 15, speed: -10 }, glyph: 'crystal', color: '#ff9f43' },
    { id: 'swarm', name: '无人机群', tier: 4, price: 150, mods: { engineering: 5 }, special: { orbit: 3 }, desc: '三台无人机环绕你旋转并撞击敌人', glyph: 'trio', color: '#feca57' },
    { id: 'timewarp', name: '时之沙漏', tier: 4, price: 150, mods: { atkSpd: 30, speed: 15, enemySpeed: -10 }, glyph: 'hourglass', color: '#feca57' },
    { id: 'warlord', name: '战神旗帜', tier: 4, price: 150, mods: { melee: 8, ranged: 6, elemental: 6, armor: 3 }, glyph: 'flag', color: '#ffd166' },
    { id: 'crown', name: '贪婪王冠', tier: 4, price: 120, mods: { harvest: 20, luck: 25 }, special: { goldKill: 10 }, desc: '击杀敌人时10%几率额外掉落晶体', glyph: 'crown', color: '#feca57' },
];

export const ITEM_MAP: { [id: string]: ItemDef } = {};
for (const it of ITEMS) ITEM_MAP[it.id] = it;
