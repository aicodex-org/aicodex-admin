## Why

`/application-usage-access` 已经承接服务凭据治理，但首屏仍像诊断报告：owner/source class/reason alias/stable alias/handoff schema 等实现细节和操作者要做的配置动作混在一起。管理员很难先判断当前是否可用、缺什么、下一步点哪里。

## What Changes

- 将用量接入的服务凭据治理面板重排为操作者优先视图：总状态、下一步动作、必填配置入口优先展示。
- 默认隐藏 reason code、stable alias、owner/provenance、handoff schema、metadata 等低频诊断字段，统一放入「高级信息」折叠区。
- 保留保存配置、刷新状态、读取/恢复回读、Dry-run/Readiness、Doctor 诊断、Handoff/Evidence 入口。
- 保持后端接口、数据结构和 owner boundary 不变；Admin 仍只处理 copy-safe 引用与策略摘要，不保存 raw secret。

## Design Review

当前设计问题：
- 行摘要同时展示配置状态、诊断状态、owner、source class、reference status、blocked reason 和 stable alias，首屏认知负荷过高。
- 交接包预览直接显示 schema、target/admin alias、`cannotInferRuntimeTruth` 等开发/交接字段，和普通配置动作竞争注意力。
- 凭据引用以普通输入框显示，虽然是 copy-safe reference，但默认仍会暴露完整 reference 字符串。
- 空态/错误态可用，但主要操作没有形成保存优先、诊断次级、证据低优先的层级。

目标交互模型：
- 首屏只回答三件事：当前总状态、建议下一步、哪里补必填配置。
- 每个治理项默认显示人类可读短状态、缺口摘要和下一步动作；配置字段放在该项的「必填配置」折叠里。
- 诊断结果和交接证据只显示简短状态、影响对象、下一步和一条主风险；原始 alias/schema/source/owner 等进入高级详情。
- 机器状态统一翻译为中文短状态，例如 `missing`/`missing_reference` -> `缺少凭据`，`blocked` -> `策略未放行` 或 `不可用`，`cannot_infer` -> `需下游确认`。

## Impact

- Frontend only: `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、样式和页面测试。
- OpenSpec delta only updates usage-access UI requirements.
- No backend API or persistence changes.
