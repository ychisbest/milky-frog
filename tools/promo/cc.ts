export class Vec3 { x=0;y=0;z=0; constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} set(x:any,y=0,z=0){ if(typeof x==='object'){this.x=x.x;this.y=x.y;this.z=x.z;} else {this.x=x;this.y=y;this.z=z;} return this;} }
export class Vec2 { constructor(public x=0, public y=0){} }
export class Rect { constructor(public x=0,public y=0,public width=0,public height=0){} }
export class Size { constructor(public width=0,public height=0){} }
export class Color { r=255;g=255;b=255;a=255; static WHITE = new Color(); constructor(r=255,g=255,b=255,a=255){this.r=r;this.g=g;this.b=b;this.a=a;} set(r:any,g=0,b=0,a=255){ if(typeof r==='object'){this.r=r.r;this.g=r.g;this.b=r.b;this.a=r.a;} else {this.r=r;this.g=g;this.b=b;this.a=a;} return this;} }
export const Layers = { Enum: { UI_2D: 1<<25, DEFAULT: 1<<30 } };
export let nodeCount = 0;
export class Component { node!: Node; getComponent(c:any){ return this.node.getComponent(c);} scheduleOnce(cb:any){ cb(); } }
export class Node {
  static EventType = { TOUCH_START:'ts', TOUCH_MOVE:'tm', TOUCH_END:'te', TOUCH_CANCEL:'tc' };
  name: string; children: Node[] = []; parent: Node|null = null; active = true; layer = 0; angle = 0;
  position = new Vec3(); scale = new Vec3(1,1,1); comps: any[] = []; handlers: any = {};
  constructor(name=''){ this.name = name; nodeCount++; }
  addChild(n: Node){ n.parent = this; this.children.push(n); }
  setPosition(x:any,y=0,z=0){ if (typeof x==='object') this.position.set(x); else { if(!isFinite(x)||!isFinite(y)) throw new Error('NaN pos '+this.name); this.position.set(x,y,z);} }
  setScale(x:any,y:number=0,z=1){ if (typeof x==="object") { this.scale.set(x); return; } if(!isFinite(x)||!isFinite(y)) throw new Error('NaN scale '+this.name); this.scale.set(x,y,z); }
  addComponent(C:any){ if (C!==UITransform && C.requires && !this.getComponent(UITransform)) this.addComponent(UITransform); if (this.getComponent(C)) throw new Error('dup comp '+C.name+' on '+this.name); const c = new C(); c.node = this; this.comps.push(c); return c; }
  getComponent(C:any){ return this.comps.find(c => c instanceof C) || null; }
  getComponentInChildren(C:any): any { return this.getComponent(C) || this.children.map(c=>c.getComponentInChildren(C)).find(Boolean) || null; }
  on(ev:string, cb:any, t?:any){ this.handlers[ev] = cb.bind(t); }
  emit(ev:string, e?:any){ this.handlers[ev]?.(e); }
  destroyAllChildren(){ this.children = []; }
  setSiblingIndex(i:number){ if(!this.parent) return; const a=this.parent.children; a.splice(a.indexOf(this),1); a.splice(Math.min(i,a.length),0,this); }
  removeAllChildren(){ this.children = []; }
  destroy(){ if (this.parent) this.parent.children = this.parent.children.filter(c=>c!==this); }
}
export class UITransform extends Component { w=100;h=100; ax=.5; ay=.5; setContentSize(w:number,h:number){ if(!isFinite(w)||!isFinite(h)) throw new Error('NaN size'); this.w=w;this.h=h;} setAnchorPoint(x:number,y:number){this.ax=x;this.ay=y;} convertToNodeSpaceAR(v:Vec3,o:Vec3){ return o.set(v.x-640,v.y-360,0);} }
export class SpriteFrame { rect = new Rect(); reset(i:any){ this.rect = i.rect; } addRef(){} }
export class Sprite extends Component { static requires = true; static SizeMode = {RAW:2, CUSTOM:0}; static Type = {TILED:2}; sizeMode=0; type=0; trim=true; private _c = new Color(); get color(){ return this._c; } set color(v:any){ this._c = new Color(v.r, v.g, v.b, v.a); } private _sf: any = null;
  get spriteFrame(){ return this._sf; } set spriteFrame(v:any){ if(!v) throw new Error('null spriteFrame'); this._sf = v; } }
