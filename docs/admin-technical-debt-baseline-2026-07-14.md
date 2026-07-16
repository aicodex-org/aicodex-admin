# Admin 技术债基线与实施路线

> 初始审计日期：2026-07-14
>
> 最近整理日期：2026-07-16
>
> 代码审阅基线：`hfl-test-base@716b7f82`

## 文档用途

本文用于选择后续 Admin 技术债 OpenSpec change、确定实施顺序和避免重复派工。

- 本文记录当前决策和仍有价值的技术证据，不复制已完成 change 的完整设计、测试日志或 closeout 报告。
- 已完成能力以 `openspec/specs/` 和对应 `openspec/changes/archive/` 为准。
- worker 实时状态、workspace lease 和回传路由不写入本文，由主控台账维护。
- 本文不是实施授权。创建新 change 前必须基于最新 `origin/hfl-test-base` 重新检查依赖版本、调用面、active change 和写集冲突。
- 技术债 change 应产生可验证的稳定性、安全性、兼容性或维护收益；不为占用空闲 workspace 派发 support-only 或全仓机械重构。

## 已完成基线

以下方向已经完成，不再作为后续候选重复派发。

| 方向 | 已完成 change | 结果 |
|---|---|---|
| 前端测试与 CI 基线 | `stabilize-web-admin-test-baseline-and-ci-gates` | TypeScript、Jest、lint、build 与浏览器门禁形成稳定入口 |
| Go correctness | `enable-incremental-go-correctness-gates` | `gofumpt`、`govet` 和固定 golangci-lint 基线可执行 |
| Go 测试隔离与 fixture | `stabilize-admin-go-test-baseline-and-fixtures` | hermetic suite、integration 边界和 AICodex-owned schema registry 已建立 |
| AICodex 表迁移 | `establish-aicodex-owned-schema-migration-baseline` | 自有表具备版本化 migration 基线，legacy Casdoor 表继续保留原边界 |
| Insight runtime config | `consolidate-insight-runtime-config-resolution` | resolver、provider trust、Gateway projection 使用 typed resolution 和 copy-safe diagnostics |
| 前端构建 | `migrate-web-admin-build-toolchain-to-vite` | CRA/CRACO 已由 Vite 替代，继续输出 `web-admin/build` |
| Jest 工具链 | `decouple-web-admin-jest-from-react-scripts` | Jest 已显式配置，不再依赖 React Scripts |
| 浏览器 E2E | `migrate-admin-e2e-from-cypress-to-playwright` | Cypress 已移除；Playwright 保持 19 个 spec / 22 个 Chromium test |
| 后台任务生命周期 | `stabilize-admin-background-task-lifecycle-and-graceful-shutdown` | 顶层任务启动、停止和 graceful shutdown 已形成统一边界 |
| 组织同步 HTTP | `stabilize-admin-organization-sync-http-client-policy` | timeout、context cancellation 和 client 注入已按域收口 |
| SOCKS5 出站传输 | `harden-admin-socks5-proxy-transport-policy` | 默认 transport、代理 transport 和 TLS 行为已有稳定契约 |
| IDP HTTP client | `stabilize-admin-idp-http-client-contract` | 五个目标 Provider 统一注入 client、bounded fallback、body/status/error 与凭据脱敏契约 |

TypeScript 增量迁移也已进入稳态：`web-admin/src` 不再把普通业务 `.js/.jsx` 迁移作为独立路线，后续由增量 TS gate 防止回退。

## 当前实施入口

以下 change 已由独立 worker 实施。本节只标识路线占用和后续依赖，不代替主控实时台账。

### 退役未使用的 Web3 钱包认证

Change：`retire-unused-admin-web3-wallet-auth`

- 产品决策是退役区块链钱包认证，不迁移到 EIP-6963。
- 必须先对 60 环境做只读、脱敏存量核验；Provider、应用绑定、用户钱包绑定或审计引用任一非零，或无法可靠确认时，停止破坏性删除并请求决策。
- 第一阶段删除创建、配置和登录入口及其专属前端依赖；历史记录保持可读、可禁用和可删除。
- 不删除数据库字段，不批量改历史数据，不借机重评 Bun。

### 收口企业 TLS 兼容策略

Change：`stabilize-admin-enterprise-tls-compatibility-policy`

当前仍有 3 处硬编码 `InsecureSkipVerify: true`：

- `admin/idp/adfs.go`
- `admin/object/syncer_activedirectory.go`
- `admin/email/smtp.go`

该问题值得处理，但不能直接把默认值改成严格校验。ADFS、Active Directory 和 SMTP 的旧部署可能依赖自签证书，直接关闭兼容会造成认证、同步或邮件中断。

实施边界：

- 定义按连接或 provider 生效的显式 TLS policy，区分系统信任、自定义 CA 和受控的不安全兼容模式。
- 规定旧配置迁移、默认值、copy-safe 状态诊断和告警，不回显证书或连接凭据。
- ADFS 不得覆盖上游注入的 transport；AD 同步和 SMTP 复用同一策略语义，但保持各自业务 client 边界。
- 为默认严格、自定义 CA、显式 legacy opt-in 和无效配置补契约测试。

