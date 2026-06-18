## 1. OpenSpec

- [x] 1.1 完成 layout polish 的 proposal、design、delta specs 和 tasks。
- [x] 1.2 运行 target OpenSpec strict 校验。

## 2. Frontend

- [x] 2.1 先更新企业微信和飞书页面聚焦测试，覆盖新字段标签和短表头。
- [x] 2.2 调整企业微信配置区为目标组织/空位、App ID/App Secret、同步选项/定时同步三行布局。
- [x] 2.3 将企业微信正式同步记录表头短化为 `部门`、`用户`。
- [x] 2.4 将飞书正式同步记录表头短化为 `部门`、`用户`、`关系`，避免标题行换行。

## 3. Validation

- [x] 3.1 运行增量 TypeScript 门禁、typecheck、聚焦 Jest 和必要 build。
- [x] 3.2 运行 OpenSpec changes/specs strict 校验和 `git diff --check`。
- [x] 3.3 完成 archive、单 commit、push 工作分支，并按要求合入 `hfl-test-base`。
