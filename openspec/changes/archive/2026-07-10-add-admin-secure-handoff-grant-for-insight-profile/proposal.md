# 新增 Admin secure handoff grant 交接能力

## Why

导入 Admin copy-safe 包后仍要求用户手动寻找 Admin 凭据材料，会阻断“导入、绑定、验证、激活”的 P0 主路径。总控路线已将 Admin secure handoff 从 P1 提前为 P0 独立 owner change：Admin 仍不能把 raw secret 放入 copy-safe metadata，但必须提供可由 Insight 后端兑换的一次性 `secure_handoff_grant`。

## What Changes

- 新增 Admin 组合 Insight Admin 接入包：继续包含既有 copy-safe metadata，同时附带短 TTL 的 `secureHandoffGrant` 脱敏 envelope。
- 新增 Admin owner secure handoff 最小生命周期 API：create、redeem、confirm、fail、revoke、status。
- 兑换接口只在服务端返回一次性 credential material；operator-facing 包、状态查询、UI 和日志只返回 grant id、issuer、environment、provider、target registration、workspace、expiry、trace marker、suffix 和 readiness 等脱敏字段。
- Admin UI 主动作改为“复制 Insight Admin 接入包”，manual/secretRef 只作为 secure handoff 不可用或兑换失败时的 fallback。

## Non-Goals

- 不把 raw token、secret、DSN、完整 secretRef、完整私有 URL、Authorization、Cookie、真实账号、完整组织树或 raw payload 放入 copy-safe metadata 或前端展示。
- 不实现 Insight 侧 owner registry、导入、兑换、secret store 写入或 Profile activation。
- 不改 API/Gateway/Insight contract；本 change 只固定 Admin owner 侧包 shape 和最小 grant lifecycle。
- 不新增复杂 token broker、短链、扫码、跨系统 reference-based auth 或长期 grant 存储模型。
