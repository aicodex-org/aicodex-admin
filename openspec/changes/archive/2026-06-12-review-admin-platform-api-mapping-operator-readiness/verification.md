# Verification

> 本文件只记录脱敏验证结果。不得写入真实 IP、私有 URL、token、Cookie、真实账号、手机号、邮箱、完整组织明细或完整响应体。

## 2026-06-12 只读 Review

### 工作区

- 工作区：`D:\CodeRepo\LeagProject\aicodex\aicodex-admin`
- 初始分支：`hfl-test-base`
- 初始 HEAD：`e8214d855495e40bbdbf3b2167340b8a408344c6`
- `branch.hfl-test-base.merge`：`refs/heads/hfl-test-base`

### 只读证据

- `admin/object/platform_api_mapping.go`
  - 已存在 `PlatformApiUserMapping`，以 `organizationId + adminSubject` 为稳定映射键。
  - 已存在 `ApiUserId`、`MappingStatus`、`MappingSource`、`Lineage` 字段。
  - 已存在同组织 `adminSubject` 和 `apiUserId` 唯一性校验。
- `admin/controllers/platform_api_mapping.go`
  - 已存在 `GetPlatformApiUserMappings` 和 `UpdatePlatformApiUserMapping`。
  - 更新动作写入脱敏 `platform_api_mapping_audit`，使用主体 hash，不输出完整主体。
- `web-admin/src/PlatformApiMappingPage.js`
  - 已存在 API 用户映射编辑页、关键字搜索、`adminSubject`、`apiUserId`、`mappingStatus`、`mappingSource` 编辑。
  - 当前只读 review 未发现一等 publishable readiness 筛选、tombstone 候选筛选或 `mapping_missing` 反查入口。
- `admin/object/gateway_organization_projection.go`
  - 缺少确定 `apiSubjectId` 时记录 `mapping_missing`，不把缺失用户扩大为默认 allow 事实。
- `openspec/changes/archive/2026-06-11-stabilize-admin-gateway-projection-publishable-subject-fixture-readiness`
  - 已固化 active/tombstone fixture 前置条件和 subject count smoke 断言口径。

### 结论

- 结论：存在低风险 Admin operator readiness gap。
- 原因：基础映射维护能力已存在，但 operator 缺少聚合的 publishable subject readiness 入口或等价 runbook，用于从 `mapping_missing` 收敛到最小 active/tombstone fixture。
- 本 change 仅新增 OpenSpec proposal，不修改生产代码，不执行 60 fixture 写入。

### 实施前 Review

- `openspec-pre-implementation-review`
  - 结果：通过。
  - 结论：无 Blocking/Fixable；当前 change 可停在 proposal-only / review-ready，不进入生产代码实现。

### 归档前 Review

- `openspec-pre-archive-review`
  - 结果：通过。
  - 结论：无 Blocking；当前 change 是 proposal-only / operator readiness decision record，可归档并同步主规格。

### OpenSpec

- `openspec validate review-admin-platform-api-mapping-operator-readiness --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：通过，4 个 active change 校验通过。

### Diff 检查

- `git diff --check -- openspec/changes/review-admin-platform-api-mapping-operator-readiness`
  - 结果：通过。
- `git diff --check`
  - 结果：未通过。
  - 原因：工作区在复验时出现与本 change 无关的整文件换行/尾随空白 diff，涉及 `admin/object/user_util.go`、`admin/object/user_util_test.go`、旧 `fix-wecom-login-profile-fields` archive 和 `web-admin/public/ProviderHintRedirect.js`。这些文件未纳入本 change stage/commit，需由对应 owner 决定是否恢复或保留。

### 覆盖率

- 结果：N/A。
- 原因：当前只新增 OpenSpec proposal/design/tasks/spec/verification，未修改 Go、前端或测试代码。

### 剩余风险

- 60 fixture 写入未执行；需要用户授权并由 operator 使用受控测试数据执行。
- 本 change 只定义 operator readiness gap；后续 implementation change 仍需补 UI/API/runbook 细节和对应测试。
