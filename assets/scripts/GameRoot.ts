import {
    _decorator, Canvas, Color, Component, director, Director, EventKeyboard, EventTouch, game, Game, Input, input,
    KeyCode, Label, Node, ResolutionPolicy, Sprite, sys, UITransform, Vec3, view,
} from 'cc';
import { EDITOR } from 'cc/env';
import { AD_CONFIG } from './AdConfig';
import { Ads, mgApi, RewardResult } from './Ads';
import { Art } from './Art';
import { Backdrop } from './Backdrop';
import { Battle, blessingOptions, describe, Option } from './Battle';
import { ACHIEVEMENTS, BlessingDef, BOSS_SCHEDULE, CHARACTERS, CharDef, ENEMIES, POWERUPS, powerUpCost, WEAPONS, WIN_TIME } from './Defs';
import { Save } from './Save';
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
// 点击主界面奶蛙时随机说的话
const FROG_LINES = ['呱!', '割草去!', '呱呱呱~', '奶蛙出击!', '今天也要努力割草', '血月? 不怕!', '再来一局呱', '别戳了, 痒!'];
const AGE_TIP = '本游戏适合 12 周岁及以上玩家。\n像素风格的奶蛙动作生存游戏，含卡通化的战斗内容，\n无真实血腥画面，无付费内容。\n请合理安排游戏时间。';
const HEALTH_TIP = '抵制不良游戏，拒绝盗版游戏。\n注意自我保护，谨防受骗上当。\n适度游戏益脑，沉迷游戏伤身。\n合理安排时间，享受健康生活。';
const C_AD = new Color(150, 90, 20, 255);

