## 1. OpenSpec 与迁移边界

- [x] 1.1 校验 proposal、design、delta spec 和 tasks。
- [x] 1.2 确认权限编辑页迁移范围不包含权限模型、权限列表页、后端 API 或审批规则语义变更。

## 2. 权限编辑页结构迁移

- [x] 2.1 在 `PermissionEditPage.tsx` 增加 dirty、submitting、active tab 和 validation 状态。
- [x] 2.2 将旧 Card title 保存按钮和正文底部重复按钮迁移为顶部返回路径、双 tabs 正文和底部固定操作栏。
- [x] 2.3 将字段组织为 `基础` 与 `规则` 两个 tabs，并在 tab 内使用 `基础信息`、`授权主体`、`资源动作`、`审批信息` 区块标题。
- [x] 2.4 保留组织、名称、显示名称、描述、模型、授权主体、资源动作、审批状态和启用状态的字段 handler 与保存 payload 语义。
- [x] 2.5 保留新增模式取消删除临时权限、保存失败回滚权限名、保存停留和 `/permissions` 返回语义。

## 3. 校验、i18n 与样式

- [x] 3.1 为权限 `名称`、`显示名称` 增加必填红星和保存前校验。
- [x] 3.2 保留现有用户/角色、资源、动作和普通用户修改限制校验，并在失败时切到对应 tab。
- [x] 3.3 为新增标题、路径、未保存状态、确认、校验、tabs、区块标题和字段 tooltip 补充 zh/en locale。
- [x] 3.4 在现有编辑页样式体系下增加 `.permission-edit-page` scoped 样式，避免影响其它页面。
- [x] 3.5 将权限详情路由纳入 cardless large edit page 路径，避免外层 content Card 破坏编辑框架高度和底部操作栏位置。
- [x] 3.6 将大型编辑页 tabs、区块标题、字段行和两行身份选项展示沉到公共结构，权限页组织/模型和角色页组织下拉统一显示名与内部标识。

## 4. 测试与验证

- [x] 4.1 更新 `RolePermissionEditPages.test.tsx` 覆盖权限双 tabs 编辑壳、固定操作栏、必填校验、dirty 取消/返回确认、保存/保存并返回和新增取消清理。
- [x] 4.2 保持角色编辑页现有测试通过，确认本 change 未回退角色页行为。
- [x] 4.3 更新 `ManagementPage.shell.test.tsx` 覆盖权限详情路由 cardless。
- [x] 4.4 运行 OpenSpec strict validate、`git diff --check`、incremental TypeScript gate、`yarn typecheck` 和聚焦 Jest。
- [x] 4.5 如本地预览可用，使用本地前端代理检查权限编辑页浅色/暗色视觉、tab 切换、底部栏位置、无横向溢出和无新增 console/page error。本轮 7004 前端已代理 60 测试后台；新 Playwright 上下文被登录页拦截，目标页视觉由用户在已登录浏览器中人工确认，dev server 日志确认最终编译无错误。
