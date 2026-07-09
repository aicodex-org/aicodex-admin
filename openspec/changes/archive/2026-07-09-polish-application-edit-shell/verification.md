# 验证记录

验证日期：2026-07-08 至 2026-07-09。

## 自动化验证

- `yarn test src/ApplicationEditPage.test.tsx src/LargeEditFormLayout.test.ts src/RolePermissionEditPages.test.tsx --watchAll=false --runInBand`
  - 结果：通过，3 个 test suite，40 条测试通过。
  - 备注：测试输出仍包含既有 React18 `ReactDOM.render` 与 rc-tabs `act(...)` warning；未导致测试失败。
- `yarn test src/LargeEditFormLayout.test.ts src/IdentityObjectEditFormLayout.test.ts src/RolePermissionEditPages.test.tsx src/ApplicationEditPage.test.tsx --watchAll=false --runInBand`
  - 结果：通过，4 个 test suite，50 条测试通过。
  - 备注：覆盖组织、用户、应用、群组、角色、权限这些已改造编辑页的壳层/正文样式契约；新增断言要求字段 label、legacy Row/Col 首列 label、单 tab 身份对象页 label 统一引用 `--admin-large-edit-label-color`，并要求页面 root/card/body/mobile、暗色表单控件状态、字段 grid/row/wide、section 标题、字段 label、字段错误等重复编辑页基础原子走 `admin-large-edit-*-base()` LESS mixin。测试输出仍包含既有 React18 `ReactDOM.render` 与 rc-tabs/rc-select `act(...)` warning；未导致测试失败。
- `yarn test src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`
  - 结果：通过，18 条测试通过。
  - 备注：新增断言要求表格标题工具栏、标题文字、标题帮助图标、focus ring、toolbar 小按钮、行内小操作按钮和 icon-only 操作按钮走公共 LESS mixin，避免组织/用户/后续编辑页重复写同一套 tab 内小操作样式。
- `yarn test src/auth/Provider.test.ts src/ApplicationEditPage.test.tsx src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`
  - 结果：通过，3 个 test suite，31 条测试通过。
  - 备注：覆盖 Provider logo 空 URL fallback、透明深色图片 logo 的浅色徽标容器、应用编辑页 full-width 表格模块和大型编辑页公共样式契约。测试输出仍包含既有 React18 `ReactDOM.render` 与 rc-tabs/rc-select `act(...)` warning；未导致测试失败。
- `yarn test src/ApplicationEditPage.test.tsx --watchAll=false --runInBand`
  - 结果：通过，8 条测试通过。
  - 备注：补充验证 SAML tab 增加本地化 Tooltip 后，应用编辑页 tab 渲染和切换不回归。测试输出仍包含既有 React18 `ReactDOM.render` 与 rc-tabs/rc-select `act(...)` warning；未导致测试失败。
- `yarn test src/ApplicationEditPage.test.tsx src/ApplicationIdentitySourceBindings.test.tsx src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`
  - 结果：通过，3 个 test suite，33 条测试通过。
  - 备注：覆盖应用编辑基础 tab 资产字段从旧二级 Row/Col 嵌套迁移为单字段轴线、界面定制 tab 背景图 URL 字段同轴线化、Provider 身份源目标组织表头复用统一 `Setting.getLabel` tooltip、应用编辑单位后缀中文化，以及大型编辑页正文公共样式契约。测试输出仍包含既有 React18 `ReactDOM.render` 与 rc-tabs/rc-select `act(...)` warning；未导致测试失败。
- `yarn test src/ApplicationEditPageUiCustomization.test.tsx --watchAll=false --runInBand`
  - 结果：通过，1 个 test suite，2 条测试通过。
  - 备注：覆盖真实运行数据形态的界面定制 tab 可渲染，并锁定登录方式、登录项、注册项表格的 `className`、`tableLayout`、`scroll.x` 和名称列宽，避免短字段列再次被宽屏容器拉伸或脱离应用页表格宽度样式。
- `Get-Content -Raw web-admin/src/locales/{zh,en}/data.json | ConvertFrom-Json -AsHashtable`
  - 结果：通过。
  - 备注：验证 SAML tooltip 新增 zh/en locale 后 JSON 可解析。
- `yarn test src/ApplicationEditPage.test.tsx --coverage --collectCoverageFrom=src/ApplicationEditPage.tsx --watchAll=false --runInBand`
  - 结果：通过，11 条测试通过。
  - 覆盖率对象：`src/ApplicationEditPage.tsx`。
  - 覆盖率：Statements 39.58%，Branches 39.25%，Functions 29.44%，Lines 40.17%。
  - 结论：未达到 85% 目标。该文件仍是历史超大 legacy class component，本 change 已用聚焦行为测试和浏览器 smoke 覆盖壳层、tabs、校验和预览关键路径；后续若继续拆分应用页，应逐步把 tab 内容拆小后补充更高价值覆盖。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过。
