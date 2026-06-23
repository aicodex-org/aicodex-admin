## ADDED Requirements

### Requirement: 应用接入分组必须包含用量接入入口
Admin 身份控制台 Shell SHALL 在 `应用接入` 一级分组下新增 `/application-usage-access` 叶子入口，标签为 `用量接入`，用于承载用量链路治理聚焦页。

#### Scenario: 侧栏展示用量接入
- **WHEN** local admin 打开桌面侧栏或移动端抽屉
- **THEN** `应用接入` 分组 SHALL include `/applications` as `应用接入中心`
- **AND** `应用接入` 分组 SHALL include `/application-usage-access` as `用量接入`
- **AND** 系统 SHALL NOT 新增一级 `用量接入`、`用量中心`、`配置中心` 或等价抽象主入口

#### Scenario: 导航配置树展示用量接入
- **WHEN** 管理员在组织配置页编辑 `navItems` 或 `userNavItems`
- **THEN** 配置树 SHALL 在 `应用接入` 分组下展示 `/application-usage-access`
- **AND** 配置值 SHALL 使用稳定 route key `/application-usage-access`
- **AND** 权限过滤 SHALL 继续基于 route key 而不是标签文案

#### Scenario: 工作区标签显示用量接入
- **WHEN** 管理员打开 `/application-usage-access`
- **THEN** workspace tab、route title 或移动端降级标题 SHALL 使用当前语言的 `用量接入` 标签
- **AND** 已打开 `/applications` 与 `/application-usage-access` SHALL 作为两个可区分的页面标签
