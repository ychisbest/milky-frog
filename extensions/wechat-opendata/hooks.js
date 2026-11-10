"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

// 构建发布会按勾选重写 game.json，空的 openDataContext 会被删掉。
// 这里在构建结束后跑 tools/wechat-postbuild.mjs，把开放数据域登记回去。
exports.onAfterBuild = async function (options, result) {
    if (!options || options.platform !== "wechatgame") return;
    const root = path.resolve(__dirname, "../..");
    const script = path.join(root, "tools/wechat-postbuild.mjs");
    const dest = result && result.dest;
    const r = spawnSync(process.execPath, dest ? [script, dest] : [script], { encoding: "utf8" });
    const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
    if (r.status !== 0) console.error("[wechat-opendata] " + (out || "postbuild failed"));
    else if (out) console.log(out);
};
