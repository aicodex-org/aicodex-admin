## Context

飞书扫码登录和飞书组织同步共享 `User.Lark` 绑定语义。同步侧要求 `user_id` 是主绑定，`open_id` / `union_id` / `tenant_key` 作为 OAuth properties 保留；登录侧通过 `GetLarkIdentifierCandidates` 和 `ResolveLarkUserByIdentifierCandidates` 兼容历史 `open_id` / `union_id`。这条链路能避免重复用户，但也意味着本地历史数据一旦出现多标识、多用户或多租户冲突，需要在正式同步前暴露给 operator。

## Design

### Backend read model

新增 `FeishuOrganizationSyncUserBindingConflictService`，只读扫描 Admin 本地数据：

- `FeishuUserMapping`：作为已同步用户和 source lineage 的主数据来源。
- `User`：读取 `User.Lark` 和 OAuth Lark properties，只输出 hash/sample，不返回真实用户名、姓名、邮箱、手机号。
- `FeishuOrganizationSyncConfig`、最近 `FeishuOrganizationSyncRun`、最近 dry-run history：提供 source alias、endpoint mode、run/history linkage。

诊断输出为聚合 summary + limited issues：

- `status`: `disabled` / `empty` / `ok` / `warning` / `blocked`
- `riskLevel`: `none` / `low` / `medium` / `high` / `critical`
- `counts`: 按风险类型计数
- `issues`: 只包含 stable issue id、risk level、type、safe summary、stable hashes、recommended action、blocked reason、run/history linkage
- `redaction`: 标记 redaction version 和是否已脱敏

### Risk classification

P0 风险类型：

- `duplicate_user_id_binding`：同一 source tenant + `user_id` 映射多个本地用户或 mapping 与 `User.Lark` 指向不一致，默认 `critical`。
- `local_user_multi_tenant_binding`：同一 local user 同时关联多个 tenant/user_id，默认 `high`。
- `legacy_identifier_split`：`user_id`、`open_id`、`union_id` 的兼容匹配命中不同本地用户，默认 `high`。
- `missing_tenant_key`：mapping 或 OAuth property 缺少 tenant key，默认 `medium`。
- `endpoint_mode_mismatch`：OAuth property 记录的 endpoint mode 与当前同步配置不一致，默认 `medium`。

### API

新增只读 API：

- `GET /api/feishu-org-sync/user-binding-conflicts?organization=<org>&limit=<n>&includeOk=<bool>`

该 API 复用 Feishu organization sync 的组织边界和 admin 鉴权。响应不得包含 raw Contact payload、手机号、邮箱、真实姓名、token、Cookie、私有 URL、真实 `open_id`、`union_id`、`user_id` 明细。

### Frontend

在飞书组织同步页面增加“绑定冲突 / 身份匹配诊断”区域：

- 当配置未启用或未配置时显示 disabled 状态。
- 加载中显示 compact loading。
- 无风险显示 empty/ok 状态和最近 linkage。
- 有风险显示按 risk level 的紧凑表格，并可打开详情 Drawer 查看脱敏 JSON。
- 支持复制脱敏 JSON；导出使用浏览器下载 JSON 文件，不调用后端写入。

### Failure handling

诊断 API 只读，内部扫描错误返回 safe error summary，不执行修复或写入。前端错误不阻塞配置、连接测试、dry-run preview、history 或正式 run workflow。

## Alternatives

1. 直接把绑定风险塞进 dry-run preview：实现简单，但会让 preview 依赖完整本地用户扫描，且难以独立刷新或排查历史 run。
2. 新增可修复的冲突控制台：价值更高，但会触碰 User/mapping 写入和审批边界，超出 P0。
3. 推荐方案：新增只读诊断 console，先把风险透明化，后续再做 operator approval 或修复流程。
