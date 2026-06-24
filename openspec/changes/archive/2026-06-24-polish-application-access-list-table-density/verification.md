## 验证摘要

本次变更仅涉及 `web-admin` 前端列表体验：资源、证书、密钥、Webhook 回调和 Webhook 事件列表对齐公共列表壳、主搜索和更多筛选。未修改后端接口、权限、路由、OAuth/OIDC、Webhook 投递或真实凭据处理。

## 自动化验证

- `openspec validate "polish-application-access-list-table-density" --strict`
  - 结果：通过。
- `git diff --check`
  - 结果：通过。
- `CI=true yarn test ApplicationAccessMenuPages.test.tsx --runInBand --silent`
  - 工作目录：`web-admin`
  - 结果：通过，`1` 个 test suite，`15` 个测试全部通过。
  - 说明：本轮新增测试覆盖公共查询 helper、空搜索/重置、移动端横滚 fallback、CRUD/上传/刷新/重放失败分支、拒绝响应和 Webhook 事件详情抽屉分支。使用 `--silent` 仅用于压制项目既有 React 18 `ReactDOM.render`、jsdom `window.computedStyle(elt, pseudoElt)` warning，不改变断言或退出码。
- `yarn typecheck --pretty false`
  - 工作目录：`web-admin`
  - 结果：通过。
- `yarn eslint src/ResourceListPage.tsx src/CertListPage.tsx src/KeyListPage.tsx src/WebhookListPage.tsx src/WebhookEventListPage.tsx src/common/ApplicationAccessListControls.tsx src/ApplicationAccessMenuPages.test.tsx`
  - 工作目录：`web-admin`
  - 结果：通过。
  - 已知输出：`Browserslist: caniuse-lite is outdated`，未阻塞命令。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 工作目录：`web-admin`
  - 结果：通过。

## 覆盖率

- 命令：
  `CI=true yarn test ApplicationAccessMenuPages.test.tsx --runInBand --silent --coverage --coverageReporters=text --collectCoverageFrom=src/ResourceListPage.tsx --collectCoverageFrom=src/CertListPage.tsx --collectCoverageFrom=src/KeyListPage.tsx --collectCoverageFrom=src/WebhookListPage.tsx --collectCoverageFrom=src/WebhookEventListPage.tsx --collectCoverageFrom=src/common/ApplicationAccessListControls.tsx`
- 结果：通过，受影响实现文件行覆盖率达到 85% 目标。
- 统计摘要：
  - All files：语句 `92.27%`，分支 `69.87%`，函数 `90.38%`，行 `92.9%`。
  - `ApplicationAccessListControls.tsx`：语句 `100%`，分支 `92.3%`，函数 `100%`，行 `100%`。
  - `ResourceListPage.tsx`：行 `93.58%`。
  - `CertListPage.tsx`：行 `92.77%`。
  - `KeyListPage.tsx`：行 `89.85%`。
  - `WebhookListPage.tsx`：行 `90.27%`。
  - `WebhookEventListPage.tsx`：行 `94.49%`。
- 说明：覆盖率补测聚焦本次触达的查询工具栏、更多筛选映射、列/操作回调、移动端 fallback、上传/删除/刷新/重放和拒绝响应分支，未通过无行为断言制造行覆盖。

## 浏览器预览

- 预览 URL：`http://localhost:7002`
- 前端进程：`node` 监听 `7002`，命令行为当前工作区 `D:\CodeRepo\LeagProject\aicodex-1\aicodex-admin\web-admin\node_modules\@craco\craco\scripts\start.js`。
- API 代理：`/api/get-account` 经 `7002` 代理返回 JSON，未返回前端 HTML。当前 `8000` 后端监听进程来自另一个本地 worktree，因此本次浏览器检查只作为当前前端写集的 UI 预览证据，不作为当前 worktree 后端 smoke。
- 检查结果：
  - 根页面可渲染，dev overlay 已清除，浏览器 console 无 error/warning。
  - `资源` 页显示统一 toolbar、上传按钮、主搜索、查询、重置、更多筛选；更多筛选展开后字段为 `提供商:`、`组织:`、`应用:`、`用户:`、`名称:`、`类型:`、`格式:`。
  - `证书` 页显示统一 toolbar、添加按钮、更多筛选，列头为 `名称 | 组织 | 显示名称 | 范围 | 类型 | 加密算法 | 位大小 | 有效期（年） | 创建时间 | 操作`。
  - `密钥` 页显示统一 toolbar、添加按钮、更多筛选，列头为 `名称 | 组织 | 显示名称 | 类型 | Access key | 更新时间 | 状态 | 操作`。
  - `Webhook 回调` 页显示统一 toolbar、添加按钮、更多筛选，列头为 `名称 | 组织 | 链接 | 方法 | 内容类型 | 事件 | 已启用 | 创建时间 | 操作`。
  - `Webhook 事件` 页显示统一 toolbar、更多筛选，列头为 `Webhook Name | 组织 | Status | Attempt Count | Next Retry Time | 操作`；更多筛选展开后包含 `Webhook Name:` 和 `Status:`，状态字段为下拉选择入口。
- 已知预览日志：CRA/webpack 开发服务输出 Node deprecation、Browserslist 过期和 `MaxListenersExceededWarning`，未阻塞页面渲染；这些不属于本次业务代码变更。

## TypeScript 迁移结论

五个目标页当前均为 `.tsx`，本次新增共享 helper 也使用 `.tsx`。没有需要从 `.js` 迁移到 `.ts/.tsx` 的目标页面。

## 剩余风险

- 浏览器预览使用当前前端工作区 + 本地有效 API 代理；由于本次未启动当前 worktree 后端进程，不能作为当前 worktree 的完整前后端 smoke 结论。
