import { ImageAsset, Rect, Size, SpriteFrame, Texture2D, Vec2 } from 'cc';
import { buildAtlas } from './PixelArt';

// 把程序生成的像素图集上传为一张贴图，所有精灵共用 → 可合批
export class Art {
    private static frames = new Map<string, SpriteFrame>();

    static init() {
        if (this.frames.size) return;
        const atlas = buildAtlas();
        const img = new ImageAsset({
            _data: atlas.data,
            _compressed: false,
            width: atlas.size,
            height: atlas.size,
            format: Texture2D.PixelFormat.RGBA8888,
        });
        const tex = new Texture2D();
        tex.image = img;
        tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
        tex.setMipFilter(Texture2D.Filter.NONE);
        tex.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
        tex.addRef();
        for (const name in atlas.rects) {
            const r = atlas.rects[name];
            const sf = new SpriteFrame();
            sf.reset({
                texture: tex,
                rect: new Rect(r.x, r.y, r.w, r.h),
                originalSize: new Size(r.w, r.h),
                offset: new Vec2(0, 0),
                isRotate: false,
            });
            sf.addRef();
            this.frames.set(name, sf);
        }
    }

    static f(name: string): SpriteFrame {
        const sf = this.frames.get(name);
        if (!sf) console.warn('[Art] missing sprite', name);
        return sf!;
    }
}