前置条件已满足：`stabilize-admin-idp-http-client-contract` 已完成。TLS change 必须保持其 `SetHttpClient`、bounded fallback、body/status/error 和凭据脱敏契约。

## 下一批候选

### P1：React 18 兼容 Testing Library 升级

建议 change：`upgrade-web-admin-react-testing-library-for-react-18`

当前 `@testing-library/react` 仍为 `9.3.2`，29 个测试文件过滤 `ReactDOM.render is no longer supported in React 18` 告警。这会掩盖真实 console regression，并增加每个新测试的样板代码。

建议范围：

- 升级到与 React 18 兼容的 Testing Library 版本，保持 Jest 27、Vite、Playwright 和业务运行时不变。
- 迁移确实受影响的 render/cleanup/act 用法，删除各测试文件中的告警过滤。
- 保持全量 Jest discovery 和断言语义，不通过静默 console mock 制造绿灯。
- 验证全量 Jest、typecheck、lint、build 和关键组件测试。

前置条件：等待 Web3 change 释放 `web-admin/package.json` 和 `yarn.lock` 依赖锁。

### P1：AntD 5 deprecated API 清理

建议 change：`remove-web-admin-antd5-deprecated-api-usage`

当前基线约有 9 处 `Input.Group`、7 处 `visible` 和 11 处 `destroyOnClose`。这些调用会持续产生开发与测试告警，并阻碍后续 AntD 升级。

建议范围：

- 按组件语义迁移到 `Space.Compact`、`open`、`destroyOnHidden` 等当前 API，不做全局样式重写。
- 优先处理登录、用户编辑、Provider、组织同步和公共 modal；保留表单布局、焦点、关闭后清理和权限行为。
- 用聚焦 Jest 与浏览器 smoke 验证弹窗开关、表单重置、长文本和窄屏布局。

前置条件：等待 Web3 change 释放登录页写集；可与企业 TLS change 并行。

### P2：移除 CRA/IE polyfill 残留

建议先评估，不直接实施。`web-admin/src/index.tsx` 仍加载 `react-app-polyfill/ie9`，但 React 18 已不支持 IE，构建工具也已迁移到 Vite。

只有在明确浏览器支持基线、production build 差异和关键认证回调 smoke 后才移除。若没有可观察的 bundle、兼容或维护收益，不单独立项。

## Bun package manager 决策

当前结论为 `NO-GO / BLOCKED`，继续以 Yarn 和 `yarn.lock` 为唯一依赖真值。

已归档三轮评估：

- `migrate-web-admin-package-manager-to-bun`
- `evaluate-admin-cypress-15-bun-compatibility`
- `evaluate-admin-bun-copyfile-backend-workaround`

Bun 1.3.14 在 Windows 隔离环境中没有形成可用且可复现的依赖树；`--backend=copyfile` 和降低 lifecycle 并发均未解除 cache/extraction 阶段缺文件。Cypress 已由 Playwright 替代，但失败样本还涉及 Web3 深层依赖，因此不能把旧阻断只归因于 Cypress。

只有满足以下任一触发条件才重新评估：

- Bun 稳定版或相关 Windows 上游问题有明确修复；
- Web3 退役后依赖树显著缩小，并能证明失败面发生变化。

重评必须先连续 3 次完成干净 frozen lifecycle install，且 lock/tree 可复现；随后才能比较冷安装、缓存安装、完整 Jest、Vite build 和 Docker build。依赖安装或 CI dependency 阶段建议至少有 20% 收益，完整 Jest 与 Vite build 不应出现超过 10% 的无依据回退。未达到门槛时不得进入实施 change，也不同时迁移到 `bun test`。

## 继续延后

以下问题存在，但当前影响面或迁移风险大于可验证收益：

- 全局 fetch/request 层重写。
- `Setting.tsx` 大拆分。
- React Router 5 到 6 全量迁移。
- 全量 class component 到 hooks。
- 全仓 controller response/error contract 统一。
- 全仓统一 HTTP client、全仓消除 panic 或一次性启用全部 linter。
- 仅为缩短文件行数而重写历史 OpenSpec 主规格。

这些方向只有在出现明确业务 blocker、升级前置或可量化维护成本时，才按单一业务域建立窄 change。不得把文件数量、行数或告警总数本身当作立项收益。

## 推荐顺序

1. 完成并 closeout 当前 Web3 退役与企业 TLS 兼容策略两个独立 change。
2. 前端依赖锁释放后实施 React 18 Testing Library 升级。
3. 随后按页面域清理 AntD 5 deprecated API；该任务可与企业 TLS 并行。
4. 明确浏览器支持基线后决定是否移除 IE polyfill。
5. Bun 保持关闭，直到满足重评触发条件。

## 维护规则

- change 完成后只更新“已完成基线”和“推荐顺序”，不把 closeout 长报告复制进本文。
- 新候选必须写明收益、边界、前置条件和可执行验收；缺任一项时先评估，不直接派工。
- 数量和依赖版本是时间点证据。正式 proposal 必须重新运行搜索和依赖检查，不照抄本文数字。
- 路线状态与 OpenSpec 冲突时，以已归档主规格、最新代码和主控实时台账为准，并及时修正文档。
