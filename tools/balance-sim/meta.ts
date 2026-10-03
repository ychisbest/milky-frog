// 数值验证：模拟玩家从新存档开始的多局游戏（含商店成长）
import { GameRoot } from '../../assets/scripts/GameRoot';
import { Save } from '../../assets/scripts/Save';
import { POWERUPS, powerUpCost, CHARACTERS, EVOLUTIONS, WEAPONS } from '../../assets/scripts/Defs';
// 对照实验：EXCLUDE=laser,spikes 时从武器池移除指定武器
for (const id of (process.env.EXCLUDE || '').split(',').filter(Boolean)) { const i = WEAPONS.findIndex(w => w.id === id); if (i >= 0) WEAPONS.splice(i, 1); }
import { Node, Canvas } from 'cc';
const SKILL = process.env.SKILL || 'average';
const PICK = process.env.PICK || (SKILL === 'novice' ? 'random' : 'smart');
const MOVE = process.env.MOVE || 'simple';
const RUNS = +(process.env.RUNS || 6);
const CHARID = process.env.CHARID || '';
const canvas = new Node('Canvas'); canvas.addComponent(Canvas);
const g: any = canvas.addComponent(GameRoot as any);
g.onLoad();
const fresh = JSON.stringify(Save.data);
Save.data = JSON.parse(fresh);
Save.data.gold = 0; Save.data.power = {}; Save.data.achievements = []; Save.data.runs = 0; Save.data.wins = 0; Save.data.mode = 'normal';
if (CHARID) { Save.data.chars.push(CHARID); Save.data.selected = CHARID; }
if (process.env.STAGE) { Save.data.stages = ['grass', 'snow', 'lava', 'swamp']; Save.data.stage = process.env.STAGE; }
if (process.env.LITE) Save.data.lite = true; // 性能模式对照
if (process.env.NIGHTMARE) { Save.data.mode = 'nightmare'; } // 噩梦难度对照（首胜前强制开启）

function scoreOption(B: any, o: any): number {
  if (PICK === 'random') return Math.random();
  const ownedW = B.weapons.map((w: any) => w.def.id);
  const evoNeeds = new Set(B.weapons.map((w: any) => EVOLUTIONS[w.def.id]?.passive).filter(Boolean));
  if (o.kind === 'weapon') {
    if (o.level > 1) return 3 + (o.level === 8 ? 1 : 0) + Math.random() * 0.5;
    return (B.weapons.length < 3 ? 3.5 : B.weapons.length < 5 ? 2 : 1) + Math.random() * 0.5;
  }
  if (o.kind === 'passive') {
    const need = evoNeeds.has(o.pdef.id);
    if (o.level > 1) return 2 + (need ? 1 : 0) + Math.random() * 0.5;
    return (need ? 4 : ['might', 'heart', 'armor', 'tome'].includes(o.pdef.id) ? 2 : 1.2) + Math.random() * 0.5;
  }
  return 0;
}

function steer(B: any, i: number): [number, number] {
  const a = i / 300;
  let fx = Math.cos(a) * 0.3, fy = Math.sin(a) * 0.3;
  let near = 1e9;
  for (const e of B.enemies) {
    if (!e.alive || e.def.prop) continue;
    const dx = B.px - e.x, dy = B.py - e.y, d = Math.hypot(dx, dy) || 1;
    near = Math.min(near, d);
    const R = SKILL === 'novice' ? 95 : 120;
    if (d < R) { fx += dx / d * (R - d) / 50; fy += dy / d * (R - d) / 50; }
  }
  if (MOVE !== 'simple') {
    for (const b of B.bullets) { if (!b.alive) continue; const dx = B.px - b.x, dy = B.py - b.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { fx += dx / d * 2.5; fy += dy / d * 2.5; } }
    for (const h of B.hazards) {
      if (!h.alive) continue;
      if (h.kind === 'circle' || h.kind === 'zone') {
        const dx = B.px - h.x, dy = B.py - h.y, d = Math.hypot(dx, dy) || 1;
        if (d < h.r + 40) { fx += dx / d * 3; fy += dy / d * 3; }
      } else {
        const ux = Math.cos(h.angle), uy = Math.sin(h.angle), rx = B.px - h.x, ry = B.py - h.y;
        const along = rx * ux + ry * uy, perp = rx * uy - ry * ux;
        if (along > -40 && along < h.len + 40 && Math.abs(perp) < h.w / 2 + 50) { const s = perp >= 0 ? 1 : -1; fx += uy * s * 3; fy += -ux * s * 3; }
      }
    }
    // 安全时去捡宝石/道具
    if (near > 150 && B.bullets.length < 5) {
      // 只去捡路径上没有怪的宝石
      let best = 300 * 300, tx = 0, ty = 0, ok = false;
      for (const p of B.pickups) {
        if (!p.alive) continue;
        const d = (p.x - B.px) ** 2 + (p.y - B.py) ** 2;
        if (d >= best) continue;
        let blocked = false;
        for (const e of B.enemies) { if (e.alive && !e.def.prop && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 110 * 110) { blocked = true; break; } }
        if (!blocked) { best = d; tx = p.x; ty = p.y; ok = true; }
      }
      if (ok) { const dx = tx - B.px, dy = ty - B.py, d = Math.hypot(dx, dy) || 1; fx += dx / d * 0.8; fy += dy / d * 0.8; }
    }
  }
  const fl = Math.hypot(fx, fy); if (fl > 1) { fx /= fl; fy /= fl; }
  return [fx, fy];
}

