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
export const HERO_KINDS = ['hunter', 'mage', 'rogue', 'knight', 'nun', 'pyro', 'bomber', 'sage'];  // 福蛙（hero_fu）由奶蛙加装扮生成

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

function drawImp(f: number) {
    // 小火灵：水滴形的小火苗，带可爱表情
    const c = new PixelCanvas(32, 32);
    const sw = f ? 1 : -1;
    c.poly([[16, 3 + (f ? 1 : 0)], [22 + sw, 12], [25, 20], [22, 27], [16, 29], [10, 27], [7, 20], [10 - sw, 12]], 0xe04a1a);
    c.poly([[16, 8], [20, 14], [22, 21], [19, 26], [16, 27], [13, 26], [10, 21], [12, 14]], 0xff8a20);
    c.ellipse(16, 22, 5, 4.5, 0xffd050);
    c.rect(12, 18, 2, 3, OUT); c.rect(19, 18, 2, 3, OUT);
    c.px(12, 18, 0xffffff); c.px(19, 18, 0xffffff);
    c.line(14, 23, 17, 23, 0x8a2a10);
    c.px(10, 21, 0xff6a6a); c.px(22, 21, 0xff6a6a);
    c.outline(0x6a1a08);
    return c;
}

function drawMummy(f: number) {
    // 稻草人：草帽、麻布脸、背带裤，手里冒出稻草
    const c = new PixelCanvas(32, 32);
    const la = f === 0 ? -1 : 1, ay = f ? 1 : 0;
    const STRAW = 0xf0c850, STRAWD = 0xc89a30;
    c.rect(14 + la, 24, 2, 5, 0x6b4a2a);
    c.rect(17 - la, 24, 2, 5, 0x6b4a2a);
    c.rect(11, 13, 11, 11, 0x4a6ab0);
    c.rect(11, 13, 3, 11, 0x34508a);
    c.rect(12, 13, 2, 4, 0xd04a3a); c.rect(19, 13, 2, 4, 0xd04a3a);
    c.rect(6, 15 + ay, 6, 3, 0xd04a3a);
    c.rect(21, 15 - ay, 6, 3, 0xd04a3a);
    for (const [x, y] of [[4, 15 + ay], [4, 17 + ay], [27, 15 - ay], [27, 17 - ay]] as [number, number][]) c.rect(x, y, 2, 1, STRAW);
    c.ellipse(16, 9, 5.5, 5, 0xe0c898);
    c.rect(13, 8, 2, 2, OUT); c.rect(18, 8, 2, 2, OUT);
    c.line(14, 12, 18, 12, 0x8a5a30);
    c.px(13, 11, 0x8a5a30); c.px(19, 11, 0x8a5a30);
    c.ellipse(16, 4, 9, 2, STRAWD);
    c.ellipse(16, 3, 5, 2.5, STRAW);
    c.rect(11, 4, 10, 1, 0xd04a3a);
    c.outline(OUT);
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
    // 泥巴怪：圆滚滚的泥团，头顶冒着小草
    const c = new PixelCanvas(32, 32);
    const M = 0x9a6a3a, MD = 0x6a4424, ML = 0xc08a50;
    const la = f === 0 ? -1 : 1, ay = f ? 1 : 0;
    c.ellipse(13 + la, 27, 3, 2, MD);
    c.ellipse(19 - la, 27, 3, 2, MD);
    c.ellipse(16, 18, 9, 9, MD);
    c.ellipse(16, 17, 8.5, 8.5, M);
    c.ellipse(13, 13, 3, 2, ML);
    c.ellipse(7, 19 + ay, 2.5, 3, M);
    c.ellipse(25, 19 - ay, 2.5, 3, M);
    c.rect(12, 16, 2, 3, OUT); c.rect(18, 16, 2, 3, OUT);
    c.px(12, 16, 0xffffff); c.px(18, 16, 0xffffff);
    c.line(14, 21, 17, 21, 0x4a2a14);
    c.line(15, 9, 14, 6, 0x5aa040); c.line(17, 9, 18, 5, 0x6ac050);
    c.outline(OUT);
    return c;
}

function drawSkeleton(f: number) {
    // 木偶兵：木头关节小兵，戴红色军帽
    const c = new PixelCanvas(32, 32);
    const W = 0xd8a868, WD = 0xa87840, J = 0x6b4a2a;
    const la = f === 0 ? -1 : 1, ay = f === 0 ? 0 : 1;
    c.rect(14 + la, 22, 2, 6, WD);
    c.rect(18 - la, 22, 2, 6, W);
    c.rect(13 + la, 28, 3, 1, J); c.rect(18 - la, 28, 3, 1, J);
    c.rect(13, 13, 8, 9, 0x3a6ac0);
    c.rect(13, 13, 2, 9, 0x2a4e90);
    c.rect(13, 17, 8, 1, 0xf5c542);
    c.rect(10, 14, 2, 6 - ay, W); c.px(10, 13, J);
    c.rect(22, 14, 2, 5 + ay, W); c.px(22, 13, J);
    c.circle(17, 8, 4.5, W);
    c.rect(15, 7, 1, 2, OUT); c.rect(18, 7, 1, 2, OUT);
    c.px(14, 10, 0xe07060); c.px(19, 10, 0xe07060);
    c.rect(13, 2, 8, 3, 0xd04040);
    c.rect(12, 4, 10, 1, 0x8a2020);
    c.px(17, 1, 0xf5c542);
    c.outline(OUT);
    return c;
}

function drawGhost(f: number) {
    // 云朵精：软绵绵的小云朵
    const c = new PixelCanvas(32, 32);
    const W = 0xf4f8ff, WD = 0xc0d0f0;
    const b = f ? 1 : 0;
    c.circle(10, 17 + b, 6, WD); c.circle(22, 17 + b, 6, WD);
    c.circle(16, 12 + b, 7.5, WD);
    c.circle(10, 16 + b, 5.5, W); c.circle(22, 16 + b, 5.5, W);
    c.circle(16, 11 + b, 7, W);
    c.rect(8, 16 + b, 16, 6, W);
    c.line(12, 14 + b, 13, 13 + b, OUT); c.line(13, 13 + b, 14, 14 + b, OUT);
    c.line(18, 14 + b, 19, 13 + b, OUT); c.line(19, 13 + b, 20, 14 + b, OUT);
    c.px(11, 17 + b, 0xffa0b0); c.px(21, 17 + b, 0xffa0b0);
    c.line(15, 18 + b, 17, 18 + b, OUT);
    c.outline(0x6070a0, 220);
    return c;
}

