## 1. OpenSpec

- [x] 1.1 完成 proposal、design、delta specs 和 tasks。
- [x] 1.2 运行 target OpenSpec strict 校验。

## 2. Frontend

- [x] 2.1 先更新企业微信和飞书页面测试，覆盖序号列、运行 ID 排障入口、执行人省略和飞书定时同步标签。
- [x] 2.2 将企业微信正式同步记录首列改为分页连续 `序号`，并保留完整运行 ID tooltip/copy。
- [x] 2.3 将飞书正式同步记录首列改为分页连续 `序号`，并保留完整运行 ID tooltip/copy。
- [x] 2.4 统一两个 provider 执行人列长文本省略和统计数字稳定样式。
- [x] 2.5 为飞书定时同步输入补齐 `Cron 表达式`、`时区`标签。
- [x] 2.6 修正飞书正式同步记录 `错误摘要` 表头换行。

## 3. Validation

- [x] 3.1 运行增量 TypeScript 门禁、typecheck、聚焦 Jest 和必要 build。
- [x] 3.2 运行 OpenSpec changes/specs strict 校验和 `git diff --check`。
- [x] 3.3 完成 archive、单 commit、push 工作分支，并按要求合入 `hfl-test-base`。
