#!/bin/bash
# 回归测试：MODE=A 无广告、B 广告可用、C 抖音录屏，三种环境各跑一遍
cd "$(dirname "$0")"
mkdir -p out
npx -y esbuild@0.23 regression.ts --bundle --platform=node --format=esm --outfile=out/regression.mjs --alias:cc=../promo/cc.ts --alias:cc/env=../promo/env.ts --log-level=warning || exit 1
code=0
for m in A B C; do MODE=$m node out/regression.mjs || code=1; done
exit $code
