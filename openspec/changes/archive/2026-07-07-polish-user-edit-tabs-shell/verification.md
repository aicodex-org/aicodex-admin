## 验证记录

### OpenSpec

- `openspec instructions apply --change "polish-user-edit-tabs-shell" --json`
  - 结果：通过，`progress.total=12`、`progress.complete=12`、`state=all_done`。
- `openspec validate "polish-user-edit-tabs-shell" --strict`
  - 结果：通过，输出 `Change 'polish-user-edit-tabs-shell' is valid`。

### 代码与类型检查

- `git diff --check`
  - 结果：通过，无 whitespace error 输出。
- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：通过，退出码 0。
- `cd web-admin; yarn typecheck`
  - 结果：通过，`tsc --noEmit` 退出码 0。
- `cd web-admin; npx eslint src/GroupEditPage.tsx src/UserEditPage.tsx src/OrganizationEditPage.tsx src/common/LargeEditShell.tsx`
  - 结果：通过，退出码 0。
  - 说明：命令输出既有 Browserslist `caniuse-lite is outdated` 提示；本 change 未更新浏览器数据或锁文件。

### 聚焦 Jest

- `cd web-admin; yarn test src/UserEditPage.test.tsx --watchAll=false --runInBand`
  - 结果：通过，`UserEditPage.test.tsx` 19/19 passed。
- `cd web-admin; yarn test src/OrganizationEditPage.test.tsx --watchAll=false --runInBand`
  - 结果：通过，`OrganizationEditPage.test.tsx` 18/18 passed。
- `cd web-admin; yarn test src/GroupEditPage.test.tsx --watchAll=false --runInBand`
  - 结果：通过，`GroupEditPage.test.tsx` 19/19 passed。
  - 说明：命令仍输出既有 React 18 `ReactDOM.render` 和 AntD `act(...)` console warnings；退出码为 0，本 change 未处理测试框架迁移噪声。

### 受影响文件覆盖率

- `cd web-admin; yarn test src/UserEditPage.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/UserEditPage.tsx`
  - 结果：通过，`UserEditPage.test.tsx` 19/19 passed。
  - 统计对象：`src/UserEditPage.tsx`。
  - 覆盖率：statements 87.59%，lines 87.23%，functions 90.37%，branches 69.57%。
  - 说明：语句、行和函数覆盖率达到 85% 目标；分支覆盖率未达到 85%，主要受 `UserEditPage.tsx` 既有大量字段类型、即时动作和错误分支影响。本 change 已通过聚焦用例覆盖共享壳、固定业务 tabs、hash、固定操作栏、dirty 确认、提交中防重复、保存回滚、删除、目录同步只读、旧字段回调和不可见 active tab 回落。

### 60 前端预览

- `.\local-dev\start-frontend-remote-backend.ps1 status -Port 7002`
  - 结果：通过，脚本管理的 `frontend-remote-7002` 为 running，前端监听 `http://127.0.0.1:7002`，代理后端健康路径为 `/api/get-account`。
- `Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:7002/"`
  - 结果：通过，HTTP 200。
- `Get-Content -Tail 80 local-dev/logs/frontend-remote-7002.log`
  - 结果：最新日志包含 `Compiled successfully!` 与 `webpack compiled successfully`；修复共享壳替换后的 `GroupEditPage.tsx` 缩进后，dev server 已消除当前 ESLint overlay。
- 说明：
  - 本轮只记录脱敏预览状态；未输出 60 测试后台真实 URL、Cookie、token、账号密码或响应体。
  - 已完成前端代理和根页面可访问验证；未使用登录态进入具体用户编辑对象路由做浏览器 UI smoke。用户编辑页交互证据来自聚焦 Jest、typecheck、coverage 和 dev server 编译状态。

### 用户编辑 tab UI polish 复查

- 预览入口：`http://127.0.0.1:7002/__preview/user-edit-tabs`
  - 结果：通过，dev-only 静态预览路由可访问。
  - 说明：该路由只在 `NODE_ENV === "development"` 注册，使用本地 mock 数据展示真实 `UserEditPage` tab/字段布局，不读取或写入 60 后台用户数据。
