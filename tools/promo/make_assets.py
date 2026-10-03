#!/usr/bin/env python3
"""
生成上架与推广用的图片素材，输出到 marketing/。
依赖 run.sh shots 产出的 out/shots（图集）与 out/shots_png（游戏截图）。
"""
import json
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MK = os.path.join(ROOT, 'marketing')
SHOTS = os.path.join(HERE, 'out', 'shots_png')
ATLAS_DIR = os.path.join(HERE, 'out', 'shots')
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'

YELLOW = (255, 236, 120)
RED = (230, 50, 60)
DARK = (24, 8, 22)

raw = open(os.path.join(ATLAS_DIR, 'atlas.raw'), 'rb').read()
n = int(math.isqrt(len(raw) // 4))
ATLAS = Image.frombytes('RGBA', (n, n), raw)
RECTS = json.load(open(os.path.join(ATLAS_DIR, 'rects.json')))


def font(sz):
    return ImageFont.truetype(FONT, int(sz))


def sprite(name, scale):
    r = RECTS[name]
    im = ATLAS.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
    return im.resize((int(r['w'] * scale), int(r['h'] * scale)), Image.NEAREST)


def out(*p):
    path = os.path.join(MK, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def gradient(w, h, top, bottom):
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        k = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * k) for i in range(3)))
    return im


