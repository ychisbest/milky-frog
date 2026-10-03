// 游戏数值配置：敌人、武器、被动道具、刷怪节奏

export const PX = 2; // 像素放大倍数（1 个美术像素 = 2 个屏幕像素）
export const HERO_SCALE = 1.3; // 主角（约 64 像素高的导入图）显示倍率，屏幕上约 85 像素高

export interface EnemyDef {
    frames: string[];
    hp: number;
    speed: number;
    dmg: number;
    xp: number;
    radius: number;
    anim: number;
    scale?: number;
    knockRes?: number; // 0~1，击退抗性
    boss?: boolean;
    color: number; // 死亡粒子颜色
    name?: string;  // Boss 名称
    final?: boolean; // 最终 Boss：击败即胜利
    prop?: boolean;  // 可破坏物件（火盆）：不移动、不伤人、不计击杀
    flee?: boolean;  // 逃跑型（金鼠）
    ranged?: boolean; // 远程型：保持距离并发射火球
    burst?: boolean;  // 自爆型：死亡后红圈预警再爆炸，同时伤害玩家与周围怪物
}

export const ENEMIES: Record<string, EnemyDef> = {
    brazier:  { frames: ['brazier_0', 'brazier_1'], hp: 1, speed: 0, dmg: 0, xp: 0, radius: 14, anim: 0.15, color: 0xf0a030, prop: true },
    goldrat:  { frames: ['rat_0', 'rat_1'], hp: 60, speed: 150, dmg: 0, xp: 10, radius: 12, anim: 0.08, scale: 1.4, knockRes: 0.8, color: 0xf5c542, flee: true },
    shroom:   { frames: ['shroom_0', 'shroom_1'], hp: 28, speed: 50, dmg: 4, xp: 4, radius: 12, anim: 0.25, color: 0xd83a30, burst: true },
    imp:      { frames: ['imp_0', 'imp_1'], hp: 22, speed: 72, dmg: 5, xp: 3, radius: 12, anim: 0.15, color: 0xc8302c, ranged: true },
    mummy:    { frames: ['mummy_0', 'mummy_1'], hp: 55, speed: 34, dmg: 7, xp: 5, radius: 14, anim: 0.4, knockRes: 0.7, color: 0xd8ccaa },
    rat:      { frames: ['rat_0', 'rat_1'], hp: 3, speed: 55, dmg: 1, xp: 1, radius: 10, anim: 0.15, color: 0x8a8090 },
    bat:      { frames: ['bat_0', 'bat_1'], hp: 4, speed: 85, dmg: 2, xp: 1, radius: 11, anim: 0.12, color: 0x6a3fa0 },
    slime:    { frames: ['slime_0', 'slime_1'], hp: 10, speed: 45, dmg: 3, xp: 2, radius: 13, anim: 0.3, color: 0x4fc24f },
    zombie:   { frames: ['zombie_0', 'zombie_1'], hp: 24, speed: 42, dmg: 5, xp: 3, radius: 13, anim: 0.35, knockRes: 0.3, color: 0x8ab872 },
    skeleton: { frames: ['skeleton_0', 'skeleton_1'], hp: 30, speed: 60, dmg: 6, xp: 3, radius: 13, anim: 0.25, color: 0xeee8d4 },
    ghost:    { frames: ['ghost_0', 'ghost_1'], hp: 26, speed: 92, dmg: 6, xp: 4, radius: 13, anim: 0.25, knockRes: 0.5, color: 0xdfe8ff },
    // ---- Boss
    slimeking: { frames: ['slimeking_0', 'slimeking_1'], hp: 180, speed: 46, dmg: 5, xp: 120, radius: 36, anim: 0.35, scale: 1.5, knockRes: 1, boss: true, color: 0x4fc24f, name: '史莱姆王' },
    bonelord:  { frames: ['bonelord_0', 'bonelord_1'], hp: 360, speed: 58, dmg: 8, xp: 180, radius: 32, anim: 0.3, scale: 1.5, knockRes: 1, boss: true, color: 0xeee8d4, name: '铁甲将军' },
    vampire:   { frames: ['vampire_0', 'vampire_1'], hp: 650, speed: 70, dmg: 13, xp: 240, radius: 30, anim: 0.3, scale: 1.5, knockRes: 1, boss: true, color: 0xa01828, name: '蝙蝠伯爵' },
    lich:      { frames: ['lich_0', 'lich_1'], hp: 850, speed: 48, dmg: 14, xp: 300, radius: 30, anim: 0.35, scale: 1.5, knockRes: 1, boss: true, color: 0x80e0ff, name: '冰霜巫师' },
    eye:       { frames: ['eye_0', 'eye_1'], hp: 1000, speed: 55, dmg: 15, xp: 360, radius: 34, anim: 0.3, scale: 1.5, knockRes: 1, boss: true, color: 0x8a3a7a, name: '水晶魔眼' },
    toad:      { frames: ['toad_0', 'toad_1'], hp: 760, speed: 52, dmg: 13, xp: 260, radius: 34, anim: 0.4, scale: 1.6, knockRes: 1, boss: true, color: 0x5a7a3a, name: '毒沼巨蟾' },
    yeti:      { frames: ['yeti_0', 'yeti_1'], hp: 540, speed: 70, dmg: 9, xp: 200, radius: 34, anim: 0.35, scale: 1.6, knockRes: 1, boss: true, color: 0xe8f0ff, name: '雪怪王' },
    nian:      { frames: ['nian_0', 'nian_1'], hp: 520, speed: 76, dmg: 9, xp: 200, radius: 34, anim: 0.3, scale: 1.6, knockRes: 1, boss: true, color: 0xd8402a, name: '年兽' },
    reaper:    { frames: ['reaper_0', 'reaper_1'], hp: 1600, speed: 82, dmg: 17, xp: 500, radius: 30, anim: 0.4, scale: 1.7, knockRes: 1, boss: true, color: 0x8a60c0, name: '暗夜魔术师', final: true },
};

