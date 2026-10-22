import type { Battle, BulletOpts, Enemy } from './Battle';
import { Sound } from './Sound';

const TAU = Math.PI * 2;

// Boss AI 基类：冷却结束后按顺序释放技能；技能可以让 Boss 原地施法（hold）、冲刺（dash）、跳起（lift）或隐身（alpha）
export abstract class BossAI {
    speedMul = 1;
    dashVx = 0;
    dashVy = 0;
    dashT = 0;
    lift = 0;   // 跳跃高度（身体上移，期间不造成接触伤害）
    alpha = 1;  // 透明度（瞬移时淡出）
    protected cd = 2;
    protected step = 0;
    protected busy = 0;
    private tasks: { t: number; fn: () => void }[] = [];

    constructor(protected b: Battle, protected e: Enemy) {}

    get enraged() { return this.e.hp < this.e.maxHp * 0.35; }
    get touchable() { return this.lift < 10 && this.alpha > 0.5; }

    protected after(t: number, fn: () => void) { this.tasks.push({ t, fn }); }
    protected hold(t: number) { this.busy = Math.max(this.busy, t); }
    protected aim(x = this.e.x, y = this.e.y) { return Math.atan2(this.b.py - y, this.b.px - x); }
    protected dash(a: number, speed: number, t: number) {
        this.dashVx = Math.cos(a) * speed;
        this.dashVy = Math.sin(a) * speed;
        this.dashT = t;
    }
    protected ring(frame: string, n: number, speed: number, dmg: number, offset = 0, o: BulletOpts = {}) {
        for (let i = 0; i < n; i++) this.b.fireBullet(frame, this.e.x, this.e.y, offset + (i / n) * TAU, speed, dmg, o);
    }
    protected fan(frame: string, n: number, spread: number, speed: number, dmg: number, o: BulletOpts = {}) {
        const a = this.aim();
        for (let i = 0; i < n; i++) this.b.fireBullet(frame, this.e.x, this.e.y, a + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), speed, dmg, o);
    }
    // 在玩家周围一圈召唤小怪
    protected summonRing(type: string, n: number, r: number) {
        for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            this.b.summon(type, this.b.px + Math.cos(a) * r, this.b.py + Math.sin(a) * r);
        }
    }

    update(dt: number) {
        for (let i = this.tasks.length - 1; i >= 0; i--) {
            const k = this.tasks[i];
            k.t -= dt;
            if (k.t <= 0) {
                this.tasks.splice(i, 1);
                k.fn();
            }
        }
        if (this.dashT > 0) {
            this.dashT -= dt;
            if (this.dashT <= 0) this.dashVx = this.dashVy = 0;
        }
        this.onUpdate(dt);
        if (this.busy > 0) {
            this.busy -= dt;
            this.speedMul = 0;
            return;
        }
        this.speedMul = 1;
        this.cd -= dt;
        if (this.cd <= 0) {
            this.cast(this.step++);
            this.cd = this.cooldown() * (this.enraged ? 0.65 : 1);
        }
    }

    protected onUpdate(_dt: number) {}
    protected cooldown() { return 2.4; }
    protected abstract cast(step: number): void;
}

// 史莱姆王：跳跃砸地、召唤史莱姆、半血分裂
class SlimeKing extends BossAI {
    private split = false;
    private jumpT = 0;
    private jumpDur = 1;

    protected cooldown() { return 2.2; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        if (step % 3 === 2) {
            for (let i = 0; i < 4; i++) b.summon('slime', e.x + Math.cos((i / 4) * TAU) * 90, e.y + Math.sin((i / 4) * TAU) * 90);
            b.burst(e.x, e.y, 0x4fc24f, 20, 300);
            Sound.play('slam');
            this.hold(0.6);
            return;
        }
        // 跳跃砸地：落点提前标红
        const tx = b.px, ty = b.py, dur = this.enraged ? 1.0 : 1.25;
        b.warnCircle(tx, ty, 120, dur, 0x60ff60);
        this.dash(Math.atan2(ty - e.y, tx - e.x), Math.hypot(tx - e.x, ty - e.y) / dur, dur);
        this.jumpT = this.jumpDur = dur;
        this.hold(dur + 0.5);
        this.after(dur, () => {
            b.explode(e.x, e.y, 120, 10, 0x4fc24f);
            this.ring('shot_slimeball', 8, 150, 4, Math.random());
            Sound.play('slam');
        });
    }

