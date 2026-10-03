import { Color, Label, Node, Sprite, UITransform } from 'cc';
import { Art } from './Art';
import {
    BASE_STATS, HERO_SCALE, STAGES, StageDef, DAILY_GOAL, DailyMod, BLESSINGS, BlessingDef, BLOOD_MOON, BOSS_SCHEDULE, CharDef, ENDLESS_BOSS_INTERVAL, ENEMIES, ENEMY_IDS, EnemyDef, EVOLUTIONS, EvoDef, MAX_ENEMIES, MAX_PASSIVES, MAX_WEAPONS,
    PASSIVES, PassiveDef, PlayerStats, POWERUPS, PX, SWARM_TIMES, WAVES, WEAPON_MAX_LEVEL, WEAPONS, WeaponDef,
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
const colorCache = new Map<number, Color>();
function colorOf(c: number) {
    let v = colorCache.get(c);
    if (!v) { v = new Color((c >> 16) & 255, (c >> 8) & 255, c & 255, 255); colorCache.set(c, v); }
    return v;
}
const C_EVO = new Color(255, 200, 90, 255);
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
            const sp = 145 * this.stats.moveSpeed * (this.slowT > 0 ? 0.55 : 1) * (this.potionT > 0 ? 1.3 : 1) * (this.ghostT > 0 ? 1.5 : 1);
            this.px += mx * sp * dt;
            this.py += my * sp * dt;
            const l = Math.hypot(mx, my);
            this.dirX = mx / l;
            this.dirY = my / l;
            if (Math.abs(mx) > 0.1) this.faceX = mx > 0 ? 1 : -1;
        }
        this.animT += dt;
        if (moving) {
            if (this.animT > 0.14) { this.animT = 0; this.animF = this.animF === 1 ? 2 : 1; }
        } else this.animF = 0;
        this.playerSp.spriteFrame = Art.f(this.char.sprite + '_' + this.animF);
        this.playerBody.setScale(this.faceX * HERO_SCALE, HERO_SCALE, 1);
        this.player.setPosition(this.px, this.py);

        this.iframe -= dt;
        if (this.slowT > 0) this.slowT -= dt;
        this.playerSp.color = this.iframe > 0 && Math.floor(this.iframe * 20) % 2 === 0 ? C_HURT : C_WHITE;
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.recovery * dt);
        this.hpFill.setScale(Math.max(0, this.hp / this.stats.maxHp), 1, 1);
    }

    hurtPlayer(dmg: number) {
        if (this.iframe > 0) return;
        // 圣盾：抵挡一次伤害
        if (this.shieldHits > 0) {
            this.shieldHits--;
            this.iframe = 0.6;
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
        const d = Math.max(1, dmg * (this.mod('glass') ? 1.5 : 1) - this.stats.armor);
        this.hp -= d;
        this.iframe = Math.max(this.iframe, 0.6);
        this.sinceHurt = 0;
        this.addShake(0.2, 7);
        Sound.play('hurt');
        vibrate();
    }

    private heal(v: number) {
        if (this.hp >= this.stats.maxHp) return;
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
            const count = Math.round((wave.batch + Math.floor(this.time / 120)) * (this.boss ? 0.6 : 1) * (this.hasB('greedpact') ? 1.3 : 1) * (this.endless ? 1 + Math.max(0, this.time - 900) / 600 : 1) * (this.bloodMoon ? 1.8 : 1) * this.flow * (this.mod('horde') ? 1.4 : 1));
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
        const early = Math.min(1, 0.3 + t / 220); // 0:00 约 0.3 倍，约 2.5 分钟到 1 倍
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
            e.elite = true;
            e.maxHp = e.hp = e.hp * 8;
            e.sp.color = C_ELITE;
            e.body.setScale(PX * s * 1.5, PX * s * 1.5, 1);
        }
        this.enemies.push(e);
        return e;
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
                if (def.ranged) {
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
            if (d < def.radius + 12 && def.dmg > 0 && (!e.ai || e.ai.touchable)) this.hurtPlayer(def.boss ? def.dmg * 1.3 : def.dmg * this.dmgRamp() * (e.elite ? 1.5 : 1));

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
        if (this.time < 60) return;
        if (hpR < 0.35) this.flow -= 0.03 * dt;
        else if (hpR > 0.8 && this.sinceHurt > 6) this.flow += 0.012 * dt;
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

    // 全局伤害倍率：狂战士、狂暴药水
    private dmgMul() {
        let m = 1;
        if (this.hasB('berserk')) m *= 1 + 0.8 * (1 - Math.max(0, this.hp) / this.stats.maxHp);
        if (this.potionT > 0) m *= 1.5;
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
        if (!e.alive) return;
        // 暴击
        const crit = !!w && (Math.random() < this.stats.crit || (w.evolved && w.def.id === 'cross'));
        if (crit) {
            dmg = Math.round(dmg * this.stats.critDmg);
            if (this.hasB('vampkiss')) this.heal(1);
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
        if (e.def.prop) {
            // 火盆被打破：掉落随机道具
            this.burst(e.x, e.y, 0xf0a030, 14, 220);
            Sound.play('kill');
            const r = Math.random();
            const kind = r < 0.3 ? (this.mod('gold3') ? 'coinbag' : 'chicken') : r < 0.48 ? 'coinbag' : r < 0.58 ? 'magnet' : r < 0.69 ? 'watch' : r < 0.79 ? 'nuke' : r < 0.9 ? 'potion' : 'shield';
            this.spawnPickup(kind, e.x, e.y, kind === 'coinbag' ? 15 : 0, true);
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
        if (e.elite) {
            this.spawnPickup('coinbag', e.x, e.y, 10, true);
            if (Math.random() < 0.25) this.spawnPickup(Math.random() < 0.5 ? 'potion' : 'shield', e.x, e.y, 0, true);
            for (let i = 0; i < 4; i++) this.spawnPickup('gem', e.x, e.y, e.def.xp * 3, true);
            this.burst(e.x, e.y, 0xf5c542, 24, 300);
            this.addShake(0.15, 5);
        }
        if (this.stats.lifesteal > 0) this.heal(this.stats.lifesteal);
        if (this.hasB('chainboom') && !e.def.boss && Math.random() < 0.15) {
            const x = e.x, y = e.y;
            this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 55, 10 + this.level, null, 120, 0xff8030));
        }
        this.kills++;
        this.attackKills++;
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
            this.spawnPickup('chicken', e.x - 30, e.y, 0, true);
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
        if (r < 0.006) { if (!this.mod('gold3')) this.spawnPickup('chicken', e.x + 10, e.y, 0); }
        else if (r < 0.009) this.spawnPickup('magnet', e.x + 10, e.y, 0);
        else {
            // 金币掉率随本局击杀数递减，防止后期金币爆炸
            const k = 1 / (1 + this.kills / 1500);
            if (r < 0.009 + 0.002 * k) this.spawnPickup('coinbag', e.x + 10, e.y, 20);
            else if (r < 0.009 + 0.02 * k) this.spawnPickup('coin', e.x + 10, e.y, 1 + Math.floor(Math.random() * 2));
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
                if (w.def.id === 'bible' || w.def.id === 'lightning' || w.def.id === 'frost' || w.def.id === 'chain' || w.def.id === 'spikes' || (w.def.id === 'axe' && w.evolved)) {
                    this.fireAll(w);
                    w.shots = 0;
                }
            }
            if (w.shots > 0) {
                w.shotTimer -= dt;
                while (w.shots > 0 && w.shotTimer <= 0) {
                    this.fireOne(w, w.shotIdx++);
                    w.shots--;
                    w.shotTimer += w.def.id === 'axe' ? 0.15 : w.def.id === 'whip' ? 0.12 : w.def.id === 'bomb' ? 0.25 : w.def.id === 'holy' || w.def.id === 'fire' ? 0.15 : w.def.id === 'cross' ? 0.12 : w.def.id === 'laser' ? (w.evolved ? 0 : 0.18) : 0.07;
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
        return m;
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
            if (p.kind === 'bomb') {
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
                if (p.kind === 'bible') {
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

    private spawnPZone(kind: string, w: WeaponInst | null, x: number, y: number, r: number, life: number, dmg: number) {
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

    private updateEvents(dt: number) {
        this.updateHazard(dt);
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
            if (!p.pulled && (d < mag || p.kind === 'chest')) p.pulled = true;
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
        switch (p.kind) {
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
                this.potionT = 10;
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
                const g = Math.max(1, Math.round(p.value * this.stats.greed * this.stage.goldMul * (this.hasB('greedpact') ? 2 : 1) * (this.mod('gold3') ? 3 : 1) * (this.nightmare ? 1.6 : 1)));
                this.gold += g;
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
        if (Math.hypot(this.px - x, this.py - y) < r + 10) this.hurtPlayer(dmg);
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
