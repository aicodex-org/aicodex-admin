## 1. 提案与实施前检查

- [x] 1.1 完成 proposal、design、两份 delta spec 和 tasks，并确认新增态保存时创建、敏感值 owner 与浏览器只读边界。
- [x] 1.2 运行 `openspec validate migrate-credential-edit-shells --strict` 与 `git diff --check`。
- [x] 1.3 完成实施前 review，确认 change implementation-ready。

## 2. 列表新增语义测试先行

- [x] 2.1 为 `CertListPage` 与 `KeyListPage` 补充失败测试，约束点击添加只打开携带本地草稿的编辑路由且不调用 add API。
- [x] 2.2 修改两个列表页新增入口，保持默认 draft 字段和正式列表删除行为不变。
- [x] 2.3 运行列表页聚焦测试，确认保存前不产生凭据写入。

## 3. 证书编辑页双 tabs 改造

- [x] 3.1 新增 `CertEditPage.test.tsx` 失败测试，覆盖共享壳、双 tabs/hash、唯一操作栏、添加态取消、保存时创建和生成材料回读。
- [x] 3.2 将证书页接入 `LargeEditShell` 与 `LargeEditTabs`，按基础配置和证书材料组织正文并保留现有字段条件、复制和下载行为。
- [x] 3.3 实现证书添加态从本地 draft 装载、保存调用 `addCert`、普通保存成功后切换 edit 并 `getCert` 回读、取消不删除。
- [x] 3.4 增加 submitting 状态，阻止证书重复保存并在失败后恢复可提交状态。
- [x] 3.5 运行证书编辑页聚焦测试并修复回归。

## 4. 密钥编辑页单正文改造

- [x] 4.1 新增 `KeyEditPage.test.tsx` 失败测试，覆盖共享壳、双区块、无 tabs、唯一操作栏、添加态取消、保存时创建和生成凭据回读。
- [x] 4.2 将密钥页接入 `LargeEditShell`，以基础信息和凭据与状态两个公共分类标题组织现有字段。
- [x] 4.3 实现密钥添加态从本地 draft 装载、保存调用 `addKey`、普通保存成功后切换 edit 并 `getKey` 回读、取消不删除。
- [x] 4.4 增加 submitting 状态，阻止密钥重复保存并在失败后恢复可提交状态。
- [x] 4.5 运行密钥编辑页聚焦测试并修复回归。

## 5. 公共样式与路由壳边界

- [x] 5.1 新增 scoped 凭据编辑页 LESS，复用公共正文、区块标题、字段、按钮、暗色和窄屏原子，不向 `App.less` 添加页面私有规则。
- [x] 5.2 更新大型编辑页样式聚合入口、cardless route selector 和布局契约测试，保留 `admin-access-edit-*`、`cert-edit-*`、`key-edit-*` selector。
- [x] 5.3 检查新增/修改文案的 zh/en locale 完整性，不在 UI、测试输出或文档中新增敏感值。

## 6. 自动化验证

- [x] 6.1 运行证书、密钥列表与编辑页聚焦测试，确认 add/update/delete 调用边界、错误路径和重复提交保护。
- [x] 6.2 对最终 Git diff 运行 changed implementation coverage，达到 85% 以上并记录统计对象和命令。
- [x] 6.3 运行增量 TypeScript gate、`yarn typecheck --pretty false`、聚焦 ESLint、聚焦 Stylelint 和 `yarn build`。
- [x] 6.4 运行 OpenSpec strict validate、`git diff --check` 和最终分支范围检查。

## 7. RC 浏览器验收

- [x] 7.1 使用项目脚本启动代理 60 测试后台的本地前端预览，不启动本地后端。
- [x] 7.2 只读验证证书基础配置/证书材料 tabs、hash 恢复、密钥双区块、唯一底栏、浅色/暗色、桌面/窄屏和页面级 overflow。
- [x] 7.3 检查 console/page error，并确保截图、日志和报告不包含完整证书、私钥、Access secret、Cookie 或响应体。
- [x] 7.4 更新 `verification.md`，记录自动化、覆盖率、浏览器证据和未执行真实写操作的剩余风险。
