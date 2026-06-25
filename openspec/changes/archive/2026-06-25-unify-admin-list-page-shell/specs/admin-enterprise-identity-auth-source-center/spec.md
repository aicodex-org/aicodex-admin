## ADDED Requirements

### Requirement: 身份源中心列表页壳统一
身份源/认证源中心 Provider 列表页 SHALL 使用同一套共享列表页壳呈现标题、查询控件、右侧动作、辅助上下文和分页区域，并保持既有 Provider 列表业务操作语义兼容。

#### Scenario: Provider 标题和动作位于共享工具栏
- **WHEN** 管理员在桌面端访问 `/providers`
- **THEN** Provider 列表标题 SHALL 由共享查询工具栏 header 呈现
- **AND** 新增或等价主动作 SHALL 位于共享查询工具栏动作区
- **AND** 页面 SHALL 暴露共享 `.enterprise-list-page-table-shell` 作为列表页壳边界
- **AND** 页面 SHALL NOT 在 Provider 列表前新增页面私有 top action、摘要卡、接入诊断条或对象信息弹出入口造成标题或动作漂移

#### Scenario: Provider 分页展示规则一致
- **WHEN** Provider 列表渲染分页
- **THEN** 分页 SHALL 使用共享分页配置或等价公共 helper
- **AND** 总数、页码、每页条数和跳页区域 SHALL 作为右侧分页组呈现
- **AND** 页面 SHALL NOT 为身份源中心单独实现不同顺序、不同权重或不同间距的分页导航

#### Scenario: Provider 既有业务语义保持兼容
- **WHEN** 管理员使用 Provider 列表查询、更多筛选、排序、分页、新增、编辑或删除
- **THEN** 前端 SHALL 继续复用既有后端查询、删除、跳转、权限和确认弹窗契约
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件、触发 OAuth/OIDC 授权、真实 provider 探测、组织同步、认证刷新、授权刷新或 Gateway projection publish

#### Scenario: 自动化检查覆盖身份源列表壳漂移
- **WHEN** 前端测试验证 Provider 列表页
- **THEN** 测试 SHALL 覆盖共享工具栏标题、动作区、分页配置和共享表格壳 class
- **AND** 测试 SHALL 能发现新增入口、分页配置或外层壳脱离共享列表页壳的回归
