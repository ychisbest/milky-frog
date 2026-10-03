// 芯片音乐合成器：生成全部音效与背景音乐（WAV → MP3）
// 用法：node tools/gen-audio.mjs   （需要 lame）
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const SR = 44100;
const OUT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../assets/resources/audio');
fs.mkdirSync(OUT_DIR, { recursive: true });

const mtof = n => 440 * 2 ** ((n - 69) / 12);
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

function wave(type, ph, duty = 0.5) {
    const p = ph - Math.floor(ph);
    switch (type) {
        case 'square': return p < duty ? 0.6 : -0.6;
        case 'tri': return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
        case 'saw': return 2 * p - 1;
        case 'sine': return Math.sin(p * Math.PI * 2);
    }
    return 0;
}

// 在 buf 的 t0 处叠加一个音；freq 可以是函数 f(t)
function note(buf, t0, dur, freq, o = {}) {
    const { type = 'square', vol = 0.3, duty = 0.5, a = 0.004, d = 0, s = 1, r = 0.03, vib = 0, wrap = false } = o;
    const n = Math.floor((dur + r) * SR);
    const i0 = Math.floor(t0 * SR);
    let ph = 0;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        let env;
        if (t < a) env = t / a;
        else if (t < a + d) env = 1 - (1 - s) * ((t - a) / d);
        else if (t < dur) env = s;
        else env = s * (1 - (t - dur) / r);
        const f = (typeof freq === 'function' ? freq(t) : freq) * (vib ? 1 + Math.sin(t * 2 * Math.PI * 5.5) * vib * Math.min(1, t * 4) : 1);
        ph += f / SR;
        let idx = i0 + i;
        if (wrap) idx %= buf.length;
        else if (idx >= buf.length) break;
        buf[idx] += wave(type, ph, duty) * env * vol;
    }
}

// 采样保持噪声（类 FC 噪声通道）
function noise(buf, t0, dur, o = {}) {
    const { vol = 0.3, rate = 8000, rateEnd = rate, decay = 8, a = 0.001, wrap = false } = o;
    const n = Math.floor(dur * SR);
    const i0 = Math.floor(t0 * SR);
    let v = 0, acc = 1;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        const rt = rate + (rateEnd - rate) * (t / dur);
        acc += rt / SR;
        if (acc >= 1) { acc -= 1; v = rnd(); }
        const env = Math.min(1, t / a) * Math.exp(-t * decay);
        let idx = i0 + i;
        if (wrap) idx %= buf.length;
        else if (idx >= buf.length) break;
        buf[idx] += v * env * vol;
    }
}

const sweep = (f0, f1, dur) => t => f0 * (f1 / f0) ** Math.min(1, t / dur);

function save(name, buf, kbps = 96) {
    // 轻度压缩限幅
    let peak = 0;
    for (const v of buf) peak = Math.max(peak, Math.abs(v));
    const g = peak > 0.95 ? 0.95 / peak : 1;
    const pcm = Buffer.alloc(buf.length * 2);
    for (let i = 0; i < buf.length; i++) pcm.writeInt16LE(Math.round(Math.tanh(buf[i] * g) * 32000), i * 2);
    const hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8);
    hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
    hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
    hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
    const wav = path.join(os.tmpdir(), `sfx_${name}.wav`);
    fs.writeFileSync(wav, Buffer.concat([hdr, pcm]));
    execFileSync('lame', ['--silent', '-m', 'm', '-b', String(kbps), '--resample', '44.1', wav, path.join(OUT_DIR, name + '.mp3')]);
    fs.unlinkSync(wav);
    console.log('  ' + name + '.mp3', (buf.length / SR).toFixed(2) + 's');
}

const B = sec => new Float32Array(Math.ceil(sec * SR));