- Playwright 视口：1440x960，逐个点击 tab 后截图。
  - `output/playwright/user-edit-basic-final.png`
  - `output/playwright/user-edit-identity-final.png`
  - `output/playwright/user-edit-access-final.png`
  - `output/playwright/user-edit-security-final.png`
  - `output/playwright/user-edit-connections-final.png`
  - `output/playwright/user-edit-records-final.png`
- DOM 检查：
  - 结果：通过，`基础`、`身份认证`、`权限管理`、`安全`、`第三方登录`、`记录` 均能正确激活并同步 hash。
  - 结果：通过，6 个 tab 的页面级横向溢出均为 0。
  - 结果：通过，`基础`、`安全`、`记录` 滚到底后最后一项距离固定底部操作栏约 103-104px，底部操作栏不遮挡内容。
  - 结果：通过，用户编辑页字段 label 计算色值为 `rgb(15, 23, 42)`，对齐组织编辑页使用的 `var(--admin-shell-text-primary, #333542)` 主文本色。
  - 结果：通过，`user-edit-form-item-section` 残留数量为 0，确认未保留上一轮过度 section 化样式。
  - 结果：通过，dev-only 视觉预览路由挂载 `body.user-edit-visual-review-active`，隐藏外层登录态 message 容器，截图中无可见“请先登录”遮挡。
  - 结果：通过，逐 tab hover 扫描 54 个字段问号，`lowValue=[]`；已清除 tooltip 等于 label 或 `... - Tooltip` 占位的提示。
- UI 评估与修正：
  - 按复查反馈撤回 tab 正文 section 化方向；普通字段保持表单行布局，只处理标签/控件对齐、合理行距和 720px compact 控件宽度。
  - 用户编辑页字段 label 颜色对齐组织编辑页主文本色；未把安全 tab 的表格型字段改成普通属性 section。
  - 安全页字段 tooltip 文案补充为可解释用途的说明：密码、MFA 设置项、多因素认证、WebAuthn 凭据、上次修改密码时间、托管账户、Face IDs、MFA 账户。
  - 记录页删除无价值问号：购物车、交易、Consents 等复读或占位 tooltip 不再显示。
  - 上传字段修正为稳定尺寸：头像单块、证件照三块不再被压缩成窄竖条。
  - 第三方登录修正预览 provider 数据，去除 SAML 破图，并将绑定项收敛为紧凑列表。
  - 表格类字段仍保留表格自身边框和内部横向滚动，避免把旧宽表挤坏到页面级横向溢出。
  - 追加截图：`output/playwright/user-edit-security-label-color-check.png`，用于复查安全 tab label 色彩与组织编辑页一致性。
  - 追加截图：`output/playwright/user-edit-connections-recheck.png`，用于复查第三方登录普通 provider 列表。
  - 追加截图：`output/playwright/user-edit-connections-empty-recheck.png`，用于复查无可展示 provider 时的第三方登录空态。
- 第三方登录空态复查：
  - 预览入口：`http://127.0.0.1:7002/__preview/user-edit-tabs?providers=empty#connections`
  - 结果：通过，空 provider 分支渲染 AntD `Empty`，不再只显示一条横线。
  - 结果：通过，普通态 `rows=2`、空态 `rows=0` 且 `hasEmpty=true`；两种状态 `pageOverflowX=0`。
  - 结果：通过，普通态和空态截图检查无 console warning/error 或 page error。
- 记录 tab 交易表复查：
  - 评估结论：不建议只拉宽外层表单。1920 视口下正文可用宽度约 1622px，完整交易列宽约 1830px，单纯拉宽仍可能保留横向滚动；本轮改为用户编辑页内嵌交易表只展示关键列。
  - 预览入口：`http://127.0.0.1:7002/__preview/user-edit-tabs#records`
  - 结果：通过，交易表头为 `名称 / 创建时间 / 应用 / 域名 / 金额`，保留完整交易列表页的全列模式。
  - 结果：通过，`wrapperWidth=1020`、`contentClientWidth=1017`、`contentScrollWidth=1017`、`tableWidth=1017`、`internalOverflowX=0`、`pageOverflowX=0`。
  - 结果：通过，最终截图 `output/playwright/user-edit-records-table-width-after-clean.png` 无交易表内部横向滚动条；console warning/error 和 page error 均为 0。
  - 说明：预览 fixture 中 Consents mock 数据同步修正为同一应用一行、`grantedScopes` 数组，避免重复 `rowKey` warning 污染记录 tab 视觉验证。
