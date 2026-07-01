## MODIFIED Requirements

### Requirement: 大编辑页内部表单布局稳定
Admin 身份控制台 SHALL 为组织、用户、应用、Provider、Syncer 等大编辑页以及身份对象 / 权限对象编辑页提供一致的内部主表单布局，使桌面端 label 列具备稳定宽度、内容列可伸缩且页面级不产生不必要横向溢出。

#### Scenario: 大编辑页主编辑 Card 暴露统一布局边界
- **WHEN** 管理员打开组织、用户、应用、Provider 或 Syncer 编辑页
- **THEN** 页面内部主编辑 Card SHALL 暴露统一的 `admin-large-edit-card` 样式边界
- **AND** 页面 MAY 同时保留页面专属 class 供测试、smoke 和后续局部修复定位

#### Scenario: 身份对象编辑页主编辑 Card 暴露统一布局边界
- **WHEN** 管理员打开 Group、Role、Permission 或 Invitation 编辑页
- **THEN** 页面内部主编辑 Card SHALL 暴露统一的 `admin-identity-object-edit-card` 样式边界
- **AND** 普通字段行 SHALL 暴露 `admin-identity-object-edit-field-row` 供 scoped CSS 和布局测试定位
- **AND** 页面 MAY 同时保留页面专属 class 供测试、smoke 和后续局部修复定位

#### Scenario: 桌面端主表单 label 与内容列稳定
- **WHEN** 管理员在桌面端打开这些大编辑页或身份对象 / 权限对象编辑页
- **THEN** 主表单行的 label 列 SHALL 使用稳定宽度而不是仅依赖 2/24、3/24 或 4/24 百分比宽度
- **AND** 主内容列 SHALL 使用剩余空间并允许长输入、选择器或局部组件在自身容器内处理 overflow

#### Scenario: 窄屏端主表单换行
- **WHEN** 管理员在窄屏设备打开这些大编辑页或身份对象 / 权限对象编辑页
- **THEN** 主表单 label 与内容 SHALL 切换为单列换行
- **AND** 页面级 SHALL NOT 因主编辑 Card label/content 布局产生横向滚动

#### Scenario: 编辑页业务语义保持不变
- **WHEN** 管理员保存、保存并退出、取消新增、删除或编辑这些页面的业务字段
- **THEN** Admin SHALL 保持既有 API payload、路由跳转、按钮可用性和字段编辑语义不变
