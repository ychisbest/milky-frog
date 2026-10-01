import { HERO_ART } from './HeroArt';

// 纯数据的像素画生成器（不依赖 cc），所有贴图都在这里程序化绘制并打包成图集。
// 坐标系：左上角为原点，y 向下。

export class PixelCanvas {
    w: number;
    h: number;
    data: Uint8Array;

    constructor(w: number, h: number) {
        this.w = w;
        this.h = h;
        this.data = new Uint8Array(w * h * 4);
    }

    px(x: number, y: number, c: number, a = 255) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = (y * this.w + x) * 4;
        this.data[i] = (c >> 16) & 255;
        this.data[i + 1] = (c >> 8) & 255;
        this.data[i + 2] = c & 255;
        this.data[i + 3] = a;
    }

    alpha(x: number, y: number) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
        return this.data[(y * this.w + x) * 4 + 3];
    }

    clear(x: number, y: number) {
        this.px(x, y, 0, 0);
    }

    rect(x: number, y: number, w: number, h: number, c: number, a = 255) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a);
    }

    ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a = 255) {
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
            for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
                const dx = (x + 0.5 - cx) / rx;
                const dy = (y + 0.5 - cy) / ry;
                if (dx * dx + dy * dy <= 1) this.px(x, y, c, a);
            }
        }
    }

    circle(cx: number, cy: number, r: number, c: number, a = 255) {
        this.ellipse(cx, cy, r, r, c, a);
    }

    ring(cx: number, cy: number, r: number, t: number, c: number, a = 255) {
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
            for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
                const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
                if (d <= r && d > r - t) this.px(x, y, c, a);
            }
        }
    }

    line(x0: number, y0: number, x1: number, y1: number, c: number, a = 255, thick = 1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) {
            const x = Math.round(x0 + ((x1 - x0) * i) / n);
            const y = Math.round(y0 + ((y1 - y0) * i) / n);
            if (thick === 1) this.px(x, y, c, a);
            else this.rect(x - (thick >> 1), y - (thick >> 1), thick, thick, c, a);
        }
    }

    // 扫描线填充多边形
    poly(pts: number[][], c: number, a = 255) {
        let minY = Infinity, maxY = -Infinity;
        for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
        for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
            const yc = y + 0.5;
            const xs: number[] = [];
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i], q = pts[(i + 1) % pts.length];
                if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) {
                    xs.push(p[0] + ((yc - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
                }
            }
            xs.sort((m, n) => m - n);
            for (let k = 0; k + 1 < xs.length; k += 2) {
                for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c, a);
            }
        }
    }

    // 在不透明像素周围描边
    outline(c: number, a = 255) {
        const mark: number[] = [];
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (this.alpha(x, y) > 0) continue;
                if (this.alpha(x - 1, y) > 100 || this.alpha(x + 1, y) > 100 || this.alpha(x, y - 1) > 100 || this.alpha(x, y + 1) > 100) mark.push(x, y);
            }
        }
        for (let i = 0; i < mark.length; i += 2) this.px(mark[i], mark[i + 1], c, a);
    }
}

// 确定性随机数
export function rng(seed: number) {
    let s = seed >>> 0 || 1;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
}

const OUT = 0x1a1020;

// ---------------------------------------------------------------- 角色

// 角色列表（与 Defs.ts 中 CHARACTERS 的 sprite 对应：hero_<kind>_<帧>）
export const HERO_KINDS = ['hunter', 'mage', 'rogue', 'knight', 'nun', 'pyro', 'bomber', 'sage'];

// ---------------------------------------------------------------- 奶蛙（主角）
// 角色像素图由 tools/import-heroes.py 从参考图导入（HeroArt.ts），这里解码并生成走路帧

function decodeHero(a: { w: number; h: number; pal: string; px: string }) {
    const c = new PixelCanvas(a.w, a.h);
    const pal = a.pal.split(',').map(h => parseInt(h, 16));
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_{|}~';
    let i = 0, k = 0;
    const s = a.px;
    while (i < s.length) {
        const ch = s[i++];
        let n = 0;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') n = n * 10 + (s.charCodeAt(i++) - 48);
        if (n === 0) n = 1;
        const idx = ch === '.' ? -1 : ALPHA.indexOf(ch);
        for (let m = 0; m < n; m++, k++) if (idx >= 0) c.px(k % a.w, Math.floor(k / a.w), pal[idx]);
    }
    return c;
}

// 以脚底为锚点缩放（走路的挤压 / 拉伸），所有帧画布尺寸一致，避免抖动
function heroFrame(src: PixelCanvas, sx: number, sy: number) {
    const w = Math.ceil(src.w * 1.06) + 2, h = Math.ceil(src.h * 1.04) + 1;
    const c = new PixelCanvas(w, h);
    const cx = w / 2, bottom = h;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const u = Math.floor((x + 0.5 - cx) / sx + src.w / 2);
            const v = Math.floor(src.h - (bottom - y - 0.5) / sy);
            if (u < 0 || v < 0 || u >= src.w || v >= src.h) continue;
            const i = (v * src.w + u) * 4;
            if (!src.data[i + 3]) continue;
            const o = (y * w + x) * 4;
            c.data[o] = src.data[i]; c.data[o + 1] = src.data[i + 1]; c.data[o + 2] = src.data[i + 2]; c.data[o + 3] = 255;
        }
    }
    return c;
}

function drawBat(f: number) {
    const c = new PixelCanvas(32, 32);
    const B = 0x6a3fa0, BD = 0x432566, BL = 0x9a70d0;
    if (f === 0) {
        c.poly([[13, 15], [2, 6], [4, 12], [3, 17], [8, 15], [10, 19]], BD);
        c.poly([[19, 15], [30, 6], [28, 12], [29, 17], [24, 15], [22, 19]], BD);
        c.line(13, 15, 3, 7, B);
        c.line(19, 15, 29, 7, B);
    } else {
        c.poly([[13, 15], [3, 24], [6, 22], [8, 25], [10, 21], [12, 22]], BD);
        c.poly([[19, 15], [29, 24], [26, 22], [24, 25], [22, 21], [20, 22]], BD);
        c.line(13, 16, 4, 23, B);
        c.line(19, 16, 28, 23, B);
    }
    c.ellipse(16, 16, 4.5, 5.5, B);
    c.ellipse(16, 18, 2.5, 3, BL);
    c.px(13, 10, B); c.px(13, 11, B); c.px(19, 10, B); c.px(19, 11, B);
    c.px(14, 15, 0xff4040); c.px(18, 15, 0xff4040);
    c.px(15, 19, 0xffffff); c.px(17, 19, 0xffffff);
    c.outline(OUT);
    return c;
}

function drawRat(f: number) {
    const c = new PixelCanvas(32, 32);
    const G = 0x8a8090, GD = 0x5e5666, GL = 0xb0a8b8, PINK = 0xe89aa8;
    // 尾巴
    if (f === 0) { c.line(9, 23, 5, 21, PINK); c.line(5, 21, 3, 17, PINK); }
    else { c.line(9, 23, 5, 24, PINK); c.line(5, 24, 2, 21, PINK); }
    // 腿
    const la = f === 0 ? 0 : 1;
    c.rect(11 + la, 25, 2, 2, GD);
    c.rect(19 - la, 25, 2, 2, GD);
    // 身体
    c.ellipse(15, 22, 7, 4.5, G);
    c.ellipse(15, 24, 5, 2, GD);
    c.ellipse(13, 20, 3, 1.5, GL);
    // 头
    c.ellipse(22, 20, 4.5, 3.5, G);
    c.px(26, 21, PINK);
    c.px(27, 21, PINK);
    c.circle(20.5, 16.5, 2, G);
    c.px(20, 16, PINK);
    c.px(24, 19, 0xff3030);
    c.px(25, 23, 0xffffff);
    c.outline(OUT);
    return c;
}

// 受击白色剪影
function silhouette(src: PixelCanvas) {
    const c = new PixelCanvas(src.w, src.h);
    for (let i = 0; i < src.data.length; i += 4) {
        if (!src.data[i + 3]) continue;
        c.data[i] = c.data[i + 1] = c.data[i + 2] = 255;
        c.data[i + 3] = src.data[i + 3];
    }
    return c;
}

