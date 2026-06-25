## Why

组织、群组、用户、身份源 Provider、应用以及应用接入下的资源、证书、密钥、Webhook 列表已经陆续迁移到共享列表组件，但标题、右侧动作、辅助上下文和分页仍由各页面自行拼装，导致同类页面在视觉层级和操作位置上不一致。

现在需要把这些可复用结构收敛成稳定的列表页壳契约，避免后续“用户”“应用接入”等页面继续靠人工截图发现偏差。

## What Changes

- 统一共享列表页的标题区、查询区、右侧动作区、辅助上下文区和分页区布局契约。
- 将组织、群组、用户列表的标题和主动作入口对齐到同一套共享工具栏区域。
- 将组织页“目录健康 / 目录质量”这类低权重信息沉淀为共享右侧辅助上下文槽。
- 将应用、资源、证书、密钥、Webhook 回调、Webhook 事件等应用接入列表页对齐同一套工具栏动作和分页样式。
- 将身份源中心 Provider 列表页纳入同一共享列表页壳，避免认证源页面和群组/应用接入页面继续出现标题、动作和分页漂移。
- 增加自动化一致性检查，覆盖标题来源、动作槽、上下文槽、分页配置和共享 class/slot，而不是依赖人工目测。
- 保持现有查询、筛选、排序、分页、上传、下载模板、新增、编辑、删除和详情跳转业务语义兼容。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 组织账号下组织、群组、用户列表的共享列表页壳、动作区、上下文区和分页一致性要求。
- `admin-enterprise-identity-application-access-center`: 应用接入下应用、资源、证书、密钥、Webhook 回调和 Webhook 事件列表的共享列表页壳、动作区和分页一致性要求。
- `admin-enterprise-identity-auth-source-center`: 身份源/认证源中心 Provider 列表的共享列表页壳、动作区和分页一致性要求。

## Impact

- 影响 `web-admin/src/common/ListPageTable.tsx`、`web-admin/src/common/EnterpriseListQueryToolbar.tsx` 或新增共享列表页壳组件。
- 影响 `OrganizationListPage.tsx`、`GroupListPage.tsx`、`UserListPage.tsx`。
- 影响 `ApplicationListPage.tsx`、`ProviderListPage.tsx`、`ResourceListPage.tsx`、`CertListPage.tsx`、`KeyListPage.tsx`、`WebhookListPage.tsx`、`WebhookEventListPage.tsx`。
- 影响相关前端测试，尤其是共享列表组件测试、组织账号列表测试和应用接入列表测试。
- 不新增后端 API，不改变后端查询参数、权限、写操作、同步、认证、授权或 Gateway projection 行为。
