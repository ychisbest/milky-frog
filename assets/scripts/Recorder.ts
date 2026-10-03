// 抖音小游戏录屏：开局自动录制，结算时可"分享本局录屏"（不发放任何奖励）
// 抖音单段录屏最长 300 秒：录满自动续录，结算时取最近一段（太短则用上一段）
export class Recorder {
    private static rec: any = null;
    private static want = false;       // 本局是否需要录制
    private static segStart = 0;       // 当前段开始时间（毫秒）
    private static lastPath = '';      // 上一段完整录屏
    static videoPath = '';             // 可分享的录屏路径
    static onReady: () => void = () => {};  // 结算时录屏就绪（异步）

    static get supported() {
        const tt = (globalThis as any).tt;
        return !!(tt && tt.getGameRecorderManager);
    }

    static init() {
        if (!this.supported || this.rec) return;
        try {
            this.rec = (globalThis as any).tt.getGameRecorderManager();
            this.rec.onStop((res: any) => {
                const dur = (Date.now() - this.segStart) / 1000;
                const path = res && res.videoPath ? res.videoPath : '';
                // 太短的最后一段（< 15 秒）不如上一段精彩
                if (path) {
                    if (dur >= 15 || !this.lastPath) this.lastPath = path;
                    this.videoPath = this.lastPath;
                }
                if (this.want) this.begin(); // 录满 300 秒后继续录
                else this.onReady();
            });
            this.rec.onError(() => { this.want = false; });
        } catch (e) { this.rec = null; }
    }

    private static begin() {
        try {
            this.segStart = Date.now();
            this.rec.start({ duration: 300 });
        } catch (e) { /* 忽略 */ }
    }

    static start() {
        if (!this.rec) return;
        this.want = true;
        this.videoPath = this.lastPath = '';
        this.begin();
    }

    static pause() { try { if (this.rec && this.want) this.rec.pause(); } catch (e) { /* 忽略 */ } }
    static resume() { try { if (this.rec && this.want) this.rec.resume(); } catch (e) { /* 忽略 */ } }

    static stop() {
        if (!this.rec || !this.want) return;
        this.want = false;
        try { this.rec.stop(); } catch (e) { /* 忽略 */ }
    }

    static get ready() { return !!this.videoPath; }

    static share(title: string, cb: (ok: boolean) => void) {
        const tt = (globalThis as any).tt;
        if (!tt || !this.videoPath) { cb(false); return; }
        try {
            tt.shareAppMessage({
                channel: 'video',
                title,
                extra: { videoPath: this.videoPath, videoTopics: ['奶蛙割草', '小游戏'], hashtag_list: ['奶蛙割草', '小游戏'] },
                success: () => cb(true),
                fail: () => cb(false),
            });
        } catch (e) { cb(false); }
    }
}