function drawSlime(f: number) {
    const c = new PixelCanvas(32, 32);
    const G = 0x4fc24f, GD = 0x2a8a3a, GL = 0xa8f0a0;
    if (f === 0) {
        c.ellipse(16, 22, 10, 8, GD);
        c.ellipse(16, 21, 9.5, 7.5, G);
    } else {
        c.ellipse(16, 23, 11.5, 6.5, GD);
        c.ellipse(16, 22, 11, 6, G);
    }
    c.ellipse(12, 18 + f, 3, 2, GL);
    c.px(11, 17 + f, 0xffffff);
    c.rect(13, 21 + f, 2, 3, OUT);
    c.rect(19, 21 + f, 2, 3, OUT);
    c.px(13, 21 + f, 0xffffff);
    c.px(19, 21 + f, 0xffffff);
    c.outline(OUT);
    return c;
}

function drawZombie(f: number) {
    const c = new PixelCanvas(32, 32);
    const S = 0x8ab872, SD = 0x5a8a4e, SH = 0x7a5aa0, SHD = 0x52386e, P = 0x5a4a32, PD = 0x3e3222;
    const la = f === 0 ? -1 : 1;
    c.rect(13 + la, 23, 3, 6, PD);
    c.rect(17 - la, 23, 3, 6, P);
    c.rect(12, 15, 9, 8, SH);
    c.rect(12, 15, 2, 8, SHD);
    c.px(14, 22, SD); c.px(18, 21, SD); c.px(20, 22, SD); // 破洞
    // 头
    c.rect(13, 6, 8, 9, S);
    c.rect(13, 6, 1, 9, SD);
    c.rect(13, 5, 7, 2, 0x3a5a2a);
    c.px(15, 4, 0x3a5a2a);
    c.px(18, 4, 0x3a5a2a);
    c.rect(17, 9, 2, 2, 0xf0e040);
    c.px(18, 10, OUT);
    c.rect(20, 9, 1, 2, 0xf0e040);
    c.rect(17, 13, 4, 1, 0x2a3a20);
    // 前伸的手臂
    const ay = f === 0 ? 0 : 1;
    c.rect(17, 16 + ay, 9, 3, SH);
    c.rect(25, 16 + ay, 3, 3, S);
    c.rect(15, 18 - ay, 8, 2, SHD);
    c.rect(23, 18 - ay, 3, 2, SD);
    c.outline(OUT);
    return c;
}

function drawSkeleton(f: number) {
    const c = new PixelCanvas(32, 32);
    const B = 0xeee8d4, BD = 0xb0a890;
    const la = f === 0 ? -1 : 1;
    // 腿
    c.rect(14 + la, 23, 2, 5, BD);
    c.rect(18 - la, 23, 2, 5, B);
    c.rect(13 + la, 28, 3, 1, BD);
    c.rect(18 - la, 28, 3, 1, B);
    // 骨盆
    c.rect(13, 21, 7, 2, B);
    // 脊柱与肋骨
    c.rect(16, 14, 1, 7, BD);
    for (let i = 0; i < 3; i++) c.rect(13, 15 + i * 2, 7, 1, B);
    // 手臂
    const ay = f === 0 ? 0 : 1;
    c.rect(11, 15, 1, 6 - ay, BD);
    c.rect(21, 15, 1, 5 + ay, B);
    c.rect(21, 20 + ay, 2, 1, B);
    // 头骨
    c.rect(12, 4, 10, 8, B);
    c.rect(12, 4, 1, 8, BD);
    c.rect(14, 12, 7, 2, B);
    c.rect(15, 7, 2, 3, OUT);
    c.rect(19, 7, 2, 3, OUT);
    c.px(15, 7, 0xff3030);
    c.px(19, 7, 0xff3030);
    c.px(18, 10, OUT);
    c.px(15, 13, OUT); c.px(17, 13, OUT); c.px(19, 13, OUT);
    c.outline(OUT);
    return c;
}

function drawGhost(f: number) {
    const c = new PixelCanvas(32, 32);
    const W = 0xdfe8ff, WD = 0xa0b0e0;
    c.circle(16, 13, 8.5, W, 220);
    c.rect(8, 13, 17, 11, W, 220);
    c.rect(8, 13, 3, 11, WD, 220);
    for (let x = 8; x < 25; x++) {
        const h = ((x + f * 2) >> 1) % 2 === 0 ? 2 : 0;
        c.rect(x, 24, 1, h, W, 220);
    }
    c.ellipse(13, 13, 1.5, 2.5, OUT);
    c.ellipse(19, 13, 1.5, 2.5, OUT);
    c.ellipse(16, 18, 1.5, 1.5 + f * 0.5, OUT);
    c.outline(0x2a2a5a, 200);
    return c;
}

function drawReaper(f: number) {
    const c = new PixelCanvas(48, 48);
    const R = 0x3a2a58, RD = 0x221636, RL = 0x5a4482, BONE = 0xe8e2d0;
    // 镰刀柄
    c.line(36, 6, 28, 44, 0x6b4a2a, 255, 2);
    // 镰刃
    c.poly([[36, 5], [22, 3], [12, 8], [8, 15], [17, 9], [27, 7], [36, 8]], 0xc8d0dc);
    c.line(12, 8, 22, 4, 0xffffff);
    // 斗篷
    c.poly([[24, 6], [32, 12], [35, 30], [38, 44], [10, 44], [13, 30], [16, 12]], R);
    c.poly([[16, 12], [13, 30], [10, 44], [16, 44], [17, 28]], RD);
    for (let x = 10; x < 38; x += 4) c.rect(x + (f ? 2 : 0), 43, 2, 2, RD);
    c.rect(30, 14, 2, 18, RL);
    // 兜帽内脸
    c.ellipse(25, 15, 5, 6, 0x0c0612);
    c.ellipse(25, 16, 3.5, 4, BONE);
    c.rect(23, 15, 2, 2, 0x0c0612);
    c.rect(26, 15, 2, 2, 0x0c0612);
    c.px(23, 15, f ? 0xff2020 : 0xff8040);
    c.px(26, 15, f ? 0xff2020 : 0xff8040);
    // 骨手
    c.rect(29, 24, 4, 3, BONE);
    c.outline(OUT);
    return c;
}

// ---------------------------------------------------------------- Boss（48x48）

function drawSlimeKing(f: number) {
    const c = new PixelCanvas(48, 48);
    const G = 0x3fae4a, GD = 0x23763a, GL = 0x9ff09a, GOLD = 0xf5c542;
    const rx = f ? 22 : 20, ry = f ? 13 : 15, cy = f ? 34 : 33;
    c.ellipse(24, cy + 1, rx, ry, GD);
    c.ellipse(24, cy, rx - 0.5, ry - 0.5, G);
    c.ellipse(15, cy - 6, 5, 3, GL);
    c.px(13, cy - 8, 0xffffff);
    c.rect(16, cy - 2, 4, 5, OUT);
    c.rect(28, cy - 2, 4, 5, OUT);
    c.px(17, cy - 1, 0xffffff);
    c.px(29, cy - 1, 0xffffff);
    c.line(14, cy - 6, 20, cy - 4, OUT);
    c.line(34, cy - 6, 28, cy - 4, OUT);
    c.rect(20, cy + 6, 8, 2, OUT);
    c.px(21, cy + 8, 0xffffff);
    c.px(26, cy + 8, 0xffffff);
    const ty = cy - ry - 5;
    c.poly([[15, ty + 5], [15, ty - 2], [19, ty + 2], [24, ty - 4], [29, ty + 2], [33, ty - 2], [33, ty + 5]], GOLD);
    c.rect(15, ty + 4, 18, 4, GOLD);
    c.rect(15, ty + 7, 18, 1, 0xc89020);
    c.px(24, ty + 5, 0xe03040);
    c.px(19, ty + 5, 0x40a0ff);
    c.px(29, ty + 5, 0x40a0ff);
    c.outline(OUT);
    return c;
}

