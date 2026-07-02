## ADDED Requirements

### Requirement: 统一组织通讯录来源状态纳入钉钉
统一组织通讯录来源状态服务 SHALL 在分类通讯录来源归属时纳入钉钉配置。

#### Scenario: 钉钉拥有当前组织
- **WHEN** 目标组织存在钉钉同步配置
- **AND** 当前来源是 `dingtalk`
- **THEN** 来源状态 SHALL 为 `owned`
- **AND** 归属来源摘要 SHALL 使用 source `dingtalk` 和显示名称 `DingTalk`

#### Scenario: 钉钉占用其他来源页面
- **WHEN** 目标组织存在钉钉同步配置
- **AND** 当前来源是 `wecom`、`lark` 或 `feishu`
- **THEN** 来源状态 SHALL 为 `occupied`
- **AND** 占用来源摘要 SHALL 指向 DingTalk

#### Scenario: 钉钉参与异常多来源检测
- **WHEN** 目标组织同时存在 DingTalk 和另一个已配置通讯录同步来源
- **THEN** 来源状态 SHALL 为 `ambiguous`
- **AND** 执行判定 SHALL 在创建来源同步 run 前按失败关闭策略拒绝

#### Scenario: 候选状态包含被钉钉占用的组织
- **WHEN** 任意通讯录来源请求候选来源状态
- **THEN** 已配置 DingTalk 且会阻塞该来源的组织 SHALL 出现在 occupied 或 ambiguous 候选摘要中
