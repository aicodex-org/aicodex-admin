## 1. OpenSpec 与实施计划

- [x] 1.1 创建 `proposal.md`、`design.md`、delta specs 和 `tasks.md`。
- [x] 1.2 运行 `openspec validate polish-organization-edit-tabs-shell --strict` 和 `git diff --check`，确认实施前 artifacts 可用。

## 2. 组织编辑页结构改造

- [x] 2.1 在 `OrganizationEditPage.tsx` 增加 tab key、validation、dirty 和 active tab 状态。
- [x] 2.2 将现有字段按基础、品牌、登录安全、导航菜单、账号资料、多因素认证、目录服务、交易记录拆成渲染 helper，保留原字段组件和 handler。
- [x] 2.3 增加顶部返回路径、下划线 Tabs、内容滚动区和底部固定操作栏。
- [x] 2.4 保留新增取消删除临时组织、保存后主题刷新、组织变更事件和路由更新行为。

## 3. 校验、i18n 与样式

- [x] 3.1 增加 `名称`、`显示名称` 红色必填标识和保存前校验，失败时切回基础 Tab。
- [x] 3.2 密码混淆器校验失败时切换到登录安全 Tab。
- [x] 3.3 为新增 tab、路径、状态、确认和校验文案补充 zh/en locale。
- [x] 3.4 在 `App.less` 增加组织编辑页 scoped 样式：紧凑白底工作区、分区短竖线标题、全宽表格/Tree 区、固定底部操作栏、窄屏换行。

## 4. 测试与验证

- [x] 4.1 更新 `OrganizationEditPage.test.tsx` 覆盖 Tabs、固定操作栏、必填校验、hash 切换、取消/返回 dirty 确认和交易记录 Tab 条件展示。
- [x] 4.2 更新 `LargeEditFormLayout.test.ts` 保持组织页布局边界契约。
- [x] 4.3 运行 OpenSpec strict validate、`git diff --check`、incremental TypeScript gate、`yarn typecheck` 和聚焦 Jest。
- [x] 4.4 如本地预览可用，启动前端连接 60 测试后台并做组织编辑页浏览器 smoke；如不可用，在 `verification.md` 记录限制。
