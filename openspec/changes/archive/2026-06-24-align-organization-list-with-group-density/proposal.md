## Why

组织列表前一轮只复用了共享表格和查询工具栏外壳，但没有复用群组列表真正有效的信息结构、行操作降噪和滚动策略，导致组织页仍出现表头换行、横向滚动感、行高过大、重按钮抢眼和目录健康挤占搜索行等问题。现在需要把群组页已验收的列表密度经验完整迁移到组织页，并沉淀更可靠的复用边界。

## What Changes

- 将组织列表默认列从多字段平铺改为可扫描的信息结构：组织主识别列、主页/来源摘要、密码策略、软删除、创建时间和轻量操作。
- `Favicon` 不再作为独立默认列，合并到组织主识别区域；技术 ID、主页地址等长文本降权、截断并提供弱复制/tooltip。
- 行操作从多个重按钮改为低噪声动作组，保留群组、用户、编辑、删除既有路由和禁用/确认语义。
- 目录健康、同步来源和边界信息从搜索主控件组移到低权重辅助上下文；组织页桌面端使用工具栏右侧辅助槽位，避免压到表头或挤压查询控件。
- 组织列表默认分页调整为 20 条/页，桌面端不依赖横向滚动轴才能看到操作列。
- 抽取或补强可复用的列表主识别单元、弱复制按钮、行操作组，以及列表页字号/布局 token；`ListPageTable` 统一包装查询工具栏间距，注释明确复用边界是已验证的信息结构和交互模式，而不是只套表格壳。
- 本 change 不改后端 API、不新增组织同步/修复动作、不改变组织删除、添加、排序、分页和筛选契约。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 组织列表默认字段与表格复用要求升级为完整复用群组列表的扫描密度、主识别列、轻量操作和滚动/分页策略。

## Impact

- Affected code: `web-admin/src/OrganizationListPage.tsx`, `web-admin/src/OrganizationListPage.test.tsx`
- Likely shared code: `web-admin/src/common/ListPageTable.tsx` and new/updated common list-cell/action helpers under `web-admin/src/common/`
- Affected UI: `/organizations`
- No backend API, database, dependency, authentication, authorization, sync, Gateway projection, or external-system execution changes.
