## ADDED Requirements

### Requirement: 调度器 SHALL 使用统一组织通讯录来源执行判定
组织同步调度器 SHALL 在派发 WeCom、Feishu/Lark 或未来通讯录 Provider 的定时同步前调用统一通讯录来源执行判定，并使用同一套 reason code 记录跳过或失败原因。

#### Scenario: 调度器跳过被其他来源占用的组织
- **WHEN** 已启用的定时同步 fire 被获取
- **AND** 统一判定返回 `source_occupied`
- **THEN** scheduler SHALL NOT 创建 provider sync run
- **AND** fire SHALL 记录为 skipped 或 failed，并包含安全 reason code

#### Scenario: 调度器跳过异常双来源组织
- **WHEN** 已启用的定时同步 fire 被获取
- **AND** 统一判定返回 `source_ambiguous`
- **THEN** scheduler SHALL NOT 创建 provider sync run
- **AND** fire SHALL 记录安全错误摘要，说明目标组织存在多个已配置通讯录来源

#### Scenario: 调度器在来源状态不可用时 fail closed
- **WHEN** scheduler 无法可靠读取目标组织的统一通讯录来源状态
- **THEN** scheduler SHALL NOT 创建 provider sync run
- **AND** fire SHALL 记录 `source_status_unavailable` 或等价安全 reason code
- **AND** 错误文本 MUST NOT 包含 provider secret、token、Cookie 或原始外部通讯录响应
