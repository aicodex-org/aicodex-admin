# Verification

## 已通过

- `openspec validate stabilize-admin-large-edit-form-layout --strict`：通过。
- `openspec validate --changes --strict`：通过，4 个 active changes 全部通过；未触碰其它 3 个历史 active changes。
- `openspec validate --specs --strict`：通过，30 个 specs 全部通过。
- `git diff --check`：通过。
- `web-admin > node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `web-admin > yarn typecheck`：通过。
- `web-admin > yarn test --watchAll=false --runInBand LargeEditFormLayout.test.ts OrganizationEditPage.test.tsx UserEditPage.test.tsx ManagementPage.shell.test.tsx`：通过，4 suites / 55 tests；仅有既有 React 18 `ReactDOM.render` warning。
- `web-admin > yarn build`：通过，`public-scripts:build`、CRA production build 和 `mv.js` 均完成；仅有既有 `fs.F_OK` deprecation、Browserslist outdated、bundle size 和 CRA hosting 提示。
- `web-admin > AICODEX_ADMIN_DEV_PROXY_TARGET=http://127.0.0.1:18080 yarn start` + 本地脱敏 mock backend + Playwright CLI `large-edit-smoke` session：通过 1280px 浏览器 smoke，覆盖：
  - `/organizations/engineering`
  - `/users/engineering/alice`
  - `/applications/engineering/app-main`
  - `/providers/engineering/github`
  - `/syncers/directory-sync`

  证据摘要：五个路由均存在 `.admin-large-edit-page` 和 `.admin-large-edit-card`；`.admin-shell-route-scroll > .content-warp-card` 均为 0；`documentClientWidth=1280` 且 `documentScrollWidth=1280`；页面级 `pageScrollWidth=pageClientWidth=1032`；主字段 label 列为 `184px`；内容列最小值为用户页 `612.4px`；抽样行 `rowOverflow=0`。浏览器 smoke 使用脱敏 fixture，仅包含本地路径和示例组织/用户/应用/provider/syncer 名称，未使用真实 token、Cookie、账号密码或私有 URL。

## 已知验证说明

- 曾尝试组合运行 `LargeEditFormLayout.test.ts OrganizationEditPage.test.tsx UserEditPage.test.tsx ManagementPage.shell.test.tsx`，其中 `OrganizationEditPage.test.tsx` 一条异步加载测试在组合运行时触发 Jest 默认 5 秒超时；随后已单独重跑 `LargeEditFormLayout.test.ts OrganizationEditPage.test.tsx` 并通过，未发现断言回归。
- 主控窗口内曾尝试启动 Playwright CLI 做布局 smoke 时 wrapper 启动未及时返回；本轮 worker 已重新启动独立 Playwright session 完成 smoke。
- 本轮曾尝试使用项目 Cypress 执行临时 smoke spec，但本机 Cypress cache 存在路径完整性问题：期望 `C:\Users\Administrator\AppData\Local\Cypress\Cache\12.15.0\...`，实际命中 `G:\Users\Administrator\AppData\Local\Cypress\Cache\12.15.0\...`，因此未清理全局 cache，改用 Playwright CLI 完成浏览器验证。
- 浏览器 smoke 首次发现用户编辑页主字段 Row 位于 `.ant-form-item-control-input-content` 内，原通用 Row selector 未覆盖该结构，label 仍为约 `84px`。本轮已将 `.user-edit-card .ant-card-body .ant-form-item-control-input-content > .ant-row` 纳入大编辑页布局规则，并更新 `LargeEditFormLayout.test.ts` 样式契约断言；复测后用户页 label 为 `184px`。
- 单测覆盖率：N/A。本 change 的生产改动是页面 class hook 与 scoped CSS 布局规则，不新增业务逻辑、接口、保存 payload 或数据转换函数；回归保护采用源码/样式契约 Jest、受影响页面 Jest、typecheck、production build 和本地浏览器 DOM smoke。

## 剩余风险

- 本轮浏览器 smoke 使用本地脱敏 fixture 和 mock backend，覆盖布局 contract，不验证真实后端数据完整性、保存 payload、权限链路或真实登录态。
- 未提交浏览器截图或 trace；本 change 的验收证据以 DOM 数值量测、源码契约测试、聚焦 Jest、typecheck 和 build 为准。
