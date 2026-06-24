## 1. 测试先行

- [x] 1.1 迁移 Provider 列表测试文件为 `.test.tsx`，并先写出顶部认证源概览不再渲染的失败测试。
- [x] 1.2 先写出扩展搜索入口、扩展搜索字段和查询参数映射的失败测试。
- [x] 1.3 先写出重置会清空基础搜索与扩展搜索的失败测试。

## 2. Provider 列表实现

- [x] 2.1 将 `ProviderListPage.js` 迁移为 `ProviderListPage.tsx`，补齐 props、state、Provider 记录、分页和表格列局部类型。
- [x] 2.2 从 `/providers` 页面移除 `AuthSourceCenter` import 和渲染，保留 Provider 列表首屏直接可见。
- [x] 2.3 通过 `EnterpriseListQueryToolbar.advancedFilters` 增加类别、类型、归属组织、客户端 ID 和 Provider URL 扩展搜索控件。
- [x] 2.4 保持 Provider 基础搜索、扩展搜索、分页、排序、新增、编辑、删除和权限行为兼容既有后端契约。
- [x] 2.5 按列表页公共配置收敛列宽、ellipsis、Tooltip 和操作列，避免桌面端默认依赖页面级横向溢出。

## 3. 规格与验证

- [x] 3.1 运行 `openspec validate refine-provider-list-experience --strict` 和 `git diff --check`。
- [x] 3.2 在 `web-admin` 运行增量 TypeScript gate。
- [x] 3.3 在 `web-admin` 运行 Provider 聚焦 Jest 测试并确认红绿闭环。
- [x] 3.4 在 `web-admin` 运行 `yarn typecheck`。
- [x] 3.5 在 `web-admin` 运行 `yarn build`。
- [x] 3.6 使用浏览器检查 `/providers` 桌面和窄屏布局，确认顶部概览移除、扩展搜索可用、列表首屏可见且无页面级横向溢出。

## 4. 收口

- [x] 4.1 更新 OpenSpec 任务勾选状态和必要的验证记录。
- [x] 4.2 检查 git diff，确认不包含 secrets、真实凭据、生产/类生产配置或无关格式化噪声。
- [x] 4.3 提交并推送 `hfl-test/refine-provider-list-experience`。

## 验证记录

- `openspec validate refine-provider-list-experience --strict`：通过。
- `git diff --check`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn test ProviderListPage.test.tsx --watchAll=false --runInBand`：18 项通过。
- `yarn test ProviderListPage.test.tsx --coverage --collectCoverageFrom=src/ProviderListPage.tsx --watchAll=false --runInBand`：18 项通过，`ProviderListPage.tsx` statements 93.75%、lines 93.49%。
- `yarn typecheck`：通过。
- `yarn build`：通过；仅保留既有 Browserslist 过期、Node `fs.F_OK` deprecation 和包体积提示。
- 浏览器检查 `http://127.0.0.1:7005/providers`：桌面 `1440x900` 下 Provider 表格首屏可见、旧认证源概览 DOM 不存在、扩展筛选顺序为类别/类型/归属组织/客户端 ID/Provider URL、页面级无横向溢出；窄屏 `390x844` 下页面级无横向溢出，表格使用内部横向滚动兜底。