function drawBoneLord(f: number) {
    const c = new PixelCanvas(48, 48);
    const B = 0xeee8d4, BD = 0xb0a890, IRON = 0x5a5a6a, IRONL = 0x8a8a9a, CAPE = 0x8a1c24;
    const la = f ? 1 : -1, sy = f ? 1 : 0;
    c.poly([[14, 19], [34, 19], [36, 41], [31, 39], [27, 42], [22, 39], [17, 42], [12, 40]], CAPE);
    c.rect(19 + la, 34, 3, 9, BD);
    c.rect(26 - la, 34, 3, 9, B);
    c.rect(17 + la, 43, 5, 2, IRON);
    c.rect(26 - la, 43, 5, 2, IRON);
    c.rect(17, 31, 14, 3, B);
    c.rect(23, 19, 2, 12, BD);
    for (let i = 0; i < 4; i++) c.rect(18, 20 + i * 3, 12, 1, B);
    c.rect(11, 21, 2, 10, BD);
    c.rect(34, 21, 2, 8, B);
    c.ellipse(15, 19, 5, 3.5, IRON);
    c.ellipse(33, 19, 5, 3.5, IRON);
    c.px(13, 17, IRONL);
    c.px(31, 17, IRONL);
    // 巨剑
    c.line(36, 30 + sy, 45, 4 + sy, 0xc8d0dc, 255, 3);
    c.line(36, 30 + sy, 45, 4 + sy, 0xffffff);
    c.rect(32, 28 + sy, 8, 2, 0xf5c542);
    c.rect(34, 30 + sy, 2, 4, 0x6b3a1f);
    // 头骨 + 角盔
    c.rect(17, 6, 14, 11, B);
    c.rect(17, 6, 2, 11, BD);
    c.rect(19, 16, 10, 3, B);
    c.px(20, 18, OUT); c.px(23, 18, OUT); c.px(26, 18, OUT);
    c.rect(20, 10, 3, 3, OUT);
    c.rect(26, 10, 3, 3, OUT);
    c.px(21, 11, 0xff3030);
    c.px(27, 11, 0xff3030);
    c.rect(16, 3, 16, 5, IRON);
    c.rect(16, 3, 16, 1, IRONL);
    c.poly([[16, 6], [9, 0], [12, 7]], 0xe8dcc0);
    c.poly([[32, 6], [39, 0], [36, 7]], 0xe8dcc0);
    c.outline(OUT);
    return c;
}

function drawVampire(f: number) {
    const c = new PixelCanvas(48, 48);
    const CAPE = 0x221628, LINING = 0xa01828, SKIN = 0xe8e0e8, HAIR = 0x14101c, SUIT = 0x2a2238;
    c.poly([[24, 13], [45, 39 + f], [39, 44], [24, 40], [9, 44], [3, 39 + f]], CAPE);
    c.poly([[24, 16], [40, 38 + f], [24, 36], [8, 38 + f]], LINING);
    c.rect(20, 38, 3, 6, HAIR);
    c.rect(25, 38, 3, 6, HAIR);
    c.rect(19, 18, 10, 20, SUIT);
    c.rect(22, 18, 4, 9, 0xf0f0f0);
    c.rect(23, 19, 2, 2, 0xd02030);
    c.poly([[15, 9], [21, 18], [17, 19]], LINING);
    c.poly([[33, 9], [27, 18], [31, 19]], LINING);
    c.rect(19, 6, 10, 11, SKIN);
    c.rect(19, 6, 1, 11, 0xb8b0c0);
    c.rect(18, 3, 12, 4, HAIR);
    c.poly([[19, 6], [24, 9], [29, 6]], HAIR);
    c.rect(18, 6, 2, 6, HAIR);
    c.rect(28, 6, 2, 5, HAIR);
    c.px(21, 10, 0xff2020);
    c.px(26, 10, 0xff2020);
    c.rect(22, 14, 4, 1, 0x601020);
    c.px(22, 15, 0xffffff);
    c.px(25, 15, 0xffffff);
    c.outline(OUT);
    return c;
}

function drawLich(f: number) {
    const c = new PixelCanvas(48, 48);
    const ROBE = 0x2a5a70, ROBED = 0x1a3a4a, BONE = 0xd8e8f0, ICE = 0x80e0ff;
    c.line(38, 45, 40, 9, 0x6b4a2a, 255, 2);
    c.poly([[40, 1], [44, 7], [40, 14], [36, 7]], ICE);
    c.px(39, 5, 0xffffff);
    if (f) { c.px(35, 3, 0xffffff); c.px(45, 11, 0xffffff); }
    c.poly([[24, 10], [34, 16], [38, 40], [10, 40], [14, 16]], ROBE);
    c.poly([[14, 16], [10, 40], [17, 40], [18, 20]], ROBED);
    for (let x = 10; x < 38; x += 4) c.rect(x + f * 2, 40, 2, 3 + ((x >> 2) % 2), ROBE);
    c.rect(22, 20, 4, 18, 0x3a7a90);
    c.ellipse(24, 13, 8, 8, 0x1e4050);
    c.ellipse(24, 15, 5, 5.5, BONE);
    c.rect(21, 14, 2, 2, 0x40e0ff);
    c.rect(26, 14, 2, 2, 0x40e0ff);
    c.px(24, 17, 0x1e4050);
    c.rect(22, 19, 5, 1, 0x1e4050);
    c.poly([[16, 8], [18, 1], [20, 6], [24, -1], [28, 6], [30, 1], [32, 8]], 0x9ae8ff);
    c.rect(36, 23, 4, 3, BONE);
    c.outline(OUT);
    return c;
}

function drawEye(f: number) {
    const c = new PixelCanvas(48, 48);
    const FLESH = 0x8a3a7a, FLESHD = 0x5a2050;
    for (let k = 0; k < 5; k++) {
        const x0 = 13 + k * 5.5, w = (k % 2 ? 3 : -3) * (f ? 1 : -1);
        c.line(x0, 30, x0 + w, 38, FLESHD, 255, 3);
        c.line(x0 + w, 38, x0 - w * 0.5, 46, FLESHD, 255, 2);
    }
    c.circle(24, 21, 17, FLESH);
    c.circle(24, 22, 14.5, 0xf4ece0);
    const vr = rng(9);
    for (let i = 0; i < 6; i++) {
        const a = vr() * Math.PI * 2;
        c.line(24 + Math.cos(a) * 14, 22 + Math.sin(a) * 14, 24 + Math.cos(a) * 9, 22 + Math.sin(a) * 9, 0xd04050);
    }
    const ix = 24 + (f ? 2 : 0);
    c.circle(ix, 22, 7.5, 0xb01828);
    c.circle(ix, 22, 5.5, 0xff4a3a);
    c.rect(ix - 1, 16, 2, 12, OUT);
    c.circle(18, 16, 2.5, 0xffffff);
    c.ellipse(24, 6, 13, 3, FLESHD);
    c.outline(OUT);
    return c;
}

function drawEnemyShot(kind: string) {
    switch (kind) {
        case 'bone': {
            const c = new PixelCanvas(16, 8);
            c.rect(3, 3, 10, 2, 0xeee8d4);
            c.rect(1, 2, 3, 2, 0xeee8d4); c.rect(1, 4, 3, 2, 0xd0c8b0);
            c.rect(12, 2, 3, 2, 0xeee8d4); c.rect(12, 4, 3, 2, 0xd0c8b0);
            c.outline(OUT);
            return c;
        }
        case 'blood': {
            const c = new PixelCanvas(12, 12);
            c.circle(6, 6, 5.5, 0x600818);
            c.circle(6, 6, 4.5, 0xd01830);
            c.circle(4.5, 4.5, 1.5, 0xff8090);
            return c;
        }
        case 'ice': {
            const c = new PixelCanvas(16, 8);
            c.poly([[0, 4], [5, 1], [16, 4], [5, 7]], 0x80e0ff);
            c.poly([[3, 4], [6, 2], [14, 4]], 0xe0f8ff);
            c.outline(0x1a3a5a);
            return c;
        }
        case 'darkorb': {
            const c = new PixelCanvas(14, 14);
            c.circle(7, 7, 6.5, 0x8a30c0, 120);
            c.circle(7, 7, 5, 0x6a1aa0);
            c.circle(7, 7, 3, 0xd080ff);
            c.px(6, 5, 0xffffff);
            return c;
        }
        case 'slimeball': {
            const c = new PixelCanvas(12, 12);
            c.circle(6, 6, 5, 0x2a8a3a);
            c.circle(6, 6, 4, 0x6fe06a);
            c.px(4, 4, 0xffffff);
            c.outline(OUT);
            return c;
        }
        case 'scythe': {
            const c = new PixelCanvas(28, 28);
            c.line(6, 24, 16, 8, 0x6b4a2a, 255, 2);
            c.poly([[16, 4], [26, 8], [27, 16], [22, 11], [14, 9]], 0xc8d0dc);
            c.line(17, 5, 25, 9, 0xffffff);
            c.outline(OUT);
            return c;
        }
    }
    return new PixelCanvas(4, 4);
}

