// 宣传素材采集：用真实游戏逻辑跑脚本化场景，把每一帧的精灵 / 文本导出为 JSON，交给 render.py 渲染
// 用法（在 tools/promo 目录）：见 run.sh
import fs from 'node:fs';
import path from 'node:path';
import { Canvas, Color, Label, Node, Sprite, UITransform, view } from 'cc';
import { buildAtlas } from '../../assets/scripts/PixelArt';
import { Save } from '../../assets/scripts/Save';
import { codexEntries, ENEMIES, EVENT, EVOLUTIONS, PASSIVES, WEAPONS } from '../../assets/scripts/Defs';

const SCENE = process.env.SCENE || 'shots';
const VH = +(process.env.VH || 1280);
const OUT = path.resolve(process.env.OUT || `out/${SCENE}`);
(view as any).getVisibleSize = () => ({ width: 720, height: VH });
fs.mkdirSync(OUT, { recursive: true });

const atlas = buildAtlas();
fs.writeFileSync(path.join(OUT, 'atlas.raw'), Buffer.from(atlas.data));
fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(atlas.rects));
const rectName: Record<string, string> = {};
for (const k in atlas.rects) rectName[JSON.stringify(atlas.rects[k])] = k;

const { GameRoot } = await import('../../assets/scripts/GameRoot');
const canvas = new Node('Canvas');
canvas.addComponent(Canvas);
const g: any = canvas.addComponent(GameRoot as any);

// 存档：展示用的"老玩家"状态
Save.data.privacyOk = true;
Save.data.gold = 5888;
Save.data.runs = 12;
Save.data.wins = 3;
Save.data.bestTime = 900;
Save.data.bestKills = 16888;
Save.data.bestLevel = 68;
Save.data.chars = ['hunter', 'mage', 'rogue', 'knight', 'nun', 'pyro', 'bomber', 'sage', 'druid', 'prism'];
Save.data.achievements = ['win1', 'kill1k', 'kill5k', 'combo500', 'boss_slimeking', 'boss_bonelord', 'evo1'];
Save.data.selected = process.env.CHAR || 'hunter';
Save.data.signDate = Save.data.signShown = new Date().toDateString(); // 展示用存档：今天已签到，不弹签到
g.onLoad();

function dump(name: string) {
    const items: any[] = [];
    const walk = (n: any, wx: number, wy: number, sx: number, sy: number) => {
        if (!n.active) return;
        const x = wx + n.position.x * sx, y = wy + n.position.y * sy;
        const nsx = sx * n.scale.x, nsy = sy * n.scale.y;
        const ut = n.getComponent(UITransform);
        const sp = n.getComponent(Sprite), lb = n.getComponent(Label);
        if (sp && sp.spriteFrame) {
            const r = sp.spriteFrame.rect;
            const raw = sp.sizeMode === 2;
            items.push({
                t: 's', f: rectName[JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height })],
                x, y, w: raw ? r.width : ut.w, h: raw ? r.height : ut.h, sx: nsx, sy: nsy, ax: ut.ax, ay: ut.ay,
                c: [sp.color.r, sp.color.g, sp.color.b, sp.color.a], tiled: sp.type === 2, ang: n.angle || 0,
            });
        }
        if (lb) items.push({ t: 'l', s: lb.string, x, y, size: lb.fontSize * Math.abs(nsy), ax: ut.ax, c: [lb.color.r, lb.color.g, lb.color.b, lb.color.a], o: lb.enableOutline ? lb.outlineWidth : 0 });
        for (const c of n.children) walk(c, x, y, nsx, nsy);
    };
    walk(canvas, 0, 0, 1, 1);
    fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ vh: VH, items }));
}

const step = (n: number) => { for (let i = 0; i < n; i++) g.update(1 / 60); };
const B = () => g.battle;

