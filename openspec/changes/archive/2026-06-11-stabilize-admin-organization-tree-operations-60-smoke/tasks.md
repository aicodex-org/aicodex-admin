## 1. 状态和口径确认

- [x] 1.1 确认当前工作区在 `hfl-test/stabilize-admin-organization-tree-operations-60-smoke`，且基于最新 `test`。
- [x] 1.2 阅读 `admin-organization-tree-operations` 主规格、已有 Bruno smoke 和组织边界路线清单。
- [x] 1.3 明确 60 smoke 口径：部署健康、页面入口、诊断字段、非空树、安全刷新/重建、审计和脱敏记录。

## 2. Smoke 资产

- [x] 2.1 复核现有 Bruno 诊断和 `refresh_status` 请求，确保普通空树不会被记为非空能力通过。
- [x] 2.2 新增受控 `refresh_read_model` Bruno 请求，默认关闭，必须显式设置开关才触发。
- [x] 2.3 更新 Bruno README/runbook，说明 60 smoke 环境变量、脱敏要求和重建动作开关。

## 3. 60 运行态验证

- [x] 3.1 部署 60 测试环境到当前工作分支并确认 health 通过。
- [x] 3.2 运行 Bruno 诊断和只读刷新 smoke，使用已知非空组织树测试账号或受控 fixture。
- [x] 3.3 如具备验证窗口，运行受控 `refresh_read_model` smoke 并确认返回稳定状态和脱敏审计信号；否则记录未执行原因。
- [x] 3.4 通过浏览器或等价方式验证组织树运营入口可访问，树视图/列表视图和刷新诊断可用。

## 4. 验证记录和路线清单

- [x] 4.1 更新 `verification.md`，记录脱敏命令、结果、核心字段、非空树结论、刷新/重建结果和剩余风险。
- [x] 4.2 同步组织边界路线清单中 admin 组织树运营化 60 smoke 状态。

## 5. 归档和收尾

- [x] 5.1 运行 `openspec validate stabilize-admin-organization-tree-operations-60-smoke --strict`。
- [x] 5.2 运行 `openspec validate --changes --strict`、`openspec validate --specs --strict` 和 `git diff --check`。
- [x] 5.3 运行相关 Go/前端测试或说明本 change 仅改 smoke 文档/Bruno 时生产代码覆盖率为 N/A。
- [x] 5.4 完成归档前 review、archive、squash/force-push，交付 merged-ready 状态。
