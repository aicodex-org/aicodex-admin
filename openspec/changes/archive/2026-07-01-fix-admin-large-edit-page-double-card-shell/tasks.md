## 1. Root Cause And Scope

- [x] 1.1 对比组织、用户编辑页 DOM/CSS 层级，确认外层 shell Card、内部编辑 Card 和表单 label gutter 来源。
- [x] 1.2 检查应用、Provider、Syncer 大编辑页是否使用内部主编辑 Card，并确认不改业务逻辑。

## 2. Implementation

- [x] 2.1 在 Shell 路由包装层集中识别大编辑页，使其走 `admin-shell-route-scroll-without-card`。
- [x] 2.2 必要时为大编辑页补充稳定 class/test hook，但不全局修改 AntD Card 样式。

## 3. Tests And Validation

- [x] 3.1 更新 Shell 聚焦测试，覆盖组织、用户、应用、Provider、Syncer 编辑页没有 `.content-warp-card`。
- [x] 3.2 更新组织/用户编辑页聚焦测试，确认内部主编辑 Card 仍存在且可作为唯一页面壳。
- [x] 3.3 运行 OpenSpec strict、聚焦测试、TypeScript gate、typecheck、build 和浏览器视觉 smoke。
