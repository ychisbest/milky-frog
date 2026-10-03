#!/usr/bin/env python3
"""春节活动素材：新春主视觉（横 / 竖）、新春分享卡、新春图标角标、活动预告海报。需先运行 run.sh shots。"""
import os
import random
from PIL import Image, ImageDraw

import make_assets as A

RED_TOP, RED_BOT = (70, 6, 16), (170, 30, 30)
GOLD = (255, 214, 90)


def fest_sky(W, H, horizon, seed=3):
    rnd = random.Random(seed)
    im = A.gradient(W, int(H * horizon), RED_TOP, RED_BOT).convert('RGBA')
    base = Image.new('RGBA', (W, H), (60, 10, 18, 255))
    base.paste(im, (0, 0))
    # 地面：庙会砖地
    g = A.sprite('ground_fest', W / 360)
    for y in range(int(H * horizon), H, g.height):
        for x in range(0, W, g.width):
            base.alpha_composite(g, (x, y))
    shade = Image.new('RGBA', (W, H - int(H * horizon)), (30, 4, 10, 110))
    base.alpha_composite(shade, (0, int(H * horizon)))
    # 烟花
    # 烟花只放在两侧，避开中间的标题
    for k in range(10):
        f = A.sprite('firework', min(W, H) / rnd.uniform(110, 200))
        x = rnd.uniform(0.01, 0.16) if k % 2 == 0 else rnd.uniform(0.84, 0.99)
        base.alpha_composite(f, (int(W * x - f.width / 2), rnd.randrange(int(H * 0.08), int(H * horizon * 0.75))))
    return base


def lantern_row(im, y, scale, n):
    W = im.width
    d = ImageDraw.Draw(im)
    d.line([(0, y - 6), (W, y + 10)], fill=(40, 6, 10, 255), width=max(2, int(scale)))
    for k in range(n):
        l = A.sprite('lantern', scale)
        x = int(W * (k + 0.5) / n - l.width / 2)
        im.alpha_composite(l, (x, int(y + 2 * k % 3)))


