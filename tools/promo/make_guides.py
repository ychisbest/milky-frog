#!/usr/bin/env python3
"""图鉴 / 攻略海报（小红书 3:4，1242×1660）：进化配方表、武器图鉴、道具图鉴、Boss 图鉴、新手攻略。
数据直接来自游戏数值表（out/defs.json，由 dump_defs.ts 导出），改数值后重跑即可。"""
import json
import os
import subprocess
from PIL import Image, ImageDraw

import make_assets as A

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1242, 1660
PANEL = (34, 20, 52, 235)
LINE = (214, 170, 70, 255)
WHITE = (255, 255, 255)
GREY = (200, 190, 220)

# Boss 技能说明（与 Bosses.ts 中的 AI 对应）
BOSS_INFO = {
    'slimeking': ('跳跃砸地 · 召唤小史莱姆 · 体力减半时分裂', '看到落点红圈就往外走'),
    'bonelord': ('钢刺环 · 预警冲锋 · 召唤木偶兵', '红线出现后横向闪开'),
    'vampire': ('魔法弹扇射 · 瞬移魔法环 · 蝙蝠风暴', '贴近绕圈，别在扇形正前方'),
    'lich': ('冰霜螺旋弹幕 · 冰锥阵 · 减速冰域', '离开蓝色冰域，顺着螺旋走'),
    'eye': ('魔法光束扫射 · 追踪光球 · 双层弹环', '射线预警时绕到它身后'),
    'reaper': ('回旋飞牌 · 连续冲刺 · 幻影召唤 · 暗影弹环', '击败暗夜魔术师即胜利，留好回复生命'),
    'toad': ('毒液喷吐 · 长舌突刺 · 跳跃砸地 · 召唤史莱姆', '毒雾沼泽限定：远离毒云，侧移躲舌头'),
    'yeti': ('雪球连射 · 冰锥阵 · 冲锋撞击 · 召唤云朵精', '圣诞限定：击败解锁「圣诞蛙」'),
    'nian': ('爆竹乱射 · 连续冲撞 · 烟花齐放 · 怒吼召唤', '新春限定：击败解锁「福蛙」'),
}


def defs():
    p = os.path.join(HERE, 'out', 'defs.json')
    subprocess.run('npx -y esbuild@0.23 dump_defs.ts --bundle --platform=node --format=esm --outfile=out/dump_defs.mjs --log-level=warning && node out/dump_defs.mjs > out/defs.json',
                   shell=True, check=True, cwd=HERE)
    return json.load(open(p, encoding='utf-8'))


def page(title, sub):
    im = A.night_sky(W, H, 1.0, seed=hash(title) % 100)
    lg = A.logo('奶蛙割草', 64)
    im.alpha_composite(lg, (24, 10))
    d = ImageDraw.Draw(im)
    A.text_center(d, W / 2, 110, title, 92, A.YELLOW, A.DARK, 8)
    A.text_center(d, W / 2, 228, sub, 38, WHITE, A.DARK, 4)
    return im, d


def footer(im, d):
    A.text_center(d, W / 2, H - 70, '微信搜索「奶蛙割草」· 收藏这张图鉴不迷路', 34, GREY, A.DARK, 3)


def box(im, x, y, w, h):
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle([x, y, x + w, y + h], 18, fill=PANEL, outline=LINE, width=3)
    im.alpha_composite(layer)


def icon(im, name, cx, cy, size):
    r = A.RECTS[name]
    s = A.sprite(name, size / max(r['w'], r['h']))
    A.paste_center(im, s, cx, cy)


def save(im, name):
    im.convert('RGB').save(A.out('图鉴攻略', name), optimize=True)


def evolutions(D):
    im, d = page('武器进化配方', '武器满 8 级 + 持有对应道具 → 击败 Boss 开宝箱进化')
    wmap = {w['id']: w for w in D['WEAPONS']}
    pmap = {p['id']: p for p in D['PASSIVES']}
    rows = list(D['EVOLUTIONS'].items())
    y0 = 300
    rh = min(88, (H - y0 - 110) / len(rows))
    for i, (wid, ev) in enumerate(rows):
        y = y0 + i * rh
        box(im, 40, y, W - 80, rh - 10)
        cy = y + (rh - 10) / 2
        w, p = wmap[wid], pmap[ev['passive']]
        f = A.font(36)
        icon(im, w['icon'], 100, cy, 56)
        d.text((140, cy - 22), w['name'], font=f, fill=WHITE, stroke_width=3, stroke_fill=A.DARK)
        d.text((340, cy - 24), '+', font=A.font(44), fill=A.YELLOW, stroke_width=3, stroke_fill=A.DARK)
        icon(im, p['icon'], 420, cy, 56)
        d.text((460, cy - 22), p['name'], font=f, fill=WHITE, stroke_width=3, stroke_fill=A.DARK)
        d.text((680, cy - 24), '→', font=A.font(44), fill=A.YELLOW, stroke_width=3, stroke_fill=A.DARK)
        icon(im, ev['icon'], 780, cy, 60)
        d.text((830, cy - 24), ev['name'], font=A.font(40), fill=(255, 140, 90), stroke_width=3, stroke_fill=A.DARK)
    footer(im, d)
    save(im, '01_武器进化配方.png')


