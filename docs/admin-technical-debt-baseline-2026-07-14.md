# Admin 技术债基线与实施路线

> 初始审计日期：2026-07-14
>
> 最近整理日期：2026-07-17
>
> 代码审阅基线：`hfl-test-base@f955924d`

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
| Web3 钱包认证退役 | `retire-unused-admin-web3-wallet-auth` | 60 零存量门禁通过；创建/登录入口、专属后端和 13 个直接依赖已移除，历史记录保持受控只读兼容 |
| AntD 5 当前 API 清理 | `remove-web-admin-antd5-input-group-and-visible-deprecations`、`upgrade-web-admin-antd5-and-migrate-modal-destroy-semantics` | 4 处 `Input.Group` 与 3 个 modal wrapper / 7 个调用点已迁移到 `Space.Compact` / `open`；AntD 精确升级到 5.29.3，11 处 overlay 销毁语义已迁移到 `destroyOnHidden`，AntD 6 继续排除 |
| CRA/IE polyfill 退役 | `retire-web-admin-cra-ie-polyfill` | React 18 + Vite `es2020` 与 production browserslist 成为浏览器支持真值；CRA production/Jest polyfill owner 已移除，`core-js`、`replaceAll` 与显式 Jest/jsdom 边界继续保留 |
| 注册页响应式 | `fix-web-admin-signup-mobile-overflow` | Signup 固定 logo/Form/模式组已收敛到页面局部响应式边界；320/360/390px 与桌面端无页面级横向溢出，长标签、校验错误和键盘路径保持可用 |
| React 18 测试异步边界 | `upgrade-web-admin-react-testing-library-for-react-18`、`stabilize-web-admin-react18-async-test-boundaries` | RTL 已使用 `createRoot`；历史 act warning、FakeTimers/native timer 污染和局部文本 suppression 已按 owner 收口，并由 non-silent 全量 Jest 与 test-only 防回退契约保护 |

TypeScript 增量迁移也已进入稳态：`web-admin/src` 不再把普通业务 `.js/.jsx` 迁移作为独立路线，后续由增量 TS gate 防止回退。

## 当前实施入口

以下 change 已由独立 worker 实施。本节只标识路线占用和后续依赖，不代替主控实时台账。

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

## Bun package manager 决策

当前结论为 `NO-GO / REEVALUATE_AFTER_FRONTEND_LOCK`，继续以 Yarn 和 `yarn.lock` 为唯一依赖真值；该状态只授权重新评估，不授权迁移。

已归档三轮评估：

- `migrate-web-admin-package-manager-to-bun`
- `evaluate-admin-cypress-15-bun-compatibility`
- `evaluate-admin-bun-copyfile-backend-workaround`

Bun 1.3.14 在 Windows 隔离环境中没有形成可用且可复现的依赖树；`--backend=copyfile` 和降低 lifecycle 并发均未解除 cache/extraction 阶段缺文件。现在 Cypress 已由 Playwright 替代，Web3 退役又删除 13 个直接依赖和 291 个专属 lock 条目，旧失败依赖树已经发生实质变化，满足一次重新评估的触发条件。

以下触发条件中第二项已经满足：

- Bun 稳定版或相关 Windows 上游问题有明确修复；
- Web3 退役后依赖树显著缩小，并能证明失败面发生变化（已满足）。

Testing Library change 释放前端依赖锁后可建立新的隔离评估。重评必须先连续 3 次完成干净 frozen lifecycle install，且 lock/tree 可复现；随后才能比较冷安装、缓存安装、完整 Jest、Vite build 和 Docker build。依赖安装或 CI dependency 阶段建议至少有 20% 收益，完整 Jest 与 Vite build 不应出现超过 10% 的无依据回退。未达到门槛时不得进入实施 change，也不同时迁移到 `bun test`。

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

1. 保持 AntD 5.29.3、`destroyOnHidden=11` 与 React 18 Testing Library 基线，不在后续业务 change 顺手升级 AntD 6。
2. 前端依赖锁释放后，基于已缩小的依赖树重新评估 Bun；评估通过前继续使用 Yarn。

## 维护规则

- change 完成后只更新“已完成基线”和“推荐顺序”，不把 closeout 长报告复制进本文。
- 新候选必须写明收益、边界、前置条件和可执行验收；缺任一项时先评估，不直接派工。
- 数量和依赖版本是时间点证据。正式 proposal 必须重新运行搜索和依赖检查，不照抄本文数字。
- 路线状态与 OpenSpec 冲突时，以已归档主规格、最新代码和主控实时台账为准，并及时修正文档。
