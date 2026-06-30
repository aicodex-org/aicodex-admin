## Context

本 change 最初面向审计运维四个列表页，后续根据用户确认扩容为 Admin 核心后台路由页面批量 TS/TSX 迁移 batch。目标页面分成三类：

- 继承 legacy `BaseListPage.js` 的列表页：操作日志、登录会话、令牌管理、验证码记录。
- 中小编辑/同步页：证书、密钥、令牌、LDAP、Webhook 等编辑或同步表单页。
- 总览和小型页面壳：身份控制台总览、账号页、基础应用列表/仪表盘、入口页、验证码/二维码页等低风险小页面。

本次迁移的核心约束仍是“类型迁移，不做行为改版”。`BaseListPage.js`、`ManagementPage.js`、`App.js`、`Setting.js` 和后端 API wrapper 仍保持 JS/TS 共存，页面迁移需要通过局部类型承接 legacy 父类、路由 props、后端响应、AntD 表格列定义和表单状态。

## Goals / Non-Goals

**Goals:**
- 将 P0 页面按批次迁移为 `.tsx`，并尽量迁移被触碰的聚焦测试为 `.test.tsx`。
- 用局部 interface/type 描述页面 props、state、记录模型、分页状态、筛选状态、表单状态、行操作和详情抽屉数据。
- 保持现有 extensionless import、路由、权限、后端 API 契约、查询字段、分页/排序、删除、复制、脱敏、编辑页保存和同步操作行为不变。
- 对低风险小型路由/页面壳可顺手迁移；对单页类型洞过大的页面记录 deferred，不让单页卡死整批。
- 通过聚焦 Jest、`yarn typecheck`、增量 TS gate 和 `yarn build` 验证 JS/TS 共存路径。

**Non-Goals:**
- 不迁移 `BaseListPage.js`、`ManagementPage.js`、`App.js`、`Setting.js`、`LoginPage.js`、认证登录主链路、Provider/Application/Syncer 主编辑页。
- 不新增或修改 Admin 后端接口、数据库结构、权限语义、token/验证码生成语义或审计数据模型。
- 不重做共享列表壳视觉、暗黑主题、分页位置、抽屉信息架构、菜单命名、路由语义或登录/OIDC/WeCom 行为。

## Decisions

### 1. 页面级局部类型优先，不重构 legacy BaseListPage

列表页继续继承 legacy `BaseListPage.js`。为了控制迁移风险，本次在页面文件内或相邻轻量类型中定义页面需要的 props、state、record、pagination 和 handler 类型，必要处对 legacy 父类字段使用最小断言。

备选方案是先给 `BaseListPage.js` 建完整 TS declaration 或迁移父类。该方案会牵出全部列表页，超出本轮 batch 迁移范围，因此不采用。

### 2. 保留无后缀 import 与路由边界

`ManagementPage.js` 对页面使用无后缀 import。迁移只做 `.js` 到 `.tsx` 文件替换，不修改路由定义或 shell 结构，让 bundler 按现有解析规则找到 TSX 文件。

### 3. 分批迁移、分批验证

本次允许一个 change 覆盖多页，但按批次推进：

1. 先完成审计运维列表页，消化 legacy list 类型边界。
2. 再迁移中小编辑/同步页，控制表单和后端响应类型。
3. 再迁移总览页和可顺手小页面壳。

每批后用 `yarn typecheck` 或聚焦测试收敛错误，避免最后集中爆炸。

### 4. 测试以既有行为回归为主

本次不新增行为，优先复用并迁移现有审计运维、`IdentityConsoleOverview` 和被触碰页面相关测试。若迁移暴露类型问题，只修类型和 TSX 兼容问题，不改断言语义。

### 5. 对动态后端字段保持宽松但有边界的类型

审计记录、session id 列表、token、verification、证书、密钥、LDAP、Webhook 等字段来自 legacy 后端模型，历史字段可能包含 snake_case 与 camelCase 混用。类型定义应覆盖页面实际读取字段，并对未知扩展使用局部索引或 `unknown` 后窄化，避免大面积 `any`。

## Risks / Trade-offs

- [Risk] legacy 父类和 JS helper 没有完整类型，迁移时可能需要少量断言。→ 限定断言在页面边界，聚焦测试和 typecheck 验证行为兼容。
- [Risk] 后端记录字段历史命名不统一。→ 类型覆盖现有页面读取字段，不主动标准化字段名。
- [Risk] TSX 迁移可能触发 JSX/AntD 列类型严格化。→ 使用 AntD `TableProps`/局部列类型，避免重写表格渲染。
- [Risk] 扩容后单页可能拖累整体进度。→ 类型洞过大的可顺手页允许 deferred，P0 指定页优先完成。
- [Risk] 纯迁移可能没有浏览器视觉差异。→ 若代码变更保持机械迁移且测试覆盖通过，可不跑浏览器 smoke；如果出现布局或交互调整再补。

## Migration Plan

1. 更新 OpenSpec 文案，将 scope 从 audit-only 调整为 Admin 核心后台路由页面 batch。
2. 建立 baseline：运行审计运维聚焦 Jest 与 `yarn typecheck`，确认当前状态。
3. 将审计运维四页从 `.js` 迁移到 `.tsx`，补局部类型并保持导出名称和无后缀 import。
4. 将凭据/令牌、连接/同步中小编辑页迁移到 `.tsx`。
5. 将身份控制台总览页和可顺手低风险小页面壳迁移到 `.tsx`；风险过高页面记录 deferred。
6. 如触碰聚焦测试，迁移为 `.test.tsx` 并保留原有行为断言。
7. 运行 OpenSpec validate、聚焦 Jest、`yarn typecheck`、增量 TS gate、`yarn build` 和 diff check。
8. 以 release candidate 形式提交并推送工作分支，等待主控/用户验收。
