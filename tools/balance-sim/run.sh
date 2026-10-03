#!/bin/bash
# 数值验证：模拟 N 名新玩家各连续玩 R 局（含商店成长），输出胜率/死亡时间/升级节奏/金币
# 用法：tools/balance-sim/run.sh [average|novice] [玩家数=20] [局数=5]
# 依赖：node 18+，首次运行会通过 npx 下载 esbuild
cd "$(dirname "$0")"
SKILL=${1:-average}; N=${2:-20}; R=${3:-5}
mkdir -p out
npx -y esbuild@0.23 meta.ts --bundle --platform=node --format=esm --outfile=out/meta.mjs --alias:cc=./cc.ts --alias:cc/env=./env.ts --log-level=warning || exit 1
for i in $(seq 1 $N); do SKILL=$SKILL RUNS=$R EXCLUDE=$EXCLUDE LITE=$LITE NIGHTMARE=$NIGHTMARE node out/meta.mjs 2>/dev/null | tail -1 > out/${SKILL}_$i.json & done; wait
python3 - "$SKILL" "$N" <<'PY'
import json,sys,statistics as st
skill,n=sys.argv[1],int(sys.argv[2])
players=[json.load(open(f'out/{skill}_{i}.json')) for i in range(1,n+1)]
R=max(len(p) for p in players)
print(f'== {skill}: {n} 名玩家')
print('局  胜率   中位存活  中位等级  Boss击杀  首次进化  升级间隔(0-2/2-6/6-15分)  商店等级')
for r in range(R):
    rs=[p[r] for p in players if len(p)>r]
    f=lambda k:[x[k] for x in rs if x.get(k) not in (None,0)]
    md=lambda k:(round(st.median(f(k)),1) if f(k) else '-')
    print(f"{r+1:>2} {sum(x['win'] for x in rs)/len(rs)*100:5.0f}%  {md('t'):>8}s {md('lv'):>8} {md('bosses'):>8} {md('firstEvo'):>8}s   {md('gap0_2')}/{md('gap2_6')}/{md('gap6_15')}s {md('powerAfter'):>8}")
print('首胜所需局数：', [next((x['run'] for x in p if x['win']),None) for p in players])
PY
