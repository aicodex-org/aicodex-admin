## MODIFIED Requirements

### Requirement: 桌面工作区多标签
Admin 身份控制台 Shell SHALL 在桌面端 header 下方、主内容区上方展示 route-driven workspace tabs，用于表示当前工作会话中已打开的页面；左侧菜单仍负责主导航，标签栏不得替代或扩张一级菜单体系。

#### Scenario: 总览标签固定不可关闭
- **WHEN** workspace tabs 渲染打开页面
- **THEN** `/` 总览类标签 SHALL 始终存在
- **AND** 总览标签 SHALL 固定在标签栏最左侧
- **AND** 总览标签 SHALL 不参与中间滚动标签区
- **AND** 总览标签 SHALL 不展示关闭按钮
- **AND** 关闭其它标签或关闭全部 SHALL NOT 移除总览标签

#### Scenario: 桌面端标签区横向滚动
- **WHEN** 打开的可关闭标签数量超过桌面端标签可视宽度
- **THEN** Shell SHALL 在总览标签右侧使用单行横向滚动标签区展示其它已打开页面
- **AND** 标签顺序 SHALL 保持当前打开顺序稳定
- **AND** 激活已打开标签 SHALL NOT 重排标签顺序
- **AND** 当前激活标签切换时 SHALL 自动滚动到可视区

#### Scenario: 滚动箭头按需显示
- **WHEN** 滚动标签区左侧存在不可见标签
- **THEN** 左滚动箭头 SHALL 可见
- **AND** 如果已滚到最左侧，左滚动箭头 SHALL 不显示
- **WHEN** 滚动标签区右侧存在不可见标签
- **THEN** 右滚动箭头 SHALL 可见
- **AND** 如果已滚到最右侧，右滚动箭头 SHALL 不显示

#### Scenario: 常驻关闭菜单始终可见
- **WHEN** 管理员在桌面端查看工作区标签栏
- **THEN** 标签栏最右侧 SHALL 提供常驻 `关闭` 菜单
- **AND** `关闭` 菜单 SHALL NOT 依赖标签溢出状态才出现
- **AND** `关闭` 菜单 SHALL 提供 `关闭当前`、`关闭其他`、`关闭所有`

#### Scenario: 关闭当前保留固定总览
- **WHEN** 管理员点击 `关闭当前`
- **THEN** 如果当前激活页是可关闭标签，Shell SHALL 关闭该标签并导航到最近仍打开的可用标签
- **AND** 如果没有其它非固定标签可用，Shell SHALL 导航到 `/`
- **AND** 如果当前激活页是固定总览标签，`关闭当前` SHALL 禁用或安全无效

#### Scenario: 关闭其他保留当前与总览
- **WHEN** 管理员点击 `关闭其他`
- **THEN** Shell SHALL 保留固定总览标签
- **AND** 保留当前激活标签（如果当前页不是总览）
- **AND** 关闭其它所有可关闭标签

#### Scenario: 关闭所有只保留总览
- **WHEN** 管理员点击 `关闭所有`
- **THEN** Shell SHALL 关闭全部可关闭标签
- **AND** 只保留固定总览标签
- **AND** 当前页面 SHALL 导航到 `/`

#### Scenario: 桌面标签栏不再依赖更多菜单
- **WHEN** 桌面端标签数量很多
- **THEN** Shell MAY 保留单标签关闭按钮
- **AND** 桌面标签主要降级手段 SHALL 是横向滚动，而不是仅通过“更多”菜单收纳其它标签
- **AND** 标签栏 SHALL NOT 导致页面级横向溢出
