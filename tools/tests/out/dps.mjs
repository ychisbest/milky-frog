var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res2) => function __init() {
  return fn && (res2 = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res2;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// ../promo/cc.ts
import { createRequire } from "node:module";
var Vec3, Vec2, Rect, Size, Color, Layers, nodeCount, Component, Node, UITransform, SpriteFrame, Sprite, Label, Canvas, ImageAsset, Texture2D, view, ResolutionPolicy, store, sys, game, Game, AudioClip, sfxLog, AudioSource, require2, resources, Input, inputHandlers, input, KeyCode, Director, director, _decorator;
var init_cc = __esm({
  "../promo/cc.ts"() {
    Vec3 = class {
      constructor(x = 0, y = 0, z = 0) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.x = x;
        this.y = y;
        this.z = z;
      }
      set(x, y = 0, z = 0) {
        if (typeof x === "object") {
          this.x = x.x;
          this.y = x.y;
          this.z = x.z;
        } else {
          this.x = x;
          this.y = y;
          this.z = z;
        }
        return this;
      }
    };
    Vec2 = class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
    };
    Rect = class {
      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
      }
    };
    Size = class {
      constructor(width = 0, height = 0) {
        this.width = width;
        this.height = height;
      }
    };
    Color = class _Color {
      constructor(r = 255, g2 = 255, b = 255, a = 255) {
        this.r = 255;
        this.g = 255;
        this.b = 255;
        this.a = 255;
        this.r = r;
        this.g = g2;
        this.b = b;
        this.a = a;
      }
      static {
        this.WHITE = new _Color();
      }
      set(r, g2 = 0, b = 0, a = 255) {
        if (typeof r === "object") {
          this.r = r.r;
          this.g = r.g;
          this.b = r.b;
          this.a = r.a;
        } else {
          this.r = r;
          this.g = g2;
          this.b = b;
          this.a = a;
        }
        return this;
      }
    };
    Layers = { Enum: { UI_2D: 1 << 25, DEFAULT: 1 << 30 } };
    nodeCount = 0;
    Component = class {
      getComponent(c) {
        return this.node.getComponent(c);
      }
      scheduleOnce(cb) {
        cb();
      }
    };
    Node = class {
      constructor(name = "") {
        this.children = [];
        this.parent = null;
        this.active = true;
        this.layer = 0;
        this.angle = 0;
        this.position = new Vec3();
        this.scale = new Vec3(1, 1, 1);
        this.comps = [];
        this.handlers = {};
        this.name = name;
        nodeCount++;
      }
      static {
        this.EventType = { TOUCH_START: "ts", TOUCH_MOVE: "tm", TOUCH_END: "te", TOUCH_CANCEL: "tc" };
      }
      addChild(n) {
        n.parent = this;
        this.children.push(n);
      }
      setPosition(x, y = 0, z = 0) {
        if (typeof x === "object") this.position.set(x);
        else {
          if (!isFinite(x) || !isFinite(y)) throw new Error("NaN pos " + this.name);
          this.position.set(x, y, z);
        }
      }
      setScale(x, y = 0, z = 1) {
        if (typeof x === "object") {
          this.scale.set(x);
          return;
        }
        if (!isFinite(x) || !isFinite(y)) throw new Error("NaN scale " + this.name);
        this.scale.set(x, y, z);
      }
      addComponent(C) {
        if (C !== UITransform && C.requires && !this.getComponent(UITransform)) this.addComponent(UITransform);
        if (this.getComponent(C)) throw new Error("dup comp " + C.name + " on " + this.name);
        const c = new C();
        c.node = this;
        this.comps.push(c);
        return c;
      }
      getComponent(C) {
        return this.comps.find((c) => c instanceof C) || null;
      }
      getComponentInChildren(C) {
        return this.getComponent(C) || this.children.map((c) => c.getComponentInChildren(C)).find(Boolean) || null;
      }
      on(ev, cb, t) {
        this.handlers[ev] = cb.bind(t);
      }
      emit(ev, e) {
        this.handlers[ev]?.(e);
      }
      destroyAllChildren() {
        this.children = [];
      }
      setSiblingIndex(i) {
        if (!this.parent) return;
        const a = this.parent.children;
        a.splice(a.indexOf(this), 1);
        a.splice(Math.min(i, a.length), 0, this);
      }
      removeAllChildren() {
        this.children = [];
      }
      destroy() {
        if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
      }
    };
    UITransform = class extends Component {
      constructor() {
        super(...arguments);
        this.w = 100;
        this.h = 100;
        this.ax = 0.5;
        this.ay = 0.5;
      }
      setContentSize(w, h) {
        if (!isFinite(w) || !isFinite(h)) throw new Error("NaN size");
        this.w = w;
        this.h = h;
      }
      setAnchorPoint(x, y) {
        this.ax = x;
        this.ay = y;
      }
      convertToNodeSpaceAR(v, o) {
        return o.set(v.x - 640, v.y - 360, 0);
      }
    };
    SpriteFrame = class {
      constructor() {
        this.rect = new Rect();
      }
      reset(i) {
        this.rect = i.rect;
      }
      addRef() {
      }
    };
    Sprite = class extends Component {
      constructor() {
        super(...arguments);
        this.sizeMode = 0;
        this.type = 0;
        this.trim = true;
        this._c = new Color();
        this._sf = null;
      }
      static {
        this.requires = true;
      }
      static {
        this.SizeMode = { RAW: 2, CUSTOM: 0 };
      }
      static {
        this.Type = { TILED: 2 };
      }
      get color() {
        return this._c;
      }
      set color(v) {
        this._c = new Color(v.r, v.g, v.b, v.a);
      }
      get spriteFrame() {
        return this._sf;
      }
      set spriteFrame(v) {
        if (!v) throw new Error("null spriteFrame");
        this._sf = v;
      }
    };
    Label = class extends Component {
      constructor() {
        super(...arguments);
        this.string = "";
        this.fontSize = 0;
        this.lineHeight = 0;
        this.isBold = false;
        this._c = new Color();
        this.cacheMode = 0;
        this.enableOutline = false;
        this.outlineColor = new Color();
        this.outlineWidth = 0;
        this.horizontalAlign = 0;
        this.verticalAlign = 0;
      }
      static {
        this.requires = true;
      }
      static {
        this.CacheMode = { CHAR: 2 };
      }
      static {
        this.HorizontalAlign = { LEFT: 0, CENTER: 1, RIGHT: 2 };
      }
      static {
        this.VerticalAlign = { CENTER: 1 };
      }
      get color() {
        return this._c;
      }
      set color(v) {
        this._c = new Color(v.r, v.g, v.b, v.a);
      }
    };
    Canvas = class extends Component {
      constructor() {
        super(...arguments);
        this.cameraComponent = { clearColor: null };
      }
    };
    ImageAsset = class {
      constructor(src) {
        this.src = src;
      }
    };
    Texture2D = class {
      static {
        this.PixelFormat = { RGBA8888: 35 };
      }
      static {
        this.Filter = { NEAREST: 1, NONE: 0 };
      }
      static {
        this.WrapMode = { CLAMP_TO_EDGE: 1 };
      }
      setFilters() {
      }
      setMipFilter() {
      }
      setWrapMode() {
      }
      addRef() {
      }
    };
    view = { getVisibleSize: () => ({ width: 720, height: 1560 }), setDesignResolutionSize() {
    } };
    ResolutionPolicy = { FIXED_WIDTH: 4 };
    store = {};
    sys = { localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => {
      store[k] = v;
    } }, getSafeAreaRect: () => new Rect(0, 30, 720, 1450) };
    game = { on() {
    }, off() {
    } };
    Game = { EVENT_HIDE: "hide" };
    AudioClip = class {
      constructor() {
        this.name = "";
      }
    };
    sfxLog = {};
    AudioSource = class extends Component {
      constructor() {
        super(...arguments);
        this.loop = false;
        this.volume = 1;
        this.playing = false;
        this.clip = null;
      }
      play() {
        this.playing = true;
      }
      stop() {
        this.playing = false;
      }
      pause() {
        this.playing = false;
      }
      playOneShot(c) {
        sfxLog[c.name] = (sfxLog[c.name] || 0) + 1;
      }
    };
    require2 = createRequire(import.meta.url);
    resources = { loadDir(_p, _t, cb) {
      const names = require2("fs").readdirSync(require2("path").resolve("../../assets/resources/audio")).filter((f) => f.endsWith(".mp3")).map((f) => f.replace(".mp3", ""));
      cb(null, names.map((n) => {
        const c = new AudioClip();
        c.name = n;
        return c;
      }));
    } };
    Input = { EventType: { KEY_DOWN: "kd", KEY_UP: "ku" } };
    inputHandlers = {};
    input = { on(ev, cb, t) {
      inputHandlers[ev] = cb.bind(t);
    }, off() {
    } };
    KeyCode = { DIGIT_1: 49, DIGIT_4: 52, NUM_1: 97, NUM_4: 100, KEY_A: 65, KEY_D: 68, KEY_W: 87, KEY_S: 83, ARROW_LEFT: 37, ARROW_RIGHT: 39, ARROW_UP: 38, ARROW_DOWN: 40, KEY_R: 82, KEY_Q: 81, KEY_E: 69, ENTER: 13, SPACE: 32, ESCAPE: 27, KEY_P: 80 };
    Director = { EVENT_AFTER_SCENE_LAUNCH: "x" };
    director = { on() {
    }, getScene() {
      return null;
    } };
    _decorator = { ccclass: (_n) => (c) => c };
  }
});

// ../../assets/scripts/Save.ts
var Save_exports = {};
__export(Save_exports, {
  Save: () => Save
});
function defaults() {
  return {
    gold: 0,
    power: {},
    chars: ["hunter", "mage"],
    selected: "hunter",
    music: true,
    sfx: true,
    vibrate: true,
    lite: false,
    liteChecked: false,
    bestTime: 0,
    bestKills: 0,
    bestLevel: 0,
    totalKills: 0,
    runs: 0,
    wins: 0,
    achievements: [],
    mode: "normal",
    endlessBest: 0,
    lossStreak: 0,
    bonusDay: "",
    privacyOk: false,
    firstDay: "",
    runsSinceInter: 0,
    stage: "grass",
    stages: ["grass"],
    stageBest: {},
    dailyDone: "",
    dailyBestDate: "",
    dailyBest: 0,
    tutDone: false,
    codex: [],
    codexSeen: 0,
    questDate: "",
    questProg: {},
    questDone: [],
    signCount: 0,
    signDate: "",
    signShown: ""
  };
}
var KEY, Save;
var init_Save = __esm({
  "../../assets/scripts/Save.ts"() {
    init_cc();
    KEY = "night_survivors_save_v1";
    Save = class {
      static {
        this.data = defaults();
      }
      static load() {
        try {
          const raw = sys.localStorage.getItem(KEY);
          if (raw) this.data = Object.assign(defaults(), JSON.parse(raw));
        } catch (e) {
          console.warn("[Save] load failed", e);
          this.data = defaults();
        }
      }
      static save() {
        try {
          sys.localStorage.setItem(KEY, JSON.stringify(this.data));
        } catch (e) {
          console.warn("[Save] save failed", e);
        }
      }
      static rank(id) {
        return this.data.power[id] || 0;
      }
      static totalBought() {
        let n = 0;
        for (const k in this.data.power) n += this.data.power[k];
        return n;
      }
    };
  }
});

// ../../assets/scripts/Defs.ts
var Defs_exports = {};
__export(Defs_exports, {
  ACHIEVEMENTS: () => ACHIEVEMENTS,
  BASE_STATS: () => BASE_STATS,
  BLESSINGS: () => BLESSINGS,
  BLOOD_MOON: () => BLOOD_MOON,
  BOSS_SCHEDULE: () => BOSS_SCHEDULE,
  BRAZIER_DROPS: () => BRAZIER_DROPS,
  BUFF_DROPS: () => BUFF_DROPS,
  CHARACTERS: () => CHARACTERS,
  CHARGE_DESC: () => CHARGE_DESC,
  DAILY_GOAL: () => DAILY_GOAL,
  DAILY_MODS: () => DAILY_MODS,
  DAILY_REWARD: () => DAILY_REWARD,
  ENDLESS_BOSS_INTERVAL: () => ENDLESS_BOSS_INTERVAL,
  ENEMIES: () => ENEMIES,
  ENEMY_IDS: () => ENEMY_IDS,
  EPICS: () => EPICS,
  EPIC_TIME: () => EPIC_TIME,
  EVENT: () => EVENT,
  EVENTS: () => EVENTS,
  EVOLUTIONS: () => EVOLUTIONS,
  HERO_SCALE: () => HERO_SCALE,
  MAX_ENEMIES: () => MAX_ENEMIES,
  MAX_PASSIVES: () => MAX_PASSIVES,
  MAX_WEAPONS: () => MAX_WEAPONS,
  MONSTER_INFO: () => MONSTER_INFO,
  PASSIVES: () => PASSIVES,
  PICKUP_INFO: () => PICKUP_INFO,
  POWERUPS: () => POWERUPS,
  PX: () => PX,
  QUEST_BONUS: () => QUEST_BONUS,
  QUEST_POOL: () => QUEST_POOL,
  SIGNIN_REWARDS: () => SIGNIN_REWARDS,
  STAGES: () => STAGES,
  SWARM_TIMES: () => SWARM_TIMES,
  WAVES: () => WAVES,
  WEAPONS: () => WEAPONS,
  WEAPON_MAX_LEVEL: () => WEAPON_MAX_LEVEL,
  WIN_TIME: () => WIN_TIME,
  activeEvent: () => activeEvent,
  codexEntries: () => codexEntries,
  dailyQuests: () => dailyQuests,
  dailySetup: () => dailySetup,
  eventActive: () => eventActive,
  powerUpCost: () => powerUpCost,
  xpForLevel: () => xpForLevel
});
function activeEvent(now = /* @__PURE__ */ new Date()) {
  if (EVENT.force) return EVENTS.find((e) => e.id === (EVENT.force === true ? "cny" : EVENT.force)) || null;
  const p = (n) => (n < 10 ? "0" : "") + n;
  const d2 = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  return EVENTS.find((e) => d2 >= e.start && d2 <= e.end) || null;
}
function eventActive(now = /* @__PURE__ */ new Date()) {
  return !!activeEvent(now);
}
function xpForLevel(lv) {
  if (lv < 10) return 5 + (lv - 1) * 5;
  if (lv < 30) return 60 + (lv - 10) * 14;
  if (lv < 50) return 340 + (lv - 30) * 26;
  return 860 + (lv - 50) * 45;
}
function powerUpCost(def, rank, totalBought) {
  return Math.round(def.cost * (rank + 1) * (1 + 0.07 * Math.min(totalBought, 20)));
}
function seeded(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ h >>> 15, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function dailySetup(date) {
  const next = seeded(date);
  const pick = (a) => a[Math.floor(next() * a.length)];
  return {
    date,
    char: pick(CHARACTERS.filter((c) => c.cost >= 0)).id,
    stage: pick(STAGES.filter((st) => !st.event)).id,
    mod: pick(DAILY_MODS),
    blessing: pick(BLESSINGS.filter((b) => b.id !== "twin")).id
  };
}
function codexEntries() {
  const list = [];
  for (const w of WEAPONS) {
    list.push({ key: "w:" + w.id, tab: "weapon", icon: w.icon, name: w.name, desc: w.desc, hint: "\u5728\u5347\u7EA7\u65F6\u83B7\u5F97\u8FD9\u628A\u6B66\u5668" });
    const e = EVOLUTIONS[w.id];
    if (e) {
      const p = PASSIVES.find((x) => x.id === e.passive);
      list.push({ key: "e:" + w.id, tab: "weapon", icon: e.icon, name: e.name, desc: `${w.name} + ${p ? p.name : ""} \u8FDB\u5316
${e.desc}`, hint: `${w.name}\u6EE1\u7EA7 + \u6301\u6709${p ? p.name : ""}\uFF0C\u5F00\u5B9D\u7BB1\u8FDB\u5316` });
    }
  }
  for (const p of PASSIVES) list.push({ key: "p:" + p.id, tab: "passive", icon: p.icon, name: p.name, desc: p.desc, hint: "\u5728\u5347\u7EA7\u65F6\u83B7\u5F97\u8FD9\u4EF6\u9053\u5177" });
  for (const id in PICKUP_INFO) list.push({ key: "i:" + id, tab: "passive", icon: id, name: PICKUP_INFO[id].name, desc: PICKUP_INFO[id].desc, hint: "\u5728\u6218\u6597\u4E2D\u62FE\u53D6\u4E00\u6B21\u5373\u53EF\u6536\u5F55" });
  for (const e of EPICS) list.push({ key: "x:" + e.id, tab: "passive", icon: "epic_" + e.id, name: "\u795E\u5175\xB7" + e.name, desc: `\u9650\u65F6 ${EPIC_TIME} \u79D2\u7684\u53F2\u8BD7\u6B66\u5668
${e.desc}`, hint: "\u6253\u788E\u795E\u5175\u796D\u575B\u3001\u5B8C\u6210\u8BD5\u70BC\u6216\u51FB\u8D25 Boss \u83B7\u5F97" });
  for (const id in MONSTER_INFO) {
    const m = MONSTER_INFO[id];
    const def = ENEMIES[id];
    list.push({ key: "m:" + id, tab: "monster", icon: def.frames[0], name: m.name, desc: m.desc, hint: def.boss ? "\u51FB\u8D25\u5B83\u5373\u53EF\u6536\u5F55" : "\u51FB\u8D25\u4E00\u53EA\u5373\u53EF\u6536\u5F55" });
  }
  return list;
}
function dailyQuests(date) {
  const next = seeded("quest:" + date);
  const out = [];
  const pool = QUEST_POOL.slice();
  while (out.length < 3 && pool.length) {
    const q = pool.splice(Math.floor(next() * pool.length), 1)[0];
    if (!out.some((o) => o.stat === q.stat)) out.push(q);
  }
  return out;
}
var PX, HERO_SCALE, ENEMIES, WAVES, MONSTER_INFO, BOSS_SCHEDULE, SWARM_TIMES, WIN_TIME, STAGES, EVENTS, EVENT, BLOOD_MOON, MAX_ENEMIES, WEAPONS, BASE_STATS, PASSIVES, MAX_WEAPONS, MAX_PASSIVES, WEAPON_MAX_LEVEL, EVOLUTIONS, CHARGE_DESC, CHARACTERS, POWERUPS, BLESSINGS, ACHIEVEMENTS, ENDLESS_BOSS_INTERVAL, DAILY_MODS, DAILY_GOAL, DAILY_REWARD, PICKUP_INFO, BRAZIER_DROPS, BUFF_DROPS, EPIC_TIME, EPICS, ENEMY_IDS, QUEST_POOL, QUEST_BONUS, SIGNIN_REWARDS;
var init_Defs = __esm({
  "../../assets/scripts/Defs.ts"() {
    PX = 2;
    HERO_SCALE = 1.3;
    ENEMIES = {
      brazier: { frames: ["brazier_0", "brazier_1"], hp: 1, speed: 0, dmg: 0, xp: 0, radius: 14, anim: 0.15, color: 15769648, prop: true },
      altar: { frames: ["altar_0", "altar_1"], hp: 40, speed: 0, dmg: 0, xp: 0, radius: 18, anim: 0.2, color: 16767072, prop: true },
      goldrat: { frames: ["rat_0", "rat_1"], hp: 60, speed: 150, dmg: 0, xp: 10, radius: 12, anim: 0.08, scale: 1.4, knockRes: 0.8, color: 16106818, flee: true },
      shroom: { frames: ["shroom_0", "shroom_1"], hp: 28, speed: 50, dmg: 4, xp: 4, radius: 12, anim: 0.25, color: 14170672, burst: true },
      imp: { frames: ["imp_0", "imp_1"], hp: 22, speed: 72, dmg: 5, xp: 3, radius: 12, anim: 0.15, color: 13119532, ranged: true },
      mummy: { frames: ["mummy_0", "mummy_1"], hp: 55, speed: 34, dmg: 7, xp: 5, radius: 14, anim: 0.4, knockRes: 0.7, color: 14208170 },
      rat: { frames: ["rat_0", "rat_1"], hp: 3, speed: 55, dmg: 1, xp: 1, radius: 10, anim: 0.15, color: 9076880 },
      bat: { frames: ["bat_0", "bat_1"], hp: 4, speed: 85, dmg: 2, xp: 1, radius: 11, anim: 0.12, color: 6963104 },
      slime: { frames: ["slime_0", "slime_1"], hp: 10, speed: 45, dmg: 3, xp: 2, radius: 13, anim: 0.3, color: 5227087 },
      zombie: { frames: ["zombie_0", "zombie_1"], hp: 24, speed: 42, dmg: 5, xp: 3, radius: 13, anim: 0.35, knockRes: 0.3, color: 9091186 },
      skeleton: { frames: ["skeleton_0", "skeleton_1"], hp: 30, speed: 60, dmg: 6, xp: 3, radius: 13, anim: 0.25, color: 15657172 },
      ghost: { frames: ["ghost_0", "ghost_1"], hp: 26, speed: 92, dmg: 6, xp: 4, radius: 13, anim: 0.25, knockRes: 0.5, color: 14674175 },
      jelly: { frames: ["jelly_0", "jelly_1"], hp: 16, speed: 46, dmg: 3, xp: 2, radius: 13, anim: 0.3, color: 14708928, split: "jellet" },
      jellet: { frames: ["jelly_0", "jelly_1"], hp: 6, speed: 60, dmg: 1, xp: 1, radius: 9, anim: 0.2, scale: 0.6, color: 14708928 },
      boar: { frames: ["boar_0", "boar_1"], hp: 40, speed: 45, dmg: 5, xp: 4, radius: 14, anim: 0.2, knockRes: 0.6, color: 9067066, charger: true },
      fox: { frames: ["fox_0", "fox_1"], hp: 30, speed: 70, dmg: 6, xp: 4, radius: 12, anim: 0.18, color: 8016080, blink: true },
      // ---- Boss
      slimeking: { frames: ["slimeking_0", "slimeking_1"], hp: 340, speed: 46, dmg: 7, xp: 120, radius: 36, anim: 0.35, scale: 1.5, knockRes: 1, boss: true, color: 5227087, name: "\u53F2\u83B1\u59C6\u738B" },
      bonelord: { frames: ["bonelord_0", "bonelord_1"], hp: 650, speed: 58, dmg: 10, xp: 180, radius: 32, anim: 0.3, scale: 1.5, knockRes: 1, boss: true, color: 15657172, name: "\u94C1\u7532\u5C06\u519B" },
      vampire: { frames: ["vampire_0", "vampire_1"], hp: 1100, speed: 70, dmg: 13, xp: 240, radius: 30, anim: 0.3, scale: 1.5, knockRes: 1, boss: true, color: 10491944, name: "\u8759\u8760\u4F2F\u7235" },
      lich: { frames: ["lich_0", "lich_1"], hp: 1400, speed: 48, dmg: 14, xp: 300, radius: 30, anim: 0.35, scale: 1.5, knockRes: 1, boss: true, color: 8446207, name: "\u51B0\u971C\u5DEB\u5E08" },
      eye: { frames: ["eye_0", "eye_1"], hp: 1700, speed: 55, dmg: 15, xp: 360, radius: 34, anim: 0.3, scale: 1.5, knockRes: 1, boss: true, color: 9058938, name: "\u6C34\u6676\u9B54\u773C" },
      toad: { frames: ["toad_0", "toad_1"], hp: 1300, speed: 52, dmg: 13, xp: 260, radius: 34, anim: 0.4, scale: 1.6, knockRes: 1, boss: true, color: 5929530, name: "\u6BD2\u6CBC\u5DE8\u87FE" },
      yeti: { frames: ["yeti_0", "yeti_1"], hp: 950, speed: 70, dmg: 9, xp: 200, radius: 34, anim: 0.35, scale: 1.6, knockRes: 1, boss: true, color: 15266047, name: "\u96EA\u602A\u738B" },
      worm: { frames: ["worm_0", "worm_1"], hp: 1800, speed: 60, dmg: 15, xp: 360, radius: 34, anim: 0.3, scale: 1.6, knockRes: 1, boss: true, color: 13144154, name: "\u6C99\u6F20\u5DE8\u8815" },
      nian: { frames: ["nian_0", "nian_1"], hp: 950, speed: 76, dmg: 9, xp: 200, radius: 34, anim: 0.3, scale: 1.6, knockRes: 1, boss: true, color: 14172202, name: "\u5E74\u517D" },
      reaper: { frames: ["reaper_0", "reaper_1"], hp: 3e3, speed: 82, dmg: 17, xp: 500, radius: 30, anim: 0.4, scale: 1.7, knockRes: 1, boss: true, color: 9068736, name: "\u6697\u591C\u9B54\u672F\u5E08", final: true }
    };
    WAVES = [
      { t: 0, types: ["rat", "rat", "rat", "bat"], interval: 0.45, batch: 3 },
      { t: 40, types: ["rat", "rat", "bat", "slime"], interval: 0.5, batch: 4 },
      { t: 90, types: ["rat", "bat", "slime", "zombie"], interval: 0.55, batch: 4 },
      { t: 150, types: ["bat", "slime", "zombie", "rat"], interval: 0.6, batch: 5 },
      { t: 210, types: ["skeleton", "zombie", "bat", "rat", "jelly"], interval: 0.6, batch: 5 },
      { t: 300, types: ["skeleton", "zombie", "bat", "rat", "jelly"], interval: 0.55, batch: 5 },
      { t: 420, types: ["ghost", "skeleton", "bat", "zombie", "shroom", "boar"], interval: 0.5, batch: 6 },
      { t: 540, types: ["ghost", "skeleton", "skeleton", "zombie", "imp", "fox"], interval: 0.45, batch: 6 },
      { t: 660, types: ["ghost", "skeleton", "mummy", "bat", "imp", "boar"], interval: 0.4, batch: 7 },
      { t: 780, types: ["ghost", "skeleton", "mummy", "ghost", "imp", "fox"], interval: 0.35, batch: 8 }
    ];
    MONSTER_INFO = {
      rat: { name: "\u7070\u9F20", desc: "\u6700\u5F31\u5C0F\u7684\u602A\u7269\uFF0C\u4E00\u78B0\u5C31\u5012\uFF0C\u662F\u524D\u671F\u7ECF\u9A8C\u7684\u4E3B\u8981\u6765\u6E90\u3002" },
      bat: { name: "\u8759\u8760", desc: "\u98DE\u5F97\u5F88\u5FEB\uFF0C\u5E38\u5E38\u6210\u7FA4\u6A2A\u7A7F\u5C4F\u5E55\u3002" },
      slime: { name: "\u53F2\u83B1\u59C6", desc: "\u9ECF\u7CCA\u7CCA\u7684\u5C0F\u5BB6\u4F19\uFF0C\u53F2\u83B1\u59C6\u738B\u7684\u5B50\u6C11\u3002" },
      zombie: { name: "\u6CE5\u5DF4\u602A", desc: "\u5706\u6EDA\u6EDA\u7684\u6CE5\u56E2\uFF0C\u8D70\u5F97\u6162\u4F46\u5F88\u7ED3\u5B9E\uFF0C\u4E0D\u5BB9\u6613\u88AB\u51FB\u9000\u3002" },
      skeleton: { name: "\u6728\u5076\u5175", desc: "\u6728\u5934\u505A\u7684\u5C0F\u5175\uFF0C\u901F\u5EA6\u548C\u529B\u6C14\u90FD\u4E0D\u5C0F\uFF0C\u4E2D\u671F\u4E3B\u529B\u3002" },
      ghost: { name: "\u4E91\u6735\u7CBE", desc: "7 \u5206\u949F\u540E\u51FA\u73B0\uFF0C\u98D8\u5F97\u98DE\u5FEB\uFF0C\u6297\u51FB\u9000\u3002" },
      shroom: { name: "\u7206\u70B8\u8611\u83C7", desc: "7 \u5206\u949F\u540E\u51FA\u73B0\u3002\u88AB\u51FB\u8D25\u540E\u4F1A\u5728\u7EA2\u5708\u91CC\u7206\u70B8\u2014\u2014\u522B\u7AD9\u5728\u65C1\u8FB9\uFF0C\u4F46\u53EF\u4EE5\u7528\u5B83\u70B8\u6389\u602A\u7FA4\uFF01" },
      imp: { name: "\u5C0F\u706B\u7075", desc: "\u4F1A\u8FDC\u7A0B\u53D1\u5C04\u5C0F\u706B\u7403\uFF0C\u4F18\u5148\u6E05\u7406\uFF01" },
      mummy: { name: "\u7A3B\u8349\u4EBA", desc: "\u540E\u671F\u51FA\u73B0\u7684\u5927\u5757\u5934\uFF0C\u751F\u547D\u503C\u6781\u9AD8\u3002" },
      jelly: { name: "\u679C\u51BB\u602A", desc: "3:30 \u540E\u51FA\u73B0\u3002\u88AB\u51FB\u8D25\u65F6\u4F1A\u5206\u88C2\u6210\u4E24\u53EA\u8DD1\u5F97\u66F4\u5FEB\u7684\u5C0F\u679C\u51BB\u3002" },
      jellet: { name: "\u5C0F\u679C\u51BB", desc: "\u679C\u51BB\u602A\u5206\u88C2\u51FA\u6765\u7684\u5C0F\u5BB6\u4F19\uFF0C\u53C8\u5FEB\u53C8\u8106\u3002" },
      boar: { name: "\u51B2\u950B\u91CE\u732A", desc: "7:00 \u540E\u51FA\u73B0\u3002\u9760\u8FD1\u65F6\u4F1A\u505C\u4E0B\u84C4\u529B\uFF0C\u6CBF\u7EA2\u7EBF\u9AD8\u901F\u51B2\u649E\u2014\u2014\u770B\u5230\u7EA2\u7EBF\u5C31\u4FA7\u8EAB\u8EB2\u5F00\uFF01" },
      fox: { name: "\u95EA\u73B0\u72D0", desc: "9:00 \u540E\u51FA\u73B0\u3002\u4F1A\u7A81\u7136\u95EA\u73B0\u5230\u4F60\u8EAB\u8FB9\uFF0C\u7D2B\u5708\u5C31\u662F\u5B83\u7684\u843D\u70B9\u3002" },
      goldrat: { name: "\u91D1\u9F20", desc: "\u7A00\u6709\uFF01\u8DD1\u5F97\u98DE\u5FEB\uFF0C\u51FB\u8D25\u53EF\u83B7\u5F97\u5927\u91CF\u91D1\u5E01\u3002" },
      slimeking: { name: "\u53F2\u83B1\u59C6\u738B", desc: "\u8DF3\u8DC3\u7838\u5730\u3001\u53EC\u5524\u53F2\u83B1\u59C6\u3001\u4F53\u529B\u51CF\u534A\u65F6\u5206\u88C2\u30022:00 \u767B\u573A\u3002" },
      bonelord: { name: "\u94C1\u7532\u5C06\u519B", desc: "\u94A2\u523A\u73AF\u3001\u9884\u8B66\u51B2\u950B\u3001\u53EC\u5524\u6728\u5076\u5175\u30024:30 \u767B\u573A\u3002" },
      vampire: { name: "\u8759\u8760\u4F2F\u7235", desc: "\u9B54\u6CD5\u5F39\u6247\u5C04\u3001\u77AC\u79FB\u9B54\u6CD5\u73AF\u3001\u8759\u8760\u98CE\u66B4\u30027:00 \u767B\u573A\u3002" },
      lich: { name: "\u51B0\u971C\u5DEB\u5E08", desc: "\u51B0\u971C\u87BA\u65CB\u5F39\u5E55\u3001\u51B0\u9525\u9635\u3001\u51CF\u901F\u51B0\u57DF\u30029:30 \u767B\u573A\u3002" },
      eye: { name: "\u6C34\u6676\u9B54\u773C", desc: "\u9B54\u6CD5\u5149\u675F\u626B\u5C04\u3001\u8FFD\u8E2A\u5149\u7403\u3001\u53CC\u5C42\u5F39\u73AF\u300212:00 \u767B\u573A\u3002" },
      reaper: { name: "\u6697\u591C\u9B54\u672F\u5E08", desc: "\u6700\u7EC8 Boss\uFF1A\u56DE\u65CB\u98DE\u724C\u3001\u8FDE\u7EED\u51B2\u523A\u3001\u5E7B\u5F71\u53EC\u5524\u3002\u51FB\u8D25\u5373\u80DC\u5229\u3002" },
      worm: { name: "\u6C99\u6F20\u5DE8\u8815", desc: "\u6D41\u6C99\u8352\u6F20 12:00 \u767B\u573A\uFF1A\u94BB\u5165\u6C99\u4E2D\u8FFD\u8E2A\u3001\u7834\u571F\u800C\u51FA\u6380\u8D77\u6C99\u5F39\u73AF\u3001\u55B7\u5410\u6C99\u6D41\u3001\u53EC\u5524\u51B2\u950B\u91CE\u732A\u3002" },
      toad: { name: "\u6BD2\u6CBC\u5DE8\u87FE", desc: "\u6BD2\u96FE\u6CBC\u6CFD 7:00 \u767B\u573A\uFF1A\u6BD2\u6DB2\u55B7\u5410\u3001\u957F\u820C\u7A81\u523A\u3001\u8DF3\u8DC3\u7838\u5730\u3001\u53EC\u5524\u53F2\u83B1\u59C6\u3002" },
      yeti: { name: "\u96EA\u602A\u738B", desc: "\u5723\u8BDE\u9650\u5B9A\uFF1A\u96EA\u7403\u8FDE\u5C04\u3001\u51B0\u9525\u9635\u3001\u51B2\u950B\u649E\u51FB\u3001\u53EC\u5524\u4E91\u6735\u7CBE\u3002" },
      nian: { name: "\u5E74\u517D", desc: "\u65B0\u6625\u9650\u5B9A\uFF1A\u7206\u7AF9\u4E71\u5C04\u3001\u8FDE\u7EED\u51B2\u649E\u3001\u70DF\u82B1\u9F50\u653E\u3001\u6012\u543C\u53EC\u5524\u3002" }
    };
    BOSS_SCHEDULE = [
      { t: 120, id: "slimeking" },
      { t: 270, id: "bonelord" },
      { t: 420, id: "vampire" },
      { t: 570, id: "lich" },
      { t: 720, id: "eye" },
      { t: 840, id: "reaper" }
    ];
    SWARM_TIMES = [75, 200, 360, 500, 650];
    WIN_TIME = 900;
    STAGES = [
      {
        id: "grass",
        name: "\u6708\u5149\u8349\u539F",
        desc: "\u4E00\u5207\u5F00\u59CB\u7684\u5730\u65B9",
        ground: "ground",
        decor: ["flowers", "flowers", "flowers", "bush", "bush", "rock", "rock", "flowers", "bush", "tree", "tree"],
        hpMul: 1,
        goldMul: 1
      },
      {
        id: "snow",
        name: "\u51B0\u96EA\u8352\u539F",
        desc: "\u51B0\u9525\u4ECE\u5929\u800C\u964D \xB7 \u602A\u7269\u751F\u547D +20% \xB7 \u91D1\u5E01 +30%",
        ground: "ground_snow",
        decor: ["pine", "pine", "pine", "icerock", "icerock", "snowman", "snowman"],
        hpMul: 1.2,
        goldMul: 1.3,
        hazard: { frame: "icicle", color: 10147064, interval: 9, count: 3, name: "\u51B0\u9525" }
      },
      {
        id: "lava",
        name: "\u7194\u5CA9\u706B\u5C71",
        desc: "\u706B\u5C71\u55B7\u53D1 \xB7 \u602A\u7269\u751F\u547D +45% \xB7 \u91D1\u5E01 +60%",
        ground: "ground_lava",
        decor: ["lavarock", "lavarock", "lavarock", "obsidian", "obsidian", "lavapool", "lavarock", "obsidian"],
        hpMul: 1.45,
        goldMul: 1.6,
        hazard: { frame: "meteor", color: 16742960, interval: 8, count: 3, name: "\u9668\u77F3" }
      },
      {
        id: "swamp",
        name: "\u6BD2\u96FE\u6CBC\u6CFD",
        desc: "\u6BD2\u6CE1\u55B7\u53D1\u7559\u4E0B\u6BD2\u4E91 \xB7 \u602A\u7269\u751F\u547D +70% \xB7 \u91D1\u5E01 +90%",
        ground: "ground_swamp",
        decor: ["deadtree", "deadtree", "reeds", "reeds", "reeds", "mushroom", "mushroom", "bogpool", "reeds"],
        hpMul: 1.7,
        goldMul: 1.9,
        hazard: { frame: "bubble", color: 8446016, interval: 10, count: 3, name: "\u6BD2\u6CE1", cloud: true },
        bossSwap: { vampire: "toad" }
      },
      {
        id: "desert",
        name: "\u6D41\u6C99\u8352\u6F20",
        desc: "\u72C2\u98CE\u4E0E\u9F99\u5377\u98CE \xB7 \u6C99\u6F20\u5DE8\u8815\u51FA\u6CA1 \xB7 \u602A\u7269\u751F\u547D +100% \xB7 \u91D1\u5E01 +130%",
        ground: "ground_sand",
        decor: ["cactus", "cactus", "sandrock", "sandrock", "horns", "cactus", "sandrock"],
        hpMul: 2,
        goldMul: 2.3,
        hazard: { frame: "tornado_0", color: 14201962, interval: 16, count: 1, name: "\u9F99\u5377\u98CE", tornado: true },
        wind: true,
        bossSwap: { eye: "worm" }
      },
      {
        id: "xmas",
        name: "\u96EA\u591C\u5C0F\u9547",
        desc: "\u5723\u8BDE\u9650\u5B9A \xB7 \u96EA\u602A\u738B\u51FA\u6CA1 \xB7 \u793C\u7269\u4ECE\u5929\u800C\u964D \xB7 \u91D1\u5E01 +50%",
        ground: "ground_xmas",
        decor: ["xmastree", "xmastree", "gift", "gift", "candycane", "snowman", "pine"],
        hpMul: 1.15,
        goldMul: 1.5,
        hazard: { frame: "gift", color: 16732240, interval: 9, count: 3, name: "\u793C\u7269\u70B8\u5F39" },
        event: "xmas",
        bossSwap: { bonelord: "yeti", lich: "yeti" }
      },
      {
        id: "fest",
        name: "\u5E74\u591C\u5E99\u4F1A",
        desc: "\u65B0\u6625\u9650\u5B9A \xB7 \u5E74\u517D\u51FA\u6CA1 \xB7 \u70DF\u82B1\u56DB\u5C04 \xB7 \u91D1\u5E01 +50%",
        ground: "ground_fest",
        decor: ["lantern", "lantern", "firecracker", "firecracker", "redgate", "plum", "plum"],
        hpMul: 1.15,
        goldMul: 1.5,
        hazard: { frame: "firework", color: 16760896, interval: 9, count: 3, name: "\u70DF\u82B1" },
        event: "cny",
        bossSwap: { bonelord: "nian", lich: "nian" }
      }
    ];
    EVENTS = [
      {
        id: "xmas",
        name: "\u5723\u8BDE\u6D3B\u52A8",
        start: "2026-12-18",
        end: "2027-01-03",
        stage: "xmas",
        boss: "yeti",
        char: "santa",
        badge: "\u5723\u8BDE\u6D3B\u52A8\u8FDB\u884C\u4E2D \xB7 \u96EA\u591C\u5C0F\u9547\u5F00\u653E \xB7 \u51FB\u8D25\u96EA\u602A\u738B\u5F97\u5723\u8BDE\u86D9",
        lockText: "\u51FB\u8D25\u96EA\u602A\u738B\u89E3\u9501\n\u5723\u8BDE\u9650\u5B9A",
        hint: "\u5723\u8BDE\u6D3B\u52A8\u671F\u95F4\uFF0C\u5728\u96EA\u591C\u5C0F\u9547\u51FB\u8D25\u96EA\u602A\u738B\u5373\u53EF\u89E3\u9501"
      },
      {
        id: "cny",
        name: "\u65B0\u6625\u6D3B\u52A8",
        start: "2027-01-28",
        end: "2027-02-21",
        stage: "fest",
        boss: "nian",
        char: "fu",
        badge: "\u65B0\u6625\u6D3B\u52A8\u8FDB\u884C\u4E2D \xB7 \u5E74\u591C\u5E99\u4F1A\u5F00\u653E \xB7 \u51FB\u8D25\u5E74\u517D\u5F97\u798F\u86D9",
        lockText: "\u51FB\u8D25\u5E74\u517D\u89E3\u9501\n\u65B0\u6625\u9650\u5B9A",
        hint: "\u65B0\u6625\u6D3B\u52A8\u671F\u95F4\uFF0C\u5728\u5E74\u591C\u5E99\u4F1A\u51FB\u8D25\u5E74\u517D\u5373\u53EF\u89E3\u9501"
      }
    ];
    EVENT = { force: false };
    BLOOD_MOON = 780;
    MAX_ENEMIES = 340;
    WEAPONS = [
      {
        id: "whip",
        name: "\u76AE\u97AD",
        icon: "icon_whip",
        desc: "\u5411\u6C34\u5E73\u65B9\u5411\u62BD\u6253\uFF0C\u7A7F\u900F\u6240\u6709\u654C\u4EBA\u3002",
        base: { damage: 10, cooldown: 1.35, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u5411\u8EAB\u540E\u518D\u62BD\u4E00\u97AD", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +5", mod: { damage: 5 } },
          { desc: "\u8303\u56F4 +10%\uFF0C\u4F24\u5BB3 +5", mod: { area: 0.1, damage: 5 } },
          { desc: "\u4F24\u5BB3 +5", mod: { damage: 5 } },
          { desc: "\u8303\u56F4 +10%\uFF0C\u4F24\u5BB3 +5", mod: { area: 0.1, damage: 5 } },
          { desc: "\u4F24\u5BB3 +5", mod: { damage: 5 } },
          { desc: "\u4F24\u5BB3 +5", mod: { damage: 5 } }
        ]
      },
      {
        id: "wand",
        name: "\u9B54\u6756",
        icon: "icon_wand",
        desc: "\u5411\u6700\u8FD1\u7684\u654C\u4EBA\u53D1\u5C04\u9B54\u6CD5\u5F39\u3002",
        base: { damage: 10, cooldown: 1.2, amount: 1, area: 1, speed: 1, pierce: 1, duration: 0 },
        levels: [
          { desc: "\u5F39\u6570 +1", mod: { amount: 1 } },
          { desc: "\u51B7\u5374 -0.2 \u79D2", mod: { cooldown: -0.2 } },
          { desc: "\u5F39\u6570 +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +10", mod: { damage: 10 } },
          { desc: "\u5F39\u6570 +1", mod: { amount: 1 } },
          { desc: "\u7A7F\u900F +1", mod: { pierce: 1 } },
          { desc: "\u4F24\u5BB3 +10", mod: { damage: 10 } }
        ]
      },
      {
        id: "knife",
        name: "\u98DE\u5200",
        icon: "icon_knife",
        desc: "\u671D\u9762\u5411\u7684\u65B9\u5411\u5FEB\u901F\u6295\u63B7\u98DE\u5200\u3002",
        base: { damage: 7, cooldown: 1, amount: 1, area: 1, speed: 1, pierce: 1, duration: 0 },
        levels: [
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u6570\u91CF +1\uFF0C\u4F24\u5BB3 +5", mod: { amount: 1, damage: 5 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u7A7F\u900F +1", mod: { pierce: 1 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u6570\u91CF +1\uFF0C\u4F24\u5BB3 +5", mod: { amount: 1, damage: 5 } },
          { desc: "\u7A7F\u900F +1", mod: { pierce: 1 } }
        ]
      },
      {
        id: "axe",
        name: "\u98DE\u65A7",
        icon: "icon_axe",
        desc: "\u5411\u4E0A\u629B\u51FA\uFF0C\u4F24\u5BB3\u9AD8\u3001\u53EF\u7A7F\u900F\u3002",
        base: { damage: 20, cooldown: 4, amount: 1, area: 1, speed: 1, pierce: 3, duration: 0 },
        levels: [
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +20", mod: { damage: 20 } },
          { desc: "\u7A7F\u900F +2", mod: { pierce: 2 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +20", mod: { damage: 20 } },
          { desc: "\u7A7F\u900F +2", mod: { pierce: 2 } },
          { desc: "\u4F24\u5BB3 +20", mod: { damage: 20 } }
        ]
      },
      {
        id: "bible",
        name: "\u9B54\u6CD5\u4E66",
        icon: "icon_bible",
        desc: "\u73AF\u7ED5\u89D2\u8272\u65CB\u8F6C\uFF0C\u6301\u7EED\u4E00\u6BB5\u65F6\u95F4\u3002",
        base: { damage: 10, cooldown: 3, amount: 1, area: 1, speed: 1, pierce: 999, duration: 3 },
        levels: [
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u901F\u5EA6 +30%\uFF0C\u8303\u56F4 +25%", mod: { speed: 0.3, area: 0.25 } },
          { desc: "\u6301\u7EED +0.5 \u79D2\uFF0C\u4F24\u5BB3 +10", mod: { duration: 0.5, damage: 10 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u901F\u5EA6 +30%\uFF0C\u8303\u56F4 +25%", mod: { speed: 0.3, area: 0.25 } },
          { desc: "\u6301\u7EED +0.5 \u79D2\uFF0C\u4F24\u5BB3 +10", mod: { duration: 0.5, damage: 10 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } }
        ]
      },
      {
        id: "garlic",
        name: "\u5927\u849C",
        icon: "icon_garlic",
        desc: "\u4F24\u5BB3\u5E76\u51FB\u9000\u9760\u8FD1\u7684\u654C\u4EBA\u3002",
        base: { damage: 5, cooldown: 1, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u8303\u56F4 +40%\uFF0C\u4F24\u5BB3 +2", mod: { area: 0.4, damage: 2 } },
          { desc: "\u51B7\u5374 -0.1 \u79D2\uFF0C\u4F24\u5BB3 +1", mod: { cooldown: -0.1, damage: 1 } },
          { desc: "\u8303\u56F4 +20%\uFF0C\u4F24\u5BB3 +1", mod: { area: 0.2, damage: 1 } },
          { desc: "\u51B7\u5374 -0.1 \u79D2\uFF0C\u4F24\u5BB3 +2", mod: { cooldown: -0.1, damage: 2 } },
          { desc: "\u8303\u56F4 +20%\uFF0C\u4F24\u5BB3 +1", mod: { area: 0.2, damage: 1 } },
          { desc: "\u51B7\u5374 -0.1 \u79D2\uFF0C\u4F24\u5BB3 +1", mod: { cooldown: -0.1, damage: 1 } },
          { desc: "\u8303\u56F4 +20%\uFF0C\u4F24\u5BB3 +2", mod: { area: 0.2, damage: 2 } }
        ]
      },
      {
        id: "lightning",
        name: "\u96F7\u7535\u6307\u73AF",
        icon: "icon_lightning",
        desc: "\u968F\u673A\u5288\u4E2D\u5C4F\u5E55\u4E0A\u7684\u654C\u4EBA\u3002",
        base: { damage: 15, cooldown: 4.5, amount: 2, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u8303\u56F4 +100%\uFF0C\u4F24\u5BB3 +10", mod: { area: 1, damage: 10 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u8303\u56F4 +100%\uFF0C\u4F24\u5BB3 +20", mod: { area: 1, damage: 20 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u8303\u56F4 +100%\uFF0C\u4F24\u5BB3 +20", mod: { area: 1, damage: 20 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } }
        ]
      },
      {
        id: "fire",
        name: "\u706B\u7130\u6CD5\u6756",
        icon: "icon_fire",
        desc: "\u5411\u968F\u673A\u654C\u4EBA\u53D1\u5C04\u706B\u7403\uFF0C\u7206\u70B8\u5E76\u7559\u4E0B\u71C3\u70E7\u5730\u9762\u3002",
        base: { damage: 9, cooldown: 2.2, amount: 1, area: 1, speed: 1, pierce: 1, duration: 1.5 },
        levels: [
          { desc: "\u706B\u7403 +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +8", mod: { damage: 8 } },
          { desc: "\u7206\u70B8\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u706B\u7403 +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +8", mod: { damage: 8 } },
          { desc: "\u71C3\u70E7\u65F6\u95F4 +1 \u79D2", mod: { duration: 1 } },
          { desc: "\u706B\u7403 +1", mod: { amount: 1 } }
        ]
      },
      {
        id: "holy",
        name: "\u9B54\u6CD5\u836F\u6C34",
        icon: "icon_holy",
        desc: "\u6295\u63B7\u9B54\u6CD5\u836F\u6C34\uFF0C\u5F62\u6210\u6301\u7EED\u4F24\u5BB3\u7684\u836F\u6C34\u6C60\u3002",
        base: { damage: 6, cooldown: 4, amount: 1, area: 1, speed: 1, pierce: 999, duration: 2.5 },
        levels: [
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u8303\u56F4 +20%\uFF0C\u4F24\u5BB3 +3", mod: { area: 0.2, damage: 3 } },
          { desc: "\u6301\u7EED +0.5 \u79D2", mod: { duration: 0.5 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +3", mod: { damage: 3 } },
          { desc: "\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u6301\u7EED +0.5 \u79D2\uFF0C\u4F24\u5BB3 +3", mod: { duration: 0.5, damage: 3 } }
        ]
      },
      {
        id: "cross",
        name: "\u56DE\u65CB\u661F",
        icon: "icon_cross",
        desc: "\u98DE\u5411\u6700\u8FD1\u7684\u654C\u4EBA\u540E\u56DE\u65CB\uFF0C\u7A7F\u900F\u4E00\u5207\u3002",
        base: { damage: 7, cooldown: 2, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u4F24\u5BB3 +8", mod: { damage: 8 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u8303\u56F4 +15%", mod: { area: 0.15 } },
          { desc: "\u901F\u5EA6 +20%\uFF0C\u4F24\u5BB3 +8", mod: { speed: 0.2, damage: 8 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u8303\u56F4 +15%", mod: { area: 0.15 } },
          { desc: "\u4F24\u5BB3 +10", mod: { damage: 10 } }
        ]
      },
      {
        id: "frost",
        name: "\u51B0\u971C\u65B0\u661F",
        icon: "icon_frost",
        desc: "\u91CA\u653E\u51B0\u73AF\uFF0C\u4F24\u5BB3\u5E76\u51BB\u7ED3\u5468\u56F4\u654C\u4EBA\u3002",
        base: { damage: 6, cooldown: 3.5, amount: 1, area: 1, speed: 1, pierce: 999, duration: 1.2 },
        levels: [
          { desc: "\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u4F24\u5BB3 +6", mod: { damage: 6 } },
          { desc: "\u51BB\u7ED3 +0.3 \u79D2", mod: { duration: 0.3 } },
          { desc: "\u51B7\u5374 -0.4 \u79D2", mod: { cooldown: -0.4 } },
          { desc: "\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u4F24\u5BB3 +6", mod: { damage: 6 } },
          { desc: "\u51BB\u7ED3 +0.3 \u79D2", mod: { duration: 0.3 } }
        ]
      },
      {
        id: "familiar",
        name: "\u7CBE\u7075\u4F7F\u9B54",
        icon: "icon_familiar",
        desc: "\u53EC\u5524\u8DDF\u968F\u4F60\u7684\u5C0F\u7CBE\u7075\uFF0C\u81EA\u52A8\u5C04\u51FB\u654C\u4EBA\u3002",
        base: { damage: 8, cooldown: 0.8, amount: 1, area: 1, speed: 1, pierce: 1, duration: 0 },
        levels: [
          { desc: "\u7CBE\u7075 +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +3", mod: { damage: 3 } },
          { desc: "\u51B7\u5374 -0.15 \u79D2", mod: { cooldown: -0.15 } },
          { desc: "\u7CBE\u7075 +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +3", mod: { damage: 3 } },
          { desc: "\u7A7F\u900F +1", mod: { pierce: 1 } },
          { desc: "\u7CBE\u7075 +1", mod: { amount: 1 } }
        ]
      },
      {
        id: "chain",
        name: "\u96F7\u9E23\u94FE",
        icon: "icon_chain",
        desc: "\u95EA\u7535\u5728\u654C\u4EBA\u4E4B\u95F4\u8FDE\u7EED\u8DF3\u8DC3\u3002",
        base: { damage: 12, cooldown: 2, amount: 4, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u8DF3\u8DC3 +2", mod: { amount: 2 } },
          { desc: "\u4F24\u5BB3 +6", mod: { damage: 6 } },
          { desc: "\u51B7\u5374 -0.3 \u79D2", mod: { cooldown: -0.3 } },
          { desc: "\u8DF3\u8DC3 +2", mod: { amount: 2 } },
          { desc: "\u4F24\u5BB3 +8", mod: { damage: 8 } },
          { desc: "\u8DF3\u8DC3\u8DDD\u79BB +25%", mod: { area: 0.25 } },
          { desc: "\u8DF3\u8DC3 +3", mod: { amount: 3 } }
        ]
      },
      {
        id: "bomb",
        name: "\u70B8\u5F39",
        icon: "icon_bomb",
        desc: "\u5728\u811A\u4E0B\u653E\u7F6E\u70B8\u5F39\uFF0C\u5EF6\u65F6\u540E\u5927\u8303\u56F4\u7206\u70B8\u3002",
        base: { damage: 12, cooldown: 3, amount: 1, area: 1, speed: 1, pierce: 999, duration: 1.2 },
        levels: [
          { desc: "\u4F24\u5BB3 +15", mod: { damage: 15 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u4F24\u5BB3 +15", mod: { damage: 15 } },
          { desc: "\u51B7\u5374 -0.4 \u79D2", mod: { cooldown: -0.4 } },
          { desc: "\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } }
        ]
      },
      {
        id: "laser",
        name: "\u68F1\u955C\u6FC0\u5149",
        icon: "icon_laser",
        desc: "\u5411\u6700\u8FD1\u7684\u654C\u4EBA\u5C04\u51FA\u4E00\u9053\u8D2F\u7A7F\u4E00\u5207\u7684\u5149\u675F\u3002",
        base: { damage: 13, cooldown: 2.4, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u4F24\u5BB3 +8", mod: { damage: 8 } },
          { desc: "\u5149\u675F\u52A0\u5BBD 25%", mod: { area: 0.25 } },
          { desc: "\u51B7\u5374 -0.3 \u79D2", mod: { cooldown: -0.3 } },
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +10", mod: { damage: 10 } },
          { desc: "\u5149\u675F\u52A0\u5BBD 25%", mod: { area: 0.25 } },
          { desc: "\u4F24\u5BB3 +12", mod: { damage: 12 } }
        ]
      },
      {
        id: "saw",
        name: "\u5F39\u5F39\u952F",
        icon: "icon_saw",
        desc: "\u5C04\u51FA\u5728\u5C4F\u5E55\u8FB9\u7F18\u6765\u56DE\u53CD\u5F39\u7684\u952F\u7247\uFF0C\u6301\u7EED\u5207\u5272\u6CBF\u9014\u654C\u4EBA\u3002",
        base: { damage: 8, cooldown: 3.2, amount: 1, area: 1, speed: 1, pierce: 999, duration: 3.5 },
        levels: [
          { desc: "\u952F\u7247 +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +5", mod: { damage: 5 } },
          { desc: "\u6301\u7EED +1 \u79D2", mod: { duration: 1 } },
          { desc: "\u952F\u7247 +1", mod: { amount: 1 } },
          { desc: "\u952F\u7247\u53D8\u5927 20%", mod: { area: 0.2 } },
          { desc: "\u4F24\u5BB3 +6", mod: { damage: 6 } },
          { desc: "\u952F\u7247 +1", mod: { amount: 1 } }
        ]
      },
      {
        id: "sonic",
        name: "\u97F3\u6CE2\u5587\u53ED",
        icon: "icon_sonic",
        desc: "\u5411\u9762\u671D\u65B9\u5411\u8F70\u51FA\u6247\u5F62\u97F3\u6CE2\uFF0C\u4F24\u5BB3\u5E76\u5927\u5E45\u51FB\u9000\u654C\u4EBA\u3002",
        base: { damage: 8, cooldown: 1.8, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u97F3\u6CE2\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u4F24\u5BB3 +5", mod: { damage: 5 } },
          { desc: "\u5411\u8EAB\u540E\u518D\u8F70\u4E00\u6B21", mod: { amount: 1 } },
          { desc: "\u51B7\u5374 -0.3 \u79D2", mod: { cooldown: -0.3 } },
          { desc: "\u4F24\u5BB3 +6", mod: { damage: 6 } },
          { desc: "\u97F3\u6CE2\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u4F24\u5BB3 +8", mod: { damage: 8 } }
        ]
      },
      {
        id: "spikes",
        name: "\u8346\u68D8\u5730\u523A",
        icon: "icon_spikes",
        desc: "\u5728\u9644\u8FD1\u654C\u4EBA\u811A\u4E0B\u4F9D\u6B21\u523A\u51FA\u5C16\u523A\u3002",
        base: { damage: 9, cooldown: 2.2, amount: 3, area: 1, speed: 1, pierce: 999, duration: 0 },
        levels: [
          { desc: "\u6570\u91CF +1", mod: { amount: 1 } },
          { desc: "\u4F24\u5BB3 +6", mod: { damage: 6 } },
          { desc: "\u8303\u56F4 +20%", mod: { area: 0.2 } },
          { desc: "\u6570\u91CF +2", mod: { amount: 2 } },
          { desc: "\u51B7\u5374 -0.3 \u79D2", mod: { cooldown: -0.3 } },
          { desc: "\u4F24\u5BB3 +8", mod: { damage: 8 } },
          { desc: "\u6570\u91CF +2", mod: { amount: 2 } }
        ]
      }
    ];
    BASE_STATS = {
      maxHp: 90,
      might: 1,
      armor: 0,
      recovery: 0,
      cooldown: 1,
      area: 1,
      speed: 1,
      moveSpeed: 1,
      magnet: 70,
      amount: 0,
      duration: 1,
      growth: 1,
      greed: 1,
      revival: 0,
      reroll: 0,
      crit: 0.1,
      critDmg: 2,
      lifesteal: 0,
      thorns: 0,
      ultCharge: 0,
      buffTime: 1
    };
    PASSIVES = [
      { id: "might", name: "\u83E0\u83DC", icon: "icon_might", desc: "\u4F24\u5BB3 +10%", max: 5, stat: "might", per: 0.1 },
      { id: "armor", name: "\u76D4\u7532", icon: "icon_armor", desc: "\u53D7\u5230\u4F24\u5BB3 -1", max: 5, stat: "armor", per: 1 },
      { id: "heart", name: "\u7A7A\u5FC3\u4E4B\u5FC3", icon: "icon_heart", desc: "\u6700\u5927\u751F\u547D +20%", max: 5, stat: "maxHp", per: 0.2, mul: true },
      { id: "regen", name: "\u756A\u8304", icon: "icon_regen", desc: "\u6BCF\u79D2\u6062\u590D 0.2 \u751F\u547D", max: 5, stat: "recovery", per: 0.2 },
      { id: "tome", name: "\u7A7A\u767D\u4E4B\u4E66", icon: "icon_cooldown", desc: "\u6B66\u5668\u51B7\u5374 -8%", max: 5, stat: "cooldown", per: -0.08 },
      { id: "candle", name: "\u70DB\u53F0", icon: "icon_area", desc: "\u653B\u51FB\u8303\u56F4 +10%", max: 5, stat: "area", per: 0.1 },
      { id: "bracer", name: "\u62A4\u8155", icon: "icon_speed", desc: "\u5F39\u9053\u901F\u5EA6 +10%", max: 5, stat: "speed", per: 0.1 },
      { id: "wings", name: "\u7FC5\u8180", icon: "icon_move", desc: "\u79FB\u52A8\u901F\u5EA6 +10%", max: 5, stat: "moveSpeed", per: 0.1 },
      { id: "orb", name: "\u5438\u5F15\u5B9D\u73E0", icon: "icon_magnet", desc: "\u62FE\u53D6\u8303\u56F4 +30%", max: 5, stat: "magnet", per: 0.3, mul: true },
      { id: "dup", name: "\u590D\u5236\u5668", icon: "icon_amount", desc: "\u6B66\u5668\u6570\u91CF +1", max: 2, stat: "amount", per: 1 },
      { id: "spell", name: "\u5492\u8BED\u7ED1\u5B9A", icon: "icon_duration", desc: "\u6301\u7EED\u65F6\u95F4 +10%", max: 5, stat: "duration", per: 0.1 },
      { id: "crown", name: "\u7687\u51A0", icon: "icon_growth", desc: "\u7ECF\u9A8C\u83B7\u53D6 +8%", max: 5, stat: "growth", per: 0.08 },
      { id: "luck", name: "\u5E78\u8FD0\u8349", icon: "icon_luck", desc: "\u66B4\u51FB\u7387 +4%", max: 5, stat: "crit", per: 0.04 },
      { id: "critdmg", name: "\u7206\u88C2\u4E4B\u5FC3", icon: "icon_critdmg", desc: "\u66B4\u51FB\u4F24\u5BB3 +25%", max: 5, stat: "critDmg", per: 0.25 },
      { id: "fang", name: "\u6D3B\u529B\u7360\u7259", icon: "icon_fang", desc: "\u6BCF\u6B21\u51FB\u8D25\u654C\u4EBA\u56DE\u590D 0.2 \u751F\u547D", max: 5, stat: "lifesteal", per: 0.2 },
      { id: "thorns", name: "\u8346\u68D8\u7532", icon: "icon_thorns", desc: "\u53D7\u51FB\u65F6\u5BF9\u5468\u56F4\u654C\u4EBA\u9020\u6210 30 \u4F24\u5BB3", max: 5, stat: "thorns", per: 30 },
      { id: "core", name: "\u80FD\u91CF\u6838\u5FC3", icon: "icon_core", desc: "\u5927\u62DB\u5145\u80FD\u901F\u5EA6 +12%", max: 5, stat: "ultCharge", per: 0.12 },
      { id: "sand", name: "\u65F6\u4E4B\u6C99", icon: "icon_sand", desc: "\u589E\u76CA\u9053\u5177\u4E0E\u795E\u5175\u6301\u7EED\u65F6\u95F4 +10%", max: 5, stat: "buffTime", per: 0.1 }
    ];
    MAX_WEAPONS = 6;
    MAX_PASSIVES = 6;
    WEAPON_MAX_LEVEL = 8;
    EVOLUTIONS = {
      whip: { passive: "heart", name: "\u70BD\u5FC3\u4E4B\u97AD", icon: "icon_whip_evo", desc: "\u4F24\u5BB3\u4E0E\u8303\u56F4\u5927\u5E45\u63D0\u5347\uFF0C\u547D\u4E2D\u65F6\u6709\u51E0\u7387\u56DE\u590D\u751F\u547D\u3002", mod: { damage: 20, area: 0.3, cooldown: -0.25 } },
      wand: { passive: "tome", name: "\u661F\u8FB0\u6CD5\u6756", icon: "icon_wand_evo", desc: "\u51E0\u4E4E\u6CA1\u6709\u51B7\u5374\uFF0C\u6301\u7EED\u503E\u6CFB\u9B54\u6CD5\u5F39\u3002", mod: { cooldown: -0.85, damage: 5, pierce: 1 } },
      knife: { passive: "bracer", name: "\u5343\u5203", icon: "icon_knife_evo", desc: "\u98DE\u5200\u5982\u66B4\u96E8\u822C\u8FDE\u7EED\u5C04\u51FA\u3002", mod: { cooldown: -0.85, damage: 5, pierce: 2 } },
      axe: { passive: "candle", name: "\u65CB\u98CE\u98DE\u65A7", icon: "icon_axe_evo", desc: "\u5411\u56DB\u5468\u653E\u5C04\u51FA\u65E0\u9650\u7A7F\u900F\u7684\u65CB\u8F6C\u98DE\u65A7\u3002", mod: { damage: 30, amount: 4, pierce: 999, cooldown: -1.5 } },
      bible: { passive: "spell", name: "\u4E0D\u673D\u9B54\u5178", icon: "icon_bible_evo", desc: "\u9B54\u6CD5\u4E66\u6C38\u4E45\u73AF\u7ED5\uFF0C\u4E0D\u518D\u6D88\u5931\u3002", mod: { damage: 15, area: 0.3, duration: 9999 } },
      garlic: { passive: "regen", name: "\u5927\u849C\u9886\u57DF", icon: "icon_garlic_evo", desc: "\u8303\u56F4\u66F4\u5927\uFF0C\u4F24\u5BB3\u654C\u4EBA\u65F6\u6062\u590D\u751F\u547D\u3002", mod: { damage: 6, area: 0.6 } },
      fire: { passive: "might", name: "\u70C8\u7130\u98CE\u66B4", icon: "icon_fire_evo", desc: "\u5DE8\u578B\u706B\u7403\uFF0C\u71C3\u70E7\u5730\u9762\u8303\u56F4\u7FFB\u500D\u3002", mod: { damage: 20, area: 0.5, amount: 2 } },
      holy: { passive: "orb", name: "\u9B54\u6CD5\u6CC9", icon: "icon_holy_evo", desc: "\u836F\u6C34\u6C60\u66F4\u5927\u66F4\u4E45\uFF0C\u7AD9\u5728\u6C60\u4E2D\u6301\u7EED\u56DE\u590D\u751F\u547D\u3002", mod: { damage: 8, area: 0.4, duration: 2 } },
      cross: { passive: "luck", name: "\u5BA1\u5224\u4E4B\u661F", icon: "icon_cross_evo", desc: "\u56DE\u65CB\u661F\u5FC5\u5B9A\u66B4\u51FB\u3002", mod: { damage: 15, amount: 2 } },
      frost: { passive: "armor", name: "\u6C38\u51BB\u9886\u57DF", icon: "icon_frost_evo", desc: "\u51BB\u7ED3\u66F4\u4E45\uFF0C\u88AB\u51BB\u7ED3\u7684\u654C\u4EBA\u53D7\u5230\u4F24\u5BB3 +50%\u3002", mod: { area: 0.6, duration: 1, damage: 8 } },
      familiar: { passive: "crown", name: "\u7CBE\u7075\u738B", icon: "icon_familiar_evo", desc: "\u66F4\u591A\u7CBE\u7075\uFF0C\u5C04\u901F\u4E0E\u7A7F\u900F\u5927\u5E45\u63D0\u5347\u3002", mod: { amount: 2, damage: 8, pierce: 3, cooldown: -0.3 } },
      chain: { passive: "wings", name: "\u5929\u7F5A\u96F7\u94FE", icon: "icon_chain_evo", desc: "\u8DF3\u8DC3\u6B21\u6570\u5927\u589E\uFF0C\u6BCF\u6B21\u8DF3\u8DC3\u5F15\u53D1\u5C0F\u578B\u7206\u70B8\u3002", mod: { amount: 8, damage: 15 } },
      bomb: { passive: "thorns", name: "\u8FDE\u73AF\u7206\u7834", icon: "icon_bomb_evo", desc: "\u7206\u70B8\u540E\u5206\u88C2\u51FA 4 \u9897\u5B50\u70B8\u5F39\u3002", mod: { damage: 20, area: 0.3 } },
      laser: { passive: "critdmg", name: "\u8679\u5149\u68F1\u955C", icon: "icon_laser_evo", desc: "\u540C\u65F6\u5C04\u51FA\u4E09\u9053\u5F69\u8679\u5149\u675F\uFF0C\u5BBD\u5EA6\u4E0E\u4F24\u5BB3\u5927\u589E\u3002", mod: { amount: 2, damage: 15, area: 0.5 } },
      spikes: { passive: "fang", name: "\u751F\u547D\u8346\u68D8", icon: "icon_spikes_evo", desc: "\u5730\u523A\u6570\u91CF\u5927\u589E\uFF0C\u547D\u4E2D\u65F6\u6709\u51E0\u7387\u56DE\u590D\u751F\u547D\u3002", mod: { amount: 4, damage: 10, area: 0.2 } },
      saw: { passive: "core", name: "\u98CE\u66B4\u952F\u8F6E", icon: "icon_saw_evo", desc: "\u66F4\u591A\u66F4\u5927\u7684\u952F\u7247\uFF0C\u547D\u4E2D\u65F6\u8FF8\u51FA\u706B\u82B1\u5F15\u53D1\u5C0F\u7206\u70B8\u3002", mod: { amount: 2, damage: 12, area: 0.4, duration: 2 } },
      sonic: { passive: "sand", name: "\u97F3\u7206", icon: "icon_sonic_evo", desc: "\u97F3\u6CE2\u540C\u65F6\u8F70\u5411\u56DB\u9762\u516B\u65B9\uFF0C\u5E76\u9707\u6655\u654C\u4EBA 0.6 \u79D2\u3002", mod: { amount: 2, damage: 12, area: 0.3, cooldown: -0.2 } },
      lightning: { passive: "dup", name: "\u96F7\u9706\u4E4B\u73AF", icon: "icon_lightning_evo", desc: "\u6BCF\u6B21\u843D\u4E0B\u66F4\u591A\u66F4\u5F3A\u7684\u95EA\u7535\u3002", mod: { amount: 4, damage: 25, area: 1 } }
    };
    CHARGE_DESC = {
      combo: "\u51FB\u8D25\u654C\u4EBA\u5145\u80FD\uFF0C\u8FDE\u51FB\u8D8A\u9AD8\u5145\u5F97\u8D8A\u5FEB",
      level: "\u6BCF\u6B21\u5347\u7EA7\u5145\u80FD 35%",
      move: "\u79FB\u52A8\u5145\u80FD\uFF0C\u8DD1\u5F97\u8D8A\u8FDC\u5145\u5F97\u8D8A\u5FEB",
      hurt: "\u53D7\u5230\u653B\u51FB\u65F6\u5145\u80FD",
      heal: "\u56DE\u590D\u751F\u547D\u65F6\u5145\u80FD",
      kill: "\u51FB\u8D25\u654C\u4EBA\u5145\u80FD",
      boom: "\u6BCF\u6B21\u7206\u70B8\u5145\u80FD",
      time: "\u968F\u65F6\u95F4\u5FEB\u901F\u5145\u80FD",
      still: "\u7AD9\u7740\u4E0D\u52A8\u65F6\u5FEB\u901F\u5145\u80FD",
      crit: "\u66B4\u51FB\u65F6\u5145\u80FD",
      gold: "\u62FE\u53D6\u91D1\u5E01\u65F6\u5145\u80FD"
    };
    CHARACTERS = [
      { id: "hunter", name: "\u5976\u86D9", title: "\u97AD\u624B", sprite: "hero_hunter", weapon: "whip", desc: "\u6700\u5927\u751F\u547D +20", bonus: { maxHp: 20 }, cost: 0, traitName: "\u8D8A\u6218\u8D8A\u52C7", trait: "\u6BCF\u51FB\u8D25 100 \u4E2A\u654C\u4EBA\u4F24\u5BB3 +1%\uFF08\u6700\u591A +25%\uFF09", ultName: "\u97AD\u5F71\u98CE\u66B4", ult: "2.5 \u79D2\u5185\u75AF\u72C2\u6325\u97AD\uFF0C\u6301\u7EED\u6A2A\u626B\u8EAB\u8FB9\u7684\u654C\u4EBA", charge: "combo" },
      { id: "mage", name: "\u6CD5\u5E08\u86D9", title: "\u6CD5\u5E08", sprite: "hero_mage", weapon: "wand", desc: "\u7ECF\u9A8C\u83B7\u53D6 +10%", bonus: { growth: 0.1 }, cost: 0, traitName: "\u5965\u672F\u6D8C\u6D41", trait: "\u6BCF\u6B21\u5347\u7EA7\u540E 4 \u79D2\u5185\u51B7\u5374 -30%", ultName: "\u5965\u672F\u661F\u96E8", ult: "\u5C04\u51FA 30 \u679A\u8FFD\u8E2A\u9B54\u6CD5\u98DE\u5F39", charge: "level" },
      { id: "rogue", name: "\u6E38\u4FA0\u86D9", title: "\u6E38\u4FA0", sprite: "hero_rogue", weapon: "knife", desc: "\u79FB\u52A8\u901F\u5EA6 +15%", bonus: { moveSpeed: 0.15 }, cost: 500, traitName: "\u7075\u5DE7\u95EA\u907F", trait: "\u53D7\u5230\u653B\u51FB\u65F6 12% \u51E0\u7387\u5B8C\u5168\u95EA\u907F", ultName: "\u5F71\u88AD", ult: "\u65E0\u654C\u51B2\u523A\u7A7F\u8FC7\u654C\u7FA4\uFF0C\u7EC8\u70B9\u7206\u53D1\u4E00\u5708\u98DE\u5200", charge: "move" },
      { id: "knight", name: "\u9A91\u58EB\u86D9", title: "\u9A91\u58EB", sprite: "hero_knight", weapon: "axe", desc: "\u62A4\u7532 +1\uFF0C\u4F24\u5BB3 +10%", bonus: { armor: 1, might: 0.1 }, cost: 1e3, traitName: "\u4E0D\u5C48\u94C1\u58C1", trait: "\u751F\u547D\u4F4E\u4E8E 50% \u65F6\u62A4\u7532\u989D\u5916 +2", ultName: "\u4E0D\u52A8\u94C1\u58C1", ult: "3 \u79D2\u65E0\u654C\uFF0C\u6BCF 0.5 \u79D2\u9707\u51FA\u51B2\u51FB\u6CE2", charge: "hurt" },
      { id: "nun", name: "\u76FE\u536B\u86D9", title: "\u76FE\u536B\u58EB", sprite: "hero_nun", weapon: "bible", desc: "\u6BCF\u79D2\u6062\u590D +0.4 \u751F\u547D", bonus: { recovery: 0.4 }, cost: 1500, traitName: "\u5723\u5149\u5E87\u62A4", trait: "\u6BCF 40 \u79D2\u83B7\u5F97 1 \u5C42\u62A4\u76FE\uFF0C\u62B5\u6321\u4E00\u6B21\u4F24\u5BB3", ultName: "\u5723\u57DF", ult: "\u5C55\u5F00 6 \u79D2\u5723\u57DF\uFF1A\u57DF\u5185\u56DE\u590D\u751F\u547D\u3001\u707C\u4F24\u654C\u4EBA\u3001\u51C0\u5316\u5F39\u5E55", charge: "heal" },
      { id: "pyro", name: "\u708E\u672F\u86D9", title: "\u708E\u672F\u58EB", sprite: "hero_pyro", weapon: "fire", desc: "\u4F24\u5BB3 +15%", bonus: { might: 0.15 }, cost: 3e3, traitName: "\u4F59\u70EC", trait: "\u51FB\u8D25\u654C\u4EBA\u65F6 12% \u51E0\u7387\u539F\u5730\u5F15\u71C3\u5C0F\u7206\u70B8", ultName: "\u5929\u706B\u9668\u661F", ult: "\u53EC\u5524\u5DE8\u578B\u9668\u77F3\u7838\u5411\u654C\u7FA4\uFF0C\u7559\u4E0B\u5927\u7247\u706B\u6D77", charge: "kill" },
      { id: "bomber", name: "\u7206\u7834\u86D9", title: "\u7206\u7834\u5DE5", sprite: "hero_bomber", weapon: "bomb", desc: "\u6700\u5927\u751F\u547D +30\uFF0C\u8303\u56F4 +15%", bonus: { maxHp: 30, area: 0.15 }, cost: 4e3, traitName: "\u4EE5\u7206\u5236\u7206", trait: "\u53D7\u4F24\u65F6 35% \u51E0\u7387\u5F15\u53D1\u7206\u70B8\uFF1B\u7206\u70B8\u4F24\u5BB3\u51CF\u534A", ultName: "\u5730\u6BEF\u8F70\u70B8", ult: "\u6CBF\u9762\u671D\u65B9\u5411\u6295\u4E0B\u4E00\u957F\u4E32\u70B8\u5F39", charge: "boom" },
      { id: "sage", name: "\u957F\u8001\u86D9", title: "\u8001\u8D24\u8005", sprite: "hero_sage", weapon: "lightning", desc: "\u51B7\u5374 -10%\uFF0C\u8303\u56F4 +10%", bonus: { cooldown: -0.1, area: 0.1 }, cost: 2500, traitName: "\u5929\u96F7", trait: "\u6BCF 7 \u79D2\u53EC\u5524 3 \u9053\u843D\u96F7\u5288\u5411\u5C4F\u5E55\u5185\u654C\u4EBA", ultName: "\u96F7\u66B4\u5929\u7F5A", ult: "4 \u79D2\u96F7\u66B4\uFF0C\u843D\u96F7\u4E0D\u65AD\u5288\u5411\u5C4F\u5E55\u5185\u7684\u654C\u4EBA", charge: "time" },
      { id: "druid", name: "\u5FB7\u9C81\u4F0A\u86D9", title: "\u68EE\u6797\u5B88\u62A4\u8005", sprite: "hero_druid", weapon: "spikes", desc: "\u6BCF\u79D2\u6062\u590D +0.4\uFF0C\u8303\u56F4 +10%", bonus: { recovery: 0.4, area: 0.1 }, cost: 3e3, traitName: "\u85E4\u8513\u7F20\u7ED5", trait: "\u6BCF 9 \u79D2\u7528\u85E4\u8513\u5B9A\u4F4F\u8EAB\u8FB9\u7684\u654C\u4EBA 1.5 \u79D2", ultName: "\u4E07\u6728\u56DE\u6625", ult: "\u85E4\u8513\u628A\u5468\u56F4\u654C\u4EBA\u62C9\u5230\u8EAB\u8FB9\u7F20\u4F4F 2.5 \u79D2\uFF0C\u56DE\u590D 15% \u751F\u547D", charge: "still" },
      { id: "prism", name: "\u68F1\u955C\u86D9", title: "\u5149\u5B66\u602A\u624D", sprite: "hero_prism", weapon: "laser", desc: "\u66B4\u51FB\u7387 +8%\uFF0C\u4F24\u5BB3 +10%", bonus: { crit: 0.08, might: 0.1 }, cost: 3500, traitName: "\u6298\u5C04", trait: "\u66B4\u51FB\u65F6 35% \u51E0\u7387\u6298\u5C04\u5230\u9644\u8FD1\u654C\u4EBA\uFF0850% \u4F24\u5BB3\uFF09", ultName: "\u5149\u8C31\u7206\u53D1", ult: "\u5411\u56DB\u9762\u516B\u65B9\u8FDE\u5C04\u4E09\u8F6E\u5F69\u8679\u5149\u675F", charge: "crit" },
      { id: "fu", name: "\u798F\u86D9", title: "\u65B0\u6625\u9650\u5B9A", sprite: "hero_fu", weapon: "bomb", desc: "\u91D1\u5E01 +30%\uFF0C\u6700\u5927\u751F\u547D +20", bonus: { greed: 0.3, maxHp: 20 }, cost: -1, traitName: "\u62DB\u8D22\u8FDB\u5B9D", trait: "\u62FE\u53D6\u91D1\u5E01\u65F6 20% \u51E0\u7387\u7FFB\u500D", ultName: "\u8D22\u795E\u5230", ult: "\u8EAB\u8FB9\u7684\u5C0F\u602A\u5168\u90E8\u53D8\u6210\u91D1\u5E01\uFF0C\u7CBE\u82F1\u602A\u53D7\u91CD\u521B", charge: "gold" },
      { id: "santa", name: "\u5723\u8BDE\u86D9", title: "\u5723\u8BDE\u9650\u5B9A", sprite: "hero_santa", weapon: "frost", desc: "\u91D1\u5E01 +20%\uFF0C\u51B7\u5374 -8%", bonus: { greed: 0.2, cooldown: -0.08 }, cost: -1, traitName: "\u5723\u8BDE\u793C\u7269", trait: "\u6BCF 70 \u79D2\u8EAB\u8FB9\u6389\u843D\u4E00\u4E2A\u968F\u673A\u589E\u76CA\u9053\u5177", ultName: "\u5723\u8BDE\u96EA\u6A47", ult: "\u96EA\u6A47\u98DE\u8FC7\u6295\u4E0B\u4E00\u4E32\u793C\u7269\u70B8\u5F39\uFF0C\u5E76\u9001\u51FA\u4E00\u4E2A\u589E\u76CA\u9053\u5177", charge: "time" }
    ];
    POWERUPS = [
      { id: "might", name: "\u529B\u91CF", icon: "icon_might", desc: "\u4F24\u5BB3 +5%", max: 5, stat: "might", per: 0.05, cost: 200 },
      { id: "armor", name: "\u62A4\u7532", icon: "icon_armor", desc: "\u53D7\u5230\u4F24\u5BB3 -1", max: 3, stat: "armor", per: 1, cost: 600 },
      { id: "maxhp", name: "\u4F53\u9B44", icon: "icon_heart", desc: "\u6700\u5927\u751F\u547D +10%", max: 3, stat: "maxHp", per: 0.1, mul: true, cost: 200 },
      { id: "regen", name: "\u6062\u590D", icon: "icon_regen", desc: "\u6BCF\u79D2\u6062\u590D +0.1", max: 5, stat: "recovery", per: 0.1, cost: 200 },
      { id: "cool", name: "\u51B7\u5374", icon: "icon_cooldown", desc: "\u6B66\u5668\u51B7\u5374 -2.5%", max: 2, stat: "cooldown", per: -0.025, cost: 900 },
      { id: "area", name: "\u8303\u56F4", icon: "icon_area", desc: "\u653B\u51FB\u8303\u56F4 +5%", max: 2, stat: "area", per: 0.05, cost: 300 },
      { id: "speed", name: "\u5F39\u901F", icon: "icon_speed", desc: "\u5F39\u9053\u901F\u5EA6 +10%", max: 2, stat: "speed", per: 0.1, cost: 300 },
      { id: "move", name: "\u79FB\u901F", icon: "icon_move", desc: "\u79FB\u52A8\u901F\u5EA6 +5%", max: 2, stat: "moveSpeed", per: 0.05, cost: 300 },
      { id: "magnet", name: "\u78C1\u529B", icon: "icon_magnet", desc: "\u62FE\u53D6\u8303\u56F4 +25%", max: 2, stat: "magnet", per: 0.25, mul: true, cost: 300 },
      { id: "growth", name: "\u6210\u957F", icon: "icon_growth", desc: "\u7ECF\u9A8C\u83B7\u53D6 +3%", max: 5, stat: "growth", per: 0.03, cost: 900 },
      { id: "luck", name: "\u5E78\u8FD0", icon: "icon_luck", desc: "\u66B4\u51FB\u7387 +2%", max: 3, stat: "crit", per: 0.02, cost: 600 },
      { id: "greed", name: "\u8D2A\u5A6A", icon: "icon_gold", desc: "\u91D1\u5E01\u83B7\u53D6 +10%", max: 5, stat: "greed", per: 0.1, cost: 200 },
      { id: "reroll", name: "\u91CD\u62BD", icon: "icon_reroll", desc: "\u6BCF\u5C40\u53EF\u91CD\u62BD\u5347\u7EA7\u9009\u9879 +1 \u6B21", max: 3, stat: "reroll", per: 1, cost: 800 },
      { id: "revival", name: "\u590D\u6D3B", icon: "icon_revive", desc: "\u5012\u4E0B\u540E\u539F\u5730\u590D\u6D3B +1 \u6B21", max: 1, stat: "revival", per: 1, cost: 3e3 }
    ];
    BLESSINGS = [
      { id: "berserk", name: "\u72C2\u6218\u58EB\u4E4B\u5FC3", icon: "icon_might", desc: "\u751F\u547D\u6BCF\u635F\u5931 10%\uFF0C\u4F24\u5BB3 +8%" },
      { id: "chainboom", name: "\u8FDE\u9501\u7206\u70B8", icon: "icon_bomb", desc: "\u654C\u4EBA\u88AB\u51FB\u8D25\u65F6 15% \u51E0\u7387\u7206\u70B8\uFF0C\u6CE2\u53CA\u5468\u56F4" },
      { id: "vampkiss", name: "\u6CBB\u6108\u4E4B\u543B", icon: "icon_fang", desc: "\u6BCF\u6B21\u66B4\u51FB\u56DE\u590D 1 \u70B9\u751F\u547D" },
      { id: "timerift", name: "\u65F6\u95F4\u88C2\u9699", icon: "icon_duration", desc: "\u6BCF 25 \u79D2\u51BB\u7ED3\u5168\u573A\u654C\u4EBA 3 \u79D2" },
      { id: "gemstorm", name: "\u5B9D\u77F3\u98CE\u66B4", icon: "icon_lightning", desc: "\u62FE\u53D6\u5B9D\u77F3\u65F6 6% \u51E0\u7387\u53EC\u5524\u843D\u96F7" },
      { id: "glass", name: "\u73BB\u7483\u5927\u70AE", icon: "icon_critdmg", desc: "\u4F24\u5BB3 +60%\uFF0C\u6700\u5927\u751F\u547D -40%" },
      { id: "greedpact", name: "\u8D2A\u5A6A\u5951\u7EA6", icon: "icon_gold", desc: "\u91D1\u5E01 \xD72\uFF0C\u4F46\u654C\u4EBA\u6570\u91CF +30%" },
      { id: "ghost", name: "\u75BE\u98CE\u6B65\u4F10", icon: "icon_move", desc: "\u53D7\u4F24\u540E 1.5 \u79D2\u65E0\u654C\u5E76\u52A0\u901F 50%" },
      { id: "twin", name: "\u53CC\u751F\u4E4B\u529B", icon: "icon_amount", desc: "\u6240\u6709\u6B66\u5668\u6570\u91CF +1\uFF0C\u51B7\u5374 +15%" },
      { id: "magstorm", name: "\u78C1\u66B4", icon: "icon_magnet", desc: "\u62FE\u53D6\u8303\u56F4 \xD72\uFF0C\u6BCF 45 \u79D2\u5438\u53D6\u5168\u90E8\u5B9D\u77F3" },
      { id: "frenzy", name: "\u8FDE\u51FB\u72C2\u70ED", icon: "icon_cooldown", desc: "\u8FDE\u51FB\u8FBE\u5230 50 \u65F6\uFF0C\u51B7\u5374 -30%" },
      { id: "holylight", name: "\u661F\u5149\u5E87\u62A4", icon: "icon_heart", desc: "\u6BCF\u6B21\u5347\u7EA7\u56DE\u590D 15% \u751F\u547D" },
      { id: "giant", name: "\u5DE8\u4EBA\u5316", icon: "icon_area", desc: "\u653B\u51FB\u8303\u56F4 +40%\uFF0C\u79FB\u52A8\u901F\u5EA6 -15%" },
      { id: "thornaura", name: "\u8346\u68D8\u5149\u73AF", icon: "icon_thorns", desc: "\u53D7\u5230\u4F24\u5BB3\u65F6\uFF0C\u5BF9\u5468\u56F4\u654C\u4EBA\u9020\u6210\u5927\u91CF\u4F24\u5BB3" },
      { id: "overload", name: "\u8D85\u8F7D", icon: "icon_chain", desc: "\u6BCF 30 \u79D2\u8FDB\u5165 8 \u79D2\u8D85\u8F7D\uFF1A\u51B7\u5374 -50%" },
      { id: "nova", name: "\u661F\u7206", icon: "icon_critdmg", desc: "\u6BCF\u6B21\u5347\u7EA7\u91CA\u653E\u5168\u5C4F\u661F\u7206\uFF0C\u91CD\u521B\u6240\u6709\u654C\u4EBA" },
      { id: "ultfan", name: "\u80FD\u91CF\u6D8C\u52A8", icon: "battery", desc: "\u5927\u62DB\u5145\u80FD\u901F\u5EA6 +50%\uFF0C\u91CA\u653E\u5927\u62DB\u540E 5 \u79D2\u4F24\u5BB3 +30%" },
      { id: "epicfan", name: "\u795E\u5175\u7737\u987E", icon: "epic_excalibur", desc: "\u795E\u5175\u6301\u7EED\u65F6\u95F4 +50%\uFF0C\u795E\u5175\u796D\u575B\u51FA\u73B0\u66F4\u9891\u7E41" },
      { id: "echo", name: "\u56DE\u54CD", icon: "icon_amount", desc: "\u6B66\u5668\u6BCF\u6B21\u653B\u51FB\u6709 15% \u51E0\u7387\u7ACB\u523B\u518D\u653B\u51FB\u4E00\u6B21" },
      { id: "phoenix", name: "\u6D74\u706B\u91CD\u751F", icon: "icon_fire", desc: "\u53D7\u5230\u81F4\u547D\u4F24\u5BB3\u65F6\u6D74\u706B\u91CD\u751F\uFF1A\u56DE\u590D 50% \u751F\u547D\u5E76\u707C\u70E7\u5468\u56F4\uFF08\u6BCF\u5C40\u4E00\u6B21\uFF09" }
    ];
    ACHIEVEMENTS = [
      { id: "win1", name: "\u521D\u6B21\u80DC\u5229", desc: "\u8D62\u5F97\u4E00\u5C40\u6E38\u620F", gold: 500 },
      { id: "kill1k", name: "\u5272\u8349\u80FD\u624B", desc: "\u5355\u5C40\u51FB\u8D25 1000 \u4E2A\u654C\u4EBA", gold: 200 },
      { id: "kill5k", name: "\u5272\u8349\u5927\u5E08", desc: "\u5355\u5C40\u51FB\u8D25 5000 \u4E2A\u654C\u4EBA", gold: 600 },
      { id: "combo500", name: "\u65E0\u53CC", desc: "\u8FBE\u6210 500 \u8FDE\u51FB", gold: 300 },
      { id: "lv50", name: "\u767B\u5CF0\u9020\u6781", desc: "\u5355\u5C40\u8FBE\u5230 50 \u7EA7", gold: 300 },
      { id: "evo1", name: "\u8FDB\u5316", desc: "\u8FDB\u5316\u4E00\u628A\u6B66\u5668", gold: 300 },
      { id: "evo3", name: "\u8FDB\u5316\u5927\u5E08", desc: "\u5355\u5C40\u8FDB\u5316 3 \u628A\u6B66\u5668", gold: 800 },
      { id: "boss_slimeking", name: "\u53F2\u83B1\u59C6\u514B\u661F", desc: "\u51FB\u8D25\u53F2\u83B1\u59C6\u738B", gold: 150 },
      { id: "boss_bonelord", name: "\u7834\u7532\u8005", desc: "\u51FB\u8D25\u94C1\u7532\u5C06\u519B", gold: 200 },
      { id: "boss_vampire", name: "\u7834\u6653", desc: "\u51FB\u8D25\u8759\u8760\u4F2F\u7235", gold: 250 },
      { id: "boss_lich", name: "\u878D\u51B0", desc: "\u51FB\u8D25\u51B0\u971C\u5DEB\u5E08", gold: 300 },
      { id: "boss_eye", name: "\u95ED\u76EE", desc: "\u51FB\u8D25\u6C34\u6676\u9B54\u773C", gold: 350 },
      { id: "boss_reaper", name: "\u8C22\u5E55", desc: "\u51FB\u8D25\u6697\u591C\u9B54\u672F\u5E08", gold: 800 },
      { id: "goldrat", name: "\u6355\u9F20\u8FBE\u4EBA", desc: "\u6293\u4F4F\u4E00\u53EA\u91D1\u9F20", gold: 150 },
      { id: "endless20", name: "\u6C38\u591C\u884C\u8005", desc: "\u65E0\u5C3D\u6A21\u5F0F\u5B58\u6D3B 20 \u5206\u949F", gold: 1e3 },
      { id: "allchars", name: "\u5168\u5458\u96C6\u7ED3", desc: "\u89E3\u9501\u5168\u90E8\u89D2\u8272", gold: 1e3 },
      { id: "nightmare1", name: "\u5669\u68A6\u5F81\u670D\u8005", desc: "\u5728\u5669\u68A6\u96BE\u5EA6\u4E0B\u53D6\u5F97\u80DC\u5229", gold: 1500 },
      { id: "codex_half", name: "\u6536\u85CF\u5BB6", desc: "\u56FE\u9274\u6536\u96C6\u8FBE\u5230 50%", gold: 300 },
      { id: "codex_full", name: "\u535A\u7269\u5B66\u5BB6", desc: "\u56FE\u9274\u5168\u90E8\u6536\u96C6", gold: 1500 },
      { id: "stage_snow", name: "\u8E0F\u96EA\u800C\u5F52", desc: "\u5728\u51B0\u96EA\u8352\u539F\u53D6\u5F97\u80DC\u5229", gold: 800 },
      { id: "stage_lava", name: "\u6D74\u706B\u91CD\u751F", desc: "\u5728\u7194\u5CA9\u706B\u5C71\u53D6\u5F97\u80DC\u5229", gold: 1500 },
      { id: "stage_swamp", name: "\u6CBC\u6CFD\u4E4B\u738B", desc: "\u5728\u6BD2\u96FE\u6CBC\u6CFD\u53D6\u5F97\u80DC\u5229", gold: 2e3 },
      { id: "stage_desert", name: "\u8352\u6F20\u65C5\u4EBA", desc: "\u5728\u6D41\u6C99\u8352\u6F20\u53D6\u5F97\u80DC\u5229", gold: 2500 },
      { id: "boss_worm", name: "\u9A6F\u670D\u5DE8\u8815", desc: "\u51FB\u8D25\u6D41\u6C99\u8352\u6F20\u7684\u6C99\u6F20\u5DE8\u8815", gold: 500 },
      { id: "daily1", name: "\u6BCF\u65E5\u4E00\u5272", desc: "\u5B8C\u6210\u4E00\u6B21\u6BCF\u65E5\u6311\u6218", gold: 300 },
      { id: "boss_toad", name: "\u9664\u87FE\u8005", desc: "\u51FB\u8D25\u6BD2\u96FE\u6CBC\u6CFD\u7684\u6BD2\u6CBC\u5DE8\u87FE", gold: 400 },
      { id: "boss_yeti", name: "\u96EA\u591C\u82F1\u96C4", desc: "\u51FB\u8D25\u5723\u8BDE\u9650\u5B9A Boss \u96EA\u602A\u738B", gold: 600 },
      { id: "boss_nian", name: "\u9A71\u9010\u5E74\u517D", desc: "\u51FB\u8D25\u65B0\u6625\u9650\u5B9A Boss \u5E74\u517D", gold: 600 },
      { id: "epic3", name: "\u795E\u5175\u6536\u85CF\u5BB6", desc: "\u5355\u5C40\u4F7F\u7528 3 \u628A\u795E\u5175", gold: 300 },
      { id: "trial2", name: "\u8BD5\u70BC\u52C7\u8005", desc: "\u5355\u5C40\u5B8C\u6210 2 \u6B21\u8BD5\u70BC", gold: 400 },
      { id: "ult10", name: "\u5927\u62DB\u72C2\u9B54", desc: "\u5355\u5C40\u91CA\u653E 10 \u6B21\u5927\u62DB", gold: 300 }
    ];
    ENDLESS_BOSS_INTERVAL = 150;
    DAILY_MODS = [
      { id: "fast", name: "\u602A\u6F6E\u72C2\u5954", desc: "\u602A\u7269\u79FB\u52A8\u901F\u5EA6 +25%" },
      { id: "xp2", name: "\u7ECF\u9A8C\u7FFB\u500D", desc: "\u7ECF\u9A8C \xD72\uFF0C\u4F46\u602A\u7269\u751F\u547D +50%" },
      { id: "elites", name: "\u7CBE\u82F1\u6A2A\u884C", desc: "\u6BCF 12 \u79D2\u51FA\u73B0\u4E00\u53EA\u7CBE\u82F1\u602A" },
      { id: "gold3", name: "\u91D1\u5E01\u72C2\u6B22", desc: "\u91D1\u5E01 \xD73\uFF0C\u4F46\u4E0D\u4F1A\u6389\u843D\u70E4\u9E21" },
      { id: "horde", name: "\u65E0\u5C3D\u602A\u6F6E", desc: "\u602A\u7269\u6570\u91CF +40%" },
      { id: "glass", name: "\u6613\u788E\u5976\u86D9", desc: "\u53D7\u5230\u4F24\u5BB3 \xD71.5\uFF0C\u9020\u6210\u4F24\u5BB3 +40%" }
    ];
    DAILY_GOAL = 600;
    DAILY_REWARD = 400;
    PICKUP_INFO = {
      chicken: { name: "\u70E4\u9E21\u817F", desc: "\u56DE\u590D 30 \u751F\u547D\u3002\u5F88\u7A00\u6709\uFF0C\u7701\u7740\u70B9\u53D7\u4F24\uFF01" },
      coinbag: { name: "\u91D1\u5E01\u888B", desc: "\u4E00\u5927\u888B\u91D1\u5E01\u3002" },
      magnet: { name: "\u78C1\u94C1", desc: "\u5438\u53D6\u5168\u573A\u7684\u7ECF\u9A8C\u5B9D\u77F3\u548C\u91D1\u5E01\u3002" },
      watch: { name: "\u6000\u8868", desc: "\u65F6\u95F4\u505C\u6B62\uFF1A\u51BB\u7ED3\u6240\u6709\u654C\u4EBA 5 \u79D2\u3002" },
      nuke: { name: "\u661F\u5149\u5BA1\u5224", desc: "\u5BF9\u5C4F\u5E55\u5185\u6240\u6709\u654C\u4EBA\u9020\u6210\u5927\u91CF\u4F24\u5BB3\u3002" },
      potion: { name: "\u72C2\u66B4\u836F\u6C34", desc: "10 \u79D2\u5185\u4F24\u5BB3 +50%\u3001\u79FB\u901F +30%\u3002" },
      shield: { name: "\u5723\u76FE", desc: "\u62B5\u6321\u63A5\u4E0B\u6765 3 \u6B21\u4F24\u5BB3\u3002" },
      haste: { name: "\u6025\u901F\u6C99\u6F0F", desc: "12 \u79D2\u5185\u6240\u6709\u6B66\u5668\u51B7\u5374 -40%\u3002" },
      clover: { name: "\u56DB\u53F6\u8349", desc: "15 \u79D2\u5185\u66B4\u51FB\u7387 +30%\uFF0C\u51FB\u8D25\u654C\u4EBA\u6389\u843D\u66F4\u591A\u91D1\u5E01\u3002" },
      firering: { name: "\u70C8\u7130\u4E4B\u73AF", desc: "10 \u79D2\u5185\u8EAB\u8FB9\u73AF\u7ED5\u706B\u7130\uFF0C\u6301\u7EED\u707C\u70E7\u9760\u8FD1\u7684\u654C\u4EBA\u3002" },
      scroll: { name: "\u667A\u6167\u5377\u8F74", desc: "\u7ACB\u523B\u63D0\u5347 1 \u7EA7\u3002" },
      giant: { name: "\u5DE8\u4EBA\u8611\u83C7", desc: "10 \u79D2\u5185\u53D8\u6210\u5DE8\u578B\u5976\u86D9\uFF1A\u78BE\u538B\u649E\u5230\u7684\u654C\u4EBA\uFF0C\u53D7\u5230\u4F24\u5BB3\u51CF\u534A\u3002" },
      dice: { name: "\u547D\u8FD0\u9AB0\u5B50", desc: "\u63B7\u51FA\u968F\u673A\u7ED3\u679C\uFF1A\u795E\u5175\u3001\u5347\u7EA7\u3001\u6E05\u5C4F\u3001\u56DE\u6EE1\u751F\u547D\u2026\u2026\u4E5F\u53EF\u80FD\u62DB\u6765\u7CBE\u82F1\u602A\uFF01" },
      decoy: { name: "\u5E7B\u5F71\u86D9", desc: "\u653E\u51FA\u4E00\u53EA\u8BF1\u9975\u5976\u86D9\u5438\u5F15\u602A\u7269 8 \u79D2\uFF0C\u6700\u540E\u8F70\u7136\u7206\u70B8\u3002" },
      boots: { name: "\u75BE\u98CE\u9774", desc: "10 \u79D2\u5185\u79FB\u901F +60%\uFF0C\u811A\u4E0B\u7559\u4E0B\u71C3\u70E7\u7684\u8DB3\u8FF9\u3002" },
      bank: { name: "\u805A\u5B9D\u76C6", desc: "6 \u79D2\u5185\u8EAB\u8FB9\u4E0D\u65AD\u6D8C\u51FA\u91D1\u5E01\u3002" },
      battery: { name: "\u80FD\u91CF\u7535\u6C60", desc: "\u5927\u62DB\u7ACB\u523B\u5145\u6EE1\u3002" }
    };
    BRAZIER_DROPS = [
      ["chicken", 10],
      ["coinbag", 12],
      ["magnet", 8],
      ["watch", 7],
      ["nuke", 8],
      ["potion", 7],
      ["shield", 8],
      ["haste", 8],
      ["clover", 7],
      ["firering", 7],
      ["scroll", 3],
      ["giant", 6],
      ["dice", 6],
      ["decoy", 5],
      ["boots", 6],
      ["bank", 4],
      ["battery", 5],
      ["epic", 2]
    ];
    BUFF_DROPS = ["potion", "shield", "haste", "clover", "firering", "giant", "boots", "decoy"];
    EPIC_TIME = 30;
    EPICS = [
      { id: "thor", name: "\u96F7\u795E\u4E4B\u9524", desc: "\u96F7\u9524\u73AF\u7ED5\u8EAB\u8FB9\u7838\u98DE\u654C\u4EBA\uFF0C\u843D\u96F7\u8FDE\u7EED\u5288\u5411\u5C4F\u5E55\u5185\u7684\u654C\u4EBA\u3002", color: 8440063 },
      { id: "gatling", name: "\u661F\u5149\u52A0\u7279\u6797", desc: "\u6BCF\u79D2\u5411\u6700\u8FD1\u7684\u654C\u4EBA\u503E\u6CFB 16 \u53D1\u7A7F\u900F\u661F\u5F39\u3002", color: 16769120 },
      { id: "excalibur", name: "\u5723\u5251\xB7\u65AD\u7F6A", desc: "\u6BCF\u79D2\u6325\u51FA\u4E00\u9053\u5DE8\u5927\u7684\u5723\u5149\u5251\u73AF\uFF0C\u6A2A\u626B\u8EAB\u8FB9\u4E00\u5207\u3002", color: 16773280 },
      { id: "blackhole", name: "\u9ED1\u6D1E\u6CD5\u7403", desc: "\u5728\u654C\u7FA4\u4E2D\u53EC\u5524\u9ED1\u6D1E\uFF0C\u5438\u4F4F\u4E00\u5927\u7247\u654C\u4EBA\u540E\u5185\u7206\u3002", color: 11563263 },
      { id: "dragon", name: "\u9F99\u606F", desc: "\u5411\u9762\u671D\u65B9\u5411\u6301\u7EED\u55B7\u5410\u70C8\u7130\uFF0C\u70E7\u51FA\u4E00\u6761\u706B\u6D77\u3002", color: 16740400 },
      { id: "meteor", name: "\u6D41\u661F\u6743\u6756", desc: "\u6D41\u661F\u63A5\u8FDE\u7838\u5411\u5C4F\u5E55\u5185\u7684\u654C\u4EBA\u3002", color: 16751184 },
      { id: "unicorn", name: "\u5F69\u8679\u72EC\u89D2\u517D", desc: "\u9A91\u4E0A\u72EC\u89D2\u517D\uFF1A\u79FB\u901F +60%\uFF0C\u649E\u98DE\u6CBF\u9014\u654C\u4EBA\uFF0C\u8EAB\u540E\u7559\u4E0B\u5F69\u8679\u3002", color: 16748768 }
    ];
    ENEMY_IDS = new Map(Object.keys(ENEMIES).map((k) => [ENEMIES[k], k]));
    QUEST_POOL = [
      { id: "kills1", stat: "kills", n: 1500, name: "\u7D2F\u8BA1\u51FB\u8D25 1500 \u53EA\u602A\u7269", gold: 120 },
      { id: "kills2", stat: "kills", n: 4e3, name: "\u7D2F\u8BA1\u51FB\u8D25 4000 \u53EA\u602A\u7269", gold: 200 },
      { id: "time1", stat: "time", n: 300, name: "\u5355\u5C40\u5B58\u6D3B 5 \u5206\u949F", gold: 100, best: true },
      { id: "time2", stat: "time", n: 540, name: "\u5355\u5C40\u5B58\u6D3B 9 \u5206\u949F", gold: 180, best: true },
      { id: "boss", stat: "boss", n: 3, name: "\u7D2F\u8BA1\u51FB\u8D25 3 \u4E2A Boss", gold: 150 },
      { id: "evolve", stat: "evolve", n: 1, name: "\u8FDB\u5316 1 \u628A\u6B66\u5668", gold: 180 },
      { id: "gold", stat: "gold", n: 300, name: "\u7D2F\u8BA1\u62FE\u53D6 300 \u91D1\u5E01", gold: 100 },
      { id: "chest", stat: "chest", n: 3, name: "\u7D2F\u8BA1\u5F00\u542F 3 \u4E2A\u5B9D\u7BB1", gold: 120 },
      { id: "runs", stat: "runs", n: 2, name: "\u5B8C\u6210 2 \u5C40\u6E38\u620F", gold: 100 },
      { id: "level", stat: "level", n: 30, name: "\u5355\u5C40\u8FBE\u5230 30 \u7EA7", gold: 150, best: true },
      { id: "combo", stat: "combo", n: 300, name: "\u5355\u5C40\u8FDE\u51FB\u8FBE\u5230 300", gold: 150, best: true }
    ];
    QUEST_BONUS = 200;
    SIGNIN_REWARDS = [100, 120, 150, 180, 220, 260, 600];
  }
});

// ../promo/env.ts
var EDITOR;
var init_env = __esm({
  "../promo/env.ts"() {
    EDITOR = false;
  }
});

// ../../assets/scripts/AdConfig.ts
var AD_CONFIG;
var init_AdConfig = __esm({
  "../../assets/scripts/AdConfig.ts"() {
    AD_CONFIG = {
      // 激励视频广告位 ID（形如 adunit-xxxxxxxxxxxx），所有激励位共用
      rewarded: "",
      // 可选：按位置单独配置激励视频广告位（便于在后台分别统计收益），留空则使用 rewarded
      rewardedByPlace: {
        revive: "",
        // 死亡复活
        gold: "",
        // 结算金币 ×2
        reroll: "",
        // 升级重抽
        chest: "",
        // 宝箱再开一次
        blessing: "",
        // 开局额外命运卡
        signin: ""
        // 签到双倍
      },
      // 插屏广告位 ID：只在结算后弹出，每 N 局一次，新用户首日不弹
      interstitial: "",
      interstitialEvery: 3,
      // 每局次数上限
      rerollPerRun: 2,
      // 调试：true 时在浏览器预览中模拟"看完广告"直接发奖，便于测试流程；上线前务必改回 false
      debugFake: false
    };
  }
});

// ../../assets/scripts/Sound.ts
function vibrate(heavy = false) {
  if (!Save.data.vibrate) return;
  const w = globalThis.wx;
  try {
    if (w && w.vibrateShort) w.vibrateShort({ type: heavy ? "heavy" : "light" });
  } catch (e) {
  }
}
var Sound;
var init_Sound = __esm({
  "../../assets/scripts/Sound.ts"() {
    init_cc();
    init_Save();
    Sound = class {
      static {
        this.clips = /* @__PURE__ */ new Map();
      }
      static {
        this.last = /* @__PURE__ */ new Map();
      }
      static {
        this.current = "";
      }
      static {
        this.loaded = false;
      }
      static {
        // 各音效的默认音量与最小触发间隔（秒），防止大量怪物同时被击中时音效堆叠
        this.CFG = {
          hit: [0.4, 0.06],
          kill: [0.35, 0.05],
          crit: [0.5, 0.09],
          combo: [0.8, 0.3],
          bigkill: [1, 0.5],
          gem: [0.35, 0.05],
          coin: [0.6, 0.05],
          whip: [0.9, 0.05],
          shoot: [0.45, 0.05],
          knife: [0.45, 0.05],
          axe: [0.6, 0.08],
          lightning: [0.6, 0.1],
          hurt: [0.7, 0.15],
          click: [0.7, 0.03],
          eshot: [0.4, 0.08],
          slam: [0.9, 0.2],
          dash: [0.7, 0.15],
          laser: [0.8, 0.5],
          teleport: [0.7, 0.3],
          roar: [1, 1],
          fire: [0.5, 0.08],
          throw: [0.4, 0.06],
          splash: [0.5, 0.1],
          boom: [0.7, 0.07],
          freeze: [0.7, 0.2],
          zap: [0.6, 0.1],
          pew: [0.3, 0.05],
          beam: [0.55, 0.08],
          faint: [1, 1],
          power: [0.9, 0.3],
          card: [0.9, 0.2],
          achieve: [1, 0.5],
          croak: [0.9, 0.25]
        };
      }
      static init(parent) {
        const b = new Node("BGM");
        parent.addChild(b);
        this.bgm = b.addComponent(AudioSource);
        this.bgm.loop = true;
        this.bgm.volume = 0.45;
        const s = new Node("SFX");
        parent.addChild(s);
        this.sfxSrc = s.addComponent(AudioSource);
        resources.loadDir("audio", AudioClip, (err, list) => {
          if (err) {
            console.warn("[Sound] load failed", err);
            return;
          }
          for (const c of list) this.clips.set(c.name, c);
          this.loaded = true;
          const want = this.current;
          this.current = "";
          if (want) this.playBgm(want);
        });
      }
      static playBgm(name) {
        if (this.current === name && this.bgm.playing) return;
        this.current = name;
        if (!this.loaded) return;
        this.bgm.stop();
        const clip = this.clips.get(name);
        if (!clip || !Save.data.music) return;
        this.bgm.clip = clip;
        this.bgm.play();
      }
      static refreshMusic() {
        if (!Save.data.music) this.bgm.stop();
        else if (this.current) {
          const n = this.current;
          this.current = "";
          this.playBgm(n);
        }
      }
      static bgmPlaying() {
        return !!this.bgm && this.bgm.playing;
      }
      static pauseBgm() {
        if (this.bgm.playing) this.bgm.pause();
      }
      static resumeBgm() {
        if (Save.data.music && this.bgm.clip && !this.bgm.playing) this.bgm.play();
      }
      static play(name, vol) {
        if (!Save.data.sfx || !this.loaded) return;
        const clip = this.clips.get(name);
        if (!clip) return;
        const cfg = this.CFG[name] || [0.7, 0.03];
        const now = Date.now() / 1e3;
        if (now - (this.last.get(name) || 0) < cfg[1]) return;
        this.last.set(name, now);
        this.sfxSrc.playOneShot(clip, vol ?? cfg[0]);
      }
    };
  }
});

// ../../assets/scripts/Ads.ts
function mgApi() {
  const g2 = globalThis;
  return g2.wx || g2.tt || null;
}
var Ads;
var init_Ads = __esm({
  "../../assets/scripts/Ads.ts"() {
    init_AdConfig();
    init_Save();
    init_Sound();
    Ads = class {
      static {
        this.units = /* @__PURE__ */ new Map();
      }
      static {
        this.fails = /* @__PURE__ */ new Map();
      }
      static {
        this.inter = null;
      }
      static {
        this.pending = null;
      }
      static {
        this.busy = false;
      }
      static get showing() {
        return this.busy;
      }
      static {
        this.bgmWasPlaying = false;
      }
      static init() {
        const a = mgApi();
        if (!a) return;
        const ids = /* @__PURE__ */ new Set();
        if (AD_CONFIG.rewarded) ids.add(AD_CONFIG.rewarded);
        for (const k in AD_CONFIG.rewardedByPlace) if (AD_CONFIG.rewardedByPlace[k]) ids.add(AD_CONFIG.rewardedByPlace[k]);
        if (a.createRewardedVideoAd) {
          ids.forEach((id) => {
            try {
              const ad = a.createRewardedVideoAd({ adUnitId: id });
              ad.onLoad(() => this.fails.set(id, 0));
              ad.onError(() => this.fails.set(id, (this.fails.get(id) || 0) + 1));
              ad.onClose((res2) => this.finish({ ok: !res2 || res2.isEnded !== false, reason: res2 && res2.isEnded === false ? "skipped" : void 0 }));
              this.units.set(id, ad);
            } catch (e) {
            }
          });
        }
        if (AD_CONFIG.interstitial && a.createInterstitialAd) {
          try {
            this.inter = a.createInterstitialAd({ adUnitId: AD_CONFIG.interstitial });
            this.inter.onError(() => {
            });
          } catch (e) {
            this.inter = null;
          }
        }
        if (!Save.data.firstDay) {
          Save.data.firstDay = (/* @__PURE__ */ new Date()).toDateString();
          Save.save();
        }
      }
      static unitFor(place) {
        return AD_CONFIG.rewardedByPlace[place] || AD_CONFIG.rewarded;
      }
      // 某个位置当前能否展示激励视频（未配置 / 非小游戏环境 / 连续拉取失败 3 次 → 不可用）
      static canReward(place) {
        if (AD_CONFIG.debugFake) return true;
        const id = this.unitFor(place);
        return !!id && this.units.has(id) && (this.fails.get(id) || 0) < 3;
      }
      static showReward(place, cb) {
        if (this.busy) return;
        if (AD_CONFIG.debugFake) {
          cb({ ok: true });
          return;
        }
        const ad = this.units.get(this.unitFor(place));
        if (!ad) {
          cb({ ok: false, reason: "error" });
          return;
        }
        this.busy = true;
        this.pending = cb;
        this.bgmWasPlaying = Sound.bgmPlaying();
        Sound.pauseBgm();
        ad.show().catch(() => {
          ad.load().then(() => ad.show()).catch(() => {
            const id = this.unitFor(place);
            this.fails.set(id, (this.fails.get(id) || 0) + 1);
            this.finish({ ok: false, reason: "error" });
          });
        });
      }
      static finish(r) {
        const cb = this.pending;
        this.pending = null;
        this.busy = false;
        if (this.bgmWasPlaying) Sound.resumeBgm();
        if (cb) cb(r);
      }
      // 结算后调用：每 N 局一次插屏；新用户首日、本次结算已看过激励视频时不弹
      static afterRun(watchedReward) {
        const d2 = Save.data;
        d2.runsSinceInter = (d2.runsSinceInter || 0) + 1;
        Save.save();
        if (!this.inter || watchedReward) return;
        if (d2.firstDay === (/* @__PURE__ */ new Date()).toDateString()) return;
        if (d2.runsSinceInter < AD_CONFIG.interstitialEvery) return;
        d2.runsSinceInter = 0;
        Save.save();
        this.inter.show().catch(() => {
        });
      }
    };
  }
});

// ../../assets/scripts/HeroArt.ts
var HERO_ART;
var init_HeroArt = __esm({
  "../../assets/scripts/HeroArt.ts"() {
    HERO_ART = {
      hunter: { w: 49, h: 64, pal: "d2aa58,d0a12c,625218,62a947,e8ca50,61ac32,edc537,f7dba0,6ac04a,a1730a,876f41,081002,b08821,365c30,b48740,dfbe82,000000,fbd23d,dca724,fbd342,f7daa2,f7cb3a,e6c285,e0aa26,875c05,e2bb7c,c7921c,e5b52a,c38d18,d2a967,f6d79c,74623a,dbb576,ba8916,e3be81,f7cc44,67b739,d39d22,976808,382807,d5a537,59b53b,c99925,e9b834,ecc676,583c03,111006,b58b24,ecc567,120d02,675633,715d37,d8a41c,f0c977,412d04,47350a,5a4a24,8c6004,816a3e,684c0b,79540b,766340,73b836,896315,c69b56,cea664,ebcc44,eece94,f2c857,fbd555,fada87,281b04,443513,5bbd40,65b22e,69b551,a67715,a98625,bc9627", px: ".20jT9.37bbTR5T4RR.33SXVVTTR4T3R3TT.31SSTR5T4R3T3.30SSR4TTR4TTR3TTR.28SSRTRRT3R7TRT3V.27SSTRT_kkFR8TTppG.26qSBTT-D{{kERTTR3TTk{II.26SSRRTk^NQDpTTRT4-DDQF-.25SSRRT^DQ3pTRRT3RkIQ3-.25SST3^FQ3kTR6kkQ3k.24oSbRRTkpQQDkR6T_pLQCF.23[SSbR3TkppkR9_ppkT.23[SSR5T3RRTR5TTRRTRR.22%qSSR10tTTR3TTR5.22!S3R11t5}R6.22!S3R11TR5TR5B.20!SSbTR23V.20S3bR24T.19lSSVR27.18SSR29E.16SSTR30.15SSjR32E.11uoXTR34<u.9SSTTR5TR9TR16T4.8ASVTTR6TR9T8R5TRrT4Ru.6oSTTRT3VaRXTR5TT?@UeU4@TTRT4SrT4<.5SSTR3T4hSXTTRTT@eU10e@?RT??mbVRT3.5SSTR3TRRTTmXT4U3HHU10etn5brTTRR.4SSTR5T3YXRT*n$%*C*U10$f5,$bVRTR<..SSR8TTYS/$f4)K)/mmAU3HC]zf,,]nn[BVRRTT..SSR7T3Y&&f5))KTR3JJhMCCzzy&f,fy$VR3T..XXTR6TTV~n&yyz3f)KTRRTR9V]nn%qVR5.SXTR7TVACCY*CyCffMrR13TT<BTTRTRRT.SXXTR6T3RRbr++&Cy}lSTTR11TRT3R4S.SXXVTR5T3R5S+%%~S4TR12T3RTRTX.uSSXTRTTRTR8TTVa/tS5TTR12T3VS.xS4T3RTR3TR4TTV!acYmS5TR11T3SS.QCS4T3R4TRTTRRVGXXScJYlS5bR9TGXSo.xqYS4rTTR3T4RbbX4ca|+|S7TR6SSXS..SlcmS4bbRT5bXSSX3hm(;;dOmS6XXS4XSSx..S3B|qS9X4SSm3g4d3YYqS4X4S3(u..S4chSSXS8XSYYdgZUUeUegAddY3SX6(m~L..S4aam(XS7oYYgZg=U8WggAdY6(doqx.S!lSSaaBAY8/g3ieU10eg3d5;;dASC.SSlS3aBA:4A3g3ZU15WWd6Z3Sl.S7d3Z6iPU19eeWWZZiiASo.S7AZ4W==eU23HeZi3wVo.S7Z5WU3eU24iiWiEVo.cS6oZ3iieU26W4wTVo.cS7AZZiWWU24eW4i>VVB.hcS6V>iW3iWWU20eW5jVV!B.ucaS6VEW7U18eW4sjV3S..xcaS6VVj>wW5U16=W4wjVVjSS..xccS8VVjwsW6eeU7eeW5jjV4SSa.4aS9V4wsW14sW3TjV4SXSB.5vcS9V6jwss##ss#3s#>V4RVVbS4B.6hhS8bVVR6VR6VRRV6S3XXSq.8hhSXS5XXSRTTR14V3S6hc.8ca4S11R8V6XS7abbB.5uS3brS3alS29VVTTj.4aSVRTRVSSlqhS23laSbVVT4b.3aSjVTTjSSlBhv3hhc4aac5aac}vvhhSSXVVTRVTr.3qSSjTGSSl3hv.21hcalS3b4r.." },
      rogue: { w: 72, h: 64, pal: "624e1f,95692a,dbab2b,9b744d,2a270f,ab8d5b,32561f,61ae33,53310f,61b443,aa9e91,edcd54,f2ebe2,ae8b26,d2a95f,716453,eccc99,edc133,c4b5a9,000000,fbd13d,45792a,fad242,25471a,d8a424,573516,f5c93a,281604,051604,45280b,f5d698,355924,183813,392209,170b01,492a12,331c07,a97715,633b19,142709,87582a,2d5321,4a812d,0b2408,171504,3b6228,744923,976636,563606,ca9723,d39d22,b9861a,e2bc7c,67441a,694421,74491c,ca951d,233a14,2b511d,7b5527,262708,4a3115,976a16,e2bd80,18330e,63b839,765635,e8c587,f7cd41,1d4116,436c31,b17d15,497234,59b43a,835817,c18c1c,cba564,d8b477,e0ac27", px: ".30FW7>.60sCL>UW8>s.56NNaWWU6WUL3F.54AYRLW3U3WWUW5.54YYWWUUWU4W3UWUWas.50nCYWWU3WWU9WWa.50dYYWU3H3U10HL.50dYYUWUJ^J^HU8H^H.10ss.37sYYUUW;J4;HUUWU3H;JJH.9Ov.37sYYU3;JJTT^^U6;;MTH.8oB$.36sxYYW3^JT3JHU6;JTTH.7EuZ.37BYYU4^JT3HHWWU4;JTTH.7bkh.37-YYU3WW;^ggHWU6W;tg;.7i,m.36TBYYU5WH3WU8WH^L.6BEE$o.30cTg..TxyYU6WUWUWU6WUaUU.5DD.bZB.30fGgr.Tx&YWU9AW6LaUaU.4$.4dBu.28pVV@cTT{&~CU9aBw5U4C.3DD.5jvo.27XptV]trsnNYCU10aaU7C..D,.7ZvB.26rXXtq3VfgnnCWaU6aU9YTP<.8TZv%.24(GX?3pVVqqVVrCaU6aU8CCdAA.9Z%B.24XXg4?XXpV3qfnCa>U10aRxB<AfG.9ZBB.23ggcTTc3rXXfV4nra3U3WU4CND<AfXg.9h*B.23rcggXXt3rrggXV4r+CU3WWUUCAA<Af.12imBv.22TX3fV4fXggrXpV3AnNOCBAYCnED.15iZDv.21cEXXV4qV3pGXrng?VVGX(+QMAEED.4fVffc.7iZB%.21TXfVVftqHGXXfft)Xnn:rGXsMDFMnD.3fV3t.T.7iZvu.20TXtV3pfqqVqqVV))pX:rg:nbD,AAB.4f..tf.9imvZ.20Tftf.qqV4fcTcXXgrn+(bhbPEAj*.7f.10d#oZ.19T?pp.]q3]:+w_wwbbEdkwwhbwdDhmZ.9V3.6$om.20Tf).p]qqpX:zC#oBmm*ZhaU3A$ZMI#wA.4tV3.15c.19]qq]XECyNvvBuuBdUW5iZMMPIA.5Xfp..oBA.3mBm.4QP.17VVqqGwBYCZouu$oblUW3URC$FDDv3DBBvv.3#IIdI.U.dE.4KMM.16V4cAzyxhu3ZmblW4C_b4EiEbhZ<BvvBD5#>WUZvDBA<<M3T.14V]](sA-lBkmdIdZiAYWUUa-bbAbFFZAfggnTdAB*hi3&CC.7SKKME.12@VV@cwA-3kdjjhhbdzxCCNwDZu}}BmAf)XgTIAlzIZkjbN.Na{.3AKKEc.13@V]?ThwI-B_bdjk.hTTxYCdF3,=!FAAGf?gThA_-hZkZ..CaaCi..KDT.15VVXTcT3A3hiE.4gsbbB|Q}ZD=OA_Gfp:TTbIwbdkd.iIBNB.3T.16V3XT.3T5.crn:gg+dhFLQ=D*=}A_XfXXT.Thdb.kbkiCaaN.16T.3@VVgT.9ngX3(IdF=eeQ/,*}AAX)X?T..cTT.4sbCC.17Tp..VVpTT.9EX3?Zmh|Qe3!}<*h%X3ciT.7ihhbT.17T..@VVXT.4ki3kddbsX(Zhd},P3AjDkDZGnkjjT.7k#$di.20V3cT..cTjjZIZkbmmkZ%oomFSK3bZZ,jZuZdkT.7Thjji.20@VfT..cTjIZ5bjmbjm%BmKKjmZhZZk<hZdd.9Thomi.19@VVXc..Tj3,ZvBihjdbIZ$dmFFAZmkjmdAAkdb.9Tjvoi.19V3cc..TjjdjmoijhiEidjmmZKKhdhbjIhbDjTg3T.6T$vui.18V4c.3TjjSAm<iZh.rrciibiPFKKDAisEhiD(gXXTc.4nkBBZ.19V3Gc.3TTdE,m,bZbng(ndZDFh+b3hF3wEsFgX3T.3rc$Buh.18V4cc.4kiZ$kbjjsgXVX%#|Q|O||OO==|#AX,A(XXT.3cZouk.19V3)T.4bddbbkuZdnXttA%#}e8=}%AXED(XXT.rcdvoj.15Tp..V4pT.4hjImm#oIdgtVX%h|=e9QF%#XnFXXTccj%uZ.17p..V4XT.4bjd#u*ojiXVVG*hO=e10OAA)nDAggTbuoZ.16T.4V3tcc.4csdIZu$Ec)tGodBO/e9/|AAfXs<E(bumj.16Tpf..@V3pc.3c::EciihksXfVGokYO!/=e6/!O*%t)g+DbdZj.17Tp.3@V3Xc.3EgGXg3::gfVG$*kYa!/3e3!/!!RBAGfXnb*uk.6c.11T.4V3trc.3cn++X)XX)XVtfohCCaaL//!5a3B%*AXnZIh.7pT.14TGVVGr.4cA__E((fAVVfo_kx~a3L!/!!LLa3BIoA,s#o$i.4f..T.15fVV)T.4c-l[zBB+EfV#odByYYa11YxAwwlhkm#i.4f3T.15pVVXT.3TT-l&3[[l++d%hzY5a7Y3&l3[[bbk.4TffXT.15cGVXT.3TN{x>Cy&&[zlBbbzY7y3YYyyxl3[YYx-.5Tfnc.17cGXT..cxyYaWWCyyxzl3[zyY5y3Yyy&l3[Y4>UCs.25TcT..A&yaaUU>Y3{l3Bllzz{{z4{l5zCY~~aWW>B.30x&a>W3Y4[lBAbk.3dd.6k-ll{C~3>WWaY.30xxY3RRxx&xBTT.16Tl{CY4C~~&.30T3.7Ti.19T.28" },
      knight: { w: 58, h: 64, pal: "926b1e,674e1e,d8a729,2f2919,af8723,56a835,ab915d,cea965,e6c997,dddddd,d2ba94,462f15,6d6553,a6a7a8,967547,bcbec1,5aab48,e3c53b,eac954,334e25,3a8f29,bfc0c2,807f86,000101,63666b,74777b,53565b,84868a,959698,a6a7a9,34383c,585c62,4d5256,696c72,b6b6b7,684804,3c4146,43474b,484d52,f9f9f8,151819,25282a,fad03d,2c3236,8b8d91,5d6166,383c42,f8cc3c,e6e6e7,797c81,c5c6c7,1d2326,6d7176,d6d7d7,282d31,7d8185,0c1114,171308,261807,150b04,070c11,acadb2,392409,765406,9c9da1,896309,8d9094,9da0a4,f9d043,0c110b,1a1d21,342516,a47816,f8cd42,261c12,493408,462a13,573c04,563417", px: ".19X.56OIX.21GK.31IIHX.21MKG.29XIKX.10lxxZ.8*KKB.27XGIHX.5XXhh<ted=b++.6GIM.27XGIHX.4XhhscciZuwde!+.5GIH*.26XGKIG.3olhbci4aiwdtZ+.4GIHD.26XGHIIH&Xkaxsciinydknimbxf..BIKH).26XOGHIHHlm!bsddiinikw#i%bYa(H3G*.26XAOGHIKM=hbscddiiNben,kcZtlGHGO*.27(AOGGHMZhh%scdiid%rn,YbxYgMGO-.29*AAGBaumattY!ZsZYrnJ=aYfloOAX.29XXALBkrZ:,ywn3y,hyc=Zd:ZtD-.31X(lr$aY!Zbc:ydcstiwch%hamX.32X$zpgatZ3bc=d=:aiac!%hfg@.32Xfrumftko__oD[DWgibclBo@l+.32Xfrum!@A]CEUUFCBudcbDEFTo.33mkrlabz]CFQQTFFCEGcuEFQFD.32tmremfdzACFQX3F^vADDSFoXF.30XXzzrema%dBCFFX3Fv3CC^FXXFpu.27Xgg+XoekafVlGRFQXFRv5qFX?UZe.25XXueehibokmtY#IGSF3vq3vqv^FF(ie.24pYYZs:!asVelath<cG>q8^^qCXYp.23extZcNiiZmZdzgftYcE>q3j>>S>}q^CXY@XX.20XZfx:dinniclbbXgYYsEqvvq>vqqv4C?Yoghg.18X%gaZdinnJib%e!k$lZcEvq7vv^vC&foabsZ.17Xgg%cdwyyddbbYtaXef%ACq8v^CEX&zY!cbk.15Xgeugsbd#c:ZshtzpooXoACC>3q3>vCC)&oef!ybgX.13XZ%c#,YYcscsx!fa#ncbzkLLC3v5CC[aowNpYbcf+.13XuemhbnwYb%ZYhmoiN#%$eZNMTeCv3ABZZziNcY$Z!gZ&.12X$XX?BxJwmhYtae&xc#Y!mfb,ynMB3iNZa@dZPYoYYtb&.13XX/;{[(ai=eeuYXftmfgYcdccd#nwdZYbh&ZYmmokacaX.13XAECCEA&accbZkXpamg$ZcddyiydigZcbZlofgo&tbao.13XAER>^RC;(rhfrX4&zlbcddiKyi#gssbZfr&X3geD*.13+[BMaHvvEA((XX*.(XrlZbscciidd#l<sbhYlpX4/;j.13bbI#nfeCCEAj*..)@reahbb<scidd#lssZYtkuX{/]]CA(.11pYhcdwNsaE]AXX.(XerkaYhbssccdsikZZYtmkeXBAECObiZk.8XgYlZdi%kmf)*X..@rzeugfZZs5xdkZZfgluX-};ApiJixYX.7Xtra<dnd%gerX5&zrumafhhb<b!!ZuYfakkpX{}}pZbYi<uX.7Xer%xdndbheX3SILX?$euggafZZhh!$faalkuX3}pmpm:wdZf.8oeaxdwdbhkXXCHAL).X$rkmgfY!hYYpamlkep).XXre$!swy%Y.8XlgZ#wyZZuXXHB-X).[L|BDelallb#dcapD[~-..XuogaxdwJ<Y.3+:aXXkhrlb#btprDCjX*..)-[-B3OApdMpDNoB--)..XXDeamgr3eX.X:ieXXmzmbdnibhoBHj*X3(DD|~5DYMB[%o|-|*XX..Xe$oDg:,YX.X!s[B~Xkhbdwncl)HE-ZwJyydd(**|LLoa_|)Y(-)oeuoX.XX?]CCai!hXXmg_-LXm!bcy,Y_|HA_Ybc<::iw3X3?lpDBaX.$uaalXX.XACCEkbhhX.prX..XltscagADEEAJweud==dd,,#J#w3Y+Xop&gYbakX.XBEE)$eYaX..X.3XouelpAC-BA{kk&$uiPPyP=dd,4Jn3++&oxZfeX.XABLAEpzX.4+e.X_DB3]{AA)XXklmuukka#yyi,N,PPVPn4o3&X..X{A]]jX.5kg..XDBAX/-EB((thhtffaaffgmYJ#J##y5Jn5c?.X)AXX.5lhg.3X6EB*XlhZZxxZ!YfftYtffmgaZwwn#yJJ#wnnl.9+YY.8XXEjX$ezX4ZxbbxYt4Y3agmgwn3#3wn.9YZZ.8*AA)XrggmlpDX4Z%%x3YYtY4ammfn3wwn.7XYYt.8*A3(fccZmz.)(j}X&&axxbbx%bhY6taYbnn#.4XYh!.8Xe)A/_YcsZfz)({jBpggukoX3s<%%hZ%xhYh3ZZc+.3Xf3.8XlurplfYam$z*{j4(mgkmez)XXrlafb3s<c:X.6Xfak.7XumfYeegak$zoBjj;/jj(gakDB}(&ozepXXooX3.7Xfar.7XumYZZkpzz$$Xjj/A;j3D??BjjBX$rua3lkX.10Xar.6XXlhsyc!akl$Xj3AA;jj//j6XrklffgpzX.11up.6Xuppeer!ake*j3;A;j*j//Bj5&$umfrpaZgX.11X.6rlZxychpll@Xjj;;A).3j//XXjj)&pklpm!x<cx&.16pgYbwni=YepXXj/;;.10(*Xzr@zkaZbcKb!X.15emgZdKcsfk+.19pe$plmthhchYX.15X11.19X13.6" },
      mage: { w: 59, h: 64, pal: "21171f,966b24,dca933,6e4f20,54315a,dba651,115ee0,583922,54ac36,a07051,20a5f3,b58a28,f5cc59,31ccf7,1e2158,6f4853,6a3995,70409a,54a744,50dff8,e5fefd,b28954,a5f8fe,eac139,153090,d3ca85,0c3ccc,2d5727,885bb7,9f75c1,000000,351b59,432469,683893,4a2774,fbd13d,5b3285,291448,522c7b,62358c,3d2164,fad242,572e83,070414,3b1d61,f6ca3b,2e1751,150928,32194c,3b205c,d7a525,261606,25133a,b78517,c89546,140906,563616,7743a2,46275a,a87915,1c0d36,45290c,462a14,ba8946,cb9a27,f9ca45,c7941c,c7953a,39220c,56317a,684727,b88539,59b337,68441b,c18c1a,583907,996c47,a77738,e5b42a", px: ".15e5.52Alh5Ar.49riimnhQMhh?.47ei5hM;Mhhn.45emif3gkkFh4nr.42riill.fxmkkh5n.41eiif!..vfgmikh3MEh.24N.15eglv.4lfiih3F;Mnh.40ee.6fgih4MQhhne.26K.18lf)Fkkh7qr.16N.27uxFCFmkh4Mhq?r.21KT.20fogFmmknhhM;Fhqg..e6.12KNW..K.16lffgiiE?h3nFEggffunh(3Q.11NNWTG.18lEffgiJPqnhign((Q(3Rqm3nh).7NNTUTG.17e!Lwfg3ofinhh((Rnhi.8me.5ONNUUTGG.16eBB[.3f?h4((iir3.9e.3ZZ.KUUWKGK.16ew/..gmnhh((ii)ee<_#e.11>;L.KKWKG3.15e.3ogikhiilwA{<3C3#e.10zyB.GGNG3AM-.13f3gkkhsfrr#_3<ttj3ty.10zCC.OGKGaAHC-.11euffmkmffre##<I:t;jppjjt;e.10D_COGKGOAF=,.9f4oqms+e%##<:I3p4jjpI3.10zDC$YGYACCBA.7ewfggmmlleeL##CXISeSIppj3ISbIA.10HB;EO&t*B^.7egiffrre.e**#_CtpIAee]jpj3]DeeA.11HL;p:*D.8egg!re.4e**<ytjp]See]j4p]DeAI.10A,D*BD^.9ef.7e%B*yyj3I]S]Mj5p]IIA.10*L{H,z.15eAA!eB*Bytj4MIp3jjppjpItA.10zBCL{A.15!HHvreA*yyj4p4{p4Ljjtz.10ezLyLD.15lu)gkkglvCXj3p5{D3pjjtzs.10>,BD.17luffskhhA:ypj12pyAgnr.8^HA.22ffsmRRACCjpjjpj6CLfhir.7%D-.24rvoimhuPXtjpj6XDkhil.8&DA.20ellff!vlsmhhECp3j3pCBghgf.9^&%.20ffgkkgl+AfgnRfCtjjpjy@nhg.10z@&%.19lfih3qiflvvoihk}~4Bknollfx.6%z@A.19Asih4nisfulAuoqmBBHDgkx!Almm?rrAvrt>,%.18rfgnh3nqffimgfl+f?-BMCAxvfflmnmgEF-ytpt;L.17fgkh4kglfim3sfwvpFdECAfig!gigkEF@ByB#y:.16rsih3qnioOfim4ofA~scfCAimovgfmqEV*BzDtpy.16finhhqsfiflfim3q?iAyOQw:Aqmx+ufiiFEBBe{<~_.16sqnh3nEl+.uiim3qiDA:E:&okkxvlfgiFfDDeBC_e.16fkqh4nm+llfimimkiB.&#&^gkkgr.ffg/l{z3Be.17fikkhhnJFPr+fimiqki=.4[ikkgA..fx}lee&,e.18fgkknJFFJJPAfigikkmC.4=mkqiv..ff}leeH&e.18fgmPFF?)AAgglsgk3m=..f.Cmkqi+.3lBle,Dz.19ugmFEgH:CtAAwsgk3m/.ff.Cmqkiw.3lBlr@^.20ug[/xB:tt;~elsgnkkV|.of.Cmqkif.3lBlA@,.20ffBwe#Ct;CtrooknkmF&.gf.[mqqifr..lHAA@>.20fPB+ee<:t#%!ogkkqi$,fgf.PCqqmEl..OH-&H%.20fBEr.re#B%!xgknnii}-fgg..Fq3gf..vl!^-.21w|lr..Ave+foinkmiV@.ogg..$q3gf.4%^>.20fwJr.5luoEnnkiiVA.g3..$q3gfur..%HA.20wBEe.4vlxogn3giJAfg3..=qqkqsfe.r-H%.20wBfr.4logomnngg)$!fggf..B$qkqssl.e&-%.20lBw.4luooinnkggEJloggf..B$qkksoure&,.21rAf.3llgognnkiog=Hfg3f.3$mq3fgw>&>.26!loggnnkigoEL.fg3f.3$igmkssO-,>.25lloognnkmg3[B.og3.f..$giik?fxA>.25llsoognnmg3F[..og3.f..D/osmkfsfe.16ef.7foofgkkqooi)=D.fg3f.s.3/oggkmosle.14eDAwl+!lf4sxgkqooig=E..g3f.xs.3/Egi3)xsle.13e@D3BBDfsff|[Cmgosg=|..fg3..ox.3J[oss[}|P}Be.13eAHD3BBJ3/}$Egg$3E..sggf.3u.3!J|F//|JEEHe.15e4Alf5)/F$=)wr..ogf.8eAE))xufee.24e11.16e5.17" },
      nun: { w: 65, h: 64, pal: "675022,222119,d5a425,ecce9a,56a230,956d19,625e51,a9aaaa,4d3413,e6e5e3,f3ce3c,b08e24,a98c5c,d1ad72,ddba83,92764a,bebdc0,324a25,f2cf41,5b9f4b,3a8e2c,433f40,79c05a,83cd6b,c0bcc1,000000,63656a,53565b,43474b,74767a,848589,33373b,5a5c62,24272a,494c52,a6a7a8,969799,2d3236,f8cd3d,696c71,684804,383c41,4d5156,141719,282d32,b6b6b6,7b7d81,5d6165,3c4146,6d7175,d8d7d6,1d2225,191308,f7f7f4,8c8d91,7e8084,c8c8c8,e9e8e6,9d9da0,0d1113,191d21,140b03,271909,d9a625,f9cd40,362408,55aa34,977646,27241a,452a14,5b4207,89630b,372614,573c03,775508,8e9093,a98654,483615,cba871", px: ".21,.63IDO.20Z.41DDM.20DZ.39NDO.21ND;.37MDDM.6Z3qq)eu.7ZND.37MDDN.4ZZbxek$pQ&kx.5Z|DN.36P~DOP.3pgdejjtjc#janfZ..Z|DO.36MMND~A.piae)j(Jt)c#tfuu.Z|DD~.36==~DDNGcixejQ&#yji#Hi%ed|~DO|.36Z==NOOMQieekjttyj%c&Hb%nf|N~|.36Z=3~MPkcdee$jjy)kpJtcengB|PA.37ZA=3Aapdueej3k{p(jguug*AP.39ZPAIGswqbbgaannbpy)kcqcp}.40Zrhfhpd)HJ(##(yjaj)evtkd.41Zbzzfgdandekjtj$gek%adnvb.40ZaslcbgnnxekkHj$gti{ndgbb.40ZalfbaahrAAEEAAvgjuec;;.c.40avlfgai-LCEEUE/AVjkuBE3Z.39xaflpgna}/EWXB<<CFfk>L<GEZ.40pfspbueIC<TZ3<:KABAETZR.42zlpbgYGC<EZ3<m5EEZR.a.35vpqd$.lpbgnJALEEBEKKm5<ZE.d.33dku$gpej.sqaan&wKE<EKKm4:S<,pd.31d$aa$jj{pkj.cbaakfm4KSm4KmmZln.30%%gekktJ#tcke.pba$fCm:mKF^@@_m3Zlavv.27uxgae)t##&Hkcubfibeh/m:m:Km3:mmCZlgvgq.3##Jy&Qt.16ubaek&((&tH%qan..cdhCm:m9CZsfibq.((&$d3nnG.15wwqd)t3jteda.g.ZZz>CCmSmm::m3CFZfrply#&eddz3hsgbba.10audkevakk)$euag.yka*+zLC3m5CCLB+ZrcJ#ddalhich3rb3a.9apineyJede3vgp)tjefhbBBL//:m:/CLBqrZay#edfhca3flff+ib3.8f*Z-RBktHbxnawrd&&dgcbktGcc/3CfGnfzBj#kucpgaagapffpfrcgb.9ZF4rbeHinpa+badabv$eet((cAABkdbp*g(jnfpna4gp4fsrgq.9FCm//[}>u{a%ircbbafvHj4tJJjkgvbpZb(uepa4gavpfppls+zb.8}AG3A/FA!cblZZ*hhzcd$jjHtyjkideaqpZq&eecg#da3gf4gih+b.7bkHy#(jaAFA,!Z,Zzzhinekjjt#j3ieeaifZbyeeca3Gavbfsf4hra.6iak{baxicaAFoZ.,rizqanekkjH()eji%abwsZgyeecga3ba#tif4srv.6qvdf$(&jdp]oZZ.Zczwiaddk3jkkujinbcplZqyeecba3gv#jgfpfllrg.6vbld)y#D{vfZZ..sshwicadde$eedeabvcwprZbyeecga3vd#jxhffllrb.6ipbn%tkdy&clZZ.*rslccqdduu%ndepgcwwsZZqyu%cga3f&yjxafllsrg.6whqqdgeyccxdiZ!..>llcibbdnaagupqcwsr.Zqtdecbggca(j$ndfhlsrg.6h+ccbukcjyj$aGZ-.-rrhwb4ish3ffh*..Zqtducbgqy#Hjuneeslsrg.7+pwfvld)yykaFAZ..;?A3Bh3JyHkfr!]..Zctddcqbghaeuaqizslsrb.9frbbdk&tjqCCZ..;I?]AFFAjeh>>d]?!..Zctddcibgqzgdaiwhllsrg.6c..Z+pwveedaA@LZsZZ!B??I??MGGIra--!..Zcjxdpcb3qhdaihfflhrb.5ii.5cbgbhFL,Alwwcshr!??]da>]fb,ZhhzZfk%nlcqbbihexqhflszqb.4bvi.5ZcwAF;FZswqxegccrrhrraexa*Zswsh+Zitnccjbbcixxhlfahrbb.4nab.6ZZ!FZrlcgekuqxxZ+pfhr4*.ZcblhZiJdcwiqbccxnl4h+bq.3bnv.9ZZsfqvnk$aaur!fcicf4Z.!*cis*rbedhci3clzlffshab.3ada.9Zsfia{)%ddnef!-cqgbgcwc*.!!ZiifZljdhfi3ccfflsshai.Bvadn.8ZlzrhhBetjdeb!--qgddgvcvr,;}-BwrZzb$dsci3cl3hhaa..Zdanv.3c.4ZZhi%kecceeqB]-Zqg%uavqn*Z}II]Z>BZfknxli3cllsh+db..auxc.3cc.5zc%&#t{c*B!;!,@GgaeeainB.3A}rvqs..jdalc3sshzubi..duu.4cc.4flaet(tdaB..-,oopedudgidZ.5vnxf..cedffcclhhdbq.3dxn.3cc.4zpsdj(jddbhB!,o3Bfkddbdb!Z.3qbanw.3eedxswshaaq.4xab.3cc.4qclbu$edvcf!,o5;ckgda>^IZ.3cqc.3Zlnd3hhuab.5ga.4pc.3ZbacqgnngisfZo7!bedBo@IZ..b..c.6bdadubb.7gh.8wbdelgbczhfZo4[_o3!f!oo@IZ..bi.10aagg.8gh.8wad$%h3ci.o3_[[o5@ooA^^Z..bbqi.10Z.18hcqakuabi..!oo_[[_o6AAo^^Z..bbi.nnf.26haktkb.b..!oo_[[_.ZAooIZAAo^^Z.pi..vdee%.24ine&jkud..Z@o_[;Z.3Z3.3Zo@Z.5cadkten.23gkt#ytex..Z5.14Z.4pcandjkn.23qak)Henac.27ibbddn.23Z3.3Z3.47" },
      pyro: { w: 74, h: 64, pal: "9b5e22,da6215,592e19,eaa22a,251e14,624c26,edda9e,a49f9a,e6e2d5,9f3613,6a645d,d5aa68,fedc66,55a731,a78d66,926e46,d0bb9c,b48925,5b934c,7e8183,3a4934,84c25d,c33e10,000000,565759,666768,454749,767676,888888,facb3b,35383a,979796,a8a7a6,252829,b8b7b5,3d4144,393d41,5b5e61,4a4d51,c94714,2d3134,5e6163,e55813,483525,583717,e96616,25180a,4d5154,5a4229,fccc43,f9f8f4,161919,674a34,6b6d70,f67516,f58518,352616,867d77,a39d9a,a6a19c,d74c14,fa9725,fad03c,292e31,e5570d,462817,544944,7c7d80,b74515,d95515,d7a524,dad8d5,fefacb,2a2317,782814,745236,746b66,963313,fbd147", px: ".22LG.71LGO.21G.48OGL.22OG.15$.31LGL.10vbic.9GQ.13?GB.17B_.11LGL.7bTbcYcicb.7OG.13BGB.17DB.11OGL.4Xhm=cfgfYIica.6OGL.13B.18_qB.10OLGL.3mY#TfiQicYIilb.5LGL.4B.40PLGGQ..mpbcHiyyHZyiHYc.3LGQO.45POLQ3KY==HfgHIic[igacbbL4O.17$.27PAOLLGK*Z==fgg[icaygaccZzLOLP.8>.31t.5APPOPKKpb==fg3cayggacZv.OP.9JB.37AA{FFemY3lZbZZaIHgkpYm.P.10J?.38ww<oYHgi[Iyy[icig*jigHZ.16A.5D:.6}JtB.17h3aYpZ#bTfgicZicckcblY.15At.13CJ$DB.16a/kvYp3bbcffcZilcjc#lY.10A.5AJ.14B%B.7Bq.7v/aYZYzAAFNFArZgccYEA^h.9AB.5AJ.15B+.7CDq.6Y/aYZzAR@N4REf*chDNNE.9CB+.3CJC..q.23J.4ZZoomZchADNVUXNDDEfYDNSEN.10}n.7?LB.15B.11aeoealfEDDNSXXSNdDUEDNXXN.6B.11BD$B.15B.12E/eaYcQEDNSXXSN-d4NXXNK.6B.5n.4B3.26YZcXEhavYIIELNSFN-d5NENNb.7B.4>.5A.25lZYaZggzjalpcyF~NN~dx-dx-dNREY.7D.6Bn.25aKZ#bigfaggEjYZY)eDdd-d-3~d3DEY.11J.6J.5t.16#ZbcgiyIHacchklZfe@dd-~F4RddDEp.Yb.9B.4:?.4:.7B.8#ZbcfiyIifTmbYhmYfo@dd-d8DEa.ZHZ.6}>+C..+,nCt.9B~n.7ejbfiG[iffbaY#XoYfe@d11RzeabHba.5JDqA.JBM:t.11nJ.5ZccfKYbHgff#3epzzEYe@Ddd--d5@FXhaabfKF.5Bq,?BMM:J.17YvaaZfI[ZffbKZl/hehEEAD@ddx3dxd@AXjYHKYaCAA..;C_q,%qM$:.3n;.13j.4ec[IpTZZle*IgchoKwR@@x3dD3eXZZ|arEqdMCCB}_?~DGDD+.BBJ.15CA3F&aHIY#mazcyIbejZgaFwD4AAKZXYYeEsECCJBDMtJ$DMGdD+tDn}n.14AFFARFFEbcaavzZccZhZcbg[IKARF*(KYoEa^CLLrCJ}ADMDWqdIMD:G%J%J.13s([IIaAAEhZbbeXYYvZEbf3*QyI*)KZ||eXhCFFaeEC}JDMDn,D]GdBM:nB.6n.6FciZYp#a&AEEuX3EYYhYcfgHHIgQZ|OPDDazXuZcc<ArrC>BxMDd]I~DBDB.6JDA.5ccacIGcbvuCCX.uEzzoYbffggIH*GZO3PKaX.^ZZ<B,ACCB?$GGMGIGMMxt_.AA..>LJ.4ZKkcgiyYajeX3.E/ohvZbbf)gIgfQK((|YYeEEu&FDB+BB%xtBLG]GIGMGM%JJBBC..J.5Y/ZcfimcHfcZXu&&CheYZb3cE3CrCA11LBtDMMD%x]I]3MG,M%?DDA.9a/YZcjciIIfb&EsuEuEEsP3A3F3CC.10JACABqMdGI]GI]G,,BnB3.10jkaYaYc*i)p<wEA6suuEE<3|KeKOD!ae.5FBJCC$M~dMddI]GM,+..+>.10eeavElZf)Z^DD.8YYbb|bbZZaKK<a/.4AA<rCA:$Dnx?tGdIM$B>.16ok.mlcZaCRA.7aaYYKZbZbeYa3e.6e<E>D,C..tnBBd~M%J;$.13C..o.aYeaKERA.8UaKYYaaehekje.&.5hFtBA.3JqBB:BMd+J,C$.11C;.5ekrAA.9F{^e3GIHHZ.3sE.7_.4>nBJCn$DqJ.4C%.8Cr&.6F.14PPAuHE&^O.FsEu.12C%C.CBM%}.6t_.6w3.21;;ssu(*CC|.C&E^eh.10CA..nMDJ.13!F3.16aaYkXXEEs;ubE;&Y..z/kmko.8nJ.3+D:C.q.10F!F{r.15mZcZajk.5KOKZY..jaaZZYaa.4BA.5A>A..q..B.7!3C.14aYb)bZpvY.a.j.9Y|YKZHbY.8CC.A.5qBB.4XC{!!.12aYbcYcgbbYbY.Yajj.9Z(YHH^^.8,C.4q.._DD.4X{{F;.11jjYb)iHKblbb..(apYYaa.Y.5#cOrAAF.6BD.9}J.4w{3.13ECCEafgYcKX..cYZZYYakZ.3sCuE&AAF.6Ct.4CD.10w!3.13FFAA..ZHZ.4(YbbZYYab.3ss..AACGG)(.3_J.4BxJ.9w!!r.13aKYpF..YEC.3OZZbblYab.4s.FFe)HIQOY.8C+.10wFF.12aY(fGIc.3;.4ZcZZbZYZZ.5sshbb)HG(Y.15A.4wwC.12aZHgI*b.CC.7HZ4K.8aZZbHHZa.15A.4wCr.10kajYbf)KZY.9bHbZbZ.9mYYZKYh.21rr.10aZhYYbZlam.10bccY.8ma..YYv.8%.15r.9jYbKhvYYjee.23Ypa.11?.25aZccbh3ea.23aaYZZYa.33mZcgfbZYkke.23aYYljhE.32e/oeeYcZljk.24aaYhabbKZ.30jbfiiZeYYe.25jYoYZbHH*H.28l=fIyiHloke.27vYbHH)IH.28Y=g[GQf=ao.28kjmYZb(b.28mZbHffbYYh.55" },
      bomber: { w: 58, h: 64, pal: "97651e,b08b20,d1a42c,ebd050,19260a,766121,63ae32,28511f,dcbb47,5da94d,b84e43,c15347,591a09,bd9f43,dcce3e,efd099,e4eee1,000000,fad03d,d9a525,f6d9a1,f7cc3c,f9d142,c48c19,141305,f7cd42,e8c58a,bb8517,c9931b,d29c22,e1ad29,e9ba34,e5b42c,f7d89a,ca9724,341203,0e1207,271203,57b63a,edc237,f4cb53,a97715,d19b1d,f8d255,eac645,f7d88a,b37e14,e9c992,100e02,58ab34,68b637,372806,674606,aa750b,bb8725,f6d275,559b47,63ac29,64bc46,976607,dcb437,ecc66b,ebc875,f3cc67,250d02,463406,573c04,5d420a,58a62a,846826,ba5243,c38824,f1ca76,264c23,432703,4db33a,64a931,785a09,74591d", px: ".24Y7.48Y3VSSW3rYY.44YYfVVS4WZZDr}Y.41YeeVVS5W3ZW3s.40BeSZWWS4W3VWV3B.12Y3.23YTfWZW4S9|>D.9YYZWWF.21YTTW3ZW|xWS3W4smJy.8YZSTWfBE.20YTSWSSG)J)yWSWWSSWxQRHmw.6YS+AZWZs.19YiTS3Wy)HHm(SWWS3x&RR&w.6YWZZVWn+.19YTTVSSym&RR^GSSWS3m&RR{k.5YTZSWXTTC.7AWD.9YTTSSWym)RR^>S6D{EEmIk.4iWSWWZcXA.6YZWWl;;.6YTTS3GmmRRG(S7sxxWVY.3RqW4Zi!.6YVnWWbVZY.4YT3S3WOymx(WS5WSW4ZY..YTZSW3fe!.5YW4d#ZrY.4YT3S3VWD(>ZBW6N!SVVZC..igS3WWTq!.5YVZZbbWWf+.4YT3S6VSVSlj6ZSSVVC.YeWS3Wfei.6wcfVfdWWVZz.3YT3S7ZSWj.5jrS3V+wTgWS4Tei.6wXdVfTZ3WVYYkdT3S8WWj3:j.jrWSSVZ}TW3SWWTdB.7wbcV7SWIcdTegS9_AK@MjjWS5g*eW4TT<.9YcTVWV3SWWZ*BegCS9nALLKlIVVS4V*TSSWT3;.10YdTZS3VWSWVVcgWS9VsA@@FSV3SSVWTdgWT3?.11YT3ZWWSSV3WSTVS9ZVZZWWVSVVSSVVW#eeTTiF.12YiTTZWS3V5gZSWS8V3SV9g#TTXj.14YiTTWWS7WZS8VVSVS6VSSVVZ#TcBE.15YcTTVWWS15WSVVS9WVZgbXY.17?dT3ZWS11VVSSWSWth3thrSWSZZV#Y.19BcT3WWS10V3WWthhU5htrSVVZeY.20AiT3fWS10VWthU11t%Z3Y.21bXT3VS5VSSVVZ%U14hZV3Y.20Y?bXdTfS7VWtU16aV3l.20kAAbdTTS5WSSrU17haVVnY.19Rp*AqTVS7%hU18aVZVY.19ziciTTS7VtU19haVVfY.17Yic3TTVS4VVohU20aVVfY.17YT5VS4V3%U9hU11aVVfY.17~T5V3SV4%U9hU11aVVfk..Y4.11cT4VSV6/aU20haVVnY.YWWZoY.9YT5S3V5/vU20aaVVf<rW4Vsk.7kiT5SSV6/ahU18hasVgiWWVWfeesY.7RdT5SSV7]hU18aaVnXVWZZVX3CY.7RT6V9]aPU15haanVVbW3ZX4$Y.7kdT6VSV7aavU13a3,VVcZSVfX5p.6YYAuT6VZV7]aavU10a4-VVfcV3cX4[Y.5ETgXuT7CV7Z-avvhU6a5-DVVdcVVfX5Ak.4YTg3bbT8V4SVVZ,a4vva6,ZV3d3VVX5[Y.5lqggfbbT9V7Z/-a8o,V4d4ZfX5Y.6:qfggTbXT9ZWSV5SoWo6V3fTTdXqddX5Y.7lccgTTbbT10gnnV6SV6nfT3cXbd3X4p.9Yc3TTbbT13gSV3SV4T5Xb4XcdXbXcY.10zXXiTiuT17CT9Xb3z.idibX$k.11k[X4bbT24X3bb.4b3$Y.14=b4ucT21cXbbAY.5Y4.15k3B$upq3T17cXbAY.31FppXXT12dcX3AzY.33~buX3cT5cX3cb3<!Y.35FX16lYY.37Y$TTX11Y3.40YT3ccbbX4Y3.42lce4cXbppYY.45lce4cup=Y.47:ce3cb=.50lce3XbY.50lcceXX_.52YccXY.54Y3.43" },
      sage: { w: 59, h: 64, pal: "976b23,211d19,dcaa30,6e4f1f,dba650,593921,105de0,54ac35,a07051,b68b29,1a335a,1fa4f3,f4cc59,30ccf7,58364c,2a4661,6f4852,406e9a,54a743,4fdff8,e4fdfd,b28853,a5f8fe,eac139,142f90,d3ca85,0c3bcc,2d5727,3f709e,5a8ab7,749cc1,000000,234668,1a3a58,386793,2a5379,fad13d,35618b,315b84,254d72,17324c,2d5983,132c44,1e4162,030913,f9d243,f6ca3a,081828,23415d,13273b,d7a425,c89546,140906,271706,4374a2,563615,b78616,325779,a87914,f9ca44,0d2236,45290c,462a14,ba8946,c6941b,cc9a27,38220b,684726,b78539,c7953a,58b337,c18c19,09121b,1a3e60,25394c,583907,68451a,996c47,a77737", px: ".15f5.52Bqi5vs.49snnjliiMii(.47fjjnjjiM*Miil.45fjjh3gmmEi4ls.42sjjoq.hwjmmi5l.41fnjhx..vhgjjli3M(i.24N.15fgov.4qhnni3E*Mli.40ff.6hgni4Mi3lf.26L.18ohwEmmi7ps.16N.27hwECEjmi4Mip(s.21LT.20hggEjjmliiM*Eipg..f6.12LNW..L.16qhhgnjg(i3mEg3h3li$3i.11NNWTG.18q_hhgjIQplingl$$c$3Rpj3liw.7NNTUTG.17fxJohg4hnlii$$Rlig.8jf.5KNNUUTGG.16fAA>.3h(i4$$nns3.9f.3ZZ.LUUWLGL.16fo/..gjlii$$jnKff:[&f.11<*J.LLWLG3.15f.3ggnlijnooB{:3C3&f.10#yA.GGNG3BM-.13h3rmlirh]s&[3:uukkuuy.10#CC.KGLGaBFC-.11fh3jmjhhsf&&:H;u*kktkku*f.10D[CqGLGKBE?,.9oh3rpj^+f!&&:;H3t4kktH3.10#DCzYGYBCCAB.7fohggjjooffJ&&CXHSfSHk5HSbHB.10FA*OK%u)A|.7fgnhh]sf.f))&[CutHBff@k5@DffB.11FJ*t;)D.8fggxsf.4f)):yukt@Sff@k5@DfBH.10B,D)AD|.9fh.7f!A)yyk3H@S@Mk5t@HHB.10)J{F,#.15fBBxfA)Ayuk4MHtk4ttktHuB.10#ACJ{B.15xFFvsfs)yyk5t3{tkktJkku#.10f#JyJD.15ohwgmmgqvCXk6tt{D3k3u#^.10<,AD.17qh3^miix;ytk12*yBgls.8|FB.22hhrjRRxCCktk9CJhins.7!D-.24svgnjihQXuk8XDmijo.8%DB.20foohhxvorjiiOCt3k3tCAgigh.9F%!.20hhgmmgo+vhglRhCukktky=lig.10#=%!.19ohni3pnhovvgnim~C4Amlgqqhw.6!#=B.19x^ni4ljrPhqvhgpjAAFDgmwx+ojj(ssBv]u<,!.18]hgli3lphhnjghq+h(-AMCBKvhhqjljg(E-yutu*J.17hgmi4mgqhj4^hovtEePCBhngxgjgmPE=AyA&y;.16srni3plngKhj5ghBC^dhCBjjgvghjpPV)ABDuty.16hnliiprPnhqhj4p(jBy_pqCBpjwBhhjjEPAAf{:C[.16^pli3l(o+.hj5pnDB;O;%gmmwvohgnEhDDfAC[f.16hmpi4lj+qqhj4mnA.%&%|gmmg].hhg/o{#3Af.17hnmmiilIEQs+hjjnpmn?.4>jmmgv..hw~off%,f.18hgmmlIEEIIQxhjgnlmjC.4?jmpnv..hh~qffF%f.18hgjQEE(K]]ggorgl3j?..h.Cjmpj+.3oAqf,D#.19hgnEPgF;CuBvorgllmj/.hh.Cjpmno.3oAqs=|.20hg>/hA;uu*CforgllmV}.gh.Cjpmnh.3qAqB=,.20hhAofACu*CusggllmjE%.gh.>jppjhs..qFBB=<.20hQA+ff:;u&!xggllpjz,hgh.QCppjro..KF-%F!.20hAOs.sf&A!xwgmllnn~-hgg..Ep3gh..vqB|-.21o}os..vvf+hgnlljnV=.g3..zp3gh.4!|<.20hoIs.5qhgrl3jnVB.g3..zp3ghhs..!FB.20oA_f.4vowggl3gjIBhg3..?ppmprhf.s-F!.20oAhs.4qg3jllggwzxhggh..Azpmprro.f%-!.20qAo.4qhggnllmggOIqg3h..Azpmmrghsf%,.21sxh.3qog3l3jggJFhg3h.3zjp3hgo<%<.26xog3l3jgg_J.hg3h.3zngjmrr_-,<.25qqg3l3jg3>A.rg3.h..zgnjm(hwB<.25qorg3lljrggE>..g4.h..D/grjmhrhf.16fh.7hgghgmmpgrnw?D.hg3h.r.3/g3mjgrqf.14fDxoo+xqh3Prwgmpggng?O..g3h.wr.3/Ognnjwwrqf.13f=D3AADhrhh}>Cjgrrg?}..hg3..gK.3I>grr>~}Q~Af.13fBFD3AAI3/~zOggz3_..rggP.3h.3xI}E//}IOOFf.15f4vqh5w/Ez?Kos..ggh.8fB_wwKhhff.24f11.16f5.17" }
    };
  }
});

// ../../assets/scripts/PixelArt.ts
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
function decodeHero(a) {
  const c = new PixelCanvas(a.w, a.h);
  const pal = a.pal.split(",").map((h) => parseInt(h, 16));
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_{|}~";
  let i = 0, k = 0;
  const s = a.px;
  while (i < s.length) {
    const ch = s[i++];
    let n = 0;
    while (i < s.length && s[i] >= "0" && s[i] <= "9") n = n * 10 + (s.charCodeAt(i++) - 48);
    if (n === 0) n = 1;
    const idx = ch === "." ? -1 : ALPHA.indexOf(ch);
    for (let m = 0; m < n; m++, k++) if (idx >= 0) c.px(k % a.w, Math.floor(k / a.w), pal[idx]);
  }
  return c;
}
function heroFrame(src, sx, sy) {
  const w = Math.ceil(src.w * 1.06) + 2, h = Math.ceil(src.h * 1.04) + 1;
  const c = new PixelCanvas(w, h);
  const cx = w / 2, bottom = h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = Math.floor((x + 0.5 - cx) / sx + src.w / 2);
      const v = Math.floor(src.h - (bottom - y - 0.5) / sy);
      if (u < 0 || v < 0 || u >= src.w || v >= src.h) continue;
      const i = (v * src.w + u) * 4;
      if (!src.data[i + 3]) continue;
      const o = (y * w + x) * 4;
      c.data[o] = src.data[i];
      c.data[o + 1] = src.data[i + 1];
      c.data[o + 2] = src.data[i + 2];
      c.data[o + 3] = 255;
    }
  }
  return c;
}
function drawBat(f) {
  const c = new PixelCanvas(32, 32);
  const B = 6963104, BD = 4400486, BL = 10121424;
  if (f === 0) {
    c.poly([[13, 15], [2, 6], [4, 12], [3, 17], [8, 15], [10, 19]], BD);
    c.poly([[19, 15], [30, 6], [28, 12], [29, 17], [24, 15], [22, 19]], BD);
    c.line(13, 15, 3, 7, B);
    c.line(19, 15, 29, 7, B);
  } else {
    c.poly([[13, 15], [3, 24], [6, 22], [8, 25], [10, 21], [12, 22]], BD);
    c.poly([[19, 15], [29, 24], [26, 22], [24, 25], [22, 21], [20, 22]], BD);
    c.line(13, 16, 4, 23, B);
    c.line(19, 16, 28, 23, B);
  }
  c.ellipse(16, 16, 4.5, 5.5, B);
  c.ellipse(16, 18, 2.5, 3, BL);
  c.px(13, 10, B);
  c.px(13, 11, B);
  c.px(19, 10, B);
  c.px(19, 11, B);
  c.px(14, 15, 16728128);
  c.px(18, 15, 16728128);
  c.px(15, 19, 16777215);
  c.px(17, 19, 16777215);
  c.outline(OUT);
  return c;
}
function drawRat(f) {
  const c = new PixelCanvas(32, 32);
  const G = 9076880, GD = 6182502, GL = 11577528, PINK = 15243944;
  if (f === 0) {
    c.line(9, 23, 5, 21, PINK);
    c.line(5, 21, 3, 17, PINK);
  } else {
    c.line(9, 23, 5, 24, PINK);
    c.line(5, 24, 2, 21, PINK);
  }
  const la = f === 0 ? 0 : 1;
  c.rect(11 + la, 25, 2, 2, GD);
  c.rect(19 - la, 25, 2, 2, GD);
  c.ellipse(15, 22, 7, 4.5, G);
  c.ellipse(15, 24, 5, 2, GD);
  c.ellipse(13, 20, 3, 1.5, GL);
  c.ellipse(22, 20, 4.5, 3.5, G);
  c.px(26, 21, PINK);
  c.px(27, 21, PINK);
  c.circle(20.5, 16.5, 2, G);
  c.px(20, 16, PINK);
  c.px(24, 19, 16724016);
  c.px(25, 23, 16777215);
  c.outline(OUT);
  return c;
}
function silhouette(src) {
  const c = new PixelCanvas(src.w, src.h);
  for (let i = 0; i < src.data.length; i += 4) {
    if (!src.data[i + 3]) continue;
    c.data[i] = c.data[i + 1] = c.data[i + 2] = 255;
    c.data[i + 3] = src.data[i + 3];
  }
  return c;
}
function drawImp(f) {
  const c = new PixelCanvas(32, 32);
  const sw = f ? 1 : -1;
  c.poly([[16, 3 + (f ? 1 : 0)], [22 + sw, 12], [25, 20], [22, 27], [16, 29], [10, 27], [7, 20], [10 - sw, 12]], 14699034);
  c.poly([[16, 8], [20, 14], [22, 21], [19, 26], [16, 27], [13, 26], [10, 21], [12, 14]], 16747040);
  c.ellipse(16, 22, 5, 4.5, 16765008);
  c.rect(12, 18, 2, 3, OUT);
  c.rect(19, 18, 2, 3, OUT);
  c.px(12, 18, 16777215);
  c.px(19, 18, 16777215);
  c.line(14, 23, 17, 23, 9054736);
  c.px(10, 21, 16738922);
  c.px(22, 21, 16738922);
  c.outline(6953480);
  return c;
}
function drawMummy(f) {
  const c = new PixelCanvas(32, 32);
  const la = f === 0 ? -1 : 1, ay = f ? 1 : 0;
  const STRAW = 15779920, STRAWD = 13146672;
  c.rect(14 + la, 24, 2, 5, 7031338);
  c.rect(17 - la, 24, 2, 5, 7031338);
  c.rect(11, 13, 11, 11, 4876976);
  c.rect(11, 13, 3, 11, 3428490);
  c.rect(12, 13, 2, 4, 13650490);
  c.rect(19, 13, 2, 4, 13650490);
  c.rect(6, 15 + ay, 6, 3, 13650490);
  c.rect(21, 15 - ay, 6, 3, 13650490);
  for (const [x, y] of [[4, 15 + ay], [4, 17 + ay], [27, 15 - ay], [27, 17 - ay]]) c.rect(x, y, 2, 1, STRAW);
  c.ellipse(16, 9, 5.5, 5, 14731416);
  c.rect(13, 8, 2, 2, OUT);
  c.rect(18, 8, 2, 2, OUT);
  c.line(14, 12, 18, 12, 9067056);
  c.px(13, 11, 9067056);
  c.px(19, 11, 9067056);
  c.ellipse(16, 4, 9, 2, STRAWD);
  c.ellipse(16, 3, 5, 2.5, STRAW);
  c.rect(11, 4, 10, 1, 13650490);
  c.outline(OUT);
  return c;
}
function drawSlime(f) {
  const c = new PixelCanvas(32, 32);
  const G = 5227087, GD = 2787898, GL = 11071648;
  if (f === 0) {
    c.ellipse(16, 22, 10, 8, GD);
    c.ellipse(16, 21, 9.5, 7.5, G);
  } else {
    c.ellipse(16, 23, 11.5, 6.5, GD);
    c.ellipse(16, 22, 11, 6, G);
  }
  c.ellipse(12, 18 + f, 3, 2, GL);
  c.px(11, 17 + f, 16777215);
  c.rect(13, 21 + f, 2, 3, OUT);
  c.rect(19, 21 + f, 2, 3, OUT);
  c.px(13, 21 + f, 16777215);
  c.px(19, 21 + f, 16777215);
  c.outline(OUT);
  return c;
}
function drawZombie(f) {
  const c = new PixelCanvas(32, 32);
  const M = 10119738, MD = 6964260, ML = 12618320;
  const la = f === 0 ? -1 : 1, ay = f ? 1 : 0;
  c.ellipse(13 + la, 27, 3, 2, MD);
  c.ellipse(19 - la, 27, 3, 2, MD);
  c.ellipse(16, 18, 9, 9, MD);
  c.ellipse(16, 17, 8.5, 8.5, M);
  c.ellipse(13, 13, 3, 2, ML);
  c.ellipse(7, 19 + ay, 2.5, 3, M);
  c.ellipse(25, 19 - ay, 2.5, 3, M);
  c.rect(12, 16, 2, 3, OUT);
  c.rect(18, 16, 2, 3, OUT);
  c.px(12, 16, 16777215);
  c.px(18, 16, 16777215);
  c.line(14, 21, 17, 21, 4860436);
  c.line(15, 9, 14, 6, 5939264);
  c.line(17, 9, 18, 5, 6996048);
  c.outline(OUT);
  return c;
}
function drawSkeleton(f) {
  const c = new PixelCanvas(32, 32);
  const W = 14198888, WD = 11040832, J = 7031338;
  const la = f === 0 ? -1 : 1, ay = f === 0 ? 0 : 1;
  c.rect(14 + la, 22, 2, 6, WD);
  c.rect(18 - la, 22, 2, 6, W);
  c.rect(13 + la, 28, 3, 1, J);
  c.rect(18 - la, 28, 3, 1, J);
  c.rect(13, 13, 8, 9, 3828416);
  c.rect(13, 13, 2, 9, 2772624);
  c.rect(13, 17, 8, 1, 16106818);
  c.rect(10, 14, 2, 6 - ay, W);
  c.px(10, 13, J);
  c.rect(22, 14, 2, 5 + ay, W);
  c.px(22, 13, J);
  c.circle(17, 8, 4.5, W);
  c.rect(15, 7, 1, 2, OUT);
  c.rect(18, 7, 1, 2, OUT);
  c.px(14, 10, 14708832);
  c.px(19, 10, 14708832);
  c.rect(13, 2, 8, 3, 13647936);
  c.rect(12, 4, 10, 1, 9052192);
  c.px(17, 1, 16106818);
  c.outline(OUT);
  return c;
}
function drawGhost(f) {
  const c = new PixelCanvas(32, 32);
  const W = 16054527, WD = 12636400;
  const b = f ? 1 : 0;
  c.circle(10, 17 + b, 6, WD);
  c.circle(22, 17 + b, 6, WD);
  c.circle(16, 12 + b, 7.5, WD);
  c.circle(10, 16 + b, 5.5, W);
  c.circle(22, 16 + b, 5.5, W);
  c.circle(16, 11 + b, 7, W);
  c.rect(8, 16 + b, 16, 6, W);
  c.line(12, 14 + b, 13, 13 + b, OUT);
  c.line(13, 13 + b, 14, 14 + b, OUT);
  c.line(18, 14 + b, 19, 13 + b, OUT);
  c.line(19, 13 + b, 20, 14 + b, OUT);
  c.px(11, 17 + b, 16752816);
  c.px(21, 17 + b, 16752816);
  c.line(15, 18 + b, 17, 18 + b, OUT);
  c.outline(6320288, 220);
  return c;
}
function drawReaper(f) {
  const c = new PixelCanvas(48, 48);
  const R = 4860536, RD = 3021394, RL = 8016560, SKIN = 15913648;
  c.line(36, 14, 30, 34, 2759184, 255, 2);
  const sy = f ? 1 : 0;
  c.poly([[37, 6 + sy], [39, 11 + sy], [44, 11 + sy], [40, 14 + sy], [42, 19 + sy], [37, 16 + sy], [32, 19 + sy], [34, 14 + sy], [30, 11 + sy], [35, 11 + sy]], 16767050);
  c.poly([[24, 14], [32, 18], [35, 30], [38, 44], [10, 44], [13, 30], [16, 18]], R);
  c.poly([[16, 18], [13, 30], [10, 44], [16, 44], [17, 28]], RD);
  for (let x = 10; x < 38; x += 4) c.rect(x + (f ? 2 : 0), 43, 2, 2, RD);
  c.rect(22, 20, 4, 16, 15790320);
  c.rect(23, 21, 2, 2, 13650570);
  c.rect(30, 24, 4, 3, 16777215);
  c.ellipse(24, 14, 5, 5, SKIN);
  c.rect(21, 13, 2, 2, OUT);
  c.rect(26, 13, 2, 2, OUT);
  c.line(22, 17, 26, 17, 10508880);
  c.rect(17, 8, 14, 2, 1708064);
  c.rect(19, 0, 10, 8, 1708064);
  c.rect(19, 5, 10, 2, 11553418);
  c.outline(OUT);
  return c;
}
function drawSlimeKing(f) {
  const c = new PixelCanvas(48, 48);
  const G = 4173386, GD = 2324026, GL = 10481818, GOLD = 16106818;
  const rx = f ? 22 : 20, ry = f ? 13 : 15, cy = f ? 34 : 33;
  c.ellipse(24, cy + 1, rx, ry, GD);
  c.ellipse(24, cy, rx - 0.5, ry - 0.5, G);
  c.ellipse(15, cy - 6, 5, 3, GL);
  c.px(13, cy - 8, 16777215);
  c.rect(16, cy - 2, 4, 5, OUT);
  c.rect(28, cy - 2, 4, 5, OUT);
  c.px(17, cy - 1, 16777215);
  c.px(29, cy - 1, 16777215);
  c.line(14, cy - 6, 20, cy - 4, OUT);
  c.line(34, cy - 6, 28, cy - 4, OUT);
  c.rect(20, cy + 6, 8, 2, OUT);
  c.px(21, cy + 8, 16777215);
  c.px(26, cy + 8, 16777215);
  const ty = cy - ry - 5;
  c.poly([[15, ty + 5], [15, ty - 2], [19, ty + 2], [24, ty - 4], [29, ty + 2], [33, ty - 2], [33, ty + 5]], GOLD);
  c.rect(15, ty + 4, 18, 4, GOLD);
  c.rect(15, ty + 7, 18, 1, 13144096);
  c.px(24, ty + 5, 14692416);
  c.px(19, ty + 5, 4235519);
  c.px(29, ty + 5, 4235519);
  c.outline(OUT);
  return c;
}
function drawToad(f) {
  const c = new PixelCanvas(52, 44);
  const B = 5929530, BD = 3822120, BL = 9089104, BELLY = 13162640, WART = 10113200;
  const sq = f ? 1 : 0;
  c.ellipse(9, 34 + sq, 8, 7, BD);
  c.ellipse(43, 34 + sq, 8, 7, BD);
  c.ellipse(26, 28 + sq, 21, 14 - sq, BD);
  c.ellipse(26, 27 + sq, 20, 13 - sq, B);
  c.ellipse(26, 33 + sq, 13, 7, BELLY);
  c.ellipse(26, 18 + sq, 17, 9, B);
  for (const ex of [14, 38]) {
    c.circle(ex, 11 + sq, 6, BD);
    c.circle(ex, 11 + sq, 5, 15781952);
    c.rect(ex - 1, 8 + sq, 2, 6, OUT);
  }
  c.line(12, 23 + sq, 40, 23 + sq, OUT);
  c.line(12, 23 + sq, 10, 21 + sq, OUT);
  c.line(40, 23 + sq, 42, 21 + sq, OUT);
  c.rect(16, 24 + sq, 2, 3 + f * 2, 9498688);
  c.rect(33, 24 + sq, 2, 2 + (1 - f) * 2, 9498688);
  for (const [x, y] of [[18, 16], [33, 15], [10, 28], [42, 27], [22, 30], [31, 21], [26, 13]]) {
    c.px(x, y + sq, WART);
    c.px(x + 1, y + sq, WART);
    c.px(x, y + 1 + sq, 12611792);
  }
  c.ellipse(20, 15 + sq, 3, 1.5, BL);
  c.ellipse(15, 40, 5, 3, BD);
  c.ellipse(37, 40, 5, 3, BD);
  c.outline(OUT);
  return c;
}
function drawShroom(f) {
  const c = new PixelCanvas(24, 26);
  const y0 = f ? 1 : 0;
  c.rect(8, 14 + y0, 8, 9, 15786696);
  c.rect(8, 21 + y0, 3, 3, 14207144);
  c.rect(13, 21 + y0, 3, 3, 14207144);
  c.ellipse(12, 10 + y0, 11, 7, 11020320);
  c.ellipse(12, 9 + y0, 10, 6, 14170672);
  for (const [x, y] of [[6, 7], [12, 5], [17, 8], [9, 11], [15, 11]]) c.circle(x, y + y0, 1.3, 16774368);
  c.line(9, 15 + y0, 11, 16 + y0, OUT);
  c.line(15, 15 + y0, 13, 16 + y0, OUT);
  c.px(10, 17 + y0, 16724016);
  c.px(13, 17 + y0, 16724016);
  c.rect(10, 19 + y0, 4, 1, OUT);
  c.outline(OUT);
  return c;
}
function drawBoneLord(f) {
  const c = new PixelCanvas(48, 48);
  const IRON = 6975616, IROND = 4738652, IRONL = 10528952, CAPE = 2775728, GOLD = 16106818;
  const la = f ? 1 : -1, sy = f ? 1 : 0;
  c.poly([[14, 19], [34, 19], [36, 41], [31, 39], [27, 42], [22, 39], [17, 42], [12, 40]], CAPE);
  c.rect(19 + la, 33, 4, 10, IROND);
  c.rect(25 - la, 33, 4, 10, IRON);
  c.rect(17 + la, 43, 6, 2, IROND);
  c.rect(25 - la, 43, 6, 2, IROND);
  c.rect(16, 18, 16, 16, IRON);
  c.rect(16, 18, 3, 16, IROND);
  c.rect(19, 21, 10, 2, IRONL);
  c.rect(22, 25, 4, 4, GOLD);
  c.rect(16, 31, 16, 2, 7027231);
  c.ellipse(15, 19, 5, 3.5, IRONL);
  c.ellipse(33, 19, 5, 3.5, IRONL);
  c.line(36, 30 + sy, 45, 4 + sy, 13160668, 255, 3);
  c.line(36, 30 + sy, 45, 4 + sy, 16777215);
  c.rect(32, 28 + sy, 8, 2, GOLD);
  c.rect(34, 30 + sy, 2, 4, 7027231);
  c.rect(17, 4, 14, 14, IRON);
  c.rect(17, 4, 2, 14, IROND);
  c.rect(19, 10, 10, 2, 1710628);
  c.px(21, 10, 6344959);
  c.px(26, 10, 6344959);
  c.rect(23, 12, 2, 5, IRONL);
  c.rect(16, 3, 16, 2, IRONL);
  c.poly([[16, 6], [9, 0], [12, 7]], GOLD);
  c.poly([[32, 6], [39, 0], [36, 7]], GOLD);
  c.outline(OUT);
  return c;
}
function drawVampire(f) {
  const c = new PixelCanvas(48, 48);
  const CAPE = 2759240, LINING = 9063112, SKIN = 15914688, HAIR = 2760768, SUIT = 3811928;
  c.poly([[24, 13], [45, 39 + f], [39, 44], [24, 40], [9, 44], [3, 39 + f]], CAPE);
  c.poly([[24, 16], [40, 38 + f], [24, 36], [8, 38 + f]], LINING);
  c.rect(20, 38, 3, 6, HAIR);
  c.rect(25, 38, 3, 6, HAIR);
  c.rect(19, 18, 10, 20, SUIT);
  c.rect(22, 18, 4, 9, 15790320);
  c.poly([[20, 19], [24, 21], [28, 19], [24, 23]], 6961824);
  c.poly([[15, 9], [21, 18], [17, 19]], LINING);
  c.poly([[33, 9], [27, 18], [31, 19]], LINING);
  c.rect(19, 6, 10, 11, SKIN);
  c.rect(19, 6, 1, 11, 14203040);
  c.rect(18, 3, 12, 4, HAIR);
  c.poly([[19, 6], [24, 9], [29, 6]], HAIR);
  c.rect(18, 6, 2, 5, HAIR);
  c.rect(28, 6, 2, 5, HAIR);
  c.rect(21, 10, 2, 2, OUT);
  c.rect(25, 10, 2, 2, OUT);
  c.px(21, 10, 16777215);
  c.px(25, 10, 16777215);
  c.line(22, 14, 25, 14, 10508880);
  c.px(20, 13, 16752800);
  c.px(27, 13, 16752800);
  c.outline(OUT);
  return c;
}
function drawLich(f) {
  const c = new PixelCanvas(48, 48);
  const ROBE = 2775696, ROBED = 1718890, ICE = 8446207, SKIN = 15914688;
  c.line(38, 45, 40, 9, 7031338, 255, 2);
  c.poly([[40, 1], [44, 7], [40, 14], [36, 7]], ICE);
  c.px(39, 5, 16777215);
  if (f) {
    c.px(35, 3, 16777215);
    c.px(45, 11, 16777215);
  }
  c.poly([[24, 12], [34, 18], [38, 40], [10, 40], [14, 18]], ROBE);
  c.poly([[14, 18], [10, 40], [17, 40], [18, 22]], ROBED);
  for (let x = 10; x < 38; x += 4) c.rect(x + f * 2, 40, 2, 3 + (x >> 2) % 2, ROBE);
  c.ellipse(24, 15, 5.5, 5, SKIN);
  c.rect(21, 13, 2, 2, OUT);
  c.rect(26, 13, 2, 2, OUT);
  c.poly([[18, 16], [30, 16], [27, 28], [24, 31], [21, 28]], 16054527);
  c.rect(20, 11, 4, 1, 16054527);
  c.rect(25, 11, 4, 1, 16054527);
  c.poly([[14, 11], [34, 11], [26, 0], [24, -1]], ROBE);
  c.rect(14, 10, 20, 2, ROBED);
  c.px(24, 4, 16769120);
  c.px(21, 7, 16769120);
  c.px(27, 8, 16769120);
  c.rect(36, 23, 4, 3, SKIN);
  c.outline(OUT);
  return c;
}
function drawEye(f) {
  const c = new PixelCanvas(48, 48);
  const CRY = 9067216, CRYD = 5913242, CRYL = 13150463;
  for (let k = 0; k < 5; k++) {
    const x0 = 12 + k * 6, y0 = 38 + (k + f) % 2 * 3;
    c.poly([[x0, y0 - 4], [x0 + 3, y0], [x0, y0 + 5], [x0 - 3, y0]], k % 2 ? CRYL : CRY);
  }
  c.circle(24, 21, 17, CRYD);
  c.circle(24, 21, 15, CRY);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    c.poly([[24 + Math.cos(a) * 14, 21 + Math.sin(a) * 14], [24 + Math.cos(a + 0.2) * 18, 21 + Math.sin(a + 0.2) * 18], [24 + Math.cos(a + 0.4) * 14, 21 + Math.sin(a + 0.4) * 14]], CRYL);
  }
  c.circle(24, 22, 11.5, 16052479);
  const ix = 24 + (f ? 2 : 0);
  c.circle(ix, 22, 7, 3832544);
  c.circle(ix, 22, 5, 6994175);
  c.circle(ix, 22, 2.5, 1714784);
  c.circle(ix - 3, 19, 2, 16777215);
  c.outline(OUT);
  return c;
}
function drawEnemyShot(kind) {
  switch (kind) {
    case "bone": {
      const c = new PixelCanvas(16, 8);
      c.poly([[0, 4], [4, 1], [16, 4], [4, 7]], 10528952);
      c.poly([[3, 4], [5, 2], [14, 4]], 14739184);
      c.outline(OUT);
      return c;
    }
    case "blood": {
      const c = new PixelCanvas(12, 12);
      c.circle(6, 6, 5.5, 4856448);
      c.circle(6, 6, 4.5, 10506464);
      c.circle(4.5, 4.5, 1.5, 15253759);
      return c;
    }
    case "ice": {
      const c = new PixelCanvas(16, 8);
      c.poly([[0, 4], [5, 1], [16, 4], [5, 7]], 8446207);
      c.poly([[3, 4], [6, 2], [14, 4]], 14743807);
      c.outline(1718874);
      return c;
    }
    case "darkorb": {
      const c = new PixelCanvas(14, 14);
      c.circle(7, 7, 6.5, 9056448, 120);
      c.circle(7, 7, 5, 6953632);
      c.circle(7, 7, 3, 13664511);
      c.px(6, 5, 16777215);
      return c;
    }
    case "slimeball": {
      const c = new PixelCanvas(12, 12);
      c.circle(6, 6, 5, 2787898);
      c.circle(6, 6, 4, 7331946);
      c.px(4, 4, 16777215);
      c.outline(OUT);
      return c;
    }
    case "sand": {
      const c = new PixelCanvas(12, 12);
      c.circle(6, 6, 5, 9068592);
      c.circle(6, 6, 4, 14198880);
      c.px(4, 4, 16773312);
      c.px(7, 8, 9068592);
      c.outline(OUT);
      return c;
    }
    case "scythe": {
      const c = new PixelCanvas(28, 28);
      c.rect(7, 3, 14, 22, 16316664);
      c.rect(9, 5, 10, 18, 14737644);
      c.poly([[14, 9], [18, 14], [14, 19], [10, 14]], 13650570);
      c.px(9, 5, 13650570);
      c.px(18, 22, 13650570);
      c.outline(OUT);
      return c;
    }
  }
  return new PixelCanvas(4, 4);
}
function drawWarn() {
  const c = new PixelCanvas(64, 64);
  c.circle(32, 32, 31.5, 16777215, 70);
  c.ring(32, 32, 31.5, 3, 16777215, 230);
  return c;
}
function drawBolt() {
  const c = new PixelCanvas(14, 14);
  c.circle(7, 7, 6.5, 4172287, 110);
  c.circle(7, 7, 4.5, 4172287);
  c.circle(7, 7, 2.5, 12577023);
  c.px(6, 6, 16777215);
  return c;
}
function drawKnife() {
  const c = new PixelCanvas(18, 8);
  c.rect(1, 3, 4, 2, 7027231);
  c.rect(5, 1, 1, 6, 16106818);
  c.rect(6, 3, 9, 2, 14212584);
  c.rect(6, 3, 9, 1, 16777215);
  c.px(15, 3, 14212584);
  c.px(16, 4, 11581640);
  c.outline(OUT);
  return c;
}
function drawAxe() {
  const c = new PixelCanvas(18, 18);
  c.line(3, 15, 12, 6, 9067056, 255, 2);
  c.poly([[9, 2], [16, 4], [16, 11], [12, 9], [9, 6]], 12107980);
  c.poly([[14, 3], [16, 4], [16, 11], [14, 10]], 15265524);
  c.line(9, 3, 9, 6, 8028816);
  c.outline(OUT);
  return c;
}
function drawBible() {
  const c = new PixelCanvas(14, 16);
  c.rect(1, 1, 12, 14, 5913248);
  c.rect(1, 1, 2, 14, 3810416);
  c.rect(11, 2, 2, 12, 16051416);
  c.poly([[7, 4], [8, 7], [11, 7], [8.5, 9], [9.5, 12], [7, 10], [4.5, 12], [5.5, 9], [3, 7], [6, 7]], 16106818);
  c.outline(OUT);
  return c;
}
function drawLightning() {
  const c = new PixelCanvas(20, 96);
  const r = rng(7);
  let x = 10;
  for (let y = 0; y < 96; y += 6) {
    const nx = Math.max(4, Math.min(15, x + Math.round((r() - 0.5) * 10)));
    c.line(x, y, nx, y + 6, 10537215, 160, 5);
    x = nx;
  }
  x = 10;
  const r2 = rng(7);
  for (let y = 0; y < 96; y += 6) {
    const nx = Math.max(4, Math.min(15, x + Math.round((r2() - 0.5) * 10)));
    c.line(x, y, nx, y + 6, 16777215, 255, 2);
    x = nx;
  }
  return c;
}
function drawSpark() {
  const c = new PixelCanvas(24, 24);
  c.circle(12, 12, 7, 16774304, 140);
  c.poly([[12, 0], [14, 10], [24, 12], [14, 14], [12, 24], [10, 14], [0, 12], [10, 10]], 16775360);
  c.circle(12, 12, 3, 16777215);
  return c;
}
function drawSpike() {
  const c = new PixelCanvas(20, 26);
  c.poly([[2, 25], [6, 6], [9, 25]], 9075306);
  c.poly([[7, 25], [11, 0], [15, 25]], 12101776);
  c.poly([[13, 25], [17, 9], [19, 25]], 9075306);
  c.line(11, 2, 11, 22, 15788248);
  c.line(6, 9, 6, 22, 13681840);
  c.outline(OUT);
  return c;
}
function drawSpikeWarn() {
  const c = new PixelCanvas(16, 8);
  c.ellipse(8, 4, 7, 3, 5914672, 200);
  c.px(5, 3, 2759184);
  c.px(8, 4, 2759184);
  c.px(11, 3, 2759184);
  return c;
}
function drawWhip() {
  const W = 64, H = 32;
  const c = new PixelCanvas(W, H);
  const inside = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5, py = y + 0.5;
    if (!inside(px, py, 32, 30, 31.5, 27) || inside(px, py, 32, 36, 29.5, 25.5)) continue;
    const outer = Math.sqrt(((px - 32) / 31.5) ** 2 + ((py - 30) / 27) ** 2);
    const inner = Math.sqrt(((px - 32) / 29.5) ** 2 + ((py - 36) / 25.5) ** 2);
    const span = outer + (inner - 1);
    const e = Math.abs(span - 0.5 * (1 + (inner - 1)));
    const edge = Math.min(1 - outer, inner - 1) * 30;
    if (edge > 1.6) c.px(x, y, 16777215, 255);
    else if (edge > 0.7) c.px(x, y, 15265530, 240);
    else c.px(x, y, 11056336, 150);
  }
  for (let k = 0; k < 2; k++) {
    const ry = 22 - k * 4, rx = 27 - k * 4;
    for (let a = 0.25; a < Math.PI - 0.25; a += 0.02) {
      const x = Math.round(32 - Math.cos(a) * rx), y = Math.round(34 - Math.sin(a) * ry);
      if (x >= 0 && x < W && y >= 0 && y < H) c.px(x, y, 16777215, 70 - k * 25);
    }
  }
  return c;
}
function drawAura() {
  const c = new PixelCanvas(64, 64);
  c.circle(32, 32, 31.5, 16773312, 40);
  c.ring(32, 32, 31.5, 2, 16773312, 120);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    c.rect(32 + Math.cos(a) * 26 - 1, 32 + Math.sin(a) * 26 - 1, 2, 2, 16777215, 120);
  }
  return c;
}
function drawGem(main, light, dark) {
  const c = new PixelCanvas(10, 12);
  c.poly([[5, 0], [10, 5], [5, 12], [0, 5]], main);
  c.poly([[5, 0], [5, 5], [0, 5]], light);
  c.poly([[5, 12], [10, 5], [5, 6]], dark);
  c.px(3, 3, 16777215);
  c.outline(OUT);
  return c;
}
function drawChicken() {
  const c = new PixelCanvas(18, 14);
  c.rect(1, 9, 6, 2, 16051416);
  c.circle(1.5, 8.5, 1.5, 16051416);
  c.circle(1.5, 11.5, 1.5, 16051416);
  c.ellipse(11, 7, 6.5, 5.5, 11887914);
  c.ellipse(10, 5, 3.5, 2.5, 14715456);
  c.px(9, 4, 16765072);
  c.outline(OUT);
  return c;
}
function drawMagnet() {
  const c = new PixelCanvas(14, 14);
  c.ring(7, 6, 6, 3, 13643824);
  c.rect(1, 6, 3, 4, 13643824);
  c.rect(10, 6, 3, 4, 13643824);
  for (let y = 7; y < 14; y++) for (let x = 0; x < 14; x++) if (x > 3 && x < 10) c.clear(x, y);
  c.rect(1, 10, 3, 3, 14212584);
  c.rect(10, 10, 3, 3, 14212584);
  c.outline(OUT);
  return c;
}
function drawChest() {
  const c = new PixelCanvas(20, 16);
  c.rect(1, 6, 18, 9, 9062944);
  c.rect(1, 2, 18, 4, 11033128);
  c.rect(1, 2, 18, 1, 13138496);
  c.rect(1, 6, 18, 1, 16106818);
  c.rect(9, 5, 2, 4, 16106818);
  c.rect(1, 2, 1, 13, 16106818);
  c.rect(18, 2, 1, 13, 16106818);
  c.outline(OUT);
  return c;
}
function drawGround() {
  const N = 64;
  const c = new PixelCanvas(N, N);
  const r = rng(1234);
  const cols = [4090676, 3826993, 4353847];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(x, y, cols[Math.floor(r() * 3)]);
  const wrap = (x, y, col) => c.px((x + N) % N, (y + N) % N, col);
  for (let k = 0; k < 5; k++) {
    const cx = Math.floor(r() * N), cy = Math.floor(r() * N), rr = 3 + r() * 4;
    for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
      if (x * x + y * y < rr * rr && r() > 0.25) wrap(cx + x, cy + y, 3497261);
    }
  }
  for (let k = 0; k < 22; k++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    wrap(x, y, 5934917);
    wrap(x, y - 1, 6987855);
    wrap(x + 2, y, 5934917);
    wrap(x + 2, y - 1, 5934917);
    wrap(x + 2, y - 2, 8041818);
    wrap(x + 1, y + 1, 3101224);
  }
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    wrap(x, y, 7236186);
    wrap(x + 1, y, 9078388);
  }
  return c;
}
function tileNoise(seed, cols, specks, cracks) {
  const N = 64;
  const c = new PixelCanvas(N, N);
  const r = rng(seed);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(x, y, cols[Math.floor(r() * cols.length)]);
  const wrap = (x, y, col) => c.px((x + N) % N, (y + N) % N, col);
  for (const [col, n] of specks) {
    for (let k = 0; k < n; k++) {
      const cx = Math.floor(r() * N), cy = Math.floor(r() * N), rr = 2 + r() * 4;
      for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y < rr * rr && r() > 0.3) wrap(cx + x, cy + y, col);
    }
  }
  if (cracks) {
    for (let k = 0; k < cracks.n; k++) {
      let x = Math.floor(r() * N), y = Math.floor(r() * N);
      for (let s = 0; s < 14; s++) {
        wrap(x, y, cracks.col);
        if (s % 3 === 1) wrap(x + 1, y, cracks.glow);
        x += r() < 0.5 ? 1 : -1;
        y += r() < 0.7 ? 1 : 0;
      }
    }
  }
  return c;
}
function drawGroundSnow() {
  const c = tileNoise(77, [13227491, 13819112, 12766942], [[11583700, 6], [14542576, 5]]);
  const r = rng(78);
  for (let k = 0; k < 10; k++) {
    const x = Math.floor(r() * 64), y = Math.floor(r() * 64);
    c.px(x, y, 11058388);
    c.px(x + 1, y, 12110044);
  }
  return c;
}
function drawGroundLava() {
  return tileNoise(91, [2759196, 3153950, 2496024], [[3810338, 5], [1839122, 4]], { col: 13647896, glow: 16752688, n: 5 });
}
function drawGroundSwamp() {
  const c = tileNoise(131, [2894364, 3288864, 2631192], [[3815972, 5], [1450538, 6], [1846320, 4]]);
  const r = rng(132);
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(r() * 60), y = Math.floor(r() * 60);
    c.px(x, y, 6982202);
    c.px(x + 1, y, 5599278);
    c.px(x, y + 1, 5599278);
  }
  return c;
}
function drawDeadTree() {
  const c = new PixelCanvas(30, 40);
  c.rect(13, 14, 4, 26, 3813416);
  c.rect(14, 14, 1, 26, 4866100);
  c.line(15, 22, 5, 12, 3813416, 255, 2);
  c.line(5, 12, 3, 5, 3813416);
  c.line(15, 18, 25, 8, 3813416, 255, 2);
  c.line(25, 8, 28, 3, 3813416);
  c.line(20, 13, 23, 15, 3813416);
  c.rect(10, 38, 10, 2, 2760728);
  c.px(6, 11, 5929530);
  c.px(24, 9, 5929530);
  c.px(14, 30, 5929530);
  c.outline(OUT);
  return c;
}
function drawReeds() {
  const c = new PixelCanvas(18, 24);
  for (const [x, h, col] of [[3, 16, 5929524], [7, 22, 6982202], [11, 18, 5929524], [14, 13, 4876846]]) {
    c.line(x, 23, x + (x % 2 ? 1 : -1), 23 - h, col);
    if (h > 17) c.rect(x - 1, 23 - h, 2, 5, 6965802);
  }
  c.outline(OUT);
  return c;
}
function drawMushroom() {
  const c = new PixelCanvas(20, 16);
  c.rect(5, 9, 3, 6, 15260864);
  c.ellipse(6.5, 8, 5.5, 3.5, 10109120);
  c.px(4, 7, 14725375);
  c.px(8, 6, 14725375);
  c.rect(13, 11, 2, 4, 15260864);
  c.ellipse(14, 10, 3.5, 2.5, 8048704);
  c.px(13, 9, 13696928);
  c.outline(OUT);
  return c;
}
function drawBogPool() {
  const c = new PixelCanvas(36, 18);
  c.ellipse(18, 9, 17.5, 8.5, 1714708);
  c.ellipse(18, 9, 15, 6.5, 3828260);
  c.ellipse(17, 8, 10, 4, 6987824);
  c.circle(12, 7, 1.5, 11591776);
  c.circle(22, 9, 1, 11591776);
  return c;
}
function drawBubble() {
  const c = new PixelCanvas(20, 20);
  c.circle(10, 10, 8, 8446016, 200);
  c.circle(10, 10, 6, 11075424, 160);
  c.circle(7, 7, 2, 15794128);
  c.outline(2771476);
  return c;
}
function drawGroundXmas() {
  const c = tileNoise(141, [14213870, 14739698, 13687528], [[12635870, 5], [15660282, 6]]);
  const r = rng(142);
  for (let k = 0; k < 5; k++) {
    const x = Math.floor(r() * 62), y = Math.floor(r() * 62);
    c.px(x, y, [16736352, 6344800, 16764992, 6332671][k % 4]);
  }
  return c;
}
function drawXmasTree() {
  const c = new PixelCanvas(32, 44);
  c.rect(14, 37, 4, 6, 6963236);
  for (const [y, w] of [[30, 28], [22, 22], [14, 16], [7, 10]]) {
    c.poly([[16 - w / 2, y + 8], [16 + w / 2, y + 8], [16, y - 3]], 2783802);
    c.poly([[16 - w / 2, y + 8], [16, y + 8], [16, y - 3]], 1989164);
    c.rect(16 - w / 2 + 2, y + 6, w - 4, 1, 15791871);
  }
  const r = rng(7);
  for (let k = 0; k < 9; k++) c.px(9 + Math.floor(r() * 14), 10 + Math.floor(r() * 26), [16728128, 16764992, 6332671][k % 3]);
  c.poly([[16, 0], [18, 4], [22, 4], [19, 7], [20, 11], [16, 8], [12, 11], [13, 7], [10, 4], [14, 4]], 16764992);
  c.outline(OUT);
  return c;
}
function drawGift() {
  const c = new PixelCanvas(18, 18);
  c.rect(2, 7, 14, 10, 14168112);
  c.rect(1, 5, 16, 3, 15222856);
  c.rect(8, 5, 2, 12, 16764992);
  c.rect(1, 6, 16, 1, 16764992);
  c.ellipse(6, 3, 3, 2, 16764992);
  c.ellipse(12, 3, 3, 2, 16764992);
  c.outline(OUT);
  return c;
}
function drawCandyCane() {
  const c = new PixelCanvas(12, 26);
  for (let y = 6; y < 25; y++) c.rect(2, y, 3, 1, (y >> 1) % 2 ? 14168112 : 16316664);
  for (let k = 0; k <= 16; k++) {
    const t = Math.PI + k / 16 * Math.PI;
    const x = Math.round(6 + Math.cos(t) * 3.2), y = Math.round(6 + Math.sin(t) * 3.2);
    c.rect(x - 1, y, 3, 2, k % 4 < 2 ? 14168112 : 16316664);
  }
  c.rect(8, 6, 3, 3, 14168112);
  c.outline(OUT);
  return c;
}
function drawYeti(f) {
  const c = new PixelCanvas(52, 52);
  const W = 15266042, WD = 12110044, SKIN = 9085120;
  const arm = f ? 2 : 0;
  c.ellipse(26, 34, 18, 16, WD);
  c.ellipse(26, 33, 17, 15, W);
  c.ellipse(8, 32 + arm, 6, 11, WD);
  c.ellipse(44, 32 - arm, 6, 11, WD);
  c.ellipse(8, 31 + arm, 5, 10, W);
  c.ellipse(44, 31 - arm, 5, 10, W);
  c.ellipse(26, 24, 10, 8, SKIN);
  c.rect(20, 21, 3, 3, OUT);
  c.rect(29, 21, 3, 3, OUT);
  c.px(21, 21, 8446207);
  c.px(30, 21, 8446207);
  c.rect(21, 27, 10, 3, 3811904);
  c.px(22, 27, 16777215);
  c.px(29, 27, 16777215);
  for (const [x, y] of [[14, 40], [20, 44], [32, 44], [38, 40], [26, 46], [12, 30], [40, 28]]) c.px(x, y, WD);
  c.ellipse(18, 49, 6, 3, WD);
  c.ellipse(34, 49, 6, 3, WD);
  c.poly([[13, 17], [39, 17], [30, 4], [24, 2]], 14168112);
  c.poly([[24, 2], [30, 4], [36, 0], [34, -1]], 14168112);
  c.rect(12, 15, 28, 4, 16316664);
  c.circle(37, 1, 3, 16316664);
  c.outline(OUT);
  return c;
}
function santaFrog(src) {
  const c = new PixelCanvas(src.w, src.h);
  c.data.set(src.data);
  const { top, cx, hw } = headBox(src);
  c.poly([[cx - hw, top + 6], [cx + hw, top + 6], [cx + 4, top - 8], [cx - 2, top - 9]], 14168112);
  c.poly([[cx + 4, top - 8], [cx + hw + 3, top - 3], [cx + hw + 4, top - 1]], 14168112);
  c.rect(Math.round(cx - hw - 1), top + 4, Math.round(hw * 2 + 2), 4, 16316664);
  c.circle(cx + hw + 4, top, 2.5, 16316664);
  const by = top + Math.round(hw * 0.75) + 9;
  c.ellipse(cx, by + 3, hw * 0.7, 5, 16316664);
  c.ellipse(cx, by + 1, hw * 0.45, 2, 15263984);
  return c;
}
function drawPine() {
  const c = new PixelCanvas(28, 40);
  c.rect(12, 32, 4, 7, 5913124);
  for (const [y, w] of [[26, 24], [18, 18], [11, 12], [5, 7]]) {
    c.poly([[14 - w / 2, y + 8], [14 + w / 2, y + 8], [14, y - 2]], 2775624);
    c.poly([[14 - w / 2, y + 8], [14, y + 8], [14, y - 2]], 1983542);
    c.rect(14 - w / 2 + 2, y + 6, w - 4, 2, 15791871);
  }
  c.rect(13, 1, 2, 3, 15791871);
  c.outline(OUT);
  return c;
}
function drawIceRock() {
  const c = new PixelCanvas(18, 14);
  c.poly([[1, 13], [4, 4], [9, 1], [14, 5], [17, 13]], 9091296);
  c.poly([[4, 4], [9, 1], [9, 13], [4, 13]], 12115192);
  c.line(9, 2, 12, 9, 15267583);
  c.outline(OUT);
  return c;
}
function drawSnowman() {
  const c = new PixelCanvas(18, 24);
  c.circle(9, 17, 6.5, 16054527);
  c.circle(9, 8, 4.5, 16054527);
  c.circle(7.5, 16, 4.5, 14674164);
  c.px(7, 7, OUT);
  c.px(11, 7, OUT);
  c.rect(9, 9, 3, 1, 16747056);
  c.rect(4, 11, 10, 2, 13643824);
  c.rect(5, 1, 8, 3, 2763316);
  c.rect(3, 4, 12, 1, 2763316);
  c.outline(OUT);
  return c;
}
function drawLavaRock() {
  const c = new PixelCanvas(18, 14);
  c.ellipse(9, 8, 8, 5.5, 3810854);
  c.ellipse(8, 7, 5.5, 3.5, 5125168);
  c.line(4, 9, 9, 6, 14700568);
  c.line(9, 6, 13, 10, 16748592);
  c.outline(OUT);
  return c;
}
function drawObsidian() {
  const c = new PixelCanvas(14, 20);
  c.poly([[2, 19], [4, 6], [7, 0], [10, 7], [12, 19]], 2365488);
  c.poly([[7, 0], [10, 7], [12, 19], [7, 19]], 3811920);
  c.line(5, 7, 6, 16, 9071296);
  c.outline(OUT);
  return c;
}
function drawLavaPool() {
  const c = new PixelCanvas(36, 18);
  c.ellipse(18, 9, 17.5, 8.5, 5904912);
  c.ellipse(18, 9, 15, 6.5, 13647896);
  c.ellipse(17, 8, 10, 4, 16747048);
  c.ellipse(15, 7, 4, 1.5, 16765024);
  return c;
}
function drawSkullPile() {
  const c = new PixelCanvas(18, 12);
  for (const [x, y] of [[5, 7], [12, 7], [9, 3]]) {
    c.circle(x, y, 3.2, 15262416);
    c.px(x - 1, y, OUT);
    c.px(x + 1, y, OUT);
  }
  c.outline(OUT);
  return c;
}
function drawIcicle() {
  const c = new PixelCanvas(10, 24);
  c.poly([[1, 0], [9, 0], [5, 23]], 10147064);
  c.poly([[3, 0], [6, 0], [5, 18]], 15268095);
  c.outline(2771562);
  return c;
}
function drawMeteor() {
  const c = new PixelCanvas(18, 26);
  c.poly([[5, 0], [13, 0], [15, 14], [3, 14]], 16747040, 140);
  c.poly([[7, 2], [11, 2], [12, 14], [6, 14]], 16765024, 200);
  c.circle(9, 18, 6.5, 4860452);
  c.circle(8, 17, 4, 6961706);
  c.px(10, 20, 16748592);
  c.outline(OUT);
  return c;
}
function drawGroundFest() {
  const N = 64;
  const c = new PixelCanvas(N, N);
  const r = rng(207);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(x, y, [8006182, 8532010, 7611938][Math.floor(r() * 3)]);
  for (let y = 0; y < N; y += 16) {
    c.rect(0, y, N, 1, 4855316);
    const off = y / 16 % 2 ? 16 : 0;
    for (let x = off; x < N; x += 32) c.rect(x, y, 1, 16, 4855316);
  }
  for (const [x, y] of [[12, 6], [44, 22], [28, 40], [56, 54]]) {
    c.rect(x - 2, y, 5, 1, 13146688);
    c.rect(x, y - 2, 1, 5, 13146688);
  }
  return c;
}
function drawLantern() {
  const c = new PixelCanvas(16, 36);
  c.rect(7, 0, 2, 36, 5913124);
  c.rect(2, 6, 12, 2, 5913124);
  c.rect(3, 8, 1, 3, 13146688);
  c.ellipse(4, 15, 4, 5, 14166560);
  c.ellipse(3.5, 14, 2, 3, 16738880);
  c.rect(2, 10, 5, 1, 16106818);
  c.rect(2, 19, 5, 1, 16106818);
  c.rect(4, 20, 1, 4, 16106818);
  c.rect(12, 8, 1, 3, 13146688);
  c.ellipse(12, 15, 4, 5, 14166560);
  c.ellipse(11.5, 14, 2, 3, 16738880);
  c.rect(10, 10, 5, 1, 16106818);
  c.rect(10, 19, 5, 1, 16106818);
  c.rect(12, 20, 1, 4, 16106818);
  c.outline(OUT);
  return c;
}
function drawFirecracker() {
  const c = new PixelCanvas(12, 28);
  c.rect(5, 0, 2, 28, 9071168);
  for (let i = 0; i < 6; i++) {
    const y = 3 + i * 4, x = i % 2 ? 6 : 1;
    c.rect(x, y, 5, 3, 14166560);
    c.rect(x, y, 5, 1, 16738880);
    c.px(x + (i % 2 ? 4 : 0), y + 1, 16106818);
  }
  c.outline(OUT);
  return c;
}
function drawRedGate() {
  const c = new PixelCanvas(44, 40);
  c.rect(6, 10, 4, 30, 11543584);
  c.rect(34, 10, 4, 30, 11543584);
  c.rect(6, 10, 1, 30, 8001556);
  c.rect(34, 10, 1, 30, 8001556);
  c.poly([[0, 8], [44, 8], [40, 2], [4, 2]], 2767432);
  c.rect(2, 8, 40, 4, 14168096);
  c.rect(16, 13, 12, 7, 16106818);
  c.rect(18, 15, 8, 3, 14168096);
  c.outline(OUT);
  return c;
}
function drawPlum() {
  const c = new PixelCanvas(28, 34);
  c.line(14, 33, 14, 18, 4860442, 255, 2);
  c.line(14, 22, 6, 12, 4860442);
  c.line(14, 20, 22, 9, 4860442);
  c.line(8, 14, 4, 6, 4860442);
  c.line(20, 11, 24, 4, 4860442);
  const r = rng(33);
  for (let i = 0; i < 18; i++) {
    const x = 3 + r() * 22, y = 2 + r() * 18;
    c.circle(x, y, 1.6, r() < 0.5 ? 16743066 : 16756932);
    c.px(x, y, 16773280);
  }
  c.outline(OUT, 200);
  return c;
}
function drawNian(f) {
  const c = new PixelCanvas(48, 48);
  const R = 14172202, RD = 10101784, GOLD = 16106818, GD = 12618272;
  const la = f ? 1 : -1;
  c.rect(12 + la, 36, 6, 10, RD);
  c.rect(30 - la, 36, 6, 10, R);
  c.rect(11 + la, 44, 8, 3, GOLD);
  c.rect(29 - la, 44, 8, 3, GOLD);
  c.ellipse(24, 30, 15, 10, R);
  c.ellipse(22, 32, 9, 6, 15759946);
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.9 + k * 0.15);
    c.circle(24 + Math.cos(a) * 13, 17 + Math.sin(a) * 11, 4.5, k % 2 ? GOLD : GD);
  }
  c.ellipse(24, 18, 11, 10, R);
  c.ellipse(24, 22, 8, 5, 15759946);
  c.poly([[15, 10], [10, 0], [18, 8]], 16051416);
  c.poly([[33, 10], [38, 0], [30, 8]], 16051416);
  c.circle(19, 15, 3, 16777215);
  c.circle(29, 15, 3, 16777215);
  c.circle(19.5, 15.5, 1.6, OUT);
  c.circle(29.5, 15.5, 1.6, OUT);
  c.rect(15, 11, 7, 1, RD);
  c.rect(27, 11, 7, 1, RD);
  if (f) {
    c.ellipse(24, 24, 6, 3.5, 4852234);
    c.rect(19, 21, 2, 2, 16777215);
    c.rect(27, 21, 2, 2, 16777215);
  } else {
    c.rect(18, 24, 12, 2, 4852234);
    c.px(19, 23, 16777215);
    c.px(28, 23, 16777215);
  }
  c.circle(41, 24, 4, GOLD);
  c.outline(OUT);
  return c;
}
function fuFrog(src) {
  const c = new PixelCanvas(src.w, src.h);
  c.data.set(src.data);
  let top = -1, minX = src.w, maxX = 0;
  for (let y = 0; y < src.h && top < 0; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) {
    top = y;
    break;
  }
  for (let y = top; y < top + 6; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  const cx = (minX + maxX) / 2;
  const hw = Math.max(8, (maxX - minX) / 2 + 2);
  c.ellipse(cx, top + 4, hw, 6, 10099736);
  c.rect(Math.round(cx - hw), top + 7, Math.round(hw * 2), 2, 16106818);
  c.circle(cx, top - 2, 2.5, 16106818);
  c.rect(Math.round(cx) - 1, top - 1, 2, 3, 14166560);
  const ny = Math.round(src.h * 0.52);
  c.circle(cx, ny, 4.5, 16106818);
  c.rect(Math.round(cx) - 1, ny - 1, 3, 3, 12618272);
  c.line(cx - 8, ny - 7, cx - 3, ny - 3, 14166560);
  c.line(cx + 8, ny - 7, cx + 3, ny - 3, 14166560);
  return c;
}
function headBox(src) {
  let top = -1, minX = src.w, maxX = 0;
  for (let y = 0; y < src.h && top < 0; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) {
    top = y;
    break;
  }
  for (let y = top; y < top + 6; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  return { top, cx: (minX + maxX) / 2, hw: Math.max(8, (maxX - minX) / 2 + 2) };
}
function druidFrog(src) {
  const c = new PixelCanvas(src.w, src.h);
  c.data.set(src.data);
  const d2 = c.data;
  for (let i = 0; i < d2.length; i += 4) {
    const r = d2[i], g2 = d2[i + 1], b = d2[i + 2];
    if (d2[i + 3] && r > 150 && g2 > 120 && b < g2 * 0.8) {
      d2[i] = Math.round(r * 0.5);
      d2[i + 1] = Math.round(g2 * 0.92);
      d2[i + 2] = Math.round(b * 0.7 + 20);
    }
  }
  const { top, cx, hw } = headBox(src);
  for (let k = -3; k <= 3; k++) {
    const x = cx + k * (hw / 3.2), y = top + 2 + Math.abs(k) * 0.8;
    c.ellipse(x, y, 3, 2, k % 2 ? 3840576 : 5816400);
    c.px(Math.round(x), Math.round(y) - 1, 10543232);
  }
  c.circle(cx, top - 1, 2, 14696512);
  c.px(Math.round(cx) - 1, top - 2, 16777215);
  const sy = Math.round(src.h * 0.5);
  for (let x = Math.round(cx - hw - 2); x <= cx + hw + 2; x++) {
    const y = sy + Math.round(Math.sin(x * 0.7) * 1.5);
    if (src.alpha(x, y) > 0) c.px(x, y, 3111477);
    if (src.alpha(x, y + 1) > 0) c.px(x, y + 1, 4889152);
    if (x % 4 === 0 && src.alpha(x, y + 2) > 0) c.px(x, y + 2, 8048736);
  }
  return c;
}
function prismFrog(src) {
  const c = new PixelCanvas(src.w, src.h);
  c.data.set(src.data);
  const { top, cx, hw } = headBox(src);
  c.poly([[cx, top - 9], [cx + 4, top - 3], [cx, top + 2], [cx - 4, top - 3]], 6351103);
  c.poly([[cx, top - 9], [cx + 4, top - 3], [cx, top - 3]], 13697023);
  c.line(cx, top + 2, cx, top + 4, 8425632);
  const ey = top + Math.round(hw * 0.75) + 5;
  c.rect(Math.round(cx - hw - 1), ey - 3, Math.round(hw * 2 + 2), 7, 3160136);
  c.rect(Math.round(cx - hw + 1), ey - 2, Math.round(hw - 2), 5, 4249855);
  c.rect(Math.round(cx + 1), ey - 2, Math.round(hw - 2), 5, 4249855);
  c.rect(Math.round(cx - hw + 2), ey - 1, 2, 2, 14745599);
  c.rect(Math.round(cx + 2), ey - 1, 2, 2, 14745599);
  return c;
}
function drawFirework() {
  const c = new PixelCanvas(24, 24);
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    c.line(12 + Math.cos(a) * 4, 12 + Math.sin(a) * 4, 12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11, k % 2 ? 16764992 : 16734784);
  }
  c.circle(12, 12, 2.5, 16777215);
  return c;
}
function drawTomb() {
  const c = new PixelCanvas(16, 22);
  c.rect(2, 7, 12, 13, 9079448);
  c.ellipse(8, 7, 6, 5, 9079448);
  c.rect(2, 4, 2, 16, 6974072);
  c.rect(7, 6, 2, 8, 5921382);
  c.rect(5, 8, 6, 2, 5921382);
  c.rect(0, 19, 16, 3, 4864552);
  c.px(11, 15, 5934917);
  c.px(12, 16, 5934917);
  c.outline(OUT);
  return c;
}
function drawTree() {
  const c = new PixelCanvas(36, 44);
  c.rect(15, 26, 6, 16, 5913120);
  c.rect(15, 26, 2, 16, 4073492);
  c.rect(12, 40, 12, 2, 5913120);
  c.circle(18, 16, 12, 2377002);
  c.circle(11, 22, 8, 2377002);
  c.circle(25, 22, 8, 2377002);
  c.circle(17, 14, 10, 3103282);
  c.circle(22, 19, 7, 3103282);
  c.circle(15, 11, 6, 4093248);
  c.circle(13, 9, 3, 5673562);
  c.outline(OUT);
  return c;
}
function drawBush() {
  const c = new PixelCanvas(20, 14);
  c.circle(6, 8, 5, 3103282);
  c.circle(13, 7, 6, 3103282);
  c.circle(11, 6, 4, 4093248);
  c.px(10, 4, 5673562);
  c.px(5, 6, 13647952);
  c.px(15, 9, 13647952);
  c.outline(OUT);
  return c;
}
function drawRock() {
  const c = new PixelCanvas(14, 10);
  c.ellipse(7, 6, 6, 4, 7236192);
  c.ellipse(6, 5, 4, 2.5, 9341566);
  c.px(5, 4, 11183768);
  c.outline(OUT);
  return c;
}
function drawFlowers() {
  const c = new PixelCanvas(12, 8);
  const pts = [[2, 3, 15786080], [6, 1, 15790320], [9, 4, 14708896], [4, 6, 15790320]];
  for (const p of pts) {
    c.px(p[0], p[1] + 1, 3101224);
    c.px(p[0] - 1, p[1], p[2]);
    c.px(p[0] + 1, p[1], p[2]);
    c.px(p[0], p[1] - 1, p[2]);
    c.px(p[0], p[1], 15769632);
  }
  return c;
}
function drawBones() {
  const c = new PixelCanvas(14, 8);
  c.line(2, 6, 11, 2, 15262416, 255, 1);
  c.line(2, 2, 11, 6, 13682864, 255, 1);
  c.rect(1, 1, 2, 2, 15262416);
  c.rect(10, 5, 2, 2, 15262416);
  c.rect(1, 5, 2, 2, 13682864);
  c.rect(10, 1, 2, 2, 13682864);
  c.outline(OUT, 160);
  return c;
}
function icon(fn, outline = true) {
  const c = new PixelCanvas(16, 16);
  fn(c);
  if (outline) c.outline(OUT);
  return c;
}
function drawCoin() {
  const c = new PixelCanvas(10, 10);
  c.circle(5, 5, 4.5, 14196768);
  c.circle(5, 5, 3.5, 16106818);
  c.rect(4, 3, 2, 4, 14196768);
  c.px(3, 2, 16773280);
  c.outline(OUT);
  return c;
}
function drawCoinBag() {
  const c = new PixelCanvas(16, 16);
  c.ellipse(8, 10, 6.5, 5.5, 10119728);
  c.rect(6, 2, 4, 4, 10119728);
  c.rect(5, 5, 6, 1, 16106818);
  c.ellipse(6, 9, 2, 2, 12618312);
  c.circle(8, 11, 2.5, 16106818);
  c.outline(OUT);
  return c;
}
function evoIcon(base) {
  const c = new PixelCanvas(16, 16);
  c.data.set(base.data);
  const o = [OUT >> 16 & 255, OUT >> 8 & 255, OUT & 255];
  for (let i = 0; i < c.data.length; i += 4) {
    if (c.data[i + 3] && c.data[i] === o[0] && c.data[i + 1] === o[1] && c.data[i + 2] === o[2]) {
      c.data[i] = 255;
      c.data[i + 1] = 192;
      c.data[i + 2] = 48;
    } else if (c.data[i + 3]) {
      c.data[i] = Math.min(255, c.data[i] * 1.15 + 30);
      c.data[i + 1] = c.data[i + 1] * 0.8;
      c.data[i + 2] = c.data[i + 2] * 0.8;
    }
  }
  c.px(1, 1, 16777215);
  c.px(14, 2, 16777215);
  c.px(2, 14, 16773280);
  return c;
}
function drawFireball() {
  const c = new PixelCanvas(16, 16);
  c.circle(8, 8, 7.5, 16728080, 120);
  c.circle(8, 8, 5.5, 16736288);
  c.circle(8, 8, 3.5, 16760896);
  c.circle(7, 7, 1.5, 16777215);
  return c;
}
function drawFlame(f) {
  const c = new PixelCanvas(32, 20);
  const r = rng(31 + f);
  c.ellipse(16, 15, 15, 5, 10493968, 120);
  for (let i = 0; i < 9; i++) {
    const x = 3 + i * 3.3 + r() * 2, h = 5 + r() * 9;
    c.poly([[x - 3, 17], [x + (f ? 1 : -1), 17 - h], [x + 3, 17]], 16736288);
    c.poly([[x - 1.5, 17], [x, 17 - h * 0.6], [x + 1.5, 17]], 16764992);
  }
  return c;
}
function drawFlask() {
  const c = new PixelCanvas(10, 14);
  c.rect(4, 0, 2, 3, 9067056);
  c.rect(3, 3, 4, 2, 12640511);
  c.ellipse(5, 9, 4.5, 4.5, 4227327);
  c.ellipse(4, 8, 1.5, 1.5, 12640511);
  c.outline(OUT);
  return c;
}
function drawPuddle() {
  const c = new PixelCanvas(64, 40);
  c.ellipse(32, 20, 31.5, 19.5, 3174655, 110);
  c.ellipse(32, 20, 26, 15, 6332671, 120);
  const r = rng(77);
  for (let i = 0; i < 10; i++) c.rect(8 + r() * 46, 6 + r() * 26, 2, 2, 14741759, 220);
  return c;
}
function drawCrossProj() {
  const c = new PixelCanvas(18, 18);
  c.poly([[9, 0], [11, 7], [18, 9], [11, 11], [9, 18], [7, 11], [0, 9], [7, 7]], 16106818);
  c.poly([[9, 2], [10, 8], [9, 9], [8, 8]], 16773280);
  c.circle(9, 9, 1.8, 16775376);
  c.outline(OUT);
  return c;
}
function drawFamiliar(f) {
  const c = new PixelCanvas(16, 16);
  c.circle(8, 8, 7.5, 4259712, 80);
  c.circle(8, 8, 4.5, 8454064);
  c.circle(8, 8, 2.5, 14745576);
  const wy = f ? 4 : 6;
  c.poly([[1, wy], [5, 8], [1, wy + 6]], 13696992, 200);
  c.poly([[15, wy], [11, 8], [15, wy + 6]], 13696992, 200);
  c.px(7, 7, OUT);
  c.px(9, 7, OUT);
  return c;
}
function drawFShot() {
  const c = new PixelCanvas(8, 8);
  c.circle(4, 4, 3.5, 6356880, 160);
  c.circle(4, 4, 2, 14745576);
  return c;
}
function drawBomb(f) {
  const c = new PixelCanvas(14, 16);
  c.circle(7, 10, 5.5, f ? 12595248 : 2763322);
  c.circle(5.5, 8.5, 1.5, f ? 16744576 : 6974074);
  c.rect(8, 2, 2, 4, 9071168);
  c.px(10, 1, 16760896);
  c.px(11, 0, f ? 16777215 : 16736288);
  c.outline(OUT);
  return c;
}
function drawBrazier(f) {
  const c = new PixelCanvas(18, 26);
  c.rect(7, 14, 4, 10, 6967360);
  c.rect(4, 23, 10, 2, 4864040);
  c.poly([[2, 10], [16, 10], [13, 15], [5, 15]], 9072720);
  c.rect(2, 10, 14, 1, 11571312);
  const h = f ? 9 : 7;
  c.poly([[4, 10], [6, 10 - h + 2], [9, 10 - h - 1], [12, 10 - h + 3], [14, 10]], 16736288);
  c.poly([[6, 10], [9, 10 - h + 2], [12, 10]], 16764992);
  c.outline(OUT);
  return c;
}
function drawWatch() {
  const c = new PixelCanvas(14, 16);
  c.rect(6, 0, 2, 3, 16106818);
  c.circle(7, 9, 6, 16106818);
  c.circle(7, 9, 4.5, 16051416);
  c.line(7, 9, 7, 6, OUT);
  c.line(7, 9, 9, 10, OUT);
  c.outline(OUT);
  return c;
}
function drawNuke() {
  const c = new PixelCanvas(14, 18);
  c.rect(5, 0, 4, 18, 16769152);
  c.rect(0, 4, 14, 4, 16769152);
  c.rect(6, 1, 2, 16, 16777215);
  c.rect(1, 5, 12, 2, 16777215);
  c.outline(10514448);
  return c;
}
function drawPotion() {
  const c = new PixelCanvas(12, 16);
  c.rect(4, 0, 4, 2, 9067056);
  c.rect(4, 2, 4, 3, 13684960);
  c.ellipse(6, 10, 5.5, 5.5, 14688320);
  c.ellipse(4.5, 8.5, 1.5, 2, 16748704);
  c.outline(OUT);
  return c;
}
function drawShieldPickup() {
  const c = new PixelCanvas(14, 16);
  c.poly([[1, 1], [13, 1], [13, 8], [7, 15], [1, 8]], 6332671);
  c.poly([[7, 1], [13, 1], [13, 8], [7, 15]], 4227296);
  c.rect(6, 3, 2, 9, 16777215);
  c.rect(3, 6, 8, 2, 16777215);
  c.outline(OUT);
  return c;
}
function drawHaste() {
  const c = new PixelCanvas(12, 16);
  c.rect(0, 0, 12, 2, 9067056);
  c.rect(0, 14, 12, 2, 9067056);
  c.poly([[1, 2], [11, 2], [7, 8], [11, 14], [1, 14], [5, 8]], 14218495);
  c.poly([[3, 3], [9, 3], [6, 7]], 6344959);
  c.poly([[6, 9], [9, 13], [3, 13]], 6344959);
  c.outline(OUT);
  return c;
}
function drawClover() {
  const c = new PixelCanvas(16, 16);
  for (const [x, y] of [[5, 5], [11, 5], [5, 10], [11, 10]]) c.circle(x, y, 3.6, 5029964);
  c.circle(8, 7.5, 2.2, 7002218);
  c.circle(4, 4, 1.2, 10547360);
  c.line(8, 9, 10, 15, 3050030, 255, 2);
  c.outline(OUT);
  return c;
}
function drawFireRing() {
  const c = new PixelCanvas(16, 16);
  c.ring(8, 8, 7, 3, 16736288);
  c.ring(8, 8, 6, 1.5, 16760896);
  for (const [x, y] of [[8, 1], [15, 8], [8, 15], [1, 8]]) c.circle(x, y, 1.5, 16773248);
  c.outline(OUT);
  return c;
}
function drawScroll() {
  const c = new PixelCanvas(16, 14);
  c.rect(2, 2, 12, 10, 16049336);
  c.rect(0, 1, 3, 12, 13146200);
  c.rect(13, 1, 3, 12, 13146200);
  for (const y of [4, 7, 10]) c.line(5, y, 11, y, 9071168);
  c.circle(10, 9, 1.6, 14692400);
  c.outline(OUT);
  return c;
}
function drawGroundSand() {
  const c = tileNoise(171, [14201962, 14465648, 13807204], [[15124614, 6], [12885592, 5]]);
  for (const y0 of [10, 30, 50]) for (let x = 0; x < 64; x++) {
    const y = y0 + Math.round(Math.sin(x / 64 * Math.PI * 4) * 2);
    c.px(x, y, 12884564);
    if (x % 4 === 0) c.px(x, y - 1, 15650958);
  }
  return c;
}
function drawCactus() {
  const c = new PixelCanvas(20, 30);
  c.rect(8, 4, 5, 25, 4889152);
  c.rect(9, 4, 2, 25, 6996056);
  c.rect(2, 10, 4, 9, 4889152);
  c.rect(2, 17, 7, 3, 4889152);
  c.rect(15, 7, 4, 8, 4889152);
  c.rect(12, 13, 7, 3, 4889152);
  c.circle(10.5, 4, 2.5, 15755936);
  for (const [x, y] of [[7, 8], [13, 15], [7, 22], [13, 24], [3, 12], [18, 9]]) c.px(x, y, 16051416);
  c.outline(OUT);
  return c;
}
function drawSandRock() {
  const c = new PixelCanvas(26, 16);
  c.poly([[1, 15], [4, 6], [11, 2], [19, 4], [25, 15]], 11567184);
  c.poly([[11, 2], [19, 4], [25, 15], [15, 15]], 9068600);
  c.line(5, 8, 11, 4, 13672560);
  c.outline(OUT);
  return c;
}
function drawSkullRock() {
  const c = new PixelCanvas(22, 14);
  c.poly([[1, 13], [4, 5], [9, 1], [8, 6], [6, 13]], 15787724);
  c.poly([[21, 13], [18, 5], [13, 1], [14, 6], [16, 13]], 15787724);
  c.rect(5, 10, 12, 3, 13154456);
  c.outline(OUT);
  return c;
}
function drawTornado(f) {
  const c = new PixelCanvas(40, 56);
  for (let y = 0; y < 52; y++) {
    const w = 4 + (52 - y) * 0.32, cx = 20 + Math.sin(y / 6 + f * 1.6) * 3;
    for (let x = Math.floor(cx - w); x <= cx + w; x++) {
      const band = Math.floor((x - cx + y * 0.6 + f * 3) / 3) % 2;
      c.px(x, y, band ? 14205072 : 12098152, 210);
    }
  }
  for (let k = 0; k < 6; k++) c.px(6 + k * 5, 4 + (k * 7 + f * 5) % 40, 9071168);
  return c;
}
function flipX(src) {
  const c = new PixelCanvas(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const i = (y * src.w + x) * 4, j = (y * src.w + (src.w - 1 - x)) * 4;
    for (let k = 0; k < 4; k++) c.data[j + k] = src.data[i + k];
  }
  return c;
}
function drawBoar(f) {
  const c = new PixelCanvas(32, 32);
  const B = 9067066, BD = 5912608, BL = 11565648;
  c.ellipse(17, 19, 11, 7.5, B);
  c.ellipse(17, 16, 9, 3, BL);
  for (let x = 9; x < 25; x += 3) c.px(x, 11 - x % 2, BD);
  c.ellipse(7, 20, 5.5, 4.5, B);
  c.ellipse(4, 21, 2.5, 2, 14195328);
  c.px(3, 21, OUT);
  c.px(5, 21, OUT);
  c.poly([[5, 23], [3, 26], [6, 24]], 16051416);
  c.rect(7, 18, 2, 2, OUT);
  c.px(7, 18, 16732224);
  c.poly([[9, 14], [11, 11], [12, 15]], BD);
  const l = f ? 1 : 0;
  for (const [x, o] of [[10, l], [14, -l], [20, l], [24, -l]]) c.rect(x, 25 + o, 3, 4 - o, BD);
  c.outline(OUT);
  return c;
}
function drawFox(f) {
  const c = new PixelCanvas(32, 32);
  const O = 8016080, OD = 4860560, W = 15788287;
  c.ellipse(16, 21, 8, 6, O);
  c.poly([[23, 20], [31, 12 + f * 2], [29, 22]], O);
  c.px(30, 13 + f * 2, W);
  c.px(29, 14 + f * 2, W);
  c.ellipse(11, 14, 6, 5, O);
  c.poly([[6, 11], [6, 4], [10, 9]], OD);
  c.poly([[12, 9], [15, 3], [16, 10]], OD);
  c.ellipse(9, 16, 3.5, 2.5, W);
  c.rect(8, 12, 2, 2, 16769088);
  c.rect(13, 12, 2, 2, 16769088);
  c.px(6, 16, OUT);
  c.rect(11 + f, 26, 2, 4, OD);
  c.rect(19 - f, 26, 2, 4, OD);
  c.outline(OUT);
  return c;
}
function drawJelly(f) {
  const c = new PixelCanvas(32, 32);
  const J = 14708928, JD = 10502288, JL = 16761064;
  const w = f ? 11.5 : 10, h = f ? 7 : 8.5;
  c.ellipse(16, 26 - h, w, h, JD, 230);
  c.ellipse(16, 25 - h, w - 1, h - 1, J, 220);
  c.ellipse(12, 21 - h, 3, 2, JL);
  c.rect(12, 23 - Math.round(h / 2), 2, 3, OUT);
  c.rect(18, 23 - Math.round(h / 2), 2, 3, OUT);
  c.outline(OUT);
  return c;
}
function drawWorm(f) {
  const c = new PixelCanvas(48, 52);
  const S = 13144154, SD = 9067056, SL = 15251584;
  for (let i = 0; i < 4; i++) {
    const y = 44 - i * 9, x = 24 + Math.sin(i * 0.9 + f * 0.8) * 3;
    c.ellipse(x, y, 13 - i, 6, SD);
    c.ellipse(x, y - 1, 12 - i, 5, S);
    c.line(x - 9 + i, y - 3, x + 9 - i, y - 3, SL);
  }
  const hx = 24 + Math.sin(4 * 0.9 + f * 0.8) * 3;
  c.ellipse(hx, 11, 12, 10, S);
  c.ellipse(hx, 13, 8, 6, 5904928);
  c.ellipse(hx, 14, 5, 3.5, 2755088);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    c.poly([[hx + Math.cos(a) * 8, 13 + Math.sin(a) * 6], [hx + Math.cos(a + 0.2) * 4, 13 + Math.sin(a + 0.2) * 3], [hx + Math.cos(a - 0.2) * 4, 13 + Math.sin(a - 0.2) * 3]], 16051416);
  }
  c.rect(hx - 10, 4, 3, 3, 16736304);
  c.rect(hx + 7, 4, 3, 3, 16736304);
  c.ellipse(24, 49, 22, 3.5, 14201962);
  c.outline(OUT);
  return c;
}
function epicIcon(fn) {
  const c = new PixelCanvas(20, 20);
  fn(c);
  c.outline(16760880);
  c.outline(OUT);
  c.px(1, 2, 16777215);
  c.px(17, 1, 16773280);
  c.px(18, 17, 16777215);
  return c;
}
function drawAltar(f) {
  const c = new PixelCanvas(24, 30);
  c.rect(3, 24, 18, 5, 6971520);
  c.rect(5, 16, 14, 8, 9076896);
  c.rect(5, 16, 14, 1, 11577544);
  c.rect(3, 24, 18, 1, 10129584);
  c.rect(8, 18, 8, 4, 16106818);
  c.rect(11, 18, 2, 4, 16773280);
  const y = f ? 7 : 8;
  c.circle(12, y, 6.5, 16760880, 90);
  c.circle(12, y, 4.5, 16769120);
  c.circle(12, y, 2.5, 16777215);
  c.px(4, 6 - f, 16773280);
  c.px(20, 9 + f, 16773280);
  c.outline(OUT);
  return c;
}
function drawShrine() {
  const c = new PixelCanvas(20, 30);
  c.poly([[3, 29], [3, 6], [10, 1], [17, 6], [17, 29]], 8025224);
  c.poly([[10, 1], [17, 6], [17, 29], [10, 29]], 6446192);
  c.rect(1, 26, 18, 4, 4867160);
  c.poly([[10, 8], [15, 15], [10, 22], [5, 15]], 16728128);
  c.poly([[10, 11], [12.5, 15], [10, 19], [7.5, 15]], 6446192);
  c.circle(10, 15, 1.5, 16752768);
  c.px(6, 24, 16728128);
  c.px(10, 25, 16728128);
  c.px(14, 24, 16728128);
  c.outline(OUT);
  return c;
}
function drawHammer() {
  const c = new PixelCanvas(16, 16);
  c.line(3, 14, 8, 8, 9067056, 255, 2);
  c.poly([[5, 3], [12, 0], [15, 6], [8, 9]], 12109016);
  c.poly([[9, 1], [12, 0], [15, 6], [12, 8]], 8425648);
  c.line(10, 2, 13, 6, 16777215);
  c.outline(3170464);
  return c;
}
function drawStarShot() {
  const c = new PixelCanvas(9, 9);
  c.poly([[4.5, 0], [5.7, 3.3], [9, 3.5], [6.4, 5.6], [7.3, 9], [4.5, 7], [1.7, 9], [2.6, 5.6], [0, 3.5], [3.3, 3.3]], 16769120);
  c.circle(4.5, 4.8, 1.5, 16777215);
  return c;
}
function drawHolySword() {
  const c = new PixelCanvas(48, 12);
  c.poly([[10, 3], [42, 4], [47, 6], [42, 8], [10, 9]], 15266047);
  c.rect(10, 5, 32, 2, 16777215);
  c.rect(6, 0, 4, 12, 16106818);
  c.rect(0, 4, 6, 4, 6965936);
  c.outline(16765024, 160);
  return c;
}
function drawSawBlade() {
  const c = new PixelCanvas(20, 20);
  c.circle(10, 10, 7.5, 11055296);
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2;
    c.poly([[10 + Math.cos(a) * 7, 10 + Math.sin(a) * 7], [10 + Math.cos(a + 0.25) * 10, 10 + Math.sin(a + 0.25) * 10], [10 + Math.cos(a + 0.5) * 7, 10 + Math.sin(a + 0.5) * 7]], 14739184);
  }
  c.ring(10, 10, 5, 1, 8028820);
  c.circle(10, 10, 2.5, 13643824);
  c.outline(OUT);
  return c;
}
function drawWave() {
  const c = new PixelCanvas(24, 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 24; x++) {
    const d1 = Math.hypot(x - 0, (y - 24) * 0.6), d2 = Math.hypot(x + 6, (y - 24) * 0.6);
    if (d1 < 22 && d2 > 22) c.px(x, y, 13168895, Math.round(120 + 120 * (x / 24)));
    else if (d1 < 19 && d2 > 19) c.px(x, y, 8442111, 140);
  }
  return c;
}
function drawVortex() {
  const c = new PixelCanvas(64, 64);
  c.circle(32, 32, 31.5, 6303904, 70);
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 60; i++) {
      const t = i / 60, a = t * Math.PI * 3 + k / 3 * Math.PI * 2, r = 30 * (1 - t) + 4;
      c.rect(32 + Math.cos(a) * r - 1, 32 + Math.sin(a) * r - 1, 3, 3, k === 1 ? 13672703 : 10117344, 220);
    }
  }
  c.circle(32, 32, 9, 1048600);
  c.ring(32, 32, 10, 2, 14729471);
  return c;
}
function drawMoon() {
  const c = new PixelCanvas(80, 80);
  c.circle(40, 40, 39.5, 16769162, 22);
  c.circle(40, 40, 35, 16770202, 36);
  c.circle(40, 40, 30, 16771242, 56);
  c.circle(40, 40, 25, 14727248);
  c.circle(38.5, 38.5, 23.5, 16177002);
  c.circle(36, 35, 16, 16507786);
  c.circle(33, 31, 7, 16774080);
  for (const [x, y, r] of [[45, 47, 4.5], [31, 47, 3], [47, 32, 3], [38, 54, 2.2], [52, 41, 2]]) {
    c.circle(x, y, r, 14200392);
    c.circle(x - 0.8, y - 0.8, r * 0.6, 15385692);
  }
  return c;
}
function drawStar() {
  const c = new PixelCanvas(5, 5);
  c.rect(2, 0, 1, 5, 12572927, 170);
  c.rect(0, 2, 5, 1, 12572927, 170);
  c.px(2, 2, 16777215);
  return c;
}
function drawEmber() {
  const c = new PixelCanvas(5, 5);
  c.circle(2.5, 2.5, 2.5, 16751152, 110);
  c.px(2, 2, 16769152);
  return c;
}
function drawCloud() {
  const c = new PixelCanvas(56, 14);
  for (const [x, y, rx, ry] of [[12, 9, 11, 4], [26, 7, 13, 5], [40, 8, 12, 4.5], [48, 10, 8, 3]]) c.ellipse(x, y, rx, ry, 3806248, 210);
  for (const [x, y, rx] of [[24, 4, 9], [38, 5, 8]]) c.ellipse(x, y, rx, 1.6, 9054784, 200);
  return c;
}
function drawHills() {
  const W = 128, H = 44;
  const c = new PixelCanvas(W, H);
  const ridge = (x) => 24 + Math.sin(x / W * Math.PI * 2) * 5 + Math.sin(x / W * Math.PI * 6 + 1) * 2.5;
  for (let x = 0; x < W; x++) {
    const top = Math.round(ridge(x));
    c.rect(x, top, 1, H - top, 1707042);
  }
  for (const gx of [18, 54, 97]) {
    const t = Math.round(ridge(gx));
    c.ellipse(gx + 2, t - 2, 5, 3.5, 1707042);
    c.ellipse(gx + 6, t - 1, 3.5, 2.5, 1707042);
  }
  for (const tx of [36, 76, 115]) {
    const t = Math.round(ridge(tx));
    c.rect(tx, t - 8, 2, 9, 1707042);
    c.circle(tx + 1, t - 13, tx === 76 ? 6 : 5, 1707042);
    c.circle(tx - 2, t - 10, 3.5, 1707042);
    c.circle(tx + 4, t - 10, 3.5, 1707042);
  }
  return c;
}
function white() {
  const c = new PixelCanvas(4, 4);
  c.rect(0, 0, 4, 4, 16777215);
  return c;
}
function drawShadow() {
  const c = new PixelCanvas(16, 6);
  c.ellipse(8, 3, 8, 3, 0, 80);
  return c;
}
function drawJoyBase() {
  const c = new PixelCanvas(48, 48);
  c.circle(24, 24, 23.5, 16777215, 40);
  c.ring(24, 24, 23.5, 2, 16777215, 120);
  return c;
}
function drawJoyKnob() {
  const c = new PixelCanvas(20, 20);
  c.circle(10, 10, 9.5, 16777215, 150);
  c.ring(10, 10, 9.5, 2, 16777215, 220);
  return c;
}
function allSprites() {
  const s = {};
  for (const k of HERO_KINDS) {
    const base = decodeHero(HERO_ART[k]);
    s["hero_" + k + "_0"] = heroFrame(base, 1, 1);
    s["hero_" + k + "_1"] = heroFrame(base, 1.06, 0.94);
    s["hero_" + k + "_2"] = heroFrame(base, 0.97, 1.04);
  }
  for (let f = 0; f < 3; f++) s["hero_fu_" + f] = fuFrog(s["hero_hunter_" + f]);
  for (let f = 0; f < 3; f++) s["hero_druid_" + f] = druidFrog(s["hero_hunter_" + f]);
  for (let f = 0; f < 3; f++) s["hero_prism_" + f] = prismFrog(s["hero_hunter_" + f]);
  for (let f = 0; f < 3; f++) s["hero_santa_" + f] = santaFrog(s["hero_hunter_" + f]);
  for (let f = 0; f < 2; f++) {
    s["bat_" + f] = drawBat(f);
    s["slime_" + f] = drawSlime(f);
    s["zombie_" + f] = drawZombie(f);
    s["skeleton_" + f] = drawSkeleton(f);
    s["ghost_" + f] = drawGhost(f);
    s["reaper_" + f] = drawReaper(f);
    s["rat_" + f] = drawRat(f);
    s["imp_" + f] = drawImp(f);
    s["mummy_" + f] = drawMummy(f);
    s["shroom_" + f] = drawShroom(f);
    s["slimeking_" + f] = drawSlimeKing(f);
    s["bonelord_" + f] = drawBoneLord(f);
    s["vampire_" + f] = drawVampire(f);
    s["lich_" + f] = drawLich(f);
    s["eye_" + f] = drawEye(f);
    s["toad_" + f] = drawToad(f);
    s["yeti_" + f] = drawYeti(f);
  }
  for (const k of ["bone", "blood", "ice", "darkorb", "slimeball", "scythe", "sand"]) s["shot_" + k] = drawEnemyShot(k);
  for (let f = 0; f < 2; f++) {
    s["boar_" + f] = flipX(drawBoar(f));
    s["fox_" + f] = flipX(drawFox(f));
    s["jelly_" + f] = drawJelly(f);
    s["worm_" + f] = drawWorm(f);
    s["tornado_" + f] = drawTornado(f);
    for (const k of ["boar", "fox", "jelly", "worm"]) s[k + "_" + f + "_w"] = silhouette(s[k + "_" + f]);
  }
  s.ground_sand = drawGroundSand();
  s.cactus = drawCactus();
  s.sandrock = drawSandRock();
  s.horns = drawSkullRock();
  s.warn = drawWarn();
  for (const k of ["bat", "slime", "zombie", "skeleton", "ghost", "reaper", "rat", "imp", "mummy", "shroom", "slimeking", "bonelord", "vampire", "lich", "eye", "toad", "yeti"]) {
    for (let f = 0; f < 2; f++) s[k + "_" + f + "_w"] = silhouette(s[k + "_" + f]);
  }
  s.bolt = drawBolt();
  s.knife = drawKnife();
  s.axe = drawAxe();
  s.bible = drawBible();
  s.lightning = drawLightning();
  s.spark = drawSpark();
  s.whip = drawWhip();
  s.aura = drawAura();
  s.gem_blue = drawGem(4164863, 11064575, 2052016);
  s.gem_green = drawGem(4182112, 11071664, 2066992);
  s.gem_red = drawGem(16728144, 16754864, 10491944);
  s.chicken = drawChicken();
  s.magnet = drawMagnet();
  s.chest = drawChest();
  s.ground = drawGround();
  s.ground_snow = drawGroundSnow();
  s.ground_lava = drawGroundLava();
  s.pine = drawPine();
  s.icerock = drawIceRock();
  s.snowman = drawSnowman();
  s.lavarock = drawLavaRock();
  s.obsidian = drawObsidian();
  s.lavapool = drawLavaPool();
  s.skullpile = drawSkullPile();
  s.icicle = drawIcicle();
  s.ground_fest = drawGroundFest();
  s.ground_swamp = drawGroundSwamp();
  s.ground_xmas = drawGroundXmas();
  s.xmastree = drawXmasTree();
  s.gift = drawGift();
  s.candycane = drawCandyCane();
  s.deadtree = drawDeadTree();
  s.reeds = drawReeds();
  s.mushroom = drawMushroom();
  s.bogpool = drawBogPool();
  s.bubble = drawBubble();
  s.lantern = drawLantern();
  s.firecracker = drawFirecracker();
  s.redgate = drawRedGate();
  s.plum = drawPlum();
  s.firework = drawFirework();
  for (let f = 0; f < 2; f++) {
    s["nian_" + f] = drawNian(f);
    s["nian_" + f + "_w"] = silhouette(s["nian_" + f]);
  }
  s.meteor = drawMeteor();
  s.tomb = drawTomb();
  s.tree = drawTree();
  s.bush = drawBush();
  s.rock = drawRock();
  s.flowers = drawFlowers();
  s.bones = drawBones();
  s.white = white();
  s.shadow = drawShadow();
  s.joy_base = drawJoyBase();
  s.joy_knob = drawJoyKnob();
  for (const k in ICONS) s[k] = ICONS[k]();
  for (const k in UI_ICONS) s[k] = UI_ICONS[k]();
  for (const w of ["whip", "wand", "knife", "axe", "bible", "garlic", "lightning"]) s["icon_" + w + "_evo"] = evoIcon(s["icon_" + w]);
  for (const w of ["fire", "holy", "cross", "frost", "familiar", "chain", "bomb", "laser", "spikes", "saw", "sonic"]) s["icon_" + w + "_evo"] = evoIcon(s["icon_" + w]);
  s.sawblade = drawSawBlade();
  s.wave = drawWave();
  s.fireball = drawFireball();
  s.flame_0 = drawFlame(0);
  s.flame_1 = drawFlame(1);
  s.flask = drawFlask();
  s.puddle = drawPuddle();
  s.crossp = drawCrossProj();
  s.spike = drawSpike();
  s.spike_warn = drawSpikeWarn();
  s.familiar_0 = drawFamiliar(0);
  s.familiar_1 = drawFamiliar(1);
  s.fshot = drawFShot();
  s.bomb_0 = drawBomb(0);
  s.bomb_1 = drawBomb(1);
  s.brazier_0 = drawBrazier(0);
  s.brazier_1 = drawBrazier(1);
  s.brazier_0_w = silhouette(s.brazier_0);
  s.brazier_1_w = silhouette(s.brazier_1);
  s.watch = drawWatch();
  s.nuke = drawNuke();
  s.potion = drawPotion();
  s.shield = drawShieldPickup();
  s.haste = drawHaste();
  s.clover = drawClover();
  s.firering = drawFireRing();
  s.scroll = drawScroll();
  s.moon = drawMoon();
  s.star = drawStar();
  s.ember = drawEmber();
  s.cloud = drawCloud();
  s.hills = drawHills();
  s.coin = drawCoin();
  s.coinbag = drawCoinBag();
  for (const k in EPIC_ART) s["epic_" + k] = EPIC_ART[k]();
  for (const k in PICKUP_ART) s[k] = PICKUP_ART[k]();
  s.epic = s.epic_thor;
  for (let f = 0; f < 2; f++) {
    s["altar_" + f] = drawAltar(f);
    s["altar_" + f + "_w"] = silhouette(s["altar_" + f]);
  }
  s.shrine = drawShrine();
  s.hammer = drawHammer();
  s.starshot = drawStarShot();
  s.holysword = drawHolySword();
  s.vortex = drawVortex();
  return s;
}
function buildAtlas(size = 1024) {
  const sprites = allSprites();
  const names = Object.keys(sprites).sort((a, b) => sprites[b].h - sprites[a].h);
  const data = new Uint8Array(size * size * 4);
  const rects = {};
  const PAD = 2;
  let x = PAD, y = PAD, rowH = 0;
  for (const n of names) {
    const c = sprites[n];
    if (x + c.w + PAD > size) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    if (y + c.h + PAD > size) throw new Error("atlas overflow");
    for (let j = 0; j < c.h; j++) {
      const src = j * c.w * 4;
      data.set(c.data.subarray(src, src + c.w * 4), ((y + j) * size + x) * 4);
    }
    rects[n] = { x, y, w: c.w, h: c.h };
    x += c.w + PAD;
    rowH = Math.max(rowH, c.h);
  }
  return { size, data, rects };
}
var PixelCanvas, OUT, HERO_KINDS, ICONS, UI_ICONS, EPIC_ART, PICKUP_ART;
var init_PixelArt = __esm({
  "../../assets/scripts/PixelArt.ts"() {
    init_HeroArt();
    PixelCanvas = class {
      constructor(w, h) {
        this.w = w;
        this.h = h;
        this.data = new Uint8Array(w * h * 4);
      }
      px(x, y, c, a = 255) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = (y * this.w + x) * 4;
        this.data[i] = c >> 16 & 255;
        this.data[i + 1] = c >> 8 & 255;
        this.data[i + 2] = c & 255;
        this.data[i + 3] = a;
      }
      alpha(x, y) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
        return this.data[(y * this.w + x) * 4 + 3];
      }
      clear(x, y) {
        this.px(x, y, 0, 0);
      }
      rect(x, y, w, h, c, a = 255) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a);
      }
      ellipse(cx, cy, rx, ry, c, a = 255) {
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
          for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
            const dx = (x + 0.5 - cx) / rx;
            const dy = (y + 0.5 - cy) / ry;
            if (dx * dx + dy * dy <= 1) this.px(x, y, c, a);
          }
        }
      }
      circle(cx, cy, r, c, a = 255) {
        this.ellipse(cx, cy, r, r, c, a);
      }
      ring(cx, cy, r, t, c, a = 255) {
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
          for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
            const d2 = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
            if (d2 <= r && d2 > r - t) this.px(x, y, c, a);
          }
        }
      }
      line(x0, y0, x1, y1, c, a = 255, thick = 1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) {
          const x = Math.round(x0 + (x1 - x0) * i / n);
          const y = Math.round(y0 + (y1 - y0) * i / n);
          if (thick === 1) this.px(x, y, c, a);
          else this.rect(x - (thick >> 1), y - (thick >> 1), thick, thick, c, a);
        }
      }
      // 扫描线填充多边形
      poly(pts, c, a = 255) {
        let minY = Infinity, maxY = -Infinity;
        for (const p of pts) {
          minY = Math.min(minY, p[1]);
          maxY = Math.max(maxY, p[1]);
        }
        for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
          const yc = y + 0.5;
          const xs = [];
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length];
            if (p[1] <= yc && q[1] > yc || q[1] <= yc && p[1] > yc) {
              xs.push(p[0] + (yc - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
            }
          }
          xs.sort((m, n) => m - n);
          for (let k = 0; k + 1 < xs.length; k += 2) {
            for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c, a);
          }
        }
      }
      // 在不透明像素周围描边
      outline(c, a = 255) {
        const mark = [];
        for (let y = 0; y < this.h; y++) {
          for (let x = 0; x < this.w; x++) {
            if (this.alpha(x, y) > 0) continue;
            if (this.alpha(x - 1, y) > 100 || this.alpha(x + 1, y) > 100 || this.alpha(x, y - 1) > 100 || this.alpha(x, y + 1) > 100) mark.push(x, y);
          }
        }
        for (let i = 0; i < mark.length; i += 2) this.px(mark[i], mark[i + 1], c, a);
      }
    };
    OUT = 1708064;
    HERO_KINDS = ["hunter", "mage", "rogue", "knight", "nun", "pyro", "bomber", "sage"];
    ICONS = {
      icon_whip: () => icon((c) => {
        c.ring(9, 7, 5, 2, 9067056);
        c.line(3, 14, 6, 10, 4860436, 255, 2);
        c.px(13, 3, 13148272);
      }),
      icon_wand: () => icon((c) => {
        c.line(3, 13, 10, 6, 9067056, 255, 2);
        c.circle(11.5, 4.5, 3, 4172287);
        c.px(11, 3, 16777215);
      }),
      icon_knife: () => icon((c) => {
        c.line(2, 13, 5, 10, 7027231, 255, 2);
        c.line(4, 9, 7, 12, 16106818);
        c.line(7, 9, 13, 3, 14212584, 255, 2);
        c.px(14, 2, 16777215);
      }),
      icon_axe: () => icon((c) => {
        c.line(3, 14, 11, 5, 9067056, 255, 2);
        c.poly([[8, 1], [15, 3], [15, 10], [11, 8], [8, 5]], 12107980);
        c.line(14, 3, 14, 9, 16777215);
      }),
      icon_bible: () => icon((c) => {
        c.rect(2, 1, 12, 14, 5913248);
        c.rect(2, 1, 2, 14, 3810416);
        c.rect(12, 2, 2, 12, 16051416);
        c.poly([[8, 4], [9, 7], [12, 7], [9.5, 9], [10.5, 12], [8, 10], [5.5, 12], [6.5, 9], [4, 7], [7, 7]], 16106818);
      }),
      icon_garlic: () => icon((c) => {
        c.ellipse(8, 10, 6, 5, 16051416);
        c.ellipse(8, 10, 2, 5, 14208176);
        c.poly([[6, 6], [8, 1], [10, 6]], 15260864);
        c.px(8, 1, 9089120);
      }),
      icon_lightning: () => icon((c) => {
        c.ring(8, 8, 7, 2, 16106818);
        c.poly([[9, 2], [5, 9], [8, 9], [6, 14], [11, 7], [8, 7]], 16773248);
      }),
      icon_might: () => icon((c) => {
        c.poly([[3, 13], [6, 4], [12, 2], [13, 8], [8, 14]], 3840576);
        c.line(4, 12, 11, 4, 7000176);
      }),
      icon_armor: () => icon((c) => {
        c.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], 10134192);
        c.poly([[8, 2], [14, 2], [14, 8], [8, 15]], 8028816);
        c.rect(7, 4, 2, 8, 16106818);
      }),
      icon_heart: () => icon((c) => {
        c.circle(5, 6, 3.5, 13641784);
        c.circle(11, 6, 3.5, 13641784);
        c.poly([[1.5, 7], [14.5, 7], [8, 14.5]], 13641784);
        c.px(4, 4, 16744576);
      }),
      icon_regen: () => icon((c) => {
        c.circle(8, 9, 6, 14694440);
        c.circle(6, 7, 2, 16743008);
        c.poly([[5, 2], [8, 4], [11, 2], [9, 5], [7, 5]], 3840576);
      }),
      icon_cooldown: () => icon((c) => {
        c.rect(2, 2, 12, 12, 2771610);
        c.rect(2, 2, 2, 12, 1714794);
        c.rect(12, 3, 2, 10, 16051416);
        c.rect(6, 6, 4, 4, 10539263);
      }),
      icon_area: () => icon((c) => {
        c.rect(7, 6, 2, 9, 16106818);
        c.rect(3, 8, 10, 2, 16106818);
        c.rect(3, 4, 2, 4, 16051416);
        c.rect(11, 4, 2, 4, 16051416);
        c.rect(7, 2, 2, 4, 16051416);
        c.px(3, 2, 16748592);
        c.px(11, 2, 16748592);
        c.px(7, 0, 16748592);
      }),
      icon_speed: () => icon((c) => {
        c.rect(2, 5, 12, 6, 9067056);
        c.rect(2, 7, 12, 2, 16106818);
        c.rect(2, 5, 1, 6, 5913120);
      }),
      icon_move: () => icon((c) => {
        c.poly([[2, 4], [14, 7], [10, 10], [4, 13]], 15790328);
        c.line(4, 6, 12, 8, 12634336);
        c.line(4, 9, 10, 9, 12634336);
      }),
      icon_magnet: () => icon((c) => {
        c.circle(8, 8, 6, 6961840);
        c.circle(8, 8, 3, 10514672);
        c.px(6, 5, 16777215);
      }),
      icon_amount: () => icon((c) => {
        c.ring(6, 8, 4.5, 2, 16106818);
        c.ring(10, 8, 4.5, 2, 13672496);
      }),
      icon_duration: () => icon((c) => {
        c.rect(4, 1, 8, 2, 9067056);
        c.rect(4, 13, 8, 2, 9067056);
        c.poly([[5, 3], [11, 3], [8, 8]], 15259808);
        c.poly([[8, 8], [11, 13], [5, 13]], 15259808);
        c.rect(6, 10, 4, 3, 13672512);
      }),
      icon_growth: () => icon((c) => {
        c.poly([[8, 1], [13, 7], [8, 15], [3, 7]], 4182144);
        c.poly([[8, 1], [8, 7], [3, 7]], 10551232);
      }),
      icon_fire: () => icon((c) => {
        c.line(2, 14, 9, 7, 9067056, 255, 2);
        c.circle(11, 5, 4, 16736288);
        c.circle(11, 5, 2.5, 16760896);
        c.px(10, 4, 16777215);
      }),
      icon_holy: () => icon((c) => {
        c.rect(6, 1, 4, 3, 9067056);
        c.ellipse(8, 10, 5.5, 5, 4227327);
        c.ellipse(8, 9, 3.5, 3, 9488639);
        c.px(8, 8, 16777215);
        c.px(7, 9, 16777215);
        c.px(9, 9, 16777215);
        c.px(8, 10, 16777215);
        c.px(10, 11, 16777215);
        c.px(6, 12, 16777215);
      }),
      icon_cross: () => icon((c) => {
        c.poly([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], 16106818);
        c.poly([[8, 2], [9, 7], [8, 8], [7, 7]], 16773280);
        c.circle(8, 8, 1.5, 16775376);
      }),
      icon_frost: () => icon((c) => {
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * Math.PI;
          c.line(8 - Math.cos(a) * 6, 8 - Math.sin(a) * 6, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 8446207, 255, 2);
        }
        c.circle(8, 8, 2, 16777215);
      }),
      icon_familiar: () => icon((c) => {
        c.circle(8, 8, 5.5, 6356880, 140);
        c.circle(8, 8, 3.5, 10551232);
        c.poly([[2, 4], [6, 7], [2, 10]], 13696992);
        c.poly([[14, 4], [10, 7], [14, 10]], 13696992);
        c.px(7, 7, OUT);
        c.px(9, 7, OUT);
      }),
      icon_chain: () => icon((c) => {
        c.poly([[10, 0], [4, 7], [8, 7], [3, 15], [13, 6], [9, 6], [12, 0]], 10146047);
        c.line(10, 1, 6, 6, 16777215);
      }),
      icon_laser: () => icon((c) => {
        c.poly([[2, 8], [6, 3], [10, 8], [6, 13]], 10547455);
        c.poly([[6, 3], [10, 8], [6, 8]], 16777215);
        c.rect(10, 7, 6, 2, 6351103);
        c.px(15, 7, 16777215);
      }),
      icon_spikes: () => icon((c) => {
        c.rect(1, 13, 14, 2, 6965808);
        c.poly([[2, 13], [4, 5], [6, 13]], 12101776);
        c.poly([[6, 13], [8, 1], [10, 13]], 14208184);
        c.poly([[10, 13], [12, 6], [14, 13]], 12101776);
      }),
      icon_bomb: () => icon((c) => {
        c.circle(7, 10, 5.5, 2763322);
        c.circle(5.5, 8.5, 1.5, 6974074);
        c.rect(9, 3, 2, 3, 9071168);
        c.px(11, 2, 16760896);
        c.px(12, 1, 16736288);
        c.px(12, 3, 16736288);
      }),
      icon_luck: () => icon((c) => {
        c.circle(5, 5, 3, 4243536);
        c.circle(11, 5, 3, 4243536);
        c.circle(5, 11, 3, 4243536);
        c.circle(11, 11, 3, 4243536);
        c.circle(8, 8, 2, 8446080);
        c.line(8, 10, 10, 15, 2787898);
      }),
      icon_critdmg: () => icon((c) => {
        c.poly([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], 16744496);
        c.circle(8, 8, 2.5, 16769152);
      }),
      icon_fang: () => icon((c) => {
        c.line(1, 2, 8, 5, 9067056);
        c.line(8, 5, 15, 2, 9067056);
        c.poly([[3, 3], [7, 4], [5, 14]], 16051416);
        c.poly([[9, 4], [13, 3], [11, 14]], 16051416);
        c.px(5, 12, 7000176);
        c.px(11, 12, 7000176);
      }),
      icon_thorns: () => icon((c) => {
        c.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], 6978128);
        for (const [x, y] of [[1, 1], [15, 1], [0, 8], [16, 8], [8, 16], [8, 0]]) c.line(8, 8, x, y, 3820072, 255, 1);
        c.rect(6, 5, 4, 4, 10530928);
      }),
      icon_heal: () => drawChicken(),
      icon_saw: () => icon((c) => {
        c.circle(8, 8, 7, 12107980);
        for (let k = 0; k < 8; k++) {
          const a = k / 8 * Math.PI * 2;
          c.poly([[8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6], [8 + Math.cos(a + 0.3) * 8.5, 8 + Math.sin(a + 0.3) * 8.5], [8 + Math.cos(a + 0.5) * 6, 8 + Math.sin(a + 0.5) * 6]], 14739184);
        }
        c.circle(8, 8, 2.5, 13643824);
        c.px(6, 5, 16777215);
      }),
      icon_sonic: () => icon((c) => {
        c.poly([[1, 6], [5, 6], [11, 1], [11, 15], [5, 10], [1, 10]], 16106818);
        c.rect(1, 6, 4, 4, 13146160);
        c.ring(9, 8, 6, 1, 8442111);
        c.ring(9, 8, 8.5, 1, 8442111);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 12; x++) if (c.alpha(x, y) && c.data[(y * 16 + x) * 4] === 128) c.clear(x, y);
      }),
      icon_core: () => icon((c) => {
        c.poly([[8, 0], [15, 4], [15, 12], [8, 16], [1, 12], [1, 4]], 3820160);
        c.poly([[8, 3], [12, 5.5], [12, 10.5], [8, 13], [4, 10.5], [4, 5.5]], 6349055);
        c.circle(8, 8, 2.2, 16777215);
      }),
      icon_sand: () => icon((c) => {
        c.rect(2, 0, 12, 2, 9067056);
        c.rect(2, 14, 12, 2, 9067056);
        c.poly([[3, 2], [13, 2], [9, 8], [13, 14], [3, 14], [7, 8]], 16774360);
        c.poly([[5, 3], [11, 3], [8, 7]], 15251552);
        c.poly([[8, 10], [11, 13], [5, 13]], 15251552);
        c.px(8, 8, 15251552);
        c.px(8, 9, 15251552);
      })
    };
    UI_ICONS = {
      icon_pause: () => icon((c) => {
        c.rect(3, 2, 4, 12, 16777215);
        c.rect(9, 2, 4, 12, 16777215);
      }),
      icon_gold: () => icon((c) => {
        c.circle(8, 8, 6.5, 14196768);
        c.circle(8, 8, 5, 16106818);
        c.rect(7, 4, 2, 8, 14196768);
        c.px(5, 4, 16773280);
      }),
      icon_reroll: () => icon((c) => {
        c.ring(8, 8, 6.5, 2, 4243711);
        for (let y = 6; y < 11; y++) for (let x = 0; x < 6; x++) c.clear(x, y);
        c.poly([[0, 6], [6, 6], [3, 10]], 4243711);
      }),
      icon_revive: () => icon((c) => {
        c.poly([[12, 1], [14, 4], [9, 11], [5, 13], [6, 9]], 16106818);
        c.poly([[12, 1], [9, 6], [6, 9], [7, 7]], 16773280);
        c.line(5, 13, 2, 15, 13144096);
      }),
      icon_lock: () => icon((c) => {
        c.ring(8, 6, 4.5, 2, 11581640);
        c.rect(3, 7, 10, 8, 13672496);
        c.rect(7, 9, 2, 3, 4861968);
      }),
      icon_music: () => icon((c) => {
        c.rect(6, 2, 2, 10, 16777215);
        c.rect(6, 2, 7, 2, 16777215);
        c.rect(11, 2, 2, 8, 16777215);
        c.ellipse(5, 12, 2.5, 2, 16777215);
        c.ellipse(10, 10, 2.5, 2, 16777215);
      }),
      icon_sound: () => icon((c) => {
        c.rect(2, 6, 3, 4, 16777215);
        c.poly([[5, 6], [9, 2], [9, 14], [5, 10]], 16777215);
        c.line(11, 5, 11, 10, 16777215);
        c.line(13, 3, 13, 12, 16777215);
      }),
      icon_vibrate: () => icon((c) => {
        c.rect(5, 2, 6, 12, 16777215);
        c.rect(6, 3, 4, 9, 4210762);
        c.line(2, 5, 2, 10, 16777215);
        c.line(13, 5, 13, 10, 16777215);
      })
    };
    EPIC_ART = {
      // 雷神之锤
      thor: () => epicIcon((c) => {
        c.line(4, 17, 10, 9, 9067056, 255, 2);
        c.poly([[7, 3], [15, 1], [18, 8], [10, 10]], 11056328);
        c.poly([[11, 2], [15, 1], [18, 8], [14, 9]], 7898272);
        c.line(13, 3, 15, 7, 16777215);
        c.poly([[3, 3], [6, 3], [4, 7], [6, 7], [2, 12], [3, 8], [1, 8]], 16773248);
      }),
      // 星光加特林
      gatling: () => epicIcon((c) => {
        c.rect(2, 8, 10, 6, 5921392);
        c.rect(10, 6, 7, 2, 12634328);
        c.rect(10, 9, 8, 2, 12634328);
        c.rect(10, 12, 7, 2, 12634328);
        c.rect(3, 13, 3, 4, 9067056);
        c.circle(17, 4, 2, 16769120);
        c.px(17, 4, 16777215);
        c.rect(3, 9, 6, 1, 9474224);
      }),
      // 圣剑
      excalibur: () => epicIcon((c) => {
        c.poly([[16, 1], [18, 2], [9, 12], [7, 10]], 15266047);
        c.line(16, 2, 9, 10, 16777215);
        c.rect(4, 10, 7, 2, 16106818);
        c.line(6, 8, 9, 13, 16106818, 255, 2);
        c.line(3, 16, 7, 12, 6965936, 255, 2);
        c.circle(2.5, 16.5, 1.5, 16106818);
      }),
      // 黑洞法球
      blackhole: () => epicIcon((c) => {
        c.circle(9, 9, 8, 9064672);
        c.ring(9, 9, 8, 2, 13672703);
        c.circle(9, 9, 5, 2756688);
        c.circle(9, 9, 2.5, 0);
        c.px(4, 6, 16777215);
        c.px(13, 13, 16777215);
        c.px(14, 5, 13672703);
      }),
      // 龙息（龙头）
      dragon: () => epicIcon((c) => {
        c.poly([[1, 6], [9, 3], [13, 6], [13, 12], [5, 13], [1, 10]], 13645864);
        c.poly([[3, 3], [6, 0], [7, 4]], 16106818);
        c.poly([[9, 3], [12, 0], [12, 5]], 16106818);
        c.rect(5, 6, 2, 2, 16773248);
        c.rect(1, 10, 9, 1, 16748640);
        c.poly([[13, 7], [19, 5], [17, 9], [19, 12], [13, 11]], 16756784);
        c.poly([[13, 8], [17, 8], [13, 10]], 16773248);
      }),
      // 流星权杖
      meteor: () => epicIcon((c) => {
        c.line(2, 17, 10, 9, 6965936, 255, 2);
        c.circle(12.5, 6.5, 4.5, 16742960);
        c.circle(12.5, 6.5, 2.5, 16765024);
        c.px(11, 5, 16777215);
        c.line(5, 3, 8, 4, 16756832);
        c.line(15, 13, 16, 16, 16756832);
        c.px(17, 2, 16773280);
      }),
      // 彩虹独角兽（马头 + 角）
      unicorn: () => epicIcon((c) => {
        c.poly([[4, 6], [11, 4], [15, 8], [16, 13], [12, 14], [10, 11], [6, 17], [3, 15]], 16315647);
        c.poly([[11, 4], [14, 0], [13, 5]], 16764992);
        c.px(12, 8, OUT);
        c.line(3, 7, 6, 13, 16736384, 255, 2);
        c.line(5, 6, 8, 11, 6340863, 255, 1);
        c.line(7, 5, 9, 9, 8446064);
      })
    };
    PICKUP_ART = {
      giant: () => icon((c) => {
        c.ellipse(8, 6, 7.5, 5, 14692400);
        c.circle(4, 5, 1.6, 16777215);
        c.circle(10, 3, 1.3, 16777215);
        c.circle(12, 7, 1.2, 16777215);
        c.rect(5, 10, 6, 5, 16051416);
        c.px(6, 12, OUT);
        c.px(9, 12, OUT);
      }),
      dice: () => icon((c) => {
        c.rect(2, 2, 12, 12, 16315647);
        c.rect(2, 12, 12, 2, 13156568);
        c.rect(12, 2, 2, 12, 13156568);
        for (const [x, y] of [[4, 4], [10, 4], [7, 7], [4, 10], [10, 10]]) c.rect(x, y, 2, 2, 13643824);
      }),
      decoy: () => icon((c) => {
        c.ellipse(8, 10, 6.5, 5, 8439968, 200);
        c.circle(5, 5, 2.5, 8439968, 200);
        c.circle(11, 5, 2.5, 8439968, 200);
        c.px(5, 5, OUT);
        c.px(11, 5, OUT);
        c.line(5, 11, 11, 11, 4227178);
        c.px(1, 2, 13693183);
        c.px(14, 1, 13693183);
        c.px(15, 9, 13693183);
      }),
      boots: () => icon((c) => {
        c.poly([[4, 1], [9, 1], [9, 10], [14, 11], [14, 14], [3, 14]], 6332640);
        c.rect(3, 13, 12, 2, 3824272);
        c.poly([[0, 3], [4, 4], [4, 8], [1, 6]], 16051416);
        c.line(5, 4, 8, 4, 10539263);
        c.px(15, 12, 16744496);
        c.px(0, 12, 16744496);
      }),
      bank: () => icon((c) => {
        c.poly([[1, 7], [15, 7], [13, 15], [3, 15]], 13121576);
        c.rect(1, 7, 14, 2, 16106818);
        c.circle(5, 5, 2.4, 16106818);
        c.circle(9, 4, 2.4, 16769120);
        c.circle(12, 6, 2, 16106818);
        c.rect(6, 10, 4, 3, 16106818);
      }),
      battery: () => icon((c) => {
        c.rect(3, 3, 10, 12, 3194976);
        c.rect(6, 1, 4, 2, 12634328);
        c.rect(3, 3, 10, 3, 8450208);
        c.poly([[9, 6], [5, 10], [8, 10], [7, 14], [11, 9], [8, 9]], 16773248);
      })
    };
  }
});

// ../../assets/scripts/Art.ts
var Art;
var init_Art = __esm({
  "../../assets/scripts/Art.ts"() {
    init_cc();
    init_PixelArt();
    Art = class {
      static {
        this.frames = /* @__PURE__ */ new Map();
      }
      static init() {
        if (this.frames.size) return;
        const atlas = buildAtlas();
        const img = new ImageAsset({
          _data: atlas.data,
          _compressed: false,
          width: atlas.size,
          height: atlas.size,
          format: Texture2D.PixelFormat.RGBA8888
        });
        const tex = new Texture2D();
        tex.image = img;
        tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
        tex.setMipFilter(Texture2D.Filter.NONE);
        tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
        tex.addRef();
        for (const name in atlas.rects) {
          const r = atlas.rects[name];
          const sf = new SpriteFrame();
          sf.reset({
            texture: tex,
            rect: new Rect(r.x, r.y, r.w, r.h),
            originalSize: new Size(r.w, r.h),
            offset: new Vec2(0, 0),
            isRotate: false
          });
          sf.addRef();
          this.frames.set(name, sf);
        }
      }
      static f(name) {
        const sf = this.frames.get(name);
        if (!sf) console.warn("[Art] missing sprite", name);
        return sf;
      }
    };
  }
});

// ../../assets/scripts/UiKit.ts
function mkNode(name, parent) {
  const n = new Node(name);
  n.layer = Layers.Enum.UI_2D;
  if (parent) parent.addChild(n);
  return n;
}
function mkSprite(parent, frame, scale = PX, name = frame) {
  const n = mkNode(name, parent);
  const s = n.addComponent(Sprite);
  s.sizeMode = Sprite.SizeMode.RAW;
  s.trim = false;
  s.spriteFrame = Art.f(frame);
  n.setScale(scale, scale, 1);
  return s;
}
function mkRect(parent, w, h, color, name = "rect", ax = 0.5, ay = 0.5) {
  const n = mkNode(name, parent);
  const s = n.addComponent(Sprite);
  s.sizeMode = Sprite.SizeMode.CUSTOM;
  s.trim = false;
  s.spriteFrame = Art.f("white");
  const ut = n.getComponent(UITransform);
  ut.setAnchorPoint(ax, ay);
  ut.setContentSize(w, h);
  s.color = color;
  return s;
}
function mkLabel(parent, text, size, color = Color.WHITE, align = "center", outline = 3, cache = false) {
  const n = mkNode("label", parent);
  const l = n.addComponent(Label);
  l.string = text;
  l.fontSize = size;
  l.lineHeight = size + 6;
  l.isBold = true;
  l.color = color;
  l.cacheMode = cache ? Label.CacheMode.CHAR : Label.CacheMode.NONE;
  if (outline > 0) {
    l.enableOutline = true;
    l.outlineColor = new Color(16, 10, 24, 255);
    l.outlineWidth = outline;
  }
  const ut = n.getComponent(UITransform);
  if (align === "left") {
    l.horizontalAlign = Label.HorizontalAlign.LEFT;
    ut.setAnchorPoint(0, 0.5);
  } else if (align === "right") {
    l.horizontalAlign = Label.HorizontalAlign.RIGHT;
    ut.setAnchorPoint(1, 0.5);
  } else {
    l.horizontalAlign = Label.HorizontalAlign.CENTER;
  }
  l.verticalAlign = Label.VerticalAlign.CENTER;
  return l;
}
function mkButton(parent, text, w, h, onClick, fill = new Color(120, 30, 40, 255), fontSize = 30) {
  const node = mkRect(parent, w, h, C_BORDER, "btn").node;
  const bg = mkRect(node, w - 8, h - 8, fill, "fill");
  const label = mkLabel(node, text, fontSize, Color.WHITE, "center", 3);
  const base = new Vec3(1, 1, 1);
  node.on(Node.EventType.TOUCH_START, () => node.setScale(0.94, 0.94, 1));
  node.on(Node.EventType.TOUCH_CANCEL, () => node.setScale(base));
  node.on(Node.EventType.TOUCH_END, () => {
    node.setScale(base);
    Sound.play("click");
    onClick();
  });
  return { node, bg, label };
}
function mkPanel(parent, w, h, fill = new Color(36, 30, 64, 245), border = C_BORDER) {
  const b = mkRect(parent, w, h, border, "panel");
  const f = mkRect(b.node, w - 6, h - 6, fill, "fill");
  return { node: b.node, fill: f, border: b };
}
function blockTouches(n) {
  n.on(Node.EventType.TOUCH_START, (e) => {
    e.propagationStopped = true;
  });
  n.on(Node.EventType.TOUCH_END, (e) => {
    e.propagationStopped = true;
  });
}
var C_BORDER;
var init_UiKit = __esm({
  "../../assets/scripts/UiKit.ts"() {
    init_cc();
    init_Art();
    init_Defs();
    init_Sound();
    C_BORDER = new Color(214, 170, 70, 255);
  }
});

// ../../assets/scripts/Backdrop.ts
var tmp, Backdrop;
var init_Backdrop = __esm({
  "../../assets/scripts/Backdrop.ts"() {
    init_cc();
    init_Art();
    init_UiKit();
    tmp = new Color();
    Backdrop = class {
      constructor(parent, vw, vh, horizonY, moonY) {
        this.vw = vw;
        this.vh = vh;
        this.horizonY = horizonY;
        this.t = 0;
        this.stars = [];
        this.clouds = [];
        this.bats = [];
        this.embers = [];
        this.node = mkNode("Backdrop", parent);
        const top = vh / 2, bottom = -vh / 2;
        const bands = 18;
        const skyH = top - horizonY;
        for (let i = 0; i < bands; i++) {
          const k = i / (bands - 1);
          const col = new Color(
            Math.round(10 + (74 - 10) * k * k),
            Math.round(6 + (16 - 6) * k),
            Math.round(26 + (44 - 26) * k),
            255
          );
          const h = skyH / bands + 1;
          mkRect(this.node, vw, h, col, "sky").node.setPosition(0, top - (i + 0.5) * (skyH / bands));
        }
        for (let i = 0; i < 46; i++) {
          const sp = mkSprite(this.node, "star", 1 + Math.random() * 1.2);
          sp.node.setPosition((Math.random() - 0.5) * vw, horizonY + 80 + Math.random() * (skyH - 80));
          this.stars.push({ node: sp.node, sp, ph: Math.random() * 6.28, spd: 1 + Math.random() * 2.5 });
        }
        this.moon = mkSprite(this.node, "moon", 4).node;
        this.moon.setPosition(0, moonY);
        for (let i = 0; i < 3; i++) {
          const c = mkSprite(this.node, "cloud", 3 + Math.random());
          c.node.setPosition((Math.random() - 0.5) * vw, moonY - 120 + i * 95 + Math.random() * 30);
          this.clouds.push({ node: c.node, spd: (8 + Math.random() * 10) * (i % 2 ? -1 : 1) });
        }
        for (let i = 0; i < 4; i++) {
          const sp = mkSprite(this.node, "bat_0", 1.4 + Math.random() * 0.6);
          sp.color = new Color(30, 12, 36, 255);
          const dir = Math.random() < 0.5 ? 1 : -1;
          this.bats.push({ node: sp.node, sp, x: -dir * (vw / 2 + 60), baseY: moonY - 200 + Math.random() * 360, spd: 70 + Math.random() * 60, dir, ph: Math.random() * 6, wait: i * 2.2 + Math.random() * 2 });
        }
        this.tiledHills(horizonY + 26, 3.4, new Color(70, 36, 74, 255));
        this.tiledHills(horizonY, 3, new Color(255, 255, 255, 255));
        mkRect(this.node, vw, horizonY - bottom + 2, new Color(26, 12, 34, 255), "ground", 0.5, 1).node.setPosition(0, horizonY + 1);
        mkRect(this.node, vw, 6, new Color(52, 22, 48, 255), "groundEdge", 0.5, 1).node.setPosition(0, horizonY + 1);
        for (let i = 0; i < 22; i++) {
          const sp = mkSprite(this.node, "ember", 1.5 + Math.random() * 1.5);
          const e = { node: sp.node, sp, x: 0, y: 0, vy: 0, life: 0, max: 1, ph: Math.random() * 6 };
          this.respawnEmber(e, true);
          this.embers.push(e);
        }
      }
      tiledHills(y, scale, tint) {
        const n = mkNode("hills", this.node);
        const sp = n.addComponent(Sprite);
        sp.spriteFrame = Art.f("hills");
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.type = Sprite.Type.TILED;
        sp.color = tint;
        const ut = n.getComponent(UITransform);
        ut.setAnchorPoint(0.5, 1);
        const fh = Art.f("hills").rect.height;
        ut.setContentSize(this.vw / scale + 128, fh);
        n.setScale(scale, scale, 1);
        n.setPosition(Math.random() * 60, y + fh * scale - 2);
      }
      respawnEmber(e, initial = false) {
        e.x = (Math.random() - 0.5) * this.vw;
        e.y = this.horizonY - 40 - Math.random() * 200 + (initial ? Math.random() * 500 : 0);
        e.vy = 14 + Math.random() * 26;
        e.max = e.life = 4 + Math.random() * 5;
      }
      update(dt) {
        this.t += dt;
        const t = this.t;
        for (const s of this.stars) {
          const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.spd + s.ph));
          s.sp.color = tmp.set(255, 255, 255, Math.round(255 * a));
        }
        const ms = 1 + Math.sin(t * 0.8) * 0.015;
        this.moon.setScale(4 * ms, 4 * ms, 1);
        for (const c of this.clouds) {
          const p = c.node.position;
          let x = p.x + c.spd * dt;
          if (x > this.vw / 2 + 120) x = -this.vw / 2 - 120;
          if (x < -this.vw / 2 - 120) x = this.vw / 2 + 120;
          c.node.setPosition(x, p.y);
        }
        for (const b of this.bats) {
          if (b.wait > 0) {
            b.wait -= dt;
            b.node.active = false;
            continue;
          }
          b.node.active = true;
          b.x += b.dir * b.spd * dt;
          const y = b.baseY + Math.sin(t * 2 + b.ph) * 26;
          b.node.setPosition(b.x, y);
          b.sp.spriteFrame = Art.f(Math.floor(t * 8 + b.ph) % 2 ? "bat_1" : "bat_0");
          if (Math.abs(b.x) > this.vw / 2 + 80) {
            b.dir = Math.random() < 0.5 ? 1 : -1;
            b.x = -b.dir * (this.vw / 2 + 60);
            b.baseY = this.moon.position.y - 200 + Math.random() * 360;
            b.wait = 2 + Math.random() * 5;
          }
        }
        for (const e of this.embers) {
          e.life -= dt;
          if (e.life <= 0) this.respawnEmber(e);
          e.y += e.vy * dt;
          const x = e.x + Math.sin(t * 1.3 + e.ph) * 14;
          e.node.setPosition(x, e.y);
          const k = e.life / e.max;
          e.sp.color = tmp.set(255, 255, 255, Math.round(255 * Math.min(1, k * 3, (1 - k) * 4)));
        }
      }
    };
  }
});

// ../../assets/scripts/Bosses.ts
function createBossAI(id, b, e) {
  switch (id) {
    case "slimeking":
      return new SlimeKing(b, e);
    case "bonelord":
      return new BoneLord(b, e);
    case "vampire":
      return new Vampire(b, e);
    case "lich":
      return new Lich(b, e);
    case "eye":
      return new Eye(b, e);
    case "reaper":
      return new Reaper(b, e);
    case "nian":
      return new Nian(b, e);
    case "toad":
      return new Toad(b, e);
    case "yeti":
      return new Yeti(b, e);
    case "worm":
      return new Worm(b, e);
  }
  return null;
}
var TAU, BossAI, SlimeKing, BoneLord, Vampire, Lich, Eye, Reaper, Nian, Toad, Yeti, Worm;
var init_Bosses = __esm({
  "../../assets/scripts/Bosses.ts"() {
    init_Sound();
    TAU = Math.PI * 2;
    BossAI = class {
      constructor(b, e) {
        this.b = b;
        this.e = e;
        this.speedMul = 1;
        this.dashVx = 0;
        this.dashVy = 0;
        this.dashT = 0;
        this.lift = 0;
        // 跳跃高度（身体上移，期间不造成接触伤害）
        this.alpha = 1;
        // 透明度（瞬移时淡出）
        this.cd = 2;
        this.step = 0;
        this.busy = 0;
        this.tasks = [];
      }
      get enraged() {
        return this.e.hp < this.e.maxHp * 0.35;
      }
      get touchable() {
        return this.lift < 10 && this.alpha > 0.5;
      }
      after(t, fn) {
        this.tasks.push({ t, fn });
      }
      hold(t) {
        this.busy = Math.max(this.busy, t);
      }
      aim(x = this.e.x, y = this.e.y) {
        return Math.atan2(this.b.py - y, this.b.px - x);
      }
      dash(a, speed, t) {
        this.dashVx = Math.cos(a) * speed;
        this.dashVy = Math.sin(a) * speed;
        this.dashT = t;
      }
      ring(frame, n, speed, dmg, offset = 0, o = {}) {
        for (let i = 0; i < n; i++) this.b.fireBullet(frame, this.e.x, this.e.y, offset + i / n * TAU, speed, dmg, o);
      }
      fan(frame, n, spread, speed, dmg, o = {}) {
        const a = this.aim();
        for (let i = 0; i < n; i++) this.b.fireBullet(frame, this.e.x, this.e.y, a + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), speed, dmg, o);
      }
      // 在玩家周围一圈召唤小怪
      summonRing(type, n, r) {
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU;
          this.b.summon(type, this.b.px + Math.cos(a) * r, this.b.py + Math.sin(a) * r);
        }
      }
      update(dt) {
        for (let i = this.tasks.length - 1; i >= 0; i--) {
          const k = this.tasks[i];
          k.t -= dt;
          if (k.t <= 0) {
            this.tasks.splice(i, 1);
            k.fn();
          }
        }
        if (this.dashT > 0) {
          this.dashT -= dt;
          if (this.dashT <= 0) this.dashVx = this.dashVy = 0;
        }
        this.onUpdate(dt);
        if (this.busy > 0) {
          this.busy -= dt;
          this.speedMul = 0;
          return;
        }
        this.speedMul = 1;
        this.cd -= dt;
        if (this.cd <= 0) {
          this.cast(this.step++);
          this.cd = this.cooldown() * (this.enraged ? 0.65 : 1);
        }
      }
      onUpdate(_dt) {
      }
      cooldown() {
        return 2.4;
      }
    };
    SlimeKing = class extends BossAI {
      constructor() {
        super(...arguments);
        this.split = false;
        this.jumpT = 0;
        this.jumpDur = 1;
      }
      cooldown() {
        return 2.2;
      }
      cast(step) {
        const b = this.b, e = this.e;
        if (step % 3 === 2) {
          for (let i = 0; i < 4; i++) b.summon("slime", e.x + Math.cos(i / 4 * TAU) * 90, e.y + Math.sin(i / 4 * TAU) * 90);
          b.burst(e.x, e.y, 5227087, 20, 300);
          Sound.play("slam");
          this.hold(0.6);
          return;
        }
        const tx = b.px, ty = b.py, dur = this.enraged ? 1 : 1.25;
        b.warnCircle(tx, ty, 120, dur, 6356832);
        this.dash(Math.atan2(ty - e.y, tx - e.x), Math.hypot(tx - e.x, ty - e.y) / dur, dur);
        this.jumpT = this.jumpDur = dur;
        this.hold(dur + 0.5);
        this.after(dur, () => {
          b.explode(e.x, e.y, 120, 10, 5227087);
          this.ring("shot_slimeball", 8, 150, 4, Math.random());
          Sound.play("slam");
        });
      }
      onUpdate(dt) {
        if (this.jumpT > 0) {
          this.jumpT -= dt;
          this.lift = Math.sin((1 - Math.max(0, this.jumpT) / this.jumpDur) * Math.PI) * 160;
        } else this.lift = 0;
        if (!this.split && this.e.hp < this.e.maxHp * 0.5) {
          this.split = true;
          this.ring("shot_slimeball", 12, 170, 4);
          for (let i = 0; i < 5; i++) this.b.summon("slime", this.e.x + Math.cos(i / 5 * TAU) * 70, this.e.y + Math.sin(i / 5 * TAU) * 70);
          this.b.banner("\u53F2\u83B1\u59C6\u738B \u5206\u88C2\u4E86!");
        }
      }
    };
    BoneLord = class extends BossAI {
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0:
          case 2: {
            const o = { orient: true };
            this.ring("shot_bone", 10, 190, 6, 0, o);
            this.after(0.45, () => this.ring("shot_bone", 10, 190, 6, Math.PI / 10, o));
            if (this.enraged) this.after(0.9, () => this.ring("shot_bone", 14, 220, 6, 0, o));
            Sound.play("eshot");
            this.hold(1);
            break;
          }
          case 1: {
            const a = this.aim();
            b.warnLine(e.x, e.y, a, 560, 70, 1);
            this.hold(1.8);
            this.after(1, () => {
              this.dash(a, 760, 0.7);
              Sound.play("dash");
            });
            break;
          }
          case 3:
            this.summonRing("skeleton", this.enraged ? 6 : 4, 280);
            b.burst(e.x, e.y, 15657172, 16, 260);
            this.hold(0.5);
            break;
        }
      }
      onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y - 40, 10129536, 1, 80);
      }
    };
    Vampire = class extends BossAI {
      constructor() {
        super(...arguments);
        this.fadeOut = 0;
        this.fadeIn = 0;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0:
          case 2: {
            const n = this.enraged ? 4 : 3;
            for (let k = 0; k < n; k++) this.after(k * 0.3, () => {
              this.fan("shot_blood", 4, 0.7, 210, 7);
              Sound.play("eshot");
            });
            this.hold(0.3 * n + 0.3);
            break;
          }
          case 1:
            this.fadeOut = 0.35;
            this.hold(1);
            this.after(0.35, () => {
              const a = Math.random() * TAU;
              e.x = b.px + Math.cos(a) * 220;
              e.y = b.py + Math.sin(a) * 220;
              this.fadeIn = 0.35;
              b.burst(e.x, e.y, 10491944, 18, 260);
              Sound.play("teleport");
            });
            this.after(0.7, () => {
              this.ring("shot_blood", 12, 190, 7);
              Sound.play("eshot");
            });
            break;
          case 3:
            this.summonRing("bat", 10, 380);
            b.banner("\u8759\u8760\u98CE\u66B4!");
            this.hold(0.5);
            break;
        }
      }
      onUpdate(dt) {
        if (this.fadeOut > 0) {
          this.fadeOut -= dt;
          this.alpha = Math.max(0, this.fadeOut / 0.35);
        } else if (this.fadeIn > 0) {
          this.fadeIn -= dt;
          this.alpha = 1 - Math.max(0, this.fadeIn) / 0.35;
        } else this.alpha = 1;
      }
    };
    Lich = class extends BossAI {
      cooldown() {
        return 2.6;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0: {
            const arms = this.enraged ? 4 : 3;
            this.hold(3.2);
            for (let k = 0; k < 30; k++) {
              this.after(k * 0.1, () => {
                const th = k * 0.28;
                for (let j = 0; j < arms; j++) b.fireBullet("shot_ice", e.x, e.y, th + j * TAU / arms, 160, 6, { orient: true });
                if (k % 3 === 0) Sound.play("eshot");
              });
            }
            break;
          }
          case 1:
          case 3: {
            const n = this.enraged ? 8 : 6;
            for (let i = 0; i < n; i++) {
              const r = i === 0 ? 0 : 60 + Math.random() * 160, a = Math.random() * TAU;
              const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
              b.warnCircle(x, y, 70, 1.1, 8446207, () => b.explode(x, y, 70, 10, 8446207));
            }
            this.hold(0.6);
            break;
          }
          case 2:
            b.zone(b.px, b.py, 150, 5, 4, 6340863);
            this.fan("shot_ice", 3, 0.5, 200, 6, { orient: true });
            b.banner("\u5BD2\u51B0\u9886\u57DF\uFF1A\u79FB\u52A8\u51CF\u901F!");
            this.hold(0.5);
            break;
        }
      }
    };
    Eye = class extends BossAI {
      cooldown() {
        return 2.5;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0:
          case 3: {
            const a = this.aim();
            b.warnLine(e.x, e.y, a, 1e3, 16, 1);
            Sound.play("laser");
            this.hold(2.9);
            this.after(1, () => {
              const dir = Math.random() < 0.5 ? -1 : 1;
              b.beam(e, a, 1e3, 44, 1.8, dir * (this.enraged ? 0.8 : 0.55), 10);
              b.addShake(1.8, 3);
            });
            break;
          }
          case 1: {
            const a = this.aim();
            for (let i = 0; i < 4; i++) b.fireBullet("shot_darkorb", e.x, e.y, a + (i - 1.5) * 0.7, 140, 8, { turn: 2, life: 4.5 });
            Sound.play("eshot");
            this.hold(0.5);
            break;
          }
          case 2:
            this.ring("shot_darkorb", 16, 180, 7);
            this.after(0.4, () => this.ring("shot_darkorb", 16, 180, 7, Math.PI / 16));
            Sound.play("eshot");
            this.hold(0.8);
            break;
        }
      }
    };
    Reaper = class extends BossAI {
      cooldown() {
        return 2.2;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0: {
            const n = this.enraged ? 5 : 3, a = this.aim();
            for (let i = 0; i < n; i++) {
              b.fireBullet("shot_scythe", e.x, e.y, a + (i - (n - 1) / 2) * 0.45, 360, 12, { spin: -900, returnAfter: 0.9, owner: e, pierce: true, radius: 22, life: 4 });
            }
            Sound.play("dash");
            this.hold(0.6);
            break;
          }
          case 1: {
            const n = this.enraged ? 4 : 3;
            this.hold(n * 0.9 + 0.3);
            for (let k = 0; k < n; k++) {
              this.after(k * 0.9, () => {
                const a = this.aim();
                b.warnLine(e.x, e.y, a, 440, 80, 0.55);
                this.after(0.55, () => {
                  this.dash(a, 950, 0.45);
                  Sound.play("dash");
                });
              });
            }
            break;
          }
          case 2:
            this.summonRing("ghost", 10, 320);
            b.banner("\u5E7B\u5F71\u53EC\u5524!");
            this.hold(0.6);
            break;
          case 3:
            this.ring("shot_darkorb", 20, 170, 8);
            this.after(0.5, () => this.ring("shot_darkorb", 20, 210, 8, Math.PI / 20));
            Sound.play("eshot");
            this.hold(0.9);
            break;
        }
      }
      onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y, 5915778, 2, 100);
      }
    };
    Nian = class extends BossAI {
      cooldown() {
        return 2.3;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0: {
            const n = this.enraged ? 4 : 3;
            for (let k = 0; k < n; k++) {
              this.after(k * 0.35, () => {
                this.ring("fireball", 12, 170 + k * 20, 7, k * 0.26);
                Sound.play("boom");
              });
            }
            b.banner("\u7206\u7AF9\u4E71\u5C04!");
            this.hold(0.35 * n + 0.4);
            break;
          }
          case 1: {
            const n = this.enraged ? 3 : 2;
            this.hold(n * 1 + 0.3);
            for (let k = 0; k < n; k++) {
              this.after(k * 1, () => {
                const a = this.aim();
                b.warnLine(e.x, e.y, a, 480, 80, 0.55);
                this.after(0.55, () => {
                  this.dash(a, 880, 0.5);
                  Sound.play("dash");
                });
              });
            }
            break;
          }
          case 2: {
            const n = this.enraged ? 8 : 6;
            for (let i = 0; i < n; i++) {
              const r = i === 0 ? 0 : 70 + Math.random() * 180, a = Math.random() * TAU;
              const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
              b.warnCircle(x, y, 65, 1.1, 16724016, () => b.explode(x, y, 65, 10, 16760896));
            }
            b.banner("\u70DF\u82B1\u9F50\u653E!");
            this.hold(0.6);
            break;
          }
          case 3:
            this.summonRing("imp", this.enraged ? 4 : 3, 300);
            this.ring("fireball", 16, 200, 7);
            Sound.play("roar");
            this.hold(0.8);
            break;
        }
      }
      onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y - 30, 16760896, 2, 120);
      }
    };
    Toad = class extends BossAI {
      constructor() {
        super(...arguments);
        this.jumpT = 0;
        this.jumpDur = 1;
      }
      cooldown() {
        return 2.3;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0: {
            const n = this.enraged ? 5 : 3;
            for (let i = 0; i < n; i++) {
              const r = i === 0 ? 0 : 80 + Math.random() * 120, a = Math.random() * TAU;
              const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
              b.warnCircle(x, y, 60, 1, 16724016, () => {
                b.explode(x, y, 50, 8, 8446016);
                b.zone(x, y, 60, 3.5, 3, 6340656);
              });
            }
            b.banner("\u6BD2\u6DB2\u55B7\u5410!");
            Sound.play("splash");
            this.hold(0.7);
            break;
          }
          case 1: {
            const a = this.aim();
            b.warnLine(e.x, e.y, a, 520, 56, 0.6);
            this.hold(1.1);
            this.after(0.6, () => {
              for (let k = 0; k < 7; k++) this.after(k * 0.03, () => b.fireBullet("shot_slimeball", e.x, e.y, a, 820, 12));
              if (this.enraged) for (const s of [-0.35, 0.35]) b.fireBullet("shot_slimeball", e.x, e.y, a + s, 600, 8);
              Sound.play("dash");
            });
            break;
          }
          case 2: {
            const tx = b.px, ty = b.py, dur = this.enraged ? 0.95 : 1.2;
            b.warnCircle(tx, ty, 125, dur, 16724016);
            this.dash(Math.atan2(ty - e.y, tx - e.x), Math.hypot(tx - e.x, ty - e.y) / dur, dur);
            this.jumpT = this.jumpDur = dur;
            this.hold(dur + 0.5);
            this.after(dur, () => {
              b.explode(e.x, e.y, 125, 12, 8446016);
              this.ring("shot_slimeball", this.enraged ? 14 : 10, 170, 6, Math.random());
              Sound.play("slam");
            });
            break;
          }
          case 3:
            this.summonRing("slime", this.enraged ? 8 : 6, 260);
            this.fan("shot_slimeball", 5, 0.9, 260, 6);
            Sound.play("croak");
            this.hold(0.6);
            break;
        }
      }
      onUpdate(dt) {
        if (this.jumpT > 0) {
          this.jumpT -= dt;
          this.lift = Math.sin((1 - Math.max(0, this.jumpT) / this.jumpDur) * Math.PI) * 170;
        } else this.lift = 0;
      }
    };
    Yeti = class extends BossAI {
      cooldown() {
        return 2.3;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0: {
            const n = this.enraged ? 5 : 3;
            for (let k = 0; k < n; k++) this.after(k * 0.28, () => {
              this.fan("shot_ice", 5, 0.8, 240 + k * 15, 7);
              Sound.play("freeze");
            });
            b.banner("\u96EA\u7403\u8FDE\u5C04!");
            this.hold(0.28 * n + 0.4);
            break;
          }
          case 1: {
            const n = this.enraged ? 7 : 5;
            for (let i = 0; i < n; i++) {
              const r = i === 0 ? 0 : 70 + Math.random() * 170, a = Math.random() * TAU;
              const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
              b.warnCircle(x, y, 60, 1.1, 16724016, () => b.explode(x, y, 60, 10, 10147064));
            }
            this.hold(0.6);
            break;
          }
          case 2: {
            const n = this.enraged ? 3 : 2;
            this.hold(n * 1 + 0.3);
            for (let k = 0; k < n; k++) {
              this.after(k * 1, () => {
                const a = this.aim();
                b.warnLine(e.x, e.y, a, 460, 84, 0.6);
                this.after(0.6, () => {
                  this.dash(a, 820, 0.5);
                  Sound.play("dash");
                });
              });
            }
            break;
          }
          case 3:
            this.summonRing("ghost", this.enraged ? 6 : 4, 280);
            this.ring("shot_ice", 14, 180, 6);
            Sound.play("roar");
            this.hold(0.8);
            break;
        }
      }
      onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y - 20, 15266047, 2, 120);
      }
    };
    Worm = class extends BossAI {
      constructor() {
        super(...arguments);
        this.under = 0;
        // 钻地剩余时间
        this.trail = 0;
      }
      cooldown() {
        return 2.2;
      }
      cast(step) {
        const b = this.b, e = this.e;
        switch (step % 4) {
          case 0: {
            const dur = this.enraged ? 2.2 : 2.8;
            this.under = dur;
            this.hold(dur + 0.6);
            b.banner("\u5DE8\u8815\u94BB\u5165\u4E86\u6C99\u4E2D!");
            Sound.play("slam");
            this.after(dur - 0.8, () => {
              const tx = b.px, ty = b.py;
              b.warnCircle(tx, ty, 110, 0.8, 16724016, () => {
                e.x = tx;
                e.y = ty;
                b.explode(tx, ty, 110, 14, 14201962);
                this.ring("shot_sand", this.enraged ? 18 : 12, 200, 7, Math.random());
                if (this.enraged) this.ring("shot_sand", 12, 140, 6, Math.random());
                Sound.play("boom");
              });
            });
            break;
          }
          case 1: {
            for (let k = 0; k < (this.enraged ? 4 : 3); k++) this.after(k * 0.25, () => this.fan("shot_sand", 7, 1.1, 260, 7));
            this.hold(1);
            Sound.play("eshot");
            break;
          }
          case 2: {
            const a = this.aim();
            b.warnLine(e.x, e.y, a, 560, 70, 0.7);
            this.hold(1.6);
            this.after(0.7, () => {
              this.dash(a, 700, 0.8);
              this.trail = 0.8;
              Sound.play("dash");
            });
            break;
          }
          case 3:
            this.summonRing("boar", this.enraged ? 6 : 4, 280);
            this.ring("shot_sand", 10, 160, 6);
            b.banner("\u6C99\u6F20\u5DE8\u8815\u53EC\u5524\u4E86\u91CE\u732A\u7FA4!");
            Sound.play("roar");
            this.hold(0.6);
            break;
        }
      }
      onUpdate(dt) {
        if (this.under > 0) {
          this.under -= dt;
          this.alpha = 0.15;
          const a = this.aim();
          this.dash(a, 260, 0.05);
          if (Math.random() < 0.6) this.b.burst(this.e.x, this.e.y, 14201962, 2, 140);
        } else this.alpha = 1;
        if (this.trail > 0) {
          this.trail -= dt;
          if (Math.random() < 0.25) this.b.fireBullet("shot_sand", this.e.x, this.e.y, Math.random() * TAU, 90, 6, { life: 2.5 });
        }
      }
    };
  }
});

// ../../assets/scripts/Battle.ts
function colorOf(c) {
  let v = colorCache.get(c);
  if (!v) {
    v = new Color(c >> 16 & 255, c >> 8 & 255, c & 255, 255);
    colorCache.set(c, v);
  }
  return v;
}
function blessingOptions(b) {
  const pool = BLESSINGS.filter((x) => !b.blessings.includes(x));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
function describe(o) {
  if (o.kind === "weapon") {
    const d2 = o.wdef;
    return { icon: d2.icon, name: d2.name, tag: o.level === 1 ? "\u65B0\u6B66\u5668!" : "LV " + o.level, desc: o.level === 1 ? d2.desc : d2.levels[o.level - 2].desc };
  }
  if (o.kind === "passive") {
    const d2 = o.pdef;
    return { icon: d2.icon, name: d2.name, tag: o.level === 1 ? "\u65B0\u9053\u5177!" : "LV " + o.level, desc: d2.desc };
  }
  if (o.kind === "heal") return { icon: "icon_heal", name: "\u70E4\u9E21", tag: "", desc: "\u6062\u590D 30 \u70B9\u751F\u547D" };
  return { icon: "coinbag", name: "\u91D1\u5E01\u888B", tag: "", desc: "\u83B7\u5F97 25 \u91D1\u5E01" };
}
function pickWeighted(table) {
  let sum = 0;
  for (const [, w] of table) sum += w;
  let r = Math.random() * sum;
  for (const [k, w] of table) {
    r -= w;
    if (r <= 0) return k;
  }
  return table[0][0];
}
var Enemy, Proj, Fx, Pickup, DmgText, Particle, PZone, LineFx, Bullet, Hazard, WeaponInst, Grid, C_WHITE, C_HURT, C_HEAL, C_GOLD, C_CRIT, C_ELITE, C_BLOODMOON, C_FROZEN, C_POTION, C_SHIELD, C_FIRERING, colorCache, C_EVO, C_GOLDEN, TAU2, C_EVO_RED, tmpColor, Battle;
var init_Battle = __esm({
  "../../assets/scripts/Battle.ts"() {
    init_cc();
    init_Art();
    init_Defs();
    init_Bosses();
    init_PixelArt();
    init_Save();
    init_Sound();
    init_UiKit();
    Enemy = class {
      constructor() {
        this.hp = 0;
        this.maxHp = 0;
        this.x = 0;
        this.y = 0;
        this.kx = 0;
        this.ky = 0;
        this.sx = 0;
        // 蝙蝠群：固定方向移动
        this.sy = 0;
        this.flash = 0;
        this.punch = 0;
        // 受击挤压动画
        this.anim = 0;
        this.frame = 0;
        this.alive = false;
        this.hits = /* @__PURE__ */ new Map();
        this.ai = null;
        this.frozen = 0;
        // 冻结剩余时间
        this.shootT = 0;
        // 远程怪射击计时
        this.elite = false;
        // 精英怪
        this.life = 0;
        // 存在时间（金鼠逃跑计时）
        this.mode = 0;
        // 冲锋野猪：0 追击 / 1 蓄力 / 2 冲撞
        this.modeT = 0;
        // 当前状态剩余时间（追击状态下为冷却）
        this.cvx = 0;
        // 冲撞速度
        this.cvy = 0;
        this.uid = 0;
      }
      // 每次出生递增，延时回调用来确认还是同一只怪（对象池复用）
    };
    Proj = class {
      constructor() {
        this.kind = "";
        this.w = null;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.dmg = 0;
        this.pierce = 0;
        this.life = 0;
        this.radius = 8;
        this.rot = 0;
        this.rotSpeed = 0;
        this.angle = 0;
        this.orbitR = 0;
        this.angSpeed = 0;
        this.gravity = 0;
        this.ax = 0;
        // 加速度（十字架回旋）
        this.ay = 0;
        this.mini = false;
        // 子炸弹
        this.tgt = null;
        // 追踪弹的目标（奥术星雨）
        this.turn = 0;
        // 追踪转向速度（弧度/秒），0 = 直线
        this.returned = false;
        this.alive = false;
        this.hit = /* @__PURE__ */ new Set();
      }
    };
    Fx = class {
      constructor() {
        this.life = 0;
        this.maxLife = 0;
        this.grow = 0;
        this.sx = 1;
        this.sy = 1;
        this.vy = 0;
        this.stretch = 0;
        // >0：前 stretch 比例的生命内横向从 15% 伸展到 100%（鞭子甩出）
        this.alive = false;
      }
    };
    Pickup = class {
      constructor() {
        this.kind = "";
        this.value = 0;
        this.x = 0;
        this.y = 0;
        this.pulled = false;
        this.vel = 0;
        this.vx = 0;
        this.vy = 0;
        this.alive = false;
      }
    };
    DmgText = class {
      constructor() {
        this.life = 0;
        this.age = 0;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.big = 1;
        this.alive = false;
      }
    };
    Particle = class {
      constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.max = 0;
        this.size = 1;
        this.alive = false;
      }
    };
    PZone = class {
      constructor() {
        this.kind = "";
        this.w = null;
        this.tint = 16777215;
        this.x = 0;
        this.y = 0;
        this.r = 0;
        this.life = 0;
        this.max = 0;
        this.dmg = 0;
        this.anim = 0;
        this.frame = 0;
        this.alive = false;
      }
    };
    LineFx = class {
      constructor() {
        this.life = 0;
        this.max = 0;
        this.alive = false;
      }
    };
    Bullet = class {
      constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0;
        this.dmg = 0;
        this.life = 0;
        this.age = 0;
        this.radius = 8;
        this.o = {};
        this.alive = false;
      }
    };
    Hazard = class {
      constructor() {
        this.kind = "circle";
        this.x = 0;
        this.y = 0;
        this.r = 0;
        this.len = 0;
        this.w = 0;
        this.angle = 0;
        this.angVel = 0;
        this.life = 0;
        this.max = 0;
        this.dmg = 0;
        this.color = new Color();
        this.owner = null;
        this.onDone = null;
        this.alive = false;
      }
    };
    WeaponInst = class {
      // 本局累计伤害
      constructor(def) {
        this.level = 1;
        this.evolved = false;
        this.timer = 0;
        this.shots = 0;
        this.shotTimer = 0;
        this.shotIdx = 0;
        this.damage = 0;
        this.def = def;
        this.recalc();
      }
      get evo() {
        return EVOLUTIONS[this.def.id];
      }
      get name() {
        return this.evolved ? this.evo.name : this.def.name;
      }
      get icon() {
        return this.evolved ? this.evo.icon : this.def.icon;
      }
      recalc() {
        const s = { ...this.def.base };
        const add = (m) => {
          for (const k in m) s[k] += m[k];
        };
        for (let i = 0; i < this.level - 1; i++) add(this.def.levels[i].mod);
        if (this.evolved && this.evo) add(this.evo.mod);
        this.stats = s;
      }
    };
    Grid = class {
      constructor() {
        this.cell = 64;
        this.map = /* @__PURE__ */ new Map();
        this.used = [];
      }
      clear() {
        for (const b of this.used) b.length = 0;
        this.used.length = 0;
        if (this.map.size > 6e3) this.map.clear();
      }
      key(cx, cy) {
        return (cx & 65535) << 16 | cy & 65535;
      }
      insert(e) {
        const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
        let b = this.map.get(k);
        if (!b) {
          b = [];
          this.map.set(k, b);
        }
        if (b.length === 0) this.used.push(b);
        b.push(e);
      }
      query(x, y, r, out) {
        out.length = 0;
        const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
        const y0 = Math.floor((y - r) / this.cell), y1 = Math.floor((y + r) / this.cell);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
          const b = this.map.get(this.key(cx, cy));
          if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
        }
        return out;
      }
    };
    C_WHITE = new Color(255, 255, 255, 255);
    C_HURT = new Color(255, 90, 90, 255);
    C_HEAL = new Color(90, 255, 120, 255);
    C_GOLD = new Color(255, 214, 90, 255);
    C_CRIT = new Color(255, 170, 40, 255);
    C_ELITE = new Color(255, 215, 110, 255);
    C_BLOODMOON = new Color(255, 150, 150, 255);
    C_FROZEN = new Color(140, 210, 255, 255);
    C_POTION = new Color(255, 150, 160, 255);
    C_SHIELD = new Color(120, 180, 255, 140);
    C_FIRERING = new Color(255, 120, 50, 150);
    colorCache = /* @__PURE__ */ new Map();
    C_EVO = new Color(255, 200, 90, 255);
    C_GOLDEN = new Color(255, 225, 130, 255);
    TAU2 = Math.PI * 2;
    C_EVO_RED = new Color(255, 110, 110, 255);
    tmpColor = new Color();
    Battle = class {
      constructor(parent) {
        // 视口尺寸（由 GameRoot 更新）
        this.vw = 720;
        this.vh = 1280;
        this.onBanner = () => {
        };
        this.px = 0;
        this.py = 0;
        this.hp = 100;
        this.iframe = 0;
        this.animT = 0;
        this.animF = 0;
        this.dirX = 1;
        this.dirY = 0;
        this.faceX = 1;
        this.mx = 0;
        this.moving = false;
        this.my = 0;
        this.stats = { ...BASE_STATS };
        this.baseStats = { ...BASE_STATS };
        // 进度
        this.time = 0;
        this.kills = 0;
        this.level = 1;
        this.xp = 0;
        this.xpNext = xpForLevel(1);
        this.gold = 0;
        this.pendingLevels = 0;
        this.pendingChests = 0;
        this.revivals = 0;
        this.rerolls = 0;
        this.dead = false;
        this.won = false;
        this.bossIdx = 0;
        this.swarmIdx = 0;
        this.spawnTimer = 0;
        this.shake = 0;
        this.shakeAmp = 0;
        this.hitstop = 0;
        this.attackKills = 0;
        this.stashXp = 0;
        this.stashT = 0;
        // 单次攻击击杀数（用于多杀顿帧）
        this.combo = 0;
        this.comboT = 0;
        this.comboPulse = 0;
        this.comboMilestone = 0;
        this.bossMusic = false;
        this.weapons = [];
        this.passives = [];
        this.garlicAura = null;
        // 实体与对象池
        this.enemies = [];
        this.enemyPool = [];
        this.projs = [];
        this.projPool = [];
        this.fxs = [];
        this.fxPool = [];
        this.pickups = [];
        this.pickupPool = [];
        this.parts = [];
        this.partPool = [];
        this.texts = [];
        this.textPool = [];
        this.grid = new Grid();
        this.qbuf = [];
        this.boss = null;
        this.bosses = [];
        this.bossWarned = false;
        this.victoryT = 0;
        this.slowT = 0;
        this.pzones = [];
        this.pzonePool = [];
        this.lines = [];
        this.linePool = [];
        this.familiars = [];
        // 命运卡牌 / 增益
        this.blessings = [];
        this.pendingBlessings = 0;
        this.endless = false;
        this.nightmare = false;
        // 噩梦难度：怪物血量 ×1.6（Boss ×1.5）、伤害 ×1.3、金币 ×1.6
        this.potionT = 0;
        this.shieldHits = 0;
        this.hasteT = 0;
        // 急速沙漏：冷却 -40%
        this.cloverT = 0;
        // 四叶草：暴击率 +30%、金币掉率提高
        this.fireT = 0;
        // 烈焰之环：身边持续灼烧
        this.arcaneT = 0;
        // 法师天赋：升级后冷却 -30%
        this.fireTick = 0;
        this.fireFx = null;
        this.traitT = 0;
        // 角色天赋的周期计时
        this.refractBuf = [];
        // 折射在 hurtEnemy 内调用，不能复用 qbuf
        this.ghostT = 0;
        this.riftT = 0;
        this.overloadT = 0;
        // 超载：倒计时 / 剩余时间
        this.overloadOn = 0;
        this.magstormT = 0;
        this.brazierT = 0;
        this.goldratT = 0;
        this.eliteT = 0;
        this.stage = STAGES[0];
        this.daily = null;
        // 每日挑战
        this.hazardT = 0;
        this.bloodMoon = false;
        this.streak = 0;
        this.flow = 1;
        // 动态难度（心流）系数 0.8 ~ 1.7
        this.sinceHurt = 0;
        this.shieldFx = null;
        // 成就统计
        this.evolvedCount = 0;
        this.bossKills = [];
        this.goldRats = 0;
        this.maxCombo = 0;
        this.endlessLoop = 0;
        // 大招：每个角色充能方式与效果都不同（见 Defs.CHARGE_DESC / castUlt）
        this.ult = 0;
        // 充能 0 ~ 1
        this.ultBank = 0;
        // 待注入的充能：各来源先存进来，每秒最多注入 1/60，保证大招间隔不低于 60 秒
        this.ultCasts = 0;
        this.ultT = 0;
        // 持续型大招剩余时间
        this.ultTick = 0;
        this.ultReadyShown = false;
        this.invulnT = 0;
        // 不动铁壁 / 影袭：无敌
        this.dashT = 0;
        // 影袭冲刺
        this.sanctum = null;
        // 圣域
        this.tasks = [];
        // 延时执行（大招 / 神兵的分段效果）
        // 神兵（30 秒史诗武器）
        this.epic = null;
        this.epicT = 0;
        this.epicMax = 0;
        this.epicsUsed = 0;
        this.epicTick = 0;
        this.epicTick2 = 0;
        this.hammers = [];
        this.holes = [];
        this.holePool = [];
        // 新场景道具
        this.giantT = 0;
        // 巨人蘑菇
        this.bootsT = 0;
        // 疾风靴
        this.bootsTick = 0;
        this.bankT = 0;
        this.bankTick = 0;
        this.decoyT = 0;
        // 幻影蛙诱饵
        this.decoyX = 0;
        this.decoyY = 0;
        this.decoySp = null;
        // 神兵祭坛 / 试炼石碑
        this.altarT = 0;
        this.shrineT = 0;
        this.trial = null;
        this.trialsWon = 0;
        this.enemyUid = 0;
        // 流沙荒漠：龙卷风 / 狂风
        this.tornados = [];
        this.windT = 0;
        this.windOn = 0;
        this.windX = 0;
        this.windY = 0;
        // 命运卡牌：能量涌动 / 浴火重生
        this.ultBuffT = 0;
        this.phoenixUsed = false;
        this.bullets = [];
        this.bulletPool = [];
        this.hazards = [];
        this.hazardPool = [];
        // 地图装饰
        this.decorChunks = /* @__PURE__ */ new Map();
        this.decorPool = /* @__PURE__ */ new Map();
        this.lastChunk = "";
        // 胜利庆祝：不再刷怪；以奶蛙为中心扩散的光环把怪物一圈圈"变成星星"消散，四周撒彩带
        this.celebrateT = 0;
        // 倒下动画：奶蛙闪白、旋转缩小，然后化作一团星光碎片，一颗小星星缓缓升起；怪物原地停住
        this.dieT = 0;
        // 波峰开始时的特殊出怪：包围圈 / 侧翼冲锋 / 密集怪潮 轮流出现
        this.surgeIdx = 0;
        this.lastSurgeCycle = -1;
        this.chainBoomQueue = [];
        // ------------------------------------------------------------------ 武器
        // 图鉴收录：首次发现时记录，结算时提示
        this.newCodex = [];
        this.chestsOpened = 0;
        this.rainbowC = new Color();
        this.world = mkNode("World", parent);
        const groundLayer = mkNode("Ground", this.world);
        this.decorLayer = mkNode("Decor", this.world);
        this.zoneLayer = mkNode("Zones", this.world);
        this.pickupLayer = mkNode("Pickups", this.world);
        this.hazardLayer = mkNode("Hazards", this.world);
        this.auraLayer = mkNode("Aura", this.world);
        this.enemyLayer = mkNode("Enemies", this.world);
        const playerLayer = mkNode("PlayerLayer", this.world);
        this.projLayer = mkNode("Projectiles", this.world);
        this.bulletLayer = mkNode("Bullets", this.world);
        this.fxLayer = mkNode("Fx", this.world);
        this.textLayer = mkNode("Texts", this.world);
        const g2 = mkNode("ground", groundLayer);
        this.ground = g2.addComponent(Sprite);
        this.ground.spriteFrame = Art.f("ground");
        this.ground.sizeMode = Sprite.SizeMode.CUSTOM;
        this.ground.type = Sprite.Type.TILED;
        g2.getComponent(UITransform).setAnchorPoint(0, 0);
        g2.setScale(PX, PX, 1);
        this.player = mkNode("Player", playerLayer);
        const half = Art.f("hero_hunter_0").rect.height * HERO_SCALE / 2;
        mkSprite(this.player, "shadow", PX * 1.7).node.setPosition(0, -half + 4);
        this.playerSp = mkSprite(this.player, "hero_hunter_0", HERO_SCALE);
        this.playerBody = this.playerSp.node;
        mkRect(this.player, 44, 7, new Color(30, 10, 20, 255), "hpBg").node.setPosition(0, -half - 8);
        this.hpFill = mkRect(this.player, 42, 5, new Color(230, 40, 50, 255), "hpFill", 0, 0.5).node;
        this.hpFill.setPosition(-21, -half - 8);
      }
      setViewport(vw, vh) {
        this.vw = vw;
        this.vh = vh;
        const T = 64 * PX;
        this.ground.node.getComponent(UITransform).setContentSize(Math.ceil(vw / T) * 64 + 192, Math.ceil(vh / T) * 64 + 192);
        this.lastChunk = "";
      }
      setInput(mx, my) {
        this.mx = mx;
        this.my = my;
      }
      setPlayerVisible(v) {
        this.player.active = v;
      }
      // ------------------------------------------------------------------ 开局
      reset(char, endless = false, stageId = "grass", daily = null) {
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
        if (this.shieldFx) {
          this.shieldFx.node.destroy();
          this.shieldFx = null;
        }
        this.endless = endless;
        this.blessings = [];
        this.pendingBlessings = 1;
        this.potionT = this.shieldHits = this.ghostT = 0;
        this.hasteT = this.cloverT = this.fireT = this.arcaneT = this.fireTick = 0;
        if (this.fireFx) {
          this.fireFx.node.destroy();
          this.fireFx = null;
        }
        this.ult = this.ultBank = 0;
        this.ultCasts = this.ultT = this.ultTick = this.invulnT = this.dashT = 0;
        this.ultReadyShown = false;
        if (this.sanctum) {
          this.sanctum.sp.node.destroy();
          this.sanctum = null;
        }
        this.tasks = [];
        this.endEpic();
        this.epicsUsed = 0;
        for (const h of this.holes) {
          h.sp.node.active = false;
          this.holePool.push(h.sp);
        }
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
        this.stage = STAGES.find((x) => x.id === stageId) || STAGES[0];
        this.daily = daily;
        this.ground.spriteFrame = Art.f(this.stage.ground);
        this.hazardT = 30;
        for (const [, nodes] of this.decorChunks) {
          for (const n of nodes) {
            n.active = false;
            let p = this.decorPool.get(n.name);
            if (!p) {
              p = [];
              this.decorPool.set(n.name, p);
            }
            p.push(n);
          }
        }
        this.decorChunks.clear();
        this.lastChunk = "";
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
        if (this.garlicAura) {
          this.garlicAura.node.destroy();
          this.garlicAura = null;
        }
        this.char = char;
        this.traitT = char.id === "nun" ? 10 : char.id === "santa" ? 40 : 4;
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
        this.dirX = 1;
        this.dirY = 0;
        this.faceX = 1;
        this.weapons = [];
        this.passives = [];
        const b = { ...BASE_STATS };
        for (const k in char.bonus) b[k] += char.bonus[k];
        const pct = {};
        for (const p of POWERUPS) {
          const r = Save.rank(p.id);
          if (!r) continue;
          if (p.mul) pct[p.stat] = (pct[p.stat] || 0) + p.per * r;
          else b[p.stat] += p.per * r;
        }
        for (const k in pct) b[k] *= 1 + pct[k];
        this.streak = endless ? 0 : Math.min(3, Save.data.lossStreak || 0);
        b.might *= 1 + 0.05 * this.streak;
        b.maxHp *= 1 + 0.05 * this.streak;
        this.baseStats = b;
        this.recalcStats();
        this.hp = this.stats.maxHp;
        this.revivals = Math.round(this.stats.revival);
        this.rerolls = Math.round(this.stats.reroll);
        const w = WEAPONS.find((x) => x.id === char.weapon) || WEAPONS[0];
        this.addWeapon(w);
        if (daily) {
          const bl = BLESSINGS.find((x) => x.id === daily.blessing);
          if (bl) this.blessings.push(bl);
          this.pendingBlessings = 0;
          this.recalcStats();
          this.hp = this.stats.maxHp;
        }
        this.playerSp.spriteFrame = Art.f(char.sprite + "_0");
        this.player.setPosition(0, 0);
        this.playerBody.setPosition(0, 0);
        this.restorePlayerLook();
        this.player.active = true;
      }
      // ------------------------------------------------------------------ 主循环
      tick(dt) {
        if (this.hitstop > 0) {
          this.hitstop -= dt;
          this.updateParticles(dt * 0.3);
          return;
        }
        this.time += dt;
        this.updateFlow(dt);
        if (this.comboT > 0) {
          this.comboT -= dt;
          if (this.comboT <= 0) {
            this.combo = 0;
            this.comboMilestone = 0;
          }
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
      celebrate(dt) {
        this.celebrateT += dt;
        const r = this.celebrateT * 520;
        for (const e of this.enemies) {
          if (!e.alive || e.def.prop) continue;
          if (Math.hypot(e.x - this.px, e.y - this.py) < r) {
            e.alive = false;
            this.burst(e.x, e.y, [16769152, 8442111, 16748736, 9498768][Math.floor(Math.random() * 4)], 4, 160);
          }
        }
        for (const b of this.bullets) b.alive = false;
        for (const p of this.projs) p.alive = false;
        for (const h of this.hazards) if (h.alive) {
          h.alive = false;
          h.node.active = false;
        }
        for (const z of this.pzones) if (z.alive) {
          z.alive = false;
          z.node.active = false;
        }
        this.endEpic();
        for (const t of this.tornados) t.sp.node.destroy();
        this.tornados = [];
        if (Math.random() < 0.6) {
          const a = Math.random() * Math.PI * 2, d2 = 80 + Math.random() * 260;
          this.burst(this.px + Math.cos(a) * d2, this.py + Math.sin(a) * d2, [16764992, 16738922, 7000319, 9105546, 13667071][Math.floor(Math.random() * 5)], 6, 220);
        }
        const hop = Math.abs(Math.sin(this.celebrateT * 7)) * 18;
        this.playerBody.setPosition(this.playerBody.position.x, hop);
        this.updateFx(dt);
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.updateLines(dt);
        this.compact();
        this.updateCamera(dt);
      }
      dying(dt) {
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
          this.hpFill.parent.active = false;
          this.burst(this.px, this.py, 16777215, 26, 420);
          this.burst(this.px, this.py, 16109632, 30, 320);
          this.burst(this.px, this.py, 16770688, 16, 200);
          const f = this.spawnFx("aura", this.px, this.py, 0.6, 1.5, 4);
          f.sp.color = colorOf(16773280);
          const s = this.spawnFx("spark", this.px, this.py + 10, 1.1, PX * 1.2, 0.5);
          s.vy = 70;
          this.addShake(0.4, 8);
          Sound.play("boom");
        }
        this.updateFx(dt);
        this.updateParticles(dt);
        this.updateTexts(dt);
        this.updateLines(dt);
        this.compact();
        this.updateCamera(dt);
      }
      // 倒下动画后复位奶蛙外观（复活 / 新开局）
      restorePlayerLook() {
        this.dieT = 0;
        this.playerBody.active = true;
        this.playerBody.angle = 0;
        this.playerBody.setScale(this.faceX * HERO_SCALE, HERO_SCALE, 1);
        this.playerSp.color = C_WHITE;
        if (this.hpFill.parent) this.hpFill.parent.active = true;
      }
      // 菜单背景：镜头缓慢漂移
      idle(dt) {
        this.px += dt * 18;
        this.py += dt * 10;
        this.updateCamera(dt);
      }
      onDeath() {
        if (this.hasB("phoenix") && !this.phoenixUsed) {
          this.phoenixUsed = true;
          this.hp = this.stats.maxHp * 0.5;
          this.iframe = 2;
          this.explodeFriendly(this.px, this.py, 220, 60 + this.level * 5, null, 600, 16740400);
          this.fireT = Math.max(this.fireT, 8);
          this.onBanner("\u6D74\u706B\u91CD\u751F!", new Color(255, 140, 60, 255));
          Sound.play("revive");
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
      revive(hpRatio) {
        this.restorePlayerLook();
        this.dead = false;
        this.hp = this.stats.maxHp * hpRatio;
        this.iframe = 2.5;
        for (const e of this.enemies) {
          if (!e.alive || e.def.prop) continue;
          const d2 = Math.hypot(e.x - this.px, e.y - this.py);
          if (d2 < 320) this.hurtEnemy(e, 50 + this.level * 2, 600, this.px, this.py, null);
        }
        this.bullets.forEach((b) => {
          b.alive = false;
        });
        this.spawnFx("aura", this.px, this.py, 0.6, 2, 6);
        this.burst(this.px, this.py, 16773280, 30, 400);
        Sound.play("revive");
        this.onBanner("\u590D\u6D3B!", new Color(255, 230, 120, 255));
      }
      updatePlayer(dt) {
        let mx = this.mx, my = this.my;
        const len = Math.hypot(mx, my);
        const moving = this.moving = len > 0.05;
        if (moving) {
          if (len > 1) {
            mx /= len;
            my /= len;
          }
          const sp = 145 * this.stats.moveSpeed * (this.slowT > 0 ? 0.55 : 1) * (this.potionT > 0 ? 1.3 : 1) * (this.ghostT > 0 ? 1.5 : 1) * (this.bootsT > 0 ? 1.6 : 1) * (this.epicIs("unicorn") ? 1.6 : 1);
          this.px += mx * sp * dt;
          this.py += my * sp * dt;
          if (this.char.charge === "move") this.chargeUlt(sp * dt / 2600);
          const l = Math.hypot(mx, my);
          this.dirX = mx / l;
          this.dirY = my / l;
          if (Math.abs(mx) > 0.1) this.faceX = mx > 0 ? 1 : -1;
        }
        this.animT += dt;
        if (moving) {
          if (this.animT > 0.14) {
            this.animT = 0;
            this.animF = this.animF === 1 ? 2 : 1;
          }
        } else this.animF = 0;
        if (this.dashT > 0) {
          this.dashT -= dt;
          this.px += this.dirX * 1300 * dt;
          this.py += this.dirY * 1300 * dt;
          for (const e of this.grid.query(this.px, this.py, 70, this.qbuf).slice()) {
            if (!e.alive || e.def.prop || Math.hypot(e.x - this.px, e.y - this.py) > 50 + e.def.radius) continue;
            if (this.time < (e.hits.get("dash") || 0)) continue;
            e.hits.set("dash", this.time + 1);
            this.hurtEnemy(e, this.skillDmg(30, 5), 300, this.px, this.py, null);
          }
          if (Math.random() < 0.8) this.burst(this.px, this.py, 8413376, 2, 80);
          if (this.dashT <= 0) this.rogueFinale();
        }
        this.playerSp.spriteFrame = Art.f(this.char.sprite + "_" + this.animF);
        const big = this.giantT > 0 ? this.giantT < 1 && Math.floor(this.giantT * 10) % 2 ? 1.3 : 1.8 : 1;
        this.playerBody.setScale(this.faceX * HERO_SCALE * big, HERO_SCALE * big, 1);
        this.player.setPosition(this.px, this.py);
        this.iframe -= dt;
        if (this.invulnT > 0) this.invulnT -= dt;
        if (this.slowT > 0) this.slowT -= dt;
        this.playerSp.color = this.iframe > 0 && Math.floor(this.iframe * 20) % 2 === 0 ? C_HURT : this.invulnT > 0 ? C_GOLDEN : this.epicIs("unicorn") ? this.rainbow(this.time * 2) : C_WHITE;
        if (this.char.charge === "heal" && this.hp < this.stats.maxHp) this.chargeUlt(this.stats.recovery * dt / (this.stats.maxHp * 0.8));
        this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.recovery * dt);
        this.hpFill.setScale(Math.max(0, this.hp / this.stats.maxHp), 1, 1);
      }
      hurtPlayer(dmg) {
        if (this.iframe > 0 || this.invulnT > 0 || this.dashT > 0) return;
        if (this.isChar("rogue") && Math.random() < 0.12) {
          this.iframe = 0.4;
          this.burst(this.px, this.py, 12648384, 8, 220);
          return;
        }
        if (this.shieldHits > 0) {
          this.shieldHits--;
          this.iframe = 0.6;
          if (this.char.charge === "heal") this.chargeUlt(0.08);
          this.burst(this.px, this.py, 6332671, 12, 260);
          Sound.play("hit");
          return;
        }
        if (this.stats.thorns > 0) {
          const q = this.grid.query(this.px, this.py, 90, this.qbuf).slice();
          for (const e of q) if (e.alive && !e.def.prop && Math.hypot(e.x - this.px, e.y - this.py) < 90) this.hurtEnemy(e, this.stats.thorns, 300, this.px, this.py, null);
          this.burst(this.px, this.py, 9085024, 10, 220);
        }
        if (this.hasB("ghost")) {
          this.ghostT = 1.5;
          this.iframe = Math.max(this.iframe, 1.5);
        }
        if (this.hasB("thornaura")) this.explodeFriendly(this.px, this.py, 130, 40 + this.level * 3, null, 260, 10539104);
        if (this.isChar("bomber") && Math.random() < 0.35) this.explodeFriendly(this.px, this.py, 110, 20 + this.level * 2, null, 260, 16744496);
        const armor = this.stats.armor + (this.isChar("knight") && this.hp < this.stats.maxHp * 0.5 ? 2 : 0);
        const d2 = Math.max(1, dmg * (this.mod("glass") ? 1.5 : 1) * (this.giantT > 0 ? 0.5 : 1) - armor);
        this.hp -= d2;
        if (this.char.charge === "hurt") this.chargeUlt(0.12);
        this.iframe = Math.max(this.iframe, 0.6);
        this.sinceHurt = 0;
        this.addShake(0.2, 7);
        Sound.play("hurt");
        vibrate();
      }
      heal(v) {
        if (this.hp >= this.stats.maxHp) return;
        if (this.char.charge === "heal") this.chargeUlt(Math.min(v, this.stats.maxHp - this.hp) / (this.stats.maxHp * 0.8));
        this.hp = Math.min(this.stats.maxHp, this.hp + v);
      }
      updateCamera(dt) {
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
      updateDecor() {
        const CH = 400;
        const cx = Math.floor(this.px / CH), cy = Math.floor(this.py / CH);
        const key = cx + "," + cy;
        if (key === this.lastChunk) return;
        this.lastChunk = key;
        const rx = Math.ceil(this.vw / 2 / CH) + 1, ry = Math.ceil(this.vh / 2 / CH) + 1;
        const want = /* @__PURE__ */ new Set();
        for (let i = cx - rx; i <= cx + rx; i++) for (let j = cy - ry; j <= cy + ry; j++) want.add(i + "," + j);
        for (const [k, nodes] of this.decorChunks) {
          if (want.has(k)) continue;
          for (const n of nodes) {
            n.active = false;
            let p = this.decorPool.get(n.name);
            if (!p) {
              p = [];
              this.decorPool.set(n.name, p);
            }
            p.push(n);
          }
          this.decorChunks.delete(k);
        }
        const kinds = this.stage.decor;
        for (const k of want) {
          if (this.decorChunks.has(k)) continue;
          const [i, j] = k.split(",").map(Number);
          const r = rng(i * 73856093 ^ j * 19349663 ^ 1540483477);
          const n = Math.floor(r() * 5);
          const list = [];
          for (let m = 0; m < n; m++) {
            const kind = kinds[Math.floor(r() * kinds.length)];
            const x = (i + r()) * CH, y = (j + r()) * CH;
            if (Math.abs(x) < 120 && Math.abs(y) < 120) continue;
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
      updateSpawner(dt) {
        if (!this.endless && !this.bloodMoon && this.time >= BLOOD_MOON) {
          this.bloodMoon = true;
          this.ground.color = C_BLOODMOON;
          this.onBanner("\u7EA2\u6708\u964D\u4E34! \u575A\u6301\u6700\u540E\u4E24\u5206\u949F!", new Color(255, 60, 60, 255));
          Sound.play("roar");
          Sound.playBgm("bgm_boss");
          this.bossMusic = false;
          this.addShake(0.6, 6);
        }
        let wave = WAVES[0];
        for (const w of WAVES) if (this.time >= w.t) wave = w;
        const pace = this.spawnPace();
        this.spawnTimer -= dt * pace;
        this.updateSurge(wave);
        if (this.spawnTimer <= 0) {
          this.spawnTimer = wave.interval;
          const count = Math.round((wave.batch + Math.floor(this.time / 120)) * (this.boss ? 0.6 : 1) * (this.hasB("greedpact") ? 1.3 : 1) * (this.endless ? 1 + Math.max(0, this.time - 900) / 600 : 1) * (this.bloodMoon ? 1.8 : 1) * this.flow * (this.mod("horde") ? 1.4 : 1) * (this.trial ? 2 : 1));
          let imps = 0;
          for (const e of this.enemies) if (e.alive && e.def.ranged) imps++;
          const impCap = 4 + Math.floor(Math.max(0, this.time - 540) / 120);
          for (let i = 0; i < count && this.enemies.length < (this.bloodMoon ? Save.data.lite ? 290 : 420 : this.enemyCap); i++) {
            let type = wave.types[Math.floor(Math.random() * wave.types.length)];
            if (ENEMIES[type].ranged) {
              if (imps >= impCap) type = "skeleton";
              else imps++;
            }
            const a = this.moving && Math.random() < 0.35 ? Math.atan2(this.dirY, this.dirX) + (Math.random() - 0.5) * 1.4 : Math.random() * Math.PI * 2;
            const r = this.spawnRadius(a);
            this.spawnEnemy(type, this.px + Math.cos(a) * r, this.py + Math.sin(a) * r);
          }
        }
        if (this.endless && this.bossIdx >= BOSS_SCHEDULE.length) {
          const t = this.endlessBossTime();
          if (!this.bossWarned && this.time >= t - 10) {
            this.bossWarned = true;
            this.onBanner("\u8B66\u544A! \u66F4\u5F3A\u7684 Boss \u5373\u5C06\u964D\u4E34", new Color(255, 70, 70, 255));
            Sound.play("boss");
          }
          if (this.time >= t) {
            this.endlessLoop++;
            this.bossWarned = false;
            const ids = ["slimeking", "bonelord", "vampire", "lich", "eye", "reaper"];
            this.spawnBoss(ids[Math.floor(Math.random() * ids.length)], 1 + this.endlessLoop * 0.6);
          }
        }
        const next = BOSS_SCHEDULE[this.bossIdx];
        if (next) {
          const bossId = this.swapBoss(next.id);
          if (!this.bossWarned && this.time >= next.t - 10) {
            this.bossWarned = true;
            this.onBanner(`\u8B66\u544A! ${ENEMIES[bossId].name} \u5373\u5C06\u964D\u4E34`, new Color(255, 70, 70, 255));
            Sound.play("boss");
          }
          if (this.time >= next.t) {
            this.bossIdx++;
            this.bossWarned = false;
            this.spawnBoss(bossId);
          }
        }
        this.bosses = this.bosses.filter((b) => b.alive);
        this.boss = this.bosses.length ? this.bosses[this.bosses.length - 1] : null;
        if (this.bossMusic && !this.boss) {
          this.bossMusic = false;
          if (!this.bloodMoon) Sound.playBgm("bgm_battle");
        }
        if (this.swarmIdx < SWARM_TIMES.length && this.time >= SWARM_TIMES[this.swarmIdx]) {
          this.swarmIdx++;
          this.spawnSwarm();
        }
      }
      endlessBossTime() {
        return BOSS_SCHEDULE[BOSS_SCHEDULE.length - 1].t + ENDLESS_BOSS_INTERVAL * (this.endlessLoop + 1);
      }
      // 地图可替换时间表中的 Boss（新春地图：年兽）
      swapBoss(id) {
        return this.stage.bossSwap && this.stage.bossSwap[id] || id;
      }
      spawnBoss(id, hpMul = 1) {
        const def = ENEMIES[id];
        for (const old of this.bosses) {
          if (!old.alive) continue;
          old.alive = false;
          old.ai = null;
          this.burst(old.x, old.y, old.def.color, 30, 300);
          this.spawnFx(old.def.frames[0] + "_w", old.x, old.y, 0.4, PX * (old.def.scale || 1), 1);
          this.onBanner(`${old.def.name} \u64A4\u9000\u4E86\u2026`, new Color(180, 180, 200, 255));
        }
        const b = this.spawnEnemy(id, this.px, this.py + this.vh / 2 + 80, true);
        b.maxHp = b.hp = def.hp * (1 + 0.1 * this.level) * hpMul * this.stage.hpMul * (this.nightmare ? 1.5 : 1);
        b.ai = createBossAI(id, this, b);
        this.bosses.push(b);
        this.boss = b;
        Sound.play("roar");
        Sound.playBgm("bgm_boss");
        this.bossMusic = true;
        this.addShake(0.6, 8);
        this.onBanner(`${def.name} \u964D\u4E34!`, new Color(220, 80, 255, 255));
      }
      // 下一个 Boss 的名字与剩余秒数（用于 HUD 倒计时）
      nextBoss() {
        const n = BOSS_SCHEDULE[this.bossIdx];
        if (!n && this.endless) return { name: `\u5F3A\u5316Boss\xB7\u7B2C${this.endlessLoop + 1}\u8F6E`, remain: Math.max(0, this.endlessBossTime() - this.time), final: false };
        if (!n) return null;
        const d2 = ENEMIES[this.swapBoss(n.id)];
        return { name: d2.name || "", remain: Math.max(0, n.t - this.time), final: !!d2.final };
      }
      summon(type, x, y) {
        if (this.enemies.length >= this.enemyCap + 60) return;
        this.spawnEnemy(type, x, y, true);
      }
      banner(text) {
        this.onBanner(text, new Color(255, 140, 90, 255));
      }
      // 竖屏下按方向计算屏幕外的出生距离（椭圆），避免左右两侧离得太远
      // 刷怪速度倍率：早期慢（0.45 → 1），之后按 60 秒周期在 0.5（波谷）~ 1.7（波峰）之间起伏
      spawnPace() {
        const t = this.time;
        if (this.daily && this.mod("horde")) return 1.2;
        const early = Math.min(1, 0.5 + t / 240);
        if (t < 45 || this.boss || this.bloodMoon || this.endless) return early;
        const ph = (t - 45) % 60 / 60;
        const s = Math.sin(ph * Math.PI * 2 - Math.PI / 2);
        const shaped = Math.sign(s) * Math.pow(Math.abs(s), 0.6);
        return early * (1.05 + 0.6 * shaped);
      }
      updateSurge(wave) {
        const t = this.time;
        if (t < 105 || this.boss || this.bloodMoon || this.endless) return;
        const cycle = Math.floor((t - 45) / 60);
        const ph = (t - 45) % 60 / 60;
        if (ph < 0.42 || ph > 0.5 || cycle === this.lastSurgeCycle) return;
        this.lastSurgeCycle = cycle;
        const types = wave.types.filter((k) => !ENEMIES[k].ranged);
        const pick = () => types[Math.floor(Math.random() * types.length)];
        const kind = this.surgeIdx++ % 3;
        const n = Math.min(40, 14 + Math.floor(t / 30));
        if (kind === 0) {
          const R = Math.hypot(this.vw, this.vh) / 2 + 40, type = pick();
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2;
            this.spawnEnemy(type, this.px + Math.cos(a) * R, this.py + Math.sin(a) * R, true);
          }
          this.onBanner("\u602A\u7269\u5305\u56F4\u4E86!", new Color(255, 170, 80, 255));
        } else if (kind === 1) {
          const a = Math.random() * Math.PI * 2, R = Math.hypot(this.vw, this.vh) / 2 + 60, type = pick();
          const nx = -Math.sin(a), ny = Math.cos(a);
          for (let i = 0; i < n; i++) {
            const off = (i - n / 2) * 22, back = i % 3 * 30;
            this.spawnEnemy(type, this.px + Math.cos(a) * (R + back) + nx * off, this.py + Math.sin(a) * (R + back) + ny * off, true);
          }
          this.onBanner("\u602A\u7269\u7FA4\u51B2\u8FC7\u6765\u4E86!", new Color(255, 170, 80, 255));
        } else {
          this.onBanner("\u602A\u6F6E\u6765\u88AD!", new Color(255, 170, 80, 255));
        }
        Sound.play("roar");
      }
      spawnRadius(a) {
        const hw = this.vw / 2 + 50, hh = this.vh / 2 + 50;
        const c = Math.cos(a), s = Math.sin(a);
        return Math.min(Math.abs(c) > 1e-3 ? hw / Math.abs(c) : 1e9, Math.abs(s) > 1e-3 ? hh / Math.abs(s) : 1e9);
      }
      spawnSwarm() {
        this.onBanner("\u8759\u8760\u7FA4\u6765\u88AD!", new Color(200, 140, 255, 255));
        const side = Math.random() < 0.5 ? -1 : 1;
        const y0 = this.py - side * (this.vh / 2 + 60);
        for (let i = 0; i < 40; i++) {
          const e = this.spawnEnemy("bat", this.px + (i % 8 - 3.5) * 40 + Math.random() * 10, y0 - side * Math.floor(i / 8) * 34, true);
          e.sx = 0;
          e.sy = side * 170;
        }
      }
      spawnEnemy(type, x, y, force = false) {
        const def = ENEMIES[type];
        if (!force && this.enemies.length >= this.enemyCap) return null;
        let e = this.enemyPool.pop();
        if (!e) {
          e = new Enemy();
          e.node = mkNode("enemy", this.enemyLayer);
          e.shadow = mkSprite(e.node, "shadow", PX).node;
          e.sp = mkSprite(e.node, def.frames[0]);
          e.body = e.sp.node;
        }
        const s = def.scale || 1;
        e.def = def;
        e.node.active = true;
        e.x = x;
        e.y = y;
        e.kx = e.ky = e.sx = e.sy = 0;
        e.maxHp = e.hp = def.boss ? def.hp : def.hp * (1 + this.time / 240 + (this.time / 280) ** 2) * (this.bloodMoon ? 1.3 : 1) * this.flowHp() * this.stage.hpMul * (this.mod("xp2") ? 1.5 : 1) * (this.nightmare ? 1.6 : 1);
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
        const flying = type === "bat" || type === "ghost";
        const h = (e.sp.spriteFrame.rect.height / 2 - 3) * PX * s;
        e.shadow.setPosition(0, flying ? -h - 8 : -h);
        e.shadow.setScale(PX * s * (def.boss ? 2 : 1.2), PX * s, 1);
        e.node.setPosition(x, y);
        if (!force && !def.boss && !def.prop && !def.flee && this.time > 60 && this.eliteT <= 0) {
          this.eliteT = this.mod("elites") ? 12 : (30 + Math.random() * 15) / (this.bloodMoon ? 3 : 1);
          this.eliteify(e);
        }
        this.enemies.push(e);
        return e;
      }
      // 精英化：金色、体型更大、血量 ×8
      eliteify(e) {
        const s = e.def.scale || 1;
        e.elite = true;
        e.maxHp = e.hp = e.hp * 8;
        e.sp.color = C_ELITE;
        e.body.setScale(PX * s * 1.5, PX * s * 1.5, 1);
      }
      freeEnemy(e) {
        e.alive = false;
        e.node.active = false;
        this.enemyPool.push(e);
      }
      updateEnemies(dt) {
        const px = this.px, py = this.py;
        const despawnX = this.vw / 2 + 260, despawnY = this.vh / 2 + 260;
        const q = this.qbuf;
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.alive) continue;
          const def = e.def;
          let dx = px - e.x, dy = py - e.y;
          let d2 = Math.hypot(dx, dy) || 1;
          e.life += dt;
          if (def.prop) {
            if (Math.abs(dx) > despawnX + 300 || Math.abs(dy) > despawnY + 300) {
              e.alive = false;
              continue;
            }
            if (def === ENEMIES.altar && d2 < def.radius + 22) {
              this.killEnemy(e);
              continue;
            }
            this.animEnemy(e, dt, 1, 0);
            continue;
          }
          if (e.frozen > 0) {
            e.frozen -= dt;
            if (e.frozen <= 0) e.sp.color = e.elite ? C_ELITE : C_WHITE;
            e.node.setPosition(e.x, e.y);
            continue;
          }
          if (def.flee) {
            const sp = def.speed * Math.max(0.45, 1 - e.life / 14);
            const wob = Math.sin(e.life * 3) * 0.6;
            const a = Math.atan2(-dy, -dx) + wob;
            e.x += Math.cos(a) * sp * dt;
            e.y += Math.sin(a) * sp * dt;
            if (e.life > 14) {
              e.alive = false;
              this.burst(e.x, e.y, 16106818, 16, 200);
              this.onBanner("\u91D1\u9F20\u9003\u8D70\u4E86\u2026", new Color(200, 200, 200, 255));
              continue;
            }
            this.animEnemy(e, dt, a > Math.PI / 2 || a < -Math.PI / 2 ? -1 : 1, 0);
            continue;
          }
          if (e.sx !== 0 || e.sy !== 0) {
            e.x += e.sx * dt;
            e.y += e.sy * dt;
            if (Math.abs(dx) > despawnX + 400 || Math.abs(dy) > despawnY + 400) {
              e.alive = false;
              continue;
            }
          } else if (e.ai) {
            const ai = e.ai;
            ai.update(dt);
            if (!e.alive) continue;
            if (ai.dashT > 0) {
              e.x += ai.dashVx * dt;
              e.y += ai.dashVy * dt;
            } else {
              const sp = def.speed * ai.speedMul;
              e.x += dx / d2 * sp * dt;
              e.y += dy / d2 * sp * dt;
            }
            if (ai.dashT <= 0 && (Math.abs(dx) > despawnX + 200 || Math.abs(dy) > despawnY + 200)) {
              e.x = px + (dx > 0 ? -1 : 1) * Math.min(Math.abs(dx), this.vw / 2);
              e.y = py + (dy > 0 ? -1 : 1) * Math.min(Math.abs(dy), this.vh / 2 + 60);
            }
          } else {
            const sp = def.speed * (e.flash > 0 ? 0.5 : 1) * (1 + Math.min(this.time, 900) / 3600) * (this.mod("fast") ? 1.25 : 1);
            e.modeT -= dt;
            if (def.charger && e.mode === 1) {
              e.punch = 0.05;
              if (e.modeT <= 0) {
                e.mode = 2;
                e.modeT = 0.55;
                Sound.play("dash");
              }
            } else if (def.charger && e.mode === 2) {
              e.x += e.cvx * dt;
              e.y += e.cvy * dt;
              if (e.modeT <= 0) {
                e.mode = 0;
                e.modeT = 3.5 + Math.random();
              }
            } else if (def.charger && e.modeT <= 0 && d2 < 260) {
              const a = Math.atan2(dy, dx);
              e.mode = 1;
              e.modeT = 0.7;
              e.cvx = Math.cos(a) * 540;
              e.cvy = Math.sin(a) * 540;
              this.warnLine(e.x, e.y, a, 320, 40, 0.7);
              e.flash = 0.7;
            } else if (def.blink && e.modeT <= 0 && d2 < 520) {
              e.modeT = 3.5 + Math.random() * 1.5;
              const a = Math.random() * TAU2, tx = px + Math.cos(a) * 75, ty = py + Math.sin(a) * 75, uid = e.uid;
              this.warnCircle(tx, ty, 26, 0.5, 10510591, () => {
                if (!e.alive || e.uid !== uid || e.frozen > 0) return;
                this.burst(e.x, e.y, 10514687, 8, 160);
                e.x = tx;
                e.y = ty;
                e.kx = e.ky = 0;
                this.burst(tx, ty, 10514687, 8, 160);
                Sound.play("teleport");
              });
              e.x += dx / d2 * sp * dt;
              e.y += dy / d2 * sp * dt;
            } else if (def.ranged) {
              const want = d2 - 230;
              const tx = -dy / d2, ty = dx / d2;
              const k = Math.max(-1, Math.min(1, want / 60));
              e.x += (dx / d2 * k + tx * 0.6) * sp * dt;
              e.y += (dy / d2 * k + ty * 0.6) * sp * dt;
              e.shootT -= dt;
              if (e.shootT < 0.35 && e.shootT + dt >= 0.35) {
                e.flash = 0.3;
                e.punch = 0.2;
              }
              if (e.shootT <= 0 && d2 < 420) {
                e.shootT = 2.6 + Math.random() * 0.8;
                this.fireBullet("fireball", e.x, e.y, Math.atan2(dy, dx), 140, 4 * this.dmgRamp(), { radius: 9 });
              }
            } else if (this.decoyT > 0 && Math.abs(this.decoyX - e.x) + Math.abs(this.decoyY - e.y) < 700) {
              const ox = this.decoyX - e.x, oy = this.decoyY - e.y, od = Math.hypot(ox, oy) || 1;
              if (od > 16) {
                e.x += ox / od * sp * dt;
                e.y += oy / od * sp * dt;
              }
            } else {
              e.x += dx / d2 * sp * dt;
              e.y += dy / d2 * sp * dt;
            }
            if (Math.abs(dx) > despawnX || Math.abs(dy) > despawnY) {
              const a = Math.atan2(this.dirY, this.dirX) + (Math.random() - 0.5) * 1.6;
              const r = this.spawnRadius(a);
              e.x = px + Math.cos(a) * r;
              e.y = py + Math.sin(a) * r;
            }
          }
          if (e.kx !== 0 || e.ky !== 0) {
            e.x += e.kx * dt;
            e.y += e.ky * dt;
            const f = Math.max(0, 1 - 10 * dt);
            e.kx *= f;
            e.ky *= f;
            if (Math.abs(e.kx) + Math.abs(e.ky) < 2) e.kx = e.ky = 0;
          }
          this.grid.query(e.x, e.y, def.radius * 2, q);
          for (let j = 0; j < q.length; j++) {
            const o = q[j];
            if (o === e) continue;
            const ox = e.x - o.x, oy = e.y - o.y;
            const rr = def.radius + o.def.radius;
            const d22 = ox * ox + oy * oy;
            if (d22 < rr * rr && d22 > 0.01) {
              const od = Math.sqrt(d22);
              const push = (rr - od) / od * (def.boss ? 0.05 : 0.5);
              e.x += ox * push;
              e.y += oy * push;
            }
          }
          dx = px - e.x;
          dy = py - e.y;
          d2 = Math.hypot(dx, dy);
          const trample = this.giantT > 0 || this.epicIs("unicorn");
          if (trample && d2 < def.radius + (this.giantT > 0 ? 44 : 30) && this.time >= (e.hits.get("crush") || 0)) {
            e.hits.set("crush", this.time + 0.3);
            this.chainBoomQueue.push(() => this.hurtEnemy(e, this.giantT > 0 ? this.skillDmg(20, 3) : this.skillDmg(15, 2.5), 520, px, py, null));
          }
          if (d2 < def.radius + 12 && def.dmg > 0 && (!trample || def.boss) && (!e.ai || e.ai.touchable)) this.hurtPlayer(def.boss ? def.dmg * 1.3 : def.dmg * this.dmgRamp() * (e.elite ? 1.5 : 1));
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
          if (frameDirty) e.sp.spriteFrame = Art.f(def.frames[e.frame] + (e.flash > 0 ? "_w" : ""));
          const s = PX * (def.scale || 1);
          const face = (e.sx || dx) < 0 ? -1 : 1;
          let pk = 0;
          if (e.punch > 0) {
            e.punch -= dt;
            pk = Math.max(0, e.punch) / 0.12;
          }
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
      animEnemy(e, dt, face, _unused) {
        e.anim += dt;
        if (e.anim >= e.def.anim) {
          e.anim = 0;
          e.frame = 1 - e.frame;
          e.sp.spriteFrame = Art.f(e.def.frames[e.frame] + (e.flash > 0 ? "_w" : ""));
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
      updateFlow(dt) {
        this.sinceHurt += dt;
        const hpR = this.hp / this.stats.maxHp;
        if (this.time < 30) return;
        if (hpR < 0.35) this.flow -= 0.03 * dt;
        else if (hpR > 0.8 && this.sinceHurt > 6) this.flow += 0.018 * dt;
        else if (hpR > 0.5) this.flow += 3e-3 * dt;
        this.flow = Math.max(0.8, Math.min(1.7, this.flow));
      }
      // 心流对怪物血量的影响：低于 1 时线性减弱，高于 1 时超线性增强（只针对碾压中的玩家）
      flowHp() {
        return this.flow <= 1 ? 0.6 + 0.4 * this.flow : Math.pow(this.flow, 1.5);
      }
      // 小怪接触伤害随时间的成长：前期平缓、后期陡峭（5 分钟 ×1.75，10 分钟 ×3.2，15 分钟 ×5.4）
      dmgRamp() {
        const m = this.time / 600;
        const early = 1 + 1.2 * Math.max(0, 1 - this.time / 480);
        return early * 1.3 * (1 + 0.5 * m + 0.85 * m * m) * (this.bloodMoon ? 1.25 : 1) * (0.8 + 0.2 * this.flow) * (this.nightmare ? 1.3 : 1);
      }
      // 每日挑战规则
      mod(id) {
        return !!this.daily && this.daily.mod.id === id;
      }
      hasB(id) {
        for (const b of this.blessings) if (b.id === id) return true;
        return false;
      }
      // 角色专属天赋中按周期触发的部分
      updateTrait(dt) {
        const id = this.char.id;
        if (id !== "nun" && id !== "sage" && id !== "druid" && id !== "santa") return;
        this.traitT -= dt;
        if (this.traitT > 0) return;
        if (id === "nun") {
          this.traitT = 40;
          if (this.shieldHits < 1) {
            this.shieldHits = 1;
            this.burst(this.px, this.py, 8438015, 14, 200);
            Sound.play("power");
          }
        } else if (id === "sage") {
          this.traitT = 7;
          let hit = false;
          for (let i = 0; i < 3; i++) {
            const t = this.randomOnScreen();
            if (!t) break;
            hit = true;
            const f = this.spawnFx("lightning", t.x, t.y, 0.25, PX, 0);
            f.node.getComponent(UITransform).setAnchorPoint(0.5, 0);
            f.sp.color = colorOf(13676799);
            const x = t.x, y = t.y;
            this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 40, 12 + this.level * 2, null, 60, 12624127, false));
          }
          if (hit) Sound.play("lightning");
        } else if (id === "druid") {
          this.traitT = 9;
          for (const e of this.grid.query(this.px, this.py, 160, this.qbuf).slice()) {
            if (Math.hypot(e.x - this.px, e.y - this.py) < 130 + e.def.radius) this.freezeEnemy(e, 1.5);
          }
          const f = this.spawnFx("aura", this.px, this.py, 0.45, 260 / 64 * 0.5, 1.3);
          f.sp.color = colorOf(6340688);
          this.burst(this.px, this.py, 6340688, 16, 300);
        } else if (id === "santa") {
          this.traitT = 70;
          const a = Math.random() * Math.PI * 2;
          const kind = Math.random() < 0.2 ? "magnet" : BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)];
          this.spawnPickup(kind, this.px + Math.cos(a) * 70, this.py + Math.sin(a) * 70, 0, true);
          this.onBanner("\u5723\u8BDE\u793C\u7269!", new Color(255, 120, 120, 255));
          Sound.play("chest");
        }
      }
      // 全局伤害倍率：狂战士、狂暴药水
      dmgMul() {
        let m = 1;
        if (this.hasB("berserk")) m *= 1 + 0.8 * (1 - Math.max(0, this.hp) / this.stats.maxHp);
        if (this.potionT > 0) m *= 1.5;
        if (this.isChar("hunter")) m *= 1 + Math.min(0.25, Math.floor(this.kills / 100) * 0.01);
        if (this.ultBuffT > 0) m *= 1.3;
        return m;
      }
      freezeEnemy(e, t) {
        if (!e.alive || e.def.prop) return;
        e.frozen = Math.max(e.frozen, e.def.boss ? t * 0.35 : t);
        e.kx = e.ky = 0;
        e.sp.color = C_FROZEN;
      }
      hurtEnemy(e, dmg, knock, fromX, fromY, w) {
        if (!e.alive || e.ai && e.ai.alpha < 0.3) return;
        const crit = !!w && (Math.random() < this.stats.crit + (this.cloverT > 0 ? 0.3 : 0) || w.evolved && w.def.id === "cross");
        if (crit) {
          dmg = Math.round(dmg * this.stats.critDmg);
          if (this.hasB("vampkiss")) this.heal(1);
          if (this.isChar("prism") && Math.random() < 0.35) this.refract(e, dmg);
          if (this.char.charge === "crit") this.chargeUlt(1 / (150 + this.time * 0.4));
        }
        if (e.frozen > 0 && this.weapons.some((x) => x.evolved && x.def.id === "frost")) dmg = Math.round(dmg * 1.5);
        const real = Math.min(dmg, Math.max(0, e.hp));
        e.hp -= dmg;
        e.flash = 0.08;
        e.punch = 0.12;
        e.sp.spriteFrame = Art.f(e.def.frames[e.frame] + "_w");
        if (w) w.damage += real;
        this.dmgText(e.x, e.y + 16, dmg, crit ? C_CRIT : C_WHITE, "", crit);
        if (crit) {
          Sound.play("crit");
          this.burst(e.x, e.y, 16773280, 3, 260);
        } else Sound.play("hit");
        if (e.def.boss) this.addShake(0.08, 3);
        if (knock > 0 && e.sx === 0 && e.sy === 0) {
          const kr = e.def.knockRes || 0;
          const dx = e.x - fromX, dy = e.y - fromY, d2 = Math.hypot(dx, dy) || 1;
          e.kx = dx / d2 * knock * (1 - kr);
          e.ky = dy / d2 * knock * (1 - kr);
        }
        if (w && w.evolved && (w.def.id === "whip" || w.def.id === "garlic" || w.def.id === "spikes") && Math.random() < 0.12) this.heal(1);
        if (e.hp <= 0) this.killEnemy(e);
      }
      killEnemy(e) {
        e.alive = false;
        if (e.def === ENEMIES.altar) {
          this.burst(e.x, e.y, 16767072, 30, 320);
          this.burst(e.x, e.y, 16777215, 10, 260);
          this.spawnFx("aura", e.x, e.y, 0.5, 1.5, 4).sp.color = colorOf(16769152);
          this.spawnEpicPickup(e.x, e.y);
          Sound.play("chest");
          return;
        }
        if (e.def.prop) {
          this.burst(e.x, e.y, 15769648, 14, 220);
          Sound.play("kill");
          let kind = pickWeighted(BRAZIER_DROPS);
          if (kind === "chicken" && this.mod("gold3")) kind = "coinbag";
          if (kind === "epic") this.spawnEpicPickup(e.x, e.y);
          else this.spawnPickup(kind, e.x, e.y, kind === "coinbag" ? 15 : 0, true);
          return;
        }
        if (e.def.flee) {
          this.goldRats++;
          for (let i = 0; i < 10; i++) this.spawnPickup("coin", e.x, e.y, 3, true);
          this.spawnPickup("coinbag", e.x, e.y, 40, true);
          this.burst(e.x, e.y, 16106818, 30, 320);
          this.onBanner("\u6293\u4F4F\u91D1\u9F20! \u91D1\u5E01\u96E8!", new Color(255, 214, 90, 255));
          Sound.play("chest");
        }
        if (e.elite) {
          this.spawnPickup("coinbag", e.x, e.y, 10, true);
          if (Math.random() < 0.04) this.spawnEpicPickup(e.x, e.y);
          else if (Math.random() < 0.3) this.spawnPickup(BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)], e.x, e.y, 0, true);
          for (let i = 0; i < 4; i++) this.spawnPickup("gem", e.x, e.y, e.def.xp * 3, true);
          this.burst(e.x, e.y, 16106818, 24, 300);
          this.addShake(0.15, 5);
        }
        if (this.stats.lifesteal > 0) this.heal(this.stats.lifesteal);
        if (this.hasB("chainboom") && !e.def.boss && Math.random() < 0.15) {
          const x = e.x, y = e.y;
          this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 55, 10 + this.level, null, 120, 16744496));
        }
        if (this.isChar("pyro") && !e.def.boss && Math.random() < 0.12) {
          const x = e.x, y = e.y;
          this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 50, 8 + this.level, null, 100, 16736288, false));
        }
        this.kills++;
        this.attackKills++;
        if (this.trial) this.trial.got++;
        const ch = this.char.charge;
        if (ch === "kill" || ch === "combo") this.chargeUlt((ch === "combo" ? 1 + Math.min(1, this.combo / 300) : 1) / (170 + this.time * 0.8));
        if (e.def.split) {
          const x = e.x, y = e.y, t = e.def.split;
          this.chainBoomQueue.push(() => {
            for (const o of [-14, 14]) this.summon(t, x + o, y);
          });
        }
        if (e.def.burst) {
          const x = e.x, y = e.y;
          this.warnCircle(x, y, 70, 0.7, 16724016, () => {
            this.explode(x, y, 70, 5 + this.time / 90, 16736304);
            this.explodeFriendly(x, y, 60, 12 + this.level, null, 160, 16736304, false);
          });
        }
        const tid = ENEMY_IDS.get(e.def);
        if (tid) this.discover("m:" + tid);
        this.addCombo();
        Sound.play("kill");
        const s = PX * (e.def.scale || 1);
        const f = this.spawnFx(e.def.frames[e.frame] + "_w", e.x, e.y, 0.16, s, 0.6);
        if ((e.sx || this.px - e.x) < 0) {
          f.sx = -s;
          f.node.setScale(-s, s, 1);
        }
        this.burst(e.x, e.y, e.def.color, e.def.boss ? 50 : 7, e.def.boss ? 420 : 230);
        this.burst(e.x, e.y, 16777215, e.def.boss ? 20 : 2, 300);
        if (e.def.boss) {
          this.spawnPickup("chest", e.x, e.y, 0);
          this.spawnPickup("coinbag", e.x + 30, e.y, 30, true);
          if (Math.random() < 0.4) this.spawnPickup("chicken", e.x - 30, e.y, 0, true);
          else this.spawnPickup(BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)], e.x - 30, e.y, 0, true);
          if (Math.random() < 0.4) this.spawnEpicPickup(e.x, e.y - 30);
          e.ai = null;
          const bid = Object.keys(ENEMIES).find((k) => ENEMIES[k] === e.def) || "";
          if (!this.bossKills.includes(bid)) this.bossKills.push(bid);
          if (this.bossKills.length % 2 === 0 && this.blessings.length + this.pendingBlessings < 4) this.pendingBlessings++;
          if (e.def.final && !this.endless) {
            this.victoryT = 2.5;
            this.onBanner("\u6697\u591C\u9B54\u672F\u5E08\u88AB\u51FB\u8D25\u4E86!", new Color(255, 220, 90, 255));
          } else this.onBanner(`\u51FB\u8D25 ${e.def.name}!`, new Color(255, 220, 90, 255));
          this.hitstop = 0.35;
          this.addShake(0.6, 14);
          this.spawnFx("aura", e.x, e.y, 0.5, 2, 5);
          Sound.play("bigkill");
        }
        this.spawnPickup("gem", e.x, e.y, e.def.xp * (this.time < 180 ? 1.5 : 1), true);
        const r = Math.random();
        if (r < 25e-4) {
          if (!this.mod("gold3")) this.spawnPickup("chicken", e.x + 10, e.y, 0);
        } else if (r < 55e-4) this.spawnPickup("magnet", e.x + 10, e.y, 0);
        else {
          const k = 1 / (1 + this.kills / 1500) * (this.cloverT > 0 ? 3 : 1);
          if (r < 55e-4 + 2e-3 * k) this.spawnPickup("coinbag", e.x + 10, e.y, 20);
          else if (r < 55e-4 + 0.02 * k) this.spawnPickup("coin", e.x + 10, e.y, 1 + Math.floor(Math.random() * 2));
        }
      }
      discover(key) {
        const c = Save.data.codex;
        if (!c || c.includes(key)) return;
        c.push(key);
        this.newCodex.push(key);
      }
      addWeapon(def) {
        this.discover("w:" + def.id);
        const w = new WeaponInst(def);
        w.timer = 0.3;
        this.weapons.push(w);
        if (def.id === "garlic" && !this.garlicAura) {
          this.garlicAura = mkSprite(this.auraLayer, "aura", 1);
        }
      }
      updateWeapons(dt) {
        const st = this.stats;
        for (const w of this.weapons) {
          const s = w.stats;
          if (w.def.id === "garlic") {
            this.updateGarlic(w);
            continue;
          }
          if (w.def.id === "familiar") {
            this.updateFamiliars(w, dt);
            continue;
          }
          w.timer -= dt;
          if (w.timer <= 0 && w.shots <= 0) {
            w.timer = Math.max(0.1, s.cooldown * st.cooldown * this.cdMul());
            if (w.def.id === "bible") w.timer += Math.min(s.duration * st.duration, 9999);
            w.shots = s.amount + st.amount;
            w.shotIdx = 0;
            w.shotTimer = 0;
            const echo = this.hasB("echo") && Math.random() < 0.15;
            if (w.def.id === "bible" || w.def.id === "lightning" || w.def.id === "frost" || w.def.id === "chain" || w.def.id === "spikes" || w.def.id === "axe" && w.evolved) {
              this.fireAll(w);
              if (echo && w.def.id !== "bible") this.later(0.2, () => this.fireAll(w));
              w.shots = 0;
            } else if (echo) w.shots *= 2;
          }
          if (w.shots > 0) {
            w.shotTimer -= dt;
            while (w.shots > 0 && w.shotTimer <= 0) {
              this.fireOne(w, w.shotIdx++);
              w.shots--;
              w.shotTimer += w.def.id === "axe" ? 0.15 : w.def.id === "whip" ? 0.12 : w.def.id === "bomb" ? 0.25 : w.def.id === "holy" || w.def.id === "fire" ? 0.15 : w.def.id === "cross" ? 0.12 : w.def.id === "saw" ? 0.15 : w.def.id === "sonic" ? 0.1 : w.def.id === "laser" ? w.evolved ? 0 : 0.18 : 0.07;
            }
          }
        }
      }
      // 冷却倍率：双生之力 / 杀戮狂热
      cdMul() {
        let m = 1;
        if (this.hasB("twin")) m *= 1.15;
        if (this.hasB("frenzy") && this.combo >= 50) m *= 0.7;
        if (this.overloadOn > 0) m *= 0.5;
        if (this.hasteT > 0) m *= 0.6;
        if (this.arcaneT > 0) m *= 0.7;
        return m;
      }
      isChar(id) {
        return this.char.id === id;
      }
      // 折射（棱镜蛙）：暴击分出一道光打向附近另一个敌人
      refract(from, dmg) {
        let best = null, bd = 160 * 160;
        for (const e of this.grid.query(from.x, from.y, 160, this.refractBuf)) {
          if (e === from || !e.alive || e.def.prop) continue;
          const d2 = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
          if (d2 < bd) {
            bd = d2;
            best = e;
          }
        }
        if (!best) return;
        const t = best;
        this.spawnFx("spark", t.x, t.y, 0.2, PX, 1.5).sp.color = colorOf(12644607);
        this.chainBoomQueue.push(() => this.hurtEnemy(t, Math.max(1, Math.round(dmg * 0.5)), 0, from.x, from.y, null));
      }
      dmgOf(w) {
        const base = w.stats.damage * this.stats.might * this.dmgMul();
        return Math.max(1, Math.round(base * (0.9 + Math.random() * 0.2)));
      }
      nearestEnemy() {
        let best = Infinity, out = null;
        for (const e of this.enemies) {
          if (!e.alive || e.def.prop) continue;
          const d2 = (e.x - this.px) ** 2 + (e.y - this.py) ** 2;
          if (d2 < best) {
            best = d2;
            out = e;
          }
        }
        return out;
      }
      randomOnScreen() {
        const n = this.enemies.length;
        for (let k = 0; k < 12 && n; k++) {
          const e = this.enemies[Math.floor(Math.random() * n)];
          if (e.alive && !e.def.prop && Math.abs(e.x - this.px) < this.vw / 2 && Math.abs(e.y - this.py) < this.vh / 2) return e;
        }
        return null;
      }
      fireOne(w, idx) {
        this.attackKills = 0;
        this.fireOneInner(w, idx);
        this.checkMultiKill();
      }
      fireOneInner(w, idx) {
        const st = this.stats, s = w.stats;
        const area = s.area * st.area;
        const spd = s.speed * st.speed;
        switch (w.def.id) {
          case "whip": {
            const side = idx % 2 === 0 ? this.faceX : -this.faceX;
            const hw = 76 * area, hh = 30 * area;
            const cx = this.px + side * hw, cy = this.py + 4 + Math.floor(idx / 2) * 18;
            const q = this.grid.query(cx, cy, hw + 40, this.qbuf).slice();
            for (const e of q) {
              if (e.alive && Math.abs(e.x - cx) < hw + e.def.radius && Math.abs(e.y - cy) < hh + e.def.radius) {
                this.hurtEnemy(e, this.dmgOf(w), 320, this.px, this.py, w);
              }
            }
            const f = this.spawnFx("whip", this.px + side * 8, cy + 6, 0.24, 1, 0);
            f.node.getComponent(UITransform).setAnchorPoint(0, 0.5);
            f.sx = side * (hw * 2 + 10) / 64;
            f.sy = PX * area * 1.15;
            f.stretch = 0.35;
            f.node.setScale(f.sx * 0.15, f.sy, 1);
            if (w.evolved) f.sp.color = C_EVO_RED;
            Sound.play("whip");
            break;
          }
          case "wand": {
            const t = this.nearestEnemy();
            const a = t ? Math.atan2(t.y - this.py, t.x - this.px) : Math.atan2(this.dirY, this.dirX);
            const p = this.spawnProj("bolt", "bolt", w, this.px, this.py, Math.cos(a) * 380 * spd, Math.sin(a) * 380 * spd, this.dmgOf(w), s.pierce, 3, 9 * area);
            p.node.setScale(PX * area, PX * area, 1);
            if (w.evolved) p.sp.color = C_EVO;
            Sound.play("shoot");
            break;
          }
          case "knife": {
            const n = s.amount + st.amount;
            const off = (idx - (n - 1) / 2) * 10;
            const x = this.px - this.dirY * off, y = this.py + this.dirX * off;
            const p = this.spawnProj("knife", "knife", w, x, y, this.dirX * 620 * spd, this.dirY * 620 * spd, this.dmgOf(w), s.pierce, 2, 8 * area);
            p.node.angle = Math.atan2(this.dirY, this.dirX) * 180 / Math.PI;
            p.node.setScale(PX * area, PX * area, 1);
            if (w.evolved) p.sp.color = C_EVO;
            Sound.play("knife");
            break;
          }
          case "axe": {
            const dir = idx % 2 === 0 ? this.faceX : -this.faceX;
            const vx = dir * (50 + idx * 35 + Math.random() * 40);
            const p = this.spawnProj("axe", "axe", w, this.px, this.py + 10, vx, 520 * spd, this.dmgOf(w), s.pierce, 3, 14 * area);
            p.gravity = 1100;
            p.rotSpeed = -dir * 720;
            p.node.setScale(PX * area, PX * area, 1);
            Sound.play("axe");
            break;
          }
          case "fire": {
            const t = this.randomOnScreen();
            const a = t ? Math.atan2(t.y - this.py, t.x - this.px) : Math.random() * Math.PI * 2;
            const p = this.spawnProj("fireball", "fireball", w, this.px, this.py, Math.cos(a) * 300 * spd, Math.sin(a) * 300 * spd, this.dmgOf(w), 1, 1.6, 10 * area);
            const sc = PX * area * (w.evolved ? 1.6 : 1);
            p.node.setScale(sc, sc, 1);
            Sound.play("fire");
            break;
          }
          case "holy": {
            const t = this.randomOnScreen();
            const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 140;
            const tx = t ? t.x : this.px + Math.cos(a) * r, ty = t ? t.y : this.py + Math.sin(a) * r;
            const fly = 0.45;
            const p = this.spawnProj("flask", "flask", w, this.px, this.py + 10, (tx - this.px) / fly, (ty - this.py) / fly, 0, 0, fly, 0);
            p.rotSpeed = 720;
            Sound.play("throw");
            break;
          }
          case "cross": {
            const t = this.nearestEnemy();
            const n = s.amount + st.amount;
            const a = (t ? Math.atan2(t.y - this.py, t.x - this.px) : Math.atan2(this.dirY, this.dirX)) + (idx - (n - 1) / 2) * 0.25;
            const v = 460 * spd;
            const p = this.spawnProj("cross", "crossp", w, this.px, this.py, Math.cos(a) * v, Math.sin(a) * v, this.dmgOf(w), 999, 2.6, 12 * area);
            p.ax = -Math.cos(a) * v * 0.9;
            p.ay = -Math.sin(a) * v * 0.9;
            p.rotSpeed = 900;
            p.node.setScale(PX * area, PX * area, 1);
            if (w.evolved) p.sp.color = C_EVO;
            Sound.play("throw");
            break;
          }
          case "laser": {
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
            const col = w.evolved ? [16736384, 8454032, 7381247][idx % 3] : 6351103;
            this.lineFx(this.px, this.py, ex, ey, col, half * 2 + 6);
            this.lineFx(this.px, this.py, ex, ey, 16777215, Math.max(3, half * 0.7));
            this.spawnFx("spark", this.px + dx * 18, this.py + dy * 18, 0.15, PX * 0.8, 1.5);
            Sound.play("beam");
            break;
          }
          case "saw": {
            const a = Math.random() * TAU2, v = 420 * spd;
            const p = this.spawnProj("saw", "sawblade", w, this.px, this.py, Math.cos(a) * v, Math.sin(a) * v, this.dmgOf(w), 999, s.duration * st.duration, 12 * area);
            p.rotSpeed = 1080;
            p.node.setScale(PX * area * (w.evolved ? 1.2 : 1), PX * area * (w.evolved ? 1.2 : 1), 1);
            if (w.evolved) p.sp.color = C_EVO;
            Sound.play("axe");
            break;
          }
          case "sonic": {
            const n = s.amount + st.amount;
            const base = Math.atan2(this.dirY, this.dirX);
            const a0 = w.evolved ? base + idx / n * TAU2 : base + (idx % 2 ? Math.PI : 0) + Math.floor(idx / 2) * 0.35;
            const L = 190 * area;
            for (const e of this.grid.query(this.px + Math.cos(a0) * L / 2, this.py + Math.sin(a0) * L / 2, L / 2 + 40, this.qbuf).slice()) {
              if (!e.alive || e.def.prop) continue;
              const rx = e.x - this.px, ry = e.y - this.py;
              if (Math.hypot(rx, ry) > L + e.def.radius) continue;
              let da = Math.atan2(ry, rx) - a0;
              while (da > Math.PI) da -= TAU2;
              while (da < -Math.PI) da += TAU2;
              if (Math.abs(da) > 0.55) continue;
              this.hurtEnemy(e, this.dmgOf(w), 480, this.px, this.py, w);
              if (w.evolved) this.freezeEnemy(e, 0.6);
            }
            for (let k = 0; k < 2; k++) {
              const f = this.spawnFx("wave", this.px + Math.cos(a0) * (40 + k * 40), this.py + Math.sin(a0) * (40 + k * 40), 0.25 + k * 0.08, PX * area * (0.8 + k * 0.4), 0.5);
              f.node.angle = a0 * 180 / Math.PI;
              if (w.evolved) f.sp.color = C_EVO;
            }
            Sound.play("whip");
            break;
          }
          case "bomb": {
            const a = Math.random() * Math.PI * 2, r = idx === 0 ? 0 : 30 + Math.random() * 30;
            const p = this.spawnProj("bomb", "bomb_0", w, this.px + Math.cos(a) * r, this.py - 20 + Math.sin(a) * r, 0, 0, this.dmgOf(w), 0, s.duration * st.duration, 0);
            p.node.setScale(PX, PX, 1);
            Sound.play("throw");
            break;
          }
        }
      }
      fireAll(w) {
        this.attackKills = 0;
        this.fireAllInner(w);
        this.checkMultiKill();
      }
      // 一次攻击击杀多个敌人：短暂顿帧 + 震屏
      checkMultiKill() {
        if (this.attackKills >= 5) {
          this.hitstop = Math.max(this.hitstop, 0.03);
          this.addShake(0.12, 4);
        }
      }
      fireAllInner(w) {
        const st = this.stats, s = w.stats;
        const n = s.amount + st.amount;
        const area = s.area * st.area;
        if (w.def.id === "bible") {
          for (let i = 0; i < n; i++) {
            const p = this.spawnProj("bible", "bible", w, this.px, this.py, 0, 0, 0, 999, Math.min(s.duration * st.duration, 1e6), 12 * area);
            p.angle = i / n * Math.PI * 2;
            p.orbitR = 80 * area;
            p.angSpeed = 3.2 * s.speed * st.speed;
            p.node.setScale(PX * area, PX * area, 1);
            if (w.evolved) p.sp.color = C_EVO;
          }
        } else if (w.def.id === "lightning") {
          const cand = this.enemies.filter((e) => e.alive && Math.abs(e.x - this.px) < this.vw / 2 && Math.abs(e.y - this.py) < this.vh / 2);
          if (cand.length) Sound.play("lightning");
          for (let i = 0; i < n && cand.length; i++) {
            const bi = i === 0 ? cand.findIndex((e) => !!e.def.boss) : -1;
            const t = cand.splice(bi >= 0 ? bi : Math.floor(Math.random() * cand.length), 1)[0];
            const r = 28 * area;
            const q = this.grid.query(t.x, t.y, r + 30, this.qbuf).slice();
            for (const e of q) {
              if (e.alive && Math.hypot(e.x - t.x, e.y - t.y) < r + e.def.radius) this.hurtEnemy(e, this.dmgOf(w), 0, t.x, t.y, w);
            }
            const f = this.spawnFx("lightning", t.x, t.y, 0.25, PX, 0);
            f.node.getComponent(UITransform).setAnchorPoint(0.5, 0);
            if (w.evolved) f.sp.color = C_EVO;
            this.spawnFx("spark", t.x, t.y, 0.3, PX * area, 2);
          }
        } else if (w.def.id === "frost") {
          const R = 95 * area;
          const q = this.grid.query(this.px, this.py, R + 30, this.qbuf).slice();
          for (const e of q) {
            if (!e.alive || e.def.prop || Math.hypot(e.x - this.px, e.y - this.py) > R + e.def.radius) continue;
            this.hurtEnemy(e, this.dmgOf(w), 0, this.px, this.py, w);
            this.freezeEnemy(e, s.duration * st.duration);
          }
          const f = this.spawnFx("aura", this.px, this.py, 0.4, R * 2 / 64 * 0.3, 2.3);
          f.sp.color = C_FROZEN;
          this.burst(this.px, this.py, 10545407, 16, R * 3);
          Sound.play("freeze");
        } else if (w.def.id === "chain") {
          const jumps = n;
          const range = 170 * area;
          let cur = this.nearestEnemy();
          if (!cur || Math.hypot(cur.x - this.px, cur.y - this.py) > 380 * area) return;
          const hit = /* @__PURE__ */ new Set();
          let fx = this.px, fy = this.py;
          for (let i = 0; i < jumps && cur; i++) {
            hit.add(cur);
            this.lineFx(fx, fy, cur.x, cur.y, w.evolved ? 16769120 : 10539263, 6);
            const tx = cur.x, ty = cur.y;
            this.hurtEnemy(cur, this.dmgOf(w), 30, fx, fy, w);
            if (w.evolved) this.explodeFriendly(tx, ty, 40, Math.round(this.dmgOf(w) * 0.5), w, 60, 16769120, false);
            fx = tx;
            fy = ty;
            let best = Infinity, nxt = null;
            const q = this.grid.query(fx, fy, range, this.qbuf);
            for (const e of q) {
              if (!e.alive || e.def.prop || hit.has(e)) continue;
              const d2 = (e.x - fx) ** 2 + (e.y - fy) ** 2;
              if (d2 < best && d2 < range * range) {
                best = d2;
                nxt = e;
              }
            }
            cur = nxt;
          }
          Sound.play("zap");
        } else if (w.def.id === "spikes") {
          const R = 260;
          const q = this.grid.query(this.px, this.py, R, this.qbuf).filter((e) => e.alive && !e.def.prop && Math.hypot(e.x - this.px, e.y - this.py) < R);
          q.sort((a, b) => (a.x - this.px) ** 2 + (a.y - this.py) ** 2 - ((b.x - this.px) ** 2 + (b.y - this.py) ** 2));
          for (let i = 0; i < n; i++) {
            let x, y;
            const e = q[i];
            if (e) {
              x = e.x;
              y = e.y;
            } else {
              const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 120;
              x = this.px + Math.cos(a) * r;
              y = this.py + Math.sin(a) * r;
            }
            const p = this.spawnProj("spike", "spike_warn", w, x, y, 0, 0, this.dmgOf(w), 0, 0.22 + i * 0.05, 0);
            p.node.setScale(PX * area, PX * area, 1);
          }
        } else if (w.def.id === "axe") {
          const cnt = n + 3;
          for (let i = 0; i < cnt; i++) {
            const a = i / cnt * Math.PI * 2;
            const p = this.spawnProj("axe", "axe", w, this.px, this.py, Math.cos(a) * 280 * s.speed * st.speed, Math.sin(a) * 280 * s.speed * st.speed, this.dmgOf(w), 999, 2.5, 16 * area);
            p.rotSpeed = 900;
            p.node.setScale(PX * area * 1.3, PX * area * 1.3, 1);
            p.sp.color = C_EVO_RED;
          }
          Sound.play("axe");
        }
      }
      updateGarlic(w) {
        const area = w.stats.area * this.stats.area;
        const R = 58 * area;
        if (this.garlicAura) {
          const pulse = 1 + Math.sin(this.time * 6) * 0.03;
          this.garlicAura.node.setPosition(this.px, this.py);
          this.garlicAura.node.setScale(R * 2 / 64 * pulse, R * 2 / 64 * pulse, 1);
          this.garlicAura.color = w.evolved ? C_EVO_RED : C_WHITE;
        }
        const q = this.grid.query(this.px, this.py, R + 30, this.qbuf).slice();
        const interval = Math.max(0.3, w.stats.cooldown * this.stats.cooldown);
        for (const e of q) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - this.px, e.y - this.py) > R + e.def.radius * 0.5) continue;
          const next = e.hits.get("garlic") || 0;
          if (this.time < next) continue;
          e.hits.set("garlic", this.time + interval);
          this.hurtEnemy(e, this.dmgOf(w), 200, this.px, this.py, w);
        }
      }
      // ------------------------------------------------------------------ 弹道
      spawnProj(kind, frame, w, x, y, vx, vy, dmg, pierce, life, radius) {
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
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
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
      freeProj(p) {
        p.alive = false;
        p.node.active = false;
        this.projPool.push(p);
      }
      updateProjs(dt) {
        for (const p of this.projs) {
          if (!p.alive) continue;
          p.life -= dt;
          if (p.life <= 0) {
            this.endProj(p);
            continue;
          }
          if (p.kind === "bomb" || p.kind === "ubomb") {
            const fast = p.life < 0.5 ? 12 : 5;
            p.sp.spriteFrame = Art.f(Math.floor(p.life * fast) % 2 ? "bomb_1" : "bomb_0");
            continue;
          }
          if (p.kind === "cross") {
            p.vx += p.ax * dt;
            p.vy += p.ay * dt;
            if (!p.returned && p.vx * p.ax + p.vy * p.ay > 0) {
              p.returned = true;
              p.hit.clear();
            }
          }
          if (p.turn) {
            if (!p.tgt || !p.tgt.alive) {
              let bd = 360 * 360;
              p.tgt = null;
              for (const e of this.grid.query(p.x, p.y, 360, this.qbuf)) {
                if (!e.alive || e.def.prop || p.hit.has(e)) continue;
                const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
                if (d2 < bd) {
                  bd = d2;
                  p.tgt = e;
                }
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
          if (p.kind === "saw") {
            const hx = this.vw / 2 - 16, hy = this.vh / 2 - 16;
            if (p.x - this.px > hx && p.vx > 0 || p.x - this.px < -hx && p.vx < 0) p.vx = -p.vx;
            if (p.y - this.py > hy && p.vy > 0 || p.y - this.py < -hy && p.vy < 0) p.vy = -p.vy;
          }
          if (p.kind === "bible") {
            p.angle += p.angSpeed * dt;
            p.x = this.px + Math.cos(p.angle) * p.orbitR;
            p.y = this.py + Math.sin(p.angle) * p.orbitR;
          } else {
            if (p.gravity) p.vy -= p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.rotSpeed) {
              p.rot += p.rotSpeed * dt;
              p.node.angle = p.rot;
            }
          }
          p.node.setPosition(p.x, p.y);
          if (p.kind === "flask" || p.kind === "spike") continue;
          const q = this.grid.query(p.x, p.y, p.radius + 32, this.qbuf).slice();
          for (let i = 0; i < q.length && p.alive; i++) {
            const e = q[i];
            if (!e.alive) continue;
            const rr = p.radius + e.def.radius;
            if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rr * rr) continue;
            if (p.kind === "saw") {
              if (this.time < (e.hits.get("saw") || 0)) continue;
              e.hits.set("saw", this.time + 0.35);
              this.hurtEnemy(e, p.dmg, 60, p.x, p.y, p.w);
              if (p.w && p.w.evolved && Math.random() < 0.2) {
                const x = p.x, y = p.y, d2 = Math.round(p.dmg * 0.6), w = p.w;
                this.chainBoomQueue.push(() => this.explodeFriendly(x, y, 40, d2, w, 80, 16760928, false));
              }
            } else if (p.kind === "bible") {
              const next = e.hits.get("bible") || 0;
              if (this.time < next) continue;
              e.hits.set("bible", this.time + 0.6);
              this.hurtEnemy(e, p.w ? this.dmgOf(p.w) : 10, 240, this.px, this.py, p.w);
            } else {
              if (p.hit.has(e)) continue;
              p.hit.add(e);
              this.hurtEnemy(e, p.dmg, p.kind === "axe" ? 110 : 70, p.x - p.vx * 0.01, p.y - p.vy * 0.01, p.w);
              p.pierce--;
              if (p.pierce <= 0) this.endProj(p);
            }
          }
          if (p.alive && (Math.abs(p.x - this.px) > this.vw + 200 || Math.abs(p.y - this.py) > this.vh + 200)) p.alive = false;
        }
        if (this.chainBoomQueue.length) {
          const q = this.chainBoomQueue;
          this.chainBoomQueue = [];
          for (const f of q) f();
        }
      }
      // 弹道结束：火球爆炸 / 圣水落地 / 炸弹引爆
      endProj(p) {
        if (!p.alive) return;
        p.alive = false;
        const w = p.w;
        if (p.kind === "ubomb") {
          this.explodeFriendly(p.x, p.y, 95, p.dmg, null, 300, 16748592);
          return;
        }
        if (!w) return;
        const st = this.stats, s = w.stats, area = s.area * st.area;
        switch (p.kind) {
          case "fireball": {
            const big = w.evolved ? 1.6 : 1;
            this.explodeFriendly(p.x, p.y, 42 * area * big, p.dmg, w, 80, 16736288);
            this.spawnPZone("fire", w, p.x, p.y, 34 * area * big, s.duration * st.duration * (w.evolved ? 1.5 : 1), Math.max(1, Math.round(s.damage * 0.25 * st.might)));
            break;
          }
          case "spike": {
            const r = 30 * area;
            const q = this.grid.query(p.x, p.y, r + 30, this.qbuf).slice();
            for (const e of q) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < r + e.def.radius) this.hurtEnemy(e, p.dmg, 20, p.x, p.y - 10, w);
            const f = this.spawnFx("spike", p.x, p.y + 8, 0.35, PX * area, 0.25);
            f.node.getComponent(UITransform).setAnchorPoint(0.5, 0);
            if (w.evolved) f.sp.color = C_EVO_RED;
            this.burst(p.x, p.y, w.evolved ? 13639744 : 9071178, 4, 120);
            Sound.play("hit");
            break;
          }
          case "flask":
            this.spawnPZone("holy", w, p.x, p.y, 50 * area, s.duration * st.duration, 0);
            this.burst(p.x, p.y, 8433919, 10, 200);
            Sound.play("splash");
            break;
          case "bomb": {
            const r = 85 * area * (p.mini ? 0.55 : 1);
            this.explodeFriendly(p.x, p.y, r, p.dmg, w, 260, 16748592);
            if (w.evolved && !p.mini) {
              for (let i = 0; i < 4; i++) {
                const a = i / 4 * Math.PI * 2 + Math.random() * 0.5;
                const m = this.spawnProj("bomb", "bomb_0", w, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70, 0, 0, Math.round(p.dmg * 0.5), 0, 0.45 + i * 0.08, 0);
                m.mini = true;
                m.node.setScale(PX * 0.7, PX * 0.7, 1);
              }
            }
            break;
          }
        }
      }
      // 我方范围爆炸
      explodeFriendly(x, y, r, dmg, w, knock, color, sound = true) {
        if (this.char.charge === "boom") this.chargeUlt(0.025);
        const q = this.grid.query(x, y, r + 40, this.qbuf).slice();
        for (const e of q) {
          if (e.alive && Math.hypot(e.x - x, e.y - y) < r + e.def.radius) this.hurtEnemy(e, dmg, knock, x, y, w);
        }
        const f = this.spawnFx("aura", x, y, 0.3, r * 2 / 64 * 0.5, 1.2);
        f.sp.color = colorOf(color);
        this.burst(x, y, color, 10, r * 4);
        this.burst(x, y, 16777215, 3, r * 3);
        if (sound) {
          Sound.play("boom");
          this.addShake(0.12, 4);
        }
      }
      // ------------------------------------------------------------------ 我方地面效果
      spawnPZone(kind, w, x, y, r, life, dmg) {
        let z = this.pzonePool.find((q) => q.kind === kind);
        if (z) this.pzonePool.splice(this.pzonePool.indexOf(z), 1);
        else {
          z = new PZone();
          z.sp = mkSprite(this.zoneLayer, kind === "fire" ? "flame_0" : "puddle", 1);
          z.node = z.sp.node;
        }
        z.kind = kind;
        z.w = w;
        z.x = x;
        z.y = y;
        z.r = r;
        z.life = z.max = life;
        z.dmg = dmg;
        z.anim = 0;
        z.frame = 0;
        z.sp.spriteFrame = Art.f(kind === "fire" ? "flame_0" : "puddle");
        z.tint = kind === "poison" ? 7393344 : 16777215;
        z.alive = true;
        z.node.active = true;
        z.node.setPosition(x, y);
        if (kind === "fire") z.node.setScale(r * 2 / 32, r * 1.2 / 20, 1);
        else z.node.setScale(r * 2 / 64, r * 2 * 0.62 / 40, 1);
        this.pzones.push(z);
        return z;
      }
      freePZone(z) {
        z.alive = false;
        z.node.active = false;
        this.pzonePool.push(z);
      }
      updatePZones(dt) {
        for (const z of this.pzones) {
          if (!z.alive) continue;
          z.life -= dt;
          if (z.life <= 0) {
            z.alive = false;
            continue;
          }
          const fade = Math.min(1, z.life * 2);
          z.sp.color = tmpColor.set(z.tint >> 16 & 255, z.tint >> 8 & 255, z.tint & 255, Math.floor(255 * fade));
          if (z.kind === "fire") {
            z.anim += dt;
            if (z.anim > 0.12) {
              z.anim = 0;
              z.frame = 1 - z.frame;
              z.sp.spriteFrame = Art.f("flame_" + z.frame);
            }
          }
          const w = z.w;
          const dmg = z.kind === "fire" || !w ? z.dmg : this.dmgOf(w);
          const key = "z" + z.kind;
          const q = this.grid.query(z.x, z.y, z.r + 30, this.qbuf).slice();
          for (const e of q) {
            if (!e.alive || Math.hypot(e.x - z.x, (e.y - z.y) * 1.4) > z.r + e.def.radius * 0.5) continue;
            if (this.time < (e.hits.get(key) || 0)) continue;
            e.hits.set(key, this.time + 0.5);
            this.hurtEnemy(e, dmg, 0, z.x, z.y, w);
          }
          if (z.kind === "holy" && w && w.evolved && Math.hypot(this.px - z.x, this.py - z.y) < z.r) this.heal(2 * dt);
        }
      }
      // 线段特效（连锁闪电）
      lineFx(x1, y1, x2, y2, color, width) {
        let l = this.linePool.pop();
        if (!l) {
          l = new LineFx();
          l.sp = mkRect(this.fxLayer, 10, 10, C_WHITE, "line", 0, 0.5);
          l.node = l.sp.node;
        }
        l.alive = true;
        l.node.active = true;
        l.life = l.max = 0.2;
        l.node.setPosition(x1, y1);
        l.node.angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        l.node.getComponent(UITransform).setContentSize(Math.hypot(x2 - x1, y2 - y1), width);
        l.sp.color = colorOf(color);
        this.lines.push(l);
        this.burst(x2, y2, color, 3, 150);
      }
      freeLine(l) {
        l.alive = false;
        l.node.active = false;
        this.linePool.push(l);
      }
      updateLines(dt) {
        for (const l of this.lines) {
          if (!l.alive) continue;
          l.life -= dt;
          if (l.life <= 0) {
            l.alive = false;
            continue;
          }
          const c = l.sp.color;
          l.sp.color = tmpColor.set(c.r, c.g, c.b, Math.floor(255 * l.life / l.max));
        }
      }
      // 精灵使魔：跟随玩家，各自独立射击
      updateFamiliars(w, dt) {
        const st = this.stats, s = w.stats;
        const n = s.amount + st.amount;
        while (this.familiars.length < n) {
          const sp = mkSprite(this.projLayer, "familiar_0", PX);
          this.familiars.push({ node: sp.node, sp, x: this.px, y: this.py, t: Math.random() * 0.5 });
        }
        const cd = Math.max(0.15, s.cooldown * st.cooldown * this.cdMul());
        this.familiars.forEach((f, i) => {
          const a = this.time * 1.6 + i / n * Math.PI * 2;
          const tx = this.px + Math.cos(a) * 46, ty = this.py + 30 + Math.sin(a) * 22;
          const k = Math.min(1, dt * 6);
          f.x += (tx - f.x) * k;
          f.y += (ty - f.y) * k;
          f.node.setPosition(f.x, f.y);
          f.sp.spriteFrame = Art.f(Math.floor(this.time * 8 + i) % 2 ? "familiar_1" : "familiar_0");
          if (w.evolved) f.sp.color = C_EVO;
          f.t -= dt;
          if (f.t > 0) return;
          let best = 400 * 400, tgt = null;
          for (const e of this.enemies) {
            if (!e.alive || e.def.prop) continue;
            const d2 = (e.x - f.x) ** 2 + (e.y - f.y) ** 2;
            if (d2 < best) {
              best = d2;
              tgt = e;
            }
          }
          if (!tgt) {
            f.t = 0.2;
            return;
          }
          f.t = cd;
          const ang = Math.atan2(tgt.y - f.y, tgt.x - f.x);
          const p = this.spawnProj("fshot", "fshot", w, f.x, f.y, Math.cos(ang) * 420 * s.speed * st.speed, Math.sin(ang) * 420 * s.speed * st.speed, this.dmgOf(w), s.pierce, 1.5, 6);
          p.node.setScale(PX, PX, 1);
          Sound.play("pew");
        });
      }
      // ------------------------------------------------------------------ 随机事件：火盆 / 金鼠 / 卡牌效果
      // 地图环境危害：冰锥 / 陨石。红圈预警后落下，同时伤害玩家与怪物（可以把怪引过去）
      updateHazard(dt) {
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
            this.warnCircle(x, y, R, fall, 16724016, () => {
              this.explode(x, y, R * 0.6, 4 + this.time / 60, hz.color);
              this.zone(x, y, R, 4, 2 + this.time / 150, 6340656);
              this.spawnPZone("poison", null, x, y, R, 4, 12 + this.level);
              Sound.play("splash");
            });
            for (let b = 0; b < 3; b++) {
              const f2 = this.spawnFx("bubble", x + (b - 1) * 20, y + b % 2 * 10, fall, PX * (0.6 + b * 0.2), 1.2);
              f2.vy = 30;
            }
            continue;
          }
          this.warnCircle(x, y, R, fall, 16724016, () => {
            this.explode(x, y, R, 8 + this.time / 40, hz.color);
            this.explodeFriendly(x, y, R, 30 + this.level * 2, null, 160, hz.color, false);
          });
          const f = this.spawnFx(hz.frame, x, y + 340, fall, PX * 1.5, 0);
          f.vy = -340 / fall;
        }
      }
      // 龙卷风：从屏幕外横穿而过，卷起沿途的怪物，碰到奶蛙会被甩开并受伤
      spawnTornado() {
        const a = Math.random() * TAU2, R = Math.hypot(this.vw, this.vh) / 2 + 60;
        const x = this.px + Math.cos(a) * R, y = this.py + Math.sin(a) * R;
        const to = Math.atan2(this.py - y, this.px - x) + (Math.random() - 0.5) * 0.5;
        const sp = mkSprite(this.bulletLayer, "tornado_0", PX * 1.6);
        sp.node.setPosition(x, y);
        this.tornados.push({ x, y, vx: Math.cos(to) * 120, vy: Math.sin(to) * 120, t: 13, sp });
        this.onBanner("\u9F99\u5377\u98CE\u6765\u4E86!", new Color(230, 200, 130, 255));
        Sound.play("roar");
      }
      updateTornados(dt) {
        if (!this.tornados.length) return;
        for (const t of this.tornados) {
          t.t -= dt;
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          t.sp.node.setPosition(t.x, t.y + 40);
          t.sp.spriteFrame = Art.f(Math.floor(this.time * 10) % 2 ? "tornado_1" : "tornado_0");
          t.sp.color = tmpColor.set(255, 255, 255, Math.floor(255 * Math.min(1, t.t)));
          const R = 58;
          for (const e of this.grid.query(t.x, t.y, R + 30, this.qbuf).slice()) {
            if (!e.alive || e.def.prop || e.def.boss || Math.hypot(e.x - t.x, e.y - t.y) > R + e.def.radius) continue;
            if (this.time < (e.hits.get("tornado") || 0)) continue;
            e.hits.set("tornado", this.time + 0.5);
            this.hurtEnemy(e, 30 + this.level * 2, 500, t.x, t.y, null);
          }
          const dx = this.px - t.x, dy = this.py - t.y, d2 = Math.hypot(dx, dy) || 1;
          if (d2 < R) {
            this.px += (-dy / d2 * 260 + dx / d2 * 200) * dt;
            this.py += (dx / d2 * 260 + dy / d2 * 200) * dt;
            this.hurtPlayer(6 + this.time / 60);
          }
          if (Math.random() < 0.5) this.burst(t.x + (Math.random() - 0.5) * 50, t.y, 14205072, 1, 120);
          if (t.t <= 0) t.sp.node.destroy();
        }
        this.tornados = this.tornados.filter((t) => t.t > 0);
      }
      // 狂风：每 20~26 秒刮一次，持续 4 秒，把奶蛙、怪物和宝石一起吹向同一个方向
      updateWind(dt) {
        if (!this.stage.wind) return;
        if (this.windOn > 0) {
          this.windOn -= dt;
          this.px += this.windX * 70 * dt;
          this.py += this.windY * 70 * dt;
          for (const e of this.enemies) if (e.alive && !e.def.prop && !e.def.boss) {
            e.x += this.windX * 95 * dt;
            e.y += this.windY * 95 * dt;
          }
          if (Math.random() < 0.8) {
            const k = (Math.random() - 0.5) * this.vh;
            this.burst(this.px - this.windX * this.vw * 0.4 - this.windY * k, this.py - this.windY * this.vh * 0.4 + this.windX * k, 15257760, 1, 60);
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
        this.onBanner(`\u72C2\u98CE\u6765\u88AD! ${["\u2192", "\u2191", "\u2190", "\u2193"][Math.round(a / (Math.PI / 2)) % 4]}`, new Color(230, 210, 150, 255));
        Sound.play("dash");
      }
      updateEvents(dt) {
        this.updateHazard(dt);
        this.updateTornados(dt);
        this.updateWind(dt);
        this.brazierT -= dt;
        if (this.brazierT <= 0) {
          this.brazierT = 10;
          let props = 0;
          for (const e of this.enemies) if (e.alive && e.def.prop) props++;
          if (props < 3) {
            const a = Math.random() * Math.PI * 2, r = 260 + Math.random() * 260;
            this.spawnEnemy("brazier", this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, true);
          }
        }
        this.eliteT -= dt;
        this.altarT -= dt;
        if (this.altarT <= 0) {
          this.altarT = (140 + Math.random() * 30) * (this.hasB("epicfan") ? 0.6 : 1);
          const a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 120;
          const al = this.spawnEnemy("altar", this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, true);
          al.maxHp = al.hp = ENEMIES.altar.hp * (1 + this.time / 120);
          this.onBanner("\u795E\u5175\u796D\u575B\u51FA\u73B0\u4E86! \u6253\u788E\u5B83!", new Color(255, 220, 110, 255));
          Sound.play("power");
        }
        this.shrineT -= dt;
        if (this.shrineT <= 0 && !this.boss && !this.bloodMoon && !this.trial) {
          this.shrineT = 140 + Math.random() * 30;
          const a = Math.random() * Math.PI * 2, r = 220 + Math.random() * 80;
          this.spawnPickup("shrine", this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, this.time + 45);
          this.onBanner("\u8BD5\u70BC\u77F3\u7891\u51FA\u73B0\u4E86! \u89E6\u78B0\u5F00\u542F\u6311\u6218", new Color(255, 120, 100, 255));
          Sound.play("boss");
        }
        this.updateTrial(dt);
        this.updateItems(dt);
        this.goldratT -= dt;
        if (this.goldratT <= 0) {
          this.goldratT = 100;
          const a = Math.random() * Math.PI * 2, r = 260;
          const g2 = this.spawnEnemy("goldrat", this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, true);
          g2.maxHp = g2.hp = ENEMIES.goldrat.hp * (1 + this.time / 120);
          g2.sp.color = C_ELITE;
          this.onBanner("\u91D1\u9F20\u51FA\u73B0! \u5FEB\u8FFD!", new Color(255, 214, 90, 255));
          Sound.play("coin");
        }
        if (this.potionT > 0) {
          this.potionT -= dt;
          this.playerSp.color = Math.floor(this.time * 10) % 2 ? C_POTION : C_WHITE;
          if (Math.random() < 0.3) this.burst(this.px, this.py - 10, 16728160, 1, 60);
        }
        if (this.ghostT > 0) this.ghostT -= dt;
        if (this.shieldHits > 0) {
          if (!this.shieldFx) this.shieldFx = mkSprite(this.auraLayer, "aura", 1.6);
          this.shieldFx.node.active = true;
          this.shieldFx.node.setPosition(this.px, this.py);
          this.shieldFx.color = C_SHIELD;
          const sc = 1.5 + Math.sin(this.time * 5) * 0.05;
          this.shieldFx.node.setScale(sc, sc, 1);
        } else if (this.shieldFx) this.shieldFx.node.active = false;
        if (this.hasB("overload")) {
          if (this.overloadOn > 0) {
            this.overloadOn -= dt;
            if (Math.random() < 0.4) this.burst(this.px, this.py - 10, 8442111, 1, 120);
          } else {
            this.overloadT -= dt;
            if (this.overloadT <= 0) {
              this.overloadT = 30;
              this.overloadOn = 8;
              this.onBanner("\u8D85\u8F7D!", new Color(140, 210, 255, 255));
              Sound.play("zap");
            }
          }
        }
        if (this.hasB("timerift")) {
          this.riftT -= dt;
          if (this.riftT <= 0) {
            this.riftT = 25;
            this.freezeAll(3);
            this.onBanner("\u65F6\u95F4\u88C2\u9699!", new Color(160, 220, 255, 255));
          }
        }
        if (this.hasB("magstorm")) {
          this.magstormT -= dt;
          if (this.magstormT <= 0) {
            this.magstormT = 45;
            for (const g2 of this.pickups) if (g2.alive && (g2.kind === "gem" || g2.kind === "coin")) g2.pulled = true;
          }
        }
        if (this.hasteT > 0) {
          this.hasteT -= dt;
          if (Math.random() < 0.25) this.burst(this.px, this.py - 10, 8446207, 1, 100);
        }
        if (this.cloverT > 0) {
          this.cloverT -= dt;
          if (Math.random() < 0.2) this.burst(this.px, this.py + 10, 7397488, 1, 80);
        }
        if (this.arcaneT > 0) {
          this.arcaneT -= dt;
          if (Math.random() < 0.3) this.burst(this.px, this.py, 11567359, 1, 90);
        }
        if (this.fireT > 0) {
          this.fireT -= dt;
          if (!this.fireFx) this.fireFx = mkSprite(this.auraLayer, "aura", 1.6);
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
            this.burst(this.px + Math.cos(a) * R * 0.8, this.py + Math.sin(a) * R * 0.8, 16744496, 3, 120);
          }
        } else if (this.fireFx) this.fireFx.node.active = false;
        this.updateTrait(dt);
      }
      freezeAll(t) {
        for (const e of this.enemies) if (e.alive) this.freezeEnemy(e, t);
        const f = this.spawnFx("aura", this.px, this.py, 0.6, 2, 10);
        f.sp.color = C_FROZEN;
        Sound.play("freeze");
      }
      // 圣十字：清屏
      nukeScreen() {
        for (const e of this.enemies) {
          if (!e.alive || e.def.prop || Math.abs(e.x - this.px) > this.vw / 2 + 40 || Math.abs(e.y - this.py) > this.vh / 2 + 40) continue;
          if (e.def.boss) this.hurtEnemy(e, Math.round(e.maxHp * 0.08), 0, this.px, this.py, null);
          else this.hurtEnemy(e, e.hp + 1, 0, this.px, this.py, null);
        }
        const f = this.spawnFx("aura", this.px, this.py, 0.7, 2, 14);
        f.sp.color = colorOf(16773280);
        this.hitstop = 0.15;
        this.addShake(0.4, 10);
        Sound.play("bigkill");
      }
      // ------------------------------------------------------------------ 大招
      // 持续型大招释放期间不再充能，防止自我循环（地毯轰炸的爆炸、财神到的金币）
      get ultBusy() {
        return this.ultT > 0 || this.dashT > 0;
      }
      // 充能先存入 ultBank，由 updateUlt 匀速注入；instant = true 时立刻生效（能量电池）
      chargeUlt(v, instant = false) {
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
            this.onBanner(`\u5927\u62DB\u300C${this.char.ultName}\u300D\u5C31\u7EEA!`, new Color(255, 220, 110, 255));
          }
          this.burst(this.px, this.py, 16769152, 12, 220);
          Sound.play("power");
        }
      }
      // 充能速度倍率：能量涌动卡牌、能量核心被动
      ultRate() {
        return (this.hasB("ultfan") ? 1.5 : 1) * (1 + this.stats.ultCharge);
      }
      useUlt() {
        if (this.ult < 1 || this.dead || this.ultBusy) return false;
        this.ult = 0;
        this.ultCasts++;
        this.ultTick = 0;
        if (this.hasB("ultfan")) this.ultBuffT = 5;
        this.spawnFx("aura", this.px, this.py, 0.4, 1, 5).sp.color = colorOf(16769152);
        this.addShake(0.25, 6);
        this.onBanner(this.char.ultName + "!", new Color(255, 200, 90, 255));
        this.castUlt();
        return true;
      }
      // 技能伤害：随等级成长，吃伤害加成
      skillDmg(base, per) {
        return Math.max(1, Math.round((base + this.level * per) * this.stats.might * this.dmgMul() * (0.9 + Math.random() * 0.2)));
      }
      later(t, fn) {
        this.tasks.push({ t, fn });
      }
      updateTasks(dt) {
        if (!this.tasks.length) return;
        const due = [];
        this.tasks = this.tasks.filter((k) => {
          k.t -= dt;
          if (k.t > 0) return true;
          due.push(k.fn);
          return false;
        });
        for (const f of due) f();
      }
      castUlt() {
        const px = this.px, py = this.py;
        switch (this.char.id) {
          case "hunter":
            this.ultT = 2.5;
            break;
          case "mage":
            for (let i = 0; i < 30; i++) {
              this.later(i * 0.05, () => {
                const a = i * 2.39996;
                const p = this.spawnProj("homing", "bolt", null, this.px, this.py, Math.cos(a) * 420, Math.sin(a) * 420, this.skillDmg(12, 2.5), 1, 3, 10);
                p.turn = 7;
                p.sp.color = colorOf(13668607);
                p.node.setScale(PX * 1.3, PX * 1.3, 1);
                if (i % 3 === 0) Sound.play("shoot");
              });
            }
            this.ultT = 1.6;
            break;
          case "rogue":
            this.dashT = 0.28;
            this.invulnT = 0.6;
            Sound.play("dash");
            break;
          case "knight":
            this.ultT = 3;
            this.invulnT = 3;
            Sound.play("slam");
            break;
          case "nun": {
            const sp = mkSprite(this.zoneLayer, "aura", 340 / 64);
            sp.node.setPosition(px, py);
            this.sanctum = { x: px, y: py, sp };
            this.ultT = 6;
            Sound.play("heal");
            break;
          }
          case "pyro": {
            const c = this.densest() || { x: px + this.dirX * 150, y: py + this.dirY * 150 };
            this.warnCircle(c.x, c.y, 190, 0.8, 16752688);
            const f = this.spawnFx("meteor", c.x, c.y + 360, 0.8, PX * 4, 0);
            f.vy = -360 / 0.8;
            this.later(0.8, () => {
              this.explodeFriendly(c.x, c.y, 190, this.skillDmg(70, 9), null, 500, 16736288);
              for (let i = 0; i < 6; i++) {
                const a = i / 6 * TAU2;
                this.spawnPZone("fire", null, c.x + Math.cos(a) * 110, c.y + Math.sin(a) * 110, 55, 5, this.skillDmg(6, 1));
              }
              this.spawnPZone("fire", null, c.x, c.y, 70, 5, this.skillDmg(6, 1));
              this.hitstop = 0.12;
              this.addShake(0.6, 14);
            });
            this.ultT = 1.2;
            Sound.play("fire");
            break;
          }
          case "bomber": {
            const nx = -this.dirY, ny = this.dirX;
            for (let i = 0; i < 12; i++) {
              const d2 = 50 + i * 45, side = (i % 2 ? 1 : -1) * 26;
              const p = this.spawnProj("ubomb", "bomb_0", null, px + this.dirX * d2 + nx * side, py + this.dirY * d2 + ny * side, 0, 0, this.skillDmg(30, 5), 0, 0.4 + i * 0.07, 0);
              p.node.setScale(PX * 1.2, PX * 1.2, 1);
            }
            this.ultT = 1.5;
            Sound.play("throw");
            break;
          }
          case "sage":
            this.ultT = 4;
            break;
          case "druid": {
            for (const e of this.grid.query(px, py, 360, this.qbuf).slice()) {
              if (!e.alive || e.def.prop || e.def.boss) continue;
              const dx = px - e.x, dy = py - e.y, d2 = Math.hypot(dx, dy) || 1;
              if (d2 > 340) continue;
              e.frozen = 0;
              const k = Math.max(0, d2 - 50) * 10;
              e.kx = dx / d2 * k;
              e.ky = dy / d2 * k;
            }
            this.later(0.35, () => {
              for (const e of this.grid.query(this.px, this.py, 160, this.qbuf).slice()) {
                if (Math.hypot(e.x - this.px, e.y - this.py) < 140 + e.def.radius) this.freezeEnemy(e, 2.5);
              }
              this.burst(this.px, this.py, 6340688, 24, 300);
            });
            this.heal(this.stats.maxHp * 0.15);
            const f = this.spawnFx("aura", px, py, 0.6, 680 / 64 * 0.5, -0.8);
            f.sp.color = colorOf(6340688);
            this.ultT = 0.5;
            Sound.play("heal");
            break;
          }
          case "prism":
            for (let v = 0; v < 3; v++) {
              this.later(v * 0.3, () => {
                for (let i = 0; i < 12; i++) {
                  const a = i / 12 * TAU2 + v * 0.13;
                  this.beamHit(this.px, this.py, a, 600, 14, this.skillDmg(16, 2.5), [16736384, 16760928, 8454032, 7381247][i % 4]);
                }
                Sound.play("beam");
              });
            }
            this.ultT = 1;
            break;
          case "fu": {
            let n = 0;
            for (const e of this.enemies.slice()) {
              if (!e.alive || e.def.prop || Math.hypot(e.x - px, e.y - py) > 280) continue;
              if (e.def.boss || e.elite) {
                this.hurtEnemy(e, Math.round(e.maxHp * (e.elite ? 0.3 : 0.05)), 0, px, py, null);
                continue;
              }
              if (n++ < 70) this.spawnPickup("coin", e.x, e.y, 1 + Math.floor(Math.random() * 2), true);
              this.burst(e.x, e.y, 16764992, 3, 160);
              this.hurtEnemy(e, e.hp + 1, 0, px, py, null);
            }
            this.later(0.3, () => {
              for (const g2 of this.pickups) if (g2.alive && (g2.kind === "gem" || g2.kind === "coin")) g2.pulled = true;
            });
            const f = this.spawnFx("aura", px, py, 0.6, 2, 7.5);
            f.sp.color = colorOf(16764992);
            this.ultT = 3;
            Sound.play("chest");
            break;
          }
          case "santa": {
            const dir = this.faceX, y = py + 60;
            for (let i = 0; i < 10; i++) {
              const x = px - dir * this.vw / 2 + dir * (i + 0.5) * this.vw / 10, yy = y - i % 2 * 120;
              this.later(i * 0.12, () => {
                const g2 = this.spawnFx("gift", x, yy + 160, 0.25, PX * 1.4, 0);
                g2.vy = -640;
                this.later(0.25, () => this.explodeFriendly(x, yy, 85, this.skillDmg(35, 5), null, 260, 16732240));
              });
            }
            const a = Math.random() * TAU2;
            this.spawnPickup(BUFF_DROPS[Math.floor(Math.random() * BUFF_DROPS.length)], px + Math.cos(a) * 60, py + Math.sin(a) * 60, 0, true);
            this.ultT = 1.6;
            Sound.play("chest");
            break;
          }
        }
      }
      // 影袭结束：在终点爆发一圈飞刀
      rogueFinale() {
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * TAU2;
          const p = this.spawnProj("knife", "knife", null, this.px, this.py, Math.cos(a) * 620, Math.sin(a) * 620, this.skillDmg(15, 3), 3, 1.2, 10);
          p.node.angle = a * 180 / Math.PI;
          p.node.setScale(PX * 1.2, PX * 1.2, 1);
          p.sp.color = colorOf(12624127);
        }
        this.burst(this.px, this.py, 8413376, 20, 300);
        Sound.play("knife");
      }
      // 持续型大招的逐帧效果 + 基础充能
      updateUlt(dt) {
        const ch = this.char.charge;
        if (this.ultBuffT > 0) this.ultBuffT -= dt;
        this.chargeUlt(dt / 100 + (ch === "time" ? dt / 60 : 0) + (ch === "still" && !this.moving ? dt / 15 : 0));
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
          case "hunter": {
            if (this.ultTick > 0) break;
            this.ultTick = 0.25;
            const R = 150 * this.stats.area;
            for (const e of this.grid.query(px, py, R + 30, this.qbuf).slice()) {
              if (e.alive && !e.def.prop && Math.hypot(e.x - px, e.y - py) < R + e.def.radius) this.hurtEnemy(e, this.skillDmg(7, 1.4), 180, px, py, null);
            }
            for (let k = 0; k < 2; k++) {
              const f = this.spawnFx("whip", px, py, 0.18, 1, 0);
              f.node.getComponent(UITransform).setAnchorPoint(0, 0.5);
              f.node.angle = this.time * 520 + k * 180;
              f.sx = R / 64;
              f.sy = PX * 1.3;
              f.stretch = 0.3;
              f.node.setScale(f.sx * 0.15, f.sy, 1);
              f.sp.color = C_EVO_RED;
            }
            Sound.play("whip");
            break;
          }
          case "knight":
            if (this.ultTick > 0) break;
            this.ultTick = 0.5;
            this.explodeFriendly(px, py, 135, this.skillDmg(15, 3), null, 420, 16765024, false);
            Sound.play("slam");
            break;
          case "sage": {
            if (this.ultTick > 0) break;
            this.ultTick = 0.15;
            const b = this.boss;
            const t = b && b.alive && Math.random() < 0.3 && Math.abs(b.x - px) < this.vw / 2 && Math.abs(b.y - py) < this.vh / 2 ? b : this.randomOnScreen();
            if (!t) break;
            const f = this.spawnFx("lightning", t.x, t.y, 0.25, PX, 0);
            f.node.getComponent(UITransform).setAnchorPoint(0.5, 0);
            f.sp.color = colorOf(13676799);
            this.explodeFriendly(t.x, t.y, 55, this.skillDmg(22, 3), null, 60, 12624127, false);
            Sound.play("lightning");
            break;
          }
          case "nun": {
            const z = this.sanctum;
            if (!z) break;
            const R = 170;
            const pulse = 1 + Math.sin(this.time * 5) * 0.04;
            z.sp.node.setScale(R * 2 / 64 * pulse, R * 2 / 64 * pulse, 1);
            z.sp.color = tmpColor.set(255, 230, 140, Math.floor(200 * Math.min(1, this.ultT)));
            if (Math.hypot(px - z.x, py - z.y) < R) this.heal(3 * dt);
            for (const b of this.bullets) {
              if (b.alive && Math.hypot(b.x - z.x, b.y - z.y) < R) {
                b.alive = false;
                this.burst(b.x, b.y, 16773280, 3, 120);
              }
            }
            if (this.ultTick <= 0) {
              this.ultTick = 0.5;
              for (const e of this.grid.query(z.x, z.y, R + 30, this.qbuf).slice()) {
                if (e.alive && !e.def.prop && Math.hypot(e.x - z.x, e.y - z.y) < R + e.def.radius) this.hurtEnemy(e, this.skillDmg(8, 1.5), 120, z.x, z.y, null);
              }
            }
            if (this.ultT <= 0) {
              z.sp.node.destroy();
              this.sanctum = null;
            }
            break;
          }
        }
      }
      // 敌人最密集的位置（屏幕内有 Boss 时优先 Boss）
      densest() {
        const b = this.boss;
        if (b && b.alive && Math.abs(b.x - this.px) < this.vw / 2 && Math.abs(b.y - this.py) < this.vh / 2) return { x: b.x, y: b.y };
        let best = null, bn = -1;
        for (let k = 0; k < 10; k++) {
          const e = this.randomOnScreen();
          if (!e) break;
          const n = this.grid.query(e.x, e.y, 110, this.refractBuf).length;
          if (n > bn) {
            bn = n;
            best = e;
          }
        }
        return best ? { x: best.x, y: best.y } : null;
      }
      // 直线光束：贯穿线上所有敌人
      beamHit(x, y, a, len, half, dmg, color) {
        const dx = Math.cos(a), dy = Math.sin(a);
        for (const e of this.grid.query(x + dx * len / 2, y + dy * len / 2, len / 2 + 40, this.qbuf).slice()) {
          if (!e.alive || e.def.prop) continue;
          const rx = e.x - x, ry = e.y - y, along = rx * dx + ry * dy;
          if (along < 0 || along > len || Math.abs(rx * dy - ry * dx) > half + e.def.radius) continue;
          this.hurtEnemy(e, dmg, 40, x, y, null);
        }
        this.lineFx(x, y, x + dx * len, y + dy * len, color, half * 2 + 6);
        this.lineFx(x, y, x + dx * len, y + dy * len, 16777215, Math.max(3, half * 0.7));
      }
      rainbow(t) {
        return this.rainbowC.set(Math.round(170 + 85 * Math.sin(t)), Math.round(170 + 85 * Math.sin(t + 2.1)), Math.round(170 + 85 * Math.sin(t + 4.2)), 255);
      }
      // ------------------------------------------------------------------ 神兵（30 秒史诗武器）
      epicIs(id) {
        return !!this.epic && this.epic.id === id;
      }
      spawnEpicPickup(x, y) {
        const pool = EPICS.filter((e) => e !== this.epic);
        const d2 = pool[Math.floor(Math.random() * pool.length)];
        this.spawnPickup("epic_" + d2.id, x, y, 0, true);
      }
      startEpic(def) {
        this.endEpic();
        this.epic = def;
        this.epicT = this.epicMax = EPIC_TIME * (this.hasB("epicfan") ? 1.5 : 1) * this.stats.buffTime;
        this.epicTick = this.epicTick2 = 0;
        this.epicsUsed++;
        this.discover("x:" + def.id);
        this.onBanner(`\u795E\u5175\u964D\u4E34 \xB7 ${def.name}!`, new Color(255, 215, 90, 255));
        this.spawnFx("aura", this.px, this.py, 0.5, 1.5, 5).sp.color = colorOf(def.color);
        this.burst(this.px, this.py, def.color, 30, 360);
        this.addShake(0.3, 6);
        Sound.play("evolve");
      }
      endEpic() {
        this.epic = null;
        this.epicT = 0;
        for (const h of this.hammers) h.node.active = false;
      }
      updateEpic(dt) {
        this.updateHoles(dt);
        const ep = this.epic;
        if (!ep) return;
        this.epicT -= dt;
        if (this.epicT <= 0) {
          this.onBanner(`${ep.name}\u7684\u529B\u91CF\u6D88\u6563\u4E86`, new Color(200, 200, 220, 255));
          this.endEpic();
          return;
        }
        this.epicTick -= dt;
        const px = this.px, py = this.py;
        switch (ep.id) {
          case "thor": {
            while (this.hammers.length < 2) this.hammers.push(mkSprite(this.projLayer, "hammer", PX * 1.5));
            for (let i = 0; i < 2; i++) {
              const h = this.hammers[i], a = this.time * 4 + i * Math.PI;
              const hx = px + Math.cos(a) * 110, hy = py + Math.sin(a) * 110;
              h.node.active = true;
              h.node.setPosition(hx, hy);
              h.node.angle = this.time * 900 % 360;
              for (const e of this.grid.query(hx, hy, 60, this.qbuf).slice()) {
                if (!e.alive || e.def.prop || Math.hypot(e.x - hx, e.y - hy) > 26 + e.def.radius) continue;
                if (this.time < (e.hits.get("thor") || 0)) continue;
                e.hits.set("thor", this.time + 0.4);
                this.hurtEnemy(e, this.skillDmg(18, 3), 320, px, py, null);
              }
            }
            if (this.epicTick <= 0) {
              this.epicTick = 0.35;
              const t = this.randomOnScreen();
              if (t) {
                const f = this.spawnFx("lightning", t.x, t.y, 0.25, PX, 0);
                f.node.getComponent(UITransform).setAnchorPoint(0.5, 0);
                f.sp.color = colorOf(8440063);
                this.explodeFriendly(t.x, t.y, 45, this.skillDmg(25, 3), null, 80, 8440063, false);
                Sound.play("lightning");
              }
            }
            break;
          }
          case "gatling": {
            if (this.epicTick > 0) break;
            this.epicTick = 1 / 16;
            const t = this.nearestEnemy();
            const a = (t ? Math.atan2(t.y - py, t.x - px) : Math.atan2(this.dirY, this.dirX)) + (Math.random() - 0.5) * 0.25;
            const p = this.spawnProj("gat", "starshot", null, px, py, Math.cos(a) * 720, Math.sin(a) * 720, this.skillDmg(7, 1.2), 2, 1.2, 8);
            p.node.setScale(PX, PX, 1);
            p.rotSpeed = 720;
            Sound.play("pew");
            break;
          }
          case "excalibur": {
            if (this.epicTick > 0) break;
            this.epicTick = 1;
            const R = 190 * this.stats.area;
            for (const e of this.grid.query(px, py, R + 30, this.qbuf).slice()) {
              if (e.alive && !e.def.prop && Math.hypot(e.x - px, e.y - py) < R + e.def.radius) this.hurtEnemy(e, this.skillDmg(35, 5), 450, px, py, null);
            }
            for (let i = 0; i < 8; i++) {
              const f = this.spawnFx("holysword", px, py, 0.3, PX * R / 96, 0.15);
              f.node.getComponent(UITransform).setAnchorPoint(0, 0.5);
              f.node.angle = i * 45 + this.time * 60;
            }
            this.spawnFx("aura", px, py, 0.3, R * 2 / 64 * 0.6, 0.7).sp.color = colorOf(16773280);
            this.addShake(0.12, 4);
            Sound.play("slam");
            break;
          }
          case "blackhole": {
            if (this.epicTick > 0) break;
            this.epicTick = 4.5;
            const c = this.densest();
            if (c) this.spawnHole(c.x, c.y);
            break;
          }
          case "dragon": {
            if (this.epicTick <= 0) {
              this.epicTick = 0.12;
              const a0 = Math.atan2(this.dirY, this.dirX), L = 240;
              for (const e of this.grid.query(px + this.dirX * L / 2, py + this.dirY * L / 2, L / 2 + 40, this.qbuf).slice()) {
                if (!e.alive || e.def.prop) continue;
                const rx = e.x - px, ry = e.y - py;
                if (Math.hypot(rx, ry) > L + e.def.radius) continue;
                let da = Math.atan2(ry, rx) - a0;
                while (da > Math.PI) da -= TAU2;
                while (da < -Math.PI) da += TAU2;
                if (Math.abs(da) < 0.45) this.hurtEnemy(e, this.skillDmg(8, 1.5), 60, px, py, null);
              }
              for (let k = 0; k < 3; k++) {
                const d2 = 40 + Math.random() * (L - 40), a = a0 + (Math.random() - 0.5) * 0.7;
                this.spawnFx("fireball", px + Math.cos(a) * d2, py + Math.sin(a) * d2, 0.3, PX * (0.8 + d2 / L * 1.4), 0.6);
              }
              Sound.play("fire");
            }
            this.epicTick2 -= dt;
            if (this.epicTick2 <= 0) {
              this.epicTick2 = 0.5;
              this.spawnPZone("fire", null, px + this.dirX * 150, py + this.dirY * 150, 40, 2.5, this.skillDmg(4, 0.8));
            }
            break;
          }
          case "meteor": {
            if (this.epicTick > 0) break;
            this.epicTick = 0.45;
            const t = this.randomOnScreen();
            if (!t) break;
            const x = t.x, y = t.y;
            const f = this.spawnFx("meteor", x, y + 300, 0.4, PX * 1.6, 0);
            f.vy = -300 / 0.4;
            this.later(0.4, () => this.explodeFriendly(x, y, 75, this.skillDmg(40, 5), null, 260, 16747072));
            break;
          }
          case "unicorn": {
            if (this.epicTick > 0 || !this.moving) break;
            this.epicTick = 0.1;
            const z = this.spawnPZone("holy", null, px, py - 20, 28, 1.6, this.skillDmg(5, 1));
            const c = this.rainbow(this.time * 3);
            z.tint = c.r << 16 | c.g << 8 | c.b;
            break;
          }
        }
      }
      // 黑洞：吸住周围敌人，2.6 秒后内爆
      spawnHole(x, y) {
        const sp = this.holePool.pop() || mkSprite(this.zoneLayer, "vortex", 1);
        sp.node.active = true;
        sp.node.setPosition(x, y);
        sp.node.setScale(0.1, 0.1, 1);
        this.holes.push({ x, y, t: 2.6, tick: 0, sp });
        Sound.play("teleport");
      }
      updateHoles(dt) {
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
            if (!e.def.boss) {
              const st = Math.min(od, 300 * dt);
              e.x += ox / od * st;
              e.y += oy / od * st;
            }
            if (hurt && od < 80) this.hurtEnemy(e, this.skillDmg(6, 1), 0, h.x, h.y, null);
          }
          if (h.t <= 0) {
            this.explodeFriendly(h.x, h.y, 150, this.skillDmg(50, 6), null, 500, 11563263);
            h.sp.node.active = false;
            this.holePool.push(h.sp);
          }
        }
        this.holes = this.holes.filter((h) => h.t > 0);
      }
      // ------------------------------------------------------------------ 新场景道具 / 试炼
      updateItems(dt) {
        if (this.giantT > 0) this.giantT -= dt;
        if (this.bootsT > 0) {
          this.bootsT -= dt;
          this.bootsTick -= dt;
          if (this.moving && this.bootsTick <= 0) {
            this.bootsTick = 0.12;
            this.spawnPZone("fire", null, this.px, this.py - 24, 22, 2, this.skillDmg(6, 1));
          }
        }
        if (this.bankT > 0) {
          this.bankT -= dt;
          this.bankTick -= dt;
          if (this.bankTick <= 0) {
            this.bankTick = 0.15;
            const a = Math.random() * TAU2, r = 60 + Math.random() * 80;
            this.spawnPickup("coin", this.px + Math.cos(a) * r, this.py + Math.sin(a) * r, 1 + Math.floor(Math.random() * 2), true);
          }
        }
        if (this.decoyT > 0 && this.decoySp) {
          this.decoyT -= dt;
          const sp = this.decoySp;
          sp.spriteFrame = Art.f(this.char.sprite + "_" + (Math.floor(this.time * 6) % 2 ? 1 : 2));
          sp.color = tmpColor.set(150, 230, 255, this.decoyT < 2 && Math.floor(this.time * 10) % 2 ? 90 : 190);
          if (this.decoyT <= 0) {
            sp.node.active = false;
            this.explodeFriendly(this.decoyX, this.decoyY, 150, this.skillDmg(40, 5), null, 450, 8446207);
            this.addShake(0.3, 8);
          }
        }
      }
      // 幻影蛙：在身后放一只诱饵，附近的怪物都去追它
      spawnDecoy() {
        if (!this.decoySp) this.decoySp = mkSprite(this.auraLayer, this.char.sprite + "_0", HERO_SCALE);
        const a = Math.atan2(this.dirY, this.dirX) + Math.PI;
        this.decoyX = this.px + Math.cos(a) * 90;
        this.decoyY = this.py + Math.sin(a) * 90;
        this.decoyT = 8 * this.stats.buffTime;
        this.decoySp.node.active = true;
        this.decoySp.node.setPosition(this.decoyX, this.decoyY);
        this.burst(this.decoyX, this.decoyY, 8446207, 16, 220);
        this.onBanner("\u5E7B\u5F71\u86D9! \u602A\u7269\u88AB\u5F15\u5F00\u4E86", new Color(140, 220, 255, 255));
        Sound.play("teleport");
      }
      // 命运骰子：大多是好事，小概率招来精英怪
      rollDice() {
        const r = Math.random();
        let txt;
        if (r < 0.22) {
          this.spawnEpicPickup(this.px, this.py + 40);
          txt = "\u5927\u5409! \u795E\u5175\u964D\u4E34";
        } else if (r < 0.42) {
          this.gainXp(Math.max(0, this.xpNext - this.xp));
          txt = "\u5409! \u7B49\u7EA7 +1";
        } else if (r < 0.58) {
          this.chainBoomQueue.push(() => this.nukeScreen());
          txt = "\u5409! \u661F\u5149\u5BA1\u5224";
        } else if (r < 0.7) {
          this.heal(this.stats.maxHp);
          txt = "\u5409! \u751F\u547D\u56DE\u6EE1";
        } else if (r < 0.85) {
          for (let i = 0; i < 3; i++) this.spawnPickup("coinbag", this.px, this.py, 15, true);
          txt = "\u5C0F\u5409! \u91D1\u5E01\u888B \xD73";
        } else {
          let wave = WAVES[0];
          for (const w of WAVES) if (this.time >= w.t) wave = w;
          const types = wave.types.filter((k) => !ENEMIES[k].ranged);
          for (let i = 0; i < 3; i++) {
            const a = i / 3 * TAU2 + Math.random(), R = 300;
            const e = this.spawnEnemy(types[i % types.length], this.px + Math.cos(a) * R, this.py + Math.sin(a) * R, true);
            if (e) this.eliteify(e);
          }
          txt = "\u51F6! \u7CBE\u82F1\u602A\u6765\u88AD";
        }
        this.onBanner("\u547D\u8FD0\u9AB0\u5B50 \xB7 " + txt, new Color(255, 200, 120, 255));
        Sound.play("card");
      }
      startTrial(x, y) {
        const need = 40 + Math.floor(this.time / 12);
        this.trial = { t: 20, need, got: 0 };
        this.spawnFx("aura", x, y, 0.5, 1.5, 6).sp.color = colorOf(16732224);
        this.burst(x, y, 16732224, 24, 320);
        this.onBanner(`\u8BD5\u70BC\u5F00\u59CB! 20 \u79D2\u5185\u51FB\u8D25 ${need} \u53EA\u602A\u7269`, new Color(255, 100, 90, 255));
        Sound.play("roar");
        this.addShake(0.4, 8);
        let wave = WAVES[0];
        for (const w of WAVES) if (this.time >= w.t) wave = w;
        const types = wave.types.filter((k) => !ENEMIES[k].ranged);
        const R = Math.hypot(this.vw, this.vh) / 2 + 30, n = 26;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU2;
          this.spawnEnemy(types[i % types.length], this.px + Math.cos(a) * R, this.py + Math.sin(a) * R, true);
        }
      }
      updateTrial(dt) {
        const tr = this.trial;
        if (!tr) return;
        tr.t -= dt;
        if (tr.got >= tr.need) {
          this.trial = null;
          this.trialsWon++;
          this.pendingChests++;
          this.spawnEpicPickup(this.px, this.py + 50);
          this.spawnPickup("coinbag", this.px, this.py, 25, true);
          this.spawnFx("aura", this.px, this.py, 0.6, 2, 8).sp.color = colorOf(16769152);
          this.burst(this.px, this.py, 16769152, 30, 380);
          this.onBanner("\u8BD5\u70BC\u6210\u529F! \u83B7\u5F97\u5B9D\u7BB1\u4E0E\u795E\u5175", new Color(255, 220, 90, 255));
          Sound.play("chest");
        } else if (tr.t <= 0) {
          this.trial = null;
          this.onBanner("\u8BD5\u70BC\u5931\u8D25\u2026", new Color(190, 180, 200, 255));
        }
      }
      // ------------------------------------------------------------------ 拾取物
      spawnPickup(kind, x, y, value, pop = false) {
        if (kind === "gem" && this.pickups.length > 400) {
          this.stashXp += value;
          return;
        }
        let p = this.pickupPool.pop();
        if (!p) {
          p = new Pickup();
          p.sp = mkSprite(this.pickupLayer, "gem_blue");
          p.node = p.sp.node;
        }
        let frame = kind;
        if (kind === "gem") frame = value >= 20 ? "gem_red" : value >= 3 ? "gem_green" : "gem_blue";
        p.node.setScale(PX, PX, 1);
        p.sp.spriteFrame = Art.f(frame);
        p.kind = kind;
        p.value = value;
        p.x = x;
        p.y = y;
        p.pulled = false;
        p.vel = 0;
        const pa = Math.random() * Math.PI * 2, ps = pop ? 90 + Math.random() * 90 : 0;
        p.vx = Math.cos(pa) * ps;
        p.vy = Math.sin(pa) * ps;
        p.alive = true;
        p.node.active = true;
        p.node.setPosition(x, y);
        this.pickups.push(p);
      }
      freePickup(p) {
        p.alive = false;
        p.node.active = false;
        this.pickupPool.push(p);
      }
      updatePickups(dt) {
        const mag = this.stats.magnet;
        const farX = this.vw / 2 + 500, farY = this.vh / 2 + 500;
        for (const p of this.pickups) {
          if (p.alive && p.kind === "gem" && (Math.abs(p.x - this.px) > farX || Math.abs(p.y - this.py) > farY)) {
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
          this.spawnPickup("gem", this.px + Math.cos(a) * 220, this.py + Math.sin(a) * 220, v);
          const g2 = this.pickups[this.pickups.length - 1];
          g2.sp.spriteFrame = Art.f("gem_red");
        }
        for (const p of this.pickups) {
          if (!p.alive) continue;
          if (p.vx !== 0 || p.vy !== 0) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const f = Math.max(0, 1 - 8 * dt);
            p.vx *= f;
            p.vy *= f;
            if (Math.abs(p.vx) + Math.abs(p.vy) < 5) p.vx = p.vy = 0;
            p.node.setPosition(p.x, p.y);
          }
          const dx = this.px - p.x, dy = this.py - p.y;
          const d2 = Math.hypot(dx, dy);
          if (p.kind === "shrine") {
            if (this.time > p.value || this.trial) {
              p.alive = false;
              this.burst(p.x, p.y, 10129584, 12, 200);
              continue;
            }
            if (d2 < 40 && !this.boss) {
              p.alive = false;
              this.startTrial(p.x, p.y);
            }
            continue;
          }
          if (!p.pulled && (d2 < mag || p.kind === "chest" || p.kind.startsWith("epic_"))) p.pulled = true;
          if (p.pulled) {
            p.vel = Math.min(p.vel + (p.kind === "chest" ? 300 : 1400) * dt, p.kind === "chest" ? 400 : 900);
            const step = Math.min(d2, p.vel * dt);
            p.x += dx / (d2 || 1) * step;
            p.y += dy / (d2 || 1) * step;
            p.node.setPosition(p.x, p.y);
          }
          if (d2 < 22) {
            p.alive = false;
            this.collect(p);
          }
        }
      }
      collect(p) {
        if (p.kind.startsWith("epic_")) {
          const def = EPICS.find((x) => "epic_" + x.id === p.kind);
          if (def) this.startEpic(def);
          return;
        }
        if (p.kind !== "gem" && p.kind !== "coin") this.discover("i:" + p.kind);
        switch (p.kind) {
          case "giant":
            this.giantT = 10 * this.stats.buffTime;
            this.onBanner("\u5DE8\u4EBA\u5316! \u78BE\u538B\u4E00\u5207!", new Color(255, 110, 100, 255));
            this.addShake(0.3, 6);
            Sound.play("power");
            break;
          case "boots":
            this.bootsT = 10 * this.stats.buffTime;
            this.onBanner("\u75BE\u98CE\u9774! \u79FB\u901F +60%", new Color(120, 190, 255, 255));
            Sound.play("dash");
            break;
          case "bank":
            this.bankT = 6 * this.stats.buffTime;
            this.onBanner("\u805A\u5B9D\u76C6! \u91D1\u5E01\u6D8C\u51FA!", new Color(255, 214, 90, 255));
            Sound.play("chest");
            break;
          case "battery":
            this.chargeUlt(1, true);
            Sound.play("power");
            break;
          case "decoy":
            this.spawnDecoy();
            break;
          case "dice":
            this.rollDice();
            break;
          case "haste":
            this.hasteT = 12 * this.stats.buffTime;
            this.onBanner("\u6025\u901F! \u51B7\u5374 -40%", new Color(140, 230, 255, 255));
            Sound.play("power");
            break;
          case "clover":
            this.cloverT = 15 * this.stats.buffTime;
            this.onBanner("\u5E78\u8FD0! \u66B4\u51FB\u7387 +30%", new Color(120, 230, 120, 255));
            Sound.play("power");
            break;
          case "firering":
            this.fireT = 10 * this.stats.buffTime;
            this.onBanner("\u70C8\u7130\u4E4B\u73AF!", new Color(255, 140, 60, 255));
            Sound.play("fire");
            break;
          case "scroll":
            this.gainXp(Math.max(0, this.xpNext - this.xp));
            this.onBanner("\u667A\u6167\u5377\u8F74! \u7B49\u7EA7 +1", new Color(255, 230, 140, 255));
            break;
          case "gem":
            this.gainXp(p.value * this.stats.growth * (this.mod("xp2") ? 2 : 1));
            Sound.play("gem");
            if (this.hasB("gemstorm") && Math.random() < 0.06) {
              const t = this.randomOnScreen();
              if (t) {
                const f = this.spawnFx("lightning", t.x, t.y, 0.25, PX, 0);
                f.node.getComponent(UITransform).setAnchorPoint(0.5, 0);
                this.chainBoomQueue.push(() => this.explodeFriendly(t.x, t.y, 50, 20 + this.level * 2, null, 60, 10539263, false));
                Sound.play("lightning");
              }
            }
            break;
          case "watch":
            this.freezeAll(5);
            this.onBanner("\u65F6\u95F4\u505C\u6B62!", new Color(160, 220, 255, 255));
            break;
          case "nuke":
            this.chainBoomQueue.push(() => this.nukeScreen());
            this.onBanner("\u661F\u5149\u5BA1\u5224!", new Color(255, 240, 160, 255));
            break;
          case "potion":
            this.potionT = 10 * this.stats.buffTime;
            this.onBanner("\u72C2\u66B4! \u4F24\u5BB3 +50% \u79FB\u901F +30%", new Color(255, 90, 110, 255));
            Sound.play("power");
            break;
          case "shield":
            this.shieldHits = 3;
            this.onBanner("\u62A4\u76FE! \u62B5\u6321 3 \u6B21\u4F24\u5BB3", new Color(120, 180, 255, 255));
            Sound.play("power");
            break;
          case "coin":
          case "coinbag": {
            const lucky = this.isChar("fu") && Math.random() < 0.2;
            const g2 = Math.max(1, Math.round(p.value * this.stats.greed * this.stage.goldMul * (this.hasB("greedpact") ? 2 : 1) * (this.mod("gold3") ? 3 : 1) * (this.nightmare ? 1.6 : 1) * (lucky ? 2 : 1)));
            this.gold += g2;
            if (this.char.charge === "gold") this.chargeUlt(g2 / 40);
            this.dmgText(this.px, this.py + 40, g2, C_GOLD, "+");
            Sound.play("coin");
            break;
          }
          case "chicken":
            this.heal(30);
            this.dmgText(this.px, this.py + 40, 30, C_HEAL, "+");
            Sound.play("heal");
            break;
          case "magnet":
            for (const g2 of this.pickups) if (g2.alive && (g2.kind === "gem" || g2.kind === "coin")) g2.pulled = true;
            Sound.play("heal");
            break;
          case "chest":
            this.pendingChests++;
            break;
        }
      }
      gainXp(v) {
        this.xp += v;
        while (this.xp >= this.xpNext) {
          this.xp -= this.xpNext;
          this.level++;
          this.xpNext = xpForLevel(this.level);
          this.pendingLevels++;
          if (this.isChar("mage")) this.arcaneT = 4;
          if (this.char.charge === "level") this.chargeUlt(0.35);
        }
      }
      // ------------------------------------------------------------------ 特效 & 伤害数字
      spawnFx(frame, x, y, life, scale, grow) {
        let f = this.fxPool.pop();
        if (!f) {
          f = new Fx();
          f.sp = mkSprite(this.fxLayer, frame);
          f.node = f.sp.node;
        }
        f.sp.spriteFrame = Art.f(frame);
        f.node.getComponent(UITransform).setAnchorPoint(0.5, 0.5);
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
      freeFx(f) {
        f.alive = false;
        f.node.active = false;
        this.fxPool.push(f);
      }
      updateFx(dt) {
        for (const f of this.fxs) {
          f.life -= dt;
          if (f.life <= 0) {
            f.alive = false;
            continue;
          }
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
      get enemyCap() {
        return Save.data.lite ? 240 : MAX_ENEMIES;
      }
      dmgText(x, y, v, color = C_WHITE, prefix = "", crit = false) {
        if (Save.data.lite && !crit && !prefix) return;
        if (this.texts.length > (crit ? 50 : 36)) return;
        let t = this.textPool.pop();
        if (!t) {
          t = new DmgText();
          t.label = mkLabel(this.textLayer, "", 20, C_WHITE, "center", 3, true);
          t.node = t.label.node;
        }
        t.label.string = prefix + Math.round(v) + (crit ? "!" : "");
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
      freeText(t) {
        t.alive = false;
        t.node.active = false;
        this.textPool.push(t);
      }
      // 伤害数字：弹出放大 → 回弹 → 抛物线落下并淡出
      updateTexts(dt) {
        for (const t of this.texts) {
          t.life -= dt;
          t.age += dt;
          if (t.life <= 0) {
            t.alive = false;
            continue;
          }
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
      burst(x, y, color, n, speed) {
        const lite = Save.data.lite;
        if (lite) n = Math.ceil(n / 3);
        for (let i = 0; i < n && this.parts.length < (lite ? 100 : 260); i++) {
          let p = this.partPool.pop();
          if (!p) {
            p = new Particle();
            p.sp = mkRect(this.fxLayer, 1, 1, C_WHITE, "pt");
            p.node = p.sp.node;
          }
          const a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random() * 0.65);
          p.x = x;
          p.y = y;
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
      freePart(p) {
        p.alive = false;
        p.node.active = false;
        this.partPool.push(p);
      }
      updateParticles(dt) {
        const drag = Math.max(0, 1 - 5 * dt);
        for (const p of this.parts) {
          if (!p.alive) continue;
          p.life -= dt;
          if (p.life <= 0) {
            p.alive = false;
            continue;
          }
          p.vx *= drag;
          p.vy = p.vy * drag - 300 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const k = Math.max(1, Math.round(p.size * (0.4 + 0.6 * p.life / p.max)));
          p.node.setPosition(Math.round(p.x), Math.round(p.y));
          p.node.setScale(k, k, 1);
        }
      }
      addShake(t, amp) {
        if (this.shake <= 0 || amp >= this.shakeAmp) this.shakeAmp = amp;
        this.shake = Math.max(this.shake, t);
      }
      addCombo() {
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.comboT = 2.5;
        this.comboPulse = 0.15;
        const ms = [50, 100, 200, 400, 800, 1500];
        const names = ["\u624B\u611F\u706B\u70ED!", "\u8D8A\u5272\u8D8A\u723D!", "\u52BF\u4E0D\u53EF\u6321!", "\u6A2A\u626B\u5168\u573A!", "\u65E0\u4EBA\u80FD\u6321!", "\u8D85\u795E!!"];
        while (this.comboMilestone < ms.length && this.combo >= ms[this.comboMilestone]) {
          this.onBanner(`${ms[this.comboMilestone]} \u8FDE\u51FB  ${names[this.comboMilestone]}`, new Color(255, 160, 60, 255));
          Sound.play("combo");
          this.comboMilestone++;
        }
      }
      // 升级冲击波：击退周围敌人
      levelBlast() {
        if (this.hasB("holylight")) this.heal(this.stats.maxHp * 0.15);
        if (this.hasB("nova")) {
          const dmg = 25 + this.level * 4;
          for (const e of this.enemies.slice()) {
            if (e.alive && !e.def.prop && Math.abs(e.x - this.px) < this.vw / 2 + 40 && Math.abs(e.y - this.py) < this.vh / 2 + 40) this.hurtEnemy(e, dmg, 0, this.px, this.py, null);
          }
          const f = this.spawnFx("aura", this.px, this.py, 0.5, 4, 3);
          f.sp.color = colorOf(16769152);
          this.addShake(0.25, 8);
          Sound.play("boom");
        }
        for (const e of this.enemies) {
          if (!e.alive || e.def.boss) continue;
          const dx = e.x - this.px, dy = e.y - this.py, d2 = Math.hypot(dx, dy) || 1;
          if (d2 > 260) continue;
          const k = 700 * (1 - d2 / 300) * (1 - (e.def.knockRes || 0) * 0.5);
          e.kx = dx / d2 * k;
          e.ky = dy / d2 * k;
        }
        this.spawnFx("aura", this.px, this.py, 0.45, 1.5, 7);
        this.burst(this.px, this.py, 8442111, 24, 380);
        this.iframe = Math.max(this.iframe, 0.8);
      }
      // 移除失效对象并回收
      compact() {
        const sweep = (arr, free) => {
          let j = 0;
          for (const x of arr) {
            if (x.alive) arr[j++] = x;
            else free(x);
          }
          arr.length = j;
        };
        sweep(this.enemies, (e) => this.freeEnemy(e));
        sweep(this.projs, (p) => this.freeProj(p));
        sweep(this.pickups, (p) => this.freePickup(p));
        sweep(this.fxs, (f) => this.freeFx(f));
        sweep(this.texts, (t) => this.freeText(t));
        sweep(this.parts, (p) => this.freePart(p));
        sweep(this.bullets, (b) => this.freeBullet(b));
        sweep(this.hazards, (h) => this.freeHazard(h));
        sweep(this.pzones, (z) => this.freePZone(z));
        sweep(this.lines, (l) => this.freeLine(l));
      }
      // ------------------------------------------------------------------ 敌方子弹
      fireBullet(frame, x, y, angle, speed, dmg, o = {}) {
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
        b.x = x;
        b.y = y;
        b.speed = speed;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
        b.dmg = dmg;
        b.o = o;
        b.age = 0;
        b.life = o.life || 6;
        b.radius = o.radius || 8;
        b.node.angle = o.orient ? angle * 180 / Math.PI : 0;
        b.node.setPosition(x, y);
        this.bullets.push(b);
      }
      freeBullet(b) {
        b.alive = false;
        b.node.active = false;
        this.bulletPool.push(b);
      }
      updateBullets(dt) {
        const far = Math.max(this.vw, this.vh) + 300;
        for (const b of this.bullets) {
          if (!b.alive) continue;
          b.age += dt;
          b.life -= dt;
          const o = b.o;
          if (b.life <= 0) {
            b.alive = false;
            continue;
          }
          if (o.returnAfter !== void 0 && b.age > o.returnAfter && o.owner) {
            if (!o.owner.alive) {
              b.alive = false;
              continue;
            }
            const dx2 = o.owner.x - b.x, dy2 = o.owner.y - b.y, d2 = Math.hypot(dx2, dy2) || 1;
            if (d2 < 40) {
              b.alive = false;
              continue;
            }
            b.vx = dx2 / d2 * b.speed * 1.2;
            b.vy = dy2 / d2 * b.speed * 1.2;
          } else if (o.turn) {
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
          else if (o.orient) b.node.angle = Math.atan2(b.vy, b.vx) * 180 / Math.PI;
          b.node.setPosition(b.x, b.y);
          const dx = b.x - this.px, dy = b.y - this.py;
          if (dx * dx + dy * dy < (b.radius + 12) ** 2) {
            this.hurtPlayer(b.dmg);
            if (!o.pierce) {
              b.alive = false;
              this.burst(b.x, b.y, 16777215, 3, 120);
            }
          }
          if (Math.abs(dx) > far || Math.abs(dy) > far) b.alive = false;
        }
      }
      // ------------------------------------------------------------------ 危险区域
      newHazard(kind, color) {
        const pool = this.hazardPool;
        let h;
        const circle = kind === "circle" || kind === "zone";
        for (let i = pool.length - 1; i >= 0; i--) {
          const c = pool[i].kind === "circle" || pool[i].kind === "zone";
          if (c === circle) {
            h = pool.splice(i, 1)[0];
            break;
          }
        }
        if (!h) {
          h = new Hazard();
          h.sp = circle ? mkSprite(this.hazardLayer, "warn", 1) : mkRect(this.hazardLayer, 10, 10, C_WHITE, "hz", 0, 0.5);
          h.node = h.sp.node;
        }
        h.kind = kind;
        h.alive = true;
        h.node.active = true;
        h.node.angle = 0;
        h.onDone = null;
        h.owner = null;
        h.angVel = 0;
        h.color.set(color >> 16 & 255, color >> 8 & 255, color & 255, 255);
        this.hazards.push(h);
        return h;
      }
      // 圆形预警：dur 秒后执行 onDone
      warnCircle(x, y, r, dur, color = 16724016, onDone = null) {
        const h = this.newHazard("circle", color);
        h.x = x;
        h.y = y;
        h.r = r;
        h.life = h.max = dur;
        h.onDone = onDone;
        h.node.setPosition(x, y);
        h.node.setScale(r * 2 / 64, r * 2 / 64, 1);
      }
      // 直线预警（冲锋 / 激光路径）
      warnLine(x, y, angle, len, w, dur) {
        const h = this.newHazard("line", 16724016);
        h.x = x;
        h.y = y;
        h.angle = angle;
        h.len = len;
        h.w = w;
        h.life = h.max = dur;
        h.node.setPosition(x, y);
        h.node.angle = angle * 180 / Math.PI;
        h.node.getComponent(UITransform).setContentSize(len, w);
      }
      // 激光：跟随 owner，持续伤害，可旋转扫射
      beam(owner, angle, len, w, dur, angVel, dmg) {
        const h = this.newHazard("beam", 16732240);
        h.owner = owner;
        h.x = owner.x;
        h.y = owner.y;
        h.angle = angle;
        h.angVel = angVel;
        h.len = len;
        h.w = w;
        h.dmg = dmg;
        h.life = h.max = dur;
        h.node.getComponent(UITransform).setContentSize(len, w);
      }
      // 减速冰域：站在里面移动变慢并持续受伤
      zone(x, y, r, dur, dmg, color) {
        const h = this.newHazard("zone", color);
        h.x = x;
        h.y = y;
        h.r = r;
        h.dmg = dmg;
        h.life = h.max = dur;
        h.node.setPosition(x, y);
        h.node.setScale(r * 2 / 64, r * 2 / 64, 1);
      }
      // 范围爆炸：伤害玩家 + 特效
      explode(x, y, r, dmg, color) {
        if (Math.hypot(this.px - x, this.py - y) < r + 10) this.hurtPlayer(this.isChar("bomber") ? dmg * 0.5 : dmg);
        const f = this.spawnFx("aura", x, y, 0.35, r * 2 / 64, 0.6);
        f.sp.color = colorOf(color);
        this.burst(x, y, color, 16, 320);
        this.burst(x, y, 16777215, 6, 260);
        this.addShake(0.2, 6);
      }
      freeHazard(h) {
        h.alive = false;
        h.node.active = false;
        this.hazardPool.push(h);
      }
      updateHazards(dt) {
        for (const h of this.hazards) {
          if (!h.alive) continue;
          h.life -= dt;
          const t = 1 - h.life / h.max;
          const c = h.color;
          switch (h.kind) {
            case "circle": {
              const blink = 0.55 + 0.45 * Math.sin(t * t * 40);
              h.sp.color = tmpColor.set(c.r, c.g, c.b, Math.floor(255 * blink));
              break;
            }
            case "line":
              h.sp.color = tmpColor.set(c.r, c.g, c.b, Math.floor(60 + 80 * (0.5 + 0.5 * Math.sin(t * t * 50))));
              break;
            case "beam": {
              if (!h.owner || !h.owner.alive) {
                h.alive = false;
                continue;
              }
              h.x = h.owner.x;
              h.y = h.owner.y;
              h.angle += h.angVel * dt;
              h.node.setPosition(h.x, h.y);
              h.node.angle = h.angle * 180 / Math.PI;
              const flick = 0.85 + Math.random() * 0.15;
              h.node.getComponent(UITransform).setContentSize(h.len, h.w * flick);
              h.sp.color = tmpColor.set(255, 90 + Math.floor(Math.random() * 60), 90, 230);
              const ux = Math.cos(h.angle), uy = Math.sin(h.angle);
              const rx = this.px - h.x, ry = this.py - h.y;
              const along = rx * ux + ry * uy;
              if (along > 0 && along < h.len && Math.abs(rx * uy - ry * ux) < h.w / 2 + 8) this.hurtPlayer(h.dmg);
              if (Math.random() < 0.5) this.burst(h.x + ux * along * Math.random(), h.y + uy * along * Math.random(), 16752800, 1, 80);
              break;
            }
            case "zone": {
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
      recalcStats() {
        const oldMax = this.stats.maxHp;
        const s = { ...this.baseStats };
        for (const p of this.passives) {
          const d2 = p.def;
          if (d2.mul) s[d2.stat] = this.baseStats[d2.stat] * (1 + d2.per * p.level);
          else s[d2.stat] += d2.per * p.level;
        }
        if (this.hasB("glass")) {
          s.might *= 1.6;
          s.maxHp *= 0.6;
        }
        if (this.hasB("giant")) {
          s.area *= 1.4;
          s.moveSpeed *= 0.85;
        }
        if (this.daily && this.daily.mod.id === "glass") s.might *= 1.4;
        if (this.hasB("twin")) s.amount += 1;
        if (this.hasB("magstorm")) s.magnet *= 2;
        s.cooldown = Math.max(0.3, s.cooldown);
        this.stats = s;
        if (s.maxHp > oldMax) this.hp += s.maxHp - oldMax;
        this.hp = Math.min(this.hp, s.maxHp);
      }
      // 升级选项：带权重抽取 3 个（不放回）
      //   已有武器升级 3、已有被动升级 2、凑进化所需被动 5、前 3 把新武器 2.5、其余新武器 1、新被动 1
      //   让玩家更容易把构筑做深、凑出进化，减少"选项全是没用的"挫败感
      buildOptions() {
        const pool = [];
        const needs = /* @__PURE__ */ new Map();
        for (const w of this.weapons) {
          const evo = w.evo;
          if (evo && !w.evolved) needs.set(evo.passive, Math.max(needs.get(evo.passive) || 0, w.level));
        }
        for (const w of this.weapons) if (w.level < WEAPON_MAX_LEVEL) pool.push({ o: { kind: "weapon", wdef: w.def, level: w.level + 1 }, w: 3 });
        if (this.weapons.length < MAX_WEAPONS) {
          for (const d2 of WEAPONS) {
            if (this.weapons.find((w) => w.def === d2)) continue;
            pool.push({ o: { kind: "weapon", wdef: d2, level: 1 }, w: this.weapons.length < 3 ? 2.5 : 1 });
          }
        }
        for (const p of this.passives) if (p.level < p.def.max) pool.push({ o: { kind: "passive", pdef: p.def, level: p.level + 1 }, w: 2 });
        if (this.passives.length < MAX_PASSIVES) {
          for (const d2 of PASSIVES) {
            if (this.passives.find((p) => p.def === d2)) continue;
            const lv = needs.get(d2.id) || 0;
            pool.push({ o: { kind: "passive", pdef: d2, level: 1 }, w: lv >= 5 ? 5 : lv > 0 ? 2 : 1 });
          }
        }
        const out = [];
        while (out.length < 3 && pool.length) {
          let sum = 0;
          for (const x of pool) sum += x.w;
          let r = Math.random() * sum, k = 0;
          while (k < pool.length - 1 && (r -= pool[k].w) > 0) k++;
          out.push(pool.splice(k, 1)[0].o);
        }
        if (out.length === 0) out.push({ kind: "heal", level: 1 }, { kind: "gold", level: 1 });
        return out;
      }
      applyOption(o) {
        if (o.kind === "weapon") {
          const w = this.weapons.find((x) => x.def === o.wdef);
          if (w) {
            w.level++;
            w.recalc();
          } else this.addWeapon(o.wdef);
        } else if (o.kind === "passive") {
          const p = this.passives.find((x) => x.def === o.pdef);
          if (p) p.level++;
          else {
            this.passives.push({ def: o.pdef, level: 1 });
            this.discover("p:" + o.pdef.id);
          }
          this.recalcStats();
        } else if (o.kind === "heal") {
          this.heal(30);
        } else {
          this.gold += 25;
        }
      }
      applyBlessing(b) {
        this.blessings.push(b);
        this.pendingBlessings = Math.max(0, this.pendingBlessings - 1);
        this.recalcStats();
        Sound.play("card");
      }
      // 可进化的武器：满级 + 持有对应被动
      evolvable() {
        for (const w of this.weapons) {
          const evo = w.evo;
          if (!w.evolved && evo && w.level >= WEAPON_MAX_LEVEL && this.passives.find((p) => p.def.id === evo.passive)) return w;
        }
        return null;
      }
      evolve(w) {
        w.evolved = true;
        this.evolvedCount++;
        this.discover("e:" + w.def.id);
        w.recalc();
        w.timer = 0;
        if (w.def.id === "bible") {
          for (const p of this.projs) if (p.kind === "bible") p.alive = false;
        }
      }
      // 打开宝箱：优先进化，否则随机升级一项。返回结果描述
      openChest(bonus = false) {
        if (!bonus) {
          this.pendingChests--;
          this.chestsOpened++;
        }
        const gold = Math.round((20 + 15 * this.bossIdx) * this.stats.greed);
        this.gold += gold;
        const w = this.evolvable();
        if (w) {
          this.evolve(w);
          return { icon: w.icon, title: "\u8FDB\u5316! " + w.name, desc: w.evo.desc, evolved: true, gold };
        }
        const o = this.buildOptions()[0];
        this.applyOption(o);
        const d2 = describe(o);
        return { icon: d2.icon, title: d2.name + "  " + d2.tag, desc: d2.desc, evolved: false, gold };
      }
    };
  }
});

// ../../assets/scripts/Recorder.ts
var Recorder;
var init_Recorder = __esm({
  "../../assets/scripts/Recorder.ts"() {
    Recorder = class {
      static {
        this.rec = null;
      }
      static {
        this.want = false;
      }
      static {
        // 本局是否需要录制
        this.segStart = 0;
      }
      static {
        // 当前段开始时间（毫秒）
        this.lastPath = "";
      }
      static {
        // 上一段完整录屏
        this.videoPath = "";
      }
      static {
        // 可分享的录屏路径
        this.onReady = () => {
        };
      }
      // 结算时录屏就绪（异步）
      static get supported() {
        const tt = globalThis.tt;
        return !!(tt && tt.getGameRecorderManager);
      }
      static init() {
        if (!this.supported || this.rec) return;
        try {
          this.rec = globalThis.tt.getGameRecorderManager();
          this.rec.onStop((res2) => {
            const dur = (Date.now() - this.segStart) / 1e3;
            const path = res2 && res2.videoPath ? res2.videoPath : "";
            if (path) {
              if (dur >= 15 || !this.lastPath) this.lastPath = path;
              this.videoPath = this.lastPath;
            }
            if (this.want) this.begin();
            else this.onReady();
          });
          this.rec.onError(() => {
            this.want = false;
          });
        } catch (e) {
          this.rec = null;
        }
      }
      static begin() {
        try {
          this.segStart = Date.now();
          this.rec.start({ duration: 300 });
        } catch (e) {
        }
      }
      static start() {
        if (!this.rec) return;
        this.want = true;
        this.videoPath = this.lastPath = "";
        this.begin();
      }
      static pause() {
        try {
          if (this.rec && this.want) this.rec.pause();
        } catch (e) {
        }
      }
      static resume() {
        try {
          if (this.rec && this.want) this.rec.resume();
        } catch (e) {
        }
      }
      static stop() {
        if (!this.rec || !this.want) return;
        this.want = false;
        try {
          this.rec.stop();
        } catch (e) {
        }
      }
      static get ready() {
        return !!this.videoPath;
      }
      static share(title, cb) {
        const tt = globalThis.tt;
        if (!tt || !this.videoPath) {
          cb(false);
          return;
        }
        try {
          tt.shareAppMessage({
            channel: "video",
            title,
            extra: { videoPath: this.videoPath, videoTopics: ["\u5976\u86D9\u5272\u8349", "\u5C0F\u6E38\u620F"], hashtag_list: ["\u5976\u86D9\u5272\u8349", "\u5C0F\u6E38\u620F"] },
            success: () => cb(true),
            fail: () => cb(false)
          });
        } catch (e) {
          cb(false);
        }
      }
    };
  }
});

// ../../assets/scripts/GameRoot.ts
var GameRoot_exports = {};
__export(GameRoot_exports, {
  AGE_RATING: () => AGE_RATING,
  DESIGN_H: () => DESIGN_H,
  DESIGN_W: () => DESIGN_W,
  GAME_NAME: () => GAME_NAME,
  GAME_SUBTITLE: () => GAME_SUBTITLE,
  GAME_VERSION: () => GAME_VERSION,
  GameRoot: () => GameRoot
});
var ccclass, DESIGN_W, DESIGN_H, GAME_NAME, GAME_SUBTITLE, AGE_RATING, GAME_VERSION, FROG_LINES, AGE_TIP, HEALTH_TIP, C_AD, C_WHITE2, C_GOLD2, C_RED, C_GREY, C_GREEN, C_DIM, C_BORDER2, C_BTN_GREEN, C_BTN_BLUE, C_BTN_GREY, tmpV3, GameRoot;
var init_GameRoot = __esm({
  "../../assets/scripts/GameRoot.ts"() {
    init_cc();
    init_env();
    init_AdConfig();
    init_Ads();
    init_Art();
    init_Backdrop();
    init_Battle();
    init_Defs();
    init_Recorder();
    init_Save();
    init_Sound();
    init_UiKit();
    ({ ccclass } = _decorator);
    DESIGN_W = 720;
    DESIGN_H = 1280;
    GAME_NAME = "\u5976\u86D9\u5272\u8349";
    GAME_SUBTITLE = "MILKY  FROG  SURVIVORS";
    AGE_RATING = "12+";
    GAME_VERSION = "v1.0.0";
    FROG_LINES = ["\u5471!", "\u5272\u8349\u53BB!", "\u5471\u5471\u5471~", "\u5976\u86D9\u51FA\u51FB!", "\u4ECA\u5929\u4E5F\u8981\u52AA\u529B\u5272\u8349", "\u7EA2\u6708? \u4E0D\u6015!", "\u518D\u6765\u4E00\u5C40\u5471", "\u522B\u6233\u4E86, \u75D2!"];
    AGE_TIP = [
      "1. \u672C\u6E38\u620F\u662F\u4E00\u6B3E\u4F11\u95F2\u52A8\u4F5C\u7C7B\u6E38\u620F\uFF0C\u9002\u7528\u4E8E\u5E74\u6EE1 12 \u5468\u5C81\u53CA\u4EE5\u4E0A\u7684\u7528\u6237\uFF0C",
      "    \u5EFA\u8BAE\u672A\u6210\u5E74\u4EBA\u5728\u5BB6\u957F\u76D1\u62A4\u4E0B\u4F7F\u7528\u6E38\u620F\u4EA7\u54C1\u3002",
      "2. \u672C\u6E38\u620F\u4E3A\u5361\u901A\u50CF\u7D20\u753B\u98CE\uFF0C\u89D2\u8272\u4E0E\u602A\u7269\u5747\u4E3A\u53EF\u7231\u7684\u5361\u901A\u5F62\u8C61\uFF0C",
      "    \u5BF9\u6297\u5185\u5BB9\u8F7B\u5EA6\u3001\u65E0\u8840\u8165\u6050\u6016\u753B\u9762\uFF0C\u65E0\u57FA\u4E8E\u771F\u5B9E\u5386\u53F2\u548C\u73B0\u5B9E\u4E8B\u4EF6\u7684\u6539\u7F16\u5185\u5BB9\u3002",
      "3. \u672C\u6E38\u620F\u65E0\u9700\u6CE8\u518C\u8D26\u53F7\uFF0C\u6CA1\u6709\u5145\u503C\u548C\u4ED8\u8D39\u5185\u5BB9\uFF0C",
      "    \u6E38\u620F\u5185\u91D1\u5E01\u53EA\u80FD\u901A\u8FC7\u6E38\u73A9\u514D\u8D39\u83B7\u5F97\uFF0C\u4E0D\u80FD\u4EA4\u6613\u3002",
      "4. \u6E38\u620F\u6709\u52A9\u4E8E\u953B\u70BC\u53CD\u5E94\u80FD\u529B\u4E0E\u7B56\u7565\u89C4\u5212\u80FD\u529B\uFF0C",
      "    \u8BF7\u5408\u7406\u5B89\u6392\u6E38\u620F\u65F6\u95F4\uFF0C\u6CE8\u610F\u52B3\u9038\u7ED3\u5408\u3002"
    ].join("\n");
    HEALTH_TIP = "\u62B5\u5236\u4E0D\u826F\u6E38\u620F\uFF0C\u62D2\u7EDD\u76D7\u7248\u6E38\u620F\u3002\n\u6CE8\u610F\u81EA\u6211\u4FDD\u62A4\uFF0C\u8C28\u9632\u53D7\u9A97\u4E0A\u5F53\u3002\n\u9002\u5EA6\u6E38\u620F\u76CA\u8111\uFF0C\u6C89\u8FF7\u6E38\u620F\u4F24\u8EAB\u3002\n\u5408\u7406\u5B89\u6392\u65F6\u95F4\uFF0C\u4EAB\u53D7\u5065\u5EB7\u751F\u6D3B\u3002";
    C_AD = new Color(150, 90, 20, 255);
    C_WHITE2 = new Color(255, 255, 255, 255);
    C_GOLD2 = new Color(255, 214, 90, 255);
    C_RED = new Color(230, 60, 70, 255);
    C_GREY = new Color(170, 165, 190, 255);
    C_GREEN = new Color(110, 230, 120, 255);
    C_DIM = new Color(0, 0, 0, 170);
    C_BORDER2 = new Color(214, 170, 70, 255);
    C_BTN_GREEN = new Color(40, 110, 60, 255);
    C_BTN_BLUE = new Color(40, 70, 130, 255);
    C_BTN_GREY = new Color(70, 64, 90, 255);
    tmpV3 = new Vec3();
    GameRoot = class extends Component {
      constructor() {
        super(...arguments);
        this.state = "menu";
        this.vw = 0;
        this.vh = 0;
        this.safeTop = 0;
        this.safeBottom = 0;
        this.t = 0;
        // 输入
        this.keys = /* @__PURE__ */ new Set();
        this.joyActive = false;
        this.joyX = 0;
        this.joyY = 0;
        this.joyOrigin = new Vec3();
        // 界面
        this.screens = {};
        this.bannerT = 0;
        this.menuTitleY = 0;
        this.titleSparks = [];
        this.menuHeroScale = 3;
        this.menuHeroBaseY = 0;
        this.heroJumpY = 0;
        this.heroJumpV = 0;
        this.bubbleT = 0;
        this.splashHeroBaseY = 0;
        this.refreshers = [];
        // 各界面的刷新函数
        this.cards = [];
        this.cardMode = "level";
        this.blessOpts = [];
        this.ultChar = "";
        this.options = [];
        this.dailyRun = false;
        this.newStage = "";
        this.newChar = "";
        this.dailyReward = 0;
        // 广告相关
        this.adRevived = false;
        this.adRerolls = 0;
        this.adBlessUsed = false;
        this.adGoldUsed = false;
        this.adChestUsed = false;
        this.adWatchedThisResult = false;
        this.lastRunGold = 0;
        this.reviveT = 0;
        this.splashT = 0;
        this.toastT = 0;
        // 新手引导（首局）：-1 = 不显示
        this.tutStep = -1;
        this.tutT = 0;
        this.tutX0 = 0;
        this.tutY0 = 0;
        // ------------------------------------------------------------------ 胜利过渡动画
        this.winT = 0;
        // ------------------------------------------------------------------ 倒下动画
        this.dieT = 0;
        this.questMsg = "";
        // ------------------------------------------------------------------ 图鉴
        this.codexTab = "weapon";
        this.codexSel = null;
      }
      onLoad() {
        view.setDesignResolutionSize(DESIGN_W, DESIGN_H, ResolutionPolicy.FIXED_WIDTH);
        Save.load();
        this.autoLite();
        Art.init();
        Sound.init(this.node);
        Ads.init();
        Recorder.init();
        Recorder.onReady = () => {
          if (this.state === "result") this.refreshAll();
        };
        const cam = this.getComponent(Canvas)?.cameraComponent;
        if (cam) cam.clearColor = new Color(18, 22, 18, 255);
        this.battle = new Battle(this.node);
        this.battle.onBanner = (t, c) => this.banner(t, c);
        this.ui = mkNode("UI", this.node);
        this.ui.addComponent(UITransform).setContentSize(10, 10);
        this.layout(true);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.on(Game.EVENT_HIDE, this.onHide, this);
        this.setupShare();
        this.battle.reset(this.selectedChar());
        this.battle.setPlayerVisible(false);
        this.splashT = 0;
        this.setState("splash");
      }
      // 首次启动按机型性能自动开启性能模式（安卓微信提供 benchmarkLevel：-1 未知，0~50 越高越好）
      autoLite() {
        const d2 = Save.data;
        if (d2.liteChecked) return;
        d2.liteChecked = true;
        try {
          const w = mgApi();
          const info = w && w.getSystemInfoSync ? w.getSystemInfoSync() : null;
          const lvl = info && typeof info.benchmarkLevel === "number" ? info.benchmarkLevel : -1;
          if (lvl >= 0 && lvl < 15) d2.lite = true;
        } catch (e) {
        }
        Save.save();
      }
      onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.onHide, this);
      }
      // 分享本局战绩（截取结算画面上半部分作为分享图；按平台规则，分享不发放任何奖励）
      shareResult() {
        const w = mgApi();
        if (!w || !w.shareAppMessage) {
          this.showToast("\u8BF7\u5728\u5FAE\u4FE1\u4E2D\u6253\u5F00\u540E\u5206\u4EAB");
          return;
        }
        const b = this.battle;
        let imageUrl;
        try {
          const cv = globalThis.canvas;
          if (cv && cv.toTempFilePathSync) imageUrl = cv.toTempFilePathSync({ x: 0, y: 0, width: cv.width, height: Math.round(cv.width * 0.8), destWidth: 500, destHeight: 400 });
        } catch (e) {
        }
        const title = b.won ? `\u6211\u7684\u5976\u86D9\u5728\u300A${GAME_NAME}\u300B\u91CC\u51FB\u8D25\u4E86\u6697\u591C\u9B54\u672F\u5E08\uFF01\u4F60\u4E5F\u6765\u8BD5\u8BD5\uFF1F` : `\u6211\u7684\u5976\u86D9\u575A\u6301\u4E86 ${this.fmtTime(b.time)}\uFF0C\u5272\u5012 ${b.kills} \u53EA\u602A\u7269\uFF0C\u4F60\u80FD\u6491\u591A\u4E45\uFF1F`;
        try {
          w.shareAppMessage({ title, imageUrl });
        } catch (e) {
        }
      }
      setupShare() {
        const w = mgApi();
        if (!w) return;
        try {
          if (w.showShareMenu) w.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage", "shareTimeline"] });
          const msg = () => ({ title: Save.data.bestTime ? `${GAME_NAME}\uFF1A\u6211\u7684\u5976\u86D9\u575A\u6301\u4E86 ${this.fmtTime(Save.data.bestTime)}\uFF0C\u4F60\u80FD\u6491\u591A\u4E45\uFF1F` : `${GAME_NAME}\uFF1A\u80D6\u5976\u86D9\u5272\u8349\uFF0C\u5728\u7EA2\u6708\u4E0B\u575A\u6301 15 \u5206\u949F\uFF01` });
          if (w.onShareAppMessage) w.onShareAppMessage(msg);
          if (w.onShareTimeline) w.onShareTimeline(msg);
        } catch (e) {
        }
      }
      // 切到后台自动暂停
      onHide() {
        if (this.state === "play") this.setState("pause");
      }
      selectedChar() {
        return CHARACTERS.find((c) => c.id === Save.data.selected) || CHARACTERS[0];
      }
      // ------------------------------------------------------------------ 布局
      computeSafe() {
        let top = 0, bottom = 0;
        try {
          const r = sys.getSafeAreaRect();
          if (r && r.height > 0) {
            top = Math.max(0, this.vh - (r.y + r.height));
            bottom = Math.max(0, r.y);
          }
        } catch (e) {
        }
        const w = globalThis.wx;
        try {
          if (w && w.getMenuButtonBoundingClientRect) {
            const m = w.getMenuButtonBoundingClientRect();
            const info = w.getSystemInfoSync();
            top = Math.max(top, m.bottom * (this.vw / info.windowWidth) + 8);
          }
        } catch (e) {
        }
        this.safeTop = Math.min(top, this.vh * 0.15);
        this.safeBottom = Math.min(bottom, this.vh * 0.08);
      }
      layout(force = false) {
        const vs = view.getVisibleSize();
        if (!force && vs.width === this.vw && vs.height === this.vh) return;
        this.vw = vs.width;
        this.vh = vs.height;
        this.computeSafe();
        this.battle.setViewport(this.vw, this.vh);
        this.buildUI();
        if (!force) {
          this.refreshIcons();
          this.setState(this.state);
        }
      }
      get top() {
        return this.vh / 2 - this.safeTop;
      }
      get bottom() {
        return -this.vh / 2 + this.safeBottom;
      }
      // ------------------------------------------------------------------ 构建界面
      buildUI() {
        this.ui.destroyAllChildren();
        this.screens = {};
        this.refreshers = [];
        this.cards = [];
        this.touchLayer = mkNode("TouchLayer", this.ui);
        this.touchLayer.addComponent(UITransform).setContentSize(this.vw, this.vh);
        this.touchLayer.on(Node.EventType.TOUCH_START, this.onJoyStart, this);
        this.touchLayer.on(Node.EventType.TOUCH_MOVE, this.onJoyMove, this);
        this.touchLayer.on(Node.EventType.TOUCH_END, this.onJoyEnd, this);
        this.touchLayer.on(Node.EventType.TOUCH_CANCEL, this.onJoyEnd, this);
        this.joyBase = mkSprite(this.ui, "joy_base", 3).node;
        this.joyKnob = mkSprite(this.ui, "joy_knob", 3).node;
        this.joyBase.active = this.joyKnob.active = false;
        this.buildHud();
        this.overlay = mkRect(this.ui, this.vw, this.vh, C_DIM, "Overlay");
        blockTouches(this.overlay.node);
        this.buildMenu();
        this.buildChars();
        this.buildShop();
        this.buildSettings();
        this.buildPause();
        this.buildLevelUp();
        this.buildChest();
        this.buildResult();
        this.buildAchievements();
        this.buildDaily();
        this.buildCodex();
        this.buildVictory();
        this.buildDying();
        this.buildSignin();
        this.buildRevive();
        this.buildSplash();
        this.buildPrivacy();
        this.buildTutorial();
        this.ageNode = mkPanel(this.ui, 680, 420).node;
        this.ageNode.setPosition(0, this.vh * 0.05);
        mkLabel(this.ageNode, "\u9002\u9F84\u63D0\u793A", 34, C_GOLD2, "center", 3).node.setPosition(0, 165);
        mkLabel(this.ageNode, AGE_TIP, 19, C_WHITE2, "left", 2).node.setPosition(-315, 0);
        mkLabel(this.ageNode, "\u70B9\u51FB\u5173\u95ED", 18, C_GREY, "center", 2).node.setPosition(0, -180);
        this.ageNode.active = false;
        this.ageNode.on(Node.EventType.TOUCH_END, () => {
          this.ageNode.active = false;
        });
        this.toast = mkLabel(this.ui, "", 30, C_WHITE2, "center", 4);
        this.toast.node.setPosition(0, -this.vh * 0.3);
        this.toast.node.active = false;
      }
      buildHud() {
        const hud = this.hud = mkNode("HUD", this.ui);
        const top = this.top, L = -this.vw / 2, R = this.vw / 2;
        mkRect(hud, this.vw - 12, 24, new Color(24, 18, 40, 230), "xpBg").node.setPosition(0, top - 16);
        this.xpFill = mkRect(hud, this.vw - 18, 18, new Color(70, 150, 255, 255), "xpFill", 0, 0.5).node;
        this.xpFill.setPosition(L + 9, top - 16);
        this.lvLabel = mkLabel(hud, "LV 1", 20, C_WHITE2, "right", 3, true);
        this.lvLabel.node.setPosition(R - 14, top - 16);
        const pause = mkPanel(hud, 72, 72, new Color(40, 34, 70, 230));
        pause.node.setPosition(L + 50, top - 76);
        mkSprite(pause.node, "icon_pause", 2.5);
        pause.node.on(Node.EventType.TOUCH_END, () => {
          Sound.play("click");
          if (this.state === "play") this.setState("pause");
        });
        this.timeLabel = mkLabel(hud, "00:00", 48, C_WHITE2, "center", 4, true);
        this.timeLabel.node.setPosition(0, top - 72);
        this.killLabel = mkLabel(hud, "\u51FB\u8D25 0", 24, C_WHITE2, "right", 3, true);
        this.killLabel.node.setPosition(R - 14, top - 58);
        mkSprite(hud, "coin", 2.2).node.setPosition(R - 120, top - 92);
        this.goldLabel = mkLabel(hud, "0", 24, C_GOLD2, "right", 3, true);
        this.goldLabel.node.setPosition(R - 14, top - 92);
        this.iconRow = mkNode("Icons", hud);
        this.bossTimer = mkLabel(hud, "", 22, C_WHITE2, "center", 3, true);
        this.bossTimer.node.setPosition(0, top - 114);
        this.iconRow.setPosition(L + 24, top - 152);
        this.bossBar = mkNode("BossBar", hud);
        this.bossBar.setPosition(0, top - 250);
        mkRect(this.bossBar, 424, 22, new Color(20, 10, 20, 230));
        this.bossFill = mkRect(this.bossBar, 418, 16, new Color(170, 40, 200, 255), "fill", 0, 0.5).node;
        this.bossFill.setPosition(-209, 0);
        this.bossName = mkLabel(this.bossBar, "", 22, C_WHITE2, "center", 3);
        this.bossName.node.setPosition(0, 28);
        this.bossBar.active = false;
        this.comboLabel = mkLabel(hud, "", 40, C_WHITE2, "right", 4, true);
        this.comboLabel.node.setPosition(R - 20, top - 290);
        this.comboSub = mkLabel(hud, "\u8FDE\u51FB", 22, C_WHITE2, "right", 3);
        this.comboSub.node.setPosition(R - 20, top - 325);
        this.buffLabel = mkLabel(hud, "", 22, new Color(255, 200, 220, 255), "left", 3);
        this.buffLabel.node.setPosition(L + 16, top - 222);
        this.bannerLabel = mkLabel(hud, "", 44, C_RED, "center", 5);
        this.bannerLabel.node.setPosition(0, this.vh * 0.16);
        this.bannerLabel.node.active = false;
        const ub = mkPanel(hud, 132, 132, new Color(30, 24, 52, 230));
        this.ultBtn = ub.node;
        this.ultBtn.setPosition(R - 86, this.bottom + 104);
        this.ultFill = mkRect(this.ultBtn, 126, 126, new Color(255, 200, 80, 110), "ultFill", 0.5, 0);
        this.ultFill.node.setPosition(0, -63);
        this.ultHero = mkSprite(this.ultBtn, "hero_hunter_0", 1);
        this.ultHero.node.setPosition(0, 10);
        this.ultName = mkLabel(this.ultBtn, "", 20, C_WHITE2, "center", 3);
        this.ultName.node.setPosition(0, -48);
        this.ultBtn.on(Node.EventType.TOUCH_END, () => this.castUlt());
        this.epicLabel = mkLabel(hud, "", 28, C_GOLD2, "center", 4);
        this.epicLabel.node.setPosition(-40, this.bottom + 76);
        this.epicBar = mkRect(hud, 300, 12, new Color(20, 10, 20, 220), "epicBg").node;
        this.epicBar.setPosition(-40, this.bottom + 50);
        this.epicFill = mkRect(this.epicBar, 296, 8, new Color(255, 200, 70, 255), "epicFill", 0, 0.5);
        this.epicFill.node.setPosition(-148, 0);
        this.trialLabel = mkLabel(hud, "", 28, new Color(255, 120, 100, 255), "center", 4);
        this.trialLabel.node.setPosition(-40, this.bottom + 120);
      }
      castUlt() {
        if (this.state !== "play") return;
        if (this.battle.useUlt()) vibrate();
        else if (this.battle.ult < 1) this.showToast(`\u5927\u62DB\u5145\u80FD\u4E2D\uFF1A${CHARGE_DESC[this.battle.char.charge]}`);
      }
      buildVictory() {
        const s = this.screen("victory");
        this.winFlash = mkRect(s, this.vw, this.vh, new Color(255, 250, 220, 0), "flash");
        this.winNode = mkNode("win", s);
        this.winNode.setPosition(0, this.vh * 0.16);
        this.winRays = mkSprite(this.winNode, "aura", 7);
        this.winRays.color = new Color(255, 214, 90, 120);
        this.winTitle = mkLabel(this.winNode, "\u80DC\u5229!", 110, C_GOLD2, "center", 9);
        this.winSub = mkLabel(this.winNode, "", 34, C_WHITE2, "center", 4);
        this.winSub.node.setPosition(0, -100);
      }
      startVictory() {
        const b = this.battle;
        this.winT = 0;
        this.winSub.string = b.daily ? "\u6BCF\u65E5\u6311\u6218\u6210\u529F!" : b.bossKills.includes("reaper") ? "\u51FB\u8D25\u4E86\u6697\u591C\u9B54\u672F\u5E08!" : "\u575A\u6301\u4E86 15 \u5206\u949F!";
        this.onJoyEnd();
        Sound.pauseBgm();
        Sound.play("achieve");
        vibrate(true);
        this.setState("victory");
      }
      updateVictory(dt) {
        this.winT += dt;
        const t = this.winT;
        this.battle.celebrate(dt);
        this.winFlash.color = new Color(255, 250, 220, Math.floor(200 * Math.max(0, 1 - t * 2.5)));
        const k = Math.min(1, Math.max(0, (t - 0.25) / 0.45));
        const back = k === 0 ? 0 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
        const breathe = 1 + Math.sin(t * 4) * 0.03 * (k >= 1 ? 1 : 0);
        this.winTitle.node.setScale(back * breathe, back * breathe, 1);
        this.winSub.node.active = t > 0.8;
        const a = Math.floor(255 * Math.min(1, Math.max(0, (t - 0.8) / 0.4)));
        this.winSub.color = new Color(255, 255, 255, a);
        this.winRays.node.angle = t * 40;
        const rs = 7 * Math.min(1, t * 1.5);
        this.winRays.node.setScale(rs, rs, 1);
        if (t > 3.2) this.endRun(true);
      }
      buildDying() {
        const s = this.screen("dying");
        this.dieDim = mkRect(s, this.vw, this.vh, new Color(10, 4, 20, 0), "dim");
        this.dieLabel = mkLabel(s, "\u5976\u86D9\u5012\u4E0B\u4E86\u2026", 56, new Color(255, 230, 200, 255), "center", 5);
        this.dieLabel.node.setPosition(0, this.vh * 0.12);
      }
      startDying() {
        this.dieT = 0;
        this.onJoyEnd();
        Sound.pauseBgm();
        Sound.play("faint");
        vibrate(true);
        this.setState("dying");
      }
      updateDying(dt) {
        this.dieT += dt;
        const t = this.dieT;
        this.battle.dying(dt);
        this.dieDim.color = new Color(10, 4, 20, Math.floor(150 * Math.min(1, t / 1.2)));
        const a = Math.floor(255 * Math.min(1, Math.max(0, (t - 0.7) / 0.4)));
        this.dieLabel.color = new Color(255, 230, 200, a);
        this.dieLabel.node.setScale(0.9 + 0.1 * Math.min(1, (t - 0.7) / 0.4), 0.9 + 0.1 * Math.min(1, Math.max(0, (t - 0.7) / 0.4)), 1);
        if (t > 1.7) {
          if (!this.adRevived && !this.battle.endless && Ads.canReward("revive")) this.setState("revive");
          else this.endRun(false);
        }
      }
      buildTutorial() {
        const n = this.tutNode = mkNode("Tutorial", this.ui);
        n.setPosition(0, this.bottom + 230);
        this.tutBg = mkRect(n, this.vw - 40, 70, new Color(20, 12, 34, 210), "tutBg");
        this.tutLabel = mkLabel(n, "", 30, C_GOLD2, "center", 4);
        this.tutJoy = mkSprite(n, "joy_base", 3).node;
        this.tutKnob = mkSprite(n, "joy_knob", 3).node;
        this.tutJoy.setPosition(0, 140);
        n.active = false;
      }
      tutStart() {
        this.tutStep = !Save.data.tutDone && Save.data.runs === 0 && !this.dailyRun ? 0 : -1;
        this.tutT = 0;
        if (this.tutStep === 0) this.battle.pendingBlessings = 0;
        this.tutX0 = this.battle.px;
        this.tutY0 = this.battle.py;
      }
      tutNext() {
        this.tutStep++;
        this.tutT = 0;
        if (this.tutStep === 4) this.battle.pendingBlessings++;
        if (this.tutStep >= GameRoot.TUT_TEXT.length) this.tutFinish();
      }
      tutFinish() {
        this.tutStep = -1;
        if (!Save.data.tutDone) {
          Save.data.tutDone = true;
          Save.save();
        }
      }
      updateTutorial(dt) {
        const step = this.tutStep;
        const st = this.state;
        const show = step >= 0 && (st === "play" || st === "levelup" && step === 3);
        this.tutNode.active = show;
        if (step < 0) return;
        const b = this.battle;
        if (st === "play" || st === "levelup") this.tutT += dt;
        if (step === 0 && Math.hypot(b.px - this.tutX0, b.py - this.tutY0) > 140) this.tutNext();
        else if (step === 1 && b.kills >= 5) this.tutNext();
        else if (step === 2 && st === "levelup") this.tutNext();
        else if (step === 3 && st === "play") this.tutNext();
        else if (step === 4) {
          const nb = b.nextBoss();
          if (this.tutT > 4) this.tutNode.active = false;
          if (nb && nb.remain <= 12) this.tutNext();
          else if (!nb) this.tutFinish();
        } else if (step === 5 && this.tutT > 6) this.tutFinish();
        if (this.tutStep < 0) {
          this.tutNode.active = false;
          return;
        }
        const txt = GameRoot.TUT_TEXT[this.tutStep];
        if (this.tutLabel.string !== txt) this.tutLabel.string = txt;
        this.tutNode.setPosition(0, this.bottom + (st === "levelup" ? 90 : 230));
        const pulse = 0.85 + 0.15 * Math.sin(this.t * 6);
        this.tutLabel.node.setScale(pulse * 0.1 + 0.9, pulse * 0.1 + 0.9, 1);
        this.tutLabel.color = this.tutStep === 5 ? new Color(255, 110, 100, 255) : C_GOLD2;
        const demo = this.tutStep === 0 && st === "play";
        this.tutJoy.active = this.tutKnob.active = demo;
        if (demo) {
          const a = this.t * 2.2;
          this.tutKnob.setPosition(Math.cos(a) * 34, 140 + Math.sin(a * 2) * 18);
        }
      }
      // 适龄提示标识（CADPA 规范：12+ 为蓝色，放在左上角，点击查看适龄提示）
      ageBadge(parent, x, y) {
        const p = mkPanel(parent, 84, 88, new Color(0, 112, 192, 255), new Color(255, 255, 255, 255));
        p.node.setPosition(x, y);
        mkLabel(p.node, AGE_RATING, 34, C_WHITE2, "center", 0).node.setPosition(0, 10);
        mkLabel(p.node, "CADPA", 15, C_WHITE2, "center", 0).node.setPosition(0, -26);
        p.node.on(Node.EventType.TOUCH_END, () => {
          Sound.play("click");
          this.showAgeTip();
        });
        return p;
      }
      showAgeTip() {
        if (this.ageNode) this.ageNode.active = true;
      }
      screen(state) {
        const n = mkNode("Screen_" + state, this.ui);
        this.screens[state] = n;
        return n;
      }
      header(parent, title, withGold = true) {
        mkLabel(parent, title, 52, C_GOLD2, "center", 5).node.setPosition(0, this.top - 60);
        if (!withGold) return;
        mkSprite(parent, "coin", 3).node.setPosition(-50, this.top - 122);
        const g2 = mkLabel(parent, "", 32, C_GOLD2, "left", 3);
        g2.node.setPosition(-28, this.top - 122);
        this.refreshers.push(() => {
          g2.string = String(Save.data.gold);
        });
      }
      buildMenu() {
        const s = this.screen("menu");
        const top = this.top;
        const btnTop = this.bottom + 120 + 4 * 100;
        const horizon = btnTop + 70;
        const titleY = this.menuTitleY = top - 180;
        this.menuBackdrop = new Backdrop(s, this.vw, this.vh, horizon, titleY - 10);
        this.menuTitle = mkNode("title", s);
        this.menuTitle.setPosition(0, titleY);
        mkLabel(this.menuTitle, GAME_NAME, 104, new Color(60, 6, 16, 255), "center", 0).node.setPosition(6, -8);
        mkLabel(this.menuTitle, GAME_NAME, 104, new Color(255, 236, 120, 255), "center", 8);
        mkLabel(this.menuTitle, GAME_SUBTITLE, 28, new Color(255, 120, 110, 255), "center", 4).node.setPosition(0, -84);
        this.titleSparks = [];
        for (const [x, y] of [[-250, 50], [235, 60], [-205, -55], [262, -30], [-120, 78], [140, -78]]) {
          const sp = mkSprite(this.menuTitle, "star", 2.4);
          sp.node.setPosition(x, y);
          this.titleSparks.push({ node: sp.node, sp, ph: Math.random() * 6.28 });
        }
        const heroH = Art.f("hero_hunter_0").rect.height;
        const avail = titleY - 130 - horizon;
        const sc = this.menuHeroScale = Math.max(1.8, Math.min(3.4, (avail - 30) / heroH));
        this.menuHeroBaseY = horizon - 6 + heroH * sc / 2;
        this.menuHeroShadow = mkSprite(s, "shadow", sc * 1.7).node;
        this.menuHeroShadow.setPosition(0, horizon - 4);
        this.menuHero = mkSprite(s, "hero_hunter_0", sc);
        this.menuHero.node.setPosition(0, this.menuHeroBaseY);
        this.menuHero.node.on(Node.EventType.TOUCH_END, () => this.heroHop());
        this.bubble = mkPanel(s, 240, 60, new Color(255, 255, 255, 250), new Color(30, 20, 40, 255)).node;
        this.bubbleLabel = mkLabel(this.bubble, "", 26, new Color(40, 24, 30, 255), "center", 0);
        mkRect(this.bubble, 14, 14, new Color(255, 255, 255, 250), "tail").node.setPosition(-60, -34);
        this.bubble.active = false;
        const plate = mkPanel(s, 230, 52, new Color(36, 20, 50, 235));
        plate.node.setPosition(this.vw / 2 - 135, horizon + 34);
        const name = mkLabel(plate.node, "", 22, C_WHITE2, "center", 2);
        plate.node.on(Node.EventType.TOUCH_END, () => {
          Sound.play("click");
          this.setState("chars");
        });
        const goldPanel = mkPanel(s, 200, 56, new Color(36, 20, 50, 235));
        goldPanel.node.setPosition(this.vw / 2 - 116, top - 40);
        mkSprite(goldPanel.node, "coin", 3).node.setPosition(-68, 0);
        const gold = mkLabel(goldPanel.node, "", 28, C_GOLD2, "left", 3);
        gold.node.setPosition(-46, 0);
        const daily = mkLabel(s, "\u4ECA\u65E5\u9996\u5C40 \u91D1\u5E01\xD72", 20, new Color(255, 214, 90, 255), "left", 3);
        daily.node.setPosition(-this.vw / 2 + 108, top - 40);
        const ev = mkLabel(s, "", 22, new Color(255, 120, 90, 255), "center", 3);
        ev.node.setPosition(0, titleY - 128);
        this.refreshers.push(() => {
          const cur = activeEvent();
          ev.node.active = !!cur;
          if (cur && ev.string !== cur.badge) ev.string = cur.badge;
        });
        this.ageBadge(s, -this.vw / 2 + 56, top - 48);
        const best = mkLabel(s, "", 22, C_GREY, "center", 2);
        best.node.setPosition(0, this.bottom + 46);
        mkLabel(s, GAME_VERSION, 16, new Color(120, 110, 140, 255), "left", 2).node.setPosition(-this.vw / 2 + 12, this.bottom + 14);
        mkButton(s, "\u5F00\u59CB\u6E38\u620F", 440, 100, () => this.startGame(), C_BTN_GREEN, 40).node.setPosition(0, btnTop);
        const sbtn = mkButton(s, "\u7B7E\u5230", 120, 60, () => this.setState("signin"), new Color(150, 60, 30, 255), 26);
        sbtn.node.setPosition(this.vw / 2 - 80, this.top - 110);
        const sdot = mkRect(sbtn.node, 16, 16, new Color(240, 60, 60, 255), "dot");
        sdot.node.setPosition(52, 22);
        this.refreshers.push(() => {
          sdot.node.active = this.signDue();
        });
        const dbtn = mkButton(s, "\u6BCF\u65E5\u6311\u6218", 212, 84, () => this.setState("daily"), new Color(150, 60, 30, 255), 32);
        dbtn.node.setPosition(-114, btnTop - 104);
        const ddot = mkRect(dbtn.node, 18, 18, new Color(240, 60, 60, 255), "dot");
        ddot.node.setPosition(94, 30);
        this.refreshers.push(() => {
          ddot.node.active = Save.data.dailyDone !== this.today;
        });
        mkButton(s, "\u9009\u62E9\u89D2\u8272", 212, 84, () => this.setState("chars"), C_BTN_BLUE, 32).node.setPosition(114, btnTop - 104);
        mkButton(s, "\u6C38\u4E45\u5F3A\u5316", 440, 84, () => this.setState("shop"), C_BTN_BLUE, 34).node.setPosition(0, btnTop - 200);
        mkButton(s, "\u6210\u5C31", 140, 80, () => this.setState("achv"), C_BTN_BLUE, 30).node.setPosition(-150, btnTop - 296);
        const cb = mkButton(s, "\u56FE\u9274", 140, 80, () => this.setState("codex"), C_BTN_BLUE, 30);
        cb.node.setPosition(0, btnTop - 296);
        const dot = mkRect(cb.node, 18, 18, new Color(240, 60, 60, 255), "dot");
        dot.node.setPosition(58, 28);
        this.refreshers.push(() => {
          dot.node.active = Save.data.codex.length > (Save.data.codexSeen || 0);
        });
        mkButton(s, "\u8BBE\u7F6E", 140, 80, () => this.setState("settings"), C_BTN_GREY, 30).node.setPosition(150, btnTop - 296);
        this.refreshers.push(() => {
          const c = this.selectedChar();
          this.menuHero.spriteFrame = Art.f(c.sprite + "_0");
          name.string = `${c.name} \xB7 ${c.title}  \u203A`;
          gold.string = String(Save.data.gold);
          daily.node.active = Save.data.bonusDay !== (/* @__PURE__ */ new Date()).toDateString();
          const d2 = Save.data;
          best.string = (d2.runs ? `\u6700\u4F73\uFF1A\u5B58\u6D3B ${this.fmtTime(d2.bestTime)}  \xB7  \u51FB\u8D25 ${d2.bestKills}  \xB7  \u7B49\u7EA7 ${d2.bestLevel}` : "\u5B58\u6D3B 15 \u5206\u949F\u5373\u53EF\u83B7\u80DC") + (d2.endlessBest ? `
\u65E0\u5C3D\u6A21\u5F0F\u6700\u4F73 ${this.fmtTime(d2.endlessBest)}` : "") + `   \u6210\u5C31 ${d2.achievements.length}/${ACHIEVEMENTS.length}`;
        });
      }
      // 点击主角：跳一下、说句话、呱一声
      heroHop() {
        if (this.heroJumpY > 0) return;
        this.heroJumpV = 760;
        this.bubbleLabel.string = FROG_LINES[Math.floor(Math.random() * FROG_LINES.length)];
        this.bubbleT = 1.6;
        Sound.play("croak");
        vibrate();
      }
      updateMenuFx(dt) {
        this.menuBackdrop.update(dt);
        const t = this.t;
        this.menuTitle.setPosition(0, this.menuTitleY + Math.sin(t * 1.6) * 6);
        const ts = 1 + Math.sin(t * 2.2) * 0.012;
        this.menuTitle.setScale(ts, ts, 1);
        for (const sp of this.titleSparks) {
          const k = 0.5 + 0.5 * Math.sin(t * 3 + sp.ph);
          sp.sp.color = new Color(255, 255, 255, Math.round(255 * k));
          const sc = 1.6 + 1.2 * k;
          sp.node.setScale(sc, sc, 1);
        }
        if (this.heroJumpV !== 0 || this.heroJumpY > 0) {
          this.heroJumpV -= 2400 * dt;
          this.heroJumpY += this.heroJumpV * dt;
          if (this.heroJumpY <= 0) {
            this.heroJumpY = 0;
            this.heroJumpV = 0;
          }
        }
        const c = this.selectedChar();
        const f = this.heroJumpY > 0 ? 2 : Math.floor(t / 0.45) % 2;
        this.menuHero.spriteFrame = Art.f(c.sprite + "_" + f);
        this.menuHero.node.setPosition(0, this.menuHeroBaseY + this.heroJumpY);
        const ss = this.menuHeroScale * 1.7 * Math.max(0.5, 1 - this.heroJumpY / 260);
        this.menuHeroShadow.setScale(ss, this.menuHeroScale * 1.3 * Math.max(0.5, 1 - this.heroJumpY / 260), 1);
        if (this.bubbleT > 0) {
          this.bubbleT -= dt;
          this.bubble.active = this.bubbleT > 0;
          const hh = Art.f(c.sprite + "_0").rect.height * this.menuHeroScale;
          this.bubble.setPosition(110, this.menuHeroBaseY + this.heroJumpY + hh / 2 + 10);
        }
      }
      buildChars() {
        const s = this.screen("chars");
        this.header(s, "\u9009\u62E9\u89D2\u8272");
        const y0 = this.top - 170;
        const cols = 3;
        const rowsN = Math.ceil(CHARACTERS.length / cols);
        const avail = y0 - (this.bottom + 405);
        const ch = Math.min(250, avail / rowsN - 10);
        const cw = 226;
        CHARACTERS.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const card = mkPanel(s, cw, ch);
          card.node.setPosition((col - 1) * (cw + 10), y0 - ch / 2 - row * (ch + 10));
          const sc = Math.min(1.5, (ch - 96) / 68);
          const spr = mkSprite(card.node, c.sprite + "_0", sc);
          spr.node.setPosition(0, ch / 2 - 8 - 34 * sc);
          mkLabel(card.node, c.name, 26, C_WHITE2, "center", 3).node.setPosition(0, -ch / 2 + 70);
          const wd = WEAPONS.find((w) => w.id === c.weapon);
          mkSprite(card.node, wd.icon, 1.6).node.setPosition(-cw / 2 + 30, -ch / 2 + 42);
          mkLabel(card.node, wd.name, 18, C_GOLD2, "left", 2).node.setPosition(-cw / 2 + 46, -ch / 2 + 42);
          mkLabel(card.node, c.desc, 15, C_GREEN, "center", 2).node.setPosition(0, -ch / 2 + 16);
          const lock = mkRect(card.node, cw - 6, ch - 6, new Color(0, 0, 0, 175), "lock");
          mkSprite(lock.node, "icon_lock", 3).node.setPosition(0, 20);
          const evOf = EVENTS.find((e) => e.char === c.id);
          mkLabel(lock.node, c.cost < 0 ? evOf ? evOf.lockText : "\u6D3B\u52A8\u9650\u5B9A" : `${c.cost} \u91D1\u5E01\u89E3\u9501`, 22, C_GOLD2, "center", 3).node.setPosition(0, -34);
          card.node.on(Node.EventType.TOUCH_END, () => {
            Sound.play("click");
            const d2 = Save.data;
            if (!d2.chars.includes(c.id)) {
              if (c.cost < 0) {
                this.showToast(evOf ? evOf.hint : "\u6D3B\u52A8\u9650\u5B9A\u89D2\u8272");
                return;
              }
              if (d2.gold < c.cost) {
                this.showToast("\u91D1\u5E01\u4E0D\u8DB3");
                return;
              }
              d2.gold -= c.cost;
              d2.chars.push(c.id);
              Sound.play("chest");
              this.showToast(`\u89E3\u9501 ${c.name}!`);
            }
            d2.selected = c.id;
            Save.save();
            this.refreshAll();
          });
          this.refreshers.push(() => {
            lock.node.active = !Save.data.chars.includes(c.id);
            const sel = Save.data.selected === c.id;
            card.border.color = sel ? C_GREEN : C_BORDER2;
            card.fill.color = sel ? new Color(36, 64, 60, 250) : new Color(36, 30, 64, 245);
          });
        });
        const by = this.bottom + 80;
        mkButton(s, "\u8FD4\u56DE", 260, 88, () => this.setState("menu"), C_BTN_GREY).node.setPosition(-150, by);
        mkButton(s, "\u51FA\u53D1!", 260, 88, () => this.startGame(), C_BTN_GREEN, 36).node.setPosition(150, by);
        const mode = mkButton(s, "", 560, 64, () => {
          if (Save.data.wins <= 0) {
            this.showToast("\u9996\u6B21\u80DC\u5229\u540E\u89E3\u9501\u65E0\u5C3D\u6A21\u5F0F\u4E0E\u5669\u68A6\u96BE\u5EA6");
            return;
          }
          const order = ["normal", "endless", "nightmare"];
          Save.data.mode = order[(order.indexOf(Save.data.mode) + 1) % order.length];
          Save.save();
          this.refreshAll();
        }, C_BTN_GREY, 26);
        mode.node.setPosition(0, by + 92);
        const traitLbl = mkLabel(s, "", 19, C_GOLD2, "center", 2);
        traitLbl.lineHeight = 25;
        traitLbl.node.setPosition(0, by + 262);
        this.refreshers.push(() => {
          const c = this.selectedChar();
          traitLbl.string = `\u2605 \u5929\u8D4B\u300C${c.traitName}\u300D${c.trait}
\u25C6 \u5927\u62DB\u300C${c.ultName}\u300D${c.ult}
\u5145\u80FD\uFF1A${CHARGE_DESC[c.charge]}`;
        });
        const stageBtn = mkButton(s, "", 560, 64, () => {
          const d2 = Save.data;
          const unlocked = STAGES.filter((st) => this.stageOpen(st.id));
          const i = unlocked.findIndex((st) => st.id === d2.stage);
          d2.stage = unlocked[(i + 1) % unlocked.length].id;
          if (unlocked.length === 1) this.showToast("\u5728\u6708\u5149\u8349\u539F\u80DC\u5229\u540E\u89E3\u9501\u65B0\u5730\u56FE");
          Save.save();
          this.refreshAll();
        }, new Color(40, 70, 90, 255), 24);
        stageBtn.node.setPosition(0, by + 166);
        this.refreshers.push(() => {
          const st = this.currentStage;
          const regular = STAGES.filter((x) => !x.event);
          const n = regular.filter((x) => this.stageOpen(x.id)).length;
          stageBtn.label.string = `\u5730\u56FE\uFF1A${st.name}${st.event ? "\uFF08\u6D3B\u52A8\u9650\u5B9A\uFF09" : `\uFF08${n}/${regular.length}\uFF09`}  ${st.hpMul > 1 ? `\u751F\u547D+${Math.round((st.hpMul - 1) * 100)}% \u91D1\u5E01+${Math.round((st.goldMul - 1) * 100)}%` : "\u6807\u51C6\u96BE\u5EA6"}`;
        });
        this.refreshers.push(() => {
          const locked = Save.data.wins <= 0;
          const e = this.endlessMode, n = this.nightmareMode;
          mode.label.string = locked ? "\u6A21\u5F0F\uFF1A\u666E\u901A\uFF08\u65E0\u5C3D / \u5669\u68A6 \u9996\u80DC\u89E3\u9501\uFF09" : e ? "\u6A21\u5F0F\uFF1A\u65E0\u5C3D\uFF08Boss \u5FAA\u73AF\uFF0C\u8D8A\u6765\u8D8A\u5F3A\uFF09" : n ? "\u6A21\u5F0F\uFF1A\u5669\u68A6\uFF08\u751F\u547D +60% \u4F24\u5BB3 +30% \u91D1\u5E01 +60%\uFF09" : "\u6A21\u5F0F\uFF1A\u666E\u901A\uFF08\u5B58\u6D3B 15 \u5206\u949F\u80DC\u5229\uFF09";
          mode.bg.color = e ? new Color(110, 40, 120, 255) : n ? new Color(140, 30, 40, 255) : C_BTN_GREY;
        });
      }
      buildShop() {
        const s = this.screen("shop");
        this.header(s, "\u6C38\u4E45\u5F3A\u5316");
        const rows = Math.ceil(POWERUPS.length / 2);
        const y0 = this.top - 160;
        const avail = y0 - (this.bottom + 150);
        const ch = Math.min(130, avail / rows - 10);
        const cw = 344;
        POWERUPS.forEach((p, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const card = mkPanel(s, cw, ch);
          card.node.setPosition((col - 0.5) * (cw + 12), y0 - ch / 2 - row * (ch + 10));
          mkSprite(card.node, p.icon, Math.min(3, ch / 40)).node.setPosition(-cw / 2 + 38, 0);
          mkLabel(card.node, p.name, 26, C_WHITE2, "left", 3).node.setPosition(-cw / 2 + 72, ch * 0.25);
          mkLabel(card.node, p.desc, 17, C_GREY, "left", 2).node.setPosition(-cw / 2 + 72, -ch * 0.3);
          const pips = [];
          for (let k = 0; k < p.max; k++) {
            const pip = mkRect(card.node, 14, 14, C_GREY, "pip");
            pip.node.setPosition(-cw / 2 + 80 + k * 20, 0);
            pips.push(pip);
          }
          const cost = mkLabel(card.node, "", 22, C_GOLD2, "right", 3);
          cost.node.setPosition(cw / 2 - 12, ch * 0.25);
          card.node.on(Node.EventType.TOUCH_END, () => {
            const r = Save.rank(p.id);
            if (r >= p.max) {
              Sound.play("click");
              this.showToast("\u5DF2\u6EE1\u7EA7");
              return;
            }
            const c = powerUpCost(p, r, Save.totalBought());
            if (Save.data.gold < c) {
              Sound.play("click");
              this.showToast("\u91D1\u5E01\u4E0D\u8DB3");
              return;
            }
            Save.data.gold -= c;
            Save.data.power[p.id] = r + 1;
            Save.save();
            Sound.play("coin");
            this.refreshAll();
          });
          this.refreshers.push(() => {
            const r = Save.rank(p.id);
            pips.forEach((pp, k) => {
              pp.color = k < r ? C_GOLD2 : new Color(70, 64, 90, 255);
            });
            cost.string = r >= p.max ? "\u5DF2\u6EE1" : String(powerUpCost(p, r, Save.totalBought()));
          });
        });
        const by = this.bottom + 80;
        mkButton(s, "\u5168\u90E8\u8FD4\u8FD8", 260, 88, () => this.refundAll(), C_BTN_GREY, 30).node.setPosition(-150, by);
        mkButton(s, "\u8FD4\u56DE", 260, 88, () => this.setState("menu"), C_BTN_BLUE).node.setPosition(150, by);
      }
      // 按购买价格全额返还所有强化
      refundAll() {
        const d2 = Save.data;
        const ranks = { ...d2.power };
        let bought = Save.totalBought();
        let total = 0;
        while (bought > 0) {
          const p = POWERUPS.find((x) => (ranks[x.id] || 0) > 0);
          if (!p) break;
          ranks[p.id]--;
          bought--;
          total += powerUpCost(p, ranks[p.id], bought);
        }
        if (!total) {
          this.showToast("\u6CA1\u6709\u53EF\u8FD4\u8FD8\u7684\u5F3A\u5316");
          return;
        }
        d2.gold += total;
        d2.power = {};
        Save.save();
        Sound.play("coin");
        this.showToast(`\u8FD4\u8FD8 ${total} \u91D1\u5E01`);
        this.refreshAll();
      }
      toggleRow(parent, y, icon2, text, key) {
        mkSprite(parent, icon2, 3).node.setPosition(-210, y);
        mkLabel(parent, text, 32, C_WHITE2, "left", 3).node.setPosition(-165, y);
        const btn = mkButton(parent, "", 150, 72, () => {
          Save.data[key] = !Save.data[key];
          Save.save();
          if (key === "music") Sound.refreshMusic();
          this.refreshAll();
        }, C_BTN_GREEN, 30);
        btn.node.setPosition(170, y);
        this.refreshers.push(() => {
          const on = Save.data[key];
          btn.label.string = on ? "\u5F00" : "\u5173";
          btn.bg.color = on ? C_BTN_GREEN : C_BTN_GREY;
        });
      }
      buildSettings() {
        const s = this.screen("settings");
        this.header(s, "\u8BBE\u7F6E", false);
        const p = mkPanel(s, 580, 470);
        p.node.setPosition(0, this.vh * 0.14);
        this.toggleRow(p.node, 165, "icon_music", "\u80CC\u666F\u97F3\u4E50", "music");
        this.toggleRow(p.node, 55, "icon_sound", "\u6E38\u620F\u97F3\u6548", "sfx");
        this.toggleRow(p.node, -55, "icon_vibrate", "\u9707\u52A8\u53CD\u9988", "vibrate");
        this.toggleRow(p.node, -165, "icon_chain", "\u6027\u80FD\u6A21\u5F0F", "lite");
        mkLabel(s, "\u6027\u80FD\u6A21\u5F0F\uFF1A\u51CF\u5C11\u540C\u5C4F\u602A\u7269\u4E0E\u7279\u6548\uFF0C\u9002\u5408\u8F83\u65E7\u7684\u624B\u673A", 20, C_GREY, "center", 2).node.setPosition(0, this.vh * 0.14 - 265);
        const stats = mkLabel(s, "", 26, C_GREY, "center", 3);
        stats.node.setPosition(0, -this.vh * 0.2);
        this.refreshers.push(() => {
          const d2 = Save.data;
          stats.string = `\u6E38\u620F\u6B21\u6570  ${d2.runs}
\u80DC\u5229\u6B21\u6570  ${d2.wins}
\u7D2F\u8BA1\u51FB\u8D25  ${d2.totalKills}
\u6700\u957F\u5B58\u6D3B  ${this.fmtTime(d2.bestTime)}`;
        });
        mkButton(s, "\u8FD4\u56DE", 300, 88, () => this.setState("menu"), C_BTN_BLUE).node.setPosition(0, this.bottom + 80);
      }
      buildPause() {
        const s = this.screen("pause");
        mkLabel(s, "\u6682\u505C", 72, C_WHITE2, "center", 5).node.setPosition(0, this.vh * 0.3);
        const build = mkNode("build", s);
        build.setPosition(0, this.vh * 0.19);
        this.refreshers.push(() => {
          if (this.state !== "pause") return;
          build.destroyAllChildren();
          const items = [
            ...this.battle.weapons.map((w) => ({ icon: w.icon, lv: w.evolved ? "\u2605" : String(w.level) })),
            ...this.battle.passives.map((p) => ({ icon: p.def.icon, lv: String(p.level) })),
            ...this.battle.blessings.map((b) => ({ icon: b.icon, lv: "\u25C6" }))
          ];
          items.forEach((it, i) => {
            const x = (i % 6 - 2.5) * 80, y = -Math.floor(i / 6) * 80;
            mkSprite(build, it.icon, 3).node.setPosition(x, y);
            mkLabel(build, it.lv, 18, C_WHITE2, "center", 2).node.setPosition(x + 20, y - 22);
          });
        });
        const y0 = -this.vh * 0.02;
        mkButton(s, "\u7EE7\u7EED\u6E38\u620F", 420, 96, () => this.setState("play"), C_BTN_GREEN, 36).node.setPosition(0, y0);
        const music = mkButton(s, "", 200, 80, () => {
          Save.data.music = !Save.data.music;
          Save.save();
          Sound.refreshMusic();
          this.refreshAll();
        }, C_BTN_GREY, 26);
        music.node.setPosition(-110, y0 - 120);
        const sfx = mkButton(s, "", 200, 80, () => {
          Save.data.sfx = !Save.data.sfx;
          Save.save();
          this.refreshAll();
        }, C_BTN_GREY, 26);
        sfx.node.setPosition(110, y0 - 120);
        this.refreshers.push(() => {
          music.label.string = "\u97F3\u4E50\uFF1A" + (Save.data.music ? "\u5F00" : "\u5173");
          sfx.label.string = "\u97F3\u6548\uFF1A" + (Save.data.sfx ? "\u5F00" : "\u5173");
        });
        mkButton(s, "\u653E\u5F03\u672C\u5C40", 420, 88, () => this.endRun(false), new Color(120, 30, 40, 255), 30).node.setPosition(0, y0 - 240);
      }
      buildLevelUp() {
        const s = this.screen("levelup");
        this.levelTitle = mkLabel(s, "\u5347\u7EA7!", 60, C_GOLD2, "center", 5);
        this.levelTitle.node.setPosition(0, this.vh * 0.27);
        for (let i = 0; i < 3; i++) {
          const p = mkPanel(s, 660, 150);
          p.node.setPosition(0, this.vh * 0.13 - i * 170);
          const icon2 = mkSprite(p.node, "icon_whip", 4.5);
          icon2.node.setPosition(-260, 0);
          const name = mkLabel(p.node, "", 32, C_GOLD2, "left", 3);
          name.node.setPosition(-200, 34);
          const tag = mkLabel(p.node, "", 24, new Color(120, 220, 255, 255), "right", 3);
          tag.node.setPosition(310, 34);
          const desc = mkLabel(p.node, "", 22, C_WHITE2, "left", 2);
          desc.node.setPosition(-200, -24);
          const idx = i;
          p.node.on(Node.EventType.TOUCH_END, () => this.choose(idx));
          this.cards.push({ node: p.node, icon: icon2, name, tag, desc, border: p.border, fill: p.fill });
        }
        this.rerollBtn = mkButton(s, "\u91CD\u62BD", 300, 80, () => this.reroll(), C_BTN_BLUE, 28);
        this.rerollBtn.node.setPosition(0, this.vh * 0.13 - 3 * 170 + 20);
        const adY = this.vh * 0.13 - 3 * 170 + 20;
        this.adRerollBtn = mkButton(s, "", 380, 80, () => this.watchAd("reroll", () => {
          this.adRerolls--;
          this.options = this.battle.buildOptions();
          this.fillCards();
        }), C_AD, 26);
        this.adRerollBtn.node.setPosition(0, adY);
        this.adBlessBtn = mkButton(s, "\u25B6 \u770B\u5E7F\u544A \u989D\u5916\u591A\u9009\u4E00\u5F20", 440, 80, () => this.watchAd("blessing", () => {
          this.adBlessUsed = true;
          this.battle.pendingBlessings++;
          this.adBlessBtn.node.active = false;
          this.showToast("\u9009\u5B8C\u8FD9\u5F20\u540E\u8FD8\u80FD\u518D\u9009\u4E00\u5F20!");
        }), C_AD, 26);
        this.adBlessBtn.node.setPosition(0, adY);
      }
      buildChest() {
        const s = this.screen("chest");
        mkLabel(s, "\u5B9D\u7BB1!", 64, C_GOLD2, "center", 5).node.setPosition(0, this.vh * 0.3);
        mkSprite(s, "chest", 6).node.setPosition(0, this.vh * 0.18);
        this.chestIcon = mkSprite(s, "icon_whip", 6);
        this.chestIcon.node.setPosition(0, this.vh * 0.04);
        this.chestTitle = mkLabel(s, "", 40, C_GOLD2, "center", 4);
        this.chestTitle.node.setPosition(0, -this.vh * 0.06);
        this.chestDesc = mkLabel(s, "", 26, C_WHITE2, "center", 3);
        this.chestDesc.node.setPosition(0, -this.vh * 0.11);
        this.chestGold = mkLabel(s, "", 30, C_GOLD2, "center", 3);
        this.chestGold.node.setPosition(0, -this.vh * 0.16);
        this.chestAdBtn = mkButton(s, "\u25B6 \u770B\u5E7F\u544A \u518D\u5F00\u4E00\u6B21", 400, 76, () => this.watchAd("chest", () => {
          this.adChestUsed = true;
          this.chestAdBtn.node.active = false;
          const r = this.battle.openChest(true);
          this.showChestResult(r, "\u518D\u5F00\u4E00\u6B21\uFF1A");
        }), C_AD, 26);
        this.chestAdBtn.node.setPosition(0, -this.vh * 0.215);
        mkButton(s, "\u786E\u5B9A", 300, 90, () => {
          this.afterReward();
          if (this.state === "play") this.battle.levelBlast();
        }, C_BTN_GREEN, 34).node.setPosition(0, -this.vh * 0.29);
      }
      showChestResult(r, prefix = "") {
        this.chestIcon.spriteFrame = Art.f(r.icon);
        this.chestTitle.string = prefix + r.title;
        this.chestDesc.string = r.desc;
        this.chestGold.string = `+${r.gold} \u91D1\u5E01`;
        Sound.play(r.evolved ? "evolve" : "chest");
      }
      buildResult() {
        const s = this.screen("result");
        this.resultTitle = mkLabel(s, "", 76, C_RED, "center", 6);
        this.resultTitle.node.setPosition(0, this.top - 110);
        this.resultStats = mkLabel(s, "", 28, C_WHITE2, "center", 3);
        this.resultStats.node.setPosition(0, this.top - 290);
        this.resultList = mkNode("list", s);
        this.resultHint = mkLabel(s, "", 24, new Color(255, 200, 120, 255), "center", 3);
        this.resultHint.node.setPosition(0, this.top - 430);
        this.resultList.setPosition(0, this.top - 520);
        const by = this.bottom + 80;
        mkButton(s, "\u4E3B\u83DC\u5355", 260, 88, () => {
          Ads.afterRun(this.adWatchedThisResult);
          this.toMenu();
        }, C_BTN_GREY).node.setPosition(-150, by);
        mkButton(s, "\u518D\u6765\u4E00\u5C40", 260, 88, () => {
          Ads.afterRun(this.adWatchedThisResult);
          this.replay();
        }, C_BTN_GREEN).node.setPosition(150, by);
        this.goldAdBtn = mkButton(s, "", 380, 80, () => this.watchAd("gold", () => {
          this.adGoldUsed = true;
          Save.data.gold += this.lastRunGold;
          Save.save();
          this.showToast(`\u91D1\u5E01 +${this.lastRunGold}!`);
          Sound.play("coin");
          this.refreshAll();
        }), C_AD, 26);
        this.shareBtn = mkButton(s, "\u5206\u4EAB\u6218\u7EE9", 200, 80, () => this.shareResult(), C_BTN_BLUE, 26);
        this.recBtn = mkButton(s, "\u5206\u4EAB\u672C\u5C40\u5F55\u5C4F", 300, 72, () => {
          const b = this.battle;
          Recorder.share(b.won ? "\u6211\u7684\u5976\u86D9\u6D3B\u8FC7\u4E86 15 \u5206\u949F\uFF01" : `\u6211\u7684\u5976\u86D9\u575A\u6301\u4E86 ${this.fmtTime(b.time)}\uFF0C\u5272\u5012 ${b.kills} \u53EA\u602A\u7269`, (ok) => {
            if (!ok) this.showToast("\u5206\u4EAB\u672A\u5B8C\u6210");
          });
        }, new Color(200, 40, 90, 255), 26);
        this.recBtn.node.setPosition(0, by + 186);
        this.refreshers.push(() => {
          if (this.state !== "result") return;
          this.recBtn.node.active = Recorder.ready;
          const showAd = !this.adGoldUsed && this.lastRunGold > 0 && Ads.canReward("gold");
          const showShare = !!mgApi();
          this.goldAdBtn.node.active = showAd;
          this.goldAdBtn.label.string = `\u25B6 \u770B\u5E7F\u544A \u91D1\u5E01\xD72 (+${this.lastRunGold})`;
          this.shareBtn.node.active = showShare;
          this.goldAdBtn.node.setPosition(showShare ? -95 : 0, by + 100);
          this.shareBtn.node.setPosition(showAd ? 200 : 0, by + 100);
        });
      }
      // 死亡复活（每局一次，看广告满血复活）
      buildRevive() {
        const s = this.screen("revive");
        mkLabel(s, "\u4F60\u5012\u4E0B\u4E86\u2026", 64, C_RED, "center", 5).node.setPosition(0, this.vh * 0.2);
        mkLabel(s, "\u770B\u4E00\u6BB5\u5E7F\u544A\uFF0C\u6EE1\u72B6\u6001\u539F\u5730\u590D\u6D3B?", 30, C_WHITE2, "center", 3).node.setPosition(0, this.vh * 0.1);
        this.reviveCount = mkLabel(s, "", 72, C_GOLD2, "center", 5, true);
        this.reviveCount.node.setPosition(0, 0);
        mkButton(s, "\u25B6 \u770B\u5E7F\u544A\u590D\u6D3B", 420, 100, () => this.watchAd("revive", () => {
          this.adRevived = true;
          this.battle.revive(1);
          this.setState("play");
        }, () => {
          this.reviveT = Math.max(this.reviveT, 3);
        }), C_AD, 36).node.setPosition(0, -this.vh * 0.1);
        mkButton(s, "\u653E\u5F03", 260, 80, () => this.endRun(false), C_BTN_GREY, 28).node.setPosition(0, -this.vh * 0.2);
      }
      // 启动页：动态夜景 + Logo 弹出 + 加载条 + 健康游戏忠告 + 适龄提示（法规要求）
      buildSplash() {
        const s = this.screen("splash");
        const horizon = -this.vh * 0.05;
        this.splashBackdrop = new Backdrop(s, this.vw, this.vh, horizon, this.vh * 0.2);
        this.splashLogo = mkNode("logo", s);
        this.splashLogo.setPosition(0, this.vh * 0.21);
        mkLabel(this.splashLogo, GAME_NAME, 104, new Color(60, 6, 16, 255), "center", 0).node.setPosition(6, -8);
        mkLabel(this.splashLogo, GAME_NAME, 104, new Color(255, 236, 120, 255), "center", 8);
        mkLabel(this.splashLogo, GAME_SUBTITLE, 28, new Color(255, 120, 110, 255), "center", 4).node.setPosition(0, -84);
        const heroH = Art.f("hero_hunter_0").rect.height;
        const hs = 2.4;
        this.splashHeroBaseY = horizon - 6 + heroH * hs / 2;
        mkSprite(s, "shadow", hs * 1.7).node.setPosition(0, horizon - 4);
        this.splashHero = mkSprite(s, "hero_hunter_0", hs);
        this.splashHero.node.setPosition(0, this.splashHeroBaseY);
        const barY = -this.vh * 0.12;
        this.splashLoad = mkLabel(s, "", 22, new Color(230, 220, 240, 255), "center", 2, true);
        this.splashLoad.node.setPosition(0, barY + 32);
        mkRect(s, 448, 22, new Color(20, 10, 30, 255), "barBg").node.setPosition(0, barY);
        this.splashFill = mkRect(s, 440, 14, new Color(255, 214, 90, 255), "barFill", 0, 0.5).node;
        this.splashFill.setPosition(-220, barY);
        mkLabel(s, "\u5065\u5EB7\u6E38\u620F\u5FE0\u544A", 26, C_WHITE2, "center", 2).node.setPosition(0, -this.vh * 0.2);
        mkLabel(s, HEALTH_TIP, 21, new Color(200, 190, 210, 255), "center", 2).node.setPosition(0, -this.vh * 0.285);
        this.ageBadge(s, -this.vw / 2 + 56, this.top - 48);
        s.addComponent(UITransform).setContentSize(this.vw, this.vh);
        s.on(Node.EventType.TOUCH_END, () => {
          if (this.splashT > 1) this.afterSplash();
        });
        this.refreshers.push(() => {
          this.splashHero.spriteFrame = Art.f(this.selectedChar().sprite + "_0");
        });
      }
      updateSplashFx(dt) {
        this.splashBackdrop.update(dt);
        const t = this.splashT;
        const k = Math.min(1, t / 0.6);
        const e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
        const sc = Math.max(0.01, e) * (1 + Math.sin(this.t * 2) * 0.01);
        this.splashLogo.setScale(sc, sc, 1);
        const hop = Math.abs(Math.sin(t * 4.5)) * 26;
        this.splashHero.node.setPosition(0, this.splashHeroBaseY + hop);
        this.splashHero.spriteFrame = Art.f(this.selectedChar().sprite + (hop > 8 ? "_2" : "_1"));
        const p = Math.min(1, t / 2.3);
        this.splashFill.setScale(p, 1, 1);
        this.splashLoad.string = `\u6B63\u5728\u53EC\u5524\u5976\u86D9\u2026 ${Math.floor(p * 100)}%`;
      }
      afterSplash() {
        if (this.state !== "splash") return;
        this.setState(Save.data.privacyOk ? "menu" : "privacy");
      }
      // 首次启动：用户协议与隐私政策
      buildPrivacy() {
        const s = this.screen("privacy");
        const p = mkPanel(s, 640, 620);
        p.node.setPosition(0, this.vh * 0.04);
        mkLabel(p.node, "\u7528\u6237\u534F\u8BAE\u4E0E\u9690\u79C1\u653F\u7B56", 34, C_GOLD2, "center", 3).node.setPosition(0, 250);
        mkLabel(p.node, `\u6B22\u8FCE\u6765\u5230\u300A${GAME_NAME}\u300B\uFF01

\u6211\u4EEC\u975E\u5E38\u91CD\u89C6\u4F60\u7684\u4E2A\u4EBA\u4FE1\u606F\u4FDD\u62A4\uFF1A
\xB7 \u672C\u6E38\u620F\u4E0D\u6536\u96C6\u4F60\u7684\u4E2A\u4EBA\u4FE1\u606F\uFF1B
\xB7 \u6E38\u620F\u8FDB\u5EA6\u53EA\u4FDD\u5B58\u5728\u4F60\u7684\u624B\u673A\u672C\u5730\uFF1B
\xB7 \u6E38\u620F\u4E2D\u7684\u5E7F\u544A\u7531\u5FAE\u4FE1\u5E73\u53F0\u63D0\u4F9B\uFF0C
  \u76F8\u5173\u4FE1\u606F\u5904\u7406\u9075\u5FAA\u300A\u5FAE\u4FE1\u9690\u79C1\u4FDD\u62A4\u6307\u5F15\u300B\uFF1B
\xB7 \u4F60\u53EF\u4EE5\u968F\u65F6\u5728\u5FAE\u4FE1\u4E2D\u5220\u9664\u672C\u5C0F\u6E38\u620F\u53CA\u5176\u6570\u636E\u3002

\u70B9\u51FB\u201C\u540C\u610F\u201D\u5373\u8868\u793A\u4F60\u5DF2\u9605\u8BFB\u5E76\u540C\u610F
\u300A\u7528\u6237\u534F\u8BAE\u300B\u548C\u300A\u9690\u79C1\u653F\u7B56\u300B\u3002`, 22, C_WHITE2, "center", 2).node.setPosition(0, 10);
        mkButton(p.node, "\u4E0D\u540C\u610F", 220, 80, () => {
          const w = mgApi();
          if (w && w.exitMiniProgram) w.exitMiniProgram({});
          else this.showToast("\u9700\u8981\u540C\u610F\u540E\u624D\u80FD\u5F00\u59CB\u6E38\u620F");
        }, C_BTN_GREY, 28).node.setPosition(-130, -250);
        mkButton(p.node, "\u540C\u610F", 220, 80, () => {
          Save.data.privacyOk = true;
          Save.save();
          this.setState("menu");
        }, C_BTN_GREEN, 30).node.setPosition(130, -250);
      }
      // 看激励视频：看完发奖；没看完或失败给出提示
      watchAd(place, onReward, onFail) {
        Ads.showReward(place, (r) => {
          if (r.ok) {
            this.adWatchedThisResult = true;
            onReward();
          } else {
            this.showToast(r.reason === "skipped" ? "\u5B8C\u6574\u89C2\u770B\u5E7F\u544A\u624D\u80FD\u83B7\u5F97\u5956\u52B1" : "\u5E7F\u544A\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
            if (onFail) onFail();
          }
          this.refreshAll();
        });
      }
      // ------------------------------------------------------------------ 状态
      setState(s) {
        if (s === "menu" && this.signDue() && Save.data.signShown !== this.today && Save.data.runs > 0) {
          Save.data.signShown = this.today;
          s = "signin";
        }
        const prev = this.state;
        this.state = s;
        for (const k in this.screens) this.screens[k].active = k === s;
        const inRun = s === "play" || s === "levelup" || s === "chest" || s === "pause" || s === "revive";
        this.hud.active = inRun;
        this.overlay.node.active = s !== "play" && s !== "victory" && s !== "dying";
        this.overlay.color = inRun || s === "result" ? C_DIM : new Color(0, 0, 0, s === "menu" ? 90 : 190);
        this.touchLayer.active = s === "play";
        if (s !== "play") this.onJoyEnd();
        if (s === "menu" || s === "chars" || s === "shop" || s === "settings" || s === "achv" || s === "codex" || s === "signin" || s === "privacy" || s === "daily") Sound.playBgm("bgm_menu");
        if (s === "codex") {
          Save.data.codexSeen = Save.data.codex.length;
          Save.save();
        }
        if (s === "revive") {
          this.reviveT = 8;
          Sound.pauseBgm();
        }
        if (prev === "revive" && s === "play") Sound.resumeBgm();
        if (s === "pause") {
          Sound.pauseBgm();
          Recorder.pause();
        }
        if (prev === "pause" && s === "play") Recorder.resume();
        if (prev === "pause" && s === "play") Sound.resumeBgm();
        this.refreshAll();
      }
      refreshAll() {
        for (const f of this.refreshers) f();
      }
      // 活动地图只在活动期间开放；普通地图按胜利依次解锁
      stageOpen(id) {
        const st = STAGES.find((x) => x.id === id);
        if (!st) return false;
        if (st.event) {
          const ev = activeEvent();
          return !!ev && ev.id === st.event;
        }
        return Save.data.stages.includes(id);
      }
      get currentStage() {
        return STAGES.find((x) => x.id === Save.data.stage && this.stageOpen(x.id)) || STAGES[0];
      }
      get endlessMode() {
        return Save.data.mode === "endless" && Save.data.wins > 0;
      }
      get nightmareMode() {
        return Save.data.mode === "nightmare" && Save.data.wins > 0;
      }
      toMenu() {
        this.dailyRun = false;
        this.battle.reset(this.selectedChar());
        this.battle.setPlayerVisible(false);
        this.setState("menu");
      }
      get today() {
        return (/* @__PURE__ */ new Date()).toDateString();
      }
      // 每日挑战：固定试玩角色、地图、规则与命运卡牌，存活 10 分钟
      startDaily() {
        const ds = dailySetup(this.today);
        const ch = CHARACTERS.find((c) => c.id === ds.char) || CHARACTERS[0];
        this.dailyRun = true;
        this.tutStep = -1;
        this.adRevived = this.adBlessUsed = false;
        this.adRerolls = AD_CONFIG.rerollPerRun;
        this.battle.reset(ch, false, ds.stage, { mod: ds.mod, blessing: ds.blessing });
        this.battle.nightmare = false;
        this.battle.setPlayerVisible(true);
        this.refreshIcons();
        this.bannerT = 0;
        Sound.play("start");
        Sound.playBgm("bgm_battle");
        Recorder.start();
        this.setState("play");
        this.banner(`\u6BCF\u65E5\u6311\u6218 \xB7 ${ds.mod.name}`, new Color(255, 170, 80, 255));
      }
      replay() {
        if (this.dailyRun) this.startDaily();
        else this.startGame();
      }
      startGame() {
        this.dailyRun = false;
        this.adRevived = this.adBlessUsed = false;
        this.adRerolls = AD_CONFIG.rerollPerRun;
        this.battle.reset(this.selectedChar(), this.endlessMode, this.currentStage.id);
        this.battle.nightmare = this.nightmareMode;
        this.battle.setPlayerVisible(true);
        this.refreshIcons();
        this.bannerT = 0;
        this.bannerLabel.node.active = false;
        Sound.play("start");
        Sound.playBgm("bgm_battle");
        Recorder.start();
        this.setState("play");
        this.tutStart();
        const st = this.battle.streak;
        this.banner(this.endlessMode ? "\u65E0\u5C3D\u4E4B\u591C \xB7 \u80FD\u6491\u591A\u4E45?" : this.nightmareMode ? `\u5669\u68A6\u96BE\u5EA6 \xB7 ${this.currentStage.name}` : st > 0 ? `\u4E0D\u5C48\u610F\u5FD7 \xB7 \u4F24\u5BB3\u4E0E\u751F\u547D +${st * 5}%` : `${this.currentStage.name} \xB7 \u751F\u5B58\u4E0B\u53BB!`, new Color(255, 230, 120, 255));
      }
      // 结算：发放金币、记录最佳成绩
      endRun(win) {
        Recorder.stop();
        if (this.tutStep >= 0) this.tutFinish();
        this.tutNode.active = false;
        const b = this.battle;
        const d2 = Save.data;
        const bonus = Math.round((Math.floor(b.time / 60) * 25 + (win ? 500 : 0)) * b.stats.greed * b.stage.goldMul * (b.nightmare ? 1.6 : 1));
        let total = b.gold + bonus;
        const today = (/* @__PURE__ */ new Date()).toDateString();
        const daily = d2.bonusDay !== today;
        if (daily) {
          d2.bonusDay = today;
          total *= 2;
        }
        d2.gold += total;
        this.lastRunGold = total;
        this.adGoldUsed = false;
        this.adWatchedThisResult = false;
        this.dailyReward = 0;
        if (this.dailyRun) {
          if (d2.dailyBestDate !== this.today) {
            d2.dailyBestDate = this.today;
            d2.dailyBest = 0;
          }
          d2.dailyBest = Math.max(d2.dailyBest, Math.floor(b.time));
          if (win && d2.dailyDone !== this.today) {
            d2.dailyDone = this.today;
            this.dailyReward = DAILY_REWARD;
            d2.gold += DAILY_REWARD;
          }
        }
        if (!b.endless && !this.dailyRun) d2.lossStreak = win ? 0 : Math.min(3, (d2.lossStreak || 0) + 1);
        d2.stageBest[b.stage.id] = Math.max(d2.stageBest[b.stage.id] || 0, Math.floor(b.time));
        this.newStage = "";
        this.newChar = "";
        for (const ev of EVENTS) {
          if (b.bossKills.includes(ev.boss) && !d2.chars.includes(ev.char)) {
            d2.chars.push(ev.char);
            this.newChar = (CHARACTERS.find((c) => c.id === ev.char) || { name: "" }).name;
          }
        }
        if (win && !b.endless && !this.dailyRun) {
          const i = STAGES.findIndex((x) => x.id === b.stage.id);
          const next = STAGES[i + 1];
          if (next && !d2.stages.includes(next.id)) {
            d2.stages.push(next.id);
            this.newStage = next.name;
          }
        }
        d2.runs++;
        if (win) d2.wins++;
        d2.totalKills += b.kills;
        d2.bestTime = Math.max(d2.bestTime, Math.floor(b.time));
        d2.bestKills = Math.max(d2.bestKills, b.kills);
        d2.bestLevel = Math.max(d2.bestLevel, b.level);
        if (b.endless) d2.endlessBest = Math.max(d2.endlessBest, Math.floor(b.time));
        const qr = this.updateQuests();
        d2.gold += qr.gold;
        this.questMsg = qr.done.length ? `\u6BCF\u65E5\u4EFB\u52A1\u5B8C\u6210 ${qr.done.length} \u4E2A${qr.bonus ? "\uFF0C\u4ECA\u65E5\u4EFB\u52A1\u5168\u90E8\u5B8C\u6210\uFF01" : ""}  +${qr.gold} \u91D1\u5E01` : "";
        const got = this.checkAchievements(win);
        let achGold = 0;
        for (const a of got) achGold += a.gold;
        d2.gold += achGold;
        Save.save();
        this.resultTitle.string = this.dailyRun ? win ? "\u6311\u6218\u6210\u529F!" : "\u6311\u6218\u5931\u8D25" : win ? "\u80DC\u5229!" : b.endless ? "\u65E0\u5C3D\u4E4B\u591C\u7ED3\u675F" : "\u4F60\u5012\u4E0B\u4E86";
        this.resultTitle.color = win ? C_GOLD2 : C_RED;
        this.resultStats.string = `\u5B58\u6D3B\u65F6\u95F4  ${this.fmtTime(b.time)}
\u7B49\u7EA7  ${b.level}     \u51FB\u8D25  ${b.kills}     \u6700\u9AD8\u8FDE\u51FB  ${b.maxCombo}
\u62FE\u53D6\u91D1\u5E01  ${b.gold}    \u65F6\u95F4\u5956\u52B1  ${bonus}
\u5927\u62DB ${b.ultCasts} \u6B21    \u795E\u5175 ${b.epicsUsed} \u628A    \u8BD5\u70BC ${b.trialsWon} \u6B21
\u672C\u5C40\u83B7\u5F97  ${total + achGold} \u91D1\u5E01` + (got.length ? `
\u65B0\u6210\u5C31\uFF1A${got.map((a) => a.name).join("\u3001")}  (+${achGold})` : "");
        this.resultHint.string = this.nearMiss(win, daily);
        const statLines = this.resultStats.string.split("\n").length, hintLines = this.resultHint.string ? this.resultHint.string.split("\n").length : 0;
        const statTop = this.top - 200;
        this.resultStats.node.setPosition(0, statTop - statLines * 34 / 2);
        const hintTop = statTop - statLines * 34 - 14;
        this.resultHint.node.setPosition(0, hintTop - hintLines * 30 / 2);
        this.resultList.setPosition(0, hintTop - hintLines * 30 - 50);
        this.resultList.destroyAllChildren();
        mkLabel(this.resultList, "\u6B66\u5668\u4F24\u5BB3\u7EDF\u8BA1", 26, C_GOLD2, "center", 3).node.setPosition(0, 30);
        b.weapons.forEach((w, i) => {
          const y = -24 - i * 58;
          mkSprite(this.resultList, w.icon, 2.5).node.setPosition(-230, y);
          mkLabel(this.resultList, w.name + (w.evolved ? "" : `  LV ${w.level}`), 24, C_WHITE2, "left", 2).node.setPosition(-195, y);
          mkLabel(this.resultList, String(Math.round(w.damage)), 24, C_GOLD2, "right", 2).node.setPosition(250, y);
        });
        Sound.playBgm("");
        Sound.play(win ? "win" : "gameover");
        if (got.length) this.scheduleOnce(() => Sound.play("achieve"), 1.2);
        vibrate(true);
        this.setState("result");
      }
      // 今日任务进度（日期变化时清零）
      questProgress() {
        const d2 = Save.data;
        if (d2.questDate !== this.today) {
          d2.questDate = this.today;
          d2.questProg = {};
          d2.questDone = [];
        }
        return d2.questProg;
      }
      updateQuests() {
        const b = this.battle, d2 = Save.data;
        const p = this.questProgress();
        const add = (k, v) => {
          p[k] = (p[k] || 0) + v;
        };
        const best = (k, v) => {
          p[k] = Math.max(p[k] || 0, v);
        };
        add("kills", b.kills);
        add("boss", b.bossKills.length);
        add("evolve", b.evolvedCount);
        add("gold", b.gold);
        add("chest", b.chestsOpened);
        add("runs", 1);
        best("time", Math.floor(b.time));
        best("level", b.level);
        best("combo", b.maxCombo);
        const qs = dailyQuests(this.today);
        const done = [];
        let gold = 0;
        for (const q of qs) {
          if (d2.questDone.includes(q.id) || (p[q.stat] || 0) < q.n) continue;
          d2.questDone.push(q.id);
          done.push(q);
          gold += q.gold;
        }
        let bonus = false;
        if (qs.every((q) => d2.questDone.includes(q.id)) && !d2.questDone.includes("bonus")) {
          d2.questDone.push("bonus");
          bonus = true;
          gold += QUEST_BONUS;
        }
        return { done, bonus, gold };
      }
      codexCount() {
        const c = Save.data.codex;
        return codexEntries().filter((e) => c.includes(e.key)).length;
      }
      // 结算提示：差一点的遗憾感 + 下一个可达成的目标，驱动"再来一局"
      nearMiss(win, daily) {
        const b = this.battle, d2 = Save.data;
        const lines = [];
        if (this.dailyReward) lines.push(`\u6BCF\u65E5\u6311\u6218\u5956\u52B1\uFF1A+${this.dailyReward} \u91D1\u5E01\uFF01`);
        if (this.questMsg) lines.push(this.questMsg);
        if (this.newChar) lines.push(`\u89E3\u9501\u9650\u5B9A\u89D2\u8272\uFF1A${this.newChar}\uFF01`);
        if (this.newStage) lines.push(`\u89E3\u9501\u65B0\u5730\u56FE\uFF1A${this.newStage}\uFF01`);
        if (b.newCodex.length) lines.push(`\u56FE\u9274\u65B0\u6536\u5F55 ${b.newCodex.length} \u9879\uFF08${this.codexCount()}/${codexEntries().length}\uFF09`);
        if (daily) lines.push("\u6BCF\u65E5\u9996\u5C40\u5956\u52B1\uFF1A\u91D1\u5E01 \xD72!");
        if (!win && !b.endless) {
          if (b.boss && b.boss.alive) lines.push(`${b.boss.def.name} \u53EA\u5269 ${Math.max(1, Math.round(b.boss.hp / b.boss.maxHp * 100))}% \u751F\u547D\u4E86!`);
          else {
            const nb = BOSS_SCHEDULE.find((x) => x.t > b.time);
            const goal = this.dailyRun ? DAILY_GOAL : WIN_TIME;
            const left = Math.ceil((nb && nb.t < goal ? nb.t : goal) - b.time);
            lines.push(nb && nb.t < goal ? `\u518D\u575A\u6301 ${this.fmtTime(left)} \u5C31\u80FD\u89C1\u5230 ${ENEMIES[nb.id].name}` : `\u8DDD\u79BB\u80DC\u5229\u53EA\u5DEE ${this.fmtTime(left)}!`);
          }
          if (d2.lossStreak > 0) lines.push(`\u4E0B\u4E00\u5C40\u83B7\u5F97\u300C\u4E0D\u5C48\u610F\u5FD7\u300D\u4F24\u5BB3\u4E0E\u751F\u547D +${d2.lossStreak * 5}%`);
        }
        let best = null;
        for (const p of POWERUPS) {
          const r = Save.rank(p.id);
          if (r >= p.max) continue;
          const c = powerUpCost(p, r, Save.totalBought());
          if (!best || c < best.cost) best = { name: `${p.name} Lv${r + 1}`, cost: c };
        }
        if (best) lines.push(d2.gold >= best.cost ? `\u53EF\u4EE5\u8D2D\u4E70\u5F3A\u5316\uFF1A${best.name}!` : `\u4E0B\u4E00\u4E2A\u5F3A\u5316\uFF1A${best.name}\uFF08\u8FD8\u5DEE ${best.cost - d2.gold} \u91D1\u5E01\uFF09`);
        return lines.join("\n");
      }
      // 结算时检查成就，返回本局新解锁的成就
      checkAchievements(win) {
        const b = this.battle, d2 = Save.data;
        const ok = {
          win1: win,
          kill1k: b.kills >= 1e3,
          kill5k: b.kills >= 5e3,
          combo500: b.maxCombo >= 500,
          lv50: b.level >= 50,
          evo1: b.evolvedCount >= 1,
          evo3: b.evolvedCount >= 3,
          goldrat: b.goldRats > 0,
          endless20: b.endless && b.time >= 1200,
          allchars: CHARACTERS.every((c) => c.cost < 0 || d2.chars.includes(c.id)),
          daily1: this.dailyRun && win,
          stage_snow: win && !b.endless && !this.dailyRun && b.stage.id === "snow",
          stage_lava: win && !b.endless && !this.dailyRun && b.stage.id === "lava",
          stage_swamp: win && !b.endless && !this.dailyRun && b.stage.id === "swamp",
          stage_desert: win && !b.endless && !this.dailyRun && b.stage.id === "desert",
          nightmare1: win && b.nightmare,
          codex_half: this.codexCount() * 2 >= codexEntries().length,
          codex_full: this.codexCount() >= codexEntries().length,
          epic3: b.epicsUsed >= 3,
          trial2: b.trialsWon >= 2,
          ult10: b.ultCasts >= 10
        };
        for (const id of b.bossKills) ok["boss_" + id] = true;
        const got = ACHIEVEMENTS.filter((a) => ok[a.id] && !d2.achievements.includes(a.id));
        for (const a of got) d2.achievements.push(a.id);
        return got;
      }
      // ------------------------------------------------------------------ 七日签到
      signDue() {
        return Save.data.signDate !== this.today;
      }
      claimSignin(mul) {
        const d2 = Save.data;
        if (!this.signDue()) return;
        const day = d2.signCount % 7;
        const g2 = SIGNIN_REWARDS[day] * mul;
        d2.gold += g2;
        d2.signCount++;
        d2.signDate = this.today;
        Save.save();
        Sound.play(day === 6 ? "achieve" : "coin");
        this.showToast(`\u7B7E\u5230\u6210\u529F +${g2} \u91D1\u5E01` + (mul > 1 ? "\uFF08\u53CC\u500D\uFF09" : ""));
        this.refreshAll();
      }
      buildSignin() {
        const s = this.screen("signin");
        const p = mkPanel(s, 660, 760, new Color(30, 22, 52, 250), C_GOLD2);
        p.node.setPosition(0, this.vh * 0.03);
        mkLabel(p.node, "\u4E03\u65E5\u7B7E\u5230", 46, C_GOLD2, "center", 4).node.setPosition(0, 330);
        const sub = mkLabel(p.node, "", 22, C_GREY, "center", 2);
        sub.node.setPosition(0, 280);
        const cells = [];
        for (let i = 0; i < 7; i++) {
          const big = i === 6;
          const w = big ? 290 : 140, h = 170;
          const y = i < 4 ? 150 : -40;
          const c = mkPanel(p.node, w, h);
          c.node.setPosition(i < 4 ? (i - 1.5) * 152 : [-228, -76, 152][i - 4], y);
          mkLabel(c.node, `\u7B2C ${i + 1} \u5929`, 22, C_WHITE2, "center", 2).node.setPosition(0, 60);
          mkSprite(c.node, big ? "chest" : "coin", big ? 2.4 : 3).node.setPosition(0, 6);
          const amount = mkLabel(c.node, `${SIGNIN_REWARDS[i]}`, 26, C_GOLD2, "center", 3);
          amount.node.setPosition(0, -56);
          const check = mkLabel(c.node, "\u5DF2\u9886", 30, C_GREEN, "center", 4).node;
          check.setPosition(0, 6);
          cells.push({ panel: c, check, amount });
        }
        const claim = mkButton(p.node, "\u9886\u53D6", 260, 88, () => {
          this.claimSignin(1);
          this.setState("menu");
        }, C_BTN_GREEN, 34);
        claim.node.setPosition(-140, -240);
        const dbl = mkButton(p.node, "\u25B6 \u770B\u89C6\u9891 \u53CC\u500D", 260, 88, () => this.watchAd("signin", () => {
          this.claimSignin(2);
          this.setState("menu");
        }), new Color(170, 90, 30, 255), 28);
        dbl.node.setPosition(140, -240);
        const close = mkButton(p.node, "\u5173\u95ED", 200, 64, () => this.setState("menu"), C_BTN_GREY, 26);
        close.node.setPosition(0, -330);
        this.refreshers.push(() => {
          const d2 = Save.data;
          const due = this.signDue();
          const done = due ? d2.signCount % 7 : (d2.signCount - 1) % 7 + 1;
          const today = due ? d2.signCount % 7 : -1;
          sub.string = due ? `\u7D2F\u8BA1\u7B7E\u5230 ${d2.signCount} \u5929 \xB7 \u65AD\u7B7E\u4E0D\u6E05\u96F6` : `\u4ECA\u5929\u5DF2\u7B7E\u5230\uFF0C\u660E\u5929\u518D\u6765\u5471\uFF5E\uFF08\u7D2F\u8BA1 ${d2.signCount} \u5929\uFF09`;
          cells.forEach((c, i) => {
            const got = i < done;
            c.check.active = got;
            c.panel.border.color = i === today ? C_GREEN : got ? new Color(90, 80, 110, 255) : i === 6 ? C_GOLD2 : C_BORDER2;
            c.panel.fill.color = got ? new Color(24, 20, 34, 250) : i === today ? new Color(36, 64, 60, 250) : new Color(36, 30, 64, 245);
          });
          claim.node.active = due;
          dbl.node.active = due && Ads.canReward("signin");
          if (!dbl.node.active) claim.node.setPosition(0, -240);
          else claim.node.setPosition(-140, -240);
        });
      }
      buildCodex() {
        const s = this.screen("codex");
        this.header(s, "\u56FE\u9274", false);
        const all = codexEntries();
        const prog = mkLabel(s, "", 26, C_GREY, "center", 2);
        prog.node.setPosition(0, this.top - 118);
        const tabs = [["weapon", "\u6B66\u5668"], ["passive", "\u9053\u5177"], ["monster", "\u602A\u7269"]];
        const tabBtns = {};
        tabs.forEach(([id, label], i) => {
          const b = mkButton(s, label, 200, 70, () => {
            this.codexTab = id;
            this.codexSel = null;
            this.refreshAll();
          }, C_BTN_BLUE, 30);
          b.node.setPosition((i - 1) * 216, this.top - 180);
          tabBtns[id] = b;
        });
        const detH = 190;
        const det = mkPanel(s, this.vw - 40, detH);
        det.node.setPosition(0, this.bottom + 170 + detH / 2);
        const dIcon = mkSprite(det.node, "icon_whip", 3);
        dIcon.node.setPosition(-this.vw / 2 + 90, 10);
        const dName = mkLabel(det.node, "", 32, C_GOLD2, "left", 3);
        dName.node.setPosition(-this.vw / 2 + 160, 52);
        const dDesc = mkLabel(det.node, "", 22, C_WHITE2, "left", 2);
        dDesc.node.setPosition(-this.vw / 2 + 160, -20);
        const gridTop = this.top - 240, gridBottom = this.bottom + 190 + detH;
        for (const [tab] of tabs) {
          const list = all.filter((e) => e.tab === tab);
          const grid = mkNode("grid_" + tab, s);
          const cols = tab === "weapon" ? 4 : 5;
          const rows = Math.ceil(list.length / cols);
          const cell = Math.min(124, (gridTop - gridBottom) / rows - 8, (this.vw - 60) / cols - 8);
          list.forEach((e, i) => {
            const c = i % cols, r = Math.floor(i / cols);
            const card = mkPanel(grid, cell, cell);
            card.node.setPosition((c - (cols - 1) / 2) * (cell + 10), gridTop - cell / 2 - r * (cell + 8));
            const isBoss = tab === "monster" && !!ENEMIES[e.key.slice(2)].boss;
            const fr = Art.f(e.icon).rect;
            const fit = Math.min(3, (cell - 22) / Math.max(fr.width, fr.height));
            const sp = mkSprite(card.node, e.icon, fit);
            card.node.on(Node.EventType.TOUCH_END, () => {
              Sound.play("click");
              this.codexSel = e;
              this.refreshAll();
            });
            this.refreshers.push(() => {
              const got = Save.data.codex.includes(e.key);
              sp.color = got ? new Color(255, 255, 255, 255) : new Color(0, 0, 0, 160);
              const sel = this.codexSel === e;
              card.border.color = sel ? C_GOLD2 : isBoss ? new Color(170, 60, 90, 255) : e.key[0] === "e" ? new Color(220, 110, 60, 255) : new Color(90, 80, 110, 255);
              card.fill.color = got ? new Color(44, 36, 72, 250) : new Color(22, 18, 32, 245);
            });
          });
          this.refreshers.push(() => {
            grid.active = this.codexTab === tab;
          });
        }
        this.refreshers.push(() => {
          const d2 = Save.data;
          const n = all.filter((e2) => d2.codex.includes(e2.key)).length;
          prog.string = `\u5DF2\u6536\u5F55 ${n} / ${all.length}`;
          for (const [id] of tabs) tabBtns[id].node.setScale(this.codexTab === id ? 1.06 : 0.94, this.codexTab === id ? 1.06 : 0.94, 1);
          const e = this.codexSel;
          det.node.active = !!e;
          if (!e) return;
          const got = d2.codex.includes(e.key);
          dIcon.spriteFrame = Art.f(e.icon);
          const r = Art.f(e.icon).rect, k = Math.min(5, 150 / Math.max(r.width, r.height));
          dIcon.node.setScale(k, k, 1);
          dIcon.color = got ? new Color(255, 255, 255, 255) : new Color(0, 0, 0, 180);
          dName.string = got ? e.name : "\uFF1F\uFF1F\uFF1F";
          dDesc.string = got ? e.desc : "\u672A\u6536\u5F55\uFF1A" + e.hint;
        });
        mkButton(s, "\u8FD4\u56DE", 300, 88, () => this.setState("menu"), C_BTN_BLUE).node.setPosition(0, this.bottom + 80);
      }
      buildDaily() {
        const s = this.screen("daily");
        this.header(s, "\u6BCF\u65E5\u6311\u6218", false);
        const date = mkLabel(s, "", 26, C_GREY, "center", 2);
        date.node.setPosition(0, this.top - 118);
        const heroY = this.top - 300;
        const hero = mkSprite(s, "hero_hunter_0", 2.6);
        hero.node.setPosition(-160, heroY);
        const heroName = mkLabel(s, "", 30, C_WHITE2, "left", 3);
        heroName.node.setPosition(-40, heroY + 50);
        const heroTag = mkLabel(s, "\u4ECA\u65E5\u8BD5\u73A9\u89D2\u8272\uFF08\u65E0\u9700\u89E3\u9501\uFF09", 20, C_GREEN, "left", 2);
        heroTag.node.setPosition(-40, heroY + 8);
        const stageName = mkLabel(s, "", 22, new Color(180, 220, 255, 255), "left", 2);
        stageName.node.setPosition(-40, heroY - 32);
        const cards = [];
        for (let i = 0; i < 2; i++) {
          const p = mkPanel(s, 620, 120, i === 0 ? new Color(70, 30, 20, 245) : new Color(48, 24, 70, 250), i === 0 ? new Color(240, 140, 60, 255) : new Color(190, 110, 255, 255));
          p.node.setPosition(0, heroY - 170 - i * 136);
          const icon2 = mkSprite(p.node, "icon_might", 3.4);
          icon2.node.setPosition(-250, 0);
          const name = mkLabel(p.node, "", 28, C_GOLD2, "left", 3);
          name.node.setPosition(-200, 24);
          const desc = mkLabel(p.node, "", 21, C_WHITE2, "left", 2);
          desc.node.setPosition(-200, -22);
          cards.push({ name, desc, icon: icon2 });
        }
        const goal = mkLabel(s, "", 26, C_WHITE2, "center", 3);
        goal.node.setPosition(0, heroY - 470);
        const status = mkLabel(s, "", 24, C_GOLD2, "center", 3);
        status.node.setPosition(0, heroY - 516);
        const qTop = heroY - 570;
        const qTitle = mkLabel(s, "", 28, C_GOLD2, "center", 3);
        qTitle.node.setPosition(0, qTop);
        const rowH = Math.min(78, (qTop - 40 - (this.bottom + 150)) / 3);
        const qRows = [];
        for (let i = 0; i < 3; i++) {
          const p = mkPanel(s, 620, rowH - 8);
          p.node.setPosition(0, qTop - 46 - i * rowH);
          const name = mkLabel(p.node, "", 22, C_WHITE2, "left", 2);
          name.node.setPosition(-290, 10);
          const prog = mkLabel(p.node, "", 20, C_GOLD2, "right", 2);
          prog.node.setPosition(290, 10);
          mkRect(p.node, 580, 8, new Color(20, 14, 30, 255), "qbarBg").node.setPosition(0, -16);
          const fill = mkRect(p.node, 580, 8, C_GREEN, "qbar", 0, 0.5).node;
          fill.setPosition(-290, -16);
          qRows.push({ name, prog, fill, panel: p });
        }
        this.refreshers.push(() => {
          if (this.state !== "daily") return;
          const p = this.questProgress();
          const qs = dailyQuests(this.today);
          const done = Save.data.questDone;
          const n = qs.filter((q) => done.includes(q.id)).length;
          qTitle.string = `\u6BCF\u65E5\u4EFB\u52A1 ${n}/3` + (done.includes("bonus") ? "  \xB7 \u5168\u90E8\u5B8C\u6210!" : `  \xB7 \u5168\u90E8\u5B8C\u6210\u518D\u5F97 ${QUEST_BONUS} \u91D1\u5E01`);
          qs.forEach((q, i) => {
            const r = qRows[i];
            const v = Math.min(q.n, p[q.stat] || 0);
            const ok = done.includes(q.id);
            r.name.string = q.name;
            r.prog.string = ok ? `\u5DF2\u5B8C\u6210 +${q.gold}` : `${q.stat === "time" ? this.fmtTime(v) : v}/${q.stat === "time" ? this.fmtTime(q.n) : q.n}  \xB7  ${q.gold} \u91D1\u5E01`;
            r.fill.setScale(Math.max(1e-3, v / q.n), 1, 1);
            r.panel.border.color = ok ? C_GREEN : C_BORDER2;
          });
        });
        const by = this.bottom + 80;
        mkButton(s, "\u8FD4\u56DE", 260, 88, () => this.setState("menu"), C_BTN_GREY).node.setPosition(-150, by);
        mkButton(s, "\u5F00\u59CB\u6311\u6218", 260, 88, () => this.startDaily(), new Color(150, 60, 30, 255), 34).node.setPosition(150, by);
        this.refreshers.push(() => {
          if (this.state !== "daily") return;
          const ds = dailySetup(this.today);
          const ch = CHARACTERS.find((c) => c.id === ds.char) || CHARACTERS[0];
          const st = STAGES.find((x) => x.id === ds.stage) || STAGES[0];
          const bl = BLESSINGS.find((x) => x.id === ds.blessing) || BLESSINGS[0];
          const dt = /* @__PURE__ */ new Date();
          date.string = `${dt.getFullYear()} \u5E74 ${dt.getMonth() + 1} \u6708 ${dt.getDate()} \u65E5 \xB7 \u5168\u670D\u540C\u4E00\u6311\u6218`;
          hero.spriteFrame = Art.f(ch.sprite + "_0");
          heroName.string = `${ch.name} \xB7 ${ch.title}`;
          stageName.string = `\u5730\u56FE\uFF1A${st.name}`;
          cards[0].icon.spriteFrame = Art.f("icon_critdmg");
          cards[0].name.string = "\u4ECA\u65E5\u89C4\u5219\uFF1A" + ds.mod.name;
          cards[0].desc.string = ds.mod.desc;
          cards[1].icon.spriteFrame = Art.f(bl.icon);
          cards[1].name.string = "\u547D\u8FD0\u5361\u724C\uFF1A" + bl.name;
          cards[1].desc.string = bl.desc;
          goal.string = `\u76EE\u6807\uFF1A\u5B58\u6D3B ${this.fmtTime(DAILY_GOAL)}    \u5956\u52B1\uFF1A${DAILY_REWARD} \u91D1\u5E01`;
          const d2 = Save.data;
          const best = d2.dailyBestDate === this.today ? d2.dailyBest : 0;
          status.string = d2.dailyDone === this.today ? "\u4ECA\u65E5\u5DF2\u5B8C\u6210\uFF01\u660E\u5929\u518D\u6765\u5471" : best ? `\u4ECA\u65E5\u6700\u4F73 ${this.fmtTime(best)} \xB7 \u8FD8\u6CA1\u5B8C\u6210` : "\u4ECA\u65E5\u5C1A\u672A\u6311\u6218";
        });
      }
      buildAchievements() {
        const s = this.screen("achv");
        this.header(s, "\u6210\u5C31");
        const y0 = this.top - 160;
        const rows = Math.ceil(ACHIEVEMENTS.length / 2);
        const avail = y0 - (this.bottom + 150);
        const ch = Math.min(110, avail / rows - 8);
        const cw = 344;
        ACHIEVEMENTS.forEach((a, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const card = mkPanel(s, cw, ch);
          card.node.setPosition((col - 0.5) * (cw + 12), y0 - ch / 2 - row * (ch + 8));
          const name = mkLabel(card.node, a.name, 24, C_WHITE2, "left", 3);
          name.node.setPosition(-cw / 2 + 16, ch * 0.22);
          mkLabel(card.node, a.desc, 17, C_GREY, "left", 2).node.setPosition(-cw / 2 + 16, -ch * 0.25);
          const reward = mkLabel(card.node, "", 20, C_GOLD2, "right", 3);
          reward.node.setPosition(cw / 2 - 12, ch * 0.22);
          this.refreshers.push(() => {
            const done = Save.data.achievements.includes(a.id);
            card.border.color = done ? C_GOLD2 : new Color(90, 80, 110, 255);
            card.fill.color = done ? new Color(60, 48, 30, 250) : new Color(30, 26, 44, 245);
            name.color = done ? C_GOLD2 : new Color(200, 196, 214, 255);
            reward.string = done ? "\u5DF2\u5B8C\u6210" : `+${a.gold}`;
          });
        });
        mkButton(s, "\u8FD4\u56DE", 300, 88, () => this.setState("menu"), C_BTN_BLUE).node.setPosition(0, this.bottom + 80);
      }
      // ------------------------------------------------------------------ 升级 / 宝箱
      openLevelUp() {
        this.options = this.battle.buildOptions();
        this.levelTitle.string = `\u5347\u7EA7!  LV ${this.battle.level - this.battle.pendingLevels + 1}`;
        this.fillCards();
        Sound.play("levelup");
        this.setState("levelup");
      }
      styleCards(bless) {
        for (const c of this.cards) {
          c.border.color = bless ? new Color(190, 110, 255, 255) : new Color(214, 170, 70, 255);
          c.fill.color = bless ? new Color(48, 24, 70, 250) : new Color(36, 30, 64, 245);
        }
      }
      openBlessing() {
        this.cardMode = "blessing";
        this.blessOpts = blessingOptions(this.battle);
        if (!this.blessOpts.length) {
          this.battle.pendingBlessings = 0;
          return;
        }
        this.levelTitle.string = "\u9009\u62E9\u547D\u8FD0\u5361\u724C";
        this.styleCards(true);
        for (let i = 0; i < this.cards.length; i++) {
          const c = this.cards[i], o = this.blessOpts[i];
          c.node.active = !!o;
          if (!o) continue;
          c.icon.spriteFrame = Art.f(o.icon);
          c.name.string = o.name;
          c.tag.string = "\u547D\u8FD0\u5361\u724C";
          c.desc.string = o.desc;
        }
        this.rerollBtn.node.active = false;
        this.adRerollBtn.node.active = false;
        this.adBlessBtn.node.active = !this.adBlessUsed && this.battle.time < 1 && Ads.canReward("blessing");
        Sound.play("card");
        this.setState("levelup");
      }
      fillCards() {
        this.cardMode = "level";
        this.styleCards(false);
        for (let i = 0; i < this.cards.length; i++) {
          const c = this.cards[i];
          const o = this.options[i];
          c.node.active = !!o;
          if (!o) continue;
          const d2 = describe(o);
          c.icon.spriteFrame = Art.f(d2.icon);
          c.name.string = d2.name;
          c.tag.string = d2.tag;
          c.desc.string = d2.desc;
        }
        this.rerollBtn.node.active = this.battle.rerolls > 0;
        this.adBlessBtn.node.active = false;
        this.adRerollBtn.node.active = this.battle.rerolls <= 0 && this.adRerolls > 0 && Ads.canReward("reroll");
        this.adRerollBtn.label.string = `\u25B6 \u770B\u5E7F\u544A\u91CD\u62BD (${this.adRerolls})`;
        this.rerollBtn.label.string = `\u91CD\u62BD (${this.battle.rerolls})`;
      }
      reroll() {
        if (this.state !== "levelup" || this.cardMode !== "level" || this.battle.rerolls <= 0) return;
        this.battle.rerolls--;
        this.options = this.battle.buildOptions();
        this.fillCards();
      }
      choose(i) {
        if (this.state !== "levelup") return;
        if (this.cardMode === "blessing") {
          const b = this.blessOpts[i];
          if (!b) return;
          this.battle.applyBlessing(b);
          this.banner(b.name, new Color(200, 140, 255, 255));
          this.afterReward();
          return;
        }
        const o = this.options[i];
        if (!o) return;
        Sound.play("click");
        this.battle.applyOption(o);
        this.battle.pendingLevels--;
        this.afterReward();
        if (this.state === "play") this.battle.levelBlast();
      }
      openChest() {
        const r = this.battle.openChest();
        this.showChestResult(r);
        this.adChestUsed = false;
        this.chestAdBtn.node.active = Ads.canReward("chest");
        vibrate(true);
        this.setState("chest");
      }
      afterReward() {
        if (this.state !== "levelup" && this.state !== "chest") return;
        this.refreshIcons();
        this.setState("play");
        this.checkRewards();
      }
      checkRewards() {
        if (this.state !== "play") return;
        if (this.battle.pendingChests > 0) this.openChest();
        else if (this.battle.pendingBlessings > 0) this.openBlessing();
        else if (this.battle.pendingLevels > 0) this.openLevelUp();
      }
      refreshIcons() {
        this.iconRow.destroyAllChildren();
        const sp = 46;
        this.battle.weapons.forEach((w, i) => {
          mkSprite(this.iconRow, w.icon, 2.2).node.setPosition(i * sp, 0);
          mkLabel(this.iconRow, w.evolved ? "\u2605" : String(w.level), 14, C_WHITE2, "center", 2).node.setPosition(i * sp + 13, -14);
        });
        this.battle.passives.forEach((p, i) => {
          mkSprite(this.iconRow, p.def.icon, 2.2).node.setPosition(i * sp, -44);
          mkLabel(this.iconRow, String(p.level), 14, C_WHITE2, "center", 2).node.setPosition(i * sp + 13, -58);
        });
      }
      // ------------------------------------------------------------------ 输入
      onKeyDown(e) {
        this.keys.add(e.keyCode);
        const k = e.keyCode;
        const confirm = k === KeyCode.ENTER || k === KeyCode.SPACE;
        if (this.state === "splash") {
          if (this.splashT > 1) this.afterSplash();
          return;
        }
        if (this.state === "levelup") {
          if (k >= KeyCode.DIGIT_1 && k <= KeyCode.DIGIT_3) this.choose(k - KeyCode.DIGIT_1);
          if (k === KeyCode.KEY_R) this.reroll();
          return;
        }
        if (this.state === "chest" && confirm) {
          this.afterReward();
          return;
        }
        if ((this.state === "menu" || this.state === "result") && confirm) {
          this.startGame();
          return;
        }
        if (this.state === "play" && (k === KeyCode.SPACE || k === KeyCode.KEY_Q)) {
          this.castUlt();
          return;
        }
        if (k === KeyCode.ESCAPE || k === KeyCode.KEY_P) {
          if (this.state === "play") this.setState("pause");
          else if (this.state === "pause") this.setState("play");
        }
      }
      onKeyUp(e) {
        this.keys.delete(e.keyCode);
      }
      onJoyStart(e) {
        const loc = e.getUILocation();
        this.ui.getComponent(UITransform).convertToNodeSpaceAR(tmpV3.set(loc.x, loc.y, 0), this.joyOrigin);
        this.joyActive = true;
        this.joyX = this.joyY = 0;
        this.joyBase.active = this.joyKnob.active = true;
        this.joyBase.setPosition(this.joyOrigin);
        this.joyKnob.setPosition(this.joyOrigin);
      }
      onJoyMove(e) {
        if (!this.joyActive) return;
        const loc = e.getUILocation();
        this.ui.getComponent(UITransform).convertToNodeSpaceAR(tmpV3.set(loc.x, loc.y, 0), tmpV3);
        let dx = tmpV3.x - this.joyOrigin.x, dy = tmpV3.y - this.joyOrigin.y;
        const R = 60, d2 = Math.hypot(dx, dy);
        if (d2 > R) {
          dx = dx / d2 * R;
          dy = dy / d2 * R;
        }
        this.joyX = d2 > 8 ? dx / R : 0;
        this.joyY = d2 > 8 ? dy / R : 0;
        this.joyKnob.setPosition(this.joyOrigin.x + dx, this.joyOrigin.y + dy);
      }
      onJoyEnd() {
        this.joyActive = false;
        this.joyX = this.joyY = 0;
        if (this.joyBase) this.joyBase.active = this.joyKnob.active = false;
      }
      // ------------------------------------------------------------------ 主循环
      update(rawDt) {
        const dt = Math.min(rawDt, 1 / 20);
        this.t += dt;
        this.layout();
        if (this.state === "splash") {
          this.splashT += dt;
          this.updateSplashFx(dt);
          if (this.splashT > 2.5) this.afterSplash();
        } else if (this.state === "victory") {
          this.updateVictory(dt);
        } else if (this.state === "dying") {
          this.updateDying(dt);
        } else if (this.state === "revive") {
          if (!Ads.showing) this.reviveT -= dt;
          this.reviveCount.string = String(Math.max(0, Math.ceil(this.reviveT - 0.01)));
          if (this.reviveT <= 0) this.endRun(false);
        }
        const b = this.battle;
        if (this.state === "play") {
          let mx = this.joyX, my = this.joyY;
          const K = this.keys;
          if (K.has(KeyCode.KEY_A) || K.has(KeyCode.ARROW_LEFT)) mx -= 1;
          if (K.has(KeyCode.KEY_D) || K.has(KeyCode.ARROW_RIGHT)) mx += 1;
          if (K.has(KeyCode.KEY_W) || K.has(KeyCode.ARROW_UP)) my += 1;
          if (K.has(KeyCode.KEY_S) || K.has(KeyCode.ARROW_DOWN)) my -= 1;
          b.setInput(mx, my);
          b.tick(dt);
          b.updateCamera(dt);
          if (b.dead) this.startDying();
          else if (b.won) this.startVictory();
          else this.checkRewards();
        } else if (this.state === "menu" || this.state === "chars" || this.state === "shop" || this.state === "settings" || this.state === "achv" || this.state === "codex" || this.state === "signin" || this.state === "privacy" || this.state === "splash" || this.state === "daily") {
          b.idle(dt);
          if (this.state === "menu") this.updateMenuFx(dt);
        }
        this.updateHud(dt);
        this.updateTutorial(dt);
        if (this.toastT > 0) {
          this.toastT -= dt;
          if (this.toastT <= 0) this.toast.node.active = false;
        }
      }
      // ------------------------------------------------------------------ HUD
      banner(text, color) {
        this.bannerLabel.string = text;
        this.bannerLabel.color = color;
        this.bannerLabel.node.active = true;
        this.bannerT = 2.5;
      }
      showToast(text) {
        this.toast.string = text;
        this.toast.node.active = true;
        this.toastT = 1.6;
      }
      fmtTime(t) {
        const m = Math.floor(t / 60), s = Math.floor(t % 60);
        return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
      }
      updateHud(dt) {
        if (!this.hud.active) return;
        const b = this.battle;
        const buffs = [];
        if (b.potionT > 0) buffs.push(`\u72C2\u66B4 ${Math.ceil(b.potionT)}s`);
        if (b.shieldHits > 0) buffs.push(`\u62A4\u76FE \xD7${b.shieldHits}`);
        if (b.hasteT > 0) buffs.push(`\u6025\u901F ${Math.ceil(b.hasteT)}s`);
        if (b.cloverT > 0) buffs.push(`\u5E78\u8FD0 ${Math.ceil(b.cloverT)}s`);
        if (b.fireT > 0) buffs.push(`\u70C8\u7130 ${Math.ceil(b.fireT)}s`);
        if (b.arcaneT > 0) buffs.push("\u5965\u672F\u6D8C\u6D41");
        if (b.giantT > 0) buffs.push(`\u5DE8\u4EBA ${Math.ceil(b.giantT)}s`);
        if (b.bootsT > 0) buffs.push(`\u75BE\u98CE ${Math.ceil(b.bootsT)}s`);
        if (b.decoyT > 0) buffs.push(`\u5E7B\u5F71 ${Math.ceil(b.decoyT)}s`);
        if (b.endless) buffs.push("\u65E0\u5C3D");
        const bs = buffs.join("  ");
        if (this.buffLabel.string !== bs) this.buffLabel.string = bs;
        this.xpFill.setScale(Math.min(1, b.xp / b.xpNext), 1, 1);
        if (this.ultChar !== b.char.id) {
          this.ultChar = b.char.id;
          this.ultHero.spriteFrame = Art.f(b.char.sprite + "_0");
          this.ultName.string = b.char.ultName;
        }
        const ready = b.ult >= 1;
        this.ultFill.node.setScale(1, Math.max(0.02, b.ult), 1);
        this.ultFill.color = ready ? new Color(255, 210, 90, 150 + Math.round(80 * Math.sin(this.t * 8))) : new Color(120, 160, 255, 110);
        const us = ready ? 1 + 0.06 * Math.sin(this.t * 8) : 1;
        this.ultBtn.setScale(us, us, 1);
        this.ultName.color = ready ? C_GOLD2 : C_GREY;
        const ep = b.epic;
        this.epicLabel.node.active = this.epicBar.active = !!ep;
        if (ep) {
          const txt = `\u2605 ${ep.name}  ${Math.ceil(b.epicT)}s`;
          if (this.epicLabel.string !== txt) this.epicLabel.string = txt;
          this.epicFill.node.setScale(Math.max(0, Math.min(1, b.epicT / (b.epicMax || EPIC_TIME))), 1, 1);
          this.epicLabel.color = b.epicT < 5 && Math.floor(this.t * 6) % 2 ? C_WHITE2 : C_GOLD2;
        }
        const tr = b.trial;
        this.trialLabel.node.active = !!tr;
        if (tr) {
          const txt = `\u8BD5\u70BC ${Math.min(tr.got, tr.need)}/${tr.need}  ${Math.ceil(tr.t)}s`;
          if (this.trialLabel.string !== txt) this.trialLabel.string = txt;
        }
        this.lvLabel.string = "LV " + b.level;
        this.timeLabel.string = this.fmtTime(Math.min(b.time, WIN_TIME));
        this.killLabel.string = "\u51FB\u8D25 " + b.kills;
        this.goldLabel.string = String(b.gold);
        const showCombo = b.combo >= 10;
        this.comboLabel.node.active = this.comboSub.node.active = showCombo;
        if (showCombo) {
          this.comboLabel.string = String(b.combo);
          const heat = Math.min(1, b.combo / 300);
          const fade = Math.min(1, b.comboT / 0.6);
          this.comboLabel.color = new Color(255, Math.round(255 - 140 * heat), Math.round(255 - 215 * heat), Math.round(255 * fade));
          this.comboSub.color = new Color(255, 230, 200, Math.round(255 * fade));
          const sc = 1 + Math.max(0, b.comboPulse) * 2.5;
          this.comboLabel.node.setScale(sc, sc, 1);
        }
        const boss = b.boss;
        this.bossBar.active = !!boss && boss.alive;
        if (boss && boss.alive) {
          this.bossFill.setScale(Math.max(0, boss.hp / boss.maxHp), 1, 1);
          const nm = (boss.def.name || "") + (boss.ai && boss.ai.enraged ? "  \xB7 \u72C2\u66B4" : "");
          if (this.bossName.string !== nm) this.bossName.string = nm;
        }
        const nb = b.nextBoss();
        if (nb) {
          const sec = Math.ceil(nb.remain);
          this.bossTimer.string = `${nb.final ? "\u6700\u7EC8Boss" : "Boss"} ${nb.name}  ${this.fmtTime(sec)}`;
          const warn = nb.remain <= 10;
          const blink = warn && Math.floor(this.t * 4) % 2 === 0;
          this.bossTimer.color = warn ? blink ? new Color(255, 60, 60, 255) : new Color(255, 200, 80, 255) : new Color(220, 200, 255, 255);
          const sc = warn ? 1.15 + 0.1 * Math.sin(this.t * 12) : 1;
          this.bossTimer.node.setScale(sc, sc, 1);
        } else {
          this.bossTimer.string = b.boss ? "\u51FB\u8D25\u6697\u591C\u9B54\u672F\u5E08\u5373\u53EF\u83B7\u80DC!" : `\u575A\u6301\u5230 ${this.fmtTime(WIN_TIME)}!`;
          this.bossTimer.color = C_GOLD2;
          this.bossTimer.node.setScale(1, 1, 1);
        }
        if (this.bannerT > 0 && this.state === "play") {
          this.bannerT -= dt;
          const c = this.bannerLabel.color;
          this.bannerLabel.color = new Color(c.r, c.g, c.b, Math.floor(255 * Math.min(1, this.bannerT)));
          if (this.bannerT <= 0) this.bannerLabel.node.active = false;
        }
      }
    };
    // ------------------------------------------------------------------ 新手引导
    GameRoot.TUT_TEXT = [
      "\u6309\u4F4F\u5C4F\u5E55\u4EFB\u610F\u4F4D\u7F6E \u62D6\u52A8\u6765\u79FB\u52A8",
      "\u6B66\u5668\u4F1A\u81EA\u52A8\u653B\u51FB \u9760\u8FD1\u5C0F\u602A\u8BD5\u8BD5!",
      "\u6361\u8D77\u84DD\u8272\u5B9D\u77F3 \u6512\u6EE1\u7ECF\u9A8C\u5C31\u80FD\u5347\u7EA7",
      "\u4E09\u9009\u4E00\uFF1A\u65B0\u6B66\u5668 \u6216 \u5F3A\u5316\u9053\u5177",
      "\u8EB2\u5F00\u602A\u7269 \u575A\u6301 15 \u5206\u949F\u5C31\u80DC\u5229!",
      "Boss \u8981\u6765\u4E86! \u770B\u5230\u7EA2\u5708\u7EA2\u7EBF\u7ACB\u523B\u8EB2\u5F00"
    ];
    GameRoot = __decorateClass([
      ccclass("GameRoot")
    ], GameRoot);
    if (!EDITOR) {
      director.on(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
        const scene = director.getScene();
        if (!scene || scene.getComponentInChildren(GameRoot)) return;
        const canvas2 = scene.getComponentInChildren(Canvas);
        if (canvas2) canvas2.node.addComponent(GameRoot);
        else console.warn("[GameRoot] \u573A\u666F\u4E2D\u6CA1\u6709 Canvas\uFF0C\u8BF7\u4F7F\u7528 assets/scenes/Main.scene");
      });
    }
  }
});

// dps.ts
init_cc();
var { Save: Save2 } = await Promise.resolve().then(() => (init_Save(), Save_exports));
var D = await Promise.resolve().then(() => (init_Defs(), Defs_exports));
var { GameRoot: GameRoot2 } = await Promise.resolve().then(() => (init_GameRoot(), GameRoot_exports));
var canvas = new Node("Canvas");
canvas.addComponent(Canvas);
var g = canvas.addComponent(GameRoot2);
Save2.data.privacyOk = true;
g.onLoad();
var d = Save2.data;
d.tutDone = true;
d.runs = 5;
d.signDate = d.signShown = (/* @__PURE__ */ new Date()).toDateString();
var res = [];
for (const wd of D.WEAPONS) for (const evo of [false, true]) {
  let tot = 0;
  for (let k = 0; k < 3; k++) {
    g.startGame();
    g.update(1 / 60);
    const B = g.battle;
    B.pendingBlessings = 0;
    B.pendingLevels = 0;
    g.setState("play");
    B.time = 420;
    B.bossIdx = 3;
    B.weapons = [];
    B.applyOption({ kind: "weapon", wdef: wd, level: 1 });
    const w = B.weapons[0];
    w.level = 8;
    w.recalc();
    if (evo) B.evolve(w);
    for (let i = 0; i < 60 * 20; i++) {
      B.hp = B.stats.maxHp;
      g.joyX = Math.cos(i / 90) * 0.5;
      g.joyY = Math.sin(i / 90) * 0.5;
      g.update(1 / 60);
      if (g.state === "levelup") {
        B.pendingLevels = 0;
        g.setState("play");
      }
      if (g.state === "chest") {
        B.pendingChests = 0;
        g.setState("play");
      }
    }
    tot += w.damage;
    g.endRun(false);
  }
  res.push([(evo ? "\u2605" : "") + wd.name, Math.round(tot / 60)]);
}
res.sort((a, b) => b[1] - a[1]);
console.log(res.map((r) => r.join(" ")).join("\n"));