- 基础 tab 地址字段复查：
  - 问题：`Address` 字段是“字段 label + 地址 1/2 两个子输入”的三列旧 JSX，被统一两列表单 grid 误套后出现子 label 和输入框错位。
  - 修正：`Address` 改为一个外层字段行，右侧 `.user-edit-address-lines` 内部垂直排列 `地址 1 / 地址 2` 两行子控件；移动端降级为子 label 在输入框上方。
  - 结果：通过，截图 `output/playwright/user-edit-basic-address-fixed-visible.png` 中地址字段可见、两行子控件横向对齐，未与底部操作栏重叠。
  - DOM 指标：`lineCount=2`、地址字段 `bottom=581`、底栏 `top=843`、`overlapsFooter=false`、`pageOverflowX=0`。
  - 说明：浏览器 console 仍有既有 AntD `Input.Group`、`dropdownMatchSelectWidth`、message static function 警告；本轮未处理这些旧 warning。
- 记录 tab 授权记录 i18n 复查：
  - 问题：`consent` 命名空间在中文包中仍使用英文值，导致记录 tab 中 `Consents`、`Granted scopes`、`Delete` 直接回退为英文 UI。
  - 修正：补齐 `zh` 的授权记录、授权范围、撤销确认和 OAuth 授权页相关文案；同步将 `en` 的 `Consents - Tooltip` 从占位文案改成真实说明。
  - 结果：通过，截图 `output/playwright/user-edit-records-consents-i18n.png` 中外层 label、表格标题、表头和行操作分别显示为 `授权记录`、`已授权范围`、`撤销`。
  - DOM 指标：`授权记录=true`、`已授权范围=true`、`撤销=true`、`hasEnglishFallback=false`、`pageOverflowX=0`。
  - 说明：浏览器 console 仅有 React DevTools 开发提示；未出现新增 warning/error。
- 基础 tab 组织选择复查：
  - 问题：组织下拉把内部 `name` 标识直接作为选中态和选项主文案展示，真实组织标识较长时可读性差。
  - 修正：组织 `Select` 保持 `value=organization.name` 和提交 `user.owner` 不变；选中态使用 `organization.displayName`，下拉选项以显示名称为主、标识为弱化辅助信息；搜索同时匹配显示名称和标识。
  - 结果：通过，截图 `output/playwright/user-edit-basic-organization-display-name.png` 中选中态显示 `Sales`，下拉选项显示 `Engineering/Sales`，并附带弱化的 `engineering/sales` 标识。
  - DOM 指标：选择前 `selectedText=Engineering`；选择 `Sales` 后 `selectedText=Sales`、`bodyIncludesSalesId=false`、`pageOverflowX=0`。
  - 单测覆盖：`shows organization display names while keeping owner identifier as submitted value` 验证选项 `label` 为显示名、`value` 为标识，`onChange("sales")` 后 `user.owner=sales`。
  - 说明：浏览器 console 仍有既有 AntD `Input.Group`、`dropdownMatchSelectWidth`、message static function 警告；本轮未处理这些旧 warning。