// 自动驾驶：绕圈 + 躲避，升级 / 宝箱自动选择
function autoplay(frames: number, opts: { god?: boolean; noChoose?: boolean; onFrame?: (i: number) => void } = {}) {
    for (let i = 0; i < frames; i++) {
        const b = B();
        const a = (b.time || 0) * 0.6;
        let fx = Math.cos(a) * 0.45, fy = Math.sin(a) * 0.45;
        for (const e of b.enemies) {
            if (!e.alive || e.def.prop) continue;
            const dx = b.px - e.x, dy = b.py - e.y, d = Math.hypot(dx, dy) || 1;
            if (d < 110) { fx += (dx / d) * (110 - d) / 40; fy += (dy / d) * (110 - d) / 40; }
        }
        const fl = Math.hypot(fx, fy);
        if (fl > 1) { fx /= fl; fy /= fl; }
        g.joyX = fx; g.joyY = fy;
        if (opts.god) b.hp = b.stats.maxHp;
        g.update(1 / 60);
        if (g.state === 'levelup' && !opts.noChoose) g.choose(0);
        if (g.state === 'chest') g.afterReward();
        if (g.state === 'revive') g.endRun(false);
        opts.onFrame?.(i);
    }
}

// 给出一套漂亮的中后期构筑
function strongBuild(ids: string[], lv = 7) {
    const b = B();
    b.weapons = [];
    b.passives = [];
    for (const id of ids) {
        b.applyOption({ kind: 'weapon', wdef: WEAPONS.find(w => w.id === id), level: 1 });
        const w = b.weapons[b.weapons.length - 1];
        w.level = lv;
        w.recalc();
    }
    for (const id of ['might', 'tome', 'candle', 'luck', 'heart']) b.applyOption({ kind: 'passive', pdef: PASSIVES.find(p => p.id === id), level: 1 });
    g.refreshIcons();
}

function startRun(char: string, build: string[], time: number, lv = 7) {
    Save.data.selected = char;
    g.startGame();
    step(1);
    if (g.state === 'levelup') g.choose(0);
    const b = B();
    b.pendingBlessings = 0;
    b.level = 30 + Math.floor(time / 30);
    b.xpNext = 999999;
    strongBuild(build, lv);
    b.time = time;
}

