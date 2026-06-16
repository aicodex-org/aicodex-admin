## Context

Application 已有 `organization`、`organizationResolutionMode` 和 `allowedOrganizations`，用于表达应用归属、共享应用和 OIDC 授权入口的目标组织策略。但当前 Provider 登录回调在拿到上游用户后，仍用 `application.Organization` 查找 `User.Wecom`、`User.Lark` 或其它 Provider 字段。这让一个 OIDC 应用无法自然同时支持企业微信与飞书登录。

## Goals

- 同一个 Application 可为不同 OAuth/SAML/Web3 Provider 指定不同登录用户组织。
- 旧应用不配置 Provider 目标组织时行为不变。
- 飞书/Lark 登录可命中飞书组织同步写入的 `User.Lark=user_id` 用户。
- 新增前端 UI 使用 TSX 组件，按渐进式 TypeScript 规则推进当前业务 change。

## Non-Goals

- 不改 Feishu/Lark Contact v3 同步实现。
- 不新增真实租户同步、真实 Provider secret 读取或测试 fixture。
- 不改 API/Gateway/Insight 内部库或 Gateway projection facts。
- 不把 Application `organization` 改成多选字段；它仍表示应用归属/默认组织/兼容 fallback。
- 不一次性迁移 `ApplicationEditPage.js`、`ProviderTable.js` 等历史大 JS 文件到 TSX。

## Design

### ProviderItem 目标组织

在 `ProviderItem` 增加 `TargetOrganization string json:"targetOrganization"`。该字段随 Application `providers` 一起保存，表达“这个 Provider 登录后在哪个组织内查找或创建用户”。

解析规则：

1. 如果 ProviderItem 存在且 `targetOrganization` 非空，使用它。
2. 否则使用 `application.organization`，兼容旧数据。
3. 如果解析结果为空或组织不存在，Provider 登录 fail closed。

### 登录匹配

新增应用级辅助方法解析 Provider 登录上下文，例如 `ResolveProviderLoginOrganization(providerName)`。Provider 登录分支中，查找用户、绑定规则、注册、冲突检测、`SetUserOAuthProperties` 和 MFA 组织上下文都使用解析后的登录组织。

Lark 保留现有 `FindLarkUserByIdentifiers` 的 user_id/open_id/union_id 兼容匹配，只把 organization 参数从 Application 默认组织替换为 Provider 目标组织。

### UI

不改 `application.organization` 的语义。在应用编辑页 Provider 绑定区域旁新增 TSX 组件 `ApplicationIdentitySourceBindings.tsx`：

- 展示每个 OAuth/SAML/Web3 Provider 绑定的目标组织。
- 支持从已有 organizations 下拉选择目标组织。
- 空值展示为“使用应用默认组织”，提交时保留空值以兼容旧行为。
- 展示轻量说明：Application 组织是应用归属/默认组织；目标组织决定该 Provider 登录时查用户的位置。
- 覆盖 loading/empty/long provider name/disabled organization option 的可读性。

### Compatibility

旧数据没有 `targetOrganization` 时不需要迁移。`UpdateApplication` 继续清理 `providerItem.Provider=nil` 后保存 ProviderItem，其它字段保持 JSON 兼容。

### Security and Privacy

响应中不新增 token、secret、手机号、邮箱或真实上游 payload。登录错误只描述配置缺失或账号不存在，不输出敏感标识明细。不得跨组织自动搜索用户。

## Testing

- Go object tests：Provider 目标组织解析、fallback、缺失组织 fail closed。
- Go controller/service focused tests：Lark/WeCom Provider 登录匹配使用 target organization。
- 前端 Jest：TSX 组件渲染、选择组织、空 Provider、长文本、默认组织 fallback 文案。
- `yarn typecheck`、相关 Jest、`yarn build`、OpenSpec strict 和 `git diff --check`。
