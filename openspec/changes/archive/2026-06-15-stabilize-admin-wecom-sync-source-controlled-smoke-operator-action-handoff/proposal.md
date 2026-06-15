# Admin WeCom source controlled smoke operator action handoff

## Why

WeCom source controlled-smoke operator decision handoff 已能生成本地脱敏 decision package，但值班 operator 仍缺少 decision 之后的最小 action package。没有该交接层时，后续容易把“可复制给 operator 执行下一步”误写成真实 WeCom 同步、真实 controlled smoke、组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪或 full-success。

## What Changes

- 新增本地只读 `wecomSourceControlledSmokeOperatorActionHandoff` helper，消费脱敏 operator decision handoff summary。
- 输出稳定 `actionStatus`、`nextAction`、blocker/remediation alias、owner handoff、最小解除条件、red-line flags、action package metadata 和不能外推边界。
- 新增 focused Node 测试覆盖 ready、缺 decision、blocked/needs-user-action/hard-red-line 上游、脱敏失败、真实执行红线、full-success overclaim 和未知 alias。
- 新增 Bruno 只读入口和 README/operator 指引，明确该入口只生成 action package，不执行真实 controlled smoke。
- 更新 `wecom-organization-sync` 规格，声明 controlled-smoke operator action handoff 的 fail-closed 行为。

## Non-Goals

- 不执行真实 controlled smoke，不触发真实 WeCom 同步，不创建 sync run，不写真实 fixture 或 DB。
- 不查询 API、Insight、Gateway 数据，也不证明组织树非空、Gateway/API/Insight 成功、authorization facts 生效、生产就绪、controlled smoke pass 或 full-success。
- 不修改 Gateway Projection、API、Insight、真实 Gateway、真实 DB、真实 WeCom 凭据、gate、密钥或生产/类生产配置。
- 不收集 token、Cookie、私有 URL、真实账号、完整组织树、完整响应体或敏感日志。

## Impact

- Admin owner 范围：Bruno collection、本地 Node helper、focused 测试、WeCom 同步 README、OpenSpec change 和 `wecom-organization-sync` 主规格。
- Operator 将获得稳定状态：`ready-for-operator-action`、`blocked`、`needs-user-action`、`hard-red-line`。
