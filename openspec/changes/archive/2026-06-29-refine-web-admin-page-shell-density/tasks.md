## 1. 共享页面壳与滚动边界

- [x] 1.1 抽取共享 `PageScrollShell`，提供统一的 `header/body` 结构与正文内部滚动容器。
- [x] 1.2 调整 `ManagementPage` 内容区，让桌面端工作区标签与页面页头保持可见，长内容在正文容器内滚动。
- [x] 1.3 为窄屏/移动端补充样式降级，避免共享壳引入双重纵向滚动或页面级横向溢出。

## 2. 总览与工具页密度对齐

- [x] 2.1 更新 `EnterpriseIdentityConsolePage`，支持可选紧凑密度和更灵活的页头文案结构。
- [x] 2.2 收紧身份总览页头、正文起始留白和右侧状态区列表节奏，去掉重复 eyebrow 噪声。
- [x] 2.3 让 `ServerStorePage` 等已接入工具页复用共享页面壳和一致的顶部留白/工具栏节奏。

## 3. 验证

- [x] 3.1 更新或新增共享壳、总览和工具页相关测试。
- [x] 3.2 运行 `yarn test src/IdentityConsoleOverview.test.js src/common/EnterpriseIdentityConsoleLayout.test.tsx src/ServerStorePage.test.tsx src/ManagementPage.shell.test.tsx --watchAll=false`。
- [x] 3.3 运行 `yarn typecheck`、`yarn build`、`git diff --check` 和 `openspec validate \"refine-web-admin-page-shell-density\" --strict`。