// ------------------------------------------------------------------ 音效
const SFX = {
    hit() {
        const b = B(0.09);
        noise(b, 0, 0.07, { vol: 0.45, rate: 9000, rateEnd: 1500, decay: 45 });
        note(b, 0, 0.05, sweep(260, 70, 0.05), { type: 'square', vol: 0.35, r: 0.01 });
        return b;
    },
    kill() {
        const b = B(0.16);
        note(b, 0, 0.1, sweep(900, 120, 0.1), { vol: 0.28, duty: 0.25, r: 0.02 });
        noise(b, 0, 0.14, { vol: 0.3, rate: 5000, rateEnd: 800, decay: 20 });
        note(b, 0, 0.06, sweep(120, 45, 0.06), { type: 'sine', vol: 0.5, r: 0.02 });
        return b;
    },
    crit() {
        const b = B(0.22);
        noise(b, 0, 0.12, { vol: 0.5, rate: 12000, rateEnd: 2500, decay: 25 });
        note(b, 0, 0.08, sweep(160, 50, 0.08), { type: 'sine', vol: 0.7, r: 0.03 });
        note(b, 0.01, 0.1, sweep(1800, 900, 0.1), { duty: 0.125, vol: 0.18, r: 0.04 });
        return b;
    },
    combo() {
        const b = B(0.7);
        [76, 79, 83, 88].forEach((n, i) => note(b, i * 0.05, 0.08, mtof(n), { duty: 0.25, vol: 0.2, r: 0.02 }));
        note(b, 0.2, 0.3, mtof(91), { duty: 0.25, vol: 0.18, vib: 0.015, r: 0.2 });
        noise(b, 0, 0.3, { vol: 0.15, rate: 3000, rateEnd: 12000, decay: 6 });
        return b;
    },
    fire() { const b = B(0.3); noise(b, 0, 0.28, { vol: 0.35, rate: 2000, rateEnd: 600, decay: 7, a: 0.02 }); note(b, 0, 0.2, sweep(300, 120, 0.2), { type: 'saw', vol: 0.12, r: 0.05 }); return b; },
    throw() { const b = B(0.16); noise(b, 0, 0.14, { vol: 0.25, rate: 4000, rateEnd: 9000, decay: 15, a: 0.02 }); return b; },
    splash() { const b = B(0.4); noise(b, 0, 0.35, { vol: 0.35, rate: 9000, rateEnd: 2500, decay: 9 }); note(b, 0, 0.12, sweep(900, 300, 0.12), { type: 'sine', vol: 0.2, r: 0.05 }); return b; },
    boom() {
        const b = B(0.6);
        noise(b, 0, 0.5, { vol: 0.6, rate: 3500, rateEnd: 250, decay: 6 });
        note(b, 0, 0.25, sweep(140, 35, 0.25), { type: 'sine', vol: 0.75, r: 0.1 });
        return b;
    },
    freeze() {
        const b = B(0.7);
        for (let i = 0; i < 6; i++) note(b, i * 0.04, 0.2, mtof(88 + (i % 3) * 4), { type: 'sine', vol: 0.12, r: 0.2 });
        noise(b, 0, 0.5, { vol: 0.2, rate: 14000, rateEnd: 6000, decay: 5 });
        return b;
    },
    zap() {
        const b = B(0.35);
        noise(b, 0, 0.3, { vol: 0.45, rate: 16000, rateEnd: 3000, decay: 8 });
        note(b, 0, 0.25, t => 400 + Math.sin(t * 300) * 200, { type: 'square', duty: 0.25, vol: 0.12, r: 0.05 });
        return b;
    },
    pew() { const b = B(0.08); note(b, 0, 0.05, sweep(2000, 900, 0.05), { type: 'sine', vol: 0.18, r: 0.02 }); return b; },
    power() {
        const b = B(0.7);
        note(b, 0, 0.5, sweep(200, 800, 0.5), { duty: 0.25, vol: 0.15, vib: 0.03, r: 0.1 });
        [72, 76, 79].forEach((n, i) => note(b, 0.3 + i * 0.06, 0.15, mtof(n + 12), { type: 'sine', vol: 0.2, r: 0.1 }));
        return b;
    },
    card() {
        const b = B(0.9);
        [79, 83, 86, 91].forEach((n, i) => note(b, i * 0.07, 0.4, mtof(n), { type: 'sine', vol: 0.15, r: 0.3 }));
        noise(b, 0, 0.5, { vol: 0.08, rate: 12000, decay: 4 });
        return b;
    },
    achieve() {
        const b = B(1.3);
        [[72, 0], [76, 0.1], [79, 0.2], [84, 0.3]].forEach(([n, t]) => note(b, t, 0.12, mtof(n), { duty: 0.25, vol: 0.2, r: 0.02 }));
        for (const n of [84, 88, 91]) note(b, 0.45, 0.6, mtof(n), { duty: 0.5, vol: 0.08, vib: 0.01, r: 0.25 });
        return b;
    },
    // 奶蛙"呱"：两声带颤音的低沉叫声
    croak() {
        const b = B(0.45);
        for (const [t0, f0] of [[0, 230], [0.17, 190]]) {
            note(b, t0, 0.12, t => f0 * (1 - t * 1.6) + Math.sin(t * 2 * Math.PI * 38) * 18, { type: 'saw', vol: 0.32, a: 0.008, r: 0.04 });
            note(b, t0, 0.12, t => f0 * 2.02 * (1 - t * 1.6), { type: 'square', duty: 0.3, vol: 0.08, a: 0.008, r: 0.04 });
            noise(b, t0, 0.05, { vol: 0.12, rate: 3000, decay: 40 });
        }
        return b;
    },
    roar() {
        const b = B(1.6);
        note(b, 0, 1.3, t => 70 + Math.sin(t * 30) * 8 - t * 20, { type: 'saw', vol: 0.45, a: 0.08, r: 0.3 });
        note(b, 0, 1.3, t => 105 + Math.sin(t * 23) * 10 - t * 30, { type: 'square', vol: 0.18, a: 0.08, r: 0.3 });
        noise(b, 0, 1.4, { vol: 0.35, rate: 1500, rateEnd: 400, decay: 1.5, a: 0.1 });
        return b;
    },
    slam() {
        const b = B(0.7);
        note(b, 0, 0.4, sweep(110, 30, 0.4), { type: 'sine', vol: 0.9, r: 0.2 });
        noise(b, 0, 0.6, { vol: 0.5, rate: 2500, rateEnd: 300, decay: 5 });
        return b;
    },
    eshot() { const b = B(0.14); note(b, 0, 0.1, sweep(600, 250, 0.1), { duty: 0.5, vol: 0.2, r: 0.03 }); noise(b, 0, 0.06, { vol: 0.12, rate: 8000, decay: 40 }); return b; },
    dash() { const b = B(0.35); noise(b, 0, 0.3, { vol: 0.5, rate: 1200, rateEnd: 9000, decay: 6, a: 0.04 }); note(b, 0, 0.2, sweep(200, 600, 0.2), { type: 'saw', vol: 0.12, r: 0.05 }); return b; },
    laser() {
        const b = B(2.8);
        note(b, 0, 1.0, sweep(200, 900, 1.0), { type: 'square', duty: 0.25, vol: 0.12, r: 0.02 });
        note(b, 1.0, 1.6, t => 140 + Math.sin(t * 60) * 20, { type: 'saw', vol: 0.3, r: 0.2 });
        noise(b, 1.0, 1.7, { vol: 0.3, rate: 6000, decay: 0.8 });
        return b;
    },
    teleport() { const b = B(0.5); note(b, 0, 0.4, sweep(1500, 200, 0.4), { type: 'sine', vol: 0.3, vib: 0.05, r: 0.05 }); noise(b, 0, 0.3, { vol: 0.15, rate: 12000, rateEnd: 2000, decay: 8 }); return b; },
    bigkill() {
        const b = B(1.4);
        noise(b, 0, 1.2, { vol: 0.7, rate: 4000, rateEnd: 300, decay: 3.5 });
        note(b, 0, 0.8, sweep(120, 30, 0.8), { type: 'sine', vol: 0.8, r: 0.3 });
        note(b, 0, 0.5, sweep(400, 60, 0.5), { type: 'square', vol: 0.2, r: 0.1 });
        return b;
    },
    whip() { const b = B(0.2); noise(b, 0, 0.18, { vol: 0.4, rate: 2000, rateEnd: 12000, decay: 14, a: 0.05 }); return b; },
    shoot() { const b = B(0.12); note(b, 0, 0.09, sweep(1400, 350, 0.09), { vol: 0.22, duty: 0.25, r: 0.02 }); return b; },
    knife() { const b = B(0.1); noise(b, 0, 0.08, { vol: 0.3, rate: 14000, decay: 30 }); note(b, 0, 0.03, 1800, { vol: 0.1, r: 0.01 }); return b; },
    axe() { const b = B(0.2); note(b, 0, 0.15, sweep(320, 140, 0.15), { type: 'tri', vol: 0.5, r: 0.03 }); noise(b, 0, 0.15, { vol: 0.15, rate: 3000, decay: 15 }); return b; },
    lightning() { const b = B(0.5); noise(b, 0, 0.45, { vol: 0.55, rate: 9000, rateEnd: 600, decay: 7 }); note(b, 0, 0.3, sweep(90, 40, 0.3), { vol: 0.3, r: 0.1 }); return b; },
    gem() { const b = B(0.09); note(b, 0, 0.03, 1320, { vol: 0.18, duty: 0.25, r: 0.005 }); note(b, 0.03, 0.04, 1980, { vol: 0.18, duty: 0.25, r: 0.02 }); return b; },
    coin() { const b = B(0.4); note(b, 0, 0.06, mtof(83), { vol: 0.22, duty: 0.5, r: 0.005 }); note(b, 0.06, 0.05, mtof(88), { vol: 0.22, d: 0.3, s: 0, r: 0.01 }); return b; },
    levelup() {
        const b = B(0.8);
        [72, 76, 79, 84, 88].forEach((n, i) => note(b, i * 0.07, 0.07, mtof(n), { vol: 0.22, duty: 0.25, r: 0.01 }));
        note(b, 0.35, 0.3, mtof(91), { vol: 0.2, duty: 0.25, vib: 0.01, r: 0.15 });
        note(b, 0.35, 0.3, mtof(84), { type: 'tri', vol: 0.3, r: 0.15 });
        return b;
    },
    hurt() { const b = B(0.22); note(b, 0, 0.18, sweep(180, 70, 0.18), { vol: 0.35, duty: 0.5, r: 0.03 }); noise(b, 0, 0.12, { vol: 0.25, rate: 3000, decay: 20 }); return b; },
    chest() {
        const b = B(1.3);
        [67, 72, 76, 79].forEach((n, i) => note(b, i * 0.1, 0.09, mtof(n), { vol: 0.22, r: 0.01 }));
        for (const n of [72, 76, 79, 84]) note(b, 0.42, 0.55, mtof(n), { vol: 0.12, duty: 0.25, vib: 0.008, r: 0.3 });
        note(b, 0.42, 0.55, mtof(48), { type: 'tri', vol: 0.4, r: 0.3 });
        return b;
    },
    evolve() {
        const b = B(1.6);
        note(b, 0, 0.9, sweep(300, 1600, 0.9), { type: 'square', duty: 0.25, vol: 0.15, r: 0.05 });
        for (let i = 0; i < 10; i++) note(b, 0.1 + i * 0.09, 0.05, mtof(84 + (i % 5) * 3), { type: 'sine', vol: 0.15, r: 0.05 });
        for (const n of [72, 76, 79, 83]) note(b, 0.95, 0.4, mtof(n), { vol: 0.1, duty: 0.25, r: 0.25 });
        return b;
    },
    click() { const b = B(0.05); note(b, 0, 0.02, 900, { vol: 0.2, duty: 0.25, r: 0.01 }); return b; },
    boss() {
        const b = B(1.7);
        for (let i = 0; i < 6; i++) note(b, i * 0.25, 0.22, i % 2 ? 440 : 587, { type: 'saw', vol: 0.18, r: 0.03 });
        note(b, 0, 1.5, 55, { type: 'tri', vol: 0.45, r: 0.2 });
        return b;
    },
    heal() { const b = B(0.4); [72, 76, 79, 84].forEach((n, i) => note(b, i * 0.06, 0.08, mtof(n), { type: 'sine', vol: 0.3, r: 0.06 })); return b; },
    gameover() {
        const b = B(2.2);
        [69, 65, 62, 57].forEach((n, i) => note(b, i * 0.4, 0.38, mtof(n), { vol: 0.2, duty: 0.5, vib: 0.01, r: 0.05 }));
        note(b, 1.6, 0.5, mtof(45), { type: 'tri', vol: 0.45, r: 0.3 });
        return b;
    },
    win() {
        const b = B(2.4);
        const mel = [[72, 0.15], [72, 0.15], [72, 0.15], [72, 0.45], [68, 0.45], [70, 0.45], [72, 0.3], [70, 0.15], [72, 0.9]];
        let t = 0;
        for (const [n, d] of mel) { note(b, t, d * 0.9, mtof(n), { vol: 0.22, duty: 0.5, vib: 0.006, r: 0.03 }); t += d; }
        note(b, 0, 2.0, mtof(48), { type: 'tri', vol: 0.3, r: 0.3 });
        return b;
    },
    revive() {
        const b = B(1.2);
        note(b, 0, 0.8, sweep(200, 1200, 0.8), { type: 'sine', vol: 0.3, r: 0.1 });
        [72, 79, 84].forEach((n, i) => note(b, 0.5 + i * 0.1, 0.3, mtof(n), { vol: 0.12, duty: 0.25, r: 0.2 }));
        return b;
    },
    start() {
        const b = B(0.7);
        noise(b, 0, 0.3, { vol: 0.25, rate: 1500, rateEnd: 9000, decay: 6, a: 0.1 });
        [57, 64, 69].forEach(n => note(b, 0.25, 0.3, mtof(n), { vol: 0.12, duty: 0.25, r: 0.15 }));
        return b;
    },    // 棱镜激光：短促明亮的"啾——"，0.18 秒，与光束动画（0.2 秒）同步
    beam() {
        const b = B(0.2);
        note(b, 0, 0.12, sweep(1800, 900, 0.12), { type: 'sine', vol: 0.22, a: 0.002, r: 0.05 });
        note(b, 0, 0.1, sweep(3600, 1800, 0.1), { type: 'square', duty: 0.125, vol: 0.04, r: 0.03 });
        noise(b, 0, 0.12, { vol: 0.06, rate: 18000, rateEnd: 9000, decay: 30 });
        return b;
    },
    // 奶蛙倒下：三连下行音 + 轻柔的"噗"
    faint() {
        const b = B(1.0);
        [76, 72, 67].forEach((n, i) => note(b, i * 0.16, 0.14, mtof(n), { type: 'square', duty: 0.25, vol: 0.14, r: 0.05 }));
        note(b, 0.5, 0.35, sweep(300, 90, 0.35), { type: 'tri', vol: 0.35, r: 0.1 });
        noise(b, 0.5, 0.3, { vol: 0.12, rate: 3000, rateEnd: 800, decay: 6 });
        return b;
    },

};

