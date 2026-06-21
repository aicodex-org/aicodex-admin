## 验证记录

本文件记录本 change 的脱敏验证证据。命令和结论不包含 token、Cookie、DSN、client secret、完整 private URL、raw payload 或真实账号。

## OpenSpec 与基础门禁

- `openspec validate implement-admin-service-credential-governance-config-entry --strict`：通过，change target valid。
- `openspec validate --changes --strict`：通过，4 个 active changes 均通过。
- `openspec validate --specs --strict`：通过，28 个主规格均通过。
- `git diff --check`：通过，无空白错误。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，无新增不符合增量 TypeScript 规则的 JS/JSX 文件。

## 后端测试与覆盖率

- `cd admin; go test ./controllers -run 'Test(ServiceCredentialGovernanceConfig|GetAndSaveApplicationAccessServiceCredentialGovernanceConfig|SaveApplicationAccessServiceCredentialGovernanceConfig|GetApplicationAccessServiceCredentialGovernanceConfig)' -count=1`：通过。
- `cd admin; go test ./controllers -run 'Test(ServiceCredentialGovernanceConfig|GetAndSaveApplicationAccessServiceCredentialGovernanceConfig|SaveApplicationAccessServiceCredentialGovernanceConfig|GetApplicationAccessServiceCredentialGovernanceConfig)' -count=1 -coverprofile ..\service-credential-governance-config.cover.out; go tool cover -func ..\service-credential-governance-config.cover.out`：通过。受影响 controller 函数覆盖率：
  - `GetApplicationAccessServiceCredentialGovernanceConfig`：100.0%。
  - `SaveApplicationAccessServiceCredentialGovernanceConfig`：100.0%。
  - `requireServiceCredentialGovernanceGlobalAdmin`：100.0%。
- `cd admin; go test ./object -run ServiceCredentialGovernanceConfig -count=1 -coverprofile ..\service-credential-governance-object.cover.out; go tool cover -func ..\service-credential-governance-object.cover.out`：通过。受影响 object 文件 `service_credential_governance_config.go` 的关键函数覆盖率均达到 88.9% 及以上，主要服务、归一化、校验、脱敏和存取路径达到 85% 门槛。

## 前端测试、覆盖率与构建

- `cd web-admin; yarn test --watchAll=false ApplicationAccessCenter.test.tsx`：通过，12/12 tests passed。
- `cd web-admin; yarn test --watchAll=false ApplicationAccessCenter.test.tsx --coverage --coverageDirectory ../application-access-coverage --coverageReporters=text --collectCoverageFrom=src/ApplicationAccessCenter.tsx --collectCoverageFrom=src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`：通过。受影响前端文件覆盖率：
  - `ApplicationAccessCenter.tsx`：statements 90.61%，branches 85.99%，functions 93.24%，lines 90.24%。
  - `ApplicationAccessServiceCredentialGovernanceBackend.ts`：statements/branches/functions/lines 均 100%。
- `cd web-admin; yarn typecheck`：首轮发现新增测试类型声明与当前 TS/Jest 类型配置不匹配；修复测试本地类型后重跑通过。
- `cd web-admin; yarn build`：通过。构建输出包含既有 `Browserslist: caniuse-lite is outdated` 和 bundle-size 提示，未阻断编译。

## 脱敏与安全边界

- 后端测试覆盖 global-admin guard、非管理员拒绝、默认读取、保存回读、malformed payload/fail-closed、敏感字段拒绝与脱敏回读。
- 前端测试覆盖配置加载、保存后回读、错误态、reference-only/keep-in-env 状态，以及请求体和页面不展示 secret/token/private URL-like 值。
- 本 change 只提供 Admin-owned 只读/配置回读契约与 Application Access 上下文入口，不调用外部 provider，不触发 Gateway/API/Insight 写操作，不输出真实凭据。

## 剩余风险

- 未做真实环境 E2E，因为本 change 不应触发外部系统写操作，也不需要真实 secret。当前证据覆盖本地 controller/object、前端交互、类型检查和构建层级。
- `Browserslist` 和 bundle-size 为项目既有构建提示，非本 change 引入的阻断项。

## Archive 后验证

- `openspec archive implement-admin-service-credential-governance-config-entry -y`：通过，delta specs 已同步到主规格，change 归档到 `openspec/changes/archive/2026-06-21-implement-admin-service-credential-governance-config-entry/`。
- `openspec validate --changes --strict`：通过，剩余 3 个历史 active changes 均通过；本 change 已不在 active list。
- `openspec validate --specs --strict`：通过，28 个主规格均通过。
- `git diff --check`：归档同步后发现两个主规格 EOF 空白行，修复后重跑通过。
