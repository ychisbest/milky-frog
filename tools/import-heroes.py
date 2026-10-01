#!/usr/bin/env python3
"""
把角色参考图（3×3 网格，每格一个角色）导入为游戏内的像素精灵。

用法：
    python3 tools/import-heroes.py <参考图路径> [--preview out.png]

流程：切格 → 从格子边缘泛洪去背景 → 按目标高度对齐像素网格（每块取中位色）
     → 去掉残留阴影 → 调色板量化 → 以「调色板 + 行程编码」写入 assets/scripts/HeroArt.ts

只依赖 Pillow。更换角色图后重新运行即可，游戏代码无需修改。
"""
import sys
import colorsys
from collections import deque
from PIL import Image

# 角色 → 参考图中的格子（行, 列），可选重新着色
HEROES = {
    'hunter': {'cell': (0, 0)},
    'rogue':  {'cell': (0, 1)},
    'knight': {'cell': (0, 2)},
    'mage':   {'cell': (1, 0)},
    'nun':    {'cell': (1, 2)},
    'pyro':   {'cell': (2, 1)},
    'bomber': {'cell': (2, 2)},
    'sage':   {'cell': (1, 0), 'recolor': 'blue'},  # 法师换成蓝袍
}
TARGET_H = 64      # 角色像素高度
OUT = 'assets/scripts/HeroArt.ts'
ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_{|}~'
PALETTE = len(ALPHA)  # 每个角色最多颜色数（受编码字母表长度限制，79 色）


def dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def find_cells(im):
    """根据很暗的分隔线找出 3×3 格子的边界。"""
    W, H = im.size
    px = im.load()

    def dark_col(x):
        return sum(sum(px[x, y]) for y in range(0, H, 4)) / (H / 4) / 3 < 14

    def dark_row(y):
        return sum(sum(px[x, y]) for x in range(0, W, 4)) / (W / 4) / 3 < 14

    def spans(n, is_dark):
        out, start = [], None
        for i in range(n):
            if not is_dark(i):
                if start is None:
                    start = i
            elif start is not None:
                out.append((start, i))
                start = None
        if start is not None:
            out.append((start, n))
        return [s for s in out if s[1] - s[0] > n / 6]

    return spans(W, dark_col), spans(H, dark_row)


def extract(im, box):
    x0, y0, x1, y1 = box
    cell = im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3))
    w, h = cell.size
    px = cell.load()
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))
    # 泛洪：与相邻背景像素渐变连续、且整体接近背景色
    is_bg = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            q.append((x, y))
    for x, y in q:
        is_bg[y][x] = True
    while q:
        x, y = q.popleft()
        c = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not is_bg[ny][nx]:
                n = px[nx, ny]
                if dist(n, c) <= 12 and dist(n, bg) <= 34:
                    is_bg[ny][nx] = True
                    q.append((nx, ny))
    ys = [y for y in range(h) for x in range(w) if not is_bg[y][x]]
    xs = [x for y in range(h) for x in range(w) if not is_bg[y][x]]
    bx0, bx1, by0, by1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    return cell, is_bg, (bx0, by0, bx1, by1)


