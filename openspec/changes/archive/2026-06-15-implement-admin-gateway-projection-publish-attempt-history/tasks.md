# Tasks

## 1. OpenSpec

- [x] 1.1 补齐 proposal、design、tasks、spec delta、verification。
- [x] 1.2 完成 `openspec-pre-implementation-review`，修复 Blocking/Fixable 后再实施。

## 2. Backend

- [x] 2.1 新增 gateway projection publish attempt record DTO/model、query DTO 和脱敏 clone helper。
- [x] 2.2 新增 attempt history store/service，支持 record、list、detail 和 organization/source/status/time 筛选。
- [x] 2.3 在 manual publish preflight blocked、success、failure 路径记录 `source=manual` attempt。
- [x] 2.4 在 shared build + publish 入口记录 `source=scheduled` attempt，覆盖 refresh worker / sync trigger。
- [x] 2.5 新增 admin-only controller/router API：列表和详情查询。
- [x] 2.6 更新 admin-only authz 规则，保证 history 查询不放宽 manual publish 或其它 projection 操作权限。
- [x] 2.7 补 Go 聚焦测试，覆盖记录、筛选、详情、manual blocked/success/failure、scheduled 记录、manual/scheduled 不重复错标和脱敏边界。

## 3. Frontend

- [x] 3.1 增加 publish attempts backend API 封装。
- [x] 3.2 在 Platform API mapping / projection 操作区增加 attempts 表格、筛选、刷新和详情展示。
- [x] 3.3 手动 publish 完成后刷新 attempts。
- [x] 3.4 补前端相关测试或按项目现有脚本完成构建验证。

## 4. Verification

- [x] 4.1 运行 `openspec validate implement-admin-gateway-projection-publish-attempt-history --strict`。
- [x] 4.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`。
- [x] 4.3 运行后端聚焦测试和覆盖率检查。
- [x] 4.4 运行前端相关测试和 build。
- [x] 4.5 运行 `git diff --check`。
- [x] 4.6 更新 `verification.md`，记录命令、结果、覆盖率和剩余风险。

## 5. Archive / Delivery

- [x] 5.1 完成 `openspec-pre-archive-review`，修复 Blocking/Fixable。
- [x] 5.2 archive change 并同步主规格。
- [x] 5.3 整理为单个本 change commit，显式 push 工作分支。
- [x] 5.4 基于最新 `origin/hfl-test-base` 复验后 ff-only 合入并显式 push `hfl-test-base`，不触碰 `test`。
- [x] 5.5 删除工作分支并写入最终交接报告。
