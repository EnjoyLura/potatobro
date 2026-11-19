// Stages: each has its own arena look and size, enemy roster, elites, boss and modifiers.
import { SpawnRule, MAX_WAVE } from './Enemies';
import { StatMods } from './Stats';

/** Colors used to paint the arena floor (core/Art.ts drawArena). */
export interface ArenaTheme {
    outside: string;               // beyond the cliff rim
    floor: [string, string];       // radial gradient center -> edge
    patch: [string, string];       // big soft blotches (dark, light)
    speck: [string, string];       // tiny specks (dark, light)
    pebble: [string, string];      // pebble fills
    tuft: string;                  // grass tufts / crystals / embers
    rim: string;                   // jagged cliff rim
    deco: 'grass' | 'ice' | 'ember' | 'grid' | 'sand' | 'metal' | 'stars';
}

export interface StageDef {
    id: string;
    name: string;
    en: string;
    desc: string;
    icon: string;                  // sprite shown on the stage slot
    aw: number; ah: number;        // arena size in world units
    theme: ArenaTheme;
    rules: SpawnRule[];            // regular enemies over the waves
    jugg: string; queen: string; boss: string;
    enemyHp: number; enemyDmg: number; enemySpeed: number;
    startMats: number;
    playerMods?: StatMods;
    lava?: number;                 // number of lava pools that hurt the player
    mud?: number;                  // number of mud pools that slow the player
    eliteEarly?: number;           // elites arrive this many waves earlier
    mods: string[];                // modifier lines shown on the stage screen
}

