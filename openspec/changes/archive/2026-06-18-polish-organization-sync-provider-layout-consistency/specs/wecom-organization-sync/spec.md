## ADDED Requirements

### Requirement: WeCom 同步配置使用统一 provider 字段节奏
Web Admin 企业微信组织同步页面 SHALL 使用与飞书/Lark 组织同步页面一致的基础配置字段节奏，同时保留既有企业微信后端字段契约。

#### Scenario: 企业微信配置行与统一 provider 布局对齐
- **WHEN** 管理员打开企业微信组织同步页面
- **THEN** 页面 SHALL 在第一行配置中展示同步目标组织
- **AND** 页面 SHALL 在凭据行展示 `App ID（Corp ID）` 和 `App Secret`
- **AND** 页面 SHALL 在下一行展示同步选项和定时同步选项
- **AND** 页面 SHALL 继续通过既有 `corpId` 和 `addressBookSecret` 字段保存配置值

### Requirement: WeCom 正式同步记录统计列使用短表头
Web Admin 企业微信正式同步记录表 SHALL 使用紧凑统计列表头，以便和其他组织同步 provider 做扫读对比。

#### Scenario: 展示紧凑的企业微信运行统计表头
- **WHEN** 企业微信组织同步页面渲染正式同步记录
- **THEN** 部门统计列表头 SHALL 为 `部门`
- **AND** 用户统计列表头 SHALL 为 `用户`
- **AND** 每个统计单元格 SHALL 继续使用既有 `新 / 更 / 禁` 格式展示新增、更新和禁用数量
