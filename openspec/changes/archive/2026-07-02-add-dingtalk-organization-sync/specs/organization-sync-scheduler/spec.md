## ADDED Requirements

### Requirement: 钉钉定时全量同步派发
组织同步调度器 SHALL 通过现有 Provider 执行器注册表派发钉钉定时全量差异同步 run。

#### Scenario: 派发钉钉定时同步
- **WHEN** 存在 provider `dingtalk`、任务类型 `full-differential` 的已启用组织同步 schedule
- **AND** 目标组织存在已启用钉钉同步配置
- **THEN** 调度器 SHALL 为已获取的调度触发记录派发且只派发一个钉钉组织同步 run
- **AND** SHALL 在该调度触发记录上记录已创建的 run 身份

#### Scenario: 跳过缺失或禁用的钉钉配置
- **WHEN** 钉钉调度触发记录已被获取，但目标组织没有同步配置或配置已禁用
- **THEN** 调度器 SHALL 记录包含安全配置错误的 `skipped` 或 `failed` 派发结果
- **AND** MUST NOT 让 Admin 进程 panic

#### Scenario: 跳过重复运行中的钉钉同步
- **WHEN** 钉钉调度触发记录已被获取，且同一组织已经存在运行中的钉钉组织同步 run
- **THEN** 调度器 SHALL 记录 `skipped` 派发，并在可用时记录既有 run 身份
- **AND** MUST NOT 创建重复 run

#### Scenario: 钉钉调度记录不包含敏感信息
- **WHEN** 钉钉定时派发因 Provider 配置或执行设置失败
- **THEN** 持久化的调度错误文本 MUST NOT 包含 AppSecret、access token、原始 API 响应体或完整通讯录用户数据

### Requirement: 定时同步来源守卫纳入钉钉
组织同步调度器 SHALL 对钉钉定时 run 执行与 WeCom、Feishu/Lark 相同的统一通讯录来源判定。

#### Scenario: 跳过来源冲突的钉钉调度触发记录
- **WHEN** 已启用的钉钉调度触发记录被获取，但目标组织已被另一种通讯录来源配置占用
- **THEN** 调度器 SHALL NOT 创建钉钉同步 run
- **AND** 调度触发记录 SHALL 记录安全的来源冲突原因码
