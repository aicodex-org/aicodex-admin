# 验证记录

## 结论

`web-admin` 全量 Jest 基线已恢复为绿灯，所有已提交测试在默认单测 timeout 下通过。独立 `test:ci`、TypeScript 静态检查、增量 TypeScript gate 和 GitHub Actions frontend checks 已形成明确门禁。最终写集未修改生产组件、运行时依赖或 `yarn.lock`。

## 自动化测试

### 全量 Jest

```powershell
cd web-admin
yarn test:ci
```

- 结果：通过。
- Test Suites：137 passed / 137 total。
- Tests：1,261 passed / 1,261 total。
- Snapshots：0 total。
- Jest 时间：349.457 秒（总命令时间 353.12 秒）。
- 执行约束：`CI=true`、`--watchAll=false`、`--runInBand`、`--silent`，未设置全局或文件级延长 timeout。
- 基线：验证基于最新已知 `origin/hfl-test-base` 提交 `ccbe3ece` 完成。

### 聚焦回归

- 对齐最新基线后的最终聚焦回归：5 suites / 77 tests 通过，覆盖 `ApplicationUsageAccessPage.test.tsx`、`GroupListPage.test.tsx`、`OrganizationEditPage.test.tsx`、`PlatformApiMappingPage.test.tsx` 与 `common/ListPageTable.test.tsx`。
- 确定性断言与公共组件：5 suites / 39 tests 通过。
- `ApplicationAccessMenuPages.test.tsx`：19/19 通过，并重复执行确认默认 timeout 稳定。
- `OrganizationEditPage.test.tsx`：20/20 通过。
- `OrganizationDirectoryQualityPage.test.tsx`：25/25 通过。
- `PlatformApiMappingPage.test.tsx`：14/14 通过，已移除原 15 秒文件级 timeout。
- `ApplicationUsageAccessPage.test.tsx`：12/12 通过，移除原 15 秒文件级 timeout 后无需其它修改。
- `FrontendCiGates.test.ts`：配置缺失时 4/4 RED；配置落地并加固后 4/4 GREEN。

## TypeScript 与脚本门禁

```powershell
cd web-admin
yarn typecheck
node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base --json
yarn typecheck:build-tooling
yarn public-scripts:check
```

- `yarn typecheck`：通过；最终改动后复跑退出码为 0。
- 增量 TypeScript gate：通过，JSON 结果为 `{"errors": []}`。
- build tooling typecheck：通过。
- public scripts typecheck：通过。

## 生产构建

```powershell
cd web-admin
yarn build
```

- 结果：通过；CRACO 输出 `Compiled successfully.`，并完成 `build-temp` 到 `build` 的产物切换。
- 首次执行曾在 Windows 优化阶段以进程码 `3221226505` 异常退出且没有编译诊断；Codex App 重启后使用完全相同命令复跑通过，未修改依赖或构建参数。
- 既有 Browserslist 数据过期、Node API deprecation 和 bundle size warning 仍存在，不属于本 change。

## 写集与 OpenSpec

```powershell
git diff --check
git diff --exit-code -- web-admin/yarn.lock
openspec validate "stabilize-web-admin-test-baseline-and-ci-gates" --strict
```

- `git diff --check`：通过。
- `web-admin/yarn.lock`：无 diff。
- 生产组件：无 diff；实现写集限于 Jest 测试、`package.json` script、GitHub Actions workflow 和 OpenSpec artifacts。
- OpenSpec strict validation：通过，`Change 'stabilize-web-admin-test-baseline-and-ci-gates' is valid`。
- timeout 豁免扫描：`web-admin/src` 测试中无 `jest.setTimeout`。

## 覆盖率

覆盖率门槛为 N/A。本 change 没有修改生产实现代码，只修改测试、测试脚本、CI workflow 和 OpenSpec 文档；不存在需要按受影响生产文件统计 85% 覆盖率的对象。

## 剩余风险

- 当前旧版 Testing Library 在非 silent 聚焦运行中仍会输出 React 18 `ReactDOM.render` 兼容 warning；根治需要独立依赖升级 change。
- 少量既有 fake-timer/native-timer warning 仍会在全量运行中输出，但未造成失败；本 change 未扩大为测试工具链升级。
- push 事件的 `before` SHA 无效时按约定回退 `HEAD^`。对于多提交新分支或 force-push，该回退只覆盖最后一个提交；后续若需要覆盖完整历史，应单独定义 merge-base 或空树策略。
