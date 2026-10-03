#!/usr/bin/env python3
"""新武器短视频：棱镜激光 + 荆棘地刺 → 进化。需先运行 run.sh newweap。"""
import os
import make_video as V

HERE = os.path.dirname(os.path.abspath(__file__))
V.SRC = os.path.join(HERE, 'out', 'newweap_png')
n = len([f for f in os.listdir(V.SRC) if f.endswith('.png')])
V.build('短视频_新武器_激光与地刺', {
    'segments': [(0, n - 1)],
    'captions': [(0, 70, '新武器：棱镜激光', '一道光束 贯穿全场'), (75, 145, '新武器：荆棘地刺', '敌人脚下 依次刺出'), (152, 240, '进化！虹光棱镜 + 生命荆棘', '三道彩虹光束 · 回复生命尖刺')],
    'bgm': 'bgm_battle',
    'sfx': [(8, 'laser'), (152, 'evolve')],
})
