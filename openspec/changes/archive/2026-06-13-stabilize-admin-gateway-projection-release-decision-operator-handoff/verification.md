# Verification

## 预实施门禁

- 命令：`git status --short --branch`
  - 结果：启动时位于 `hfl-test-base...origin/hfl-test-base`，工作区干净。
- 命令：`git config --get branch.hfl-test-base.merge`
  - 结果：`refs/heads/hfl-test-base`。
- 命令：`git pull --ff-only origin hfl-test-base`
  - 结果：`Already up to date.`。
- 命令：`openspec validate stabilize-admin-gateway-projection-release-decision-operator-handoff --strict`
  - 结果：通过。
- 命令：`git diff --check`
  - 结果：通过。

## TDD 证据

- RED 命令：`node --test .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionReleaseDecision.test.js`
  - 结果：新增 handoff 测试因 `createGatewayProjectionReleaseDecisionHandoff is not a function` 失败，证明缺少 operator handoff wrapper。
- GREEN 命令：`node --test .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionReleaseDecision.test.js`
  - 结果：14 个测试通过，覆盖敏感字段 fail-closed、空证据、required mapping not checked、source freshness、mapping readiness、contract/config、unknown observability status、controlled smoke ready 和不能外推边界。

## 自动化验证

- 命令：`node --test .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionObservabilityPreflight.test.js .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionReadinessSummary.test.js .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionReleaseDecision.test.js`
  - 结果：27 个测试通过。
- 命令：`node --check .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionReleaseDecision.js; node --check .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionReleaseDecision.test.js`
  - 结果：语法检查通过。
- 命令：`node --test --experimental-test-coverage .\api-tests\bruno\aicodex-admin\scripts\gatewayProjectionReleaseDecision.test.js`
  - 结果：14 个测试通过；受影响实现文件 `gatewayProjectionReleaseDecision.js` 行覆盖率 98.56%，函数覆盖率 100.00%，达到 85% 目标。该 coverage 进程同时统计 imported preflight/readiness helper，all files 行覆盖率 90.16%。
- 命令：`openspec validate stabilize-admin-gateway-projection-release-decision-operator-handoff --strict`
  - 结果：通过。
- 命令：`git diff --check`
  - 结果：通过。

## 归档后验证

- 命令：`openspec archive stabilize-admin-gateway-projection-release-decision-operator-handoff --skip-specs --yes`
  - 结果：change 已归档到 `openspec/changes/archive/2026-06-13-stabilize-admin-gateway-projection-release-decision-operator-handoff/`。主规格已在归档前手工同步，因此使用 `--skip-specs` 避免重复写入同一 requirement。
- 命令：`openspec validate --specs --strict`
  - 结果：14 个 spec 通过，0 失败。
- 命令：`openspec validate --changes --strict`
  - 结果：3 个 active change 通过，0 失败。
- 命令：`git diff --check`
  - 结果：通过。

## 剩余风险和边界

- 未连接真实 Admin runtime、真实 DB、真实 fixture、生产或类生产环境；本 change 仅验证本地 Bruno/operator JS wrapper 和 OpenSpec/README。
- `release=release_after_report` 只允许协调层进入受控 smoke 准备，不代表真实 publish 成功、gateway ingestion 成功、authorization facts 生效或完整 projection 业务成功。
- Handoff 输出不得包含真实地址、token、Cookie、账号、手机号、邮箱、完整 organizationId、完整组织树、完整 gateway response、完整 readiness candidates 或完整 source metadata。
