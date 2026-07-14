# 验证记录

## 范围与边界

本次仅验证 Admin `web-admin` 对既有 readback 的状态派生、界面展示和中英文文案。未改动 Insight、Admin readback API、secure handoff package schema、grant/redeem/confirm、凭据 material、TTL 或 owner contract。

## TDD 记录

- RED：先增加“接入包可复制 + 两项扩展能力待配置”与“接入包生成前置条件阻断”的 DOM 测试；旧展示仍把运行能力缺口并入交接阻断，断言失败。
- GREEN：实现独立的 package readiness 与 runtime capability readiness 派生后，聚焦测试通过。前者决定复制 CTA 是否 fail-closed，后者仅表达用量身份映射和 Gateway 组织投影的后续运行能力。
- Modal RED/GREEN：先增加“查看技术诊断”入口、Modal 打开/关闭、URL 直达且能力详情无嵌套技术 disclosure 的失败断言；再以 AntD Modal 取代嵌套 Collapse，使测试通过。

## 自动化验证

- `ApplicationUsageAccessPage.test.tsx`：15/15 通过，覆盖接入包可复制/运行能力完整、接入包可复制/两项扩展能力待配置、真实生成前置条件阻断、技术诊断 Modal 的入口/关闭/URL 直达，以及 loading、empty、请求错误、权限不足、复制中、复制成功与失败等反馈。
- changed-file coverage：统计对象为受影响的前端实现；statements 85.75%，lines 85.48%，functions 95.51%，达到受影响实现不低于 85% 的要求。branches 76.28% 仅作补充指标，未作为本 change 的达标判定依据。
- incremental TypeScript gate：通过。
- `yarn typecheck`：通过。
- `yarn build`：通过；仅出现既有 Browserslist 数据过期与 bundle 体积提示，未产生构建错误。
- `openspec validate separate-admin-handoff-runtime-readiness-ui --strict`：通过。
- `git diff --check`：通过。

### 2026-07-14 RC fresh revalidation

- `CI=true yarn test --coverage --runInBand ApplicationUsageAccessPage.test.tsx`：15/15 通过；受影响实现 `ApplicationAccessServiceCredentialGovernancePanel.tsx` 的 lines 85.48%（312/365）、functions 95.51%（85/89），达到 85% 门槛；branches 76.28%（328/430）仅作补充指标。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、`yarn typecheck`、`yarn build`：通过。构建仅输出既有 Browserslist 数据提示，无构建错误。
- `openspec validate separate-admin-handoff-runtime-readiness-ui --strict` 与 `git diff --check`：通过。

## 浏览器与运行态

- 本地前端代理预览保持可用；随后使用既有部署脚本将 RC 工作分支提交部署到 60 测试环境。部署脚本健康检查通过，Admin 容器运行且无重启；未修改数据库、配置或 fixture。
- Playwright 以已授权 60 测试登录态完成 1440x900 默认态、技术诊断 Modal、Esc 关闭与焦点回归，以及 Tab/Enter 展开/收起能力详情；390x844 默认态、能力详情和技术诊断 Modal 均已截图检查。两个 390px 状态下 document/body 的 `scrollWidth === clientWidth === 390`。
- 目标 readback API 均为成功响应；console error 为 0。真实页面首屏显示“接入包可复制”“2 项扩展能力待配置”，复制 CTA 可用，未出现“交接阻断”或“部分缺失”。复制成功不在本轮重做：只读 runtime audit 明确禁止创建新 grant、重新复制包、redeem 或 confirm，仍以既有受控自动化和用户截图作为该状态的证据。

## 只读 runtime closure audit（60 测试环境）

- package gate：当前 Admin 组合包实现会输出 copy-safe metadata 与脱敏 `secure_handoff_grant` envelope；持久化 grant 只做状态计数审计，已确认状态存在。未读取或记录 grant ID、nonce、package hash、raw envelope、credential reference 或凭据 material。
- Insight binding gate：当前 active pointer 存在；`admin_owner` 以及 Profile activation gate 所需的另外两个组件均为 secure handoff 来源的 bound/active、confirmed 等价状态。Dry-run 与 Doctor 的已存状态均为 passed。Insight readback/model 约束 secret material 只供后端加密存储使用，不进入 UI/readback。
- capability classification：用量身份映射与 Gateway 组织投影均 `required-for-package=false`、`required-for-Profile-activation=false`、`required-for-runtime-data-completeness=true`。前者缺口可能影响没有一等本地映射时的用量身份完整度；后者缺口可能影响 Gateway 组织投影完整度。两者不参与当前 Insight activation gate。
- 审计同时发现 active Profile 的最近验证时间戳与激活事件缺失；这使“当前 Profile 已重新验证并新鲜启用”无法由本轮 readback 证明。该 Insight owner 风险与两项扩展能力分类分开记录，Admin UI 不以绿色状态掩盖它。

## 结论与待验收项

源码、测试、类型和构建层验证支持以下 UI 语义：接入包 ready + runtime partial 时首屏显示“接入包可复制”和“2 项扩展能力待配置”，CTA 保持可用，并明确不影响接入包导入与 Profile 启用；package blocked 时 CTA 保持 fail-closed。业务能力详情不再嵌套技术折叠；技术证据由“查看技术诊断”在 Modal 中按需呈现。两种目标视口、Modal、console/network 与页面级横向溢出均已在真实认证态下验证。

## 归档前审查

审查范围内未发现实现、契约、国际化、注释或验证记录脱敏的阻断问题。技术诊断 Modal 继续只消费既有 Admin readback，不补算 Provider 运行事实；新增中英文 locale 已成对定义，route 与 alias 仍仅在按需打开的 Modal 中出现。

本 change 仍为 RC：不 archive、不合入基线或 test。Insight active Profile 的重新验证时间戳/激活事件需要 Insight owner 另行处理；该风险不阻塞本 change 的 package/runtime 状态分层，但需要主控决定是否作为跨仓路线 follow-up。
