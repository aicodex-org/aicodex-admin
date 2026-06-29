## ADDED Requirements

### Requirement: WeCom 同步页 SHALL 消费统一组织通讯录来源状态
Web Admin 企业微信组织同步页面 SHALL 使用统一组织通讯录来源状态判断默认组织、候选组织过滤、冲突提示和操作禁用，不再依赖页面私有逻辑推断 Feishu/Lark 或未来其他 Provider 的占用关系。

#### Scenario: 企业微信组织由统一状态恢复
- **WHEN** 全局管理员打开企业微信组织同步页面且没有明确选择业务组织
- **THEN** 页面 SHALL 优先使用统一状态返回的 WeCom 已配置组织或最近选择的可用组织
- **AND** 页面 SHALL 立即加载该组织的企业微信配置和同步记录

#### Scenario: 企业微信页面展示普通占用
- **WHEN** 统一状态返回目标组织 `state=occupied`
- **AND** occupying source 不是 WeCom
- **THEN** 企业微信页面 SHALL 展示该组织已被对应通讯录来源占用
- **AND** 页面 SHALL 禁用保存、启用同步和正式同步入口

#### Scenario: 企业微信页面展示异常双配置
- **WHEN** 统一状态返回目标组织 `state=ambiguous`
- **THEN** 企业微信页面 SHALL 展示“数据异常”类提示
- **AND** 页面 SHALL 说明该组织存在多个已配置通讯录来源，需要排障或新建组织
- **AND** 页面 SHALL 禁用保存、启用同步和正式同步入口

### Requirement: WeCom 同步写入口 SHALL 使用统一执行判定
企业微信同步配置保存、手动同步启动和相关后端入口 SHALL 使用统一通讯录来源执行判定，而不是直接查询 Feishu/Lark 配置表。

#### Scenario: 企业微信保存被统一判定拒绝
- **WHEN** 管理员保存企业微信同步配置
- **AND** 统一判定返回 `allowed=false`
- **THEN** 系统 SHALL 拒绝保存
- **AND** 错误 SHALL 包含安全 reason code 和脱敏占用摘要

#### Scenario: 企业微信手动同步被统一判定拒绝
- **WHEN** 管理员启动企业微信手动同步
- **AND** 统一判定返回 `source_occupied`、`source_ambiguous` 或 `source_status_unavailable`
- **THEN** 系统 SHALL 在创建企业微信 sync run 前拒绝请求
- **AND** 响应 SHALL 不暴露 provider secret、token 或原始通讯录响应
