import {
    _decorator, Canvas, Color, Component, director, Director, EventKeyboard, EventTouch, game, Game, Input, input,
    KeyCode, Label, Node, ResolutionPolicy, Size, Sprite, SubContextView, sys, UITransform, Vec3, view,
} from 'cc';
import { EDITOR } from 'cc/env';
import { AD_CONFIG } from './AdConfig';
import { Ads, mgApi, RewardResult } from './Ads';
import { Analytics } from './Analytics';
import { Art } from './Art';
import { Backdrop } from './Backdrop';
import { Battle, blessingOptions, describe, Option } from './Battle';
import { ACHIEVEMENTS, BLESSINGS, BlessingDef, BOSS_SCHEDULE, CHARGE_DESC, EPIC_TIME, DAILY_GOAL, DAILY_REWARD, dailySetup, activeEvent, EVENTS, STAGES, CHARACTERS, CharDef, codexEntries, dailyQuests, QuestDef, QUEST_BONUS, SIGNIN_REWARDS, CodexEntry, CodexTab, ENEMIES, POWERUPS, powerUpCost, WEAPONS, WIN_TIME } from './Defs';
import { Recorder } from './Recorder';
import { Save } from './Save';
import { Challenge, Social } from './Social';
import { SOCIAL_CONFIG } from './SocialConfig';
import { Sound, vibrate } from './Sound';
import { blockTouches, Button, mkButton, mkLabel, mkNode, mkPanel, mkRect, mkSprite } from './UiKit';

const { ccclass } = _decorator;

// 竖屏设计分辨率（适配微信小游戏）
export const DESIGN_W = 720;
export const DESIGN_H = 1280;

// 游戏名与适龄提示（上架前与微信后台填写的保持一致）
export const GAME_NAME = '奶蛙割草';
export const GAME_SUBTITLE = 'MILKY  FROG  SURVIVORS';
export const AGE_RATING = '12+';
export const GAME_VERSION = 'v1.0.0';
// 新手渐进解锁：完成 N 局后开放（只影响主菜单入口，不影响局内数值）
const UNLOCKS: { id: string; name: string; runs: number }[] = [
    { id: 'shop', name: '永久强化', runs: 1 },
    { id: 'achv', name: '成就', runs: 1 },
    { id: 'codex', name: '图鉴', runs: 1 },
    { id: 'signin', name: '签到', runs: 1 },
    { id: 'rank', name: '好友排行', runs: 1 },
    { id: 'daily', name: '每日挑战', runs: 2 },
];
// 点击主界面奶蛙时随机说的话
const FROG_LINES = ['呱!', '割草去!', '呱呱呱~', '奶蛙出击!', '今天也要努力割草', '红月? 不怕!', '再来一局呱', '别戳了, 痒!'];
const AGE_TIP = [
    '1. 本游戏是一款休闲动作类游戏，适用于年满 12 周岁及以上的用户，',
    '    建议未成年人在家长监护下使用游戏产品。',
    '2. 本游戏为卡通像素画风，角色与怪物均为可爱的卡通形象，',
    '    对抗内容轻度、无血腥恐怖画面，无基于真实历史和现实事件的改编内容。',
    '3. 本游戏无需注册账号，没有充值和付费内容，',
    '    游戏内金币只能通过游玩免费获得，不能交易。',
    '4. 游戏有助于锻炼反应能力与策略规划能力，',
    '    请合理安排游戏时间，注意劳逸结合。',
].join('\n');
const HEALTH_TIP = '抵制不良游戏，拒绝盗版游戏。\n注意自我保护，谨防受骗上当。\n适度游戏益脑，沉迷游戏伤身。\n合理安排时间，享受健康生活。';
const C_AD = new Color(150, 90, 20, 255);

type State = 'splash' | 'privacy' | 'menu' | 'daily' | 'rank' | 'chars' | 'shop' | 'settings' | 'achv' | 'codex' | 'signin' | 'play' | 'levelup' | 'chest' | 'pause' | 'revive' | 'victory' | 'dying' | 'result';

const C_WHITE = new Color(255, 255, 255, 255);
const C_GOLD = new Color(255, 214, 90, 255);
const C_RED = new Color(230, 60, 70, 255);
const C_GREY = new Color(170, 165, 190, 255);
const C_GREEN = new Color(110, 230, 120, 255);
const C_DIM = new Color(0, 0, 0, 170);
const C_BORDER = new Color(214, 170, 70, 255);
const C_BTN_GREEN = new Color(40, 110, 60, 255);
const C_BTN_BLUE = new Color(40, 70, 130, 255);
const C_BTN_GREY = new Color(70, 64, 90, 255);
const tmpV3 = new Vec3();

@ccclass('GameRoot')
export class GameRoot extends Component {
    private state: State = 'menu';
    private vw = 0;
    private vh = 0;
    private safeTop = 0;
    private safeBottom = 0;
    private battle!: Battle;
    private ui!: Node;
    private t = 0;

    // 输入
    private keys = new Set<number>();
    private joyActive = false;
    private joyX = 0;
    private joyY = 0;
    private joyOrigin = new Vec3();
    private touchLayer!: Node;
    private joyBase!: Node;
    private joyKnob!: Node;

    // 界面
    private screens: Partial<Record<State, Node>> = {};
    private overlay!: Sprite;
    private hud!: Node;
    private xpFill!: Node;
    private lvLabel!: Label;
    private timeLabel!: Label;
    private killLabel!: Label;
    private goldLabel!: Label;
    private iconRow!: Node;
    private bossBar!: Node;
    private bossFill!: Node;
    private bossName!: Label;
    private bossTimer!: Label;
    private bannerLabel!: Label;
    private comboLabel!: Label;
    private comboSub!: Label;
    private bannerT = 0;
    private menuHero!: Sprite;
    private menuBackdrop!: Backdrop;
    private splashBackdrop!: Backdrop;
    private menuTitle!: Node;
    private menuTitleY = 0;
    private titleSparks: { node: Node; sp: Sprite; ph: number }[] = [];
    private menuHeroShadow!: Node;
    private menuHeroScale = 3;
    private menuHeroBaseY = 0;
    private heroJumpY = 0;
    private heroJumpV = 0;
    private bubble!: Node;
    private bubbleLabel!: Label;
    private bubbleT = 0;
    private splashLogo!: Node;
    private splashHero!: Sprite;
    private splashHeroBaseY = 0;
    private splashFill!: Node;
    private splashLoad!: Label;
    private refreshers: (() => void)[] = []; // 各界面的刷新函数
    private cards: { node: Node; icon: Sprite; name: Label; tag: Label; desc: Label; border: Sprite; fill: Sprite }[] = [];
    private cardMode: 'level' | 'blessing' = 'level';
    private blessOpts: BlessingDef[] = [];
    private buffLabel!: Label;
    // 大招按钮 / 神兵与试炼提示
    private ultBtn!: Node;
    private ultFill!: Sprite;
    private ultHero!: Sprite;
    private ultName!: Label;
    private ultChar = '';
    private ultHinted = false; // 前 3 局第一次充满时提示怎么放大招
    private epicLabel!: Label;
    private epicBar!: Node;
    private epicFill!: Sprite;
    private trialLabel!: Label;
    private options: Option[] = [];
    private levelTitle!: Label;
    private rerollBtn!: Button;
    private chestIcon!: Sprite;
    private chestTitle!: Label;
    private chestDesc!: Label;
    private chestGold!: Label;
    private resultTitle!: Label;
    private resultStats!: Label;
    private resultList!: Node;
    private resultHint!: Label;
    private dailyRun = false;
    private newStage = '';
    private newChar = '';
    private dailyReward = 0;
    // 广告相关
    private adRevived = false;
    private adRerolls = 0;
    private adBlessUsed = false;
    private adGoldUsed = false;
    private adChestUsed = false;
    private adWatchedThisResult = false;
    private lastRunGold = 0;
    private reviveT = 0;
    private reviveCount!: Label;
    private adRerollBtn!: Button;
    private adBlessBtn!: Button;
    private chestAdBtn!: Button;
    private goldAdBtn!: Button;
    private shareBtn!: Button;
    private recBtn!: Button;
    private splashT = 0;
    private ageNode!: Node;
    private toast!: Label;
    private toastT = 0;
    // 新手引导（首局）：-1 = 不显示
    private tutStep = -1;
    private tutT = 0;
    private tutX0 = 0;
    private tutY0 = 0;
    private tutNode!: Node;
    private tutLabel!: Label;
    private tutBg!: Sprite;
    private tutJoy!: Node;
    private tutKnob!: Node;

    onLoad() {
        view.setDesignResolutionSize(DESIGN_W, DESIGN_H, ResolutionPolicy.FIXED_WIDTH);
        Save.load();
        this.autoLite();
        Art.init();
        Sound.init(this.node);
        Ads.init();
        Recorder.init();
        Analytics.init();
        Social.initUpdate();
        Social.initLaunch();
        Social.onChallenge = () => { if (this.state === 'menu') this.refreshAll(); };
        // 老玩家升级到渐进解锁版本：已开放的功能不再重复提示
        if (!Save.data.unlockSeen && Save.data.runs > 0) Save.data.unlockSeen = Save.data.runs;
        if (Save.data.privacyOk) this.startCloud();
        Analytics.track('launch', { scene: Analytics.launchScene(), is_new: Save.data.runs === 0 ? 1 : 0, runs: Save.data.runs, day_n: Analytics.dayN(), ver: GAME_VERSION });
        Recorder.onReady = () => { if (this.state === 'result') this.refreshAll(); };
        const cam = this.getComponent(Canvas)?.cameraComponent;
        if (cam) cam.clearColor = new Color(18, 22, 18, 255);
        this.battle = new Battle(this.node);
        this.battle.onBanner = (t, c) => this.banner(t, c);
        this.ui = mkNode('UI', this.node);
        this.ui.addComponent(UITransform).setContentSize(10, 10);
        this.layout(true);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.on(Game.EVENT_HIDE, this.onHide, this);
        this.setupShare();
        this.battle.reset(this.selectedChar());
        this.battle.setPlayerVisible(false);
        this.splashT = 0;
        this.setState('splash');
    }

