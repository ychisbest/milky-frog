import { Color, Label, Node, Sprite, UITransform } from 'cc';
import { Art } from './Art';
import {
    BASE_STATS, HERO_SCALE, STAGES, StageDef, DAILY_GOAL, DailyMod, BLESSINGS, BlessingDef, BLOOD_MOON, BOSS_SCHEDULE, CharDef, ENDLESS_BOSS_INTERVAL, ENEMIES, ENEMY_IDS, EnemyDef, EVOLUTIONS, EvoDef, MAX_ENEMIES, MAX_PASSIVES, MAX_WEAPONS,
    BRAZIER_DROPS, BUFF_DROPS, EPICS, EpicDef, EPIC_TIME, PASSIVES, PassiveDef, PlayerStats, POWERUPS, PX, SWARM_TIMES, WAVES, WEAPON_MAX_LEVEL, WEAPONS, WeaponDef,
    WeaponStats, WIN_TIME, xpForLevel,
} from './Defs';
import { BossAI, createBossAI } from './Bosses';
import { rng } from './PixelArt';
import { Save } from './Save';
import { Sound, vibrate } from './Sound';
import { mkLabel, mkNode, mkRect, mkSprite } from './UiKit';

export class Enemy {
    node!: Node;
    body!: Node;
    sp!: Sprite;
    shadow!: Node;
    def!: EnemyDef;
    hp = 0;
    maxHp = 0;
    x = 0;
    y = 0;
    kx = 0;
    ky = 0;
    sx = 0; // 蝙蝠群：固定方向移动
    sy = 0;
    flash = 0;
    punch = 0; // 受击挤压动画
    anim = 0;
    frame = 0;
    alive = false;
    hits = new Map<string, number>();
    ai: BossAI | null = null;
    frozen = 0;     // 冻结剩余时间
    shootT = 0;     // 远程怪射击计时
    elite = false;  // 精英怪
    life = 0;       // 存在时间（金鼠逃跑计时）
    mode = 0;       // 冲锋野猪：0 追击 / 1 蓄力 / 2 冲撞
    modeT = 0;      // 当前状态剩余时间（追击状态下为冷却）
    cvx = 0;        // 冲撞速度
    cvy = 0;
    uid = 0;        // 每次出生递增，延时回调用来确认还是同一只怪（对象池复用）
}

class Proj {
    node!: Node;
    sp!: Sprite;
    kind = '';
    w: WeaponInst | null = null;
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    dmg = 0;
    pierce = 0;
    life = 0;
    radius = 8;
    rot = 0;
    rotSpeed = 0;
    angle = 0;
    orbitR = 0;
    angSpeed = 0;
    gravity = 0;
    ax = 0;         // 加速度（十字架回旋）
    ay = 0;
    mini = false;   // 子炸弹
    tgt: Enemy | null = null; // 追踪弹的目标（奥术星雨）
    turn = 0;                  // 追踪转向速度（弧度/秒），0 = 直线
    returned = false;
    alive = false;
    hit = new Set<Enemy>();
}

class Fx {
    node!: Node;
    sp!: Sprite;
    life = 0;
    maxLife = 0;
    grow = 0;
    sx = 1;
    sy = 1;
    vy = 0;
    stretch = 0;  // >0：前 stretch 比例的生命内横向从 15% 伸展到 100%（鞭子甩出）
    alive = false;
}

class Pickup {
    node!: Node;
    sp!: Sprite;
    kind = '';
    value = 0;
    x = 0;
    y = 0;
    pulled = false;
    vel = 0;
    vx = 0;
    vy = 0;
    alive = false;
}

class DmgText {
    node!: Node;
    label!: Label;
    life = 0;
    age = 0;
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    big = 1;
    alive = false;
}

class Particle {
    node!: Node;
    sp!: Sprite;
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    life = 0;
    max = 0;
    size = 1;
    alive = false;
}

// 我方地面效果：燃烧地面 / 圣水池
class PZone {
    node!: Node;
    sp!: Sprite;
    kind = '';
    w: WeaponInst | null = null;
    tint = 0xffffff;
    x = 0;
    y = 0;
    r = 0;
    life = 0;
    max = 0;
    dmg = 0;
    anim = 0;
    frame = 0;
    alive = false;
}

// 线段特效（连锁闪电）
class LineFx {
    node!: Node;
    sp!: Sprite;
    life = 0;
    max = 0;
    alive = false;
}

// 敌方子弹
export interface BulletOpts {
    radius?: number;
    life?: number;
    spin?: number;        // 自转速度（度/秒）
    turn?: number;        // 追踪转向速度（弧度/秒）
    orient?: boolean;     // 朝向速度方向
    returnAfter?: number; // 回旋：飞出 N 秒后返回 owner
    owner?: Enemy;
    pierce?: boolean;     // 命中玩家后不消失
}

class Bullet {
    node!: Node;
    sp!: Sprite;
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    speed = 0;
    dmg = 0;
    life = 0;
    age = 0;
    radius = 8;
    o: BulletOpts = {};
    alive = false;
}

// 地面危险区：圆形预警 / 直线预警 / 激光 / 减速冰域
class Hazard {
    node!: Node;
    sp!: Sprite;
    kind: 'circle' | 'line' | 'beam' | 'zone' = 'circle';
    x = 0;
    y = 0;
    r = 0;
    len = 0;
    w = 0;
    angle = 0;
    angVel = 0;
    life = 0;
    max = 0;
    dmg = 0;
    color = new Color();
    owner: Enemy | null = null;
    onDone: (() => void) | null = null;
    alive = false;
}

export class WeaponInst {
    def: WeaponDef;
    level = 1;
    evolved = false;
    stats!: WeaponStats;
    timer = 0;
    shots = 0;
    shotTimer = 0;
    shotIdx = 0;
    damage = 0; // 本局累计伤害
    constructor(def: WeaponDef) {
        this.def = def;
        this.recalc();
    }
    get evo(): EvoDef | undefined { return EVOLUTIONS[this.def.id]; }
    get name() { return this.evolved ? this.evo!.name : this.def.name; }
    get icon() { return this.evolved ? this.evo!.icon : this.def.icon; }
    recalc() {
        const s = { ...this.def.base };
        const add = (m: any) => { for (const k in m) (s as any)[k] += m[k]; };
        for (let i = 0; i < this.level - 1; i++) add(this.def.levels[i].mod);
        if (this.evolved && this.evo) add(this.evo.mod);
        this.stats = s;
    }
}

export interface Option {
    kind: 'weapon' | 'passive' | 'heal' | 'gold';
    wdef?: WeaponDef;
    pdef?: PassiveDef;
    level: number;
}

// 空间哈希网格，加速碰撞查询
class Grid {
    cell = 64;
    map = new Map<number, Enemy[]>();
    used: Enemy[][] = [];
    clear() {
        for (const b of this.used) b.length = 0;
        this.used.length = 0;
        if (this.map.size > 6000) this.map.clear();
    }
    key(cx: number, cy: number) {
        return ((cx & 0xffff) << 16) | (cy & 0xffff);
    }
    insert(e: Enemy) {
        const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
        let b = this.map.get(k);
        if (!b) { b = []; this.map.set(k, b); }
        if (b.length === 0) this.used.push(b);
        b.push(e);
    }
    query(x: number, y: number, r: number, out: Enemy[]) {
        out.length = 0;
        const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
        const y0 = Math.floor((y - r) / this.cell), y1 = Math.floor((y + r) / this.cell);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
            const b = this.map.get(this.key(cx, cy));
            if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
        }
        return out;
    }
}

const C_WHITE = new Color(255, 255, 255, 255);
const C_HURT = new Color(255, 90, 90, 255);
const C_HEAL = new Color(90, 255, 120, 255);
const C_GOLD = new Color(255, 214, 90, 255);
const C_CRIT = new Color(255, 170, 40, 255);
const C_ELITE = new Color(255, 215, 110, 255);
const C_BLOODMOON = new Color(255, 150, 150, 255);
const C_FROZEN = new Color(140, 210, 255, 255);
const C_POTION = new Color(255, 150, 160, 255);
const C_SHIELD = new Color(120, 180, 255, 140);
const C_FIRERING = new Color(255, 120, 50, 150);
const colorCache = new Map<number, Color>();
function colorOf(c: number) {
    let v = colorCache.get(c);
    if (!v) { v = new Color((c >> 16) & 255, (c >> 8) & 255, c & 255, 255); colorCache.set(c, v); }
    return v;
}
const C_EVO = new Color(255, 200, 90, 255);
const C_GOLDEN = new Color(255, 225, 130, 255);
const TAU = Math.PI * 2;
const C_EVO_RED = new Color(255, 110, 110, 255);
const tmpColor = new Color();

export class Battle {
    // 视口尺寸（由 GameRoot 更新）
    vw = 720;
    vh = 1280;
    onBanner: (text: string, color: Color) => void = () => {};

    // 场景层级
    private world: Node;
    private decorLayer: Node;
    private pickupLayer: Node;
    private auraLayer: Node;
    private hazardLayer: Node;
    private zoneLayer: Node;
    private bulletLayer: Node;
    private enemyLayer: Node;
    private projLayer: Node;
    private fxLayer: Node;
    private textLayer: Node;
    private ground: Sprite;

    // 玩家
    char!: CharDef;
    private player: Node;
    private playerSp: Sprite;
    private playerBody: Node;
    private hpFill: Node;
    px = 0;
    py = 0;
    hp = 100;
    private iframe = 0;
    private animT = 0;
    private animF = 0;
    private dirX = 1;
    private dirY = 0;
    private faceX = 1;
    private mx = 0;
    private moving = false;
    private my = 0;
    stats: PlayerStats = { ...BASE_STATS };
    private baseStats: PlayerStats = { ...BASE_STATS };

    // 进度
    time = 0;
    kills = 0;
    level = 1;
    xp = 0;
    xpNext = xpForLevel(1);
    gold = 0;
    pendingLevels = 0;
    pendingChests = 0;
    revivals = 0;
    rerolls = 0;
    dead = false;
    won = false;
    bossIdx = 0;
    private swarmIdx = 0;
    private spawnTimer = 0;
    private shake = 0;
    private shakeAmp = 0;
    private hitstop = 0;
    private attackKills = 0;
    private stashXp = 0;
    private stashT = 0; // 单次攻击击杀数（用于多杀顿帧）
    combo = 0;
    comboT = 0;
    comboPulse = 0;
    private comboMilestone = 0;
    private bossMusic = false;

    weapons: WeaponInst[] = [];
    passives: { def: PassiveDef; level: number }[] = [];
    private garlicAura: Sprite | null = null;

    // 实体与对象池
    private enemies: Enemy[] = [];
    private enemyPool: Enemy[] = [];
    private projs: Proj[] = [];
    private projPool: Proj[] = [];
    private fxs: Fx[] = [];
    private fxPool: Fx[] = [];
    private pickups: Pickup[] = [];
    private pickupPool: Pickup[] = [];
    private parts: Particle[] = [];
    private partPool: Particle[] = [];
    private texts: DmgText[] = [];
    private textPool: DmgText[] = [];
    private grid = new Grid();
    private qbuf: Enemy[] = [];
    boss: Enemy | null = null;
    private bosses: Enemy[] = [];
    private bossWarned = false;
    private victoryT = 0;
    private slowT = 0;
    private pzones: PZone[] = [];
    private pzonePool: PZone[] = [];
    private lines: LineFx[] = [];
    private linePool: LineFx[] = [];
    private familiars: { node: Node; sp: Sprite; x: number; y: number; t: number }[] = [];
    // 命运卡牌 / 增益
    blessings: BlessingDef[] = [];
    pendingBlessings = 0;
    endless = false;
    nightmare = false;   // 噩梦难度：怪物血量 ×1.6（Boss ×1.5）、伤害 ×1.3、金币 ×1.6
    potionT = 0;
    shieldHits = 0;
    hasteT = 0;      // 急速沙漏：冷却 -40%
    cloverT = 0;     // 四叶草：暴击率 +30%、金币掉率提高
    fireT = 0;       // 烈焰之环：身边持续灼烧
    arcaneT = 0;     // 法师天赋：升级后冷却 -30%
    private fireTick = 0;
    private fireFx: Sprite | null = null;
    private traitT = 0; // 角色天赋的周期计时
    private refractBuf: Enemy[] = []; // 折射在 hurtEnemy 内调用，不能复用 qbuf
    private ghostT = 0;
    private riftT = 0;
    private overloadT = 0;  // 超载：倒计时 / 剩余时间
    overloadOn = 0;
    private magstormT = 0;
    private brazierT = 0;
    private goldratT = 0;
    private eliteT = 0;
    stage: StageDef = STAGES[0];
    daily: { mod: DailyMod; blessing: string } | null = null;  // 每日挑战
    private hazardT = 0;
    bloodMoon = false;
    streak = 0;
    flow = 1;              // 动态难度（心流）系数 0.8 ~ 1.7
    private sinceHurt = 0;
    private shieldFx: Sprite | null = null;
    // 成就统计
    evolvedCount = 0;
    bossKills: string[] = [];
    goldRats = 0;
    maxCombo = 0;
    private endlessLoop = 0;
    // 大招：每个角色充能方式与效果都不同（见 Defs.CHARGE_DESC / castUlt）
    ult = 0;              // 充能 0 ~ 1
    private ultBank = 0;  // 待注入的充能：各来源先存进来，每秒最多注入 1/60，保证大招间隔不低于 60 秒
    ultCasts = 0;
    ultT = 0;             // 持续型大招剩余时间
    private ultTick = 0;
    private ultReadyShown = false;
    private invulnT = 0;  // 不动铁壁 / 影袭：无敌
    private dashT = 0;    // 影袭冲刺
    private sanctum: { x: number; y: number; sp: Sprite } | null = null; // 圣域
    private tasks: { t: number; fn: () => void }[] = []; // 延时执行（大招 / 神兵的分段效果）
    // 神兵（30 秒史诗武器）
    epic: EpicDef | null = null;
    epicT = 0;
    epicMax = 0;
    epicsUsed = 0;
    private epicTick = 0;
    private epicTick2 = 0;
    private hammers: Sprite[] = [];
    private holes: { x: number; y: number; t: number; tick: number; sp: Sprite }[] = [];
    private holePool: Sprite[] = [];
    // 新场景道具
    giantT = 0;      // 巨人蘑菇
    bootsT = 0;      // 疾风靴
    private bootsTick = 0;
    private bankT = 0;
    private bankTick = 0;
    decoyT = 0;      // 幻影蛙诱饵
    private decoyX = 0;
    private decoyY = 0;
    private decoySp: Sprite | null = null;
    // 神兵祭坛 / 试炼石碑
    private altarT = 0;
    private shrineT = 0;
    trial: { t: number; need: number; got: number } | null = null;
    trialsWon = 0;
    private enemyUid = 0;
    // 随机事件：补给空投 / 流星雨 / 宝箱怪
    private dropT = 0;
    private showerT = 0;
    showerOn = 0;
    private showerTick = 0;
    private mimicT = 0;
    // 流沙荒漠：龙卷风 / 狂风
    private tornados: { x: number; y: number; vx: number; vy: number; t: number; sp: Sprite }[] = [];
    private windT = 0;
    windOn = 0;
    windX = 0;
    windY = 0;
    // 命运卡牌：能量涌动 / 浴火重生
    ultBuffT = 0;
    private phoenixUsed = false;
    private bullets: Bullet[] = [];
    private bulletPool: Bullet[] = [];
    private hazards: Hazard[] = [];
    private hazardPool: Hazard[] = [];

    // 地图装饰
    private decorChunks = new Map<string, Node[]>();
    private decorPool = new Map<string, Node[]>();
    private lastChunk = '';

    constructor(parent: Node) {
        this.world = mkNode('World', parent);
        const groundLayer = mkNode('Ground', this.world);
        this.decorLayer = mkNode('Decor', this.world);
        this.zoneLayer = mkNode('Zones', this.world);
        this.pickupLayer = mkNode('Pickups', this.world);
        this.hazardLayer = mkNode('Hazards', this.world);
        this.auraLayer = mkNode('Aura', this.world);
        this.enemyLayer = mkNode('Enemies', this.world);
        const playerLayer = mkNode('PlayerLayer', this.world);
        this.projLayer = mkNode('Projectiles', this.world);
        this.bulletLayer = mkNode('Bullets', this.world);
        this.fxLayer = mkNode('Fx', this.world);
        this.textLayer = mkNode('Texts', this.world);

        // 平铺草地：64px 贴图 ×2 = 128 世界单位一格
        const g = mkNode('ground', groundLayer);
        this.ground = g.addComponent(Sprite);
        this.ground.spriteFrame = Art.f('ground');
        this.ground.sizeMode = Sprite.SizeMode.CUSTOM;
        this.ground.type = Sprite.Type.TILED;
        g.getComponent(UITransform)!.setAnchorPoint(0, 0);
        g.setScale(PX, PX, 1);

        this.player = mkNode('Player', playerLayer);
        const half = (Art.f('hero_hunter_0').rect.height * HERO_SCALE) / 2;
        mkSprite(this.player, 'shadow', PX * 1.7).node.setPosition(0, -half + 4);
        this.playerSp = mkSprite(this.player, 'hero_hunter_0', HERO_SCALE);
        this.playerBody = this.playerSp.node;
        mkRect(this.player, 44, 7, new Color(30, 10, 20, 255), 'hpBg').node.setPosition(0, -half - 8);
        this.hpFill = mkRect(this.player, 42, 5, new Color(230, 40, 50, 255), 'hpFill', 0, 0.5).node;
        this.hpFill.setPosition(-21, -half - 8);
    }

    setViewport(vw: number, vh: number) {
        this.vw = vw;
        this.vh = vh;
        const T = 64 * PX;
        this.ground.node.getComponent(UITransform)!.setContentSize(Math.ceil(vw / T) * 64 + 192, Math.ceil(vh / T) * 64 + 192);
        this.lastChunk = '';
    }

    setInput(mx: number, my: number) {
        this.mx = mx;
        this.my = my;
    }

    setPlayerVisible(v: boolean) {
        this.player.active = v;
    }

    // ------------------------------------------------------------------ 开局

    reset(char: CharDef, endless = false, stageId = 'grass', daily: { mod: DailyMod; blessing: string } | null = null) {
        for (const e of this.enemies) this.freeEnemy(e);
        this.enemies.length = 0;
        for (const p of this.projs) this.freeProj(p);
        this.projs.length = 0;
        for (const f of this.fxs) this.freeFx(f);
        this.fxs.length = 0;
        for (const p of this.pickups) this.freePickup(p);
        this.pickups.length = 0;
        for (const t of this.texts) this.freeText(t);
        this.texts.length = 0;
        for (const p of this.parts) this.freePart(p);
        this.parts.length = 0;
        this.hitstop = 0;
        this.combo = this.comboT = this.comboPulse = this.comboMilestone = 0;
        this.stashXp = this.stashT = 0;
        for (const x of this.bullets) this.freeBullet(x);
        this.bullets.length = 0;
        for (const h of this.hazards) this.freeHazard(h);
        this.hazards.length = 0;
        this.bosses.length = 0;
        this.bossWarned = false;
        this.victoryT = 0;
        this.slowT = 0;
        for (const z of this.pzones) this.freePZone(z);
        this.pzones.length = 0;
        for (const l of this.lines) this.freeLine(l);
        this.lines.length = 0;
        for (const f of this.familiars) f.node.destroy();
        this.familiars = [];
        if (this.shieldFx) { this.shieldFx.node.destroy(); this.shieldFx = null; }
        this.endless = endless;
        this.blessings = [];
        this.pendingBlessings = 1; // 开局选择一张命运卡牌
        this.potionT = this.shieldHits = this.ghostT = 0;
        this.hasteT = this.cloverT = this.fireT = this.arcaneT = this.fireTick = 0;
        if (this.fireFx) { this.fireFx.node.destroy(); this.fireFx = null; }
        this.ult = this.ultBank = 0;
        this.ultCasts = this.ultT = this.ultTick = this.invulnT = this.dashT = 0;
        this.ultReadyShown = false;
        if (this.sanctum) { this.sanctum.sp.node.destroy(); this.sanctum = null; }
        this.tasks = [];
        this.endEpic();
        this.epicsUsed = 0;
        for (const h of this.holes) { h.sp.node.active = false; this.holePool.push(h.sp); }
        this.holes = [];
        this.giantT = this.bootsT = this.bankT = this.decoyT = 0;
        if (this.decoySp) this.decoySp.node.active = false;
        this.altarT = 100;
        for (const t of this.tornados) t.sp.node.destroy();
        this.tornados = [];
        this.windT = 25;
        this.windOn = 0;
        this.ultBuffT = 0;
        this.phoenixUsed = false;
        this.dropT = 150;
        this.showerT = 240 + Math.random() * 60;
        this.showerOn = 0;
        this.mimicT = 300 + Math.random() * 40;
        this.shrineT = 200;
        this.trial = null;
        this.trialsWon = 0;
        this.riftT = 25;
        this.overloadT = 30;
        this.overloadOn = 0;
        this.magstormT = 45;
        this.brazierT = 3;
        this.goldratT = 50;
        this.eliteT = 75;
        // 地图：地面、装饰、环境危害
        this.stage = STAGES.find(x => x.id === stageId) || STAGES[0];
        this.daily = daily;
        this.ground.spriteFrame = Art.f(this.stage.ground);
        this.hazardT = 30;
        for (const [, nodes] of this.decorChunks) {
            for (const n of nodes) {
                n.active = false;
                let p = this.decorPool.get(n.name);
                if (!p) { p = []; this.decorPool.set(n.name, p); }
                p.push(n);
            }
        }
        this.decorChunks.clear();
        this.lastChunk = '';
        this.bloodMoon = false;
        this.flow = 1;
        this.surgeIdx = 0;
        this.celebrateT = 0;
        this.lastSurgeCycle = -1;
        this.sinceHurt = 0;
        this.ground.color = C_WHITE;
        this.evolvedCount = this.goldRats = this.maxCombo = this.endlessLoop = 0;
        this.bossKills = [];
        this.newCodex = [];
        this.chestsOpened = 0;
        if (this.garlicAura) { this.garlicAura.node.destroy(); this.garlicAura = null; }

        this.char = char;
        this.traitT = char.id === 'nun' ? 10 : char.id === 'santa' ? 40 : 4;
        this.px = this.py = 0;
        this.time = 0;
        this.kills = 0;
        this.level = 1;
        this.xp = 0;
        this.xpNext = xpForLevel(1);
        this.gold = 0;
        this.pendingLevels = this.pendingChests = 0;
        this.dead = this.won = false;
        this.spawnTimer = 0.5;
        this.bossIdx = this.swarmIdx = 0;
        this.boss = null;
        this.bossMusic = false;
        this.iframe = 0;
        this.shake = 0;
        this.mx = this.my = 0;
        this.dirX = 1; this.dirY = 0; this.faceX = 1;
        this.weapons = [];
        this.passives = [];

        // 基础属性 = 默认 + 角色加成 + 商店强化
        const b: PlayerStats = { ...BASE_STATS };
        for (const k in char.bonus) (b as any)[k] += (char.bonus as any)[k];
        const pct: Partial<Record<keyof PlayerStats, number>> = {};
        for (const p of POWERUPS) {
            const r = Save.rank(p.id);
            if (!r) continue;
            if (p.mul) pct[p.stat] = (pct[p.stat] || 0) + p.per * r;
            else b[p.stat] += p.per * r;
        }
        for (const k in pct) (b as any)[k] *= 1 + (pct as any)[k];
        // 不屈意志：连败后下一局伤害与生命各 +5%/层（最多 3 层），赢一局后清零
        this.streak = endless ? 0 : Math.min(3, Save.data.lossStreak || 0);
        b.might *= 1 + 0.05 * this.streak;
        b.maxHp *= 1 + 0.05 * this.streak;
        this.baseStats = b;
        this.recalcStats();
        this.hp = this.stats.maxHp;
        this.revivals = Math.round(this.stats.revival);
        this.rerolls = Math.round(this.stats.reroll);
        const w = WEAPONS.find(x => x.id === char.weapon) || WEAPONS[0];
        this.addWeapon(w);
        // 每日挑战：强制命运卡牌，不再开局选卡
        if (daily) {
            const bl = BLESSINGS.find(x => x.id === daily.blessing);
            if (bl) this.blessings.push(bl);
            this.pendingBlessings = 0;
            this.recalcStats();
            this.hp = this.stats.maxHp;
        }
        this.playerSp.spriteFrame = Art.f(char.sprite + '_0');
        this.player.setPosition(0, 0);
        this.playerBody.setPosition(0, 0);
        this.restorePlayerLook();
        this.player.active = true;
    }

