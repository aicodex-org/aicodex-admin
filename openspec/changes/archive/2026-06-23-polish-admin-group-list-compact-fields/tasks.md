## 1. OpenSpec

- [x] 1.1 创建 `polish-admin-group-list-compact-fields` proposal/design/tasks/spec delta，限定字段收敛和无横向滚动范围。
- [x] 1.2 运行 `openspec validate polish-admin-group-list-compact-fields --strict`。

## 2. 测试

- [x] 2.1 先补充群组列表聚焦 Jest，覆盖默认列 key 从 9 列收敛为 5 列、桌面 `scroll.x` 取消、移动端滚动兜底保留。
- [x] 2.2 先补充群组列和用户列渲染 Jest，覆盖显示名主文本、技术 ID 副文本/复制入口、用户数量和无用户状态。

## 3. 实现

- [x] 3.1 调整 `GroupListPage.tsx` 默认列结构和渲染器，移出组织、类型、创建时间、显示名称和完整用户列表默认列。
- [x] 3.2 调整 `.group-list-table` 局部样式，支持两行群组单元格、用户数量、比例列宽和桌面无横向滚动。
- [x] 3.3 保持查询、更多筛选、类型筛选、排序、分页、上传、下载、编辑和删除禁用语义不变。

## 4. 验证与预览

- [x] 4.1 运行增量 TypeScript 门禁、聚焦 Jest、typecheck、`git diff --check`，按风险运行构建。
- [x] 4.2 启动/复用本地前端并用浏览器验证 `/groups` 桌面效果，生成预览截图供用户验收。
