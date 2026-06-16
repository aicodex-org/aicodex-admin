# Verification

## 启动门禁

- `git status --short --branch`: 工作区起始状态位于 `hfl-test-base...origin/hfl-test-base`，无短状态改动。
- `git branch --show-current`: `hfl-test-base`。
- `git config --get branch.hfl-test-base.merge`: `refs/heads/hfl-test-base`。
- `git rev-parse HEAD`: `1a26f8f36244b4dc34f97e78e88aadff2db223a2`。
- `git fetch origin hfl-test-base`: 通过，`origin/hfl-test-base` 仍为 `1a26f8f36244b4dc34f97e78e88aadff2db223a2`。
- 从 `origin/hfl-test-base` 创建 `hfl-test/stabilize-admin-projection-source-freshness-deploy-preflight`。

## RED / GREEN

- RED: `node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.test.js`
  - 结果：失败，原因是 `Cannot find module './gatewayProjectionObservabilityPreflight'`，确认 preflight 模块尚未实现。
- GREEN: `node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.test.js`
  - 结果：通过，6/6 tests passed。

## 聚焦验证

- `node --check api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.js`
  - 结果：通过，无语法错误输出。
- `node --check api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.test.js`
  - 结果：通过，无语法错误输出。
- `node --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.test.js`
  - 结果：通过，覆盖旧 runtime shape 返回 `environment_deploy_stale`、缺 latest audit 返回 `environment_deploy_stale`、完整 source freshness shape 返回 `ok`、subject count 不足返回 `no_publishable_subjects`、敏感字段泄漏返回 `sanitization_failed`，并确认 `projection_token_missing` 这类稳定诊断分类文本不会被误判为凭据泄漏。
- 无密 dry-run:
  - 命令：`node -e "const {evaluateGatewayProjectionObservabilityPreflight}=require('./api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight'); const result=evaluateGatewayProjectionObservabilityPreflight({status:'ok',data:{publisher:{enabled:true,configured:true,freshnessTtlSeconds:1800},refresh:{enabled:true,intervalLessThanTtl:true}}},{requireLatestAudit:true}); console.log(JSON.stringify(result))"`
  - 结果：返回 `status=blocked`、`alias=environment_deploy_stale`、`reason=latest_publish_audit_missing`，只包含脱敏 summary。

## 覆盖率

- `node --experimental-test-coverage --test api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.test.js`
  - 统计对象：`api-tests/bruno/aicodex-admin/scripts/gatewayProjectionObservabilityPreflight.js`。
  - 结果：line coverage 85.96%，function coverage 100.00%，达到本 change 实施代码 85% line coverage 门槛。

## OpenSpec / Diff

- `openspec validate stabilize-admin-projection-source-freshness-deploy-preflight --strict`
  - 结果：通过，`Change 'stabilize-admin-projection-source-freshness-deploy-preflight' is valid`。
- `openspec validate --changes --strict`
  - 结果：通过，4 changes passed, 0 failed。
- `openspec validate --specs --strict`
  - 结果：通过，14 specs passed, 0 failed。
- `git diff --check`
  - 结果：通过，无输出。

## Bruno runner

- `bru --version`
  - 结果：本机可用版本为 `3.2.2`。
- `bru run "50-Gateway Projection 观测/运行态观测.yml" --env local`（在 `api-tests/bruno/aicodex-admin` 下执行）
  - 结果：runner 成功定位请求，但本地 Admin 服务未启动，HTTP 层返回 `connect ECONNREFUSED 127.0.0.1:8000`，因此未进入 after-response preflight 脚本。该结果只证明 collection 入口可被 runner 解析，不证明运行态 smoke 通过。

## 未运行项与剩余风险

- 未连接真实 60 环境，也未执行需要真实登录态/私有 baseUrl 的 Bruno 成功请求。原因：本 change 范围是仓库内只读 preflight/guardrail 固化，prompt 禁止无授权真实环境变更和真实 fixture 写入；本轮用 Node dry-run 覆盖不含私有凭据的 static preflight，并用本地 runner 确认请求入口可解析但本地服务不可连。
- 本 change 不能证明 60 已部署包含 `sourceConnectionSummary` 的新包；只能证明 Admin 仓库 preflight 会把旧 shape 或缺 latest audit 稳定标记为 `environment_deploy_stale`，不会外推为完整 projection 业务成功。
- 最小解除条件：测试环境部署包含当前 Admin observability shape 的构建包，并让 `/api/gateway-projection/observability` 在 latest publish audit 中返回 `sourceConnectionSummary.total/statusCounts/freshnessCounts/hasStaleFreshness/hasUnavailableFreshness/hasUnknownFreshness`。
