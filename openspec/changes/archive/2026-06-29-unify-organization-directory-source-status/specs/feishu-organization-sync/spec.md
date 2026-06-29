## ADDED Requirements

### Requirement: Feishu 同步页 SHALL 消费统一组织通讯录来源状态
Web Admin 飞书/Lark 组织同步页面 SHALL 使用统一组织通讯录来源状态判断默认组织、候选组织过滤、冲突提示和操作禁用，不再依赖页面私有逻辑推断 WeCom 或未来其他 Provider 的占用关系。

#### Scenario: 飞书组织由统一状态恢复
- **WHEN** 全局管理员打开飞书/Lark 组织同步页面且没有明确选择业务组织
- **THEN** 页面 SHALL 优先使用统一状态返回的 Feishu/Lark 已配置组织或最近选择的可用组织
- **AND** 页面 SHALL 立即加载该组织的飞书/Lark 配置、辅助诊断和同步记录

#### Scenario: 飞书页面展示普通占用
- **WHEN** 统一状态返回目标组织 `state=occupied`
- **AND** occupying source 不是 Feishu/Lark
- **THEN** 飞书/Lark 页面 SHALL 展示该组织已被对应通讯录来源占用
- **AND** 页面 SHALL 禁用保存、启用同步和正式同步入口

#### Scenario: 飞书页面展示异常双配置
- **WHEN** 统一状态返回目标组织 `state=ambiguous`
- **THEN** 飞书/Lark 页面 SHALL 展示“数据异常”类提示
- **AND** 页面 SHALL 说明该组织存在多个已配置通讯录来源，需要排障或新建组织
- **AND** 页面 SHALL 禁用保存、启用同步和正式同步入口

### Requirement: Feishu 同步写入口 SHALL 使用统一执行判定
飞书/Lark 同步配置保存、手动同步启动和相关后端入口 SHALL 使用统一通讯录来源执行判定，而不是直接查询 WeCom 配置表。

#### Scenario: 飞书保存被统一判定拒绝
- **WHEN** 管理员保存飞书/Lark 同步配置
- **AND** 统一判定返回 `allowed=false`
- **THEN** 系统 SHALL 拒绝保存
- **AND** 错误 SHALL 包含安全 reason code 和脱敏占用摘要

#### Scenario: 飞书手动同步被统一判定拒绝
- **WHEN** 管理员启动飞书/Lark 手动同步
- **AND** 统一判定返回 `source_occupied`、`source_ambiguous` 或 `source_status_unavailable`
- **THEN** 系统 SHALL 在创建飞书/Lark sync run 前拒绝请求
- **AND** 响应 SHALL 不暴露 App Secret、tenant access token 或原始 Contact API 响应
