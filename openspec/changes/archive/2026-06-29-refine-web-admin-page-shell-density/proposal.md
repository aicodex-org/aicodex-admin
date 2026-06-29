## Why

当前 `web-admin` 身份控制台已经开始统一列表与页面壳层，但仍存在两个直接影响体验和复用的问题：一是多个长页面会跟随整个文档一起滚动，导致工作区标签和页面页头离开视口；二是总览页与工具页的页头、正文起始留白和右侧状态区密度还不一致，后续页面继续复用时容易再次发散。

现在补这个 change，是为了把已经落地的壳层治理收敛成明确契约，避免共享页面壳只停留在样式实现，后续新页面继续各写一套滚动和页头节奏。

## What Changes

- 引入共享页面滚动壳，统一页面 `header/body` 分区，让页头固定、正文内部滚动成为可复用能力。
- 调整身份控制台桌面内容区滚动边界，让工作区标签、页头和正文滚动职责分离，减少整页滚动导致的标签消失问题。
- 收紧身份总览页头、正文起始留白和右侧状态区密度，降低重复 breadcrumb/重卡片噪声。
- 让工具页在不改业务语义的前提下接入同一套页面壳节奏，减少与总览页、控制台页之间的顶部留白和滚动行为差异。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `admin-enterprise-identity-console-shell`: 补充共享页面壳、桌面正文内部滚动和总览/工具页密度一致性的行为约束。

## Impact

- 受影响前端文件：`web-admin/src/ManagementPage.js`、`web-admin/src/App.less`、`web-admin/src/IdentityConsoleOverview.js`、`web-admin/src/ServerStorePage.tsx`、`web-admin/src/common/EnterpriseIdentityConsoleLayout.tsx`、`web-admin/src/common/PageScrollShell.tsx`
- 受影响测试：`web-admin/src/IdentityConsoleOverview.test.js`、`web-admin/src/common/EnterpriseIdentityConsoleLayout.test.tsx`、`web-admin/src/ServerStorePage.test.tsx`、`web-admin/src/ManagementPage.shell.test.tsx`
- 不涉及后端接口、数据库结构或权限模型变更