function drawWarn() {
    const c = new PixelCanvas(64, 64);
    c.circle(32, 32, 31.5, 0xffffff, 70);
    c.ring(32, 32, 31.5, 3, 0xffffff, 230);
    return c;
}

// ---------------------------------------------------------------- 武器 / 特效

function drawBolt() {
    const c = new PixelCanvas(14, 14);
    c.circle(7, 7, 6.5, 0x3fa9ff, 110);
    c.circle(7, 7, 4.5, 0x3fa9ff);
    c.circle(7, 7, 2.5, 0xbfe8ff);
    c.px(6, 6, 0xffffff);
    return c;
}

function drawKnife() {
    const c = new PixelCanvas(18, 8);
    c.rect(1, 3, 4, 2, 0x6b3a1f);
    c.rect(5, 1, 1, 6, 0xf5c542);
    c.rect(6, 3, 9, 2, 0xd8dde8);
    c.rect(6, 3, 9, 1, 0xffffff);
    c.px(15, 3, 0xd8dde8);
    c.px(16, 4, 0xb0b8c8);
    c.outline(OUT);
    return c;
}

function drawAxe() {
    const c = new PixelCanvas(18, 18);
    c.line(3, 15, 12, 6, 0x8a5a30, 255, 2);
    c.poly([[9, 2], [16, 4], [16, 11], [12, 9], [9, 6]], 0xb8c0cc);
    c.poly([[14, 3], [16, 4], [16, 11], [14, 10]], 0xe8eef4);
    c.line(9, 3, 9, 6, 0x7a8290);
    c.outline(OUT);
    return c;
}

function drawBible() {
    const c = new PixelCanvas(14, 16);
    c.rect(1, 1, 12, 14, 0x9a2028);
    c.rect(1, 1, 2, 14, 0x6a1018);
    c.rect(11, 2, 2, 12, 0xf4ecd8);
    c.rect(6, 4, 2, 8, 0xf5c542);
    c.rect(4, 6, 6, 2, 0xf5c542);
    c.outline(OUT);
    return c;
}

function drawLightning() {
    const c = new PixelCanvas(20, 96);
    const r = rng(7);
    let x = 10;
    for (let y = 0; y < 96; y += 6) {
        const nx = Math.max(4, Math.min(15, x + Math.round((r() - 0.5) * 10)));
        c.line(x, y, nx, y + 6, 0xa0c8ff, 160, 5);
        x = nx;
    }
    x = 10;
    const r2 = rng(7);
    for (let y = 0; y < 96; y += 6) {
        const nx = Math.max(4, Math.min(15, x + Math.round((r2() - 0.5) * 10)));
        c.line(x, y, nx, y + 6, 0xffffff, 255, 2);
        x = nx;
    }
    return c;
}

function drawSpark() {
    const c = new PixelCanvas(24, 24);
    c.circle(12, 12, 7, 0xfff4a0, 140);
    c.poly([[12, 0], [14, 10], [24, 12], [14, 14], [12, 24], [10, 14], [0, 12], [10, 10]], 0xfff8c0);
    c.circle(12, 12, 3, 0xffffff);
    return c;
}

function drawWhip() {
    const c = new PixelCanvas(64, 24);
    c.ellipse(32, 22, 31.5, 18, 0xa8d0ff, 200);
    c.ellipse(32, 23, 29, 15, 0xffffff, 240);
    // 挖空形成月牙
    for (let y = 0; y < 24; y++) for (let x = 0; x < 64; x++) {
        const dx = (x + 0.5 - 32) / 27, dy = (y + 0.5 - 26) / 15;
        if (dx * dx + dy * dy <= 1) c.clear(x, y);
    }
    return c;
}

function drawAura() {
    const c = new PixelCanvas(64, 64);
    c.circle(32, 32, 31.5, 0xfff0c0, 40);
    c.ring(32, 32, 31.5, 2, 0xfff0c0, 120);
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        c.rect(32 + Math.cos(a) * 26 - 1, 32 + Math.sin(a) * 26 - 1, 2, 2, 0xffffff, 120);
    }
    return c;
}

function drawGem(main: number, light: number, dark: number) {
    const c = new PixelCanvas(10, 12);
    c.poly([[5, 0], [10, 5], [5, 12], [0, 5]], main);
    c.poly([[5, 0], [5, 5], [0, 5]], light);
    c.poly([[5, 12], [10, 5], [5, 6]], dark);
    c.px(3, 3, 0xffffff);
    c.outline(OUT);
    return c;
}

function drawChicken() {
    const c = new PixelCanvas(18, 14);
    c.rect(1, 9, 6, 2, 0xf4ecd8);
    c.circle(1.5, 8.5, 1.5, 0xf4ecd8);
    c.circle(1.5, 11.5, 1.5, 0xf4ecd8);
    c.ellipse(11, 7, 6.5, 5.5, 0xb5652a);
    c.ellipse(10, 5, 3.5, 2.5, 0xe08a40);
    c.px(9, 4, 0xffd090);
    c.outline(OUT);
    return c;
}

function drawMagnet() {
    const c = new PixelCanvas(14, 14);
    c.ring(7, 6, 6, 3, 0xd03030);
    c.rect(1, 6, 3, 4, 0xd03030);
    c.rect(10, 6, 3, 4, 0xd03030);
    for (let y = 7; y < 14; y++) for (let x = 0; x < 14; x++) if (x > 3 && x < 10) c.clear(x, y);
    c.rect(1, 10, 3, 3, 0xd8dde8);
    c.rect(10, 10, 3, 3, 0xd8dde8);
    c.outline(OUT);
    return c;
}

function drawChest() {
    const c = new PixelCanvas(20, 16);
    c.rect(1, 6, 18, 9, 0x8a4a20);
    c.rect(1, 2, 18, 4, 0xa85a28);
    c.rect(1, 2, 18, 1, 0xc87a40);
    c.rect(1, 6, 18, 1, 0xf5c542);
    c.rect(9, 5, 2, 4, 0xf5c542);
    c.rect(1, 2, 1, 13, 0xf5c542);
    c.rect(18, 2, 1, 13, 0xf5c542);
    c.outline(OUT);
    return c;
}

// ---------------------------------------------------------------- 场景

function drawGround() {
    const N = 64;
    const c = new PixelCanvas(N, N);
    const r = rng(1234);
    const cols = [0x3e6b34, 0x3a6531, 0x426f37];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(x, y, cols[Math.floor(r() * 3)]);
    const wrap = (x: number, y: number, col: number) => c.px((x + N) % N, (y + N) % N, col);
    // 深色斑块
    for (let k = 0; k < 5; k++) {
        const cx = Math.floor(r() * N), cy = Math.floor(r() * N), rr = 3 + r() * 4;
        for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
            if (x * x + y * y < rr * rr && r() > 0.25) wrap(cx + x, cy + y, 0x355d2d);
        }
    }
    // 草丛
    for (let k = 0; k < 22; k++) {
        const x = Math.floor(r() * N), y = Math.floor(r() * N);
        wrap(x, y, 0x5a8f45); wrap(x, y - 1, 0x6aa04f);
        wrap(x + 2, y, 0x5a8f45); wrap(x + 2, y - 1, 0x5a8f45); wrap(x + 2, y - 2, 0x7ab55a);
        wrap(x + 1, y + 1, 0x2f5228);
    }
    // 小石子
    for (let k = 0; k < 6; k++) {
        const x = Math.floor(r() * N), y = Math.floor(r() * N);
        wrap(x, y, 0x6e6a5a); wrap(x + 1, y, 0x8a8674);
    }
    return c;
}