// ------------------------------------------------------------------ 背景音乐
function bgmBattle() {
    const bpm = 150, st = 60 / bpm / 4; // 16 分音符
    const bars = 16, len = bars * 16 * st;
    const b = new Float32Array(Math.round(len * SR));
    const roots = [45, 41, 48, 43, 45, 41, 48, 43, 38, 45, 40, 45, 41, 43, 40, 40];
    const minor = [1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0];
    // 主旋律：数字=音高，h=延音，-=休止；每格 8 分音符
    const H = 'h', R = '-';
    const lead = [
        [69, R, 72, R, 76, 74, 72, 71], [69, H, H, H, 65, H, 69, 72], [67, R, 72, R, 76, R, 79, 76], [74, H, H, H, 71, H, 67, 71],
        [69, R, 72, R, 76, 74, 72, 71], [69, H, H, H, 65, H, 69, 72], [67, R, 72, R, 76, R, 79, 76], [74, H, 72, H, 71, H, 67, H],
        [74, R, 77, R, 81, H, 79, 77], [76, H, H, H, 72, H, 69, 72], [71, R, 76, R, 80, H, 78, 76], [81, H, H, H, H, H, 76, H],
        [77, 76, 74, 72, 69, H, 72, H], [71, 72, 74, H, 79, H, 77, H], [76, H, 80, H, 83, H, 80, H], [76, H, H, H, H, H, R, R],
    ];
    for (let bar = 0; bar < bars; bar++) {
        const t0 = bar * 16 * st, r = roots[bar];
        const third = minor[bar] ? 3 : 4;
        // 低音：八度跳跃
        for (let i = 0; i < 8; i++) note(b, t0 + i * 2 * st, st * 1.6, mtof(r + (i % 2 ? 12 : 0)), { type: 'tri', vol: 0.42, r: 0.02, wrap: true });
        // 琶音（第 5 小节起）
        if (bar >= 4) {
            const arp = [0, third, 7, 12, 7, third, 0, third];
            for (let i = 0; i < 16; i++) note(b, t0 + i * st, st * 0.8, mtof(r + 24 + arp[i % 8]), { duty: 0.125, vol: 0.06, r: 0.01, wrap: true });
        }
        // 鼓
        for (let i = 0; i < 16; i++) {
            const t = t0 + i * st;
            if (i === 0 || i === 8 || (i === 10 && bar % 2)) note(b, t, 0.08, sweep(150, 40, 0.08), { type: 'sine', vol: 0.55, r: 0.02, wrap: true });
            if (i === 4 || i === 12) noise(b, t, 0.12, { vol: 0.28, rate: 7000, decay: 22, wrap: true });
            if (i % 2 === 0) noise(b, t, 0.03, { vol: 0.07, rate: 20000, decay: 80, wrap: true });
        }
        // 旋律
        const ph = lead[bar];
        for (let i = 0; i < 8; i++) {
            const n = ph[i];
            if (n === H || n === R) continue;
            let d = 1;
            while (i + d < 8 && ph[i + d] === H) d++;
            note(b, t0 + i * 2 * st, d * 2 * st * 0.92, mtof(n), { duty: 0.25, vol: 0.16, a: 0.005, d: 0.08, s: 0.75, vib: d > 2 ? 0.008 : 0, r: 0.03, wrap: true });
        }
    }
    return b;
}