if (SCENE === 'shots') {
    // 1 标题
    g.setState('menu');
    step(100);
    g.heroHop();
    step(8);
    dump('01_title');
    // 19 七日签到（第 6 天待领，模拟已开通激励视频）
    Save.data.signCount = 5; Save.data.signDate = ''; Save.data.signShown = '';
    g.setState('chars');
    {
        const { Ads } = await import('../../assets/scripts/Ads');
        const orig = Ads.canReward;
        (Ads as any).canReward = () => true;
        g.setState('menu'); step(2);
        dump('19_signin');
        (Ads as any).canReward = orig;
    }
    g.claimSignin(1); g.setState('menu'); step(30);
    g.toastT = 0; g.toast.node.active = false; // 签到提示不要留在后面的截图里
    dump('20_menu_signed');
    g.setState('settings'); step(2);
    dump('23_settings');
    g.setState('achv'); step(2);
    dump('24_achv');
    // 2 角色选择
    g.setState('chars');
    step(2);
    dump('02_chars');
    // 3 满屏割草 + 连杀
    startRun('mage', ['wand', 'fire', 'chain', 'holy', 'garlic', 'familiar'], 260);
    autoplay(60 * 22, { god: true });
    dump('03_swarm');
    // 4 升级三选一
    B().pendingLevels = 1;
    step(1);
    dump('04_levelup');
    g.choose(0);
    // 5 Boss：深渊魔眼激光
    B().spawnBoss('eye');
    const boss = B().boss;
    for (let i = 0; i < 60 * 30; i++) {
        boss.hp = boss.maxHp;
        if (Math.hypot(boss.x - B().px, boss.y - B().py) > 330) { boss.x = B().px + 40; boss.y = B().py + 260; }
        autoplay(1, { god: true });
        if (B().hazards.some((h: any) => h.alive && h.kind === 'beam') && i > 60) { step(20); break; }
    }
    dump('05_boss');
    // 6 血月终局
    startRun('knight', ['axe', 'whip', 'cross', 'bomb', 'frost', 'lightning'], 785, 8);
    autoplay(60 * 14, { god: true });
    dump('06_bloodmoon');
    // 7 武器进化
    const b = B();
    const w = b.weapons.find((x: any) => x.def.id === 'axe');
    w.level = 8;
    w.recalc();
    b.applyOption({ kind: 'passive', pdef: PASSIVES.find(p => p.id === EVOLUTIONS.axe.passive), level: 1 });
    b.pendingChests = 1;
    step(1);
    dump('07_evolve');
    g.afterReward();
    // 8 胜利结算
    autoplay(60 * 3, { god: true });
    b.won = true;
    step(60);
    dump('25_victory_anim');
    step(60 * 3);
    dump('08_victory');
    // 9 / 10 新地图：冰雪荒原、熔岩火山（等待环境危害预警出现）
    Save.data.stages = ['grass', 'snow', 'lava'];
    for (const [stage, name, char, build] of [['snow', '09_snow', 'sage', ['lightning', 'frost', 'holy', 'chain', 'bible', 'garlic']], ['lava', '10_lava', 'pyro', ['fire', 'bomb', 'axe', 'cross', 'whip', 'familiar']]] as [string, string, string, string[]][]) {
        Save.data.stage = stage;
        startRun(char, build, 330);
        autoplay(60 * 12, { god: true });
        B().hazardT = 0.5;
        for (let i = 0; i < 60 * 15; i++) {
            autoplay(1, { god: true });
            if (B().hazards.some((h: any) => h.alive && h.kind === 'circle' && h.life < 0.45)) break;
        }
        dump(name);
    }
    // 17 毒雾沼泽：等毒云形成且新的毒泡预警出现
    Save.data.stages = ['grass', 'snow', 'lava', 'swamp'];
    Save.data.stage = 'swamp';
    startRun('druid', ['spikes', 'laser', 'garlic', 'holy', 'chain', 'bible'], 420);
    autoplay(60 * 12, { god: true });
    B().hazardT = 0.5;
    let clouds = 0;
    for (let i = 0; i < 60 * 30; i++) {
        autoplay(1, { god: true });
        const z = B().hazards.filter((h: any) => h.alive && h.kind === 'zone').length;
        if (z) clouds++;
        if (z >= 2 && B().hazards.some((h: any) => h.alive && h.kind === 'circle' && h.life < 0.5)) break;
        if (clouds > 60 && z && i > 60 * 20) break;
    }
    dump('17_swamp');
    // 18 毒沼巨蟾：等到毒液喷吐 / 长舌预警出现
    startRun('prism', ['laser', 'spikes', 'garlic', 'holy', 'chain', 'bible'], 405);
    for (let i = 0; i < 60 * 40; i++) {
        autoplay(1, { god: true });
        const bs = B().boss;
        if (bs && bs.def.name === '毒沼巨蟾') {
            bs.hp = bs.maxHp;
            if (Math.hypot(bs.x - B().px, bs.y - B().py) > 320) { bs.x = B().px + 40; bs.y = B().py + 240; }
            if (B().hazards.filter((h: any) => h.alive).length >= 3 && B().bullets.length > 4) break;
        }
    }
    dump('18_toad');
    Save.data.stage = 'grass';
    // 12 新春活动：年夜庙会 + 年兽
    EVENT.force = true;
    Save.data.stage = 'fest';
    startRun('hunter', ['bomb', 'fire', 'whip', 'garlic', 'cross', 'lightning'], 262);
    Save.data.selected = 'fu';
    autoplay(60 * 10, { god: true });
    for (let i = 0; i < 60 * 30; i++) {
        autoplay(1, { god: true });
        const bs = B().boss;
        if (bs && bs.def.name === '年兽') {
            bs.hp = bs.maxHp;
            if (Math.hypot(bs.x - B().px, bs.y - B().py) > 300) { bs.x = B().px + 60; bs.y = B().py + 230; }
            if (B().bullets.length > 18 || B().hazards.some((h: any) => h.alive)) { step(6); break; }
        }
    }
    dump('12_nian');
    g.setState('menu');
    step(30);
    dump('13_menu_event');
    EVENT.force = false;
    Save.data.stage = 'grass';
    // 21/22 圣诞活动：雪夜小镇 + 雪怪王
    EVENT.force = 'xmas';
    Save.data.stage = 'xmas';
    startRun('hunter', ['frost', 'holy', 'lightning', 'garlic', 'cross', 'whip'], 262);
    autoplay(60 * 10, { god: true });
    for (let i = 0; i < 60 * 30; i++) {
        autoplay(1, { god: true });
        const bs = B().boss;
        if (bs && bs.def.name === '雪怪王') {
            bs.hp = bs.maxHp;
            if (Math.hypot(bs.x - B().px, bs.y - B().py) > 300) { bs.x = B().px + 60; bs.y = B().py + 230; }
            if (B().bullets.length > 14 || B().hazards.filter((h: any) => h.alive).length >= 3) { step(4); break; }
        }
    }
    dump('21_xmas');
    Save.data.selected = 'santa';
    g.setState('menu');
    step(30);
    dump('22_menu_xmas');
    Save.data.selected = 'hunter';
    EVENT.force = false;
    Save.data.stage = 'grass';
    // 14/15 图鉴：收录约七成，选中一件进化武器 / 一个 Boss
    {
        const all = codexEntries();
        Save.data.codex = all.filter((e, i) => i % 7 !== 3 && e.key !== 'm:nian' && e.key !== 'm:reaper').map(e => e.key);
        g.codexTab = 'weapon'; g.codexSel = all.find(e => e.key === 'e:axe');
        g.setState('codex'); step(2);
        dump('14_codex');
        g.codexTab = 'monster'; g.codexSel = all.find(e => e.key === 'm:vampire');
        g.refreshAll(); step(2);
        dump('15_codex_monster');
        g.codexTab = 'passive'; g.codexSel = all.find(e => e.key === 'p:dup');
        g.refreshAll(); step(2);
        dump('16_codex_locked');
    }
    // 11 每日挑战界面（每日任务：一个已完成、两个进行中）
    {
        const { dailyQuests } = await import('../../assets/scripts/Defs');
        const qs = dailyQuests(new Date().toDateString());
        Save.data.questDate = new Date().toDateString();
        Save.data.questProg = { [qs[0].stat]: qs[0].n, [qs[1].stat]: Math.floor(qs[1].n * 0.6), [qs[2].stat]: Math.floor(qs[2].n * 0.25) };
        Save.data.questDone = [qs[0].id];
    }
    g.setState('daily');
    step(2);
    dump('11_daily');
} else if (SCENE === 'video') {
    // 30fps：每 2 个逻辑帧导出 1 帧
    let k = 0;
    const rec = (frames: number, fn: () => void) => {
        for (let i = 0; i < frames; i++) {
            fn();
            if (i % 2 === 0) dump(String(k++).padStart(5, '0'));
        }
    };
    g.setState('menu');
    step(60);
    rec(36, () => step(1));
    g.heroHop();
    rec(60, () => step(1));
    startRun('mage', ['wand', 'fire', 'chain', 'holy', 'garlic', 'familiar'], 240);
    autoplay(60 * 6, { god: true });
    rec(60 * 6, () => autoplay(1, { god: true }));
    B().pendingLevels = 1;
    step(1);
    rec(40, () => step(0));
    g.choose(0);
    rec(60 * 3, () => autoplay(1, { god: true }));
    B().spawnBoss('eye');
    const boss = B().boss;
    rec(60 * 5, () => {
        boss.hp = Math.max(boss.hp, boss.maxHp * 0.5);
        if (Math.hypot(boss.x - B().px, boss.y - B().py) > 330) { boss.x = B().px + 40; boss.y = B().py + 260; }
        autoplay(1, { god: true });
    });
    startRun('knight', ['axe', 'whip', 'cross', 'bomb', 'frost', 'lightning'], 778, 8);
    autoplay(60 * 6, { god: true });
    rec(60 * 6, () => autoplay(1, { god: true }));
    B().won = true;
    step(1);
    rec(60 * 2.5, () => step(1));
    console.log('video frames:', k);
}
if (SCENE === 'fxcheck') {
    // 手感检查：鞭子甩出 3 帧 + 倒下动画 3 帧
    Save.data.stage = 'grass';
    startRun('hunter', ['whip'], 60, 6);
    B().weapons[0].level = 6; B().weapons[0].recalc();
    autoplay(60 * 4, { god: true });
    const w = B().weapons[0]; w.timer = 0.001;
    let n = 0;
    for (let i = 0; i < 40 && n < 3; i++) { g.update(1 / 60); if (B().fxs.some((f: any) => f.alive && f.sp.spriteFrame && f.stretch > 0)) { if (i % 2 === 0) { dump('fx_whip_' + n); n++; } } }
    B().iframe = 0; B().shieldHits = 0; B().revivals = 0; B().hp = 1; B().hurtPlayer(999);
    for (let i = 0; i < 100; i++) { g.update(1 / 60); if (i === 15) dump('fx_die_0'); if (i === 40) dump('fx_die_1'); if (i === 95) dump('fx_die_2'); }
}

