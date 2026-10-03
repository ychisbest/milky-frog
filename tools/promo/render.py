#!/usr/bin/env python3
"""
把 capture.ts 导出的帧数据（JSON：精灵 / 文本列表）渲染成 PNG。

用法：
    python3 render.py <帧目录> <输出目录> [--scale 1.5]
帧目录中需要有 atlas.raw / rects.json（由 capture.ts 一并导出）。
"""
import json
import math
import os
import sys
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
if not os.path.exists(FONT):
    FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'

_atlas = None
_rects = None
_fonts = {}
_cache = {}


def load_atlas(d):
    global _atlas, _rects
    raw = open(os.path.join(d, 'atlas.raw'), 'rb').read()
    n = int(math.isqrt(len(raw) // 4))
    _atlas = Image.frombytes('RGBA', (n, n), raw)
    _rects = json.load(open(os.path.join(d, 'rects.json')))


def font(sz):
    sz = max(8, int(round(sz)))
    if sz not in _fonts:
        _fonts[sz] = ImageFont.truetype(FONT, sz)
    return _fonts[sz]


def sprite_img(name, w, h, tiled, sx, sy):
    key = (name, round(w, 2), round(h, 2), tiled, round(sx, 3), round(sy, 3))
    if key in _cache:
        return _cache[key]
    r = _rects[name]
    src = _atlas.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
    tw, th = abs(w * sx), abs(h * sy)
    if tw < 1 or th < 1:
        return None
    if tiled:
        ts = (max(1, int(r['w'] * abs(sx))), max(1, int(r['h'] * abs(sy))))
        tile = src.resize(ts, Image.NEAREST)
        big = Image.new('RGBA', (int(tw), int(th)))
        for ty in range(0, int(th), ts[1]):
            for tx in range(0, int(tw), ts[0]):
                big.paste(tile, (tx, int(th) - ty - ts[1]))
        out = big
    else:
        out = src.resize((max(1, int(round(tw))), max(1, int(round(th)))), Image.NEAREST)
    if sx < 0:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)
    if len(_cache) > 4000:
        _cache.clear()
    _cache[key] = out
    return out


def tint(img, c):
    if c[:3] == [255, 255, 255] and c[3] == 255:
        return img
    r, g, b, a = img.split()
    r = r.point(lambda v: v * c[0] // 255)
    g = g.point(lambda v: v * c[1] // 255)
    b = b.point(lambda v: v * c[2] // 255)
    a = a.point(lambda v: v * c[3] // 255)
    return Image.merge('RGBA', (r, g, b, a))


def render(frame, scale=1.0):
    W, H = 720, frame['vh']
    img = Image.new('RGBA', (int(W * scale), int(H * scale)), (18, 22, 18, 255))
    dr = ImageDraw.Draw(img)
    S = scale
    for it in frame['items']:
        if it['t'] == 's':
            if not it.get('f') or it['f'] not in _rects:
                continue
            src = sprite_img(it['f'], it['w'], it['h'], it.get('tiled'), it['sx'] * S, it['sy'] * S)
            if src is None:
                continue
            src = tint(src, it['c'])
            tw, th = src.size
            ang = it.get('ang', 0)
            if ang:
                axp, ayp = tw * it['ax'], th * (1 - it['ay'])
                R = int(max(axp, tw - axp, ayp, th - ayp) * 1.5) + 2
                pad = Image.new('RGBA', (2 * R, 2 * R))
                pad.paste(src, (int(R - axp), int(R - ayp)))
                pad = pad.rotate(ang, resample=Image.NEAREST)
                cx, cy = (it['x'] + W / 2) * S, (H / 2 - it['y']) * S
                img.alpha_composite(pad, (int(cx - R), int(cy - R)))
            else:
                x0 = (it['x'] + W / 2) * S - tw * it['ax']
                y0 = (H / 2 - it['y']) * S - th * (1 - it['ay'])
                img.alpha_composite(src, (int(round(x0)), int(round(y0))))
        else:
            if not it['s']:
                continue
            f = font(it['size'] * S)
            lines = it['s'].split('\n')
            lh = (it['size'] + 6) * S
            tot = lh * len(lines)
            c = tuple(it['c'])
            if c[3] < 10:
                continue
            for i, ln in enumerate(lines):
                bw = dr.textlength(ln, font=f)
                x = (it['x'] + W / 2) * S - bw * it['ax']
                y = (H / 2 - it['y']) * S - tot / 2 + i * lh - it['size'] * S * 0.08
                dr.text((x, y), ln, font=f, fill=c, stroke_width=int(round(it['o'] * S)), stroke_fill=(16, 10, 24, 255))
    return img.convert('RGB')


def _job(args):
    src, dst, scale = args
    render(json.load(open(src)), scale).save(dst)
    return dst


def main():
    ind, outd = sys.argv[1], sys.argv[2]
    scale = float(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 1.0
    os.makedirs(outd, exist_ok=True)
    load_atlas(ind)
    jobs = [(os.path.join(ind, f), os.path.join(outd, f.replace('.json', '.png')), scale)
            for f in sorted(os.listdir(ind)) if f.endswith('.json') and f != 'rects.json']
    with Pool(initializer=load_atlas, initargs=(ind,)) as pool:
        for k, _ in enumerate(pool.imap_unordered(_job, jobs, chunksize=4)):
            if k % 50 == 0:
                print(f'  渲染 {k}/{len(jobs)}', flush=True)
    print(f'完成：{len(jobs)} 帧 → {outd}')


if __name__ == '__main__':
    main()