function bgmMenu() {
    const bpm = 84, e8 = 60 / bpm / 2;
    const bars = 8, len = bars * 8 * e8;
    const b = new Float32Array(Math.round(len * SR));
    const chords = [[57, 60, 64], [50, 53, 57], [55, 59, 62], [48, 52, 55], [53, 57, 60], [50, 53, 57], [52, 56, 59], [52, 56, 59]];
    for (let bar = 0; bar < bars; bar++) {
        const t0 = bar * 8 * e8, ch = chords[bar];
        // 柔和铺底
        for (const n of ch) note(b, t0, 8 * e8 * 0.95, mtof(n), { type: 'tri', vol: 0.09, a: 0.4, r: 0.4, wrap: true });
        note(b, t0, 4 * e8, mtof(ch[0] - 12), { type: 'tri', vol: 0.35, a: 0.02, r: 0.2, wrap: true });
        note(b, t0 + 4 * e8, 4 * e8, mtof(ch[0] - 12), { type: 'tri', vol: 0.3, a: 0.02, r: 0.2, wrap: true });
        // 铃声琶音
        const pat = [0, 1, 2, 1, 0, 2, 1, 2];
        for (let i = 0; i < 8; i++) {
            const n = ch[pat[i]] + 12 + (i === 5 ? 12 : 0);
            note(b, t0 + i * e8, 0.05, mtof(n), { type: 'sine', vol: 0.16, a: 0.002, r: 0.5, wrap: true });
            note(b, t0 + i * e8, 0.03, mtof(n), { duty: 0.125, vol: 0.03, r: 0.2, wrap: true });
        }
    }
    return b;
}