function drawReaper(f: number) {
    // 暗夜魔术师：高礼帽、紫色斗篷、星星魔杖
    const c = new PixelCanvas(48, 48);
    const R = 0x4a2a78, RD = 0x2e1a52, RL = 0x7a52b0, SKIN = 0xf2d2b0;
    c.line(36, 14, 30, 34, 0x2a1a10, 255, 2);
    const sy = f ? 1 : 0;
    c.poly([[37, 6 + sy], [39, 11 + sy], [44, 11 + sy], [40, 14 + sy], [42, 19 + sy], [37, 16 + sy], [32, 19 + sy], [34, 14 + sy], [30, 11 + sy], [35, 11 + sy]], 0xffd84a);
    c.poly([[24, 14], [32, 18], [35, 30], [38, 44], [10, 44], [13, 30], [16, 18]], R);
    c.poly([[16, 18], [13, 30], [10, 44], [16, 44], [17, 28]], RD);
    for (let x = 10; x < 38; x += 4) c.rect(x + (f ? 2 : 0), 43, 2, 2, RD);
    c.rect(22, 20, 4, 16, 0xf0f0f0);
    c.rect(23, 21, 2, 2, 0xd04a8a);
    c.rect(30, 24, 4, 3, 0xffffff);
    c.ellipse(24, 14, 5, 5, SKIN);
    c.rect(21, 13, 2, 2, OUT); c.rect(26, 13, 2, 2, OUT);
    c.line(22, 17, 26, 17, 0xa05a50);
    c.rect(17, 8, 14, 2, 0x1a1020);
    c.rect(19, 0, 10, 8, 0x1a1020);
    c.rect(19, 5, 10, 2, 0xb04a8a);
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

// 毒沼巨蟾（毒雾沼泽 Boss）：紫绿色疣皮大蟾蜍，黄眼，嘴角滴毒液
function drawToad(f: number) {
    const c = new PixelCanvas(52, 44);
    const B = 0x5a7a3a, BD = 0x3a5228, BL = 0x8ab050, BELLY = 0xc8d890, WART = 0x9a50b0;
    const sq = f ? 1 : 0;
    // 后腿
    c.ellipse(9, 34 + sq, 8, 7, BD);
    c.ellipse(43, 34 + sq, 8, 7, BD);
    // 身体
    c.ellipse(26, 28 + sq, 21, 14 - sq, BD);
    c.ellipse(26, 27 + sq, 20, 13 - sq, B);
    c.ellipse(26, 33 + sq, 13, 7, BELLY);
    // 头与眼
    c.ellipse(26, 18 + sq, 17, 9, B);
    for (const ex of [14, 38]) {
        c.circle(ex, 11 + sq, 6, BD);
        c.circle(ex, 11 + sq, 5, 0xf0d040);
        c.rect(ex - 1, 8 + sq, 2, 6, OUT);
    }
    // 宽嘴 + 毒液
    c.line(12, 23 + sq, 40, 23 + sq, OUT);
    c.line(12, 23 + sq, 10, 21 + sq, OUT);
    c.line(40, 23 + sq, 42, 21 + sq, OUT);
    c.rect(16, 24 + sq, 2, 3 + f * 2, 0x90f040);
    c.rect(33, 24 + sq, 2, 2 + (1 - f) * 2, 0x90f040);
    // 疣
    for (const [x, y] of [[18, 16], [33, 15], [10, 28], [42, 27], [22, 30], [31, 21], [26, 13]] as [number, number][]) {
        c.px(x, y + sq, WART); c.px(x + 1, y + sq, WART); c.px(x, y + 1 + sq, 0xc070d0);
    }
    c.ellipse(20, 15 + sq, 3, 1.5, BL);
    // 前爪
    c.ellipse(15, 40, 5, 3, BD);
    c.ellipse(37, 40, 5, 3, BD);
    c.outline(OUT);
    return c;
}

// 爆炸蘑菇：红伞白点、怒眼，两帧上下弹跳
function drawShroom(f: number) {
    const c = new PixelCanvas(24, 26);
    const y0 = f ? 1 : 0;
    c.rect(8, 14 + y0, 8, 9, 0xf0e2c8);
    c.rect(8, 21 + y0, 3, 3, 0xd8c8a8); c.rect(13, 21 + y0, 3, 3, 0xd8c8a8);
    c.ellipse(12, 10 + y0, 11, 7, 0xa82820);
    c.ellipse(12, 9 + y0, 10, 6, 0xd83a30);
    for (const [x, y] of [[6, 7], [12, 5], [17, 8], [9, 11], [15, 11]] as [number, number][]) c.circle(x, y + y0, 1.3, 0xfff4e0);
    c.line(9, 15 + y0, 11, 16 + y0, OUT); c.line(15, 15 + y0, 13, 16 + y0, OUT);
    c.px(10, 17 + y0, 0xff3030); c.px(13, 17 + y0, 0xff3030);
    c.rect(10, 19 + y0, 4, 1, OUT);
    c.outline(OUT);
    return c;
}

function drawBoneLord(f: number) {
    // 铁甲将军：全身铁甲、角盔、红披风、巨剑
    const c = new PixelCanvas(48, 48);
    const IRON = 0x6a7080, IROND = 0x484e5c, IRONL = 0xa0a8b8, CAPE = 0x2a5ab0, GOLD = 0xf5c542;
    const la = f ? 1 : -1, sy = f ? 1 : 0;
    c.poly([[14, 19], [34, 19], [36, 41], [31, 39], [27, 42], [22, 39], [17, 42], [12, 40]], CAPE);
    c.rect(19 + la, 33, 4, 10, IROND);
    c.rect(25 - la, 33, 4, 10, IRON);
    c.rect(17 + la, 43, 6, 2, IROND);
    c.rect(25 - la, 43, 6, 2, IROND);
    c.rect(16, 18, 16, 16, IRON);
    c.rect(16, 18, 3, 16, IROND);
    c.rect(19, 21, 10, 2, IRONL);
    c.rect(22, 25, 4, 4, GOLD);
    c.rect(16, 31, 16, 2, 0x6b3a1f);
    c.ellipse(15, 19, 5, 3.5, IRONL);
    c.ellipse(33, 19, 5, 3.5, IRONL);
    c.line(36, 30 + sy, 45, 4 + sy, 0xc8d0dc, 255, 3);
    c.line(36, 30 + sy, 45, 4 + sy, 0xffffff);
    c.rect(32, 28 + sy, 8, 2, GOLD);
    c.rect(34, 30 + sy, 2, 4, 0x6b3a1f);
    c.rect(17, 4, 14, 14, IRON);
    c.rect(17, 4, 2, 14, IROND);
    c.rect(19, 10, 10, 2, 0x1a1a24);
    c.px(21, 10, 0x60d0ff); c.px(26, 10, 0x60d0ff);
    c.rect(23, 12, 2, 5, IRONL);
    c.rect(16, 3, 16, 2, IRONL);
    c.poly([[16, 6], [9, 0], [12, 7]], GOLD);
    c.poly([[32, 6], [39, 0], [36, 7]], GOLD);
    c.outline(OUT);
    return c;
}

function drawVampire(f: number) {
    // 蝙蝠伯爵：紫色斗篷的绅士，领结上停着一只小蝙蝠
    const c = new PixelCanvas(48, 48);
    const CAPE = 0x2a1a48, LINING = 0x8a4ac8, SKIN = 0xf2d6c0, HAIR = 0x2a2040, SUIT = 0x3a2a58;
    c.poly([[24, 13], [45, 39 + f], [39, 44], [24, 40], [9, 44], [3, 39 + f]], CAPE);
    c.poly([[24, 16], [40, 38 + f], [24, 36], [8, 38 + f]], LINING);
    c.rect(20, 38, 3, 6, HAIR);
    c.rect(25, 38, 3, 6, HAIR);
    c.rect(19, 18, 10, 20, SUIT);
    c.rect(22, 18, 4, 9, 0xf0f0f0);
    c.poly([[20, 19], [24, 21], [28, 19], [24, 23]], 0x6a3aa0);
    c.poly([[15, 9], [21, 18], [17, 19]], LINING);
    c.poly([[33, 9], [27, 18], [31, 19]], LINING);
    c.rect(19, 6, 10, 11, SKIN);
    c.rect(19, 6, 1, 11, 0xd8b8a0);
    c.rect(18, 3, 12, 4, HAIR);
    c.poly([[19, 6], [24, 9], [29, 6]], HAIR);
    c.rect(18, 6, 2, 5, HAIR);
    c.rect(28, 6, 2, 5, HAIR);
    c.rect(21, 10, 2, 2, OUT); c.rect(25, 10, 2, 2, OUT);
    c.px(21, 10, 0xffffff); c.px(25, 10, 0xffffff);
    c.line(22, 14, 25, 14, 0xa05a50);
    c.px(20, 13, 0xffa0a0); c.px(27, 13, 0xffa0a0);
    c.outline(OUT);
    return c;
}

function drawLich(f: number) {
    // 冰霜巫师：蓝袍白胡子老爷爷，冰晶法杖
    const c = new PixelCanvas(48, 48);
    const ROBE = 0x2a5a90, ROBED = 0x1a3a6a, ICE = 0x80e0ff, SKIN = 0xf2d6c0;
    c.line(38, 45, 40, 9, 0x6b4a2a, 255, 2);
    c.poly([[40, 1], [44, 7], [40, 14], [36, 7]], ICE);
    c.px(39, 5, 0xffffff);
    if (f) { c.px(35, 3, 0xffffff); c.px(45, 11, 0xffffff); }
    c.poly([[24, 12], [34, 18], [38, 40], [10, 40], [14, 18]], ROBE);
    c.poly([[14, 18], [10, 40], [17, 40], [18, 22]], ROBED);
    for (let x = 10; x < 38; x += 4) c.rect(x + f * 2, 40, 2, 3 + ((x >> 2) % 2), ROBE);
    c.ellipse(24, 15, 5.5, 5, SKIN);
    c.rect(21, 13, 2, 2, OUT); c.rect(26, 13, 2, 2, OUT);
    c.poly([[18, 16], [30, 16], [27, 28], [24, 31], [21, 28]], 0xf4f8ff);
    c.rect(20, 11, 4, 1, 0xf4f8ff); c.rect(25, 11, 4, 1, 0xf4f8ff);
    c.poly([[14, 11], [34, 11], [26, 0], [24, -1]], ROBE);
    c.rect(14, 10, 20, 2, ROBED);
    c.px(24, 4, 0xffe060); c.px(21, 7, 0xffe060); c.px(27, 8, 0xffe060);
    c.rect(36, 23, 4, 3, SKIN);
    c.outline(OUT);
    return c;
}

function drawEye(f: number) {
    // 水晶魔眼：紫色水晶框里的魔法宝石眼，周围漂浮水晶碎片
    const c = new PixelCanvas(48, 48);
    const CRY = 0x8a5ad0, CRYD = 0x5a3a9a, CRYL = 0xc8a8ff;
    for (let k = 0; k < 5; k++) {
        const x0 = 12 + k * 6, y0 = 38 + ((k + f) % 2) * 3;
        c.poly([[x0, y0 - 4], [x0 + 3, y0], [x0, y0 + 5], [x0 - 3, y0]], k % 2 ? CRYL : CRY);
    }
    c.circle(24, 21, 17, CRYD);
    c.circle(24, 21, 15, CRY);
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        c.poly([[24 + Math.cos(a) * 14, 21 + Math.sin(a) * 14], [24 + Math.cos(a + 0.2) * 18, 21 + Math.sin(a + 0.2) * 18], [24 + Math.cos(a + 0.4) * 14, 21 + Math.sin(a + 0.4) * 14]], CRYL);
    }
    c.circle(24, 22, 11.5, 0xf4f0ff);
    const ix = 24 + (f ? 2 : 0);
    c.circle(ix, 22, 7, 0x3a7ae0);
    c.circle(ix, 22, 5, 0x6ab8ff);
    c.circle(ix, 22, 2.5, 0x1a2a60);
    c.circle(ix - 3, 19, 2, 0xffffff);
    c.outline(OUT);
    return c;
}