    // ------------------------------------------------------------------ 主循环

    tick(dt: number) {
        // 顿帧：短暂冻结战斗，只让特效继续播放
        if (this.hitstop > 0) {
            this.hitstop -= dt;
            this.updateParticles(dt * 0.3);
            return;
        }
        this.time += dt;
        this.updateFlow(dt);
        if (this.comboT > 0) {
            this.comboT -= dt;
            if (this.comboT <= 0) { this.combo = 0; this.comboMilestone = 0; }
        }
        if (this.comboPulse > 0) this.comboPulse -= dt;
        this.updatePlayer(dt);
        this.updateSpawner(dt);
        this.grid.clear();
        for (const e of this.enemies) this.grid.insert(e);
        this.updateEnemies(dt);
        this.updateWeapons(dt);
        this.updateProjs(dt);
        this.updateBullets(dt);
        this.updateHazards(dt);
        this.updatePZones(dt);
        this.updateLines(dt);
        this.updateEvents(dt);
        this.updateUlt(dt);
        this.updateEpic(dt);
        this.updateTasks(dt);
        this.updatePickups(dt);
        this.updateFx(dt);
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.compact();
        if (this.hp <= 0) this.onDeath();
        if (this.time >= (this.daily ? DAILY_GOAL : WIN_TIME) && !this.dead && !this.endless) this.won = true;
        if (this.victoryT > 0) {
            this.victoryT -= dt;
            if (this.victoryT <= 0 && !this.dead) this.won = true;
        }
    }

    // 胜利庆祝：不再刷怪；以奶蛙为中心扩散的光环把怪物一圈圈"变成星星"消散，四周撒彩带
    private celebrateT = 0;
    celebrate(dt: number) {
        this.celebrateT += dt;
        const r = this.celebrateT * 520;
        for (const e of this.enemies) {
            if (!e.alive || e.def.prop) continue;
            if (Math.hypot(e.x - this.px, e.y - this.py) < r) {
                e.alive = false;
                this.burst(e.x, e.y, [0xffe080, 0x80d0ff, 0xff90c0, 0x90f090][Math.floor(Math.random() * 4)], 4, 160);
            }
        }
        for (const b of this.bullets) b.alive = false;
        for (const p of this.projs) p.alive = false;
        for (const h of this.hazards) if (h.alive) { h.alive = false; h.node.active = false; }
        for (const z of this.pzones) if (z.alive) { z.alive = false; z.node.active = false; }
        this.endEpic();
        for (const t of this.tornados) t.sp.node.destroy();
        this.tornados = [];
        if (Math.random() < 0.6) {
            const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 260;
            this.burst(this.px + Math.cos(a) * d, this.py + Math.sin(a) * d, [0xffd040, 0xff6a6a, 0x6ad0ff, 0x8af08a, 0xd08aff][Math.floor(Math.random() * 5)], 6, 220);
        }
        // 奶蛙开心地跳
        const hop = Math.abs(Math.sin(this.celebrateT * 7)) * 18;
        this.playerBody.setPosition(this.playerBody.position.x, hop);
        this.updateFx(dt);
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.updateLines(dt);
        this.compact();
        this.updateCamera(dt);
    }

    // 倒下动画：奶蛙闪白、旋转缩小，然后化作一团星光碎片，一颗小星星缓缓升起；怪物原地停住
    private dieT = 0;
    dying(dt: number) {
        const t0 = this.dieT;
        if (t0 === 0) this.endEpic();
        this.dieT += dt;
        const t = this.dieT;
        for (const b of this.bullets) b.alive = false;
        if (t < 0.55) {
            this.playerSp.color = Math.floor(t * 16) % 2 ? C_WHITE : new Color(255, 255, 255, 120);
            const k = 1 - t * 0.6;
            this.playerBody.angle = t * 540;
            this.playerBody.setScale(this.faceX * HERO_SCALE * k, HERO_SCALE * k, 1);
        }
        if (t0 < 0.55 && t >= 0.55) {
            this.playerBody.active = false;
            this.hpFill.parent!.active = false;
            this.burst(this.px, this.py, 0xffffff, 26, 420);
            this.burst(this.px, this.py, 0xf5d040, 30, 320);
            this.burst(this.px, this.py, 0xffe680, 16, 200);
            const f = this.spawnFx('aura', this.px, this.py, 0.6, 1.5, 4);
            f.sp.color = colorOf(0xfff0a0);
            const s = this.spawnFx('spark', this.px, this.py + 10, 1.1, PX * 1.2, 0.5);
            s.vy = 70;
            this.addShake(0.4, 8);
            Sound.play('boom');
        }
        this.updateFx(dt);
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.updateLines(dt);
        this.compact();
        this.updateCamera(dt);
    }

    // 倒下动画后复位奶蛙外观（复活 / 新开局）
    private restorePlayerLook() {
        this.dieT = 0;
        this.playerBody.active = true;
        this.playerBody.angle = 0;
        this.playerBody.setScale(this.faceX * HERO_SCALE, HERO_SCALE, 1);
        this.playerSp.color = C_WHITE;
        if (this.hpFill.parent) this.hpFill.parent.active = true;
    }

    // 菜单背景：镜头缓慢漂移
    idle(dt: number) {
        this.px += dt * 18;
        this.py += dt * 10;
        this.updateCamera(dt);
    }

    private onDeath() {
        if (this.hasB('phoenix') && !this.phoenixUsed) {
            // 浴火重生：每局一次，回复一半生命并灼烧周围
            this.phoenixUsed = true;
            this.hp = this.stats.maxHp * 0.5;
            this.iframe = 2;
            this.explodeFriendly(this.px, this.py, 220, 60 + this.level * 5, null, 600, 0xff7030);
            this.fireT = Math.max(this.fireT, 8);
            this.onBanner('浴火重生!', new Color(255, 140, 60, 255));
            Sound.play('revive');
            return;
        }
        if (this.revivals > 0) {
            this.revivals--;
            this.revive(0.5);
            return;
        }
        this.hp = 0;
        this.dead = true;
    }

    // 复活：恢复生命，冲击波击退并伤害附近敌人（商店「复活」与看广告复活共用）
    revive(hpRatio: number) {
        this.restorePlayerLook();
        this.dead = false;
        this.hp = this.stats.maxHp * hpRatio;
        this.iframe = 2.5;
        for (const e of this.enemies) {
            if (!e.alive || e.def.prop) continue;
            const d = Math.hypot(e.x - this.px, e.y - this.py);
            if (d < 320) this.hurtEnemy(e, 50 + this.level * 2, 600, this.px, this.py, null);
        }
        this.bullets.forEach(b => { b.alive = false; });
        this.spawnFx('aura', this.px, this.py, 0.6, 2, 6);
        this.burst(this.px, this.py, 0xfff0a0, 30, 400);
        Sound.play('revive');
        this.onBanner('复活!', new Color(255, 230, 120, 255));
    }

