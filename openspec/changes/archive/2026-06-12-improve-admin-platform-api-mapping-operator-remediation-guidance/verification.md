# Verification

验证记录只写命令、结果、覆盖率、脱敏摘要和剩余风险；不写真实账号、手机号、邮箱、完整 organizationId、token、Cookie、私有 URL、完整响应体或真实 DB 状态。

## 2026-06-13

### TDD Red

- `go test ./object -run TestGetPlatformApiUserMappingReadinessIncludesOperatorRemediationGuidance -count=1`
  - 结果：失败，符合预期。
  - 失败原因：`PlatformApiUserMappingReadinessGuidance` 未定义，`readiness.RemediationGuidance` 字段不存在。
- `yarn test PlatformApiMappingPage.test.js --watchAll=false --runInBand`
  - 结果：失败，符合预期。
  - 失败原因：页面未渲染 `remediationGuidance` 中的 summary/action/unblock/boundary。

### 聚焦验证

- `go test ./object -run TestGetPlatformApiUserMappingReadiness -count=1`
  - 结果：通过。
  - 覆盖：readiness 分类、candidate filtering、display-only 不作为 join key、operator remediation guidance contract。
- `yarn test PlatformApiMapping --watchAll=false --runInBand`
  - 结果：通过，2 个 test suites / 5 个 tests 通过。
  - 备注：输出既有 React 18 `ReactDOM.render` warning，不影响本次测试通过。
- `yarn build`
  - 结果：通过，`Compiled successfully`。
  - 备注：输出既有 bundle size、Browserslist 和 `fs.F_OK` deprecation warning；`web-admin/build` 由 `.gitignore` 忽略，未纳入本 change。

### OpenSpec / Diff

- `openspec validate improve-admin-platform-api-mapping-operator-remediation-guidance --strict`
  - 结果：通过。
- `openspec validate --specs --strict`
  - 结果：通过，14 specs 通过。
- `openspec validate --changes --strict`
  - 结果：通过，4 active changes 通过。
- `git diff --check`
  - 结果：通过。

### Coverage

- `go test ./object -run TestGetPlatformApiUserMapping -count=1 -cover`
  - 结果：通过，package 级 coverage 为 0.8%。
  - 说明：该 package 很大，聚焦测试只覆盖 Platform API mapping 相关路径，不能代表全 package 覆盖率。
- `go test ./object -run TestGetPlatformApiUserMapping -count=1 -coverprofile platform_api_mapping.cover.out; go tool cover -func platform_api_mapping.cover.out`
  - 结果：通过。
  - 受影响实现函数：`buildPlatformApiUserMappingReadinessGuidance` 覆盖率 100.0%，`GetPlatformApiUserMappingReadiness` 覆盖率 85.0%。
  - 清理：已删除临时 `platform_api_mapping.cover.out`。
- `go test ./object -count=1 -cover`
  - 结果：失败，未得到全 package coverage。
  - 失败原因：既有全包测试依赖本地运行环境，当前环境缺 `conf/app.conf`，且 `TestDumpToFile` 尝试连接本机 MySQL 服务被拒绝。
  - 处置：本 change 使用聚焦测试和 changed-function coverage 作为可重复验证；全包 coverage 缺口需要单独配置本地测试 conf / DB 后再跑。

### 边界和剩余风险

- 未写真实 fixture，未创建、更新、确认或清理真实 `PlatformApiUserMapping`。
- 未查询、写入或清理真实 DB；未执行生产或类生产变更。
- 未触碰 API/Insight 仓库，未写 gateway authorization facts。
- 本 change 不证明真实环境已有 `subjectCount>=1` 或 tombstone subject fixture；真实 fixture readiness 仍需用户授权和受控测试窗口。
