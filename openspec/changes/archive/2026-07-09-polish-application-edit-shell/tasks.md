## 1. OpenSpec 与基线确认

- [x] 1.1 运行 `openspec validate polish-application-edit-shell --strict` 和 `git diff --check`，确认实施前 artifacts 可用。
- [x] 1.2 读取 `ApplicationEditPage.tsx`、`LargeEditShell.tsx`、`styles/large-edit-pages.less`、`LargeEditFormLayout.test.ts` 和既有应用编辑页回归测试，确认当前壳层、tab、表格和预览防回归边界。
- [x] 1.3 对照 `docs/design/admin-identity-console/large-edit-page-migration-guide.md` 明确应用页按多 tab 大编辑页处理，不套用群组/角色单页正文形态。

## 2. 应用编辑页壳层迁移

- [x] 2.1 在 `ApplicationEditPage.tsx` 接入 `LargeEditShell`，保留 `admin-large-edit-page application-edit-page` 与 `application-edit-card` 定位边界。
- [x] 2.2 将旧 `Card title` 保存按钮迁移到底部固定操作栏，移除正文内或 Card 标题内重复保存入口。
- [x] 2.3 增加 dirty、submitting、返回/取消确认和新增模式取消删除临时应用的兼容处理。
- [x] 2.4 保留并测试当前 tab hash 行为，无效 hash 回退到 `basic`。

## 3. Tab 正文 polish

- [x] 3.1 将基础 tab 整理为大型编辑页表单区块，重点修正 Logo、组织图标、标题等资产字段的 label、输入、预览边界。
- [x] 3.2 整理身份验证 tab，保持登录、注册、会话、自动登录和认证方式字段语义兼容。
- [x] 3.3 整理 OIDC/OAuth tab，保持 redirect URI、grant type、scope、token field、custom scope 和 token attribute 表格语义兼容。
- [x] 3.4 整理 SAML tab，保持 SAML metadata、证书、属性表格和协议开关语义兼容。
- [x] 3.5 整理提供商 tab，确保 Provider 绑定和身份源目标组织配置以全宽表格模块呈现，不被主字段行布局压缩。
- [x] 3.6 整理界面定制 tab，确保表单配置、主题配置和登录/注册/授权提示预览稳定可读且不制造页面级横向溢出。
- [x] 3.7 整理安全设置和 Reverse Proxy tab，保持安全字段、URL 列表、域名、上游地址、SSL 模式和证书选择语义兼容。
- [x] 3.8 统一 tab 内表格标题、右上操作、空态、行内小按钮、Tooltip、`aria-label` 和删除确认密度。

## 4. 校验、i18n 与样式

- [x] 4.1 为应用 `名称`、`显示名称` 增加必填标识和保存前校验，失败时激活基础 tab 并阻止保存 API。
- [x] 4.2 保留 custom scopes 现有校验，并在校验失败时激活 OIDC/OAuth tab。
- [x] 4.3 为新增可见文案补齐 zh/en locale，不新增低价值 tooltip 或硬编码中文/英文。
- [x] 4.4 在 `styles/large-edit-pages.less` 的 `.application-edit-page` 作用域内补齐壳层、表单区块、表格模块、暗色主题和窄屏规则。

## 5. 测试与浏览器验证

- [x] 5.1 更新或新增应用编辑页聚焦 Jest，覆盖统一编辑壳、底部操作栏、tab hash、必填校验、dirty 确认、保存/保存并返回和新增取消。
- [x] 5.2 更新 `LargeEditFormLayout.test.ts` 或相关样式契约测试，覆盖应用页不再使用旧 Card title 保存结构，且 full-width tab 内容不继承主字段行布局。
- [x] 5.3 运行聚焦 Jest、受影响前端代码覆盖率检查、incremental TypeScript gate、`yarn typecheck`、`yarn build`、OpenSpec strict validate 和 `git diff --check`。
- [x] 5.4 启动本地 dev 前端代理 60 后台或脱敏 mock preview，逐个检查 8 个 tab 的浅色/暗色、首屏、滚动尾部、无横向溢出、无 webpack overlay 和无新增 console/page error。
- [x] 5.5 如果迁移过程中沉淀新的应用页经验，更新 `docs/design/admin-identity-console/large-edit-page-migration-guide.md`，只记录可复用规则，不记录临时截图或私有环境信息。
