// Level-up stat upgrades (4 tiers).
import { StatKey } from './Stats';

export interface UpgradeDef { stat: StatKey; name: string; values: number[]; glyph: string; color: string }

export const UPGRADES: UpgradeDef[] = [
    { stat: 'maxHp', name: '强化外壳', values: [3, 6, 9, 12], glyph: 'heart', color: '#ff6b81' },
    { stat: 'regen', name: '修复模块', values: [2, 3, 4, 5], glyph: 'cross', color: '#7dffa0' },
    { stat: 'lifesteal', name: '能量虹吸', values: [1, 2, 3, 4], glyph: 'fang', color: '#ff5c5c' },
    { stat: 'damage', name: '火力核心', values: [5, 8, 12, 16], glyph: 'star', color: '#ffd166' },
    { stat: 'melee', name: '液压臂', values: [2, 4, 6, 8], glyph: 'fist', color: '#ff9f80' },
    { stat: 'ranged', name: '弹道计算', values: [1, 2, 3, 4], glyph: 'target', color: '#ffd27a' },
    { stat: 'elemental', name: '元素线圈', values: [1, 2, 3, 4], glyph: 'fire', color: '#ff9f43' },
    { stat: 'atkSpd', name: '加速齿轮', values: [5, 10, 15, 20], glyph: 'gear', color: '#feca57' },
    { stat: 'crit', name: '弱点分析', values: [3, 5, 7, 9], glyph: 'scope', color: '#9ff0ff' },
    { stat: 'engineering', name: '工程图纸', values: [2, 3, 4, 5], glyph: 'turret', color: '#a0e86f' },
    { stat: 'range', name: '远程雷达', values: [15, 30, 45, 60], glyph: 'eye', color: '#c9b18a' },
    { stat: 'armor', name: '装甲板', values: [1, 2, 3, 4], glyph: 'shield', color: '#8fa3bf' },
    { stat: 'dodge', name: '机动引擎', values: [3, 6, 9, 12], glyph: 'wing', color: '#8fbf6a' },
    { stat: 'speed', name: '推进器', values: [3, 6, 9, 12], glyph: 'boot', color: '#7bdcff' },
    { stat: 'luck', name: '幸运芯片', values: [5, 10, 15, 20], glyph: 'clover', color: '#5fd35f' },
    { stat: 'harvest', name: '采集臂', values: [5, 8, 10, 12], glyph: 'leaf', color: '#8fdc5a' },
];
