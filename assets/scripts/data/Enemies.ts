// Enemy definitions and wave composition.

export type AI = 'chase' | 'runner' | 'spitter' | 'charger' | 'splitter' | 'hatcher' | 'looter' | 'tree' | 'bomber' | 'juggernaut' | 'queen' | 'boss' | 'mini';

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
    kbRes?: number;               // 0..1 knockback resistance
    elite?: boolean;
    boss?: boolean;
    neutral?: boolean;            // does not hurt player
    scale?: number;
}

export const ENEMIES: { [id: string]: EnemyDef } = {
    grub: { id: 'grub', name: '幼虫', sprite: 'e_grub', hp: 3, hpW: 2, dmg: 1, dmgW: 0.6, speed: 165, r: 22, mats: 1, ai: 'chase' },
    runner: { id: 'runner', name: '疾行虫', sprite: 'e_runner', hp: 2, hpW: 1.2, dmg: 1, dmgW: 0.55, speed: 270, r: 18, mats: 1, ai: 'runner' },
    spitter: { id: 'spitter', name: '喷吐者', sprite: 'e_spitter', hp: 8, hpW: 2, dmg: 1, dmgW: 0.8, speed: 130, r: 24, mats: 1, ai: 'spitter' },
    charger: { id: 'charger', name: '冲锋兽', sprite: 'e_charger', hp: 10, hpW: 3, dmg: 2, dmgW: 0.8, speed: 120, r: 26, mats: 2, ai: 'charger', kbRes: 0.3 },
    splitter: { id: 'splitter', name: '分裂球', sprite: 'e_splitter', hp: 12, hpW: 3, dmg: 1, dmgW: 0.7, speed: 120, r: 28, mats: 1, ai: 'splitter' },
    mini: { id: 'mini', name: '小分裂球', sprite: 'e_mini', hp: 3, hpW: 1, dmg: 1, dmgW: 0.4, speed: 210, r: 15, mats: 1, ai: 'mini' },
    brute: { id: 'brute', name: '巨甲虫', sprite: 'e_brute', hp: 30, hpW: 9, dmg: 3, dmgW: 1, speed: 105, r: 38, mats: 3, ai: 'chase', kbRes: 0.7 },
    hatcher: { id: 'hatcher', name: '孵化母虫', sprite: 'e_hatcher', hp: 20, hpW: 5, dmg: 1, dmgW: 0.5, speed: 55, r: 32, mats: 3, ai: 'hatcher', kbRes: 0.6 },
    bomber: { id: 'bomber', name: '自爆虫', sprite: 'e_bomber', hp: 6, hpW: 2, dmg: 4, dmgW: 1.2, speed: 200, r: 22, mats: 1, ai: 'bomber' },
    looter: { id: 'looter', name: '宝藏虫', sprite: 'e_looter', hp: 15, hpW: 5, dmg: 0, dmgW: 0, speed: 230, r: 24, mats: 7, ai: 'looter', neutral: true },
    tree: { id: 'tree', name: '晶体树', sprite: 'e_tree', hp: 10, hpW: 5, dmg: 0, dmgW: 0, speed: 0, r: 30, mats: 3, ai: 'tree', neutral: true, kbRes: 1 },
    juggernaut: { id: 'juggernaut', name: '裂甲巨兽', sprite: 'e_jugg', hp: 900, hpW: 60, dmg: 6, dmgW: 1.2, speed: 115, r: 60, mats: 25, ai: 'juggernaut', kbRes: 0.95, elite: true },
    queen: { id: 'queen', name: '毒雾女王', sprite: 'e_queen', hp: 750, hpW: 55, dmg: 5, dmgW: 1.1, speed: 95, r: 55, mats: 25, ai: 'queen', kbRes: 0.95, elite: true },
    boss: { id: 'boss', name: '星核吞噬者', sprite: 'e_boss', hp: 4500, hpW: 0, dmg: 8, dmgW: 0, speed: 110, r: 80, mats: 60, ai: 'boss', kbRes: 1, elite: true, boss: true },
};

export interface SpawnRule { type: string; from: number; interval: number; group: number; groupW: number; until?: number }

// Enemy groups unlocked over the run. group = enemies per spawn burst at wave `from`, grows by groupW each wave.
export const SPAWN_RULES: SpawnRule[] = [
    { type: 'grub', from: 1, interval: 2.4, group: 3, groupW: 0.45 },
    { type: 'runner', from: 3, interval: 4.5, group: 2, groupW: 0.35 },
    { type: 'spitter', from: 4, interval: 6, group: 1, groupW: 0.2 },
    { type: 'charger', from: 6, interval: 6.5, group: 1, groupW: 0.25 },
    { type: 'splitter', from: 7, interval: 7, group: 1, groupW: 0.2 },
    { type: 'brute', from: 8, interval: 9, group: 1, groupW: 0.15 },
    { type: 'hatcher', from: 9, interval: 14, group: 1, groupW: 0.08 },
    { type: 'bomber', from: 11, interval: 6, group: 2, groupW: 0.25 },
];

export const MAX_WAVE = 20;

export function waveDuration(w: number) {
    if (w >= MAX_WAVE) return 90;
    return Math.min(20 + (w - 1) * 5, 60);
}

/** Elite schedule: wave -> list of elite ids */
export function elitesForWave(w: number, danger: number): string[] {
    const out: string[] = [];
    if (w === 10) out.push('juggernaut');
    if (w === 15) out.push('queen');
    if (danger >= 2 && w === 12) out.push('queen');
    if (danger >= 3 && w === 17) out.push('juggernaut');
    if (danger >= 4 && w === 18) out.push('queen', 'juggernaut');
    if (w === MAX_WAVE) {
        out.push('boss');
        if (danger >= 5) out.push('boss');
    }
    return out;
}

export interface DangerDef { name: string; desc: string; hpMul: number; dmgMul: number; spawnMul: number; color: string }
export const DANGERS: DangerDef[] = [
    { name: '危险 0', desc: '标准难度', hpMul: 1, dmgMul: 1, spawnMul: 1, color: '#e8e8e8' },
    { name: '危险 1', desc: '敌人数量增加', hpMul: 1, dmgMul: 1, spawnMul: 1.15, color: '#7bdcff' },
    { name: '危险 2', desc: '新增精英敌人（第12波）', hpMul: 1.05, dmgMul: 1.05, spawnMul: 1.2, color: '#5fd35f' },
    { name: '危险 3', desc: '敌人生命与伤害+12%，更多精英', hpMul: 1.12, dmgMul: 1.12, spawnMul: 1.25, color: '#ffd166' },
    { name: '危险 4', desc: '敌人生命与伤害+25%，精英成群', hpMul: 1.25, dmgMul: 1.25, spawnMul: 1.3, color: '#ff9f43' },
    { name: '危险 5', desc: '最终考验：双重首领', hpMul: 1.4, dmgMul: 1.4, spawnMul: 1.4, color: '#ff5c5c' },
];
