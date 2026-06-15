## Why

企业认证中心 Shell 已经建立总览和 IA，但 `/providers` 仍是传统 provider 表格，管理员无法在认证源分组内快速扫描企业微信、飞书、OIDC 等来源的启用状态、配置完整度和诊断入口。当前阶段需要把“认证源”从后台资源列表产品化为可运营的认证源中心，同时保持只读边界，不触碰真实认证链路和密钥。

## What Changes

- 在企业认证中心 IA 下强化 `/providers` 为“认证源中心”，在现有 Provider 列表上方增加只读工作区。
- 认证源中心展示企业微信、飞书、OIDC 的状态卡片，覆盖启用/未启用、配置完整度、授权或同步状态、最近失败摘要和配置/诊断入口。
- 复用现有 Provider 列表数据和既有同步页面入口；数据不足时展示待配置、待巡检或未接入状态。
- 保持 Provider 新增、编辑、删除、表格筛选、分页和权限行为不变。
- 不改真实认证链路、OAuth/OIDC 授权流程、组织同步执行、生产配置、密钥写入或后端数据模型。

## Capabilities

### New Capabilities

- `admin-enterprise-identity-auth-source-center`: 定义 Admin 企业认证中心中认证源工作区的只读状态、入口聚合、降级行为和企业管理台视觉。

### Modified Capabilities

## Impact

- 主要影响 `web-admin/src/ProviderListPage.js`、新增或复用认证源中心组件、相关样式和前端测试。
- 复用 `ProviderBackend` 现有只读列表响应，不新增真实写接口；如后续需要准确的同步运行、授权回调或失败明细，应另起 change 定义只读后端聚合接口。
- 不影响后端认证协议、OAuth/OIDC 回调、企业微信/飞书同步执行、真实密钥、生产/类生产配置、组织边界路线或其它仓库。
