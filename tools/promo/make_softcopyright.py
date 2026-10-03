#!/usr/bin/env python3
"""
生成软件著作权登记材料（PDF，A4）：
  1. 源程序：前 30 页 + 后 30 页，每页 50 行（去除空行），页眉为「软件名称 + 版本号」，页脚页码
  2. 用户手册：软件功能与操作说明，配真实游戏截图
输出到 marketing/软著材料/。截图来自 run.sh shots 的 out/shots_png。
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'marketing', '软著材料')
SHOTS = os.path.join(HERE, 'out', 'shots_png')
SOFT = '奶蛙割草游戏软件'
VER = 'V1.0'
PAGE = (1240, 1754)  # A4 @150dpi
SANS = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
SANS_B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
MONO = ImageFont.truetype(SANS, 19, index=7)
HEAD = ImageFont.truetype(SANS, 22, index=2)
# 源文件按「入口 → 战斗 → 内容 → 工具」的顺序拼接
ORDER = ['GameRoot.ts', 'Battle.ts', 'Bosses.ts', 'Defs.ts', 'Ads.ts', 'AdConfig.ts', 'Sound.ts', 'Save.ts', 'UiKit.ts',
         'Backdrop.ts', 'Art.ts', 'PixelArt.ts']


_measure = ImageDraw.Draw(Image.new('RGB', (1, 1)))


def wrap(text, font, width):
    """按像素宽度折行（中文字符较宽，不能按字符数截断）"""
    out, cur = [], ''
    for ch in text:
        if _measure.textlength(cur + ch, font=font) > width:
            out.append(cur)
            cur = '    ' + ch if font is MONO else ch
        else:
            cur += ch
    out.append(cur)
    return out


def header(d, page_no, total):
    d.text((80, 50), f'{SOFT} {VER}', font=HEAD, fill=(0, 0, 0))
    d.line([(80, 88), (PAGE[0] - 80, 88)], fill=(0, 0, 0), width=2)
    t = f'第 {page_no} 页 / 共 {total} 页'
    w = d.textlength(t, font=HEAD)
    d.text(((PAGE[0] - w) / 2, PAGE[1] - 70), t, font=HEAD, fill=(0, 0, 0))


def source_pdf():
    lines = []
    for f in ORDER:
        for ln in open(os.path.join(ROOT, 'assets', 'scripts', f), encoding='utf-8').read().splitlines():
            if ln.strip():
                lines.extend(wrap(ln.replace('\t', '    '), MONO, PAGE[0] - 170))
    pages = [lines[i:i + 50] for i in range(0, len(lines), 50)]
    total = len(pages)
    pick = list(range(total)) if total <= 60 else list(range(30)) + list(range(total - 30, total))
    imgs = []
    for p in pick:
        im = Image.new('RGB', PAGE, (255, 255, 255))
        d = ImageDraw.Draw(im)
        header(d, p + 1, total)
        y = 110
        for ln in pages[p]:
            d.text((80, y), ln, font=MONO, fill=(0, 0, 0))
            y += 31
        imgs.append(im)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{SOFT}{VER}_源程序（前后各30页）.pdf')
    imgs[0].save(path, save_all=True, append_images=imgs[1:], resolution=150)
    print(f'源程序：共 {len(lines)} 行 / {total} 页，输出 {len(imgs)} 页 → {os.path.basename(path)}')
    return len(lines)


MANUAL = [
    ('一、软件概述', [
        f'{SOFT}（简称“奶蛙割草”）是一款运行于微信小游戏平台的竖屏像素风动作生存游戏。',
        '玩家操控胖乎乎的奶蛙角色，在不断涌来的怪物中移动走位，武器自动攻击；通过拾取经验宝石升级，',
        '选择并组合武器与道具，击败 Boss，并在 15 分钟内生存下来即可获胜。',
        '主要功能：角色选择、自动战斗、武器升级与进化、Boss 战、命运卡牌、永久强化商店、成就、',
        '无尽模式、本地存档、音乐音效、激励视频广告。',
    ], None),
    ('二、运行环境', [
        '运行平台：微信小游戏（iOS / Android 微信客户端 8.0 及以上）。',
        '开发工具：Cocos Creator 3.8.8；开发语言：TypeScript。',
        '屏幕方向：竖屏；设计分辨率 720×1280，自动适配不同机型与刘海屏安全区。',
        '网络：除广告外无需联网；游戏进度保存在设备本地。',
    ], None),
    ('三、启动与主界面', [
        '1. 启动后显示启动页：游戏标志、加载进度、健康游戏忠告与适龄提示（12+）。',
        '2. 首次启动弹出《用户协议》与《隐私政策》，同意后进入主界面。',
        '3. 主界面显示当前角色、金币、每日奖励提示，以及“开始游戏”“每日挑战”“选择角色”“永久强化”“成就”“图鉴”“设置”“签到”按钮。',
        '4. 点击主界面的奶蛙，角色会跳跃并随机说话。',
        '5. 每天首次回到主界面时弹出“七日签到”，累计签到领取金币，第 7 天为大奖。',
    ], '01_title'),
    ('四、选择角色', [
        '共 12 名角色，每名角色拥有不同的初始武器与属性加成。前 2 名初始可用，其余使用金币解锁。',
        '角色界面还可切换“普通模式”与“无尽模式”（首次胜利后解锁）。',
    ], '02_chars'),
    ('五、战斗操作', [
        '1. 在屏幕任意位置按下并拖动即可出现虚拟摇杆，控制奶蛙移动；武器自动攻击附近敌人。首局有新手引导，逐步提示操作。',
        '2. 击败敌人掉落经验宝石，靠近即可拾取；经验满后升级，从 3 个选项中选择新武器、武器升级或被动道具。',
        '3. 画面上方显示经验条、存活时间、下一个 Boss 的倒计时、击败数与金币。',
        '4. 地图中的火盆可被打破，掉落道具；精英怪与金鼠会掉落丰厚奖励。',
    ], '03_swarm'),
    ('六、升级、武器与进化', [
        '游戏包含 16 种武器与 16 种被动道具，每局最多各携带 6 个。',
        '武器升至满级并持有对应的被动道具后，击败 Boss 开启宝箱时武器将进化为更强形态。',
        '“命运卡牌”在开局及击败 Boss 后提供，可改变本局规则（如伤害提升、连锁爆炸等）。',
    ], '04_levelup'),
    ('七、Boss 与红月', [
        '游戏中依次出现 6 个 Boss：史莱姆王、铁甲将军、蝙蝠伯爵、冰霜巫师、水晶魔眼、暗夜魔术师；在毒雾沼泽中，蝙蝠伯爵由毒沼巨蟾替代。',
        '地图共 4 张（月光草原、冰雪荒原、熔岩火山、毒雾沼泽），胜利后依次解锁，各有不同的环境危害。',
        'Boss 释放技能前会以红色区域或红线预警，玩家需及时躲避。击败最终 Boss 暗夜魔术师即可提前获胜。',
        '13:00 起进入“红月”阶段，怪物数量与强度大幅提升。',
    ], '05_boss'),
    ('八、结算、商店与成就', [
        '游戏结束后显示存活时间、等级、击败数、获得金币与各武器伤害统计。',
        '金币可在“永久强化”中购买属性提升，或解锁新角色；达成成就可获得额外金币。',
        '“设置”中可开关背景音乐、音效与震动。',
    ], '08_victory'),
    ('九、每日挑战与每日任务', [
        '每日挑战：每天全服同一题目（指定角色、地图、特殊规则与命运卡牌），存活 10 分钟即可领取金币，每天一次。',
        '每日任务：每天 3 个任务（如累计击败、单局存活时间、击败 Boss），普通局与挑战局都计入进度，完成后在结算时自动发放金币。',
    ], '11_daily'),
    ('十、图鉴', [
        '图鉴收录武器、进化武器、被动道具与怪物共 67 项。首次获得或击败即收录，未收录的条目显示剪影与获取提示。',
        '收集达到 50% 与 100% 时可获得成就奖励。',
    ], '14_codex'),
]


def manual_pdf():
    title_f = ImageFont.truetype(SANS_B, 40, index=2)
    h_f = ImageFont.truetype(SANS_B, 32, index=2)
    body_f = ImageFont.truetype(SANS, 24, index=2)
    pages = []
    # 封面
    im = Image.new('RGB', PAGE, (255, 255, 255))
    d = ImageDraw.Draw(im)
    for txt, f, y in ((SOFT, ImageFont.truetype(SANS_B, 64, index=2), 600), (f'用户手册（{VER}）', title_f, 720)):
        w = d.textlength(txt, font=f)
        d.text(((PAGE[0] - w) / 2, y), txt, font=f, fill=(0, 0, 0))
    pages.append(im)
    for title, paras, shot in MANUAL:
        im = Image.new('RGB', PAGE, (255, 255, 255))
        d = ImageDraw.Draw(im)
        d.text((100, 130), title, font=h_f, fill=(0, 0, 0))
        y = 200
        for p in paras:
            for seg in wrap(p, body_f, PAGE[0] - 200):
                d.text((100, y), seg, font=body_f, fill=(30, 30, 30))
                y += 44
        if shot and os.path.exists(os.path.join(SHOTS, shot + '.png')):
            s = Image.open(os.path.join(SHOTS, shot + '.png')).convert('RGB')
            sh = PAGE[1] - y - 200
            sw = int(s.width * sh / s.height)
            s = s.resize((sw, sh), Image.LANCZOS)
            im.paste(s, ((PAGE[0] - sw) // 2, y + 40))
            d.rectangle([(PAGE[0] - sw) // 2 - 2, y + 38, (PAGE[0] + sw) // 2 + 1, y + 41 + sh], outline=(120, 120, 120), width=2)
        pages.append(im)
    total = len(pages)
    for i, im in enumerate(pages):
        header(ImageDraw.Draw(im), i + 1, total)
    path = os.path.join(OUT, f'{SOFT}{VER}_用户手册.pdf')
    pages[0].save(path, save_all=True, append_images=pages[1:], resolution=150)
    print(f'用户手册：{total} 页 → {os.path.basename(path)}')


def guide(lines):
    path = os.path.join(OUT, '申请说明.md')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(f'''# 软件著作权登记申请说明

本目录材料由 `tools/promo/make_softcopyright.py` 自动生成，代码更新后重新运行即可。

## 材料清单

| 材料 | 文件 | 说明 |
| --- | --- | --- |
| 源程序 | `{SOFT}{VER}_源程序（前后各30页）.pdf` | 共 {lines} 行有效代码；前 30 页 + 后 30 页，每页 50 行，页眉含软件名称与版本号 |
| 用户手册 | `{SOFT}{VER}_用户手册.pdf` | 功能与操作说明，含界面截图 |
| 申请表 | 在「中国版权保护中心」官网在线填写 | 字段参考 `文案/01_上架信息.md` 中「软件著作权登记信息」 |
| 身份证明 | 申请人身份证复印件（个人）/ 营业执照（个体户、企业） | |

## 申请流程（个人）

1. 登录中国版权保护中心「著作权登记系统」，实名注册
2. 选择「计算机软件著作权登记申请」，填写申请表（软件全称：{SOFT}，版本：{VER}）
3. 上传本目录的源程序与用户手册 PDF
4. 提交后按系统提示寄送或在线签章，等待审查（官方周期约 30 个工作日，可选择第三方加急）
5. 拿到登记证书后，上传至微信小游戏后台

> 注意：软件全称与版本号要和材料页眉、申请表完全一致；开发完成日期、首次发表日期按实际填写。
''')


if __name__ == '__main__':
    n = source_pdf()
    manual_pdf()
    guide(n)
