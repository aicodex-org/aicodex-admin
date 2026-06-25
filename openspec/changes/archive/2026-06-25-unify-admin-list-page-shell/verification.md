## 验证记录

### 自动化测试

- `yarn test --watchAll=false --runTestsByPath src/common/EnterpriseListQueryToolbar.test.tsx src/OrganizationIdentityCenter.test.tsx src/OrganizationListPage.test.tsx src/GroupListPage.test.tsx src/UserListPage.test.tsx src/ApplicationAccessMenuPages.test.tsx`
  - 结果：通过，6 个测试文件，90 个测试通过。
  - 备注：测试环境仍输出既有 React 18 `ReactDOM.render` warning，以及 jsdom `window.computedStyle` warning；未导致测试失败。
- `yarn test --watchAll=false --runTestsByPath src/common/EnterpriseListQueryToolbar.test.tsx src/ApplicationListPage.test.tsx src/ProviderListPage.test.tsx src/ApplicationAccessMenuPages.test.tsx src/GroupListPage.test.tsx src/OrganizationListPage.test.tsx src/UserListPage.test.tsx`
  - 结果：通过，7 个测试文件，106 个测试通过。
  - 覆盖追加反馈：`/applications`、`/providers`、资源、证书、密钥、Webhook 回调和 Webhook 事件列表均暴露 `.enterprise-list-page-table-shell`；Provider 身份源中心标题、动作和分页继续位于共享列表页壳；组织页目录健康可放入共享 header context，避免压缩搜索行。
  - 备注：测试环境仍输出既有 React 18 `ReactDOM.render` warning，以及 jsdom `window.computedStyle` warning；未导致测试失败。
- `yarn test --watchAll=false --runTestsByPath src/common/EnterpriseListQueryToolbar.test.tsx src/ApplicationAccessMenuPages.test.tsx src/OrganizationListPage.test.tsx`
  - 结果：通过，3 个测试文件，46 个测试通过。
  - 覆盖本轮反馈：共享 toolbar 支持标题下方独立上下文槽；组织页目录健康不再进入标题动作同一行；证书、密钥和 Webhook 回调常规“添加”按钮不再带 `PlusOutlined` 图标。
  - 备注：测试环境仍输出既有 React 18 `ReactDOM.render` warning，以及 jsdom `window.computedStyle` warning；未导致测试失败。
- `yarn typecheck`
  - 结果：通过，`tsc --noEmit` 成功。
- `yarn test --watchAll=false --coverage --collectCoverageFrom=... --runTestsByPath ...`
  - 结果：通过，覆盖本次列表页壳相关组件和页面。
  - 本次主要改动文件行覆盖率：
    - `src/common/EnterpriseListQueryToolbar.tsx`: lines 90.00%，branches 90.38%。
    - `src/OrganizationIdentityCenter.tsx`: lines 100.00%，branches 100.00%。
    - `src/OrganizationListPage.tsx`: lines 97.78%，branches 72.53%。
    - `src/UserListPage.tsx`: lines 100.00%，branches 86.75%。
  - 相关列表页覆盖率参考：
    - `src/GroupListPage.tsx`: lines 87.43%，branches 60.77%。
    - `src/ResourceListPage.tsx`: lines 93.59%，branches 63.64%。
    - `src/CertListPage.tsx`: lines 92.77%，branches 78.72%。
    - `src/KeyListPage.tsx`: lines 89.86%，branches 74.07%，functions 84.85%。
    - `src/WebhookListPage.tsx`: lines 90.28%，branches 70.37%。
    - `src/WebhookEventListPage.tsx`: lines 94.50%，branches 59.55%。
  - 剩余缺口：多个既有列表页的历史分支覆盖率低于 85%；本 change 未扩展到补齐所有旧分支，只新增共享页壳一致性断言。
