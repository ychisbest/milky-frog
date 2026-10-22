// 回归测试：用 cc 模拟层跑真实游戏逻辑（无渲染）。用法：tools/tests/run.sh
// MODE=A 无广告 / MODE=B 模拟微信激励视频可用 / MODE=C 模拟抖音录屏
import { sfxLog, Node, Canvas } from 'cc';
const MODE = process.env.MODE || 'A';
const G = globalThis as any;
if (MODE === 'B') {
    G.wx = {
        createRewardedVideoAd: () => { let close: any; return { onLoad() {}, onError() {}, onClose(cb: any) { close = cb; }, load: () => Promise.resolve(), show: () => { setTimeout(() => close({ isEnded: true }), 0); return Promise.resolve(); } }; },
        shareAppMessage: (o: any) => { G.__share = o; },
    };
}
if (MODE === 'C') {
    let stopCb: any = null, n = 0;
    G.tt = {
        getGameRecorderManager: () => ({ start() {}, pause() {}, resume() {}, stop() { stopCb({ videoPath: 'v' + (++n) + '.mp4' }); }, onStop(cb: any) { stopCb = cb; }, onError() {} }),
        shareAppMessage: (o: any) => { G.__share = o; o.success && o.success(); },
    };
}
const { AD_CONFIG } = await import('../../assets/scripts/AdConfig');
if (MODE === 'B') AD_CONFIG.rewarded = 'adunit-test';
const { Save } = await import('../../assets/scripts/Save');
const D = await import('../../assets/scripts/Defs');
const { GameRoot } = await import('../../assets/scripts/GameRoot');
const { Recorder } = await import('../../assets/scripts/Recorder');

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else fail++; console.log((c ? '  ✔ ' : '  ✘ FAIL ') + m); };
const section = (s: string) => console.log('\n## ' + s);
const wait = () => new Promise(r => setTimeout(r, 5));

const canvas = new Node('Canvas'); canvas.addComponent(Canvas);
const g: any = canvas.addComponent(GameRoot as any);
Save.data.privacyOk = true;
g.onLoad();
const today = new Date().toDateString();
const base = () => {
    const d = Save.data;
    d.privacyOk = true; d.tutDone = true; d.runs = 5; d.wins = 1; d.mode = 'normal'; d.stage = 'grass'; d.selected = 'hunter';
    d.signDate = d.signShown = today; d.lite = false;
};
const step = (n: number) => { for (let i = 0; i < n; i++) g.update(1 / 60); };
const B = () => g.battle;
const clearCards = () => { if (g.state === 'levelup' || g.state === 'chest') { B().pendingLevels = 0; B().pendingChests = 0; B().pendingBlessings = 0; g.setState('play'); } };
const start = () => { g.startGame(); step(1); clearCards(); B().pendingBlessings = 0; };
const play = (frames: number, god = true) => {
    for (let i = 0; i < frames && (g.state === 'play' || g.state === 'levelup' || g.state === 'chest'); i++) {
        if (god) B().hp = B().stats.maxHp;
        g.joyX = Math.cos(i / 90) * 0.5; g.joyY = Math.sin(i / 90) * 0.5;
        g.update(1 / 60);
        if (g.state === 'levelup') g.choose(0);
        if (g.state === 'chest') g.afterReward();
    }
};
const until = (state: string, max = 600) => { for (let i = 0; i < max && g.state !== state; i++) g.update(1 / 60); return g.state === state; };
const findButton = (text: string) => {
    const scr = g.screens[g.state];
    const walk = (n: any): any => {
        for (const c of n.children) {
            if (!c.active) continue;
            if (c.name === 'btn' && c.children.some((k: any) => (k.comps || []).some((x: any) => x.string === text))) return c;
            const r = walk(c); if (r) return r;
        }
        return null;
    };
    return walk(scr);
};

