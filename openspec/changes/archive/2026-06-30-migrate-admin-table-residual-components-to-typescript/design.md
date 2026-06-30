## Context

`web-admin/src/table` 已有大量组件完成 TSX 迁移，但账号、MFA、LDAP、FaceID、登录方式、Prometheus 信息、属性配置和 Provider 表仍有 residual JS 文件。它们大多是受控表格组件，通过父组件传入 `value`、`onChange`、`update*` 或 `application/provider/organization` 等动态对象。

本批与 Admin-1 common widgets 批次并行，因此不能触碰 `web-admin/src/common/*` 或 `common/*` 子目录；也不能回头修改刚迁移的 `SyncerTableColumnTable`、root shell、backend wrappers、auth 或页面级编辑器。

## Goals / Non-Goals

**Goals:**

- 将 P0 residual table 组件机械迁移为 `.tsx`。
- 对每个组件补局部 props、row、option 和 callback 类型，优先复用 `LegacyAny` 作为历史动态字段边界。
- 保持现有文件名语义和 extensionless import；`propertyTable` 迁移后继续保留小写文件名。
- 真实运行现有 touched tests；如表组件缺少现成 tests，明确记录测试缺口，并用 typecheck、增量 TS gate 和 build 覆盖导入/构建路径。

**Non-Goals:**

- 不抽象新的共享表格框架，不调整 `common/table` API，不做 UI polish。
- 不改变表格行编辑、新增、删除、排序、字段回写、provider row mapping、账号/MFA/LDAP/FaceID 业务语义或后端 API 契约。
- 不触碰 `web-admin/src/common/*`、`common/modal/*`、`common/theme/*`、`common/select/*`。
- 不触碰 `EntryPage`、`CaptchaPage`、`QrCodePage`、`basic/*`、account 轻组件、pricing、Iframe、Tool、Tour。
- 不触碰 `SyncerTableColumnTable*`、Application/Syncer/ProviderEditPage、auth、backend、root shell/config。

## Decisions

### 1. 局部类型优先

每个 table 组件只描述自身实际消费的 props 和行字段。父组件传入的动态对象、未迁移业务模型和 AntD callback 细节用局部 `LegacyAny` 或窄 record 承接，不为了本批迁移重写账号、MFA、Provider 或 LDAP 全局模型。

### 2. ProviderTable 保守处理

`ProviderTable` 可纳入迁移，但如果迁移牵出 Provider 编辑页、Provider 字段组件、真实认证配置或测试 fixture 的大范围重塑，则本 change 将其记录为 deferred，继续完成其它 residual table 组件。

### 3. 验证不使用 0 tests 作为证据

如果触碰 `ProviderTable.test`，必须真实跑到该 suite。其它 P0 表组件若没有现成测试，不以 `0 tests` 冒充通过，而是在 `verification.md` 说明测试缺口，并依赖 `yarn typecheck`、增量 TS gate 和 `yarn build` 验证机械迁移后的导入和构建路径。

## Risks / Trade-offs

- **历史动态字段多**：用局部 legacy boundary 控制类型改动，不扩散到全局模型。
- **表格行为回归风险**：保持机械迁移，不重写 add/delete/update 逻辑；验证以 typecheck/build 和现有 focused tests 为主。
- **ProviderTable 牵引风险**：允许 deferred，避免跨到 Provider 编辑/字段行为和真实认证配置边界。
