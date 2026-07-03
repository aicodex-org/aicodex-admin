# Verification

## 验证摘要

- `openspec validate align-admin-copy-safe-package-with-insight-profile --strict`：通过。
- `git diff --check`：通过。
- `yarn test ApplicationAccessCenter.test.tsx ApplicationUsageAccessPage.test.tsx --runInBand --watchAll=false`：通过，2 个 test suites、21 个 tests。
- `yarn test ApplicationAccessCenter.test.tsx ApplicationUsageAccessPage.test.tsx --coverage --collectCoverageFrom=src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --collectCoverageFrom=src/ApplicationUsageAccessPage.tsx --runInBand --watchAll=false`：通过，受影响实现代码覆盖率满足 85% 门槛。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，无错误输出。
- `yarn typecheck`：通过。
- `yarn build`：通过；构建输出包含既有 Browserslist 过期提示、`fs.F_OK` deprecation warning 和 bundle size 提示，未出现编译失败。

## Archive 后门禁

- `openspec archive align-admin-copy-safe-package-with-insight-profile -y`：已归档为 `openspec/changes/archive/2026-07-03-align-admin-copy-safe-package-with-insight-profile`。
- `openspec validate --changes --strict`：通过，3 个 active changes 全部通过。
- `openspec validate --specs --strict`：通过，31 个 specs 全部通过。
- `git diff --check`：通过。
- `yarn test ApplicationAccessCenter.test.tsx ApplicationUsageAccessPage.test.tsx --runInBand --watchAll=false`：archive 后重跑通过，2 个 test suites、21 个 tests。
- 源码自 archive 前 `yarn typecheck`、`yarn build` 和覆盖率验证后未再变更；archive 后仅补归档文档和主规格 EOF 格式修复。

## 覆盖率

- `src/backend/ApplicationAccessServiceCredentialGovernanceBackend.ts`：statements 91.5%，branches 86.25%，functions 100%，lines 90.37%。
- `src/ApplicationAccessServiceCredentialGovernancePanel.tsx`：statements 88.51%，branches 81.35%，functions 96.92%，lines 88.65%。
- `src/ApplicationUsageAccessPage.tsx`：statements 100%，branches 60%，functions 100%，lines 100%。
- 统计对象覆盖本 change 修改的实现代码；核心 builder 和页面生成路径均高于 85% 行覆盖门槛。

## 脱敏检查

- 单测覆盖 copy-safe package 不包含 `token`、`secret`、private URL、`rawPayload`、`rawId` 等敏感材料。
- Builder 对 unsafe text 继续执行二次过滤；页面生成包时传入的是已 sanitize config 和 normalized status。
- 本验证记录未写入真实环境 IP、完整私有 URL、Cookie、Authorization、token、client secret、DSN、真实账号或完整组织树。

## 运行态口径

- 本 change 只修改 Admin 前端 copy-safe package 生成、复制行为和 OpenSpec，不新增后端 endpoint，不修改 API/Gateway/Insight contract，也不实现 Admin secure handoff。
- 未执行浏览器 smoke；本次没有改动页面布局/CSS，P0 风险主要由 builder/page Jest、typecheck 和 build 覆盖。
- Insight Profile 导入端、secret store/Profile activation 和 runtime provider truth 仍由对应 owner 验证，本 change 不声明端到端运行态已完成。

## 剩余风险

- `insightProfile` 字段名按当前路线和总控 OpenSpec 对齐；若 Insight consumer 后续收敛出更窄字段名，Admin 可能需要一次小范围映射调整。
- 构建输出提示 Browserslist 数据过期和 bundle size 偏大，属于仓库既有构建提示，不是本 change 引入的阻断问题。
