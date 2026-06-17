## Why

当前组织、用户、角色、权限四类组织身份列表页已经接入组织身份工作台，但顶部结构和文案过于相似，容易被理解为“同一个说明壳 + 不同表格”。这会削弱企业认证中心的治理语义，也让首屏列表主任务被过高的摘要区域压低。

## What Changes

- 将四类实体工作台从通用组织身份说明收口为四种不同的实体治理骨架，保留当前列表作为主操作入口。
- 为组织、用户、角色、权限分别提供差异化标题、副标题、首屏结构、指标语义、主行动入口和风险/质量提示。
- 避免继续套用同一套“KPI 卡 + 入口卡 + 质量核对 + 原列表说明”机械结构；组织使用目录健康/边界面板，用户使用生命周期/账号状态条，角色使用权限风险矩阵，权限使用敏感度/引用关系矩阵。
- 收紧顶部信息密度，弱化暴露实现痕迹的长说明和粗糙占位感，让表格区域更早进入首屏，并用浏览器坐标证据验证。
- 同步 zh/en i18n 和聚焦测试，确保四页不会退回同质化文案。
- 不新增后端统计、认证授权执行逻辑、OIDC/Gateway 操作或真实数据写入。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 组织身份工作台需要在组织、用户、角色、权限四类实体页呈现差异化、紧凑、以列表为主任务的治理体验。

## Impact

- OpenSpec: `openspec/changes/polish-admin-enterprise-organization-identity-entity-workbenches/**`，归档后同步 `openspec/specs/admin-enterprise-organization-identity-center/spec.md`。
- 前端: `web-admin/src/OrganizationIdentityCenter.tsx`、`web-admin/src/OrganizationIdentityCenter.test.tsx`、`web-admin/src/locales/zh/data.json`、`web-admin/src/locales/en/data.json`。
- 验证: OpenSpec strict、`git diff --check`、`yarn typecheck`、聚焦 Jest/coverage、`yarn build`、local-dev 浏览器复验。
