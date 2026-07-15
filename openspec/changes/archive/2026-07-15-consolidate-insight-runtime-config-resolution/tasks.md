## 1. Typed resolution contract

- [x] 1.1 先为 shared resolution metadata、source priority、copy-safe projection 和 stable blocker 编写失败测试。
- [x] 1.2 实现 `ServiceCredentialRuntimeResolution`、material provider 窄接口和 legacy env provider，使 saved unavailable/disabled/missing/invalid/legacy disabled fail closed。
- [x] 1.3 为 manual、secretRef、keep-in-env 与 legacy 的采用顺序补齐 RED/GREEN 测试，确认治理配置与序列化输出不承载 credential material。

## 2. 三组 P0 typed resolver

- [x] 2.1 先为 usage identity resolver 的 legacy 兼容、saved policy overlay、manual/secretRef provider、显式非法值和 blocker 编写失败测试，再实现 typed resolver。
- [x] 2.2 先为 Insight provider trust 的 legacy/saved policy、store unavailable、missing/invalid policy 和 no-fallback 编写失败测试，再实现 typed resolver。
- [x] 2.3 先为 Gateway projection 的 publisher/status endpoint、caller、timeout/freshness/retry、manual/secretRef/keep-in-env 与 fail-closed blocker 编写失败测试，再实现 typed resolver。

## 3. 运行调用方迁移

- [x] 3.1 将 usage identity HTTP resolver 创建路径迁移到 typed config，删除 controller 内重复 conf/policy 解析并保持 mapping fail-closed 语义。
- [x] 3.2 将 Insight provider audience/issuer/scope 校验迁移到同一 trust resolution，确保 saved reject/disabled/unavailable 不回落 legacy。
- [x] 3.3 将 Gateway publisher、manual/scheduled publish、run readiness、ingestion status 和 observability 的 publisher config 迁移到同一 resolution 并传播稳定 blocker。
- [x] 3.4 增加迁移前后等价回归：trust 四种状态、resolver 本地 confirmed 优先/缺映射调用/unresolved、projection 四条路径共享 resolution，并锁定既有 stable reason alias/DTO。

## 4. Handoff status 与 Provider Doctor

- [x] 4.1 为 handoff status 的 `adoptedSource`、copy-safe reference、diagnostics/blockers 和敏感字段缺失补失败测试，再用 typed resolution 替换重复 legacy/saved overlay。
- [x] 4.2 为 handoff diagnostics 的实际 source policy、manual/secretRef cannot-infer、invalid 与 saved unavailable 结论补失败测试，并确保响应/错误不回显 material。
- [x] 4.3 检查 resolver、provider 和 Gateway 审计日志，只记录 source、stable code、状态、计数和耗时，不记录 endpoint/token/raw payload。

## 5. 验证与交付

- [x] 5.1 运行三组聚焦 Go tests、受影响 `admin/object` 与 `admin/controllers` package tests，并修复回归。
- [x] 5.2 生成 coverprofile，核算本 change 实施文件 changed-file coverage 达到 85%；运行相关范围 `go vet`。
- [x] 5.3 运行 `openspec validate consolidate-insight-runtime-config-resolution --strict`、仓库 changes/specs strict validate 与 `git diff --check`。
- [x] 5.4 更新 `verification.md`，按证据层级记录 RED/GREEN、测试、覆盖率、未运行真实链路原因、脱敏检查和剩余风险。
- [x] 5.5 在 `verification.md` 和 RC 回传列出部署后 60 验收清单：`current-user`、`current-user/scope` 与 Insight 五类用量请求；明确真实 smoke 是后续合入/部署门禁，本地不伪造。
- [x] 5.6 完成归档前 review；保持 change active，不 archive、不合入 base/test，将最终工作分支收敛为单个 commit 并 push。
