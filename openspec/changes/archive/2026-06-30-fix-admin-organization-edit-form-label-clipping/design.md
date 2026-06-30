## Context

组织编辑页是 legacy class-based TSX 页面，主要使用 AntD `Form`、`Tabs` 和组织相关字段配置。用户截图暴露的问题集中在密码相关长标签附近，优先怀疑点包括：

- `Form` 的 `labelCol` 宽度不足或响应式配置不适合中文长标签。
- 组织编辑页外层容器、tab pane、collapse 或内容区设置了过窄宽度或 overflow。
- 最近组织列表/组织中心样式调整中的 compact shell 或 scoped class 泄漏到了编辑页 Form。

## Goals / Non-Goals

**Goals:**

- 确认根因并做 scoped 修复，确保组织编辑页长标签完整可读。
- 保持表单字段、保存 payload、密码配置选项、组织读取/保存契约不变。
- 避免全局修改 AntD Form label，除非证据显示全局样式才是根因。
- 用自动化测试和浏览器 smoke 覆盖回归风险。

**Non-Goals:**

- 不重构 `OrganizationEditPage` 页面结构。
- 不迁移或修改 `UserEditPage*`。
- 不修改 common/table/auth/provider/root shell、后端 API、组织同步、密码策略语义或认证链路。

## Approach

1. 检查 `OrganizationEditPage.tsx` 的 `Form` 布局、`labelCol/wrapperCol`、字段分组和页面 class。
2. 检查 `App.less` 中 organization scoped class、页面 shell/content 布局和近期列表页样式，判断是否存在样式泄漏。
3. 在组织编辑页范围内修复 label 宽度、换行、对齐或容器 overflow；优先使用页面 class + AntD Form class 的 scoped selector。
4. 增加聚焦测试，验证组织编辑页保留 scoped class 或样式契约，不引入全局 Form label selector。
5. 通过桌面浏览器截图验证长标签完整可见、无左侧裁切/重叠、无页面横向 overflow。

## Risks / Trade-offs

- 若仅扩大 label column，可能压缩输入区宽度；修复应在桌面保持稳定，在窄屏允许自然换行或 AntD 响应式布局兜底。
- 若改 `App.less`，必须使用组织编辑页 scoped class，避免影响其它编辑页和全局 Form。
- 浏览器 smoke 如使用 60 后台，验证记录只能保留脱敏结论和本地截图路径，不输出私有 URL、账号或响应内容。