    private updatePlayer(dt: number) {
        let mx = this.mx, my = this.my;
        const len = Math.hypot(mx, my);
        const moving = this.moving = len > 0.05;
        if (moving) {
            if (len > 1) { mx /= len; my /= len; }
            const sp = 145 * this.stats.moveSpeed * (this.slowT > 0 ? 0.55 : 1) * (this.potionT > 0 ? 1.3 : 1) * (this.ghostT > 0 ? 1.5 : 1)
                * (this.bootsT > 0 ? 1.6 : 1) * (this.epicIs('unicorn') ? 1.6 : 1);
            this.px += mx * sp * dt;
            this.py += my * sp * dt;
            if (this.char.charge === 'move') this.chargeUlt(sp * dt / 2600);
            const l = Math.hypot(mx, my);
            this.dirX = mx / l;
            this.dirY = my / l;
            if (Math.abs(mx) > 0.1) this.faceX = mx > 0 ? 1 : -1;
        }
        this.animT += dt;
        if (moving) {
            if (this.animT > 0.14) { this.animT = 0; this.animF = this.animF === 1 ? 2 : 1; }
        } else this.animF = 0;
        // 影袭：沿移动方向高速冲刺
        if (this.dashT > 0) {
            this.dashT -= dt;
            this.px += this.dirX * 1300 * dt;
            this.py += this.dirY * 1300 * dt;
            for (const e of this.grid.query(this.px, this.py, 70, this.qbuf).slice()) {
                if (!e.alive || e.def.prop || Math.hypot(e.x - this.px, e.y - this.py) > 50 + e.def.radius) continue;
                if (this.time < (e.hits.get('dash') || 0)) continue;
                e.hits.set('dash', this.time + 1);
                this.hurtEnemy(e, this.skillDmg(30, 5), 300, this.px, this.py, null);
            }
            if (Math.random() < 0.8) this.burst(this.px, this.py, 0x8060c0, 2, 80);
            if (this.dashT <= 0) this.rogueFinale();
        }
        this.playerSp.spriteFrame = Art.f(this.char.sprite + '_' + this.animF);
        // 巨人蘑菇：体型变大（最后 1 秒闪烁着缩回）
        const big = this.giantT > 0 ? (this.giantT < 1 && Math.floor(this.giantT * 10) % 2 ? 1.3 : 1.8) : 1;
        this.playerBody.setScale(this.faceX * HERO_SCALE * big, HERO_SCALE * big, 1);
        this.player.setPosition(this.px, this.py);

        this.iframe -= dt;
        if (this.invulnT > 0) this.invulnT -= dt;
        if (this.slowT > 0) this.slowT -= dt;
        this.playerSp.color = this.iframe > 0 && Math.floor(this.iframe * 20) % 2 === 0 ? C_HURT
            : this.invulnT > 0 ? C_GOLDEN
            : this.epicIs('unicorn') ? this.rainbow(this.time * 2) : C_WHITE;
        if (this.char.charge === 'heal' && this.hp < this.stats.maxHp) this.chargeUlt(this.stats.recovery * dt / (this.stats.maxHp * 0.8));
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.recovery * dt);
        this.hpFill.setScale(Math.max(0, this.hp / this.stats.maxHp), 1, 1);
    }

    hurtPlayer(dmg: number) {
        if (this.iframe > 0 || this.invulnT > 0 || this.dashT > 0) return;
        // 游侠蛙：灵巧闪避
        if (this.isChar('rogue') && Math.random() < 0.12) {
            this.iframe = 0.4;
            this.burst(this.px, this.py, 0xc0ffc0, 8, 220);
            return;
        }
        // 圣盾：抵挡一次伤害
        if (this.shieldHits > 0) {
            this.shieldHits--;
            this.iframe = 0.6;
            if (this.char.charge === 'heal') this.chargeUlt(0.08);
            this.burst(this.px, this.py, 0x60a0ff, 12, 260);
            Sound.play('hit');
            return;
        }
        // 荆棘甲：反伤并击退周围敌人
        if (this.stats.thorns > 0) {
            const q = this.grid.query(this.px, this.py, 90, this.qbuf).slice();
            for (const e of q) if (e.alive && !e.def.prop && Math.hypot(e.x - this.px, e.y - this.py) < 90) this.hurtEnemy(e, this.stats.thorns, 300, this.px, this.py, null);
            this.burst(this.px, this.py, 0x8aa060, 10, 220);
        }
        if (this.hasB('ghost')) { this.ghostT = 1.5; this.iframe = Math.max(this.iframe, 1.5); }
        // 荆棘光环：受伤时对周围敌人造成大量伤害
        if (this.hasB('thornaura')) this.explodeFriendly(this.px, this.py, 130, 40 + this.level * 3, null, 260, 0xa0d060);
        // 爆破蛙：受伤时引爆周围
        if (this.isChar('bomber') && Math.random() < 0.35) this.explodeFriendly(this.px, this.py, 110, 20 + this.level * 2, null, 260, 0xff8030);
        const armor = this.stats.armor + (this.isChar('knight') && this.hp < this.stats.maxHp * 0.5 ? 2 : 0);
        const d = Math.max(1, dmg * (this.mod('glass') ? 1.5 : 1) * (this.giantT > 0 ? 0.5 : 1) - armor);
        this.hp -= d;
        if (this.char.charge === 'hurt') this.chargeUlt(0.12);
        this.iframe = Math.max(this.iframe, 0.6);
        this.sinceHurt = 0;
        this.addShake(0.2, 7);
        Sound.play('hurt');
        vibrate();
    }

    private heal(v: number) {
        if (this.hp >= this.stats.maxHp) return;
        if (this.char.charge === 'heal') this.chargeUlt(Math.min(v, this.stats.maxHp - this.hp) / (this.stats.maxHp * 0.8));
        this.hp = Math.min(this.stats.maxHp, this.hp + v);
    }

    updateCamera(dt: number) {
        let sx = 0, sy = 0;
        if (this.shake > 0) {
            this.shake -= dt;
            const k = this.shakeAmp * Math.min(1, this.shake * 6);
            sx = (Math.random() - 0.5) * 2 * k;
            sy = (Math.random() - 0.5) * 2 * k;
        }
        this.world.setPosition(Math.round(-this.px + sx), Math.round(-this.py + sy));
        const T = 64 * PX;
        this.ground.node.setPosition(Math.floor((this.px - this.vw / 2) / T) * T - T, Math.floor((this.py - this.vh / 2) / T) * T - T);
        this.updateDecor();
    }

    // ------------------------------------------------------------------ 地图装饰（按区块确定性生成）

    private updateDecor() {
        const CH = 400;
        const cx = Math.floor(this.px / CH), cy = Math.floor(this.py / CH);
        const key = cx + ',' + cy;
        if (key === this.lastChunk) return;
        this.lastChunk = key;
        const rx = Math.ceil(this.vw / 2 / CH) + 1, ry = Math.ceil(this.vh / 2 / CH) + 1;
        const want = new Set<string>();
        for (let i = cx - rx; i <= cx + rx; i++) for (let j = cy - ry; j <= cy + ry; j++) want.add(i + ',' + j);
        for (const [k, nodes] of this.decorChunks) {
            if (want.has(k)) continue;
            for (const n of nodes) {
                n.active = false;
                let p = this.decorPool.get(n.name);
                if (!p) { p = []; this.decorPool.set(n.name, p); }
                p.push(n);
            }
            this.decorChunks.delete(k);
        }
        const kinds = this.stage.decor;
        for (const k of want) {
            if (this.decorChunks.has(k)) continue;
            const [i, j] = k.split(',').map(Number);
            const r = rng((i * 73856093) ^ (j * 19349663) ^ 0x5bd1e995);
            const n = Math.floor(r() * 5);
            const list: Node[] = [];
            for (let m = 0; m < n; m++) {
                const kind = kinds[Math.floor(r() * kinds.length)];
                const x = (i + r()) * CH, y = (j + r()) * CH;
                if (Math.abs(x) < 120 && Math.abs(y) < 120) continue; // 出生点保持干净
                const pool = this.decorPool.get(kind);
                let node = pool && pool.pop();
                if (!node) node = mkSprite(this.decorLayer, kind, PX, kind).node;
                node.active = true;
                node.setPosition(x, y);
                list.push(node);
            }
            this.decorChunks.set(k, list);
        }
    }

    // ------------------------------------------------------------------ 刷怪

    private updateSpawner(dt: number) {
        // 血月：最后两分钟的终局冲刺
        if (!this.endless && !this.bloodMoon && this.time >= BLOOD_MOON) {
            this.bloodMoon = true;
            this.ground.color = C_BLOODMOON;
            this.onBanner('红月降临! 坚持最后两分钟!', new Color(255, 60, 60, 255));
            Sound.play('roar');
            Sound.playBgm('bgm_boss');
            this.bossMusic = false;
            this.addShake(0.6, 6);
        }
        let wave = WAVES[0];
        for (const w of WAVES) if (this.time >= w.t) wave = w;
        // 刷怪节奏：开局 2 分钟逐步加速；之后每 60 秒一个波峰（约 15 秒怪潮）和波谷（喘息）
        const pace = this.spawnPace();
        this.spawnTimer -= dt * pace;
        this.updateSurge(wave);
        if (this.spawnTimer <= 0) {
            this.spawnTimer = wave.interval;
            // Boss 战期间小怪减少 40%，让玩家专心对付 Boss
            const count = Math.round((wave.batch + Math.floor(this.time / 120)) * (this.boss ? 0.6 : 1) * (this.hasB('greedpact') ? 1.3 : 1) * (this.endless ? 1 + Math.max(0, this.time - 900) / 600 : 1) * (this.bloodMoon ? 1.8 : 1) * this.flow * (this.mod('horde') ? 1.4 : 1) * (this.trial ? 2 : 1));
            // 远程小恶魔同时存在数量有上限，避免弹幕失控
            let imps = 0;
            for (const e of this.enemies) if (e.alive && e.def.ranged) imps++;
            const impCap = 4 + Math.floor(Math.max(0, this.time - 540) / 120);
            for (let i = 0; i < count && this.enemies.length < (this.bloodMoon ? (Save.data.lite ? 290 : 420) : this.enemyCap); i++) {
                let type = wave.types[Math.floor(Math.random() * wave.types.length)];
                if (ENEMIES[type].ranged) {
                    if (imps >= impCap) type = 'skeleton';
                    else imps++;
                }
                // 移动时一半怪物刷在前进方向，防止一直逃跑
                const a = this.moving && Math.random() < 0.35
                    ? Math.atan2(this.dirY, this.dirX) + (Math.random() - 0.5) * 1.4
                    : Math.random() * Math.PI * 2;
                const r = this.spawnRadius(a);
                this.spawnEnemy(type, this.px + Math.cos(a) * r, this.py + Math.sin(a) * r);
            }
        }
        // 无尽模式：时间表结束后循环召唤 Boss，每轮更强
        if (this.endless && this.bossIdx >= BOSS_SCHEDULE.length) {
            const t = this.endlessBossTime();
            if (!this.bossWarned && this.time >= t - 10) {
                this.bossWarned = true;
                this.onBanner('警告! 更强的 Boss 即将降临', new Color(255, 70, 70, 255));
                Sound.play('boss');
            }
            if (this.time >= t) {
                this.endlessLoop++;
                this.bossWarned = false;
                const ids = ['slimeking', 'bonelord', 'vampire', 'lich', 'eye', 'reaper'];
                this.spawnBoss(ids[Math.floor(Math.random() * ids.length)], 1 + this.endlessLoop * 0.6);
            }
        }
        const next = BOSS_SCHEDULE[this.bossIdx];
        if (next) {
            const bossId = this.swapBoss(next.id);
            // 出场前 10 秒预警
            if (!this.bossWarned && this.time >= next.t - 10) {
                this.bossWarned = true;
                this.onBanner(`警告! ${ENEMIES[bossId].name} 即将降临`, new Color(255, 70, 70, 255));
                Sound.play('boss');
            }
            if (this.time >= next.t) {
                this.bossIdx++;
                this.bossWarned = false;
                this.spawnBoss(bossId);
            }
        }
        this.bosses = this.bosses.filter(b => b.alive);
        this.boss = this.bosses.length ? this.bosses[this.bosses.length - 1] : null;
        if (this.bossMusic && !this.boss) {
            this.bossMusic = false;
            if (!this.bloodMoon) Sound.playBgm('bgm_battle');
        }
        if (this.swarmIdx < SWARM_TIMES.length && this.time >= SWARM_TIMES[this.swarmIdx]) {
            this.swarmIdx++;
            this.spawnSwarm();
        }
    }

    private endlessBossTime() {
        return BOSS_SCHEDULE[BOSS_SCHEDULE.length - 1].t + ENDLESS_BOSS_INTERVAL * (this.endlessLoop + 1);
    }

    // 地图可替换时间表中的 Boss（新春地图：年兽）
    private swapBoss(id: string) {
        return (this.stage.bossSwap && this.stage.bossSwap[id]) || id;
    }

    private spawnBoss(id: string, hpMul = 1) {
        const def = ENEMIES[id];
        // 上一个 Boss 还没被击败：撤退（没有奖励），避免多个 Boss 叠在一起
        for (const old of this.bosses) {
            if (!old.alive) continue;
            old.alive = false;
            old.ai = null;
            this.burst(old.x, old.y, old.def.color, 30, 300);
            this.spawnFx(old.def.frames[0] + '_w', old.x, old.y, 0.4, PX * (old.def.scale || 1), 1);
            this.onBanner(`${old.def.name} 撤退了…`, new Color(180, 180, 200, 255));
        }
        // 从屏幕上方入场；血量随玩家等级成长
        const b = this.spawnEnemy(id, this.px, this.py + this.vh / 2 + 80, true)!;
        b.maxHp = b.hp = def.hp * (1 + 0.1 * this.level) * hpMul * this.stage.hpMul * (this.nightmare ? 1.5 : 1);
        b.ai = createBossAI(id, this, b);
        this.bosses.push(b);
        this.boss = b;
        Sound.play('roar');
        Sound.playBgm('bgm_boss');
        this.bossMusic = true;
        this.addShake(0.6, 8);
        this.onBanner(`${def.name} 降临!`, new Color(220, 80, 255, 255));
    }

    // 下一个 Boss 的名字与剩余秒数（用于 HUD 倒计时）
    nextBoss(): { name: string; remain: number; final: boolean } | null {
        const n = BOSS_SCHEDULE[this.bossIdx];
        if (!n && this.endless) return { name: `强化Boss·第${this.endlessLoop + 1}轮`, remain: Math.max(0, this.endlessBossTime() - this.time), final: false };
        if (!n) return null;
        const d = ENEMIES[this.swapBoss(n.id)];
        return { name: d.name || '', remain: Math.max(0, n.t - this.time), final: !!d.final };
    }

    summon(type: string, x: number, y: number) {
        if (this.enemies.length >= this.enemyCap + 60) return;
        this.spawnEnemy(type, x, y, true);
    }

    banner(text: string) {
        this.onBanner(text, new Color(255, 140, 90, 255));
    }

    // 竖屏下按方向计算屏幕外的出生距离（椭圆），避免左右两侧离得太远
    // 刷怪速度倍率：早期慢（0.45 → 1），之后按 60 秒周期在 0.5（波谷）~ 1.7（波峰）之间起伏
    spawnPace() {
        const t = this.time;
        if (this.daily && this.mod('horde')) return 1.2;
        const early = Math.min(1, 0.5 + t / 240); // 0:00 约 0.5 倍，2 分钟到 1 倍
        if (t < 45 || this.boss || this.bloodMoon || this.endless) return early;
        const ph = ((t - 45) % 60) / 60;               // 0 ~ 1
        const s = Math.sin(ph * Math.PI * 2 - Math.PI / 2); // -1 波谷 … 1 波峰
        const shaped = Math.sign(s) * Math.pow(Math.abs(s), 0.6);
        return early * (1.05 + 0.6 * shaped);
    }

    // 波峰开始时的特殊出怪：包围圈 / 侧翼冲锋 / 密集怪潮 轮流出现
    private surgeIdx = 0;
    private lastSurgeCycle = -1;
    private updateSurge(wave: { types: string[] }) {
        const t = this.time;
        if (t < 105 || this.boss || this.bloodMoon || this.endless) return;
        const cycle = Math.floor((t - 45) / 60);
        const ph = ((t - 45) % 60) / 60;
        if (ph < 0.42 || ph > 0.5 || cycle === this.lastSurgeCycle) return;
        this.lastSurgeCycle = cycle;
        const types = wave.types.filter(k => !ENEMIES[k].ranged);
        const pick = () => types[Math.floor(Math.random() * types.length)];
        const kind = this.surgeIdx++ % 3;
        const n = Math.min(40, 14 + Math.floor(t / 30));
        if (kind === 0) {
            // 包围圈：一圈怪物从屏幕外同时向奶蛙收缩
            const R = Math.hypot(this.vw, this.vh) / 2 + 40, type = pick();
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2;
                this.spawnEnemy(type, this.px + Math.cos(a) * R, this.py + Math.sin(a) * R, true);
            }
            this.onBanner('怪物包围了!', new Color(255, 170, 80, 255));
        } else if (kind === 1) {
            // 侧翼冲锋：一大群怪物从同一侧涌来
            const a = Math.random() * Math.PI * 2, R = Math.hypot(this.vw, this.vh) / 2 + 60, type = pick();
            const nx = -Math.sin(a), ny = Math.cos(a);
            for (let i = 0; i < n; i++) {
                const off = (i - n / 2) * 22, back = (i % 3) * 30;
                this.spawnEnemy(type, this.px + Math.cos(a) * (R + back) + nx * off, this.py + Math.sin(a) * (R + back) + ny * off, true);
            }
            this.onBanner('怪物群冲过来了!', new Color(255, 170, 80, 255));
        } else {
            this.onBanner('怪潮来袭!', new Color(255, 170, 80, 255));
        }
        Sound.play('roar');
    }

    private spawnRadius(a: number) {
        const hw = this.vw / 2 + 50, hh = this.vh / 2 + 50;
        const c = Math.cos(a), s = Math.sin(a);
        return Math.min(Math.abs(c) > 1e-3 ? hw / Math.abs(c) : 1e9, Math.abs(s) > 1e-3 ? hh / Math.abs(s) : 1e9);
    }

    private spawnSwarm() {
        this.onBanner('蝙蝠群来袭!', new Color(200, 140, 255, 255));
        // 竖屏：蝙蝠群从上方或下方纵向穿过
        const side = Math.random() < 0.5 ? -1 : 1;
        const y0 = this.py - side * (this.vh / 2 + 60);
        for (let i = 0; i < 40; i++) {
            const e = this.spawnEnemy('bat', this.px + ((i % 8) - 3.5) * 40 + Math.random() * 10, y0 - side * Math.floor(i / 8) * 34, true)!;
            e.sx = 0;
            e.sy = side * 170;
        }
    }

    private spawnEnemy(type: string, x: number, y: number, force = false): Enemy | null {
        const def = ENEMIES[type];
        if (!force && this.enemies.length >= this.enemyCap) return null;
        let e = this.enemyPool.pop();
        if (!e) {
            e = new Enemy();
            e.node = mkNode('enemy', this.enemyLayer);
            e.shadow = mkSprite(e.node, 'shadow', PX).node;
            e.sp = mkSprite(e.node, def.frames[0]);
            e.body = e.sp.node;
        }
        const s = def.scale || 1;
        e.def = def;
        e.node.active = true;
        e.x = x; e.y = y;
        e.kx = e.ky = e.sx = e.sy = 0;
        e.maxHp = e.hp = def.boss ? def.hp : def.hp * (1 + this.time / 240 + (this.time / 280) ** 2) * (this.bloodMoon ? 1.3 : 1) * this.flowHp() * this.stage.hpMul * (this.mod('xp2') ? 1.5 : 1) * (this.nightmare ? 1.6 : 1);
        e.flash = 0;
        e.punch = 0;
        e.anim = Math.random() * def.anim;
        e.frame = 0;
        e.alive = true;
        e.hits.clear();
        e.ai = null;
        e.frozen = 0;
        e.shootT = 1.5 + Math.random() * 2;
        e.life = 0;
        e.elite = false;
        e.mode = 0;
        e.modeT = 1 + Math.random() * 2;
        e.cvx = e.cvy = 0;
        e.uid = ++this.enemyUid;
        e.body.setPosition(0, 0);
        e.sp.spriteFrame = Art.f(def.frames[0]);
        e.sp.color = C_WHITE;
        e.body.setScale(PX * s, PX * s, 1);
        const flying = type === 'bat' || type === 'ghost';
        const h = (e.sp.spriteFrame.rect.height / 2 - 3) * PX * s;
        e.shadow.setPosition(0, flying ? -h - 8 : -h);
        e.shadow.setScale(PX * s * (def.boss ? 2 : 1.2), PX * s, 1);
        e.node.setPosition(x, y);
        // 精英怪：金色、体型更大、血量 ×8，掉落丰厚
        if (!force && !def.boss && !def.prop && !def.flee && this.time > 60 && this.eliteT <= 0) {
            this.eliteT = this.mod('elites') ? 12 : (30 + Math.random() * 15) / (this.bloodMoon ? 3 : 1);
            this.eliteify(e);
        }
        this.enemies.push(e);
        return e;
    }

    // 精英化：金色、体型更大、血量 ×8
    private eliteify(e: Enemy) {
        const s = e.def.scale || 1;
        e.elite = true;
        e.maxHp = e.hp = e.hp * 8;
        e.sp.color = C_ELITE;
        e.body.setScale(PX * s * 1.5, PX * s * 1.5, 1);
    }

    private freeEnemy(e: Enemy) {
        e.alive = false;
        e.node.active = false;
        this.enemyPool.push(e);
    }

    private updateEnemies(dt: number) {
        const px = this.px, py = this.py;
        const despawnX = this.vw / 2 + 260, despawnY = this.vh / 2 + 260;
        const q = this.qbuf;
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.alive) continue;
            const def = e.def;
            let dx = px - e.x, dy = py - e.y;
            let d = Math.hypot(dx, dy) || 1;
            e.life += dt;
            if (def.prop) {
                // 火盆：原地不动，离得太远就回收
                if (Math.abs(dx) > despawnX + 300 || Math.abs(dy) > despawnY + 300) { e.alive = false; continue; }
                // 神兵祭坛：走过去碰一下也能打碎
                if (def === ENEMIES.altar && d < def.radius + 22) { this.killEnemy(e); continue; }
                this.animEnemy(e, dt, 1, 0);
                continue;
            }
            if (e.frozen > 0) {
                // 冻结：不能移动、不造成伤害
                e.frozen -= dt;
                if (e.frozen <= 0) e.sp.color = e.elite ? C_ELITE : C_WHITE;
                e.node.setPosition(e.x, e.y);
                continue;
            }
            if (def.flee) {
                // 金鼠：远离玩家，逐渐疲惫；14 秒后逃走
                const sp = def.speed * Math.max(0.45, 1 - e.life / 14);
                const wob = Math.sin(e.life * 3) * 0.6;
                const a = Math.atan2(-dy, -dx) + wob;
                e.x += Math.cos(a) * sp * dt;
                e.y += Math.sin(a) * sp * dt;
                if (e.life > 14) {
                    e.alive = false;
                    this.burst(e.x, e.y, 0xf5c542, 16, 200);
                    this.onBanner('金鼠逃走了…', new Color(200, 200, 200, 255));
                    continue;
                }
                this.animEnemy(e, dt, a > Math.PI / 2 || a < -Math.PI / 2 ? -1 : 1, 0);
                continue;
            }
            if (e.sx !== 0 || e.sy !== 0) {
                e.x += e.sx * dt;
                e.y += e.sy * dt;
                if (Math.abs(dx) > despawnX + 400 || Math.abs(dy) > despawnY + 400) { e.alive = false; continue; }
            } else if (e.ai) {
                // Boss：由 AI 控制施法、冲刺、跳跃
                const ai = e.ai;
                ai.update(dt);
                if (!e.alive) continue;
                if (ai.dashT > 0) {
                    e.x += ai.dashVx * dt;
                    e.y += ai.dashVy * dt;
                } else {
                    const sp = def.speed * ai.speedMul;
                    e.x += (dx / d) * sp * dt;
                    e.y += (dy / d) * sp * dt;
                }
                if (ai.dashT <= 0 && (Math.abs(dx) > despawnX + 200 || Math.abs(dy) > despawnY + 200)) {
                    e.x = px + (dx > 0 ? -1 : 1) * Math.min(Math.abs(dx), this.vw / 2);
                    e.y = py + (dy > 0 ? -1 : 1) * Math.min(Math.abs(dy), this.vh / 2 + 60);
                }
            } else {
                // 怪物随时间变快（15 分钟时 +25%）
                const sp = def.speed * (e.flash > 0 ? 0.5 : 1) * (1 + Math.min(this.time, 900) / 3600) * (this.mod('fast') ? 1.25 : 1);
                e.modeT -= dt;
                if (def.mimic && e.mode === 0) {
                    // 宝箱怪：伪装成宝箱一动不动，奶蛙靠近时张嘴扑过来
                    e.anim = 0;
                    if (e.frame !== 0) { e.frame = 0; e.sp.spriteFrame = Art.f(def.frames[0]); }
                    if (d < 130 || e.hp < e.maxHp) {
                        e.mode = 1;
                        e.punch = 0.3;
                        this.onBanner('是宝箱怪!', new Color(255, 150, 90, 255));
                        Sound.play('roar');
                    }
                } else if (def.charger && e.mode === 1) {
                    // 蓄力：原地抖动，红线预警结束后冲出
                    e.punch = 0.05;
                    if (e.modeT <= 0) { e.mode = 2; e.modeT = 0.55; Sound.play('dash'); }
                } else if (def.charger && e.mode === 2) {
                    e.x += e.cvx * dt;
                    e.y += e.cvy * dt;
                    if (e.modeT <= 0) { e.mode = 0; e.modeT = 3.5 + Math.random(); }
                } else if (def.charger && e.modeT <= 0 && d < 260) {
                    const a = Math.atan2(dy, dx);
                    e.mode = 1; e.modeT = 0.7;
                    e.cvx = Math.cos(a) * 540; e.cvy = Math.sin(a) * 540;
                    this.warnLine(e.x, e.y, a, 320, 40, 0.7);
                    e.flash = 0.7;
                } else if (def.blink && e.modeT <= 0 && d < 520) {
                    // 闪现狐：紫圈标出落点，0.5 秒后闪现过去
                    e.modeT = 3.5 + Math.random() * 1.5;
                    const a = Math.random() * TAU, tx = px + Math.cos(a) * 75, ty = py + Math.sin(a) * 75, uid = e.uid;
                    this.warnCircle(tx, ty, 26, 0.5, 0xa060ff, () => {
                        if (!e.alive || e.uid !== uid || e.frozen > 0) return;
                        this.burst(e.x, e.y, 0xa070ff, 8, 160);
                        e.x = tx; e.y = ty;
                        e.kx = e.ky = 0;
                        this.burst(tx, ty, 0xa070ff, 8, 160);
                        Sound.play('teleport');
                    });
                    e.x += (dx / d) * sp * dt;
                    e.y += (dy / d) * sp * dt;
                } else if (def.ranged) {
                    // 远程小恶魔：接近到 230 左右后绕着玩家游走，定时投掷火球（出手前闪烁预警）
                    const want = d - 230;
                    const tx = -dy / d, ty = dx / d;
                    const k = Math.max(-1, Math.min(1, want / 60));
                    e.x += ((dx / d) * k + tx * 0.6) * sp * dt;
                    e.y += ((dy / d) * k + ty * 0.6) * sp * dt;
                    e.shootT -= dt;
                    if (e.shootT < 0.35 && e.shootT + dt >= 0.35) { e.flash = 0.3; e.punch = 0.2; }
                    if (e.shootT <= 0 && d < 420) {
                        e.shootT = 2.6 + Math.random() * 0.8;
                        this.fireBullet('fireball', e.x, e.y, Math.atan2(dy, dx), 140, 4 * this.dmgRamp(), { radius: 9 });
                    }
                } else if (this.decoyT > 0 && Math.abs(this.decoyX - e.x) + Math.abs(this.decoyY - e.y) < 700) {
                    // 幻影蛙：附近的怪物改为扑向诱饵
                    const ox = this.decoyX - e.x, oy = this.decoyY - e.y, od = Math.hypot(ox, oy) || 1;
                    if (od > 16) { e.x += (ox / od) * sp * dt; e.y += (oy / od) * sp * dt; }
                } else {
                    e.x += (dx / d) * sp * dt;
                    e.y += (dy / d) * sp * dt;
                }
                if (Math.abs(dx) > despawnX || Math.abs(dy) > despawnY) {
                    // 距离太远：移到玩家前进方向的屏幕外，保持压力
                    const a = Math.atan2(this.dirY, this.dirX) + (Math.random() - 0.5) * 1.6;
                    const r = this.spawnRadius(a);
                    e.x = px + Math.cos(a) * r;
                    e.y = py + Math.sin(a) * r;
                }
            }
            // 击退
            if (e.kx !== 0 || e.ky !== 0) {
                e.x += e.kx * dt;
                e.y += e.ky * dt;
                const f = Math.max(0, 1 - 10 * dt);
                e.kx *= f; e.ky *= f;
                if (Math.abs(e.kx) + Math.abs(e.ky) < 2) e.kx = e.ky = 0;
            }
            // 怪物之间互相推开
            this.grid.query(e.x, e.y, def.radius * 2, q);
            for (let j = 0; j < q.length; j++) {
                const o = q[j];
                if (o === e) continue;
                const ox = e.x - o.x, oy = e.y - o.y;
                const rr = def.radius + o.def.radius;
                const d2 = ox * ox + oy * oy;
                if (d2 < rr * rr && d2 > 0.01) {
                    const od = Math.sqrt(d2);
                    const push = ((rr - od) / od) * (def.boss ? 0.05 : 0.5);
                    e.x += ox * push;
                    e.y += oy * push;
                }
            }
            dx = px - e.x; dy = py - e.y;
            d = Math.hypot(dx, dy);
            // 巨人蘑菇 / 彩虹独角兽：撞到的敌人被碾压击飞
            const trample = this.giantT > 0 || this.epicIs('unicorn');
            if (trample && d < def.radius + (this.giantT > 0 ? 44 : 30) && this.time >= (e.hits.get('crush') || 0)) {
                e.hits.set('crush', this.time + 0.3);
                this.chainBoomQueue.push(() => this.hurtEnemy(e, this.giantT > 0 ? this.skillDmg(20, 3) : this.skillDmg(15, 2.5), 520, px, py, null));
            }
            if (d < def.radius + 12 && def.dmg > 0 && (!trample || def.boss) && (!e.ai || e.ai.touchable)) this.hurtPlayer(def.boss ? def.dmg * 1.3 : def.dmg * this.dmgRamp() * (e.elite ? 1.5 : 1));

            // 动画 & 受击闪烁
            e.anim += dt;
            let frameDirty = false;
            if (e.anim >= def.anim) {
                e.anim = 0;
                e.frame = 1 - e.frame;
                frameDirty = true;
            }
            if (e.flash > 0) {
                e.flash -= dt;
                if (e.flash <= 0) frameDirty = true;
            }
            if (frameDirty) e.sp.spriteFrame = Art.f(def.frames[e.frame] + (e.flash > 0 ? '_w' : ''));
            const s = PX * (def.scale || 1);
            const face = (e.sx || dx) < 0 ? -1 : 1;
            // 受击挤压：横向拉伸、纵向压扁
            let pk = 0;
            if (e.punch > 0) { e.punch -= dt; pk = Math.max(0, e.punch) / 0.12; }
            e.body.setScale(face * s * (1 + 0.3 * pk), s * (1 - 0.2 * pk), 1);
            if (e.ai) {
                e.body.setPosition(0, e.ai.lift);
                const a = Math.round(255 * e.ai.alpha);
                if (e.sp.color.a !== a) e.sp.color = tmpColor.set(255, 255, 255, a);
                e.shadow.active = e.ai.alpha > 0.3;
            }
            e.node.setPosition(e.x, e.y);
        }
    }

    // 简化动画（火盆、金鼠）
    private animEnemy(e: Enemy, dt: number, face: number, _unused: number) {
        e.anim += dt;
        if (e.anim >= e.def.anim) {
            e.anim = 0;
            e.frame = 1 - e.frame;
            e.sp.spriteFrame = Art.f(e.def.frames[e.frame] + (e.flash > 0 ? '_w' : ''));
        }
        if (e.flash > 0) {
            e.flash -= dt;
            if (e.flash <= 0) e.sp.spriteFrame = Art.f(e.def.frames[e.frame]);
        }
        const s = PX * (e.def.scale || 1);
        e.body.setScale(face * s, s, 1);
        e.node.setPosition(e.x, e.y);
    }

    // 动态难度：玩家碾压时逐渐加压，濒危时适当放缓，让不同水平的玩家都处在"刚刚好"的紧张区间
    private updateFlow(dt: number) {
        this.sinceHurt += dt;
        const hpR = this.hp / this.stats.maxHp;
        if (this.time < 30) return;
        if (hpR < 0.35) this.flow -= 0.03 * dt;
        else if (hpR > 0.8 && this.sinceHurt > 6) this.flow += 0.018 * dt;
        else if (hpR > 0.5) this.flow += 0.003 * dt;
        this.flow = Math.max(0.8, Math.min(1.7, this.flow));
    }

    // 心流对怪物血量的影响：低于 1 时线性减弱，高于 1 时超线性增强（只针对碾压中的玩家）
    private flowHp() {
        return this.flow <= 1 ? 0.6 + 0.4 * this.flow : Math.pow(this.flow, 1.5);
    }

    // 小怪接触伤害随时间的成长：前期平缓、后期陡峭（5 分钟 ×1.75，10 分钟 ×3.2，15 分钟 ×5.4）
    private dmgRamp() {
        const m = this.time / 600;
        // 前期额外伤害：开局 ×2.2，8 分钟内线性回落到 ×1（让前期被碰到也有压力）
        const early = 1 + 1.2 * Math.max(0, 1 - this.time / 480);
        return early * 1.3 * (1 + 0.5 * m + 0.85 * m * m) * (this.bloodMoon ? 1.25 : 1) * (0.8 + 0.2 * this.flow) * (this.nightmare ? 1.3 : 1);
    }

    // 每日挑战规则
    mod(id: string) { return !!this.daily && this.daily.mod.id === id; }

    hasB(id: string) {
        for (const b of this.blessings) if (b.id === id) return true;
        return false;
    }

    // 角色专属天赋中按周期触发的部分
    private updateTrait(dt: number) {
        const id = this.char.id;
        if (id !== 'nun' && id !== 'sage' && id !== 'druid' && id !== 'santa') return;
        this.traitT -= dt;
        if (this.traitT > 0) return;
        if (id === 'nun') {
            // 圣光庇护：每 40 秒 1 层护盾（不叠加）
            this.traitT = 40;
            if (this.shieldHits < 1) {
                this.shieldHits = 1;
                this.burst(this.px, this.py, 0x80c0ff, 14, 200);
                Sound.play('power');
            }
        } else if (id === 'sage') {
            // 天雷：3 道落雷
            this.traitT = 7;
            let hit = false;
            for (let i = 0; i < 3; i++) {
                const t = this.randomOnScreen();
                if (!t) break;
                hit = true;
                const f = this.spawnFx('lightning', t.x, t.y, 0.25, PX, 0);
                f.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
                f.sp.color = colorOf(0xd0b0ff);
                const x = t.x, y = t.y;
                this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 40, 12 + this.level * 2, null, 60, 0xc0a0ff, false));
            }
            if (hit) Sound.play('lightning');
        } else if (id === 'druid') {
            // 藤蔓缠绕：定住半径 130 内的敌人
            this.traitT = 9;
            for (const e of this.grid.query(this.px, this.py, 160, this.qbuf).slice()) {
                if (Math.hypot(e.x - this.px, e.y - this.py) < 130 + e.def.radius) this.freezeEnemy(e, 1.5);
            }
            const f = this.spawnFx('aura', this.px, this.py, 0.45, 260 / 64 * 0.5, 1.3);
            f.sp.color = colorOf(0x60c050);
            this.burst(this.px, this.py, 0x60c050, 16, 300);
        } else if (id === 'santa') {
            // 圣诞礼物：身边掉落随机增益道具
            this.traitT = 70;
            const a = Math.random() * Math.PI * 2;
            const kind = Math.random() < 0.2 ? 'magnet' : BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)];
            this.spawnPickup(kind, this.px + Math.cos(a) * 70, this.py + Math.sin(a) * 70, 0, true);
            this.onBanner('圣诞礼物!', new Color(255, 120, 120, 255));
            Sound.play('chest');
        }
    }

    // 全局伤害倍率：狂战士、狂暴药水
    private dmgMul() {
        let m = 1;
        if (this.hasB('berserk')) m *= 1 + 0.8 * (1 - Math.max(0, this.hp) / this.stats.maxHp);
        if (this.potionT > 0) m *= 1.5;
        if (this.isChar('hunter')) m *= 1 + Math.min(0.25, Math.floor(this.kills / 100) * 0.01);
        if (this.ultBuffT > 0) m *= 1.3;
        return m;
    }

    private chainBoomQueue: (() => void)[] = [];

    private freezeEnemy(e: Enemy, t: number) {
        if (!e.alive || e.def.prop) return;
        e.frozen = Math.max(e.frozen, e.def.boss ? t * 0.35 : t);
        e.kx = e.ky = 0;
        e.sp.color = C_FROZEN;
    }

    private hurtEnemy(e: Enemy, dmg: number, knock: number, fromX: number, fromY: number, w: WeaponInst | null) {
        if (!e.alive || (e.ai && e.ai.alpha < 0.3)) return; // 钻地 / 隐身中的 Boss 无法被攻击
        // 暴击
        const crit = !!w && (Math.random() < this.stats.crit + (this.cloverT > 0 ? 0.3 : 0) || (w.evolved && w.def.id === 'cross'));
        if (crit) {
            dmg = Math.round(dmg * this.stats.critDmg);
            if (this.hasB('vampkiss')) this.heal(1);
            if (this.isChar('prism') && Math.random() < 0.35) this.refract(e, dmg);
            if (this.char.charge === 'crit') this.chargeUlt(1 / (150 + this.time * 0.4));
        }
        // 永冻领域：被冻结的敌人受到额外伤害
        if (e.frozen > 0 && this.weapons.some(x => x.evolved && x.def.id === 'frost')) dmg = Math.round(dmg * 1.5);
        const real = Math.min(dmg, Math.max(0, e.hp));
        e.hp -= dmg;
        e.flash = 0.08;
        e.punch = 0.12;
        e.sp.spriteFrame = Art.f(e.def.frames[e.frame] + '_w');
        if (w) w.damage += real;
        this.dmgText(e.x, e.y + 16, dmg, crit ? C_CRIT : C_WHITE, '', crit);
        if (crit) {
            Sound.play('crit');
            this.burst(e.x, e.y, 0xfff0a0, 3, 260);
        } else Sound.play('hit');
        if (e.def.boss) this.addShake(0.08, 3);
        if (knock > 0 && e.sx === 0 && e.sy === 0) {
            const kr = e.def.knockRes || 0;
            const dx = e.x - fromX, dy = e.y - fromY, d = Math.hypot(dx, dy) || 1;
            e.kx = (dx / d) * knock * (1 - kr);
            e.ky = (dy / d) * knock * (1 - kr);
        }
        // 进化武器吸血
        if (w && w.evolved && (w.def.id === 'whip' || w.def.id === 'garlic' || w.def.id === 'spikes') && Math.random() < 0.12) this.heal(1);
        if (e.hp <= 0) this.killEnemy(e);
    }

    private killEnemy(e: Enemy) {
        e.alive = false;
        if (e.def === ENEMIES.altar) {
            // 神兵祭坛被打碎：掉落一把神兵
            this.burst(e.x, e.y, 0xffd860, 30, 320);
            this.burst(e.x, e.y, 0xffffff, 10, 260);
            this.spawnFx('aura', e.x, e.y, 0.5, 1.5, 4).sp.color = colorOf(0xffe080);
            this.spawnEpicPickup(e.x, e.y);
            Sound.play('chest');
            return;
        }
        if (e.def.prop) {
            // 火盆被打破：掉落随机道具
            this.burst(e.x, e.y, 0xf0a030, 14, 220);
            Sound.play('kill');
            let kind = pickWeighted(BRAZIER_DROPS);
            if (kind === 'chicken' && this.mod('gold3')) kind = 'coinbag';
            if (kind === 'epic') this.spawnEpicPickup(e.x, e.y);
            else this.spawnPickup(kind, e.x, e.y, kind === 'coinbag' ? 15 : 0, true);
            return;
        }
        if (e.def.flee) {
            // 抓住金鼠：金币雨
            this.goldRats++;
            for (let i = 0; i < 10; i++) this.spawnPickup('coin', e.x, e.y, 3, true);
            this.spawnPickup('coinbag', e.x, e.y, 40, true);
            this.burst(e.x, e.y, 0xf5c542, 30, 320);
            this.onBanner('抓住金鼠! 金币雨!', new Color(255, 214, 90, 255));
            Sound.play('chest');
        }
        if (e.def.mimic) {
            this.spawnEpicPickup(e.x, e.y);
            this.spawnPickup('coinbag', e.x, e.y, 30, true);
            this.spawnPickup('magnet', e.x, e.y, 0, true);
            this.onBanner('击败宝箱怪! 神兵到手', new Color(255, 215, 90, 255));
        }
        if (e.elite) {
            this.spawnPickup('coinbag', e.x, e.y, 10, true);
            if (Math.random() < 0.04) this.spawnEpicPickup(e.x, e.y);
            else if (Math.random() < 0.3) this.spawnPickup(BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)], e.x, e.y, 0, true);
            for (let i = 0; i < 4; i++) this.spawnPickup('gem', e.x, e.y, e.def.xp * 3, true);
            this.burst(e.x, e.y, 0xf5c542, 24, 300);
            this.addShake(0.15, 5);
        }
        if (this.stats.lifesteal > 0) this.heal(this.stats.lifesteal);
        if (this.hasB('chainboom') && !e.def.boss && Math.random() < 0.15) {
            const x = e.x, y = e.y;
            this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 55, 10 + this.level, null, 120, 0xff8030));
        }
        if (this.isChar('pyro') && !e.def.boss && Math.random() < 0.12) {
            const x = e.x, y = e.y;
            this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 50, 8 + this.level, null, 100, 0xff6020, false));
        }
        this.kills++;
        this.attackKills++;
        if (this.trial) this.trial.got++;
        const ch = this.char.charge;
        if (ch === 'kill' || ch === 'combo') this.chargeUlt((ch === 'combo' ? 1 + Math.min(1, this.combo / 300) : 1) / (170 + this.time * 0.8));
        // 果冻怪：分裂成两只小果冻（放到帧末，避免遍历时修改怪物列表）
        if (e.def.split) {
            const x = e.x, y = e.y, t = e.def.split;
            this.chainBoomQueue.push(() => { for (const o of [-14, 14]) this.summon(t, x + o, y); });
        }
        // 爆炸蘑菇：死亡后红圈预警 0.7 秒再爆炸（伤害玩家，也炸伤周围怪物）
        if (e.def.burst) {
            const x = e.x, y = e.y;
            this.warnCircle(x, y, 70, 0.7, 0xff3030, () => {
                this.explode(x, y, 70, 5 + this.time / 90, 0xff6030);
                this.explodeFriendly(x, y, 60, 12 + this.level, null, 160, 0xff6030, false);
            });
        }
        const tid = ENEMY_IDS.get(e.def);
        if (tid) this.discover('m:' + tid);
        this.addCombo();
        Sound.play('kill');
        // 白色剪影膨胀消散 + 像素碎片
        const s = PX * (e.def.scale || 1);
        const f = this.spawnFx(e.def.frames[e.frame] + '_w', e.x, e.y, 0.16, s, 0.6);
        if ((e.sx || this.px - e.x) < 0) { f.sx = -s; f.node.setScale(-s, s, 1); }
        this.burst(e.x, e.y, e.def.color, e.def.boss ? 50 : 7, e.def.boss ? 420 : 230);
        this.burst(e.x, e.y, 0xffffff, e.def.boss ? 20 : 2, 300);
        if (e.def.boss) {
            this.spawnPickup('chest', e.x, e.y, 0);
            this.spawnPickup('coinbag', e.x + 30, e.y, 30, true);
            if (Math.random() < 0.4) this.spawnPickup('chicken', e.x - 30, e.y, 0, true);
            else this.spawnPickup(BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)], e.x - 30, e.y, 0, true);
            // Boss 有 40% 几率掉落神兵：打完 Boss 有 30 秒的爽快时间
            if (Math.random() < 0.4) this.spawnEpicPickup(e.x, e.y - 30);
            e.ai = null;
            const bid = Object.keys(ENEMIES).find(k => ENEMIES[k] === e.def) || '';
            if (!this.bossKills.includes(bid)) this.bossKills.push(bid);
            // 每击败两个 Boss 获得一张命运卡牌（每局最多 4 张）
            if (this.bossKills.length % 2 === 0 && this.blessings.length + this.pendingBlessings < 4) this.pendingBlessings++;
            if (e.def.final && !this.endless) {
                this.victoryT = 2.5;
                this.onBanner('暗夜魔术师被击败了!', new Color(255, 220, 90, 255));
            } else this.onBanner(`击败 ${e.def.name}!`, new Color(255, 220, 90, 255));
            this.hitstop = 0.35;
            this.addShake(0.6, 14);
            this.spawnFx('aura', e.x, e.y, 0.5, 2, 5);
            Sound.play('bigkill');
        }
        // 开局 3 分钟怪物较少，经验加成 50% 弥补，保证前期升级节奏
        this.spawnPickup('gem', e.x, e.y, e.def.xp * (this.time < 180 ? 1.5 : 1), true);
        const r = Math.random();
        if (r < 0.0025) { if (!this.mod('gold3')) this.spawnPickup('chicken', e.x + 10, e.y, 0); }
        else if (r < 0.0055) this.spawnPickup('magnet', e.x + 10, e.y, 0);
        else {
            // 金币掉率随本局击杀数递减，防止后期金币爆炸；四叶草期间 ×3
            const k = 1 / (1 + this.kills / 1500) * (this.cloverT > 0 ? 3 : 1);
            if (r < 0.0055 + 0.002 * k) this.spawnPickup('coinbag', e.x + 10, e.y, 20);
            else if (r < 0.0055 + 0.02 * k) this.spawnPickup('coin', e.x + 10, e.y, 1 + Math.floor(Math.random() * 2));
        }
    }

    // ------------------------------------------------------------------ 武器

    // 图鉴收录：首次发现时记录，结算时提示
    newCodex: string[] = [];
    chestsOpened = 0;
    discover(key: string) {
        const c = Save.data.codex;
        if (!c || c.includes(key)) return;
        c.push(key);
        this.newCodex.push(key);
    }

    private addWeapon(def: WeaponDef) {
        this.discover('w:' + def.id);
        const w = new WeaponInst(def);
        w.timer = 0.3;
        this.weapons.push(w);
        if (def.id === 'garlic' && !this.garlicAura) {
            this.garlicAura = mkSprite(this.auraLayer, 'aura', 1);
        }
    }

    private updateWeapons(dt: number) {
        const st = this.stats;
        for (const w of this.weapons) {
            const s = w.stats;
            if (w.def.id === 'garlic') {
                this.updateGarlic(w);
                continue;
            }
            if (w.def.id === 'familiar') {
                this.updateFamiliars(w, dt);
                continue;
            }
            w.timer -= dt;
            if (w.timer <= 0 && w.shots <= 0) {
                w.timer = Math.max(0.1, s.cooldown * st.cooldown * this.cdMul());
                if (w.def.id === 'bible') w.timer += Math.min(s.duration * st.duration, 9999);
                w.shots = s.amount + st.amount;
                w.shotIdx = 0;
                w.shotTimer = 0;
                // 回响：15% 几率把这一轮攻击再来一次
                const echo = this.hasB('echo') && Math.random() < 0.15;
                if (w.def.id === 'bible' || w.def.id === 'lightning' || w.def.id === 'frost' || w.def.id === 'chain' || w.def.id === 'spikes' || (w.def.id === 'axe' && w.evolved)) {
                    this.fireAll(w);
                    if (echo && w.def.id !== 'bible') this.later(0.2, () => this.fireAll(w));
                    w.shots = 0;
                } else if (echo) w.shots *= 2;
            }
            if (w.shots > 0) {
                w.shotTimer -= dt;
                while (w.shots > 0 && w.shotTimer <= 0) {
                    this.fireOne(w, w.shotIdx++);
                    w.shots--;
                    w.shotTimer += w.def.id === 'axe' ? 0.15 : w.def.id === 'whip' ? 0.12 : w.def.id === 'bomb' ? 0.25 : w.def.id === 'holy' || w.def.id === 'fire' ? 0.15 : w.def.id === 'cross' ? 0.12 : w.def.id === 'saw' ? 0.15 : w.def.id === 'sonic' ? 0.1 : w.def.id === 'laser' ? (w.evolved ? 0 : 0.18) : 0.07;
                }
            }
        }
    }

    // 冷却倍率：双生之力 / 杀戮狂热
    private cdMul() {
        let m = 1;
        if (this.hasB('twin')) m *= 1.15;
        if (this.hasB('frenzy') && this.combo >= 50) m *= 0.7;
        if (this.overloadOn > 0) m *= 0.5;
        if (this.hasteT > 0) m *= 0.6;
        if (this.arcaneT > 0) m *= 0.7;
        return m;
    }

    isChar(id: string) { return this.char.id === id; }

    // 折射（棱镜蛙）：暴击分出一道光打向附近另一个敌人
    private refract(from: Enemy, dmg: number) {
        let best: Enemy | null = null, bd = 160 * 160;
        for (const e of this.grid.query(from.x, from.y, 160, this.refractBuf)) {
            if (e === from || !e.alive || e.def.prop) continue;
            const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
            if (d < bd) { bd = d; best = e; }
        }
        if (!best) return;
        const t = best;
        this.spawnFx('spark', t.x, t.y, 0.2, PX, 1.5).sp.color = colorOf(0xc0f0ff);
        this.chainBoomQueue.push(() => this.hurtEnemy(t, Math.max(1, Math.round(dmg * 0.5)), 0, from.x, from.y, null));
    }

    private dmgOf(w: WeaponInst) {
        const base = w.stats.damage * this.stats.might * this.dmgMul();
        return Math.max(1, Math.round(base * (0.9 + Math.random() * 0.2)));
    }

    private nearestEnemy(): Enemy | null {
        let best = Infinity, out: Enemy | null = null;
        for (const e of this.enemies) {
            if (!e.alive || e.def.prop) continue;
            const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2;
            if (d < best) { best = d; out = e; }
        }
        return out;
    }

    private randomOnScreen(): Enemy | null {
        const n = this.enemies.length;
        for (let k = 0; k < 12 && n; k++) {
            const e = this.enemies[Math.floor(Math.random() * n)];
            if (e.alive && !e.def.prop && Math.abs(e.x - this.px) < this.vw / 2 && Math.abs(e.y - this.py) < this.vh / 2) return e;
        }
        return null;
    }

    private fireOne(w: WeaponInst, idx: number) {
        this.attackKills = 0;
        this.fireOneInner(w, idx);
        this.checkMultiKill();
    }

    private fireOneInner(w: WeaponInst, idx: number) {
        const st = this.stats, s = w.stats;
        const area = s.area * st.area;
        const spd = s.speed * st.speed;
        switch (w.def.id) {
            case 'whip': {
                const side = idx % 2 === 0 ? this.faceX : -this.faceX;
                const hw = 76 * area, hh = 30 * area;
                const cx = this.px + side * hw, cy = this.py + 4 + Math.floor(idx / 2) * 18;
                const q = this.grid.query(cx, cy, hw + 40, this.qbuf).slice();
                for (const e of q) {
                    if (e.alive && Math.abs(e.x - cx) < hw + e.def.radius && Math.abs(e.y - cy) < hh + e.def.radius) {
                        this.hurtEnemy(e, this.dmgOf(w), 320, this.px, this.py, w);
                    }
                }
                // 鞭影从奶蛙手边向外甩出（锚点在靠近奶蛙的一端）
                const f = this.spawnFx('whip', this.px + side * 8, cy + 6, 0.24, 1, 0);
                f.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
                f.sx = side * (hw * 2 + 10) / 64;
                f.sy = PX * area * 1.15;
                f.stretch = 0.35;
                f.node.setScale(f.sx * 0.15, f.sy, 1);
                if (w.evolved) f.sp.color = C_EVO_RED;
                Sound.play('whip');
                break;
            }
            case 'wand': {
                const t = this.nearestEnemy();
                const a = t ? Math.atan2(t.y - this.py, t.x - this.px) : Math.atan2(this.dirY, this.dirX);
                const p = this.spawnProj('bolt', 'bolt', w, this.px, this.py, Math.cos(a) * 380 * spd, Math.sin(a) * 380 * spd, this.dmgOf(w), s.pierce, 3, 9 * area);
                p.node.setScale(PX * area, PX * area, 1);
                if (w.evolved) p.sp.color = C_EVO;
                Sound.play('shoot');
                break;
            }
            case 'knife': {
                const n = s.amount + st.amount;
                const off = (idx - (n - 1) / 2) * 10;
                const x = this.px - this.dirY * off, y = this.py + this.dirX * off;
                const p = this.spawnProj('knife', 'knife', w, x, y, this.dirX * 620 * spd, this.dirY * 620 * spd, this.dmgOf(w), s.pierce, 2, 8 * area);
                p.node.angle = Math.atan2(this.dirY, this.dirX) * 180 / Math.PI;
                p.node.setScale(PX * area, PX * area, 1);
                if (w.evolved) p.sp.color = C_EVO;
                Sound.play('knife');
                break;
            }
            case 'axe': {
                const dir = idx % 2 === 0 ? this.faceX : -this.faceX;
                const vx = dir * (50 + idx * 35 + Math.random() * 40);
                const p = this.spawnProj('axe', 'axe', w, this.px, this.py + 10, vx, 520 * spd, this.dmgOf(w), s.pierce, 3, 14 * area);
                p.gravity = 1100;
                p.rotSpeed = -dir * 720;
                p.node.setScale(PX * area, PX * area, 1);
                Sound.play('axe');
                break;
            }
            case 'fire': {
                const t = this.randomOnScreen();
                const a = t ? Math.atan2(t.y - this.py, t.x - this.px) : Math.random() * Math.PI * 2;
                const p = this.spawnProj('fireball', 'fireball', w, this.px, this.py, Math.cos(a) * 300 * spd, Math.sin(a) * 300 * spd, this.dmgOf(w), 1, 1.6, 10 * area);
                const sc = PX * area * (w.evolved ? 1.6 : 1);
                p.node.setScale(sc, sc, 1);
                Sound.play('fire');
                break;
            }
            case 'holy': {
                // 投掷到随机敌人脚下
                const t = this.randomOnScreen();
                const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 140;
                const tx = t ? t.x : this.px + Math.cos(a) * r, ty = t ? t.y : this.py + Math.sin(a) * r;
                const fly = 0.45;
                const p = this.spawnProj('flask', 'flask', w, this.px, this.py + 10, (tx - this.px) / fly, (ty - this.py) / fly, 0, 0, fly, 0);
                p.rotSpeed = 720;
                Sound.play('throw');
                break;
            }
            case 'cross': {
                const t = this.nearestEnemy();
                const n = s.amount + st.amount;
                const a = (t ? Math.atan2(t.y - this.py, t.x - this.px) : Math.atan2(this.dirY, this.dirX)) + (idx - (n - 1) / 2) * 0.25;
                const v = 460 * spd;
                const p = this.spawnProj('cross', 'crossp', w, this.px, this.py, Math.cos(a) * v, Math.sin(a) * v, this.dmgOf(w), 999, 2.6, 12 * area);
                p.ax = -Math.cos(a) * v * 0.9;
                p.ay = -Math.sin(a) * v * 0.9;
                p.rotSpeed = 900;
                p.node.setScale(PX * area, PX * area, 1);
                if (w.evolved) p.sp.color = C_EVO;
                Sound.play('throw');
                break;
            }
            case 'laser': {
                // 棱镜激光：瞬发光束，贯穿直线上的所有敌人；进化后扇形三道
                const t = this.nearestEnemy();
                const n = s.amount + st.amount;
                const base = t ? Math.atan2(t.y - this.py, t.x - this.px) : Math.atan2(this.dirY, this.dirX);
                const a = base + (w.evolved ? (idx - (n - 1) / 2) * 0.32 : (idx % 2 ? 1 : -1) * Math.ceil(idx / 2) * 0.12);
                const len = 560, half = 9 * area;
                const dx = Math.cos(a), dy = Math.sin(a);
                const ex = this.px + dx * len, ey = this.py + dy * len;
                const q = this.grid.query(this.px + dx * len / 2, this.py + dy * len / 2, len / 2 + 40, this.qbuf).slice();
                for (const e of q) {
                    if (!e.alive || e.def.prop) continue;
                    const rx = e.x - this.px, ry = e.y - this.py;
                    const along = rx * dx + ry * dy;
                    if (along < 0 || along > len) continue;
                    if (Math.abs(rx * dy - ry * dx) < half + e.def.radius) this.hurtEnemy(e, this.dmgOf(w), 25, this.px, this.py, w);
                }
                const col = w.evolved ? [0xff6080, 0x80ff90, 0x70a0ff][idx % 3] : 0x60e8ff;
                this.lineFx(this.px, this.py, ex, ey, col, half * 2 + 6);
                this.lineFx(this.px, this.py, ex, ey, 0xffffff, Math.max(3, half * 0.7));
                this.spawnFx('spark', this.px + dx * 18, this.py + dy * 18, 0.15, PX * 0.8, 1.5);
                Sound.play('beam');
                break;
            }
            case 'saw': {
                // 弹弹锯：随机方向射出，在屏幕边缘反弹
                const a = Math.random() * TAU, v = 420 * spd;
                const p = this.spawnProj('saw', 'sawblade', w, this.px, this.py, Math.cos(a) * v, Math.sin(a) * v, this.dmgOf(w), 999, s.duration * st.duration, 12 * area);
                p.rotSpeed = 1080;
                p.node.setScale(PX * area * (w.evolved ? 1.2 : 1), PX * area * (w.evolved ? 1.2 : 1), 1);
                if (w.evolved) p.sp.color = C_EVO;
                Sound.play('axe');
                break;
            }
            case 'sonic': {
                // 音波喇叭：面朝方向的扇形冲击波；第二道轰向身后；进化后四面八方 + 震晕
                const n = s.amount + st.amount;
                const base = Math.atan2(this.dirY, this.dirX);
                const a0 = w.evolved ? base + (idx / n) * TAU : base + (idx % 2 ? Math.PI : 0) + Math.floor(idx / 2) * 0.35;
                const L = 190 * area;
                for (const e of this.grid.query(this.px + Math.cos(a0) * L / 2, this.py + Math.sin(a0) * L / 2, L / 2 + 40, this.qbuf).slice()) {
                    if (!e.alive || e.def.prop) continue;
                    const rx = e.x - this.px, ry = e.y - this.py;
                    if (Math.hypot(rx, ry) > L + e.def.radius) continue;
                    let da = Math.atan2(ry, rx) - a0;
                    while (da > Math.PI) da -= TAU;
                    while (da < -Math.PI) da += TAU;
                    if (Math.abs(da) > 0.55) continue;
                    this.hurtEnemy(e, this.dmgOf(w), 480, this.px, this.py, w);
                    if (w.evolved) this.freezeEnemy(e, 0.6);
                }
                for (let k = 0; k < 2; k++) {
                    const f = this.spawnFx('wave', this.px + Math.cos(a0) * (40 + k * 40), this.py + Math.sin(a0) * (40 + k * 40), 0.25 + k * 0.08, PX * area * (0.8 + k * 0.4), 0.5);
                    f.node.angle = a0 * 180 / Math.PI;
                    if (w.evolved) f.sp.color = C_EVO;
                }
                Sound.play('whip');
                break;
            }
            case 'bomb': {
                const a = Math.random() * Math.PI * 2, r = idx === 0 ? 0 : 30 + Math.random() * 30;
                const p = this.spawnProj('bomb', 'bomb_0', w, this.px + Math.cos(a) * r, this.py - 20 + Math.sin(a) * r, 0, 0, this.dmgOf(w), 0, s.duration * st.duration, 0);
                p.node.setScale(PX, PX, 1);
                Sound.play('throw');
                break;
            }
        }
    }

    private fireAll(w: WeaponInst) {
        this.attackKills = 0;
        this.fireAllInner(w);
        this.checkMultiKill();
    }

    // 一次攻击击杀多个敌人：短暂顿帧 + 震屏
    private checkMultiKill() {
        if (this.attackKills >= 5) {
            this.hitstop = Math.max(this.hitstop, 0.03);
            this.addShake(0.12, 4);
        }
    }

    private fireAllInner(w: WeaponInst) {
        const st = this.stats, s = w.stats;
        const n = s.amount + st.amount;
        const area = s.area * st.area;
        if (w.def.id === 'bible') {
            for (let i = 0; i < n; i++) {
                const p = this.spawnProj('bible', 'bible', w, this.px, this.py, 0, 0, 0, 999, Math.min(s.duration * st.duration, 1e6), 12 * area);
                p.angle = (i / n) * Math.PI * 2;
                p.orbitR = 80 * area;
                p.angSpeed = 3.2 * s.speed * st.speed;
                p.node.setScale(PX * area, PX * area, 1);
                if (w.evolved) p.sp.color = C_EVO;
            }
        } else if (w.def.id === 'lightning') {
            const cand = this.enemies.filter(e => e.alive && Math.abs(e.x - this.px) < this.vw / 2 && Math.abs(e.y - this.py) < this.vh / 2);
            if (cand.length) Sound.play('lightning');
            for (let i = 0; i < n && cand.length; i++) {
                // 第一道闪电优先劈屏幕内的 Boss
                const bi = i === 0 ? cand.findIndex(e => !!e.def.boss) : -1;
                const t = cand.splice(bi >= 0 ? bi : Math.floor(Math.random() * cand.length), 1)[0];
                const r = 28 * area;
                const q = this.grid.query(t.x, t.y, r + 30, this.qbuf).slice();
                for (const e of q) {
                    if (e.alive && Math.hypot(e.x - t.x, e.y - t.y) < r + e.def.radius) this.hurtEnemy(e, this.dmgOf(w), 0, t.x, t.y, w);
                }
                const f = this.spawnFx('lightning', t.x, t.y, 0.25, PX, 0);
                f.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
                if (w.evolved) f.sp.color = C_EVO;
                this.spawnFx('spark', t.x, t.y, 0.3, PX * area, 2);
            }
        } else if (w.def.id === 'frost') {
            // 冰霜新星：冰环扩散，伤害并冻结
            const R = 95 * area;
            const q = this.grid.query(this.px, this.py, R + 30, this.qbuf).slice();
            for (const e of q) {
                if (!e.alive || e.def.prop || Math.hypot(e.x - this.px, e.y - this.py) > R + e.def.radius) continue;
                this.hurtEnemy(e, this.dmgOf(w), 0, this.px, this.py, w);
                this.freezeEnemy(e, s.duration * st.duration);
            }
            const f = this.spawnFx('aura', this.px, this.py, 0.4, (R * 2) / 64 * 0.3, 2.3);
            f.sp.color = C_FROZEN;
            this.burst(this.px, this.py, 0xa0e8ff, 16, R * 3);
            Sound.play('freeze');
        } else if (w.def.id === 'chain') {
            // 雷鸣链：从最近的敌人开始，在敌人之间跳跃
            const jumps = n;
            const range = 170 * area;
            let cur = this.nearestEnemy();
            if (!cur || Math.hypot(cur.x - this.px, cur.y - this.py) > 380 * area) return;
            const hit = new Set<Enemy>();
            let fx = this.px, fy = this.py;
            for (let i = 0; i < jumps && cur; i++) {
                hit.add(cur);
                this.lineFx(fx, fy, cur.x, cur.y, w.evolved ? 0xffe060 : 0xa0d0ff, 6);
                const tx = cur.x, ty = cur.y;
                this.hurtEnemy(cur, this.dmgOf(w), 30, fx, fy, w);
                if (w.evolved) this.explodeFriendly(tx, ty, 40, Math.round(this.dmgOf(w) * 0.5), w, 60, 0xffe060, false);
                fx = tx; fy = ty;
                let best = Infinity, nxt: Enemy | null = null;
                const q = this.grid.query(fx, fy, range, this.qbuf);
                for (const e of q) {
                    if (!e.alive || e.def.prop || hit.has(e)) continue;
                    const d = (e.x - fx) ** 2 + (e.y - fy) ** 2;
                    if (d < best && d < range * range) { best = d; nxt = e; }
                }
                cur = nxt;
            }
            Sound.play('zap');
        } else if (w.def.id === 'spikes') {
            // 荆棘地刺：选附近的敌人，依次在脚下刺出（近处优先，避免同一位置重复）
            const R = 260;
            const q = this.grid.query(this.px, this.py, R, this.qbuf).filter(e => e.alive && !e.def.prop && Math.hypot(e.x - this.px, e.y - this.py) < R);
            q.sort((a, b) => ((a.x - this.px) ** 2 + (a.y - this.py) ** 2) - ((b.x - this.px) ** 2 + (b.y - this.py) ** 2));
            for (let i = 0; i < n; i++) {
                let x: number, y: number;
                const e = q[i];
                if (e) { x = e.x; y = e.y; } else { const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 120; x = this.px + Math.cos(a) * r; y = this.py + Math.sin(a) * r; }
                const p = this.spawnProj('spike', 'spike_warn', w, x, y, 0, 0, this.dmgOf(w), 0, 0.22 + i * 0.05, 0);
                p.node.setScale(PX * area, PX * area, 1);
            }
        } else if (w.def.id === 'axe') {
            // 死亡螺旋：环形放射
            const cnt = n + 3;
            for (let i = 0; i < cnt; i++) {
                const a = (i / cnt) * Math.PI * 2;
                const p = this.spawnProj('axe', 'axe', w, this.px, this.py, Math.cos(a) * 280 * s.speed * st.speed, Math.sin(a) * 280 * s.speed * st.speed, this.dmgOf(w), 999, 2.5, 16 * area);
                p.rotSpeed = 900;
                p.node.setScale(PX * area * 1.3, PX * area * 1.3, 1);
                p.sp.color = C_EVO_RED;
            }
            Sound.play('axe');
        }
    }

    private updateGarlic(w: WeaponInst) {
        const area = w.stats.area * this.stats.area;
        const R = 58 * area;
        if (this.garlicAura) {
            const pulse = 1 + Math.sin(this.time * 6) * 0.03;
            this.garlicAura.node.setPosition(this.px, this.py);
            this.garlicAura.node.setScale((R * 2 / 64) * pulse, (R * 2 / 64) * pulse, 1);
            this.garlicAura.color = w.evolved ? C_EVO_RED : C_WHITE;
        }
        const q = this.grid.query(this.px, this.py, R + 30, this.qbuf).slice();
        const interval = Math.max(0.3, w.stats.cooldown * this.stats.cooldown);
        for (const e of q) {
            if (!e.alive) continue;
            if (Math.hypot(e.x - this.px, e.y - this.py) > R + e.def.radius * 0.5) continue;
            const next = e.hits.get('garlic') || 0;
            if (this.time < next) continue;
            e.hits.set('garlic', this.time + interval);
            this.hurtEnemy(e, this.dmgOf(w), 200, this.px, this.py, w);
        }
    }

    // ------------------------------------------------------------------ 弹道

    private spawnProj(kind: string, frame: string, w: WeaponInst | null, x: number, y: number, vx: number, vy: number, dmg: number, pierce: number, life: number, radius: number): Proj {
        let p = this.projPool.pop();
        if (!p) {
            p = new Proj();
            p.sp = mkSprite(this.projLayer, frame);
            p.node = p.sp.node;
        }
        p.sp.spriteFrame = Art.f(frame);
        p.sp.color = C_WHITE;
        p.node.active = true;
        p.node.angle = 0;
        p.kind = kind;
        p.w = w;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.dmg = dmg;
        p.pierce = pierce;
        p.life = life;
        p.radius = radius;
        p.rot = 0;
        p.rotSpeed = 0;
        p.gravity = 0;
        p.tgt = null;
        p.turn = 0;
        p.mini = false;
        p.alive = true;
        p.hit.clear();
        p.node.setPosition(x, y);
        this.projs.push(p);
        return p;
    }

    private freeProj(p: Proj) {
        p.alive = false;
        p.node.active = false;
        this.projPool.push(p);
    }

    private updateProjs(dt: number) {
        for (const p of this.projs) {
            if (!p.alive) continue;
            p.life -= dt;
            if (p.life <= 0) { this.endProj(p); continue; }
            if (p.kind === 'bomb' || p.kind === 'ubomb') {
                // 炸弹：原地闪烁，引信结束后爆炸
                const fast = p.life < 0.5 ? 12 : 5;
                p.sp.spriteFrame = Art.f(Math.floor(p.life * fast) % 2 ? 'bomb_1' : 'bomb_0');
                continue;
            }
            if (p.kind === 'cross') {
                p.vx += p.ax * dt;
                p.vy += p.ay * dt;
                // 开始回旋时允许再次命中
                if (!p.returned && p.vx * p.ax + p.vy * p.ay > 0) { p.returned = true; p.hit.clear(); }
            }
            if (p.turn) {
                // 追踪弹：目标死亡后就近换一个
                if (!p.tgt || !p.tgt.alive) {
                    let bd = 360 * 360;
                    p.tgt = null;
                    for (const e of this.grid.query(p.x, p.y, 360, this.qbuf)) {
                        if (!e.alive || e.def.prop || p.hit.has(e)) continue;
                        const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
                        if (d < bd) { bd = d; p.tgt = e; }
                    }
                }
                if (p.tgt) {
                    const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx);
                    let diff = Math.atan2(p.tgt.y - p.y, p.tgt.x - p.x) - cur;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    const na = cur + Math.max(-p.turn * dt, Math.min(p.turn * dt, diff));
                    p.vx = Math.cos(na) * sp;
                    p.vy = Math.sin(na) * sp;
                    p.node.angle = na * 180 / Math.PI;
                }
            }
            if (p.kind === 'saw') {
                // 屏幕边缘反弹（相对奶蛙的视口）
                const hx = this.vw / 2 - 16, hy = this.vh / 2 - 16;
                if ((p.x - this.px > hx && p.vx > 0) || (p.x - this.px < -hx && p.vx < 0)) p.vx = -p.vx;
                if ((p.y - this.py > hy && p.vy > 0) || (p.y - this.py < -hy && p.vy < 0)) p.vy = -p.vy;
            }
            if (p.kind === 'bible') {
                p.angle += p.angSpeed * dt;
                p.x = this.px + Math.cos(p.angle) * p.orbitR;
                p.y = this.py + Math.sin(p.angle) * p.orbitR;
            } else {
                if (p.gravity) p.vy -= p.gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.rotSpeed) { p.rot += p.rotSpeed * dt; p.node.angle = p.rot; }
            }
            p.node.setPosition(p.x, p.y);
            if (p.kind === 'flask' || p.kind === 'spike') continue;

            const q = this.grid.query(p.x, p.y, p.radius + 32, this.qbuf).slice();
            for (let i = 0; i < q.length && p.alive; i++) {
                const e = q[i];
                if (!e.alive) continue;
                const rr = p.radius + e.def.radius;
                if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
                if (p.kind === 'saw') {
                    // 锯片：同一个敌人每 0.35 秒切一次；进化后迸出火花小爆炸
                    if (this.time < (e.hits.get('saw') || 0)) continue;
                    e.hits.set('saw', this.time + 0.35);
                    this.hurtEnemy(e, p.dmg, 60, p.x, p.y, p.w);
                    if (p.w && p.w.evolved && Math.random() < 0.2) { const x = p.x, y = p.y, d = Math.round(p.dmg * 0.6), w = p.w; this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 40, d, w, 80, 0xffc060, false)); }
                } else if (p.kind === 'bible') {
                    const next = e.hits.get('bible') || 0;
                    if (this.time < next) continue;
                    e.hits.set('bible', this.time + 0.6);
                    this.hurtEnemy(e, p.w ? this.dmgOf(p.w) : 10, 240, this.px, this.py, p.w);
                } else {
                    if (p.hit.has(e)) continue;
                    p.hit.add(e);
                    this.hurtEnemy(e, p.dmg, p.kind === 'axe' ? 110 : 70, p.x - p.vx * 0.01, p.y - p.vy * 0.01, p.w);
                    p.pierce--;
                    if (p.pierce <= 0) this.endProj(p);
                }
            }
            if (p.alive && (Math.abs(p.x - this.px) > this.vw + 200 || Math.abs(p.y - this.py) > this.vh + 200)) p.alive = false;
        }
        // 连锁爆炸放到帧末执行，避免在遍历中修改敌人列表
        if (this.chainBoomQueue.length) {
            const q = this.chainBoomQueue;
            this.chainBoomQueue = [];
            for (const f of q) f();
        }
    }

    // 弹道结束：火球爆炸 / 圣水落地 / 炸弹引爆
    private endProj(p: Proj) {
        if (!p.alive) return;
        p.alive = false;
        const w = p.w;
        if (p.kind === 'ubomb') {
            this.explodeFriendly(p.x, p.y, 95, p.dmg, null, 300, 0xff9030);
            return;
        }
        if (!w) return;
        const st = this.stats, s = w.stats, area = s.area * st.area;
        switch (p.kind) {
            case 'fireball': {
                const big = w.evolved ? 1.6 : 1;
                this.explodeFriendly(p.x, p.y, 42 * area * big, p.dmg, w, 80, 0xff6020);
                this.spawnPZone('fire', w, p.x, p.y, 34 * area * big, s.duration * st.duration * (w.evolved ? 1.5 : 1), Math.max(1, Math.round(s.damage * 0.25 * st.might)));
                break;
            }
            case 'spike': {
                const r = 30 * area;
                const q = this.grid.query(p.x, p.y, r + 30, this.qbuf).slice();
                for (const e of q) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < r + e.def.radius) this.hurtEnemy(e, p.dmg, 20, p.x, p.y - 10, w);
                const f = this.spawnFx('spike', p.x, p.y + 8, 0.35, PX * area, 0.25);
                f.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
                if (w.evolved) f.sp.color = C_EVO_RED;
                this.burst(p.x, p.y, w.evolved ? 0xd02040 : 0x8a6a4a, 4, 120);
                Sound.play('hit');
                break;
            }
            case 'flask':
                this.spawnPZone('holy', w, p.x, p.y, 50 * area, s.duration * st.duration, 0);
                this.burst(p.x, p.y, 0x80b0ff, 10, 200);
                Sound.play('splash');
                break;
            case 'bomb': {
                const r = 85 * area * (p.mini ? 0.55 : 1);
                this.explodeFriendly(p.x, p.y, r, p.dmg, w, 260, 0xff9030);
                if (w.evolved && !p.mini) {
                    for (let i = 0; i < 4; i++) {
                        const a = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
                        const m = this.spawnProj('bomb', 'bomb_0', w, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70, 0, 0, Math.round(p.dmg * 0.5), 0, 0.45 + i * 0.08, 0);
                        m.mini = true;
                        m.node.setScale(PX * 0.7, PX * 0.7, 1);
                    }
                }
                break;
            }
        }
    }

    // 我方范围爆炸
    private explodeFriendly(x: number, y: number, r: number, dmg: number, w: WeaponInst | null, knock: number, color: number, sound = true) {
        if (this.char.charge === 'boom') this.chargeUlt(0.025);
        const q = this.grid.query(x, y, r + 40, this.qbuf).slice();
        for (const e of q) {
            if (e.alive && Math.hypot(e.x - x, e.y - y) < r + e.def.radius) this.hurtEnemy(e, dmg, knock, x, y, w);
        }
        const f = this.spawnFx('aura', x, y, 0.3, (r * 2) / 64 * 0.5, 1.2);
        f.sp.color = colorOf(color);
        this.burst(x, y, color, 10, r * 4);
        this.burst(x, y, 0xffffff, 3, r * 3);
        if (sound) {
            Sound.play('boom');
            this.addShake(0.12, 4);
        }
    }

    // ------------------------------------------------------------------ 我方地面效果

    private spawnPZone(kind: string, w: WeaponInst | null, x: number, y: number, r: number, life: number, dmg: number): PZone {
        let z = this.pzonePool.find(q => q.kind === kind);
        if (z) this.pzonePool.splice(this.pzonePool.indexOf(z), 1);
        else {
            z = new PZone();
            z.sp = mkSprite(this.zoneLayer, kind === 'fire' ? 'flame_0' : 'puddle', 1);
            z.node = z.sp.node;
        }
        z.kind = kind;
        z.w = w;
        z.x = x; z.y = y; z.r = r;
        z.life = z.max = life;
        z.dmg = dmg;
        z.anim = 0;
        z.frame = 0;
        z.sp.spriteFrame = Art.f(kind === 'fire' ? 'flame_0' : 'puddle');
        z.tint = kind === 'poison' ? 0x70d040 : 0xffffff;
        z.alive = true;
        z.node.active = true;
        z.node.setPosition(x, y);
        if (kind === 'fire') z.node.setScale((r * 2) / 32, (r * 1.2) / 20, 1);
        else z.node.setScale((r * 2) / 64, (r * 2 * 0.62) / 40, 1);
        this.pzones.push(z);
        return z;
    }

    private freePZone(z: PZone) {
        z.alive = false;
        z.node.active = false;
        this.pzonePool.push(z);
    }

    private updatePZones(dt: number) {
        for (const z of this.pzones) {
            if (!z.alive) continue;
            z.life -= dt;
            if (z.life <= 0) { z.alive = false; continue; }
            const fade = Math.min(1, z.life * 2);
            z.sp.color = tmpColor.set((z.tint >> 16) & 255, (z.tint >> 8) & 255, z.tint & 255, Math.floor(255 * fade));
            if (z.kind === 'fire') {
                z.anim += dt;
                if (z.anim > 0.12) { z.anim = 0; z.frame = 1 - z.frame; z.sp.spriteFrame = Art.f('flame_' + z.frame); }
            }
            const w = z.w;
            const dmg = z.kind === 'fire' || !w ? z.dmg : this.dmgOf(w);
            const key = 'z' + z.kind;
            const q = this.grid.query(z.x, z.y, z.r + 30, this.qbuf).slice();
            for (const e of q) {
                if (!e.alive || Math.hypot(e.x - z.x, (e.y - z.y) * 1.4) > z.r + e.def.radius * 0.5) continue;
                if (this.time < (e.hits.get(key) || 0)) continue;
                e.hits.set(key, this.time + 0.5);
                this.hurtEnemy(e, dmg, 0, z.x, z.y, w);
            }
            // 圣泉：站在池中回血
            if (z.kind === 'holy' && w && w.evolved && Math.hypot(this.px - z.x, this.py - z.y) < z.r) this.heal(2 * dt);
        }
    }

    // 线段特效（连锁闪电）
    private lineFx(x1: number, y1: number, x2: number, y2: number, color: number, width: number) {
        let l = this.linePool.pop();
        if (!l) {
            l = new LineFx();
            l.sp = mkRect(this.fxLayer, 10, 10, C_WHITE, 'line', 0, 0.5);
            l.node = l.sp.node;
        }
        l.alive = true;
        l.node.active = true;
        l.life = l.max = 0.2;
        l.node.setPosition(x1, y1);
        l.node.angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        l.node.getComponent(UITransform)!.setContentSize(Math.hypot(x2 - x1, y2 - y1), width);
        l.sp.color = colorOf(color);
        this.lines.push(l);
        this.burst(x2, y2, color, 3, 150);
    }

    private freeLine(l: LineFx) {
        l.alive = false;
        l.node.active = false;
        this.linePool.push(l);
    }

    private updateLines(dt: number) {
        for (const l of this.lines) {
            if (!l.alive) continue;
            l.life -= dt;
            if (l.life <= 0) { l.alive = false; continue; }
            const c = l.sp.color;
            l.sp.color = tmpColor.set(c.r, c.g, c.b, Math.floor(255 * l.life / l.max));
        }
    }

    // 精灵使魔：跟随玩家，各自独立射击
    private updateFamiliars(w: WeaponInst, dt: number) {
        const st = this.stats, s = w.stats;
        const n = s.amount + st.amount;
        while (this.familiars.length < n) {
            const sp = mkSprite(this.projLayer, 'familiar_0', PX);
            this.familiars.push({ node: sp.node, sp, x: this.px, y: this.py, t: Math.random() * 0.5 });
        }
        const cd = Math.max(0.15, s.cooldown * st.cooldown * this.cdMul());
        this.familiars.forEach((f, i) => {
            // 绕身后排成一圈，平滑跟随
            const a = this.time * 1.6 + (i / n) * Math.PI * 2;
            const tx = this.px + Math.cos(a) * 46, ty = this.py + 30 + Math.sin(a) * 22;
            const k = Math.min(1, dt * 6);
            f.x += (tx - f.x) * k;
            f.y += (ty - f.y) * k;
            f.node.setPosition(f.x, f.y);
            f.sp.spriteFrame = Art.f(Math.floor(this.time * 8 + i) % 2 ? 'familiar_1' : 'familiar_0');
            if (w.evolved) f.sp.color = C_EVO;
            f.t -= dt;
            if (f.t > 0) return;
            let best = 400 * 400, tgt: Enemy | null = null;
            for (const e of this.enemies) {
                if (!e.alive || e.def.prop) continue;
                const d = (e.x - f.x) ** 2 + (e.y - f.y) ** 2;
                if (d < best) { best = d; tgt = e; }
            }
            if (!tgt) { f.t = 0.2; return; }
            f.t = cd;
            const ang = Math.atan2(tgt.y - f.y, tgt.x - f.x);
            const p = this.spawnProj('fshot', 'fshot', w, f.x, f.y, Math.cos(ang) * 420 * s.speed * st.speed, Math.sin(ang) * 420 * s.speed * st.speed, this.dmgOf(w), s.pierce, 1.5, 6);
            p.node.setScale(PX, PX, 1);
            Sound.play('pew');
        });
    }

    // ------------------------------------------------------------------ 随机事件：火盆 / 金鼠 / 卡牌效果

    // 地图环境危害：冰锥 / 陨石。红圈预警后落下，同时伤害玩家与怪物（可以把怪引过去）
    private updateHazard(dt: number) {
        const hz = this.stage.hazard;
        if (!hz) return;
        this.hazardT -= dt;
        if (this.hazardT > 0) return;
        this.hazardT = hz.interval * (0.8 + Math.random() * 0.4) * (this.bloodMoon ? 0.6 : 1);
        const R = 62, fall = 1.1;
        if (hz.tornado) {
            this.spawnTornado();
            return;
        }
        for (let k = 0; k < hz.count; k++) {
            const a = Math.random() * Math.PI * 2, r = k === 0 ? 40 : 90 + Math.random() * 220;
            const x = this.px + this.mx * 80 + Math.cos(a) * r, y = this.py + this.my * 80 + Math.sin(a) * r;
            if (hz.cloud) {
                // 毒泡：红圈预警 → 喷发 → 留下 4 秒毒云（玩家进入减速掉血，怪物同样受伤）
                this.warnCircle(x, y, R, fall, 0xff3030, () => {
                    this.explode(x, y, R * 0.6, 4 + this.time / 60, hz.color);
                    this.zone(x, y, R, 4, 2 + this.time / 150, 0x60c030);
                    this.spawnPZone('poison', null, x, y, R, 4, 12 + this.level);
                    Sound.play('splash');
                });
                for (let b = 0; b < 3; b++) {
                    const f = this.spawnFx('bubble', x + (b - 1) * 20, y + (b % 2) * 10, fall, PX * (0.6 + b * 0.2), 1.2);
                    f.vy = 30;
                }
                continue;
            }
            // 预警统一用红色（冰面上蓝色看不清）
            this.warnCircle(x, y, R, fall, 0xff3030, () => {
                this.explode(x, y, R, 8 + this.time / 40, hz.color);
                this.explodeFriendly(x, y, R, 30 + this.level * 2, null, 160, hz.color, false);
            });
            const f = this.spawnFx(hz.frame, x, y + 340, fall, PX * 1.5, 0);
            f.vy = -340 / fall;
        }
    }

    // 龙卷风：从屏幕外横穿而过，卷起沿途的怪物，碰到奶蛙会被甩开并受伤
    private spawnTornado() {
        const a = Math.random() * TAU, R = Math.hypot(this.vw, this.vh) / 2 + 60;
        const x = this.px + Math.cos(a) * R, y = this.py + Math.sin(a) * R;
        const to = Math.atan2(this.py - y, this.px - x) + (Math.random() - 0.5) * 0.5;
        const sp = mkSprite(this.bulletLayer, 'tornado_0', PX * 1.6);
        sp.node.setPosition(x, y);
        this.tornados.push({ x, y, vx: Math.cos(to) * 120, vy: Math.sin(to) * 120, t: 13, sp });
        this.onBanner('龙卷风来了!', new Color(230, 200, 130, 255));
        Sound.play('roar');
    }

    private updateTornados(dt: number) {
        if (!this.tornados.length) return;
        for (const t of this.tornados) {
            t.t -= dt;
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            t.sp.node.setPosition(t.x, t.y + 40);
            t.sp.spriteFrame = Art.f(Math.floor(this.time * 10) % 2 ? 'tornado_1' : 'tornado_0');
            t.sp.color = tmpColor.set(255, 255, 255, Math.floor(255 * Math.min(1, t.t)));
            const R = 58;
            for (const e of this.grid.query(t.x, t.y, R + 30, this.qbuf).slice()) {
                if (!e.alive || e.def.prop || e.def.boss || Math.hypot(e.x - t.x, e.y - t.y) > R + e.def.radius) continue;
                if (this.time < (e.hits.get('tornado') || 0)) continue;
                e.hits.set('tornado', this.time + 0.5);
                this.hurtEnemy(e, 30 + this.level * 2, 500, t.x, t.y, null);
            }
            const dx = this.px - t.x, dy = this.py - t.y, d = Math.hypot(dx, dy) || 1;
            if (d < R) {
                // 被卷到：沿切线甩出去
                this.px += (-dy / d * 260 + dx / d * 200) * dt;
                this.py += (dx / d * 260 + dy / d * 200) * dt;
                this.hurtPlayer(6 + this.time / 60);
            }
            if (Math.random() < 0.5) this.burst(t.x + (Math.random() - 0.5) * 50, t.y, 0xd8c090, 1, 120);
            if (t.t <= 0) t.sp.node.destroy();
        }
        this.tornados = this.tornados.filter(t => t.t > 0);
    }

    // 狂风：每 20~26 秒刮一次，持续 4 秒，把奶蛙、怪物和宝石一起吹向同一个方向
    private updateWind(dt: number) {
        if (!this.stage.wind) return;
        if (this.windOn > 0) {
            this.windOn -= dt;
            this.px += this.windX * 70 * dt;
            this.py += this.windY * 70 * dt;
            for (const e of this.enemies) if (e.alive && !e.def.prop && !e.def.boss) { e.x += this.windX * 95 * dt; e.y += this.windY * 95 * dt; }
            if (Math.random() < 0.8) {
                const k = (Math.random() - 0.5) * this.vh;
                this.burst(this.px - this.windX * this.vw * 0.4 - this.windY * k, this.py - this.windY * this.vh * 0.4 + this.windX * k, 0xe8d0a0, 1, 60);
            }
            return;
        }
        this.windT -= dt;
        if (this.windT > 0) return;
        this.windT = 20 + Math.random() * 6;
        this.windOn = 4;
        const a = Math.floor(Math.random() * 4) * Math.PI / 2;
        this.windX = Math.round(Math.cos(a));
        this.windY = Math.round(Math.sin(a));
        this.onBanner(`狂风来袭! ${['→', '↑', '←', '↓'][Math.round(a / (Math.PI / 2)) % 4]}`, new Color(230, 210, 150, 255));
        Sound.play('dash');
    }

    private updateEvents(dt: number) {
        this.updateHazard(dt);
        this.updateTornados(dt);
        this.updateWind(dt);
        // 火盆：附近保持几个可破坏的火盆
        this.brazierT -= dt;
        if (this.brazierT <= 0) {
            this.brazierT = 10;
            let props = 0;
            for (const e of this.enemies) if (e.alive && e.def.prop) props++;
            if (props < 3) {
                const a = Math.random() * Math.PI * 2, r = 260 + Math.random() * 260;
                this.spawnEnemy('brazier', this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, true);
            }
        }
        this.eliteT -= dt;
        // 神兵祭坛：1:40 起约每 150 秒在附近出现一座，打碎得到一把 30 秒神兵
        this.altarT -= dt;
        if (this.altarT <= 0) {
            this.altarT = (140 + Math.random() * 30) * (this.hasB('epicfan') ? 0.6 : 1);
            const a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 120;
            const al = this.spawnEnemy('altar', this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, true)!;
            al.maxHp = al.hp = ENEMIES.altar.hp * (1 + this.time / 120);
            this.onBanner('神兵祭坛出现了! 打碎它!', new Color(255, 220, 110, 255));
            Sound.play('power');
        }
        // 试炼石碑：3:20 起约每 150 秒出现，触碰开启 20 秒限时击杀挑战（Boss 战与红月期间不出现）
        this.shrineT -= dt;
        if (this.shrineT <= 0 && !this.boss && !this.bloodMoon && !this.trial) {
            this.shrineT = 140 + Math.random() * 30;
            const a = Math.random() * Math.PI * 2, r = 220 + Math.random() * 80;
            this.spawnPickup('shrine', this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, this.time + 45);
            this.onBanner('试炼石碑出现了! 触碰开启挑战', new Color(255, 120, 100, 255));
            Sound.play('boss');
        }
        this.updateTrial(dt);
        this.updateItems(dt);
        this.updateRandomEvents(dt);
        // 金鼠
        this.goldratT -= dt;
        if (this.goldratT <= 0) {
            this.goldratT = 100;
            const a = Math.random() * Math.PI * 2, r = 260;
            const g = this.spawnEnemy('goldrat', this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, true)!;
            g.maxHp = g.hp = ENEMIES.goldrat.hp * (1 + this.time / 120);
            g.sp.color = C_ELITE;
            this.onBanner('金鼠出现! 快追!', new Color(255, 214, 90, 255));
            Sound.play('coin');
        }
        // 增益计时
        if (this.potionT > 0) {
            this.potionT -= dt;
            this.playerSp.color = Math.floor(this.time * 10) % 2 ? C_POTION : C_WHITE;
            if (Math.random() < 0.3) this.burst(this.px, this.py - 10, 0xff4060, 1, 60);
        }
        if (this.ghostT > 0) this.ghostT -= dt;
        if (this.shieldHits > 0) {
            if (!this.shieldFx) this.shieldFx = mkSprite(this.auraLayer, 'aura', 1.6);
            this.shieldFx.node.active = true;
            this.shieldFx.node.setPosition(this.px, this.py);
            this.shieldFx.color = C_SHIELD;
            const sc = 1.5 + Math.sin(this.time * 5) * 0.05;
            this.shieldFx.node.setScale(sc, sc, 1);
        } else if (this.shieldFx) this.shieldFx.node.active = false;
        // 超载：每 30 秒 8 秒冷却减半
        if (this.hasB('overload')) {
            if (this.overloadOn > 0) {
                this.overloadOn -= dt;
                if (Math.random() < 0.4) this.burst(this.px, this.py - 10, 0x80d0ff, 1, 120);
            } else {
                this.overloadT -= dt;
                if (this.overloadT <= 0) {
                    this.overloadT = 30;
                    this.overloadOn = 8;
                    this.onBanner('超载!', new Color(140, 210, 255, 255));
                    Sound.play('zap');
                }
            }
        }
        // 时间裂隙
        if (this.hasB('timerift')) {
            this.riftT -= dt;
            if (this.riftT <= 0) {
                this.riftT = 25;
                this.freezeAll(3);
                this.onBanner('时间裂隙!', new Color(160, 220, 255, 255));
            }
        }
        // 磁暴
        if (this.hasB('magstorm')) {
            this.magstormT -= dt;
            if (this.magstormT <= 0) {
                this.magstormT = 45;
                for (const g of this.pickups) if (g.alive && (g.kind === 'gem' || g.kind === 'coin')) g.pulled = true;
            }
        }
        if (this.hasteT > 0) {
            this.hasteT -= dt;
            if (Math.random() < 0.25) this.burst(this.px, this.py - 10, 0x80e0ff, 1, 100);
        }
        if (this.cloverT > 0) {
            this.cloverT -= dt;
            if (Math.random() < 0.2) this.burst(this.px, this.py + 10, 0x70e070, 1, 80);
        }
        if (this.arcaneT > 0) {
            this.arcaneT -= dt;
            if (Math.random() < 0.3) this.burst(this.px, this.py, 0xb080ff, 1, 90);
        }
        // 烈焰之环：每 0.3 秒灼烧半径 100 内的敌人
        if (this.fireT > 0) {
            this.fireT -= dt;
            if (!this.fireFx) this.fireFx = mkSprite(this.auraLayer, 'aura', 1.6);
            this.fireFx.node.active = true;
            this.fireFx.node.setPosition(this.px, this.py);
            this.fireFx.color = C_FIRERING;
            const sc = 3.1 + Math.sin(this.time * 9) * 0.12;
            this.fireFx.node.setScale(sc, sc, 1);
            this.fireTick -= dt;
            if (this.fireTick <= 0) {
                this.fireTick = 0.3;
                const R = 100;
                for (const e of this.grid.query(this.px, this.py, R + 30, this.qbuf).slice()) {
                    if (e.alive && !e.def.prop && Math.hypot(e.x - this.px, e.y - this.py) < R + e.def.radius) this.hurtEnemy(e, 6 + Math.round(this.level * 0.8), 40, this.px, this.py, null);
                }
                const a = Math.random() * Math.PI * 2;
                this.burst(this.px + Math.cos(a) * R * 0.8, this.py + Math.sin(a) * R * 0.8, 0xff8030, 3, 120);
            }
        } else if (this.fireFx) this.fireFx.node.active = false;
        this.updateTrait(dt);
    }

    private freezeAll(t: number) {
        for (const e of this.enemies) if (e.alive) this.freezeEnemy(e, t);
        const f = this.spawnFx('aura', this.px, this.py, 0.6, 2, 10);
        f.sp.color = C_FROZEN;
        Sound.play('freeze');
    }

    // 圣十字：清屏
    private nukeScreen() {
        for (const e of this.enemies) {
            if (!e.alive || e.def.prop || Math.abs(e.x - this.px) > this.vw / 2 + 40 || Math.abs(e.y - this.py) > this.vh / 2 + 40) continue;
            if (e.def.boss) this.hurtEnemy(e, Math.round(e.maxHp * 0.08), 0, this.px, this.py, null);
            else this.hurtEnemy(e, e.hp + 1, 0, this.px, this.py, null);
        }
        const f = this.spawnFx('aura', this.px, this.py, 0.7, 2, 14);
        f.sp.color = colorOf(0xfff0a0);
        this.hitstop = 0.15;
        this.addShake(0.4, 10);
        Sound.play('bigkill');
    }

    // ------------------------------------------------------------------ 大招

    // 持续型大招释放期间不再充能，防止自我循环（地毯轰炸的爆炸、财神到的金币）
    get ultBusy() { return this.ultT > 0 || this.dashT > 0; }

    // 充能先存入 ultBank，由 updateUlt 匀速注入；instant = true 时立刻生效（能量电池）
    chargeUlt(v: number, instant = false) {
        if (this.dead || v <= 0) return;
        if (!instant) {
            if (!this.ultBusy) this.ultBank = Math.min(1, this.ultBank + v * this.ultRate());
            return;
        }
        const was = this.ult;
        this.ult = Math.min(1, this.ult + v);
        if (was < 1 && this.ult >= 1) {
            if (!this.ultReadyShown) {
                this.ultReadyShown = true;
                this.onBanner(`大招「${this.char.ultName}」就绪!`, new Color(255, 220, 110, 255));
            }
            this.burst(this.px, this.py, 0xffe080, 12, 220);
            Sound.play('power');
        }
    }

    // 充能速度倍率：能量涌动卡牌、能量核心被动
    private ultRate() { return (this.hasB('ultfan') ? 1.5 : 1) * (1 + this.stats.ultCharge); }

    useUlt(): boolean {
        if (this.ult < 1 || this.dead || this.ultBusy) return false;
        this.ult = 0;
        this.ultCasts++;
        this.ultTick = 0;
        if (this.hasB('ultfan')) this.ultBuffT = 5;
        this.spawnFx('aura', this.px, this.py, 0.4, 1, 5).sp.color = colorOf(0xffe080);
        this.addShake(0.25, 6);
        this.onBanner(this.char.ultName + '!', new Color(255, 200, 90, 255));
        this.castUlt();
        return true;
    }

    // 技能伤害：随等级成长，吃伤害加成
    private skillDmg(base: number, per: number) {
        return Math.max(1, Math.round((base + this.level * per) * this.stats.might * this.dmgMul() * (0.9 + Math.random() * 0.2)));
    }

    private later(t: number, fn: () => void) { this.tasks.push({ t, fn }); }

    private updateTasks(dt: number) {
        if (!this.tasks.length) return;
        const due: (() => void)[] = [];
        this.tasks = this.tasks.filter(k => { k.t -= dt; if (k.t > 0) return true; due.push(k.fn); return false; });
        for (const f of due) f();
    }

    private castUlt() {
        const px = this.px, py = this.py;
        switch (this.char.id) {
            case 'hunter':
                this.ultT = 2.5;
                break;
            case 'mage':
                // 奥术星雨：30 枚追踪飞弹，以黄金角均匀散开
                for (let i = 0; i < 30; i++) {
                    this.later(i * 0.05, () => {
                        const a = i * 2.39996;
                        const p = this.spawnProj('homing', 'bolt', null, this.px, this.py, Math.cos(a) * 420, Math.sin(a) * 420, this.skillDmg(12, 2.5), 1, 3, 10);
                        p.turn = 7;
                        p.sp.color = colorOf(0xd090ff);
                        p.node.setScale(PX * 1.3, PX * 1.3, 1);
                        if (i % 3 === 0) Sound.play('shoot');
                    });
                }
                this.ultT = 1.6;
                break;
            case 'rogue':
                this.dashT = 0.28;
                this.invulnT = 0.6;
                Sound.play('dash');
                break;
            case 'knight':
                this.ultT = 3;
                this.invulnT = 3;
                Sound.play('slam');
                break;
            case 'nun': {
                const sp = mkSprite(this.zoneLayer, 'aura', 340 / 64);
                sp.node.setPosition(px, py);
                this.sanctum = { x: px, y: py, sp };
                this.ultT = 6;
                Sound.play('heal');
                break;
            }
            case 'pyro': {
                const c = this.densest() || { x: px + this.dirX * 150, y: py + this.dirY * 150 };
                this.warnCircle(c.x, c.y, 190, 0.8, 0xffa030);
                const f = this.spawnFx('meteor', c.x, c.y + 360, 0.8, PX * 4, 0);
                f.vy = -360 / 0.8;
                this.later(0.8, () => {
                    this.explodeFriendly(c.x, c.y, 190, this.skillDmg(70, 9), null, 500, 0xff6020);
                    for (let i = 0; i < 6; i++) {
                        const a = (i / 6) * TAU;
                        this.spawnPZone('fire', null, c.x + Math.cos(a) * 110, c.y + Math.sin(a) * 110, 55, 5, this.skillDmg(6, 1));
                    }
                    this.spawnPZone('fire', null, c.x, c.y, 70, 5, this.skillDmg(6, 1));
                    this.hitstop = 0.12;
                    this.addShake(0.6, 14);
                });
                this.ultT = 1.2;
                Sound.play('fire');
                break;
            }
            case 'bomber': {
                // 地毯轰炸：沿面朝方向一路投下 14 颗炸弹，依次引爆
                const nx = -this.dirY, ny = this.dirX;
                for (let i = 0; i < 12; i++) {
                    const d = 50 + i * 45, side = (i % 2 ? 1 : -1) * 26;
                    const p = this.spawnProj('ubomb', 'bomb_0', null, px + this.dirX * d + nx * side, py + this.dirY * d + ny * side, 0, 0, this.skillDmg(30, 5), 0, 0.4 + i * 0.07, 0);
                    p.node.setScale(PX * 1.2, PX * 1.2, 1);
                }
                this.ultT = 1.5;
                Sound.play('throw');
                break;
            }
            case 'sage':
                this.ultT = 4;
                break;
            case 'druid': {
                // 万木回春：藤蔓把周围敌人拽到身边，随后缠住 3 秒
                for (const e of this.grid.query(px, py, 360, this.qbuf).slice()) {
                    if (!e.alive || e.def.prop || e.def.boss) continue;
                    const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1;
                    if (d > 340) continue;
                    e.frozen = 0;
                    const k = Math.max(0, d - 50) * 10;
                    e.kx = (dx / d) * k;
                    e.ky = (dy / d) * k;
                }
                this.later(0.35, () => {
                    for (const e of this.grid.query(this.px, this.py, 160, this.qbuf).slice()) {
                        if (Math.hypot(e.x - this.px, e.y - this.py) < 140 + e.def.radius) this.freezeEnemy(e, 2.5);
                    }
                    this.burst(this.px, this.py, 0x60c050, 24, 300);
                });
                this.heal(this.stats.maxHp * 0.15);
                const f = this.spawnFx('aura', px, py, 0.6, 680 / 64 * 0.5, -0.8);
                f.sp.color = colorOf(0x60c050);
                this.ultT = 0.5;
                Sound.play('heal');
                break;
            }
            case 'prism':
                // 光谱爆发：三轮 12 道彩虹光束，每轮错开角度
                for (let v = 0; v < 3; v++) {
                    this.later(v * 0.3, () => {
                        for (let i = 0; i < 12; i++) {
                            const a = (i / 12) * TAU + v * 0.13;
                            this.beamHit(this.px, this.py, a, 600, 14, this.skillDmg(16, 2.5), [0xff6080, 0xffc060, 0x80ff90, 0x70a0ff][i % 4]);
                        }
                        Sound.play('beam');
                    });
                }
                this.ultT = 1;
                break;
            case 'fu': {
                // 财神到：身边的小怪全部变成金币（精英与 Boss 只受伤）
                let n = 0;
                for (const e of this.enemies.slice()) {
                    if (!e.alive || e.def.prop || Math.hypot(e.x - px, e.y - py) > 280) continue;
                    if (e.def.boss || e.elite) { this.hurtEnemy(e, Math.round(e.maxHp * (e.elite ? 0.3 : 0.05)), 0, px, py, null); continue; }
                    if (n++ < 70) this.spawnPickup('coin', e.x, e.y, 1 + Math.floor(Math.random() * 2), true);
                    this.burst(e.x, e.y, 0xffd040, 3, 160);
                    this.hurtEnemy(e, e.hp + 1, 0, px, py, null);
                }
                this.later(0.3, () => { for (const g of this.pickups) if (g.alive && (g.kind === 'gem' || g.kind === 'coin')) g.pulled = true; });
                const f = this.spawnFx('aura', px, py, 0.6, 2, 7.5);
                f.sp.color = colorOf(0xffd040);
                this.ultT = 3;
                Sound.play('chest');
                break;
            }
            case 'santa': {
                // 圣诞雪橇：横穿屏幕投下一串礼物炸弹
                const dir = this.faceX, y = py + 60;
                for (let i = 0; i < 10; i++) {
                    const x = px - dir * this.vw / 2 + dir * (i + 0.5) * this.vw / 10, yy = y - (i % 2) * 120;
                    this.later(i * 0.12, () => {
                        const g = this.spawnFx('gift', x, yy + 160, 0.25, PX * 1.4, 0);
                        g.vy = -640;
                        this.later(0.25, () => this.explodeFriendly(x, yy, 85, this.skillDmg(35, 5), null, 260, 0xff5050));
                    });
                }
                const a = Math.random() * TAU;
                this.spawnPickup(BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)], px + Math.cos(a) * 60, py + Math.sin(a) * 60, 0, true);
                this.ultT = 1.6;
                Sound.play('chest');
                break;
            }
        }
    }

    // 影袭结束：在终点爆发一圈飞刀
    private rogueFinale() {
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU;
            const p = this.spawnProj('knife', 'knife', null, this.px, this.py, Math.cos(a) * 620, Math.sin(a) * 620, this.skillDmg(15, 3), 3, 1.2, 10);
            p.node.angle = a * 180 / Math.PI;
            p.node.setScale(PX * 1.2, PX * 1.2, 1);
            p.sp.color = colorOf(0xc0a0ff);
        }
        this.burst(this.px, this.py, 0x8060c0, 20, 300);
        Sound.play('knife');
    }

    // 持续型大招的逐帧效果 + 基础充能
    private updateUlt(dt: number) {
        const ch = this.char.charge;
        if (this.ultBuffT > 0) this.ultBuffT -= dt;
        this.chargeUlt(dt / 100 + (ch === 'time' ? dt / 60 : 0) + (ch === 'still' && !this.moving ? dt / 15 : 0));
        if (this.ult < 1 && this.ultBank > 0) {
            const k = Math.min(this.ultBank, dt / 60 * this.ultRate());
            this.ultBank -= k;
            this.chargeUlt(k, true);
        }
        if (this.ultT <= 0) return;
        this.ultT -= dt;
        this.ultTick -= dt;
        const px = this.px, py = this.py;
        switch (this.char.id) {
            case 'hunter': {
                // 鞭影风暴：双鞭旋转横扫
                if (this.ultTick > 0) break;
                this.ultTick = 0.25;
                const R = 150 * this.stats.area;
                for (const e of this.grid.query(px, py, R + 30, this.qbuf).slice()) {
                    if (e.alive && !e.def.prop && Math.hypot(e.x - px, e.y - py) < R + e.def.radius) this.hurtEnemy(e, this.skillDmg(7, 1.4), 180, px, py, null);
                }
                for (let k = 0; k < 2; k++) {
                    const f = this.spawnFx('whip', px, py, 0.18, 1, 0);
                    f.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
                    f.node.angle = this.time * 520 + k * 180;
                    f.sx = R / 64;
                    f.sy = PX * 1.3;
                    f.stretch = 0.3;
                    f.node.setScale(f.sx * 0.15, f.sy, 1);
                    f.sp.color = C_EVO_RED;
                }
                Sound.play('whip');
                break;
            }
            case 'knight':
                if (this.ultTick > 0) break;
                this.ultTick = 0.5;
                this.explodeFriendly(px, py, 135, this.skillDmg(15, 3), null, 420, 0xffd060, false);
                Sound.play('slam');
                break;
            case 'sage': {
                if (this.ultTick > 0) break;
                this.ultTick = 0.15;
                const b = this.boss;
                const t = b && b.alive && Math.random() < 0.3 && Math.abs(b.x - px) < this.vw / 2 && Math.abs(b.y - py) < this.vh / 2 ? b : this.randomOnScreen();
                if (!t) break;
                const f = this.spawnFx('lightning', t.x, t.y, 0.25, PX, 0);
                f.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
                f.sp.color = colorOf(0xd0b0ff);
                this.explodeFriendly(t.x, t.y, 55, this.skillDmg(22, 3), null, 60, 0xc0a0ff, false);
                Sound.play('lightning');
                break;
            }
            case 'nun': {
                const z = this.sanctum;
                if (!z) break;
                const R = 170;
                const pulse = 1 + Math.sin(this.time * 5) * 0.04;
                z.sp.node.setScale(R * 2 / 64 * pulse, R * 2 / 64 * pulse, 1);
                z.sp.color = tmpColor.set(255, 230, 140, Math.floor(200 * Math.min(1, this.ultT)));
                if (Math.hypot(px - z.x, py - z.y) < R) this.heal(3 * dt);
                // 圣域内的敌方弹幕被净化
                for (const b of this.bullets) {
                    if (b.alive && Math.hypot(b.x - z.x, b.y - z.y) < R) { b.alive = false; this.burst(b.x, b.y, 0xfff0a0, 3, 120); }
                }
                if (this.ultTick <= 0) {
                    this.ultTick = 0.5;
                    for (const e of this.grid.query(z.x, z.y, R + 30, this.qbuf).slice()) {
                        if (e.alive && !e.def.prop && Math.hypot(e.x - z.x, e.y - z.y) < R + e.def.radius) this.hurtEnemy(e, this.skillDmg(8, 1.5), 120, z.x, z.y, null);
                    }
                }
                if (this.ultT <= 0) { z.sp.node.destroy(); this.sanctum = null; }
                break;
            }
        }
    }

    // 敌人最密集的位置（屏幕内有 Boss 时优先 Boss）
    private densest(): { x: number; y: number } | null {
        const b = this.boss;
        if (b && b.alive && Math.abs(b.x - this.px) < this.vw / 2 && Math.abs(b.y - this.py) < this.vh / 2) return { x: b.x, y: b.y };
        let best: Enemy | null = null, bn = -1;
        for (let k = 0; k < 10; k++) {
            const e = this.randomOnScreen();
            if (!e) break;
            const n = this.grid.query(e.x, e.y, 110, this.refractBuf).length;
            if (n > bn) { bn = n; best = e; }
        }
        return best ? { x: best.x, y: best.y } : null;
    }

    // 直线光束：贯穿线上所有敌人
    private beamHit(x: number, y: number, a: number, len: number, half: number, dmg: number, color: number) {
        const dx = Math.cos(a), dy = Math.sin(a);
        for (const e of this.grid.query(x + dx * len / 2, y + dy * len / 2, len / 2 + 40, this.qbuf).slice()) {
            if (!e.alive || e.def.prop) continue;
            const rx = e.x - x, ry = e.y - y, along = rx * dx + ry * dy;
            if (along < 0 || along > len || Math.abs(rx * dy - ry * dx) > half + e.def.radius) continue;
            this.hurtEnemy(e, dmg, 40, x, y, null);
        }
        this.lineFx(x, y, x + dx * len, y + dy * len, color, half * 2 + 6);
        this.lineFx(x, y, x + dx * len, y + dy * len, 0xffffff, Math.max(3, half * 0.7));
    }

    private rainbowC = new Color();
    private rainbow(t: number) {
        return this.rainbowC.set(Math.round(170 + 85 * Math.sin(t)), Math.round(170 + 85 * Math.sin(t + 2.1)), Math.round(170 + 85 * Math.sin(t + 4.2)), 255);
    }

    // ------------------------------------------------------------------ 神兵（30 秒史诗武器）

    epicIs(id: string) { return !!this.epic && this.epic.id === id; }

    private spawnEpicPickup(x: number, y: number) {
        const pool = EPICS.filter(e => e !== this.epic);
        const d = pool[Math.floor(Math.random() * pool.length)];
        this.spawnPickup('epic_' + d.id, x, y, 0, true);
    }

    private startEpic(def: EpicDef) {
        this.endEpic();
        this.epic = def;
        this.epicT = this.epicMax = EPIC_TIME * (this.hasB('epicfan') ? 1.5 : 1) * this.stats.buffTime;
        this.epicTick = this.epicTick2 = 0;
        this.epicsUsed++;
        this.discover('x:' + def.id);
        this.onBanner(`神兵降临 · ${def.name}!`, new Color(255, 215, 90, 255));
        this.spawnFx('aura', this.px, this.py, 0.5, 1.5, 5).sp.color = colorOf(def.color);
        this.burst(this.px, this.py, def.color, 30, 360);
        this.addShake(0.3, 6);
        Sound.play('evolve');
    }

    private endEpic() {
        this.epic = null;
        this.epicT = 0;
        for (const h of this.hammers) h.node.active = false;
    }

    private updateEpic(dt: number) {
        this.updateHoles(dt);
        const ep = this.epic;
        if (!ep) return;
        this.epicT -= dt;
        if (this.epicT <= 0) {
            this.onBanner(`${ep.name}的力量消散了`, new Color(200, 200, 220, 255));
            this.endEpic();
            return;
        }
        this.epicTick -= dt;
        const px = this.px, py = this.py;
        switch (ep.id) {
            case 'thor': {
                // 两柄雷锤环绕砸人 + 连续落雷
                while (this.hammers.length < 2) this.hammers.push(mkSprite(this.projLayer, 'hammer', PX * 1.5));
                for (let i = 0; i < 2; i++) {
                    const h = this.hammers[i], a = this.time * 4 + i * Math.PI;
                    const hx = px + Math.cos(a) * 110, hy = py + Math.sin(a) * 110;
                    h.node.active = true;
                    h.node.setPosition(hx, hy);
                    h.node.angle = (this.time * 900) % 360;
                    for (const e of this.grid.query(hx, hy, 60, this.qbuf).slice()) {
                        if (!e.alive || e.def.prop || Math.hypot(e.x - hx, e.y - hy) > 26 + e.def.radius) continue;
                        if (this.time < (e.hits.get('thor') || 0)) continue;
                        e.hits.set('thor', this.time + 0.4);
                        this.hurtEnemy(e, this.skillDmg(18, 3), 320, px, py, null);
                    }
                }
                if (this.epicTick <= 0) {
                    this.epicTick = 0.35;
                    const t = this.randomOnScreen();
                    if (t) {
                        const f = this.spawnFx('lightning', t.x, t.y, 0.25, PX, 0);
                        f.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
                        f.sp.color = colorOf(0x80c8ff);
                        this.explodeFriendly(t.x, t.y, 45, this.skillDmg(25, 3), null, 80, 0x80c8ff, false);
                        Sound.play('lightning');
                    }
                }
                break;
            }
            case 'gatling': {
                if (this.epicTick > 0) break;
                this.epicTick = 1 / 16;
                const t = this.nearestEnemy();
                const a = (t ? Math.atan2(t.y - py, t.x - px) : Math.atan2(this.dirY, this.dirX)) + (Math.random() - 0.5) * 0.25;
                const p = this.spawnProj('gat', 'starshot', null, px, py, Math.cos(a) * 720, Math.sin(a) * 720, this.skillDmg(7, 1.2), 2, 1.2, 8);
                p.node.setScale(PX, PX, 1);
                p.rotSpeed = 720;
                Sound.play('pew');
                break;
            }
            case 'excalibur': {
                if (this.epicTick > 0) break;
                this.epicTick = 1;
                const R = 190 * this.stats.area;
                for (const e of this.grid.query(px, py, R + 30, this.qbuf).slice()) {
                    if (e.alive && !e.def.prop && Math.hypot(e.x - px, e.y - py) < R + e.def.radius) this.hurtEnemy(e, this.skillDmg(35, 5), 450, px, py, null);
                }
                for (let i = 0; i < 8; i++) {
                    const f = this.spawnFx('holysword', px, py, 0.3, PX * R / 96, 0.15);
                    f.node.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
                    f.node.angle = i * 45 + this.time * 60;
                }
                this.spawnFx('aura', px, py, 0.3, R * 2 / 64 * 0.6, 0.7).sp.color = colorOf(0xfff0a0);
                this.addShake(0.12, 4);
                Sound.play('slam');
                break;
            }
            case 'blackhole': {
                if (this.epicTick > 0) break;
                this.epicTick = 4.5;
                const c = this.densest();
                if (c) this.spawnHole(c.x, c.y);
                break;
            }
            case 'dragon': {
                // 龙息：面朝方向的扇形烈焰
                if (this.epicTick <= 0) {
                    this.epicTick = 0.12;
                    const a0 = Math.atan2(this.dirY, this.dirX), L = 240;
                    for (const e of this.grid.query(px + this.dirX * L / 2, py + this.dirY * L / 2, L / 2 + 40, this.qbuf).slice()) {
                        if (!e.alive || e.def.prop) continue;
                        const rx = e.x - px, ry = e.y - py;
                        if (Math.hypot(rx, ry) > L + e.def.radius) continue;
                        let da = Math.atan2(ry, rx) - a0;
                        while (da > Math.PI) da -= TAU;
                        while (da < -Math.PI) da += TAU;
                        if (Math.abs(da) < 0.45) this.hurtEnemy(e, this.skillDmg(8, 1.5), 60, px, py, null);
                    }
                    for (let k = 0; k < 3; k++) {
                        const d = 40 + Math.random() * (L - 40), a = a0 + (Math.random() - 0.5) * 0.7;
                        this.spawnFx('fireball', px + Math.cos(a) * d, py + Math.sin(a) * d, 0.3, PX * (0.8 + d / L * 1.4), 0.6);
                    }
                    Sound.play('fire');
                }
                this.epicTick2 -= dt;
                if (this.epicTick2 <= 0) {
                    this.epicTick2 = 0.5;
                    this.spawnPZone('fire', null, px + this.dirX * 150, py + this.dirY * 150, 40, 2.5, this.skillDmg(4, 0.8));
                }
                break;
            }
            case 'meteor': {
                if (this.epicTick > 0) break;
                this.epicTick = 0.45;
                const t = this.randomOnScreen();
                if (!t) break;
                const x = t.x, y = t.y;
                const f = this.spawnFx('meteor', x, y + 300, 0.4, PX * 1.6, 0);
                f.vy = -300 / 0.4;
                this.later(0.4, () => this.explodeFriendly(x, y, 75, this.skillDmg(40, 5), null, 260, 0xff8a40));
                break;
            }
            case 'unicorn': {
                // 彩虹独角兽：身后留下伤害敌人的彩虹
                if (this.epicTick > 0 || !this.moving) break;
                this.epicTick = 0.1;
                const z = this.spawnPZone('holy', null, px, py - 20, 28, 1.6, this.skillDmg(5, 1));
                const c = this.rainbow(this.time * 3);
                z.tint = (c.r << 16) | (c.g << 8) | c.b;
                break;
            }
        }
    }

    // 黑洞：吸住周围敌人，2.6 秒后内爆
    private spawnHole(x: number, y: number) {
        const sp = this.holePool.pop() || mkSprite(this.zoneLayer, 'vortex', 1);
        sp.node.active = true;
        sp.node.setPosition(x, y);
        sp.node.setScale(0.1, 0.1, 1);
        this.holes.push({ x, y, t: 2.6, tick: 0, sp });
        Sound.play('teleport');
    }

    private updateHoles(dt: number) {
        if (!this.holes.length) return;
        for (const h of this.holes) {
            h.t -= dt;
            const sc = Math.min(1, (2.6 - h.t) * 4) * 4.2;
            h.sp.node.setScale(sc, sc, 1);
            h.sp.node.angle -= 360 * dt;
            h.tick -= dt;
            const hurt = h.tick <= 0;
            if (hurt) h.tick = 0.25;
            for (const e of this.grid.query(h.x, h.y, 250, this.qbuf).slice()) {
                if (!e.alive || e.def.prop) continue;
                const ox = h.x - e.x, oy = h.y - e.y, od = Math.hypot(ox, oy) || 1;
                if (od > 240) continue;
                if (!e.def.boss) { const st = Math.min(od, 300 * dt); e.x += (ox / od) * st; e.y += (oy / od) * st; }
                if (hurt && od < 80) this.hurtEnemy(e, this.skillDmg(6, 1), 0, h.x, h.y, null);
            }
            if (h.t <= 0) {
                this.explodeFriendly(h.x, h.y, 150, this.skillDmg(50, 6), null, 500, 0xb070ff);
                h.sp.node.active = false;
                this.holePool.push(h.sp);
            }
        }
        this.holes = this.holes.filter(h => h.t > 0);
    }

    // ------------------------------------------------------------------ 新场景道具 / 试炼

    private updateItems(dt: number) {
        if (this.giantT > 0) this.giantT -= dt;
        if (this.bootsT > 0) {
            // 疾风靴：脚下留下燃烧足迹
            this.bootsT -= dt;
            this.bootsTick -= dt;
            if (this.moving && this.bootsTick <= 0) {
                this.bootsTick = 0.12;
                this.spawnPZone('fire', null, this.px, this.py - 24, 22, 2, this.skillDmg(6, 1));
            }
        }
        if (this.bankT > 0) {
            this.bankT -= dt;
            this.bankTick -= dt;
            if (this.bankTick <= 0) {
                this.bankTick = 0.15;
                const a = Math.random() * TAU, r = 60 + Math.random() * 80;
                this.spawnPickup('coin', this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, 1 + Math.floor(Math.random() * 2), true);
            }
        }
        if (this.decoyT > 0 && this.decoySp) {
            this.decoyT -= dt;
            const sp = this.decoySp;
            sp.spriteFrame = Art.f(this.char.sprite + '_' + (Math.floor(this.time * 6) % 2 ? 1 : 2));
            sp.color = tmpColor.set(150, 230, 255, this.decoyT < 2 && Math.floor(this.time * 10) % 2 ? 90 : 190);
            if (this.decoyT <= 0) {
                sp.node.active = false;
                this.explodeFriendly(this.decoyX, this.decoyY, 150, this.skillDmg(40, 5), null, 450, 0x80e0ff);
                this.addShake(0.3, 8);
            }
        }
    }

    // 幻影蛙：在身后放一只诱饵，附近的怪物都去追它
    private spawnDecoy() {
        if (!this.decoySp) this.decoySp = mkSprite(this.auraLayer, this.char.sprite + '_0', HERO_SCALE);
        const a = Math.atan2(this.dirY, this.dirX) + Math.PI;
        this.decoyX = this.px + Math.cos(a) * 90;
        this.decoyY = this.py + Math.sin(a) * 90;
        this.decoyT = 8 * this.stats.buffTime;
        this.decoySp.node.active = true;
        this.decoySp.node.setPosition(this.decoyX, this.decoyY);
        this.burst(this.decoyX, this.decoyY, 0x80e0ff, 16, 220);
        this.onBanner('幻影蛙! 怪物被引开了', new Color(140, 220, 255, 255));
        Sound.play('teleport');
    }

    // 命运骰子：大多是好事，小概率招来精英怪
    private rollDice() {
        const r = Math.random();
        let txt: string;
        if (r < 0.22) { this.spawnEpicPickup(this.px, this.py + 40); txt = '大吉! 神兵降临'; }
        else if (r < 0.42) { this.gainXp(Math.max(0, this.xpNext - this.xp)); txt = '吉! 等级 +1'; }
        else if (r < 0.58) { this.chainBoomQueue.push(() => this.nukeScreen()); txt = '吉! 星光审判'; }
        else if (r < 0.7) { this.heal(this.stats.maxHp); txt = '吉! 生命回满'; }
        else if (r < 0.85) { for (let i = 0; i < 3; i++) this.spawnPickup('coinbag', this.px, this.py, 15, true); txt = '小吉! 金币袋 ×3'; }
        else {
            let wave = WAVES[0];
            for (const w of WAVES) if (this.time >= w.t) wave = w;
            const types = wave.types.filter(k => !ENEMIES[k].ranged);
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * TAU + Math.random(), R = 300;
                const e = this.spawnEnemy(types[i % types.length], this.px + Math.cos(a) * R, this.py + Math.sin(a) * R, true);
                if (e) this.eliteify(e);
            }
            txt = '凶! 精英怪来袭';
        }
        this.onBanner('命运骰子 · ' + txt, new Color(255, 200, 120, 255));
        Sound.play('card');
    }

    private startTrial(x: number, y: number) {
        const need = 40 + Math.floor(this.time / 12);
        this.trial = { t: 20, need, got: 0 };
        this.spawnFx('aura', x, y, 0.5, 1.5, 6).sp.color = colorOf(0xff5040);
        this.burst(x, y, 0xff5040, 24, 320);
        this.onBanner(`试炼开始! 20 秒内击败 ${need} 只怪物`, new Color(255, 100, 90, 255));
        Sound.play('roar');
        this.addShake(0.4, 8);
        // 立刻从四周涌来一圈怪物
        let wave = WAVES[0];
        for (const w of WAVES) if (this.time >= w.t) wave = w;
        const types = wave.types.filter(k => !ENEMIES[k].ranged);
        const R = Math.hypot(this.vw, this.vh) / 2 + 30, n = 26;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            this.spawnEnemy(types[i % types.length], this.px + Math.cos(a) * R, this.py + Math.sin(a) * R, true);
        }
    }

    private updateTrial(dt: number) {
        const tr = this.trial;
        if (!tr) return;
        tr.t -= dt;
        if (tr.got >= tr.need) {
            this.trial = null;
            this.trialsWon++;
            this.pendingChests++;
            this.spawnEpicPickup(this.px, this.py + 50);
            this.spawnPickup('coinbag', this.px, this.py, 25, true);
            this.spawnFx('aura', this.px, this.py, 0.6, 2, 8).sp.color = colorOf(0xffe080);
            this.burst(this.px, this.py, 0xffe080, 30, 380);
            this.onBanner('试炼成功! 获得宝箱与神兵', new Color(255, 220, 90, 255));
            Sound.play('chest');
        } else if (tr.t <= 0) {
            this.trial = null;
            this.onBanner('试炼失败…', new Color(190, 180, 200, 255));
        }
    }


    // ------------------------------------------------------------------ 随机事件：补给空投 / 流星雨 / 宝箱怪

    private updateRandomEvents(dt: number) {
        // 补给空投：2:30 起约每 130 秒，金圈标出落点，3 秒后箱子落地（砸伤落点的怪物），散出补给
        this.dropT -= dt;
        if (this.dropT <= 0) {
            this.dropT = 120 + Math.random() * 25;
            const a = Math.random() * TAU, r = 180 + Math.random() * 100;
            const x = this.px + Math.cos(a) * r, y = this.py + Math.sin(a) * r;
            this.warnCircle(x, y, 70, 3, 0xffd040, () => {
                this.explodeFriendly(x, y, 90, 40 + this.level * 4, null, 400, 0xffd040);
                this.addShake(0.3, 8);
                const loot = [Math.random() < 0.5 ? 'chicken' : 'coinbag', BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)], Math.random() < 0.35 ? 'battery' : 'magnet'];
                for (const k of loot) this.spawnPickup(k, x, y, k === 'coinbag' ? 20 : 0, true);
            });
            const f = this.spawnFx('chest', x, y + 420, 3, PX * 1.6, 0);
            f.vy = -420 / 3;
            this.onBanner('补给空投! 去金圈接住它', new Color(255, 215, 90, 255));
            Sound.play('power');
        }
        // 流星雨：4:00 起约每 3~4 分钟一次（Boss 战时顺延），8 秒内流星接连砸向屏幕内的敌人，砸中掉落额外宝石
        if (this.showerOn > 0) {
            this.showerOn -= dt;
            this.showerTick -= dt;
            if (this.showerTick <= 0) {
                this.showerTick = 0.22;
                const t = this.randomOnScreen();
                if (t) {
                    const x = t.x, y = t.y;
                    const f = this.spawnFx('star', x + 120, y + 320, 0.35, PX * 3, 0);
                    f.vy = -320 / 0.35;
                    this.later(0.35, () => {
                        this.explodeFriendly(x, y, 55, 25 + this.level * 3, null, 120, 0xfff0a0, false);
                        this.spawnPickup('gem', x, y, 3, true);
                    });
                }
            }
        } else {
            this.showerT -= dt;
            if (this.showerT <= 0 && !this.boss) {
                this.showerT = 180 + Math.random() * 60;
                this.showerOn = 8;
                this.showerTick = 0.5;
                this.onBanner('流星雨! 星星砸向怪物', new Color(255, 240, 160, 255));
                Sound.play('lightning');
            }
        }
        // 宝箱怪：5:00 起约每 3 分钟，在附近伪装成宝箱
        this.mimicT -= dt;
        if (this.mimicT <= 0) {
            this.mimicT = 170 + Math.random() * 40;
            const a = Math.random() * TAU, r = 230 + Math.random() * 80;
            const m = this.spawnEnemy('mimic', this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, true);
            if (m) { m.maxHp = m.hp = m.hp * 6; m.mode = 0; }
        }
    }


    // ------------------------------------------------------------------ 拾取物

    private spawnPickup(kind: string, x: number, y: number, value: number, pop = false) {
        if (kind === 'gem' && this.pickups.length > 400) {
            // 太多宝石时先存起来，稍后合成大宝石放到玩家附近，避免卡顿又不浪费经验
            this.stashXp += value;
            return;
        }
        let p = this.pickupPool.pop();
        if (!p) {
            p = new Pickup();
            p.sp = mkSprite(this.pickupLayer, 'gem_blue');
            p.node = p.sp.node;
        }
        let frame = kind;
        if (kind === 'gem') frame = value >= 20 ? 'gem_red' : value >= 3 ? 'gem_green' : 'gem_blue';
        p.node.setScale(PX, PX, 1);
        p.sp.spriteFrame = Art.f(frame);
        p.kind = kind;
        p.value = value;
        p.x = x; p.y = y;
        p.pulled = false;
        p.vel = 0;
        // 掉落时向外弹出
        const pa = Math.random() * Math.PI * 2, ps = pop ? 90 + Math.random() * 90 : 0;
        p.vx = Math.cos(pa) * ps;
        p.vy = Math.sin(pa) * ps;
        p.alive = true;
        p.node.active = true;
        p.node.setPosition(x, y);
        this.pickups.push(p);
    }

    private freePickup(p: Pickup) {
        p.alive = false;
        p.node.active = false;
        this.pickupPool.push(p);
    }

    private updatePickups(dt: number) {
        const mag = this.stats.magnet;
        // 远离屏幕的宝石回收进存量；每隔几秒在玩家附近生成一颗合并后的红宝石
        const farX = this.vw / 2 + 500, farY = this.vh / 2 + 500;
        for (const p of this.pickups) {
            if (p.alive && p.kind === 'gem' && (Math.abs(p.x - this.px) > farX || Math.abs(p.y - this.py) > farY)) {
                this.stashXp += p.value;
                p.alive = false;
            }
        }
        this.stashT -= dt;
        if (this.stashXp > 0 && this.stashT <= 0 && this.pickups.length < 400) {
            this.stashT = 6;
            const a = Math.random() * Math.PI * 2;
            const v = this.stashXp;
            this.stashXp = 0;
            this.spawnPickup('gem', this.px + Math.cos(a) * 220, this.py + Math.sin(a) * 220, v);
            const g = this.pickups[this.pickups.length - 1];
            g.sp.spriteFrame = Art.f('gem_red');
        }
        for (const p of this.pickups) {
            if (!p.alive) continue;
            if (p.vx !== 0 || p.vy !== 0) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                const f = Math.max(0, 1 - 8 * dt);
                p.vx *= f; p.vy *= f;
                if (Math.abs(p.vx) + Math.abs(p.vy) < 5) p.vx = p.vy = 0;
                p.node.setPosition(p.x, p.y);
            }
            const dx = this.px - p.x, dy = this.py - p.y;
            const d = Math.hypot(dx, dy);
            if (p.kind === 'shrine') {
                // 试炼石碑：不会被吸走，45 秒后消失；靠近即开启试炼
                if (this.time > p.value || this.trial) { p.alive = false; this.burst(p.x, p.y, 0x9a90b0, 12, 200); continue; }
                if (d < 40 && !this.boss) { p.alive = false; this.startTrial(p.x, p.y); }
                continue;
            }
            if (!p.pulled && (d < mag || p.kind === 'chest' || p.kind.startsWith('epic_'))) p.pulled = true;
            if (p.pulled) {
                p.vel = Math.min(p.vel + (p.kind === 'chest' ? 300 : 1400) * dt, p.kind === 'chest' ? 400 : 900);
                const step = Math.min(d, p.vel * dt);
                p.x += (dx / (d || 1)) * step;
                p.y += (dy / (d || 1)) * step;
                p.node.setPosition(p.x, p.y);
            }
            if (d < 22) {
                p.alive = false;
                this.collect(p);
            }
        }
    }

    private collect(p: Pickup) {
        if (p.kind.startsWith('epic_')) {
            const def = EPICS.find(x => 'epic_' + x.id === p.kind);
            if (def) this.startEpic(def);
            return;
        }
        if (p.kind !== 'gem' && p.kind !== 'coin') this.discover('i:' + p.kind);
        switch (p.kind) {
            case 'giant':
                this.giantT = 10 * this.stats.buffTime;
                this.onBanner('巨人化! 碾压一切!', new Color(255, 110, 100, 255));
                this.addShake(0.3, 6);
                Sound.play('power');
                break;
            case 'boots':
                this.bootsT = 10 * this.stats.buffTime;
                this.onBanner('疾风靴! 移速 +60%', new Color(120, 190, 255, 255));
                Sound.play('dash');
                break;
            case 'bank':
                this.bankT = 6 * this.stats.buffTime;
                this.onBanner('聚宝盆! 金币涌出!', new Color(255, 214, 90, 255));
                Sound.play('chest');
                break;
            case 'battery':
                this.chargeUlt(1, true);
                Sound.play('power');
                break;
            case 'decoy':
                this.spawnDecoy();
                break;
            case 'dice':
                this.rollDice();
                break;
            case 'haste':
                this.hasteT = 12 * this.stats.buffTime;
                this.onBanner('急速! 冷却 -40%', new Color(140, 230, 255, 255));
                Sound.play('power');
                break;
            case 'clover':
                this.cloverT = 15 * this.stats.buffTime;
                this.onBanner('幸运! 暴击率 +30%', new Color(120, 230, 120, 255));
                Sound.play('power');
                break;
            case 'firering':
                this.fireT = 10 * this.stats.buffTime;
                this.onBanner('烈焰之环!', new Color(255, 140, 60, 255));
                Sound.play('fire');
                break;
            case 'scroll':
                this.gainXp(Math.max(0, this.xpNext - this.xp));
                this.onBanner('智慧卷轴! 等级 +1', new Color(255, 230, 140, 255));
                break;
            case 'gem':
                this.gainXp(p.value * this.stats.growth * (this.mod('xp2') ? 2 : 1));
                Sound.play('gem');
                if (this.hasB('gemstorm') && Math.random() < 0.06) {
                    const t = this.randomOnScreen();
                    if (t) {
                        const f = this.spawnFx('lightning', t.x, t.y, 0.25, PX, 0);
                        f.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0);
                        this.chainBoomQueue.push(() => this.explodeFriendly(t.x, t.y, 50, 20 + this.level * 2, null, 60, 0xa0d0ff, false));
                        Sound.play('lightning');
                    }
                }
                break;
            case 'watch':
                this.freezeAll(5);
                this.onBanner('时间停止!', new Color(160, 220, 255, 255));
                break;
            case 'nuke':
                this.chainBoomQueue.push(() => this.nukeScreen());
                this.onBanner('星光审判!', new Color(255, 240, 160, 255));
                break;
            case 'potion':
                this.potionT = 10 * this.stats.buffTime;
                this.onBanner('狂暴! 伤害 +50% 移速 +30%', new Color(255, 90, 110, 255));
                Sound.play('power');
                break;
            case 'shield':
                this.shieldHits = 3;
                this.onBanner('护盾! 抵挡 3 次伤害', new Color(120, 180, 255, 255));
                Sound.play('power');
                break;
            case 'coin':
            case 'coinbag': {
                const lucky = this.isChar('fu') && Math.random() < 0.2;
                const g = Math.max(1, Math.round(p.value * this.stats.greed * this.stage.goldMul * (this.hasB('greedpact') ? 2 : 1) * (this.mod('gold3') ? 3 : 1) * (this.nightmare ? 1.6 : 1) * (lucky ? 2 : 1)));
                this.gold += g;
                if (this.char.charge === 'gold') this.chargeUlt(g / 40);
                this.dmgText(this.px, this.py + 40, g, C_GOLD, '+');
                Sound.play('coin');
                break;
            }
            case 'chicken':
                this.heal(30);
                this.dmgText(this.px, this.py + 40, 30, C_HEAL, '+');
                Sound.play('heal');
                break;
            case 'magnet':
                for (const g of this.pickups) if (g.alive && (g.kind === 'gem' || g.kind === 'coin')) g.pulled = true;
                Sound.play('heal');
                break;
            case 'chest':
                this.pendingChests++;
                break;
        }
    }

    private gainXp(v: number) {
        this.xp += v;
        while (this.xp >= this.xpNext) {
            this.xp -= this.xpNext;
            this.level++;
            this.xpNext = xpForLevel(this.level);
            this.pendingLevels++;
            if (this.isChar('mage')) this.arcaneT = 4;
            if (this.char.charge === 'level') this.chargeUlt(0.35);
        }
    }

    // ------------------------------------------------------------------ 特效 & 伤害数字

    private spawnFx(frame: string, x: number, y: number, life: number, scale: number, grow: number): Fx {
        let f = this.fxPool.pop();
        if (!f) {
            f = new Fx();
            f.sp = mkSprite(this.fxLayer, frame);
            f.node = f.sp.node;
        }
        f.sp.spriteFrame = Art.f(frame);
        f.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0.5);
        f.node.angle = 0;
        f.node.active = true;
        f.alive = true;
        f.life = f.maxLife = life;
        f.sx = f.sy = scale;
        f.grow = grow;
        f.stretch = 0;
        f.vy = 0;
        f.node.setPosition(x, y);
        f.node.setScale(scale, scale, 1);
        f.sp.color = C_WHITE;
        this.fxs.push(f);
        return f;
    }

    private freeFx(f: Fx) {
        f.alive = false;
        f.node.active = false;
        this.fxPool.push(f);
    }

    private updateFx(dt: number) {
        for (const f of this.fxs) {
            f.life -= dt;
            if (f.life <= 0) { f.alive = false; continue; }
            const t = f.life / f.maxLife;
            const c = f.sp.color;
            tmpColor.set(c.r, c.g, c.b, Math.floor(255 * Math.min(1, t * 1.5)));
            f.sp.color = tmpColor;
            if (f.vy) {
                const p = f.node.position;
                f.node.setPosition(p.x, p.y + f.vy * dt);
            }
            if (f.stretch > 0) {
                const k = Math.min(1, (1 - t) / f.stretch);
                f.node.setScale(f.sx * (0.15 + 0.85 * k), f.sy, 1);
            }
            if (f.grow) {
                const k = 1 + f.grow * (1 - t);
                f.node.setScale(f.sx * Math.max(0.05, k), f.sy * Math.max(0.05, k), 1);
            }
        }
    }

    // 同屏怪物上限（性能模式更低）
    get enemyCap() { return Save.data.lite ? 240 : MAX_ENEMIES; }

    private dmgText(x: number, y: number, v: number, color: Color = C_WHITE, prefix = '', crit = false) {
        if (Save.data.lite && !crit && !prefix) return;
        if (this.texts.length > (crit ? 50 : 36)) return;
        let t = this.textPool.pop();
        if (!t) {
            t = new DmgText();
            t.label = mkLabel(this.textLayer, '', 20, C_WHITE, 'center', 3, true);
            t.node = t.label.node;
        }
        t.label.string = prefix + Math.round(v) + (crit ? '!' : '');
        t.label.color = color;
        t.node.active = true;
        t.alive = true;
        t.life = crit ? 0.8 : 0.6;
        t.age = 0;
        t.big = crit ? 1.6 : 1;
        t.x = x + (Math.random() - 0.5) * 16;
        t.y = y;
        t.vx = (Math.random() - 0.5) * 80;
        t.vy = 160 + Math.random() * 60;
        t.node.setPosition(t.x, t.y);
        t.node.setScale(t.big * 1.8, t.big * 1.8, 1);
        this.texts.push(t);
    }

    private freeText(t: DmgText) {
        t.alive = false;
        t.node.active = false;
        this.textPool.push(t);
    }

    // 伤害数字：弹出放大 → 回弹 → 抛物线落下并淡出
    private updateTexts(dt: number) {
        for (const t of this.texts) {
            t.life -= dt;
            t.age += dt;
            if (t.life <= 0) { t.alive = false; continue; }
            t.vy -= 520 * dt;
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            t.node.setPosition(t.x, t.y);
            const pop = t.age < 0.1 ? 1 + 0.8 * (1 - t.age / 0.1) : 1;
            const sc = t.big * pop;
            t.node.setScale(sc, sc, 1);
            if (t.life < 0.2) {
                const c = t.label.color;
                tmpColor.set(c.r, c.g, c.b, Math.floor(255 * t.life / 0.2));
                t.label.color = tmpColor;
            }
        }
    }

    // ------------------------------------------------------------------ 粒子 / 震屏 / 连杀

    burst(x: number, y: number, color: number, n: number, speed: number) {
        const lite = Save.data.lite;
        if (lite) n = Math.ceil(n / 3);
        for (let i = 0; i < n && this.parts.length < (lite ? 100 : 260); i++) {
            let p = this.partPool.pop();
            if (!p) {
                p = new Particle();
                p.sp = mkRect(this.fxLayer, 1, 1, C_WHITE, 'pt');
                p.node = p.sp.node;
            }
            const a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random() * 0.65);
            p.x = x; p.y = y;
            p.vx = Math.cos(a) * sp;
            p.vy = Math.sin(a) * sp + 60;
            p.life = p.max = 0.3 + Math.random() * 0.3;
            p.size = 4 + Math.floor(Math.random() * 3) * 2;
            p.sp.color = colorOf(color);
            p.node.active = true;
            p.alive = true;
            p.node.setPosition(x, y);
            p.node.setScale(p.size, p.size, 1);
            this.parts.push(p);
        }
    }

    private freePart(p: Particle) {
        p.alive = false;
        p.node.active = false;
        this.partPool.push(p);
    }

    private updateParticles(dt: number) {
        const drag = Math.max(0, 1 - 5 * dt);
        for (const p of this.parts) {
            if (!p.alive) continue;
            p.life -= dt;
            if (p.life <= 0) { p.alive = false; continue; }
            p.vx *= drag;
            p.vy = p.vy * drag - 300 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const k = Math.max(1, Math.round(p.size * (0.4 + 0.6 * p.life / p.max)));
            p.node.setPosition(Math.round(p.x), Math.round(p.y));
            p.node.setScale(k, k, 1);
        }
    }

    addShake(t: number, amp: number) {
        if (this.shake <= 0 || amp >= this.shakeAmp) this.shakeAmp = amp;
        this.shake = Math.max(this.shake, t);
    }

    private addCombo() {
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.comboT = 2.5;
        this.comboPulse = 0.15;
        const ms = [50, 100, 200, 400, 800, 1500];
        const names = ['手感火热!', '越割越爽!', '势不可挡!', '横扫全场!', '无人能挡!', '超神!!'];
        while (this.comboMilestone < ms.length && this.combo >= ms[this.comboMilestone]) {
            this.onBanner(`${ms[this.comboMilestone]} 连击  ${names[this.comboMilestone]}`, new Color(255, 160, 60, 255));
            Sound.play('combo');
            this.comboMilestone++;
        }
    }

    // 升级冲击波：击退周围敌人
    levelBlast() {
        if (this.hasB('holylight')) this.heal(this.stats.maxHp * 0.15);
        // 星爆：全屏伤害（Boss 也会受伤）
        if (this.hasB('nova')) {
            const dmg = 25 + this.level * 4;
            for (const e of this.enemies.slice()) {
                if (e.alive && !e.def.prop && Math.abs(e.x - this.px) < this.vw / 2 + 40 && Math.abs(e.y - this.py) < this.vh / 2 + 40) this.hurtEnemy(e, dmg, 0, this.px, this.py, null);
            }
            const f = this.spawnFx('aura', this.px, this.py, 0.5, 4, 3);
            f.sp.color = colorOf(0xffe080);
            this.addShake(0.25, 8);
            Sound.play('boom');
        }
        for (const e of this.enemies) {
            if (!e.alive || e.def.boss) continue;
            const dx = e.x - this.px, dy = e.y - this.py, d = Math.hypot(dx, dy) || 1;
            if (d > 260) continue;
            const k = 700 * (1 - d / 300) * (1 - (e.def.knockRes || 0) * 0.5);
            e.kx = (dx / d) * k;
            e.ky = (dy / d) * k;
        }
        this.spawnFx('aura', this.px, this.py, 0.45, 1.5, 7);
        this.burst(this.px, this.py, 0x80d0ff, 24, 380);
        this.iframe = Math.max(this.iframe, 0.8);
    }

    // 移除失效对象并回收
    private compact() {
        const sweep = <T extends { alive: boolean }>(arr: T[], free: (x: T) => void) => {
            let j = 0;
            for (const x of arr) { if (x.alive) arr[j++] = x; else free(x); }
            arr.length = j;
        };
        sweep(this.enemies, e => this.freeEnemy(e));
        sweep(this.projs, p => this.freeProj(p));
        sweep(this.pickups, p => this.freePickup(p));
        sweep(this.fxs, f => this.freeFx(f));
        sweep(this.texts, t => this.freeText(t));
        sweep(this.parts, p => this.freePart(p));
        sweep(this.bullets, b => this.freeBullet(b));
        sweep(this.hazards, h => this.freeHazard(h));
        sweep(this.pzones, z => this.freePZone(z));
        sweep(this.lines, l => this.freeLine(l));
    }

    // ------------------------------------------------------------------ 敌方子弹

    fireBullet(frame: string, x: number, y: number, angle: number, speed: number, dmg: number, o: BulletOpts = {}) {
        if (this.bullets.length > 320) return;
        let b = this.bulletPool.pop();
        if (!b) {
            b = new Bullet();
            b.sp = mkSprite(this.bulletLayer, frame);
            b.node = b.sp.node;
        }
        b.sp.spriteFrame = Art.f(frame);
        b.node.active = true;
        b.alive = true;
        b.x = x; b.y = y;
        b.speed = speed;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
        b.dmg = dmg;
        b.o = o;
        b.age = 0;
        b.life = o.life || 6;
        b.radius = o.radius || 8;
        b.node.angle = o.orient ? (angle * 180) / Math.PI : 0;
        b.node.setPosition(x, y);
        this.bullets.push(b);
    }

    private freeBullet(b: Bullet) {
        b.alive = false;
        b.node.active = false;
        this.bulletPool.push(b);
    }

    private updateBullets(dt: number) {
        const far = Math.max(this.vw, this.vh) + 300;
        for (const b of this.bullets) {
            if (!b.alive) continue;
            b.age += dt;
            b.life -= dt;
            const o = b.o;
            if (b.life <= 0) { b.alive = false; continue; }
            if (o.returnAfter !== undefined && b.age > o.returnAfter && o.owner) {
                // 回旋：飞回主人身边
                if (!o.owner.alive) { b.alive = false; continue; }
                const dx = o.owner.x - b.x, dy = o.owner.y - b.y, d = Math.hypot(dx, dy) || 1;
                if (d < 40) { b.alive = false; continue; }
                b.vx = (dx / d) * b.speed * 1.2;
                b.vy = (dy / d) * b.speed * 1.2;
            } else if (o.turn) {
                // 追踪玩家
                const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(this.py - b.y, this.px - b.x);
                let diff = want - cur;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const na = cur + Math.max(-o.turn * dt, Math.min(o.turn * dt, diff));
                b.vx = Math.cos(na) * b.speed;
                b.vy = Math.sin(na) * b.speed;
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (o.spin) b.node.angle += o.spin * dt;
            else if (o.orient) b.node.angle = (Math.atan2(b.vy, b.vx) * 180) / Math.PI;
            b.node.setPosition(b.x, b.y);
            const dx = b.x - this.px, dy = b.y - this.py;
            if (dx * dx + dy * dy < (b.radius + 12) ** 2) {
                this.hurtPlayer(b.dmg);
                if (!o.pierce) {
                    b.alive = false;
                    this.burst(b.x, b.y, 0xffffff, 3, 120);
                }
            }
            if (Math.abs(dx) > far || Math.abs(dy) > far) b.alive = false;
        }
    }

    // ------------------------------------------------------------------ 危险区域

    private newHazard(kind: Hazard['kind'], color: number): Hazard {
        const pool = this.hazardPool;
        let h: Hazard | undefined;
        const circle = kind === 'circle' || kind === 'zone';
        for (let i = pool.length - 1; i >= 0; i--) {
            const c = pool[i].kind === 'circle' || pool[i].kind === 'zone';
            if (c === circle) { h = pool.splice(i, 1)[0]; break; }
        }
        if (!h) {
            h = new Hazard();
            h.sp = circle ? mkSprite(this.hazardLayer, 'warn', 1) : mkRect(this.hazardLayer, 10, 10, C_WHITE, 'hz', 0, 0.5);
            h.node = h.sp.node;
        }
        h.kind = kind;
        h.alive = true;
        h.node.active = true;
        h.node.angle = 0;
        h.onDone = null;
        h.owner = null;
        h.angVel = 0;
        h.color.set((color >> 16) & 255, (color >> 8) & 255, color & 255, 255);
        this.hazards.push(h);
        return h;
    }

    // 圆形预警：dur 秒后执行 onDone
    warnCircle(x: number, y: number, r: number, dur: number, color = 0xff3030, onDone: (() => void) | null = null) {
        const h = this.newHazard('circle', color);
        h.x = x; h.y = y; h.r = r;
        h.life = h.max = dur;
        h.onDone = onDone;
        h.node.setPosition(x, y);
        h.node.setScale((r * 2) / 64, (r * 2) / 64, 1);
    }

    // 直线预警（冲锋 / 激光路径）
    warnLine(x: number, y: number, angle: number, len: number, w: number, dur: number) {
        const h = this.newHazard('line', 0xff3030);
        h.x = x; h.y = y; h.angle = angle; h.len = len; h.w = w;
        h.life = h.max = dur;
        h.node.setPosition(x, y);
        h.node.angle = (angle * 180) / Math.PI;
        h.node.getComponent(UITransform)!.setContentSize(len, w);
    }

    // 激光：跟随 owner，持续伤害，可旋转扫射
    beam(owner: Enemy, angle: number, len: number, w: number, dur: number, angVel: number, dmg: number) {
        const h = this.newHazard('beam', 0xff5050);
        h.owner = owner;
        h.x = owner.x; h.y = owner.y;
        h.angle = angle; h.angVel = angVel;
        h.len = len; h.w = w; h.dmg = dmg;
        h.life = h.max = dur;
        h.node.getComponent(UITransform)!.setContentSize(len, w);
    }

    // 减速冰域：站在里面移动变慢并持续受伤
    zone(x: number, y: number, r: number, dur: number, dmg: number, color: number) {
        const h = this.newHazard('zone', color);
        h.x = x; h.y = y; h.r = r; h.dmg = dmg;
        h.life = h.max = dur;
        h.node.setPosition(x, y);
        h.node.setScale((r * 2) / 64, (r * 2) / 64, 1);
    }

    // 范围爆炸：伤害玩家 + 特效
    explode(x: number, y: number, r: number, dmg: number, color: number) {
        if (Math.hypot(this.px - x, this.py - y) < r + 10) this.hurtPlayer(this.isChar('bomber') ? dmg * 0.5 : dmg);
        const f = this.spawnFx('aura', x, y, 0.35, (r * 2) / 64, 0.6);
        f.sp.color = colorOf(color);
        this.burst(x, y, color, 16, 320);
        this.burst(x, y, 0xffffff, 6, 260);
        this.addShake(0.2, 6);
    }

    private freeHazard(h: Hazard) {
        h.alive = false;
        h.node.active = false;
        this.hazardPool.push(h);
    }

    private updateHazards(dt: number) {
        for (const h of this.hazards) {
            if (!h.alive) continue;
            h.life -= dt;
            const t = 1 - h.life / h.max;
            const c = h.color;
            switch (h.kind) {
                case 'circle': {
                    // 越接近爆发闪得越快
                    const blink = 0.55 + 0.45 * Math.sin(t * t * 40);
                    h.sp.color = tmpColor.set(c.r, c.g, c.b, Math.floor(255 * blink));
                    break;
                }
                case 'line':
                    h.sp.color = tmpColor.set(c.r, c.g, c.b, Math.floor(60 + 80 * (0.5 + 0.5 * Math.sin(t * t * 50))));
                    break;
                case 'beam': {
                    if (!h.owner || !h.owner.alive) { h.alive = false; continue; }
                    h.x = h.owner.x; h.y = h.owner.y;
                    h.angle += h.angVel * dt;
                    h.node.setPosition(h.x, h.y);
                    h.node.angle = (h.angle * 180) / Math.PI;
                    const flick = 0.85 + Math.random() * 0.15;
                    h.node.getComponent(UITransform)!.setContentSize(h.len, h.w * flick);
                    h.sp.color = tmpColor.set(255, 90 + Math.floor(Math.random() * 60), 90, 230);
                    // 玩家到线段距离
                    const ux = Math.cos(h.angle), uy = Math.sin(h.angle);
                    const rx = this.px - h.x, ry = this.py - h.y;
                    const along = rx * ux + ry * uy;
                    if (along > 0 && along < h.len && Math.abs(rx * uy - ry * ux) < h.w / 2 + 8) this.hurtPlayer(h.dmg);
                    if (Math.random() < 0.5) this.burst(h.x + ux * along * Math.random(), h.y + uy * along * Math.random(), 0xffa0a0, 1, 80);
                    break;
                }
                case 'zone': {
                    h.sp.color = tmpColor.set(c.r, c.g, c.b, Math.floor(150 * Math.min(1, h.life * 2)));
                    if (Math.hypot(this.px - h.x, this.py - h.y) < h.r) {
                        this.slowT = 0.15;
                        this.hurtPlayer(h.dmg);
                    }
                    break;
                }
            }
            if (h.life <= 0) {
                h.alive = false;
                if (h.onDone) h.onDone();
            }
        }
    }

    // ------------------------------------------------------------------ 升级 / 宝箱

    private recalcStats() {
        const oldMax = this.stats.maxHp;
        const s: PlayerStats = { ...this.baseStats };
        for (const p of this.passives) {
            const d = p.def;
            if (d.mul) s[d.stat] = this.baseStats[d.stat] * (1 + d.per * p.level);
            else s[d.stat] += d.per * p.level;
        }
        if (this.hasB('glass')) { s.might *= 1.6; s.maxHp *= 0.6; }
        if (this.hasB('giant')) { s.area *= 1.4; s.moveSpeed *= 0.85; }
        if (this.daily && this.daily.mod.id === 'glass') s.might *= 1.4;
        if (this.hasB('twin')) s.amount += 1;
        if (this.hasB('magstorm')) s.magnet *= 2;
        s.cooldown = Math.max(0.3, s.cooldown);
        this.stats = s;
        if (s.maxHp > oldMax) this.hp += s.maxHp - oldMax;
        this.hp = Math.min(this.hp, s.maxHp);
    }

    // 升级选项：带权重抽取 3 个（不放回）
    //   已有武器升级 3、已有被动升级 2、凑进化所需被动 5、前 3 把新武器 2.5、其余新武器 1、新被动 1
    //   让玩家更容易把构筑做深、凑出进化，减少"选项全是没用的"挫败感
    buildOptions(): Option[] {
        const pool: { o: Option; w: number }[] = [];
        const needs = new Map<string, number>();
        for (const w of this.weapons) {
            const evo = w.evo;
            if (evo && !w.evolved) needs.set(evo.passive, Math.max(needs.get(evo.passive) || 0, w.level));
        }
        for (const w of this.weapons) if (w.level < WEAPON_MAX_LEVEL) pool.push({ o: { kind: 'weapon', wdef: w.def, level: w.level + 1 }, w: 3 });
        if (this.weapons.length < MAX_WEAPONS) {
            for (const d of WEAPONS) {
                if (this.weapons.find(w => w.def === d)) continue;
                pool.push({ o: { kind: 'weapon', wdef: d, level: 1 }, w: this.weapons.length < 3 ? 2.5 : 1 });
            }
        }
        for (const p of this.passives) if (p.level < p.def.max) pool.push({ o: { kind: 'passive', pdef: p.def, level: p.level + 1 }, w: 2 });
        if (this.passives.length < MAX_PASSIVES) {
            for (const d of PASSIVES) {
                if (this.passives.find(p => p.def === d)) continue;
                const lv = needs.get(d.id) || 0;
                pool.push({ o: { kind: 'passive', pdef: d, level: 1 }, w: lv >= 5 ? 5 : lv > 0 ? 2 : 1 });
            }
        }
        const out: Option[] = [];
        while (out.length < 3 && pool.length) {
            let sum = 0;
            for (const x of pool) sum += x.w;
            let r = Math.random() * sum, k = 0;
            while (k < pool.length - 1 && (r -= pool[k].w) > 0) k++;
            out.push(pool.splice(k, 1)[0].o);
        }
        if (out.length === 0) out.push({ kind: 'heal', level: 1 }, { kind: 'gold', level: 1 });
        return out;
    }

    applyOption(o: Option) {
        if (o.kind === 'weapon') {
            const w = this.weapons.find(x => x.def === o.wdef);
            if (w) { w.level++; w.recalc(); } else this.addWeapon(o.wdef!);
        } else if (o.kind === 'passive') {
            const p = this.passives.find(x => x.def === o.pdef);
            if (p) p.level++; else { this.passives.push({ def: o.pdef!, level: 1 }); this.discover('p:' + o.pdef!.id); }
            this.recalcStats();
        } else if (o.kind === 'heal') {
            this.heal(30);
        } else {
            this.gold += 25;
        }
    }

    applyBlessing(b: BlessingDef) {
        this.blessings.push(b);
        this.pendingBlessings = Math.max(0, this.pendingBlessings - 1);
        this.recalcStats();
        Sound.play('card');
    }

    // 可进化的武器：满级 + 持有对应被动
    evolvable(): WeaponInst | null {
        for (const w of this.weapons) {
            const evo = w.evo;
            if (!w.evolved && evo && w.level >= WEAPON_MAX_LEVEL && this.passives.find(p => p.def.id === evo.passive)) return w;
        }
        return null;
    }

    evolve(w: WeaponInst) {
        w.evolved = true;
        this.evolvedCount++;
        this.discover('e:' + w.def.id);
        w.recalc();
        w.timer = 0;
        if (w.def.id === 'bible') for (const p of this.projs) if (p.kind === 'bible') p.alive = false;
    }

    // 打开宝箱：优先进化，否则随机升级一项。返回结果描述
    openChest(bonus = false): { icon: string; title: string; desc: string; evolved: boolean; gold: number } {
        if (!bonus) { this.pendingChests--; this.chestsOpened++; }
        const gold = Math.round((20 + 15 * this.bossIdx) * this.stats.greed);
        this.gold += gold;
        const w = this.evolvable();
        if (w) {
            this.evolve(w);
            return { icon: w.icon, title: '进化! ' + w.name, desc: w.evo!.desc, evolved: true, gold };
        }
        const o = this.buildOptions()[0];
        this.applyOption(o);
        const d = describe(o);
        return { icon: d.icon, title: d.name + '  ' + d.tag, desc: d.desc, evolved: false, gold };
    }
}

