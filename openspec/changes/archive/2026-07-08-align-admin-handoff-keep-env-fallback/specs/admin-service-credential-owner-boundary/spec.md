## MODIFIED Requirements

### Requirement: Admin 必须生成服务凭据治理交接包

Admin SHALL 为 Insight consumer 构建只包含 copy-safe metadata 的 service credential governance handoff package，并且 SHALL 将 runtime credential truth 和 credential binding 保持在 Admin package 之外。

#### Scenario: 缺凭据引用时默认指向 Insight 绑定

- **GIVEN** resolver 或 Gateway projection credential reference status 为 missing
- **WHEN** Admin 构建 copy-safe handoff package
- **THEN** package SHALL 保持 `bindingMode=manual_or_secret_ref`
- **AND** 默认可操作 next action SHALL 指向 Insight 侧 Profile credential binding
- **AND** `keepInEnv` 出现时 SHALL 只表示 fallback 或兼容证据
- **AND** Admin SHALL NOT 输出 secure handoff grant、grant id、nonce、target registration id、expiry、raw secret、token、Authorization header、Cookie、client secret、完整私有 URL、raw payload、raw id、真实账号或完整组织树
