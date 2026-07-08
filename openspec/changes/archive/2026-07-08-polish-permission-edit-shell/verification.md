# 验证记录

## 自动化验证

- `openspec validate polish-permission-edit-shell --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。
- `cd web-admin; yarn test src/RolePermissionEditPages.test.tsx --watchAll=false --runInBand`
  - 结果：通过，18 个测试通过。
  - 备注：测试环境输出既有 React 18 `ReactDOM.render` 警告，不影响本次断言。
- `cd web-admin; yarn test src/ManagementPage.shell.test.tsx --watchAll=false --runInBand`
  - 结果：通过，27 个测试通过。
  - 备注：测试环境输出既有 React 18 `ReactDOM.render` 警告，不影响本次断言。
- `cd web-admin; yarn typecheck --pretty false`
  - 结果：通过。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过。

## 覆盖率

- `cd web-admin; yarn test src/RolePermissionEditPages.test.tsx --coverage --collectCoverageFrom=src/PermissionEditPage.tsx --collectCoverageFrom=src/RoleEditPage.tsx --collectCoverageFrom=src/common/LargeEditShell.tsx --watchAll=false --runInBand`
  - 统计对象：`web-admin/src/PermissionEditPage.tsx`、`web-admin/src/RoleEditPage.tsx`、`web-admin/src/common/LargeEditShell.tsx`
  - 结果：通过。
  - 总覆盖率：语句 97.75%，分支 80.28%，函数 97.22%，行 97.71%。
  - 文件覆盖率：`PermissionEditPage.tsx` 语句 98.24%、行 98.2%；`RoleEditPage.tsx` 语句 96.72%、行 96.69%；`LargeEditShell.tsx` 语句 100%、行 100%。
  - 备注：受影响前端实现文件的语句、函数和行覆盖率均达到 85% 目标；分支低于 85% 的部分来自 legacy 组件已有防御分支和可选渲染分支，本轮以聚焦行为断言覆盖新增壳、下拉展示、校验、保存和路由语义。

## 浏览器 Smoke

- `local-dev/start-frontend-remote-backend.ps1 restart -Port 7004 -BackendUrl <redacted> -BackendHealthPath /api/get-account`
  - 结果：通过；本地 7004 前端代理到 60 测试后台，`/api/get-account` 健康检查返回 JSON。
  - 脱敏：验证记录不写入完整后台 URL、Cookie、token、账号密码或响应体。
- 权限编辑页人工视觉确认：
  - 结果：用户在已登录浏览器中确认基础 tab、规则 tab、组织/模型两行下拉、固定底部操作栏和整体布局可定稿。
- Playwright MCP 只读检查：
  - 结果：新浏览器上下文可打开 7004，但被登录页拦截；登录页 console 仅有既有 AntD `Spin tip` / `Form.Item name` warning，未发现 webpack overlay。
- Dev server 编译日志：
  - 结果：最终尾部为 `Compiled successfully!` / `No issues found.`。
- 剩余风险：本轮未在自动化浏览器中复用用户登录态执行权限编辑页 tab 切换和下拉点击；该项由人工截图验收覆盖。