function drawEnemyShot(kind: string) {
    switch (kind) {
        case 'bone': {
            // 铁甲将军的尖刺（钢刺）
            const c = new PixelCanvas(16, 8);
            c.poly([[0, 4], [4, 1], [16, 4], [4, 7]], 0xa0a8b8);
            c.poly([[3, 4], [5, 2], [14, 4]], 0xe0e6f0);
            c.outline(OUT);
            return c;
        }
        case 'blood': {
            const c = new PixelCanvas(12, 12);
            // 蝙蝠伯爵的紫色魔法弹
            c.circle(6, 6, 5.5, 0x4a1a80);
            c.circle(6, 6, 4.5, 0xa050e0);
            c.circle(4.5, 4.5, 1.5, 0xe8c0ff);
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
        case 'sand': {
            // 沙漠巨蠕的沙弹
            const c = new PixelCanvas(12, 12);
            c.circle(6, 6, 5, 0x8a6030);
            c.circle(6, 6, 4, 0xd8a860);
            c.px(4, 4, 0xfff0c0); c.px(7, 8, 0x8a6030);
            c.outline(OUT);
            return c;
        }
        case 'scythe': {
            // 暗夜魔术师的回旋飞牌
            const c = new PixelCanvas(28, 28);
            c.rect(7, 3, 14, 22, 0xf8f8f8);
            c.rect(9, 5, 10, 18, 0xe0e0ec);
            c.poly([[14, 9], [18, 14], [14, 19], [10, 14]], 0xd04a8a);
            c.px(9, 5, 0xd04a8a); c.px(18, 22, 0xd04a8a);
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
    c.rect(1, 1, 12, 14, 0x5a3aa0);
    c.rect(1, 1, 2, 14, 0x3a2470);
    c.rect(11, 2, 2, 12, 0xf4ecd8);
    c.poly([[7, 4], [8, 7], [11, 7], [8.5, 9], [9.5, 12], [7, 10], [4.5, 12], [5.5, 9], [3, 7], [6, 7]], 0xf5c542);
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

function drawSpike() {
    const c = new PixelCanvas(20, 26);
    c.poly([[2, 25], [6, 6], [9, 25]], 0x8a7a6a);
    c.poly([[7, 25], [11, 0], [15, 25]], 0xb8a890);
    c.poly([[13, 25], [17, 9], [19, 25]], 0x8a7a6a);
    c.line(11, 2, 11, 22, 0xf0e8d8);
    c.line(6, 9, 6, 22, 0xd0c4b0);
    c.outline(OUT);
    return c;
}

function drawSpikeWarn() {
    const c = new PixelCanvas(16, 8);
    c.ellipse(8, 4, 7, 3, 0x5a4030, 200);
    c.px(5, 3, 0x2a1a10); c.px(8, 4, 0x2a1a10); c.px(11, 3, 0x2a1a10);
    return c;
}

function drawWhip() {
    // 鞭击弧光（参考吸血鬼幸存者）：一道月牙形的横扫弧，中间粗两端尖，白色核心 + 淡蓝灰边 + 内侧两道残影弧
    const W = 64, H = 32;
    const c = new PixelCanvas(W, H);
    const inside = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const px = x + 0.5, py = y + 0.5;
        // 外弧减内弧 = 月牙
        if (!inside(px, py, 32, 30, 31.5, 27) || inside(px, py, 32, 36, 29.5, 25.5)) continue;
        // 到内外边缘的相对位置，用来上色（中间白、边缘淡）
        const outer = Math.sqrt(((px - 32) / 31.5) ** 2 + ((py - 30) / 27) ** 2);
        const inner = Math.sqrt(((px - 32) / 29.5) ** 2 + ((py - 36) / 25.5) ** 2);
        const span = outer + (inner - 1);
        const e = Math.abs(span - 0.5 * (1 + (inner - 1))) ;
        const edge = Math.min(1 - outer, inner - 1) * 30;
        if (edge > 1.6) c.px(x, y, 0xffffff, 255);
        else if (edge > 0.7) c.px(x, y, 0xe8eefa, 240);
        else c.px(x, y, 0xa8b4d0, 150);
        void e;
    }
    // 内侧残影弧（半透明）
    for (let k = 0; k < 2; k++) {
        const ry = 22 - k * 4, rx = 27 - k * 4;
        for (let a = 0.25; a < Math.PI - 0.25; a += 0.02) {
            const x = Math.round(32 - Math.cos(a) * rx), y = Math.round(34 - Math.sin(a) * ry);
            if (x >= 0 && x < W && y >= 0 && y < H) c.px(x, y, 0xffffff, 70 - k * 25);
        }
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

// ---------------------------------------------------------------- 冰雪荒原 / 熔岩火山 地图

function tileNoise(seed: number, cols: number[], specks: [number, number][], cracks?: { col: number; glow: number; n: number }) {
    const N = 64;
    const c = new PixelCanvas(N, N);
    const r = rng(seed);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(x, y, cols[Math.floor(r() * cols.length)]);
    const wrap = (x: number, y: number, col: number) => c.px((x + N) % N, (y + N) % N, col);
    for (const [col, n] of specks) {
        for (let k = 0; k < n; k++) {
            const cx = Math.floor(r() * N), cy = Math.floor(r() * N), rr = 2 + r() * 4;
            for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y < rr * rr && r() > 0.3) wrap(cx + x, cy + y, col);
        }
    }
    if (cracks) {
        for (let k = 0; k < cracks.n; k++) {
            let x = Math.floor(r() * N), y = Math.floor(r() * N);
            for (let s = 0; s < 14; s++) {
                wrap(x, y, cracks.col);
                if (s % 3 === 1) wrap(x + 1, y, cracks.glow);
                x += r() < 0.5 ? 1 : -1;
                y += r() < 0.7 ? 1 : 0;
            }
        }
    }
    return c;
}

function drawGroundSnow() {
    const c = tileNoise(77, [0xc9d5e3, 0xd2dce8, 0xc2cede], [[0xb0c0d4, 6], [0xdde6f0, 5]]);
    const r = rng(78);
    for (let k = 0; k < 10; k++) {
        const x = Math.floor(r() * 64), y = Math.floor(r() * 64);
        c.px(x, y, 0xa8bcd4); c.px(x + 1, y, 0xb8c8dc);
    }
    return c;
}

function drawGroundLava() {
    return tileNoise(91, [0x2a1a1c, 0x30201e, 0x261618], [[0x3a2422, 5], [0x1c1012, 4]], { col: 0xd04018, glow: 0xffa030, n: 5 });
}

// ---- 毒雾沼泽
function drawGroundSwamp() {
    const c = tileNoise(131, [0x2c2a1c, 0x322f20, 0x282618], [[0x3a3a24, 5], [0x16222a, 6], [0x1c2c30, 4]]);
    const r = rng(132);
    for (let k = 0; k < 6; k++) {
        const x = Math.floor(r() * 60), y = Math.floor(r() * 60);
        c.px(x, y, 0x6a8a3a); c.px(x + 1, y, 0x55702e); c.px(x, y + 1, 0x55702e);
    }
    return c;
}

function drawDeadTree() {
    const c = new PixelCanvas(30, 40);
    c.rect(13, 14, 4, 26, 0x3a3028);
    c.rect(14, 14, 1, 26, 0x4a4034);
    c.line(15, 22, 5, 12, 0x3a3028, 255, 2);
    c.line(5, 12, 3, 5, 0x3a3028);
    c.line(15, 18, 25, 8, 0x3a3028, 255, 2);
    c.line(25, 8, 28, 3, 0x3a3028);
    c.line(20, 13, 23, 15, 0x3a3028);
    c.rect(10, 38, 10, 2, 0x2a2018);
    c.px(6, 11, 0x5a7a3a); c.px(24, 9, 0x5a7a3a); c.px(14, 30, 0x5a7a3a);
    c.outline(OUT);
    return c;
}

function drawReeds() {
    const c = new PixelCanvas(18, 24);
    for (const [x, h, col] of [[3, 16, 0x5a7a34], [7, 22, 0x6a8a3a], [11, 18, 0x5a7a34], [14, 13, 0x4a6a2e]] as [number, number, number][]) {
        c.line(x, 23, x + (x % 2 ? 1 : -1), 23 - h, col);
        if (h > 17) c.rect(x - 1, 23 - h, 2, 5, 0x6a4a2a);
    }
    c.outline(OUT);
    return c;
}

function drawMushroom() {
    const c = new PixelCanvas(20, 16);
    c.rect(5, 9, 3, 6, 0xe8dcc0);
    c.ellipse(6.5, 8, 5.5, 3.5, 0x9a40c0);
    c.px(4, 7, 0xe0b0ff); c.px(8, 6, 0xe0b0ff);
    c.rect(13, 11, 2, 4, 0xe8dcc0);
    c.ellipse(14, 10, 3.5, 2.5, 0x7ad040);
    c.px(13, 9, 0xd0ffa0);
    c.outline(OUT);
    return c;
}

function drawBogPool() {
    const c = new PixelCanvas(36, 18);
    c.ellipse(18, 9, 17.5, 8.5, 0x1a2a14);
    c.ellipse(18, 9, 15, 6.5, 0x3a6a24);
    c.ellipse(17, 8, 10, 4, 0x6aa030);
    c.circle(12, 7, 1.5, 0xb0e060); c.circle(22, 9, 1, 0xb0e060);
    return c;
}

function drawBubble() {
    const c = new PixelCanvas(20, 20);
    c.circle(10, 10, 8, 0x80e040, 200);
    c.circle(10, 10, 6, 0xa8ff60, 160);
    c.circle(7, 7, 2, 0xf0ffd0);
    c.outline(0x2a4a14);
    return c;
}

// ---- 圣诞：雪夜小镇
function drawGroundXmas() {
    const c = tileNoise(141, [0xd8e2ee, 0xe0e8f2, 0xd0dae8], [[0xc0cede, 5], [0xeef4fa, 6]]);
    const r = rng(142);
    // 零星的彩色灯光反射
    for (let k = 0; k < 5; k++) {
        const x = Math.floor(r() * 62), y = Math.floor(r() * 62);
        c.px(x, y, [0xff6060, 0x60d060, 0xffd040, 0x60a0ff][k % 4]);
    }
    return c;
}

function drawXmasTree() {
    const c = new PixelCanvas(32, 44);
    c.rect(14, 37, 4, 6, 0x6a4024);
    for (const [y, w] of [[30, 28], [22, 22], [14, 16], [7, 10]]) {
        c.poly([[16 - w / 2, y + 8], [16 + w / 2, y + 8], [16, y - 3]], 0x2a7a3a);
        c.poly([[16 - w / 2, y + 8], [16, y + 8], [16, y - 3]], 0x1e5a2c);
        c.rect(16 - w / 2 + 2, y + 6, w - 4, 1, 0xf0f6ff);
    }
    const r = rng(7);
    for (let k = 0; k < 9; k++) c.px(9 + Math.floor(r() * 14), 10 + Math.floor(r() * 26), [0xff4040, 0xffd040, 0x60a0ff][k % 3]);
    c.poly([[16, 0], [18, 4], [22, 4], [19, 7], [20, 11], [16, 8], [12, 11], [13, 7], [10, 4], [14, 4]], 0xffd040);
    c.outline(OUT);
    return c;
}

function drawGift() {
    const c = new PixelCanvas(18, 18);
    c.rect(2, 7, 14, 10, 0xd83030);
    c.rect(1, 5, 16, 3, 0xe84848);
    c.rect(8, 5, 2, 12, 0xffd040);
    c.rect(1, 6, 16, 1, 0xffd040);
    c.ellipse(6, 3, 3, 2, 0xffd040);
    c.ellipse(12, 3, 3, 2, 0xffd040);
    c.outline(OUT);
    return c;
}

function drawCandyCane() {
    const c = new PixelCanvas(12, 26);
    for (let y = 6; y < 25; y++) c.rect(2, y, 3, 1, (y >> 1) % 2 ? 0xd83030 : 0xf8f8f8);
    // 拐杖弯钩：上半圆弧 + 右侧短尾
    for (let k = 0; k <= 16; k++) {
        const t = Math.PI + (k / 16) * Math.PI;
        const x = Math.round(6 + Math.cos(t) * 3.2), y = Math.round(6 + Math.sin(t) * 3.2);
        c.rect(x - 1, y, 3, 2, k % 4 < 2 ? 0xd83030 : 0xf8f8f8);
    }
    c.rect(8, 6, 3, 3, 0xd83030);
    c.outline(OUT);
    return c;
}

// 雪怪王（圣诞限定 Boss）：白色长毛雪怪 + 圣诞帽
function drawYeti(f: number) {
    const c = new PixelCanvas(52, 52);
    const W = 0xe8f0fa, WD = 0xb8c8dc, SKIN = 0x8aa0c0;
    const arm = f ? 2 : 0;
    c.ellipse(26, 34, 18, 16, WD);
    c.ellipse(26, 33, 17, 15, W);
    // 手臂
    c.ellipse(8, 32 + arm, 6, 11, WD);
    c.ellipse(44, 32 - arm, 6, 11, WD);
    c.ellipse(8, 31 + arm, 5, 10, W);
    c.ellipse(44, 31 - arm, 5, 10, W);
    // 脸
    c.ellipse(26, 24, 10, 8, SKIN);
    c.rect(20, 21, 3, 3, OUT); c.rect(29, 21, 3, 3, OUT);
    c.px(21, 21, 0x80e0ff); c.px(30, 21, 0x80e0ff);
    c.rect(21, 27, 10, 3, 0x3a2a40);
    c.px(22, 27, 0xffffff); c.px(29, 27, 0xffffff);
    // 毛发纹理
    for (const [x, y] of [[14, 40], [20, 44], [32, 44], [38, 40], [26, 46], [12, 30], [40, 28]] as [number, number][]) c.px(x, y, WD);
    // 脚
    c.ellipse(18, 49, 6, 3, WD); c.ellipse(34, 49, 6, 3, WD);
    // 圣诞帽
    c.poly([[13, 17], [39, 17], [30, 4], [24, 2]], 0xd83030);
    c.poly([[24, 2], [30, 4], [36, 0], [34, -1]], 0xd83030);
    c.rect(12, 15, 28, 4, 0xf8f8f8);
    c.circle(37, 1, 3, 0xf8f8f8);
    c.outline(OUT);
    return c;
}

// 圣诞蛙：圣诞帽 + 白胡子
function santaFrog(src: PixelCanvas) {
    const c = new PixelCanvas(src.w, src.h);
    c.data.set(src.data);
    const { top, cx, hw } = headBox(src);
    c.poly([[cx - hw, top + 6], [cx + hw, top + 6], [cx + 4, top - 8], [cx - 2, top - 9]], 0xd83030);
    c.poly([[cx + 4, top - 8], [cx + hw + 3, top - 3], [cx + hw + 4, top - 1]], 0xd83030);
    c.rect(Math.round(cx - hw - 1), top + 4, Math.round(hw * 2 + 2), 4, 0xf8f8f8);
    c.circle(cx + hw + 4, top, 2.5, 0xf8f8f8);
    // 胡子
    const by = top + Math.round(hw * 0.75) + 9;
    c.ellipse(cx, by + 3, hw * 0.7, 5, 0xf8f8f8);
    c.ellipse(cx, by + 1, hw * 0.45, 2, 0xe8e8f0);
    return c;
}

function drawPine() {
    const c = new PixelCanvas(28, 40);
    c.rect(12, 32, 4, 7, 0x5a3a24);
    for (const [y, w] of [[26, 24], [18, 18], [11, 12], [5, 7]]) {
        c.poly([[14 - w / 2, y + 8], [14 + w / 2, y + 8], [14, y - 2]], 0x2a5a48);
        c.poly([[14 - w / 2, y + 8], [14, y + 8], [14, y - 2]], 0x1e4436);
        c.rect(14 - w / 2 + 2, y + 6, w - 4, 2, 0xf0f6ff);
    }
    c.rect(13, 1, 2, 3, 0xf0f6ff);
    c.outline(OUT);
    return c;
}

function drawIceRock() {
    const c = new PixelCanvas(18, 14);
    c.poly([[1, 13], [4, 4], [9, 1], [14, 5], [17, 13]], 0x8ab8e0);
    c.poly([[4, 4], [9, 1], [9, 13], [4, 13]], 0xb8dcf8);
    c.line(9, 2, 12, 9, 0xe8f6ff);
    c.outline(OUT);
    return c;
}

function drawSnowman() {
    const c = new PixelCanvas(18, 24);
    c.circle(9, 17, 6.5, 0xf4f8ff);
    c.circle(9, 8, 4.5, 0xf4f8ff);
    c.circle(7.5, 16, 4.5, 0xdfe8f4);
    c.px(7, 7, OUT); c.px(11, 7, OUT);
    c.rect(9, 9, 3, 1, 0xff8a30);
    c.rect(4, 11, 10, 2, 0xd03030);
    c.rect(5, 1, 8, 3, 0x2a2a34);
    c.rect(3, 4, 12, 1, 0x2a2a34);
    c.outline(OUT);
    return c;
}

function drawLavaRock() {
    const c = new PixelCanvas(18, 14);
    c.ellipse(9, 8, 8, 5.5, 0x3a2626);
    c.ellipse(8, 7, 5.5, 3.5, 0x4e3430);
    c.line(4, 9, 9, 6, 0xe05018);
    c.line(9, 6, 13, 10, 0xff9030);
    c.outline(OUT);
    return c;
}

function drawObsidian() {
    const c = new PixelCanvas(14, 20);
    c.poly([[2, 19], [4, 6], [7, 0], [10, 7], [12, 19]], 0x241830);
    c.poly([[7, 0], [10, 7], [12, 19], [7, 19]], 0x3a2a50);
    c.line(5, 7, 6, 16, 0x8a6ac0);
    c.outline(OUT);
    return c;
}

function drawLavaPool() {
    const c = new PixelCanvas(36, 18);
    c.ellipse(18, 9, 17.5, 8.5, 0x5a1a10);
    c.ellipse(18, 9, 15, 6.5, 0xd04018);
    c.ellipse(17, 8, 10, 4, 0xff8a28);
    c.ellipse(15, 7, 4, 1.5, 0xffd060);
    return c;
}

function drawSkullPile() {
    const c = new PixelCanvas(18, 12);
    for (const [x, y] of [[5, 7], [12, 7], [9, 3]]) {
        c.circle(x, y, 3.2, 0xe8e2d0);
        c.px(x - 1, y, OUT); c.px(x + 1, y, OUT);
    }
    c.outline(OUT);
    return c;
}

function drawIcicle() {
    const c = new PixelCanvas(10, 24);
    c.poly([[1, 0], [9, 0], [5, 23]], 0x9ad4f8);
    c.poly([[3, 0], [6, 0], [5, 18]], 0xe8f8ff);
    c.outline(0x2a4a6a);
    return c;
}

function drawMeteor() {
    const c = new PixelCanvas(18, 26);
    c.poly([[5, 0], [13, 0], [15, 14], [3, 14]], 0xff8a20, 140);
    c.poly([[7, 2], [11, 2], [12, 14], [6, 14]], 0xffd060, 200);
    c.circle(9, 18, 6.5, 0x4a2a24);
    c.circle(8, 17, 4, 0x6a3a2a);
    c.px(10, 20, 0xff9030);
    c.outline(OUT);
    return c;
}

// ---------------------------------------------------------------- 新春活动：年夜庙会 / 年兽 / 福蛙

function drawGroundFest() {
    // 红砖广场：砖缝 + 金色花纹
    const N = 64;
    const c = new PixelCanvas(N, N);
    const r = rng(207);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.px(x, y, [0x7a2a26, 0x82302a, 0x742622][Math.floor(r() * 3)]);
    for (let y = 0; y < N; y += 16) {
        c.rect(0, y, N, 1, 0x4a1614);
        const off = (y / 16) % 2 ? 16 : 0;
        for (let x = off; x < N; x += 32) c.rect(x, y, 1, 16, 0x4a1614);
    }
    for (const [x, y] of [[12, 6], [44, 22], [28, 40], [56, 54]]) {
        c.rect(x - 2, y, 5, 1, 0xc89a40);
        c.rect(x, y - 2, 1, 5, 0xc89a40);
    }
    return c;
}

function drawLantern() {
    const c = new PixelCanvas(16, 36);
    c.rect(7, 0, 2, 36, 0x5a3a24);
    c.rect(2, 6, 12, 2, 0x5a3a24);
    c.rect(3, 8, 1, 3, 0xc89a40);
    c.ellipse(4, 15, 4, 5, 0xd82a20);
    c.ellipse(3.5, 14, 2, 3, 0xff6a40);
    c.rect(2, 10, 5, 1, 0xf5c542);
    c.rect(2, 19, 5, 1, 0xf5c542);
    c.rect(4, 20, 1, 4, 0xf5c542);
    c.rect(12, 8, 1, 3, 0xc89a40);
    c.ellipse(12, 15, 4, 5, 0xd82a20);
    c.ellipse(11.5, 14, 2, 3, 0xff6a40);
    c.rect(10, 10, 5, 1, 0xf5c542);
    c.rect(10, 19, 5, 1, 0xf5c542);
    c.rect(12, 20, 1, 4, 0xf5c542);
    c.outline(OUT);
    return c;
}

function drawFirecracker() {
    const c = new PixelCanvas(12, 28);
    c.rect(5, 0, 2, 28, 0x8a6a40);
    for (let i = 0; i < 6; i++) {
        const y = 3 + i * 4, x = i % 2 ? 6 : 1;
        c.rect(x, y, 5, 3, 0xd82a20);
        c.rect(x, y, 5, 1, 0xff6a40);
        c.px(x + (i % 2 ? 4 : 0), y + 1, 0xf5c542);
    }
    c.outline(OUT);
    return c;
}

function drawRedGate() {
    const c = new PixelCanvas(44, 40);
    c.rect(6, 10, 4, 30, 0xb02420);
    c.rect(34, 10, 4, 30, 0xb02420);
    c.rect(6, 10, 1, 30, 0x7a1814);
    c.rect(34, 10, 1, 30, 0x7a1814);
    c.poly([[0, 8], [44, 8], [40, 2], [4, 2]], 0x2a3a48);
    c.rect(2, 8, 40, 4, 0xd83020);
    c.rect(16, 13, 12, 7, 0xf5c542);
    c.rect(18, 15, 8, 3, 0xd83020);
    c.outline(OUT);
    return c;
}

function drawPlum() {
    const c = new PixelCanvas(28, 34);
    c.line(14, 33, 14, 18, 0x4a2a1a, 255, 2);
    c.line(14, 22, 6, 12, 0x4a2a1a);
    c.line(14, 20, 22, 9, 0x4a2a1a);
    c.line(8, 14, 4, 6, 0x4a2a1a);
    c.line(20, 11, 24, 4, 0x4a2a1a);
    const r = rng(33);
    for (let i = 0; i < 18; i++) {
        const x = 3 + r() * 22, y = 2 + r() * 18;
        c.circle(x, y, 1.6, r() < 0.5 ? 0xff7a9a : 0xffb0c4);
        c.px(x, y, 0xfff0a0);
    }
    c.outline(OUT, 200);
    return c;
}

function drawNian(f: number) {
    const c = new PixelCanvas(48, 48);
    const R = 0xd8402a, RD = 0x9a2418, GOLD = 0xf5c542, GD = 0xc08a20;
    // 腿
    const la = f ? 1 : -1;
    c.rect(12 + la, 36, 6, 10, RD);
    c.rect(30 - la, 36, 6, 10, R);
    c.rect(11 + la, 44, 8, 3, GOLD);
    c.rect(29 - la, 44, 8, 3, GOLD);
    // 身体
    c.ellipse(24, 30, 15, 10, R);
    c.ellipse(22, 32, 9, 6, 0xf07a4a);
    // 鬃毛
    for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.9 + k * 0.15);
        c.circle(24 + Math.cos(a) * 13, 17 + Math.sin(a) * 11, 4.5, k % 2 ? GOLD : GD);
    }
    // 头
    c.ellipse(24, 18, 11, 10, R);
    c.ellipse(24, 22, 8, 5, 0xf07a4a);
    // 角
    c.poly([[15, 10], [10, 0], [18, 8]], 0xf4ecd8);
    c.poly([[33, 10], [38, 0], [30, 8]], 0xf4ecd8);
    // 眼睛
    c.circle(19, 15, 3, 0xffffff);
    c.circle(29, 15, 3, 0xffffff);
    c.circle(19.5, 15.5, 1.6, OUT);
    c.circle(29.5, 15.5, 1.6, OUT);
    c.rect(15, 11, 7, 1, RD);
    c.rect(27, 11, 7, 1, RD);
    // 嘴
    if (f) {
        c.ellipse(24, 24, 6, 3.5, 0x4a0a0a);
        c.rect(19, 21, 2, 2, 0xffffff); c.rect(27, 21, 2, 2, 0xffffff);
    } else {
        c.rect(18, 24, 12, 2, 0x4a0a0a);
        c.px(19, 23, 0xffffff); c.px(28, 23, 0xffffff);
    }
    // 尾巴
    c.circle(41, 24, 4, GOLD);
    c.outline(OUT);
    return c;
}

// 福蛙：在奶蛙的头顶加瓜皮帽、胸前挂金钱
function fuFrog(src: PixelCanvas) {
    const c = new PixelCanvas(src.w, src.h);
    c.data.set(src.data);
    let top = -1, minX = src.w, maxX = 0;
    for (let y = 0; y < src.h && top < 0; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) { top = y; break; }
    for (let y = top; y < top + 6; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    const cx = (minX + maxX) / 2;
    const hw = Math.max(8, (maxX - minX) / 2 + 2);
    c.ellipse(cx, top + 4, hw, 6, 0x9a1c18);
    c.rect(Math.round(cx - hw), top + 7, Math.round(hw * 2), 2, 0xf5c542);
    c.circle(cx, top - 2, 2.5, 0xf5c542);
    c.rect(Math.round(cx) - 1, top - 1, 2, 3, 0xd82a20);
    // 金钱
    const ny = Math.round(src.h * 0.52);
    c.circle(cx, ny, 4.5, 0xf5c542);
    c.rect(Math.round(cx) - 1, ny - 1, 3, 3, 0xc08a20);
    c.line(cx - 8, ny - 7, cx - 3, ny - 3, 0xd82a20);
    c.line(cx + 8, ny - 7, cx + 3, ny - 3, 0xd82a20);
    return c;
}

// 头顶位置（福蛙 / 德鲁伊蛙 / 棱镜蛙的装扮定位）
function headBox(src: PixelCanvas) {
    let top = -1, minX = src.w, maxX = 0;
    for (let y = 0; y < src.h && top < 0; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) { top = y; break; }
    for (let y = top; y < top + 6; y++) for (let x = 0; x < src.w; x++) if (src.alpha(x, y) > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    return { top, cx: (minX + maxX) / 2, hw: Math.max(8, (maxX - minX) / 2 + 2) };
}

// 德鲁伊蛙：树叶花冠 + 藤蔓披肩 + 小蘑菇
function druidFrog(src: PixelCanvas) {
    const c = new PixelCanvas(src.w, src.h);
    c.data.set(src.data);
    // 身体染成青绿色（黄色系像素 → 绿色系，保留明暗）
    const d = c.data;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (d[i + 3] && r > 150 && g > 120 && b < g * 0.8) { d[i] = Math.round(r * 0.5); d[i + 1] = Math.round(g * 0.92); d[i + 2] = Math.round(b * 0.7 + 20); }
    }
    const { top, cx, hw } = headBox(src);
    for (let k = -3; k <= 3; k++) {
        const x = cx + k * (hw / 3.2), y = top + 2 + Math.abs(k) * 0.8;
        c.ellipse(x, y, 3, 2, k % 2 ? 0x3a9a40 : 0x58c050);
        c.px(Math.round(x), Math.round(y) - 1, 0xa0e080);
    }
    c.circle(cx, top - 1, 2, 0xe04040);
    c.px(Math.round(cx) - 1, top - 2, 0xffffff);
    // 藤蔓披肩
    const sy = Math.round(src.h * 0.5);
    for (let x = Math.round(cx - hw - 2); x <= cx + hw + 2; x++) {
        const y = sy + Math.round(Math.sin(x * 0.7) * 1.5);
        if (src.alpha(x, y) > 0) c.px(x, y, 0x2f7a35);
        if (src.alpha(x, y + 1) > 0) c.px(x, y + 1, 0x4a9a40);
        if (x % 4 === 0 && src.alpha(x, y + 2) > 0) c.px(x, y + 2, 0x7ad060);
    }
    return c;
}

// 棱镜蛙：青色护目镜 + 头顶水晶
function prismFrog(src: PixelCanvas) {
    const c = new PixelCanvas(src.w, src.h);
    c.data.set(src.data);
    const { top, cx, hw } = headBox(src);
    // 水晶
    c.poly([[cx, top - 9], [cx + 4, top - 3], [cx, top + 2], [cx - 4, top - 3]], 0x60e8ff);
    c.poly([[cx, top - 9], [cx + 4, top - 3], [cx, top - 3]], 0xd0ffff);
    c.line(cx, top + 2, cx, top + 4, 0x8090a0);
    // 护目镜：找眼睛所在行（头部偏下）
    const ey = top + Math.round(hw * 0.75) + 5;
    c.rect(Math.round(cx - hw - 1), ey - 3, Math.round(hw * 2 + 2), 7, 0x303848);
    c.rect(Math.round(cx - hw + 1), ey - 2, Math.round(hw - 2), 5, 0x40d8ff);
    c.rect(Math.round(cx + 1), ey - 2, Math.round(hw - 2), 5, 0x40d8ff);
    c.rect(Math.round(cx - hw + 2), ey - 1, 2, 2, 0xe0ffff);
    c.rect(Math.round(cx + 2), ey - 1, 2, 2, 0xe0ffff);
    return c;
}

function drawFirework() {
    const c = new PixelCanvas(24, 24);
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        c.line(12 + Math.cos(a) * 4, 12 + Math.sin(a) * 4, 12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11, k % 2 ? 0xffd040 : 0xff5a40);
    }
    c.circle(12, 12, 2.5, 0xffffff);
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
        c.rect(2, 1, 12, 14, 0x5a3aa0);
        c.rect(2, 1, 2, 14, 0x3a2470);
        c.rect(12, 2, 2, 12, 0xf4ecd8);
        c.poly([[8, 4], [9, 7], [12, 7], [9.5, 9], [10.5, 12], [8, 10], [5.5, 12], [6.5, 9], [4, 7], [7, 7]], 0xf5c542);
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
        c.px(8, 8, 0xffffff); c.px(7, 9, 0xffffff); c.px(9, 9, 0xffffff); c.px(8, 10, 0xffffff);
        c.px(10, 11, 0xffffff); c.px(6, 12, 0xffffff);
    }),
    icon_cross: () => icon(c => {
        c.poly([[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], 0xf5c542);
        c.poly([[8, 2], [9, 7], [8, 8], [7, 7]], 0xfff0a0);
        c.circle(8, 8, 1.5, 0xfff8d0);
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
    icon_laser: () => icon(c => {
        c.poly([[2, 8], [6, 3], [10, 8], [6, 13]], 0xa0f0ff);
        c.poly([[6, 3], [10, 8], [6, 8]], 0xffffff);
        c.rect(10, 7, 6, 2, 0x60e8ff);
        c.px(15, 7, 0xffffff);
    }),
    icon_spikes: () => icon(c => {
        c.rect(1, 13, 14, 2, 0x6a4a30);
        c.poly([[2, 13], [4, 5], [6, 13]], 0xb8a890);
        c.poly([[6, 13], [8, 1], [10, 13]], 0xd8ccb8);
        c.poly([[10, 13], [12, 6], [14, 13]], 0xb8a890);
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
        c.line(1, 2, 8, 5, 0x8a5a30); c.line(8, 5, 15, 2, 0x8a5a30);
        c.poly([[3, 3], [7, 4], [5, 14]], 0xf4ecd8);
        c.poly([[9, 4], [13, 3], [11, 14]], 0xf4ecd8);
        c.px(5, 12, 0x6ad070); c.px(11, 12, 0x6ad070);
    }),
    icon_thorns: () => icon(c => {
        c.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], 0x6a7a50);
        for (const [x, y] of [[1, 1], [15, 1], [0, 8], [16, 8], [8, 16], [8, 0]]) c.line(8, 8, x, y, 0x3a4a28, 255, 1);
        c.rect(6, 5, 4, 4, 0xa0b070);
    }),
    icon_heal: () => drawChicken(),
    icon_saw: () => icon(c => {
        c.circle(8, 8, 7, 0xb8c0cc);
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.poly([[8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6], [8 + Math.cos(a + 0.3) * 8.5, 8 + Math.sin(a + 0.3) * 8.5], [8 + Math.cos(a + 0.5) * 6, 8 + Math.sin(a + 0.5) * 6]], 0xe0e6f0); }
        c.circle(8, 8, 2.5, 0xd03030);
        c.px(6, 5, 0xffffff);
    }),
    icon_sonic: () => icon(c => {
        c.poly([[1, 6], [5, 6], [11, 1], [11, 15], [5, 10], [1, 10]], 0xf5c542);
        c.rect(1, 6, 4, 4, 0xc89830);
        c.ring(9, 8, 6, 1, 0x80d0ff); c.ring(9, 8, 8.5, 1, 0x80d0ff);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 12; x++) if (c.alpha(x, y) && c.data[(y * 16 + x) * 4] === 0x80) c.clear(x, y);
    }),
    icon_tadpole: () => icon(c => {
        c.ellipse(5, 7, 4, 3.5, 0x3a3a50);
        c.poly([[8, 6], [15, 3], [12, 8], [15, 13], [8, 9]], 0x5a5a70);
        c.px(4, 6, 0xffffff); c.px(3, 6, OUT);
        c.circle(12, 13, 2, 0xff8030); c.px(12, 13, 0xfff080);
    }),
    icon_whirl: () => icon(c => {
        c.rect(5, 12, 6, 4, 0x8ad0e0); c.rect(6, 10, 4, 2, 0xc0e8f0);
        for (let y = 0; y < 10; y++) { const w = 1 + (10 - y) * 0.45, cx = 8 + Math.sin(y / 2) * 1.5; c.rect(Math.round(cx - w), y, Math.round(w * 2), 1, y % 3 ? 0xd8c090 : 0xb89a68); }
    }),
    icon_mirror: () => icon(c => {
        c.poly([[2, 1], [14, 1], [14, 9], [8, 15], [2, 9]], 0xa8b4c8);
        c.poly([[4, 3], [12, 3], [12, 8.5], [8, 13], [4, 8.5]], 0xd8f0ff);
        c.line(5, 4, 9, 8, 0xffffff); c.line(9, 4, 11, 6, 0xffffff);
    }),
    icon_badge: () => icon(c => {
        c.poly([[3, 1], [7, 1], [8, 6], [6, 6]], 0xd03030); c.poly([[13, 1], [9, 1], [8, 6], [10, 6]], 0x3050d0);
        c.circle(8, 10.5, 5, 0xf5c542); c.circle(8, 10.5, 3.5, 0xffe080);
        c.poly([[6, 8], [8, 10], [10, 8], [10, 13], [6, 13]], 0xc89830);
    }),
    icon_cloak: () => icon(c => {
        c.poly([[5, 1], [11, 1], [15, 15], [8, 13], [1, 15]], 0x60b0a0);
        c.poly([[8, 2], [11, 2], [13, 13], [8, 12]], 0x4a8a80);
        for (let y = 5; y < 14; y += 3) c.line(3 + y / 4, y, 13 - y / 4, y, 0x90e0d0);
        c.rect(6, 1, 4, 2, 0xf5c542);
    }),
    icon_arrow: () => icon(c => {
        c.line(2, 14, 11, 5, 0x8a5a30, 255, 2);
        c.poly([[9, 3], [15, 1], [13, 7]], 0xb8c0cc);
        c.poly([[1, 12], [4, 11], [5, 12], [4, 15], [2, 15]], 0xe05050);
    }),
    icon_tongue: () => icon(c => {
        c.ellipse(4, 8, 4, 4, 0x6ac058); c.px(3, 6, OUT);
        c.line(6, 9, 13, 5, 0xff7090, 255, 2);
        c.circle(13.5, 4.5, 2, 0xff90a8);
    }),
    icon_turret: () => icon(c => {
        c.ellipse(8, 6, 7, 5, 0xe03030);
        c.circle(5, 5, 1.3, 0xffffff); c.circle(11, 4, 1.1, 0xffffff);
        c.rect(5, 10, 6, 5, 0xf4ecd8);
        c.rect(10, 7, 6, 3, 0x6a6a80); c.px(15, 8, 0xffe060);
    }),
    icon_mine: () => icon(c => {
        c.ellipse(8, 11, 7.5, 4, 0x4a9a40);
        c.poly([[8, 11], [15, 9], [15, 12]], 0x2e6a2a);
        c.circle(8, 7, 3.5, 0x3a3a48); c.px(7, 6, 0xffffff);
        c.line(10, 4, 12, 1, 0x8a5a30); c.px(12, 1, 0xffc040);
    }),
    icon_fresh: () => icon(c => {
        c.rect(3, 1, 10, 14, 0xf4e4b8); c.rect(3, 1, 10, 2, 0xd03030); c.rect(3, 13, 10, 2, 0xd03030);
        c.poly([[9, 4], [6, 8], [8, 8], [7, 12], [10, 7], [8, 7]], 0xd03030);
    }),
    icon_finder: () => icon(c => {
        c.circle(8, 8, 7, 0xc89830); c.circle(8, 8, 5.5, 0xf4ecd8);
        c.poly([[8, 3], [9.5, 8], [8, 8.5]], 0xd03030); c.poly([[8, 13], [6.5, 8], [8, 7.5]], 0x3a3a48);
        c.px(8, 8, 0xf5c542);
    }),
    icon_moss: () => icon(c => {
        c.poly([[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], 0x7a8290);
        c.ellipse(6, 4, 4, 2.5, 0x5ab048); c.ellipse(11, 7, 3, 2, 0x5ab048); c.ellipse(7, 10, 3, 2, 0x4a9a40);
        c.px(5, 3, 0xa0e080); c.px(11, 6, 0xa0e080);
    }),
    icon_core: () => icon(c => {
        c.poly([[8, 0], [15, 4], [15, 12], [8, 16], [1, 12], [1, 4]], 0x3a4a80);
        c.poly([[8, 3], [12, 5.5], [12, 10.5], [8, 13], [4, 10.5], [4, 5.5]], 0x60e0ff);
        c.circle(8, 8, 2.2, 0xffffff);
    }),
    icon_sand: () => icon(c => {
        c.rect(2, 0, 12, 2, 0x8a5a30); c.rect(2, 14, 12, 2, 0x8a5a30);
        c.poly([[3, 2], [13, 2], [9, 8], [13, 14], [3, 14], [7, 8]], 0xfff4d8);
        c.poly([[5, 3], [11, 3], [8, 7]], 0xe8b860);
        c.poly([[8, 10], [11, 13], [5, 13]], 0xe8b860);
        c.px(8, 8, 0xe8b860); c.px(8, 9, 0xe8b860);
    }),
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
        c.poly([[12, 1], [14, 4], [9, 11], [5, 13], [6, 9]], 0xf5c542);
        c.poly([[12, 1], [9, 6], [6, 9], [7, 7]], 0xfff0a0);
        c.line(5, 13, 2, 15, 0xc89020);
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
    c.poly([[9, 0], [11, 7], [18, 9], [11, 11], [9, 18], [7, 11], [0, 9], [7, 7]], 0xf5c542);
    c.poly([[9, 2], [10, 8], [9, 9], [8, 8]], 0xfff0a0);
    c.circle(9, 9, 1.8, 0xfff8d0);
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

function drawHaste() {
    // 急速沙漏
    const c = new PixelCanvas(12, 16);
    c.rect(0, 0, 12, 2, 0x8a5a30);
    c.rect(0, 14, 12, 2, 0x8a5a30);
    c.poly([[1, 2], [11, 2], [7, 8], [11, 14], [1, 14], [5, 8]], 0xd8f4ff);
    c.poly([[3, 3], [9, 3], [6, 7]], 0x60d0ff);
    c.poly([[6, 9], [9, 13], [3, 13]], 0x60d0ff);
    c.outline(OUT);
    return c;
}

function drawClover() {
    const c = new PixelCanvas(16, 16);
    for (const [x, y] of [[5, 5], [11, 5], [5, 10], [11, 10]]) c.circle(x, y, 3.6, 0x4cc04c);
    c.circle(8, 7.5, 2.2, 0x6ad86a);
    c.circle(4, 4, 1.2, 0xa0f0a0);
    c.line(8, 9, 10, 15, 0x2e8a2e, 255, 2);
    c.outline(OUT);
    return c;
}

function drawFireRing() {
    const c = new PixelCanvas(16, 16);
    c.ring(8, 8, 7, 3, 0xff6020);
    c.ring(8, 8, 6, 1.5, 0xffc040);
    for (const [x, y] of [[8, 1], [15, 8], [8, 15], [1, 8]]) c.circle(x, y, 1.5, 0xfff080);
    c.outline(OUT);
    return c;
}

function drawScroll() {
    const c = new PixelCanvas(16, 14);
    c.rect(2, 2, 12, 10, 0xf4e4b8);
    c.rect(0, 1, 3, 12, 0xc89858);
    c.rect(13, 1, 3, 12, 0xc89858);
    for (const y of [4, 7, 10]) c.line(5, y, 11, y, 0x8a6a40);
    c.circle(10, 9, 1.6, 0xe03030);
    c.outline(OUT);
    return c;
}

// ---------------------------------------------------------------- 流沙荒漠 / 新怪物

function drawGroundSand() {
    const c = tileNoise(171, [0xd8b46a, 0xdcba70, 0xd2ae64], [[0xe6c886, 6], [0xc49e58, 5]]);
    // 风吹出的沙纹
    for (const y0 of [10, 30, 50]) for (let x = 0; x < 64; x++) {
        const y = y0 + Math.round(Math.sin((x / 64) * Math.PI * 4) * 2);
        c.px(x, y, 0xc49a54);
        if (x % 4 === 0) c.px(x, y - 1, 0xeed08e);
    }
    return c;
}

function drawCactus() {
    const c = new PixelCanvas(20, 30);
    c.rect(8, 4, 5, 25, 0x4a9a40);
    c.rect(9, 4, 2, 25, 0x6ac058);
    c.rect(2, 10, 4, 9, 0x4a9a40); c.rect(2, 17, 7, 3, 0x4a9a40);
    c.rect(15, 7, 4, 8, 0x4a9a40); c.rect(12, 13, 7, 3, 0x4a9a40);
    c.circle(10.5, 4, 2.5, 0xf06aa0);
    for (const [x, y] of [[7, 8], [13, 15], [7, 22], [13, 24], [3, 12], [18, 9]]) c.px(x, y, 0xf4ecd8);
    c.outline(OUT);
    return c;
}

function drawSandRock() {
    const c = new PixelCanvas(26, 16);
    c.poly([[1, 15], [4, 6], [11, 2], [19, 4], [25, 15]], 0xb08050);
    c.poly([[11, 2], [19, 4], [25, 15], [15, 15]], 0x8a6038);
    c.line(5, 8, 11, 4, 0xd0a070);
    c.outline(OUT);
    return c;
}

function drawSkullRock() {
    // 风化的兽角（荒漠装饰）
    const c = new PixelCanvas(22, 14);
    c.poly([[1, 13], [4, 5], [9, 1], [8, 6], [6, 13]], 0xf0e6cc);
    c.poly([[21, 13], [18, 5], [13, 1], [14, 6], [16, 13]], 0xf0e6cc);
    c.rect(5, 10, 12, 3, 0xc8b898);
    c.outline(OUT);
    return c;
}

function drawTornado(f: number) {
    const c = new PixelCanvas(40, 56);
    for (let y = 0; y < 52; y++) {
        const w = 4 + (52 - y) * 0.32, cx = 20 + Math.sin(y / 6 + f * 1.6) * 3;
        for (let x = Math.floor(cx - w); x <= cx + w; x++) {
            const band = Math.floor((x - cx + y * 0.6 + f * 3) / 3) % 2;
            c.px(x, y, band ? 0xd8c090 : 0xb89a68, 210);
        }
    }
    for (let k = 0; k < 6; k++) c.px(6 + k * 5, 4 + ((k * 7 + f * 5) % 40), 0x8a6a40);
    return c;
}

// 宝箱怪：f=0 伪装成宝箱，f=1 张开大嘴
function drawMimic(f: number) {
    const c = new PixelCanvas(28, 28);
    const lid = f ? 6 : 10;
    c.rect(3, 13, 22, 13, 0x8a4a20);
    c.rect(3, 13, 22, 1, 0xf5c542);
    c.rect(3, 13, 1, 13, 0xf5c542); c.rect(24, 13, 1, 13, 0xf5c542);
    if (f) {
        c.rect(4, 7, 20, 6, 0x5a0a18);
        for (let x = 5; x < 23; x += 3) { c.poly([[x, 13], [x + 1.5, 10], [x + 3, 13]], 0xf4ecd8); c.poly([[x, lid + 1], [x + 1.5, lid + 4], [x + 3, lid + 1]], 0xf4ecd8); }
        c.rect(10, 10, 8, 3, 0xe03050);
        c.rect(6, 15, 3, 3, 0xffe040); c.rect(19, 15, 3, 3, 0xffe040);
        c.px(7, 16, OUT); c.px(20, 16, OUT);
    }
    c.rect(3, lid - 4, 22, 5, 0xa85a28);
    c.rect(3, lid - 4, 22, 1, 0xc87a40);
    c.rect(12, lid, 4, 3, 0xf5c542);
    c.outline(OUT);
    return c;
}

// 水平镜像（新怪物按面朝左绘制，引擎约定面朝右）
function flipX(src: PixelCanvas) {
    const c = new PixelCanvas(src.w, src.h);
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4, j = (y * src.w + (src.w - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) c.data[j + k] = src.data[i + k];
    }
    return c;
}

// 野猪：冲锋型
function drawBoar(f: number) {
    const c = new PixelCanvas(32, 32);
    const B = 0x8a5a3a, BD = 0x5a3820, BL = 0xb07a50;
    c.ellipse(17, 19, 11, 7.5, B);
    c.ellipse(17, 16, 9, 3, BL);
    for (let x = 9; x < 25; x += 3) c.px(x, 11 - (x % 2), BD);
    c.ellipse(7, 20, 5.5, 4.5, B);
    c.ellipse(4, 21, 2.5, 2, 0xd89a80);
    c.px(3, 21, OUT); c.px(5, 21, OUT);
    c.poly([[5, 23], [3, 26], [6, 24]], 0xf4ecd8);
    c.rect(7, 18, 2, 2, OUT); c.px(7, 18, 0xff5040);
    c.poly([[9, 14], [11, 11], [12, 15]], BD);
    const l = f ? 1 : 0;
    for (const [x, o] of [[10, l], [14, -l], [20, l], [24, -l]]) c.rect(x, 25 + o, 3, 4 - o, BD);
    c.outline(OUT);
    return c;
}

// 闪现狐：瞬移型
function drawFox(f: number) {
    const c = new PixelCanvas(32, 32);
    const O = 0x7a50d0, OD = 0x4a2a90, W = 0xf0e8ff;
    c.ellipse(16, 21, 8, 6, O);
    c.poly([[23, 20], [31, 12 + f * 2], [29, 22]], O);
    c.px(30, 13 + f * 2, W); c.px(29, 14 + f * 2, W);
    c.ellipse(11, 14, 6, 5, O);
    c.poly([[6, 11], [6, 4], [10, 9]], OD);
    c.poly([[12, 9], [15, 3], [16, 10]], OD);
    c.ellipse(9, 16, 3.5, 2.5, W);
    c.rect(8, 12, 2, 2, 0xffe040); c.rect(13, 12, 2, 2, 0xffe040);
    c.px(6, 16, OUT);
    c.rect(11 + f, 26, 2, 4, OD); c.rect(19 - f, 26, 2, 4, OD);
    c.outline(OUT);
    return c;
}

// 果冻怪：被击败后分裂成两只小果冻
function drawJelly(f: number) {
    const c = new PixelCanvas(32, 32);
    const J = 0xe070c0, JD = 0xa04090, JL = 0xffc0e8;
    const w = f ? 11.5 : 10, h = f ? 7 : 8.5;
    c.ellipse(16, 26 - h, w, h, JD, 230);
    c.ellipse(16, 25 - h, w - 1, h - 1, J, 220);
    c.ellipse(12, 21 - h, 3, 2, JL);
    c.rect(12, 23 - Math.round(h / 2), 2, 3, OUT);
    c.rect(18, 23 - Math.round(h / 2), 2, 3, OUT);
    c.outline(OUT);
    return c;
}

// 沙漠巨蠕（Boss）：从沙中探出的巨大蠕虫
function drawWorm(f: number) {
    const c = new PixelCanvas(48, 52);
    const S = 0xc8905a, SD = 0x8a5a30, SL = 0xe8b880;
    // 身体节段
    for (let i = 0; i < 4; i++) {
        const y = 44 - i * 9, x = 24 + Math.sin(i * 0.9 + f * 0.8) * 3;
        c.ellipse(x, y, 13 - i, 6, SD);
        c.ellipse(x, y - 1, 12 - i, 5, S);
        c.line(x - 9 + i, y - 3, x + 9 - i, y - 3, SL);
    }
    // 头与口器
    const hx = 24 + Math.sin(4 * 0.9 + f * 0.8) * 3;
    c.ellipse(hx, 11, 12, 10, S);
    c.ellipse(hx, 13, 8, 6, 0x5a1a20);
    c.ellipse(hx, 14, 5, 3.5, 0x2a0a10);
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        c.poly([[hx + Math.cos(a) * 8, 13 + Math.sin(a) * 6], [hx + Math.cos(a + 0.2) * 4, 13 + Math.sin(a + 0.2) * 3], [hx + Math.cos(a - 0.2) * 4, 13 + Math.sin(a - 0.2) * 3]], 0xf4ecd8);
    }
    c.rect(hx - 10, 4, 3, 3, 0xff6030); c.rect(hx + 7, 4, 3, 3, 0xff6030);
    // 沙堆
    c.ellipse(24, 49, 22, 3.5, 0xd8b46a);
    c.outline(OUT);
    return c;
}

