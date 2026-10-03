#!/usr/bin/env python3
"""买量 / 信息流广告图：3 套创意（钩子）× 4 个常用尺寸，输出到 marketing/广告素材/。需先运行 run.sh shots。
尺寸：1280×720 横版信息流、1080×1920 竖版全屏、1080×1080 朋友圈方图、690×388 公众号文中 / 底部广告。"""
import os
from PIL import Image, ImageDraw

import make_assets as A

# (编号, 钩子标题, 副标题, 实机截图, 截图取景中心 y 比例)
CREATIVES = [
    ('A_割草爽感', '一只胖奶蛙 VS 一万只怪物', '满屏割草 · 连击停不下来', '03_swarm', 0.45),
    ('B_挑战感', '你能活过 15 分钟吗？', '红月降临 · 最后两分钟怪物狂潮', '06_bloodmoon', 0.45),
    ('C_进化', '武器进化 一路割爆', '16 种武器 × 16 种进化 · 每局都不一样', '07_evolve', 0.45),
]
SIZES = [(1280, 720), (1080, 1920), (1080, 1080), (690, 388)]
RED = (214, 50, 60)


def crop_to(src, w, h, cy):
    """按目标比例裁切截图（以 cy 为纵向中心）"""
    r = w / h
    sw, sh = src.size
    if sw / sh > r:
        nw = int(sh * r)
        return src.crop(((sw - nw) // 2, 0, (sw + nw) // 2, sh)).resize((w, h), Image.LANCZOS)
    nh = int(sw / r)
    top = max(0, min(sh - nh, int(sh * cy - nh / 2)))
    return src.crop((0, top, sw, top + nh)).resize((w, h), Image.LANCZOS)


def cta(w, text, size):
    f = A.font(size)
    tw = ImageDraw.Draw(Image.new('RGBA', (1, 1))).textlength(text, font=f)
    pw, ph = int(tw + size * 2.2), int(size * 1.9)
    im = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, pw - 1, ph - 1], ph // 2, fill=RED + (255,), outline=(255, 230, 150, 255), width=max(3, size // 12))
    A.text_center(d, pw / 2, (ph - size * 1.3) / 2, text, size, (255, 255, 255), A.DARK, max(2, size // 12))
    return im


def make(cid, title, sub, shot, cy, W, H):
    src = Image.open(os.path.join(A.SHOTS, shot + '.png')).convert('RGBA')
    land = W / H > 1.2
    im = Image.new('RGBA', (W, H), (20, 10, 28, 255))
    if land:
        # 横版：左侧文字，右侧竖屏截图
        im = A.night_sky(W, H, 0.85, seed=5)
        gh = int(H * 0.92)
        g = src.resize((int(src.width * gh / src.height), gh), Image.LANCZOS)
        gx = W - g.width - int(W * 0.05)
        ImageDraw.Draw(im).rounded_rectangle([gx - 6, (H - gh) // 2 - 6, gx + g.width + 6, (H + gh) // 2 + 6], 18, fill=(214, 170, 70, 255))
        im.alpha_composite(A.rounded(g, 14), (gx, (H - gh) // 2))
        tx = (gx) / 2
        s = W / 1280
        lg = A.logo('奶蛙割草', int(84 * s))
        A.paste_center(im, lg, tx, H * 0.2)
        d = ImageDraw.Draw(im)
        fs = int(60 * s)
        while d.textlength(title, font=A.font(fs)) > gx - 60 * s:
            fs -= 2
        A.text_center(d, tx, H * 0.38, title, fs, A.YELLOW, A.DARK, max(3, fs // 10))
        A.text_center(d, tx, H * 0.38 + fs * 1.4, sub, int(fs * 0.5), (255, 255, 255), A.DARK, 3)
        b = cta(W, '立即试玩', int(44 * s))
        A.paste_center(im, b, tx, H * 0.76)
        A.text_center(d, tx, H * 0.88, '微信小游戏 · 免下载 · 即点即玩', int(22 * s), (210, 200, 230), A.DARK, 2)
    else:
        # 竖版 / 方图：上方实机画面铺满，底部渐变压字
        im.alpha_composite(crop_to(src, W, H, cy), (0, 0))
        grad = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grad)
        for y in range(H):
            k = max(0, (y / H - 0.45) / 0.55)
            gd.line([(0, y), (W, y)], fill=(16, 6, 24, int(235 * min(1, k * 1.3))))
            k2 = max(0, 1 - y / (H * 0.22))
            if k2 > 0:
                gd.line([(0, y), (W, y)], fill=(16, 6, 24, int(200 * k2)))
        im.alpha_composite(grad)
        s = W / 1080
        lg = A.logo('奶蛙割草', int(110 * s))
        A.paste_center(im, lg, W / 2, H * 0.08 + 40 * s)
        d = ImageDraw.Draw(im)
        fs = int(84 * s)
        while d.textlength(title, font=A.font(fs)) > W * 0.9:
            fs -= 2
        base = H * (0.7 if H > W else 0.6)
        A.text_center(d, W / 2, base, title, fs, A.YELLOW, A.DARK, max(4, fs // 10))
        A.text_center(d, W / 2, base + fs * 1.35, sub, int(fs * 0.48), (255, 255, 255), A.DARK, 3)
        b = cta(W, '立即试玩', int(56 * s))
        A.paste_center(im, b, W / 2, H - b.height / 2 - H * 0.07 - 30 * s)
        A.text_center(d, W / 2, H - H * 0.045 - 10 * s, '微信小游戏 · 免下载 · 即点即玩', int(28 * s), (210, 200, 230), A.DARK, 2)
    im.convert('RGB').save(A.out('广告素材', f'{cid}_{W}x{H}.jpg'), quality=90)


if __name__ == '__main__':
    n = 0
    for c in CREATIVES:
        for W, H in SIZES:
            make(*c, W, H)
            n += 1
    print('广告素材 ×', n)
