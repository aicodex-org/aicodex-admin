## 验证记录

验证日期：2026-06-09

## 命令与结果

- `go test ./object -run 'TestOrganizationSync|TestWecomOrganizationSync'`
  - 结果：通过。
  - 覆盖：通用调度器默认关闭、cron/时区校验、窗口去重、stale fire 恢复、缺 executor、派发结果、错误脱敏、真实 sqlite 唯一约束、非法 schedule 失败记录后继续扫描、WeCom scheduled trigger、已有 running 跳过、配置 schedule 字段保存/读取，以及保存定时设置不清空最近派发元信息。

- `go test ./controllers`
  - 结果：通过。
  - 覆盖：控制器包编译，确认 WeCom 配置响应新增字段后接口层无编译回归。

- `yarn install --frozen-lockfile`
  - 结果：通过。
  - 说明：本地原先缺少 `web-admin/node_modules`，已按 `yarn.lock` 安装依赖；安装过程仅出现 peer dependency warning。

- `yarn test --watchAll=false WecomOrganizationSyncPage.test.js WecomOrganizationSyncBackend.test.js`
  - 结果：通过，`2` 个 test suite、`18` 个测试全部通过。
  - 说明：输出包含既有 React 18 `ReactDOM.render`、fake timer 和 `act(...)` warning，未导致测试失败；本次未处理这些既有测试框架 warning。

- `openspec validate "add-cluster-safe-organization-sync-scheduler" --type change --strict`
  - 结果：通过，输出 `Change 'add-cluster-safe-organization-sync-scheduler' is valid`。

- `git diff --check`
  - 结果：通过，无空白错误输出。

## 60 环境部署与真实企业微信同步验证

- 远端测试部署
  - 命令：在 60 环境 `~/fanley/app/aicodex-admin` 执行远端部署脚本 `./deploy-aicodex-admin.sh --branch hfl-test/add-cluster-safe-organization-sync-scheduler up`。
  - 结果：通过。远端切换到提交 `c40caf96 feat(sync): 新增集群安全组织同步调度器`，镜像构建成功，容器重建后健康检查通过。
  - 说明：验证记录只保留环境别名和脚本路径，不记录真实内网地址、账号、密码或 Cookie。

- 60 环境数据库结构检查
  - 命令：通过 60 环境 PostgreSQL 容器查询 `organization_sync_schedule`、`organization_sync_schedule_fire` 表和索引。
  - 结果：通过。两张表已创建；`organization_sync_schedule_fire(schedule_name, window_start)` 唯一索引存在；`organization_sync_schedule(provider, job_type, organization)` 唯一索引存在。

- 60 环境真实手动同步
  - 命令：使用 60 admin 测试账号登录后调用 `/api/wecom-org-sync/runs` 启动目标企业微信组织同步，并轮询 `/api/wecom-org-sync/runs/{runId}`。
  - 结果：通过。手动 run 终态为 `succeeded`，`triggerType=manual`，拉取 `254` 个部门、`1045` 个用户，更新 `1065` 条成员关系。

- 60 环境真实定时同步
  - 命令：临时通过 `/api/wecom-org-sync/config` 将目标组织的 schedule 改为启用且 cron 为每分钟，观察 scheduler 创建 scheduled run 后立即恢复为默认关闭，再轮询 scheduled run 终态。
  - 结果：通过。新增 fire 记录状态为 `dispatched`，`attemptCount=1`，关联 scheduled run；scheduled run 终态为 `succeeded`，`triggerType=scheduled`，拉取 `254` 个部门、`1045` 个用户，更新 `1065` 条成员关系。
  - 清理：验证后已将 60 环境 schedule 恢复为 `scheduleEnabled=false`、`scheduleCron=0 2 * * *`、`scheduleTimezone=Asia/Shanghai`，避免持续每分钟触发。

- 60 环境 MCP Playwright 页面冒烟
  - 命令：使用 MCP Playwright 登录 60 admin 后打开 `/wecom-org-sync` 页面，读取页面快照和页面文本。
  - 结果：通过。页面显示“定时同步”“同步记录”和分页；运行记录中可区分“定时”和“手动”，最新 scheduled run 展示为“成功 / 定时 / 已完成”；浏览器控制台无 warning/error 级消息。

## 剩余风险

- 60 环境已完成一次真实 scheduled sync；生产环境仍需在正式库部署后确认 `organization_sync_schedule_fire(schedule_name, window_start)` 唯一约束存在。
- 多节点同时抢同一 fire 的行为仍主要由服务层测试、sqlite 唯一约束测试和 60 环境单节点真实同步验证共同覆盖；60 环境本次未扩展为双节点集群压测。
- 前端测试通过但仍有项目既有 React 18/testing-library warning；这些 warning 与本次调度能力无直接关系。
