# 验证记录

验证日期：2026-06-23
change：`add-admin-usage-access-submenu`
preview URL：`http://localhost:7002/application-usage-access`
交付模式：`release-candidate-only`

## 自动化验证

- `yarn test --watchAll=false ApplicationUsageAccessPage.test.tsx --coverage --coverageDirectory ../application-usage-access-coverage --coverageReporters=text --collectCoverageFrom=src/ApplicationUsageAccessPage.tsx --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx`
  - 运行目录：`web-admin`
  - 结果：通过，`8 passed / 8 total`。
  - 覆盖率：`ApplicationUsageAccessPage.tsx` statements `100%` / branches `60%` / functions `100%` / lines `100%`；`ApplicationAccessServiceCredentialGovernancePanel.tsx` statements `89.76%` / branches `83.39%` / functions `91.8%` / lines `89.6%`。
- `yarn test --watchAll=false ApplicationAccessCenter.test.tsx ManagementPage.navigation.test.js TourConfig.test.js`
  - 运行目录：`web-admin`
  - 结果：通过，`23 passed / 23 total`。
- `yarn typecheck`
  - 运行目录：`web-admin`
  - 结果：通过，`tsc --noEmit` 退出码为 0。
- `node web-admin/scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 运行目录：仓库根目录
  - 结果：通过，无输出。
- `yarn build`
  - 运行目录：`web-admin`
  - 结果：通过，`Compiled successfully.`，`node mv.js` 成功将 `build-temp` 替换为 `build`。
  - 备注：仍有既有 `fs.F_OK` deprecation、Browserslist/caniuse-lite 过期提示和 CRA bundle size warning；本 change 未处理这些全局构建提示。
- `openspec validate "add-admin-usage-access-submenu" --strict`
  - 结果：通过，`Change 'add-admin-usage-access-submenu' is valid`。
- `git diff --check`
  - 结果：通过，无输出。

## 浏览器验证

工具：MCP Playwright
登录态与 API：使用合成 local admin、合成组织和 mock API 响应；未使用真实账号、Cookie、token 或真实下游环境。
截图：浏览器验证期间已本地查看桌面与移动视口；截图作为临时验证证据，不随 OpenSpec 归档提交。

- 桌面视口 `1440x900`
  - URL：`http://localhost:7002/application-usage-access`
  - 结果：`服务凭据治理` 主面板展示 `治理项对齐`，桌面表头按 `服务凭据治理 / 配置 / 诊断` 三列对齐；`usage_identity_resolver` 诊断后同一行出现 `不能推断` 和 `admin_service_credential_reference_unresolved`。
  - 横向溢出：`scrollWidth=1425`，`clientWidth=1425`，无页面级横向溢出。
  - 脱敏检查：未渲染合成 fixture 中的敏感样例值、私有 URL 样例、`Authorization` 或 `Cookie`。
  - console：最终检查无 error。
- 移动视口 `390x844`
  - URL：`http://localhost:7002/application-usage-access`
  - 结果：每个治理项行纵向展开后仍显示 `服务凭据治理`、`配置`、`诊断` 三个标签；`usage_identity_resolver` 诊断结果与配置仍在同一治理项行内。
  - 横向溢出：`scrollWidth=375`，`clientWidth=375`，无页面级横向溢出。
  - 脱敏检查：未渲染合成 fixture 中的敏感样例值、私有 URL 样例、`Authorization` 或 `Cookie`。

## 范围与剩余风险

- 本 RC 新增 Admin 前端聚焦页、路由、二级导航、locale、样式和 OpenSpec 记录，并从 `应用接入中心` 移除服务凭据治理摘要/入口卡片；未新增后端接口，未修改 Gateway、Insight、resolver 或真实凭据保存逻辑。
- 页面当前是一行一个治理项，按 key 对齐 `服务凭据治理 / 配置 / 诊断`；交接包仍为按需展开的独立预览，不默认铺到每行里。
- 浏览器验证基于 mock 的 Admin-owned 脱敏契约，能证明页面渲染、路由、导航可达、脱敏和基础布局；不能证明真实 Gateway/Insight/provider 运行态可用。
- 未执行 archive、merge、push base、删除分支或归档 session。

`lease_release=false`
`push_test=false`