- `yarn typecheck --pretty false`
  - 结果：通过。
- `yarn build`
  - 结果：通过。
  - 备注：输出包含既有 `fs.F_OK` deprecation、Browserslist outdated 和 bundle size 提示。
- `openspec validate polish-application-edit-shell --strict`
  - 结果：通过。
- `openspec validate --changes --strict`
  - 结果：归档前通过；归档后重跑返回 `No items found to validate`，符合本 change 已移入 archive 且当前无 active change 的状态。
- `git diff --check`
  - 结果：通过。
- `web-admin/src/styles/large-edit-pages.less` 公共样式收敛复核
  - 结果：通过。
  - 备注：已把可稳定复用的 page root、card、card body、mobile page/card、dark control state、field grid、field row、wide row、section title、marker、field label、switch label、required mark、colon、control、error、legacy Row/Col label，以及表格 toolbar、标题文字、帮助图标、focus ring、toolbar 小按钮、行内小操作按钮、icon-only 操作按钮收敛为公共 LESS mixin；已合并组织、用户、应用、群组、角色、权限的 no-card route container 挂载 selector；组织 LDAP、导航树、应用静态预览和权限/账号类业务表格保留页面作用域，不做强抽象。
- `rg "<<<<<<<|=======|>>>>>>>" web-admin/src openspec/changes/archive/2026-07-09-polish-application-edit-shell docs/design/admin-identity-console openspec/specs/admin-enterprise-identity-application-access-center/spec.md openspec/specs/admin-enterprise-identity-console-shell/spec.md -n`
  - 结果：通过，限定本 change 与前端源码范围内未发现冲突标记。

## 基线同步复测

- 已同步最新 `hfl-test-base` 到 `8a020bf3 fix: 修复组织同步提示布局并完善本地预览配置`。
- 权限页提交新增的 `LargeEditTabs`、`LargeEditSection`、`LargeEditFieldRow` 保留在 `LargeEditShell.tsx` 中；应用页 tab 已改为复用 `LargeEditTabs`，没有覆盖权限页公共壳实现。
- `styles/large-edit-pages.less` 保留权限页新增公共壳实现，并把应用页可复用的 tab 正文 section、表格密度、行内小按钮、暗色表单/表格规则收敛到 `admin-large-edit-*` 公共 class；没有修改 `.permission-edit-page` 作用域。
- 归档并重放到最新基线后已重跑 `openspec validate --changes --strict`、`openspec validate --specs --strict`、`git diff --check`、聚焦 Jest、incremental TypeScript gate、`yarn typecheck --pretty false`、`yarn build` 和 `ApplicationEditPage.tsx` 覆盖率检查。

## 浏览器 smoke

本地预览：

- 本地前端代理 60 测试后台：用于人工预览和真实数据形态 UI 复测，不在仓库记录可直连 URL、Cookie、token 或账号凭据。
- 本地脱敏 mock preview：用于自动化 UI smoke，不记录可直连 URL、私有后台地址、Cookie、token 或账号凭据。

Playwright CLI smoke 覆盖路径：

- 页面：`/applications/engineering/portal`
- Tabs：基础、身份验证、OIDC/OAuth、SAML、提供商、界面定制、安全设置、Reverse Proxy。
- 浅色模式结果：8 个 tab 均可切换，section title 正确，`application-edit-shell` 和底部操作栏存在，`documentOverflowX/bodyOverflowX/scrollContentOverflowX` 均为 false，无 webpack overlay。
- 暗色模式结果：8 个 tab 均可切换，暗色 class 生效，section title 和 card 背景切为暗色，`documentOverflowX/bodyOverflowX/scrollContentOverflowX` 均为 false，无 webpack overlay。
- Console：干净会话仅有 React DevTools info，Errors 0，Warnings 0。
- 公共正文样式复测：脱敏 mock preview 覆盖 8 个 tab，均命中 `admin-large-edit-form-content` 和 `admin-large-edit-content-section-title`；OIDC/OAuth、SAML、提供商、界面定制、Reverse Proxy 的表格命中公共 `admin-large-edit-form-content .ant-table-*` 规则，页面级横向溢出均为 false，无 webpack overlay，Console Errors 0、Warnings 0。
- 字段 label token 复测：临时启动本地脱敏 mock preview，覆盖应用编辑页 8 个 tab；共检查 43 个字段 label 的 computed color，均等于 `--admin-large-edit-label-color` 解析值 `rgb(15, 23, 42)`；提供商 tab 仅包含全宽表格，记录为无字段 label tab；页面级和滚动正文横向溢出均为 false，无 webpack overlay，Console Errors 0、Warnings 0。
- 最终滚动截图复测：`local-dev/tmp/playwright-smoke/application-edit-ui-review-final4-light` 与 `application-edit-ui-review-final4-dark` 覆盖 8 个 tab 的首屏和滚动尾部。结果：浅色/暗色均为 8 个 tab、Console Errors 0、Warnings 0、badTabs 0、无 webpack overlay、无页面级横向溢出、无表格横向溢出；仅基础 tab 的两个 `data:image` 长输入存在控件内部 scrollWidth，大图预览正常，不构成页面布局溢出。
- Provider 与密集表格复测：暗色 Provider tab 中 GitHub 透明深色 logo 已有浅色徽标容器，SAML 无 logo 时显示文字 fallback；界面定制 tab 中登录项在宽屏下不显示无意义横向滚动条，注册项等更宽表格仍保留必要的表内横向滚动，行内操作列固定在右侧，初始视口即可看到上移、下移和删除操作。
- 截图：临时截图保存在 `local-dev/tmp/playwright-smoke/`，仅用于本地检查，不提交仓库。