export class Label extends Component { static requires = true; static CacheMode={CHAR:2}; static HorizontalAlign={LEFT:0,CENTER:1,RIGHT:2}; static VerticalAlign={CENTER:1}; string=''; fontSize=0; lineHeight=0; isBold=false; private _c = new Color(); get color(){ return this._c; } set color(v:any){ this._c = new Color(v.r, v.g, v.b, v.a); } cacheMode=0; enableOutline=false; outlineColor=new Color(); outlineWidth=0; horizontalAlign=0; verticalAlign=0; }
export class Canvas extends Component { cameraComponent = { clearColor: null as any }; }
export class ImageAsset { constructor(public src:any){} }
export class Texture2D { static PixelFormat={RGBA8888:35}; static Filter={NEAREST:1,NONE:0}; static WrapMode={CLAMP_TO_EDGE:1}; image:any; setFilters(){} setMipFilter(){} setWrapMode(){} addRef(){} }
export const view = { getVisibleSize: () => ({ width: 720, height: 1560 }), setDesignResolutionSize(){} };
export const ResolutionPolicy = { FIXED_WIDTH: 4 };
const store: any = {};
export const sys = { localStorage: { getItem: (k:string) => store[k] ?? null, setItem: (k:string,v:string) => { store[k]=v; } }, getSafeAreaRect: () => new Rect(0, 30, 720, 1450) };
export const game = { on(){}, off(){} };
export const Game = { EVENT_HIDE: 'hide' };
export class AudioClip { name=''; }
export const sfxLog: Record<string, number> = {};
export class AudioSource extends Component { loop=false; volume=1; playing=false; clip:any=null; play(){ this.playing=true; } stop(){ this.playing=false; } pause(){ this.playing=false; } playOneShot(c:any){ sfxLog[c.name]=(sfxLog[c.name]||0)+1; } }
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const resources = { loadDir(_p:string, _t:any, cb:any){ const names=require('fs').readdirSync(require('path').resolve('../../assets/resources/audio')).filter((f:string)=>f.endsWith('.mp3')).map((f:string)=>f.replace('.mp3','')); cb(null, names.map(n=>{ const c=new AudioClip(); c.name=n; return c; })); } };
export const Input = { EventType: { KEY_DOWN: 'kd', KEY_UP: 'ku' } };
export const inputHandlers: any = {};
export const input = { on(ev:string, cb:any, t:any){ inputHandlers[ev] = cb.bind(t); }, off(){} };
export const KeyCode: any = { DIGIT_1: 49, DIGIT_4: 52, NUM_1: 97, NUM_4: 100, KEY_A: 65, KEY_D: 68, KEY_W: 87, KEY_S: 83, ARROW_LEFT: 37, ARROW_RIGHT: 39, ARROW_UP: 38, ARROW_DOWN: 40, KEY_R: 82, KEY_Q: 81, KEY_E: 69, ENTER: 13, SPACE: 32, ESCAPE: 27, KEY_P: 80 };
export class EventKeyboard { constructor(public keyCode:number){} }
export class EventTouch { propagationStopped=false; constructor(public x=0, public y=0){} getUILocation(){ return {x:this.x,y:this.y}; } }
export const Director = { EVENT_AFTER_SCENE_LAUNCH: 'x' };
export const director = { on(){}, getScene(){ return null; } };
export const _decorator = { ccclass: (_n:string) => (c:any) => c };
