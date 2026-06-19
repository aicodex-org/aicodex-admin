## 1. 后端 dry-run 与历史

- [x] 1.1 为企业微信 dry-run preview 服务补聚焦单测，覆盖成功预览、配置失败 fail-closed、history 写入失败不阻断、敏感摘要脱敏。
- [x] 1.2 实现 `WecomOrganizationSyncDryRunPreviewService`、安全 diff/diagnostics/reason counts 和轻量 history model/store/service。
- [x] 1.3 注册 WeCom dry-run history Xorm additive schema，并确保不影响现有正式同步 run/schema。
- [x] 1.4 新增 controller/router/authz 解析测试与实现，暴露 `/api/wecom-org-sync/dry-run-preview`、`/api/wecom-org-sync/dry-run-history`、详情只读接口。

## 2. 前端预览体验

- [x] 2.1 为企业微信 backend wrapper 新增 dry-run preview/history 调用测试并实现接口函数。
- [x] 2.2 为企业微信页面新增 TS/TSX 聚焦测试，覆盖预览按钮、结果 Modal、历史 Modal、loading/empty/error/long text 状态。
- [x] 2.3 实现企业微信页面 `预览影响`、`预览历史`、紧凑结果 Modal 和历史详情展示，保持主页面简洁。
- [x] 2.4 补齐 zh/en i18n 或确认沿用现有页面局部文案模式，并避免新增敏感信息展示。

## 3. 验证与收口

- [x] 3.1 运行 target OpenSpec validate、changes/specs strict、`git diff --check`。
- [x] 3.2 运行相关 Go focused tests，记录 changed-function 覆盖证据。
- [x] 3.3 运行 `web-admin` incremental TypeScript gate、focused Jest、`yarn typecheck`，必要时运行 `yarn build`。
- [x] 3.4 完成 pre-archive 自检，同步主规格、archive change、整理单 commit，并按分支流程 push/ff-only 合入。
