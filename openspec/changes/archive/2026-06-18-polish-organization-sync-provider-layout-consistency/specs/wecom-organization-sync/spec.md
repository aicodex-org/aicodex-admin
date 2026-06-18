## ADDED Requirements

### Requirement: WeCom sync configuration uses shared provider field rhythm
The Web Admin WeCom organization sync page SHALL present its base configuration controls using the same provider field rhythm as the Feishu/Lark organization sync page while preserving existing WeCom backend field contracts.

#### Scenario: Align WeCom configuration rows with shared provider layout
- **WHEN** an administrator opens the WeCom organization sync page
- **THEN** the page SHALL show target organization in the first configuration row
- **AND** the page SHALL show `App ID（Corp ID）` and `App Secret` as the credential row
- **AND** the page SHALL show sync options and schedule options as the next row
- **AND** the page SHALL continue to save the values through the existing `corpId` and `addressBookSecret` fields

### Requirement: WeCom formal sync record statistics use compact headers
The Web Admin WeCom formal sync run table SHALL use compact statistic column headers for scan-friendly comparison with other organization sync providers.

#### Scenario: Display compact WeCom run statistic headers
- **WHEN** the WeCom organization sync page renders formal sync run history
- **THEN** the department statistic column header SHALL be `部门`
- **AND** the user statistic column header SHALL be `用户`
- **AND** each statistic cell SHALL continue to show added, updated, and disabled counts in the existing `新 / 更 / 禁` format
