## ADDED Requirements

### Requirement: 应用接入凭据编辑页复用统一编辑壳边界
Admin 身份控制台 Shell SHALL 允许证书、密钥等应用接入凭据页按正文复杂度选择多 tabs 或单正文，同时共用同一套页面头部、滚动区和固定底部动作栏。

#### Scenario: 复杂凭据页使用 tabs
- **WHEN** 凭据编辑页包含多个稳定配置域和大段材料内容
- **THEN** 页面 MAY 通过 `LargeEditShell` tabs 插槽拆分正文
- **AND** tabs SHALL 只改变当前正文展示，不拆分表单状态或保存 payload
- **AND** 页面 SHALL 保留原页面 selector 作为 scoped 样式和回归定位边界

#### Scenario: 简单凭据页保持单正文
- **WHEN** 凭据编辑页字段可以在一个可扫描正文内完成
- **THEN** 页面 SHALL 使用公共分类标题组织区块而不强制渲染 tabs
- **AND** 多 tabs 与单正文的差异 SHALL NOT 改变共享头部、滚动区和底部动作栏

#### Scenario: 凭据编辑页不叠加重复页面壳
- **WHEN** 管理员访问证书或密钥新增/编辑路由
- **THEN** route scroll 容器 SHALL 使用 cardless 页面边界承载内部编辑壳
- **AND** 页面内部 SHALL 只保留一个主要编辑壳和一组底部动作
- **AND** 页面 SHALL NOT 因 Card、长文本材料或 legacy label gutter 产生页面级横向 overflow

#### Scenario: 凭据编辑壳保持主题和响应式一致
- **WHEN** 管理员在浅色、暗色、桌面或窄屏环境查看证书和密钥编辑页
- **THEN** 页面 SHALL 复用大型编辑页公共 label、区块标题、控件、按钮和滚动边界
- **AND** 长证书材料 SHALL 在自身容器内换行或滚动，不遮挡固定底部动作栏
