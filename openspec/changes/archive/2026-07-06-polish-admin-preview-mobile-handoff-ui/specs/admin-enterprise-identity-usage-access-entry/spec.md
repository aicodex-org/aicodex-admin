## MODIFIED Requirements

### Requirement: 用量接入二级入口

`用量接入` 页面 SHALL 作为唯一的 `Insight Admin Provider` copy-safe metadata 交接入口，承接 Admin 身份、组织、resolver、projection/trust 和 owner evidence readiness 摘要，并生成 Insight Profile 可消费的 Admin handoff package。

#### Scenario: 默认阻断摘要低噪声展示

- **WHEN** `/application-usage-access` 存在 partial、missing 或 blocked 阻断项
- **THEN** 默认层 SHALL 只保留一个缺凭据引用主提示，并明确真实凭据需要在 Insight Profile 中绑定 manual/secretRef 凭据解析器后补齐
- **AND** 默认层 SHALL 保留 `生成元数据交接包` 主动作，并避免暗示 Admin 会打包或绑定真实凭据
- **AND** 默认层 SHALL NOT 额外铺开 `关键阻断` 行、owner alias、wrapper route 或逐项 capability 诊断
- **AND** 展开诊断 SHALL 先用紧凑表格展示阻断项，再用轻量 Tag 行展示可用能力
- **AND** 展开诊断 SHALL 通过 URL query 保持展开状态可分享
- **AND** 阻断项建议动作 SHALL 只表达下一步文本，不提供没有真实目标页的页内伪跳转
- **AND** 详细 owner alias、wrapper route、raw evidence、完整 reason list 和完整 suggested action list SHALL stay inside diagnostics
- **AND** code-like 技术 token SHALL 标记为不可翻译，并在窄容器中约束换行或截断，避免页面级横向溢出
- **AND** 展开诊断 SHALL 使用一致内容栅格和稳定阻断列宽，低优先级技术证据默认进入二级折叠
- **AND** 默认层 SHALL NOT repeat the same missing credential fact as multiple card-sized warnings
- **AND** 默认层 SHALL NOT introduce `P0`, `secure handoff`, `.env`, K8s Secret, Vault, KMS, raw id, wrapper route, or Owner alias as primary copy