function drawTomb() {
    const c = new PixelCanvas(16, 22);
    c.rect(2, 7, 12, 13, 0x8a8a98);
    c.ellipse(8, 7, 6, 5, 0x8a8a98);
    c.rect(2, 4, 2, 16, 0x6a6a78);
    c.rect(7, 6, 2, 8, 0x5a5a66);
    c.rect(5, 8, 6, 2, 0x5a5a66);
    c.rect(0, 19, 16, 3, 0x4a3a28);
    c.px(11, 15, 0x5a8f45); c.px(12, 16, 0x5a8f45);
    c.outline(OUT);
    return c;
}

function drawTree() {
    const c = new PixelCanvas(36, 44);
    c.rect(15, 26, 6, 16, 0x5a3a20);
    c.rect(15, 26, 2, 16, 0x3e2814);
    c.rect(12, 40, 12, 2, 0x5a3a20);
    c.circle(18, 16, 12, 0x24452a);
    c.circle(11, 22, 8, 0x24452a);
    c.circle(25, 22, 8, 0x24452a);
    c.circle(17, 14, 10, 0x2f5a32);
    c.circle(22, 19, 7, 0x2f5a32);
    c.circle(15, 11, 6, 0x3e7540);
    c.circle(13, 9, 3, 0x56925a);
    c.outline(OUT);
    return c;
}

function drawBush() {
    const c = new PixelCanvas(20, 14);
    c.circle(6, 8, 5, 0x2f5a32);
    c.circle(13, 7, 6, 0x2f5a32);
    c.circle(11, 6, 4, 0x3e7540);
    c.px(10, 4, 0x56925a);
    c.px(5, 6, 0xd04050);
    c.px(15, 9, 0xd04050);
    c.outline(OUT);
    return c;
}

function drawRock() {
    const c = new PixelCanvas(14, 10);
    c.ellipse(7, 6, 6, 4, 0x6e6a60);
    c.ellipse(6, 5, 4, 2.5, 0x8e8a7e);
    c.px(5, 4, 0xaaa698);
    c.outline(OUT);
    return c;
}

function drawFlowers() {
    const c = new PixelCanvas(12, 8);
    const pts = [[2, 3, 0xf0e060], [6, 1, 0xf0f0f0], [9, 4, 0xe070a0], [4, 6, 0xf0f0f0]];
    for (const p of pts) {
        c.px(p[0], p[1] + 1, 0x2f5228);
        c.px(p[0] - 1, p[1], p[2]); c.px(p[0] + 1, p[1], p[2]);
        c.px(p[0], p[1] - 1, p[2]); c.px(p[0], p[1], 0xf0a020);
    }
    return c;
}

function drawBones() {
    const c = new PixelCanvas(14, 8);
    c.line(2, 6, 11, 2, 0xe8e2d0, 255, 1);
    c.line(2, 2, 11, 6, 0xd0c8b0, 255, 1);
    c.rect(1, 1, 2, 2, 0xe8e2d0); c.rect(10, 5, 2, 2, 0xe8e2d0);
    c.rect(1, 5, 2, 2, 0xd0c8b0); c.rect(10, 1, 2, 2, 0xd0c8b0);
    c.outline(OUT, 160);
    return c;
}

// ---------------------------------------------------------------- 图标 16x16

function icon(fn: (c: PixelCanvas) => void, outline = true) {
    const c = new PixelCanvas(16, 16);
    fn(c);
    if (outline) c.outline(OUT);
    return c;
}

const ICONS: Record<string, () => PixelCanvas> = {
    icon_whip: () => icon(c => {
        c.ring(9, 7, 5, 2, 0x8a5a30);
        c.line(3, 14, 6, 10, 0x4a2a14, 255, 2);
        c.px(13, 3, 0xc8a070);
    }),
    icon_wand: () => icon(c => {
        c.line(3, 13, 10, 6, 0x8a5a30, 255, 2);
        c.circle(11.5, 4.5, 3, 0x3fa9ff);
        c.px(11, 3, 0xffffff);
    }),
    icon_knife: () => icon(c => {
        c.line(2, 13, 5, 10, 0x6b3a1f, 255, 2);
        c.line(4, 9, 7, 12, 0xf5c542);
        c.line(7, 9, 13, 3, 0xd8dde8, 255, 2);
        c.px(14, 2, 0xffffff);
    }),
    icon_axe: () => icon(c => {
        c.line(3, 14, 11, 5, 0x8a5a30, 255, 2);
        c.poly([[8, 1], [15, 3], [15, 10], [11, 8], [8, 5]], 0xb8c0cc);
        c.line(14, 3, 14, 9, 0xffffff);
    }),
    icon_bible: () => icon(c => {
        c.rect(2, 1, 12, 14, 0x9a2028);
        c.rect(2, 1, 2, 14, 0x6a1018);
        c.rect(12, 2, 2, 12, 0xf4ecd8);
        c.rect(7, 4, 2, 8, 0xf5c542);
        c.rect(5, 6, 6, 2, 0xf5c542);
    }),
    icon_garlic: () => icon(c => {
        c.ellipse(8, 10, 6, 5, 0xf4ecd8);
        c.ellipse(8, 10, 2, 5, 0xd8ccb0);
        c.poly([[6, 6], [8, 1], [10, 6]], 0xe8dcc0);
        c.px(8, 1, 0x8ab060);
    }),
    icon_lightning: () => icon(c => {
        c.ring(8, 8, 7, 2, 0xf5c542);
        c.poly([[9, 2], [5, 9], [8, 9], [6, 14], [11, 7], [8, 7]], 0xfff080);
    }),
    icon_might: () => icon(c => {
        c.poly([[3, 13], [6, 4], [12, 2], [13, 8], [8, 14]], 0x3a9a40);
        c.line(4, 12, 11, 4, 0x6ad070);
    }),
    icon_armor: () => icon(c => {
        c.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], 0x9aa2b0);
        c.poly([[8, 2], [14, 2], [14, 8], [8, 15]], 0x7a8290);
        c.rect(7, 4, 2, 8, 0xf5c542);
    }),
    icon_heart: () => icon(c => {
        c.circle(5, 6, 3.5, 0xd02838);
        c.circle(11, 6, 3.5, 0xd02838);
        c.poly([[1.5, 7], [14.5, 7], [8, 14.5]], 0xd02838);
        c.px(4, 4, 0xff8080);
    }),
    icon_regen: () => icon(c => {
        c.circle(8, 9, 6, 0xe03828);
        c.circle(6, 7, 2, 0xff7a60);
        c.poly([[5, 2], [8, 4], [11, 2], [9, 5], [7, 5]], 0x3a9a40);
    }),
    icon_cooldown: () => icon(c => {
        c.rect(2, 2, 12, 12, 0x2a4a9a);
        c.rect(2, 2, 2, 12, 0x1a2a6a);
        c.rect(12, 3, 2, 10, 0xf4ecd8);
        c.rect(6, 6, 4, 4, 0xa0d0ff);
    }),
    icon_area: () => icon(c => {
        c.rect(7, 6, 2, 9, 0xf5c542);
        c.rect(3, 8, 10, 2, 0xf5c542);
        c.rect(3, 4, 2, 4, 0xf4ecd8);
        c.rect(11, 4, 2, 4, 0xf4ecd8);
        c.rect(7, 2, 2, 4, 0xf4ecd8);
        c.px(3, 2, 0xff9030); c.px(11, 2, 0xff9030); c.px(7, 0, 0xff9030);
    }),
    icon_speed: () => icon(c => {
        c.rect(2, 5, 12, 6, 0x8a5a30);
        c.rect(2, 7, 12, 2, 0xf5c542);
        c.rect(2, 5, 1, 6, 0x5a3a20);
    }),
    icon_move: () => icon(c => {
        c.poly([[2, 4], [14, 7], [10, 10], [4, 13]], 0xf0f0f8);
        c.line(4, 6, 12, 8, 0xc0c8e0);
        c.line(4, 9, 10, 9, 0xc0c8e0);
    }),
    icon_magnet: () => icon(c => {
        c.circle(8, 8, 6, 0x6a3ab0);
        c.circle(8, 8, 3, 0xa070f0);
        c.px(6, 5, 0xffffff);
    }),
    icon_amount: () => icon(c => {
        c.ring(6, 8, 4.5, 2, 0xf5c542);
        c.ring(10, 8, 4.5, 2, 0xd0a030);
    }),
    icon_duration: () => icon(c => {
        c.rect(4, 1, 8, 2, 0x8a5a30);
        c.rect(4, 13, 8, 2, 0x8a5a30);
        c.poly([[5, 3], [11, 3], [8, 8]], 0xe8d8a0);
        c.poly([[8, 8], [11, 13], [5, 13]], 0xe8d8a0);
        c.rect(6, 10, 4, 3, 0xd0a040);
    }),
    icon_growth: () => icon(c => {
        c.poly([[8, 1], [13, 7], [8, 15], [3, 7]], 0x3fd080);
        c.poly([[8, 1], [8, 7], [3, 7]], 0xa0ffc0);
    }),
    icon_fire: () => icon(c => {
        c.line(2, 14, 9, 7, 0x8a5a30, 255, 2);
        c.circle(11, 5, 4, 0xff6020);
        c.circle(11, 5, 2.5, 0xffc040);
        c.px(10, 4, 0xffffff);
    }),
    icon_holy: () => icon(c => {
        c.rect(6, 1, 4, 3, 0x8a5a30);
        c.ellipse(8, 10, 5.5, 5, 0x4080ff);
        c.ellipse(8, 9, 3.5, 3, 0x90c8ff);
        c.rect(7, 7, 2, 6, 0xffffff);
        c.rect(5, 9, 6, 2, 0xffffff);
    }),
    icon_cross: () => icon(c => {
        c.rect(6, 1, 4, 14, 0xf5c542);
        c.rect(2, 5, 12, 4, 0xf5c542);
        c.rect(7, 2, 1, 12, 0xfff0a0);
    }),
    icon_frost: () => icon(c => {
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI;
            c.line(8 - Math.cos(a) * 6, 8 - Math.sin(a) * 6, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 0x80e0ff, 255, 2);
        }
        c.circle(8, 8, 2, 0xffffff);
    }),
    icon_familiar: () => icon(c => {
        c.circle(8, 8, 5.5, 0x60ff90, 140);
        c.circle(8, 8, 3.5, 0xa0ffc0);
        c.poly([[2, 4], [6, 7], [2, 10]], 0xd0ffe0);
        c.poly([[14, 4], [10, 7], [14, 10]], 0xd0ffe0);
        c.px(7, 7, OUT); c.px(9, 7, OUT);
    }),
    icon_chain: () => icon(c => {
        c.poly([[10, 0], [4, 7], [8, 7], [3, 15], [13, 6], [9, 6], [12, 0]], 0x9ad0ff);
        c.line(10, 1, 6, 6, 0xffffff);
    }),
    icon_bomb: () => icon(c => {
        c.circle(7, 10, 5.5, 0x2a2a3a);
        c.circle(5.5, 8.5, 1.5, 0x6a6a7a);
        c.rect(9, 3, 2, 3, 0x8a6a40);
        c.px(11, 2, 0xffc040); c.px(12, 1, 0xff6020); c.px(12, 3, 0xff6020);
    }),
    icon_luck: () => icon(c => {
        c.circle(5, 5, 3, 0x40c050);
        c.circle(11, 5, 3, 0x40c050);
        c.circle(5, 11, 3, 0x40c050);
        c.circle(11, 11, 3, 0x40c050);
        c.circle(8, 8, 2, 0x80e080);
        c.line(8, 10, 10, 15, 0x2a8a3a);
    }),
    icon_critdmg: () => icon(c => {
        c.poly([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], 0xff8030);
        c.circle(8, 8, 2.5, 0xffe080);
    }),
    icon_fang: () => icon(c => {
        c.poly([[2, 2], [7, 2], [5, 14]], 0xf4ecd8);
        c.poly([[9, 2], [14, 2], [11, 14]], 0xf4ecd8);
        c.px(5, 13, 0xd02030); c.px(11, 13, 0xd02030);
        c.rect(1, 1, 14, 2, 0xa01828);
    }),
    icon_thorns: () => icon(c => {
        c.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], 0x6a7a50);
        for (const [x, y] of [[1, 1], [15, 1], [0, 8], [16, 8], [8, 16], [8, 0]]) c.line(8, 8, x, y, 0x3a4a28, 255, 1);
        c.rect(6, 5, 4, 4, 0xa0b070);
    }),
    icon_heal: () => drawChicken(),
};


