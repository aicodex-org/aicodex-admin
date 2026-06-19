## Why

企业微信组织同步已经具备配置、连接测试、正式同步和同步记录，但正式写入前缺少一次轻量预检。飞书/Lark 页面已有 dry-run 预览能力，企业微信也需要在保持页面简洁的前提下提供同类“预览影响”入口，降低管理员直接执行正式同步的心理成本。

## What Changes

- 为企业微信组织同步新增只读 dry-run preview API，用于拉取或评估企业微信通讯录快照并返回部门、用户、关系的聚合影响。
- dry-run preview 不写入 `Group`、`User`、WeCom mapping、Platform master data、SourceConnection 或正式 sync run 状态。
- 新增轻量 dry-run history 只读能力，记录和查询最近预览的脱敏摘要，历史入口放在预览操作附近或弹窗中，不常驻占用主页面。
- Web Admin 企业微信组织同步页面增加 `预览影响` 和 `预览历史` 操作，并用 Modal 展示预览结果、空态、加载态、错误态和安全摘要。
- 保持企业微信页面作为“干净清爽”的基础同步流程；不加入飞书专属的绑定冲突诊断、交接证据、验收资料或重诊断面板。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `wecom-organization-sync`: 增加企业微信组织同步 dry-run preview、轻量 preview history、Admin API 和前端展示要求。

## Impact

- 后端：企业微信组织同步 service/store/controller/router，必要的 dry-run history 持久化对象和安全摘要构造。
- API：新增 `/api/wecom-org-sync/dry-run-preview` 与预览历史只读接口，沿用现有组织解析与管理员鉴权边界。
- 前端：`web-admin` 企业微信组织同步页面、backend wrapper、i18n、聚焦测试。
- 测试：OpenSpec validate、Go focused tests、web-admin focused Jest、TypeScript gate/typecheck/build 视改动范围执行。