type State = 'splash' | 'privacy' | 'menu' | 'chars' | 'shop' | 'settings' | 'achv' | 'play' | 'levelup' | 'chest' | 'pause' | 'revive' | 'result';

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
    private splashT = 0;
    private ageNode!: Node;
    private toast!: Label;
    private toastT = 0;

    onLoad() {
        view.setDesignResolutionSize(DESIGN_W, DESIGN_H, ResolutionPolicy.FIXED_WIDTH);
        Save.load();
        Art.init();
        Sound.init(this.node);
        Ads.init();
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
        const title = b.won ? `我的奶蛙在《${GAME_NAME}》里击败了死神！你也来试试？` : `我的奶蛙坚持了 ${this.fmtTime(b.time)}，割倒 ${b.kills} 只怪物，你能撑多久？`;
        try { w.shareAppMessage({ title, imageUrl }); } catch (e) { /* 忽略 */ }
    }

    private setupShare() {
        const w = mgApi();
        if (!w) return;
        try {
            if (w.showShareMenu) w.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
            const msg = () => ({ title: Save.data.bestTime ? `${GAME_NAME}：我的奶蛙坚持了 ${this.fmtTime(Save.data.bestTime)}，你能撑多久？` : `${GAME_NAME}：胖奶蛙割草，在血月下活过 15 分钟！` });
            if (w.onShareAppMessage) w.onShareAppMessage(msg);
            if (w.onShareTimeline) w.onShareTimeline(msg);
        } catch (e) { /* 忽略 */ }
    }

    // 切到后台自动暂停
    private onHide() {
        if (this.state === 'play') this.setState('pause');
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
        this.buildRevive();
        this.buildSplash();
        this.buildPrivacy();

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
        this.killLabel = mkLabel(hud, '击杀 0', 24, C_WHITE, 'right', 3, true);
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
        this.comboSub = mkLabel(hud, '连杀', 22, C_WHITE, 'right', 3);
        this.comboSub.node.setPosition(R - 20, top - 325);
        this.buffLabel = mkLabel(hud, '', 22, new Color(255, 200, 220, 255), 'left', 3);
        this.buffLabel.node.setPosition(L + 16, top - 222);

        this.bannerLabel = mkLabel(hud, '', 44, C_RED, 'center', 5);
        this.bannerLabel.node.setPosition(0, this.vh * 0.16);
        this.bannerLabel.node.active = false;
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
        goldPanel.node.setPosition(-this.vw / 2 + 116, top - 40);
        mkSprite(goldPanel.node, 'coin', 3).node.setPosition(-68, 0);
        const gold = mkLabel(goldPanel.node, '', 28, C_GOLD, 'left', 3);
        gold.node.setPosition(-46, 0);
        const daily = mkLabel(s, '今日首局 金币×2', 20, new Color(255, 214, 90, 255), 'left', 3);
        daily.node.setPosition(-this.vw / 2 + 18, top - 88);
        const age = mkPanel(s, 76, 76, new Color(30, 120, 60, 255), new Color(255, 255, 255, 255));
        age.node.setPosition(this.vw / 2 - 52, top - 40);
        mkLabel(age.node, AGE_RATING, 28, C_WHITE, 'center', 2);

        const best = mkLabel(s, '', 22, C_GREY, 'center', 2);
        best.node.setPosition(0, this.bottom + 46);
        mkLabel(s, GAME_VERSION, 16, new Color(120, 110, 140, 255), 'left', 2).node.setPosition(-this.vw / 2 + 12, this.bottom + 14);

        mkButton(s, '开始游戏', 440, 100, () => this.startGame(), C_BTN_GREEN, 40).node.setPosition(0, btnTop);
        mkButton(s, '选择角色', 440, 84, () => this.setState('chars'), C_BTN_BLUE, 34).node.setPosition(0, btnTop - 104);
        mkButton(s, '永久强化', 440, 84, () => this.setState('shop'), C_BTN_BLUE, 34).node.setPosition(0, btnTop - 200);
        mkButton(s, '成就', 212, 80, () => this.setState('achv'), C_BTN_BLUE, 30).node.setPosition(-114, btnTop - 296);
        mkButton(s, '设置', 212, 80, () => this.setState('settings'), C_BTN_GREY, 30).node.setPosition(114, btnTop - 296);

        // 适龄提示面板（最后创建，位于最上层）
        this.ageNode = mkPanel(s, 600, 300).node;
        this.ageNode.setPosition(0, this.vh * 0.05);
        mkLabel(this.ageNode, '适龄提示', 34, C_GOLD, 'center', 3).node.setPosition(0, 100);
        mkLabel(this.ageNode, AGE_TIP, 22, C_WHITE, 'center', 2).node.setPosition(0, -10);
        mkLabel(this.ageNode, '点击关闭', 18, C_GREY, 'center', 2).node.setPosition(0, -120);
        this.ageNode.active = false;
        this.ageNode.on(Node.EventType.TOUCH_END, () => { this.ageNode.active = false; });
        age.node.on(Node.EventType.TOUCH_END, () => { Sound.play('click'); this.ageNode.active = true; });

        this.refreshers.push(() => {
            const c = this.selectedChar();
            this.menuHero.spriteFrame = Art.f(c.sprite + '_0');
            name.string = `${c.name} · ${c.title}  ›`;
            gold.string = String(Save.data.gold);
            daily.node.active = Save.data.bonusDay !== new Date().toDateString();
            const d = Save.data;
            best.string = (d.runs ? `最佳：存活 ${this.fmtTime(d.bestTime)}  ·  击杀 ${d.bestKills}  ·  等级 ${d.bestLevel}` : '存活 15 分钟即可获胜') + (d.endlessBest ? `\n无尽模式最佳 ${this.fmtTime(d.endlessBest)}` : '') + `   成就 ${d.achievements.length}/${ACHIEVEMENTS.length}`;
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
        const y0 = this.top - 170;
        const rowsN = Math.ceil(CHARACTERS.length / 2);
        const avail = y0 - (this.bottom + 230);
        const ch = Math.min(250, avail / rowsN - 12);
        const cw = 340;
        CHARACTERS.forEach((c, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const card = mkPanel(s, cw, ch);
            card.node.setPosition((col - 0.5) * (cw + 14), y0 - ch / 2 - row * (ch + 14));
            const spr = mkSprite(card.node, c.sprite + '_0', Math.min(2.2, (ch - 30) / 70));
            spr.node.setPosition(-100, 14);
            mkLabel(card.node, c.name, 30, C_WHITE, 'left', 3).node.setPosition(-30, ch / 2 - 34);
            mkLabel(card.node, c.title, 20, C_GREY, 'left', 2).node.setPosition(-30, ch / 2 - 66);
            const wd = WEAPONS.find(w => w.id === c.weapon)!;
            mkSprite(card.node, wd.icon, 2).node.setPosition(-14, ch / 2 - 102);
            mkLabel(card.node, wd.name, 20, C_GOLD, 'left', 2).node.setPosition(6, ch / 2 - 102);
            mkLabel(card.node, c.desc, 18, C_GREEN, 'left', 2).node.setPosition(-cw / 2 + 16, -ch / 2 + 24);
            const lock = mkRect(card.node, cw - 6, ch - 6, new Color(0, 0, 0, 175), 'lock');
            mkSprite(lock.node, 'icon_lock', 3).node.setPosition(0, 24);
            mkLabel(lock.node, `${c.cost} 金币解锁`, 24, C_GOLD, 'center', 3).node.setPosition(0, -30);
            card.node.on(Node.EventType.TOUCH_END, () => {
                Sound.play('click');
                const d = Save.data;
                if (!d.chars.includes(c.id)) {
                    if (d.gold < c.cost) { this.showToast('金币不足'); return; }
                    d.gold -= c.cost;
                    d.chars.push(c.id);
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
            if (Save.data.wins <= 0) { this.showToast('首次胜利后解锁无尽模式'); return; }
            Save.data.mode = Save.data.mode === 'endless' ? 'normal' : 'endless';
            Save.save();
            this.refreshAll();
        }, C_BTN_GREY, 26);
        mode.node.setPosition(0, by + 92);
        this.refreshers.push(() => {
            const locked = Save.data.wins <= 0;
            const e = this.endlessMode;
            mode.label.string = locked ? '模式：普通（无尽模式 首胜解锁）' : e ? '模式：无尽（Boss 循环，越来越强）' : '模式：普通（存活 15 分钟胜利）';
            mode.bg.color = e ? new Color(110, 40, 120, 255) : C_BTN_GREY;
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

    private toggleRow(parent: Node, y: number, icon: string, text: string, key: 'music' | 'sfx' | 'vibrate') {
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
        const p = mkPanel(s, 580, 360);
        p.node.setPosition(0, this.vh * 0.14);
        this.toggleRow(p.node, 110, 'icon_music', '背景音乐', 'music');
        this.toggleRow(p.node, 0, 'icon_sound', '游戏音效', 'sfx');
        this.toggleRow(p.node, -110, 'icon_vibrate', '震动反馈', 'vibrate');
        const stats = mkLabel(s, '', 26, C_GREY, 'center', 3);
        stats.node.setPosition(0, -this.vh * 0.12);
        this.refreshers.push(() => {
            const d = Save.data;
            stats.string = `游戏次数  ${d.runs}\n胜利次数  ${d.wins}\n累计击杀  ${d.totalKills}\n最长存活  ${this.fmtTime(d.bestTime)}`;
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
        mkButton(s, '放弃本局', 420, 88, () => this.endRun(false), new Color(120, 30, 40, 255), 30).node.setPosition(0, y0 - 240);
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
        mkButton(s, '主菜单', 260, 88, () => { Ads.afterRun(this.adWatchedThisResult); this.toMenu(); }, C_BTN_GREY).node.setPosition(-150, by);
        mkButton(s, '再来一局', 260, 88, () => { Ads.afterRun(this.adWatchedThisResult); this.startGame(); }, C_BTN_GREEN).node.setPosition(150, by);
        this.goldAdBtn = mkButton(s, '', 380, 80, () => this.watchAd('gold', () => {
            this.adGoldUsed = true;
            Save.data.gold += this.lastRunGold;
            Save.save();
            this.showToast(`金币 +${this.lastRunGold}!`);
            Sound.play('coin');
            this.refreshAll();
        }), C_AD, 26);
        this.shareBtn = mkButton(s, '分享战绩', 200, 80, () => this.shareResult(), C_BTN_BLUE, 26);
        this.refreshers.push(() => {
            if (this.state !== 'result') return;
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
    private buildRevive() {
        const s = this.screen('revive');
        mkLabel(s, '你倒下了…', 64, C_RED, 'center', 5).node.setPosition(0, this.vh * 0.2);
        mkLabel(s, '看一段广告，满血原地复活?', 30, C_WHITE, 'center', 3).node.setPosition(0, this.vh * 0.1);
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
        const age = mkPanel(s, 76, 76, new Color(30, 120, 60, 255), new Color(255, 255, 255, 255));
        age.node.setPosition(this.vw / 2 - 52, this.top - 40);
        mkLabel(age.node, AGE_RATING, 28, C_WHITE, 'center', 2);
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
        mkLabel(p.node, `欢迎来到《${GAME_NAME}》！\n\n我们非常重视你的个人信息保护：\n· 本游戏不收集你的个人信息；\n· 游戏进度只保存在你的手机本地；\n· 游戏中的广告由微信平台提供，\n  相关信息处理遵循《微信隐私保护指引》；\n· 你可以随时在微信中删除本小游戏及其数据。\n\n点击“同意”即表示你已阅读并同意\n《用户协议》和《隐私政策》。`, 22, C_WHITE, 'center', 2).node.setPosition(0, 10);
        mkButton(p.node, '不同意', 220, 80, () => {
            const w = mgApi();
            if (w && w.exitMiniProgram) w.exitMiniProgram({});
            else this.showToast('需要同意后才能开始游戏');
        }, C_BTN_GREY, 28).node.setPosition(-130, -250);
        mkButton(p.node, '同意', 220, 80, () => {
            Save.data.privacyOk = true;
            Save.save();
            this.setState('menu');
        }, C_BTN_GREEN, 30).node.setPosition(130, -250);
    }

    // 看激励视频：看完发奖；没看完或失败给出提示
    private watchAd(place: string, onReward: () => void, onFail?: () => void) {
        Ads.showReward(place, (r: RewardResult) => {
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
        const prev = this.state;
        this.state = s;
        for (const k in this.screens) this.screens[k as State]!.active = k === s;
        const inRun = s === 'play' || s === 'levelup' || s === 'chest' || s === 'pause' || s === 'revive';
        this.hud.active = inRun;
        this.overlay.node.active = s !== 'play';
        this.overlay.color = inRun || s === 'result' ? C_DIM : new Color(0, 0, 0, s === 'menu' ? 90 : 190);
        this.touchLayer.active = s === 'play';
        if (s !== 'play') this.onJoyEnd();
        if (s === 'menu' || s === 'chars' || s === 'shop' || s === 'settings' || s === 'achv' || s === 'privacy') Sound.playBgm('bgm_menu');
        if (s === 'revive') { this.reviveT = 8; Sound.pauseBgm(); }
        if (prev === 'revive' && s === 'play') Sound.resumeBgm();
        if (s === 'pause') Sound.pauseBgm();
        if (prev === 'pause' && s === 'play') Sound.resumeBgm();
        this.refreshAll();
    }

    private refreshAll() {
        for (const f of this.refreshers) f();
    }

    private get endlessMode() { return Save.data.mode === 'endless' && Save.data.wins > 0; }

    private toMenu() {
        this.battle.reset(this.selectedChar());
        this.battle.setPlayerVisible(false);
        this.setState('menu');
    }

    private startGame() {
        this.adRevived = this.adBlessUsed = false;
        this.adRerolls = AD_CONFIG.rerollPerRun;
        this.battle.reset(this.selectedChar(), this.endlessMode);
        this.battle.setPlayerVisible(true);
        this.refreshIcons();
        this.bannerT = 0;
        this.bannerLabel.node.active = false;
        Sound.play('start');
        Sound.playBgm('bgm_battle');
        this.setState('play');
        const st = this.battle.streak;
        this.banner(this.endlessMode ? '无尽之夜 · 能撑多久?' : st > 0 ? `不屈意志 · 伤害与生命 +${st * 5}%` : '生存下去!', new Color(255, 230, 120, 255));
    }

    // 结算：发放金币、记录最佳成绩
    private endRun(win: boolean) {
        const b = this.battle;
        const d = Save.data;
        const bonus = Math.round((Math.floor(b.time / 60) * 20 + (win ? 500 : 0)) * b.stats.greed);
        let total = b.gold + bonus;
        // 每日首局金币 ×2
        const today = new Date().toDateString();
        const daily = d.bonusDay !== today;
        if (daily) { d.bonusDay = today; total *= 2; }
        d.gold += total;
        this.lastRunGold = total;
        this.adGoldUsed = false;
        this.adWatchedThisResult = false;
        if (!b.endless) d.lossStreak = win ? 0 : Math.min(3, (d.lossStreak || 0) + 1);
        d.runs++;
        if (win) d.wins++;
        d.totalKills += b.kills;
        d.bestTime = Math.max(d.bestTime, Math.floor(b.time));
        d.bestKills = Math.max(d.bestKills, b.kills);
        d.bestLevel = Math.max(d.bestLevel, b.level);
        if (b.endless) d.endlessBest = Math.max(d.endlessBest, Math.floor(b.time));
        // 成就结算
        const got = this.checkAchievements(win);
        let achGold = 0;
        for (const a of got) achGold += a.gold;
        d.gold += achGold;
        Save.save();

        this.resultTitle.string = win ? '胜利!' : b.endless ? '无尽之夜结束' : '你倒下了';
        this.resultTitle.color = win ? C_GOLD : C_RED;
        this.resultStats.string = `存活时间  ${this.fmtTime(b.time)}\n等级  ${b.level}     击杀  ${b.kills}     最高连杀  ${b.maxCombo}\n拾取金币  ${b.gold}    时间奖励  ${bonus}\n本局获得  ${total + achGold} 金币` + (got.length ? `\n新成就：${got.map(a => a.name).join('、')}  (+${achGold})` : '');
        this.resultHint.string = this.nearMiss(win, daily);
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

    // 结算提示：差一点的遗憾感 + 下一个可达成的目标，驱动"再来一局"
    private nearMiss(win: boolean, daily: boolean) {
        const b = this.battle, d = Save.data;
        const lines: string[] = [];
        if (daily) lines.push('每日首局奖励：金币 ×2!');
        if (!win && !b.endless) {
            if (b.boss && b.boss.alive) lines.push(`${b.boss.def.name} 只剩 ${Math.max(1, Math.round((b.boss.hp / b.boss.maxHp) * 100))}% 血量了!`);
            else {
                const nb = BOSS_SCHEDULE.find(x => x.t > b.time);
                const left = Math.ceil((nb ? nb.t : WIN_TIME) - b.time);
                lines.push(nb ? `再坚持 ${this.fmtTime(left)} 就能见到 ${ENEMIES[nb.id].name}` : `距离胜利只差 ${this.fmtTime(left)}!`);
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
            allchars: CHARACTERS.every(c => d.chars.includes(c.id)),
        };
        for (const id of b.bossKills) ok['boss_' + id] = true;
        const got = ACHIEVEMENTS.filter(a => ok[a.id] && !d.achievements.includes(a.id));
        for (const a of got) d.achievements.push(a.id);
        return got;
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
        const R = 60, d = Math.hypot(dx, dy);
        if (d > R) {
            // 手指拖出范围时，摇杆底座跟随手指
            const k = (d - R) / d;
            this.joyOrigin.x += dx * k;
            this.joyOrigin.y += dy * k;
            dx = (dx / d) * R;
            dy = (dy / d) * R;
            this.joyBase.setPosition(this.joyOrigin);
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
            if (b.dead) {
                // 每局一次：可看广告复活（无广告时直接结算）
                if (!this.adRevived && !b.endless && Ads.canReward('revive')) this.setState('revive');
                else this.endRun(false);
            }
            else if (b.won) this.endRun(true);
            else this.checkRewards();
        } else if (this.state === 'menu' || this.state === 'chars' || this.state === 'shop' || this.state === 'settings' || this.state === 'achv' || this.state === 'privacy' || this.state === 'splash') {
            b.idle(dt);
            if (this.state === 'menu') this.updateMenuFx(dt);
        }
        this.updateHud(dt);
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
        if (b.shieldHits > 0) buffs.push(`圣盾 ×${b.shieldHits}`);
        if (b.endless) buffs.push('无尽');
        const bs = buffs.join('  ');
        if (this.buffLabel.string !== bs) this.buffLabel.string = bs;
        this.xpFill.setScale(Math.min(1, b.xp / b.xpNext), 1, 1);
        this.lvLabel.string = 'LV ' + b.level;
        this.timeLabel.string = this.fmtTime(Math.min(b.time, WIN_TIME));
        this.killLabel.string = '击杀 ' + b.kills;
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
            this.bossTimer.string = b.boss ? '击败死神即可获胜!' : `坚持到 ${this.fmtTime(WIN_TIME)}!`;
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
