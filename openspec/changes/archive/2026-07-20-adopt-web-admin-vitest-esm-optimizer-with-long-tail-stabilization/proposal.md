## Why

`web-admin` 当前强隔离、single-worker Vitest普通全量约 `3579.75s`，coverage约 `3824.30s`；一小时级反馈影响日常开发与CI吞吐。上一NO-GO change证明AntD/icons ESM dependency optimizer具有真实性能杠杆，但没有形成可采用的完整owner边界。本change重新评估exact ESM root alias、client optimizer与唯一 `react-dom` exclude，并以重复默认顺序作为正确性硬门禁。

## What Changes

- 以TDD建立两个exact ESM root alias、`test.deps.optimizer.client` include/exclude、串行隔离与production graph不变的直接契约，并完成最小候选实现。
- 证明 `exclude=["react-dom"]` 使optimizer产物保留外部ReactDOM import；renderer、root partial mock、`antd/es/*` subpath mock与singleton专项全部通过。
- 第一次正式默认全量以 `823.598s` 完成157 files / 1511 tests，0 failure/timeout/unhandled；第二次默认全量在 `805.595s` 时由 `ApplicationEditPageUiCustomization.test.tsx` 的5349ms既有用例触发默认5秒timeout。
- 失败文件不在批准的4个条件式owner写集内，命中“范围外owner立即fail-closed”硬门禁；不修改该测试、不提高timeout、不扩大写集，也不继续shuffle或coverage。
- 候选 `vitest.config.ts`、新增直接契约与全部条件式owner修改均回退，最终公共runner保持未优化的single-worker/file-serial真值；production、依赖、lock、CI与业务测试行为无变化。
- 本change以 `NO-GO` 收口。未来若继续采用optimizer，必须建立新的独立change，把 `ApplicationEditPageUiCustomization.test.tsx` 纳入明确owner治理，并重新完成重复默认、shuffle、coverage与warning门禁。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `web-admin-vitest-toolchain`：记录exact ESM optimizer候选因重复默认顺序范围外timeout而未采用；当前runner继续不启用该optimizer或测试根alias。
- `web-admin-test-baseline-and-ci-gates`：记录单次完整绿灯不能替代重复默认门禁，范围外timeout必须回退且不得通过扩大owner、timeout或mock制造采用结果。

## Impact

- 最终runtime/test config/test owner/package/lock/CI/production diff为0。
- 最终tracked写集限于 `web-admin/AGENTS.md`、`docs/admin-technical-debt-baseline-2026-07-14.md` 与当前OpenSpec change artifacts。
- `web-admin/package.json`、`web-admin/bun.lock`、`web-admin/config/vitest/testConfig.ts`、`.github/workflows/build.yml`、production源码、Admin backend、Docker/Makefile与Playwright实现保持只读。
- 没有访问60、共享数据库、真实账号/provider或生产认证链路。
- 本NO-GO已按主控closeout授权使用 `skip-specs` 归档决策证据，失败候选未同步到OpenSpec主规格。