// ---------------------------------------------------------------- 神兵 / 新场景道具

// 神兵图标：18×18，金色描边 + 深色外描边，一眼看出是史诗道具
function epicIcon(fn: (c: PixelCanvas) => void) {
    const c = new PixelCanvas(20, 20);
    fn(c);
    c.outline(0xffc030);
    c.outline(OUT);
    c.px(1, 2, 0xffffff); c.px(17, 1, 0xfff0a0); c.px(18, 17, 0xffffff);
    return c;
}

const EPIC_ART: Record<string, () => PixelCanvas> = {
    // 雷神之锤
    thor: () => epicIcon(c => {
        c.line(4, 17, 10, 9, 0x8a5a30, 255, 2);
        c.poly([[7, 3], [15, 1], [18, 8], [10, 10]], 0xa8b4c8);
        c.poly([[11, 2], [15, 1], [18, 8], [14, 9]], 0x7884a0);
        c.line(13, 3, 15, 7, 0xffffff);
        c.poly([[3, 3], [6, 3], [4, 7], [6, 7], [2, 12], [3, 8], [1, 8]], 0xfff080);
    }),
    // 星光加特林
    gatling: () => epicIcon(c => {
        c.rect(2, 8, 10, 6, 0x5a5a70);
        c.rect(10, 6, 7, 2, 0xc0c8d8); c.rect(10, 9, 8, 2, 0xc0c8d8); c.rect(10, 12, 7, 2, 0xc0c8d8);
        c.rect(3, 13, 3, 4, 0x8a5a30);
        c.circle(17, 4, 2, 0xffe060); c.px(17, 4, 0xffffff);
        c.rect(3, 9, 6, 1, 0x9090b0);
    }),
    // 圣剑
    excalibur: () => epicIcon(c => {
        c.poly([[16, 1], [18, 2], [9, 12], [7, 10]], 0xe8f0ff);
        c.line(16, 2, 9, 10, 0xffffff);
        c.rect(4, 10, 7, 2, 0xf5c542);
        c.line(6, 8, 9, 13, 0xf5c542, 255, 2);
        c.line(3, 16, 7, 12, 0x6a4ab0, 255, 2);
        c.circle(2.5, 16.5, 1.5, 0xf5c542);
    }),
    // 黑洞法球
    blackhole: () => epicIcon(c => {
        c.circle(9, 9, 8, 0x8a50e0);
        c.ring(9, 9, 8, 2, 0xd0a0ff);
        c.circle(9, 9, 5, 0x2a1050);
        c.circle(9, 9, 2.5, 0x000000);
        c.px(4, 6, 0xffffff); c.px(13, 13, 0xffffff); c.px(14, 5, 0xd0a0ff);
    }),
    // 龙息（龙头）
    dragon: () => epicIcon(c => {
        c.poly([[1, 6], [9, 3], [13, 6], [13, 12], [5, 13], [1, 10]], 0xd03828);
        c.poly([[3, 3], [6, 0], [7, 4]], 0xf5c542);
        c.poly([[9, 3], [12, 0], [12, 5]], 0xf5c542);
        c.rect(5, 6, 2, 2, 0xfff080);
        c.rect(1, 10, 9, 1, 0xff9060);
        c.poly([[13, 7], [19, 5], [17, 9], [19, 12], [13, 11]], 0xffb030);
        c.poly([[13, 8], [17, 8], [13, 10]], 0xfff080);
    }),
    // 流星权杖
    meteor: () => epicIcon(c => {
        c.line(2, 17, 10, 9, 0x6a4ab0, 255, 2);
        c.circle(12.5, 6.5, 4.5, 0xff7a30);
        c.circle(12.5, 6.5, 2.5, 0xffd060);
        c.px(11, 5, 0xffffff);
        c.line(5, 3, 8, 4, 0xffb060); c.line(15, 13, 16, 16, 0xffb060); c.px(17, 2, 0xfff0a0);
    }),
    // 彩虹独角兽（马头 + 角）
    unicorn: () => epicIcon(c => {
        c.poly([[4, 6], [11, 4], [15, 8], [16, 13], [12, 14], [10, 11], [6, 17], [3, 15]], 0xf8f4ff);
        c.poly([[11, 4], [14, 0], [13, 5]], 0xffd040);
        c.px(12, 8, OUT);
        c.line(3, 7, 6, 13, 0xff6080, 255, 2);
        c.line(5, 6, 8, 11, 0x60c0ff, 255, 1);
        c.line(7, 5, 9, 9, 0x80e070);
    }),
};