    // 首次启动按机型性能自动开启性能模式（安卓微信提供 benchmarkLevel：-1 未知，0~50 越高越好）
    private autoLite() {
        const d = Save.data;
        if (d.liteChecked) return;
        d.liteChecked = true;
        try {
            const w = mgApi();
            const info = w && w.getSystemInfoSync ? w.getSystemInfoSync() : null;
            const lvl = info && typeof info.benchmarkLevel === 'number' ? info.benchmarkLevel : -1;
            if (lvl >= 0 && lvl < 15) d.lite = true;
        } catch (e) { /* 忽略 */ }
        Save.save();
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.onHide, this);
    }

    // 分享本局战绩（截取结算画面上半部分作为分享图；按平台规则，分享不发放任何奖励）
    private shareResult() {
        const w = mgApi();
        if (!w || !w.shareAppMessage) { this.showToast('请在微信中打开后分享'); return; }
        const b = this.battle;
        let imageUrl: string | undefined;
        try {
            const cv = (globalThis as any).canvas;
            if (cv && cv.toTempFilePathSync) imageUrl = cv.toTempFilePathSync({ x: 0, y: 0, width: cv.width, height: Math.round(cv.width * 0.8), destWidth: 500, destHeight: 400 });
        } catch (e) { /* 截图失败则使用默认分享图 */ }
        const daily = this.dailyRun ? Social.dateKey() : '';
        const title = daily ? `今天的每日挑战我坚持了 ${this.fmtTime(b.time)}，同一关卡，敢来比比吗？` : b.won ? `我的奶蛙在《${GAME_NAME}》里击败了暗夜魔术师！你也来试试？` : `我的奶蛙坚持了 ${this.fmtTime(b.time)}，割倒 ${b.kills} 只怪物，你能撑多久？`;
        // 卡片携带战绩：好友点开后显示挑战横幅（不发放任何奖励）
        const query = Social.shareQuery({ time: b.time, kills: b.kills, won: b.won ? 1 : 0, daily });
        Analytics.track('share', { from: daily ? 'daily' : 'result', won: b.won ? 1 : 0 });
        try { w.shareAppMessage({ title, imageUrl, query }); } catch (e) { /* 忽略 */ }
    }

    private setupShare() {
        const w = mgApi();
        if (!w) return;
        try {
            if (w.showShareMenu) w.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
            const msg = () => {
                Analytics.track('share', { from: 'menu', won: 0 });
                const d = Save.data;
                const query = d.bestTime ? Social.shareQuery({ time: d.bestTime, kills: d.bestKills, won: d.wins > 0 ? 1 : 0, daily: '' }) : '';
                return { title: d.bestTime ? `${GAME_NAME}：我的奶蛙坚持了 ${this.fmtTime(d.bestTime)}，你能撑多久？` : `${GAME_NAME}：胖奶蛙割草，在红月下坚持 15 分钟！`, query };
            };
            if (w.onShareAppMessage) w.onShareAppMessage(msg);
            if (w.onShareTimeline) w.onShareTimeline(msg);
        } catch (e) { /* 忽略 */ }
    }

    // 切到后台自动暂停
    private onHide() {
        const st = this.state;
        const inRun = st === 'play' || st === 'levelup' || st === 'chest' || st === 'pause' || st === 'revive' || st === 'dying' || st === 'victory';
        Analytics.track('app_hide', { state: st, run_no: Save.data.runs + (inRun ? 1 : 0), run_sec: inRun ? Math.floor(this.battle.time) : 0 });
        if (this.state === 'play') this.setState('pause');
        Social.flushCloud();
    }

    // 云存档：同意隐私政策后启动；云端进度更新时覆盖本地并刷新界面
    private startCloud() {
        Social.initCloud(() => {
            const st = this.state;
            if (st === 'menu' || st === 'chars' || st === 'shop' || st === 'daily' || st === 'privacy' || st === 'splash' || st === 'signin') {
                this.battle.reset(this.selectedChar());
                this.battle.setPlayerVisible(false);
            }
            this.refreshAll();
            this.showToast('已从云端恢复游戏进度');
        });
    }

    // 新手渐进解锁
    private locked(id: string) {
        const u = UNLOCKS.find(x => x.id === id);
        return !!u && Save.data.runs < u.runs;
    }

    // 主菜单入口按钮：未解锁时点击提示还差几局
    private gated(id: string, fn: () => void) {
        return () => {
            const u = UNLOCKS.find(x => x.id === id);
            if (u && Save.data.runs < u.runs) { this.showToast(`再玩 ${u.runs - Save.data.runs} 局即可开放「${u.name}」`); return; }
            fn();
        };
    }

    // 未解锁的按钮变暗并加锁
    private gateLook(btn: Button, id: string) {
        const lock = mkSprite(btn.node, 'icon_lock', 2);
        lock.node.setPosition(0, 0);
        this.refreshers.push(() => {
            const l = this.locked(id);
            lock.node.active = l;
            btn.label.node.active = !l;
        });
    }

    private selectedChar(): CharDef {
        return CHARACTERS.find(c => c.id === Save.data.selected) || CHARACTERS[0];
    }

    // ------------------------------------------------------------------ 布局

    private computeSafe() {
        let top = 0, bottom = 0;
        try {
            const r = sys.getSafeAreaRect();
            if (r && r.height > 0) {
                top = Math.max(0, this.vh - (r.y + r.height));
                bottom = Math.max(0, r.y);
            }
        } catch (e) { /* 忽略 */ }
        // 微信右上角胶囊按钮：HUD 放在胶囊下方
        const w = (globalThis as any).wx;
        try {
            if (w && w.getMenuButtonBoundingClientRect) {
                const m = w.getMenuButtonBoundingClientRect();
                const info = w.getSystemInfoSync();
                top = Math.max(top, m.bottom * (this.vw / info.windowWidth) + 8);
            }
        } catch (e) { /* 忽略 */ }
        this.safeTop = Math.min(top, this.vh * 0.15);
        this.safeBottom = Math.min(bottom, this.vh * 0.08);
    }

    private layout(force = false) {
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

    private get top() { return this.vh / 2 - this.safeTop; }
    private get bottom() { return -this.vh / 2 + this.safeBottom; }

    // ------------------------------------------------------------------ 构建界面

    private buildUI() {
        this.ui.destroyAllChildren();
        this.screens = {};
        this.refreshers = [];
        this.cards = [];

        // 触摸层（浮动虚拟摇杆，按下位置即摇杆中心）
        this.touchLayer = mkNode('TouchLayer', this.ui);
        this.touchLayer.addComponent(UITransform).setContentSize(this.vw, this.vh);
        this.touchLayer.on(Node.EventType.TOUCH_START, this.onJoyStart, this);
        this.touchLayer.on(Node.EventType.TOUCH_MOVE, this.onJoyMove, this);
        this.touchLayer.on(Node.EventType.TOUCH_END, this.onJoyEnd, this);
        this.touchLayer.on(Node.EventType.TOUCH_CANCEL, this.onJoyEnd, this);
        this.joyBase = mkSprite(this.ui, 'joy_base', 3).node;
        this.joyKnob = mkSprite(this.ui, 'joy_knob', 3).node;
        this.joyBase.active = this.joyKnob.active = false;

        this.buildHud();

        this.overlay = mkRect(this.ui, this.vw, this.vh, C_DIM, 'Overlay');
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
        this.buildRank();
        this.buildCodex();
        this.buildVictory();
        this.buildDying();
        this.buildSignin();
        this.buildRevive();
        this.buildSplash();
        this.buildPrivacy();

        this.buildTutorial();

        // 适龄提示弹窗（最上层，启动页与主菜单的标识都能打开）
        this.ageNode = mkPanel(this.ui, 680, 420).node;
        this.ageNode.setPosition(0, this.vh * 0.05);
        mkLabel(this.ageNode, '适龄提示', 34, C_GOLD, 'center', 3).node.setPosition(0, 165);
        mkLabel(this.ageNode, AGE_TIP, 19, C_WHITE, 'left', 2).node.setPosition(-315, 0);
        mkLabel(this.ageNode, '点击关闭', 18, C_GREY, 'center', 2).node.setPosition(0, -180);
        this.ageNode.active = false;
        this.ageNode.on(Node.EventType.TOUCH_END, () => { this.ageNode.active = false; });

        this.toast = mkLabel(this.ui, '', 30, C_WHITE, 'center', 4);
        this.toast.node.setPosition(0, -this.vh * 0.3);
        this.toast.node.active = false;
    }

    private buildHud() {
        const hud = this.hud = mkNode('HUD', this.ui);
        const top = this.top, L = -this.vw / 2, R = this.vw / 2;
        mkRect(hud, this.vw - 12, 24, new Color(24, 18, 40, 230), 'xpBg').node.setPosition(0, top - 16);
        this.xpFill = mkRect(hud, this.vw - 18, 18, new Color(70, 150, 255, 255), 'xpFill', 0, 0.5).node;
        this.xpFill.setPosition(L + 9, top - 16);
        this.lvLabel = mkLabel(hud, 'LV 1', 20, C_WHITE, 'right', 3, true);
        this.lvLabel.node.setPosition(R - 14, top - 16);

        const pause = mkPanel(hud, 72, 72, new Color(40, 34, 70, 230));
        pause.node.setPosition(L + 50, top - 76);
        mkSprite(pause.node, 'icon_pause', 2.5);
        pause.node.on(Node.EventType.TOUCH_END, () => {
            Sound.play('click');
            if (this.state === 'play') this.setState('pause');
        });

        this.timeLabel = mkLabel(hud, '00:00', 48, C_WHITE, 'center', 4, true);
        this.timeLabel.node.setPosition(0, top - 72);
        this.killLabel = mkLabel(hud, '击败 0', 24, C_WHITE, 'right', 3, true);
        this.killLabel.node.setPosition(R - 14, top - 58);
        mkSprite(hud, 'coin', 2.2).node.setPosition(R - 120, top - 92);
        this.goldLabel = mkLabel(hud, '0', 24, C_GOLD, 'right', 3, true);
        this.goldLabel.node.setPosition(R - 14, top - 92);

        this.iconRow = mkNode('Icons', hud);
        // Boss 倒计时（计时器下方）
        this.bossTimer = mkLabel(hud, '', 22, C_WHITE, 'center', 3, true);
        this.bossTimer.node.setPosition(0, top - 114);

        this.iconRow.setPosition(L + 24, top - 152);
        this.bossBar = mkNode('BossBar', hud);
        this.bossBar.setPosition(0, top - 250);
        mkRect(this.bossBar, 424, 22, new Color(20, 10, 20, 230));
        this.bossFill = mkRect(this.bossBar, 418, 16, new Color(170, 40, 200, 255), 'fill', 0, 0.5).node;
        this.bossFill.setPosition(-209, 0);
        this.bossName = mkLabel(this.bossBar, '', 22, C_WHITE, 'center', 3);
        this.bossName.node.setPosition(0, 28);
        this.bossBar.active = false;

        this.comboLabel = mkLabel(hud, '', 40, C_WHITE, 'right', 4, true);
        this.comboLabel.node.setPosition(R - 20, top - 290);
        this.comboSub = mkLabel(hud, '连击', 22, C_WHITE, 'right', 3);
        this.comboSub.node.setPosition(R - 20, top - 325);
        this.buffLabel = mkLabel(hud, '', 22, new Color(255, 200, 220, 255), 'left', 3);
        this.buffLabel.node.setPosition(L + 16, top - 222);

        this.bannerLabel = mkLabel(hud, '', 44, C_RED, 'center', 5);
        this.bannerLabel.node.setPosition(0, this.vh * 0.16);
        this.bannerLabel.node.active = false;

        // 大招按钮（右下角）：从下往上充能，满了发光，点击释放（键盘 空格 / Q）
        const ub = mkPanel(hud, 132, 132, new Color(30, 24, 52, 230));
        this.ultBtn = ub.node;
        this.ultBtn.setPosition(R - 86, this.bottom + 104);
        this.ultFill = mkRect(this.ultBtn, 126, 126, new Color(255, 200, 80, 110), 'ultFill', 0.5, 0);
        this.ultFill.node.setPosition(0, -63);
        this.ultHero = mkSprite(this.ultBtn, 'hero_hunter_0', 1);
        this.ultHero.node.setPosition(0, 10);
        this.ultName = mkLabel(this.ultBtn, '', 20, C_WHITE, 'center', 3);
        this.ultName.node.setPosition(0, -48);
        this.ultBtn.on(Node.EventType.TOUCH_END, () => this.castUlt());

        // 神兵剩余时间（底部中间）
        this.epicLabel = mkLabel(hud, '', 28, C_GOLD, 'center', 4);
        this.epicLabel.node.setPosition(-40, this.bottom + 76);
        this.epicBar = mkRect(hud, 300, 12, new Color(20, 10, 20, 220), 'epicBg').node;
        this.epicBar.setPosition(-40, this.bottom + 50);
        this.epicFill = mkRect(this.epicBar, 296, 8, new Color(255, 200, 70, 255), 'epicFill', 0, 0.5);
        this.epicFill.node.setPosition(-148, 0);
        // 试炼进度
        this.trialLabel = mkLabel(hud, '', 28, new Color(255, 120, 100, 255), 'center', 4);
        this.trialLabel.node.setPosition(-40, this.bottom + 120);
    }

    private castUlt() {
        if (this.state !== 'play') return;
        if (this.battle.useUlt()) vibrate();
        else if (this.battle.ult < 1) this.showToast(`大招充能中：${CHARGE_DESC[this.battle.char.charge]}`);
    }

    // ------------------------------------------------------------------ 胜利过渡动画

    private winT = 0;
    private winNode!: Node;
    private winFlash!: Sprite;
    private winRays!: Sprite;
    private winTitle!: Label;
    private winSub!: Label;

    private buildVictory() {
        const s = this.screen('victory');
        this.winFlash = mkRect(s, this.vw, this.vh, new Color(255, 250, 220, 0), 'flash');
        this.winNode = mkNode('win', s);
        this.winNode.setPosition(0, this.vh * 0.16);
        this.winRays = mkSprite(this.winNode, 'aura', 7);
        this.winRays.color = new Color(255, 214, 90, 120);
        this.winTitle = mkLabel(this.winNode, '胜利!', 110, C_GOLD, 'center', 9);
        this.winSub = mkLabel(this.winNode, '', 34, C_WHITE, 'center', 4);
        this.winSub.node.setPosition(0, -100);
    }

    private startVictory() {
        const b = this.battle;
        this.winT = 0;
        this.winSub.string = b.daily ? '每日挑战成功!' : b.bossKills.includes('reaper') ? '击败了暗夜魔术师!' : '坚持了 15 分钟!';
        this.onJoyEnd();
        Sound.pauseBgm();
        Sound.play('achieve');
        vibrate(true);
        this.setState('victory');
    }

    private updateVictory(dt: number) {
        this.winT += dt;
        const t = this.winT;
        this.battle.celebrate(dt);
        // 白光闪一下
        this.winFlash.color = new Color(255, 250, 220, Math.floor(200 * Math.max(0, 1 - t * 2.5)));
        // 标题弹出（easeOutBack），之后轻轻呼吸
        const k = Math.min(1, Math.max(0, (t - 0.25) / 0.45));
        const back = k === 0 ? 0 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
        const breathe = 1 + Math.sin(t * 4) * 0.03 * (k >= 1 ? 1 : 0);
        this.winTitle.node.setScale(back * breathe, back * breathe, 1);
        this.winSub.node.active = t > 0.8;
        const a = Math.floor(255 * Math.min(1, Math.max(0, (t - 0.8) / 0.4)));
        this.winSub.color = new Color(255, 255, 255, a);
        // 背后旋转的金色光环
        this.winRays.node.angle = t * 40;
        const rs = 7 * Math.min(1, t * 1.5);
        this.winRays.node.setScale(rs, rs, 1);
        if (t > 3.2) this.endRun(true);
    }

    // ------------------------------------------------------------------ 倒下动画

    private dieT = 0;
    private dieDim!: Sprite;
    private dieLabel!: Label;

    private buildDying() {
        const s = this.screen('dying');
        this.dieDim = mkRect(s, this.vw, this.vh, new Color(10, 4, 20, 0), 'dim');
        this.dieLabel = mkLabel(s, '奶蛙倒下了…', 56, new Color(255, 230, 200, 255), 'center', 5);
        this.dieLabel.node.setPosition(0, this.vh * 0.12);
    }

    private startDying() {
        this.dieT = 0;
        this.onJoyEnd();
        Sound.pauseBgm();
        Sound.play('faint');
        vibrate(true);
        this.setState('dying');
    }

    private updateDying(dt: number) {
        this.dieT += dt;
        const t = this.dieT;
        this.battle.dying(dt);
        this.dieDim.color = new Color(10, 4, 20, Math.floor(150 * Math.min(1, t / 1.2)));
        const a = Math.floor(255 * Math.min(1, Math.max(0, (t - 0.7) / 0.4)));
        this.dieLabel.color = new Color(255, 230, 200, a);
        this.dieLabel.node.setScale(0.9 + 0.1 * Math.min(1, (t - 0.7) / 0.4), 0.9 + 0.1 * Math.min(1, Math.max(0, (t - 0.7) / 0.4)), 1);
        if (t > 1.7) {
            // 每局一次：可看广告复活（无广告时直接结算）
            if (!this.adRevived && !this.battle.endless && Ads.canReward('revive')) this.setState('revive');
            else this.endRun(false);
        }
    }

    // ------------------------------------------------------------------ 新手引导

    private static readonly TUT_TEXT = [
        '按住屏幕任意位置 拖动来移动',
        '武器会自动攻击 靠近小怪试试!',
        '捡起蓝色宝石 攒满经验就能升级',
        '三选一：新武器 或 强化道具',
        '躲开怪物 坚持 15 分钟就胜利!',
        'Boss 要来了! 看到红圈红线立刻躲开',
    ];

    private buildTutorial() {
        const n = this.tutNode = mkNode('Tutorial', this.ui);
        n.setPosition(0, this.bottom + 230);
        this.tutBg = mkRect(n, this.vw - 40, 70, new Color(20, 12, 34, 210), 'tutBg');
        this.tutLabel = mkLabel(n, '', 30, C_GOLD, 'center', 4);
        this.tutJoy = mkSprite(n, 'joy_base', 3).node;
        this.tutKnob = mkSprite(n, 'joy_knob', 3).node;
        this.tutJoy.setPosition(0, 140);
        n.active = false;
    }

    private tutStart() {
        this.tutStep = !Save.data.tutDone && Save.data.runs === 0 && !this.dailyRun ? 0 : -1;
        this.tutT = 0;
        // 首局开局先不弹命运卡牌，让新手先熟悉移动（第一次升级后补发）
        if (this.tutStep === 0) this.battle.pendingBlessings = 0;
        this.tutX0 = this.battle.px;
        this.tutY0 = this.battle.py;
    }

    private tutNext() {
        this.tutStep++;
        this.tutT = 0;
        Analytics.track('tut_step', { step: this.tutStep, sec: Math.floor(this.battle.time) });
        // 首局的开局命运卡牌推迟到第一次升级之后再给（先学移动，再学选卡）
        if (this.tutStep === 4) this.battle.pendingBlessings++;
        if (this.tutStep >= GameRoot.TUT_TEXT.length) this.tutFinish();
    }

    private tutFinish() {
        this.tutStep = -1;
        if (!Save.data.tutDone) { Save.data.tutDone = true; Save.save(); }
    }

    private updateTutorial(dt: number) {
        const step = this.tutStep;
        const st = this.state;
        const show = step >= 0 && (st === 'play' || (st === 'levelup' && step === 3));
        this.tutNode.active = show;
        if (step < 0) return;
        const b = this.battle;
        if (st === 'play' || st === 'levelup') this.tutT += dt;
        // 推进条件
        if (step === 0 && Math.hypot(b.px - this.tutX0, b.py - this.tutY0) > 140) this.tutNext();
        else if (step === 1 && b.kills >= 5) this.tutNext();
        else if (step === 2 && st === 'levelup') this.tutNext();
        else if (step === 3 && st === 'play') this.tutNext();
        else if (step === 4) {
            // 先提示目标，然后隐藏，等第一个 Boss 临近再出现最后一步
            const nb = b.nextBoss();
            if (this.tutT > 4) this.tutNode.active = false;
            if (nb && nb.remain <= 12) this.tutNext();
            else if (!nb) this.tutFinish();
        } else if (step === 5 && this.tutT > 6) this.tutFinish();
        if (this.tutStep < 0) { this.tutNode.active = false; return; }
        const txt = GameRoot.TUT_TEXT[this.tutStep];
        if (this.tutLabel.string !== txt) this.tutLabel.string = txt;
        // 升级界面时引导条放到卡片下方
        this.tutNode.setPosition(0, this.bottom + (st === 'levelup' ? 90 : 230));
        const pulse = 0.85 + 0.15 * Math.sin(this.t * 6);
        this.tutLabel.node.setScale(pulse * 0.1 + 0.9, pulse * 0.1 + 0.9, 1);
        this.tutLabel.color = this.tutStep === 5 ? new Color(255, 110, 100, 255) : C_GOLD;
        // 第一步：虚拟摇杆演示动画
        const demo = this.tutStep === 0 && st === 'play';
        this.tutJoy.active = this.tutKnob.active = demo;
        if (demo) {
            const a = this.t * 2.2;
            this.tutKnob.setPosition(Math.cos(a) * 34, 140 + Math.sin(a * 2) * 18);
        }
    }

    // 适龄提示标识（CADPA 规范：12+ 为蓝色，放在左上角，点击查看适龄提示）
    private ageBadge(parent: Node, x: number, y: number) {
        const p = mkPanel(parent, 84, 88, new Color(0, 112, 192, 255), new Color(255, 255, 255, 255));
        p.node.setPosition(x, y);
        mkLabel(p.node, AGE_RATING, 34, C_WHITE, 'center', 0).node.setPosition(0, 10);
        mkLabel(p.node, 'CADPA', 15, C_WHITE, 'center', 0).node.setPosition(0, -26);
        p.node.on(Node.EventType.TOUCH_END, () => { Sound.play('click'); this.showAgeTip(); });
        return p;
    }

    private showAgeTip() {
        if (this.ageNode) this.ageNode.active = true;
    }

    private screen(state: State): Node {
        const n = mkNode('Screen_' + state, this.ui);
        this.screens[state] = n;
        return n;
    }

    private header(parent: Node, title: string, withGold = true) {
        mkLabel(parent, title, 52, C_GOLD, 'center', 5).node.setPosition(0, this.top - 60);
        if (!withGold) return;
        mkSprite(parent, 'coin', 3).node.setPosition(-50, this.top - 122);
        const g = mkLabel(parent, '', 32, C_GOLD, 'left', 3);
        g.node.setPosition(-28, this.top - 122);
        this.refreshers.push(() => { g.string = String(Save.data.gold); });
    }

    private buildMenu() {
        const s = this.screen('menu');
        const top = this.top;
        const btnTop = this.bottom + 120 + 4 * 100;
        const horizon = btnTop + 70;
        const titleY = this.menuTitleY = top - 180;
        // 动态夜景背景
        this.menuBackdrop = new Backdrop(s, this.vw, this.vh, horizon, titleY - 10);

        // 标题：投影 + 描边 + 闪光
        this.menuTitle = mkNode('title', s);
        this.menuTitle.setPosition(0, titleY);
        mkLabel(this.menuTitle, GAME_NAME, 104, new Color(60, 6, 16, 255), 'center', 0).node.setPosition(6, -8);
        mkLabel(this.menuTitle, GAME_NAME, 104, new Color(255, 236, 120, 255), 'center', 8);
        mkLabel(this.menuTitle, GAME_SUBTITLE, 28, new Color(255, 120, 110, 255), 'center', 4).node.setPosition(0, -84);
        this.titleSparks = [];
        for (const [x, y] of [[-250, 50], [235, 60], [-205, -55], [262, -30], [-120, 78], [140, -78]]) {
            const sp = mkSprite(this.menuTitle, 'star', 2.4);
            sp.node.setPosition(x, y);
            this.titleSparks.push({ node: sp.node, sp, ph: Math.random() * 6.28 });
        }

        // 主角（只显示当前角色）：根据可用空间自适应大小，点击会跳一下并说话
        const heroH = Art.f('hero_hunter_0').rect.height;
        const avail = titleY - 130 - horizon;
        const sc = this.menuHeroScale = Math.max(1.8, Math.min(3.4, (avail - 30) / heroH));
        this.menuHeroBaseY = horizon - 6 + (heroH * sc) / 2;
        this.menuHeroShadow = mkSprite(s, 'shadow', sc * 1.7).node;
        this.menuHeroShadow.setPosition(0, horizon - 4);
        this.menuHero = mkSprite(s, 'hero_hunter_0', sc);
        this.menuHero.node.setPosition(0, this.menuHeroBaseY);
        this.menuHero.node.on(Node.EventType.TOUCH_END, () => this.heroHop());
        // 说话气泡
        this.bubble = mkPanel(s, 240, 60, new Color(255, 255, 255, 250), new Color(30, 20, 40, 255)).node;
        this.bubbleLabel = mkLabel(this.bubble, '', 26, new Color(40, 24, 30, 255), 'center', 0);
        mkRect(this.bubble, 14, 14, new Color(255, 255, 255, 250), 'tail').node.setPosition(-60, -34);
        this.bubble.active = false;
        // 角色名牌（点击进入角色选择）
        const plate = mkPanel(s, 230, 52, new Color(36, 20, 50, 235));
        plate.node.setPosition(this.vw / 2 - 135, horizon + 34);
        const name = mkLabel(plate.node, '', 22, C_WHITE, 'center', 2);
        plate.node.on(Node.EventType.TOUCH_END, () => { Sound.play('click'); this.setState('chars'); });

        // 顶部：金币、每日奖励、适龄
        const goldPanel = mkPanel(s, 200, 56, new Color(36, 20, 50, 235));
        goldPanel.node.setPosition(this.vw / 2 - 116, top - 40);
        mkSprite(goldPanel.node, 'coin', 3).node.setPosition(-68, 0);
        const gold = mkLabel(goldPanel.node, '', 28, C_GOLD, 'left', 3);
        gold.node.setPosition(-46, 0);
        const daily = mkLabel(s, '今日首局 金币×2', 20, new Color(255, 214, 90, 255), 'left', 3);
        daily.node.setPosition(-this.vw / 2 + 108, top - 40);
        // 限时活动提示
        const ev = mkLabel(s, '', 22, new Color(255, 120, 90, 255), 'center', 3);
        ev.node.setPosition(0, titleY - 128);
        this.refreshers.push(() => {
            const cur = activeEvent();
            ev.node.active = !!cur;
            if (cur && ev.string !== cur.badge) ev.string = cur.badge;
        });
        this.ageBadge(s, -this.vw / 2 + 56, top - 48);

        const best = mkLabel(s, '', 22, C_GREY, 'center', 2);
        best.node.setPosition(0, this.bottom + 46);
        mkLabel(s, GAME_VERSION, 16, new Color(120, 110, 140, 255), 'left', 2).node.setPosition(-this.vw / 2 + 12, this.bottom + 14);

        mkButton(s, '开始游戏', 440, 100, () => this.startGame(), C_BTN_GREEN, 40).node.setPosition(0, btnTop);
        // 签到入口（右上角适龄标识下方），未签到时亮红点
        const sbtn = mkButton(s, '签到', 120, 60, this.gated('signin', () => this.setState('signin')), new Color(150, 60, 30, 255), 26);
        this.gateLook(sbtn, 'signin');
        sbtn.node.setPosition(this.vw / 2 - 80, this.top - 110);
        const sdot = mkRect(sbtn.node, 16, 16, new Color(240, 60, 60, 255), 'dot');
        sdot.node.setPosition(52, 22);
        this.refreshers.push(() => { sdot.node.active = this.signDue() && !this.locked('signin'); });
        const dbtn = mkButton(s, '每日挑战', 212, 84, this.gated('daily', () => this.setState('daily')), new Color(150, 60, 30, 255), 32);
        this.gateLook(dbtn, 'daily');
        dbtn.node.setPosition(-114, btnTop - 104);
        // 今日挑战未完成时显示红点
        const ddot = mkRect(dbtn.node, 18, 18, new Color(240, 60, 60, 255), 'dot');
        ddot.node.setPosition(94, 30);
        this.refreshers.push(() => { ddot.node.active = Save.data.dailyDone !== this.today && !this.locked('daily'); });
        mkButton(s, '选择角色', 212, 84, () => this.setState('chars'), C_BTN_BLUE, 32).node.setPosition(114, btnTop - 104);
        const shopBtn = mkButton(s, '永久强化', 440, 84, this.gated('shop', () => this.setState('shop')), C_BTN_BLUE, 34);
        shopBtn.node.setPosition(0, btnTop - 200);
        this.gateLook(shopBtn, 'shop');
        const ab = mkButton(s, '成就', 126, 80, this.gated('achv', () => this.setState('achv')), C_BTN_BLUE, 28);
        ab.node.setPosition(-201, btnTop - 296);
        this.gateLook(ab, 'achv');
        const cb = mkButton(s, '图鉴', 126, 80, this.gated('codex', () => this.setState('codex')), C_BTN_BLUE, 28);
        cb.node.setPosition(-67, btnTop - 296);
        this.gateLook(cb, 'codex');
        const rb = mkButton(s, '排行', 126, 80, this.gated('rank', () => this.openRank('menu')), C_BTN_BLUE, 28);
        rb.node.setPosition(67, btnTop - 296);
        this.gateLook(rb, 'rank');
        // 有新收录时在图鉴按钮上显示红点
        const dot = mkRect(cb.node, 18, 18, new Color(240, 60, 60, 255), 'dot');
        dot.node.setPosition(58, 28);
        this.refreshers.push(() => { dot.node.active = Save.data.codex.length > (Save.data.codexSeen || 0) && !this.locked('codex'); });
        mkButton(s, '设置', 126, 80, () => this.setState('settings'), C_BTN_GREY, 28).node.setPosition(201, btnTop - 296);

        // 游戏圈（微信原生按钮，叠在画布之上，只在主菜单显示）
        this.clubPos.set(-this.vw / 2 + 56, top - 122, 0);
        const clubLabel = mkLabel(s, '游戏圈', 18, C_WHITE, 'center', 2);
        clubLabel.node.setPosition(this.clubPos.x, this.clubPos.y - 38);
        clubLabel.node.active = Social.clubSupported;

        // 好友挑战（点开好友分享的卡片进入）
        const chal = mkPanel(s, 600, 250, new Color(20, 40, 70, 248), new Color(120, 220, 255, 255));
        chal.node.setPosition(0, horizon + 40);
        blockTouches(chal.node);
        mkLabel(chal.node, '好友的挑战', 32, new Color(120, 220, 255, 255), 'center', 3).node.setPosition(0, 85);
        const chalText = mkLabel(chal.node, '', 23, C_WHITE, 'center', 2);
        chalText.node.setPosition(0, 22);
        mkButton(chal.node, '稍后', 200, 72, () => { Social.pending = null; this.refreshAll(); }, C_BTN_GREY, 26).node.setPosition(-120, -78);
        mkButton(chal.node, '接受挑战', 240, 72, () => this.acceptChallenge(), C_BTN_GREEN, 28).node.setPosition(120, -78);
        this.refreshers.push(() => {
            const c = Social.pending;
            chal.node.active = !!c && this.state === 'menu';
            if (!c) return;
            const daily = Social.challengeIsToday(c);
            chalText.string = `好友在${daily ? '今天的每日挑战' : '奶蛙割草'}中坚持了 ${this.fmtTime(c.time)}\n击败 ${c.kills} 只怪物${c.won ? '，成功通关' : ''}\n你能超过吗？` + (c.daily && !daily ? '（那天的每日挑战已结束，改为普通局）' : '');
        });

        // 首胜后提示一次「添加到我的小程序」（指向右上角胶囊）
        const add = mkPanel(s, 420, 150, new Color(255, 250, 235, 250), new Color(60, 40, 20, 255));
        add.node.setPosition(this.vw / 2 - 230, this.vh / 2 - this.safeTop - 70);
        mkLabel(add.node, '▲', 30, new Color(60, 40, 20, 255), 'center', 0).node.setPosition(150, 92);
        mkLabel(add.node, '点右上角「···」选择\n「添加到我的小程序」\n下次在微信首页下拉就能找到奶蛙', 21, new Color(60, 40, 20, 255), 'center', 0).node.setPosition(0, 6);
        add.node.on(Node.EventType.TOUCH_END, () => {
            Save.data.addTipShown = true;
            Save.save();
            Analytics.track('add_tip', { wins: Save.data.wins });
            this.refreshAll();
        });
        this.refreshers.push(() => { add.node.active = this.state === 'menu' && Social.isWx && Save.data.wins > 0 && !Save.data.addTipShown && !Social.pending; });

        // 适龄提示面板（最后创建，位于最上层）

        this.refreshers.push(() => {
            const c = this.selectedChar();
            this.menuHero.spriteFrame = Art.f(c.sprite + '_0');
            name.string = `${c.name} · ${c.title}  ›`;
            gold.string = String(Save.data.gold);
            daily.node.active = Save.data.bonusDay !== new Date().toDateString();
            const d = Save.data;
            best.string = (d.runs ? `最佳：存活 ${this.fmtTime(d.bestTime)}  ·  击败 ${d.bestKills}  ·  等级 ${d.bestLevel}` : '存活 15 分钟即可获胜') + (d.endlessBest ? `\n无尽模式最佳 ${this.fmtTime(d.endlessBest)}` : '') + `   成就 ${d.achievements.length}/${ACHIEVEMENTS.length}`;
        });
    }

    // 点击主角：跳一下、说句话、呱一声
    private heroHop() {
        if (this.heroJumpY > 0) return;
        this.heroJumpV = 760;
        this.bubbleLabel.string = FROG_LINES[Math.floor(Math.random() * FROG_LINES.length)];
        this.bubbleT = 1.6;
        Sound.play('croak');
        vibrate();
    }

    private updateMenuFx(dt: number) {
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
        // 主角：跳跃物理 + 呼吸动画
        if (this.heroJumpV !== 0 || this.heroJumpY > 0) {
            this.heroJumpV -= 2400 * dt;
            this.heroJumpY += this.heroJumpV * dt;
            if (this.heroJumpY <= 0) { this.heroJumpY = 0; this.heroJumpV = 0; }
        }
        const c = this.selectedChar();
        const f = this.heroJumpY > 0 ? 2 : Math.floor(t / 0.45) % 2;
        this.menuHero.spriteFrame = Art.f(c.sprite + '_' + f);
        this.menuHero.node.setPosition(0, this.menuHeroBaseY + this.heroJumpY);
        const ss = this.menuHeroScale * 1.7 * Math.max(0.5, 1 - this.heroJumpY / 260);
        this.menuHeroShadow.setScale(ss, this.menuHeroScale * 1.3 * Math.max(0.5, 1 - this.heroJumpY / 260), 1);
        if (this.bubbleT > 0) {
            this.bubbleT -= dt;
            this.bubble.active = this.bubbleT > 0;
            const hh = Art.f(c.sprite + '_0').rect.height * this.menuHeroScale;
            this.bubble.setPosition(110, this.menuHeroBaseY + this.heroJumpY + hh / 2 + 10);
        }
    }

    private buildChars() {
        const s = this.screen('chars');
        this.header(s, '选择角色');
        // 三列紧凑卡片：立绘 / 名字 / 初始武器 / 天赋
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
            const spr = mkSprite(card.node, c.sprite + '_0', sc);
            spr.node.setPosition(0, ch / 2 - 8 - 34 * sc);
            mkLabel(card.node, c.name, 26, C_WHITE, 'center', 3).node.setPosition(0, -ch / 2 + 70);
            const wd = WEAPONS.find(w => w.id === c.weapon)!;
            mkSprite(card.node, wd.icon, 1.6).node.setPosition(-cw / 2 + 30, -ch / 2 + 42);
            mkLabel(card.node, wd.name, 18, C_GOLD, 'left', 2).node.setPosition(-cw / 2 + 46, -ch / 2 + 42);
            mkLabel(card.node, c.desc, 15, C_GREEN, 'center', 2).node.setPosition(0, -ch / 2 + 16);
            const lock = mkRect(card.node, cw - 6, ch - 6, new Color(0, 0, 0, 175), 'lock');
            mkSprite(lock.node, 'icon_lock', 3).node.setPosition(0, 20);
            const evOf = EVENTS.find(e => e.char === c.id);
            mkLabel(lock.node, c.cost < 0 ? (evOf ? evOf.lockText : '活动限定') : `${c.cost} 金币解锁`, 22, C_GOLD, 'center', 3).node.setPosition(0, -34);
            card.node.on(Node.EventType.TOUCH_END, () => {
                Sound.play('click');
                const d = Save.data;
                if (!d.chars.includes(c.id)) {
                    if (c.cost < 0) { this.showToast(evOf ? evOf.hint : '活动限定角色'); return; }
                    if (d.gold < c.cost) { this.showToast('金币不足'); return; }
                    d.gold -= c.cost;
                    d.chars.push(c.id);
                    Analytics.track('char_unlock', { char: c.id, cost: c.cost, runs: d.runs });
                    Sound.play('chest');
                    this.showToast(`解锁 ${c.name}!`);
                }
                d.selected = c.id;
                Save.save();
                this.refreshAll();
            });
            this.refreshers.push(() => {
                lock.node.active = !Save.data.chars.includes(c.id);
                const sel = Save.data.selected === c.id;
                card.border.color = sel ? C_GREEN : C_BORDER;
                card.fill.color = sel ? new Color(36, 64, 60, 250) : new Color(36, 30, 64, 245);
            });
        });
        const by = this.bottom + 80;
        mkButton(s, '返回', 260, 88, () => this.setState('menu'), C_BTN_GREY).node.setPosition(-150, by);
        mkButton(s, '出发!', 260, 88, () => this.startGame(), C_BTN_GREEN, 36).node.setPosition(150, by);
        // 模式切换：无尽模式在首次胜利后解锁
        const mode = mkButton(s, '', 560, 64, () => {
            if (Save.data.wins <= 0) { this.showToast('首次胜利后解锁无尽模式与噩梦难度'); return; }
            const order: ('normal' | 'endless' | 'nightmare')[] = ['normal', 'endless', 'nightmare'];
            Save.data.mode = order[(order.indexOf(Save.data.mode) + 1) % order.length];
            Save.save();
            this.refreshAll();
        }, C_BTN_GREY, 26);
        mode.node.setPosition(0, by + 92);
        // 选中角色的专属天赋
        const traitLbl = mkLabel(s, '', 19, C_GOLD, 'center', 2);
        traitLbl.lineHeight = 25;
        traitLbl.node.setPosition(0, by + 262);
        this.refreshers.push(() => {
            const c = this.selectedChar();
            traitLbl.string = `★ 天赋「${c.traitName}」${c.trait}\n◆ 大招「${c.ultName}」${c.ult}\n充能：${CHARGE_DESC[c.charge]}`;
        });
        // 地图选择：点击切换到下一张已解锁的地图
        const stageBtn = mkButton(s, '', 560, 64, () => {
            const d = Save.data;
            const unlocked = STAGES.filter(st => this.stageOpen(st.id));
            const i = unlocked.findIndex(st => st.id === d.stage);
            d.stage = unlocked[(i + 1) % unlocked.length].id;
            if (unlocked.length === 1) this.showToast('在月光草原胜利后解锁新地图');
            Save.save();
            this.refreshAll();
        }, new Color(40, 70, 90, 255), 24);
        stageBtn.node.setPosition(0, by + 166);
        this.refreshers.push(() => {
            const st = this.currentStage;
            // 计数只算常驻地图（活动地图不计入分母）
            const regular = STAGES.filter(x => !x.event);
            const n = regular.filter(x => this.stageOpen(x.id)).length;
            stageBtn.label.string = `地图：${st.name}${st.event ? '（活动限定）' : `（${n}/${regular.length}）`}  ${st.hpMul > 1 ? `生命+${Math.round((st.hpMul - 1) * 100)}% 金币+${Math.round((st.goldMul - 1) * 100)}%` : '标准难度'}`;
        });
        this.refreshers.push(() => {
            const locked = Save.data.wins <= 0;
            const e = this.endlessMode, n = this.nightmareMode;
            mode.label.string = locked ? '模式：普通（无尽 / 噩梦 首胜解锁）' : e ? '模式：无尽（Boss 循环，越来越强）' : n ? '模式：噩梦（生命 +60% 伤害 +30% 金币 +60%）' : '模式：普通（存活 15 分钟胜利）';
            mode.bg.color = e ? new Color(110, 40, 120, 255) : n ? new Color(140, 30, 40, 255) : C_BTN_GREY;
        });
    }

    private buildShop() {
        const s = this.screen('shop');
        this.header(s, '永久强化');
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
            mkLabel(card.node, p.name, 26, C_WHITE, 'left', 3).node.setPosition(-cw / 2 + 72, ch * 0.25);
            mkLabel(card.node, p.desc, 17, C_GREY, 'left', 2).node.setPosition(-cw / 2 + 72, -ch * 0.3);
            const pips: Sprite[] = [];
            for (let k = 0; k < p.max; k++) {
                const pip = mkRect(card.node, 14, 14, C_GREY, 'pip');
                pip.node.setPosition(-cw / 2 + 80 + k * 20, 0);
                pips.push(pip);
            }
            const cost = mkLabel(card.node, '', 22, C_GOLD, 'right', 3);
            cost.node.setPosition(cw / 2 - 12, ch * 0.25);
            card.node.on(Node.EventType.TOUCH_END, () => {
                const r = Save.rank(p.id);
                if (r >= p.max) { Sound.play('click'); this.showToast('已满级'); return; }
                const c = powerUpCost(p, r, Save.totalBought());
                if (Save.data.gold < c) { Sound.play('click'); this.showToast('金币不足'); return; }
                Save.data.gold -= c;
                Save.data.power[p.id] = r + 1;
                Save.save();
                Analytics.track('shop_buy', { item: p.id, level: r + 1, cost: c, runs: Save.data.runs });
                Sound.play('coin');
                this.refreshAll();
            });
            this.refreshers.push(() => {
                const r = Save.rank(p.id);
                pips.forEach((pp, k) => { pp.color = k < r ? C_GOLD : new Color(70, 64, 90, 255); });
                cost.string = r >= p.max ? '已满' : String(powerUpCost(p, r, Save.totalBought()));
            });
        });
        const by = this.bottom + 80;
        mkButton(s, '全部返还', 260, 88, () => this.refundAll(), C_BTN_GREY, 30).node.setPosition(-150, by);
        mkButton(s, '返回', 260, 88, () => this.setState('menu'), C_BTN_BLUE).node.setPosition(150, by);
    }

    // 按购买价格全额返还所有强化
    private refundAll() {
        const d = Save.data;
        const ranks: Record<string, number> = { ...d.power };
        let bought = Save.totalBought();
        let total = 0;
        while (bought > 0) {
            const p = POWERUPS.find(x => (ranks[x.id] || 0) > 0);
            if (!p) break;
            ranks[p.id]--;
            bought--;
            total += powerUpCost(p, ranks[p.id], bought);
        }
        if (!total) { this.showToast('没有可返还的强化'); return; }
        d.gold += total;
        d.power = {};
        Save.save();
        Sound.play('coin');
        this.showToast(`返还 ${total} 金币`);
        this.refreshAll();
    }

    private toggleRow(parent: Node, y: number, icon: string, text: string, key: 'music' | 'sfx' | 'vibrate' | 'lite') {
        mkSprite(parent, icon, 3).node.setPosition(-210, y);
        mkLabel(parent, text, 32, C_WHITE, 'left', 3).node.setPosition(-165, y);
        const btn = mkButton(parent, '', 150, 72, () => {
            Save.data[key] = !Save.data[key];
            Save.save();
            if (key === 'music') Sound.refreshMusic();
            this.refreshAll();
        }, C_BTN_GREEN, 30);
        btn.node.setPosition(170, y);
        this.refreshers.push(() => {
            const on = Save.data[key];
            btn.label.string = on ? '开' : '关';
            btn.bg.color = on ? C_BTN_GREEN : C_BTN_GREY;
        });
    }

    private buildSettings() {
        const s = this.screen('settings');
        this.header(s, '设置', false);
        const p = mkPanel(s, 580, 470);
        p.node.setPosition(0, this.vh * 0.14);
        this.toggleRow(p.node, 165, 'icon_music', '背景音乐', 'music');
        this.toggleRow(p.node, 55, 'icon_sound', '游戏音效', 'sfx');
        this.toggleRow(p.node, -55, 'icon_vibrate', '震动反馈', 'vibrate');
        this.toggleRow(p.node, -165, 'icon_chain', '性能模式', 'lite');
        mkLabel(s, '性能模式：减少同屏怪物与特效，适合较旧的手机', 20, C_GREY, 'center', 2).node.setPosition(0, this.vh * 0.14 - 265);
        const stats = mkLabel(s, '', 26, C_GREY, 'center', 3);
        stats.node.setPosition(0, -this.vh * 0.2);
        this.refreshers.push(() => {
            const d = Save.data;
            stats.string = `游戏次数  ${d.runs}\n胜利次数  ${d.wins}\n累计击败  ${d.totalKills}\n最长存活  ${this.fmtTime(d.bestTime)}`;
        });
        mkButton(s, '返回', 300, 88, () => this.setState('menu'), C_BTN_BLUE).node.setPosition(0, this.bottom + 80);
    }

    private buildPause() {
        const s = this.screen('pause');
        mkLabel(s, '暂停', 72, C_WHITE, 'center', 5).node.setPosition(0, this.vh * 0.3);
        const build = mkNode('build', s);
        build.setPosition(0, this.vh * 0.19);
        this.refreshers.push(() => {
            if (this.state !== 'pause') return;
            build.destroyAllChildren();
            const items = [
                ...this.battle.weapons.map(w => ({ icon: w.icon, lv: w.evolved ? '★' : String(w.level) })),
                ...this.battle.passives.map(p => ({ icon: p.def.icon, lv: String(p.level) })),
                ...this.battle.blessings.map(b => ({ icon: b.icon, lv: '◆' })),
            ];
            items.forEach((it, i) => {
                const x = ((i % 6) - 2.5) * 80, y = -Math.floor(i / 6) * 80;
                mkSprite(build, it.icon, 3).node.setPosition(x, y);
                mkLabel(build, it.lv, 18, C_WHITE, 'center', 2).node.setPosition(x + 20, y - 22);
            });
        });
        const y0 = -this.vh * 0.02;
        mkButton(s, '继续游戏', 420, 96, () => this.setState('play'), C_BTN_GREEN, 36).node.setPosition(0, y0);
        const music = mkButton(s, '', 200, 80, () => { Save.data.music = !Save.data.music; Save.save(); Sound.refreshMusic(); this.refreshAll(); }, C_BTN_GREY, 26);
        music.node.setPosition(-110, y0 - 120);
        const sfx = mkButton(s, '', 200, 80, () => { Save.data.sfx = !Save.data.sfx; Save.save(); this.refreshAll(); }, C_BTN_GREY, 26);
        sfx.node.setPosition(110, y0 - 120);
        this.refreshers.push(() => {
            music.label.string = '音乐：' + (Save.data.music ? '开' : '关');
            sfx.label.string = '音效：' + (Save.data.sfx ? '开' : '关');
        });
        mkButton(s, '放弃本局', 420, 88, () => this.endRun(false, true), new Color(120, 30, 40, 255), 30).node.setPosition(0, y0 - 240);
    }

    private buildLevelUp() {
        const s = this.screen('levelup');
        this.levelTitle = mkLabel(s, '升级!', 60, C_GOLD, 'center', 5);
        this.levelTitle.node.setPosition(0, this.vh * 0.27);
        for (let i = 0; i < 3; i++) {
            const p = mkPanel(s, 660, 150);
            p.node.setPosition(0, this.vh * 0.13 - i * 170);
            const icon = mkSprite(p.node, 'icon_whip', 4.5);
            icon.node.setPosition(-260, 0);
            const name = mkLabel(p.node, '', 32, C_GOLD, 'left', 3);
            name.node.setPosition(-200, 34);
            const tag = mkLabel(p.node, '', 24, new Color(120, 220, 255, 255), 'right', 3);
            tag.node.setPosition(310, 34);
            const desc = mkLabel(p.node, '', 22, C_WHITE, 'left', 2);
            desc.node.setPosition(-200, -24);
            const idx = i;
            p.node.on(Node.EventType.TOUCH_END, () => this.choose(idx));
            this.cards.push({ node: p.node, icon, name, tag, desc, border: p.border, fill: p.fill });
        }
        this.rerollBtn = mkButton(s, '重抽', 300, 80, () => this.reroll(), C_BTN_BLUE, 28);
        this.rerollBtn.node.setPosition(0, this.vh * 0.13 - 3 * 170 + 20);
        const adY = this.vh * 0.13 - 3 * 170 + 20;
        this.adRerollBtn = mkButton(s, '', 380, 80, () => this.watchAd('reroll', () => {
            this.adRerolls--;
            this.options = this.battle.buildOptions();
            this.fillCards();
        }), C_AD, 26);
        this.adRerollBtn.node.setPosition(0, adY);
        this.adBlessBtn = mkButton(s, '▶ 看广告 额外多选一张', 440, 80, () => this.watchAd('blessing', () => {
            this.adBlessUsed = true;
            this.battle.pendingBlessings++;
            this.adBlessBtn.node.active = false;
            this.showToast('选完这张后还能再选一张!');
        }), C_AD, 26);
        this.adBlessBtn.node.setPosition(0, adY);
    }

    private buildChest() {
        const s = this.screen('chest');
        mkLabel(s, '宝箱!', 64, C_GOLD, 'center', 5).node.setPosition(0, this.vh * 0.3);
        mkSprite(s, 'chest', 6).node.setPosition(0, this.vh * 0.18);
        this.chestIcon = mkSprite(s, 'icon_whip', 6);
        this.chestIcon.node.setPosition(0, this.vh * 0.04);
        this.chestTitle = mkLabel(s, '', 40, C_GOLD, 'center', 4);
        this.chestTitle.node.setPosition(0, -this.vh * 0.06);
        this.chestDesc = mkLabel(s, '', 26, C_WHITE, 'center', 3);
        this.chestDesc.node.setPosition(0, -this.vh * 0.11);
        this.chestGold = mkLabel(s, '', 30, C_GOLD, 'center', 3);
        this.chestGold.node.setPosition(0, -this.vh * 0.16);
        this.chestAdBtn = mkButton(s, '▶ 看广告 再开一次', 400, 76, () => this.watchAd('chest', () => {
            this.adChestUsed = true;
            this.chestAdBtn.node.active = false;
            const r = this.battle.openChest(true);
            this.showChestResult(r, '再开一次：');
        }), C_AD, 26);
        this.chestAdBtn.node.setPosition(0, -this.vh * 0.215);
        mkButton(s, '确定', 300, 90, () => { this.afterReward(); if (this.state === 'play') this.battle.levelBlast(); }, C_BTN_GREEN, 34).node.setPosition(0, -this.vh * 0.29);
    }

    private showChestResult(r: { icon: string; title: string; desc: string; evolved: boolean; gold: number }, prefix = '') {
        this.chestIcon.spriteFrame = Art.f(r.icon);
        this.chestTitle.string = prefix + r.title;
        this.chestDesc.string = r.desc;
        this.chestGold.string = `+${r.gold} 金币`;
        Sound.play(r.evolved ? 'evolve' : 'chest');
    }

    private buildResult() {
        const s = this.screen('result');
        this.resultTitle = mkLabel(s, '', 76, C_RED, 'center', 6);
        this.resultTitle.node.setPosition(0, this.top - 110);
        this.resultStats = mkLabel(s, '', 28, C_WHITE, 'center', 3);
        this.resultStats.node.setPosition(0, this.top - 290);
        this.resultList = mkNode('list', s);
        this.resultHint = mkLabel(s, '', 24, new Color(255, 200, 120, 255), 'center', 3);
        this.resultHint.node.setPosition(0, this.top - 430);
        this.resultList.setPosition(0, this.top - 520);
        const by = this.bottom + 80;
        mkButton(s, '主菜单', 260, 88, () => { this.leaveResult('menu'); this.toMenu(); }, C_BTN_GREY).node.setPosition(-150, by);
        mkButton(s, '再来一局', 260, 88, () => { this.leaveResult('replay'); this.replay(); }, C_BTN_GREEN).node.setPosition(150, by);
        this.goldAdBtn = mkButton(s, '', 380, 80, () => this.watchAd('gold', () => {
            this.adGoldUsed = true;
            Save.data.gold += this.lastRunGold;
            Save.save();
            this.showToast(`金币 +${this.lastRunGold}!`);
            Sound.play('coin');
            this.refreshAll();
        }), C_AD, 26);
        this.shareBtn = mkButton(s, '分享战绩', 200, 80, () => this.shareResult(), C_BTN_BLUE, 26);
        // 抖音：分享本局录屏（按平台规则不发奖励）
        this.recBtn = mkButton(s, '分享本局录屏', 300, 72, () => {
            const b = this.battle;
            Recorder.share(b.won ? '我的奶蛙活过了 15 分钟！' : `我的奶蛙坚持了 ${this.fmtTime(b.time)}，割倒 ${b.kills} 只怪物`, ok => { if (!ok) this.showToast('分享未完成'); });
        }, new Color(200, 40, 90, 255), 26);
        this.recBtn.node.setPosition(0, by + 186);
        this.refreshers.push(() => {
            if (this.state !== 'result') return;
            this.recBtn.node.active = Recorder.ready;
            const showAd = !this.adGoldUsed && this.lastRunGold > 0 && Ads.canReward('gold');
            const showShare = !!mgApi();
            this.goldAdBtn.node.active = showAd;
            this.goldAdBtn.label.string = `▶ 看广告 金币×2 (+${this.lastRunGold})`;
            this.shareBtn.node.active = showShare;
            this.goldAdBtn.node.setPosition(showShare ? -95 : 0, by + 100);
            this.shareBtn.node.setPosition(showAd ? 200 : 0, by + 100);
        });
    }

    // 死亡复活（每局一次，看广告满血复活）
    // 离开结算页：插屏广告 + 记录玩家是再来一局还是回主菜单
    private leaveResult(next: 'menu' | 'replay') {
        const inter = Ads.afterRun(this.adWatchedThisResult);
        Analytics.track('result_next', { next, run_no: Save.data.runs, inter: inter ? 1 : 0 });
    }

    private buildRevive() {
        const s = this.screen('revive');
        mkLabel(s, '你倒下了…', 64, C_RED, 'center', 5).node.setPosition(0, this.vh * 0.2);
        mkLabel(s, '看一段广告，满状态原地复活?', 30, C_WHITE, 'center', 3).node.setPosition(0, this.vh * 0.1);
        this.reviveCount = mkLabel(s, '', 72, C_GOLD, 'center', 5, true);
        this.reviveCount.node.setPosition(0, 0);
        mkButton(s, '▶ 看广告复活', 420, 100, () => this.watchAd('revive', () => {
            this.adRevived = true;
            this.battle.revive(1);
            this.setState('play');
        }, () => { this.reviveT = Math.max(this.reviveT, 3); }), C_AD, 36).node.setPosition(0, -this.vh * 0.1);
        mkButton(s, '放弃', 260, 80, () => this.endRun(false), C_BTN_GREY, 28).node.setPosition(0, -this.vh * 0.2);
    }

    // 启动页：动态夜景 + Logo 弹出 + 加载条 + 健康游戏忠告 + 适龄提示（法规要求）
    private buildSplash() {
        const s = this.screen('splash');
        const horizon = -this.vh * 0.05;
        this.splashBackdrop = new Backdrop(s, this.vw, this.vh, horizon, this.vh * 0.2);
        this.splashLogo = mkNode('logo', s);
        this.splashLogo.setPosition(0, this.vh * 0.21);
        mkLabel(this.splashLogo, GAME_NAME, 104, new Color(60, 6, 16, 255), 'center', 0).node.setPosition(6, -8);
        mkLabel(this.splashLogo, GAME_NAME, 104, new Color(255, 236, 120, 255), 'center', 8);
        mkLabel(this.splashLogo, GAME_SUBTITLE, 28, new Color(255, 120, 110, 255), 'center', 4).node.setPosition(0, -84);
        const heroH = Art.f('hero_hunter_0').rect.height;
        const hs = 2.4;
        this.splashHeroBaseY = horizon - 6 + (heroH * hs) / 2;
        mkSprite(s, 'shadow', hs * 1.7).node.setPosition(0, horizon - 4);
        this.splashHero = mkSprite(s, 'hero_hunter_0', hs);
        this.splashHero.node.setPosition(0, this.splashHeroBaseY);
        // 加载条
        const barY = -this.vh * 0.12;
        this.splashLoad = mkLabel(s, '', 22, new Color(230, 220, 240, 255), 'center', 2, true);
        this.splashLoad.node.setPosition(0, barY + 32);
        mkRect(s, 448, 22, new Color(20, 10, 30, 255), 'barBg').node.setPosition(0, barY);
        this.splashFill = mkRect(s, 440, 14, new Color(255, 214, 90, 255), 'barFill', 0, 0.5).node;
        this.splashFill.setPosition(-220, barY);
        mkLabel(s, '健康游戏忠告', 26, C_WHITE, 'center', 2).node.setPosition(0, -this.vh * 0.2);
        mkLabel(s, HEALTH_TIP, 21, new Color(200, 190, 210, 255), 'center', 2).node.setPosition(0, -this.vh * 0.285);
        this.ageBadge(s, -this.vw / 2 + 56, this.top - 48);
        s.addComponent(UITransform).setContentSize(this.vw, this.vh);
        s.on(Node.EventType.TOUCH_END, () => { if (this.splashT > 1) this.afterSplash(); });
        this.refreshers.push(() => { this.splashHero.spriteFrame = Art.f(this.selectedChar().sprite + '_0'); });
    }

    private updateSplashFx(dt: number) {
        this.splashBackdrop.update(dt);
        const t = this.splashT;
        // Logo 弹出（easeOutBack）
        const k = Math.min(1, t / 0.6);
        const e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
        const sc = Math.max(0.01, e) * (1 + Math.sin(this.t * 2) * 0.01);
        this.splashLogo.setScale(sc, sc, 1);
        // 奶蛙一蹦一蹦
        const hop = Math.abs(Math.sin(t * 4.5)) * 26;
        this.splashHero.node.setPosition(0, this.splashHeroBaseY + hop);
        this.splashHero.spriteFrame = Art.f(this.selectedChar().sprite + (hop > 8 ? '_2' : '_1'));
        const p = Math.min(1, t / 2.3);
        this.splashFill.setScale(p, 1, 1);
        this.splashLoad.string = `正在召唤奶蛙… ${Math.floor(p * 100)}%`;
    }

    private afterSplash() {
        if (this.state !== 'splash') return;
        this.setState(Save.data.privacyOk ? 'menu' : 'privacy');
    }

    // 首次启动：用户协议与隐私政策
    private buildPrivacy() {
        const s = this.screen('privacy');
        const p = mkPanel(s, 640, 620);
        p.node.setPosition(0, this.vh * 0.04);
        mkLabel(p.node, '用户协议与隐私政策', 34, C_GOLD, 'center', 3).node.setPosition(0, 250);
        mkLabel(p.node, `欢迎来到《${GAME_NAME}》！\n\n我们非常重视你的个人信息保护：\n· 本游戏不收集你的个人信息；\n${SOCIAL_CONFIG.cloudEnv ? '· 游戏进度保存在手机本地，并备份到\n  微信云开发，用于换机后恢复；' : '· 游戏进度只保存在你的手机本地；'}\n· 为改进游戏，会通过微信平台统计\n  匿名的游戏行为数据；\n· 游戏中的广告由微信平台提供，\n  相关信息处理遵循《微信隐私保护指引》；\n· 你可以随时在微信中删除本小游戏及其数据。\n\n点击“同意”即表示你已阅读并同意\n《用户协议》和《隐私政策》。`, 22, C_WHITE, 'center', 2).node.setPosition(0, 10);
        mkButton(p.node, '不同意', 220, 80, () => {
            Analytics.track('privacy', { agree: 0 });
            const w = mgApi();
            if (w && w.exitMiniProgram) w.exitMiniProgram({});
            else this.showToast('需要同意后才能开始游戏');
        }, C_BTN_GREY, 28).node.setPosition(-130, -250);
        mkButton(p.node, '同意', 220, 80, () => {
            Save.data.privacyOk = true;
            Save.save();
            Analytics.track('privacy', { agree: 1 });
            this.startCloud();
            this.setState('menu');
        }, C_BTN_GREEN, 30).node.setPosition(130, -250);
    }

    // 看激励视频：看完发奖；没看完或失败给出提示
    private watchAd(place: string, onReward: () => void, onFail?: () => void) {
        Ads.showReward(place, (r: RewardResult) => {
            Analytics.track('ad_reward', { place, result: r.ok ? 'ok' : r.reason || 'error', run_no: Save.data.runs });
            if (r.ok) {
                this.adWatchedThisResult = true;
                onReward();
            } else {
                this.showToast(r.reason === 'skipped' ? '完整观看广告才能获得奖励' : '广告暂时不可用，请稍后再试');
                if (onFail) onFail();
            }
            this.refreshAll();
        });
    }

    // ------------------------------------------------------------------ 状态

    private setState(s: State) {
        // 每天第一次回到主菜单时自动弹出签到（新玩家第一局之前不弹）
        if (s === 'menu' && this.signDue() && Save.data.signShown !== this.today && Save.data.runs > 0) {
            Save.data.signShown = this.today;
            s = 'signin';
        }
        const prev = this.state;
        this.state = s;
        for (const k in this.screens) this.screens[k as State]!.active = k === s;
        const inRun = s === 'play' || s === 'levelup' || s === 'chest' || s === 'pause' || s === 'revive';
        this.hud.active = inRun;
        this.overlay.node.active = s !== 'play' && s !== 'victory' && s !== 'dying';
        this.overlay.color = inRun || s === 'result' ? C_DIM : new Color(0, 0, 0, s === 'menu' ? 90 : 190);
        this.touchLayer.active = s === 'play';
        if (s !== 'play') this.onJoyEnd();
        if (s === 'menu' || s === 'chars' || s === 'shop' || s === 'settings' || s === 'achv' || s === 'codex' || s === 'signin' || s === 'privacy' || s === 'daily' || s === 'rank') Sound.playBgm('bgm_menu');
        if (s === 'menu') this.onMenuEnter();
        else Social.hideClub();
        if (s === 'codex') { Save.data.codexSeen = Save.data.codex.length; Save.save(); }
        if (s === 'revive') { this.reviveT = 8; Sound.pauseBgm(); }
        if (prev === 'revive' && s === 'play') Sound.resumeBgm();
        if (s === 'pause') { Sound.pauseBgm(); Recorder.pause(); }
        if (prev === 'pause' && s === 'play') Recorder.resume();
        if (prev === 'pause' && s === 'play') Sound.resumeBgm();
        this.refreshAll();
    }

    // 回到主菜单：版本更新提示、新开放功能提示、游戏圈按钮
    private onMenuEnter() {
        Social.promptUpdate(() => { Save.save(); Social.flushCloud(); });
        const d = Save.data;
        const fresh = UNLOCKS.filter(u => u.runs > (d.unlockSeen || 0) && u.runs <= d.runs);
        if (d.runs > (d.unlockSeen || 0)) { d.unlockSeen = d.runs; Save.save(); }
        if (fresh.length) {
            this.showToast(`新功能开放：${fresh.map(u => u.name).join('、')}`);
            Analytics.track('unlock', { runs: d.runs, n: fresh.length });
        }
        if (Social.clubSupported) {
            const info = (globalThis as any).wx.getSystemInfoSync();
            const k = info.windowWidth / this.vw;
            const size = 44;
            Social.showClub((this.clubPos.x + this.vw / 2) * k - size / 2, (this.vh / 2 - this.clubPos.y) * k - size / 2, size);
        }
    }

    private clubPos = new Vec3();
    private activeChallenge: Challenge | null = null;

    // 接受好友挑战：同一天的每日挑战直接进入同一关卡，否则开普通局；新玩家先走新手局
    private acceptChallenge() {
        const c = Social.pending;
        if (!c) return;
        Social.pending = null;
        this.activeChallenge = c;
        const daily = Social.challengeIsToday(c) && Save.data.runs > 0;
        Analytics.track('challenge_accept', { daily: daily ? 1 : 0, runs: Save.data.runs });
        if (daily) this.startDaily(); else this.startGame();
        this.banner(`好友挑战 · 目标 ${this.fmtTime(c.time)}`, new Color(120, 220, 255, 255));
    }

    private refreshAll() {
        for (const f of this.refreshers) f();
    }

    // 活动地图只在活动期间开放；普通地图按胜利依次解锁
    private stageOpen(id: string) {
        const st = STAGES.find(x => x.id === id);
        if (!st) return false;
        if (st.event) { const ev = activeEvent(); return !!ev && ev.id === st.event; }
        return Save.data.stages.includes(id);
    }

    private get currentStage() { return STAGES.find(x => x.id === Save.data.stage && this.stageOpen(x.id)) || STAGES[0]; }

    private get endlessMode() { return Save.data.mode === 'endless' && Save.data.wins > 0; }
    private get nightmareMode() { return Save.data.mode === 'nightmare' && Save.data.wins > 0; }

    private toMenu() {
        this.dailyRun = false;
        this.battle.reset(this.selectedChar());
        this.battle.setPlayerVisible(false);
        this.setState('menu');
    }

    private get today() { return new Date().toDateString(); }

    // 每日挑战：固定试玩角色、地图、规则与命运卡牌，存活 10 分钟
    private startDaily() {
        const ds = dailySetup(this.today);
        const ch = CHARACTERS.find(c => c.id === ds.char) || CHARACTERS[0];
        this.dailyRun = true;
        this.tutStep = -1;
        this.adRevived = this.adBlessUsed = false;
        this.adRerolls = AD_CONFIG.rerollPerRun;
        this.battle.reset(ch, false, ds.stage, { mod: ds.mod, blessing: ds.blessing });
        this.battle.nightmare = false;
        this.battle.setPlayerVisible(true);
        this.refreshIcons();
        this.bannerT = 0;
        Sound.play('start');
        Sound.playBgm('bgm_battle');
        Recorder.start();
        this.setState('play');
        this.trackRun('run_start', {});
        this.banner(`每日挑战 · ${ds.mod.name}`, new Color(255, 170, 80, 255));
    }

    private replay() {
        if (this.dailyRun) this.startDaily();
        else this.startGame();
    }

    private startGame() {
        this.dailyRun = false;
        this.ultHinted = false;
        this.adRevived = this.adBlessUsed = false;
        this.adRerolls = AD_CONFIG.rerollPerRun;
        this.battle.reset(this.selectedChar(), this.endlessMode, this.currentStage.id);
        this.battle.nightmare = this.nightmareMode;
        this.battle.setPlayerVisible(true);
        this.refreshIcons();
        this.bannerT = 0;
        this.bannerLabel.node.active = false;
        Sound.play('start');
        Sound.playBgm('bgm_battle');
        Recorder.start();
        this.setState('play');
        this.tutStart();
        this.trackRun('run_start', {});
        const st = this.battle.streak;
        this.banner(this.endlessMode ? '无尽之夜 · 能撑多久?' : this.nightmareMode ? `噩梦难度 · ${this.currentStage.name}` : st > 0 ? `不屈意志 · 伤害与生命 +${st * 5}%` : `${this.currentStage.name} · 生存下去!`, new Color(255, 230, 120, 255));
    }

    // 开局 / 结算埋点的公共字段（run_no：开局时为即将进行的第几局，结算时为刚结束的这一局）
    private trackRun(id: string, extra: Record<string, string | number>) {
        const b = this.battle;
        const mode = this.dailyRun ? 'daily' : b.endless ? 'endless' : b.nightmare ? 'nightmare' : 'normal';
        const runNo = Save.data.runs + (id === 'run_start' ? 1 : 0);
        Analytics.track(id, { run_no: runNo, char: b.char.id, stage: b.stage.id, mode, day_n: Analytics.dayN(), ...extra });
    }

    // 结算：发放金币、记录最佳成绩（quit：从暂停菜单主动放弃）
    private endRun(win: boolean, quit = false) {
        Recorder.stop();
        if (this.tutStep >= 0) this.tutFinish();
        this.tutNode.active = false;
        const b = this.battle;
        const d = Save.data;
        const bonus = Math.round((Math.floor(b.time / 60) * 25 + (win ? 500 : 0)) * b.stats.greed * b.stage.goldMul * (b.nightmare ? 1.6 : 1));
        let total = b.gold + bonus;
        // 每日首局金币 ×2
        const today = new Date().toDateString();
        const daily = d.bonusDay !== today;
        if (daily) { d.bonusDay = today; total *= 2; }
        d.gold += total;
        this.lastRunGold = total;
        this.adGoldUsed = false;
        this.adWatchedThisResult = false;
        // 每日挑战：首次成功发奖励，不计入连败与地图解锁
        this.dailyReward = 0;
        if (this.dailyRun) {
            if (d.dailyBestDate !== this.today) { d.dailyBestDate = this.today; d.dailyBest = 0; }
            d.dailyBest = Math.max(d.dailyBest, Math.floor(b.time));
            if (win && d.dailyDone !== this.today) {
                d.dailyDone = this.today;
                this.dailyReward = DAILY_REWARD;
                d.gold += DAILY_REWARD;
            }
        }
        if (!b.endless && !this.dailyRun) d.lossStreak = win ? 0 : Math.min(3, (d.lossStreak || 0) + 1);
        // 地图：记录最佳，胜利后解锁下一张
        d.stageBest[b.stage.id] = Math.max(d.stageBest[b.stage.id] || 0, Math.floor(b.time));
        this.newStage = '';
        // 限时活动：击败限定 Boss 永久解锁限定角色
        this.newChar = '';
        for (const ev of EVENTS) {
            if (b.bossKills.includes(ev.boss) && !d.chars.includes(ev.char)) {
                d.chars.push(ev.char);
                this.newChar = (CHARACTERS.find(c => c.id === ev.char) || { name: '' }).name;
            }
        }
        if (win && !b.endless && !this.dailyRun) {
            const i = STAGES.findIndex(x => x.id === b.stage.id);
            const next = STAGES[i + 1];
            if (next && !d.stages.includes(next.id)) { d.stages.push(next.id); this.newStage = next.name; }
        }
        d.runs++;
        if (win) d.wins++;
        d.totalKills += b.kills;
        d.bestTime = Math.max(d.bestTime, Math.floor(b.time));
        d.bestKills = Math.max(d.bestKills, b.kills);
        d.bestLevel = Math.max(d.bestLevel, b.level);
        if (b.endless) d.endlessBest = Math.max(d.endlessBest, Math.floor(b.time));
        // 每日任务（跨局累计，完成即发金币）
        const qr = this.updateQuests();
        d.gold += qr.gold;
        this.questMsg = qr.done.length ? `每日任务完成 ${qr.done.length} 个${qr.bonus ? '，今日任务全部完成！' : ''}  +${qr.gold} 金币` : '';
        // 成就结算
        const got = this.checkAchievements(win);
        let achGold = 0;
        for (const a of got) achGold += a.gold;
        d.gold += achGold;
        Save.save();
        this.trackRun('run_end', {
            result: win ? 'win' : quit ? 'quit' : 'lose', time_sec: Math.floor(b.time), level: b.level, kills: b.kills,
            boss_kills: b.bossKills.length, evolved: b.weapons.filter(w => w.evolved).length, revived: this.adRevived ? 1 : 0,
            gold: total + achGold, achv: got.length,
        });
        Social.reportScores();

        this.resultTitle.string = this.dailyRun ? (win ? '挑战成功!' : '挑战失败') : win ? '胜利!' : b.endless ? '无尽之夜结束' : '你倒下了';
        this.resultTitle.color = win ? C_GOLD : C_RED;
        this.resultStats.string = `存活时间  ${this.fmtTime(b.time)}\n等级  ${b.level}     击败  ${b.kills}     最高连击  ${b.maxCombo}\n拾取金币  ${b.gold}    时间奖励  ${bonus}\n大招 ${b.ultCasts} 次    神兵 ${b.epicsUsed} 把    试炼 ${b.trialsWon} 次\n本局获得  ${total + achGold} 金币` + (got.length ? `\n新成就：${got.map(a => a.name).join('、')}  (+${achGold})` : '');
        this.resultHint.string = this.nearMiss(win, daily);
        const ch = this.activeChallenge;
        if (ch) {
            const beat = b.time > ch.time || (win && !ch.won);
            this.resultHint.string = (beat ? `你超过了好友的 ${this.fmtTime(ch.time)}！分享给好友看看吧` : `离好友的 ${this.fmtTime(ch.time)} 还差 ${this.fmtTime(ch.time - b.time)}`) + (this.resultHint.string ? '\n' + this.resultHint.string : '');
            Analytics.track('challenge_result', { beat: beat ? 1 : 0, daily: ch.daily ? 1 : 0, time_sec: Math.floor(b.time) });
            this.activeChallenge = null;
        }
        // 按行数依次排版：统计 → 提示 → 武器伤害列表
        const statLines = this.resultStats.string.split('\n').length, hintLines = this.resultHint.string ? this.resultHint.string.split('\n').length : 0;
        const statTop = this.top - 200;
        this.resultStats.node.setPosition(0, statTop - (statLines * 34) / 2);
        const hintTop = statTop - statLines * 34 - 14;
        this.resultHint.node.setPosition(0, hintTop - (hintLines * 30) / 2);
        this.resultList.setPosition(0, hintTop - hintLines * 30 - 50);
        this.resultList.destroyAllChildren();
        mkLabel(this.resultList, '武器伤害统计', 26, C_GOLD, 'center', 3).node.setPosition(0, 30);
        b.weapons.forEach((w, i) => {
            const y = -24 - i * 58;
            mkSprite(this.resultList, w.icon, 2.5).node.setPosition(-230, y);
            mkLabel(this.resultList, w.name + (w.evolved ? '' : `  LV ${w.level}`), 24, C_WHITE, 'left', 2).node.setPosition(-195, y);
            mkLabel(this.resultList, String(Math.round(w.damage)), 24, C_GOLD, 'right', 2).node.setPosition(250, y);
        });
        Sound.playBgm('');
        Sound.play(win ? 'win' : 'gameover');
        if (got.length) this.scheduleOnce(() => Sound.play('achieve'), 1.2);
        vibrate(true);
        this.setState('result');
    }

    private questMsg = '';

    // 今日任务进度（日期变化时清零）
    private questProgress() {
        const d = Save.data;
        if (d.questDate !== this.today) { d.questDate = this.today; d.questProg = {}; d.questDone = []; }
        return d.questProg;
    }

    private updateQuests(): { done: QuestDef[]; bonus: boolean; gold: number } {
        const b = this.battle, d = Save.data;
        const p = this.questProgress();
        const add = (k: string, v: number) => { p[k] = (p[k] || 0) + v; };
        const best = (k: string, v: number) => { p[k] = Math.max(p[k] || 0, v); };
        add('kills', b.kills);
        add('boss', b.bossKills.length);
        add('evolve', b.evolvedCount);
        add('gold', b.gold);
        add('chest', b.chestsOpened);
        add('runs', 1);
        best('time', Math.floor(b.time));
        best('level', b.level);
        best('combo', b.maxCombo);
        const qs = dailyQuests(this.today);
        const done: QuestDef[] = [];
        let gold = 0;
        for (const q of qs) {
            if (d.questDone.includes(q.id) || (p[q.stat] || 0) < q.n) continue;
            d.questDone.push(q.id);
            done.push(q);
            gold += q.gold;
        }
        let bonus = false;
        if (qs.every(q => d.questDone.includes(q.id)) && !d.questDone.includes('bonus')) {
            d.questDone.push('bonus');
            bonus = true;
            gold += QUEST_BONUS;
        }
        return { done, bonus, gold };
    }

    private codexCount() {
        const c = Save.data.codex;
        return codexEntries().filter(e => c.includes(e.key)).length;
    }

    // 结算提示：差一点的遗憾感 + 下一个可达成的目标，驱动"再来一局"
    private nearMiss(win: boolean, daily: boolean) {
        const b = this.battle, d = Save.data;
        const lines: string[] = [];
        if (this.dailyReward) lines.push(`每日挑战奖励：+${this.dailyReward} 金币！`);
        if (this.questMsg) lines.push(this.questMsg);
        if (this.newChar) lines.push(`解锁限定角色：${this.newChar}！`);
        if (this.newStage) lines.push(`解锁新地图：${this.newStage}！`);
        if (b.newCodex.length) lines.push(`图鉴新收录 ${b.newCodex.length} 项（${this.codexCount()}/${codexEntries().length}）`);
        if (daily) lines.push('每日首局奖励：金币 ×2!');
        if (!win && !b.endless) {
            if (b.boss && b.boss.alive) lines.push(`${b.boss.def.name} 只剩 ${Math.max(1, Math.round((b.boss.hp / b.boss.maxHp) * 100))}% 生命了!`);
            else {
                const nb = BOSS_SCHEDULE.find(x => x.t > b.time);
                const goal = this.dailyRun ? DAILY_GOAL : WIN_TIME;
                const left = Math.ceil((nb && nb.t < goal ? nb.t : goal) - b.time);
                lines.push(nb && nb.t < goal ? `再坚持 ${this.fmtTime(left)} 就能见到 ${ENEMIES[nb.id].name}` : `距离胜利只差 ${this.fmtTime(left)}!`);
            }
            if (d.lossStreak > 0) lines.push(`下一局获得「不屈意志」伤害与生命 +${d.lossStreak * 5}%`);
        }
        // 下一个强化目标
        let best: { name: string; cost: number } | null = null;
        for (const p of POWERUPS) {
            const r = Save.rank(p.id);
            if (r >= p.max) continue;
            const c = powerUpCost(p, r, Save.totalBought());
            if (!best || c < best.cost) best = { name: `${p.name} Lv${r + 1}`, cost: c };
        }
        if (best) lines.push(d.gold >= best.cost ? `可以购买强化：${best.name}!` : `下一个强化：${best.name}（还差 ${best.cost - d.gold} 金币）`);
        return lines.join('\n');
    }

    // 结算时检查成就，返回本局新解锁的成就
    private checkAchievements(win: boolean) {
        const b = this.battle, d = Save.data;
        const ok: Record<string, boolean> = {
            win1: win,
            kill1k: b.kills >= 1000,
            kill5k: b.kills >= 5000,
            combo500: b.maxCombo >= 500,
            lv50: b.level >= 50,
            evo1: b.evolvedCount >= 1,
            evo3: b.evolvedCount >= 3,
            goldrat: b.goldRats > 0,
            endless20: b.endless && b.time >= 1200,
            allchars: CHARACTERS.every(c => c.cost < 0 || d.chars.includes(c.id)),
            daily1: this.dailyRun && win,
            stage_snow: win && !b.endless && !this.dailyRun && b.stage.id === 'snow',
            stage_lava: win && !b.endless && !this.dailyRun && b.stage.id === 'lava',
            stage_swamp: win && !b.endless && !this.dailyRun && b.stage.id === 'swamp',
            stage_desert: win && !b.endless && !this.dailyRun && b.stage.id === 'desert',
            nightmare1: win && b.nightmare,
            codex_half: this.codexCount() * 2 >= codexEntries().length,
            codex_full: this.codexCount() >= codexEntries().length,
            epic3: b.epicsUsed >= 3,
            trial2: b.trialsWon >= 2,
            ult10: b.ultCasts >= 10,
        };
        for (const id of b.bossKills) ok['boss_' + id] = true;
        const got = ACHIEVEMENTS.filter(a => ok[a.id] && !d.achievements.includes(a.id));
        for (const a of got) d.achievements.push(a.id);
        return got;
    }

    // ------------------------------------------------------------------ 七日签到

    private signDue() { return Save.data.signDate !== this.today; }

    private claimSignin(mul: number) {
        const d = Save.data;
        if (!this.signDue()) return;
        const day = d.signCount % 7;
        const g = SIGNIN_REWARDS[day] * mul;
        d.gold += g;
        d.signCount++;
        d.signDate = this.today;
        Save.save();
        Analytics.track('sign_in', { day: day + 1, mul, day_n: Analytics.dayN() });
        Sound.play(day === 6 ? 'achieve' : 'coin');
        this.showToast(`签到成功 +${g} 金币` + (mul > 1 ? '（双倍）' : ''));
        this.refreshAll();
    }

    private buildSignin() {
        const s = this.screen('signin');
        const p = mkPanel(s, 660, 760, new Color(30, 22, 52, 250), C_GOLD);
        p.node.setPosition(0, this.vh * 0.03);
        mkLabel(p.node, '七日签到', 46, C_GOLD, 'center', 4).node.setPosition(0, 330);
        const sub = mkLabel(p.node, '', 22, C_GREY, 'center', 2);
        sub.node.setPosition(0, 280);
        // 7 个格子：上排 4 个，下排 3 个（第 7 天大格子）
        const cells: { panel: { fill: Sprite; border: Sprite }; check: Node; amount: Label }[] = [];
        for (let i = 0; i < 7; i++) {
            const big = i === 6;
            const w = big ? 290 : 140, h = 170;
            const y = i < 4 ? 150 : -40;
            const c = mkPanel(p.node, w, h);
            c.node.setPosition(i < 4 ? (i - 1.5) * 152 : [-228, -76, 152][i - 4], y);
            mkLabel(c.node, `第 ${i + 1} 天`, 22, C_WHITE, 'center', 2).node.setPosition(0, 60);
            mkSprite(c.node, big ? 'chest' : 'coin', big ? 2.4 : 3).node.setPosition(0, 6);
            const amount = mkLabel(c.node, `${SIGNIN_REWARDS[i]}`, 26, C_GOLD, 'center', 3);
            amount.node.setPosition(0, -56);
            const check = mkLabel(c.node, '已领', 30, C_GREEN, 'center', 4).node;
            check.setPosition(0, 6);
            cells.push({ panel: c, check, amount });
        }
        const claim = mkButton(p.node, '领取', 260, 88, () => { this.claimSignin(1); this.setState('menu'); }, C_BTN_GREEN, 34);
        claim.node.setPosition(-140, -240);
        const dbl = mkButton(p.node, '▶ 看视频 双倍', 260, 88, () => this.watchAd('signin', () => { this.claimSignin(2); this.setState('menu'); }), new Color(170, 90, 30, 255), 28);
        dbl.node.setPosition(140, -240);
        const close = mkButton(p.node, '关闭', 200, 64, () => this.setState('menu'), C_BTN_GREY, 26);
        close.node.setPosition(0, -330);
        this.refreshers.push(() => {
            const d = Save.data;
            const due = this.signDue();
            // 本轮进度：今天已签则显示到今天为止
            const done = due ? d.signCount % 7 : ((d.signCount - 1) % 7) + 1;
            const today = due ? d.signCount % 7 : -1;
            sub.string = due ? `累计签到 ${d.signCount} 天 · 断签不清零` : `今天已签到，明天再来呱～（累计 ${d.signCount} 天）`;
            cells.forEach((c, i) => {
                const got = i < done;
                c.check.active = got;
                c.panel.border.color = i === today ? C_GREEN : got ? new Color(90, 80, 110, 255) : i === 6 ? C_GOLD : C_BORDER;
                c.panel.fill.color = got ? new Color(24, 20, 34, 250) : i === today ? new Color(36, 64, 60, 250) : new Color(36, 30, 64, 245);
            });
            claim.node.active = due;
            dbl.node.active = due && Ads.canReward('signin');
            if (!dbl.node.active) claim.node.setPosition(0, -240); else claim.node.setPosition(-140, -240);
        });
    }

    // ------------------------------------------------------------------ 图鉴

    private codexTab: CodexTab = 'weapon';
    private codexSel: CodexEntry | null = null;

    private buildCodex() {
        const s = this.screen('codex');
        this.header(s, '图鉴', false);
        const all = codexEntries();
        const prog = mkLabel(s, '', 26, C_GREY, 'center', 2);
        prog.node.setPosition(0, this.top - 118);
        // 分页按钮
        const tabs: [CodexTab, string][] = [['weapon', '武器'], ['passive', '道具'], ['monster', '怪物']];
        const tabBtns: Record<string, Button> = {};
        tabs.forEach(([id, label], i) => {
            const b = mkButton(s, label, 200, 70, () => { this.codexTab = id; this.codexSel = null; this.refreshAll(); }, C_BTN_BLUE, 30);
            b.node.setPosition((i - 1) * 216, this.top - 180);
            tabBtns[id] = b;
        });
        // 详情面板（底部）
        const detH = 190;
        const det = mkPanel(s, this.vw - 40, detH);
        det.node.setPosition(0, this.bottom + 170 + detH / 2);
        const dIcon = mkSprite(det.node, 'icon_whip', 3);
        dIcon.node.setPosition(-this.vw / 2 + 90, 10);
        const dName = mkLabel(det.node, '', 32, C_GOLD, 'left', 3);
        dName.node.setPosition(-this.vw / 2 + 160, 52);
        const dDesc = mkLabel(det.node, '', 22, C_WHITE, 'left', 2);
        dDesc.node.setPosition(-this.vw / 2 + 160, -20);
        // 图标网格：每页单独一组节点
        const gridTop = this.top - 240, gridBottom = this.bottom + 190 + detH;
        for (const [tab] of tabs) {
            const list = all.filter(e => e.tab === tab);
            const grid = mkNode('grid_' + tab, s);
            const cols = tab === 'weapon' ? 4 : 5; // 武器页：每行两组「武器 → 进化」
            const rows = Math.ceil(list.length / cols);
            const cell = Math.min(124, (gridTop - gridBottom) / rows - 8, (this.vw - 60) / cols - 8);
            list.forEach((e, i) => {
                const c = i % cols, r = Math.floor(i / cols);
                const card = mkPanel(grid, cell, cell);
                card.node.setPosition((c - (cols - 1) / 2) * (cell + 10), gridTop - cell / 2 - r * (cell + 8));
                const isBoss = tab === 'monster' && !!ENEMIES[e.key.slice(2)].boss;
                // 图标按格子大小等比缩放（Boss 精灵较大）
                const fr = Art.f(e.icon).rect;
                const fit = Math.min(3, (cell - 22) / Math.max(fr.width, fr.height));
                const sp = mkSprite(card.node, e.icon, fit);
                card.node.on(Node.EventType.TOUCH_END, () => { Sound.play('click'); this.codexSel = e; this.refreshAll(); });
                this.refreshers.push(() => {
                    const got = Save.data.codex.includes(e.key);
                    sp.color = got ? new Color(255, 255, 255, 255) : new Color(0, 0, 0, 160);
                    const sel = this.codexSel === e;
                    card.border.color = sel ? C_GOLD : isBoss ? new Color(170, 60, 90, 255) : e.key[0] === 'e' ? new Color(220, 110, 60, 255) : new Color(90, 80, 110, 255);
                    card.fill.color = got ? new Color(44, 36, 72, 250) : new Color(22, 18, 32, 245);
                });
            });
            this.refreshers.push(() => { grid.active = this.codexTab === tab; });
        }
        this.refreshers.push(() => {
            const d = Save.data;
            const n = all.filter(e => d.codex.includes(e.key)).length;
            prog.string = `已收录 ${n} / ${all.length}`;
            for (const [id] of tabs) tabBtns[id].node.setScale(this.codexTab === id ? 1.06 : 0.94, this.codexTab === id ? 1.06 : 0.94, 1);
            const e = this.codexSel;
            det.node.active = !!e;
            if (!e) return;
            const got = d.codex.includes(e.key);
            dIcon.spriteFrame = Art.f(e.icon);
            const r = Art.f(e.icon).rect, k = Math.min(5, 150 / Math.max(r.width, r.height));
            dIcon.node.setScale(k, k, 1);
            dIcon.color = got ? new Color(255, 255, 255, 255) : new Color(0, 0, 0, 180);
            dName.string = got ? e.name : '？？？';
            dDesc.string = got ? e.desc : '未收录：' + e.hint;
        });
        mkButton(s, '返回', 300, 88, () => this.setState('menu'), C_BTN_BLUE).node.setPosition(0, this.bottom + 80);
    }

    private buildDaily() {
        const s = this.screen('daily');
        this.header(s, '每日挑战', false);
        const date = mkLabel(s, '', 26, C_GREY, 'center', 2);
        date.node.setPosition(0, this.top - 118);
        // 试玩角色
        const heroY = this.top - 300;
        const hero = mkSprite(s, 'hero_hunter_0', 2.6);
        hero.node.setPosition(-160, heroY);
        const heroName = mkLabel(s, '', 30, C_WHITE, 'left', 3);
        heroName.node.setPosition(-40, heroY + 50);
        const heroTag = mkLabel(s, '今日试玩角色（无需解锁）', 20, C_GREEN, 'left', 2);
        heroTag.node.setPosition(-40, heroY + 8);
        const stageName = mkLabel(s, '', 22, new Color(180, 220, 255, 255), 'left', 2);
        stageName.node.setPosition(-40, heroY - 32);
        // 规则卡 + 命运卡
        const cards: { name: Label; desc: Label; icon: Sprite }[] = [];
        for (let i = 0; i < 2; i++) {
            const p = mkPanel(s, 620, 120, i === 0 ? new Color(70, 30, 20, 245) : new Color(48, 24, 70, 250), i === 0 ? new Color(240, 140, 60, 255) : new Color(190, 110, 255, 255));
            p.node.setPosition(0, heroY - 170 - i * 136);
            const icon = mkSprite(p.node, 'icon_might', 3.4);
            icon.node.setPosition(-250, 0);
            const name = mkLabel(p.node, '', 28, C_GOLD, 'left', 3);
            name.node.setPosition(-200, 24);
            const desc = mkLabel(p.node, '', 21, C_WHITE, 'left', 2);
            desc.node.setPosition(-200, -22);
            cards.push({ name, desc, icon });
        }
        const goal = mkLabel(s, '', 26, C_WHITE, 'center', 3);
        goal.node.setPosition(0, heroY - 470);
        const status = mkLabel(s, '', 24, C_GOLD, 'center', 3);
        status.node.setPosition(0, heroY - 516);
        // 每日任务（普通局与挑战局都计入）
        const qTop = heroY - 570;
        const qTitle = mkLabel(s, '', 28, C_GOLD, 'center', 3);
        qTitle.node.setPosition(0, qTop);
        const rowH = Math.min(78, (qTop - 40 - (this.bottom + 150)) / 3);
        const qRows: { name: Label; prog: Label; fill: Node; panel: { fill: Sprite; border: Sprite } }[] = [];
        for (let i = 0; i < 3; i++) {
            const p = mkPanel(s, 620, rowH - 8);
            p.node.setPosition(0, qTop - 46 - i * rowH);
            const name = mkLabel(p.node, '', 22, C_WHITE, 'left', 2);
            name.node.setPosition(-290, 10);
            const prog = mkLabel(p.node, '', 20, C_GOLD, 'right', 2);
            prog.node.setPosition(290, 10);
            mkRect(p.node, 580, 8, new Color(20, 14, 30, 255), 'qbarBg').node.setPosition(0, -16);
            const fill = mkRect(p.node, 580, 8, C_GREEN, 'qbar', 0, 0.5).node;
            fill.setPosition(-290, -16);
            qRows.push({ name, prog, fill, panel: p });
        }
        this.refreshers.push(() => {
            if (this.state !== 'daily') return;
            const p = this.questProgress();
            const qs = dailyQuests(this.today);
            const done = Save.data.questDone;
            const n = qs.filter(q => done.includes(q.id)).length;
            qTitle.string = `每日任务 ${n}/3` + (done.includes('bonus') ? '  · 全部完成!' : `  · 全部完成再得 ${QUEST_BONUS} 金币`);
            qs.forEach((q, i) => {
                const r = qRows[i];
                const v = Math.min(q.n, p[q.stat] || 0);
                const ok = done.includes(q.id);
                r.name.string = q.name;
                r.prog.string = ok ? `已完成 +${q.gold}` : `${q.stat === 'time' ? this.fmtTime(v) : v}/${q.stat === 'time' ? this.fmtTime(q.n) : q.n}  ·  ${q.gold} 金币`;
                r.fill.setScale(Math.max(0.001, v / q.n), 1, 1);
                r.panel.border.color = ok ? C_GREEN : C_BORDER;
            });
        });
        const by = this.bottom + 80;
        mkButton(s, '返回', 200, 88, () => this.setState('menu'), C_BTN_GREY).node.setPosition(-230, by);
        mkButton(s, '好友排行', 200, 88, () => this.openRank('daily'), C_BTN_BLUE, 30).node.setPosition(0, by);
        mkButton(s, '开始挑战', 220, 88, () => this.startDaily(), new Color(150, 60, 30, 255), 34).node.setPosition(225, by);
        this.refreshers.push(() => {
            if (this.state !== 'daily') return;
            const ds = dailySetup(this.today);
            const ch = CHARACTERS.find(c => c.id === ds.char) || CHARACTERS[0];
            const st = STAGES.find(x => x.id === ds.stage) || STAGES[0];
            const bl = BLESSINGS.find(x => x.id === ds.blessing) || BLESSINGS[0];
            const dt = new Date();
            date.string = `${dt.getFullYear()} 年 ${dt.getMonth() + 1} 月 ${dt.getDate()} 日 · 全服同一挑战`;
            hero.spriteFrame = Art.f(ch.sprite + '_0');
            heroName.string = `${ch.name} · ${ch.title}`;
            stageName.string = `地图：${st.name}`;
            cards[0].icon.spriteFrame = Art.f('icon_critdmg');
            cards[0].name.string = '今日规则：' + ds.mod.name;
            cards[0].desc.string = ds.mod.desc;
            cards[1].icon.spriteFrame = Art.f(bl.icon);
            cards[1].name.string = '命运卡牌：' + bl.name;
            cards[1].desc.string = bl.desc;
            goal.string = `目标：存活 ${this.fmtTime(DAILY_GOAL)}    奖励：${DAILY_REWARD} 金币`;
            const d = Save.data;
            const best = d.dailyBestDate === this.today ? d.dailyBest : 0;
            status.string = d.dailyDone === this.today ? '今日已完成！明天再来呱' : best ? `今日最佳 ${this.fmtTime(best)} · 还没完成` : '今日尚未挑战';
        });
    }

    private rankKind: 'best' | 'daily' = 'best';
    private rankBack: State = 'menu';

    private openRank(from: State) {
        this.rankBack = from;
        this.rankKind = from === 'daily' ? 'daily' : 'best';
        Analytics.track('rank_open', { from, kind: this.rankKind });
        this.setState('rank');
        this.drawRank();
    }

    private drawRank() {
        const w = (globalThis as any).wx;
        if (!Social.rankSupported) return;
        Social.reportScores();
        const info = w.getSystemInfoSync();
        Social.showRank(this.rankKind, this.vw / info.windowWidth);
    }

    // 好友排行：开放数据域把排行画在共享画布上，SubContextView 显示到这里
    private buildRank() {
        const s = this.screen('rank');
        this.header(s, '好友排行', false);
        const tabs: [('best' | 'daily'), string][] = [['best', '最长存活'], ['daily', '今日挑战']];
        const tabBtns: Button[] = [];
        tabs.forEach(([k, name], i) => {
            const b = mkButton(s, name, 250, 72, () => { this.rankKind = k; this.refreshAll(); this.drawRank(); }, C_BTN_BLUE, 28);
            b.node.setPosition(i === 0 ? -135 : 135, this.top - 130);
            tabBtns.push(b);
        });
        const areaTop = this.top - 186, areaBottom = this.bottom + 140;
        const aw = 640, ah = Math.max(300, areaTop - areaBottom);
        const area = mkPanel(s, aw + 8, ah + 8);
        area.node.setPosition(0, (areaTop + areaBottom) / 2);
        if (Social.rankSupported) {
            const view = mkNode('subctx', area.node);
            view.addComponent(UITransform).setContentSize(aw, ah);
            const sub = view.addComponent(SubContextView);
            sub.designResolutionSize = new Size(aw, ah);
            sub.fps = 30;
        } else {
            mkLabel(area.node, '在微信中打开即可查看好友排行', 26, C_GREY, 'center', 2);
        }
        this.refreshers.push(() => {
            tabs.forEach(([k], i) => tabBtns[i].node.setScale(this.rankKind === k ? 1.06 : 0.94, this.rankKind === k ? 1.06 : 0.94, 1));
        });
        mkLabel(s, '只显示同样在玩《奶蛙割草》的微信好友', 20, C_GREY, 'center', 2).node.setPosition(0, this.bottom + 136 - 24);
        mkButton(s, '返回', 300, 88, () => this.setState(this.rankBack), C_BTN_GREY).node.setPosition(0, this.bottom + 60);
    }

    private buildAchievements() {
        const s = this.screen('achv');
        this.header(s, '成就');
        const y0 = this.top - 160;
        const rows = Math.ceil(ACHIEVEMENTS.length / 2);
        const avail = y0 - (this.bottom + 150);
        const ch = Math.min(110, avail / rows - 8);
        const cw = 344;
        ACHIEVEMENTS.forEach((a, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const card = mkPanel(s, cw, ch);
            card.node.setPosition((col - 0.5) * (cw + 12), y0 - ch / 2 - row * (ch + 8));
            const name = mkLabel(card.node, a.name, 24, C_WHITE, 'left', 3);
            name.node.setPosition(-cw / 2 + 16, ch * 0.22);
            mkLabel(card.node, a.desc, 17, C_GREY, 'left', 2).node.setPosition(-cw / 2 + 16, -ch * 0.25);
            const reward = mkLabel(card.node, '', 20, C_GOLD, 'right', 3);
            reward.node.setPosition(cw / 2 - 12, ch * 0.22);
            this.refreshers.push(() => {
                const done = Save.data.achievements.includes(a.id);
                card.border.color = done ? C_GOLD : new Color(90, 80, 110, 255);
                card.fill.color = done ? new Color(60, 48, 30, 250) : new Color(30, 26, 44, 245);
                name.color = done ? C_GOLD : new Color(200, 196, 214, 255);
                reward.string = done ? '已完成' : `+${a.gold}`;
            });
        });
        mkButton(s, '返回', 300, 88, () => this.setState('menu'), C_BTN_BLUE).node.setPosition(0, this.bottom + 80);
    }

    // ------------------------------------------------------------------ 升级 / 宝箱

    private openLevelUp() {
        this.options = this.battle.buildOptions();
        this.levelTitle.string = `升级!  LV ${this.battle.level - this.battle.pendingLevels + 1}`;
        this.fillCards();
        Sound.play('levelup');
        this.setState('levelup');
    }

    private styleCards(bless: boolean) {
        for (const c of this.cards) {
            c.border.color = bless ? new Color(190, 110, 255, 255) : new Color(214, 170, 70, 255);
            c.fill.color = bless ? new Color(48, 24, 70, 250) : new Color(36, 30, 64, 245);
        }
    }

    private openBlessing() {
        this.cardMode = 'blessing';
        this.blessOpts = blessingOptions(this.battle);
        if (!this.blessOpts.length) { this.battle.pendingBlessings = 0; return; }
        this.levelTitle.string = '选择命运卡牌';
        this.styleCards(true);
        for (let i = 0; i < this.cards.length; i++) {
            const c = this.cards[i], o = this.blessOpts[i];
            c.node.active = !!o;
            if (!o) continue;
            c.icon.spriteFrame = Art.f(o.icon);
            c.name.string = o.name;
            c.tag.string = '命运卡牌';
            c.desc.string = o.desc;
        }
        this.rerollBtn.node.active = false;
        this.adRerollBtn.node.active = false;
        // 开局的命运卡牌：可看广告额外多选一张（每局一次）
        this.adBlessBtn.node.active = !this.adBlessUsed && this.battle.time < 1 && Ads.canReward('blessing');
        Sound.play('card');
        this.setState('levelup');
    }

    private fillCards() {
        this.cardMode = 'level';
        this.styleCards(false);
        for (let i = 0; i < this.cards.length; i++) {
            const c = this.cards[i];
            const o = this.options[i];
            c.node.active = !!o;
            if (!o) continue;
            const d = describe(o);
            c.icon.spriteFrame = Art.f(d.icon);
            c.name.string = d.name;
            c.tag.string = d.tag;
            c.desc.string = d.desc;
        }
        this.rerollBtn.node.active = this.battle.rerolls > 0;
        this.adBlessBtn.node.active = false;
        this.adRerollBtn.node.active = this.battle.rerolls <= 0 && this.adRerolls > 0 && Ads.canReward('reroll');
        this.adRerollBtn.label.string = `▶ 看广告重抽 (${this.adRerolls})`;
        this.rerollBtn.label.string = `重抽 (${this.battle.rerolls})`;
    }

    private reroll() {
        if (this.state !== 'levelup' || this.cardMode !== 'level' || this.battle.rerolls <= 0) return;
        this.battle.rerolls--;
        this.options = this.battle.buildOptions();
        this.fillCards();
    }

    private choose(i: number) {
        if (this.state !== 'levelup') return;
        if (this.cardMode === 'blessing') {
            const b = this.blessOpts[i];
            if (!b) return;
            this.battle.applyBlessing(b);
            this.banner(b.name, new Color(200, 140, 255, 255));
            this.afterReward();
            return;
        }
        const o = this.options[i];
        if (!o) return;
        Sound.play('click');
        this.battle.applyOption(o);
        this.battle.pendingLevels--;
        this.afterReward();
        if ((this.state as State) === 'play') this.battle.levelBlast();
    }

    private openChest() {
        const r = this.battle.openChest();
        this.showChestResult(r);
        this.adChestUsed = false;
        this.chestAdBtn.node.active = Ads.canReward('chest');
        vibrate(true);
        this.setState('chest');
    }

    private afterReward() {
        if (this.state !== 'levelup' && this.state !== 'chest') return;
        this.refreshIcons();
        this.setState('play');
        this.checkRewards();
    }

    private checkRewards() {
        if (this.state !== 'play') return;
        if (this.battle.pendingChests > 0) this.openChest();
        else if (this.battle.pendingBlessings > 0) this.openBlessing();
        else if (this.battle.pendingLevels > 0) this.openLevelUp();
    }

    private refreshIcons() {
        this.iconRow.destroyAllChildren();
        const sp = 46;
        this.battle.weapons.forEach((w, i) => {
            mkSprite(this.iconRow, w.icon, 2.2).node.setPosition(i * sp, 0);
            mkLabel(this.iconRow, w.evolved ? '★' : String(w.level), 14, C_WHITE, 'center', 2).node.setPosition(i * sp + 13, -14);
        });
        this.battle.passives.forEach((p, i) => {
            mkSprite(this.iconRow, p.def.icon, 2.2).node.setPosition(i * sp, -44);
            mkLabel(this.iconRow, String(p.level), 14, C_WHITE, 'center', 2).node.setPosition(i * sp + 13, -58);
        });
    }

    // ------------------------------------------------------------------ 输入

    private onKeyDown(e: EventKeyboard) {
        this.keys.add(e.keyCode);
        const k = e.keyCode;
        const confirm = k === KeyCode.ENTER || k === KeyCode.SPACE;
        if (this.state === 'splash') { if (this.splashT > 1) this.afterSplash(); return; }
        if (this.state === 'levelup') {
            if (k >= KeyCode.DIGIT_1 && k <= KeyCode.DIGIT_3) this.choose(k - KeyCode.DIGIT_1);
            if (k === KeyCode.KEY_R) this.reroll();
            return;
        }
        if (this.state === 'chest' && confirm) { this.afterReward(); return; }
        if ((this.state === 'menu' || this.state === 'result') && confirm) { this.startGame(); return; }
        if (this.state === 'play' && (k === KeyCode.SPACE || k === KeyCode.KEY_Q)) { this.castUlt(); return; }
        if (k === KeyCode.ESCAPE || k === KeyCode.KEY_P) {
            if (this.state === 'play') this.setState('pause');
            else if (this.state === 'pause') this.setState('play');
        }
    }

    private onKeyUp(e: EventKeyboard) {
        this.keys.delete(e.keyCode);
    }

    private onJoyStart(e: EventTouch) {
        const loc = e.getUILocation();
        this.ui.getComponent(UITransform)!.convertToNodeSpaceAR(tmpV3.set(loc.x, loc.y, 0), this.joyOrigin);
        this.joyActive = true;
        this.joyX = this.joyY = 0;
        this.joyBase.active = this.joyKnob.active = true;
        this.joyBase.setPosition(this.joyOrigin);
        this.joyKnob.setPosition(this.joyOrigin);
    }

    private onJoyMove(e: EventTouch) {
        if (!this.joyActive) return;
        const loc = e.getUILocation();
        this.ui.getComponent(UITransform)!.convertToNodeSpaceAR(tmpV3.set(loc.x, loc.y, 0), tmpV3);
        let dx = tmpV3.x - this.joyOrigin.x, dy = tmpV3.y - this.joyOrigin.y;
        // 底座固定在按下的位置；手指拖出范围时摇杆头停在边缘，方向仍然跟随手指
        const R = 60, d = Math.hypot(dx, dy);
        if (d > R) {
            dx = (dx / d) * R;
            dy = (dy / d) * R;
        }
        this.joyX = d > 8 ? dx / R : 0;
        this.joyY = d > 8 ? dy / R : 0;
        this.joyKnob.setPosition(this.joyOrigin.x + dx, this.joyOrigin.y + dy);
    }

    private onJoyEnd() {
        this.joyActive = false;
        this.joyX = this.joyY = 0;
        if (this.joyBase) this.joyBase.active = this.joyKnob.active = false;
    }

    // ------------------------------------------------------------------ 主循环

    update(rawDt: number) {
        const dt = Math.min(rawDt, 1 / 20);
        this.t += dt;
        this.layout();
        if (this.state === 'splash') {
            this.splashT += dt;
            this.updateSplashFx(dt);
            if (this.splashT > 2.5) this.afterSplash();
        } else if (this.state === 'victory') {
            this.updateVictory(dt);
        } else if (this.state === 'dying') {
            this.updateDying(dt);
        } else if (this.state === 'revive') {
            if (!Ads.showing) this.reviveT -= dt;
            this.reviveCount.string = String(Math.max(0, Math.ceil(this.reviveT - 0.01)));
            if (this.reviveT <= 0) this.endRun(false);
        }
        const b = this.battle;
        if (this.state === 'play') {
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
        } else if (this.state === 'menu' || this.state === 'chars' || this.state === 'shop' || this.state === 'settings' || this.state === 'achv' || this.state === 'codex' || this.state === 'signin' || this.state === 'privacy' || this.state === 'splash' || this.state === 'daily' || this.state === 'rank') {
            b.idle(dt);
            if (this.state === 'menu') this.updateMenuFx(dt);
        }
        this.updateHud(dt);
        this.updateTutorial(dt);
        if (this.toastT > 0) {
            this.toastT -= dt;
            if (this.toastT <= 0) this.toast.node.active = false;
        }
    }

    // ------------------------------------------------------------------ HUD

    private banner(text: string, color: Color) {
        this.bannerLabel.string = text;
        this.bannerLabel.color = color;
        this.bannerLabel.node.active = true;
        this.bannerT = 2.5;
    }

    private showToast(text: string) {
        this.toast.string = text;
        this.toast.node.active = true;
        this.toastT = 1.6;
    }

    private fmtTime(t: number) {
        const m = Math.floor(t / 60), s = Math.floor(t % 60);
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    private updateHud(dt: number) {
        if (!this.hud.active) return;
        const b = this.battle;
        const buffs: string[] = [];
        if (b.potionT > 0) buffs.push(`狂暴 ${Math.ceil(b.potionT)}s`);
        if (b.shieldHits > 0) buffs.push(`护盾 ×${b.shieldHits}`);
        if (b.hasteT > 0) buffs.push(`急速 ${Math.ceil(b.hasteT)}s`);
        if (b.cloverT > 0) buffs.push(`幸运 ${Math.ceil(b.cloverT)}s`);
        if (b.fireT > 0) buffs.push(`烈焰 ${Math.ceil(b.fireT)}s`);
        if (b.arcaneT > 0) buffs.push('奥术涌流');
        if (b.giantT > 0) buffs.push(`巨人 ${Math.ceil(b.giantT)}s`);
        if (b.bootsT > 0) buffs.push(`疾风 ${Math.ceil(b.bootsT)}s`);
        if (b.decoyT > 0) buffs.push(`幻影 ${Math.ceil(b.decoyT)}s`);
        if (b.endless) buffs.push('无尽');
        const bs = buffs.join('  ');
        if (this.buffLabel.string !== bs) this.buffLabel.string = bs;
        this.xpFill.setScale(Math.min(1, b.xp / b.xpNext), 1, 1);
        // 大招按钮
        if (this.ultChar !== b.char.id) {
            this.ultChar = b.char.id;
            this.ultHero.spriteFrame = Art.f(b.char.sprite + '_0');
            this.ultName.string = b.char.ultName;
        }
        const ready = b.ult >= 1;
        if (ready && !this.ultHinted && Save.data.runs < 3 && this.state === 'play') {
            this.ultHinted = true;
            this.showToast('大招就绪! 点击右下角按钮释放');
        }
        this.ultFill.node.setScale(1, Math.max(0.02, b.ult), 1);
        this.ultFill.color = ready ? new Color(255, 210, 90, 150 + Math.round(80 * Math.sin(this.t * 8))) : new Color(120, 160, 255, 110);
        const us = ready ? 1 + 0.06 * Math.sin(this.t * 8) : 1;
        this.ultBtn.setScale(us, us, 1);
        this.ultName.color = ready ? C_GOLD : C_GREY;
        // 神兵
        const ep = b.epic;
        this.epicLabel.node.active = this.epicBar.active = !!ep;
        if (ep) {
            const txt = `★ ${ep.name}  ${Math.ceil(b.epicT)}s`;
            if (this.epicLabel.string !== txt) this.epicLabel.string = txt;
            this.epicFill.node.setScale(Math.max(0, Math.min(1, b.epicT / (b.epicMax || EPIC_TIME))), 1, 1);
            this.epicLabel.color = b.epicT < 5 && Math.floor(this.t * 6) % 2 ? C_WHITE : C_GOLD;
        }
        const tr = b.trial;
        this.trialLabel.node.active = !!tr;
        if (tr) {
            const txt = `试炼 ${Math.min(tr.got, tr.need)}/${tr.need}  ${Math.ceil(tr.t)}s`;
            if (this.trialLabel.string !== txt) this.trialLabel.string = txt;
        }
        this.lvLabel.string = 'LV ' + b.level;
        this.timeLabel.string = this.fmtTime(Math.min(b.time, WIN_TIME));
        this.killLabel.string = '击败 ' + b.kills;
        this.goldLabel.string = String(b.gold);
        // 连杀计数：数字越大颜色越热，每次击杀弹跳
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
            const nm = (boss.def.name || '') + (boss.ai && boss.ai.enraged ? '  · 狂暴' : '');
            if (this.bossName.string !== nm) this.bossName.string = nm;
        }
        // 下一个 Boss 倒计时：最后 10 秒变红闪烁
        const nb = b.nextBoss();
        if (nb) {
            const sec = Math.ceil(nb.remain);
            this.bossTimer.string = `${nb.final ? '最终Boss' : 'Boss'} ${nb.name}  ${this.fmtTime(sec)}`;
            const warn = nb.remain <= 10;
            const blink = warn && Math.floor(this.t * 4) % 2 === 0;
            this.bossTimer.color = warn ? (blink ? new Color(255, 60, 60, 255) : new Color(255, 200, 80, 255)) : new Color(220, 200, 255, 255);
            const sc = warn ? 1.15 + 0.1 * Math.sin(this.t * 12) : 1;
            this.bossTimer.node.setScale(sc, sc, 1);
        } else {
            this.bossTimer.string = b.boss ? '击败暗夜魔术师即可获胜!' : `坚持到 ${this.fmtTime(WIN_TIME)}!`;
            this.bossTimer.color = C_GOLD;
            this.bossTimer.node.setScale(1, 1, 1);
        }
        if (this.bannerT > 0 && this.state === 'play') {
            this.bannerT -= dt;
            const c = this.bannerLabel.color;
            this.bannerLabel.color = new Color(c.r, c.g, c.b, Math.floor(255 * Math.min(1, this.bannerT)));
            if (this.bannerT <= 0) this.bannerLabel.node.active = false;
        }
    }
}

// 兜底：若当前场景的 Canvas 上没有挂 GameRoot，则自动挂载，保证任何 2D 场景都能直接运行
if (!EDITOR) {
    director.on(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
        const scene = director.getScene();
        if (!scene || scene.getComponentInChildren(GameRoot)) return;
        const canvas = scene.getComponentInChildren(Canvas);
        if (canvas) canvas.node.addComponent(GameRoot);
        else console.warn('[GameRoot] 场景中没有 Canvas，请使用 assets/scenes/Main.scene');
    });
}
