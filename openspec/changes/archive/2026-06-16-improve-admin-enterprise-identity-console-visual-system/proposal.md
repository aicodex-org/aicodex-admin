## Why

当前企业认证中心总览、认证源中心和应用接入中心已经具备核心入口，但页面仍偏向“AntD 默认卡片堆叠”，管理员需要逐块阅读才能判断当前身份治理状态、待处理风险和下一步操作。领导反馈“Admin 有点丑”的本质是 Admin 还不像企业级认证中心，需要把既有页面升级为稳定、可扫描、可决策的身份治理控制台。

## What Changes

- 统一 `/`、`/providers`、`/applications` 的企业认证中心工作台结构：页面画布、页头、摘要条、状态卡、风险/待办、配置入口和列表承载区保持一致。
- 强化页面角色和治理闭环：总览负责跨域状态与风险分流，认证源中心负责身份源接入与同步诊断，应用接入中心负责应用/OAuth/API 映射接入状态与配置缺口。
- 将视觉系统服务于产品体验：降低零散卡片和装饰感，用安静、专业、信息密度适中的控制台布局表达状态、风险、入口和操作决策。
- 保留现有只读数据推导、既有路由、表格操作、分页筛选、新增/编辑/删除入口和权限边界。
- 不新增 UI 库，不改真实认证/授权/OAuth/OIDC 回调、Provider 密钥、同步执行、Gateway projection publish/cleanup/receipt 行为或生产/类生产配置。

## Capabilities

### New Capabilities

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 总览页 SHALL 使用企业身份治理控制台结构承载跨域状态、风险摘要和入口分流，而不是松散卡片集合。
- `admin-enterprise-identity-auth-source-center`: 认证源中心 SHALL 使用与总览一致的工作台结构，突出认证源状态、同步/授权诊断、待处理风险和 Provider 列表承载关系。
- `admin-enterprise-identity-application-access-center`: 应用接入中心 SHALL 使用与总览一致的工作台结构，突出应用接入摘要、配置缺口、入口网格和现有 Application 列表承载关系。

## Impact

- 主要影响 `web-admin/src/IdentityConsoleOverview.js`、`web-admin/src/AuthSourceCenter.js`、`web-admin/src/ApplicationAccessCenter.js`、`web-admin/src/App.less` 和新增共享企业认证中心展示组件。
- 若新增 TS/TSX 共享组件，需遵守 `web-admin-incremental-typescript` 规则并运行 `yarn typecheck`。
- 更新相关聚焦测试、OpenSpec 验证记录和 Admin 企业认证中心路线台账。
- 不影响后端接口、真实认证链路、授权执行、密钥写入、Gateway projection 发布或 `test` 分支。