    protected onUpdate(dt: number) {
        if (this.jumpT > 0) {
            this.jumpT -= dt;
            this.lift = Math.sin((1 - Math.max(0, this.jumpT) / this.jumpDur) * Math.PI) * 160;
        } else this.lift = 0;
        if (!this.split && this.e.hp < this.e.maxHp * 0.5) {
            this.split = true;
            this.ring('shot_slimeball', 12, 170, 4);
            for (let i = 0; i < 5; i++) this.b.summon('slime', this.e.x + Math.cos((i / 5) * TAU) * 70, this.e.y + Math.sin((i / 5) * TAU) * 70);
            this.b.banner('史莱姆王 分裂了!');
        }
    }
}

// 骷髅将军：骨刺环、预警冲锋、召唤骷髅
class BoneLord extends BossAI {
    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0:
            case 2: {
                const o = { orient: true };
                this.ring('shot_bone', 10, 190, 6, 0, o);
                this.after(0.45, () => this.ring('shot_bone', 10, 190, 6, Math.PI / 10, o));
                if (this.enraged) this.after(0.9, () => this.ring('shot_bone', 14, 220, 6, 0, o));
                Sound.play('eshot');
                this.hold(1.0);
                break;
            }
            case 1: {
                const a = this.aim();
                b.warnLine(e.x, e.y, a, 560, 70, 1.0);
                this.hold(1.8);
                this.after(1.0, () => {
                    this.dash(a, 760, 0.7);
                    Sound.play('dash');
                });
                break;
            }
            case 3:
                this.summonRing('skeleton', this.enraged ? 6 : 4, 280);
                b.burst(e.x, e.y, 0xeee8d4, 16, 260);
                this.hold(0.5);
                break;
        }
    }

    protected onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y - 40, 0x9a9080, 1, 80);
    }
}

// 吸血鬼伯爵：血弹扇射、瞬移 + 血环、蝙蝠风暴
class Vampire extends BossAI {
    private fadeOut = 0;
    private fadeIn = 0;

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0:
            case 2: {
                const n = this.enraged ? 4 : 3;
                for (let k = 0; k < n; k++) this.after(k * 0.3, () => { this.fan('shot_blood', 4, 0.7, 210, 7); Sound.play('eshot'); });
                this.hold(0.3 * n + 0.3);
                break;
            }
            case 1:
                this.fadeOut = 0.35;
                this.hold(1.0);
                this.after(0.35, () => {
                    const a = Math.random() * TAU;
                    e.x = b.px + Math.cos(a) * 220;
                    e.y = b.py + Math.sin(a) * 220;
                    this.fadeIn = 0.35;
                    b.burst(e.x, e.y, 0xa01828, 18, 260);
                    Sound.play('teleport');
                });
                this.after(0.7, () => { this.ring('shot_blood', 12, 190, 7); Sound.play('eshot'); });
                break;
            case 3:
                this.summonRing('bat', 10, 380);
                b.banner('蝙蝠风暴!');
                this.hold(0.5);
                break;
        }
    }

    protected onUpdate(dt: number) {
        if (this.fadeOut > 0) {
            this.fadeOut -= dt;
            this.alpha = Math.max(0, this.fadeOut / 0.35);
        } else if (this.fadeIn > 0) {
            this.fadeIn -= dt;
            this.alpha = 1 - Math.max(0, this.fadeIn) / 0.35;
        } else this.alpha = 1;
    }
}

// 冰霜巫妖：冰霜螺旋弹幕、冰锥阵、减速冰域
class Lich extends BossAI {
    protected cooldown() { return 2.6; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0: {
                const arms = this.enraged ? 4 : 3;
                this.hold(3.2);
                for (let k = 0; k < 30; k++) {
                    this.after(k * 0.1, () => {
                        const th = k * 0.28;
                        for (let j = 0; j < arms; j++) b.fireBullet('shot_ice', e.x, e.y, th + (j * TAU) / arms, 160, 6, { orient: true });
                        if (k % 3 === 0) Sound.play('eshot');
                    });
                }
                break;
            }
            case 1:
            case 3: {
                const n = this.enraged ? 8 : 6;
                for (let i = 0; i < n; i++) {
                    const r = i === 0 ? 0 : 60 + Math.random() * 160, a = Math.random() * TAU;
                    const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
                    b.warnCircle(x, y, 70, 1.1, 0x80e0ff, () => b.explode(x, y, 70, 10, 0x80e0ff));
                }
                this.hold(0.6);
                break;
            }
            case 2:
                b.zone(b.px, b.py, 150, 5, 4, 0x60c0ff);
                this.fan('shot_ice', 3, 0.5, 200, 6, { orient: true });
                b.banner('寒冰领域：移动减速!');
                this.hold(0.5);
                break;
        }
    }
}

