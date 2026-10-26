import { AD_CONFIG } from './AdConfig';
import { Save } from './Save';
import { Sound } from './Sound';

// 激励视频结果：ok = 完整看完；reason 说明失败原因（用于提示）
export type RewardResult = { ok: boolean; reason?: 'skipped' | 'error' };

// 小游戏平台 API：微信 wx / 抖音 tt 的广告接口一致
export function mgApi(): any {
    const g = globalThis as any;
    return g.wx || g.tt || null;
}

// 广告管理（方案一）：没有可用广告时，界面上的"看广告"按钮全部隐藏
export class Ads {
    private static units = new Map<string, any>();
    private static fails = new Map<string, number>();
    private static inter: any = null;
    private static pending: ((r: RewardResult) => void) | null = null;
    private static busy = false;
    static get showing() { return this.busy; }
    private static bgmWasPlaying = false;

    static init() {
        const a = mgApi();
        if (!a) return;
        const ids = new Set<string>();
        if (AD_CONFIG.rewarded) ids.add(AD_CONFIG.rewarded);
        for (const k in AD_CONFIG.rewardedByPlace) if (AD_CONFIG.rewardedByPlace[k]) ids.add(AD_CONFIG.rewardedByPlace[k]);
        if (a.createRewardedVideoAd) {
            ids.forEach(id => {
                try {
                    const ad = a.createRewardedVideoAd({ adUnitId: id });
                    ad.onLoad(() => this.fails.set(id, 0));
                    ad.onError(() => this.fails.set(id, (this.fails.get(id) || 0) + 1));
                    // 微信基础库 2.1.0 以下 res 为 undefined，视为看完
                    ad.onClose((res: any) => this.finish({ ok: !res || res.isEnded !== false, reason: res && res.isEnded === false ? 'skipped' : undefined }));
                    this.units.set(id, ad);
                } catch (e) { /* 创建失败：该广告位视为不可用 */ }
            });
        }
        if (AD_CONFIG.interstitial && a.createInterstitialAd) {
            try {
                this.inter = a.createInterstitialAd({ adUnitId: AD_CONFIG.interstitial });
                this.inter.onError(() => { /* 插屏失败静默忽略 */ });
            } catch (e) { this.inter = null; }
        }
        // 记录首次游玩日期（新用户首日不弹插屏）
        if (!Save.data.firstDay) {
            Save.data.firstDay = new Date().toDateString();
            Save.save();
        }
    }

    private static unitFor(place: string) {
        return AD_CONFIG.rewardedByPlace[place] || AD_CONFIG.rewarded;
    }

    // 某个位置当前能否展示激励视频（未配置 / 非小游戏环境 / 连续拉取失败 3 次 → 不可用）
    static canReward(place: string) {
        if (AD_CONFIG.debugFake) return true;
        const id = this.unitFor(place);
        return !!id && this.units.has(id) && (this.fails.get(id) || 0) < 3;
    }

    static showReward(place: string, cb: (r: RewardResult) => void) {
        if (this.busy) return;
        if (AD_CONFIG.debugFake) { cb({ ok: true }); return; }
        const ad = this.units.get(this.unitFor(place));
        if (!ad) { cb({ ok: false, reason: 'error' }); return; }
        this.busy = true;
        this.pending = cb;
        this.bgmWasPlaying = Sound.bgmPlaying();
        Sound.pauseBgm();
        ad.show().catch(() => {
            // 未加载好：先拉取再展示
            ad.load().then(() => ad.show()).catch(() => {
                const id = this.unitFor(place);
                this.fails.set(id, (this.fails.get(id) || 0) + 1);
                this.finish({ ok: false, reason: 'error' });
            });
        });
    }

    private static finish(r: RewardResult) {
        const cb = this.pending;
        this.pending = null;
        this.busy = false;
        if (this.bgmWasPlaying) Sound.resumeBgm();
        if (cb) cb(r);
    }

    // 结算后调用：每 N 局一次插屏；新用户首日、本次结算已看过激励视频时不弹。返回是否尝试弹出
    static afterRun(watchedReward: boolean): boolean {
        const d = Save.data;
        d.runsSinceInter = (d.runsSinceInter || 0) + 1;
        Save.save();
        if (!this.inter || watchedReward) return false;
        if (d.firstDay === new Date().toDateString()) return false;
        if (d.runsSinceInter < AD_CONFIG.interstitialEvery) return false;
        d.runsSinceInter = 0;
        Save.save();
        this.inter.show().catch(() => { /* 忽略 */ });
        return true;
    }
}
