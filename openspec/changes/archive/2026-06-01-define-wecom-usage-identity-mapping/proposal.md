## Why

Insight 已经可以通过 aicodex-admin OIDC 和企业微信扫码识别同步用户，但报表 scope 仍依赖 admin 用户属性中的手工 `aicodexApiUserId`。这会导致企业微信组织内用户完成扫码后仍出现“账号映射未完成”，无法按部门负责人视角查看 AI 用量。

当前需要把 `aicodex-admin` 的组织身份权威和 `aicodex-api` 的用量用户权威串起来：admin 继续负责企业微信组织、部门、负责人和成员范围，api 负责把稳定外部身份解析成内部用量用户 ID，Insight 不直连数据库、不参与映射细节。

## What Changes

- 在 Insight admin provider 中引入“企业微信组织身份 -> aicodex-api 用量用户”的批量解析流程。
- 保留现有手工 `aicodexApiUserId` / `apiUserId` 属性作为兼容兜底，但企业微信同步用户优先通过 `corpId + userid` 稳定身份解析。
- 为 current-user、scope、organization-tree 相关流程补充映射来源、映射状态和失败原因，继续使用 `OK`、`MISSING`、`AMBIGUOUS`、`INVALID` 等确定性状态。
- scope 计算时按请求批量解析成员身份，避免按部门或按用户循环调用 api resolver。
- 禁止使用昵称、姓名、邮箱、手机号等弱标识自动匹配用量用户。
- 为映射调用、批量大小、命中数量、失败原因和耗时补充 AI 可读审计日志。
- 不改变 Insight 调用模型：Insight 仍只从 admin provider 获取 scope，再用 scope 调 api usage provider。

## Capabilities

### New Capabilities

- `wecom-usage-identity-mapping`: 定义 admin 侧如何把企业微信同步用户、部门成员和负责人 scope 映射为可供 Insight 使用的 api 用量用户 ID。

### Modified Capabilities

- `insight-admin-provider-wrapper`: 扩展用量用户映射来源，从仅支持手工属性映射扩展为手工属性兜底 + 企业微信稳定身份批量解析。

## Impact

- 影响 `admin/controllers/insight_provider.go` 的 current-user、scope 和部门成员映射流程。
- 影响企业微信同步数据的读取路径，主要消费 `wecom_user_mapping`、`wecom_user_department`、`wecom_department_leader` 等已同步关系。
- 需要新增 admin -> api 的只读 resolver 客户端、配置项、错误处理和审计日志。
- 依赖 aicodex-api 配套提供企业微信身份到 `aicodex_users.id` 的只读批量解析接口。
- 不涉及 Insight 数据库、报表聚合接口或企业微信组织同步表结构的破坏性变更。
