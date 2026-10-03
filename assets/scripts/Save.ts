import { sys } from 'cc';

// 本地存档（微信小游戏中 sys.localStorage 映射到 wx.setStorageSync）
export interface SaveData {
    gold: number;
    power: Record<string, number>; // 商店强化等级
    chars: string[];               // 已解锁角色
    selected: string;
    music: boolean;
    sfx: boolean;
    vibrate: boolean;
    lite: boolean;        // 性能模式：降低同屏怪物上限、只显示暴击数字、减少粒子
    liteChecked: boolean; // 已按机型性能自动判断过
    bestTime: number;
    bestKills: number;
    bestLevel: number;
    totalKills: number;
    runs: number;
    wins: number;
    achievements: string[];
    mode: 'normal' | 'endless' | 'nightmare';
    endlessBest: number;
    lossStreak: number;   // 连败次数（不屈意志）
    bonusDay: string;     // 最近一次领取每日首局双倍金币的日期
    privacyOk: boolean;   // 已同意用户协议与隐私政策
    firstDay: string;     // 首次游玩日期（首日不弹插屏）
    runsSinceInter: number;
    stage: string;             // 当前选择的地图
    stages: string[];          // 已解锁地图
    stageBest: Record<string, number>; // 各地图最长存活秒数
    dailyDone: string;         // 最近完成每日挑战的日期
    dailyBestDate: string;
    dailyBest: number;         // 今日挑战最佳存活秒数
    tutDone: boolean;          // 已完成新手引导
    codex: string[];           // 图鉴已收录（w:武器 e:进化 p:道具 m:怪物）
    codexSeen: number;         // 上次打开图鉴时的收录数（用于红点）
    questDate: string;         // 每日任务进度所属日期
    questProg: Record<string, number>; // 各统计项今日进度
    questDone: string[];       // 今日已领取奖励的任务 id（含 'bonus'）
    signCount: number;         // 累计签到天数
    signDate: string;          // 最近签到日期
    signShown: string;         // 最近一次自动弹出签到的日期（每天只自动弹一次）
}

const KEY = 'night_survivors_save_v1';

function defaults(): SaveData {
    return {
        gold: 0, power: {}, chars: ['hunter', 'mage'], selected: 'hunter',
        music: true, sfx: true, vibrate: true, lite: false, liteChecked: false,
        bestTime: 0, bestKills: 0, bestLevel: 0, totalKills: 0, runs: 0, wins: 0,
        achievements: [], mode: 'normal', endlessBest: 0, lossStreak: 0, bonusDay: '', privacyOk: false, firstDay: '', runsSinceInter: 0, stage: 'grass', stages: ['grass'], stageBest: {}, dailyDone: '', dailyBestDate: '', dailyBest: 0, tutDone: false, codex: [], codexSeen: 0, questDate: '', questProg: {}, questDone: [], signCount: 0, signDate: '', signShown: '',
    };
}

export class Save {
    static data: SaveData = defaults();

    static load() {
        try {
            const raw = sys.localStorage.getItem(KEY);
            if (raw) this.data = Object.assign(defaults(), JSON.parse(raw));
        } catch (e) {
            console.warn('[Save] load failed', e);
            this.data = defaults();
        }
    }

    static save() {
        try {
            sys.localStorage.setItem(KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('[Save] save failed', e);
        }
    }

    static rank(id: string) {
        return this.data.power[id] || 0;
    }

    static totalBought() {
        let n = 0;
        for (const k in this.data.power) n += this.data.power[k];
        return n;
    }
}
