## Why

群组列表上一版已经降低了表格按钮、边框和长字段噪声，但默认 9 列仍把组织 ID、创建时间、显示名称、完整用户 chip 等详情字段平铺在首屏，导致桌面端仍需要横向滚动且扫描焦点分散。现在需要按用户确认的效果图继续收敛默认列表字段，让列表优先服务快速识别、筛选、进入详情或编辑。

## What Changes

- 将群组列表默认表格列收敛为 `群组 / 上级组 / 用户 / 更新时间 / 操作`。
- 把群组显示名作为主识别文本，群组技术 ID 作为弱副文本展示，并保留 tooltip/copy 级可达性。
- 将用户列从用户 chip 列表改为低噪声用户数量，例如 `无用户`、`1 人`、`8 人`。
- 从默认列移出组织技术 ID、类型、创建时间、单独显示名称列和完整用户列表；这些信息通过筛选、详情入口、tooltip 或后续详情抽屉承载。
- 在桌面端取消群组表格默认横向滚动轴，使列宽跟随容器按比例分配；移动端仍允许表格自身滚动作为兜底。
- 将群组列表默认分页调整为 `20 条/页`，减少桌面首屏大块空白并提高扫描密度。
- 保持查询、更多筛选、类型筛选、排序、分页、添加、导入、下载模板、编辑、删除禁用和删除确认语义不变。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-enterprise-organization-identity-center`: 补充群组列表默认字段收敛、用户数量展示和桌面无横向滚动要求。

## Impact

- 主要前端文件：`web-admin/src/GroupListPage.tsx`、`web-admin/src/GroupListPage.test.tsx`。
- 局部样式：`web-admin/src/App.less` 中限定 `.group-list-table` 和群组行内展示类名。
- OpenSpec：为 `admin-enterprise-organization-identity-center` 添加群组列表字段收敛 delta。
- 不新增 API，不修改后端、认证、授权、组织同步、Gateway、OAuth/OIDC、路由或数据模型。
