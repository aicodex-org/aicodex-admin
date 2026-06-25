## Goals / Non-Goals

### Goals

- 让截图确认的 8 个入口在列表标题、动作区、查询区、分页区和表格密度上与组织/群组/用户、应用接入页面一致。
- 复用已经沉淀的公共组件和 CSS token，减少每个页面私有样式。
- 保留每个页面自己的字段、筛选项、权限控制和后端契约。

### Non-Goals

- 不把非分页功能页强行改成列表页。
- 不调整导航 IA、菜单名称或页面业务文案。
- 不做大范围 TypeScript 迁移或旧列表基类重构。

## Target Pages

本次迁移页面：

- `/invitations` 邀请码
- `/organization-sync-api-keys` 组织同步密钥
- `/syncers` 同步器
- `/roles` 角色
- `/permissions` 权限
- `/models` Casbin 模型
- `/adapters` Casbin 适配器
- `/enforcers` Casbin 执行器

明确排除：

- `/identity-assets` 授权关系与证据，后续单独评估。

## Approach

### 1. 复用公共列表壳

每个目标页面的主表格使用 `ListPageTable`，外层补充 `enterprise-list-page-table-shell` 和页面私有 class，例如 `invitation-list-page-table-shell`。这样后续统一调整密度、分页、排序提示、表头间距时可以优先修改公共壳。

### 2. 标题和动作区统一

旧写法通常在 `Table.title` 里手写标题、空格和 `Button size="small"`。迁移后标题使用 `EnterpriseListQueryToolbar`，主动作放在 `actionsPlacement="topRight"` 的右上动作槽。页面存在新增、上传或其它动作时只迁移动作位置和密度，不改变点击行为。

### 3. 查询和筛选保持语义兼容

页面原有 `getColumnSearchProps`、`fetch` 参数、字段名和排序字段不改变。若页面已有简单搜索字段，则映射到公共 toolbar 的字段选择和关键字输入；若页面没有高级筛选，则不显示“更多筛选”。

### 4. 操作列样式统一但行为不变

编辑、删除等行内动作改为项目已使用的紧凑操作区样式，保留 Popconfirm、禁用条件、跳转路径和后端调用。

### 5. 测试策略

为 8 个页面补充 focused tests，至少覆盖：

- 页面渲染 `EnterpriseListQueryToolbar`。
- 表格使用 `ListPageTable`。
- 外层存在 `enterprise-list-page-table-shell`。
- 主动作仍触发原有新增/跳转/后端调用。
- 分页配置仍来自既有 `getTablePaginationProps`。

## Risks / Trade-offs

- [Risk] 一次迁移 8 个列表，视觉和测试回归面较大。
  Mitigation: 按页面分批提交代码但保留单 change，运行 focused tests、typecheck、build，并用本地前端连接 60 后台做只读预览。

- [Risk] 老页面字段和动作差异较多，过度抽象可能改变业务语义。
  Mitigation: 本次只套壳和密度，不提取页面字段配置，不改接口契约。

- [Risk] JS 与 TS 列表页混用，类型边界不统一。
  Mitigation: 优先最小改动；已有 TSX 页面保持 TSX，JS 页面不为本次强制迁移 TS。
