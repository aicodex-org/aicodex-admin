## 1. 聚焦 RED 测试

- [x] 1.1 为组织树运营页补充测试，覆盖无可管理部门业务文案、alias 不直出和摘要卡紧凑密度。
- [x] 1.2 为组织目录质量页补充测试，覆盖筛选、表格标签和修复计划使用可读原因标签，同时保留后端稳定 alias 值。
- [x] 1.3 运行聚焦 Jest 并确认新增断言按预期因缺少业务文案/密度行为失败。

## 2. 前端实现

- [x] 2.1 增加本地化 alias 到业务标签的 helper，并补充 zh/en locale key。
- [x] 2.2 将可读 alias 标签应用到组织树运营页 Alert、摘要补充、诊断原因和空态。
- [x] 2.3 将可读 alias 标签应用到组织目录质量页原因筛选、标签、修复计划/action 标签和 blocked 诊断展示。
- [x] 2.4 收紧组织树运营页摘要密度，用 scoped 布局改动让移动端节点列表和诊断区域更早出现。

## 3. 验证与回传

- [x] 3.1 运行本 change 和全部 active changes 的 OpenSpec strict 验证。
- [x] 3.2 运行 worker prompt 要求的前端 gate、typecheck、聚焦 Jest/coverage、build 和 diff 检查。
- [x] 3.3 写入脱敏 worker report，包含 branch、base、HEAD、验证摘要、写集、剩余风险和主控决策字段。
- [x] 3.4 整理一个逻辑 commit，并保持 worker 分支等待主控 review/continue/merge 决策，不触碰 `test` 或 `hfl-test-base`。

## 4. 覆盖率返工

- [x] 4.1 为组织树运营页补充高价值覆盖率测试，覆盖未知 alias 可读兜底、只读边界/下一步建议、摘要卡双列密度、无来源/无批次 fallback、刷新回退和筛选请求稳定参数。
- [x] 4.2 重跑聚焦 Jest coverage，确认 `OrganizationTreeOperationsPage.js`、`OrganizationDirectoryQualityPage.js` 和 overall statements/lines/functions 均达到 85% 归档前门槛。
- [x] 4.3 更新 `verification.md` 与脱敏 report，记录最终覆盖率、验证命令和主控决策字段。