- 权限管理 tab 空角色/权限复查：
  - 问题：真实用户无角色或权限时，`Roles` / `Permissions` 分支仍渲染字段 label，但右侧 tag 列表为空，形成 label-only 空行。
  - 修正：角色或权限名称数组为空时对应字段返回 `null`；有数据时仍显示原 tag 列表，并为 tag 列表补本地稳定 key，消除该分支的 React unique key warning。
  - 结果：通过，截图 `output/playwright/user-edit-access-empty-roles-permissions-fixed-final.png` 中空角色/权限场景只保留 `群组`、状态开关和 `IP 白名单`，不再出现空白 `角色` / `权限` 行。
  - DOM 指标：空场景 `hasRoleText=false`、`hasPermissionText=false`、`hasGroupText=true`、`pageOverflowX=0`。
  - 有数据场景：`hasRoleTags=true`、`hasPermissionTags=true`、`pageOverflowX=0`；浏览器 console 仅有 React DevTools 开发提示，角色/权限 tag 的 unique key warning 已消失。
  - 单测覆盖：`hides empty roles and permissions without removing populated tags` 验证空数组返回 `null`，有值时保留 `role-a` / `permission-a` tag。
  - 说明：空场景浏览器 console 仍有既有 AntD `Form.Item name is only used for validate React element` 警告；本轮未处理该旧 warning。
- 最新验证命令：
  - `cd web-admin; npx eslint src/UserEditPage.tsx src/UserEditPage.test.tsx`
    - 结果：通过，退出码 0；仍有既有 Browserslist `caniuse-lite is outdated` 提示。
  - `cd web-admin; npx eslint src/UserEditPage.tsx src/UserEditPage.test.tsx src/UserEditVisualReviewPage.tsx`
    - 结果：通过，退出码 0；仍有既有 Browserslist `caniuse-lite is outdated` 提示。
  - `cd web-admin; npx eslint src/UserEditPage.tsx src/table/ConsentTable.tsx`
    - 结果：通过，退出码 0；仍有既有 Browserslist `caniuse-lite is outdated` 提示。
  - `cd web-admin; yarn typecheck`
    - 结果：通过，`tsc --noEmit` 退出码 0。
  - `cd web-admin; yarn test src/UserEditPage.test.tsx --watchAll=false --runInBand`
    - 结果：通过，`UserEditPage.test.tsx` 21/21 passed。
  - `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
    - 结果：通过，退出码 0。
  - `cd web-admin; yarn test src/UserEditPage.test.tsx src/TransactionPages.test.tsx --watchAll=false --runInBand`
    - 结果：通过，2 个 test suites passed，23/23 passed。
    - 说明：命令仍输出既有 React 18 `ReactDOM.render` 测试框架 warning；退出码为 0，本 change 未处理测试框架迁移噪声。
  - `git diff --check`
    - 结果：通过，无 whitespace error 输出。

### 归档后验证（2026-07-07）

- `openspec archive polish-user-edit-tabs-shell -y`
  - 结果：通过，change 已归档到 `openspec/changes/archive/2026-07-07-polish-user-edit-tabs-shell`；主规格同步 `admin-enterprise-identity-console-shell` 1 处修改、`admin-enterprise-organization-identity-center` 2 个 requirement 新增。
- `openspec validate --changes --strict`
  - 结果：通过，3 个 active changes passed，0 failed。
- `openspec validate --specs --strict`
  - 结果：通过，31 个 specs passed，0 failed。
- `git diff --check`
  - 结果：通过，无 whitespace error 输出。
- `cd web-admin; yarn build`
  - 结果：通过，`Compiled successfully`，`mv.js` 将 `build-temp` 重命名为 `build`。
  - 说明：命令仍输出既有 Browserslist `caniuse-lite is outdated`、`fs.F_OK` deprecation 和 CRA bundle size 提示；退出码为 0，本 change 未更新构建依赖或分包策略。

### 归档前补充验证（2026-07-07）

- 补充代码修正：
  - 新增 `src/table/UserEditTablePolish.test.tsx`，覆盖用户编辑内嵌表格的标题去重、右上 toolbar 操作、MFA 账户列宽/i18n、内嵌交易表关键列、Face ID 上传、WebAuthn 注册提示和 Consent 撤销反馈。
  - 将 `zh.general.Successfully revoked` 从英文 fallback 修正为 `撤销成功`，避免授权撤销成功消息在中文模式下显示英文。
- 验证命令：
  - `cd web-admin; yarn test src/table/UserEditTablePolish.test.tsx --watchAll=false --runInBand`
    - 结果：通过，`UserEditTablePolish.test.tsx` 9/9 passed。
  - `cd web-admin; npx eslint src/table/UserEditTablePolish.test.tsx src/table/ConsentTable.tsx src/table/FaceIdTable.tsx src/table/ManagedAccountTable.tsx src/table/MfaAccountTable.tsx src/table/WebauthnCredentialTable.tsx src/table/TransactionTable.tsx src/UserEditPage.tsx`
    - 结果：通过，退出码 0；仍有既有 Browserslist `caniuse-lite is outdated` 提示。
  - `cd web-admin; yarn typecheck`
    - 结果：通过，`tsc --noEmit` 退出码 0。
  - `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
    - 结果：通过，退出码 0。
  - `cd web-admin; yarn test src/UserEditPage.test.tsx src/table/MfaTable.test.tsx src/table/UserEditTablePolish.test.tsx src/TransactionPages.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/UserEditPage.tsx --collectCoverageFrom=src/common/LargeEditShell.tsx --collectCoverageFrom=src/table/MfaTable.tsx --collectCoverageFrom=src/table/MfaAccountTable.tsx --collectCoverageFrom=src/table/ManagedAccountTable.tsx --collectCoverageFrom=src/table/FaceIdTable.tsx --collectCoverageFrom=src/table/WebauthnCredentialTable.tsx --collectCoverageFrom=src/table/ConsentTable.tsx --collectCoverageFrom=src/table/TransactionTable.tsx`
    - 结果：通过，4 个 test suites passed，40/40 passed。
    - 覆盖率统计对象：`UserEditPage.tsx`、`LargeEditShell.tsx` 和本轮改动的用户编辑内嵌表格组件。
    - 覆盖率：All files statements 88.04%，lines 87.98%，functions 86.04%，branches 69.41%。
    - 说明：语句、行和函数覆盖率达到 85%；branch 覆盖率仍低于 85%，主要来自 `UserEditPage.tsx` 既有字段分支和 JSX 条件渲染。新增测试覆盖本 change 的用户可见行为和表格回调风险，不通过排除受影响文件制造覆盖率。
    - 说明：命令仍输出既有 React 18 `ReactDOM.render` 测试框架 warning；退出码为 0，本 change 未处理测试框架迁移噪声。

