## ADDED Requirements

### Requirement: Provider 编辑页忽略失效异步完成
Provider 编辑页 SHALL 只允许当前已挂载路由与当前请求世代提交异步 state、用户消息和导航副作用。组件卸载、Provider 路由 identity 变化、同类请求被更新请求取代或证书 owner 改变后，旧请求 completion SHALL NOT 覆盖当前页面；保存 completion 即使失效也 SHALL 释放实例内保存锁。该边界 SHALL 覆盖初始化加载、证书切换、保存、删除和 SAML metadata fetch，后端 SHALL 继续作为 Provider 数据与操作结果的 truth owner。

#### Scenario: pending 请求后卸载
- **WHEN** Provider 的组织、详情、证书、保存、删除或 SAML metadata 请求仍 pending 时页面卸载
- **THEN** 请求完成 SHALL NOT 对已卸载组件提交 state、message 或 history
- **AND** non-silent React 运行 SHALL 不输出未挂载更新 warning

#### Scenario: Provider 路由快速切换且响应乱序
- **WHEN** 同一 Provider 编辑组件从一个 organization/provider identity 切换到另一个 identity，且旧路由响应晚于新路由响应完成
- **THEN** 页面 SHALL 保留新路由对应的数据、loading 和操作状态
- **AND** 旧响应 SHALL NOT 覆盖新路由或触发旧路由副作用

#### Scenario: 当前请求成功或失败
- **WHEN** 当前路由的 Provider 加载或保存请求成功或失败
- **THEN** 页面 SHALL 保持既有成功、失败、loading 恢复、保存消息和导航行为
- **AND** 保存完成 SHALL 释放实例内并发锁

#### Scenario: 证书 owner 切换且响应乱序
- **WHEN** 用户切换证书 owner 且旧 owner 证书响应晚于新 owner 响应
- **THEN** 页面 SHALL 只显示新 owner 的证书选项
- **AND** 旧响应 SHALL NOT 覆盖当前证书状态

### Requirement: 列表单元格元素使用稳定 domain identity
Webhook events、角色关联对象与 Permission resources/actions 列表单元格 SHALL 为每个渲染元素提供稳定且唯一的 domain composite key。key SHALL 基于字段 scope、未翻译业务值与同值出现序号，不得使用随机值或仅使用原始数组位置；页面 SHALL 保持输入顺序、翻译文案、链接、颜色和操作行为。

#### Scenario: 列表字段包含重复值
- **WHEN** Webhook events、角色 users/groups/roles/domains 或 Permission resources/actions 字段包含重复业务值
- **THEN** 同一单元格的每个可见元素 SHALL 保持输入顺序且具有唯一 key
- **AND** non-silent React 运行 SHALL 不输出 unique-key warning

#### Scenario: 不同业务值重排
- **WHEN** 同一行列表字段中的不同业务值重新排序并重新渲染
- **THEN** 每个业务值的 element identity SHALL 在重排前后保持稳定
- **AND** 可见顺序 SHALL 与最新输入顺序一致

#### Scenario: 角色关联对象保持链接契约
- **WHEN** 用户查看角色的 users、groups 或 roles 关联对象
- **THEN** 每个元素 SHALL 继续链接到原有对象详情路径并保持原有颜色
- **AND** domains 与 Webhook events SHALL 继续保持原有非链接标签行为

#### Scenario: Permission 标签保持文案与颜色契约
- **WHEN** 用户查看 Permission resources 或翻译后的 actions 标签
- **THEN** 标签 SHALL 保持原有文案、翻译和颜色行为
- **AND** 语言切换 SHALL NOT 改变 action 的 domain identity
