## Context

前序 changes 已把 Admin 页面收敛为低噪 copy-safe handoff 页面，但默认阻断建议仍保留“去 Admin 部署配置或外部 secret system 维护凭据引用”的运维叙事。按最新路线，Admin 页面应帮助用户把 metadata package 交给 Insight，并在 Insight Profile 中完成 manual/secretRef binding；底层 Secret、Vault 或 KMS 不应成为默认 UI 主路径。

## Goals / Non-Goals

Goals:

- 缺 resolver / projection credential reference 时，默认层明确“交接包可生成，导入 Insight 后绑定凭据”。
- 生成成功后若仍是 partial，不使用绿色成功语义表达整体 ready。
- 保持默认层只展示状态、下一步、主 CTA、copy-safe 说明和诊断摘要入口。
- 保持所有 secret/raw material 脱敏边界。

Non-Goals:

- 不实现 Admin secure handoff。
- 不新增 Admin secret 配置、resolver、发行、撤销或轮换 UI。
- 不改变 Insight Profile、API/Gateway 或 Admin 后端 contract。
- 不恢复旧服务凭据治理配置中心。

## Decisions

- 默认层对 credential reference missing 使用固定产品化 guidance，优先指向 Insight manual/secretRef binding，而不是直接使用后端 nextAction 中可能带有的部署配置说明。
- 诊断详情可以保留 owner/source/route 证据，但默认不展示，也不把 `.env` 或外部 secret system 作为主操作。
- copy-safe package 生成成功后继续强调“元数据包已生成，仍需在 Insight 绑定凭据”，避免用户把生成成功理解成凭据闭环成功。

## Risks / Mitigations

- 风险：弱化 Admin 部署配置提示后，实施人员不知道底层 secret 落点。缓解：默认主提示说明真实凭据由 Insight secret binding、部署 Secret 或外部 secret system 承载；诊断详情仍保留排障证据。
- 风险：部分后端 nextAction 仍带旧运维语义。缓解：UI 默认层对 credential reference missing 做产品化覆盖，相关测试锁定旧主叙事不可见。
