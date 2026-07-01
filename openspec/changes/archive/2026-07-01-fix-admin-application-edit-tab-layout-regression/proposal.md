## Why

应用编辑页在近期大编辑页布局稳定化后出现 tab 回归：`提供商` tab 的表格/列表被压到左侧窄列，`界面定制` tab 切换后会白屏。该问题直接阻断管理员检查应用 Provider 绑定与界面配置，且截图显示疑似主表单 Row/Col 布局规则误伤 tab 内 full-width 内容，需要以回归 bugfix 方式修复并补测试防护。

## What Changes

- 复现并确认 `/applications/:organizationName/:applicationName` 编辑页中 `提供商` tab 被窄列压缩，以及 `界面定制` tab 白屏的真实根因。
- 收窄应用编辑页主表单 label/content 布局选择器，只作用于真正的主字段行，避免 tab pane、嵌套 Row、Provider 列表、界面定制内容等 full-width 区域继承 field-row 布局。
- 补充聚焦回归测试，覆盖 Provider tab full-width 内容不会被套用主字段行布局，以及 UI Customization tab 可切换并渲染。
- 保持应用编辑 API、保存 payload、路由语义、后端和其它业务页面不变。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 补充应用编辑页 tabs 在大编辑页布局规则下必须保持 full-width 与可切换渲染的回归约束。

## Impact

- 前端范围：`web-admin/src` 中 `ApplicationEditPage` 相关 TSX、scoped CSS 与聚焦测试。
- OpenSpec 范围：本 change 及 `admin-enterprise-identity-console-shell` delta spec。
- 不触碰组织、用户、Provider、Syncer、Gateway、Admin-2/Admin-3 UX worker 写集；不修改 API、保存 payload、后端、认证或真实环境配置。