if (SCENE === 'beian') {
    // 备案截图：隐藏启动页 / 主菜单左上角的 12+ 适龄标识（应审核要求）
    const hideAgeBadge = () => {
        const walk = (n: any) => {
            for (const c of n.children) {
                const txt = JSON.stringify((c.children || []).map((k: any) => (k.comps || []).map((x: any) => x.string)));
                if (c.name === 'panel' && txt.includes('CADPA')) c.active = false;
                else walk(c);
            }
        };
        walk(canvas);
    };
    hideAgeBadge();
    // 小游戏备案截图：真实游戏画面、无宣传字幕；只用前期可爱内容（草原、老鼠 / 蝙蝠 / 史莱姆），避免骷髅等恐怖元素
    const cute = (b: any) => { for (const e of b.enemies) if (e.alive && !['rat', 'bat', 'slime', 'goldrat', 'brazier', 'slimeking'].includes(Object.keys(ENEMIES).find(k => ENEMIES[k] === e.def) || '')) { e.alive = false; e.node.active = false; } };
    Save.data.stage = 'grass';
    // 0 启动页（健康游戏忠告 + 适龄提示标识）与适龄提示说明
    g.splashT = 0; g.setState('splash'); for (let i = 0; i < 100; i++) { g.splashT = Math.min(g.splashT, 2.0); g.update(1 / 60); }
    dump('b00_splash');
    g.showAgeTip(); step(1);
    dump('b00_agetip');
    g.ageNode.active = false;
    // 1 主界面（含游戏名）
    g.setState('menu'); step(100); g.heroHop(); step(8);
    dump('b01_menu');
    // 2 战斗：开局 1 分钟，草原上割老鼠和蝙蝠
    Save.data.selected = 'hunter';
    g.startGame(); step(1); if (g.state === 'levelup') g.choose(0);
    B().pendingBlessings = 0; if (g.state !== 'play') g.setState('play');
    strongBuild(['whip', 'wand', 'garlic', 'holy'], 4);
    B().time = 50; B().xpNext = 999999; B().level = 12;
    for (let i = 0; i < 60 * 14; i++) { autoplay(1, { god: true }); cute(B()); }
    g.bannerT = 0; g.bannerLabel.node.active = false;
    dump('b02_play');
    // 3 升级三选一
    B().pendingLevels = 1; step(1); cute(B());
    dump('b03_levelup');
    g.choose(0); step(1);
    // 4 宝箱 / 进化
    for (let i = 0; i < 60 * 4; i++) { autoplay(1, { god: true }); cute(B()); }
    // 宝箱开启（先清掉连击横幅，避免叠在宝箱上）
    g.bannerT = 0; g.bannerLabel.node.active = false;
    B().pendingChests = 1; step(1); cute(B());
    dump('b10_chest');
    g.afterReward(); step(1);
    // 首领：史莱姆王 + 红色提示圈（雪夜小镇：下一个首领是雪怪王）
    EVENT.force = 'xmas';
    Save.data.stage = 'xmas';
    g.startGame(); step(1); if (g.state === 'levelup') g.choose(0);
    B().pendingBlessings = 0; if (g.state !== 'play') g.setState('play');
    strongBuild(['whip', 'wand', 'garlic', 'holy'], 4);
    B().time = 116; B().xpNext = 999999; B().level = 14;
    for (let i = 0; i < 60 * 25; i++) {
        autoplay(1, { god: true }); cute(B());
        const bs = B().boss;
        if (bs && bs.alive) {
            bs.hp = bs.maxHp;
            if (Math.hypot(bs.x - B().px, bs.y - B().py) > 260) { bs.x = B().px + 40; bs.y = B().py + 200; }
            if (i > 60 * 6 && B().hazards.some((h: any) => h.alive && h.kind === 'circle' && h.life < 0.9 && h.life > 0.3)) break;
        }
    }
    g.bannerT = 0; g.bannerLabel.node.active = false;
    dump('b11_boss');
    EVENT.force = false;
    // 冰雪荒原：开局 1 分钟
    Save.data.stages = ['grass', 'snow', 'lava', 'swamp'];
    Save.data.stage = 'snow';
    Save.data.selected = 'sage';
    g.startGame(); step(1); if (g.state === 'levelup') g.choose(0);
    B().pendingBlessings = 0; if (g.state !== 'play') g.setState('play');
    strongBuild(['lightning', 'frost', 'holy'], 4);
    B().time = 60; B().xpNext = 999999; B().level = 11;
    for (let i = 0; i < 60 * 12; i++) { autoplay(1, { god: true }); cute(B()); }
    g.bannerT = 0; g.bannerLabel.node.active = false;
    dump('b12_snow');
    Save.data.stage = 'grass'; Save.data.selected = 'hunter';
    // 5 选择角色
    g.setState('chars'); step(2);
    dump('b04_chars');
    // 6 永久强化（金币用途）
    g.setState('shop'); step(2);
    dump('b05_shop');
    // 7 七日签到
    Save.data.signCount = 2; Save.data.signDate = ''; Save.data.signShown = '';
    g.setState('signin'); step(2);
    dump('b06_signin');
    Save.data.signDate = Save.data.signShown = new Date().toDateString();
    // 8 每日挑战与任务
    g.setState('daily'); step(2);
    dump('b07_daily');
    // 9 图鉴（道具页）
    g.codexTab = 'passive'; g.codexSel = null;
    g.setState('codex'); step(2);
    dump('b08_codex');
    // 10 设置
    g.setState('settings'); step(2);
    dump('b09_settings');
}

