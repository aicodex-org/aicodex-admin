## ADDED Requirements

### Requirement: Syncer 编辑页使用共享大型编辑壳
Syncer 编辑页 SHALL 复用 Admin 共享大型编辑页壳呈现页面头部、面包屑、滚动正文和底部动作栏，并保持既有同步配置、连接测试和保存行为兼容。

#### Scenario: Syncer 编辑页头部和动作栏统一
- **WHEN** 管理员打开 Syncer 新增或编辑页
- **THEN** 页面 SHALL 使用共享大型编辑页壳展示返回入口、身份源面包屑、Syncer 标题和底部动作栏
- **AND** 取消、保存、保存并返回 SHALL 位于共享底部动作栏
- **AND** 页面 SHALL NOT 同时在 Card title 或页面正文末尾渲染重复保存按钮

#### Scenario: Syncer 多 tabs 正文保持可扫描
- **WHEN** 管理员查看 Syncer 配置
- **THEN** 基本信息、连接配置、映射与状态 SHALL 以三个页内 tabs 呈现
- **AND** 当前 tab SHALL 写入 URL hash，并在刷新后恢复
- **AND** 当前 tab 正文 SHALL 使用共享分类标题样式标识当前配置域
- **AND** 页面 SHALL 复用共享大型编辑页的标签、控件、表格、暗色和窄屏样式边界
- **AND** 页面 SHALL NOT 因局部表格或长字段产生页面级横向 overflow

#### Scenario: 组织选项显示名称和标识一致
- **WHEN** 管理员展开或搜索 Syncer 的组织选择器
- **THEN** 选项 SHALL 优先显示组织显示名称，并在显示名称与标识不同时同时展示组织标识
- **AND** 搜索 SHALL 同时匹配显示名称和标识
- **AND** 提交值 SHALL 继续使用组织标识

#### Scenario: Syncer 业务契约保持兼容
- **WHEN** 管理员切换 Syncer 类型、编辑动态字段、测试连接、保存或取消
- **THEN** 前端 SHALL 继续使用既有类型默认值、字段出现条件、连接测试、保存和删除方法
- **AND** 编辑态和添加态取消 SHALL 返回 Syncer 列表，添加态 SHALL 只在保存时创建 Syncer
- **AND** 系统 SHALL NOT 新增 API 或改变保存 payload
- **AND** 页面初始化、tab 切换和普通字段编辑 SHALL NOT 自动触发连接测试、真实数据库连接或外部目录同步

#### Scenario: Syncer 编辑页回归可测试
- **WHEN** 前端测试验证 Syncer 编辑页
- **THEN** 测试 SHALL 覆盖共享编辑壳、三个 tabs、hash 恢复、唯一底部动作栏、代表性动态字段、保存 payload 和添加态取消
- **AND** 测试 SHALL 能发现回退到旧 Card title 操作区或页面末尾重复按钮的回归