### 表格标题与表头文字样式复查（2026-07-07）

- 问题：组织编辑页 `认证方式` 表格 title 与 `名称 / 规则 / 操作` 表头列名在视觉上存在一粗一细的漂移；用户页表格也应沿用同一密度规则。
- 修正：在 `App.less` 中为组织编辑页 `organization-config-table-section`、`ldap-table-section`、`account-table-section` 的表头列名补齐 `color: var(--admin-shell-text-primary)` 和 `font-weight: 500`；用户编辑页表头列名同步显式主文本色。
- 浏览器复查：
  - 预览入口：`http://127.0.0.1:7002/__preview/user-edit-tabs#security`
  - 结果：通过，用户页 MFA 表头 `名称` computed style 为 `fontSize=12px`、`fontWeight=500`、`color=rgb(15, 23, 42)`、`lineHeight=20px`。
- 验证命令：
  - `git diff --check`
    - 结果：通过，无 whitespace error 输出。
  - `Get-Content -Tail 20 local-dev/logs/frontend-remote-7002.log`
    - 结果：通过，最新日志包含 `Compiled successfully!` 与 `webpack compiled successfully`。

### 用户编辑表格壳收口复查（2026-07-07）

- 评估结论：
  - 用户编辑页应同步组织编辑页的可复用表格模块规则：表头密度、表格 title/toolbar、操作右上、页面级无横向溢出。
  - 不应照搬组织页的业务表格结构；用户页左侧字段 label 已经承担字段名，因此表格内部不再重复同名 title，title 区域只保留添加、上传、二维码、链接等表格操作。
  - 宽表不继续拉宽外层用户表单；对用户编辑嵌入式表格按实际可用宽度压缩列宽，长文本继续使用 ellipsis，避免破坏左侧标签网格。
