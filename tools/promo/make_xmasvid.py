#!/usr/bin/env python3
"""圣诞活动短视频：雪夜小镇 + 雪怪王。需先运行 run.sh xmasvid。"""
import os
import make_video as V

HERE = os.path.dirname(os.path.abspath(__file__))
V.SRC = os.path.join(HERE, 'out', 'xmasvid_png')
n = len([f for f in os.listdir(V.SRC) if f.endswith('.png')])
V.build('短视频_圣诞雪怪王', {
    'segments': [(0, n - 1)],
    'captions': [(0, 90, '圣诞限定 雪夜小镇', '礼物炸弹从天而降'), (100, 250, '雪怪王来了！', '雪球连射 · 冰锥阵 · 冲锋'), (260, n - 1, '击败它 解锁圣诞蛙', '12.18 – 1.3 限时活动')],
    'bgm': 'bgm_boss',
    'sfx': [(100, 'roar'), (260, 'achieve')],
})
