#!/bin/bash
# 构建微信小游戏包 → build/wechatgame（支持 macOS 与 WSL 下调用 Cocos Creator 命令行）
# 用法：tools/build-wechat.sh [AppID]     不传 AppID 则使用 build-wechat.json 中的设置
# 注意：构建前请关闭正在打开本项目的 Cocos Creator 编辑器
set -e
cd "$(dirname "$0")/.."
if [ -n "$1" ]; then
  python3 - "$1" <<'PY'
import json, sys
p = 'build-wechat.json'
d = json.load(open(p, encoding='utf-8'))
d['packages']['wechatgame']['appid'] = sys.argv[1]
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
PY
fi
mkdir -p build
# 上线前检查：调试开关必须关闭
grep -q "debugFake: false" assets/scripts/AdConfig.ts || { echo "❌ AdConfig.debugFake 不是 false"; exit 1; }
grep -q "force: false }" assets/scripts/Defs.ts || { echo "❌ Defs.ts 中 EVENT.force 不是 false"; exit 1; }
if [ "$(uname -s)" = "Darwin" ]; then
  CREATOR="${COCOS_CREATOR_BIN:-/Applications/CocosCreator.app/Contents/MacOS/CocosCreator}"
  PROJ_PATH="$PWD"
  CFG_PATH="$PWD/build-wechat.json"
else
  CREATOR=/mnt/c/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe
  PROJ_PATH=$(wslpath -w "$PWD")
  CFG_PATH="$PROJ_PATH\\build-wechat.json"
fi
set +e
env -u ELECTRON_RUN_AS_NODE "$CREATOR" --project "$PROJ_PATH" --build "configPath=$CFG_PATH" > build/build-wechat.log 2>&1
code=$?
set -e
# Cocos Creator 命令行构建成功的退出码是 36
if [ $code -ne 36 ] && [ $code -ne 0 ]; then echo "❌ 构建失败（退出码 $code），日志：build/build-wechat.log"; exit 1; fi
python3 - <<'PATCH'
import re
from pathlib import Path
pc = Path('build/wechatgame/project.config.json')
pc.write_text(re.sub(r'"projectname"\s*:\s*"[^"]*"', '"projectname":"奶蛙割草"', pc.read_text(encoding='utf-8')), encoding='utf-8')
fs = Path('build/wechatgame/first-screen.js')
fs_txt = fs.read_text(encoding='utf-8')
fs_new, n = re.subn(r'^let useLogo = true;', 'let useLogo = false;', fs_txt, flags=re.M)
assert n > 0 or 'let useLogo = false;' in fs_txt, '❌ 未能关闭 first-screen.js 中的 logo'
fs.write_text(fs_new, encoding='utf-8')
PATCH
grep -q "^let useLogo = false;" build/wechatgame/first-screen.js || { echo "❌ 未能关闭 first-screen.js 中的 logo"; exit 1; }
rm -f build/wechatgame/logo.png build/wechatgame/slogan.png
node tools/wechat-postbuild.mjs
python3 - <<'CHECK'
import json, re
from pathlib import Path
root = Path('build/wechatgame')
configs = list(root.glob('assets/main/config*.json'))
assert configs and 'db://assets/scenes/Main.scene' in json.loads(configs[0].read_text())['scenes'], '构建包缺少初始场景'
scripts = '\n'.join(p.read_text() for p in root.glob('assets/main/*.js'))
ad_id = re.search(r"rewarded: '([^']+)'", Path('assets/scripts/AdConfig.ts').read_text()).group(1)
assert ad_id in scripts and 'level_bonus' in scripts and 'character' in scripts, '构建包缺少最新广告或游戏代码'
print('✔ 初始场景、激励视频 ID 和新增广告入口已进入构建包')
CHECK
echo "✅ 构建完成：build/wechatgame（$(du -sh build/wechatgame | cut -f1)，主包上限 4MB）"
grep -o '"appid":"[^"]*"' build/wechatgame/project.config.json