function drawCoin() {
    const c = new PixelCanvas(10, 10);
    c.circle(5, 5, 4.5, 0xd8a020);
    c.circle(5, 5, 3.5, 0xf5c542);
    c.rect(4, 3, 2, 4, 0xd8a020);
    c.px(3, 2, 0xfff0a0);
    c.outline(OUT);
    return c;
}

function drawCoinBag() {
    const c = new PixelCanvas(16, 16);
    c.ellipse(8, 10, 6.5, 5.5, 0x9a6a30);
    c.rect(6, 2, 4, 4, 0x9a6a30);
    c.rect(5, 5, 6, 1, 0xf5c542);
    c.ellipse(6, 9, 2, 2, 0xc08a48);
    c.circle(8, 11, 2.5, 0xf5c542);
    c.outline(OUT);
    return c;
}

const UI_ICONS: Record<string, () => PixelCanvas> = {
    icon_pause: () => icon(c => { c.rect(3, 2, 4, 12, 0xffffff); c.rect(9, 2, 4, 12, 0xffffff); }),
    icon_gold: () => icon(c => {
        c.circle(8, 8, 6.5, 0xd8a020);
        c.circle(8, 8, 5, 0xf5c542);
        c.rect(7, 4, 2, 8, 0xd8a020);
        c.px(5, 4, 0xfff0a0);
    }),
    icon_reroll: () => icon(c => {
        c.ring(8, 8, 6.5, 2, 0x40c0ff);
        for (let y = 6; y < 11; y++) for (let x = 0; x < 6; x++) c.clear(x, y);
        c.poly([[0, 6], [6, 6], [3, 10]], 0x40c0ff);
    }),
    icon_revive: () => icon(c => {
        c.ring(8, 5, 4, 2, 0xf5c542);
        c.rect(7, 8, 2, 7, 0xf5c542);
        c.rect(3, 9, 10, 2, 0xf5c542);
    }),
    icon_lock: () => icon(c => {
        c.ring(8, 6, 4.5, 2, 0xb0b8c8);
        c.rect(3, 7, 10, 8, 0xd0a030);
        c.rect(7, 9, 2, 3, 0x4a3010);
    }),
    icon_music: () => icon(c => {
        c.rect(6, 2, 2, 10, 0xffffff);
        c.rect(6, 2, 7, 2, 0xffffff);
        c.rect(11, 2, 2, 8, 0xffffff);
        c.ellipse(5, 12, 2.5, 2, 0xffffff);
        c.ellipse(10, 10, 2.5, 2, 0xffffff);
    }),
    icon_sound: () => icon(c => {
        c.rect(2, 6, 3, 4, 0xffffff);
        c.poly([[5, 6], [9, 2], [9, 14], [5, 10]], 0xffffff);
        c.line(11, 5, 11, 10, 0xffffff);
        c.line(13, 3, 13, 12, 0xffffff);
    }),
    icon_vibrate: () => icon(c => {
        c.rect(5, 2, 6, 12, 0xffffff);
        c.rect(6, 3, 4, 9, 0x40404a);
        c.line(2, 5, 2, 10, 0xffffff);
        c.line(13, 5, 13, 10, 0xffffff);
    }),
};

// 进化图标：金色描边 + 闪光
function evoIcon(base: PixelCanvas) {
    const c = new PixelCanvas(16, 16);
    c.data.set(base.data);
    const o = [(OUT >> 16) & 255, (OUT >> 8) & 255, OUT & 255];
    for (let i = 0; i < c.data.length; i += 4) {
        if (c.data[i + 3] && c.data[i] === o[0] && c.data[i + 1] === o[1] && c.data[i + 2] === o[2]) {
            c.data[i] = 0xff; c.data[i + 1] = 0xc0; c.data[i + 2] = 0x30;
        } else if (c.data[i + 3]) {
            // 偏红暖色调
            c.data[i] = Math.min(255, c.data[i] * 1.15 + 30);
            c.data[i + 1] = c.data[i + 1] * 0.8;
            c.data[i + 2] = c.data[i + 2] * 0.8;
        }
    }
    c.px(1, 1, 0xffffff); c.px(14, 2, 0xffffff); c.px(2, 14, 0xfff0a0);
    return c;
}


