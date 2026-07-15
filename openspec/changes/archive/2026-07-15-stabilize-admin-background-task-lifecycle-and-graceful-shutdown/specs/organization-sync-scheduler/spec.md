## ADDED Requirements

### Requirement: 默认组织同步调度器 SHALL 支持进程级 cancel 与 wait
默认 Organization sync scheduler SHALL 在数据库初始化后保持现有启动行为，并 SHALL 暴露线程安全、幂等的 cancel/stop/wait 契约供 Admin 顶层 lifecycle 收口。

#### Scenario: Cancel 后不再产生新 tick
- **WHEN** 默认组织同步调度器收到 cancel 或 Stop
- **THEN** scheduler SHALL 不再开始新的 initial scan 或 periodic scan
- **AND** SHALL 停止其 ticker 并最终关闭本次运行的完成信号

#### Scenario: Cancel 传播到正在执行的扫描
- **WHEN** scheduler 正在执行 initial scan、periodic scan 或 provider executor dispatch 时收到 cancel
- **THEN** 同一 context SHALL 向当前扫描和 executor 传播取消
- **AND** Stop SHALL 等待当前 scheduler goroutine 退出或在调用方 context 到期时有界返回

#### Scenario: 重复 Start 和 Stop 幂等
- **WHEN** 同一 scheduler generation 被重复 Start、Stop 或 Wait
- **THEN** scheduler MUST NOT 创建重复 tick loop、重复调用 cancel、关闭 channel 两次或 panic
- **AND** 只有在上一 generation 已退出后才可启动新的 generation

#### Scenario: 保持调度安全与脱敏契约
- **WHEN** scheduler 因进程 shutdown 被取消
- **THEN** 已有持久化 fire acquisition、provider execution lock 和安全错误文本契约 SHALL 保持不变
- **AND** shutdown 日志 MUST NOT 包含 provider secret、token、Cookie 或原始外部响应
