## Why

`组织`、`群组`、`用户` 页面已经形成更紧凑的公共列表体验，但应用接入分组下的 `资源`、`证书`、`密钥`、`Webhook 回调` 和 `Webhook 事件` 仍保留旧式表格标题、列内搜索和高噪声操作布局，导致同一后台对象列表的扫描密度和筛选入口不一致。

本次变更用于把这些应用访问对象列表对齐到已验证的公共列表壳和查询工具栏，同时保持现有后端查询、分页、排序、上传、下载、删除、重放和详情抽屉语义不变。

## What Changes

- 将资源、证书、密钥、Webhook 回调、Webhook 事件列表对齐到 `ListPageTable` 与 `EnterpriseListQueryToolbar` 的统一列表结构。
- 为每个目标页面保留主搜索，并补齐“更多筛选”入口；扩展筛选只映射到既有单字段后端查询参数或既有页面状态，不新增后端契约。
- 调整表格列密度、固定操作列噪声、长文本展示和空白留白，使页面与 `群组`、`用户`、`组织` 列表的扫描节奏一致。
- 若本次直接触达的目标页面仍为 JS 且迁移风险低，则同步迁移为 TS/TSX；目标页已是 TSX 时不做无关迁移。
- 不改变任何写入、上传、下载、删除、Webhook 重放、详情查看、权限 key、路由或后端 API 参数语义。

## Capabilities

### New Capabilities

- 无。本次是既有应用接入中心列表体验 polish，不新增独立产品能力。

### Modified Capabilities

- `admin-enterprise-identity-application-access-center`: 补充应用接入分组内资源、证书、密钥、Webhook 回调和 Webhook 事件列表必须使用一致的公共列表体验、主搜索和扩展筛选入口，并保留既有业务语义。

## Impact

- 前端页面：`web-admin/src/ResourceListPage.tsx`、`web-admin/src/CertListPage.tsx`、`web-admin/src/KeyListPage.tsx`、`web-admin/src/WebhookListPage.tsx`、`web-admin/src/WebhookEventListPage.tsx`。
- 共享组件：复用 `web-admin/src/common/ListPageTable.tsx`、`web-admin/src/common/EnterpriseListQueryToolbar.tsx` 和现有 `enterprise-list-*` 样式；仅在必要时做小范围兼容增强。
- 测试：扩展应用接入菜单相关 Jest 覆盖，验证统一列表壳、主搜索、扩展搜索映射和关键操作保留。
- 不影响后端接口、数据库、认证授权、OpenID/OAuth 回调、Gateway projection、真实凭据或运行态同步链路。
