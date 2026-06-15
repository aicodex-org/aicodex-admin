## 1. OpenSpec 与实施前 review

- [x] 1.1 完成 proposal、design、tasks 和 spec delta，并运行 `openspec validate implement-admin-feishu-organization-sync-run-diagnostics --strict`
- [x] 1.2 完成实施前 review loop，修复 Blocking/Fixable 后再进入实现

## 2. 后端诊断模型与映射

- [x] 2.1 新增 Feishu run diagnostics DTO/helper，输出 `failedStage`、`failureCategory`、`reasonCode`、`retryReadiness`、`operatorAction`、`safeSummary`、`stats` 和耗时
- [x] 2.2 实现失败阶段归一化：`config_validation`、`tenant_token`、`department_fetch`、`user_fetch`、`upsert_department`、`upsert_user`、`upsert_membership`、`projection`、`soft_disable`、`scheduler`
- [x] 2.3 实现 failure category / retry readiness / operator action 映射，覆盖凭证、权限、限流、租户不可用、契约不匹配、映射冲突、投影失败、部分同步和 unknown
- [x] 2.4 确保诊断输出脱敏，不包含 secret、token、raw response、完整组织树、用户列表、手机号、邮箱、`open_id`、`union_id`、`user_id` 明细

## 3. 执行路径与调度诊断

- [x] 3.1 在配置校验、tenant token、部门拉取、用户拉取、apply/upsert、投影、软禁用失败路径写入稳定错误码或可派生诊断信息
- [x] 3.2 在 Feishu scheduled dispatch 路径补充安全失败分类与 retry readiness，不泄漏凭证或 Contact 明细
- [x] 3.3 保持真实飞书/Lark Contact v3 连接测试为 runtime gate；本地实现不读取真实 secret、不触发真实租户同步、不写真实 fixture

## 4. API 与权限

- [x] 4.1 扩展 run 列表/详情响应或新增 diagnostics endpoint，返回脱敏诊断对象
- [x] 4.2 覆盖 run detail 不存在、跨组织不可见或诊断不可用时的安全返回行为
- [x] 4.3 保持 `/api/feishu-org-sync/...` 模块命名和既有管理员权限边界，不修改 API/Insight owner 边界

## 5. Web Admin

- [x] 5.1 在 `FeishuOrganizationSyncBackend` 增加诊断字段或 endpoint 调用封装
- [x] 5.2 在飞书组织同步页面同步记录表/详情区展示失败分类、retry action、关键脱敏 counts、耗时和安全错误摘要
- [x] 5.3 保持工作型后台信息密度，使用短标签/聚合统计，不增加大段说明文案

## 6. 测试与覆盖率

- [x] 6.1 先写 Go object 聚焦测试覆盖 failure mapping、retry readiness、redaction、stats 和 detail unavailable
- [x] 6.2 补充 controller/router 聚焦测试覆盖 API 响应和权限/不存在场景
- [x] 6.3 补充前端 backend/page 聚焦测试覆盖诊断字段展示和脱敏
- [x] 6.4 运行 changed-function / touched production function 覆盖率检查，目标关键实现函数达到 85%；如不能达到，在 `verification.md` 写明原因和补救路径

## 7. 验证、归档与回传

- [x] 7.1 运行 `openspec validate implement-admin-feishu-organization-sync-run-diagnostics --strict`
- [x] 7.2 运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`
- [x] 7.3 运行 Go focused tests、前端 focused tests 和 `git diff --check`
- [x] 7.4 更新 `verification.md`，记录命令、结果、覆盖率证据和真实凭证 runtime gate
- [x] 7.5 完成 OpenSpec pre-archive review；无 Blocking/Fixable 后 archive change 并验证主规格
- [x] 7.6 整理为相对最新 `origin/hfl-test-base` 单 commit，显式 push 工作分支，禁止 push `test`
- [x] 7.7 写入完整 agent report，并给协调线程短回传
