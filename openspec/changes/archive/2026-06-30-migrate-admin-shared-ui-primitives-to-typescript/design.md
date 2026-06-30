## Goals

- 批量降低共享 React 小组件的 legacy JavaScript 边界，让后续页面迁移可以直接消费 TS/TSX 组件。
- 保留现有运行时行为、导出路径和 extensionless import 兼容性。
- 用局部、窄类型描述组件实际消费的 props、option、row、pagination、modal callback 和动态配置字段。
- 对明显牵出其它 owner 或高风险业务链路的组件，记录 deferred 而不是扩大本 change 范围。

## Decisions

### 1. 机械迁移优先，不做 UI 或行为重构

本 change 的主要动作是 `.js` 到 `.tsx` / `.test.tsx` 的机械迁移。只有为通过 TypeScript、Jest 或构建所需的最小类型封边和 import 调整才进入实现。

### 2. 类型边界局部化

组件 props 优先在组件文件内定义；当多张配置表或多个选择器重复使用同一类浅层结构时，可新增小型共享类型文件。共享类型只承载数据 shape，不引入新抽象层、hooks 或表格框架。

### 3. 保留 legacy 调用方契约

迁移后的文件继续通过原有 extensionless import 被 JS/TS 调用方解析。父页面仍可以传入 legacy JavaScript 对象，组件内部只对实际读取字段建模，不要求全链路类型化。

### 4. 风险分层和 deferred

优先迁移低耦合展示/配置组件。以下情况记录 deferred：

- 需要修改 Provider 主表、Provider 配置行为或 Provider focused test 才能完成的组件。
- 需要触碰 Syncer owner 写集，特别是 `SyncerTableColumnTable.js`。
- 迁移会扩大到页面、auth 主流程、后端 wrapper、真实认证/OIDC 或 Gateway 行为。
- 类型洞需要重塑行编辑、弹窗确认、选择器查询或上传下载语义。

## Implementation Notes

- JSX 组件使用 `.tsx`；纯类型或共享 helper 使用 `.ts`。
- 包含 JSX 的 existing tests 迁移为 `.test.tsx`。
- 对 AntD `Table`、`Modal`、`Select`、`Tree`、`Form` 等组件保留现有 props 和受控/非受控行为；只在类型层面补足 `ColumnsType`、`TablePaginationConfig`、`TreeDataNode` 等必要边界。
- 对动态 legacy 数据使用显式可选字段、索引签名或窄 `unknown` 收口；避免无解释 `any` 扩散。
- 不因为迁移改变用户可见文案、排序、分页、筛选、禁用状态、确认按钮或错误提示。

## Validation Strategy

- OpenSpec strict validation 和 diff whitespace check 先验证文档和文件卫生。
- 聚焦 Jest 覆盖现有测试迁移路径，至少包含 `NavItemTree.test`、`OrganizationSelect.test`、`TablePagination.test`；如触碰 Provider 表相关文件，再补 `ProviderTable.test`。
- `yarn typecheck` 验证 TS/TSX 类型边界。
- 增量 TypeScript gate 验证新增/迁移文件符合项目规则。
- `yarn build` 验证 CRACO/React Scripts 能接纳 JS/TS/TSX 共存和 extensionless import。
- 本 change 默认不要求浏览器 smoke；若实现中出现非机械 UI/交互调整，则补本地 smoke 或记录 blocker。

## Security and Privacy

本 change 不处理真实认证、授权、密钥、token、Cookie、client secret、私钥、生产/类生产配置或外部 provider 凭据。测试和验证记录不得写入敏感字段原值。
