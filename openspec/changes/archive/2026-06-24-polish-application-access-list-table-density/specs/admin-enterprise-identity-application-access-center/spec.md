## ADDED Requirements

### Requirement: 应用访问对象列表体验一致性
应用接入中心 SHALL 使资源、证书、密钥、Webhook 回调和 Webhook 事件列表使用一致的企业管理台列表结构，提供统一的标题/结果摘要、主搜索、重置、更多筛选和低噪声表格操作体验，同时保持既有后端查询和业务动作语义不变。

#### Scenario: 管理员查看应用访问对象列表
- **WHEN** 管理员访问资源、证书、密钥、Webhook 回调或 Webhook 事件列表
- **THEN** 页面 SHALL 使用公共列表表格壳展示数据、分页、加载态和排序态
- **AND** 页面 SHALL 使用统一查询工具栏展示列表标题、结果数量、主搜索、重置和更多筛选入口
- **AND** 页面 SHALL 保持与组织、群组、用户列表一致的紧凑间距、表头密度和操作按钮权重

#### Scenario: 管理员执行主搜索
- **WHEN** 管理员在资源、证书、密钥、Webhook 回调或 Webhook 事件列表选择查询字段并输入关键词
- **THEN** 页面 SHALL 将选中字段和关键词映射到该页面既有后端 `field` 与 `value` 查询参数
- **AND** 页面 SHALL 保持既有分页、排序、权限、路由和返回数据处理语义
- **AND** 页面 SHALL NOT 在前端用当前页数据伪造跨字段搜索结果

#### Scenario: 管理员使用更多筛选
- **WHEN** 管理员打开更多筛选并填写资源、证书、密钥、Webhook 回调或 Webhook 事件列表支持的字段
- **THEN** 页面 SHALL 通过稳定、可解释的字段映射触发既有单字段查询能力
- **AND** 更多筛选 SHALL NOT 新增后端 API、改变请求路径或改变写入类动作
- **AND** 重置 SHALL 清空主搜索、更多筛选和已生效查询字段，并回到第一页加载列表

#### Scenario: 业务操作保持可用
- **WHEN** 管理员在应用访问对象列表中执行上传、下载、复制链接、新增、删除、查看详情或 Webhook 事件重放
- **THEN** 页面 SHALL 沿用既有方法、后端调用和成功/失败提示
- **AND** 页面 SHALL NOT 改变认证、授权、OAuth/OIDC 回调、Webhook 投递、Gateway projection 或真实凭据处理行为
