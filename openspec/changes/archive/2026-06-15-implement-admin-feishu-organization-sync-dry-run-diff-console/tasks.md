## 1. OpenSpec 与实施前 review

- [x] 1.1 完成 proposal、design、tasks 和 spec delta，并运行 `openspec validate implement-admin-feishu-organization-sync-dry-run-diff-console --strict`
- [x] 1.2 完成实施前 review loop，修复 Blocking/Fixable 后再进入实现

## 2. 后端 dry-run preview 模型与 diff

- [x] 2.1 新增 Feishu dry-run preview request/response、diff summary、reason counts、source aliases 和 diagnostics DTO/helper
- [x] 2.2 新增只读 dry-run preview service，复用 snapshot client 拉取 normalized snapshot，但不调用写入型 `ApplyFullSnapshot`
- [x] 2.3 实现部门 diff：create/update/soft-disable/unchanged/conflict/invalid 和 reason counts
- [x] 2.4 实现用户 diff：稳定 `user_id` 绑定、历史 `open_id`/`union_id` 回填候选、duplicate/conflict/invalid 分类和 reason counts
- [x] 2.5 实现用户-部门关系 diff：create/update/soft-disable/unchanged/conflict/invalid 和 unmapped reason counts
- [x] 2.6 确保 dry-run 不写 `Group`、`User`、Feishu 映射、平台主数据、`ExternalIdentity`、`OrgSyncBatch`、Gateway facts 或 run final state

## 3. Fail-closed 与脱敏

- [x] 3.1 对缺少 secret、masked secret 无法还原、无效凭证、Contact 权限不足、runtime authorization unavailable 和 contract mismatch 返回稳定 diagnostics
- [x] 3.2 脱敏 source alias 和 `safeSummary`，不输出 secret、token、raw payload、完整组织树、用户列表、手机号、邮箱、`open_id`、`union_id`、`user_id`
- [x] 3.3 保持真实 Feishu/Lark Contact v3 凭证验证为 runtime gate；本地实现不读取真实 secret、不触发真实租户同步、不写真实 fixture

## 4. API 与权限

- [x] 4.1 新增 `/api/feishu-org-sync/dry-run-preview` 或等价明确 dry-run endpoint，沿用现有 Feishu sync 管理员权限边界
- [x] 4.2 覆盖组织管理员、全局管理员、跨组织不可见、未配置或 disabled config 的安全返回行为
- [x] 4.3 保持 `/api/feishu-org-sync/...` 模块命名，不修改 API/Insight owner 边界

## 5. Web Admin

- [x] 5.1 在 `FeishuOrganizationSyncBackend` 增加 dry-run preview 调用封装
- [x] 5.2 在飞书组织同步页面增加 preview 操作区、loading/error 状态和最近 preview 摘要
- [x] 5.3 展示部门、用户、成员关系 diff summary、reason counts、source aliases 和安全 diagnostics
- [x] 5.4 保持工作型后台信息密度，使用短标签/聚合统计，不增加营销式或大段说明文案

## 6. 测试与覆盖率

- [x] 6.1 先写 Go object 聚焦测试覆盖 dry-run 不写入、diff 分类、empty snapshot、conflict/invalid、软禁用预估和脱敏
- [x] 6.2 补充 controller/router 聚焦测试覆盖 API 响应、权限、未配置/disabled/fail-closed 场景
- [x] 6.3 补充前端 backend/page 聚焦测试覆盖 dry-run 请求、summary 展示、诊断展示和脱敏
- [x] 6.4 运行 changed-function / touched production function 覆盖率检查，目标关键实现函数达到 85%；如不能达到，在 `verification.md` 写明原因和补救路径

## 7. 验证、归档与回传

- [x] 7.1 运行 `openspec validate implement-admin-feishu-organization-sync-dry-run-diff-console --strict`
- [x] 7.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`
- [x] 7.3 运行 Go focused tests、前端 focused tests/build 和 `git diff --check`
- [x] 7.4 更新 `verification.md`，记录命令、结果、覆盖率证据和真实凭证 runtime gate
- [x] 7.5 完成 OpenSpec pre-archive review；无 Blocking/Fixable 后 archive change 并验证主规格
- [ ] 7.6 整理为相对最新 `origin/hfl-test-base` 单 commit，显式 push 工作分支和 `origin/hfl-test-base`，禁止 push `test`，禁止 force-push 共享 `hfl-test-base`
- [ ] 7.7 合入后切回 `hfl-test-base`，确认 clean，并删除本地/远端已合入工作分支
- [ ] 7.8 写入完整 agent report，并给协调线程短回传