// ---------------------------------------------------------------- 新武器弹道 / 道具

function drawFireball() {
    const c = new PixelCanvas(16, 16);
    c.circle(8, 8, 7.5, 0xff4010, 120);
    c.circle(8, 8, 5.5, 0xff6020);
    c.circle(8, 8, 3.5, 0xffc040);
    c.circle(7, 7, 1.5, 0xffffff);
    return c;
}

function drawFlame(f: number) {
    const c = new PixelCanvas(32, 20);
    const r = rng(31 + f);
    c.ellipse(16, 15, 15, 5, 0xa02010, 120);
    for (let i = 0; i < 9; i++) {
        const x = 3 + i * 3.3 + r() * 2, h = 5 + r() * 9;
        c.poly([[x - 3, 17], [x + (f ? 1 : -1), 17 - h], [x + 3, 17]], 0xff6020);
        c.poly([[x - 1.5, 17], [x, 17 - h * 0.6], [x + 1.5, 17]], 0xffd040);
    }
    return c;
}

function drawFlask() {
    const c = new PixelCanvas(10, 14);
    c.rect(4, 0, 2, 3, 0x8a5a30);
    c.rect(3, 3, 4, 2, 0xc0e0ff);
    c.ellipse(5, 9, 4.5, 4.5, 0x4080ff);
    c.ellipse(4, 8, 1.5, 1.5, 0xc0e0ff);
    c.outline(OUT);
    return c;
}

function drawPuddle() {
    const c = new PixelCanvas(64, 40);
    c.ellipse(32, 20, 31.5, 19.5, 0x3070ff, 110);
    c.ellipse(32, 20, 26, 15, 0x60a0ff, 120);
    const r = rng(77);
    for (let i = 0; i < 10; i++) c.rect(8 + r() * 46, 6 + r() * 26, 2, 2, 0xe0f0ff, 220);
    return c;
}

function drawCrossProj() {
    const c = new PixelCanvas(18, 18);
    c.rect(7, 1, 4, 16, 0xf5c542);
    c.rect(1, 7, 16, 4, 0xf5c542);
    c.rect(8, 2, 1, 14, 0xfff0a0);
    c.rect(2, 8, 14, 1, 0xfff0a0);
    c.outline(OUT);
    return c;
}

function drawFamiliar(f: number) {
    const c = new PixelCanvas(16, 16);
    c.circle(8, 8, 7.5, 0x40ff80, 80);
    c.circle(8, 8, 4.5, 0x80ffb0);
    c.circle(8, 8, 2.5, 0xe0ffe8);
    const wy = f ? 4 : 6;
    c.poly([[1, wy], [5, 8], [1, wy + 6]], 0xd0ffe0, 200);
    c.poly([[15, wy], [11, 8], [15, wy + 6]], 0xd0ffe0, 200);
    c.px(7, 7, OUT);
    c.px(9, 7, OUT);
    return c;
}

function drawFShot() {
    const c = new PixelCanvas(8, 8);
    c.circle(4, 4, 3.5, 0x60ff90, 160);
    c.circle(4, 4, 2, 0xe0ffe8);
    return c;
}

function drawBomb(f: number) {
    const c = new PixelCanvas(14, 16);
    c.circle(7, 10, 5.5, f ? 0xc03030 : 0x2a2a3a);
    c.circle(5.5, 8.5, 1.5, f ? 0xff8080 : 0x6a6a7a);
    c.rect(8, 2, 2, 4, 0x8a6a40);
    c.px(10, 1, 0xffc040);
    c.px(11, 0, f ? 0xffffff : 0xff6020);
    c.outline(OUT);
    return c;
}

function drawBrazier(f: number) {
    const c = new PixelCanvas(18, 26);
    c.rect(7, 14, 4, 10, 0x6a5040);
    c.rect(4, 23, 10, 2, 0x4a3828);
    c.poly([[2, 10], [16, 10], [13, 15], [5, 15]], 0x8a7050);
    c.rect(2, 10, 14, 1, 0xb09070);
    const h = f ? 9 : 7;
    c.poly([[4, 10], [6, 10 - h + 2], [9, 10 - h - 1], [12, 10 - h + 3], [14, 10]], 0xff6020);
    c.poly([[6, 10], [9, 10 - h + 2], [12, 10]], 0xffd040);
    c.outline(OUT);
    return c;
}

function drawWatch() {
    const c = new PixelCanvas(14, 16);
    c.rect(6, 0, 2, 3, 0xf5c542);
    c.circle(7, 9, 6, 0xf5c542);
    c.circle(7, 9, 4.5, 0xf4ecd8);
    c.line(7, 9, 7, 6, OUT);
    c.line(7, 9, 9, 10, OUT);
    c.outline(OUT);
    return c;
}

function drawNuke() {
    const c = new PixelCanvas(14, 18);
    c.rect(5, 0, 4, 18, 0xffe080);
    c.rect(0, 4, 14, 4, 0xffe080);
    c.rect(6, 1, 2, 16, 0xffffff);
    c.rect(1, 5, 12, 2, 0xffffff);
    c.outline(0xa07010);
    return c;
}

function drawPotion() {
    const c = new PixelCanvas(12, 16);
    c.rect(4, 0, 4, 2, 0x8a5a30);
    c.rect(4, 2, 4, 3, 0xd0d0e0);
    c.ellipse(6, 10, 5.5, 5.5, 0xe02040);
    c.ellipse(4.5, 8.5, 1.5, 2, 0xff90a0);
    c.outline(OUT);
    return c;
}

function drawShieldPickup() {
    const c = new PixelCanvas(14, 16);
    c.poly([[1, 1], [13, 1], [13, 8], [7, 15], [1, 8]], 0x60a0ff);
    c.poly([[7, 1], [13, 1], [13, 8], [7, 15]], 0x4080e0);
    c.rect(6, 3, 2, 9, 0xffffff);
    c.rect(3, 6, 8, 2, 0xffffff);
    c.outline(OUT);
    return c;
}

// ---------------------------------------------------------------- 开屏 / 标题背景

function drawMoon() {
    const c = new PixelCanvas(80, 80);
    // 外层光晕
    c.circle(40, 40, 39.5, 0xff3030, 22);
    c.circle(40, 40, 35, 0xff4040, 36);
    c.circle(40, 40, 30, 0xff5040, 56);
    // 月面
    c.circle(40, 40, 25, 0x9a1820);
    c.circle(38.5, 38.5, 23.5, 0xc8242a);
    c.circle(36, 35, 16, 0xdc3a36);
    c.circle(33, 31, 7, 0xf06a5a);
    // 环形山
    for (const [x, y, r] of [[45, 47, 4.5], [31, 47, 3], [47, 32, 3], [38, 54, 2.2], [52, 41, 2]]) {
        c.circle(x, y, r, 0x8a141c);
        c.circle(x - 0.8, y - 0.8, r * 0.6, 0xb01e26);
    }
    return c;
}

function drawStar() {
    const c = new PixelCanvas(5, 5);
    c.rect(2, 0, 1, 5, 0xbfd8ff, 170);
    c.rect(0, 2, 5, 1, 0xbfd8ff, 170);
    c.px(2, 2, 0xffffff);
    return c;
}

function drawEmber() {
    const c = new PixelCanvas(5, 5);
    c.circle(2.5, 2.5, 2.5, 0xff9a30, 110);
    c.px(2, 2, 0xffe080);
    return c;
}

function drawCloud() {
    const c = new PixelCanvas(56, 14);
    for (const [x, y, rx, ry] of [[12, 9, 11, 4], [26, 7, 13, 5], [40, 8, 12, 4.5], [48, 10, 8, 3]]) c.ellipse(x, y, rx, ry, 0x3a1428, 210);
    for (const [x, y, rx] of [[24, 4, 9], [38, 5, 8]]) c.ellipse(x, y, rx, 1.6, 0x8a2a40, 200);
    return c;
}

