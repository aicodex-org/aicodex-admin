## Why

现有 `应用接入中心` 同时承载通用 OAuth/OIDC/API 映射入口和用量链路服务凭据治理内容，导致管理员需要在通用接入首页中寻找 Insight provider trust、Usage identity resolver、Gateway organization projection 与 keep-in-env 边界。现在需要把这些用量链路治理内容拆到 `应用接入` 下的独立二级页，保持原中心页聚焦通用应用接入，同时让用量归因相关治理有清晰入口。

## What Changes

- 在 Admin 身份控制台 `应用接入` 分组下新增二级导航 `用量接入`，路由为 `/application-usage-access`。
- 新增聚焦版 `用量接入` 独立页，承接原 `应用接入中心` 中的 `服务凭据治理` 详细能力，包括状态摘要、治理配置、保存配置、诊断/预检和交接包预览。
- 第一版页面抽出既有 Admin-owned 服务凭据治理契约与前端治理面板，至少覆盖 `Insight provider trust`、`Usage identity resolver`、`Gateway organization projection`、`Keep in env/config` 四类治理项。
- 保留 `/applications` `应用接入中心` 及其 Application 列表、OAuth/OIDC、API 映射、Provider、审计等通用入口；不破坏现有路由、权限 key 或表格操作。
- 保持 owner 边界：Admin 只展示身份、组织、resolver、projection 和服务间凭据入口状态，不把 API/Gateway 或 Insight 自身 truth 搬到 Admin 前端重算。
- 不新增泛配置中心、不新增一级菜单、不新增 raw secret/token/client secret 展示或真实下游探测动作。

## Capabilities

### New Capabilities
- `admin-enterprise-identity-usage-access-entry`: 定义 `应用接入 > 用量接入` 二级导航、聚焦版服务凭据治理页面、配置/诊断/交接包动作和 copy-safe 安全边界。

### Modified Capabilities
- `admin-enterprise-identity-console-shell`: 应用接入分组新增 `/application-usage-access` 叶子入口，并保持运行时侧栏、移动抽屉和组织导航配置树一致。
- `admin-enterprise-identity-application-access-center`: 明确 `/applications` 保留通用应用接入中心职责，服务凭据治理内容由独立 `用量接入` 页承接，中心页不再渲染服务凭据治理摘要、状态或入口卡片。

## Impact

- Frontend: 新增 `web-admin` TSX 页面、路由、导航项、workspace tab 标题、zh/en locale、聚焦测试和浏览器验证。
- OpenSpec: 新增用量接入入口能力规格，并更新身份控制台 Shell 与应用接入中心相关规格。
- Backend/API: 复用现有 `/api/application-access/service-credential-governance-*` 前端 client 和 Admin-owned 脱敏契约；本 change 不新增后端接口、不改变凭据保存、诊断、交接包或 Gateway/Insight 运行时行为。
- Security: 页面仅渲染脱敏状态、稳定别名、owner hint、caller policy、reference status 与下一步入口，不展示 token、client secret、私钥、完整私有 URL、真实账号或完整组织树。