// 深渊魔眼：预警死亡射线（扫射）、追踪眼球、双层弹环
class Eye extends BossAI {
    protected cooldown() { return 2.5; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0:
            case 3: {
                const a = this.aim();
                b.warnLine(e.x, e.y, a, 1000, 16, 1.0);
                Sound.play('laser');
                this.hold(2.9);
                this.after(1.0, () => {
                    const dir = Math.random() < 0.5 ? -1 : 1;
                    b.beam(e, a, 1000, 44, 1.8, dir * (this.enraged ? 0.8 : 0.55), 10);
                    b.addShake(1.8, 3);
                });
                break;
            }
            case 1: {
                const a = this.aim();
                for (let i = 0; i < 4; i++) b.fireBullet('shot_darkorb', e.x, e.y, a + (i - 1.5) * 0.7, 140, 8, { turn: 2.0, life: 4.5 });
                Sound.play('eshot');
                this.hold(0.5);
                break;
            }
            case 2:
                this.ring('shot_darkorb', 16, 180, 7);
                this.after(0.4, () => this.ring('shot_darkorb', 16, 180, 7, Math.PI / 16));
                Sound.play('eshot');
                this.hold(0.8);
                break;
        }
    }
}

// 死神（最终 Boss）：回旋镰刀、连续冲刺、亡魂召唤、暗影弹环
class Reaper extends BossAI {
    protected cooldown() { return 2.2; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0: {
                const n = this.enraged ? 5 : 3, a = this.aim();
                for (let i = 0; i < n; i++) {
                    b.fireBullet('shot_scythe', e.x, e.y, a + (i - (n - 1) / 2) * 0.45, 360, 12, { spin: -900, returnAfter: 0.9, owner: e, pierce: true, radius: 22, life: 4 });
                }
                Sound.play('dash');
                this.hold(0.6);
                break;
            }
            case 1: {
                const n = this.enraged ? 4 : 3;
                this.hold(n * 0.9 + 0.3);
                for (let k = 0; k < n; k++) {
                    this.after(k * 0.9, () => {
                        const a = this.aim();
                        b.warnLine(e.x, e.y, a, 440, 80, 0.55);
                        this.after(0.55, () => { this.dash(a, 950, 0.45); Sound.play('dash'); });
                    });
                }
                break;
            }
            case 2:
                this.summonRing('ghost', 10, 320);
                b.banner('幻影召唤!');
                this.hold(0.6);
                break;
            case 3:
                this.ring('shot_darkorb', 20, 170, 8);
                this.after(0.5, () => this.ring('shot_darkorb', 20, 210, 8, Math.PI / 20));
                Sound.play('eshot');
                this.hold(0.9);
                break;
        }
    }

    protected onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y, 0x5a4482, 2, 100);
    }
}

// 年兽（新春限定）：爆竹乱射、连续冲撞、烟花齐放、怒吼召唤
class Nian extends BossAI {
    protected cooldown() { return 2.3; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0: {
                const n = this.enraged ? 4 : 3;
                for (let k = 0; k < n; k++) {
                    this.after(k * 0.35, () => { this.ring('fireball', 12, 170 + k * 20, 7, k * 0.26); Sound.play('boom'); });
                }
                b.banner('爆竹乱射!');
                this.hold(0.35 * n + 0.4);
                break;
            }
            case 1: {
                const n = this.enraged ? 3 : 2;
                this.hold(n * 1.0 + 0.3);
                for (let k = 0; k < n; k++) {
                    this.after(k * 1.0, () => {
                        const a = this.aim();
                        b.warnLine(e.x, e.y, a, 480, 80, 0.55);
                        this.after(0.55, () => { this.dash(a, 880, 0.5); Sound.play('dash'); });
                    });
                }
                break;
            }
            case 2: {
                const n = this.enraged ? 8 : 6;
                for (let i = 0; i < n; i++) {
                    const r = i === 0 ? 0 : 70 + Math.random() * 180, a = Math.random() * TAU;
                    const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
                    b.warnCircle(x, y, 65, 1.1, 0xff3030, () => b.explode(x, y, 65, 10, 0xffc040));
                }
                b.banner('烟花齐放!');
                this.hold(0.6);
                break;
            }
            case 3:
                this.summonRing('imp', this.enraged ? 4 : 3, 300);
                this.ring('fireball', 16, 200, 7);
                Sound.play('roar');
                this.hold(0.8);
                break;
        }
    }

    protected onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y - 30, 0xffc040, 2, 120);
    }
}

