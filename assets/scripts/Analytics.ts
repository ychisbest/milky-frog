import { mgApi } from './Ads';
import { Save } from './Save';

// 数据埋点：微信 wx.reportEvent（We 分析 → 自定义分析），抖音 tt.reportAnalytics
// 事件 ID 与字段需要先在后台登记，否则上报会被丢弃。完整清单见 docs/埋点方案.md
// 字段值只用 string / number；非小游戏环境（浏览器预览、测试）静默忽略
export type EventData = Record<string, string | number>;

export class Analytics {
    // true 时在控制台打印每条埋点，便于在预览中核对
    static debug = false;
    // 最近上报的事件（测试与调试用，最多保留 50 条）
    static log: { id: string; data: EventData }[] = [];

    static track(id: string, data: EventData = {}) {
        this.log.push({ id, data });
        if (this.log.length > 50) this.log.shift();
        if (this.debug) console.log('[Analytics]', id, JSON.stringify(data));
        const a = mgApi();
        if (!a) return;
        try {
            if (a.reportEvent) a.reportEvent(id, data);
            else if (a.reportAnalytics) a.reportAnalytics(id, data);
        } catch (e) { /* 埋点失败不影响游戏 */ }
    }

    // 热启动（从后台回到游戏，例如点开别人分享的卡片）也记录场景值；冷启动由 launch 事件记录
    static init() {
        const a = mgApi();
        if (!a || !a.onShow) return;
        try { a.onShow((res: any) => this.track('app_show', { scene: res && typeof res.scene === 'number' ? res.scene : 0, runs: Save.data.runs })); } catch (e) { /* 忽略 */ }
    }

    // 距首次游玩的天数（0 = 首日），用于看次留 / 七留
    static dayN() {
        const f = Save.data.firstDay;
        if (!f) return 0;
        const t0 = new Date(f).getTime();
        if (isNaN(t0)) return 0;
        const today = new Date(new Date().toDateString()).getTime();
        return Math.max(0, Math.round((today - t0) / 86400000));
    }

    // 启动场景值（1007 单聊分享卡片 / 1008 群聊 / 1154 朋友圈 / 1001 下拉 / 1005 搜索 / 1089 我的小程序 等）
    static launchScene(): number {
        try {
            const a = mgApi();
            const o = a && a.getLaunchOptionsSync ? a.getLaunchOptionsSync() : null;
            return o && typeof o.scene === 'number' ? o.scene : 0;
        } catch (e) { return 0; }
    }
}