def grid(D, items, title, sub, name, cols=2):
    im, d = page(title, sub)
    n = len(items)
    rows = (n + cols - 1) // cols
    gx, gy0 = 40, 300
    cw = (W - 80 - (cols - 1) * 20) / cols
    rh = min(170, (H - gy0 - 120) / rows)
    for i, it in enumerate(items):
        c, r = i % cols, i // cols
        x, y = gx + c * (cw + 20), gy0 + r * rh
        box(im, x, y, cw, rh - 14)
        icon(im, it['icon'], x + 62, y + (rh - 14) / 2, 72)
        d.text((x + 116, y + 14), it['name'], font=A.font(38), fill=A.YELLOW, stroke_width=3, stroke_fill=A.DARK)
        desc = it['desc']
        f = A.font(26)
        # 按宽度换行
        lines, cur = [], ''
        for ch in desc:
            if d.textlength(cur + ch, font=f) > cw - 136:
                lines.append(cur)
                cur = ch
            else:
                cur += ch
        lines.append(cur)
        # 避免标点单独成行
        if len(lines) > 1 and len(lines[-1]) <= 1:
            tail = lines.pop()
            lines[-1] += tail
        for k, ln in enumerate(lines[:2]):
            d.text((x + 116, y + 66 + k * 34), ln, font=f, fill=GREY)
    footer(im, d)
    save(im, name)


def bosses(D):
    im, d = page('Boss 图鉴', '每个 Boss 技能前都有红色预警 · 看清再躲')
    sched = [(b['t'], b['id']) for b in D['BOSS_SCHEDULE']] + [('swamp', 'toad'), ('xmas', 'yeti'), (None, 'nian')]
    y0 = 300
    rh = min(172, (H - y0 - 110) / len(sched))
    for i, (t, bid) in enumerate(sched):
        y = y0 + i * rh
        box(im, 40, y, W - 80, rh - 14)
        e = D['ENEMIES'][bid]
        icon(im, e['frames'][0], 130, y + (rh - 14) / 2, min(128, rh - 30))
        skills, tip = BOSS_INFO[bid]
        tt = '新春限定' if t is None else '圣诞限定' if t == 'xmas' else '沼泽 7:00' if t == 'swamp' else f'{t // 60}:{t % 60:02d} 登场'
        k = rh / 172
        d.text((230, y + 10), e['name'], font=A.font(44 * k), fill=A.YELLOW, stroke_width=4, stroke_fill=A.DARK)
        d.text((230 + d.textlength(e['name'], font=A.font(44 * k)) + 24, y + 22 * k), tt, font=A.font(28 * k), fill=(255, 140, 140), stroke_width=2, stroke_fill=A.DARK)
        d.text((230, y + 68 * k), skills, font=A.font(28 * k), fill=WHITE)
        d.text((230, y + 106 * k), '攻略：' + tip, font=A.font(28 * k), fill=(150, 230, 160))
    footer(im, d)
    save(im, '04_Boss图鉴.png')


def tips():
    im, d = page('新手 8 条生存攻略', '学会这些 第一次就能活过 10 分钟')
    TIPS = [
        ('先拿范围武器', '大蒜、魔法药水、火焰法杖清小怪最稳'),
        ('武器优先于道具', '前 5 分钟把武器栏凑满 6 把'),
        ('凑进化配方', '武器满级 + 对应道具，打 Boss 开宝箱进化'),
        ('红圈红线快躲', 'Boss 技能、冰锥、陨石都有红色预警'),
        ('别贪宝石', '被围住时先跑出来，宝石不会消失'),
        ('红月前回满状态', '13:00 红月降临，最后两分钟怪物狂潮'),
        ('输了也有收获', '金币买永久强化，连败还有「不屈意志」加成'),
        ('每日挑战', '每天试玩一只新奶蛙，存活 10 分钟得金币'),
    ]
    y0, rh = 300, 158
    for i, (t, s) in enumerate(TIPS):
        y = y0 + i * rh
        box(im, 40, y, W - 80, rh - 16)
        d.ellipse([70, y + 30, 150, y + 110], fill=(200, 50, 60), outline=A.YELLOW, width=4)
        A.text_center(d, 110, y + 36, str(i + 1), 52, WHITE, A.DARK, 3)
        d.text((180, y + 20), t, font=A.font(44), fill=A.YELLOW, stroke_width=4, stroke_fill=A.DARK)
        d.text((180, y + 82), s, font=A.font(32), fill=WHITE)
    fr = A.sprite('hero_hunter_0', 2.4)
    im.alpha_composite(fr, (W - fr.width - 60, y0 - fr.height + 20))
    footer(im, d)
    save(im, '05_新手攻略.png')


