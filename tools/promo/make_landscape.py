#!/usr/bin/env python3
"""横版宣传片 1920×1080（B 站 / 西瓜 / 横版信息流）：左侧竖屏实机画面，右侧 Logo + 逐条卖点 + 引导搜索。
复用 run.sh video 采集的实机帧（out/video_png）与竖版宣传片的分段与音效。"""
import os
import shutil
import subprocess
from PIL import Image, ImageDraw

import make_assets as A
import make_video as V

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'out', 'video_png')
TMP = os.path.join(HERE, 'out', 'landscape_final')
FPS = 30
W, H = 1920, 1080
# 与竖版宣传片的分段对应：(起始帧, 卖点标题, 小字)
POINTS = [
    (0, '胖奶蛙割草', '竖屏单手 · 自动攻击'),
    (48, '满屏怪物 一路割爆', '连击停不下来'),
    (228, '16 种武器 × 16 种进化', '每一局构筑都不一样'),
    (338, '7 大 Boss 技能各异', '红圈红线 提前预警'),
    (488, '13:00 红月降临', '最后两分钟 怪物狂潮'),
    (668, '你能活过 15 分钟吗？', '12 只奶蛙 · 4 张地图 · 每日挑战'),
]


def side_panel():
    bg = A.night_sky(W, H, 0.82, seed=21)
    A.paste_center(bg, A.sprite('moon', 7), W * 0.74, H * 0.42)
    A.hills(bg, H * 0.82, 3)
    return bg


def main():
    fs = sorted(f for f in os.listdir(SRC) if f.endswith('.png'))
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    bg = side_panel()
    lg = A.logo('奶蛙割草', 150, 'MILKY FROG SURVIVORS', 36)
    gh = H - 60
    idx = 0
    for i, f in enumerate(fs):
        im = bg.copy()
        g = Image.open(os.path.join(SRC, f)).convert('RGBA')
        gw = int(g.width * gh / g.height)
        g = g.resize((gw, gh), Image.LANCZOS)
        x0 = 140
        frame = A.rounded(g, 24)
        ImageDraw.Draw(im).rounded_rectangle([x0 - 8, 22, x0 + gw + 8, 38 + gh], 30, fill=(214, 170, 70, 255))
        im.alpha_composite(frame, (x0, 30))
        A.paste_center(im, lg, W * 0.66, 190)
        d = ImageDraw.Draw(im)
        cur = max(k for k, p in enumerate(POINTS) if p[0] <= i)
        t = i - POINTS[cur][0]
        cap = V.caption_layer(1000, POINTS[cur][1], POINTS[cur][2], t)
        im.alpha_composite(cap, (int(W * 0.66 - cap.width / 2), int(H * 0.5 - cap.height / 2)))
        # 卖点进度点
        for k in range(len(POINTS)):
            cx = W * 0.66 + (k - (len(POINTS) - 1) / 2) * 36
            d.ellipse([cx - 9, H * 0.66 - 9, cx + 9, H * 0.66 + 9], fill=A.YELLOW if k <= cur else (90, 70, 110))
        A.text_center(d, W * 0.66, H - 150, '微信搜索「奶蛙割草」  免下载 即点即玩', 46, (255, 255, 255), A.DARK, 5)
        im.convert('RGB').save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    # 结尾：横版主视觉 + 弹出的搜索引导
    kv = Image.open(os.path.join(A.MK, '宣传图', '主视觉_横版_1920x1080.png')).convert('RGBA')
    for k in range(V.END_FRAMES):
        im = kv.copy()
        layer = Image.new('RGBA', (900, 110), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.rounded_rectangle([0, 0, 899, 109], 55, fill=(214, 50, 60, 255), outline=(255, 230, 150, 255), width=5)
        A.text_center(ld, 450, 18, '微信搜索「奶蛙割草」', 60, (255, 255, 255), A.DARK, 5)
        sc = max(0.05, V.ease_back(k / 10))
        layer = layer.resize((max(1, int(900 * sc)), max(1, int(110 * sc))), Image.LANCZOS)
        im.alpha_composite(layer, (int(W / 2 - layer.width / 2), int(H * 0.885 - layer.height / 2)))
        im.convert('RGB').save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    dur = idx / FPS
    out = os.path.join(A.MK, '视频', f'宣传片_横版_{round(dur)}s.mp4')
    spec = V.VIDEOS['宣传片_竖版_27s']
    inputs = ['-stream_loop', '-1', '-i', os.path.join(V.AUDIO, 'bgm_battle.mp3')]
    filters = [f'[1:a]atrim=0:{dur:.2f},afade=t=in:d=0.4,afade=t=out:st={dur - 1.5:.2f}:d=1.5,volume=0.75[bgm]']
    labels = ['[bgm]']
    for k, (fr, snd) in enumerate(spec['sfx'] + [(idx - V.END_FRAMES, 'achieve')]):
        inputs += ['-i', os.path.join(V.AUDIO, snd + '.mp3')]
        ms = int(fr / FPS * 1000)
        filters.append(f'[{k + 2}:a]adelay={ms}|{ms},volume=1.2[s{k}]')
        labels.append(f'[s{k}]')
    filters.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.95[a]')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(TMP, '%05d.png')] + inputs + [
        '-filter_complex', ';'.join(filters), '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-crf', '24', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', f'{dur:.2f}', out], check=True)
    shutil.copy(os.path.join(TMP, '00260.png'), out.replace('.mp4', '_封面.png'))
    print(f'  {os.path.basename(out)}  {dur:.1f}s  {os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