// 神兵祭坛：金色石台上悬浮的发光宝珠
function drawAltar(f: number) {
    const c = new PixelCanvas(24, 30);
    c.rect(3, 24, 18, 5, 0x6a6080);
    c.rect(5, 16, 14, 8, 0x8a80a0);
    c.rect(5, 16, 14, 1, 0xb0a8c8);
    c.rect(3, 24, 18, 1, 0x9a90b0);
    c.rect(8, 18, 8, 4, 0xf5c542);
    c.rect(11, 18, 2, 4, 0xfff0a0);
    const y = f ? 7 : 8;
    c.circle(12, y, 6.5, 0xffc030, 90);
    c.circle(12, y, 4.5, 0xffe060);
    c.circle(12, y, 2.5, 0xffffff);
    c.px(4, 6 - f, 0xfff0a0); c.px(20, 9 + f, 0xfff0a0);
    c.outline(OUT);
    return c;
}

// 试炼石碑：刻着符文的灰色石碑，符文发红光
function drawShrine() {
    const c = new PixelCanvas(20, 30);
    c.poly([[3, 29], [3, 6], [10, 1], [17, 6], [17, 29]], 0x7a7488);
    c.poly([[10, 1], [17, 6], [17, 29], [10, 29]], 0x625c70);
    c.rect(1, 26, 18, 4, 0x4a4458);
    c.poly([[10, 8], [15, 15], [10, 22], [5, 15]], 0xff4040);
    c.poly([[10, 11], [12.5, 15], [10, 19], [7.5, 15]], 0x625c70);
    c.circle(10, 15, 1.5, 0xffa080);
    c.px(6, 24, 0xff4040); c.px(10, 25, 0xff4040); c.px(14, 24, 0xff4040);
    c.outline(OUT);
    return c;
}

