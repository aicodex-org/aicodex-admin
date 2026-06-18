## 1. OpenSpec

- [x] 1.1 完成 proposal、design、delta specs 和 tasks。
- [x] 1.2 运行 target OpenSpec strict 校验。

## 2. Frontend

- [x] 2.1 先更新企业微信和飞书页面测试，覆盖序号默认无常驻复制图标、点击复制运行 ID、定时同步关闭收起和启用展开。
- [x] 2.2 将企业微信正式同步记录序号列改为纯数字默认展示，并通过 hover/click 保留运行 ID 查看和复制。
- [x] 2.3 将飞书正式同步记录序号列改为纯数字默认展示，并通过 hover/click 保留运行 ID 查看和复制。
- [x] 2.4 将企业微信定时同步配置改为未启用时收起 Cron、时区和最近调度，启用后展开。
- [x] 2.5 将飞书定时同步配置改为未启用时收起 Cron、时区和最近调度，启用后展开。

## 3. Validation

- [x] 3.1 运行增量 TypeScript 门禁、typecheck、聚焦 Jest 和必要 build。
- [x] 3.2 运行 OpenSpec changes/specs strict 校验和 `git diff --check`。
- [x] 3.3 完成 archive、单 commit、push 工作分支，并按要求合入 `hfl-test-base`。
