# Verification

## 调试证据

- 近期基线提交 `50a9732c fix: 稳定 Admin 大编辑页表单布局` 同时修改了 `web-admin/src/ApplicationEditPage.tsx` 和 `web-admin/src/App.less`。
- 根因证据：`ApplicationEditPage.tsx` 的 Provider tab 渲染为 `Row > Col span={24}`，而基线 CSS 使用 `.application-edit-card .application-edit-form-content > .ant-row > .ant-col:first-child` 将所有应用编辑内容区直系 Row 的第一个 Col 固定为 `184px`。Provider tab 只有一个 `Col span=24`，因此被误判为 label 列，表格随第一列一起压缩。
- RED：`web-admin > yarn test --watchAll=false --runInBand LargeEditFormLayout.test.ts` 首次未到断言时暴露了测试导入 CodeMirror/AntD ESM 的历史 Jest harness 问题；补齐测试 mock 后，新增断言按预期失败，缺少 `application-edit-full-width-row` hook，且 CSS 仍包含未排除 full-width row 的应用页直系 Row 选择器。
- UI Customization 分支证据：新增测试直接从 `providers` 切到 `ui-customization` 并调用 `renderApplicationForm()`，确认 React 节点创建不抛异常；浏览器 smoke 进一步确认界面定制 tab 渲染非空白且 console error 为 0。

## 已通过

- `web-admin > yarn test --watchAll=false --runInBand LargeEditFormLayout.test.ts`：通过，1 suite / 9 tests。
- `web-admin > yarn test --watchAll=false --runInBand LargeEditFormLayout.test.ts ManagementPage.shell.test.tsx`：通过，2 suites / 34 tests；仅有既有 React 18 `ReactDOM.render` warning。
- `web-admin > yarn typecheck`：通过。
- `web-admin > node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过，无输出。
- `web-admin > yarn build`：通过；仅有既有 `fs.F_OK` deprecation、Browserslist outdated 和 bundle size 提示。
- 基于最新 `origin/hfl-test-base`（包含 `3c375b19 fix(web-admin): 稳定接入凭据编辑页布局`）完成 `git pull --rebase --autostash origin hfl-test-base` 后，已重跑 `openspec validate fix-admin-application-edit-tab-layout-regression --strict`、`git diff --check origin/hfl-test-base..HEAD`、聚焦 Jest、`yarn typecheck`、增量 TS gate 和 `yarn build`，均通过。
- Archive 后已运行 `openspec validate --changes --strict` 和 `openspec validate --specs --strict`，均通过。

## 浏览器 smoke

- 构建产物：`web-admin/build`，由本轮 `yarn build` 生成。
- 静态预览：`npx --yes serve -s build -l 7004`，smoke 后已停止，`7004` 仅剩 `TIME_WAIT`，无 `LISTENING`。
- 浏览器工具：`playwright-cli` session `app-edit-tab-smoke`，使用本地脱敏 route mock 拦截 `/api/get-account`、`/api/get-application`、`/api/get-organizations`、`/api/get-providers`、`/api/get-certs` 和 `/api/saml/metadata`。
- 路由：`/applications/engineering/portal`，viewport `1280x900`。
- 证据文件：
  - `output/playwright/application-edit-tab-smoke.json`
  - `output/playwright/application-edit-providers-1280.png`
  - `output/playwright/application-edit-ui-customization-1280.png`
- DOM 量测摘要：
  - Provider tab：`.application-edit-full-width-row` 宽 `976px`，首个 `Col` 宽 `976px`，Provider table 宽 `976px`，内容 pane 宽 `1006px`。
  - UI Customization tab：`hasOrgChoice=true`，`hasSigninMethods=true`，`hasBlankBody=false`。
  - 两个 tab：`overlayCount=0`，`.admin-shell-route-scroll > .content-warp-card` 数量为 `0`，`documentScrollWidth=1280` 且 `documentClientWidth=1280`。
  - smoke 结束后 `playwright-cli console error`：`Total messages: 0`。

## 覆盖率说明

- 覆盖率：N/A。本次生产改动是 `ApplicationEditPage.tsx` 的布局 class hook 和 `App.less` scoped CSS 选择器收窄，不新增业务逻辑、接口、保存 payload 或数据转换函数。回归保护由 RED/GREEN 源码与样式契约 Jest、UI Customization 渲染分支测试、Management shell 聚焦测试、typecheck、增量 TS gate、production build 和浏览器 DOM smoke 覆盖。

## 剩余风险

- 浏览器 smoke 使用本地脱敏 mock，不验证真实后端数据、真实登录态、保存 payload 或权限链路。
- 初次静态 smoke 曾因兜底 API route 覆盖专用 `get-account` mock 导致 `getShortName(undefined)` 白屏；这是测试 fixture 配置错误，重建 route 顺序后 console error 为 0，未作为产品缺陷证据。
