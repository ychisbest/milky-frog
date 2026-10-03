#!/usr/bin/env python3
"""角色展示视频：12 只奶蛙逐个登场（跳跃 + 名字 + 初始武器 + 加成），配 BGM 与呱叫。角色数据读取自 Defs.ts。"""
import math
import os
import re
import shutil
import subprocess
from PIL import Image, ImageDraw

import make_assets as A

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = A.ROOT
TMP = os.path.join(HERE, 'out', 'showcase')
AUDIO = os.path.join(ROOT, 'assets', 'resources', 'audio')
FPS = 30
PER = 36       # 每只奶蛙 1.2 秒
W, H = 720, 1280


def characters():
    src = open(os.path.join(ROOT, 'assets', 'scripts', 'Defs.ts'), encoding='utf-8').read()
    weapons = dict(re.findall(r"id: '(\w+)', name: '([^']+)', icon: 'icon_\w+'", src))
    icons = dict(re.findall(r"id: '(\w+)', name: '[^']+', icon: '(icon_\w+)'", src))
    out = []
    for m in re.finditer(r"\{ id: '(\w+)', name: '([^']+)', title: '([^']+)', sprite: '(\w+)', weapon: '(\w+)', desc: '([^']+)'", src):
        cid, name, title, sprite, weapon, desc = m.groups()
        out.append(dict(id=cid, name=name, title=title, sprite=sprite, weapon=weapons.get(weapon, weapon), icon=icons.get(weapon), desc=desc))
    return out


def background():
    bg = A.night_sky(W, H, 0.7, seed=3)
    A.paste_center(bg, A.sprite('moon', 6), W / 2, H * 0.33)
    A.hills(bg, H * 0.7, 2.6)
    return bg


def main():
    chars = characters()
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    bg = background()
    lg = A.logo('奶蛙割草', 84, '12 只奶蛙 · 各有绝活', 30)
    idx = 0
    for ci, c in enumerate(chars):
        frames = [A.sprite(f"{c['sprite']}_{f}", 5.6) for f in range(3)]
        for t in range(PER):
            im = bg.copy()
            A.paste_center(im, lg, W / 2, 130)
            # 登场：从右侧滑入
            slide = max(0.0, 1 - t / 8)
            cx = W / 2 + slide * W * 0.8
            hop = abs(math.sin(t / PER * math.pi * 2)) * 60 if t > 8 else 0
            fr = frames[2 if hop > 20 else (t // 6) % 2]
            sh = A.sprite('shadow', 9)
            A.paste_center(im, sh, cx, H * 0.7)
            im.alpha_composite(fr, (int(cx - fr.width / 2), int(H * 0.7 - fr.height + 10 - hop)))
            d = ImageDraw.Draw(im)
            # 信息卡
            card_y = int(H * 0.75)
            d.rounded_rectangle([60, card_y, W - 60, card_y + 250], 26, fill=(36, 24, 60, 235), outline=(214, 170, 70), width=5)
            A.text_center(d, W / 2, card_y + 18, f"{c['name']}", 64, A.YELLOW, A.DARK, 6)
            A.text_center(d, W / 2, card_y + 104, c['title'], 32, (200, 190, 220), A.DARK, 3)
            if c['icon']:
                ic = A.sprite(c['icon'], 3.4)
                im.alpha_composite(ic, (W // 2 - 150, card_y + 156))
            d.text((W // 2 - 90, card_y + 160), '初始武器：' + c['weapon'], font=A.font(30), fill=(255, 255, 255), stroke_width=3, stroke_fill=A.DARK)
            A.text_center(d, W / 2, card_y + 206, c['desc'], 28, (130, 240, 140), A.DARK, 3)
            A.text_center(d, W / 2, H - 70, f'{ci + 1} / {len(chars)}', 26, (180, 170, 200), A.DARK, 2)
            im.convert('RGB').save(os.path.join(TMP, f'{idx:05d}.png'))
            idx += 1
    # 全员合影 + CTA
    group = Image.open(os.path.join(ROOT, 'marketing', '宣传图', '主视觉_竖版_抖音封面_1080x1920.png')).convert('RGBA').resize((W, H), Image.LANCZOS)
    for k in range(60):
        im = group.copy()
        d = ImageDraw.Draw(im)
        A.text_center(d, W / 2, H * 0.89, '你 pick 哪一只？', 56, A.YELLOW, A.DARK, 6)
        A.text_center(d, W / 2, H * 0.95, '微信搜索「奶蛙割草」', 40, (255, 255, 255), A.DARK, 4)
        im.convert('RGB').save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    dur = idx / FPS
    out_dir = os.path.join(ROOT, 'marketing', '视频')
    out = os.path.join(out_dir, f'角色展示_{round(dur)}s.mp4')
    inputs = ['-stream_loop', '-1', '-i', os.path.join(AUDIO, 'bgm_menu.mp3')]
    filters = [f'[1:a]atrim=0:{dur:.2f},afade=t=out:st={dur - 1.2:.2f}:d=1.2,volume=0.8[bgm]']
    labels = ['[bgm]']
    for k in range(len(chars)):
        inputs += ['-i', os.path.join(AUDIO, 'croak.mp3')]
        ms = int((k * PER + 6) / FPS * 1000)
        filters.append(f'[{k + 2}:a]adelay={ms}|{ms}[s{k}]')
        labels.append(f'[s{k}]')
    filters.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.95[a]')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(TMP, '%05d.png')] + inputs + [
        '-filter_complex', ';'.join(filters), '-map', '0:v', '-map', '[a]', '-vf', 'scale=1080:1920:flags=lanczos',
        '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', f'{dur:.2f}', out], check=True)
    shutil.copy(os.path.join(TMP, f'{PER // 2:05d}.png'), os.path.join(out_dir, f'角色展示_{round(dur)}s_封面.png'))
    print(f'  {os.path.basename(out)}  {dur:.1f}s  {os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
