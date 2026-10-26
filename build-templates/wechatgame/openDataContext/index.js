// 奶蛙割草 · 开放数据域：好友排行榜
// 主域通过 postMessage({ type: 'rank', kind: 'best' | 'daily', date: 'YYYYMMDD', scale }) 通知绘制，
// 在共享画布上绘制后由主域的 SubContextView 显示。只读取好友数据，不向主域回传任何信息（平台规定）
// 构建后由 tools/wechat-postbuild.mjs 在 game.json 中登记 "openDataContext": "openDataContext"

const canvas = wx.getSharedCanvas();
const ctx = canvas.getContext('2d');

const ROW_H = 96;
const COLORS = { bg: '#1e1838', row: '#2a2250', me: '#24403c', text: '#ffffff', grey: '#9a90b8', gold: '#ffd75a', silver: '#d8dce8', bronze: '#e09858' };

let kind = 'best';
let date = '';
let scale = 1;           // 屏幕像素 → 画布像素
let list = [];           // { name, avatar, score, img }
let selfAvatar = '';
let status = '加载中…';
let scroll = 0;
let touchY = null;
let seq = 0;

function fmt(t) {
    t = Math.max(0, Math.floor(t));
    const m = Math.floor(t / 60), s = t % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function parseScore(user) {
    const kv = (user.KVDataList || []).find(x => x.key === kind);
    if (!kv) return -1;
    try {
        const v = JSON.parse(kv.value);
        if (kind === 'daily' && v.date !== date) return -1;   // 只显示今天的每日挑战
        return v.wxgame && typeof v.wxgame.score === 'number' ? v.wxgame.score : -1;
    } catch (e) { return -1; }
}

function load() {
    const my = ++seq;
    status = '加载中…';
    list = [];
    scroll = 0;
    draw();
    wx.getFriendCloudStorage({
        keyList: ['best', 'daily'],
        success: res => {
            if (my !== seq) return;
            list = (res.data || [])
                .map(u => ({ name: u.nickname || '好友', avatar: u.avatarUrl || '', score: parseScore(u), img: null }))
                .filter(u => u.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 100);
            status = list.length ? '' : kind === 'daily' ? '今天还没有好友完成每日挑战\n快去挑战，再分享给好友吧' : '还没有好友上榜\n分享给好友一起割草吧';
            list.forEach(u => {
                if (!u.avatar) return;
                const img = wx.createImage();
                img.onload = () => { u.img = img; draw(); };
                img.src = u.avatar;
            });
            draw();
        },
        fail: () => { if (my === seq) { status = '排行榜加载失败，请稍后再试'; draw(); } },
    });
}

function maxScroll() {
    return Math.max(0, list.length * ROW_H - canvas.height);
}

function draw() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'middle';
    if (status) {
        ctx.fillStyle = COLORS.grey;
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        status.split('\n').forEach((line, i, all) => ctx.fillText(line, w / 2, h / 2 + (i - (all.length - 1) / 2) * 40));
        return;
    }
    const first = Math.max(0, Math.floor(scroll / ROW_H));
    const last = Math.min(list.length, Math.ceil((scroll + h) / ROW_H));
    for (let i = first; i < last; i++) {
        const u = list[i];
        const y = i * ROW_H - scroll;
        const me = !!selfAvatar && u.avatar === selfAvatar;
        ctx.fillStyle = me ? COLORS.me : COLORS.row;
        ctx.fillRect(8, y + 6, w - 16, ROW_H - 12);
        const medal = i === 0 ? COLORS.gold : i === 1 ? COLORS.silver : i === 2 ? COLORS.bronze : COLORS.grey;
        ctx.fillStyle = medal;
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), 52, y + ROW_H / 2);
        if (u.img) ctx.drawImage(u.img, 96, y + 16, 64, 64);
        else { ctx.fillStyle = '#3a3264'; ctx.fillRect(96, y + 16, 64, 64); }
        ctx.fillStyle = COLORS.text;
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'left';
        let name = u.name;
        while (name.length > 1 && ctx.measureText(name).width > w - 360) name = name.slice(0, -1);
        ctx.fillText(name === u.name ? name : name + '…', 180, y + ROW_H / 2);
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(fmt(u.score), w - 28, y + ROW_H / 2);
    }
}

wx.onMessage(msg => {
    // 引擎自身也会发消息（SubContextView 同步尺寸等），只处理排行榜消息
    if (!msg || msg.type !== 'rank') return;
    kind = msg.kind === 'daily' ? 'daily' : 'best';
    date = String(msg.date || '');
    scale = msg.scale > 0 ? msg.scale : 1;
    load();
});

// 自己的头像：用于高亮自己那一行
try {
    wx.getUserInfo({ openIdList: ['selfOpenId'], success: res => { const me = res.data && res.data[0]; if (me) { selfAvatar = me.avatarUrl || ''; draw(); } } });
} catch (e) { /* 忽略 */ }

// 拖动滚动（触摸坐标是屏幕像素，换算到画布像素）
wx.onTouchStart(e => { const t = e.touches && e.touches[0]; touchY = t ? t.clientY : null; });
wx.onTouchMove(e => {
    const t = e.touches && e.touches[0];
    if (!t || touchY === null) return;
    scroll = Math.max(0, Math.min(maxScroll(), scroll - (t.clientY - touchY) * scale));
    touchY = t.clientY;
    draw();
});
wx.onTouchEnd(() => { touchY = null; });
