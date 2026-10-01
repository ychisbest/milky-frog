import { Color, Node, Sprite, UITransform } from 'cc';
import { Art } from './Art';
import { mkNode, mkRect, mkSprite } from './UiKit';

const tmp = new Color();

// 开屏与标题界面的动态夜景：渐变夜空、星星、血月、浮云、蝙蝠、山丘墓地剪影、飘升的萤火
export class Backdrop {
    readonly node: Node;
    private t = 0;
    private stars: { node: Node; sp: Sprite; ph: number; spd: number }[] = [];
    private clouds: { node: Node; spd: number }[] = [];
    private bats: { node: Node; sp: Sprite; x: number; baseY: number; spd: number; dir: number; ph: number; wait: number }[] = [];
    private embers: { node: Node; sp: Sprite; x: number; y: number; vy: number; life: number; max: number; ph: number }[] = [];
    private moon: Node;

    constructor(parent: Node, private vw: number, private vh: number, private horizonY: number, moonY: number) {
        this.node = mkNode('Backdrop', parent);
        const top = vh / 2, bottom = -vh / 2;

        // 夜空渐变：顶部深紫 → 地平线暗红
        const bands = 18;
        const skyH = top - horizonY;
        for (let i = 0; i < bands; i++) {
            const k = i / (bands - 1);
            const col = new Color(
                Math.round(10 + (74 - 10) * k * k),
                Math.round(6 + (16 - 6) * k),
                Math.round(26 + (44 - 26) * k),
                255,
            );
            const h = skyH / bands + 1;
            mkRect(this.node, vw, h, col, 'sky').node.setPosition(0, top - (i + 0.5) * (skyH / bands));
        }
        // 星星
        for (let i = 0; i < 46; i++) {
            const sp = mkSprite(this.node, 'star', 1 + Math.random() * 1.2);
            sp.node.setPosition((Math.random() - 0.5) * vw, horizonY + 80 + Math.random() * (skyH - 80));
            this.stars.push({ node: sp.node, sp, ph: Math.random() * 6.28, spd: 1 + Math.random() * 2.5 });
        }
        // 血月
        this.moon = mkSprite(this.node, 'moon', 4).node;
        this.moon.setPosition(0, moonY);
        // 浮云（缓慢漂过月亮）
        for (let i = 0; i < 3; i++) {
            const c = mkSprite(this.node, 'cloud', 3 + Math.random());
            c.node.setPosition((Math.random() - 0.5) * vw, moonY - 120 + i * 95 + Math.random() * 30);
            this.clouds.push({ node: c.node, spd: (8 + Math.random() * 10) * (i % 2 ? -1 : 1) });
        }
        // 蝙蝠剪影
        for (let i = 0; i < 4; i++) {
            const sp = mkSprite(this.node, 'bat_0', 1.4 + Math.random() * 0.6);
            sp.color = new Color(30, 12, 36, 255);
            const dir = Math.random() < 0.5 ? 1 : -1;
            this.bats.push({ node: sp.node, sp, x: -dir * (vw / 2 + 60), baseY: moonY - 200 + Math.random() * 360, spd: 70 + Math.random() * 60, dir, ph: Math.random() * 6, wait: i * 2.2 + Math.random() * 2 });
        }
        // 远山（较亮）+ 近山墓地（深色），横向平铺
        this.tiledHills(horizonY + 26, 3.4, new Color(70, 36, 74, 255));
        this.tiledHills(horizonY, 3, new Color(255, 255, 255, 255));
        // 地面
        mkRect(this.node, vw, horizonY - bottom + 2, new Color(26, 12, 34, 255), 'ground', 0.5, 1).node.setPosition(0, horizonY + 1);
        mkRect(this.node, vw, 6, new Color(52, 22, 48, 255), 'groundEdge', 0.5, 1).node.setPosition(0, horizonY + 1);
        // 萤火 / 余烬
        for (let i = 0; i < 22; i++) {
            const sp = mkSprite(this.node, 'ember', 1.5 + Math.random() * 1.5);
            const e = { node: sp.node, sp, x: 0, y: 0, vy: 0, life: 0, max: 1, ph: Math.random() * 6 };
            this.respawnEmber(e, true);
            this.embers.push(e);
        }
    }

    private tiledHills(y: number, scale: number, tint: Color) {
        const n = mkNode('hills', this.node);
        const sp = n.addComponent(Sprite);
        sp.spriteFrame = Art.f('hills');
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.type = Sprite.Type.TILED;
        sp.color = tint;
        const ut = n.getComponent(UITransform)!;
        ut.setAnchorPoint(0.5, 1);
        const fh = Art.f('hills').rect.height;
        ut.setContentSize(this.vw / scale + 128, fh);
        n.setScale(scale, scale, 1);
        // 让山丘底部与地平线对齐
        n.setPosition(Math.random() * 60, y + fh * scale - 2);
    }

    private respawnEmber(e: { node: Node; sp: Sprite; x: number; y: number; vy: number; life: number; max: number; ph: number }, initial = false) {
        e.x = (Math.random() - 0.5) * this.vw;
        e.y = this.horizonY - 40 - Math.random() * 200 + (initial ? Math.random() * 500 : 0);
        e.vy = 14 + Math.random() * 26;
        e.max = e.life = 4 + Math.random() * 5;
    }

    update(dt: number) {
        this.t += dt;
        const t = this.t;
        for (const s of this.stars) {
            const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.spd + s.ph));
            s.sp.color = tmp.set(255, 255, 255, Math.round(255 * a));
        }
        const ms = 1 + Math.sin(t * 0.8) * 0.015;
        this.moon.setScale(4 * ms, 4 * ms, 1);
        for (const c of this.clouds) {
            const p = c.node.position;
            let x = p.x + c.spd * dt;
            if (x > this.vw / 2 + 120) x = -this.vw / 2 - 120;
            if (x < -this.vw / 2 - 120) x = this.vw / 2 + 120;
            c.node.setPosition(x, p.y);
        }
        for (const b of this.bats) {
            if (b.wait > 0) { b.wait -= dt; b.node.active = false; continue; }
            b.node.active = true;
            b.x += b.dir * b.spd * dt;
            const y = b.baseY + Math.sin(t * 2 + b.ph) * 26;
            b.node.setPosition(b.x, y);
            b.sp.spriteFrame = Art.f(Math.floor(t * 8 + b.ph) % 2 ? 'bat_1' : 'bat_0');
            if (Math.abs(b.x) > this.vw / 2 + 80) {
                b.dir = Math.random() < 0.5 ? 1 : -1;
                b.x = -b.dir * (this.vw / 2 + 60);
                b.baseY = this.moon.position.y - 200 + Math.random() * 360;
                b.wait = 2 + Math.random() * 5;
            }
        }
        for (const e of this.embers) {
            e.life -= dt;
            if (e.life <= 0) this.respawnEmber(e);
            e.y += e.vy * dt;
            const x = e.x + Math.sin(t * 1.3 + e.ph) * 14;
            e.node.setPosition(x, e.y);
            const k = e.life / e.max;
            e.sp.color = tmp.set(255, 255, 255, Math.round(255 * Math.min(1, k * 3, (1 - k) * 4)));
        }
    }
}
