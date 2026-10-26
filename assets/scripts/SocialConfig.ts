// 社交与云服务配置（后台配置步骤见 docs/增长功能进度.md）
export const SOCIAL_CONFIG = {
    // 微信云开发环境 ID（云开发控制台 → 设置 → 环境 ID，形如 cloud1-xxxxxx）；留空 = 不启用云存档，只存本地
    cloudEnv: '',
    // 云存档集合名（需在云开发控制台「数据库」中创建，权限选「仅创建者可读写」）
    cloudCollection: 'saves',
    // 主菜单显示游戏圈按钮
    gameClub: true,
    // 好友排行榜（需要构建后运行 node tools/wechat-postbuild.mjs 放入开放数据域）
    friendRank: true,
};
