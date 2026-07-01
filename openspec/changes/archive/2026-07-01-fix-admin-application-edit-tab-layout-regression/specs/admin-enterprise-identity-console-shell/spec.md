## MODIFIED Requirements

### Requirement: 大编辑页内部表单布局稳定
Admin 身份控制台 SHALL 为组织、用户、应用、Provider、Syncer 等大编辑页提供一致的内部主表单布局，使桌面端 label 列具备稳定宽度、内容列可伸缩且页面级不产生不必要横向溢出。

#### Scenario: 大编辑页主编辑 Card 暴露统一布局边界
- **WHEN** 管理员打开组织、用户、应用、Provider 或 Syncer 编辑页
- **THEN** 页面内部主编辑 Card SHALL 暴露统一的 `admin-large-edit-card` 样式边界
- **AND** 页面 MAY 同时保留页面专属 class 供测试、smoke 和后续局部修复定位

#### Scenario: 应用接入与凭据编辑页暴露独立布局边界
- **WHEN** 管理员打开证书、密钥、Webhook、Token、LDAP、Adapter 或 Enforcer 等应用接入、凭据或集成配置编辑页
- **THEN** 页面内部主编辑 Card SHALL 暴露 scoped 的 `admin-access-edit-card` 样式边界
- **AND** 页面根节点 MAY 暴露 `admin-access-edit-page` 以及页面专属 class 供测试、smoke 和后续局部修复定位
- **AND** 字段行 SHALL 暴露 scoped 的 `admin-access-edit-field-row` 边界，供本类页面内部 label/content 布局使用

#### Scenario: 桌面端主表单 label 与内容列稳定
- **WHEN** 管理员在桌面端打开这些大编辑页
- **THEN** 主表单行的 label 列 SHALL 使用稳定宽度而不是仅依赖 2/24 或 3/24 百分比宽度
- **AND** 主内容列 SHALL 使用剩余空间并允许长输入、选择器或局部组件在自身容器内处理 overflow

#### Scenario: 窄屏端主表单换行
- **WHEN** 管理员在窄屏设备打开这些大编辑页
- **THEN** 主表单 label 与内容 SHALL 切换为单列换行
- **AND** 页面级 SHALL NOT 因主编辑 Card label/content 布局产生横向滚动

#### Scenario: 编辑页业务语义保持不变
- **WHEN** 管理员保存、保存并退出、取消新增、删除或编辑这些页面的业务字段
- **THEN** Admin SHALL 保持既有 API payload、路由跳转、按钮可用性和字段编辑语义不变

#### Scenario: 应用编辑页 tab 内容不继承主字段行布局
- **WHEN** 管理员在桌面端打开 `/applications/:organizationName/:applicationName` 并切换到 `提供商` tab
- **THEN** Provider 绑定列表或表格 SHALL 使用 tab pane 的可用宽度
- **AND** Provider tab 内的 full-width 内容 SHALL NOT 被主表单 label/content Row 规则压缩成固定 label 窄列

#### Scenario: 应用编辑页界面定制 tab 可切换渲染
- **WHEN** 管理员在应用编辑页切换到 `界面定制` tab
- **THEN** 页面 SHALL 渲染界面定制内容
- **AND** 页面 SHALL NOT 因 tab 切换出现白屏、React render exception 或 webpack overlay
- **AND** 应用编辑页保存 payload、路由语义和后端接口 SHALL 保持不变