export const STAGES: StageDef[] = [
    {
        id: 'hive', name: '荒原虫巢', en: 'WASTELAND HIVE', desc: '虫群最早出没的荒原，一切从这里开始。',
        icon: 'e_grub', aw: 1800, ah: 1150,
        theme: {
            outside: '#17121a', floor: ['#8a7560', '#6e5b4a'], patch: ['rgba(60,45,35,0.08)', 'rgba(255,240,210,0.05)'],
            speck: ['rgba(45,35,30,0.35)', 'rgba(255,240,220,0.15)'], pebble: ['#9b8a78', '#5f5247'], tuft: 'rgba(48,40,52,0.8)', rim: '#2a1d24', deco: 'grass',
        },
        rules: [
            { type: 'grub', from: 1, interval: 2.4, group: 3, groupW: 0.45 },
            { type: 'runner', from: 3, interval: 4.5, group: 2, groupW: 0.35 },
            { type: 'spitter', from: 4, interval: 6, group: 1, groupW: 0.2 },
            { type: 'charger', from: 6, interval: 6.5, group: 1, groupW: 0.25 },
            { type: 'splitter', from: 7, interval: 7, group: 1, groupW: 0.2 },
            { type: 'brute', from: 8, interval: 9, group: 1, groupW: 0.15 },
            { type: 'hatcher', from: 9, interval: 14, group: 1, groupW: 0.08 },
            { type: 'bomber', from: 11, interval: 6, group: 2, groupW: 0.25 },
        ],
        jugg: 'juggernaut', queen: 'queen', boss: 'boss',
        enemyHp: 1, enemyDmg: 1, enemySpeed: 1, startMats: 0,
        mods: ['标准战场，没有特殊效果'],
    },
    {
        id: 'frost', name: '冰封裂谷', en: 'FROZEN RIFT', desc: '终年冰封的裂谷，场地狭窄，虫群披上了冰甲。',
        icon: 'e_frostgrub', aw: 1600, ah: 1060,
        theme: {
            outside: '#0c1420', floor: ['#cfe4ef', '#9dbcd1'], patch: ['rgba(80,120,160,0.10)', 'rgba(255,255,255,0.14)'],
            speck: ['rgba(60,95,130,0.30)', 'rgba(255,255,255,0.45)'], pebble: ['#eef7fc', '#7d9fb8'], tuft: 'rgba(110,185,230,0.9)', rim: '#1b2838', deco: 'ice',
        },
        rules: [
            { type: 'frostgrub', from: 1, interval: 2.5, group: 3, groupW: 0.42 },
            { type: 'icerunner', from: 3, interval: 4.5, group: 2, groupW: 0.35 },
            { type: 'frostspit', from: 4, interval: 6, group: 1, groupW: 0.2 },
            { type: 'yeti', from: 6, interval: 6.5, group: 1, groupW: 0.25 },
            { type: 'icesplit', from: 7, interval: 7, group: 1, groupW: 0.2 },
            { type: 'glacier', from: 8, interval: 9, group: 1, groupW: 0.15 },
            { type: 'icebomb', from: 5, interval: 7, group: 1, groupW: 0.2 },
            { type: 'hatcher', from: 10, interval: 14, group: 1, groupW: 0.08 },
            { type: 'bomber', from: 11, interval: 6, group: 2, groupW: 0.25 },
        ],
        jugg: 'frostjugg', queen: 'frostqueen', boss: 'frostboss',
        enemyHp: 1.12, enemyDmg: 1, enemySpeed: 0.92, startMats: 10,
        mods: ['场地狭窄', '冰爆虫死后留下减速冰霜', '寒冷：敌人速度 -8%，生命 +12%', '初始晶体 +10'],
    },
    {
        id: 'marsh', name: '毒沼雨林', en: 'TOXIC MARSH', desc: '湿热的雨林沼泽，泥潭会拖慢你的脚步。',
        icon: 'e_hopper', aw: 1850, ah: 1150,
        theme: {
            outside: '#0b140d', floor: ['#56723e', '#34492a'], patch: ['rgba(0,0,0,0.14)', 'rgba(180,255,120,0.06)'],
            speck: ['rgba(20,30,10,0.40)', 'rgba(200,255,150,0.15)'], pebble: ['#6b7f4a', '#2f3d22'], tuft: 'rgba(30,60,25,0.85)', rim: '#101a0e', deco: 'grass',
        },
        rules: [
            { type: 'marshgrub', from: 1, interval: 2.4, group: 3, groupW: 0.45 },
            { type: 'mosquito', from: 2, interval: 4.2, group: 3, groupW: 0.4 },
            { type: 'hopper', from: 4, interval: 6, group: 1, groupW: 0.22 },
            { type: 'gasbag', from: 5, interval: 6.5, group: 1, groupW: 0.22 },
            { type: 'healer', from: 7, interval: 10, group: 1, groupW: 0.1 },
            { type: 'spitter', from: 8, interval: 6.5, group: 1, groupW: 0.2 },
            { type: 'brute', from: 9, interval: 9, group: 1, groupW: 0.15 },
            { type: 'hatcher', from: 11, interval: 14, group: 1, groupW: 0.08 },
        ],
        jugg: 'frogking', queen: 'blightmother', boss: 'marshlord',
        enemyHp: 1.15, enemyDmg: 1.05, enemySpeed: 1, startMats: 15, mud: 9,
        mods: ['泥潭：踩进去会减速', '孢子医者会治疗其他敌人', '敌人生命 +15%，伤害 +5%', '初始晶体 +15'],
    },
    {
        id: 'forge', name: '熔火工坊', en: 'MOLTEN FORGE', desc: '废弃的熔炼工坊，地面上的熔岩池会灼伤你。',
        icon: 'e_lavagrub', aw: 1900, ah: 1200,
        theme: {
            outside: '#110909', floor: ['#4d3d38', '#2e2422'], patch: ['rgba(0,0,0,0.16)', 'rgba(255,130,50,0.05)'],
            speck: ['rgba(0,0,0,0.40)', 'rgba(255,170,90,0.20)'], pebble: ['#62504a', '#2a1f1d'], tuft: 'rgba(255,140,60,0.75)', rim: '#190d0d', deco: 'ember',
        },
        rules: [
            { type: 'lavagrub', from: 1, interval: 2.3, group: 3, groupW: 0.48 },
            { type: 'runner', from: 3, interval: 4.5, group: 2, groupW: 0.35 },
            { type: 'firespit', from: 4, interval: 5.5, group: 1, groupW: 0.22 },
            { type: 'embercharger', from: 5, interval: 6.5, group: 1, groupW: 0.25 },
            { type: 'magmabomb', from: 7, interval: 5.5, group: 2, groupW: 0.25 },
            { type: 'cinderbrute', from: 8, interval: 9, group: 1, groupW: 0.15 },
            { type: 'lavaworm', from: 6, interval: 7, group: 1, groupW: 0.2 },
            { type: 'splitter', from: 9, interval: 7, group: 1, groupW: 0.2 },
            { type: 'hatcher', from: 11, interval: 14, group: 1, groupW: 0.08 },
        ],
        jugg: 'forgejugg', queen: 'flamequeen', boss: 'forgeboss',
        enemyHp: 1.22, enemyDmg: 1.1, enemySpeed: 1, startMats: 20, lava: 8,
        mods: ['熔岩池：站在上面会持续受伤', '熔岩蠕虫会留下灼烧痕迹', '敌人生命 +22%，伤害 +10%', '初始晶体 +20'],
    },
    {
        id: 'dune', name: '沙海遗迹', en: 'DUNE RUINS', desc: '埋在沙海中的古代遗迹，场地开阔，敌人会从地下钻出。',
        icon: 'e_scorpion', aw: 2100, ah: 1300,
        theme: {
            outside: '#1a120a', floor: ['#e3c58e', '#c9a46a'], patch: ['rgba(150,100,40,0.10)', 'rgba(255,245,210,0.12)'],
            speck: ['rgba(120,80,30,0.35)', 'rgba(255,250,230,0.30)'], pebble: ['#bfa070', '#8a6a40'], tuft: 'rgba(140,100,50,0.55)', rim: '#2e1f10', deco: 'sand',
        },
        rules: [
            { type: 'sandgrub', from: 1, interval: 2.3, group: 3, groupW: 0.5 },
            { type: 'dustwhirl', from: 2, interval: 4.2, group: 2, groupW: 0.4 },
            { type: 'burrower', from: 4, interval: 6, group: 1, groupW: 0.22 },
            { type: 'cactus', from: 5, interval: 9, group: 1, groupW: 0.12 },
            { type: 'scorpion', from: 6, interval: 6.5, group: 1, groupW: 0.25 },
            { type: 'splitter', from: 8, interval: 7, group: 1, groupW: 0.2 },
            { type: 'brute', from: 9, interval: 9, group: 1, groupW: 0.15 },
            { type: 'bomber', from: 11, interval: 6, group: 2, groupW: 0.25 },
        ],
        jugg: 'sandworm', queen: 'scorpqueen', boss: 'dunetyrant',
        enemyHp: 1.3, enemyDmg: 1.12, enemySpeed: 1.03, startMats: 25, playerMods: { range: 20 },
        mods: ['场地开阔：范围 +20', '掘地虫会钻入地下躲避攻击', '敌人生命 +30%，伤害 +12%', '初始晶体 +25'],
    },
    {
        id: 'scrap', name: '机械废墟', en: 'SCRAP RUINS', desc: '失控的机器占领了这座工厂，炮塔还在运转。',
        icon: 'e_sentry', aw: 1900, ah: 1200,
        theme: {
            outside: '#0d0f12', floor: ['#5f666d', '#3d4349'], patch: ['rgba(0,0,0,0.15)', 'rgba(255,200,120,0.05)'],
            speck: ['rgba(0,0,0,0.35)', 'rgba(220,230,240,0.15)'], pebble: ['#7a828a', '#3a3f45'], tuft: 'rgba(255,190,60,0.7)', rim: '#15181c', deco: 'metal',
        },
        rules: [
            { type: 'spark', from: 1, interval: 2.6, group: 3, groupW: 0.45 },
            { type: 'grub', from: 1, interval: 3.2, group: 2, groupW: 0.35 },
            { type: 'drone', from: 3, interval: 5.5, group: 2, groupW: 0.25 },
            { type: 'sentry', from: 4, interval: 9, group: 1, groupW: 0.12 },
            { type: 'shieldbot', from: 6, interval: 8, group: 1, groupW: 0.17 },
            { type: 'charger', from: 7, interval: 6.5, group: 1, groupW: 0.25 },
            { type: 'splitter', from: 9, interval: 7, group: 1, groupW: 0.2 },
            { type: 'spitter', from: 10, interval: 6, group: 1, groupW: 0.2 },
        ],
        jugg: 'mech', queen: 'factory', boss: 'overlord',
        enemyHp: 1.38, enemyDmg: 1.15, enemySpeed: 1, startMats: 30, playerMods: { armor: 2 },
        mods: ['哨戒炮塔原地开火，先拆掉它们', '敌人生命 +38%，伤害 +15%', '初始晶体 +30，护甲 +2'],
    },
    {
        id: 'void', name: '虚空星港', en: 'VOID HARBOR', desc: '漂浮在虚空中的星港，最强大的虫群在此集结。',
        icon: 'e_voidgrub', aw: 2000, ah: 1250,
        theme: {
            outside: '#06050d', floor: ['#2e2852', '#1a1634'], patch: ['rgba(0,0,0,0.18)', 'rgba(130,100,255,0.08)'],
            speck: ['rgba(0,0,0,0.35)', 'rgba(160,220,255,0.22)'], pebble: ['#4b4482', '#221e44'], tuft: 'rgba(110,240,255,0.75)', rim: '#0c0a1b', deco: 'grid',
        },
        rules: [
            { type: 'voidgrub', from: 1, interval: 2.3, group: 3, groupW: 0.5 },
            { type: 'voidrunner', from: 2, interval: 4, group: 2, groupW: 0.4 },
            { type: 'spitter', from: 4, interval: 6, group: 1, groupW: 0.22 },
            { type: 'voidsplit', from: 5, interval: 6.5, group: 1, groupW: 0.22 },
            { type: 'charger', from: 6, interval: 6.5, group: 1, groupW: 0.25 },
            { type: 'shadebrute', from: 7, interval: 8.5, group: 1, groupW: 0.17 },
            { type: 'voidhatch', from: 9, interval: 13, group: 1, groupW: 0.1 },
            { type: 'blinker', from: 6, interval: 6.5, group: 1, groupW: 0.2 },
            { type: 'bomber', from: 10, interval: 6, group: 2, groupW: 0.25 },
        ],
        jugg: 'voidjugg', queen: 'voidqueen', boss: 'voidboss',
        enemyHp: 1.45, enemyDmg: 1.18, enemySpeed: 1.05, startMats: 35, playerMods: { maxHp: 5 }, eliteEarly: 2,
        mods: ['敌人生命 +45%，伤害 +18%，速度 +5%', '精英提前两波出现', '初始晶体 +35，最大生命 +5'],
    },
    {
        id: 'abyss', name: '星渊回廊', en: 'STAR ABYSS', desc: '虫群的源头，漂浮在星海深处的回廊。',
        icon: 'e_orbiter', aw: 2000, ah: 1250,
        theme: {
            outside: '#030308', floor: ['#161c3e', '#0a0d22'], patch: ['rgba(0,0,0,0.20)', 'rgba(255,120,220,0.06)'],
            speck: ['rgba(0,0,0,0.30)', 'rgba(255,255,255,0.50)'], pebble: ['#2a3266', '#151a3a'], tuft: 'rgba(255,240,180,0.9)', rim: '#05050d', deco: 'stars',
        },
        rules: [
            { type: 'starling', from: 1, interval: 2.2, group: 4, groupW: 0.55 },
            { type: 'voidgrub', from: 1, interval: 3, group: 2, groupW: 0.4 },
            { type: 'orbiter', from: 3, interval: 6, group: 1, groupW: 0.25 },
            { type: 'blinker', from: 4, interval: 6.5, group: 1, groupW: 0.22 },
            { type: 'nebulaspore', from: 6, interval: 10, group: 1, groupW: 0.1 },
            { type: 'shadebrute', from: 7, interval: 8.5, group: 1, groupW: 0.17 },
            { type: 'voidsplit', from: 8, interval: 7, group: 1, groupW: 0.2 },
            { type: 'bomber', from: 10, interval: 6, group: 2, groupW: 0.25 },
        ],
        jugg: 'starbeast', queen: 'nebulaqueen', boss: 'starcore',
        enemyHp: 1.6, enemyDmg: 1.25, enemySpeed: 1.06, startMats: 45, playerMods: { maxHp: 8, luck: 20 }, eliteEarly: 2,
        mods: ['终极战场：敌人生命 +60%，伤害 +25%', '精英提前两波出现', '初始晶体 +45，最大生命 +8，幸运 +20'],
    },
];

