#!/bin/bash
# 一键重新生成 marketing/ 下全部图片与视频（游戏美术或文案改动后运行）
set -e
cd "$(dirname "$0")"
for s in shots video compare tutorial newweap newmap xmasvid beian; do ./run.sh $s; done
rm -f ../../marketing/商店截图/*.png ../../marketing/视频/*.mp4 ../../marketing/视频/*_封面.png ../../marketing/动图/*.gif
python3 make_assets.py
python3 make_video.py
python3 make_landscape.py
python3 make_tutorial.py
python3 make_compare.py
python3 make_showcase.py
python3 make_newweap.py
python3 make_newmap.py
python3 make_xmasvid.py
python3 make_guides.py
python3 make_ads.py
python3 make_bilibili.py
python3 make_cny.py
python3 make_xmas.py
python3 make_softcopyright.py
# 带时长的视频文件名（与 marketing/README.md 一致）
cd ../../marketing/视频
for pair in "短视频_新武器_激光与地刺:短视频_新武器_14s" "短视频_新地图_毒雾沼泽:短视频_新地图_13s" "短视频_圣诞雪怪王:短视频_圣诞雪怪王_15s"; do
  a=${pair%%:*}; b=${pair##*:}
  [ -f "$a.mp4" ] && mv "$a.mp4" "$b.mp4" && mv "${a}_封面.png" "${b}_封面.png"
done
echo "全部素材已重新生成"
