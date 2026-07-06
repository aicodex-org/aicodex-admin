## MODIFIED Requirements

### Requirement: 大编辑页只保留一个主要页面壳

Admin 身份控制台 Shell SHALL 在组织、用户、应用、Provider、Syncer 等长编辑页中避免外层内容 Card 与页面内部编辑壳叠加，页面 SHALL 只保留一个主要编辑页面壳。

#### Scenario: 组织编辑页不叠加外层内容 Card
- **WHEN** 管理员在桌面端访问 `/organizations/:organizationName`
- **THEN** Shell SHALL 使用 cardless route 滚动容器承载组织编辑页
- **AND** route scroll 容器内 SHALL NOT 渲染 `.content-warp-card`
- **AND** 组织编辑页内部主编辑壳 SHALL 承载返回路径、Tabs、表单内容和固定底部动作栏
- **AND** 组织编辑页主要保存动作 MAY 位于同一编辑壳的固定底部栏，而不是 Card 标题内

#### Scenario: 用户编辑页不叠加外层内容 Card
- **WHEN** 管理员在桌面端访问 `/users/:organizationName/:userName`
- **THEN** Shell SHALL 使用 cardless route 滚动容器承载用户编辑页
- **AND** route scroll 容器内 SHALL NOT 渲染 `.content-warp-card`
- **AND** 用户编辑页内部主编辑 Card SHALL 继续承载标题、保存动作、Tabs 和表单内容

#### Scenario: 其它大编辑页复用同一单壳规则
- **WHEN** 管理员在桌面端访问应用、Provider 或 Syncer 的长编辑页
- **THEN** Shell SHALL 使用 cardless route 滚动容器承载页面
- **AND** route scroll 容器内 SHALL NOT 渲染 `.content-warp-card`
- **AND** 页面内部编辑 Card SHALL 保持既有标题、操作和业务表单行为

#### Scenario: 大编辑页不制造页面级横向溢出
- **WHEN** 管理员在 `1280px` 或 `1920px` 桌面宽度访问组织或用户长编辑页
- **THEN** Shell 根文档 SHALL NOT 因外层内容卡、表单 label gutter 或内部编辑壳叠加产生不必要的页面级横向 overflow
- **AND** 需要横向滚动的表格或局部组件 SHALL 在自身容器内处理