// 地平线剪影：起伏山丘 + 墓碑 + 枯树（横向无缝平铺，周期 128）
function drawHills() {
    const W = 128, H = 44;
    const c = new PixelCanvas(W, H);
    const ridge = (x: number) => 24 + Math.sin((x / W) * Math.PI * 2) * 5 + Math.sin((x / W) * Math.PI * 6 + 1) * 2.5;
    for (let x = 0; x < W; x++) {
        const top = Math.round(ridge(x));
        c.rect(x, top, 1, H - top, 0x1a0c22);
    }
    // 墓碑
    for (const gx of [18, 54, 97]) {
        const t = Math.round(ridge(gx));
        c.rect(gx, t - 7, 5, 8, 0x1a0c22);
        c.rect(gx + 1, t - 8, 3, 1, 0x1a0c22);
    }
    // 十字架
    const cx = 76, ct = Math.round(ridge(cx));
    c.rect(cx, ct - 11, 2, 12, 0x1a0c22);
    c.rect(cx - 3, ct - 8, 8, 2, 0x1a0c22);
    // 枯树
    const tx = 36, tt = Math.round(ridge(tx));
    c.line(tx, tt, tx + 1, tt - 18, 0x1a0c22, 255, 2);
    c.line(tx + 1, tt - 10, tx - 6, tt - 16, 0x1a0c22);
    c.line(tx + 1, tt - 13, tx + 8, tt - 20, 0x1a0c22);
    c.line(tx - 4, tt - 14, tx - 6, tt - 21, 0x1a0c22);
    c.line(tx + 6, tt - 18, tx + 9, tt - 17, 0x1a0c22);
    const tx2 = 115, tt2 = Math.round(ridge(tx2));
    c.line(tx2, tt2, tx2, tt2 - 12, 0x1a0c22, 255, 2);
    c.line(tx2, tt2 - 8, tx2 + 5, tt2 - 13, 0x1a0c22);
    c.line(tx2, tt2 - 6, tx2 - 4, tt2 - 10, 0x1a0c22);
    return c;
}

function white() {
    const c = new PixelCanvas(4, 4);
    c.rect(0, 0, 4, 4, 0xffffff);
    return c;
}

function drawShadow() {
    const c = new PixelCanvas(16, 6);
    c.ellipse(8, 3, 8, 3, 0x000000, 80);
    return c;
}

function drawJoyBase() {
    const c = new PixelCanvas(48, 48);
    c.circle(24, 24, 23.5, 0xffffff, 40);
    c.ring(24, 24, 23.5, 2, 0xffffff, 120);
    return c;
}

function drawJoyKnob() {
    const c = new PixelCanvas(20, 20);
    c.circle(10, 10, 9.5, 0xffffff, 150);
    c.ring(10, 10, 9.5, 2, 0xffffff, 220);
    return c;
}

// ---------------------------------------------------------------- 打包

export function allSprites(): Record<string, PixelCanvas> {
    const s: Record<string, PixelCanvas> = {};
    for (const k of HERO_KINDS) {
        const base = decodeHero(HERO_ART[k]);
        s['hero_' + k + '_0'] = heroFrame(base, 1, 1);
        s['hero_' + k + '_1'] = heroFrame(base, 1.06, 0.94);
        s['hero_' + k + '_2'] = heroFrame(base, 0.97, 1.04);
    }
    for (let f = 0; f < 2; f++) {
        s['bat_' + f] = drawBat(f);
        s['slime_' + f] = drawSlime(f);
        s['zombie_' + f] = drawZombie(f);
        s['skeleton_' + f] = drawSkeleton(f);
        s['ghost_' + f] = drawGhost(f);
        s['reaper_' + f] = drawReaper(f);
        s['rat_' + f] = drawRat(f);
        s['slimeking_' + f] = drawSlimeKing(f);
        s['bonelord_' + f] = drawBoneLord(f);
        s['vampire_' + f] = drawVampire(f);
        s['lich_' + f] = drawLich(f);
        s['eye_' + f] = drawEye(f);
    }
    for (const k of ['bone', 'blood', 'ice', 'darkorb', 'slimeball', 'scythe']) s['shot_' + k] = drawEnemyShot(k);
    s.warn = drawWarn();
    for (const k of ['bat', 'slime', 'zombie', 'skeleton', 'ghost', 'reaper', 'rat', 'slimeking', 'bonelord', 'vampire', 'lich', 'eye']) {
        for (let f = 0; f < 2; f++) s[k + '_' + f + '_w'] = silhouette(s[k + '_' + f]);
    }
    s.bolt = drawBolt();
    s.knife = drawKnife();
    s.axe = drawAxe();
    s.bible = drawBible();
    s.lightning = drawLightning();
    s.spark = drawSpark();
    s.whip = drawWhip();
    s.aura = drawAura();
    s.gem_blue = drawGem(0x3f8cff, 0xa8d4ff, 0x1f4fb0);
    s.gem_green = drawGem(0x3fd060, 0xa8f0b0, 0x1f8a30);
    s.gem_red = drawGem(0xff4050, 0xffa8b0, 0xa01828);
    s.chicken = drawChicken();
    s.magnet = drawMagnet();
    s.chest = drawChest();
    s.ground = drawGround();
    s.tomb = drawTomb();
    s.tree = drawTree();
    s.bush = drawBush();
    s.rock = drawRock();
    s.flowers = drawFlowers();
    s.bones = drawBones();
    s.white = white();
    s.shadow = drawShadow();
    s.joy_base = drawJoyBase();
    s.joy_knob = drawJoyKnob();
    for (const k in ICONS) s[k] = ICONS[k]();
    for (const k in UI_ICONS) s[k] = UI_ICONS[k]();
    for (const w of ['whip', 'wand', 'knife', 'axe', 'bible', 'garlic', 'lightning']) s['icon_' + w + '_evo'] = evoIcon(s['icon_' + w]);
    for (const w of ['fire', 'holy', 'cross', 'frost', 'familiar', 'chain', 'bomb']) s['icon_' + w + '_evo'] = evoIcon(s['icon_' + w]);
    s.fireball = drawFireball();
    s.flame_0 = drawFlame(0);
    s.flame_1 = drawFlame(1);
    s.flask = drawFlask();
    s.puddle = drawPuddle();
    s.crossp = drawCrossProj();
    s.familiar_0 = drawFamiliar(0);
    s.familiar_1 = drawFamiliar(1);
    s.fshot = drawFShot();
    s.bomb_0 = drawBomb(0);
    s.bomb_1 = drawBomb(1);
    s.brazier_0 = drawBrazier(0);
    s.brazier_1 = drawBrazier(1);
    s.brazier_0_w = silhouette(s.brazier_0);
    s.brazier_1_w = silhouette(s.brazier_1);
    s.watch = drawWatch();
    s.nuke = drawNuke();
    s.potion = drawPotion();
    s.shield = drawShieldPickup();
    s.moon = drawMoon();
    s.star = drawStar();
    s.ember = drawEmber();
    s.cloud = drawCloud();
    s.hills = drawHills();
    s.coin = drawCoin();
    s.coinbag = drawCoinBag();
    return s;
}

export interface AtlasRect { x: number; y: number; w: number; h: number; }

export function buildAtlas(size = 1024) {
    const sprites = allSprites();
    const names = Object.keys(sprites).sort((a, b) => sprites[b].h - sprites[a].h);
    const data = new Uint8Array(size * size * 4);
    const rects: Record<string, AtlasRect> = {};
    const PAD = 2;
    let x = PAD, y = PAD, rowH = 0;
    for (const n of names) {
        const c = sprites[n];
        if (x + c.w + PAD > size) { x = PAD; y += rowH + PAD; rowH = 0; }
        if (y + c.h + PAD > size) throw new Error('atlas overflow');
        for (let j = 0; j < c.h; j++) {
            const src = j * c.w * 4;
            data.set(c.data.subarray(src, src + c.w * 4), ((y + j) * size + x) * 4);
        }
        rects[n] = { x, y, w: c.w, h: c.h };
        x += c.w + PAD;
        rowH = Math.max(rowH, c.h);
    }
    return { size, data, rects };
}
