## ADDED Requirements

### Requirement: Feishu formal sync record statistic headers remain single-line
The Web Admin Feishu/Lark formal sync run table SHALL use compact statistic column headers so the primary run history remains dense and scan-friendly.

#### Scenario: Display compact Feishu run statistic headers
- **WHEN** the Feishu/Lark organization sync page renders formal sync run history
- **THEN** the department statistic column header SHALL be `部门`
- **AND** the user statistic column header SHALL be `用户`
- **AND** the membership statistic column header SHALL be `关系`
- **AND** each statistic cell SHALL continue to show added, updated, and disabled counts in the existing `新 / 更 / 禁` format
- **AND** the statistic headers SHALL NOT wrap because of embedded explanatory text