function shop() {
  const d = Save.data;
  // 解锁角色：金币富余时
  for (const c of CHARACTERS) if (!d.chars.includes(c.id) && d.gold >= c.cost * 2) { d.gold -= c.cost; d.chars.push(c.id); }
  for (;;) {
    let best: any = null, bc = 1e9;
    for (const p of POWERUPS) {
      const r = Save.rank(p.id); if (r >= p.max) continue;
      const c = powerUpCost(p, r, Save.totalBought());
      if (c < bc) { bc = c; best = p; }
    }
    if (!best || d.gold < bc) break;
    d.gold -= bc; d.power[best.id] = Save.rank(best.id) + 1;
  }
}

const out: any[] = [];
for (let run = 1; run <= RUNS; run++) {
  g.startGame();
  const B = g.battle;
  const lvTimes: number[] = [];
  const dmgBy: any = {};
  let cat = 'other';
  for (const [fn, c] of [['updateEnemies', 'contact'], ['updateBullets', 'bullet'], ['updateHazards', 'hazard']]) {
    const o = B[fn]; if (!B['__w' + fn]) { B['__w' + fn] = true; B[fn] = function (...a: any[]) { const prev = cat; cat = c as string; const r = o.apply(this, a); cat = prev; return r; }; }
  }
  if (!B.__hp) { B.__hp = true; const oh = B.hurtPlayer; B.hurtPlayer = function (d: number) { const before = this.hp; oh.call(this, d); const lost = before - this.hp; if (lost > 0) {
      let c2 = cat;
      if (cat === 'contact') { for (const e of this.enemies) if (e.alive && e.def.boss && Math.hypot(e.x - this.px, e.y - this.py) < e.def.radius + 16) { c2 = 'BOSSBODY:' + e.def.name; break; } if (c2 === 'contact') c2 = 'mobs'; }
      if (cat !== 'contact' && this.boss) c2 = cat + ':' + this.boss.def.name;
      const L = (globalThis as any).__last; L.push([this.time, c2, lost]); while (L.length && L[0][0] < this.time - 15) L.shift();
      const ph = this.time < 360 ? 'early' : this.time < 780 ? 'mid' : 'late'; const k = cat + '_' + ph + (this.boss ? '_boss' : ''); (globalThis as any).__dmg[k] = ((globalThis as any).__dmg[k] || 0) + lost; } }; }
  (globalThis as any).__dmg = dmgBy;
  (globalThis as any).__last = [];
  let lastLv = 1, firstEvo = 0, frames = 0;
  while (g.state !== 'result' && frames < 60 * 60 * 16) {
    const [mx, my] = steer(B, frames);
    g.joyX = mx; g.joyY = my;
    g.update(1 / 60); frames++;
    if (B.level !== lastLv) { lastLv = B.level; lvTimes.push(B.time); }
    if (!firstEvo && B.evolvedCount > 0) firstEvo = B.time;
    if (g.state === 'levelup') {
      if (g.cardMode === 'blessing') g.choose(Math.floor(Math.random() * g.blessOpts.length));
      else { let bi = 0, bs = -1; g.options.forEach((o: any, k: number) => { const sc = scoreOption(B, o); if (sc > bs) { bs = sc; bi = k; } }); g.choose(bi); }
    }
    if (g.state === 'chest') g.afterReward();
  }
  const goldBefore = Save.data.gold;
  // 平均升级间隔（按阶段）
  const gap = (t0: number, t1: number) => { const ts = lvTimes.filter(t => t >= t0 && t < t1); return ts.length > 1 ? +((ts[ts.length - 1] - ts[0]) / (ts.length - 1)).toFixed(1) : null; };
  const rec = { run, win: g.resultTitle.string === '胜利!', t: Math.round(B.time), lv: B.level, kills: B.kills, gold: goldBefore, firstEvo: Math.round(firstEvo), bosses: B.bossKills.length,
    gap0_2: gap(0, 120), gap2_6: gap(120, 360), gap6_15: gap(360, 900), char: B.char.id, power: Save.totalBought(), runGold: B.gold, ach: Save.data.achievements.length, dmgBy, flow: +B.flow.toFixed(2), last: (globalThis as any).__last.reduce((m: any, x: any) => { m[x[1]] = (m[x[1]] || 0) + x[2]; return m; }, {}) };
  out.push(rec);
  g.toMenu();
  shop();
  rec['powerAfter'] = Save.totalBought();
}
console.log(JSON.stringify(out));
