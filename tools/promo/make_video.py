#!/usr/bin/env python3
"""
把 out/video_png 的游戏帧剪辑成多条宣传视频：分段字幕（弹出动画）+ 片尾 CTA + BGM 与音效，输出 1080×1920 MP4，
另导出若干 GIF（公众号 / 社群用）。
源帧编号与 capture.ts 中 SCENE=video 的脚本对应：
  0-47 标题  48-227 割草  228-247 升级  248-337 割草  338-487 Boss  488-667 红月  668-742 胜利
"""
import math
import os
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(HERE, 'out', 'video_png')
TMP = os.path.join(HERE, 'out', 'video_final')
AUDIO = os.path.join(ROOT, 'assets', 'resources', 'audio')
OUT_DIR = os.path.join(ROOT, 'marketing', '视频')
GIF_DIR = os.path.join(ROOT, 'marketing', '动图')
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FPS = 30
YELLOW = (255, 236, 120)
DARK = (24, 8, 22)

# 每条视频：片段（源帧区间）、字幕（以输出帧计）、音效（输出帧, 文件）、BGM
VIDEOS = {
    '宣传片_竖版_27s': {
        'segments': [(0, 742)],
        'captions': [(0, 47, '这只胖奶蛙', '要在红月下割草 15 分钟？'), (48, 227, '满屏怪物', '一路割爆！'),
                     (228, 247, '16 种武器', '自由搭配 · 随机进化'), (248, 337, '连击停不下来', '爽感拉满！'),
                     (338, 487, '7 大 Boss 来袭！', '躲激光 · 破弹幕'), (488, 667, '红月降临', '最后的怪物狂潮'),
                     (668, 742, '你能活过', '15 分钟吗？')],
        'sfx': [(18, 'croak'), (60, 'start'), (228, 'levelup'), (338, 'roar'), (488, 'roar'), (668, 'win')],
        'bgm': 'bgm_battle',
    },
    '短视频_满屏割草_14s': {
        'segments': [(48, 227), (248, 337), (668, 742)],
        'captions': [(0, 60, '一只奶蛙', 'VS 一万只怪物'), (61, 179, '割！割！割！', '连击停不下来'),
                     (180, 269, '越割越爽', '压力全没了'), (270, 344, '你能活过', '15 分钟吗？')],
        'sfx': [(0, 'croak'), (270, 'win')],
        'bgm': 'bgm_battle',
    },
    '短视频_Boss红月_13s': {
        'segments': [(338, 487), (488, 667)],
        'captions': [(0, 75, '这个激光', '你躲得过去吗？'), (76, 149, '水晶魔眼', '扫射全屏！'),
                     (150, 239, '13:00', '红月降临…'), (240, 329, '最后两分钟', '怪物狂潮！')],
        'sfx': [(0, 'roar'), (150, 'roar')],
        'bgm': 'bgm_boss',
    },
}
END_FRAMES = 75
GIFS = [('割草', 60, 150), ('Boss激光', 400, 487), ('红月狂潮', 560, 650), ('奶蛙跳跳', 10, 47)]


def font(sz):
    return ImageFont.truetype(FONT, int(sz))


def ease_back(k):
    k = min(1.0, max(0.0, k))
    return 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2