// 按时间（秒）出现的怪物组合；interval 为刷怪间隔，batch 为每次刷怪数量
export interface Wave { t: number; types: string[]; interval: number; batch: number; }
export const WAVES: Wave[] = [
    { t: 0,   types: ['rat', 'rat', 'rat', 'bat'], interval: 0.45, batch: 3 },
    { t: 40,  types: ['rat', 'rat', 'bat', 'slime'], interval: 0.5, batch: 4 },
    { t: 90,  types: ['rat', 'bat', 'slime', 'zombie'], interval: 0.55, batch: 4 },
    { t: 150, types: ['bat', 'slime', 'zombie', 'rat'], interval: 0.6, batch: 5 },
    { t: 210, types: ['skeleton', 'zombie', 'bat', 'rat'], interval: 0.6, batch: 5 },
    { t: 300, types: ['skeleton', 'zombie', 'bat', 'rat'], interval: 0.55, batch: 5 },
    { t: 420, types: ['ghost', 'skeleton', 'bat', 'zombie', 'shroom'], interval: 0.5, batch: 6 },
    { t: 540, types: ['ghost', 'skeleton', 'skeleton', 'zombie', 'imp'], interval: 0.45, batch: 6 },
    { t: 660, types: ['ghost', 'skeleton', 'mummy', 'bat', 'imp'], interval: 0.4, batch: 7 },
    { t: 780, types: ['ghost', 'skeleton', 'mummy', 'ghost', 'imp'], interval: 0.35, batch: 8 },
];
// Boss 出场时间表（秒）；Boss 实际血量 = hp × (1 + 0.06 × 玩家等级)
// 图鉴：普通怪物名称与介绍（Boss 名称见 ENEMIES.name）
export const MONSTER_INFO: Record<string, { name: string; desc: string }> = {
    rat: { name: '灰鼠', desc: '最弱小的怪物，一碰就倒，是前期经验的主要来源。' },
    bat: { name: '蝙蝠', desc: '飞得很快，常常成群横穿屏幕。' },
    slime: { name: '史莱姆', desc: '黏糊糊的小家伙，史莱姆王的子民。' },
    zombie: { name: '泥巴怪', desc: '圆滚滚的泥团，走得慢但很结实，不容易被击退。' },
    skeleton: { name: '木偶兵', desc: '木头做的小兵，速度和力气都不小，中期主力。' },
    ghost: { name: '云朵精', desc: '7 分钟后出现，飘得飞快，抗击退。' },
    shroom: { name: '爆炸蘑菇', desc: '7 分钟后出现。被击败后会在红圈里爆炸——别站在旁边，但可以用它炸掉怪群！' },
    imp: { name: '小火灵', desc: '会远程发射小火球，优先清理！' },
    mummy: { name: '稻草人', desc: '后期出现的大块头，生命值极高。' },
    goldrat: { name: '金鼠', desc: '稀有！跑得飞快，击败可获得大量金币。' },
    slimeking: { name: '史莱姆王', desc: '跳跃砸地、召唤史莱姆、体力减半时分裂。2:00 登场。' },
    bonelord: { name: '铁甲将军', desc: '钢刺环、预警冲锋、召唤木偶兵。4:30 登场。' },
    vampire: { name: '蝙蝠伯爵', desc: '魔法弹扇射、瞬移魔法环、蝙蝠风暴。7:00 登场。' },
    lich: { name: '冰霜巫师', desc: '冰霜螺旋弹幕、冰锥阵、减速冰域。9:30 登场。' },
    eye: { name: '水晶魔眼', desc: '魔法光束扫射、追踪光球、双层弹环。12:00 登场。' },
    reaper: { name: '暗夜魔术师', desc: '最终 Boss：回旋飞牌、连续冲刺、幻影召唤。击败即胜利。' },
    toad: { name: '毒沼巨蟾', desc: '毒雾沼泽 7:00 登场：毒液喷吐、长舌突刺、跳跃砸地、召唤史莱姆。' },
    yeti: { name: '雪怪王', desc: '圣诞限定：雪球连射、冰锥阵、冲锋撞击、召唤云朵精。' },
    nian: { name: '年兽', desc: '新春限定：爆竹乱射、连续冲撞、烟花齐放、怒吼召唤。' },
};

export const BOSS_SCHEDULE: { t: number; id: string }[] = [
    { t: 120, id: 'slimeking' },
    { t: 270, id: 'bonelord' },
    { t: 420, id: 'vampire' },
    { t: 570, id: 'lich' },
    { t: 720, id: 'eye' },
    { t: 840, id: 'reaper' },
];
export const SWARM_TIMES = [75, 200, 360, 500, 650]; // 蝙蝠群横穿屏幕
export const WIN_TIME = 900; // 存活 15 分钟胜利

// ---------------------------------------------------------------- 地图（关卡）
// 依次解锁：在上一张地图胜利后解锁下一张；难度与收益同步提高
export interface StageDef {
    id: string;
    name: string;
    desc: string;
    ground: string;
    decor: string[];      // 装饰物（按权重重复）
    hpMul: number;        // 小怪与 Boss 血量倍率
    goldMul: number;      // 金币倍率
    hazard?: { frame: string; color: number; interval: number; count: number; name: string; cloud?: boolean }; // cloud：毒雾，落地后留下持续伤害的毒云
    event?: string;                   // 限时活动地图：所属活动 id（不在解锁链中，活动期间开放）
    bossSwap?: Record<string, string>; // 替换 Boss 时间表中的 Boss
}

export const STAGES: StageDef[] = [
    { id: 'grass', name: '月光草原', desc: '一切开始的地方', ground: 'ground',
      decor: ['flowers', 'flowers', 'flowers', 'bush', 'bush', 'rock', 'rock', 'flowers', 'bush', 'tree', 'tree'], hpMul: 1, goldMul: 1 },
    { id: 'snow', name: '冰雪荒原', desc: '冰锥从天而降 · 怪物生命 +20% · 金币 +30%', ground: 'ground_snow',
      decor: ['pine', 'pine', 'pine', 'icerock', 'icerock', 'snowman', 'snowman'], hpMul: 1.2, goldMul: 1.3,
      hazard: { frame: 'icicle', color: 0x9ad4f8, interval: 9, count: 3, name: '冰锥' } },
    { id: 'lava', name: '熔岩火山', desc: '火山喷发 · 怪物生命 +45% · 金币 +60%', ground: 'ground_lava',
      decor: ['lavarock', 'lavarock', 'lavarock', 'obsidian', 'obsidian', 'lavapool', 'lavarock', 'obsidian'], hpMul: 1.45, goldMul: 1.6,
      hazard: { frame: 'meteor', color: 0xff7a30, interval: 8, count: 3, name: '陨石' } },
    { id: 'swamp', name: '毒雾沼泽', desc: '毒泡喷发留下毒云 · 怪物生命 +70% · 金币 +90%', ground: 'ground_swamp',
      decor: ['deadtree', 'deadtree', 'reeds', 'reeds', 'reeds', 'mushroom', 'mushroom', 'bogpool', 'reeds'], hpMul: 1.7, goldMul: 1.9,
      hazard: { frame: 'bubble', color: 0x80e040, interval: 10, count: 3, name: '毒泡', cloud: true },
      bossSwap: { vampire: 'toad' } },
    { id: 'xmas', name: '雪夜小镇', desc: '圣诞限定 · 雪怪王出没 · 礼物从天而降 · 金币 +50%', ground: 'ground_xmas',
      decor: ['xmastree', 'xmastree', 'gift', 'gift', 'candycane', 'snowman', 'pine'], hpMul: 1.15, goldMul: 1.5,
      hazard: { frame: 'gift', color: 0xff5050, interval: 9, count: 3, name: '礼物炸弹' }, event: 'xmas',
      bossSwap: { bonelord: 'yeti', lich: 'yeti' } },
    { id: 'fest', name: '年夜庙会', desc: '新春限定 · 年兽出没 · 烟花四射 · 金币 +50%', ground: 'ground_fest',
      decor: ['lantern', 'lantern', 'firecracker', 'firecracker', 'redgate', 'plum', 'plum'], hpMul: 1.15, goldMul: 1.5,
      hazard: { frame: 'firework', color: 0xffc040, interval: 9, count: 3, name: '烟花' }, event: 'cny',
      bossSwap: { bonelord: 'nian', lich: 'nian' } },
];

