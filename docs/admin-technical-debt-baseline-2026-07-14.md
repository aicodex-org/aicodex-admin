# Admin 技术债基线与实施路线

> 初始审计日期：2026-07-14
>
> 最近整理日期：2026-07-18
>
> 事实基线：以本文所在 `hfl-test-base` 提交、对应 OpenSpec archive 与主规格为准

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
| 前端测试与 CI 基线 | `stabilize-web-admin-test-baseline-and-ci-gates`、`migrate-web-admin-jest-to-vitest` | TypeScript、Vitest、lint、build 与浏览器门禁形成稳定入口；单测保持157个文件且不少于1503个测试 |
| Go correctness | `enable-incremental-go-correctness-gates` | `gofumpt`、`govet` 和固定 golangci-lint 基线可执行 |
| Go 测试隔离与 fixture | `stabilize-admin-go-test-baseline-and-fixtures` | hermetic suite、integration 边界和 AICodex-owned schema registry 已建立 |
| AICodex 表迁移 | `establish-aicodex-owned-schema-migration-baseline` | 自有表具备版本化 migration 基线，legacy Casdoor 表继续保留原边界 |
| Insight runtime config | `consolidate-insight-runtime-config-resolution` | resolver、provider trust、Gateway projection 使用 typed resolution 和 copy-safe diagnostics |
| 前端构建 | `migrate-web-admin-build-toolchain-to-vite` | CRA/CRACO 已由 Vite 替代，继续输出 `web-admin/build` |
| 单元测试工具链 | `decouple-web-admin-jest-from-react-scripts`、`migrate-web-admin-jest-to-vitest` | Vitest 4.1.10已接管唯一runner；Jest 27、测试专属Babel transform和Jest support/config已退役 |
| 浏览器 E2E | `migrate-admin-e2e-from-cypress-to-playwright` | Cypress 已移除；Playwright 保持 19 个 spec / 22 个 Chromium test |
| 后台任务生命周期 | `stabilize-admin-background-task-lifecycle-and-graceful-shutdown` | 顶层任务启动、停止和 graceful shutdown 已形成统一边界 |
| 组织同步 HTTP | `stabilize-admin-organization-sync-http-client-policy` | timeout、context cancellation 和 client 注入已按域收口 |
| SOCKS5 出站传输 | `harden-admin-socks5-proxy-transport-policy` | 默认 transport、代理 transport 和 TLS 行为已有稳定契约 |
| IDP HTTP client | `stabilize-admin-idp-http-client-contract` | 五个目标 Provider 统一注入 client、bounded fallback、body/status/error 与凭据脱敏契约 |
| Web3 钱包认证退役 | `retire-unused-admin-web3-wallet-auth` | 60 零存量门禁通过；创建/登录入口、专属后端和 13 个直接依赖已移除，历史记录保持受控只读兼容 |
| AntD 5 当前 API 清理 | `remove-web-admin-antd5-input-group-and-visible-deprecations`、`upgrade-web-admin-antd5-and-migrate-modal-destroy-semantics`、`eliminate-web-admin-antd-runtime-warning-owners` | 4 处 `Input.Group` 与 3 个 modal wrapper / 7 个调用点已迁移到 `Space.Compact` / `open`；AntD 精确升级到 5.29.3，11 处 overlay销毁语义使用`destroyOnHidden`；InputNumber/Card/Typography/Descriptions/Table/Spin/Collapse的47条production owner warning已按当前API收口并由局部non-silent guard保护，AntD 6继续排除 |
| CRA/IE polyfill 退役 | `retire-web-admin-cra-ie-polyfill` | React 18 + Vite `es2020` 与 production browserslist 成为浏览器支持真值；CRA production/Jest polyfill owner 已移除，`core-js`、`replaceAll` 与显式 Vitest/jsdom 边界继续保留 |
| 注册页响应式 | `fix-web-admin-signup-mobile-overflow` | Signup 固定 logo/Form/模式组已收敛到页面局部响应式边界；320/360/390px 与桌面端无页面级横向溢出，长标签、校验错误和键盘路径保持可用 |
| React 18 测试异步边界 | `upgrade-web-admin-react-testing-library-for-react-18`、`stabilize-web-admin-react18-async-test-boundaries` | RTL 已使用 `createRoot`；历史 act warning、FakeTimers/native timer 污染和局部文本 suppression 已按 owner 收口，并由 non-silent 全量 Vitest 与 test-only 防回退契约保护 |
| 企业 TLS 兼容策略 | `stabilize-admin-enterprise-tls-compatibility-policy` | ADFS、Active Directory 与 SMTP 已按连接使用 system/custom CA/显式 legacy policy；存量兼容、fail-closed、诊断脱敏和前端配置链已闭环 |
| Provider 异步与列表 identity | `stabilize-web-admin-provider-unmount-and-list-key-contract` | Provider 卸载/路由切换后的过期异步 completion 已隔离，Webhook/Role/Permission 重复项使用稳定业务复合 key |
| Web Admin direct-eval 退役 | `retire-web-admin-unused-direct-eval-runtime` | 未使用的 `Setting.parseObject` production owner 已移除，构建中的项目自有 direct-eval warning 归零并有源码契约防回退 |
| 外部邮件与支付 HTTP 生命周期 | `bound-admin-email-payment-http-client-lifetimes` | Azure ACS、GC Payment 与 FastSpring Pay/Notify 已建立域内整体 timeout、独立 client、注入测试 seam 与 nil fallback |