if (SCENE === 'xmasvid') {
    // 圣诞活动短视频：雪夜小镇 → 雪怪王降临 → 技能
    let k = 0;
    const rec = (frames: number, fn: () => void) => { for (let i = 0; i < frames; i++) { fn(); if (i % 2 === 0) dump(String(k++).padStart(5, '0')); } };
    EVENT.force = 'xmas';
    Save.data.stage = 'xmas';
    Save.data.chars.push('santa');
    startRun('santa', ['frost', 'holy', 'lightning', 'garlic', 'cross', 'whip'], 262);
    B().bossIdx = 1; // 跳过史莱姆王，直接等雪怪王
    autoplay(60 * 2, { god: true });
    rec(60 * 12, () => {
        autoplay(1, { god: true });
        const bs = B().boss;
        if (bs && bs.def.name === '雪怪王') { bs.hp = Math.max(bs.hp, bs.maxHp * 0.5); if (Math.hypot(bs.x - B().px, bs.y - B().py) > 320) { bs.x = B().px + 60; bs.y = B().py + 240; } }
    });
}

if (SCENE === 'newmap') {
    // 新地图预告：毒雾沼泽，毒泡预警 → 喷发 → 毒云
    let k = 0;
    const rec = (frames: number, fn: () => void) => { for (let i = 0; i < frames; i++) { fn(); if (i % 2 === 0) dump(String(k++).padStart(5, '0')); } };
    Save.data.stages = ['grass', 'snow', 'lava', 'swamp'];
    Save.data.stage = 'swamp';
    startRun('druid', ['spikes', 'laser', 'garlic', 'holy', 'chain', 'bible'], 400);
    autoplay(60 * 6, { god: true });
    B().hazardT = 1.2;
    rec(60 * 11, () => { if (B().hazardT > 4) B().hazardT = 4; autoplay(1, { god: true }); });
}

