// 微信小游戏构建后处理：确保开放数据域（好友排行榜）就位。每次「构建发布」之后运行一次：
//   node tools/wechat-postbuild.mjs [构建目录，默认 build/wechatgame]
// 1. build-templates/wechatgame/openDataContext 未被复制时补上
// 2. game.json 登记 "openDataContext": "openDataContext"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'build/wechatgame'));
const gameJson = path.join(out, 'game.json');
if (!fs.existsSync(gameJson)) {
    console.error(`找不到 ${gameJson}，请先在 Cocos Creator 中构建微信小游戏`);
    process.exit(1);
}

const src = path.join(root, 'build-templates/wechatgame/openDataContext');
const dst = path.join(out, 'openDataContext');
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));

const cfg = JSON.parse(fs.readFileSync(gameJson, 'utf8'));
cfg.openDataContext = 'openDataContext';
fs.writeFileSync(gameJson, JSON.stringify(cfg, null, 4) + '\n');
console.log(`✔ 开放数据域已就位：${path.relative(root, dst)}，game.json 已登记 openDataContext`);
