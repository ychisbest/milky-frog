#!/bin/bash
# 宣传素材流水线：采集 → 渲染 → 合成
# 用法：tools/promo/run.sh [shots|video|all]
set -e
cd "$(dirname "$0")"
WHAT=${1:-all}
mkdir -p out
npx -y esbuild@0.23 capture.ts --bundle --platform=node --format=esm --outfile=out/capture.mjs --alias:cc=./cc.ts --alias:cc/env=./env.ts --log-level=warning
if [[ $WHAT == shots || $WHAT == all ]]; then
  SCENE=shots node out/capture.mjs
  python3 render.py out/shots out/shots_png --scale 1.5
fi
if [[ $WHAT == video || $WHAT == all ]]; then
  rm -rf out/video out/video_png
  SCENE=video node out/capture.mjs
  python3 render.py out/video out/video_png --scale 1
fi
if [[ $WHAT == beian ]]; then
  rm -rf out/beian out/beian_png
  SCENE=beian node out/capture.mjs
  python3 render.py out/beian out/beian_png --scale 1.5
fi
if [[ $WHAT == xmasvid ]]; then
  rm -rf out/xmasvid out/xmasvid_png
  SCENE=xmasvid node out/capture.mjs
  python3 render.py out/xmasvid out/xmasvid_png --scale 1
fi
if [[ $WHAT == newmap ]]; then
  rm -rf out/newmap out/newmap_png
  SCENE=newmap node out/capture.mjs
  python3 render.py out/newmap out/newmap_png --scale 1
fi
if [[ $WHAT == newweap ]]; then
  rm -rf out/newweap out/newweap_png
  SCENE=newweap node out/capture.mjs
  python3 render.py out/newweap out/newweap_png --scale 1
fi
if [[ $WHAT == tutorial ]]; then
  rm -rf out/tutorial out/tutorial_png
  SCENE=tutorial node out/capture.mjs
  python3 render.py out/tutorial out/tutorial_png --scale 1
fi
if [[ $WHAT == compare || $WHAT == all ]]; then
  for side in a b; do
    rm -rf out/compare_$side out/compare_${side}_png
    SCENE=compare_$side node out/capture.mjs
    python3 render.py out/compare_$side out/compare_${side}_png --scale 0.75
  done
fi
