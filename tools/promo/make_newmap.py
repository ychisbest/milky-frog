#!/usr/bin/env python3
"""新地图短视频：毒雾沼泽。需先运行 run.sh newmap。"""
import os
import make_video as V

HERE = os.path.dirname(os.path.abspath(__file__))
V.SRC = os.path.join(HERE, 'out', 'newmap_png')
n = len([f for f in os.listdir(V.SRC) if f.endswith('.png')])
V.build('短视频_新地图_毒雾沼泽', {
    'segments': [(0, n - 1)],
    'captions': [(0, 100, '新地图：毒雾沼泽', '火山之后 最终的考验'), (110, 230, '毒泡喷发 留下毒云', '把怪物引进去！'), (240, n - 1, '怪物生命 +70%', '金币 +90%')],
    'bgm': 'bgm_battle',
    'sfx': [(40, 'splash'), (130, 'splash')],
})
