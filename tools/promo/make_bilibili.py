#!/usr/bin/env python3
"""B 站开发者日志封面（1146×717）× 4 集。需先运行 run.sh shots（使用图集与截图）。"""
import os
from PIL import Image, ImageDraw

import make_assets as A

W, H = 1146, 717
EPS = [
    ('EP1', '所有怪物都是', '用代码画出来的', '程序化像素画'),
    ('EP2', '我让 40 个机器人', '帮我调数值', '首局胜率 22% 的由来'),
    ('EP3', '一个 Boss 是怎么', '设计出来的', '预警 → 躲避 → 反击'),
    ('EP4', '一个人做小游戏', '从空项目到上线', '独立开发全记录'),
]


def base(seed):
    im = A.night_sky(W, H, 0.86, seed=seed)
    A.hills(im, H * 0.86, 2.4)
    return im


def tag(d, x, y, text, size, fill):
    f = A.font(size)
    tw = d.textlength(text, font=f)
    d.rounded_rectangle([x, y, x + tw + size, y + size * 1.5], size // 2, fill=fill)
    d.text((x + size / 2, y + size * 0.15), text, font=f, fill=(255, 255, 255))


def headline(im, ep, l1, l2, sub, x=60):
    d = ImageDraw.Draw(im)
    tag(d, x, 40, f'奶蛙割草 开发日志 {ep}', 30, (214, 50, 60))
    for i, (t, col) in enumerate(((l1, (255, 255, 255)), (l2, A.YELLOW))):
        d.text((x, 120 + i * 108), t, font=A.font(84), fill=col, stroke_width=8, stroke_fill=A.DARK)
    d.text((x, 360), sub, font=A.font(40), fill=(200, 190, 230), stroke_width=4, stroke_fill=A.DARK)


def ep1():
    im = base(31)
    # 右侧：怪物精灵阵列（放大的像素画）
    names = ['slimeking_0', 'bonelord_0', 'vampire_0', 'lich_0', 'eye_0', 'reaper_0', 'toad_0', 'yeti_0', 'nian_0']
    for i, n in enumerate(names):
        s = A.sprite(n, 2.2)
        cx, cy = 800 + (i % 3) * 125, 170 + (i // 3) * 150
        A.paste_center(im, s, cx, cy)
    d = ImageDraw.Draw(im)
    d.text((60, 470), 'c.ellipse(24, 33, 20, 15, GREEN)', font=A.font(30), fill=(130, 230, 140))
    d.text((60, 515), 'c.rect(16, 30, 4, 5, OUTLINE)', font=A.font(30), fill=(130, 230, 140))
    headline(im, *EPS[0])
    return im


def ep2():
    im = base(32)
    d = ImageDraw.Draw(im)
    # 右侧：首局 / 第二局 / 第三局胜率柱状图（模拟结果）
    bars = [('第 1 局', 22), ('第 2 局', 40), ('第 3 局', 50)]
    x0, y0 = 700, 600
    for i, (lab, v) in enumerate(bars):
        x = x0 + i * 140
        h = v * 8
        d.rectangle([x, y0 - h, x + 90, y0], fill=(80, 190, 110), outline=(255, 255, 255), width=3)
        A.text_center(d, x + 45, y0 - h - 52, f'{v}%', 40, A.YELLOW, A.DARK, 4)
        A.text_center(d, x + 45, y0 + 10, lab, 26, (255, 255, 255), A.DARK, 3)
    for k in range(5):
        fr = A.sprite('hero_hunter_0', 0.9)
        im.alpha_composite(fr, (60 + k * 75, 470))
    headline(im, *EPS[1])
    return im


def ep3():
    im = base(33)
    shot = Image.open(os.path.join(A.SHOTS, '05_boss.png')).convert('RGBA')
    sh = 640
    shot = A.rounded(shot.resize((int(shot.width * sh / shot.height), sh), Image.LANCZOS), 18)
    ImageDraw.Draw(im).rounded_rectangle([W - shot.width - 66, 32, W - 54, 44 + sh], 22, fill=(214, 170, 70, 255))
    im.alpha_composite(shot, (W - shot.width - 60, 38))
    headline(im, *EPS[2])
    d = ImageDraw.Draw(im)
    for i, (t, col) in enumerate((('预警', (255, 80, 80)), ('躲避', (255, 214, 90)), ('反击', (110, 230, 120)))):
        tag(d, 60 + i * 150, 450, t, 40, tuple(int(c * 0.75) for c in col))
    return im


def ep4():
    im = base(34)
    kv = Image.open(os.path.join(A.MK, '宣传图', '主视觉_横版_1920x1080.png')).convert('RGBA')
    kv = kv.crop((620, 360, 1920, 900)).resize((520, 216), Image.LANCZOS)
    im.alpha_composite(A.rounded(kv, 20), (W - 560, 380))
    headline(im, *EPS[3])
    d = ImageDraw.Draw(im)
    d.text((60, 440), '空项目 → 可玩 → 12 只奶蛙 → 上线', font=A.font(32), fill=(255, 255, 255), stroke_width=3, stroke_fill=A.DARK)
    return im


if __name__ == '__main__':
    for i, fn in enumerate((ep1, ep2, ep3, ep4)):
        im = fn()
        im.convert('RGB').save(A.out('B站封面', f'开发日志_EP{i + 1}_封面_1146x717.jpg'), quality=92)
    print('B 站封面 × 4')