// ---------------------------------------------------------------- 限时活动
// 活动期间开放限定地图与限定 Boss；击败限定 Boss 永久解锁限定角色（活动结束后保留）
export interface EventDef {
    id: string; name: string; start: string; end: string;
    stage: string; boss: string; char: string;
    badge: string;     // 主菜单活动提示
    lockText: string;  // 角色卡锁定文字
    hint: string;      // 点击锁定角色时的提示
}
export const EVENTS: EventDef[] = [
    { id: 'xmas', name: '圣诞活动', start: '2026-12-18', end: '2027-01-03', stage: 'xmas', boss: 'yeti', char: 'santa',
      badge: '圣诞活动进行中 · 雪夜小镇开放 · 击败雪怪王得圣诞蛙', lockText: '击败雪怪王解锁\n圣诞限定', hint: '圣诞活动期间，在雪夜小镇击败雪怪王即可解锁' },
    { id: 'cny', name: '新春活动', start: '2027-01-28', end: '2027-02-21', stage: 'fest', boss: 'nian', char: 'fu',
      badge: '新春活动进行中 · 年夜庙会开放 · 击败年兽得福蛙', lockText: '击败年兽解锁\n新春限定', hint: '新春活动期间，在年夜庙会击败年兽即可解锁' },
];
// 测试用：force = true 强制开启新春活动，或填活动 id（如 'xmas'）强制开启对应活动
export const EVENT: { force: boolean | string } = { force: false };

export function activeEvent(now = new Date()): EventDef | null {
    if (EVENT.force) return EVENTS.find(e => e.id === (EVENT.force === true ? 'cny' : EVENT.force)) || null;
    // 用本地日期（国内为北京时间），避免 UTC 偏差 8 小时
    const p = (n: number) => (n < 10 ? '0' : '') + n;
    const d = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
    return EVENTS.find(e => d >= e.start && d <= e.end) || null;
}
export function eventActive(now = new Date()) { return !!activeEvent(now); }
export const BLOOD_MOON = 780; // 13:00 起「血月」终局冲刺：刷怪 ×1.8、精英 ×3、怪物血量 ×1.3
export const MAX_ENEMIES = 340;

export interface WeaponStats {
    damage: number;
    cooldown: number;
    amount: number;
    area: number;
    speed: number;
    pierce: number;
    duration: number;
}

export interface WeaponDef {
    id: string;
    name: string;
    icon: string;
    desc: string;
    base: WeaponStats;
    levels: { desc: string; mod: Partial<WeaponStats> }[]; // 第 2 级起的增量
}