const PICKUP_ART: Record<string, () => PixelCanvas> = {
    giant: () => icon(c => {
        c.ellipse(8, 6, 7.5, 5, 0xe03030);
        c.circle(4, 5, 1.6, 0xffffff); c.circle(10, 3, 1.3, 0xffffff); c.circle(12, 7, 1.2, 0xffffff);
        c.rect(5, 10, 6, 5, 0xf4ecd8);
        c.px(6, 12, OUT); c.px(9, 12, OUT);
    }),
    dice: () => icon(c => {
        c.rect(2, 2, 12, 12, 0xf8f4ff);
        c.rect(2, 12, 12, 2, 0xc8c0d8);
        c.rect(12, 2, 2, 12, 0xc8c0d8);
        for (const [x, y] of [[4, 4], [10, 4], [7, 7], [4, 10], [10, 10]]) c.rect(x, y, 2, 2, 0xd03030);
    }),
    decoy: () => icon(c => {
        c.ellipse(8, 10, 6.5, 5, 0x80c8a0, 200);
        c.circle(5, 5, 2.5, 0x80c8a0, 200); c.circle(11, 5, 2.5, 0x80c8a0, 200);
        c.px(5, 5, OUT); c.px(11, 5, OUT);
        c.line(5, 11, 11, 11, 0x40806a);
        c.px(1, 2, 0xd0f0ff); c.px(14, 1, 0xd0f0ff); c.px(15, 9, 0xd0f0ff);
    }),
    boots: () => icon(c => {
        c.poly([[4, 1], [9, 1], [9, 10], [14, 11], [14, 14], [3, 14]], 0x60a0e0);
        c.rect(3, 13, 12, 2, 0x3a5a90);
        c.poly([[0, 3], [4, 4], [4, 8], [1, 6]], 0xf4ecd8);
        c.line(5, 4, 8, 4, 0xa0d0ff);
        c.px(15, 12, 0xff8030); c.px(0, 12, 0xff8030);
    }),
    bank: () => icon(c => {
        c.poly([[1, 7], [15, 7], [13, 15], [3, 15]], 0xc83828);
        c.rect(1, 7, 14, 2, 0xf5c542);
        c.circle(5, 5, 2.4, 0xf5c542); c.circle(9, 4, 2.4, 0xffe060); c.circle(12, 6, 2, 0xf5c542);
        c.rect(6, 10, 4, 3, 0xf5c542);
    }),
    battery: () => icon(c => {
        c.rect(3, 3, 10, 12, 0x30c060);
        c.rect(6, 1, 4, 2, 0xc0c8d8);
        c.rect(3, 3, 10, 3, 0x80f0a0);
        c.poly([[9, 6], [5, 10], [8, 10], [7, 14], [11, 9], [8, 9]], 0xfff080);
    }),
};

