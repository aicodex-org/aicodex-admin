## Why

当前企业认证中心左侧导航在“中心总览”分组下仍显示 `/apps` 入口，并使用 `general:Apps` 在中文下展示为“应用列表”。但 `/apps` 实际渲染的是旧应用门户卡片页；企业认证中心的主应用管理与应用接入路径是 `/applications`。这会让管理员从“中心总览 > 应用列表”进入错误页面，无法到达应用接入中心。

## What Changes

- 在 local admin / Admin 企业认证中心导航中隐藏旧 `/apps` 应用门户入口，避免把它显示为“应用列表”。
- 保持 `/applications` 在“应用接入”业务域下作为主应用接入中心入口。
- 保留非 local admin 或非管理员场景的 `/apps` 旧应用门户 fallback，并将可见文案收敛为“应用门户 / Application Portal”。
- 同步运行时导航、组织导航配置树、聚焦导航测试和 zh/en locale。

## Non-goals

- 不删除 `/apps` 路由，不改 `IdentityConsoleOverview` 中非 local admin 跳转 `/apps` 的兼容 fallback。
- 不新增中心、工作台、说明卡或视觉改造。
- 不触碰 OAuth/OIDC callback、Gateway publish/projection/cleanup/receipt、真实认证链路、secrets 或生产/类生产配置。

## Capabilities

### Added Capabilities
- `admin-enterprise-identity-console-shell`: 补充旧 `/apps` 应用门户入口与 `/applications` 应用接入中心的导航语义边界。

### Modified Capabilities
- 无。

## Impact

- 主要影响 `web-admin/src/enterpriseNavigation.js`、导航相关 Jest 测试和 `web-admin/src/locales/{zh,en}/data.json`。
- `/apps` 直接访问和非 local admin fallback 保持兼容；local admin 企业认证中心主导航和配置树不再展示旧门户入口。
