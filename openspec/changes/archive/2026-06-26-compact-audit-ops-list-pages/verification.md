## 验证记录

### 自动化验证

- `openspec validate "compact-audit-ops-list-pages" --strict`：通过。
- `yarn typecheck`：通过。
- `yarn test src/AuditOperationsListPages.test.tsx --watchAll=false`：通过，1 个测试套件，10 个测试；新增断言覆盖四个审计运维列表不渲染 `.ant-table-cell-fix-left/right`，避免固定列边界造成部分列有分界、部分列没有；新增断言覆盖操作日志详情抽屉存在内部滚动容器、摘要区、低噪声复制按钮，复制内容为脱敏展示值，且对象载荷不再使用固定小高度。
- `yarn test src/AuditOperationsListPages.test.tsx src/AuditOperationsCenter.test.tsx src/ManagementPage.navigation.test.js src/common/NavItemTree.test.js --watchAll=false`：通过，4 个测试套件，25 个测试；覆盖“登录会话”导航/配置树/旧审计运维中心入口文案，以及会话列表用户列、应用列、挂载后请求和 `组织/用户/应用` rowKey。
- `yarn test src/AuditOperationsListPages.test.tsx src/AuditOperationsCenter.test.tsx src/ManagementPage.navigation.test.js src/common/NavItemTree.test.js src/common/workspaceTabState.test.ts --watchAll=false`：通过，5 个测试套件，51 个测试；复验“操作日志 / Operation Logs”在列表标题、审计运维中心入口、侧边导航、配置树和工作页 tab 中一致。
- `yarn test src/AuditOperationsListPages.test.tsx src/AuditOperationsCenter.test.tsx src/ManagementPage.navigation.test.js src/common/NavItemTree.test.js src/common/WorkspaceTabs.test.tsx src/IdentityEvidenceChainPage.test.tsx src/IdentityAssetRelationshipDrawer.test.tsx --watchAll=false`：通过，7 个测试套件，43 个测试；复验“令牌管理 / Token Management”和“验证码记录 / Verification Code Records”在审计运维菜单、列表标题、工作页 tab、配置树和证据链跳转入口中一致。
- `yarn test src/AuditOperationsListPages.test.tsx src/common/EnterpriseListQueryToolbar.test.tsx --watchAll=false --coverage --collectCoverageFrom=src/common/LegacyListPageToolbar.tsx --collectCoverageFrom=src/auditOperationsListTable.ts --collectCoverageFrom=src/SessionListPage.js --collectCoverageFrom=src/RecordListPage.js --collectCoverageFrom=src/TokenListPage.js --collectCoverageFrom=src/VerificationListPage.js`：通过，2 个测试套件，22 个测试。
  - `LegacyListPageToolbar.tsx` 行覆盖率 100%。
  - `auditOperationsListTable.ts` 行覆盖率 100%。
  - `SessionListPage.js` 行覆盖率 88.88%。
  - `RecordListPage.js` 行覆盖率 95.08%。
  - `TokenListPage.js` 行覆盖率 97.61%。
  - `VerificationListPage.js` 行覆盖率 100%。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn build`：通过；仍有项目既有 Browserslist 过期、`fs.F_OK` deprecation 和 bundle size 提示。
- `git diff --check`：通过。

### 浏览器验证

- 使用 `local-dev/start-frontend-remote-backend.ps1` 只启动本地前端 `http://127.0.0.1:7004/`，代理到 60 测试后台；后台健康路径返回 JSON。报告不记录完整私有后台 URL 或响应体。
- Playwright 验证 `/sessions`、`/records`、`/tokens`、`/verifications`：
  - 四页均存在统一列表查询工具栏、统一表格壳和“更多筛选”入口。
  - 四页均不再渲染审计运维摘要块、统计卡片、入口卡片或风险提示卡片。
  - 四页列表工具栏 y 坐标约为 147px，相比保留摘要块时更早进入首屏。
  - 四页均生成 `.ant-table-header` 和 `.ant-table-body`，表格 body 使用 `max-height: calc(100vh - 360px)`；页面本身未检测到纵向滚动。
  - 登录会话、操作日志在当前 60 数据下可滚动表格 body，滚动 body 后表头坐标保持不变；令牌管理、验证码记录当前数据不足以触发表体滚动，但已应用同一 `scroll.y` 配置。
  - 四页表头过滤图标数量为 0。
  - 四页“更多筛选”均可展开。
  - 四页表格内容区域 `scrollWidth <= clientWidth`，未检测到横向溢出。
  - 四页不再配置固定首列或固定操作列；浏览器 DOM 检查 `.ant-table-cell-fix-left/right` 数量均为 0，在已消除横向滚动的桌面表格中，避免 AntD 固定列边界形成不一致竖向分割线。
  - 令牌授权码、访问令牌和验证码未在列表可见文本中出现。
