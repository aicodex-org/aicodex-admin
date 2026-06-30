## Why

组织、用户等长编辑页在身份控制台 Shell 内同时出现外层 `.content-warp-card` 和页面内部 Ant Design `Card`，形成双边框、双阴影和双 padding。该视觉层级会让表单 label 区域像独立空白竖栏，影响管理员扫描和编辑长表单。

## What Changes

- 将组织、用户、应用、Provider、Syncer 等大编辑页纳入 Shell 的无外层 Card 路由模式。
- 保留编辑页内部主 `Card` 作为唯一页面壳，继续承载标题、保存、返回、删除等既有操作。
- 保持顶部 workspace tabs、左侧导航、保存 payload、权限判断、上传、MFA、LDAP、表格等业务逻辑不变。
- 补充聚焦测试和浏览器证据，验证大编辑页没有 `.content-warp-card` 外层包裹、无页面级横向溢出。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-enterprise-identity-console-shell`: 约束大编辑页在 Shell 内只保留一个主要页面壳，避免外层内容卡与内部编辑卡叠加。

## Impact

- 影响 `web-admin/src/ManagementPage.tsx` 的 route shell 判断。
- 影响相关 Shell 测试和组织/用户编辑页聚焦测试。
- 不改变后端 API、接口契约、保存数据结构、权限模型或数据库。