// 命运卡牌选项与应用（挂在 Battle 原型上，便于 GameRoot 调用）
export function blessingOptions(b: Battle): BlessingDef[] {
    const pool = BLESSINGS.filter(x => !b.blessings.includes(x));
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
}

// 升级选项的展示文本
export function describe(o: Option): { icon: string; name: string; tag: string; desc: string } {
    if (o.kind === 'weapon') {
        const d = o.wdef!;
        return { icon: d.icon, name: d.name, tag: o.level === 1 ? '新武器!' : 'LV ' + o.level, desc: o.level === 1 ? d.desc : d.levels[o.level - 2].desc };
    }
    if (o.kind === 'passive') {
        const d = o.pdef!;
        return { icon: d.icon, name: d.name, tag: o.level === 1 ? '新道具!' : 'LV ' + o.level, desc: d.desc };
    }
    if (o.kind === 'heal') return { icon: 'icon_heal', name: '烤鸡', tag: '', desc: '恢复 30 点生命' };
    return { icon: 'coinbag', name: '金币袋', tag: '', desc: '获得 25 金币' };
}

function pickWeighted(table: [string, number][]): string {
    let sum = 0;
    for (const [, w] of table) sum += w;
    let r = Math.random() * sum;
    for (const [k, w] of table) { r -= w; if (r <= 0) return k; }
    return table[0][0];
}
