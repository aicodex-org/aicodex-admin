# Design

## Current Code

- `admin/object/platform_api_mapping.go` 已提供只读 readiness 聚合，响应包含 counts、blocked reason counts、filters 和 candidate list。
- `admin/controllers/platform_api_mapping.go` 已通过 `/api/get-platform-api-user-mapping-readiness` 暴露只读接口。
- `web-admin/src/PlatformApiMappingPage.js` 已在用户映射页签展示 readiness counts、category/mappingStatus 筛选和 `subjectCount=0 + mapping_missing` 提示。
- `api-tests/bruno/aicodex-admin/README.md` 已记录 readiness smoke 的基本排查顺序。

## Decisions

### 1. Guidance 作为只读 contract 附加到 readiness 响应

新增 `remediationGuidance` 字段，按 readiness category 返回稳定 guidance。该字段只由 Admin 服务端静态构造，不依赖真实环境配置，不触发写入，也不读取 API/Insight/gateway 数据。

每条 guidance 至少包含：

- `category`
- `code`
- `summary`
- `operatorActions`
- `minimumUnblockCondition`
- `boundary`

### 2. Guidance 覆盖所有 readiness category

必须覆盖：

- `active_publishable`
- `tombstone_publishable`
- `mapping_missing`
- `mapping_untrusted`
- `lifecycle_not_publishable`
- `source_metadata_unavailable`
- `lineage_freshness_unavailable`

`active_publishable` / `tombstone_publishable` 也给出安全说明，避免 operator 把只读 readiness 当作 gateway 授权事实。

### 3. 前端只展示，不自动修复

前端在现有 readiness 面板内展示当前筛选 category 对应 guidance；未筛选时展示全部 category 的简短操作卡片。它不新增写入按钮，不自动带入 mapping 编辑表单。

### 4. Runbook 记录可执行排查步骤和禁止外推

README 补充 category 到 remediation 的映射，要求验证记录只写 category/code/counts/alias，不写完整响应体、真实账号、手机号、邮箱、完整组织树或完整 organizationId。

## Testing

- 后端 TDD：先添加 Go 测试，断言 readiness 响应包含所有 category 的 remediation guidance，并且 `mapping_missing` / `mapping_untrusted` / freshness guidance 包含明确操作和边界。
- 前端 TDD：先添加页面测试，断言 readiness 面板展示 guidance 并随 category 筛选调用只读 API。
- 运行聚焦 Go 测试、前端相关测试、受影响 Go package coverage、OpenSpec strict validate 和 `git diff --check`。

## Risks

- Guidance 文案可能随 operator 经验迭代；通过稳定 `code` 和 category 保持测试/自动化可依赖。
- 本 change 不证明真实测试环境已有 publishable subject；subject count gate 仍依赖另行授权的受控 fixture。