def fest_scene(W, H, logo_size, hero_scale, title_size, name):
    random.seed(5)
    land = W > H
    horizon = 0.78 if land else 0.7
    im = fest_sky(W, H, horizon)
    lantern_row(im, int(H * 0.02), min(W, H) / 260, 13 if land else 7)
    # 两侧红门 + 梅花
    for side in (0, 1):
        gt = A.sprite('redgate', hero_scale * 1.3)
        x = int(W * 0.02) if side == 0 else int(W * 0.98 - gt.width)
        im.alpha_composite(gt, (x, int(H * horizon - gt.height + 8)))
        p = A.sprite('plum', hero_scale * 1.2)
        im.alpha_composite(p, (int(W * (0.2 if side == 0 else 0.8) - p.width / 2), int(H * horizon - p.height + 4)))
    gy = H * horizon
    # 年兽在后方，福蛙在前方
    nx, fx = (0.82, 0.62) if land else (0.66, 0.36)
    ni = A.sprite('nian_0', hero_scale * 2.6)
    A.paste_center(im, A.sprite('shadow', hero_scale * 4), W * nx, gy + 2)
    im.alpha_composite(ni, (int(W * nx - ni.width / 2), int(gy - ni.height + 10)))
    fu = A.sprite('hero_fu_0', hero_scale * 1.5)
    fy = gy + H * (0.08 if land else 0.06)
    A.paste_center(im, A.sprite('shadow', hero_scale * 2.6), W * fx, fy)
    im.alpha_composite(fu, (int(W * fx - fu.width / 2), int(fy - fu.height + 6)))
    # 鞭炮
    for k in range(6):
        fc = A.sprite('firecracker', hero_scale * 1.1)
        im.alpha_composite(fc, (int(W * (0.08 + 0.17 * k)), int(H * (0.86 + 0.02 * (k % 2)))))
    lg = A.logo('奶蛙割草', logo_size, 'MILKY FROG SURVIVORS', logo_size // 4)
    tx = W * 0.28 if land else W / 2
    A.paste_center(im, lg, tx, H * (0.32 if land else 0.19))
    d = A.ImageDraw.Draw(im)
    A.text_center(d, tx, H * (0.52 if land else 0.33), '新春限定 · 年兽来袭', title_size, GOLD, A.DARK, max(4, title_size // 9))
    A.text_center(d, W / 2, H * 0.93, '年夜庙会 · 击败年兽 · 解锁「福蛙」', int(title_size * 0.55), (255, 255, 255), A.DARK, 4)
    im.convert('RGB').save(A.out('宣传图', name), optimize=True)


def share_card():
    W, H = 500, 400
    src = Image.open(os.path.join(A.SHOTS, '12_nian.png')).convert('RGBA')
    cw = src.width
    ch = int(cw * 4 / 5)
    top = int(src.height * 0.3)
    im = src.crop((0, top, cw, top + ch)).resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle([0, H - 74, W, H], fill=(120, 14, 20, 225))
    A.text_center(d, W / 2, H - 66, '年兽来了！快来割年兽呱～', 36, GOLD, A.DARK, 4)
    im.convert('RGB').save(A.out('分享卡片', 'share_05_新春年兽.png'), optimize=True)


def icon_badge():
    """在 512 图标右上角加「春」角标（活动期间替换商店图标用）"""
    p = os.path.join(A.MK, '图标')
    srcs = [f for f in os.listdir(p) if f.startswith('icon_512')] or sorted(os.listdir(p))
    im = Image.open(os.path.join(p, srcs[0])).convert('RGBA').resize((512, 512))
    d = ImageDraw.Draw(im)
    d.ellipse([352, 16, 496, 160], fill=(210, 30, 36, 255), outline=GOLD + (255,), width=8)
    A.text_center(d, 424, 34, '春', 92, GOLD, A.DARK, 4)
    im.convert('RGB').save(A.out('图标', 'icon_512_新春角标.png'))


def teaser():
    """预告海报：倒计时文案，可在活动前一周发"""
    W, H = 1080, 1440
    im = fest_sky(W, H, 0.78, seed=9)
    lantern_row(im, 30, 4.5, 7)
    ni = A.sprite('nian_1', 12)  # 剪影
    a = ni.getchannel('A')
    ni = Image.new('RGBA', ni.size, (24, 2, 8, 255))
    ni.putalpha(a)
    A.paste_center(im, ni, W / 2, H * 0.5)
    for e in ((W / 2 - 70, H * 0.46), (W / 2 + 70, H * 0.46)):  # 发光的眼睛
        ImageDraw.Draw(im).rectangle([e[0] - 18, e[1] - 10, e[0] + 18, e[1] + 10], fill=GOLD)
    d = ImageDraw.Draw(im)
    A.text_center(d, W / 2, H * 0.12, '有什么东西', 96, (255, 255, 255), A.DARK, 8)
    A.text_center(d, W / 2, H * 0.21, '要来庙会了……', 96, GOLD, A.DARK, 8)
    A.text_center(d, W / 2, H * 0.8, '2027.01.28  新春版本', 64, GOLD, A.DARK, 6)
    A.text_center(d, W / 2, H * 0.88, '微信搜索「奶蛙割草」', 52, (255, 255, 255), A.DARK, 5)
    im.convert('RGB').save(A.out('宣传图', '新春_预告海报_1080x1440.png'), optimize=True)


if __name__ == '__main__':
    fest_scene(1920, 1080, 170, 4.0, 72, '新春_主视觉_横版_1920x1080.png')
    fest_scene(1080, 1920, 160, 4.4, 76, '新春_主视觉_竖版_1080x1920.png')
    share_card()
    icon_badge()
    teaser()
    print('新春素材 ×5')