// 神兵弹道：雷锤 / 星弹 / 圣剑 / 黑洞
function drawHammer() {
    const c = new PixelCanvas(16, 16);
    c.line(3, 14, 8, 8, 0x8a5a30, 255, 2);
    c.poly([[5, 3], [12, 0], [15, 6], [8, 9]], 0xb8c4d8);
    c.poly([[9, 1], [12, 0], [15, 6], [12, 8]], 0x8090b0);
    c.line(10, 2, 13, 6, 0xffffff);
    c.outline(0x3060a0);
    return c;
}

function drawStarShot() {
    const c = new PixelCanvas(9, 9);
    c.poly([[4.5, 0], [5.7, 3.3], [9, 3.5], [6.4, 5.6], [7.3, 9], [4.5, 7], [1.7, 9], [2.6, 5.6], [0, 3.5], [3.3, 3.3]], 0xffe060);
    c.circle(4.5, 4.8, 1.5, 0xffffff);
    return c;
}

function drawHolySword() {
    const c = new PixelCanvas(48, 12);
    c.poly([[10, 3], [42, 4], [47, 6], [42, 8], [10, 9]], 0xe8f0ff);
    c.rect(10, 5, 32, 2, 0xffffff);
    c.rect(6, 0, 4, 12, 0xf5c542);
    c.rect(0, 4, 6, 4, 0x6a4ab0);
    c.outline(0xffd060, 160);
    return c;
}

