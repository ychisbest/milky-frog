// 广告配置：开通流量主后，在微信公众平台「流量主 → 广告管理」创建广告位，把 ID 填到这里即可。
// 未填写时（方案一）：所有"看广告"按钮自动隐藏，游戏正常可玩。
export const AD_CONFIG = {
    // 激励视频广告位 ID（形如 adunit-xxxxxxxxxxxx），所有激励位共用
    rewarded: '',
    // 可选：按位置单独配置激励视频广告位（便于在后台分别统计收益），留空则使用 rewarded
    rewardedByPlace: {
        revive: '',   // 死亡复活
        gold: '',     // 结算金币 ×2
        reroll: '',   // 升级重抽
        chest: '',    // 宝箱再开一次
        blessing: '', // 开局额外命运卡
        signin: '',   // 签到双倍
    } as Record<string, string>,
    // 插屏广告位 ID：只在结算后弹出，每 N 局一次，新用户首日不弹
    interstitial: '',
    interstitialEvery: 3,
    // 每局次数上限
    rerollPerRun: 2,
    // 调试：true 时在浏览器预览中模拟"看完广告"直接发奖，便于测试流程；上线前务必改回 false
    debugFake: false,
};