- `yarn test --watchAll=false --silent --coverage --coverageReporters=json --collectCoverageFrom=... --runTestsByPath src/common/EnterpriseListQueryToolbar.test.tsx src/OrganizationIdentityCenter.test.tsx src/OrganizationListPage.test.tsx src/UserListPage.test.tsx`
  - 结果：通过，4 个测试文件，56 个测试通过。
  - 本次 TSX 改动行覆盖率：changed executable lines 100.00%。其中 `OrganizationIdentityCenter.tsx` 为 1/1，`UserListPage.tsx` 为 1/1；`EnterpriseListQueryToolbar.tsx` 和 `OrganizationListPage.tsx` 的改动行属于 JSX 属性/非 statement map 可执行行，覆盖统计为 0/0。

### OpenSpec 与 diff 检查

- `openspec validate "unify-admin-list-page-shell" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。

### 浏览器只读验证

- 本地前端：`http://127.0.0.1:7003`。
- 后台：通过 `local-dev/start-frontend-remote-backend.ps1` 代理到已配置的 60 测试后台；健康检查路径为 `/api/get-account`。报告不记录完整私有后台地址。
- 只读检查页面：
  - `/organizations`: 标题为共享 `.enterprise-list-query-toolbar-title`，添加入口位于 `.enterprise-list-query-toolbar-actions`，目录健康位于 `.enterprise-list-query-toolbar-header-context`；表头坐标与群组、身份源、应用接入列表对齐到 `y=213`，旧 `.organization-identity-compact-list-top` 不存在，横向滚动为 false。
  - `/groups`: 标题和添加/下载模板/上传位于共享 toolbar，旧 compact top 不存在，横向滚动为 false，分页子项右对齐。
  - `/users`: 标题和添加/下载模板/上传位于共享 toolbar，旧 compact top 不存在，横向滚动为 false，分页子项右对齐。
  - `/applications`: 标题和添加入口位于共享 toolbar，列表暴露 `.enterprise-list-page-table-shell.application-list-page-table-shell`，横向滚动为 false，分页子项右对齐。
  - `/providers`: 标题和添加入口位于共享 toolbar，列表暴露 `.enterprise-list-page-table-shell.provider-list-page-table-shell`，横向滚动为 false，分页子项右对齐。
  - `/resources`、`/certs`、`/keys`、`/webhooks`、`/webhook-events`: 均只有一套共享 toolbar header；有主动作的页面动作位于共享 actions，无主动作的 Webhook 事件不渲染 actions 区；横向滚动均为 false。
  - 本轮复测指标：`/providers`、`/applications`、`/resources`、`/certs`、`/keys`、`/webhooks`、`/groups`、`/organizations` 的 `titleBox.y=138`、`actionsBox.y=137`、`tableHeaderBox.y=213`；`/webhook-events` 因无动作区为 `tableHeaderBox.y=211`，仍使用共享 shell；`/users` 页面级横向滚动为 false，表格内部保留字段较多时的横向兜底。
- 反馈迭代只读复测：
  - `/organizations`: `.enterprise-list-query-toolbar-header-below-context` 渲染在标题下方独立行，`headerContextCount=0`、`sideContextCount=0`，且不属于 `.enterprise-list-query-toolbar-header-meta`；页面级横向滚动为 false。
  - `/certs`、`/keys`、`/webhooks`: actions 区“添加”按钮仍渲染文字，按钮内 `iconCount=0`、`plusCount=0`；页面级横向滚动均为 false。
- 剩余风险：浏览器快速切换列表页时控制台出现既有 “state update on a component that hasn't mounted yet” warning，涉及旧 class 组件异步请求卸载时序；本 change 未改变请求生命周期，暂不扩范围修复。

### 本轮补充验证（2026-06-25）

- `yarn test --watchAll=false --runTestsByPath src/common/EnterpriseListQueryToolbar.test.tsx src/GroupListPage.test.tsx src/UserListPage.test.tsx src/ApplicationAccessMenuPages.test.tsx src/ApplicationListPage.test.tsx src/ProviderListPage.test.tsx`
  - 结果：通过，6 个测试文件，87 个测试通过。
  - 覆盖本轮补充：共享 `EnterpriseListQueryToolbar` 支持 `actionsPlacement="topRight"`；群组、用户、应用、身份源 Provider、资源、证书、密钥和 Webhook 回调都通过同一公共属性进入右上动作壳；无主动作的 `Webhook Event` 保持无 actions 区。
  - 备注：测试环境仍输出既有 React 18 `ReactDOM.render` warning，以及 jsdom `window.computedStyle` warning；未导致测试失败。