真实 60 后台滚动截图复测：

- 入口：本地前端代理 60 测试后台的应用编辑路由，仓库记录中使用环境别名和路由类型，不写入可直连 URL、组织名或应用名。
- 覆盖：基础、身份验证、OIDC/OAuth、SAML、提供商、界面定制、安全设置、反向代理 8 个 tab；每个 tab 均通过工具切换并按内部滚动容器截取 top/mid/bottom 或 top 分段。
- 结果：8 个 tab 均无 `body` 级横向溢出；表格保持正文 full-width，未出现外层横向滚动；基础、OIDC/OAuth、SAML、界面定制、安全设置、反向代理中显式标记的内容型控件宽度生效，compact 为 420px，medium 为 720px。
- UI 结论：短枚举下拉不再铺满正文；URL、client secret、SAML metadata、HTML/CSS、预览区和宽表格保留整行宽；固定底部操作栏未遮挡最后一屏核心字段。
- 截图与报告：本轮截图/JSON 产物用于本地人工评估后已清理，不提交仓库；不记录账号凭据、Cookie、token 或完整后台地址。

真实 60 后台局部 UI 回归：

- 入口：本地前端代理 60 测试后台的应用编辑路由，仓库记录中使用环境别名和路由类型，不写入可直连 URL、组织名或应用名。
- 基础 tab：图标与组织图标字段改为“同一字段 label/control 轴线 + 输入右侧预览框”；浏览器度量显示 `assetRows=2`、`resourceDetailRows=0`，图标行与标题行 label/control 的 x 坐标一致，`bodyHasHorizontalOverflow=false`。
- 提供商 tab：`Provider 身份源目标组织` 表格的“目标组织/生效组织”表头改为复用 `Setting.getLabel` 统一 tooltip；浏览器度量显示目标组织表头仅 1 个 question-circle icon，hover tooltip 可见，`bodyHasHorizontalOverflow=false`。
- 界面定制 tab：登录方式、登录项、注册项改为内容感知表格宽度，保留统一表格壳、表头和按钮样式；1920px 视口下登录方式表 maxWidth 921px、名称列约 317px、登录项表 maxWidth 1221px、名称列 240px，两张表左边界均对齐到表单控件轴线 x=440，`scrollWidth == clientWidth`，无表内横向滚动条，页面级 `documentOverflowX=false`；背景图 URL 与移动端背景图 URL 改为单字段轴线 + 输入右侧预览框，浏览器度量显示 `uiImageRows=2`、`oldResourceDetailRows=0`，`documentOverflowX/bodyOverflowX/scrollContentOverflowX=false`；底部 `Header HTML/Footer HTML` 中文文案已统一为 `页头 HTML/页脚 HTML`。
- 单位文案：OIDC/OAuth tab 的 `Hours` 已本地化为 `小时`，安全设置 tab 的 `Times/Minutes/Seconds` 已本地化为 `次/分钟/秒`；浏览器度量显示中文单位存在、英文单位无残留。
- Console：本轮真实 60 UI 回归未发现 failed request；仍有既有 AntD warning：`Spin tip only work in nest or fullscreen pattern`、`Form.Item name is only used for validate React element`，不属于本次资产字段/tooltip 改动引入。
- 截图与 JSON：本地验证产物位于 `web-admin/output/playwright/application-edit-basic-assets.png`、`application-edit-provider-tooltip.png`、`application-edit-ui-result.json`、`application-ui-customization-*.png`、`application-ui-customization-result.json`，仅用于本地检查，不提交仓库；不记录账号凭据、Cookie、token 或完整后台地址。

## 剩余风险

- 自动化浏览器 smoke 使用脱敏 mock 数据，证明 UI 壳层、tab、表格、预览和横向溢出行为，不等价于真实 60 后台保存链路端到端验收。
- `ApplicationEditPage.tsx` 覆盖率未达 85%，原因是页面仍包含大量 legacy tab JSX、上传、SAML metadata、Provider 绑定和 Reverse Proxy 分支。当前 change 已补聚焦行为测试；更高覆盖率应随后续组件拆分推进。
- Provider、界面定制等表格列多，保留表内横向滚动；未强行压缩到无横滚，避免损伤宽配置表的列可读性。