// 蝌蚪（朝右游）；进化后是绿色小青蛙
function drawTadpole(body: number, tail: number) {
    const c = new PixelCanvas(14, 8);
    c.poly([[6, 3], [13, 1], [11, 4], [13, 7], [6, 5]], tail);
    c.ellipse(4, 4, 3.5, 3, body);
    c.px(5, 3, 0xffffff); c.px(6, 3, OUT);
    c.outline(OUT);
    return c;
}

function PICKUP_TURRET() {
    const c = new PixelCanvas(20, 22);
    c.ellipse(10, 8, 9, 6.5, 0xe03030);
    c.circle(6, 6, 1.8, 0xffffff); c.circle(13, 5, 1.5, 0xffffff); c.circle(10, 10, 1.2, 0xffffff);
    c.rect(6, 13, 8, 8, 0xf4ecd8);
    c.rect(12, 15, 8, 3, 0x6a6a80); c.rect(18, 15, 2, 3, 0x3a3a48);
    c.px(8, 16, OUT); c.px(11, 16, OUT);
    c.outline(OUT);
    return c;
}

function drawMine() {
    const c = new PixelCanvas(18, 12);
    c.ellipse(9, 7, 8.5, 4.5, 0x4a9a40);
    c.poly([[9, 7], [17, 5], [17, 9]], 0x2e6a2a);
    c.ellipse(9, 5, 3.5, 3, 0x3a3a48); c.px(8, 4, 0xffffff);
    c.px(9, 2, 0xff4040);
    c.outline(OUT);
    return c;
}

function drawMirror() {
    const c = new PixelCanvas(16, 18);
    c.poly([[1, 1], [15, 1], [15, 10], [8, 17], [1, 10]], 0x8a98b0);
    c.poly([[3, 3], [13, 3], [13, 9.5], [8, 15], [3, 9.5]], 0xd8f0ff);
    c.line(4, 4, 9, 9, 0xffffff); c.line(9, 4, 12, 7, 0xffffff);
    c.outline(OUT);
    return c;
}

function drawSawBlade() {
    const c = new PixelCanvas(20, 20);
    c.circle(10, 10, 7.5, 0xa8b0c0);
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        c.poly([[10 + Math.cos(a) * 7, 10 + Math.sin(a) * 7], [10 + Math.cos(a + 0.25) * 10, 10 + Math.sin(a + 0.25) * 10], [10 + Math.cos(a + 0.5) * 7, 10 + Math.sin(a + 0.5) * 7]], 0xe0e6f0);
    }
    c.ring(10, 10, 5, 1, 0x7a8294);
    c.circle(10, 10, 2.5, 0xd03030);
    c.outline(OUT);
    return c;
}

// 音波：向右张开的月牙形波纹
function drawWave() {
    const c = new PixelCanvas(24, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 24; x++) {
        const d1 = Math.hypot(x - 0, (y - 24) * 0.6), d2 = Math.hypot(x + 6, (y - 24) * 0.6);
        if (d1 < 22 && d2 > 22) c.px(x, y, 0xc8f0ff, Math.round(120 + 120 * (x / 24)));
        else if (d1 < 19 && d2 > 19) c.px(x, y, 0x80d0ff, 140);
    }
    return c;
}

function drawVortex() {
    const c = new PixelCanvas(64, 64);
    c.circle(32, 32, 31.5, 0x6030a0, 70);
    for (let k = 0; k < 3; k++) {
        for (let i = 0; i < 60; i++) {
            const t = i / 60, a = t * Math.PI * 3 + (k / 3) * Math.PI * 2, r = 30 * (1 - t) + 4;
            c.rect(32 + Math.cos(a) * r - 1, 32 + Math.sin(a) * r - 1, 3, 3, k === 1 ? 0xd0a0ff : 0x9a60e0, 220);
        }
    }
    c.circle(32, 32, 9, 0x100018);
    c.ring(32, 32, 10, 2, 0xe0c0ff);
    return c;
}

// ---------------------------------------------------------------- 开屏 / 标题背景

function drawMoon() {
    const c = new PixelCanvas(80, 80);
    // 外层光晕（暖黄色满月）
    c.circle(40, 40, 39.5, 0xffe08a, 22);
    c.circle(40, 40, 35, 0xffe49a, 36);
    c.circle(40, 40, 30, 0xffe8aa, 56);
    // 月面
    c.circle(40, 40, 25, 0xe0b850);
    c.circle(38.5, 38.5, 23.5, 0xf6d76a);
    c.circle(36, 35, 16, 0xfbe38a);
    c.circle(33, 31, 7, 0xfff3c0);
    // 环形山
    for (const [x, y, r] of [[45, 47, 4.5], [31, 47, 3], [47, 32, 3], [38, 54, 2.2], [52, 41, 2]]) {
        c.circle(x, y, r, 0xd8ae48);
        c.circle(x - 0.8, y - 0.8, r * 0.6, 0xeac45c);
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
    // 灌木丛与圆树剪影（温和的夜晚山丘）
    for (const gx of [18, 54, 97]) {
        const t = Math.round(ridge(gx));
        c.ellipse(gx + 2, t - 2, 5, 3.5, 0x1a0c22);
        c.ellipse(gx + 6, t - 1, 3.5, 2.5, 0x1a0c22);
    }
    for (const tx of [36, 76, 115]) {
        const t = Math.round(ridge(tx));
        c.rect(tx, t - 8, 2, 9, 0x1a0c22);
        c.circle(tx + 1, t - 13, tx === 76 ? 6 : 5, 0x1a0c22);
        c.circle(tx - 2, t - 10, 3.5, 0x1a0c22);
        c.circle(tx + 4, t - 10, 3.5, 0x1a0c22);
    }
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
    for (let f = 0; f < 3; f++) s['hero_fu_' + f] = fuFrog(s['hero_hunter_' + f]);
    for (let f = 0; f < 3; f++) s['hero_druid_' + f] = druidFrog(s['hero_hunter_' + f]);
    for (let f = 0; f < 3; f++) s['hero_prism_' + f] = prismFrog(s['hero_hunter_' + f]);
    for (let f = 0; f < 3; f++) s['hero_santa_' + f] = santaFrog(s['hero_hunter_' + f]);
    for (let f = 0; f < 2; f++) {
        s['bat_' + f] = drawBat(f);
        s['slime_' + f] = drawSlime(f);
        s['zombie_' + f] = drawZombie(f);
        s['skeleton_' + f] = drawSkeleton(f);
        s['ghost_' + f] = drawGhost(f);
        s['reaper_' + f] = drawReaper(f);
        s['rat_' + f] = drawRat(f);
        s['imp_' + f] = drawImp(f);
        s['mummy_' + f] = drawMummy(f);
        s['shroom_' + f] = drawShroom(f);
        s['slimeking_' + f] = drawSlimeKing(f);
        s['bonelord_' + f] = drawBoneLord(f);
        s['vampire_' + f] = drawVampire(f);
        s['lich_' + f] = drawLich(f);
        s['eye_' + f] = drawEye(f);
        s['toad_' + f] = drawToad(f);
        s['yeti_' + f] = drawYeti(f);
    }
    for (const k of ['bone', 'blood', 'ice', 'darkorb', 'slimeball', 'scythe', 'sand']) s['shot_' + k] = drawEnemyShot(k);
    for (let f = 0; f < 2; f++) {
        s['boar_' + f] = flipX(drawBoar(f));
        s['fox_' + f] = flipX(drawFox(f));
        s['jelly_' + f] = drawJelly(f);
        s['worm_' + f] = drawWorm(f);
        s['mimic_' + f] = drawMimic(f);
        s['mimic_' + f + '_w'] = silhouette(s['mimic_' + f]);
        s['tornado_' + f] = drawTornado(f);
        for (const k of ['boar', 'fox', 'jelly', 'worm']) s[k + '_' + f + '_w'] = silhouette(s[k + '_' + f]);
    }
    s.ground_sand = drawGroundSand();
    s.cactus = drawCactus();
    s.sandrock = drawSandRock();
    s.horns = drawSkullRock();
    s.warn = drawWarn();
    for (const k of ['bat', 'slime', 'zombie', 'skeleton', 'ghost', 'reaper', 'rat', 'imp', 'mummy', 'shroom', 'slimeking', 'bonelord', 'vampire', 'lich', 'eye', 'toad', 'yeti']) {
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
    s.ground_snow = drawGroundSnow();
    s.ground_lava = drawGroundLava();
    s.pine = drawPine();
    s.icerock = drawIceRock();
    s.snowman = drawSnowman();
    s.lavarock = drawLavaRock();
    s.obsidian = drawObsidian();
    s.lavapool = drawLavaPool();
    s.skullpile = drawSkullPile();
    s.icicle = drawIcicle();
    s.ground_fest = drawGroundFest();
    s.ground_swamp = drawGroundSwamp();
    s.ground_xmas = drawGroundXmas();
    s.xmastree = drawXmasTree();
    s.gift = drawGift();
    s.candycane = drawCandyCane();
    s.deadtree = drawDeadTree();
    s.reeds = drawReeds();
    s.mushroom = drawMushroom();
    s.bogpool = drawBogPool();
    s.bubble = drawBubble();
    s.lantern = drawLantern();
    s.firecracker = drawFirecracker();
    s.redgate = drawRedGate();
    s.plum = drawPlum();
    s.firework = drawFirework();
    for (let f = 0; f < 2; f++) { s['nian_' + f] = drawNian(f); s['nian_' + f + '_w'] = silhouette(s['nian_' + f]); }
    s.meteor = drawMeteor();
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
    for (const w of ['fire', 'holy', 'cross', 'frost', 'familiar', 'chain', 'bomb', 'laser', 'spikes', 'saw', 'sonic', 'tadpole', 'whirl', 'mirror', 'tongue', 'turret', 'mine']) s['icon_' + w + '_evo'] = evoIcon(s['icon_' + w]);
    s.sawblade = drawSawBlade();
    s.tadpole = drawTadpole(0x3a3a50, 0x5a5a70);
    s.froglet = drawTadpole(0x4aa040, 0x6ac058);
    s.mirror = drawMirror();
    s.turret = PICKUP_TURRET();
    s.mine = drawMine();
    s.wave = drawWave();
    s.fireball = drawFireball();
    s.flame_0 = drawFlame(0);
    s.flame_1 = drawFlame(1);
    s.flask = drawFlask();
    s.puddle = drawPuddle();
    s.crossp = drawCrossProj();
    s.spike = drawSpike();
    s.spike_warn = drawSpikeWarn();
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
    s.haste = drawHaste();
    s.clover = drawClover();
    s.firering = drawFireRing();
    s.scroll = drawScroll();
    s.moon = drawMoon();
    s.star = drawStar();
    s.ember = drawEmber();
    s.cloud = drawCloud();
    s.hills = drawHills();
    s.coin = drawCoin();
    s.coinbag = drawCoinBag();
    for (const k in EPIC_ART) s['epic_' + k] = EPIC_ART[k]();
    for (const k in PICKUP_ART) s[k] = PICKUP_ART[k]();
    s.epic = s.epic_thor; // 火盆掉落的「随机神兵」在生成时就会确定具体是哪一把，这里只是兜底
    for (let f = 0; f < 2; f++) { s['altar_' + f] = drawAltar(f); s['altar_' + f + '_w'] = silhouette(s['altar_' + f]); }
    s.shrine = drawShrine();
    s.hammer = drawHammer();
    s.starshot = drawStarShot();
    s.holysword = drawHolySword();
    s.vortex = drawVortex();
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
