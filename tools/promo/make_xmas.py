#!/usr/bin/env python3
"""圣诞活动素材：圣诞主视觉（横 / 竖）、分享卡、图标角标、预告海报。需先运行 run.sh shots。"""
import os
import random
from PIL import Image, ImageDraw

import make_assets as A

TOP, BOT = (12, 20, 52), (40, 70, 120)
GOLD = (255, 214, 90)
RED = (216, 48, 48)


def snow_sky(W, H, horizon, seed=4):
    rnd = random.Random(seed)
    im = A.gradient(W, int(H * horizon), TOP, BOT).convert('RGBA')
    base = Image.new('RGBA', (W, H), (220, 230, 242, 255))
    base.paste(im, (0, 0))
    g = A.sprite('ground_xmas', W / 360)
    for y in range(int(H * horizon), H, g.height):
        for x in range(0, W, g.width):
            base.alpha_composite(g, (x, y))
    d = ImageDraw.Draw(base)
    for _ in range(int(W * H / 2500)):
        x, y = rnd.randrange(W), rnd.randrange(H)
        s = rnd.choice([2, 3, 3, 4, 5]) * max(1, W // 900)
        d.rectangle([x, y, x + s, y + s], fill=(255, 255, 255, rnd.randrange(140, 255)))
    return base


def scene(W, H, logo_size, k, title_size, name):
    random.seed(8)
    land = W > H
    horizon = 0.76 if land else 0.68
    im = snow_sky(W, H, horizon)
    gy = H * horizon
    A.paste_center(im, A.sprite('moon', min(W, H) / 150), W * (0.82 if land else 0.75), H * 0.16)
    for side in (0, 1):
        t = A.sprite('xmastree', k * 2.2)
        im.alpha_composite(t, (int(W * 0.03) if side == 0 else int(W * 0.97 - t.width), int(gy - t.height + 10)))
    for gx in (0.14, 0.22, 0.78, 0.86):
        gf = A.sprite('gift', k * 1.3)
        im.alpha_composite(gf, (int(W * gx - gf.width / 2), int(gy + H * 0.05 - gf.height)))
    yx, fx = (0.8, 0.6) if land else (0.66, 0.36)
    y = A.sprite('yeti_0', k * 2.5)
    A.paste_center(im, A.sprite('shadow', k * 4), W * yx, gy + 2)
    im.alpha_composite(y, (int(W * yx - y.width / 2), int(gy - y.height + 10)))
    fr = A.sprite('hero_santa_0', k * 1.5)
    fy = gy + H * (0.09 if land else 0.07)
    A.paste_center(im, A.sprite('shadow', k * 2.6), W * fx, fy)
    im.alpha_composite(fr, (int(W * fx - fr.width / 2), int(fy - fr.height + 6)))
    lg = A.logo('奶蛙割草', logo_size, 'MILKY FROG SURVIVORS', logo_size // 4)
    tx = W * 0.28 if land else W / 2
    A.paste_center(im, lg, tx, H * (0.3 if land else 0.17))
    d = ImageDraw.Draw(im)
    A.text_center(d, tx, H * (0.5 if land else 0.31), '圣诞限定 · 雪怪王来了', title_size, (255, 255, 255), RED, max(5, title_size // 8))
    bar = Image.new('RGBA', (W, int(H * 0.08)), (20, 30, 60, 200))
    im.alpha_composite(bar, (0, int(H * 0.9)))
    A.text_center(d, W / 2, H * 0.915, '雪夜小镇 · 击败雪怪王 · 解锁「圣诞蛙」', int(title_size * 0.55), GOLD, A.DARK, 4)
    im.convert('RGB').save(A.out('宣传图', name), optimize=True)


def share_card():
    W, H = 500, 400
    src = Image.open(os.path.join(A.SHOTS, '21_xmas.png')).convert('RGBA')
    cw = src.width
    ch = int(cw * 4 / 5)
    top = int(src.height * 0.12)
    im = src.crop((0, top, cw, top + ch)).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle([0, H - 74, W, H], fill=(160, 30, 36, 230))
    A.text_center(d, W / 2, H - 66, '雪怪王来了！圣诞快乐呱～', 36, (255, 255, 255), A.DARK, 4)
    im.convert('RGB').save(A.out('分享卡片', 'share_06_圣诞雪怪王.png'), optimize=True)


def icon_badge():
    im = Image.open(os.path.join(A.MK, '图标', 'icon_512.png')).convert('RGBA').resize((512, 512))
    d = ImageDraw.Draw(im)
    d.ellipse([352, 16, 496, 160], fill=(40, 120, 60, 255), outline=(255, 255, 255, 255), width=8)
    A.text_center(d, 424, 34, '圣', 92, (255, 255, 255), A.DARK, 4)
    im.convert('RGB').save(A.out('图标', 'icon_512_圣诞角标.png'))


def teaser():
    W, H = 1080, 1440
    im = snow_sky(W, H, 0.78, seed=12)
    y = A.sprite('yeti_1', 12)
    a = y.getchannel('A')
    sil = Image.new('RGBA', y.size, (14, 22, 50, 255))
    sil.putalpha(a)
    A.paste_center(im, sil, W / 2, H * 0.5)
    d = ImageDraw.Draw(im)
    for ex in (W / 2 - 62, W / 2 + 62):
        d.rectangle([ex - 16, H * 0.43 - 10, ex + 16, H * 0.43 + 10], fill=(120, 220, 255))
    A.text_center(d, W / 2, H * 0.1, '雪地里', 96, (255, 255, 255), A.DARK, 8)
    A.text_center(d, W / 2, H * 0.19, '有个大脚印……', 96, GOLD, A.DARK, 8)
    A.text_center(d, W / 2, H * 0.8, '12.18  圣诞活动', 64, (255, 255, 255), RED, 7)
    A.text_center(d, W / 2, H * 0.88, '微信搜索「奶蛙割草」', 52, (255, 255, 255), A.DARK, 5)
    im.convert('RGB').save(A.out('宣传图', '圣诞_预告海报_1080x1440.png'), optimize=True)


if __name__ == '__main__':
    scene(1920, 1080, 170, 4.0, 72, '圣诞_主视觉_横版_1920x1080.png')
    scene(1080, 1920, 160, 4.4, 76, '圣诞_主视觉_竖版_1080x1920.png')
    share_card()
    icon_badge()
    teaser()
    print('圣诞素材 ×5')