if (MODE === 'C') {
    section('抖音录屏');
    base();
    ok(Recorder.supported, '检测到抖音录屏接口');
    start();
    play(60);
    B().won = true;
    ok(until('result'), '胜利后进入结算');
    ok(Recorder.ready && g.recBtn.node.active, '结算页显示「分享本局录屏」');
    g.recBtn.node.emit('te');
    ok(G.__share && G.__share.channel === 'video', '以视频形式分享');
} else {
    section('新手引导');
    base(); Save.data.runs = 0; Save.data.tutDone = false; Save.data.chars = ['hunter'];
    g.startGame(); step(1);
    ok(g.tutStep === 0 && B().pendingBlessings === 0 && g.state === 'play', '首局：引导开始，开局不弹命运卡牌');
    let maxStep = 0;
    for (let i = 0; i < 60 * 60 && maxStep < 4; i++) { B().hp = B().stats.maxHp; g.joyX = 0.7; g.joyY = 0.2; g.update(1 / 60); maxStep = Math.max(maxStep, g.tutStep); if (g.state === 'levelup') g.choose(0); }
    ok(maxStep >= 4, '引导推进到第 4 步（移动 → 击败 → 宝石 → 升级）');
    g.endRun(false);
    ok(Save.data.tutDone, '首局结束后标记引导完成');

    section('刷怪节奏');
    base(); start();
    B().time = 0; const p0 = B().spawnPace();
    B().time = 300; let lo = 9, hi = 0; for (let t = 300; t < 360; t += 1) { B().time = t; const p = B().spawnPace(); lo = Math.min(lo, p); hi = Math.max(hi, p); }
    ok(p0 < 0.6, `开局刷怪速度低（${p0.toFixed(2)} 倍）`);
    ok(hi / lo > 2.5, `5 分钟后有波峰波谷（${lo.toFixed(2)} ~ ${hi.toFixed(2)}）`);
    // 跳过史莱姆王（Boss 战期间不出特殊怪潮），在 2:40 ~ 3:40 之间观察波峰
    B().bossIdx = 1; B().time = 160; play(60 * 60);
    ok(B().lastSurgeCycle >= 0, '波峰出现特殊出怪（包围 / 冲锋 / 怪潮）');
    g.endRun(false);

    section('摇杆底座固定');
    base(); start();
    const { EventTouch } = await import('cc');
    g.onJoyStart(new EventTouch(700, 400));
    const ox = g.joyBase.position.x, oy = g.joyBase.position.y;
    g.onJoyMove(new EventTouch(1100, 400));
    ok(g.joyBase.position.x === ox && g.joyBase.position.y === oy, '手指拖远时底座不跟随');
    ok(Math.abs(g.joyX - 1) < 0.01, '方向输出为满值');
    g.onJoyEnd(); g.endRun(false);

    section('胜利过渡 / 倒下动画');
    base(); start(); play(60);
    B().won = true; step(1);
    ok(g.state === 'victory', '胜利先播放庆祝动画');
    ok(until('result') && g.resultTitle.string === '胜利!', '约 3 秒后进入结算');
    start(); play(30);
    B().iframe = 0; B().shieldHits = 0; B().revivals = 0; B().hp = 1; B().hurtPlayer(999); step(1);
    ok(g.state === 'dying', '倒下先播放倒下动画');
    step(110);
    ok(g.state === (MODE === 'B' ? 'revive' : 'result'), MODE === 'B' ? '动画后出现复活界面' : '动画后直接结算（无广告）');
    if (MODE === 'B') {
        findButton('▶ 看广告复活').emit('te'); await wait();
        ok(g.state === 'play' && !B().dead && B().playerBody.active, '看广告复活，奶蛙外观恢复');
        B().gold = 50; B().iframe = 0; B().hp = 1; B().hurtPlayer(999); step(120);
        ok(g.state === 'result', '每局只能复活一次');
        const gold0 = Save.data.gold;
        ok(g.goldAdBtn.node.active, '结算页显示「看广告 金币×2」');
        g.goldAdBtn.node.emit('te'); await wait();
        ok(Save.data.gold > gold0, '看广告金币翻倍');
    }

    section('棱镜激光音效');
    base(); start();
    B().weapons = []; B().applyOption({ kind: 'weapon', wdef: D.WEAPONS.find(w => w.id === 'laser'), level: 1 });
    B().time = 120; const before = sfxLog['beam'] || 0, laser0 = sfxLog['laser'] || 0;
    const { Sound } = await import('../../assets/scripts/Sound');
    (Sound as any).last.clear(); // 音效节流按真实时间计算，测试跑得太快会把这次的激光音节流掉
    play(60 * 6);
    ok((sfxLog['beam'] || 0) > before && (sfxLog['laser'] || 0) === laser0, '激光使用短音效 beam，不再使用 Boss 长激光音');
    g.endRun(false);

    section('每日挑战');
    base(); Save.data.dailyDone = '';
    g.startDaily(); step(1); clearCards();
    ok(!!B().daily && !B().nightmare, '每日挑战开局（不受噩梦影响）');
    B().time = 599.9; B().hp = B().stats.maxHp;
    play(30); until('result', 400);
    ok(Save.data.dailyDone === today && g.resultHint.string.includes('+400'), '存活 10 分钟领取 400 金币');

    section('限时活动');
    const at = (s: string) => D.activeEvent(new Date(s + 'T12:00:00'));
    ok(at('2026-12-25')!.id === 'xmas' && at('2027-02-06')!.id === 'cny' && !at('2027-01-15'), '圣诞 / 新春按日期开启');
    let bad = 0; for (let k = 0; k < 300; k++) { const d = D.dailySetup('d' + k); if (d.char === 'fu' || d.char === 'santa' || d.stage === 'fest' || d.stage === 'xmas') bad++; }
    ok(bad === 0, '每日挑战不使用活动内容');
    for (const [force, stage, boss, char] of [['xmas', 'xmas', 'yeti', 'santa'], [true, 'fest', 'nian', 'fu']] as [any, string, string, string][]) {
        base(); D.EVENT.force = force; Save.data.stage = stage; Save.data.chars = Save.data.chars.filter(c => c !== char);
        start(); B().time = 262;
        let killed = false;
        for (let i = 0; i < 60 * 40 && !killed; i++) { B().hp = B().stats.maxHp; g.update(1 / 60); if (g.state === 'levelup') g.choose(0); if (g.state === 'chest') g.afterReward(); if (B().boss && i % 120 === 0) B().boss.hp = 1; killed = B().bossKills.includes(boss); }
        clearCards(); g.endRun(false);
        ok(killed && Save.data.chars.includes(char), `${stage}：限定 Boss 出现并被击败，解锁限定角色`);
        D.EVENT.force = false;
    }

    section('图鉴 / 每日任务 / 签到');
    const all = D.codexEntries();
    ok(all.length === 103 && new Set(all.map(e => e.key)).size === 103, `图鉴 103 项且不重复（${all.length}）`);
    base(); Save.data.codex = []; start(); play(60 * 30);
    ok(Save.data.codex.includes('w:whip') && Save.data.codex.includes('m:rat'), '获得武器 / 击败怪物会收录图鉴');
    const qs = D.dailyQuests(today);
    ok(qs.length === 3 && new Set(qs.map(q => q.stat)).size === 3, '每日任务：3 个不同类型');
    // 「完成 2 局」类任务：先记 1 局，这一局结算后正好完成
    Save.data.questDate = today; Save.data.questProg = { runs: 1 }; Save.data.questDone = [];
    B().kills = 9999; B().time = 700; B().level = 60; B().maxCombo = 999; B().evolvedCount = 2; B().gold = 999; B().chestsOpened = 5; B().bossKills = ['slimeking', 'bonelord', 'vampire'];
    clearCards(); g.endRun(false);
    ok(qs.every(q => Save.data.questDone.includes(q.id)) && Save.data.questDone.includes('bonus'), '任务完成并领取全勤奖励');
    base(); Save.data.signDate = ''; Save.data.signShown = ''; Save.data.signCount = 0;
    g.setState('menu');
    ok(g.state === 'signin', '每天首次回到主菜单弹出签到');
    const gold1 = Save.data.gold; g.claimSignin(1);
    ok(Save.data.gold === gold1 + D.SIGNIN_REWARDS[0] && Save.data.signCount === 1, '签到领取金币');
    g.claimSignin(1); ok(Save.data.signCount === 1, '同一天不能重复签到');

    section('毒雾沼泽 / 毒沼巨蟾 / 爆炸蘑菇');
    base(); Save.data.stages = ['grass', 'snow', 'lava', 'swamp']; Save.data.stage = 'swamp';
    start(); B().time = 300; B().hazardT = 0.1;
    let clouds = 0; for (let i = 0; i < 60 * 25; i++) { B().hp = B().stats.maxHp; g.update(1 / 60); if (g.state === 'levelup') g.choose(0); if (g.state === 'chest') g.afterReward(); clouds = Math.max(clouds, B().pzones.filter((z: any) => z.alive && z.kind === 'poison').length); }
    ok(clouds > 0, '毒泡喷发留下毒云');
    ok(B().nextBoss()?.name === '毒沼巨蟾' || B().bossKills.length > 0, '沼泽 7:00 的 Boss 换成毒沼巨蟾');
    clearCards(); g.endRun(false);
    base(); start(); B().time = 430;
    for (const e of B().enemies) e.alive = false;
    B().summon('shroom', B().px + 30, B().py);
    const sh = B().enemies.find((e: any) => e.alive && e.def.burst);
    B().hurtEnemy(sh, 9999, 0, B().px, B().py, null); step(1);
    ok(B().hazards.some((h: any) => h.alive && h.kind === 'circle'), '爆炸蘑菇被击败后出现红圈');
    clearCards(); g.endRun(false);

    section('噩梦难度 / 命运卡牌 / 新武器');
    base(); Save.data.mode = 'nightmare';
    start(); ok(B().nightmare, '首胜后可进入噩梦难度');
    B().won = true; until('result');
    ok(Save.data.achievements.includes('nightmare1'), '噩梦胜利获得「噩梦征服者」');
    Save.data.mode = 'normal';
    ok(D.BLESSINGS.length === 20, '命运卡牌 20 张');
    ok(Object.values(D.EVOLUTIONS).length === D.WEAPONS.length && new Set(Object.values(D.EVOLUTIONS).map((e: any) => e.passive)).size === D.PASSIVES.length && D.PASSIVES.length === 18, `${D.PASSIVES.length} 个道具都是进化钥匙`);

    section('场景道具 / 角色天赋');
    const { Art } = await import('../../assets/scripts/Art');
    ok(Object.keys(D.PICKUP_INFO).every(k => !!Art.f(k)), '所有场景道具都有图标');
    const dropSum = D.BRAZIER_DROPS.reduce((a: number, x: any) => a + x[1], 0);
    const chick = D.BRAZIER_DROPS.find((x: any) => x[0] === 'chicken')[1];
    ok(chick / dropSum <= 0.12, `火盆掉烤鸡腿概率降低（${Math.round(chick / dropSum * 100)}%）`);
    ok(D.CHARACTERS.every((c: any) => c.trait && c.traitName) && new Set(D.CHARACTERS.map((c: any) => c.traitName)).size === D.CHARACTERS.length, '每个角色都有独立的专属天赋');
    base(); start();
    const pick = (kind: string) => B().collect({ kind, value: 0 });
    pick('haste'); pick('clover'); pick('firering');
    ok(B().hasteT > 0 && B().cloverT > 0 && B().fireT > 0, '急速沙漏 / 四叶草 / 烈焰之环生效');
    ok(Save.data.codex.includes('i:haste'), '拾取道具会收录图鉴');
    const lv0 = B().level; pick('scroll'); ok(B().level === lv0 + 1, '智慧卷轴立刻升 1 级');
    clearCards();
    const k0 = B().kills; play(60 * 10); ok(B().kills > k0, '烈焰之环期间正常战斗');
    // 周期天赋：德鲁伊缠绕、长老落雷、盾卫护盾、圣诞礼物
    for (const id of ['nun', 'sage', 'druid', 'santa']) {
        base(); Save.data.chars = D.CHARACTERS.map((c: any) => c.id); Save.data.selected = id; start();
        if (id === 'nun') { B().traitT = 0; B().shieldHits = 0; step(2); ok(B().shieldHits === 1, '圣光庇护：计时到后获得 1 层护盾'); continue; }
        const sh = B().shieldHits, pk = B().pickups.filter((p: any) => p.alive && p.kind !== 'gem' && p.kind !== 'coin').length;
        play(60 * 75);
        const okT = id === 'nun' ? B().shieldHits >= 1 || sh >= 1 : id === 'santa' ? Save.data.codex.some((k: string) => k.startsWith('i:')) || B().pickups.some((p: any) => p.alive && D.BUFF_DROPS.includes(p.kind)) || pk > 0 : B().kills > 0;
        ok(okT && B().char.id === id, `${D.CHARACTERS.find((c: any) => c.id === id).traitName} 正常运行`);
    }
    base(); Save.data.selected = 'rogue'; start();
    let dodged = 0; for (let i = 0; i < 200; i++) { B().iframe = 0; B().shieldHits = 0; B().hp = 1000; B().hurtPlayer(5); if (B().hp === 1000) dodged++; }
    ok(dodged > 5 && dodged < 60, `游侠蛙闪避（200 次中闪避 ${dodged} 次）`);
    base(); Save.data.selected = 'hunter';

    section('角色大招');
    const allIds = D.CHARACTERS.map((c: any) => c.id);
    ok(D.CHARACTERS.every((c: any) => c.ultName && c.ult && D.CHARGE_DESC[c.charge]) && new Set(D.CHARACTERS.map((c: any) => c.ultName)).size === D.CHARACTERS.length, '每个角色都有独立的大招与充能方式');
    ok(new Set(D.CHARACTERS.map((c: any) => c.charge)).size >= 10, `充能方式各不相同（${new Set(D.CHARACTERS.map((c: any) => c.charge)).size} 种）`);
    for (const id of allIds) {
        base(); Save.data.chars = allIds; Save.data.selected = id; start(); B().time = 300;
        play(60 * 3);
        const k0 = B().kills, hp0 = B().hp;
        B().ult = 1;
        const cast = B().useUlt();
        ok(cast && B().ult === 0 && !B().useUlt(), `${id}：大招「${B().char.ultName}」释放后清空充能`);
        let threw = '';
        try { play(60 * 6); } catch (e: any) { threw = e.message; }
        ok(!threw && (B().kills > k0 || id === 'knight' || id === 'nun'), `${id}：大招期间正常战斗${threw ? '：' + threw : ''}`);
        clearCards(); g.endRun(false);
    }
    // 充能方式：游侠移动充能、德鲁伊静立充能、骑士受击充能、法师升级充能
    base(); Save.data.chars = allIds; Save.data.selected = 'rogue'; start();
    for (let i = 0; i < 120; i++) { g.joyX = 1; g.joyY = 0; g.update(1 / 60); }
    const run = B().ult + B().ultBank;
    ok(run > 0.1, `游侠蛙：移动 2 秒充能 ${Math.round(run * 100)}%`);
    clearCards(); g.endRun(false);
    base(); Save.data.chars = allIds; Save.data.selected = 'druid'; start();
    for (let i = 0; i < 120; i++) { g.joyX = 0; g.joyY = 0; B().hp = B().stats.maxHp; g.update(1 / 60); }
    const still = B().ult + B().ultBank;
    for (let i = 0; i < 120; i++) { g.joyX = 1; g.joyY = 0; B().hp = B().stats.maxHp; g.update(1 / 60); }
    ok(still > 0.1 && B().ult + B().ultBank - still < still / 2, `德鲁伊蛙：站着不动充得更快（静立 ${Math.round(still * 100)}%）`);
    clearCards(); g.endRun(false);
    base(); Save.data.chars = allIds; Save.data.selected = 'knight'; start();
    B().ult = 0; B().ultBank = 0; B().iframe = 0; B().shieldHits = 0; B().hurtPlayer(5);
    ok(B().ultBank >= 0.12, '骑士蛙：受击充能');
    B().ult = 1; B().useUlt(); const hpK = B().hp; B().iframe = 0; B().hurtPlayer(50);
    ok(B().hp === hpK, '不动铁壁：期间无敌');
    clearCards(); g.endRun(false);
    base(); Save.data.chars = allIds; Save.data.selected = 'mage'; start();
    B().ult = 0; B().ultBank = 0; B().gainXp(B().xpNext);
    ok(B().ultBank >= 0.35, '法师蛙：升级充能 35%');
    for (let i = 0; i < 600; i++) B().gainXp(B().xpNext);
    B().ult = 0; for (let i = 0; i < 60 * 30; i++) B().updateUlt(1 / 60);
    ok(B().ult > 0.4 && B().ult < 0.55, `充能有速度上限（30 秒最多 50%：${Math.round(B().ult * 100)}%）`);
    clearCards(); g.endRun(false);
    base(); Save.data.selected = 'hunter'; start(); B().ult = 1; step(1);
    g.onKeyDown({ keyCode: 32 }); g.onKeyUp({ keyCode: 32 });
    ok(B().ultCasts === 1, '空格键释放大招');
    B().ult = 0.5; g.ultBtn.emit('te');
    ok(B().ultCasts === 1 && g.toast.node.active, '充能未满时点大招按钮提示充能方式');
    clearCards(); g.endRun(false);

    section('神兵 / 新道具 / 祭坛 / 试炼');
    ok(D.EPICS.every((e: any) => !!Art.f('epic_' + e.id)) && D.EPICS.length >= 7, `${D.EPICS.length} 把神兵都有图标`);
    for (const ep of D.EPICS) {
        // 跳到 6:00，并跳过已经错过的 Boss（Boss 会掉落神兵，干扰计时）
        base(); start(); B().time = 360; B().bossIdx = 3;
        play(60 * 2);
        B().spawnPickup('epic_' + ep.id, B().px, B().py, 0);
        play(10);
        const k0 = B().kills;
        ok(B().epic === ep && Save.data.codex.includes('x:' + ep.id), `${ep.name}：拾取后生效并收录图鉴`);
        let threw = '';
        try { play(60 * 8); } catch (e: any) { threw = e.message; }
        ok(!threw && B().kills > k0, `${ep.name}：正常输出${threw ? '：' + threw : ''}`);
        play(60 * 23);
        // 期间可能又随机捡到一把（火盆 / 精英），那就只检查第一把已经结束
        ok(B().epicsUsed > 1 ? B().epic !== ep || B().epicT < D.EPIC_TIME : B().epic === null && !B().hammers.some((h: any) => h.node.active), `${ep.name}：${D.EPIC_TIME} 秒后消失`);
        clearCards(); g.endRun(false);
    }
    base(); start(); B().time = 200;
    const p2 = (kind: string) => B().collect({ kind, value: 0 });
    p2('giant'); B().iframe = 0; B().shieldHits = 0; const hg = B().hp; B().hurtPlayer(20);
    ok(B().giantT > 0 && hg - B().hp <= 10, '巨人蘑菇：变大，受到伤害减半');
    p2('boots'); const x0 = B().px; for (let i = 0; i < 60; i++) { g.joyX = 1; g.joyY = 0; g.update(1 / 60); }
    ok(B().bootsT > 0 && B().px - x0 > 145 * 1.4 && B().pzones.some((z: any) => z.alive && z.kind === 'fire'), '疾风靴：加速并留下燃烧足迹');
    const gold0b = B().gold; p2('bank'); play(60 * 7);
    ok(B().gold > gold0b, '聚宝盆：涌出金币');
    B().ult = 0; p2('battery'); ok(B().ult === 1, '能量电池：大招充满');
    for (let i = 0; i < 300; i++) p2('dice');
    let diceOk = true; try { play(60 * 2); } catch { diceOk = false; }
    ok(diceOk, '命运骰子：连掷 300 次不出错');
    clearCards(); g.endRun(false);
    base(); start(); B().time = 200; play(30);
    for (const e of B().enemies) e.alive = false;
    B().summon('zombie', B().px + 300, B().py);
    const z = B().enemies.find((e: any) => e.alive && e.def === D.ENEMIES.zombie);
    B().dirX = -1; B().dirY = 0; B().collect({ kind: 'decoy', value: 0 });
    const zd0 = Math.hypot(z.x - B().decoyX, z.y - B().decoyY);
    for (let i = 0; i < 60; i++) { g.joyX = 0; g.joyY = 0; B().hp = B().stats.maxHp; g.update(1 / 60); }
    ok(B().decoyT > 0 && Math.hypot(z.x - B().decoyX, z.y - B().decoyY) < zd0 - 20, '幻影蛙：怪物去追诱饵');
    clearCards(); g.endRun(false);
    // 神兵祭坛：计时到后出现，碰一下就碎，掉落神兵
    base(); start(); B().altarT = 0.01; step(2);
    const altar = B().enemies.find((e: any) => e.alive && e.def === D.ENEMIES.altar);
    ok(!!altar, '神兵祭坛出现');
    B().px = altar.x; B().py = altar.y - 10; step(2);
    ok(!altar.alive && (!!B().epic || B().pickups.some((p: any) => p.alive && p.kind.startsWith('epic_'))), '触碰祭坛掉落神兵');
    play(60 * 2); ok(!!B().epic, '神兵自动飞向奶蛙并生效');
    clearCards(); g.endRun(false);
    // 试炼石碑：触碰开启，击败足够数量获得宝箱 + 神兵
    base(); start(); B().time = 100; B().shrineT = 0.01; step(2);
    const shrine = B().pickups.find((p: any) => p.alive && p.kind === 'shrine');
    ok(!!shrine, '试炼石碑出现');
    B().px = shrine.x; B().py = shrine.y; step(2);
    ok(!!B().trial && B().trial.need > 0, `触碰石碑开启试炼（目标 ${B().trial?.need}）`);
    B().trial.got = B().trial.need; const ch0 = B().pendingChests; step(1);
    ok(!B().trial && B().trialsWon === 1 && (B().pendingChests === ch0 + 1 || g.state === 'chest'), '试炼成功获得宝箱');
    clearCards();
    B().shrineT = 0.01; step(2);
    const sh2 = B().pickups.find((p: any) => p.alive && p.kind === 'shrine');
    B().px = sh2.x; B().py = sh2.y; step(2);
    for (let i = 0; i < 60 * 21; i++) { B().hp = B().stats.maxHp; B().trial && (B().trial.got = 0); g.update(1 / 60); if (g.state === 'levelup') g.choose(0); if (g.state === 'chest') g.afterReward(); }
    ok(!B().trial && B().trialsWon === 1, '试炼超时失败');
    clearCards(); g.endRun(false);

    section('流沙荒漠 / 新怪物 / 新命运卡牌');
    base(); Save.data.stages = ['grass', 'snow', 'lava', 'swamp', 'desert']; Save.data.stage = 'desert';
    start(); B().time = 330; B().bossIdx = 2; B().hazardT = 0.1; B().windT = 0.1;
    let tor = 0, wind = 0, threwD = '';
    try { for (let i = 0; i < 60 * 20; i++) { B().hp = B().stats.maxHp; g.update(1 / 60); if (g.state === 'levelup') g.choose(0); if (g.state === 'chest') g.afterReward(); tor = Math.max(tor, B().tornados.length); if (B().windOn > 0) wind++; } } catch (e: any) { threwD = e.message; }
    ok(!threwD && tor > 0, '流沙荒漠：龙卷风出现' + threwD);
    ok(wind > 60, '流沙荒漠：狂风持续数秒');
    ok(D.ENEMIES.worm.boss && B().stage.bossSwap.eye === 'worm', '流沙荒漠 12:00 的 Boss 换成沙漠巨蠕');
    clearCards(); g.endRun(false);
    base(); Save.data.stages = ['grass', 'snow', 'lava', 'swamp', 'desert']; Save.data.stage = 'desert';
    start(); B().time = 715; B().bossIdx = 4;
    let wormSeen = false, wormKilled = false, under = false, threwW = '';
    try {
        for (let i = 0; i < 60 * 45 && !wormKilled; i++) {
            B().hp = B().stats.maxHp; g.update(1 / 60); if (g.state === 'levelup') g.choose(0); if (g.state === 'chest') g.afterReward();
            const w = B().boss; if (w && w.alive && w.ai && w.def === D.ENEMIES.worm) { wormSeen = true; if (w.ai.alpha < 0.3) under = true; if (i > 60 * 30) w.hp = 1; }
            wormKilled = B().bossKills.includes('worm');
        }
    } catch (e: any) { threwW = e.message; }
    ok(!threwW && wormSeen && under, '沙漠巨蠕登场并钻入沙中' + threwW);
    ok(wormKilled, '沙漠巨蠕可以被击败');
    clearCards(); g.endRun(false);
    base(); start(); B().time = 600; B().bossIdx = 5; play(30);
    for (const e of B().enemies) e.alive = false;
    B().summon('boar', B().px + 200, B().py);
    const boar = B().enemies.find((e: any) => e.alive && e.def.charger);
    let charged = false;
    for (let i = 0; i < 60 * 4; i++) { B().hp = B().stats.maxHp; g.joyX = 0; g.joyY = 0; g.update(1 / 60); if (boar.mode === 2) charged = true; }
    ok(charged, '冲锋野猪：蓄力后冲撞');
    for (const e of B().enemies) e.alive = false; step(1); // 清掉波次里自然刷出的闪现狐，只测这一只
    B().summon('fox', B().px + 400, B().py);
    const fox = B().enemies.find((e: any) => e.alive && e.def.blink);
    fox.modeT = 0; fox.hp = fox.maxHp = 1e9; let blinked = false;
    for (let i = 0; i < 90; i++) { fox.frozen = 0; B().hp = B().stats.maxHp; g.update(1 / 60); if (fox.alive && Math.hypot(fox.x - B().px, fox.y - B().py) < 130) blinked = true; }
    ok(blinked, '闪现狐：闪现到奶蛙身边');
    B().summon('jelly', B().px + 60, B().py);
    const jelly = B().enemies.find((e: any) => e.alive && e.def.split);
    const n0 = B().enemies.filter((e: any) => e.alive && e.def === D.ENEMIES.jellet).length;
    B().hurtEnemy(jelly, 9999, 0, B().px, B().py, null); step(2);
    ok(B().enemies.filter((e: any) => e.alive && e.def === D.ENEMIES.jellet).length >= n0 + 2, '果冻怪：被击败后分裂');
    clearCards(); g.endRun(false);
    const bl = (id: string) => D.BLESSINGS.find((b: any) => b.id === id);
    base(); start(); B().applyBlessing(bl('phoenix'));
    B().iframe = 0; B().shieldHits = 0; B().hp = 1; B().hurtPlayer(999); step(1);
    ok(!B().dead && B().hp > B().stats.maxHp * 0.4, '浴火重生：致命伤害后复活');
    B().iframe = 0; B().hp = 1; B().hurtPlayer(999); step(1);
    ok(B().dead || g.state !== 'play', '浴火重生：每局只有一次');
    clearCards(); g.endRun(false);
    base(); start(); B().applyBlessing(bl('ultfan')); B().applyBlessing(bl('epicfan')); B().applyBlessing(bl('echo'));
    B().ult = 1; B().useUlt();
    ok(B().ultBuffT > 0, '能量涌动：大招后伤害提升');
    B().collect({ kind: 'epic_meteor', value: 0 });
    ok(B().epicT > D.EPIC_TIME, '神兵眷顾：神兵持续更久');
    B().time = 300; let echoErr = ''; try { play(60 * 10); } catch (e: any) { echoErr = e.message; }
    ok(!echoErr, '回响：正常战斗' + echoErr);
    clearCards(); g.endRun(false);

    section('新武器：弹弹锯 / 音波喇叭；新道具：能量核心 / 时之沙');
    for (const id of ['saw', 'sonic']) {
        for (const evo of [false, true]) {
            base(); start(); B().time = 300; B().bossIdx = 2;
            B().weapons = []; B().applyOption({ kind: 'weapon', wdef: D.WEAPONS.find((w: any) => w.id === id), level: 1 });
            const w = B().weapons[0]; w.level = 8; w.recalc(); if (evo) B().evolve(w);
            let err = ''; try { play(60 * 10); } catch (e: any) { err = e.message; }
            ok(!err && w.damage > 0, `${evo ? D.EVOLUTIONS[id].name : w.def.name}：造成伤害 ${Math.round(w.damage)}${err}`);
            if (id === 'saw') ok(B().projs.filter((p: any) => p.alive && p.kind === 'saw').every((p: any) => Math.abs(p.x - B().px) < B().vw / 2 + 60 && Math.abs(p.y - B().py) < B().vh / 2 + 60), '弹弹锯：锯片留在屏幕内反弹');
            clearCards(); g.endRun(false);
        }
    }
    base(); start();
    const core = D.PASSIVES.find((p: any) => p.id === 'core'), sandP = D.PASSIVES.find((p: any) => p.id === 'sand');
    for (let i = 0; i < 5; i++) { B().applyOption({ kind: 'passive', pdef: core, level: i + 1 }); B().applyOption({ kind: 'passive', pdef: sandP, level: i + 1 }); }
    ok(Math.abs(B().stats.ultCharge - 0.6) < 1e-6 && Math.abs(B().stats.buffTime - 1.5) < 1e-6, '能量核心 / 时之沙满级属性正确');
    B().collect({ kind: 'haste', value: 0 }); B().collect({ kind: 'epic_thor', value: 0 });
    ok(Math.abs(B().hasteT - 18) < 0.01 && Math.abs(B().epicT - 45) < 0.01, '时之沙：增益与神兵持续更久');
    B().ult = 0; B().ultBank = 1; for (let i = 0; i < 60 * 30; i++) B().updateUlt(1 / 60);
    ok(B().ult > 0.75, `能量核心：充能更快（30 秒 ${Math.round(B().ult * 100)}%）`);
    clearCards(); g.endRun(false);

    section('随机事件：补给空投 / 流星雨 / 宝箱怪 / 大招提示');
    base(); Save.data.runs = 0; Save.data.tutDone = true; start(); B().time = 200; B().bossIdx = 1;
    B().dropT = 0.01; step(2);
    const pk0 = B().pickups.filter((p: any) => p.alive && p.kind !== 'gem' && p.kind !== 'coin').length;
    for (let i = 0; i < 60 * 3.2; i++) { B().hp = B().stats.maxHp; g.joyX = 0; g.joyY = 0; g.update(1 / 60); if (g.state === 'levelup') g.choose(0); }
    ok(B().pickups.filter((p: any) => p.alive && p.kind !== 'gem' && p.kind !== 'coin').length >= pk0 + 2 || Save.data.codex.some((k: string) => k === 'i:chicken' || k === 'i:battery'), '补给空投：3 秒后落地散出补给');
    B().showerT = 0.01; step(2);
    ok(B().showerOn > 0, '流星雨开始');
    const ks = B().kills; play(60 * 9);
    ok(B().showerOn <= 0 && B().kills > ks, '流星雨持续 8 秒后结束');
    B().ult = 1; step(2);
    ok(g.ultHinted && g.toast.node.active, '新玩家第一次大招充满时提示');
    clearCards(); g.endRun(false);
    base(); start(); B().time = 330; B().bossIdx = 2; play(10);
    B().mimicT = 0.01; step(2);
    const mim = B().enemies.find((e: any) => e.alive && e.def.mimic);
    ok(!!mim && mim.mode === 0, '宝箱怪伪装成宝箱');
    const mx0 = mim.x; step(30);
    ok(Math.abs(mim.x - mx0) < 1, '宝箱怪伪装时不动');
    B().px = mim.x - 100; B().py = mim.y; step(2);
    ok(mim.mode === 1, '靠近后宝箱怪苏醒');
    B().hurtEnemy(mim, 1e9, 0, B().px, B().py, null); step(1);
    ok(B().pickups.some((p: any) => p.alive && p.kind.startsWith('epic_')) || !!B().epic, '击败宝箱怪掉落神兵');
    clearCards(); g.endRun(false);

    section('内容合规（显示文字不含敏感词）');
    const texts: string[] = [];
    for (const k in D.ENEMIES) texts.push(D.ENEMIES[k].name || '');
    for (const k in D.MONSTER_INFO) texts.push(D.MONSTER_INFO[k].name, D.MONSTER_INFO[k].desc);
    for (const w of D.WEAPONS) texts.push(w.name, w.desc);
    for (const p of D.PASSIVES) texts.push(p.name, p.desc);
    for (const k in D.EVOLUTIONS) texts.push(D.EVOLUTIONS[k].name, D.EVOLUTIONS[k].desc);
    for (const b of D.BLESSINGS) texts.push(b.name, b.desc);
    for (const a of D.ACHIEVEMENTS) texts.push(a.name, a.desc);
    for (const c of D.CHARACTERS) texts.push(c.name, c.title, c.desc, c.traitName, c.trait, c.ultName, c.ult);
    for (const e of D.EPICS) texts.push(e.name, e.desc);
    for (const k in D.CHARGE_DESC) texts.push((D.CHARGE_DESC as any)[k]);
    for (const k in D.PICKUP_INFO) texts.push(D.PICKUP_INFO[k].name, D.PICKUP_INFO[k].desc);
    const banned = /血|死|杀|骷髅|鬼|尸|魂|墓|骨|屠|斩|弑|恶魔|地狱|圣经|十字架/;
    const hits = texts.filter(t => t && banned.test(t));
    ok(hits.length === 0, '名称与描述无敏感词' + (hits.length ? '：' + hits.slice(0, 5).join(' / ') : ''));
}

console.log(`\n${MODE}: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