- Playwright 验证 `/sessions` 登录会话列表：
  - 页面展示“登录会话”，不再出现“会话核对”。
  - 表头为“用户、组织、应用、创建时间、会话ID、操作”，`name` 字段按用户语义展示。
  - 当前数据前 10 行 rowKey 均包含 `组织/用户/应用`，且未检测到重复 key。
  - Session ID 列默认只展示前 2 个 ID，超出部分展示“+N 更多”，避免历史 Session ID 把列表行撑成大块空白。
  - 单个 Session ID 的“踢出该会话”确认框使用会话页局部 Popconfirm 样式，宽度约 360px，标题和 Session ID 明细分层展示。
  - 行级“全部删除”确认框放到操作按钮左侧，使用短标题和明细 description，宽度约 360px，避免贴右侧边界时被长文案撑宽。
  - 点击“+N 更多”后右侧抽屉展示全部 Session ID，并在摘要区展示用户、组织、应用和 Session ID 数量；抽屉内容与标题区保持 24px 内边距，Session ID 使用两列排布，关闭图标稳定可见。
  - 当前验证标签页控制台未出现未挂载 `setState` warning 或重复 key warning。
- Playwright 验证 `/records` 操作日志详情抽屉：
  - 页面菜单、工作页 tab 和列表标题展示“操作日志”，英文文案使用 `Operation Logs`。
  - 点击首条操作日志详情后，抽屉存在 `.audit-record-detail-drawer` 和 `.audit-record-detail-content`。
  - 详情内容容器 `overflow-y: auto`，可从当前滚动位置滚动到最大滚动位置。
  - 摘要区 `.audit-record-detail-summary` 存在，摘要元信息项数量为 4。
  - 技术请求详情、脱敏响应、脱敏对象载荷 3 个折叠面板默认展开。
  - 详情内容区为白底，摘要区仅保留底部分隔，折叠区无外框，减少卡片堆叠感。
  - 脱敏响应和脱敏对象载荷渲染为 2 个 `.audit-record-detail-code-panel`，宽度跟随内容区域。
  - 脱敏响应编辑器高度为 180px；脱敏对象载荷编辑器高度随内容展开，不再固定为 220px，滚动交给详情内容主容器。
  - 复制按钮数量为 2，分别标注“复制 脱敏响应”和“复制 脱敏对象载荷”；点击对象载荷复制按钮后，按钮短暂切换为对勾成功态，不触发全局静态 message。
  - 打开抽屉和点击复制后，当前验证标签页控制台未出现 `Editor` 内部 `fillWidth/dark` DOM 属性透传警告，也未出现 AntD 静态 message warning。

### 剩余风险

- 本次不改公共列表壳全局变量，不触碰 `ListPageTable`、`EnterpriseListQueryToolbar`、`ListPageRowActions` 的基础样式。
- 本地浏览器验证覆盖 1440px 桌面视口；窄屏继续沿用现有移动端表格行为。
- 旧页面仍是 JS class 组件，未做完整 TypeScript 迁移。
- Playwright 快速连续切换旧 class 页面时，浏览器控制台可出现卸载后异步 `setState` warning；本次未改旧页面生命周期，后续可单独治理。
- 登录态本身会写入业务 `ExpireTime` 并在读取会话用户时检查过期；但 `session` 索引表中的 `sessionId[]` 当前只限制最多保留 100 个 ID，未看到按过期时间定期清理历史 ID 的机制。因此列表里很早之前的 Session ID 更可能是过期索引残留，不代表这些登录态仍然有效。本次只收敛前端展示和操作语义，后端过期索引清理建议后续单独治理。
