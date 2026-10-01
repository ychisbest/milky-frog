import { AudioClip, AudioSource, Node, resources } from 'cc';
import { Save } from './Save';

// 音频管理：音频文件位于 assets/resources/audio（由 tools/gen-audio.mjs 生成）
export class Sound {
    private static bgm: AudioSource;
    private static sfxSrc: AudioSource;
    private static clips = new Map<string, AudioClip>();
    private static last = new Map<string, number>();
    private static current = '';
    private static loaded = false;

    // 各音效的默认音量与最小触发间隔（秒），防止大量怪物同时被击中时音效堆叠
    private static readonly CFG: Record<string, [number, number]> = {
        hit: [0.4, 0.06], kill: [0.35, 0.05], crit: [0.5, 0.09], combo: [0.8, 0.3], bigkill: [1, 0.5], gem: [0.35, 0.05], coin: [0.6, 0.05],
        whip: [0.9, 0.05], shoot: [0.45, 0.05], knife: [0.45, 0.05], axe: [0.6, 0.08],
        lightning: [0.6, 0.1], hurt: [0.7, 0.15], click: [0.7, 0.03],
        eshot: [0.4, 0.08], slam: [0.9, 0.2], dash: [0.7, 0.15], laser: [0.8, 0.5], teleport: [0.7, 0.3], roar: [1, 1],
        fire: [0.5, 0.08], throw: [0.4, 0.06], splash: [0.5, 0.1], boom: [0.7, 0.07], freeze: [0.7, 0.2], zap: [0.6, 0.1],
        pew: [0.3, 0.05], power: [0.9, 0.3], card: [0.9, 0.2], achieve: [1, 0.5], croak: [0.9, 0.25],
    };

    static init(parent: Node) {
        const b = new Node('BGM');
        parent.addChild(b);
        this.bgm = b.addComponent(AudioSource);
        this.bgm.loop = true;
        this.bgm.volume = 0.45;
        const s = new Node('SFX');
        parent.addChild(s);
        this.sfxSrc = s.addComponent(AudioSource);
        resources.loadDir('audio', AudioClip, (err, list) => {
            if (err) { console.warn('[Sound] load failed', err); return; }
            for (const c of list) this.clips.set(c.name, c);
            this.loaded = true;
            const want = this.current;
            this.current = '';
            if (want) this.playBgm(want);
        });
    }

    static playBgm(name: string) {
        if (this.current === name && this.bgm.playing) return;
        this.current = name;
        if (!this.loaded) return;
        this.bgm.stop();
        const clip = this.clips.get(name);
        if (!clip || !Save.data.music) return;
        this.bgm.clip = clip;
        this.bgm.play();
    }

    static refreshMusic() {
        if (!Save.data.music) this.bgm.stop();
        else if (this.current) {
            const n = this.current;
            this.current = '';
            this.playBgm(n);
        }
    }

    static bgmPlaying() { return !!this.bgm && this.bgm.playing; }

    static pauseBgm() { if (this.bgm.playing) this.bgm.pause(); }
    static resumeBgm() { if (Save.data.music && this.bgm.clip && !this.bgm.playing) this.bgm.play(); }

    static play(name: string, vol?: number) {
        if (!Save.data.sfx || !this.loaded) return;
        const clip = this.clips.get(name);
        if (!clip) return;
        const cfg = this.CFG[name] || [0.7, 0.03];
        const now = Date.now() / 1000;
        if (now - (this.last.get(name) || 0) < cfg[1]) return;
        this.last.set(name, now);
        this.sfxSrc.playOneShot(clip, vol ?? cfg[0]);
    }
}

// 微信小游戏振动反馈
export function vibrate(heavy = false) {
    if (!Save.data.vibrate) return;
    const w = (globalThis as any).wx;
    try {
        if (w && w.vibrateShort) w.vibrateShort({ type: heavy ? 'heavy' : 'light' });
    } catch (e) { /* 忽略 */ }
}