export const WEAPONS: WeaponDef[] = [
    {
        id: 'whip', name: '皮鞭', icon: 'icon_whip', desc: '向水平方向抽打，穿透所有敌人。',
        base: { damage: 10, cooldown: 1.35, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
            { desc: '向身后再抽一鞭', mod: { amount: 1 } },
            { desc: '伤害 +5', mod: { damage: 5 } },
            { desc: '范围 +10%，伤害 +5', mod: { area: 0.1, damage: 5 } },
            { desc: '伤害 +5', mod: { damage: 5 } },
            { desc: '范围 +10%，伤害 +5', mod: { area: 0.1, damage: 5 } },
            { desc: '伤害 +5', mod: { damage: 5 } },
            { desc: '伤害 +5', mod: { damage: 5 } },
        ],
    },
    {
        id: 'wand', name: '魔杖', icon: 'icon_wand', desc: '向最近的敌人发射魔法弹。',
        base: { damage: 10, cooldown: 1.2, amount: 1, area: 1, speed: 1, pierce: 1, duration: 0 },
        levels: [
            { desc: '弹数 +1', mod: { amount: 1 } },
            { desc: '冷却 -0.2 秒', mod: { cooldown: -0.2 } },
            { desc: '弹数 +1', mod: { amount: 1 } },
            { desc: '伤害 +10', mod: { damage: 10 } },
            { desc: '弹数 +1', mod: { amount: 1 } },
            { desc: '穿透 +1', mod: { pierce: 1 } },
            { desc: '伤害 +10', mod: { damage: 10 } },
        ],
    },
    {
        id: 'knife', name: '飞刀', icon: 'icon_knife', desc: '朝面向的方向快速投掷飞刀。',
        base: { damage: 7, cooldown: 1.0, amount: 1, area: 1, speed: 1, pierce: 1, duration: 0 },
        levels: [
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '数量 +1，伤害 +5', mod: { amount: 1, damage: 5 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '穿透 +1', mod: { pierce: 1 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '数量 +1，伤害 +5', mod: { amount: 1, damage: 5 } },
            { desc: '穿透 +1', mod: { pierce: 1 } },
        ],
    },
    {
        id: 'axe', name: '飞斧', icon: 'icon_axe', desc: '向上抛出，伤害高、可穿透。',
        base: { damage: 20, cooldown: 4, amount: 1, area: 1, speed: 1, pierce: 3, duration: 0 },
        levels: [
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '伤害 +20', mod: { damage: 20 } },
            { desc: '穿透 +2', mod: { pierce: 2 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '伤害 +20', mod: { damage: 20 } },
            { desc: '穿透 +2', mod: { pierce: 2 } },
            { desc: '伤害 +20', mod: { damage: 20 } },
        ],
    },
    {
        id: 'bible', name: '魔法书', icon: 'icon_bible', desc: '环绕角色旋转，持续一段时间。',
        base: { damage: 10, cooldown: 3, amount: 1, area: 1, speed: 1, pierce: 999, duration: 3 },
        levels: [
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '速度 +30%，范围 +25%', mod: { speed: 0.3, area: 0.25 } },
            { desc: '持续 +0.5 秒，伤害 +10', mod: { duration: 0.5, damage: 10 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '速度 +30%，范围 +25%', mod: { speed: 0.3, area: 0.25 } },
            { desc: '持续 +0.5 秒，伤害 +10', mod: { duration: 0.5, damage: 10 } },
            { desc: '数量 +1', mod: { amount: 1 } },
        ],
    },
    {
        id: 'garlic', name: '大蒜', icon: 'icon_garlic', desc: '伤害并击退靠近的敌人。',
        base: { damage: 5, cooldown: 1.0, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
            { desc: '范围 +40%，伤害 +2', mod: { area: 0.4, damage: 2 } },
            { desc: '冷却 -0.1 秒，伤害 +1', mod: { cooldown: -0.1, damage: 1 } },
            { desc: '范围 +20%，伤害 +1', mod: { area: 0.2, damage: 1 } },
            { desc: '冷却 -0.1 秒，伤害 +2', mod: { cooldown: -0.1, damage: 2 } },
            { desc: '范围 +20%，伤害 +1', mod: { area: 0.2, damage: 1 } },
            { desc: '冷却 -0.1 秒，伤害 +1', mod: { cooldown: -0.1, damage: 1 } },
            { desc: '范围 +20%，伤害 +2', mod: { area: 0.2, damage: 2 } },
        ],
    },
    {
        id: 'lightning', name: '雷电指环', icon: 'icon_lightning', desc: '随机劈中屏幕上的敌人。',
        base: { damage: 15, cooldown: 4.5, amount: 2, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '范围 +100%，伤害 +10', mod: { area: 1, damage: 10 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '范围 +100%，伤害 +20', mod: { area: 1, damage: 20 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '范围 +100%，伤害 +20', mod: { area: 1, damage: 20 } },
            { desc: '数量 +1', mod: { amount: 1 } },
        ],
    },
    {
        id: 'fire', name: '火焰法杖', icon: 'icon_fire', desc: '向随机敌人发射火球，爆炸并留下燃烧地面。',
        base: { damage: 9, cooldown: 2.2, amount: 1, area: 1, speed: 1, pierce: 1, duration: 1.5 },
        levels: [
            { desc: '火球 +1', mod: { amount: 1 } },
            { desc: '伤害 +8', mod: { damage: 8 } },
            { desc: '爆炸范围 +20%', mod: { area: 0.2 } },
            { desc: '火球 +1', mod: { amount: 1 } },
            { desc: '伤害 +8', mod: { damage: 8 } },
            { desc: '燃烧时间 +1 秒', mod: { duration: 1 } },
            { desc: '火球 +1', mod: { amount: 1 } },
        ],
    },
    {
        id: 'holy', name: '魔法药水', icon: 'icon_holy', desc: '投掷魔法药水，形成持续伤害的药水池。',
        base: { damage: 6, cooldown: 4.0, amount: 1, area: 1, speed: 1, pierce: 999, duration: 2.5 },
        levels: [
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '范围 +20%，伤害 +3', mod: { area: 0.2, damage: 3 } },
            { desc: '持续 +0.5 秒', mod: { duration: 0.5 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '伤害 +3', mod: { damage: 3 } },
            { desc: '范围 +20%', mod: { area: 0.2 } },
            { desc: '持续 +0.5 秒，伤害 +3', mod: { duration: 0.5, damage: 3 } },
        ],
    },
    {
        id: 'cross', name: '回旋星', icon: 'icon_cross', desc: '飞向最近的敌人后回旋，穿透一切。',
        base: { damage: 7, cooldown: 2.0, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
            { desc: '伤害 +8', mod: { damage: 8 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '范围 +15%', mod: { area: 0.15 } },
            { desc: '速度 +20%，伤害 +8', mod: { speed: 0.2, damage: 8 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '范围 +15%', mod: { area: 0.15 } },
            { desc: '伤害 +10', mod: { damage: 10 } },
        ],
    },
    {
        id: 'frost', name: '冰霜新星', icon: 'icon_frost', desc: '释放冰环，伤害并冻结周围敌人。',
        base: { damage: 6, cooldown: 3.5, amount: 1, area: 1, speed: 1, pierce: 999, duration: 1.2 },
        levels: [
            { desc: '范围 +20%', mod: { area: 0.2 } },
            { desc: '伤害 +6', mod: { damage: 6 } },
            { desc: '冻结 +0.3 秒', mod: { duration: 0.3 } },
            { desc: '冷却 -0.4 秒', mod: { cooldown: -0.4 } },
            { desc: '范围 +20%', mod: { area: 0.2 } },
            { desc: '伤害 +6', mod: { damage: 6 } },
            { desc: '冻结 +0.3 秒', mod: { duration: 0.3 } },
        ],
    },
    {
        id: 'familiar', name: '精灵使魔', icon: 'icon_familiar', desc: '召唤跟随你的小精灵，自动射击敌人。',
        base: { damage: 8, cooldown: 0.8, amount: 1, area: 1, speed: 1, pierce: 1, duration: 0 },
        levels: [
            { desc: '精灵 +1', mod: { amount: 1 } },
            { desc: '伤害 +3', mod: { damage: 3 } },
            { desc: '冷却 -0.15 秒', mod: { cooldown: -0.15 } },
            { desc: '精灵 +1', mod: { amount: 1 } },
            { desc: '伤害 +3', mod: { damage: 3 } },
            { desc: '穿透 +1', mod: { pierce: 1 } },
            { desc: '精灵 +1', mod: { amount: 1 } },
        ],
    },
    {
        id: 'chain', name: '雷鸣链', icon: 'icon_chain', desc: '闪电在敌人之间连续跳跃。',
        base: { damage: 12, cooldown: 2.0, amount: 4, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
            { desc: '跳跃 +2', mod: { amount: 2 } },
            { desc: '伤害 +6', mod: { damage: 6 } },
            { desc: '冷却 -0.3 秒', mod: { cooldown: -0.3 } },
            { desc: '跳跃 +2', mod: { amount: 2 } },
            { desc: '伤害 +8', mod: { damage: 8 } },
            { desc: '跳跃距离 +25%', mod: { area: 0.25 } },
            { desc: '跳跃 +3', mod: { amount: 3 } },
        ],
    },
    {
        id: 'bomb', name: '炸弹', icon: 'icon_bomb', desc: '在脚下放置炸弹，延时后大范围爆炸。',
        base: { damage: 12, cooldown: 3.0, amount: 1, area: 1, speed: 1, pierce: 999, duration: 1.2 },
        levels: [
            { desc: '伤害 +15', mod: { damage: 15 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '范围 +20%', mod: { area: 0.2 } },
            { desc: '伤害 +15', mod: { damage: 15 } },
            { desc: '冷却 -0.4 秒', mod: { cooldown: -0.4 } },
            { desc: '范围 +20%', mod: { area: 0.2 } },
            { desc: '数量 +1', mod: { amount: 1 } },
        ],
    },
    {
        id: 'laser', name: '棱镜激光', icon: 'icon_laser', desc: '向最近的敌人射出一道贯穿一切的光束。',
        base: { damage: 13, cooldown: 2.4, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
            { desc: '伤害 +8', mod: { damage: 8 } },
            { desc: '光束加宽 25%', mod: { area: 0.25 } },
            { desc: '冷却 -0.3 秒', mod: { cooldown: -0.3 } },
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '伤害 +10', mod: { damage: 10 } },
            { desc: '光束加宽 25%', mod: { area: 0.25 } },
            { desc: '伤害 +12', mod: { damage: 12 } },
        ],
    },
    {
        id: 'spikes', name: '荆棘地刺', icon: 'icon_spikes', desc: '在附近敌人脚下依次刺出尖刺。',
        base: { damage: 9, cooldown: 2.2, amount: 3, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
            { desc: '数量 +1', mod: { amount: 1 } },
            { desc: '伤害 +6', mod: { damage: 6 } },
            { desc: '范围 +20%', mod: { area: 0.2 } },
            { desc: '数量 +2', mod: { amount: 2 } },
            { desc: '冷却 -0.3 秒', mod: { cooldown: -0.3 } },
            { desc: '伤害 +8', mod: { damage: 8 } },
            { desc: '数量 +2', mod: { amount: 2 } },
        ],
    },
];

export interface PlayerStats {
    maxHp: number;
    might: number;
    armor: number;
    recovery: number;
    cooldown: number;
    area: number;
    speed: number;     // 弹速
    moveSpeed: number;
    magnet: number;
    amount: number;
    duration: number;
    growth: number;
    greed: number;     // 金币倍率
    revival: number;   // 复活次数
    reroll: number;    // 每局重抽次数
    crit: number;      // 暴击率
    critDmg: number;   // 暴击倍率
    lifesteal: number; // 每次击杀回复生命
    thorns: number;    // 受击时反伤
}

export const BASE_STATS: PlayerStats = {
    maxHp: 100, might: 1, armor: 0, recovery: 0, cooldown: 1, area: 1,
    speed: 1, moveSpeed: 1, magnet: 70, amount: 0, duration: 1, growth: 1,
    greed: 1, revival: 0, reroll: 0,
    crit: 0.1, critDmg: 2, lifesteal: 0, thorns: 0,
};

export interface PassiveDef {
    id: string;
    name: string;
    icon: string;
    desc: string;
    max: number;
    stat: keyof PlayerStats;
    per: number; // 每级增量（cooldown 为负数）
    mul?: boolean; // 是否按基础值的百分比累加
}

export const PASSIVES: PassiveDef[] = [
    { id: 'might', name: '菠菜', icon: 'icon_might', desc: '伤害 +10%', max: 5, stat: 'might', per: 0.1 },
    { id: 'armor', name: '盔甲', icon: 'icon_armor', desc: '受到伤害 -1', max: 5, stat: 'armor', per: 1 },
    { id: 'heart', name: '空心之心', icon: 'icon_heart', desc: '最大生命 +20%', max: 5, stat: 'maxHp', per: 0.2, mul: true },
    { id: 'regen', name: '番茄', icon: 'icon_regen', desc: '每秒恢复 0.2 生命', max: 5, stat: 'recovery', per: 0.2 },
    { id: 'tome', name: '空白之书', icon: 'icon_cooldown', desc: '武器冷却 -8%', max: 5, stat: 'cooldown', per: -0.08 },
    { id: 'candle', name: '烛台', icon: 'icon_area', desc: '攻击范围 +10%', max: 5, stat: 'area', per: 0.1 },
    { id: 'bracer', name: '护腕', icon: 'icon_speed', desc: '弹道速度 +10%', max: 5, stat: 'speed', per: 0.1 },
    { id: 'wings', name: '翅膀', icon: 'icon_move', desc: '移动速度 +10%', max: 5, stat: 'moveSpeed', per: 0.1 },
    { id: 'orb', name: '吸引宝珠', icon: 'icon_magnet', desc: '拾取范围 +30%', max: 5, stat: 'magnet', per: 0.3, mul: true },
    { id: 'dup', name: '复制器', icon: 'icon_amount', desc: '武器数量 +1', max: 2, stat: 'amount', per: 1 },
    { id: 'spell', name: '咒语绑定', icon: 'icon_duration', desc: '持续时间 +10%', max: 5, stat: 'duration', per: 0.1 },
    { id: 'crown', name: '皇冠', icon: 'icon_growth', desc: '经验获取 +8%', max: 5, stat: 'growth', per: 0.08 },
    { id: 'luck', name: '幸运草', icon: 'icon_luck', desc: '暴击率 +4%', max: 5, stat: 'crit', per: 0.04 },
    { id: 'critdmg', name: '爆裂之心', icon: 'icon_critdmg', desc: '暴击伤害 +25%', max: 5, stat: 'critDmg', per: 0.25 },
    { id: 'fang', name: '活力獠牙', icon: 'icon_fang', desc: '每次击败敌人回复 0.2 生命', max: 5, stat: 'lifesteal', per: 0.2 },
    { id: 'thorns', name: '荆棘甲', icon: 'icon_thorns', desc: '受击时对周围敌人造成 30 伤害', max: 5, stat: 'thorns', per: 30 },
];

export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
export const WEAPON_MAX_LEVEL = 8;

// 升级经验曲线（四段式）：
//   1~9 级   每级 +5   → 开局 8~12 秒一级，快速成型
//   10~29 级 每级 +14  → 中期 15~20 秒一级，选择更有分量
//   30~49 级 每级 +26  → 后期 20~30 秒一级
//   50 级起  每级 +45  → 胜利局约 60~65 级：构筑接近完成但不完美，留下下一局的目标
export function xpForLevel(lv: number) {
    if (lv < 10) return 5 + (lv - 1) * 5;
    if (lv < 30) return 60 + (lv - 10) * 14;
    if (lv < 50) return 340 + (lv - 30) * 26;
    return 860 + (lv - 50) * 45;
}


// ---------------------------------------------------------------- 武器进化
// 武器满级 + 持有对应被动道具 → 击败 Boss 后开启宝箱时进化
export interface EvoDef {
    passive: string;
    name: string;
    icon: string;
    desc: string;
    mod: Partial<WeaponStats>;
}

export const EVOLUTIONS: Record<string, EvoDef> = {
    whip:      { passive: 'heart', name: '炽心之鞭', icon: 'icon_whip_evo', desc: '伤害与范围大幅提升，命中时有几率回复生命。', mod: { damage: 20, area: 0.3, cooldown: -0.25 } },
    wand:      { passive: 'tome', name: '星辰法杖', icon: 'icon_wand_evo', desc: '几乎没有冷却，持续倾泻魔法弹。', mod: { cooldown: -0.85, damage: 5, pierce: 1 } },
    knife:     { passive: 'bracer', name: '千刃', icon: 'icon_knife_evo', desc: '飞刀如暴雨般连续射出。', mod: { cooldown: -0.85, damage: 5, pierce: 2 } },
    axe:       { passive: 'candle', name: '旋风飞斧', icon: 'icon_axe_evo', desc: '向四周放射出无限穿透的旋转飞斧。', mod: { damage: 30, amount: 4, pierce: 999, cooldown: -1.5 } },
    bible:     { passive: 'spell', name: '不朽魔典', icon: 'icon_bible_evo', desc: '魔法书永久环绕，不再消失。', mod: { damage: 15, area: 0.3, duration: 9999 } },
    garlic:    { passive: 'regen', name: '大蒜领域', icon: 'icon_garlic_evo', desc: '范围更大，伤害敌人时恢复生命。', mod: { damage: 6, area: 0.6 } },
    fire:      { passive: 'might', name: '烈焰风暴', icon: 'icon_fire_evo', desc: '巨型火球，燃烧地面范围翻倍。', mod: { damage: 20, area: 0.5, amount: 2 } },
    holy:      { passive: 'orb', name: '魔法泉', icon: 'icon_holy_evo', desc: '药水池更大更久，站在池中持续回复生命。', mod: { damage: 8, area: 0.4, duration: 2 } },
    cross:     { passive: 'luck', name: '审判之星', icon: 'icon_cross_evo', desc: '回旋星必定暴击。', mod: { damage: 15, amount: 2 } },
    frost:     { passive: 'armor', name: '永冻领域', icon: 'icon_frost_evo', desc: '冻结更久，被冻结的敌人受到伤害 +50%。', mod: { area: 0.6, duration: 1, damage: 8 } },
    familiar:  { passive: 'crown', name: '精灵王', icon: 'icon_familiar_evo', desc: '更多精灵，射速与穿透大幅提升。', mod: { amount: 2, damage: 8, pierce: 3, cooldown: -0.3 } },
    chain:     { passive: 'wings', name: '天罚雷链', icon: 'icon_chain_evo', desc: '跳跃次数大增，每次跳跃引发小型爆炸。', mod: { amount: 8, damage: 15 } },
    bomb:      { passive: 'thorns', name: '连环爆破', icon: 'icon_bomb_evo', desc: '爆炸后分裂出 4 颗子炸弹。', mod: { damage: 20, area: 0.3 } },
    laser:     { passive: 'critdmg', name: '虹光棱镜', icon: 'icon_laser_evo', desc: '同时射出三道彩虹光束，宽度与伤害大增。', mod: { amount: 2, damage: 15, area: 0.5 } },
    spikes:    { passive: 'fang', name: '生命荆棘', icon: 'icon_spikes_evo', desc: '地刺数量大增，命中时有几率回复生命。', mod: { amount: 4, damage: 10, area: 0.2 } },
    lightning: { passive: 'dup', name: '雷霆之环', icon: 'icon_lightning_evo', desc: '每次落下更多更强的闪电。', mod: { amount: 4, damage: 25, area: 1 } },
};

// ---------------------------------------------------------------- 角色
export interface CharDef {
    id: string;
    name: string;
    title: string;
    sprite: string;   // 帧名前缀，如 hero_hunter → hero_hunter_0..2
    weapon: string;
    desc: string;
    bonus: Partial<PlayerStats>;
    cost: number;     // 0 = 初始解锁
}

export const CHARACTERS: CharDef[] = [
    { id: 'hunter', name: '奶蛙', title: '鞭手', sprite: 'hero_hunter', weapon: 'whip', desc: '最大生命 +20', bonus: { maxHp: 20 }, cost: 0 },
    { id: 'mage', name: '法师蛙', title: '法师', sprite: 'hero_mage', weapon: 'wand', desc: '经验获取 +10%', bonus: { growth: 0.1 }, cost: 0 },
    { id: 'rogue', name: '游侠蛙', title: '游侠', sprite: 'hero_rogue', weapon: 'knife', desc: '移动速度 +15%', bonus: { moveSpeed: 0.15 }, cost: 500 },
    { id: 'knight', name: '骑士蛙', title: '骑士', sprite: 'hero_knight', weapon: 'axe', desc: '护甲 +1，伤害 +10%', bonus: { armor: 1, might: 0.1 }, cost: 1000 },
    { id: 'nun', name: '盾卫蛙', title: '盾卫士', sprite: 'hero_nun', weapon: 'bible', desc: '每秒恢复 +0.4 生命', bonus: { recovery: 0.4 }, cost: 1500 },
    { id: 'pyro', name: '炎术蛙', title: '炎术士', sprite: 'hero_pyro', weapon: 'fire', desc: '伤害 +15%', bonus: { might: 0.15 }, cost: 3000 },
    { id: 'bomber', name: '爆破蛙', title: '爆破工', sprite: 'hero_bomber', weapon: 'bomb', desc: '最大生命 +30，范围 +15%', bonus: { maxHp: 30, area: 0.15 }, cost: 4000 },
    { id: 'sage', name: '长老蛙', title: '老贤者', sprite: 'hero_sage', weapon: 'lightning', desc: '冷却 -10%，范围 +10%', bonus: { cooldown: -0.1, area: 0.1 }, cost: 2500 },
    { id: 'druid', name: '德鲁伊蛙', title: '森林守护者', sprite: 'hero_druid', weapon: 'spikes', desc: '每秒恢复 +0.4，范围 +10%', bonus: { recovery: 0.4, area: 0.1 }, cost: 3000 },
    { id: 'prism', name: '棱镜蛙', title: '光学怪才', sprite: 'hero_prism', weapon: 'laser', desc: '暴击率 +8%，伤害 +10%', bonus: { crit: 0.08, might: 0.1 }, cost: 3500 },
    { id: 'fu', name: '福蛙', title: '新春限定', sprite: 'hero_fu', weapon: 'bomb', desc: '金币 +30%，最大生命 +20', bonus: { greed: 0.3, maxHp: 20 }, cost: -1 },
    { id: 'santa', name: '圣诞蛙', title: '圣诞限定', sprite: 'hero_santa', weapon: 'frost', desc: '金币 +20%，冷却 -8%', bonus: { greed: 0.2, cooldown: -0.08 }, cost: -1 },
];

// ---------------------------------------------------------------- 商店永久强化
export interface PowerUpDef {
    id: string;
    name: string;
    icon: string;
    desc: string;
    max: number;
    stat: keyof PlayerStats;
    per: number;
    mul?: boolean;
    cost: number;
}

export const POWERUPS: PowerUpDef[] = [
    { id: 'might', name: '力量', icon: 'icon_might', desc: '伤害 +5%', max: 5, stat: 'might', per: 0.05, cost: 200 },
    { id: 'armor', name: '护甲', icon: 'icon_armor', desc: '受到伤害 -1', max: 3, stat: 'armor', per: 1, cost: 600 },
    { id: 'maxhp', name: '体魄', icon: 'icon_heart', desc: '最大生命 +10%', max: 3, stat: 'maxHp', per: 0.1, mul: true, cost: 200 },
    { id: 'regen', name: '恢复', icon: 'icon_regen', desc: '每秒恢复 +0.1', max: 5, stat: 'recovery', per: 0.1, cost: 200 },
    { id: 'cool', name: '冷却', icon: 'icon_cooldown', desc: '武器冷却 -2.5%', max: 2, stat: 'cooldown', per: -0.025, cost: 900 },
    { id: 'area', name: '范围', icon: 'icon_area', desc: '攻击范围 +5%', max: 2, stat: 'area', per: 0.05, cost: 300 },
    { id: 'speed', name: '弹速', icon: 'icon_speed', desc: '弹道速度 +10%', max: 2, stat: 'speed', per: 0.1, cost: 300 },
    { id: 'move', name: '移速', icon: 'icon_move', desc: '移动速度 +5%', max: 2, stat: 'moveSpeed', per: 0.05, cost: 300 },
    { id: 'magnet', name: '磁力', icon: 'icon_magnet', desc: '拾取范围 +25%', max: 2, stat: 'magnet', per: 0.25, mul: true, cost: 300 },
    { id: 'growth', name: '成长', icon: 'icon_growth', desc: '经验获取 +3%', max: 5, stat: 'growth', per: 0.03, cost: 900 },
    { id: 'luck', name: '幸运', icon: 'icon_luck', desc: '暴击率 +2%', max: 3, stat: 'crit', per: 0.02, cost: 600 },
    { id: 'greed', name: '贪婪', icon: 'icon_gold', desc: '金币获取 +10%', max: 5, stat: 'greed', per: 0.1, cost: 200 },
    { id: 'reroll', name: '重抽', icon: 'icon_reroll', desc: '每局可重抽升级选项 +1 次', max: 3, stat: 'reroll', per: 1, cost: 800 },
    { id: 'revival', name: '复活', icon: 'icon_revive', desc: '倒下后原地复活 +1 次', max: 1, stat: 'revival', per: 1, cost: 3000 },
];

export function powerUpCost(def: PowerUpDef, rank: number, totalBought: number) {
    // 每买一级，所有强化涨价 7%，最多涨到 ×2.4，避免后期单项要刷十几局
    return Math.round(def.cost * (rank + 1) * (1 + 0.07 * Math.min(totalBought, 20)));
}

// ---------------------------------------------------------------- 命运卡牌（改变规则的祝福）
// 开局选择 1 张，之后每击败一个 Boss 再选 1 张
export interface BlessingDef { id: string; name: string; icon: string; desc: string; }

export const BLESSINGS: BlessingDef[] = [
    { id: 'berserk', name: '狂战士之心', icon: 'icon_might', desc: '生命每损失 10%，伤害 +8%' },
    { id: 'chainboom', name: '连锁爆炸', icon: 'icon_bomb', desc: '敌人被击败时 15% 几率爆炸，波及周围' },
    { id: 'vampkiss', name: '治愈之吻', icon: 'icon_fang', desc: '每次暴击回复 1 点生命' },
    { id: 'timerift', name: '时间裂隙', icon: 'icon_duration', desc: '每 25 秒冻结全场敌人 3 秒' },
    { id: 'gemstorm', name: '宝石风暴', icon: 'icon_lightning', desc: '拾取宝石时 6% 几率召唤落雷' },
    { id: 'glass', name: '玻璃大炮', icon: 'icon_critdmg', desc: '伤害 +60%，最大生命 -40%' },
    { id: 'greedpact', name: '贪婪契约', icon: 'icon_gold', desc: '金币 ×2，但敌人数量 +30%' },
    { id: 'ghost', name: '疾风步伐', icon: 'icon_move', desc: '受伤后 1.5 秒无敌并加速 50%' },
    { id: 'twin', name: '双生之力', icon: 'icon_amount', desc: '所有武器数量 +1，冷却 +15%' },
    { id: 'magstorm', name: '磁暴', icon: 'icon_magnet', desc: '拾取范围 ×2，每 45 秒吸取全部宝石' },
    { id: 'frenzy', name: '连击狂热', icon: 'icon_cooldown', desc: '连击达到 50 时，冷却 -30%' },
    { id: 'holylight', name: '星光庇护', icon: 'icon_heart', desc: '每次升级回复 15% 生命' },
    { id: 'giant', name: '巨人化', icon: 'icon_area', desc: '攻击范围 +40%，移动速度 -15%' },
    { id: 'thornaura', name: '荆棘光环', icon: 'icon_thorns', desc: '受到伤害时，对周围敌人造成大量伤害' },
    { id: 'overload', name: '超载', icon: 'icon_chain', desc: '每 30 秒进入 8 秒超载：冷却 -50%' },
    { id: 'nova', name: '星爆', icon: 'icon_critdmg', desc: '每次升级释放全屏星爆，重创所有敌人' },
];

// ---------------------------------------------------------------- 成就（奖励金币）
export interface AchDef { id: string; name: string; desc: string; gold: number; }

export const ACHIEVEMENTS: AchDef[] = [
    { id: 'win1', name: '初次胜利', desc: '赢得一局游戏', gold: 500 },
    { id: 'kill1k', name: '割草能手', desc: '单局击败 1000 个敌人', gold: 200 },
    { id: 'kill5k', name: '割草大师', desc: '单局击败 5000 个敌人', gold: 600 },
    { id: 'combo500', name: '无双', desc: '达成 500 连击', gold: 300 },
    { id: 'lv50', name: '登峰造极', desc: '单局达到 50 级', gold: 300 },
    { id: 'evo1', name: '进化', desc: '进化一把武器', gold: 300 },
    { id: 'evo3', name: '进化大师', desc: '单局进化 3 把武器', gold: 800 },
    { id: 'boss_slimeking', name: '史莱姆克星', desc: '击败史莱姆王', gold: 150 },
    { id: 'boss_bonelord', name: '破甲者', desc: '击败铁甲将军', gold: 200 },
    { id: 'boss_vampire', name: '破晓', desc: '击败蝙蝠伯爵', gold: 250 },
    { id: 'boss_lich', name: '融冰', desc: '击败冰霜巫师', gold: 300 },
    { id: 'boss_eye', name: '闭目', desc: '击败水晶魔眼', gold: 350 },
    { id: 'boss_reaper', name: '谢幕', desc: '击败暗夜魔术师', gold: 800 },
    { id: 'goldrat', name: '捕鼠达人', desc: '抓住一只金鼠', gold: 150 },
    { id: 'endless20', name: '永夜行者', desc: '无尽模式存活 20 分钟', gold: 1000 },
    { id: 'allchars', name: '全员集结', desc: '解锁全部角色', gold: 1000 },
    { id: 'nightmare1', name: '噩梦征服者', desc: '在噩梦难度下取得胜利', gold: 1500 },
    { id: 'codex_half', name: '收藏家', desc: '图鉴收集达到 50%', gold: 300 },
    { id: 'codex_full', name: '博物学家', desc: '图鉴全部收集', gold: 1500 },
    { id: 'stage_snow', name: '踏雪而归', desc: '在冰雪荒原取得胜利', gold: 800 },
    { id: 'stage_lava', name: '浴火重生', desc: '在熔岩火山取得胜利', gold: 1500 },
    { id: 'stage_swamp', name: '沼泽之王', desc: '在毒雾沼泽取得胜利', gold: 2000 },
    { id: 'daily1', name: '每日一割', desc: '完成一次每日挑战', gold: 300 },
    { id: 'boss_toad', name: '除蟾者', desc: '击败毒雾沼泽的毒沼巨蟾', gold: 400 },
    { id: 'boss_yeti', name: '雪夜英雄', desc: '击败圣诞限定 Boss 雪怪王', gold: 600 },
    { id: 'boss_nian', name: '驱逐年兽', desc: '击败新春限定 Boss 年兽', gold: 600 },
];

// 无尽模式：15 分钟后 Boss 循环出现，每轮更强
export const ENDLESS_BOSS_INTERVAL = 150;

// ---------------------------------------------------------------- 每日挑战
// 按日期生成：所有玩家同一天的挑战相同（试玩角色 + 地图 + 特殊规则 + 强制命运卡牌），存活 10 分钟获得奖励
export interface DailyMod { id: string; name: string; desc: string; }

export const DAILY_MODS: DailyMod[] = [
    { id: 'fast', name: '怪潮狂奔', desc: '怪物移动速度 +25%' },
    { id: 'xp2', name: '经验翻倍', desc: '经验 ×2，但怪物生命 +50%' },
    { id: 'elites', name: '精英横行', desc: '每 12 秒出现一只精英怪' },
    { id: 'gold3', name: '金币狂欢', desc: '金币 ×3，但不会掉落烤鸡' },
    { id: 'horde', name: '无尽怪潮', desc: '怪物数量 +40%' },
    { id: 'glass', name: '易碎奶蛙', desc: '受到伤害 ×1.5，造成伤害 +40%' },
];
export const DAILY_GOAL = 600;    // 存活 10 分钟
export const DAILY_REWARD = 400;  // 每日首次成功奖励

export interface DailySetup { date: string; char: string; stage: string; mod: DailyMod; blessing: string; }

// 按日期字符串生成的确定性随机数（全服同一天结果相同）
function seeded(key: string) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

export function dailySetup(date: string): DailySetup {
    const next = seeded(date);
    const pick = <T>(a: T[]) => a[Math.floor(next() * a.length)];
    return {
        date,
        char: pick(CHARACTERS.filter(c => c.cost >= 0)).id,
        stage: pick(STAGES.filter(st => !st.event)).id,
        mod: pick(DAILY_MODS),
        blessing: pick(BLESSINGS.filter(b => b.id !== 'twin')).id,
    };
}

// ---------------------------------------------------------------- 图鉴
export type CodexTab = 'weapon' | 'passive' | 'monster';
export interface CodexEntry { key: string; tab: CodexTab; icon: string; name: string; desc: string; hint: string }

export function codexEntries(): CodexEntry[] {
    const list: CodexEntry[] = [];
    for (const w of WEAPONS) {
        list.push({ key: 'w:' + w.id, tab: 'weapon', icon: w.icon, name: w.name, desc: w.desc, hint: '在升级时获得这把武器' });
        const e = EVOLUTIONS[w.id];
        if (e) {
            const p = PASSIVES.find(x => x.id === e.passive);
            list.push({ key: 'e:' + w.id, tab: 'weapon', icon: e.icon, name: e.name, desc: `${w.name} + ${p ? p.name : ''} 进化\n${e.desc}`, hint: `${w.name}满级 + 持有${p ? p.name : ''}，开宝箱进化` });
        }
    }
    for (const p of PASSIVES) list.push({ key: 'p:' + p.id, tab: 'passive', icon: p.icon, name: p.name, desc: p.desc, hint: '在升级时获得这件道具' });
    for (const id in MONSTER_INFO) {
        const m = MONSTER_INFO[id];
        const def = ENEMIES[id];
        list.push({ key: 'm:' + id, tab: 'monster', icon: def.frames[0], name: m.name, desc: m.desc, hint: def.boss ? '击败它即可收录' : '击败一只即可收录' });
    }
    return list;
}
export const ENEMY_IDS = new Map<EnemyDef, string>(Object.keys(ENEMIES).map(k => [ENEMIES[k], k]));

// ---------------------------------------------------------------- 每日任务
// 每天从任务池抽 3 个不同类型的任务，进度跨局累计（"单局"类取单局最好成绩），结算时自动发放金币
export type QuestStat = 'kills' | 'time' | 'boss' | 'evolve' | 'gold' | 'chest' | 'runs' | 'level' | 'combo';
export interface QuestDef { id: string; stat: QuestStat; n: number; name: string; gold: number; best?: boolean }
export const QUEST_POOL: QuestDef[] = [
    { id: 'kills1', stat: 'kills', n: 1500, name: '累计击败 1500 只怪物', gold: 120 },
    { id: 'kills2', stat: 'kills', n: 4000, name: '累计击败 4000 只怪物', gold: 200 },
    { id: 'time1', stat: 'time', n: 300, name: '单局存活 5 分钟', gold: 100, best: true },
    { id: 'time2', stat: 'time', n: 540, name: '单局存活 9 分钟', gold: 180, best: true },
    { id: 'boss', stat: 'boss', n: 3, name: '累计击败 3 个 Boss', gold: 150 },
    { id: 'evolve', stat: 'evolve', n: 1, name: '进化 1 把武器', gold: 180 },
    { id: 'gold', stat: 'gold', n: 300, name: '累计拾取 300 金币', gold: 100 },
    { id: 'chest', stat: 'chest', n: 3, name: '累计开启 3 个宝箱', gold: 120 },
    { id: 'runs', stat: 'runs', n: 2, name: '完成 2 局游戏', gold: 100 },
    { id: 'level', stat: 'level', n: 30, name: '单局达到 30 级', gold: 150, best: true },
    { id: 'combo', stat: 'combo', n: 300, name: '单局连击达到 300', gold: 150, best: true },
];
export const QUEST_BONUS = 200; // 三个任务全部完成的额外奖励

export function dailyQuests(date: string): QuestDef[] {
    const next = seeded('quest:' + date);
    const out: QuestDef[] = [];
    const pool = QUEST_POOL.slice();
    while (out.length < 3 && pool.length) {
        const q = pool.splice(Math.floor(next() * pool.length), 1)[0];
        if (!out.some(o => o.stat === q.stat)) out.push(q);
    }
    return out;
}

// ---------------------------------------------------------------- 七日签到
// 累计签到（断签不清零），7 天一轮循环；第 7 天大奖
export const SIGNIN_REWARDS = [100, 120, 150, 180, 220, 260, 600];