- `yarn test --watchAll=false --silent --coverage --coverageReporters=json --coverageReporters=json-summary --collectCoverageFrom=... --runTestsByPath src/common/EnterpriseListQueryToolbar.test.tsx src/OrganizationIdentityCenter.test.tsx src/OrganizationListPage.test.tsx src/GroupListPage.test.tsx src/UserListPage.test.tsx src/ApplicationAccessMenuPages.test.tsx src/ApplicationListPage.test.tsx src/ProviderListPage.test.tsx`
  - 结果：通过，8 个测试文件，118 个测试通过。
  - 统计口径 1：受影响实现文件整文件覆盖率汇总 `lines=89.54%`、`statements=89.35%`、`functions=89.33%`。
  - 统计口径 2：基于最终 `git diff origin/hfl-test-base` 与 `coverage-final.json` 对齐的“本次变更可执行行覆盖率”为 `88/88 = 100%`。
  - 说明：`ApplicationListPage.tsx` 整文件历史覆盖率仍偏低，但本次实际改动的可执行行只有第 `408`、`538` 行，最终均被覆盖；closeout 口径采用变更可执行行覆盖率，避免被未触碰的历史分支覆盖缺口误伤。
  - 备注：测试环境仍输出既有 React 18 `ReactDOM.render` warning，以及 jsdom `window.computedStyle` warning；未导致测试失败。
- `yarn typecheck`
  - 结果：通过，`tsc --noEmit` 成功。
- `git diff --check`
  - 结果：通过。

### 本轮浏览器只读复测（本地前端代理 60 测试后台）

- 本地前端：`http://127.0.0.1:7004`。
- 启动方式：`local-dev/start-frontend-remote-backend.ps1 start -Port 7004 -BackendUrl <redacted>`；健康检查路径为 `/api/get-account`。报告不记录完整私有后台地址。
- 只读检查结果：
  - `/organizations`：标题为“组织”；`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right enterprise-list-query-toolbar-header-meta-stacked`；动作仅“添加”；目录健康上下文保留在 header 下方独立 context 槽。
  - `/groups`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right`；动作组为“添加 / 下载模板 / 上传 (.xlsx)”。
  - `/resources`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right`；动作组为“上传文件...”。
  - `/applications`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right`；动作组为“添加 / 认证源 / API 网关映射 / 审计记录”。
  - `/providers`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right`；动作仅“添加”。
  - `/certs`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right`；动作仅“添加”。
  - `/keys`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right`；动作仅“添加”。
  - `/webhooks`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta enterprise-list-query-toolbar-header-meta-top-right`；动作仅“添加”。
  - `/webhook-events`：`metaClass` 为 `enterprise-list-query-toolbar-header-meta`；无 actions 区，符合该页无主动作语义。
- 截图产物：
  - `output/playwright/organizations-7004.png`
  - `output/playwright/groups-7004.png`
  - `output/playwright/resources-7004.png`
  - `output/playwright/applications-7004.png`
  - `output/playwright/providers-7004.png`
  - `output/playwright/certs-7004.png`
  - `output/playwright/keys-7004.png`
  - `output/playwright/webhooks-7004.png`
  - `output/playwright/webhook-events-7004.png`
- 控制台观察：
  - 页面切换过程中仍有既有 warning：`Can't perform a React state update on a component that hasn't mounted yet`，涉及 `OrganizationListPage`、`GroupListPage`、`ResourceListPage`、`ApplicationListPage`、`CertListPage`、`KeyListPage`、`WebhookListPage` 等旧 class 列表页的异步更新时序。
  - 本轮未新增动作区布局相关报错；该 warning 在统一前后均可独立存在，暂不纳入本 change。