export const STAGE_MAP: { [id: string]: StageDef } = {};
for (const s of STAGES) STAGE_MAP[s.id] = s;

/** Elites that arrive at the start of a wave. */
export function elitesForWave(st: StageDef, w: number, danger: number): string[] {
    const out: string[] = [];
    const early = st.eliteEarly || 0;
    if (w === 10 - early) out.push(st.jugg);
    if (w === 15 - early) out.push(st.queen);
    if (danger >= 2 && w === 12) out.push(st.queen);
    if (danger >= 3 && w === 17) out.push(st.jugg);
    if (danger >= 4 && w === 18) out.push(st.queen, st.jugg);
    if (w === MAX_WAVE) {
        out.push(st.boss);
        if (danger >= 5) out.push(st.boss);
    }
    return out;
}

/** Endless mode (after wave 20): a boss every 5 waves, elites otherwise. */
export function endlessElites(st: StageDef, wave: number): string[] {
    return wave % 5 === 0 ? [st.boss] : [st.jugg, st.queen].slice(0, 1 + (wave % 2));
}

/** All enemy ids a stage can field (codex / stage screen). */
export function stageEnemies(st: StageDef): string[] {
    const ids: string[] = [];
    const add = (id: string) => { if (ids.indexOf(id) < 0) ids.push(id); };
    for (const r of st.rules) add(r.type);
    add(st.jugg); add(st.queen); add(st.boss);
    return ids;
}

/** Lava pool positions for a stage (fixed per stage so the floor art and the damage check agree). */
export function lavaPools(st: StageDef): { x: number; y: number; r: number }[] {
    const out: { x: number; y: number; r: number }[] = [];
    const count = st.lava || st.mud || 0;
    if (!count) return out;
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const hw = st.aw / 2, hh = st.ah / 2;
    for (let tries = 0; out.length < count && tries < 400; tries++) {
        const r = 60 + rnd() * 55;
        const x = (rnd() * 2 - 1) * (hw - r - 60), y = (rnd() * 2 - 1) * (hh - r - 60);
        if (Math.hypot(x, y) < 330) continue;                                   // keep the start area clear
        if (out.some(p => Math.hypot(p.x - x, p.y - y) < p.r + r + 90)) continue; // spread out
        out.push({ x, y, r });
    }
    return out;
}

/** Endless mode is the entry after the six difficulties on the stage screen. */
export const ENDLESS = 6;