- 代码修正：
  - `MfaTable`、`WebAuthnCredentialTable`、`ManagedAccountTable`、`FaceIdTable`、`MfaAccountTable`、`ConsentTable` 的用户编辑场景表格 toolbar 对齐为右上操作，不再重复字段名。
  - 用户页表格标题条、表头、单元格、按钮高度和字号收敛到 12px 轻量密度；`MFA账户`、托管账户、MFA 设置项和嵌入式交易表列宽调整为无内部横向滚动。
  - `MfaAccountTable` 的 `Issuer` / `Origin` 改为 i18n key；WebAuthn 添加成功提示改为 i18n。
- 浏览器复查：
  - 预览入口：`http://127.0.0.1:7002/__preview/user-edit-tabs`
  - `安全` tab：5 个表格 `tableOverflows=[0,0,0,0,0]`，`pageOverflowX=0`。
  - `记录` tab：交易表 `txOverflow=0`、授权表 `consentOverflow=0`、`pageOverflowX=0`，金额文本完整显示为 `$128.5 (美元)` / `$42 (美元)`。
  - `第三方登录` tab：`pageOverflowX=0`，无表格 title 残留。
  - 最终截图：
    - `output/playwright/user-edit-security-table-toolbar-polish-final.png`
    - `output/playwright/user-edit-security-lower-table-toolbar-polish-final.png`
    - `output/playwright/user-edit-records-transaction-no-horizontal-scroll-final.png`
    - `output/playwright/user-edit-connections-table-polish-final.png`
- 最新验证命令：
  - `cd web-admin; npx eslint src/UserEditPage.tsx src/table/WebauthnCredentialTable.tsx src/table/ManagedAccountTable.tsx src/table/FaceIdTable.tsx src/table/MfaAccountTable.tsx src/table/ConsentTable.tsx src/table/TransactionTable.tsx`
    - 结果：通过，退出码 0；仍有既有 Browserslist `caniuse-lite is outdated` 提示。
  - `cd web-admin; yarn typecheck`
    - 结果：通过，`tsc --noEmit` 退出码 0。
  - `cd web-admin; yarn test src/UserEditPage.test.tsx src/table/MfaTable.test.tsx src/TransactionPages.test.tsx --watchAll=false --runInBand`
    - 结果：通过，3 个 test suites passed，31/31 passed。
    - 说明：命令仍输出既有 React 18 `ReactDOM.render` 测试框架 warning；退出码为 0，本轮未处理测试框架迁移噪声。
  - `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
    - 结果：通过，退出码 0。
  - `git diff --check`
    - 结果：通过，无 whitespace error 输出。

### Final closeout after latest base fast-forward（2026-07-07）

- 背景：工作分支 fast-forward 到最新 `origin/hfl-test-base` 后，`web-admin/src/App.less` 与 `web-admin/src/GroupEditPage.tsx` 出现 stash pop 冲突；已按共享 `LargeEditShell` 方向合并，并保留最新 base 的 identity object 字段密度样式。
- 验证命令：
  - `cd web-admin; yarn typecheck`
    - 结果：通过，`tsc --noEmit` 退出码 0。
  - `cd web-admin; yarn test src/UserEditPage.test.tsx src/GroupEditPage.test.tsx src/OrganizationEditPage.test.tsx src/table/MfaTable.test.tsx src/table/UserEditTablePolish.test.tsx src/TransactionPages.test.tsx --watchAll=false --runInBand`
    - 结果：通过，6 个 test suites passed，77/77 passed。
    - 说明：命令仍输出既有 React 18 `ReactDOM.render` 与 AntD `act(...)` 测试框架 warning；退出码为 0，本轮未处理测试框架迁移噪声。
  - `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
    - 结果：通过，退出码 0。
  - `openspec validate --changes --strict`
    - 结果：通过，3 个 active changes passed，0 failed。
  - `openspec validate --specs --strict`
    - 结果：通过，31 个 specs passed，0 failed。
  - `git diff --check`
    - 结果：通过，无 whitespace error 输出。
  - `cd web-admin; yarn build`
    - 结果：通过，`Compiled successfully`，`mv.js` 将 `build-temp` 重命名为 `build`。
    - 说明：命令仍输出既有 Browserslist `caniuse-lite is outdated`、`fs.F_OK` deprecation 和 CRA bundle size 提示；退出码为 0，本 change 未更新构建依赖或分包策略。
