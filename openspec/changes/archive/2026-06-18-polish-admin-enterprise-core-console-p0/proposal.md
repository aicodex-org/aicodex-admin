## Why

Admin 企业认证中心当前核心页面仍暴露两个 P0 体验问题：一方面部分页面像普通 CRUD 后台，缺少成熟企业控制台的密度、层次和操作面；另一方面前期新增的身份资产关系、接入预检、治理任务等横向能力在总览和页面顶部过于显眼，会让管理员先学习治理概念，而不是先处理身份覆盖、应用接入、同步健康和审计风险。

本 change 聚焦四个已存在核心页面的视觉系统和信息密度收口：身份治理总览、应用接入中心、接入预检、组织目录质量/组织树运营。目标是减少显眼入口和解释性卡片，保留既有路由和能力，把技术诊断字段降级为详情证据，使首屏更像可操作的企业认证中心。

## What Changes

- 压缩身份治理总览的能力入口，把首页回答范围收敛到身份覆盖、应用接入、同步/审计健康和当前最该处理事项。
- 调整 `/applications`：降低上方治理摘要高度，让表格主体更早出现；弱化 Logo、横向滚动和多按钮操作负担；危险操作不再作为最醒目的行内按钮。
- 调整 `/access-wizard`：保留预检流程和路由，但降低独立“大中心”感，压缩域卡、缺口卡、安全边界标签和解释性区域。
- 调整组织目录质量/组织树运营页面：把 `readModelSource`、`orgVersion`、`scopeVersion`、`batch`、`FRESH` 等工程字段降级到技术详情/诊断详情区域，主视觉优先展示目录健康、同步来源、异常节点和最近同步结果。
- 调整 `/records`：主表从 raw 运维字段、payload、trace 和 reason-like 文本收敛为事件类型、审计对象、结果、风险级别、证据状态、操作者和时间；raw 细节只在详情抽屉折叠区域展示，并默认脱敏。
- 调整 `/wecom-org-sync` 和 `/feishu-org-sync`：移动端按钮组、配置 Row/Col 和表格 wrapper 不再造成页面级横向滚动。
- 同步相关测试、zh/en i18n、OpenSpec tasks 和验证记录。

## Capabilities

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 增加核心页面 P0 polish 的验收要求，覆盖总览、应用接入、接入预检、组织目录质量/组织树运营的视觉系统、首屏密度、技术诊断降级和浏览器验证。

## Impact

- Affected frontend areas: `web-admin/src/IdentityConsoleOverview.js`, `web-admin/src/ApplicationAccessCenter.js`, `web-admin/src/ApplicationListPage.js`, `web-admin/src/AccessWizardPage.tsx`, `web-admin/src/OrganizationDirectoryQualityPage.js`, `web-admin/src/OrganizationTreeOperationsPage.js`, `web-admin/src/RecordListPage.js`, `web-admin/src/recordAuditPresentation.ts`, `web-admin/src/WecomOrganizationSyncPage.js`, `web-admin/src/FeishuOrganizationSyncPage.js`, shared enterprise identity console layout/styles and zh/en locale resources.
- Affected tests: focused React/Jest tests for the four core pages and any touched shared layout behavior.
- No backend write behavior, OAuth/OIDC callback execution, Gateway publish/projection/cleanup/receipt, production/like-production configuration, secrets, `test` branch merge or `hfl-test-base` push is included in this worker delivery.