// 毒沼巨蟾：毒液喷吐（落地成毒云）、长舌突刺、跳跃砸地、召唤史莱姆
class Toad extends BossAI {
    private jumpT = 0;
    private jumpDur = 1;

    protected cooldown() { return 2.3; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0: {
                // 毒液喷吐：向玩家附近吐出数团毒液，落点先红圈预警，落地留下毒云
                const n = this.enraged ? 5 : 3;
                for (let i = 0; i < n; i++) {
                    const r = i === 0 ? 0 : 80 + Math.random() * 120, a = Math.random() * TAU;
                    const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
                    b.warnCircle(x, y, 60, 1.0, 0xff3030, () => {
                        b.explode(x, y, 50, 8, 0x80e040);
                        b.zone(x, y, 60, 3.5, 3, 0x60c030);
                    });
                }
                b.banner('毒液喷吐!');
                Sound.play('splash');
                this.hold(0.7);
                break;
            }
            case 1: {
                // 长舌突刺：红线预警后沿直线射出一串高速"舌头"
                const a = this.aim();
                b.warnLine(e.x, e.y, a, 520, 56, 0.6);
                this.hold(1.1);
                this.after(0.6, () => {
                    for (let k = 0; k < 7; k++) this.after(k * 0.03, () => b.fireBullet('shot_slimeball', e.x, e.y, a, 820, 12));
                    if (this.enraged) for (const s of [-0.35, 0.35]) b.fireBullet('shot_slimeball', e.x, e.y, a + s, 600, 8);
                    Sound.play('dash');
                });
                break;
            }
            case 2: {
                // 跳跃砸地：落点红圈，落地毒液环
                const tx = b.px, ty = b.py, dur = this.enraged ? 0.95 : 1.2;
                b.warnCircle(tx, ty, 125, dur, 0xff3030);
                this.dash(Math.atan2(ty - e.y, tx - e.x), Math.hypot(tx - e.x, ty - e.y) / dur, dur);
                this.jumpT = this.jumpDur = dur;
                this.hold(dur + 0.5);
                this.after(dur, () => {
                    b.explode(e.x, e.y, 125, 12, 0x80e040);
                    this.ring('shot_slimeball', this.enraged ? 14 : 10, 170, 6, Math.random());
                    Sound.play('slam');
                });
                break;
            }
            case 3:
                this.summonRing('slime', this.enraged ? 8 : 6, 260);
                this.fan('shot_slimeball', 5, 0.9, 260, 6);
                Sound.play('croak');
                this.hold(0.6);
                break;
        }
    }

    protected onUpdate(dt: number) {
        if (this.jumpT > 0) {
            this.jumpT -= dt;
            this.lift = Math.sin((1 - Math.max(0, this.jumpT) / this.jumpDur) * Math.PI) * 170;
        } else this.lift = 0;
    }
}

// 雪怪王（圣诞限定）：雪球连射、冰锥阵、冲锋撞击、召唤冰霜幽灵
class Yeti extends BossAI {
    protected cooldown() { return 2.3; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0: {
                const n = this.enraged ? 5 : 3;
                for (let k = 0; k < n; k++) this.after(k * 0.28, () => { this.fan('shot_ice', 5, 0.8, 240 + k * 15, 7); Sound.play('freeze'); });
                b.banner('雪球连射!');
                this.hold(0.28 * n + 0.4);
                break;
            }
            case 1: {
                const n = this.enraged ? 7 : 5;
                for (let i = 0; i < n; i++) {
                    const r = i === 0 ? 0 : 70 + Math.random() * 170, a = Math.random() * TAU;
                    const x = b.px + Math.cos(a) * r, y = b.py + Math.sin(a) * r;
                    b.warnCircle(x, y, 60, 1.1, 0xff3030, () => b.explode(x, y, 60, 10, 0x9ad4f8));
                }
                this.hold(0.6);
                break;
            }
            case 2: {
                const n = this.enraged ? 3 : 2;
                this.hold(n * 1.0 + 0.3);
                for (let k = 0; k < n; k++) {
                    this.after(k * 1.0, () => {
                        const a = this.aim();
                        b.warnLine(e.x, e.y, a, 460, 84, 0.6);
                        this.after(0.6, () => { this.dash(a, 820, 0.5); Sound.play('dash'); });
                    });
                }
                break;
            }
            case 3:
                this.summonRing('ghost', this.enraged ? 6 : 4, 280);
                this.ring('shot_ice', 14, 180, 6);
                Sound.play('roar');
                this.hold(0.8);
                break;
        }
    }

    protected onUpdate() {
        if (this.dashT > 0) this.b.burst(this.e.x, this.e.y - 20, 0xe8f0ff, 2, 120);
    }
}

