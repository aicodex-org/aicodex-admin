# Verification

## 本地源码验证

- `openspec validate add-admin-service-credential-governance-diagnostic-actions --strict`: 通过。
- `openspec validate --changes --strict`: 通过，包含本 change 和历史 active changes。
- `openspec validate --specs --strict`: 通过，28 个主规格通过。
- `git diff --check`: 通过。
- `admin`: `go test -run ServiceCredentialGovernance ./object ./controllers -count=1 -timeout 240s`: 通过。
- `web-admin`: `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`: 通过。
- `web-admin`: `yarn typecheck`: 通过。
- `web-admin`: `yarn test ApplicationAccessCenter.test.tsx --runInBand --watchAll=false`: 通过，14/14 tests passed。
- `web-admin`: `yarn build`: 通过；存在既有 `Browserslist: caniuse-lite is outdated`、Node `fs.F_OK` deprecation 和 bundle size 提示。

## 覆盖率

- `admin/object`: `go test -run ServiceCredentialGovernance ./object -coverprofile ...` 后用 `go tool cover -func` 检查新增 `service_credential_governance_diagnostic.go`，新增诊断函数均达到 91.1% 或 100%；package total 受既有大包稀释，不作为本 change 覆盖率口径。
- `admin/controllers`: `go test -run ServiceCredentialGovernance ./controllers -coverprofile ...` 后用 `go tool cover -func` 检查 `application_access_service_credential_governance_status.go`，新增 `DiagnoseApplicationAccessServiceCredentialGovernanceConfig` 为 100%，同文件相关治理函数大多达到 86.5% 或以上；package total 受既有大包稀释。
- `web-admin`: `yarn test ApplicationAccessCenter.test.tsx --runInBand --watchAll=false --coverage --collectCoverageFrom=src/ApplicationAccessCenter.tsx --collectCoverageFrom=src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`，收集对象整体语句覆盖 88.18%，`ApplicationAccessCenter.tsx` 行覆盖 87.28%，backend client 100%。

## 运行态验收

本 change 未执行 60 环境部署或浏览器运行态验收。当前证据层级为源码、单元测试、typecheck、build 和 OpenSpec 验证；诊断接口设计为 no-outbound/no-write 预检，不声明 runtime provider truth 已完成。

## 脱敏

验证记录只使用路径、命令、状态和覆盖率摘要；未记录 token、Cookie、DSN、client secret、Authorization header、完整私有 URL、raw payload/raw id、真实账号或完整组织树。