def resample(cell, is_bg, bbox):
    """按目标高度切块，每块取中位色；前景像素少于一半的块视为透明。"""
    px = cell.load()
    bx0, by0, bx1, by1 = bbox
    s = (by1 - by0) / TARGET_H
    gw = int((bx1 - bx0) / s + 0.999)
    grid = [[None] * gw for _ in range(TARGET_H)]
    for j in range(TARGET_H):
        for i in range(gw):
            xa, xb = bx0 + i * s, bx0 + (i + 1) * s
            ya, yb = by0 + j * s, by0 + (j + 1) * s
            # 只看块的中心区域，避开 JPEG 边缘混色
            m = s * 0.22
            fg, total = [], 0
            for y in range(int(ya + m), int(yb - m) + 1):
                for x in range(int(xa + m), int(xb - m) + 1):
                    if x >= bx1 or y >= by1:
                        continue
                    total += 1
                    if not is_bg[y][x]:
                        fg.append(px[x, y])
            if total and len(fg) * 2 > total:
                # 保护眼睛：块内有足够多的「眼睛绿」就保留绿色（避免中位数把小眼睛洗掉）
                eye = [c for c in fg if is_eye_green(c)]
                if len(eye) * 5 >= len(fg):
                    avg = tuple(sum(c[k] for c in eye) // len(eye) for k in range(3))
                    grid[j][i] = boost(avg)
                else:
                    grid[j][i] = tuple(sorted(c[k] for c in fg)[len(fg) // 2] for k in range(3))
    return grid


def is_eye_green(c):
    hh, l, ss = colorsys.rgb_to_hls(*(v / 255 for v in c))
    return 0.22 < hh < 0.45 and ss > 0.4 and 0.28 < l < 0.75


def boost(c):
    hh, l, ss = colorsys.rgb_to_hls(*(v / 255 for v in c))
    r, g, b = colorsys.hls_to_rgb(hh, min(0.62, l * 1.08), min(1, ss * 1.15))
    return (int(r * 255), int(g * 255), int(b * 255))


def clean(grid):
    """去掉与角色主体不相邻的暗色像素（地面阴影残留）以及孤立噪点。"""
    h, w = len(grid), len(grid[0])
    for _ in range(2):
        rm = []
        for y in range(h):
            for x in range(w):
                c = grid[y][x]
                if c is None:
                    continue
                nb = [grid[y + dy][x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                      if (dx or dy) and 0 <= x + dx < w and 0 <= y + dy < h and grid[y + dy][x + dx] is not None]
                if lum(c) < 45 and not any(lum(n) >= 45 for n in nb):
                    rm.append((x, y))
                elif len(nb) <= 1 and lum(c) < 90:
                    rm.append((x, y))
        for x, y in rm:
            grid[y][x] = None
    # 裁掉空行空列
    rows = [y for y in range(h) if any(grid[y])]
    cols = [x for x in range(w) if any(grid[y][x] for y in range(h))]
    return [row[min(cols):max(cols) + 1] for row in grid[min(rows):max(rows) + 1]]


def recolor(grid, mode):
    if mode != 'blue':
        return grid
    out = []
    for row in grid:
        r2 = []
        for c in row:
            if c is None:
                r2.append(None)
                continue
            hh, l, ss = colorsys.rgb_to_hls(*(v / 255 for v in c))
            if 0.68 < hh < 0.86 and ss > 0.25:  # 紫色 → 蓝色
                hh = 0.58
            r, g, b = colorsys.hls_to_rgb(hh, l, ss)
            r2.append((int(r * 255), int(g * 255), int(b * 255)))
        out.append(r2)
    return out


def quantize(grid):
    h, w = len(grid), len(grid[0])
    img = Image.new('RGB', (w, h))
    for y in range(h):
        for x in range(w):
            img.putpixel((x, y), grid[y][x] or (0, 0, 0))
    q = img.quantize(colors=PALETTE, method=Image.Quantize.FASTOCTREE, kmeans=3, dither=Image.Dither.NONE)
    pal = q.getpalette()[:PALETTE * 3]
    idx = [[None if grid[y][x] is None else q.getpixel((x, y)) for x in range(w)] for y in range(h)]
    used = sorted({i for row in idx for i in row if i is not None})
    remap = {old: k for k, old in enumerate(used)}
    palette = ['%02x%02x%02x' % tuple(pal[i * 3:i * 3 + 3]) for i in used]
    idx = [[None if i is None else remap[i] for i in row] for row in idx]
    return palette, idx


def rle(idx):
    """行程编码：调色板下标用字母表示，'.' 为透明；连续 3 个以上写成 字符+次数。"""
    flat = []
    for row in idx:
        flat.extend('.' if i is None else ALPHA[i] for i in row)
    out, i = [], 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j] == flat[i]:
            j += 1
        n = j - i
        out.append(flat[i] + (str(n) if n >= 3 else flat[i] * (n - 1) if n == 2 else ''))
        i = j
    return ''.join(out)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    im = Image.open(src).convert('RGB')
    cols, rows = find_cells(im)
    assert len(cols) == 3 and len(rows) == 3, f'没有识别出 3×3 网格：{cols} {rows}'
    entries, previews = [], []
    for name, cfg in HEROES.items():
        r, c = cfg['cell']
        box = (cols[c][0], rows[r][0], cols[c][1], rows[r][1])
        cell, is_bg, bbox = extract(im, box)
        grid = recolor(clean(resample(cell, is_bg, bbox)), cfg.get('recolor', ''))
        palette, idx = quantize(grid)
        h, w = len(idx), len(idx[0])
        entries.append(f"    {name}: {{ w: {w}, h: {h}, pal: '{','.join(palette)}', px: '{rle(idx)}' }},")
        print(f'{name:7s} {w}x{h}  {len(palette)} 色')
        if preview:
            p = Image.new('RGBA', (w, h))
            for y in range(h):
                for x in range(w):
                    if idx[y][x] is not None:
                        v = palette[idx[y][x]]
                        p.putpixel((x, y), (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16), 255))
            previews.append((name, p))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// 由 tools/import-heroes.py 根据角色参考图自动生成，请勿手改\n')
        f.write('// 格式：pal = 调色板（十六进制 RGB，逗号分隔）；px = 行程编码的调色板下标（. 为透明）\n')
        f.write('export const HERO_ART: Record<string, { w: number; h: number; pal: string; px: string }> = {\n')
        f.write('\n'.join(entries) + '\n};\n')
    print('已写入', OUT)
    if preview:
        S = 5
        W = sum(p.width * S + 16 for _, p in previews) + 16
        H = max(p.height for _, p in previews) * S + 32
        sheet = Image.new('RGB', (W, H), (40, 44, 56))
        x = 16
        for _, p in previews:
            sheet.paste(p.resize((p.width * S, p.height * S), Image.NEAREST), (x, 16), p.resize((p.width * S, p.height * S), Image.NEAREST))
            x += p.width * S + 16
        sheet.save(preview)
        print('预览：', preview)


if __name__ == '__main__':
    main()