def caption_layer(w, title, sub, t):
    scale = max(0.05, ease_back(t / 8))
    big, small = 84, 46
    layer = Image.new('RGBA', (w, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([40, 20, w - 40, 240], 28, fill=(20, 8, 26, 190))
    for txt, sz, y, col in ((title, big, 36, YELLOW), (sub, small, 150, (255, 255, 255))):
        f = font(sz)
        tw = d.textlength(txt, font=f)
        d.text(((w - tw) / 2, y), txt, font=f, fill=col, stroke_width=max(3, sz // 10), stroke_fill=DARK)
    if scale != 1:
        layer = layer.resize((max(1, int(layer.width * scale)), max(1, int(layer.height * scale))), Image.LANCZOS)
    return layer


_kv = None


def end_card(w, h, k):
    global _kv
    if _kv is None:
        _kv = Image.open(os.path.join(ROOT, 'marketing', '宣传图', '主视觉_竖版_抖音封面_1080x1920.png')).convert('RGBA').resize((w, h), Image.LANCZOS)
    kv = _kv.copy()
    d = ImageDraw.Draw(kv)
    pulse = 1 + 0.04 * math.sin(k * 0.4)
    f = font(int(64 * pulse))
    txt = '微信搜索「奶蛙割草」'
    tw = d.textlength(txt, font=f)
    y = int(h * 0.9)
    d.rounded_rectangle([w / 2 - tw / 2 - 40, y - 20, w / 2 + tw / 2 + 40, y + 96], 48, fill=(214, 60, 60, 240))
    d.text(((w - tw) / 2, y), txt, font=f, fill=(255, 255, 255), stroke_width=4, stroke_fill=DARK)
    return kv.convert('RGB')


def build(name, spec):
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    src = sorted(f for f in os.listdir(SRC) if f.endswith('.png'))
    idx = 0
    w = h = None
    for a, b in spec['segments']:
        for i in range(a, min(b, len(src) - 1) + 1):
            im = Image.open(os.path.join(SRC, src[i])).convert('RGBA')
            w, h = im.size
            for ca, cb, title, sub in spec['captions']:
                if ca <= idx <= cb:
                    cap = caption_layer(w, title, sub, idx - ca)
                    im.alpha_composite(cap, ((w - cap.width) // 2, int(h * 0.62) - cap.height // 2))
            im.convert('RGB').save(os.path.join(TMP, f'{idx:05d}.png'))
            idx += 1
    for k in range(END_FRAMES):
        end_card(w, h, k).save(os.path.join(TMP, f'{idx:05d}.png'))
        idx += 1
    dur = idx / FPS
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, name + '.mp4')
    inputs = ['-stream_loop', '-1', '-i', os.path.join(AUDIO, spec['bgm'] + '.mp3')]
    filters = [f'[1:a]atrim=0:{dur:.2f},afade=t=in:d=0.4,afade=t=out:st={dur - 1.5:.2f}:d=1.5,volume=0.75[bgm]']
    labels = ['[bgm]']
    for k, (fr, snd) in enumerate(spec['sfx'] + [(idx - END_FRAMES, 'achieve')]):
        inputs += ['-i', os.path.join(AUDIO, snd + '.mp3')]
        ms = int(fr / FPS * 1000)
        filters.append(f'[{k + 2}:a]adelay={ms}|{ms},volume=1.2[s{k}]')
        labels.append(f'[s{k}]')
    filters.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0,alimiter=limit=0.95[a]')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(TMP, '%05d.png')] + inputs + [
        '-filter_complex', ';'.join(filters), '-map', '0:v', '-map', '[a]',
        '-vf', 'scale=1080:1920:flags=neighbor', '-c:v', 'libx264', '-crf', '22', '-preset', 'medium', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', f'{dur:.2f}', out]
    subprocess.run(cmd, check=True)
    # 封面：取第一个字幕完全弹出后的帧
    shutil.copy(os.path.join(TMP, f'{min(12, idx - 1):05d}.png'), os.path.join(OUT_DIR, name + '_封面.png'))
    print(f'  {name}.mp4  {dur:.1f}s  {os.path.getsize(out) / 1e6:.1f} MB')


def gifs():
    os.makedirs(GIF_DIR, exist_ok=True)
    src = sorted(f for f in os.listdir(SRC) if f.endswith('.png'))
    for name, a, b in GIFS:
        pattern = os.path.join(TMP, 'g%05d.png')
        for f in os.listdir(TMP):
            if f.startswith('g'):
                os.remove(os.path.join(TMP, f))
        for k, i in enumerate(range(a, b + 1, 2)):
            shutil.copy(os.path.join(SRC, src[i]), pattern % k)
        out = os.path.join(GIF_DIR, name + '.gif')
        vf = 'fps=15,scale=360:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=none'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '15', '-i', pattern, '-vf', vf, '-loop', '0', out], check=True)
        print(f'  {name}.gif  {os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    for name, spec in VIDEOS.items():
        build(name, spec)
    gifs()
