## Context

组织账号、身份源中心和应用接入下的多个列表页已经迁移到 `ListPageTable`、`EnterpriseListQueryToolbar`、`ListPageIdentityCell`、`ListPageRowActions` 和 `ApplicationAccessListControls` 等共享组件，但共享边界仍停留在“表格”和“查询控件”层面。

当前实际页面存在四类漂移：

- `组织/用户` 的标题和动作来自 `OrganizationIdentityCenter.listAction`，`群组/资源/证书/密钥/Webhook` 的标题和动作来自 `EnterpriseListQueryToolbar.actions`。
- `组织` 的目录健康信息使用页面私有右侧上下文，应用接入类列表没有同一套上下文槽位约定。
- `应用/Provider/资源/证书/密钥/Webhook` 的新增/上传动作与 `群组`、`用户` 的动作组在图标、位置和按钮组合上不一致。
- 分页虽然逐步复用 `common/table/TablePagination.js`，但缺少列表页层面的展示规则和自动化一致性检查。

## Goals / Non-Goals

**Goals:**

- 建立一套共享列表页壳契约，统一标题、查询控件、右侧动作、辅助上下文和分页区域。
- 让组织、群组、用户、身份源 Provider、应用、资源、证书、密钥、Webhook 回调、Webhook 事件页面通过同一套 slot/class 表达相同结构。
- 将组织页目录健康信息抽象为共享 `context` / `rightMeta` 槽位，而不是页面私有布局。
- 增加自动化一致性检查，覆盖标题来源、动作槽、分页配置和共享 class，减少人工截图回归。

**Non-Goals:**

- 不新增或修改后端 API。
- 不改变查询、更多筛选、排序、分页、上传、下载模板、新增、编辑、删除和详情跳转业务语义。
- 不在本 change 内重做所有 legacy 列表页，只覆盖已经迁移到共享列表组件的组织账号、身份源中心和应用接入列表。
- 不引入新的 UI 组件库或依赖。

## Decisions

### 1. 统一到共享工具栏 header，而不是继续使用页面私有 top action

`EnterpriseListQueryToolbar` 已经具备 `title`、`actions`、`context`、`contextPlacement` 和 `showHeader` 能力。组织和用户不应再通过 `OrganizationIdentityCenter.listAction` 形成另一套标题/动作结构；它们应和群组、应用接入列表一样把标题和动作放在共享工具栏 header。

备选方案是把所有页面都迁移到 `OrganizationIdentityCenter` 风格的外层 top bar。这个方案会把应用接入、Webhook 等非组织身份页面绑定到组织身份组件语义，且需要更大范围重命名和迁移，不如复用已有通用 toolbar 直接。

### 2. 用共享 slot 处理页面差异

各页面仍保留自己的字段、查询契约、行操作和业务按钮，但必须通过共享 slot 表达：

- `title`: 页面对象名，例如组织、群组、用户、证书。
- `actions`: 新增、下载模板、上传等主动作组。
- `context`: 目录健康、未来资源风险或配置状态等低权重辅助信息。
- `advancedFilters`: 页面自己的更多筛选字段。
- `pagination`: 统一分页 helper 输出的分页对象。

这样可以统一布局而不牺牲页面业务差异。

组织页目录健康这类长文本上下文不放在标题和动作同一行，使用共享 toolbar 的标题下方独立上下文位；常规“添加”入口保持文字按钮，不额外使用 `PlusOutlined`，上传、刷新等具有明确动作语义的按钮仍可保留对应图标。

### 3. 共享页面壳 class 作为后续统一调整的边界

目标页面的列表主体必须暴露 `.enterprise-list-page-table-shell`，页面私有 class 只表达业务对象，例如 `provider-list-page-table-shell`、`application-list-page-table-shell`。这样后续调整标题、动作、辅助上下文、外层卡片和分页间距时，可以优先改共享 class 和 `--list-page-*` token，而不是逐页枚举。

组织/用户所在的无外层 Card 路由使用 `OrganizationIdentityCenter` compact 根节点承载同一公共 class 和 card token；其它列表保留各自表格 wrapper，不额外改变路由壳。

### 4. 分页统一由 helper 和样式共同约束

继续使用 `common/table/TablePagination.js` 作为分页配置来源，并在 `ListPageTable` / 样式层统一分页右对齐、间距、总数、页码、每页条数和跳页区域的视觉规则。
页面仍可按数据量由 Ant Design 自动决定是否显示跳页相关元素，但同一类元素的位置和权重必须一致。

### 5. 自动化审计进入测试

新增或扩展测试时，不只断言组件存在，还要断言：

- 目标页面的工具栏标题来自同一套 header。
- 主动作位于 `.enterprise-list-query-toolbar-actions`。
- 组织目录健康等辅助信息位于共享 context 槽。
- 共享分页配置来自 `getTablePaginationProps` 或等价公共 helper。
- 目标页面不再使用 `OrganizationIdentityCenter.listAction` 作为新建动作入口。
- 应用接入、应用列表和身份源 Provider 列表都具有 `.enterprise-list-page-table-shell`，避免后续只统一一部分列表。

## Risks / Trade-offs

- [Risk] 组织/用户从 `OrganizationIdentityCenter.listAction` 回到 toolbar header 可能造成顶部边框和内边距变化。
  Mitigation: 通过 `--list-page-*` token 和截图/浏览器 DOM 验证对齐群组与应用接入列表。

- [Risk] 应用接入列表中资源、证书、密钥、Webhook 的动作类型不同，过度统一可能掩盖页面差异。
  Mitigation: 只统一动作槽位置和按钮密度，不强制每页都有相同按钮数量。

- [Risk] 分页在数据量少时 Ant Design 会隐藏部分控件，容易误判为不一致。
  Mitigation: 测试公共 pagination props 和 DOM class/slot，人工验证时区分“控件不存在”和“存在但位置/样式不一致”。

- [Risk] 一次触及多个列表页，回归面较大。
  Mitigation: 使用 focused Jest 覆盖组织账号和应用接入列表，并保留本地前端连 60 后台做浏览器只读验证，不点击会写数据的动作。
