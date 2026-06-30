## 1. OpenSpec 和边界确认

- [x] 1.1 创建并验证 OpenSpec proposal、design、tasks 和 delta spec，确认不触碰 backend/common/table/auth/provider/Application/Syncer/shell 写集。
- [x] 1.2 审计 P0 和可并入文件的现有导入、测试和动态数据边界，记录需要 deferred 的文件。

## 2. TSX 迁移实施

- [x] 2.1 将 `EntryPage`、`CaptchaPage`、`QrCodePage` 迁移为 `.tsx`，补齐局部 props/state/route 类型并保持行为不变。
- [x] 2.2 将 `basic/AppListPage`、`Dashboard`、`GridCards`、`SingleCard`、`CustomHead` 迁移为 `.tsx`，保留展示和数据契约。
- [x] 2.3 将 `account/WeComProfileSyncPanel`、`AccountAvatar` 和触碰测试迁移为 `.tsx` / `.test.tsx`，保留账号同步 API payload 和 UI 状态语义。
- [x] 2.4 评估并迁移可并入独立轻文件；若牵出受保护写集，则记录 deferred。

## 3. 验证和收口

- [x] 3.1 运行 OpenSpec strict validation、`git diff --check`、触碰 focused Jest、`yarn typecheck`、增量 TypeScript gate 和 `yarn build`。
- [x] 3.2 更新 `verification.md`，记录命令、结果、覆盖率口径、deferred 文件和剩余风险，且不写入敏感信息。
- [x] 3.3 完成归档前 review；若无阻断问题，执行 self-closeout：archive、同步主规格、单 commit 收敛、push `origin/hfl-test-base`、删除工作分支。
