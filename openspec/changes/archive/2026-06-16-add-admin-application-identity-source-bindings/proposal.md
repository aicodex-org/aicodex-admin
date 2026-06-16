## Why

当前 Application 只有一个 `organization` 字段，Provider 登录时也按这个组织查找用户。企业微信、飞书/Lark、后续钉钉同时接入同一个 OIDC 应用时，会出现“同步用户在某个来源组织下，但登录应用组织指向另一个来源组织”的不命中问题。

## What Changes

- 为 Application 的 Provider 绑定增加身份源目标组织配置，使同一个 OIDC/OAuth 应用可同时启用企业微信、飞书/Lark、钉钉等多个登录身份源。
- Provider 登录匹配用户时优先使用该 Provider 绑定的目标组织；未配置时继续回退到 `application.organization`，保持现有应用兼容。
- 应用编辑页在 Provider 绑定区域展示并编辑目标组织，并用新增 TSX 组件承接该 UI，开始在当前业务 change 内按渐进式 TypeScript/React 路线开发。
- 登录失败和配置校验保持 fail closed：目标组织不可用、Provider 未绑定或不允许登录时不得跨组织猜测用户。
- 不读取真实 Feishu/Lark secret，不触发组织同步，不写 Gateway facts，不修改 API/Insight 代码。

## Capabilities

### New Capabilities
- `admin-application-identity-source-bindings`: 描述同一个 Application 绑定多个登录身份源目标组织、登录匹配组织解析、兼容回退和只读诊断语义。

### Modified Capabilities
- `admin-enterprise-identity-application-access-center`: 应用编辑页 SHALL 支持配置 Provider 级目标组织，并在管理台中解释 Application 组织与登录身份源组织的区别。
- `admin-login-entry-routing`: 显式授权入口 SHALL 在 Provider 登录阶段使用 Provider 绑定目标组织解析本次登录用户，而不是固定使用 Application 默认组织。
- `feishu-provider-configuration`: 飞书/Lark 配置文档 SHALL 说明登录 Provider 需要绑定到与飞书组织同步目标一致的组织。

## Impact

- 后端：`admin/object` Application/ProviderItem 解析与校验、`admin/controllers/auth.go` Provider 登录匹配链路、聚焦单元测试。
- 前端：`web-admin/src` 应用编辑 Provider 配置区域，新增 TSX 组件和测试；不新增全量 TS 迁移。
- API：复用现有 `/api/get-application` 和 `/api/update-application`，请求/响应中 ProviderItem 增加兼容字段。
- 数据：ProviderItem 存在于 Application JSON/mediumtext 字段中；旧数据缺少新字段时按空值处理并回退 Application 组织。
