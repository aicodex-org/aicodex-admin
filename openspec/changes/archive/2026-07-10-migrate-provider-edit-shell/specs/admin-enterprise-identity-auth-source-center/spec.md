## ADDED Requirements

### Requirement: Provider 编辑页使用共享大型编辑壳
Provider 编辑页 SHALL 复用 Admin 共享大型编辑页壳呈现页面头部、面包屑、滚动正文和底部动作栏，并保持既有 Provider 配置和保存行为兼容。

#### Scenario: Provider 编辑页头部和动作栏统一
- **WHEN** 管理员打开 Provider 新增或编辑页
- **THEN** 页面 SHALL 使用共享大型编辑页壳展示返回入口、认证源面包屑、Provider 标题和底部动作栏
- **AND** 取消、保存、保存并返回 SHALL 位于共享底部动作栏
- **AND** 页面 SHALL NOT 同时在 Card title 或页面外层渲染重复保存按钮

#### Scenario: Provider 基础配置使用共享正文样式
- **WHEN** 管理员查看 Provider 基础字段
- **THEN** 名称、显示名称、组织、类别、类型、子类型、方法、Scope 和 Provider URL 等稳定字段 SHALL 使用共享区块和字段行样式
- **AND** 标签、控件宽度、文字密度和窄屏换行规则 SHALL 与已迁移的大型编辑页保持一致

#### Scenario: Provider 配置语义保持兼容
- **WHEN** 管理员切换 Provider 类别或类型并保存
- **THEN** 前端 SHALL 继续使用既有 Provider 字段默认值、校验、保存和删除方法
- **AND** 编辑态取消 SHALL 返回 Provider 列表，添加态取消 SHALL 继续删除列表页预创建的临时 Provider
- **AND** 系统 SHALL NOT 新增 API、改变保存 payload、改变 OAuth/OIDC/SAML/WeCom/Lark 字段语义、触发真实 provider 探测、认证刷新、授权刷新或组织同步

#### Scenario: Provider 编辑页布局回归可测试
- **WHEN** 前端测试验证 Provider 编辑页
- **THEN** 测试 SHALL 覆盖共享编辑壳、共享底部动作栏、关键基础字段和旧重复按钮移除
- **AND** 测试 SHALL 能发现 Provider 编辑页回退到旧 Card title 操作区或页面底部重复按钮的回归
