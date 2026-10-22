// 武器 DPS 对照：每把武器（含进化）满级在 7:00 单独输出 20 秒 × 3 次，按每秒伤害排序
// 用法（在 tools/tests 目录）：npx -y esbuild@0.23 dps.ts --bundle --platform=node --format=esm --outfile=out/dps.mjs --alias:cc=../promo/cc.ts --alias:cc/env=../promo/env.ts && node out/dps.mjs
import { Node, Canvas } from 'cc';
const { Save } = await import('../../assets/scripts/Save');
const D = await import('../../assets/scripts/Defs');
const { GameRoot } = await import('../../assets/scripts/GameRoot');
const canvas = new Node('Canvas'); canvas.addComponent(Canvas);
const g: any = canvas.addComponent(GameRoot as any);
Save.data.privacyOk = true; g.onLoad();
const d = Save.data; d.tutDone = true; d.runs = 5; d.signDate = d.signShown = new Date().toDateString();
const res: [string, number][] = [];
for (const wd of D.WEAPONS) for (const evo of [false, true]) {
  let tot = 0;
  for (let k = 0; k < 3; k++) {
    g.startGame(); g.update(1/60); const B = g.battle; B.pendingBlessings = 0; B.pendingLevels = 0; g.setState('play');
    B.time = 420; B.bossIdx = 3; B.weapons = []; B.applyOption({ kind: 'weapon', wdef: wd, level: 1 });
    const w = B.weapons[0]; w.level = 8; w.recalc(); if (evo) B.evolve(w);
    for (let i = 0; i < 60 * 20; i++) { B.hp = B.stats.maxHp; g.joyX = Math.cos(i/90)*.5; g.joyY = Math.sin(i/90)*.5; g.update(1/60); if (g.state==='levelup'){B.pendingLevels=0;g.setState('play');} if (g.state==='chest'){B.pendingChests=0;g.setState('play');} }
    tot += w.damage; g.endRun(false);
  }
  res.push([(evo ? '★' : '') + wd.name, Math.round(tot / 60)]);
}
res.sort((a, b) => b[1] - a[1]);
console.log(res.map(r => r.join(' ')).join('\n'));
