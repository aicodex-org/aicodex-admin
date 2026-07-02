## ADDED Requirements

### Requirement: 身份控制台管理导航展示钉钉同步入口
Web Admin 身份控制台 SHALL 将钉钉组织同步展示为管理导航入口，并且不新增抽象一级中心。

#### Scenario: 展示钉钉同步菜单
- **WHEN** 管理员打开身份控制台管理导航
- **THEN** 导航 SHALL 在现有企业通讯录同步入口附近包含 `钉钉同步` 菜单项
- **AND** 该菜单项 SHALL 跳转到 `/dingtalk-org-sync`

#### Scenario: 保持已有同步入口语义
- **WHEN** 钉钉同步入口被加入
- **THEN** 既有 WeCom 和 Feishu/Lark 同步入口 SHALL 保持原路由路径和选中行为
- **AND** 导航 SHALL NOT 新增抽象“中心”、“工作台”或“快捷入口”根节点