if (SCENE === 'newweap') {
    // 新武器预告：棱镜激光 + 荆棘地刺 → 进化为虹光棱镜 + 血棘
    let k = 0;
    const rec = (frames: number, fn: () => void) => { for (let i = 0; i < frames; i++) { fn(); if (i % 2 === 0) dump(String(k++).padStart(5, '0')); } };
    startRun('mage', ['laser', 'spikes'], 330, 8);
    autoplay(60 * 4, { god: true });
    rec(60 * 5, () => autoplay(1, { god: true }));
    for (const w of B().weapons) B().evolve(w);
    g.refreshIcons();
    g.banner('武器进化！', new Color(255, 140, 90, 255));
    rec(60 * 6, () => autoplay(1, { god: true }));
}

if (SCENE === 'tutorial') {
    // 新手首局：从空存档开始，录下引导的每一步（同时校验引导流程）
    Save.data.runs = 0; Save.data.wins = 0; Save.data.tutDone = false; Save.data.chars = ['hunter'];
    Save.data.selected = 'hunter'; Save.data.stage = 'grass'; Save.data.bestTime = 0; Save.data.gold = 0;
    g.startGame();
    let f = 0, last = -2;
    const seen: number[] = [];
    const rec = () => {
        if (g.tutStep !== last) { last = g.tutStep; seen.push(last); console.log(`  step ${last} @ ${B().time.toFixed(1)}s state=${g.state}`); }
        if (f++ % 2 === 0) dump(String(Math.floor(f / 2)).padStart(5, '0'));
    };
    // 先停 2 秒看摇杆演示，再向右上移动
    for (let i = 0; i < 120; i++) { g.update(1 / 60); rec(); }
    for (let i = 0; i < 90; i++) { g.joyX = 0.8; g.joyY = 0.3; B().hp = B().stats.maxHp; g.update(1 / 60); rec(); }
    // 自由割草直到第一次升级，升级界面停 2 秒
    let guard = 0;
    while (g.state !== 'levelup' && guard++ < 60 * 60) { autoplay(1, { god: true, noChoose: true }); rec(); }
    for (let i = 0; i < 120; i++) { g.update(1 / 60); rec(); }
    g.choose(0);
    for (let i = 0; i < 300; i++) { autoplay(1, { god: true }); rec(); }
    // 快进到第一个 Boss 前 14 秒
    const nb = B().nextBoss();
    if (nb) B().time += nb.remain - 14;
    for (let i = 0; i < 60 * 9; i++) { autoplay(1, { god: true }); rec(); }
    const ok = JSON.stringify(seen) === JSON.stringify([0, 1, 2, 3, 4, 5, -1]) || JSON.stringify(seen.slice(0, 6)) === JSON.stringify([0, 1, 2, 3, 4, 5]);
    g.endRun(false);
    console.log(ok && Save.data.tutDone ? '  ✔ 引导 6 步全部触发，tutDone 已保存' : '  ✘ 引导异常 ' + JSON.stringify(seen) + ' tutDone=' + Save.data.tutDone);
    // 第二局不再出现引导
    g.startGame(); step(5);
    console.log(g.tutStep === -1 ? '  ✔ 第二局不显示引导' : '  ✘ 第二局仍显示引导');
}

