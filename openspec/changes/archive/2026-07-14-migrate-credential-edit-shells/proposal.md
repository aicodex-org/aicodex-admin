## Why

证书和密钥编辑页仍使用旧 Card 标题操作区与正文底部重复按钮，并在点击列表“添加”时立即写入后端临时记录。已迁移的组织、用户、应用、Provider 和 Syncer 编辑页已经形成稳定共享壳与“保存时创建”边界，凭据编辑页需要按同一交互模型收敛。

## What Changes

- 将证书、密钥新增/编辑页接入 `LargeEditShell`，统一返回、路径、对象标题、滚动正文和固定底部动作栏。
- 证书编辑页按“基础配置 / 证书材料”拆为两个 tabs，并通过 URL hash 恢复当前 tab；密钥编辑页保持单正文，以“基础信息 / 凭据与状态”两个区块组织字段。
- 移除旧 Card title 与正文末尾的重复保存按钮，只保留取消、保存、保存并返回一组共享底栏动作。
- 将证书和密钥新增流程统一为本地草稿：列表页点击添加只打开编辑页，保存时才调用 `addCert` 或 `addKey`，取消和返回不调用删除接口。
- 添加态保存成功并停留页面时重新读取后端记录，展示后端生成的证书、私钥、Access key 或 Access secret；编辑态继续使用既有 update API。
- 增加聚焦行为测试和本地浏览器验证，覆盖唯一操作栏、tabs/分区、保存时创建、取消不写入、生成结果回读及窄屏/暗色表现。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `admin-enterprise-identity-application-access-center`: 证书和密钥编辑页应复用统一编辑壳，并采用保存时创建、成功后回读生成凭据的新增契约。
- `admin-enterprise-identity-console-shell`: 应用接入凭据编辑页应与其它已迁移编辑页共用头部、滚动正文和固定底栏，复杂页面可使用 tabs，简单页面保持单正文分区。

## Impact

- 前端页面：`web-admin/src/CertEditPage.tsx`、`web-admin/src/KeyEditPage.tsx`。
- 列表新增入口：`web-admin/src/CertListPage.tsx`、`web-admin/src/KeyListPage.tsx`。
- 测试与样式：新增聚焦测试，并在 `web-admin/src/styles/edit/` 下增加最小页面私有样式、更新大型编辑页样式聚合入口和布局契约测试。
- OpenSpec：修改 `admin-enterprise-identity-application-access-center` 与 `admin-enterprise-identity-console-shell`。
- 不新增或修改后端 API、数据库结构、凭据生成算法、权限模型、保存 payload、列表显式删除或刷新证书行为。