function bgmBoss() {
    const bpm = 168, st = 60 / bpm / 4;
    const bars = 8, len = bars * 16 * st;
    const b = new Float32Array(Math.round(len * SR));
    const roots = [40, 40, 41, 41, 40, 40, 43, 42];
    for (let bar = 0; bar < bars; bar++) {
        const t0 = bar * 16 * st, r = roots[bar];
        for (let i = 0; i < 16; i++) {
            note(b, t0 + i * st, st * 0.7, mtof(r + (i % 4 === 3 ? 12 : 0)), { type: 'tri', vol: 0.45, r: 0.01, wrap: true });
            if (i % 4 === 0) note(b, t0 + i * st, 0.07, sweep(160, 40, 0.07), { type: 'sine', vol: 0.6, r: 0.02, wrap: true });
            if (i % 8 === 4) noise(b, t0 + i * st, 0.12, { vol: 0.3, rate: 7000, decay: 22, wrap: true });
            noise(b, t0 + i * st, 0.02, { vol: 0.05, rate: 20000, decay: 90, wrap: true });
        }
        const riff = [0, 1, 0, 3, 0, 6, 5, 3];
        for (let i = 0; i < 8; i++) {
            note(b, t0 + i * 2 * st, st * 1.7, mtof(r + 24 + riff[(i + bar) % 8]), { type: 'saw', vol: 0.07, r: 0.02, wrap: true });
            note(b, t0 + i * 2 * st, st * 1.7, mtof(r + 36 + riff[(i + bar) % 8]), { duty: 0.25, vol: 0.06, r: 0.02, wrap: true });
        }
    }
    return b;
}

console.log('生成音效 →', OUT_DIR);
// ONLY=beam,faint 只生成指定音效（不改动其他已有音频）
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const k in SFX) if (!ONLY || ONLY.includes(k)) save(k, SFX[k](), 96);
if (ONLY) process.exit(0);
console.log('生成背景音乐');
save('bgm_battle', bgmBattle(), 64);
save('bgm_menu', bgmMenu(), 64);
save('bgm_boss', bgmBoss(), 64);