if (SCENE === 'compare_a' || SCENE === 'compare_b') {
    // 对比视频：开局 1 级皮鞭 vs 14 分钟全进化构筑（各 10 秒）
    let k = 0;
    if (SCENE === 'compare_a') {
        Save.data.selected = 'hunter';
        g.startGame();
        step(1);
        if (g.state === 'levelup') g.choose(0);
        B().xpNext = 999999;
        B().time = 50;
    } else {
        startRun('knight', ['axe', 'whip', 'cross', 'bomb', 'frost', 'lightning'], 830, 8);
        const b = B();
        for (const w of b.weapons) {
            const evo = EVOLUTIONS[w.def.id];
            if (evo && !b.passives.find((p: any) => p.def.id === evo.passive)) b.applyOption({ kind: 'passive', pdef: PASSIVES.find(p => p.id === evo.passive), level: 1 });
            b.evolve(w);
        }
        b.level = 60;
        g.refreshIcons();
    }
    autoplay(60 * 3, { god: true });
    for (let i = 0; i < 600; i++) {
        autoplay(1, { god: true });
        if (i % 2 === 0) dump(String(k++).padStart(5, '0'));
    }
}
console.log('captured →', OUT);

// 新玩法展示：大招 / 神兵 / 新道具 / 试炼
if (SCENE === 'features') {
    const { EPICS, BOSS_SCHEDULE } = await import('../../assets/scripts/Defs');
    // 跳过已经错过的 Boss，避免截图里一堆 Boss 轮流登场
    const skipBosses = () => { B().bossIdx = Math.max(0, BOSS_SCHEDULE.findIndex((x: any) => x.t > B().time)); };
    Save.data.chars = ['hunter', 'mage', 'rogue', 'knight', 'nun', 'pyro', 'bomber', 'sage', 'druid', 'prism', 'fu', 'santa'];
    const epicShot = (char: string, build: string[], epic: string, name: string, t = 420, frames = 50) => {
        startRun(char, build, t); skipBosses();
        autoplay(60 * 4, { god: true });
        (B() as any).startEpic(EPICS.find((e: any) => e.id === epic));
        autoplay(frames, { god: true });
        g.bannerT = 0; g.bannerLabel.node.active = false;
        dump(name);
        g.endRun(false);
    };
    epicShot('hunter', ['whip', 'garlic', 'wand'], 'thor', '01_epic_thor');
    epicShot('mage', ['wand', 'bible', 'fire'], 'gatling', '02_epic_gatling');
    epicShot('knight', ['axe', 'frost', 'chain'], 'excalibur', '03_epic_excalibur', 420, 58);
    epicShot('sage', ['lightning', 'holy', 'cross'], 'blackhole', '04_epic_blackhole', 420, 120);
    epicShot('pyro', ['fire', 'knife', 'spikes'], 'dragon', '05_epic_dragon');
    epicShot('prism', ['laser', 'familiar', 'bomb'], 'unicorn', '06_epic_unicorn', 420, 90);
    // 大招
    const ultShot = (char: string, build: string[], frames: number, name: string) => {
        startRun(char, build, 400); skipBosses();
        autoplay(60 * 5, { god: true });
        B().ult = 1;
        g.castUlt();
        autoplay(frames, { god: true });
        dump(name);
        g.endRun(false);
    };
    ultShot('hunter', ['whip', 'garlic'], 30, '10_ult_hunter');
    ultShot('mage', ['wand', 'bible'], 40, '11_ult_mage');
    ultShot('nun', ['bible', 'holy'], 40, '12_ult_nun');
    ultShot('pyro', ['fire', 'knife'], 52, '13_ult_pyro');
    ultShot('prism', ['laser', 'familiar'], 4, '14_ult_prism');
    ultShot('druid', ['spikes', 'garlic'], 30, '15_ult_druid');
    // 大招就绪 + 巨人蘑菇 + 试炼进行中
    startRun('bomber', ['bomb', 'whip', 'axe'], 380); skipBosses();
    autoplay(60 * 4, { god: true });
    B().ult = 1; B().collect({ kind: 'giant', value: 0 });
    B().shrineT = 0.01; step(2);
    const sh = B().pickups.find((p: any) => p.alive && p.kind === 'shrine');
    B().px = sh.x; B().py = sh.y; step(2);
    autoplay(60 * 3, { god: true });
    g.bannerT = 0; g.bannerLabel.node.active = false;
    dump('20_giant_trial_ready');
    g.endRun(false);
    // 神兵祭坛
    startRun('rogue', ['knife', 'cross'], 300); skipBosses();
    autoplay(60 * 3, { god: true });
    B().altarT = 0.01; step(2);
    const al = B().enemies.find((e: any) => e.alive && e.def === ENEMIES.altar);
    B().px = al.x - 120; B().py = al.y - 60; step(1);
    dump('21_altar');
    g.endRun(false);
    // 角色界面（天赋 + 大招 + 充能方式）
    Save.data.selected = 'druid';
    g.setState('chars'); step(2);
    dump('30_chars');
}

// 流沙荒漠：龙卷风 / 狂风 / 沙漠巨蠕 / 新怪物
if (SCENE === 'desert') {
    const { BOSS_SCHEDULE } = await import('../../assets/scripts/Defs');
    Save.data.stages = ['grass', 'snow', 'lava', 'swamp', 'desert'];
    Save.data.stage = 'desert';
    startRun('rogue', ['knife', 'cross', 'garlic'], 610);
    B().bossIdx = BOSS_SCHEDULE.findIndex((x: any) => x.t > 610);
    autoplay(60 * 4, { god: true });
    B().hazardT = 0.01; B().windT = 0.01;
    autoplay(60 * 3, { god: true });
    dump('01_desert_tornado');
    for (let i = 0; i < 4; i++) B().summon('boar', B().px + 160 + i * 30, B().py + (i - 2) * 50);
    autoplay(70, { god: true });
    dump('02_desert_boars');
    B().time = 718;
    autoplay(60 * 6, { god: true });
    dump('03_worm');
    autoplay(60 * 3, { god: true });
    dump('04_worm2');
    g.endRun(false);
}
