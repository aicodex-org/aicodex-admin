## Why

60 smoke 证据显示，组织树运营页会把 `scope_has_no_manageable_departments` 这类实现 alias 直接展示给管理员。移动端组织运营摘要也偏高，状态卡堆叠后把节点列表和诊断项压到较深位置，不符合工作型企业控制台的扫描效率。

## What Changes

- 将组织运营空态和诊断原因转换为管理员能理解的业务语言，覆盖“当前组织暂无可管理部门”场景，并给出只读边界和下一步核对建议。
- 对组织目录质量页的原因筛选、标签、修复计划和诊断展示应用同样的业务化标签，避免稳定后端 alias 成为主 UI 文案。
- 收紧组织运营摘要区密度，让移动端更快看到节点列表和诊断项，同时保留技术证据在详情区域。
- 保持既有路由、只读行为、刷新动作、技术详情入口和后端 API 契约不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`：明确组织运营和目录质量的空态/诊断展示要求，要求后端 alias 在主 UI 中转换为业务文案，并保持响应式状态区紧凑，服务核心列表和诊断流程。

## Impact

- 前端：`web-admin/src/OrganizationTreeOperationsPage.js`、`web-admin/src/OrganizationTreeOperationsPage.test.js`、`web-admin/src/OrganizationDirectoryQualityPage.js`、`web-admin/src/OrganizationDirectoryQualityPage.test.js` 和 zh/en locale 资源。
- OpenSpec：在 `admin-enterprise-identity-console-shell` 下追加窄范围 delta。
- 不修改后端 API、导航、认证授权、组织同步、Gateway projection、OAuth/OIDC 或 secrets。
