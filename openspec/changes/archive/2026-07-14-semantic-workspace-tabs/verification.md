## 自动化验证

- `cd web-admin; yarn test workspaceTabState.test.ts ManagementPage.navigation.test.tsx ApplicationEditPage.test.tsx OrganizationEditPage.test.tsx CertEditPage.test.tsx --watchAll=false --runInBand`：通过，5 个测试套件、79 个用例。覆盖对象编辑 route 的初始标题、动作子路由保护、同一列表 route 去重、不同对象和新增草稿 path 并存、应用/组织/证书详情加载后的显示名称更新、编辑显示名称后的同步更新，以及详情标题在切换到列表或其它标签后继续保持。运行中仅有既有 React 18/AntD 测试警告，无测试失败。
- `cd web-admin; yarn test workspaceTabState.test.ts ManagementPage.navigation.test.tsx ApplicationEditPage.test.tsx OrganizationEditPage.test.tsx CertEditPage.test.tsx AgentEditPage.test.tsx EnforcerEditPolicyTable.test.tsx EntryEditPage.test.tsx ModelPages.test.tsx OrderPages.test.tsx PaymentPages.test.tsx PlanPricingSubscriptionPages.test.tsx ProductCatalogPages.test.tsx ServerEditPage.test.tsx SiteEditPage.test.tsx SystemToolsMenuPages.test.tsx --watchAll=false --runInBand`：通过，16 个测试套件、227 个用例。覆盖低风险对象详情加载、仅顶层 `displayName` 更新标签、空值回退技术标识、Payment 只读场景，以及跨对象标签并存。
- `cd web-admin; yarn typecheck`：通过。
- `cd web-admin; yarn eslint src/common/workspaceTabState.ts src/common/workspaceTabState.test.ts src/enterpriseNavigation.tsx src/ApplicationEditPage.tsx src/ApplicationEditPage.test.tsx src/OrganizationEditPage.tsx src/OrganizationEditPage.test.tsx src/ManagementPage.navigation.test.tsx`：通过；仅输出既有 `caniuse-lite` 更新提示。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `openspec validate semantic-workspace-tabs --strict`、`openspec validate --changes --strict`、`git diff --check`：通过。

## Coverage

命令：

```powershell
cd web-admin
yarn test ApplicationEditPage.test.tsx ApplicationEditPageUiCustomization.test.tsx LargeEditFormLayout.test.ts ManagementPage.shell.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ApplicationEditPage.tsx
```

结果：

| 文件 | Lines | Statements | Functions | Branches |
| --- | ---: | ---: | ---: | ---: |
| `src/ApplicationEditPage.tsx` | 48.41% | 47.72% | 35.67% | 46.13% |

`ApplicationEditPage.tsx` 是既有大型 legacy 编辑页；本 change 新增的详情加载与显示名称编辑路径已由聚焦行为测试覆盖，但完整关联回归集下的 Jest 整文件覆盖率仍未达到 85% 目标。未通过忽略覆盖率或补低价值测试掩盖该缺口。

低风险对象编辑页覆盖率：

| 批次 | Lines |
| --- | ---: |
| Agent / Enforcer / Entry / Model | 89.61% - 98.80% |
| Order / Payment / Plan / Pricing / Product / Subscription | 87.20% - 93.33% |
| Server / Site / Ticket | 92.77% - 99.00% |

上述覆盖率通过对应聚焦套件与 `--collectCoverageFrom` 统计，均达到 85% 门槛。

## 标签身份策略核验

- 列表页以导航 route 作为唯一标签身份，重复打开同一列表不会增加标签。
- 已存在对象和新增草稿以完整编辑 path 作为唯一标签身份；新增流程已经创建服务端草稿，不能按资源类型强制合并为一个标签，否则后续草稿会失去可见的编辑入口。
- 购买、支付、结果等动作子路由仍不派生对象编辑标题。

## 60 测试后台浏览器验证

- 使用本地前端代理启动 `7003`，后台健康检查通过，代理请求 `/api/get-account` 和应用详情请求均返回 HTTP 200。
- Playwright 使用获授权的 60 Admin 测试账号登录成功，并验证组织列表、两个组织编辑页、接入中心和一个应用编辑页可以同时打开。两个组织标签显示各自显示名称，切换回先打开的组织后标题保持不变；应用标签也显示应用名称。
- Playwright 通过本地最新前端打开证书编辑页，确认工作页标签显示 `编辑：Built-in Cert`，页内标题显示 `编辑证书（Built-in Cert）`；两处均使用显示名称，技术名称仅保留在表单字段中。
- Playwright 通过本地最新前端打开 Agent 编辑页，确认技术名 `agent_anntnk` 的工作页标签更新为 `编辑 AI Agent：New Agent - anntnk`，显示名称优先规则在新增低风险对象页生效；页面无横向溢出。console 仅出现既有 `AgentListPage` 未挂载状态更新警告，未发现本 change 引入的运行时错误。
- 目标页面 `document.documentElement.scrollWidth === clientWidth`，未发现页面级横向溢出；浏览器 console 仅有既有 AntD 静态 API/表单提示，未发现本 change 引入的运行时错误。
- 未执行新增操作、保存或删除操作，未修改 60 配置、业务数据、服务或部署；本地 `7003` 和 Playwright session 已在验证完成后关闭。

## 归档前审查

- 已复核 `proposal.md`、`design.md`、`tasks.md` 和 delta spec：对象编辑标签、显示名称优先、列表复用、草稿独立及动作子路由保护的描述与最终实现一致，文档正文为中文且未包含敏感环境信息。
- 已重新执行 16 个聚焦 Jest 套件（227 个用例）、`yarn typecheck`、聚焦 ESLint、增量 TypeScript 门禁、`openspec validate semantic-workspace-tabs --strict`、`openspec validate --changes --strict` 和 `git diff --check`，均通过。Jest 输出仅含既有 React 18 测试库兼容警告。
- 浏览器验证已完成，不再需要额外的 60 Admin 登录会话。
- `ApplicationEditPage.tsx` 整文件覆盖率仍为 48.41%，低于归档前 85% 门槛。本 change 不以扩大无关测试或排除统计对象规避该缺口；历史页面的覆盖率治理已拆为 `improve-application-edit-testability` 独立 change。

## 结论与剩余风险

功能、源码级行为、类型检查、lint 与浏览器验证均已完成。`ApplicationEditPage.tsx` 的整文件 coverage 缺口仍存在，但用户已于 2026-07-15 明确接受本 change 的例外处置；该页的系统性测试与可测试性治理由独立的 `improve-application-edit-testability` change 继续推进。归档前审查结论：READY（已接受例外，非覆盖率达标）。
