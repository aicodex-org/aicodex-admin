## ADDED Requirements

### Requirement: Feishu 同步页面 SHALL 自动恢复有效目标组织
Web Admin 飞书/Lark 组织同步页面 SHALL 在进入页面时自动恢复可加载配置、诊断和同步记录的目标组织，而不是要求管理员每次重新选择组织。

#### Scenario: 自动进入已配置飞书同步组织
- **WHEN** 全局管理员打开飞书/Lark 组织同步页面且没有明确选择业务组织
- **THEN** 页面 SHALL 使用后端返回的飞书/Lark 同步建议组织或本地最近选择组织作为当前同步目标组织
- **AND** 页面 SHALL 立即加载该组织的飞书/Lark 同步配置、辅助诊断和同步记录

#### Scenario: 保留手动切换组织能力
- **WHEN** 管理员在飞书/Lark 组织同步页面手动选择另一个非 built-in 组织
- **THEN** 页面 SHALL 切换当前同步目标组织并加载对应配置、辅助诊断和同步记录
- **AND** 页面 MAY 记住该 Provider 的最近选择组织用于下次进入页面

### Requirement: Feishu 同步 SHALL 与其他通讯录来源保持单一已配置主数据源
The system SHALL prevent the same Admin business organization from configuring Feishu/Lark organization sync while another address-book sync source is already configured for that organization.

#### Scenario: 拒绝在企业微信已配置组织中启用飞书同步
- **WHEN** an authorized administrator saves a Feishu/Lark sync configuration
- **AND** the same target organization already has a configured WeCom sync configuration
- **THEN** the system SHALL reject the save with a validation error that identifies the conflicting Provider and target organization

#### Scenario: 拒绝在企业微信已配置组织中保存飞书草稿
- **WHEN** an authorized administrator saves a Feishu/Lark sync configuration
- **AND** the same target organization already has a configured WeCom sync configuration
- **THEN** the system SHALL reject the save with a validation error that identifies the conflicting Provider and target organization

#### Scenario: 阻止冲突飞书同步执行
- **WHEN** a Feishu/Lark manual sync run is requested for a target organization that already has a WeCom sync configuration
- **THEN** the system SHALL reject the run before creating a Feishu/Lark sync run record

#### Scenario: 展示飞书冲突提示
- **WHEN** the Feishu/Lark sync page loads a target organization that already has a WeCom sync configuration
- **THEN** the page SHALL show a warning that WeCom is the selected organization sync source for that organization
- **AND** the page SHALL prevent saving Feishu/Lark config, enabling Feishu/Lark sync, or starting a full Feishu/Lark sync while the organization is occupied by another source

#### Scenario: 过滤已被其他来源占用的飞书候选组织
- **WHEN** the Feishu/Lark sync page receives organizations occupied by another address-book sync source
- **THEN** the organization selector SHALL exclude those occupied organizations from candidate options
- **AND** the currently selected organization MAY remain visible if it is already selected so the page can explain the read-only conflict