def characters(D):
    chars = [c for c in D['CHARACTERS']]
    im, d = page(f'{len(chars)} 只奶蛙图鉴', '每只奶蛙初始武器与天赋都不同')
    cols = 3
    rows = (len(chars) + cols - 1) // cols
    cw, ch = (W - 80 - 40) / cols, min(360, (H - 300 - 110) / rows - 20)
    wmap = {w['id']: w for w in D['WEAPONS']}
    for i, c in enumerate(chars):
        x, y = 40 + (i % cols) * (cw + 20), 300 + (i // cols) * (ch + 20)
        box(im, x, y, cw, ch)
        k = ch / 360
        s = A.sprite(c['sprite'] + '_0', 2.6 * k)
        im.alpha_composite(s, (int(x + cw / 2 - s.width / 2), int(y + 200 * k - s.height)))
        A.text_center(d, x + cw / 2, y + 208 * k, c['name'], 40 * k, A.YELLOW, A.DARK, 4)
        w = wmap[c['weapon']]
        A.text_center(d, x + cw / 2, y + 258 * k, '初始：' + w['name'], 28 * k, WHITE)
        A.text_center(d, x + cw / 2, y + 298 * k, c['desc'], 26 * k, (150, 230, 160))
        if c['cost'] < 0:
            A.text_center(d, x + cw / 2, y + 12, c['title'], 26, (255, 120, 110), A.DARK, 3)
    footer(im, d)
    save(im, '06_奶蛙图鉴.png')


# 怪物登场时间（与 Defs.ts 的 WAVES 对应）
MONSTER_TIME = {'rat': '0:00', 'bat': '0:00', 'slime': '0:40', 'zombie': '1:30', 'skeleton': '3:30', 'ghost': '7:00',
                'shroom': '7:00', 'imp': '9:00', 'mummy': '11:00', 'goldrat': '随机'}


def monsters(D):
    ids = [k for k in MONSTER_TIME]
    im, d = page('怪物图鉴', '认清它们 · 知道什么时候该跑')
    y0 = 300
    rh = min(150, (H - y0 - 110) / len(ids))
    k = rh / 150
    for i, mid in enumerate(ids):
        y = y0 + i * rh
        box(im, 40, y, W - 80, rh - 12)
        e = D['ENEMIES'][mid]
        icon(im, e['frames'][0], 120, y + (rh - 12) / 2, min(100, rh - 30))
        name, desc = MONSTER_INFO_NAMES[mid]
        d.text((200, y + 12 * k), name, font=A.font(40 * k), fill=A.YELLOW, stroke_width=3, stroke_fill=A.DARK)
        d.text((200 + d.textlength(name, font=A.font(40 * k)) + 20, y + 22 * k), MONSTER_TIME[mid] + (' 登场' if ':' in MONSTER_TIME[mid] else ''), font=A.font(26 * k), fill=(255, 140, 140))
        d.text((200, y + 72 * k), desc, font=A.font(26 * k), fill=WHITE)
    footer(im, d)
    save(im, '07_怪物图鉴.png')


MONSTER_INFO_NAMES = {}


if __name__ == '__main__':
    D = defs()
    evolutions(D)
    grid(D, D['WEAPONS'], f"{len(D['WEAPONS'])} 种武器图鉴", '全自动攻击 · 升到 8 级可进化', '02_武器图鉴.png')
    grid(D, D['PASSIVES'], f"{len(D['PASSIVES'])} 种道具图鉴", '道具最高 5 级 · 部分是进化钥匙', '03_道具图鉴.png')
    bosses(D)
    tips()
    characters(D)
    import re
    src = open(os.path.join(A.ROOT, 'assets', 'scripts', 'Defs.ts'), encoding='utf-8').read()
    for mid, name, desc in re.findall(r"    (\w+): \{ name: '([^']+)', desc: '([^']+)' \}", src):
        MONSTER_INFO_NAMES[mid] = (name, desc)
    monsters(D)
    print('图鉴攻略 × 7')