def night_sky(w, h, horizon=0.72, seed=1):
    """夜空 + 星星 + 地平线红光，与游戏标题界面同风格"""
    rnd = random.Random(seed)
    im = gradient(w, int(h * horizon), (10, 6, 26), (80, 18, 44)).convert('RGBA')
    base = Image.new('RGBA', (w, h), (26, 12, 34, 255))
    base.paste(im, (0, 0))
    d = ImageDraw.Draw(base)
    for _ in range(int(w * h / 9000)):
        x, y = rnd.randrange(w), rnd.randrange(int(h * horizon * 0.95))
        s = rnd.choice([1, 1, 2, 2, 3]) * max(1, w // 720)
        a = rnd.randrange(120, 255)
        d.rectangle([x, y, x + s - 1, y + s - 1], fill=(220, 230, 255, a))
    return base


def paste_center(dst, src, cx, cy):
    dst.alpha_composite(src, (int(cx - src.width / 2), int(cy - src.height / 2)))


def hills(dst, y, scale):
    h = sprite('hills', scale)
    x = -random.randint(0, h.width // 2)
    while x < dst.width:
        dst.alpha_composite(h, (x, int(y - h.height)))
        x += h.width
    d = ImageDraw.Draw(dst)
    d.rectangle([0, int(y) - 2, dst.width, dst.height], fill=(26, 12, 34, 255))


def logo(text, size, sub=None, sub_size=None):
    """游戏 Logo：黄字 + 粗描边 + 投影"""
    f = font(size)
    pad = int(size * 0.3)
    d0 = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    bw = int(d0.textlength(text, font=f))
    sub_h = int(sub_size * 1.4) if sub else 0
    im = Image.new('RGBA', (bw + pad * 2, int(size * 1.35) + pad + sub_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    st = max(4, size // 12)
    d.text((pad + size // 14, pad // 2 + size // 12), text, font=f, fill=(60, 6, 16, 255), stroke_width=st, stroke_fill=(60, 6, 16, 255))
    d.text((pad, pad // 2), text, font=f, fill=YELLOW + (255,), stroke_width=st, stroke_fill=DARK + (255,))
    if sub:
        fs = font(sub_size)
        sw = d.textlength(sub, font=fs)
        d.text(((im.width - sw) / 2, int(size * 1.25) + pad // 2), sub, font=fs, fill=(255, 120, 110, 255), stroke_width=max(2, sub_size // 10), stroke_fill=DARK + (255,))
    return im


def text_center(d, cx, y, s, size, fill, stroke=None, sw=0):
    f = font(size)
    w = d.textlength(s, font=f)
    d.text((cx - w / 2, y), s, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke)


def rounded(im, r):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    o = im.convert('RGBA')
    o.putalpha(mask)
    return o


# ------------------------------------------------------------------ 商店截图（1080×1920）
CAPTIONS = [
    ('01_title', '呱！奶蛙来割草了', '像素肉鸽 · 竖屏单手 · 15 分钟一局'),
    ('03_swarm', '满屏怪物 一路割爆', '连击不断 · 爽感拉满'),
    ('04_levelup', '16 种武器 随你搭配', '每一局的构筑都不一样'),
    ('05_boss', '7 大 Boss 技能各异', '躲激光 · 闪冲锋 · 破弹幕'),
    ('06_bloodmoon', '红月降临 终极挑战', '最后两分钟 怪物狂潮'),
    ('07_evolve', '武器进化 质变爆发', '16 种武器 × 16 种进化'),
    ('02_chars', '12 只奶蛙 各有绝活', '法师 · 游侠 · 骑士 · 爆破 …'),
    ('08_victory', '活过 15 分钟 你就是王', '成就 · 永久强化 · 无尽模式'),
    ('09_snow', '冰雪荒原 冰锥坠落', '把怪物引到红圈里！'),
    ('10_lava', '熔岩火山 陨石暴雨', '难度更高 · 金币更多'),
    ('17_swamp', '毒雾沼泽 毒云弥漫', '终极地图 · 金币 +90%'),
    ('18_toad', '沼泽霸主 毒沼巨蟾', '毒液喷吐 · 长舌突刺 · 跳跃砸地'),
    ('11_daily', '每日挑战 + 每日任务', '全服同题 · 试玩新奶蛙 · 天天领金币'),
    ('21_xmas', '圣诞限定 雪怪王来了', '雪夜小镇 · 击败雪怪王得圣诞蛙'),
    ('12_nian', '新春限定 年兽来袭', '年夜庙会 · 击败年兽得福蛙'),
    ('14_codex', '67 项图鉴 等你收集', '武器 · 进化 · 道具 · 怪物'),
]


def store_screenshots():
    W, H = 1080, 1920
    for i, (shot, title, sub) in enumerate(CAPTIONS, 1):
        bg = night_sky(W, H, horizon=1.0, seed=i)
        moon = sprite('moon', 7)
        paste_center(bg, moon, W * (0.82 if i % 2 else 0.18), 150)
        shot_im = Image.open(os.path.join(SHOTS, shot + '.png')).convert('RGB')
        sw = int(W * 0.84)
        sh = int(shot_im.height * sw / shot_im.width)
        shot_im = shot_im.resize((sw, sh), Image.LANCZOS)
        card = rounded(shot_im, 36)
        y0 = H - sh - 40
        shadow = Image.new('RGBA', (sw + 60, sh + 60), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle([30, 30, sw + 30, sh + 30], 40, fill=(0, 0, 0, 170))
        bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)), ((W - sw) // 2 - 30, y0 - 18))
        frame = Image.new('RGBA', (sw + 16, sh + 16), (0, 0, 0, 0))
        ImageDraw.Draw(frame).rounded_rectangle([0, 0, sw + 15, sh + 15], 44, fill=(214, 170, 70, 255))
        bg.alpha_composite(frame, ((W - sw) // 2 - 8, y0 - 8))
        bg.alpha_composite(card, ((W - sw) // 2, y0))
        d = ImageDraw.Draw(bg)
        text_center(d, W / 2, 64, title, 92, YELLOW, DARK, 9)
        text_center(d, W / 2, 196, sub, 44, (255, 255, 255), DARK, 5)
        bg.convert('RGB').save(out('商店截图', f'{i:02d}_{shot[3:]}.png'), optimize=True)
    print('商店截图 ×', len(CAPTIONS))


# ------------------------------------------------------------------ 图标
def icons():
    S = 1024
    im = Image.new('RGBA', (S, S), (0, 0, 0, 255))
    g = gradient(S, S, (24, 8, 40), (90, 16, 40)).convert('RGBA')
    im.alpha_composite(g)
    # 放射光
    rays = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(rays)
    for k in range(16):
        a0 = k * math.pi * 2 / 16
        d.polygon([(S / 2, S / 2), (S / 2 + math.cos(a0) * S, S / 2 + math.sin(a0) * S), (S / 2 + math.cos(a0 + 0.12) * S, S / 2 + math.sin(a0 + 0.12) * S)], fill=(255, 90, 80, 40))
    im.alpha_composite(rays)
    paste_center(im, sprite('moon', 11), S / 2, S * 0.43)
    frog = sprite('hero_hunter_0', 11)
    paste_center(im, frog, S / 2, S * 0.6)
    for size in (1024, 512, 256, 144):
        im.resize((size, size), Image.LANCZOS if size < 1024 else Image.NEAREST).convert('RGB').save(out('图标', f'icon_{size}.png'), optimize=True)
    # 圆形预览（微信头像显示为圆形）
    circ = im.resize((512, 512), Image.LANCZOS)
    mask = Image.new('L', (512, 512), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, 511, 511], fill=255)
    circ.putalpha(mask)
    circ.save(out('图标', 'icon_圆形预览.png'))
    print('图标 ×5')


# ------------------------------------------------------------------ 主视觉
HEROES = ['mage', 'rogue', 'knight', 'hunter', 'nun', 'pyro', 'sage', 'bomber']


def key_visual(W, H, name, logo_size, hero_scale, slogan_size):
    random.seed(7)
    horizon = 0.74
    im = night_sky(W, H, horizon)
    paste_center(im, sprite('moon', W / 120), W / 2, H * 0.34)
    for k in range(4):
        c = sprite('cloud', W / 300)
        im.alpha_composite(c, (int(W * (0.05 + k * 0.24)), int(H * (0.25 + 0.08 * (k % 2)))))
    for k in range(6):
        b = sprite('bat_%d' % (k % 2), W / 600).copy()
        b = Image.eval(b, lambda v: v)
        px = b.load()
        for y in range(b.height):
            for x in range(b.width):
                if px[x, y][3]:
                    px[x, y] = (30, 12, 36, 255)
        im.alpha_composite(b, (int(W * random.uniform(0.05, 0.9)), int(H * random.uniform(0.08, 0.45))))
    hills(im, H * horizon, W / 320)
    # 12 只奶蛙排成两排（中间的奶蛙最大）
    order = HEROES
    gy = H * horizon
    back = [order[i] for i in (0, 2, 4, 6)]
    front = [order[i] for i in (1, 3, 5, 7)]
    span = W * 0.82
    slot = span / 4
    for row, names, sc, yoff in ((0, back, hero_scale * 0.78, -hero_scale * 30), (1, front, hero_scale, H * 0.035)):
        for k, hn in enumerate(names):
            s = sprite('hero_%s_0' % hn, sc * (1.25 if hn == 'hunter' else 1))
            # 后排错开半格，从前排之间露出来
            cx = W / 2 - span / 2 + slot * (k + 0.5) + (slot * 0.5 if row == 0 else 0) - (slot * 0.25 if row == 0 else 0)
            sh = sprite('shadow', sc * 1.8)
            paste_center(im, sh, cx, gy + yoff + 4)
            im.alpha_composite(s, (int(cx - s.width / 2), int(gy + yoff - s.height + 6)))
    lg = logo('奶蛙割草', logo_size, 'MILKY FROG SURVIVORS', logo_size // 4)
    paste_center(im, lg, W / 2, H * 0.17)
    d = ImageDraw.Draw(im)
    text_center(d, W / 2, H * 0.86, '胖奶蛙 · 割草生存 · 你能活过 15 分钟吗？', slogan_size, (255, 255, 255), DARK, max(3, slogan_size // 10))
    im.convert('RGB').save(out('宣传图', name), optimize=True)


def share_cards():
    W, H = 500, 400
    specs = [
        ('share_01_主视觉.png', None, '你能活过 15 分钟吗？'),
        ('share_02_割草.png', '03_swarm', '一局割倒 16888 只怪！'),
        ('share_03_Boss.png', '05_boss', '激光扫过来了，快跑呱！'),
        ('share_04_红月.png', '06_bloodmoon', '红月降临，最后两分钟！'),
    ]
    for name, shot, text in specs:
        if shot is None:
            im = night_sky(W, H, 0.78)
            paste_center(im, sprite('moon', 3.4), W / 2, H * 0.36)
            hills(im, H * 0.78, 1.6)
            fr = sprite('hero_hunter_0', 2.6)
            im.alpha_composite(fr, (int(W / 2 - fr.width / 2), int(H * 0.78 - fr.height + 4)))
            lg = logo('奶蛙割草', 70)
            paste_center(im, lg, W / 2, 70)
        else:
            src = Image.open(os.path.join(SHOTS, shot + '.png')).convert('RGBA')
            # 取画面中部的 5:4 区域
            cw = src.width
            ch = int(cw * 4 / 5)
            top = int(src.height * 0.32)
            im = src.crop((0, top, cw, top + ch)).resize((W, H), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        d.rectangle([0, H - 74, W, H], fill=(20, 8, 26, 215))
        text_center(d, W / 2, H - 66, text, 38, YELLOW, DARK, 4)
        im.convert('RGB').save(out('分享卡片', name), optimize=True)
    print('分享卡片 ×', len(specs))


if __name__ == '__main__':
    store_screenshots()
    icons()
    key_visual(1920, 1080, '主视觉_横版_1920x1080.png', 190, 4.2, 44)
    key_visual(1080, 1920, '主视觉_竖版_抖音封面_1080x1920.png', 170, 3.6, 40)
    key_visual(1242, 1660, '主视觉_小红书_1242x1660.png', 180, 3.8, 42)
    print('主视觉 ×3')
    share_cards()
