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
    bestTime: number;
    bestKills: number;
    bestLevel: number;
    totalKills: number;
    runs: number;
    wins: number;
    achievements: string[];
    mode: 'normal' | 'endless';
    endlessBest: number;
    lossStreak: number;   // 连败次数（不屈意志）
    bonusDay: string;     // 最近一次领取每日首局双倍金币的日期
    privacyOk: boolean;   // 已同意用户协议与隐私政策
    firstDay: string;     // 首次游玩日期（首日不弹插屏）
    runsSinceInter: number;
}

const KEY = 'night_survivors_save_v1';

function defaults(): SaveData {
    return {
        gold: 0, power: {}, chars: ['hunter', 'mage'], selected: 'hunter',
        music: true, sfx: true, vibrate: true,
        bestTime: 0, bestKills: 0, bestLevel: 0, totalKills: 0, runs: 0, wins: 0,
        achievements: [], mode: 'normal', endlessBest: 0, lossStreak: 0, bonusDay: '', privacyOk: false, firstDay: '', runsSinceInter: 0,
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
