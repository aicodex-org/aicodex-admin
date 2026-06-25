## ADDED Requirements

### Requirement: 应用接入配置列表页壳统一
应用接入下的资源、证书、密钥、Webhook 回调和 Webhook 事件列表页 SHALL 使用同一套共享列表页壳呈现标题、查询控件、右侧动作、辅助上下文和分页区域，并保持各自配置对象的业务操作语义兼容。

#### Scenario: 标题和动作位于共享工具栏
- **WHEN** 管理员在桌面端访问 `/resources`、`/certs`、`/keys`、`/webhooks` 或 `/webhook-events`
- **THEN** 页面对象标题 SHALL 由共享查询工具栏 header 呈现
- **AND** 新增、上传或等价主动作 SHALL 位于共享查询工具栏动作区
- **AND** 证书、密钥和 Webhook 回调的常规新增入口 SHALL 使用与组织、群组、用户一致的文字按钮，不额外渲染页面私有 `PlusOutlined` 图标
- **AND** 上传等具备明确动作语义的入口 MAY 保留对应动作图标
- **AND** 无主动作的列表 SHALL 保留同一套标题和查询布局，不额外占用页面私有 top action 区

#### Scenario: 分页展示规则一致
- **WHEN** 应用接入配置列表渲染分页
- **THEN** 分页 SHALL 使用共享分页配置或等价公共 helper
- **AND** 总数、页码、每页条数和跳页区域 SHALL 作为右侧分页组呈现
- **AND** 页面 SHALL NOT 为资源、证书、密钥或 Webhook 单独实现不同顺序、不同权重或不同间距的分页导航

#### Scenario: 空数据和少数据保持列表壳稳定
- **WHEN** 应用接入配置列表为空或仅有少量记录
- **THEN** 标题、查询控件、动作区和分页区域 SHALL 仍保持与有数据列表一致的壳结构
- **AND** 页面 SHALL NOT 因数据少而让右侧动作、标题或分页漂移到与其它列表不同的位置

#### Scenario: 自动化检查覆盖应用接入列表壳漂移
- **WHEN** 前端测试验证资源、证书、密钥、Webhook 回调和 Webhook 事件列表
- **THEN** 测试 SHALL 覆盖共享工具栏标题、动作区、分页配置和共享表格壳 class
- **AND** 测试 SHALL 能发现新增入口、上传入口或分页配置脱离共享列表页壳的回归

#### Scenario: 既有业务语义保持兼容
- **WHEN** 管理员使用资源、证书、密钥、Webhook 回调或 Webhook 事件列表查询、更多筛选、排序、分页、上传、新增、编辑、删除、详情查看或复制链接
- **THEN** 前端 SHALL 继续复用既有后端查询、上传、删除、跳转和权限契约
- **AND** 系统 SHALL NOT 新增 API、改变后端过滤语义、改变删除禁用条件、展示敏感凭据原文或触发认证、授权、回调执行、凭据写入、组织同步、Gateway projection publish 等外部执行动作
