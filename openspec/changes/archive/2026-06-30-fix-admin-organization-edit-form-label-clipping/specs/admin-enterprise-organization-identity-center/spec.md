## ADDED Requirements

### Requirement: 组织编辑页长表单标签完整可读
Admin 组织编辑页 SHALL 在桌面端稳定展示包含密码策略在内的长中文表单标签，避免标签文本被左侧边界、侧栏或表单 label column 裁切。

#### Scenario: 密码配置长标签不裁切
- **WHEN** 管理员在桌面端打开组织编辑页并查看密码相关字段
- **THEN** `密码Salt值`、`密码复杂度选项`、`密码类型` 或等价长标签 SHALL 完整可见
- **AND** 标签 SHALL NOT 与页面侧栏边界、表单容器边界或输入控件发生视觉重叠
- **AND** 页面 SHALL NOT 因修复引入正文区域横向 overflow

#### Scenario: 修复限定在组织编辑页
- **WHEN** 前端修复组织编辑页表单标签布局
- **THEN** 修复 SHALL 使用组织编辑页 scoped class、页面局部 Form 布局配置或等价窄边界方式
- **AND** 修复 SHALL NOT 通过全局 AntD Form label selector 改变 common/table/auth/provider/root shell 或其它编辑页表单布局

#### Scenario: 组织保存和密码配置语义保持兼容
- **WHEN** 管理员查看、编辑或保存组织编辑页
- **THEN** 前端 SHALL 继续使用既有组织读取和保存契约
- **AND** 密码盐、密码类型、密码复杂度选项和其它密码配置字段 SHALL 保持现有字段、选项和 payload 语义不变
- **AND** 系统 SHALL NOT 新增后端 API、改变组织同步、认证、授权刷新或 Gateway projection publish 行为