// 沙漠巨蠕（流沙荒漠）：钻入沙中追踪玩家、破土而出、沙流喷吐、召唤冲锋野猪
class Worm extends BossAI {
    private under = 0;     // 钻地剩余时间
    private trail = 0;

    protected cooldown() { return 2.2; }

    protected cast(step: number) {
        const b = this.b, e = this.e;
        switch (step % 4) {
            case 0: {
                // 钻地：潜入沙中高速追踪，最后在玩家脚下破土（红圈预警）
                const dur = this.enraged ? 2.2 : 2.8;
                this.under = dur;
                this.hold(dur + 0.6);
                b.banner('巨蠕钻入了沙中!');
                Sound.play('slam');
                this.after(dur - 0.8, () => {
                    const tx = b.px, ty = b.py;
                    b.warnCircle(tx, ty, 110, 0.8, 0xff3030, () => {
                        e.x = tx; e.y = ty;
                        b.explode(tx, ty, 110, 14, 0xd8b46a);
                        this.ring('shot_sand', this.enraged ? 18 : 12, 200, 7, Math.random());
                        if (this.enraged) this.ring('shot_sand', 12, 140, 6, Math.random());
                        Sound.play('boom');
                    });
                });
                break;
            }
            case 1: {
                // 沙流喷吐：扇形连射
                for (let k = 0; k < (this.enraged ? 4 : 3); k++) this.after(k * 0.25, () => this.fan('shot_sand', 7, 1.1, 260, 7));
                this.hold(1);
                Sound.play('eshot');
                break;
            }
            case 2: {
                // 甩尾冲撞：红线预警后直线冲撞，沿途留下沙弹
                const a = this.aim();
                b.warnLine(e.x, e.y, a, 560, 70, 0.7);
                this.hold(1.6);
                this.after(0.7, () => { this.dash(a, 700, 0.8); this.trail = 0.8; Sound.play('dash'); });
                break;
            }
            case 3:
                this.summonRing('boar', this.enraged ? 6 : 4, 280);
                this.ring('shot_sand', 10, 160, 6);
                b.banner('沙漠巨蠕召唤了野猪群!');
                Sound.play('roar');
                this.hold(0.6);
                break;
        }
    }

    protected onUpdate(dt: number) {
        if (this.under > 0) {
            // 地下：不可被攻击，身后留下翻起的沙尘，追踪玩家
            this.under -= dt;
            this.alpha = 0.15;
            const a = this.aim();
            this.dash(a, 260, 0.05);
            if (Math.random() < 0.6) this.b.burst(this.e.x, this.e.y, 0xd8b46a, 2, 140);
        } else this.alpha = 1;
        if (this.trail > 0) {
            this.trail -= dt;
            if (Math.random() < 0.25) this.b.fireBullet('shot_sand', this.e.x, this.e.y, Math.random() * TAU, 90, 6, { life: 2.5 });
        }
    }
}

export function createBossAI(id: string, b: Battle, e: Enemy): BossAI | null {
    switch (id) {
        case 'slimeking': return new SlimeKing(b, e);
        case 'bonelord': return new BoneLord(b, e);
        case 'vampire': return new Vampire(b, e);
        case 'lich': return new Lich(b, e);
        case 'eye': return new Eye(b, e);
        case 'reaper': return new Reaper(b, e);
        case 'nian': return new Nian(b, e);
        case 'toad': return new Toad(b, e);
        case 'yeti': return new Yeti(b, e);
        case 'worm': return new Worm(b, e);
    }
    return null;
}