TypeScript 增量迁移也已进入稳态：`web-admin/src` 不再把普通业务 `.js/.jsx` 迁移作为独立路线，后续由增量 TS gate 防止回退。

## Bun package manager 决策

当前活动真值为Bun 1.3.14、`packageManager: bun@1.3.14`与唯一tracked `web-admin/bun.lock`。Windows使用未设置 `BUN_INSTALL_CACHE_DIR`的默认持久cache执行标准安装，Linux CI/Docker通过同一 `bun run deps:install`入口执行frozen install；安装后动态校验全部direct dependency、resolution、关键package与Vitest/Vite/Playwright CLI，不保留Yarn/npm fallback或双lock。

已归档的主要评估包括：

- `migrate-web-admin-package-manager-to-bun`
- `evaluate-admin-cypress-15-bun-compatibility`
- `evaluate-admin-bun-copyfile-backend-workaround`
- `reevaluate-web-admin-bun-package-manager-after-web3-retirement`
- `adopt-web-admin-bun-with-bounded-install-retry`

上述归档中的Windows空cache失败、Linux双源成功和Bun NO-GO结论仍是当时输入下的有效历史证据，但不再代表当前活动package manager真值。后续采用change已基于默认持久cache、唯一lock、平台化普通/frozen入口和fail-closed完整性检查完成重新决策；历史archive不回写。

后续若调整Bun版本、cache策略、lock格式或安装重试边界，必须以独立change重新验证Windows默认cache与Linux frozen入口，不得通过切换package manager、手工补包或忽略lifecycle绕过完整性检查。

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

1. 保持Bun 1.3.14、唯一 `bun.lock`、Windows默认持久cache与Linux frozen入口；不恢复Yarn/npm fallback或双lock。
2. 保持AntD 5.29.3、`destroyOnHidden`、runtime warning局部guard与React 18 Testing Library基线，不在后续业务change顺手升级AntD 6或用console过滤隐藏诊断。

## 维护规则

- change 完成后只更新“已完成基线”和“推荐顺序”，不把 closeout 长报告复制进本文。
- 新候选必须写明收益、边界、前置条件和可执行验收；缺任一项时先评估，不直接派工。
- 数量和依赖版本是时间点证据。正式 proposal 必须重新运行搜索和依赖检查，不照抄本文数字。
- 路线状态与 OpenSpec 冲突时，以已归档主规格、最新代码和主控实时台账为准，并及时修正文档。
