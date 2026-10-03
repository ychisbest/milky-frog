#!/usr/bin/env python3
"""新手教程视频（30 秒上手）：真实首局引导录屏 + 片头字幕 + 快进提示 + 结尾 CTA。需先运行 run.sh tutorial。"""
import json
import os
import re
import shutil
import subprocess
from PIL import Image

import make_assets as A
import make_video as V

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'out', 'tutorial_png')
RAW = os.path.join(HERE, 'out', 'tutorial')
TMP = os.path.join(HERE, 'out', 'tutorial_final')
FPS = 30
W, H = 1080, 1920


def game_seconds(name):
    """从采集 JSON 中读出 HUD 计时器（用于找到快进点）"""
    items = json.load(open(os.path.join(RAW, name.replace('.png', '.json'))))['items']
    for it in items:
        if it['t'] == 'l' and re.fullmatch(r'\d\d:\d\d', it['s']):
            m, s = it['s'].split(':')
            return int(m) * 60 + int(s)
    return 0


def main():
    fs = sorted(f for f in os.listdir(SRC) if f.endswith('.png'))
    secs = [game_seconds(f) for f in fs]
    skip = next((i for i in range(1, len(secs)) if secs[i] - secs[i - 1] > 5), -1)
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    idx = 0
    for i, f in enumerate(fs):
        im = Image.open(os.path.join(SRC, f)).convert('RGBA').resize((W, H), Image.NEAREST)
        if i < 100:
            cap = V.caption_layer(W, '30 秒学会玩奶蛙割草', '单手拖动 · 自动攻击', i)
            im.alpha_composite(cap, ((W - cap.width) // 2, int(H * 0.585)))
        if skip > 0 and skip <= i < skip + 40:
            cap = V.caption_layer(W, '>> 快进到 Boss 来临', '前期多升级 多拿武器', i - skip)
            im.alpha_composite(cap, ((W - cap.width) // 2, int(H * 0.585)))
        im.convert('RGB').save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    for k in range(V.END_FRAMES):
        V.end_card(W, H, k).save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    dur = idx / FPS
    out = os.path.join(A.MK, '视频', f'新手教程_30秒上手_{round(dur)}s.mp4')
    au = V.AUDIO
    lv = int(fs.index(next(f for f in fs if 'LV 2' in open(os.path.join(RAW, f.replace('.png', '.json')), encoding='utf-8').read())) / FPS * 1000)
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(TMP, '%05d.png'),
           '-stream_loop', '-1', '-i', os.path.join(au, 'bgm_battle.mp3'),
           '-i', os.path.join(au, 'start.mp3'), '-i', os.path.join(au, 'levelup.mp3'), '-i', os.path.join(au, 'warning.mp3') if os.path.exists(os.path.join(au, 'warning.mp3')) else os.path.join(au, 'boss.mp3'),
           '-filter_complex',
           f'[1:a]atrim=0:{dur:.2f},afade=t=out:st={dur - 1.5:.2f}:d=1.5,volume=0.6[bgm];'
           f'[2:a]adelay=100|100[s0];[3:a]adelay={lv}|{lv}[s1];[4:a]adelay={int(max(0, skip) / FPS * 1000) + 2500}|{int(max(0, skip) / FPS * 1000) + 2500}[s2];'
           '[bgm][s0][s1][s2]amix=inputs=4:normalize=0,alimiter=limit=0.95[a]',
           '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-crf', '26', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
           '-movflags', '+faststart', '-t', f'{dur:.2f}', out]
    subprocess.run(cmd, check=True)
    shutil.copy(os.path.join(TMP, '00040.png'), out.replace('.mp4', '_封面.png'))
    print(f'  {os.path.basename(out)}  {dur:.1f}s  {os.path.getsize(out) / 1e6:.1f} MB  (快进点 {skip})')


if __name__ == '__main__':
    main()
