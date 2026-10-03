#!/usr/bin/env python3
"""对比短视频：左「开局 1 级」vs 右「14 分钟全进化」，分屏 + 标题 + 结尾 CTA（脚本 4）。需先运行 run.sh compare。"""
import os
import shutil
import subprocess
from PIL import Image, ImageDraw

import make_assets as A
import make_video as V

HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(HERE, 'out', 'compare_final')
FPS = 30
W, H = 1080, 1920


def main():
    a_dir, b_dir = os.path.join(HERE, 'out', 'compare_a_png'), os.path.join(HERE, 'out', 'compare_b_png')
    fa, fb = sorted(os.listdir(a_dir)), sorted(os.listdir(b_dir))
    n = min(len(fa), len(fb))
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    bg = A.night_sky(W, H, 1.0, seed=11)
    idx = 0
    for i in range(n):
        im = bg.copy()
        la = Image.open(os.path.join(a_dir, fa[i])).convert('RGB')
        lb = Image.open(os.path.join(b_dir, fb[i])).convert('RGB')
        fw = W // 2 - 12
        fh = int(la.height * fw / la.width)
        y0 = 360
        for k, src in enumerate((la, lb)):
            x = 8 + k * (W // 2)
            im.paste(src.resize((fw, fh), Image.LANCZOS), (x, y0))
        d = ImageDraw.Draw(im)
        d.rectangle([W // 2 - 4, y0, W // 2 + 4, y0 + fh], fill=(214, 170, 70))
        A.text_center(d, W / 2, 70, '1 分钟的奶蛙', 78, (255, 255, 255), A.DARK, 7)
        A.text_center(d, W / 2, 175, 'VS 14 分钟的奶蛙', 78, A.YELLOW, A.DARK, 7)
        A.text_center(d, W / 4, y0 + fh + 24, 'LV 1 · 一根皮鞭', 40, (255, 255, 255), A.DARK, 4)
        A.text_center(d, W * 3 / 4, y0 + fh + 24, 'LV 60 · 6 把进化武器', 40, A.YELLOW, A.DARK, 4)
        if i >= 180:
            cap = V.caption_layer(W, '这就是进化的力量', '差距有多大？', i - 180)
            im.alpha_composite(cap, ((W - cap.width) // 2, H - 360))
        im.convert('RGB').save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    for k in range(V.END_FRAMES):
        V.end_card(W, H, k).save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    dur = idx / FPS
    out = os.path.join(A.MK, '视频', f'短视频_进化对比_{round(dur)}s.mp4')
    audio = V.AUDIO
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(TMP, '%05d.png'),
           '-stream_loop', '-1', '-i', os.path.join(audio, 'bgm_battle.mp3'),
           '-i', os.path.join(audio, 'croak.mp3'), '-i', os.path.join(audio, 'evolve.mp3'), '-i', os.path.join(audio, 'achieve.mp3'),
           '-filter_complex',
           f'[1:a]atrim=0:{dur:.2f},afade=t=out:st={dur - 1.5:.2f}:d=1.5,volume=0.75[bgm];'
           f'[2:a]adelay=200|200[s0];[3:a]adelay=6000|6000,volume=1.3[s1];[4:a]adelay={int(n / FPS * 1000)}|{int(n / FPS * 1000)}[s2];'
           '[bgm][s0][s1][s2]amix=inputs=4:normalize=0,alimiter=limit=0.95[a]',
           '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
           '-movflags', '+faststart', '-t', f'{dur:.2f}', out]
    subprocess.run(cmd, check=True)
    shutil.copy(os.path.join(TMP, '00200.png'), out.replace('.mp4', '_封面.png'))
    print(f'  {os.path.basename(out)}  {dur:.1f}s  {os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
