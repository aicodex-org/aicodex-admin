## Why

当前 Admin `Insight Admin Provider 交接` 页面在缺 resolver 凭据引用时，默认层仍提示“在 Admin 部署配置或外部 secret system 维护凭据引用”。这会把用户带回 `.env`、K8s Secret、Vault/KMS 等底层运维路径，和本轮用量配置 Profile / 凭据交接主线的目标相反。

Admin P0 仍只生成 copy-safe metadata，不保存 raw secret，也不实现 Admin secure handoff。但默认 UI 应明确：Admin 交接包可生成只代表元数据可交付；真实凭据绑定要在 Insight Profile 的 manual/secretRef binding 主流程完成。

## What Changes

- partial/missing 默认态的主阻断建议改为导入 Insight 后通过 manual/secretRef binding 绑定 resolver 凭据。
- copy-safe 操作区和生成成功提示继续保持中性或边界说明，不用绿色表达 partial 凭据闭环已完成。
- 默认层不再把 Admin 部署配置或外部 secret system 作为主下一步；这些只作为底层 secret 落点或诊断上下文存在。
- 保持诊断详情默认收起，不展开 owner alias、wrapper route 或 raw technical evidence。

## Capabilities

### Modified Capabilities

- `admin-enterprise-identity-usage-access-entry`: 调整 Admin handoff partial/missing 默认态 next action 和 copy-safe 生成提示，避免把用户引回 Admin secret 运维主流程。

## Impact

- 影响 `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx` 的默认态文案和生成成功提示。
- 影响 zh/en locale 与相关 Jest 断言。
- 可能小幅调整 Admin 默认 copy-safe nextAction 文案；不改变 API/Gateway/Insight contract，不新增 Admin secret 管理、secure handoff 或 credential lifecycle。
